package com.nyayalekh.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.speech.RecognizerIntent;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * NyayaLekh — an offline Hindi legal drafting app.
 * The whole UI lives in assets/index.html (the same files as the web/ preview);
 * this activity only provides the shell plus the few things a WebView cannot do
 * on its own: opening files from anywhere on the tablet (WPS Office, Downloads,
 * Drive), saving into Documents, printing to PDF and speech recognition.
 */
public class MainActivity extends Activity {

    private static final String TAG = "NyayaLekh";
    private static final int REQ_PICK = 1001;
    private static final int REQ_VOICE = 1002;
    private static final int REQ_WRITE = 1003;

    private WebView web;
    private final Map<String, ByteArrayOutputStream> pendingFiles = new HashMap<>();
    private ValueCallback<Uri[]> fileCallback;
    private Uri pendingOpenUri = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        FrameLayout root = new FrameLayout(this);
        root.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        root.setBackgroundColor(0xFFEEF1F6);

        web = new WebView(this);
        web.setLayoutParams(new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT));
        root.addView(web);
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);
        // fonts, scripts and the generated dictionaries are all local files
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(false);
        s.setTextZoom(100);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setSupportZoom(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            s.setSafeBrowsingEnabled(false);
        }

        web.setBackgroundColor(0xFFEEF1F6);
        web.addJavascriptInterface(new Bridge(), "NativeApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // keep everything inside the app; open external links in a browser
                if (url != null && (url.startsWith("file://") || url.startsWith("about:"))) return false;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
                } catch (Exception ignored) {
                }
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                Log.i(TAG, "page loaded: " + url);
                if (pendingOpenUri != null) {
                    Uri u = pendingOpenUri;
                    pendingOpenUri = null;
                    // give the web app a moment to finish booting
                    view.postDelayed(() -> deliverPickedFile(u), 1500);
                }
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> cb,
                                             FileChooserParams params) {
                fileCallback = cb;
                launchPicker();
                return true;
            }
        });

        handleOpenIntent(getIntent());
        web.loadUrl("file:///android_asset/index.html");
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    }

    /** "Open with NyayaLekh" from WPS Office, Files, Gmail… */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleOpenIntent(intent);
    }

    private void handleOpenIntent(Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        if (data != null) { pendingOpenUri = data; return; }
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            Uri extra = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (extra != null) pendingOpenUri = extra;
        }
    }

    /* ------------------------------------------------------------------ files */

    private void launchPicker() {
        Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        i.addCategory(Intent.CATEGORY_OPENABLE);
        i.setType("*/*");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            startActivityForResult(i, REQ_PICK);
        } catch (Exception e) {
            Toast.makeText(this, "फ़ाइल चयनकर्ता उपलब्ध नहीं", Toast.LENGTH_LONG).show();
        }
    }

    private void deliverPickedFile(Uri uri) {
        try {
            InputStream in = getContentResolver().openInputStream(uri);
            if (in == null) return;
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) bos.write(buf, 0, n);
            in.close();
            String b64 = Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP);
            String name = queryName(uri);
            final String js = "window.NativeFilePicked && window.NativeFilePicked(" +
                    JSONObject.quote(name) + "," + JSONObject.quote(b64) + ")";
            runOnUiThread(() -> web.evaluateJavascript(js, null));
        } catch (Exception e) {
            Log.e(TAG, "read failed", e);
            toastOnUi("फ़ाइल पढ़ी नहीं जा सकी: " + e.getMessage());
        }
    }

    private String queryName(Uri uri) {
        String name = "document";
        try (android.database.Cursor c = getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int idx = c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) name = c.getString(idx);
            }
        } catch (Exception ignored) {
        }
        if (name == null) name = "document";
        return name;
    }

    private File documentsDir() {
        File dir;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            dir = new File(getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS), "");
            File pub = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS), "NyayaLekh");
            if (pub.exists() || pub.mkdirs()) dir = pub;
        } else {
            dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS), "NyayaLekh");
        }
        if (!dir.exists()) dir.mkdirs();
        return dir;
    }

    /* ------------------------------------------------------------------ voice */

    private void startVoiceRecognition(String lang) {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang == null ? "hi-IN" : lang);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang == null ? "hi-IN" : lang);
        i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        i.putExtra(RecognizerIntent.EXTRA_PROMPT, "बोलिए…");
        List<ResolveInfo> list = getPackageManager().queryIntentActivities(i, 0);
        if (list.isEmpty()) {
            toastOnUi("इस डिवाइस पर वॉइस पहचान उपलब्ध नहीं है (Google ऐप से ‘स्पीच सेवा’ स्थापित करें)");
            web.evaluateJavascript("window.NDVoiceEnd && window.NDVoiceEnd()", null);
            return;
        }
        try {
            startActivityForResult(i, REQ_VOICE);
        } catch (Exception e) {
            toastOnUi("वॉइस शुरू नहीं हो सकी");
        }
    }

    /* --------------------------------------------------------------- lifecycle */

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_PICK) {
            Uri uri = data != null ? data.getData() : null;
            if (resultCode == RESULT_OK && uri != null) {
                if (fileCallback != null) {
                    fileCallback.onReceiveValue(new Uri[]{uri});
                    fileCallback = null;
                } else {
                    deliverPickedFile(uri);
                }
            } else if (fileCallback != null) {
                fileCallback.onReceiveValue(null);
                fileCallback = null;
            }
        } else if (requestCode == REQ_VOICE) {
            String text = null;
            if (data != null) {
                ArrayList<String> res = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                if (res != null && !res.isEmpty()) text = res.get(0);
            }
            String js = "window.NDVoiceResult && window.NDVoiceResult(" +
                    JSONObject.quote(text == null ? "" : text) + ", true);" +
                    "window.NDVoiceEnd && window.NDVoiceEnd();";
            web.evaluateJavascript(js, null);
        }
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript(
                "(function(){" +
                "var m=document.getElementById('modal')," +
                "sh=document.getElementById('menuSheet')," +
                "d=document.getElementById('drawer')," +
                "f=document.getElementById('findbar')," +
                "s=document.getElementById('sidePanel');" +
                "if(m&&!m.hidden){document.getElementById('modalClose').click();return 'handled';}" +
                "if(sh&&!sh.hidden){document.getElementById('menuClose').click();return 'handled';}" +
                "if(d&&!d.hidden){document.getElementById('scrim').click();return 'handled';}" +
                "if(f&&!f.hidden){document.getElementById('findClose').click();return 'handled';}" +
                "if(s&&!s.hidden){document.getElementById('panelClose').click();return 'handled';}" +
                "return 'exit';})()",
                value -> {
                    if (value != null && value.contains("exit")) finish();
                });
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.loadUrl("about:blank");
            web.destroy();
        }
        super.onDestroy();
    }

    private void toastOnUi(final String msg) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_LONG).show());
    }

    /* --------------------------------------------------------------- JS bridge */

    public class Bridge {

        @JavascriptInterface
        public boolean isNative() {
            return true;
        }

        @JavascriptInterface
        public String getVersion() {
            return "2.0.0";
        }

        @JavascriptInterface
        public void pickDocument() {
            runOnUiThread(() -> launchPicker());
        }

        @JavascriptInterface
        public void beginFile(String json) {
            try {
                JSONObject o = new JSONObject(json);
                if (o.has("name")) pendingName = o.optString("name", "document");
                if (o.has("mime")) pendingMime = o.optString("mime", "application/octet-stream");
                pendingFiles.put(o.getString("id"), new ByteArrayOutputStream());
            } catch (Exception e) {
                Log.e(TAG, "beginFile", e);
            }
        }

        @JavascriptInterface
        public void appendFile(String json) {
            try {
                JSONObject o = new JSONObject(json);
                ByteArrayOutputStream bos = pendingFiles.get(o.getString("id"));
                if (bos == null) return;
                bos.write(Base64.decode(o.getString("data"), Base64.DEFAULT));
            } catch (Exception e) {
                Log.e(TAG, "appendFile", e);
            }
        }

        @JavascriptInterface
        public String endFile(String id) {
            try {
                ByteArrayOutputStream bos = pendingFiles.remove(id);
                if (bos == null) return "";
                String name = pendingName;
                pendingName = null;
                final File dir = documentsDir();
                final File out = new File(dir, name);
                FileOutputStream fos = new FileOutputStream(out);
                bos.writeTo(fos);
                fos.close();
                final String path = out.getAbsolutePath();

                // also publish through MediaStore so WPS Office / Files see it instantly
                try {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
                    cv.put(MediaStore.MediaColumns.MIME_TYPE, pendingMime == null ? "application/octet-stream" : pendingMime);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOCUMENTS + "/NyayaLekh");
                    }
                    Uri uri = getContentResolver().insert(MediaStore.Files.getContentUri("external"), cv);
                    if (uri != null) {
                        OutputStream os = getContentResolver().openOutputStream(uri);
                        if (os != null) {
                            os.write(bos.toByteArray());
                            os.close();
                        }
                    }
                } catch (Exception ignored) {
                }

                runOnUiThread(() -> {
                    Toast.makeText(MainActivity.this, "सहेजा गया: " + path, Toast.LENGTH_LONG).show();
                    web.evaluateJavascript("window.NDFileSaved && window.NDFileSaved(" +
                            JSONObject.quote(path) + ")", null);
                });
                return path;
            } catch (Exception e) {
                Log.e(TAG, "endFile", e);
                toastOnUi("सहेजने में त्रुटि: " + e.getMessage());
                return "";
            }
        }

        @JavascriptInterface
        public void shareFile(String json) {
            // reserved for share-sheet support
        }

        @JavascriptInterface
        public void printPage() {
            runOnUiThread(() -> {
                try {
                    PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                    String job = "NyayaLekh-" + System.currentTimeMillis();
                    pm.print(job, web.createPrintDocumentAdapter(job),
                            new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
                } catch (Exception e) {
                    toastOnUi("प्रिंट उपलब्ध नहीं: " + e.getMessage());
                }
            });
        }

        @JavascriptInterface
        public void startVoice(String lang) {
            runOnUiThread(() -> startVoiceRecognition(lang));
        }

        @JavascriptInterface
        public void stopVoice() {
            // RecognizerIntent closes itself
        }

        @JavascriptInterface
        public void toast(String msg) {
            toastOnUi(msg);
        }

        @JavascriptInterface
        public void keepAwake(final boolean on) {
            runOnUiThread(() -> {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }
    }

    /* file bookkeeping for the chunked writer */
    private String pendingName = "document";
    private String pendingMime = "application/octet-stream";

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }
}
