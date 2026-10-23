/* =============================================================================
 * NyayaLekh — core utilities, i18n and the offline document store.
 * Plain ES2019, no modules: this file is loaded first by index.html.
 * ========================================================================== */
(function (global) {
  "use strict";

  var ND = (global.ND = global.ND || {});

  /* ------------------------------------------------------------------ utils */
  var U = (ND.util = {});

  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  U.el = function (tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v == null || v === false) continue;
        if (k === "class") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k === "html") n.innerHTML = v;
        else if (k === "style" && typeof v === "object") { for (var s in v) n.style[s] = v[s]; }
        else if (k.slice(0, 2) === "on" && typeof v === "function") n.addEventListener(k.slice(2), v);
        else if (k === "dataset") { for (var d in v) n.dataset[d] = v[d]; }
        else n.setAttribute(k, v === true ? "" : v);
      }
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  };

  U.uid = function (p) { return (p || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };

  U.debounce = function (fn, ms) {
    var t;
    return function () {
      var a = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, a); }, ms);
    };
  };
  U.throttle = function (fn, ms) {
    var last = 0, t;
    return function () {
      var a = arguments, self = this, now = Date.now();
      if (now - last >= ms) { last = now; fn.apply(self, a); }
      else { clearTimeout(t); t = setTimeout(function () { last = Date.now(); fn.apply(self, a); }, ms - (now - last)); }
    };
  };
  U.raf = function (fn) { return requestAnimationFrame(fn); };

  U.escapeHtml = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  U.stripTags = function (html) {
    var d = document.createElement("div");
    d.innerHTML = html || "";
    return d.textContent || "";
  };
  U.nl2br = function (s) { return U.escapeHtml(s).replace(/\n/g, "<br>"); };

  U.toast = function (msg, kind, ms) {
    var host = document.getElementById("toasts");
    if (!host) return;
    var t = U.el("div", { class: "toast " + (kind || ""), text: msg });
    host.appendChild(t);
    setTimeout(function () {
      t.style.transition = "opacity .25s";
      t.style.opacity = "0";
      setTimeout(function () { t.remove(); }, 260);
    }, ms || 2200);
  };

  U.download = function (filename, blob) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  };

  U.safeName = function (s) {
    return String(s || "document").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 80) || "document";
  };

  U.sameDay = function (t) {
    var a = new Date(t), b = new Date();
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  };
  U.fmtDate = function (t) {
    var d = new Date(t);
    var pad = function (n) { return n < 10 ? "0" + n : n; };
    return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  };
  U.fmtSize = function (b) {
    if (b < 1024) return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(1) + " MB";
  };

  U.DEV = /[\u0900-\u097F]/;
  U.hasDevanagari = function (s) { return U.DEV.test(s || ""); };

  /** Word count that treats a Devanagari cluster as one word. */
  U.wordStats = function (text) {
    var t = (text || "").trim();
    if (!t) return { words: 0, chars: 0, charsNoSpace: 0, sentences: 0 };
    var words = t.split(/[\s\u00a0]+/).filter(Boolean).length;
    return {
      words: words,
      chars: t.length,
      charsNoSpace: t.replace(/\s/g, "").length,
      sentences: (t.match(/[।.!?]+/g) || []).length
    };
  };

  /** Native bridge helper (Android WebView exposes window.NativeApp). */
  ND.native = {
    has: function () { return !!(global.NativeApp && global.NativeApp.isNative); },
    call: function (fn, arg) {
      try {
        if (global.NativeApp && typeof global.NativeApp[fn] === "function") return global.NativeApp[fn](arg);
      } catch (e) { console.warn("native call failed", fn, e); }
      return null;
    },
    /** Open a file that lives outside the WebView sandbox (e.g. WPS/Downloads). */
    pickFile: function (cb) {
      if (this.has()) {
        global.NativeFilePicked = function (name, base64) { cb(name, base64); };
        this.call("pickDocument");
        return;
      }
      var input = U.el("input", { type: "file", accept: ".docx,.odt,.pdf,.rtf,.txt,.html,.htm,.md,.doc", style: { display: "none" } });
      input.addEventListener("change", function () {
        var f = input.files && input.files[0];
        if (!f) return;
        var r = new FileReader();
        r.onload = function () { cb(f.name, String(r.result).split(",")[1] || ""); };
        r.readAsDataURL(f);
        input.remove();
      });
      document.body.appendChild(input);
      input.click();
    },
    shareFile: function (name, mime, base64) {
      if (this.has()) { this.call("shareFile", JSON.stringify({ name: name, mime: mime, data: base64 })); return true; }
      return false;
    },
    /** Save into the tablet's Documents folder (visible to WPS Office & co.). */
    saveToDocuments: function (name, mime, blob, cb) {
      if (!this.has()) { U.download(name, blob); cb && cb(null); return; }
      var self = this;
      var reader = new FileReader();
      reader.onload = function () {
        var b64 = String(reader.result).split(",")[1] || "";
        // Chunk the payload so a 5 MB document does not blow the JS bridge limit.
        var chunk = 900000, i = 0, id = "f" + Date.now();
        self.call("beginFile", JSON.stringify({ id: id, name: name, mime: mime }));
        (function next() {
          var part = b64.slice(i, i + chunk);
          self.call("appendFile", JSON.stringify({ id: id, data: part }));
          i += chunk;
          if (i < b64.length) setTimeout(next, 0);
          else { var p = self.call("endFile", id) || ""; cb && cb(p ? null : "native error", p); }
        })();
      };
      reader.readAsDataURL(blob);
    }
  };

  /* -------------------------------------------------------------------- i18n */
  var STR = {
    hi: {
      menu: "मेन्यू", newDoc: "नया दस्तावेज़", myFiles: "मेरी फ़ाइलें", importFile: "फ़ाइल खोलें / आयात",
      exportDoc: "निर्यात / प्रिंट", templates: "न्यायालयीन प्रारूप", courts: "न्यायालय सेटिंग",
      dictionary: "हिन्दी–अंग्रेज़ी शब्दकोश", spellcheck: "वर्तनी जाँचक", voice: "बोलकर लिखें",
      convert: "कृतिदेव / लीगेसी कन्वर्टर", translit: "लिप्यंतरण (टाइपिंग)", typo: "मात्रा-सुधारक",
      legal: "विधिक सहायक", pageSetup: "पृष्ठ सेटअप / मार्जिन", display: "फ़ॉन्ट, आकार व थीम",
      help: "सहायता", about: "परिचय व लाइसेंस",
      save: "सहेजें", cancel: "रद्द करें", close: "बंद करें", insert: "सम्मिलित करें", copy: "प्रतिलिपि",
      delete: "हटाएँ", open: "खोलें", rename: "नाम बदलें", duplicate: "प्रतिलिपि बनाएँ", print: "प्रिंट करें",
      saved: "सहेजा गया", saving: "सहेजा जा रहा है…", unsaved: "असहेजा",
      words: "शब्द", chars: "अक्षर", page: "पृष्ठ"
    },
    en: {
      menu: "Menu", newDoc: "New document", myFiles: "My files", importFile: "Open / Import file",
      exportDoc: "Export / Print", templates: "Court templates", courts: "Court settings",
      dictionary: "Hindi–English dictionary", spellcheck: "Spell checker", voice: "Voice typing",
      convert: "Kruti Dev / legacy converter", translit: "Transliteration typing", typo: "Matra fixer",
      legal: "Legal tools", pageSetup: "Page setup / margins", display: "Fonts, size & theme",
      help: "Help", about: "About & licences",
      save: "Save", cancel: "Cancel", close: "Close", insert: "Insert", copy: "Copy",
      delete: "Delete", open: "Open", rename: "Rename", duplicate: "Duplicate", print: "Print",
      saved: "Saved", saving: "Saving…", unsaved: "Unsaved",
      words: "words", chars: "characters", page: "page"
    }
  };

  ND.i18n = {
    lang: "hi",
    t: function (k) { var L = STR[this.lang] || STR.hi; return L[k] || STR.hi[k] || k; },
    toggle: function () {
      this.lang = this.lang === "hi" ? "en" : "hi";
      try { localStorage.setItem("nd.lang", this.lang); } catch (e) {}
      document.documentElement.setAttribute("lang", this.lang);
      var btn = document.getElementById("stLang");
      if (btn) btn.textContent = this.lang === "hi" ? "हिं" : "EN";
      document.querySelectorAll("[data-i18n]").forEach(function (n) {
        n.textContent = ND.i18n.t(n.getAttribute("data-i18n"));
      });
      document.dispatchEvent(new CustomEvent("nd:lang"));
      return this.lang;
    },
    init: function () {
      try { var v = localStorage.getItem("nd.lang"); if (v) this.lang = v; } catch (e) {}
      var btn = document.getElementById("stLang");
      if (btn) btn.textContent = this.lang === "hi" ? "हिं" : "EN";
      document.documentElement.setAttribute("lang", this.lang);
    }
  };

  /* ------------------------------------------------------------------- store */
  function openDB() {
    return new Promise(function (res, rej) {
      var req = indexedDB.open("nyayalekh", 2);
      req.onupgradeneeded = function (e) {
        var db = req.result;
        if (!db.objectStoreNames.contains("docs")) {
          var s = db.createObjectStore("docs", { keyPath: "id" });
          s.createIndex("updatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
        if (e.oldVersion < 2 && !db.objectStoreNames.contains("templates")) db.createObjectStore("templates", { keyPath: "id" });
      };
      req.onsuccess = function () { res(req.result); };
      req.onerror = function () { rej(req.error); };
    });
  }

  var dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = openDB().catch(function (err) {
      console.warn("IndexedDB unavailable, using localStorage fallback", err);
      throw err;
    });
    return dbp;
  }

  /* --- localStorage fallback (some WebView builds disallow IDB on file://) --- */
  var LS = {
    key: function (id) { return "nd.doc." + id; },
    index: function () {
      try { return JSON.parse(localStorage.getItem("nd.docIndex") || "[]"); } catch (e) { return []; }
    },
    setIndex: function (arr) { try { localStorage.setItem("nd.docIndex", JSON.stringify(arr)); } catch (e) {} },
    put: function (doc) {
      try {
        localStorage.setItem(LS.key(doc.id), JSON.stringify(doc));
        var idx = LS.index();
        if (idx.indexOf(doc.id) < 0) { idx.push(doc.id); LS.setIndex(idx); }
        return Promise.resolve(doc.id);
      } catch (e) { return Promise.reject(e); }
    },
    get: function (id) {
      try { return Promise.resolve(JSON.parse(localStorage.getItem(LS.key(id)) || "null")); }
      catch (e) { return Promise.resolve(null); }
    },
    all: function () {
      return Promise.resolve(LS.index().map(function (id) {
        try { return JSON.parse(localStorage.getItem(LS.key(id)) || "null"); } catch (e) { return null; }
      }).filter(Boolean).sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); }));
    },
    del: function (id) {
      try { localStorage.removeItem(LS.key(id)); LS.setIndex(LS.index().filter(function (x) { return x !== id; })); } catch (e) {}
      return Promise.resolve();
    },
    kvSet: function (k, v) { try { localStorage.setItem("nd.kv." + k, JSON.stringify(v)); } catch (e) {} return Promise.resolve(); },
    kvGet: function (k, d) {
      try { var v = localStorage.getItem("nd.kv." + k); return Promise.resolve(v === null ? d : JSON.parse(v)); }
      catch (e) { return Promise.resolve(d); }
    }
  };

  function tx(storeName, mode, fn) {
    return db().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(storeName, mode);
        var s = t.objectStore(storeName);
        var out;
        try { out = fn(s); } catch (e) { rej(e); return; }
        t.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error); };
      });
    });
  }

  ND.store = {
    put: function (doc) {
      return tx("docs", "readwrite", function (s) { s.put(doc); return doc.id; })
        .catch(function () { return LS.put(doc); });
    },
    get: function (id) {
      return tx("docs", "readonly", function (s) { return s.get(id); })
        .catch(function () { return LS.get(id); });
    },
    allRaw: function () {
      return tx("docs", "readonly", function (s) {
        var out = [], r = s.openCursor();
        r.onsuccess = function () {
          var c = r.result;
          if (c) { out.push(c.value); c.continue(); }
        };
        return { get result() { return out; } };
      }).then(function (arr) {
        return (arr || []).sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
      });
    },
    del: function (id) {
      return tx("docs", "readwrite", function (s) { s.delete(id); })
        .catch(function () { return LS.del(id); });
    },
    kvSet: function (k, v) {
      return tx("kv", "readwrite", function (s) { s.put(v, k); })
        .catch(function () { return LS.kvSet(k, v); });
    },
    kvGet: function (k, dflt) {
      return tx("kv", "readonly", function (s) { return s.get(k); })
        .then(function (v) { return v === undefined ? dflt : v; })
        .catch(function () { return LS.kvGet(k, dflt); });
    }
  };

  // all(): prefer IndexedDB, fall back to localStorage
  ND.store.all = function () {
    return ND.store.allRaw().catch(function () {
      return LS.all();
    }).then(function (arr) {
      arr = arr || [];
      if (arr.length) return arr;
      return LS.all().then(function (lsArr) { return (lsArr && lsArr.length) ? lsArr : arr; });
    });
  };

  /* ---------------------------------------------------------------- settings */
  var defaults = {
    theme: "auto",            // auto | light | dark
    zoom: 1,
    pageSize: "A4",
    margins: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
    font: "serif",
    fontSize: 12,
    lineHeight: 1.65,
    justify: false,
    autoSpell: true,
    suggestAsType: true,
    pageNumbers: true,
    autosave: true,
    rule: "BNS"
  };

  var settings = Object.assign({}, defaults);
  ND.settings = settings;

  ND.settings.load = function () {
    return new Promise(function (res) {
      var raw = null;
      try { raw = localStorage.getItem("nd.settings"); } catch (e) {}
      if (raw) {
        try { Object.assign(settings, JSON.parse(raw)); } catch (e) {}
      }
      res(settings);
    });
  };
  ND.settings.save = function () {
    try { localStorage.setItem("nd.settings", JSON.stringify(settings)); } catch (e) {}
  };
  ND.settings.set = function (k, v) {
    settings[k] = v;
    ND.settings.save();
    document.dispatchEvent(new CustomEvent("nd:settings", { detail: { key: k, value: v } }));
  };
  ND.settings.reset = function () {
    Object.assign(settings, defaults);
    ND.settings.save();
    document.dispatchEvent(new CustomEvent("nd:settings", { detail: { key: "*" } }));
  };
})(window);
