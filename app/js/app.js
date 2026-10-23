/* =============================================================================
 * NyayaLekh — application shell: routing, panels, import/export, voice,
 * court details, font library and settings.
 * ========================================================================== */
(function (global) {
  "use strict";
  var ND = (global.ND = global.ND || {});
  var U = ND.util, D = ND.doc, E = ND.editor, T = ND.text;
  var A = (ND.app = {});

  var S = {
    doc: null,
    screen: null,
    zoom: 1,
    savedAt: 0,
    dirty: false,
    files: [],
    fileQuery: "",
    tplCat: "all",
    tplLang: "all",
    dictQuery: "",
    dictResults: null,
    spellIssues: null,
    legalTab: "glossary",
    legalQuery: "",
    voiceOn: false,
    voiceText: "",
    convMode: "k2u",
    convFont: "krutidev",
    saveTimer: null,
    ready: false,
    dictReady: false
  };
  A.state = S;

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return U.$$(sel); }
  function L(en, hi) { return ND.lang() === "hi" ? hi : en; }
  function esc(s) { return U.escapeHtml(String(s == null ? "" : s)); }
  function el(id) { return document.getElementById(id); }
  function status(msg, kind) { U.toast(msg, kind || "ok"); }

  /* ==========================================================================
   * 1. THEME, ZOOM, LANGUAGE CHROME
   * ======================================================================== */
  var THEMES = ["light", "dark", "sepia", "auto"];
  var ACCENTS = ["indigo", "saffron", "teal", "plum", "slate"];

  function applyTheme() {
    var p = ND.prefs;
    document.documentElement.setAttribute("data-theme", p.theme || "light");
    document.documentElement.setAttribute("data-accent", p.accent || "indigo");
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", p.theme === "dark" ? "#10131a" : "#f6f5f2");
  }

  function setTheme(next) {
    ND.setPref("theme", next);
    applyTheme();
  }

  function applyZoom(z) {
    S.zoom = Math.max(0.5, Math.min(2.2, Math.round(z * 20) / 20));
    document.documentElement.style.setProperty("--zoom", String(S.zoom));
    var b = el("stZoom");
    if (b) b.textContent = Math.round(S.zoom * 100) + "%";
  }

  function updateLangPills() {
    var isHi = ND.lang() === "hi";
    var b = el("stLang");
    if (b) b.textContent = isHi ? "हिं" : "EN";
    var p = el("menuLang");
    if (p) {
      var spans = p.querySelectorAll("span");
      if (spans[0]) spans[0].classList.toggle("on", !isHi);
      if (spans[1]) spans[1].classList.toggle("on", isHi);
    }
  }

  /* ==========================================================================
   * 2. DOCUMENT LIFECYCLE
   * ======================================================================== */
  function newDocument(opts) {
    var doc = D.newDoc(opts || {});
    startDocument(doc);
    saveDoc(true);
    status(L("New document ready", "नया दस्तावेज़ तैयार"));
    return doc;
  }

  function startDocument(doc) {
    S.doc = D.migrate(doc);
    S.dirty = false;
    E.init(S.doc);
    E.setDoc(S.doc);
    syncTitle();
    updateStats();
    applyDocMeta();
    if (S.screen === "files" || S.screen === "stats") renderPanel(S.screen);
  }

  function loadInitial() {
    return ND.store.kvGet("current", null).then(function (id) {
      if (!id) return null;
      return ND.store.get(id);
    }).then(function (doc) {
      if (doc) return doc;
      return ND.store.all().then(function (arr) {
        return arr && arr.length ? arr[0] : null;
      });
    }).catch(function () { return null; });
  }

  function syncTitle() {
    var input = el("docTitle");
    if (!input) return;
    input.value = S.doc.title || ND.t("untitled");
    document.title = (S.doc.title || ND.t("appName")) + " · " + ND.t("appName");
  }

  function applyDocMeta() {
    var d = S.doc;
    var meta = el("docMeta");
    if (meta) {
      var size = d.page.size || "A4";
      var orient = d.page.orientation === "landscape" ? " · " + L("Landscape", "भूदृश्य") : "";
      meta.textContent = size + orient + " · " + (d.style.size || 12) + " pt";
    }
    var fl = el("fontLabel");
    if (fl) fl.textContent = ND.fonts.label(d.style.devFont);
    var sizeSel = el("selSize");
    if (sizeSel) sizeSel.value = String(d.style.size || 12);
    document.body.classList.toggle("continuous", ND.prefs.pageView === "continuous");
    document.body.classList.toggle("show-marks", !!ND.prefs.showMarks);
  }

  function updateStats() {
    if (!S.doc) return;
    var st = D.stats(S.doc);
    var w = el("stWords"), c = el("stChars");
    if (w) w.textContent = ND.t("wordCount", { n: st.words });
    if (c) c.textContent = ND.t("textStats", { words: st.words, chars: st.chars });
    if (el("stPage")) E.updateNumbers();
    if (S.screen === "stats") renderPanel("stats");
  }

  function saveDoc(immediate) {
    if (!S.doc) return Promise.resolve();
    clearTimeout(S.saveTimer);
    var run = function () {
      E.syncAll();
      setSaveState(ND.t("saving"));
      S.dirty = false;
      return ND.store.put(S.doc).then(function () {
        S.savedAt = Date.now();
        setSaveState(ND.t("saved"));
        return ND.store.kvSet("current", S.doc.id);
      }).catch(function () {
        setSaveState(ND.t("savingError"));
      });
    };
    if (immediate) return run();
    S.saveTimer = setTimeout(run, 700);
    return Promise.resolve();
  }

  function setSaveState(text) {
    var a = el("stSaveInline");
    if (a) a.textContent = text;
  }

  /* ==========================================================================
   * 3. MODAL / SHEET HELPERS
   * ======================================================================== */
  function openModal(title, bodyHtml, buttons) {
    var m = el("modal");
    if (!m) return;
    el("modalTitle").textContent = title;
    el("modalBody").innerHTML = bodyHtml || "";
    var foot = el("modalFoot");
    foot.innerHTML = "";
    (buttons || [{ label: ND.t("close"), act: "close" }]).forEach(function (b) {
      var btn = document.createElement("button");
      btn.className = "btn " + (b.kind || "");
      btn.textContent = b.label;
      btn.addEventListener("click", function () {
        if (b.onClick) b.onClick();
        if (b.keepOpen !== true) closeModal();
      });
      foot.appendChild(btn);
    });
    m.hidden = false;
    var first = m.querySelector("input,textarea,select");
    if (first) setTimeout(function () { first.focus(); first.select && first.select(); }, 40);
  }

  function closeModal() {
    var m = el("modal");
    if (m) m.hidden = true;
  }

  function promptModal(title, label, value, onOk, multiline) {
    var body = '<div class="field"><label>' + esc(label) + "</label>" +
      (multiline
        ? '<textarea class="area" id="promptInput" style="min-height:90px">' + esc(value || "") + "</textarea>"
        : '<input class="input" id="promptInput" value="' + esc(value || "") + '">') + "</div>";
    openModal(title, body, [
      { label: ND.t("cancel"), act: "close" },
      {
        label: ND.t("save"), kind: "primary", onClick: function () {
          var v = el("promptInput").value;
          onOk(v);
        }
      }
    ]);
  }

  function openSheet() {
    var scrim = el("scrim"), sheet = el("menuSheet");
    if (scrim) scrim.hidden = false;
    if (sheet) sheet.hidden = false;
  }
  function closeSheet() {
    var scrim = el("scrim"), sheet = el("menuSheet");
    if (scrim) scrim.hidden = true;
    if (sheet) sheet.hidden = true;
  }

  /* ==========================================================================
   * 4. ROUTER
   * ======================================================================== */
  var PANEL_TITLES = {
    files: function () { return L("Documents", "दस्तावेज़"); },
    templates: function () { return L("Templates", "प्रारूप"); },
    insert: function () { return L("Insert", "सम्मिलित करें"); },
    layout: function () { return L("Page setup", "पृष्ठ सेटअप"); },
    tools: function () { return L("Tools", "उपकरण"); },
    dictionary: function () { return L("Dictionary", "शब्दकोश"); },
    spell: function () { return L("Spell check", "वर्तनी जाँच"); },
    voice: function () { return L("Speech to text", "बोलकर लिखें"); },
    convert: function () { return L("Kruti Dev converter", "कृतिदेव परिवर्तक"); },
    legal: function () { return L("Legal reference", "विधिक संदर्भ"); },
    settings: function () { return L("Settings", "सेटिंग्स"); },
    export: function () { return L("Export", "निर्यात"); },
    import: function () { return L("Open or import", "खोलें / आयात"); },
    court: function () { return L("Court details", "न्यायालय विवरण"); },
    fonts: function () { return L("Font library", "फ़ॉन्ट संग्रह"); },
    stats: function () { return L("Statistics", "आँकड़े"); },
    help: function () { return L("Help", "सहायता"); },
    about: function () { return L("About", "परिचय"); }
  };

  function go(name) {
    closeSheet();
    closeModal();
    if (name === "new") {
      if (hasContent() && S.dirty) {
        openModal(L("Start a new document?", "नया दस्तावेज़ शुरू करें?"),
          "<p class='hint'>" + L("The current document is saved in Documents. You can reopen it any time.",
            "वर्तमान दस्तावेज़ दस्तावेज़ सूची में सुरक्षित है, आप उसे कभी भी खोल सकते हैं।") + "</p>",
          [
            { label: ND.t("cancel") },
            { label: L("New document", "नया दस्तावेज़"), kind: "primary", onClick: function () { newDocument(); } }
          ]);
        return;
      }
      newDocument();
      return;
    }
    if (name === "import") { doImport(); return; }
    if (S.screen === name && !el("sidePanel").hidden) { closePanel(); return; }
    renderPanel(name);
  }
  A.go = go;

  function hasContent() {
    return !!(S.doc && D.plainText(S.doc).trim().length);
  }

  function closePanel() {
    var p = el("sidePanel");
    if (p) p.hidden = true;
    S.screen = null;
    $$("#rail .rail-btn").forEach(function (b) { b.classList.remove("on"); });
  }

  function markRail(name) {
    $$("#rail .rail-btn").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-screen") === name);
    });
  }

  function renderPanel(name) {
    var panel = el("sidePanel"), body = el("panelBody"), title = el("panelTitle");
    if (!panel || !body) return;
    S.screen = name;
    panel.hidden = false;
    if (title) title.textContent = PANEL_TITLES[name] ? PANEL_TITLES[name]() : name;
    markRail(name);
    var builder = PANELS[name];
    body.scrollTop = 0;
    body.innerHTML = builder ? builder() : "";
    if (AFTER[name]) AFTER[name]();
  }
  A.renderPanel = renderPanel;

  /* ==========================================================================
   * 5. PANELS
   * ======================================================================== */
  function seg(dataAttr, options, current) {
    return "<div class='seg'>" + options.map(function (o) {
      return "<button data-act='seg' data-" + dataAttr + "='" + esc(o.v) + "' class='" +
        (String(o.v) === String(current) ? "on" : "") + "'>" + esc(o.label) + "</button>";
    }).join("") + "</div>";
  }

  function toggleRow(pref, label, hint, value) {
    return "<div class='set-row'><div class='lbl'><strong>" + esc(label) + "</strong>" +
      (hint ? "<small>" + esc(hint) + "</small>" : "") + "</div>" +
      "<button class='switch" + (value ? " on" : "") + "' data-act='toggle' data-pref='" + pref + "' role='switch' aria-checked='" + (!!value) + "'><i></i></button></div>";
  }

  function actionRow(label, hint, act, extra) {
    return "<button class='list-item' data-act='" + act + "'" + (extra || "") + ">" +
      "<span class='grow'><strong>" + esc(label) + "</strong>" +
      (hint ? "<small>" + esc(hint) + "</small>" : "") + "</span><span aria-hidden='true'>›</span></button>";
  }

  var PANELS = {};
  var AFTER = {};

  /* ------------------------------------------------------------------ files */
  PANELS.files = function () {
    return "<div class='row' style='margin-bottom:12px'>" +
      "<button class='btn primary' data-act='new-doc'>" + L("+ New", "+ नया") + "</button>" +
      "<button class='btn' data-act='import-file'>" + L("Import", "आयात") + "</button>" +
      "</div>" +
      "<input class='input' id='fileSearch' placeholder='" + esc(L("Search documents", "दस्तावेज़ खोजें")) + "' value='" + esc(S.fileQuery) + "'>" +
      "<div id='fileList' class='list' style='margin-top:12px'><div class='empty'>" + L("Loading…", "लोड हो रहा है…") + "</div></div>";
  };
  AFTER.files = function () {
    ND.store.all().then(function (arr) {
      S.files = arr || [];
      paintFiles();
    }).catch(function () { paintFiles(); });
  };

  function paintFiles() {
    var box = el("fileList");
    if (!box) return;
    var list = S.files.slice().sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
    if (S.fileQuery) {
      var q = S.fileQuery.toLowerCase();
      list = list.filter(function (d) { return ((d.title || "") + " " + D.plainText(d)).toLowerCase().indexOf(q) >= 0; });
    }
    if (!list.length) {
      box.innerHTML = "<div class='empty'>" + L("No documents yet. Tap “+ New” or import a file.", "अभी कोई दस्तावेज़ नहीं। “+ नया” दबाएँ या फ़ाइल आयात करें।") + "</div>";
      return;
    }
    box.innerHTML = list.map(function (d) {
      var st = D.stats(d);
      var active = S.doc && d.id === S.doc.id;
      return "<div class='list-item" + (active ? " active" : "") + "' data-id='" + esc(d.id) + "'>" +
        "<button class='grow' data-act='open-doc' data-id='" + esc(d.id) + "' style='text-align:left;background:none;border:0;padding:0;color:inherit;font:inherit'>" +
        "<strong>" + esc(d.title || ND.t("untitled")) + "</strong>" +
        "<small>" + esc(U.fmtDate(d.updatedAt || d.createdAt)) + " · " + esc(ND.t("wordCount", { n: st.words })) + "</small>" +
        "</button>" +
        "<button class='icon-btn' data-act='rename-doc' data-id='" + esc(d.id) + "' title='" + esc(ND.t("rename")) + "'>✎</button>" +
        "<button class='icon-btn' data-act='delete-doc' data-id='" + esc(d.id) + "' title='" + esc(ND.t("delete")) + "'>🗑</button>" +
        "</div>";
    }).join("");
  }

  /* -------------------------------------------------------------- templates */
  var CATS = [
    { v: "all", label: function () { return L("All", "सभी"); } },
    { v: "criminal", label: function () { return L("Criminal", "आपराधिक"); } },
    { v: "civil", label: function () { return L("Civil", "दीवानी"); } },
    { v: "misc", label: function () { return L("Miscellaneous", "विविध"); } }
  ];

  PANELS.templates = function () {
    var cats = CATS.map(function (c) {
      return "<button data-act='tplcat' data-cat='" + c.v + "' class='" + (S.tplCat === c.v ? "on" : "") + "'>" + esc(c.label()) + "</button>";
    }).join("");
    var tpls = ND.templates.filter(function (t) {
      return (S.tplCat === "all" || t.cat === S.tplCat) && (S.tplLang === "all" || t.lang === S.tplLang);
    });
    var cards = tpls.map(function (t) {
      return "<button class='card' data-act='use-tpl' data-tpl='" + esc(t.id) + "'>" +
        "<span class='cat'>" + esc(t.lang === "hi" ? L("Hindi", "हिन्दी") : L("English", "अंग्रेज़ी")) + "</span>" +
        "<strong" + (t.lang === "hi" ? " style='font-family:var(--ui-dev)'" : "") + ">" + esc(t.title) + "</strong>" +
        "<small>" + esc(t.sub) + "</small></button>";
    }).join("") || "<div class='empty'>" + L("No templates in this filter.", "इस फ़िल्टर में कोई प्रारूप नहीं।") + "</div>";
    return "<div class='tabs'>" + cats + "</div>" +
      "<div class='row between' style='margin-bottom:12px'>" +
      seg("lang", [{ v: "all", label: L("All", "सभी") }, { v: "hi", label: "हिन्दी" }, { v: "en", label: "English" }], S.tplLang) +
      "<span class='hint'>" + tpls.length + "</span></div>" +
      "<p class='hint' style='margin-bottom:10px'>" + L("Placeholders such as {{court}} are filled from Court details.", "{{court}} जैसे स्थान-चिह्न न्यायालय विवरण से भरते हैं।") + "</p>" +
      "<div class='cards'>" + cards + "</div>";
  };

  function applyTemplate(id) {
    var tpl = ND.templates.filter(function (t) { return t.id === id; })[0];
    if (!tpl) return;
    var blocks = D.buildTemplate(id, S.doc);
    if (!blocks) return;
    var doApply = function (mode) {
      E.pushUndo();
      if (mode === "replace") {
        S.doc.blocks = blocks;
        S.doc.title = tpl.title;
        syncTitle();
      } else {
        Array.prototype.splice.apply(S.doc.blocks, [S.doc.blocks.length, 0].concat(blocks));
      }
      E.rerender();
      E.emitChange(true);
      updateStats();
      status(ND.t("templateApplied") || L("Template applied", "प्रारूप लागू हुआ"));
      if (mode === "replace") {
        saveDoc(true);
        closePanel();
      }
    };
    if (hasContent() && D.plainText(S.doc).trim().length > 0) {
      openModal(L("Use this template", "यह प्रारूप लगाएँ"),
        "<p class='hint'>" + esc(tpl.title) + "</p><p class='hint'>" +
        L("Replace the current document or add the template below your text?",
          "वर्तमान दस्तावेज़ बदलें या आपके पाठ के नीचे प्रारूप जोड़ें?") + "</p>", [
          { label: ND.t("cancel") },
          { label: L("Insert below", "नीचे जोड़ें"), onClick: function () { doApply("append"); } },
          { label: L("Replace", "बदलें"), kind: "primary", onClick: function () { doApply("replace"); } }
        ]);
    } else {
      doApply("replace");
    }
  }

  /* ----------------------------------------------------------------- insert */
  var SYMBOLS = ["§", "¶", "†", "‡", "₹", "©", "®", "™", "°", "×", "÷", "√", "≈", "≠", "≤", "≥",
    "—", "–", "…", "«", "»", "“", "”", "‘", "’", "•", "◦", "▪", "→", "←", "↑", "↓", "✓", "✗"];

  PANELS.insert = function () {
    var grid = [
      ["date", L("Current date", "आज की तिथि"), "📅"],
      ["place", L("Place", "स्थान"), "📍"],
      ["case", L("Case number", "प्रकरण क्रमांक"), "#"],
      ["sections", L("Sections", "धाराएँ"), "§"],
      ["party", L("Party line", "पक्षकार"), "⚖"],
      ["court", L("Court heading", "न्यायालय शीर्षक"), "🏛"],
      ["signature", L("Signature block", "हस्ताक्षर खंड"), "✍"],
      ["pagebreak", L("Page break", "पृष्ठ विराम"), "⤓"],
      ["hr", L("Horizontal rule", "क्षैतिज रेखा"), "—"],
      ["table", L("Table", "तालिका"), "▦"],
      ["image", L("Image", "चित्र"), "🖼"],
      ["toc", L("Table of contents", "विषय-सूची"), "☰"],
      ["field", L("Merge field", "मर्ज फ़ील्ड"), "{ }"],
      ["footnote", L("Footnote", "पाद-टिप्पणी"), "¹"]
    ];
    return "<div class='section-title'>" + L("Insert into document", "दस्तावेज़ में जोड़ें") + "</div>" +
      "<div class='cards'>" + grid.map(function (g) {
        return "<button class='card' data-act='ins' data-what='" + g[0] + "'><span class='cat'>" + g[2] + "</span><strong>" + esc(g[1]) + "</strong></button>";
      }).join("") + "</div>" +
      "<div class='section-title'>" + L("Symbols", "चिह्न") + "</div>" +
      "<div class='row'>" + SYMBOLS.map(function (s) {
        return "<button class='chip' data-act='symbol' data-sym='" + esc(s) + "'>" + esc(s) + "</button>";
      }).join("") + "</div>" +
      "<div class='section-title'>" + L("Table size", "तालिका आकार") + "</div>" +
      "<div class='grid-2'><div class='field'><label>" + L("Rows", "पंक्तियाँ") + "</label><input class='input' id='tbRows' type='number' min='1' max='30' value='4'></div>" +
      "<div class='field'><label>" + L("Columns", "स्तंभ") + "</label><input class='input' id='tbCols' type='number' min='1' max='10' value='3'></div></div>" +
      "<button class='btn block primary' data-act='ins-table'>" + L("Insert table", "तालिका जोड़ें") + "</button>";
  };

  function dateText() {
    var d = new Date();
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
  }

  function handleInsert(what) {
    var c = S.doc.court || {};
    switch (what) {
      case "date": E.insertTextAtCursor(dateText()); break;
      case "place":
        promptModal(L("Place", "स्थान"), L("Court / place name", "न्यायालय स्थान"), c.place || "",
          function (v) { E.insertTextAtCursor(v); });
        return;
      case "case": E.insertTextAtCursor(c.caseNo || "………/" + new Date().getFullYear()); break;
      case "sections": E.insertTextAtCursor(c.sections || ""); break;
      case "party": E.insertTextAtCursor(c.party || ""); break;
      case "court": E.insertTextAtCursor(D.courtName(S.doc)); break;
      case "signature":
        E.insertBlock("p", esc(L("Date: " + dateText(), "दिनांक " + dateText())), null, { align: "right" });
        E.insertBlock("p", esc(L("Signature", "हस्ताक्षर")), null, { align: "right" });
        break;
      case "pagebreak": E.insertBlock("pagebreak", ""); break;
      case "hr": E.insertBlock("hr", ""); break;
      case "table": {
        var rows = parseInt((el("tbRows") || {}).value, 10) || 4;
        var cols = parseInt((el("tbCols") || {}).value, 10) || 3;
        E.insertTable(rows, cols);
        status(ND.t("tableInserted"));
        break;
      }
      case "image": pickImage(); break;
      case "toc":
        if (!E.insertToc()) status(ND.t("tocEmpty"), "warn");
        else status(ND.t("tocInserted"));
        break;
      case "field": insertField(); break;
      case "footnote":
        E.insertHtmlAtCursor("<sup>1</sup> ");
        E.insertBlock("p", "<span style='font-size:8pt'>" + esc(L("1. …", "1. …")) + "</span>");
        break;
    }
  }

  function pickImage() {
    if (!ND.native.has()) {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.style.display = "none";
      input.addEventListener("change", function () {
        var f = input.files && input.files[0];
        if (!f) return;
        var r = new FileReader();
        r.onload = function () {
          E.insertImage(String(r.result), 70);
          status(ND.t("imageInserted"));
        };
        r.readAsDataURL(f);
        input.remove();
      });
      document.body.appendChild(input);
      input.click();
      return;
    }
    ND.native.pickFile(function (name, b64) {
      if (!/\.(png|jpe?g|webp|gif)$/i.test(name || "")) {
        status(L("Choose an image file.", "चित्र फ़ाइल चुनें।"), "warn");
        return;
      }
      E.insertImage("data:image/*;base64," + b64, 70);
      status(ND.t("imageInserted"));
    });
  }

  function insertField() {
    var vars = ["{{court}}", "{{judge}}", "{{place}}", "{{date}}", "{{year}}", "{{caseNo}}", "{{party}}", "{{sections}}", "{{ps}}", "{{prosecutor}}"];
    openModal(L("Merge field", "मर्ज फ़ील्ड"),
      "<p class='hint'>" + L("Fields are filled from Court details when you insert them and when a template is applied.",
        "फ़ील्ड न्यायालय विवरण से भरते हैं।") + "</p><div class='row'>" +
      vars.map(function (v) { return "<button class='chip' data-act='pickvar' data-var='" + esc(v) + "'>" + esc(v) + "</button>"; }).join("") + "</div>",
      [{ label: ND.t("close") }]);
  }

  /* ----------------------------------------------------------------- layout */
  PANELS.layout = function () {
    var p = S.doc.page, st = S.doc.style;
    var sizes = Object.keys(D.PAGE_SIZES).map(function (k) {
      return "<option value='" + k + "'" + (p.size === k ? " selected" : "") + ">" + esc(D.PAGE_SIZES[k].label) + "</option>";
    }).join("");
    var marginPreset = function (key, label) {
      return "<button class='chip' data-act='margin-preset' data-preset='" + key + "'>" + esc(label) + "</button>";
    };
    var m = p.margins || {};
    return "<div class='section-title'>" + L("Paper", "कागज़") + "</div>" +
      "<div class='grid-2'>" +
      "<div class='field'><label>" + L("Size", "आकार") + "</label><select class='select' data-page='size'>" + sizes + "</select></div>" +
      "<div class='field'><label>" + L("Orientation", "अभिविन्यास") + "</label><select class='select' data-page='orientation'>" +
      "<option value='portrait'" + (p.orientation !== "landscape" ? " selected" : "") + ">" + L("Portrait", "उर्ध्व") + "</option>" +
      "<option value='landscape'" + (p.orientation === "landscape" ? " selected" : "") + ">" + L("Landscape", "भूदृश्य") + "</option></select></div>" +
      "</div>" +
      "<div class='section-title'>" + L("Margins (mm)", "हाशिया (मि.मी.)") + "</div>" +
      "<div class='row' style='margin-bottom:10px'>" +
      marginPreset("normal", L("Normal", "सामान्य")) + marginPreset("narrow", L("Narrow", "संकीर्ण")) +
      marginPreset("wide", L("Wide", "चौड़ा")) + marginPreset("court", L("Court", "न्यायालय")) +
      marginPreset("binder", L("Binder", "बंधन")) + "</div>" +
      "<div class='grid-4'>" +
      ["top", "right", "bottom", "left"].map(function (k) {
        return "<div class='field'><label>" + L(k, { top: "ऊपर", right: "दाएँ", bottom: "नीचे", left: "बाएँ" }[k]) +
          "</label><input class='input' type='number' step='0.5' min='5' max='60' data-margin='" + k + "' value='" + (m[k] || 25.4) + "'></div>";
      }).join("") + "</div>" +
      "<div class='section-title'>" + L("Columns", "स्तंभ") + "</div>" +
      seg("cols", [{ v: 1, label: "1" }, { v: 2, label: "2" }, { v: 3, label: "3" }], p.columns || 1) +
      "<div class='section-title'>" + L("Header & footer", "शीर्ष / पाद") + "</div>" +
      "<div class='field'><label>" + L("Header text", "शीर्ष पाठ") + "</label><input class='input' data-page='headerText' value='" + esc(p.headerText || "") + "' placeholder='" + esc(L("e.g. In the Court of …", "जैसे — न्यायालय श्रीमान …")) + "'></div>" +
      "<div class='field'><label>" + L("Footer text", "पाद पाठ") + "</label><input class='input' data-page='footerText' value='" + esc(p.footerText || "") + "'></div>" +
      toggleRow("__page_numbers", L("Page numbers", "पृष्ठ संख्या"), L("Show the page number at the bottom", "नीचे पृष्ठ संख्या दिखाएँ"), p.numbers !== false) +
      "<div class='field' style='margin-top:10px'><label>" + L("Number format", "संख्या शैली") + "</label><select class='select' data-page='numberFormat'>" +
      "<option value='n'" + (p.numberFormat === "n" ? " selected" : "") + ">" + L("1", "1") + "</option>" +
      "<option value='n-of-total'" + (p.numberFormat === "n-of-total" ? " selected" : "") + ">" + L("Page 1 of 4", "पृष्ठ 1 / 4") + "</option>" +
      "<option value='roman'" + (p.numberFormat === "roman" ? " selected" : "") + ">i, ii, iii</option></select></div>" +
      toggleRow("__line_numbers", L("Line numbers", "पंक्ति संख्या"), L("Legal pleading line numbering", "विधिक अभिवचन हेतु"), !!p.lineNumbers) +
      toggleRow("__page_border", L("Page border", "पृष्ठ किनारा"), "", !!p.border) +
      "<div class='section-title'>" + L("Watermark", "वॉटरमार्क") + "</div>" +
      "<div class='field'><input class='input' data-page='watermark' value='" + esc(p.watermark || "") + "' placeholder='" + esc(L("e.g. DRAFT", "जैसे — DRAFT")) + "'></div>" +
      "<div class='row between'><span class='hint'>" + L("Opacity", "पारदर्शिता") + "</span><span class='hint' id='wmVal'>" + Math.round((p.watermarkOpacity === undefined ? 0.08 : p.watermarkOpacity) * 100) + "%</span></div>" +
      "<input type='range' min='3' max='30' value='" + Math.round((p.watermarkOpacity === undefined ? 0.08 : p.watermarkOpacity) * 100) + "' data-page-range='watermarkOpacity' style='width:100%'>" +
      "<div class='section-title'>" + L("Typography", "अक्षर-विन्यास") + "</div>" +
      "<div class='grid-2'>" +
      "<div class='field'><label>" + L("Font size (pt)", "अक्षर आकार (पॉइंट)") + "</label><input class='input' type='number' min='8' max='36' step='0.5' data-style='size' value='" + (st.size || 12) + "'></div>" +
      "<div class='field'><label>" + L("Line height", "पंक्ति ऊँचाई") + "</label><input class='input' type='number' min='1' max='3' step='0.05' data-style='lh' value='" + (st.lh || 1.65) + "'></div>" +
      "<div class='field'><label>" + L("Paragraph gap (pt)", "अनुच्छेद अंतर") + "</label><input class='input' type='number' min='0' max='30' step='1' data-style='paraSpacing' value='" + (st.paraSpacing === undefined ? 6 : st.paraSpacing) + "'></div>" +
      "<div class='field'><label>" + L("First-line indent", "प्रथम पंक्ति इंडेंट") + "</label><select class='select' data-style='firstLine'><option value='0'" + (!st.firstLine ? " selected" : "") + ">" + L("None", "कोई नहीं") + "</option><option value='1'" + (st.firstLine ? " selected" : "") + ">" + L("On", "हाँ") + "</option></select></div>" +
      "</div>" +
      "<div class='section-title'>" + L("View", "दृश्य") + "</div>" +
      seg("pageview", [{ v: "paged", label: L("Paged", "पृष्ठ") }, { v: "continuous", label: L("Continuous", "सतत") }], ND.prefs.pageView || "paged") +
      "<div style='height:8px'></div>" +
      toggleRow("ruler", L("Show ruler", "रूलर दिखाएँ"), "", ND.prefs.ruler !== false) +
      toggleRow("showMarks", L("Show paragraph marks", "अनुच्छेद चिह्न"), "", !!ND.prefs.showMarks) +
      "<div class='section-title'>" + L("Zoom", "ज़ूम") + "</div>" +
      seg("zoom", [{ v: 0.8, label: "80%" }, { v: 1, label: "100%" }, { v: 1.25, label: "125%" }, { v: 1.5, label: "150%" }], S.zoom);
  };

  function setPage(key, value) {
    S.doc.page[key] = value;
    E.rerender();
    applyDocMeta();
    saveDoc();
  }

  function setStyle(key, value) {
    S.doc.style[key] = key === "size" || key === "lh" || key === "paraSpacing" ? Number(value) : value;
    E.rerender();
    applyDocMeta();
    saveDoc();
  }

  /* ------------------------------------------------------------------ tools */
  PANELS.tools = function () {
    var st = D.stats(S.doc);
    return "<div class='section-title'>" + L("Text case", "पाठ का रूप") + "</div>" +
      "<div class='grid-2'>" +
      "<button class='btn' data-act='case' data-mode='upper'>UPPER CASE</button>" +
      "<button class='btn' data-act='case' data-mode='lower'>lower case</button>" +
      "<button class='btn' data-act='case' data-mode='title'>Title Case</button>" +
      "<button class='btn' data-act='case' data-mode='sentence'>Sentence case</button>" +
      "</div>" +
      "<div class='section-title'>" + L("Clean up", "सफ़ाई") + "</div>" +
      "<div class='list'>" +
      actionRow(L("Fix Devanagari matras", "देवनागरी मात्राएँ सुधारें"), L("Repairs गि/कि order and nukta slips", "गि/कि क्रम एवं नुक़्ता सुधार"), "fix-matras") +
      actionRow(L("Smart quotes", "स्मार्ट उद्धरण"), L("Straight quotes → “ ” ‘ ’", "सीधे उद्धरण → “ ” ‘ ’"), "smart-quotes") +
      actionRow(L("Collapse extra spaces", "अतिरिक्त स्पेस हटाएँ"), L("Tidy runs of spaces and blank lines", "खाली पंक्तियाँ व स्पेस"), "collapse-spaces") +
      actionRow(L("Sort lines A→Z", "पंक्तियाँ क्रम में"), L("Sorts the selected paragraphs", "चयनित अनुच्छेद क्रमबद्ध"), "sort-lines") +
      actionRow(L("Transliterate Hindi → Roman", "हिन्दी → रोमन"), L("Readable transliteration of the selection", "चयन का रोमन रूपांतरण"), "translit") +
      "</div>" +
      "<div class='section-title'>" + L("Find & replace", "खोजें व बदलें") + "</div>" +
      "<button class='btn block' data-act='find'>" + L("Open find bar", "खोज पट्टी खोलें") + "</button>" +
      "<div class='section-title'>" + L("Document", "दस्तावेज़") + "</div>" +
      "<div class='list'>" +
      actionRow(L("Select all", "सब चुनें"), L("Ctrl + A", "Ctrl + A"), "select-all") +
      actionRow(L("Word & character count", "शब्द व अक्षर गणना"), ND.t("textStats", { words: st.words, chars: st.chars }), "stats") +
      actionRow(L("Spell check the document", "दस्तावेज़ की वर्तनी जाँच"), "", "spell-all") +
      "</div>";
  };

  function selectionText() {
    var sel = window.getSelection();
    return sel && sel.rangeCount && E.state.pagesEl.contains(sel.anchorNode) ? sel.toString() : "";
  }

  function transformSelection(fn) {
    var text = selectionText();
    if (!text) { status(L("Select some text first.", "पहले पाठ चुनें।"), "warn"); return; }
    E.applyToSelection(function () {
      document.execCommand("insertText", false, fn(text));
    });
  }

  function toTitleCase(s) {
    return s.replace(/\S+/g, function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });
  }

  function toSentenceCase(s) {
    return s.toLowerCase().replace(/(^\s*\w|[.!?।]\s*\w)/g, function (m) { return m.toUpperCase(); });
  }

  function fixMatrasEverywhere() {
    var changed = 0;
    E.pushUndo();
    S.doc.blocks.forEach(function (b) {
      if (!b.html || !U.hasDevanagari(U.stripTags(b.html))) return;
      var parts = b.html.split(/(<[^>]+>)/);
      var out = parts.map(function (p) {
        if (p.charAt(0) === "<") return p;
        var fixed = T.fixMatras(p);
        if (fixed !== p) changed++;
        return fixed;
      }).join("");
      b.html = out;
    });
    E.rerender();
    E.emitChange(true);
    status(changed ? ND.t("fixedMatras") : L("Nothing to fix", "सुधारने को कुछ नहीं"), changed ? "ok" : "warn");
  }

  function smartQuotesEverywhere() {
    E.pushUndo();
    var count = 0;
    S.doc.blocks.forEach(function (b) {
      if (!b.html) return;
      var parts = b.html.split(/(<[^>]+>)/);
      b.html = parts.map(function (p) {
        if (p.charAt(0) === "<") return p;
        var n = p.replace(/(^|[\s([{])"/g, "$1“").replace(/"/g, "”").replace(/(^|[\s([{])'/g, "$1‘").replace(/'/g, "’");
        if (n !== p) count++;
        return n;
      }).join("");
    });
    E.rerender();
    E.emitChange(true);
    status(L("Smart quotes applied", "स्मार्ट उद्धरण लागू"), "ok");
  }

  function collapseSpaces() {
    E.pushUndo();
    S.doc.blocks.forEach(function (b) {
      if (!b.html) return;
      if (b.type === "table" || b.type === "image" || b.type === "toc") return;
      b.html = b.html.replace(/&nbsp;|\u00a0/g, " ").replace(/ {2,}/g, " ").trim();
    });
    E.rerender();
    E.emitChange(true);
  }

  function sortLines() {
    var text = selectionText();
    if (!text) { status(L("Select paragraphs to sort.", "क्रमबद्ध करने हेतु अनुच्छेद चुनें।"), "warn"); return; }
    var sorted = text.split(/\n/).filter(function (s) { return s.trim(); })
      .sort(function (a, b) { return a.localeCompare(b, ND.lang() === "hi" ? "hi" : "en"); }).join("\n");
    E.applyToSelection(function () { document.execCommand("insertText", false, sorted); });
  }

  /* ------------------------------------------------------------- dictionary */
  PANELS.dictionary = function () {
    return "<div class='dict-search'><input class='input' id='dictInput' placeholder='" +
      esc(L("Hindi or English word…", "हिन्दी या अंग्रेज़ी शब्द…")) + "' value='" + esc(S.dictQuery) + "'>" +
      "<button class='btn' data-act='dict-go'>" + L("Look up", "खोजें") + "</button></div>" +
      (S.dictReady ? "" : "<p class='hint warn'>" + L("Dictionary is loading…", "शब्दकोश लोड हो रहा है…") + "</p>") +
      "<div id='dictResults'>" + dictResultsHtml() + "</div>";
  };
  AFTER.dictionary = function () {
    var i = el("dictInput");
    if (i) { i.focus(); }
  };

  function dictResultsHtml() {
    if (!S.dictQuery) {
      var st = ND.dict.ready ? ND.dict.stats() : { hindi: 0, english: 0, legal: (ND.LEGAL || []).length };
      return "<div class='hint'>" + L("Offline dictionary: {h} Hindi words, {e} English words, {g} legal terms.",
        "ऑफ़लाइन शब्दकोश: {h} हिन्दी शब्द, {e} अंग्रेज़ी शब्द, {g} विधिक शब्द।")
        .replace("{h}", st.hindi.toLocaleString("en-IN")).replace("{e}", st.english.toLocaleString("en-IN")).replace("{g}", st.legal) +
        "<br><br>" + L("Tap any word below to explore the legal glossary.", "नीचे किसी शब्द पर टैप करें।") + "</div>" +
        "<div class='row' style='margin-top:10px'>" + (ND.LEGAL || []).slice(0, 12).map(function (e) {
          return "<button class='chip' data-act='dict-word' data-word='" + esc(e.h) + "'>" + esc(e.h) + "</button>";
        }).join("") + "</div>";
    }
    var results = S.dictResults || [];
    if (!results.length) {
      return "<div class='empty'>" + L("No match. Try a shorter word.", "कोई परिणाम नहीं। छोटा शब्द आज़माएँ।") + "</div>";
    }
    return results.map(function (r) {
      var head = r.h ?
        "<span class='hw' style='font-family:var(--ui-dev)'>" + esc(r.h) + "</span>" + (r.e ? "<span class='en'>" + esc(r.e) + "</span>" : "") :
        "<span class='hw'>" + esc(r.e || "") + "</span>";
      return "<div class='dict-entry'><div class='head'>" + head +
        "<span class='meta'>" + esc(r.src || "") + "</span></div>" +
        (r.g ? "<div class='gloss'>" + esc(r.g) + "</div>" : "") +
        (r.h ? "<div class='row' style='margin-top:6px'><button class='sug' data-act='dict-insert' data-word='" + esc(r.h) + "'>" + L("Insert", "जोड़ें") + "</button>" +
          "<button class='sug' data-act='dict-save' data-word='" + esc(r.h) + "'>" + L("Add to dictionary", "शब्दकोश में जोड़ें") + "</button></div>" : "") +
        "</div>";
    }).join("");
  }

  function runDictLookup(q) {
    S.dictQuery = String(q || "").trim();
    if (!S.dictQuery) { S.dictResults = []; }
    else if (!ND.dict.ready) { S.dictResults = []; }
    else {
      S.dictResults = ND.dict.search(S.dictQuery, 60);
      var exactHi = ND.dict.lookupHindi(S.dictQuery);
      if (exactHi.legal && !S.dictResults.some(function (r) { return r.h === exactHi.legal.h && r.g; })) {
        S.dictResults.unshift({ h: exactHi.legal.h, e: exactHi.legal.e, g: exactHi.legal.g, src: L("Legal glossary", "विधिक शब्दावली") });
      }
      var exactEn = ND.dict.lookupEnglish(S.dictQuery);
      exactEn.entries.slice(0, 6).forEach(function (e) {
        if (!S.dictResults.some(function (r) { return r.h === e.h; })) {
          S.dictResults.unshift({ h: e.h, e: e.e, g: e.g, src: L("Legal glossary", "विधिक शब्दावली") });
        }
      });
    }
    var box = el("dictResults");
    if (box) box.innerHTML = dictResultsHtml();
  }

  /* ------------------------------------------------------------------ spell */
  PANELS.spell = function () {
    return "<div class='row' style='margin-bottom:12px'>" +
      "<button class='btn primary' data-act='spell-run'>" + L("Check document", "दस्तावेज़ जाँचें") + "</button>" +
      "<button class='btn' data-act='spell-live'>" + (ND.prefs.autoSpell ? L("Live: on", "लाइव: चालू") : L("Live: off", "लाइव: बंद")) + "</button></div>" +
      "<p class='hint'>" + L("Checked against the offline Hindi WordNet lexicon and an English word list. Legal terms and acronyms are recognised.",
        "ऑफ़लाइन हिन्दी वर्डनेट व अंग्रेज़ी शब्द-सूची से जाँच। विधिक शब्द व संक्षेपाक्षर मान्य हैं।") + "</p>" +
      "<div id='spellList'>" + spellListHtml() + "</div>" +
      "<div class='section-title'>" + L("Personal dictionary", "व्यक्तिगत शब्दकोश") + "</div>" +
      "<div class='row' id='userDictRow'>" + userWordsHtml() + "</div>" +
      "<div class='row' style='margin-top:10px'><input class='input' id='udInput' placeholder='" + esc(L("Add a word…", "शब्द जोड़ें…")) + "' style='flex:1'>" +
      "<button class='btn' data-act='ud-add'>" + ND.t("add") + "</button></div>";
  };

  function userWordsHtml() {
    var keys = Object.keys(ND.dict.user || {});
    if (!keys.length) return "<span class='hint'>" + L("No personal words yet.", "अभी कोई व्यक्तिगत शब्द नहीं।") + "</span>";
    return keys.map(function (k) {
      return "<button class='chip' data-act='ud-del' data-word='" + esc(k) + "'>" + esc(k) + " ×</button>";
    }).join("");
  }

  function spellListHtml() {
    if (!S.spellIssues) {
      return "<div class='hint'>" + (ND.dict.ready ? L("Tap “Check document” to start.", "शुरू करने हेतु “दस्तावेज़ जाँचें” दबाएँ।") : L("Loading dictionary…", "शब्दकोश लोड हो रहा है…")) + "</div>";
    }
    if (!S.spellIssues.length) {
      return "<div class='empty' style='color:var(--ok)'>" + L("No spelling mistakes found.", "कोई वर्तनी त्रुटि नहीं मिली।") + "</div>";
    }
    return "<div class='hint' style='margin-bottom:6px'>" + S.spellIssues.length + " " +
      L("words to review", "शब्द जाँचने योग्य") + "</div>" +
      S.spellIssues.map(function (it, i) {
        var sugs = (it.suggestions || []).slice(0, 5).map(function (s) {
          return "<button class='sug' data-act='spell-fix' data-i='" + i + "' data-word='" + esc(s) + "'>" + esc(s) + "</button>";
        }).join("");
        return "<div class='spell-item'><div class='bad'>" + esc(it.word) + "</div><div class='sugs'>" +
          (sugs || "<span class='hint'>" + L("no suggestions", "सुझाव नहीं") + "</span>") +
          "<button class='sug' data-act='spell-add' data-i='" + i + "'>+ " + L("Add", "जोड़ें") + "</button>" +
          "<button class='sug' data-act='spell-goto' data-i='" + i + "'>↗</button></div></div>";
      }).join("");
  }

  function runSpell() {
    if (!ND.dict.ready) { status(L("Dictionary still loading…", "शब्दकोश लोड हो रहा है…"), "warn"); return; }
    E.syncAll();
    var issues = [], seen = {};
    S.doc.blocks.forEach(function (b) {
      if (!b.html || b.type === "image" || b.type === "table") return;
      var text = U.stripTags(b.html).replace(/\u00a0/g, " ");
      ND.dict.checkText(text).forEach(function (it) {
        var key = it.word;
        if (seen[key]) return;
        seen[key] = 1;
        it.blockId = b.id;
        it.suggestions = ND.dict.suggest(it.word, 6);
        issues.push(it);
      });
    });
    S.spellIssues = issues;
    var box = el("spellList");
    if (box) box.innerHTML = spellListHtml();
    if (!issues.length) status(L("No spelling mistakes found.", "कोई वर्तनी त्रुटि नहीं मिली।"));
  }

  function replaceWord(oldWord, newWord) {
    E.pushUndo();
    var n = 0;
    S.doc.blocks.forEach(function (b) {
      if (!b.html) return;
      var plain = U.stripTags(b.html);
      if (plain.indexOf(oldWord) < 0) return;
      b.html = b.html.replace(new RegExp(escRe(oldWord), "g"), esc(newWord));
      n++;
    });
    E.rerender();
    E.emitChange(true);
    if (n) status(L("Replaced", "बदला गया"));
  }

  function escRe(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  /* ------------------------------------------------------------------ voice */
  PANELS.voice = function () {
    return "<div class='cards' style='grid-template-columns:1fr 1fr'>" +
      "<button class='card' data-act='voice-start'><span class='cat'>●</span><strong>" + L("Start dictation", "बोलना शुरू करें") + "</strong><small>" + L("Speak in Hindi or English", "हिन्दी या अंग्रेज़ी में बोलें") + "</small></button>" +
      "<button class='card' data-act='voice-stop'><span class='cat'>■</span><strong>" + L("Stop", "रोकें") + "</strong><small>" + L("Finish and review", "समाप्त करें") + "</small></button>" +
      "</div>" +
      "<div class='section-title'>" + L("Transcript", "प्रतिलेख") + "</div>" +
      "<div class='area' id='voiceBox' style='min-height:160px;white-space:pre-wrap;padding:10px;border:1px solid var(--line);border-radius:9px;font-family:var(--ui-dev)'>" +
      (S.voiceText ? esc(S.voiceText) : "<span class='hint'>" + L("Your dictation will appear here…", "आपका बोला हुआ पाठ यहाँ दिखेगा…") + "</span>") + "</div>" +
      "<div class='row' style='margin-top:10px'>" +
      "<button class='btn primary' data-act='voice-insert'>" + L("Insert into document", "दस्तावेज़ में जोड़ें") + "</button>" +
      "<button class='btn' data-act='voice-clear'>" + L("Clear", "साफ़ करें") + "</button>" +
      "</div>" +
      "<p class='hint' style='margin-top:12px'>" + L("Dictation uses the speech engine installed on your tablet. Hindi recognition needs the Hindi voice pack in Android settings → System → Languages & input → Voice input. Works fully offline once installed.",
        "टैबलेट के स्पीच इंजन का उपयोग होता है। हिन्दी हेतु Android सेटिंग्स → भाषा व इनपुट → वॉइस इनपुट में हिन्दी पैक जोड़ें। एक बार जोड़ने पर ऑफ़लाइन काम करता है।") + "</p>" +
      (ND.native.has() ? "" : "<p class='hint warn'>" + L("In-browser preview may not provide speech recognition — install the APK on the tablet for full dictation.",
        "ब्राउज़र पूर्वावलोकन में स्पीच उपलब्ध न हो सकता है — पूर्ण सुविधा हेतु APK टैबलेट पर इंस्टॉल करें।") + "</p>");
  };

  function paintVoice() {
    var box = el("voiceBox");
    if (!box) return;
    box.innerHTML = S.voiceText ? esc(S.voiceText) : "<span class='hint'>" + L("Your dictation will appear here…", "आपका बोला हुआ पाठ यहाँ दिखेगा…") + "</span>";
  }

  function startVoice() {
    if (S.voiceOn) return;
    if (ND.native.has()) {
      global.NDVoiceResult = function (text, isFinal) {
        if (text) {
          S.voiceText += (S.voiceText && !/\s$/.test(S.voiceText) ? " " : "") + text;
          paintVoice();
        }
        if (isFinal) { S.voiceOn = false; }
      };
      global.NDVoiceEnd = function () { S.voiceOn = false; };
      ND.native.call("startVoice");
      S.voiceOn = true;
      status(L("Listening…", "सुन रहा है…"));
      return;
    }
    var SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!SR) {
      status(L("Speech recognition is not available in this browser. Install the APK on your tablet.",
        "इस ब्राउज़र में स्पीच उपलब्ध नहीं है। टैबलेट पर APK इंस्टॉल करें।"), "warn", 5000);
      return;
    }
    var rec = new SR();
    rec.lang = ND.lang() === "hi" ? "hi-IN" : "en-IN";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = function (ev) {
      for (var i = ev.resultIndex; i < ev.results.length; i++) {
        if (ev.results[i].isFinal) {
          S.voiceText += (S.voiceText && !/\s$/.test(S.voiceText) ? " " : "") + ev.results[i][0].transcript;
          paintVoice();
        }
      }
    };
    rec.onerror = function (e) {
      S.voiceOn = false;
      status(L("Speech error: ", "स्पीच त्रुटि: ") + (e.error || ""), "warn");
    };
    rec.onend = function () { S.voiceOn = false; };
    S.voiceRec = rec;
    S.voiceOn = true;
    try { rec.start(); status(L("Listening…", "सुन रहा है…")); } catch (e) { S.voiceOn = false; }
  }

  function stopVoice() {
    if (ND.native.has()) ND.native.call("stopVoice");
    if (S.voiceRec) { try { S.voiceRec.stop(); } catch (e) {} }
    S.voiceOn = false;
    status(L("Stopped", "रुका"));
  }

  /* ---------------------------------------------------------------- convert */
  PANELS.convert = function () {
    var fonts = [
      ["krutidev", "Kruti Dev 010 / 016"],
      ["devlys", "DevLys 010"],
      ["chanakya", "Chanakya"],
      ["remington", "Remington / Agra"],
      ["kundli", "Kundli"]
    ];
    return "<div class='tabs'>" +
      "<button data-act='conv-mode' data-mode='k2u' class='" + (S.convMode === "k2u" ? "on" : "") + "'>" + L("Kruti Dev → Unicode", "कृतिदेव → यूनिकोड") + "</button>" +
      "<button data-act='conv-mode' data-mode='u2k' class='" + (S.convMode === "u2k" ? "on" : "") + "'>" + L("Unicode → Kruti Dev", "यूनिकोड → कृतिदेव") + "</button>" +
      "</div>" +
      "<div class='field'><label>" + L("Source font", "स्रोत फ़ॉन्ट") + "</label><select class='select' id='convFont'>" +
      fonts.map(function (f) { return "<option value='" + f[0] + "'" + (S.convFont === f[0] ? " selected" : "") + ">" + f[1] + "</option>"; }).join("") +
      "</select></div>" +
      "<div class='conv-grid'>" +
      "<div><div class='lbl-sm'>" + L("Input", "इनपुट") + "</div><textarea class='area' id='convIn' placeholder='" + esc(L("Paste legacy text here…", "यहाँ पुराना पाठ चिपकाएँ…")) + "'></textarea></div>" +
      "<div><div class='lbl-sm'>" + L("Output", "परिणाम") + "</div><textarea class='area' id='convOut' readonly></textarea></div>" +
      "</div>" +
      "<div class='row' style='margin-top:10px'>" +
      "<button class='btn primary' data-act='conv-run'>" + L("Convert", "बदलें") + "</button>" +
      "<button class='btn' data-act='conv-insert'>" + L("Insert into document", "दस्तावेज़ में जोड़ें") + "</button>" +
      "<button class='btn' data-act='conv-copy'>" + ND.t("copy") + "</button>" +
      "<button class='btn' data-act='conv-swap'>⇄ " + L("Swap", "बदलें") + "</button>" +
      "</div>" +
      "<p class='hint' style='margin-top:12px'>" + L("Converts legacy Kruti Dev, DevLys, Chanakya and Remington byte-sequences to standard Unicode Devanagari — what Word, WPS and every modern court system expect. Reverse conversion is available when a court still demands a legacy font.",
        "कृतिदेव, देवलिस, चाणक्य व रेमिंग्टन को मानक यूनिकोड देवनागरी में बदलता है — जो Word, WPS व आधुनिक न्यायालय प्रणाली में चलता है। विपरीत रूपांतरण भी उपलब्ध है।") + "</p>";
  };

  function runConvert() {
    var input = el("convIn"), output = el("convOut");
    if (!input || !output) return;
    var text = input.value;
    if (!text.trim()) { status(L("Paste some text first.", "पहले पाठ चिपकाएँ।"), "warn"); return; }
    if (S.convMode === "u2k") {
      output.value = T.unicodeToKruti(text);
    } else if (S.convFont === "chanakya") {
      output.value = T.chanakyaToUnicode(text);
    } else if (S.convFont === "devlys") {
      output.value = T.devlysToUnicode(text);
    } else if (S.convFont === "remington") {
      output.value = T.remingtonToUnicode(text);
    } else if (S.convFont === "kundli") {
      output.value = T.kundliToUnicode(text);
    } else {
      output.value = T.fixMatras(T.krutiToUnicode(text));
    }
  }

  /* ------------------------------------------------------------------ legal */
  PANELS.legal = function () {
    var tabs = [
      ["glossary", L("Glossary", "शब्दावली")],
      ["bns", "BNS ↔ IPC"],
      ["bnss", "BNSS ↔ CrPC"],
      ["limitation", L("Limitation", "परिसीमा")],
      ["rules", L("Court rules", "न्यायालय नियम")]
    ];
    var body = "";
    var q = S.legalQuery.toLowerCase();
    if (S.legalTab === "glossary") {
      var rows = (ND.LEGAL || []).filter(function (e) {
        return !q || (e.h + " " + e.e + " " + e.g).toLowerCase().indexOf(q) >= 0;
      }).slice(0, 300);
      body = rows.map(function (e) {
        return "<div class='dict-entry'><div class='head'><span class='hw' style='font-family:var(--ui-dev)'>" + esc(e.h) + "</span>" +
          "<span class='en'>" + esc(e.e) + "</span></div><div class='gloss'>" + esc(e.g) + "</div>" +
          "<div class='row' style='margin-top:5px'><button class='sug' data-act='dict-insert' data-word='" + esc(e.h) + "'>" + L("Insert", "जोड़ें") + "</button></div></div>";
      }).join("") || "<div class='empty'>" + L("No entry found.", "कोई प्रविष्टि नहीं मिली।") + "</div>";
    } else if (S.legalTab === "bns" || S.legalTab === "bnss") {
      var table = S.legalTab === "bns" ? ND.BNS_IPC : ND.BNSS_CRPC;
      body = "<table style='width:100%;border-collapse:collapse;font-size:12.5px'>" +
        "<tr><th style='text-align:left;padding:6px;border-bottom:1px solid var(--line)'>" + (S.legalTab === "bns" ? "BNS" : "BNSS") + "</th>" +
        "<th style='text-align:left;padding:6px;border-bottom:1px solid var(--line)'>" + (S.legalTab === "bns" ? "IPC" : "CrPC") + "</th>" +
        "<th style='text-align:left;padding:6px;border-bottom:1px solid var(--line)'>" + L("Subject", "विषय") + "</th></tr>" +
        (table || []).filter(function (r) {
          return !q || String(r.join(" ")).toLowerCase().indexOf(q) >= 0;
        }).map(function (r) {
          return "<tr><td style='padding:6px;border-bottom:1px solid var(--line)'><b>" + esc(r[0]) + "</b></td>" +
            "<td style='padding:6px;border-bottom:1px solid var(--line)'>" + esc(r[1]) + "</td>" +
            "<td style='padding:6px;border-bottom:1px solid var(--line)'>" + esc(r[2] || "") + "</td></tr>";
        }).join("") + "</table>";
    } else if (S.legalTab === "limitation") {
      body = "<table style='width:100%;border-collapse:collapse;font-size:12.5px'>" +
        (ND.LIMITATION || []).filter(function (r) { return !q || String(r.join(" ")).toLowerCase().indexOf(q) >= 0; })
          .map(function (r) {
            return "<tr><td style='padding:6px;border-bottom:1px solid var(--line)'>" + esc(r[0]) + "</td>" +
              "<td style='padding:6px;border-bottom:1px solid var(--line)'>" + esc(r[1]) + "</td></tr>";
          }).join("") + "</table>";
    } else {
      body = "<div class='list'>" + (ND.RULES || []).filter(function (r) {
        return !q || String(r.join(" ")).toLowerCase().indexOf(q) >= 0;
      }).map(function (r) {
        return "<div class='list-item'><span class='grow'><strong>" + esc(r[0]) + "</strong><small>" + esc(r[1]) + "</small></span></div>";
      }).join("") + "</div>";
    }
    return "<div class='tabs'>" + tabs.map(function (t) {
      return "<button data-act='legal-tab' data-tab='" + t[0] + "' class='" + (S.legalTab === t[0] ? "on" : "") + "'>" + esc(t[1]) + "</button>";
    }).join("") + "</div>" +
      "<input class='input' id='legalSearch' placeholder='" + esc(L("Search reference…", "संदर्भ खोजें…")) + "' value='" + esc(S.legalQuery) + "' style='margin-bottom:10px'>" +
      "<div style='max-height:none'>" + body + "</div>" +
      "<p class='hint warn' style='margin-top:14px'>" + L("Cross-reference tables are indicative study aids. Always verify against the official Gazette / Rajasthan High Court Rules before filing.",
        "तालिकाएँ केवल सहायक हैं। दाखिल करने से पूर्व राजपत्र / राजस्थान उच्च न्यायालय नियमों से पुष्टि करें।") + "</p>";
  };

  /* --------------------------------------------------------------- settings */
  PANELS.settings = function () {
    var accents = { indigo: "#4f46e5", saffron: "#c2410c", teal: "#0f766e", plum: "#7e22ce", slate: "#334155" };
    return "<div class='section-title'>" + L("Language", "भाषा") + "</div>" +
      "<div class='set-row'><div class='lbl'><strong>" + L("Interface language", "इंटरफ़ेस भाषा") + "</strong><small>" +
      L("English is the default. Document text is unaffected.", "डिफ़ॉल्ट अंग्रेज़ी। दस्तावेज़ के पाठ पर कोई असर नहीं।") + "</small></div>" +
      seg("langset", [{ v: "en", label: "English" }, { v: "hi", label: "हिन्दी" }], ND.lang()) + "</div>" +
      "<div class='section-title'>" + L("Appearance", "रूप") + "</div>" +
      "<div class='set-row'><div class='lbl'><strong>" + L("Theme", "थीम") + "</strong></div>" +
      seg("theme", [{ v: "light", label: L("Light", "हल्का") }, { v: "sepia", label: L("Sepia", "सेपिया") }, { v: "dark", label: L("Dark", "गहरा") }, { v: "auto", label: L("Auto", "स्वतः") }], ND.prefs.theme) + "</div>" +
      "<div class='set-row'><div class='lbl'><strong>" + L("Accent", "रंग") + "</strong></div>" +
      "<div class='swatches'>" + Object.keys(accents).map(function (k) {
        return "<button class='swatch" + (ND.prefs.accent === k ? " on" : "") + "' data-act='accent' data-accent='" + k + "' style='background:" + accents[k] + "' aria-label='" + k + "'></button>";
      }).join("") + "</div></div>" +
      toggleRow("autosave", L("Autosave", "स्वतः सहेजें"), L("Save every change automatically", "प्रत्येक परिवर्तन स्वतः सहेजें"), ND.prefs.autosave !== false) +
      toggleRow("autoSpell", L("Live spelling", "लाइव वर्तनी"), L("Underline doubtful words as you type", "संदिग्ध शब्दों पर रेखा"), ND.prefs.autoSpell !== false) +
      toggleRow("statusBar", L("Status bar", "स्टेटस बार"), "", ND.prefs.statusBar !== false) +
      toggleRow("typewriter", L("Typewriter scrolling", "टाइपराइटर स्क्रॉल"), L("Keeps the caret in the middle", "कर्सर मध्य में रहे"), !!ND.prefs.typewriter) +
      "<div class='section-title'>" + L("Writing", "लेखन") + "</div>" +
      "<button class='list-item' data-act='open-court'><span class='grow'><strong>" + L("Court details", "न्यायालय विवरण") + "</strong>" +
      "<small>" + esc(D.courtName(S.doc)) + "</small></span><span>›</span></button>" +
      "<div style='height:6px'></div>" +
      "<button class='list-item' data-act='open-fonts'><span class='grow'><strong>" + L("Font library", "फ़ॉन्ट संग्रह") + "</strong>" +
      "<small>" + esc(ND.fonts.label(S.doc.style.devFont)) + " · " + esc(ND.fonts.label(S.doc.style.latinFont)) + "</small></span><span>›</span></button>" +
      "<div class='section-title'>" + L("Defaults for new documents", "नए दस्तावेज़ हेतु डिफ़ॉल्ट") + "</div>" +
      "<div class='grid-2'><div class='field'><label>" + L("Devanagari font", "देवनागरी फ़ॉन्ट") + "</label>" +
      "<select class='select' data-pref='devFont'>" + ND.fonts.dev().map(function (f) {
        return "<option value='" + f.id + "'" + (ND.prefs.devFont === f.id ? " selected" : "") + ">" + esc(f.label) + "</option>";
      }).join("") + "</select></div>" +
      "<div class='field'><label>" + L("Latin font", "लैटिन फ़ॉन्ट") + "</label>" +
      "<select class='select' data-pref='latinFont'>" + ND.fonts.latin().map(function (f) {
        return "<option value='" + f.id + "'" + (ND.prefs.latinFont === f.id ? " selected" : "") + ">" + esc(f.label) + "</option>";
      }).join("") + "</select></div></div>" +
      "<div class='grid-2'><div class='field'><label>" + L("Default size", "डिफ़ॉल्ट आकार") + "</label>" +
      "<input class='input' type='number' min='8' max='24' data-prefnum='size' value='" + (ND.prefs.size || 12) + "'></div>" +
      "<div class='field'><label>" + L("Default line height", "पंक्ति ऊँचाई") + "</label>" +
      "<input class='input' type='number' min='1' max='3' step='0.05' data-prefnum='lh' value='" + (ND.prefs.lh || 1.65) + "'></div></div>" +
      "<div class='section-title'>" + L("Data", "डेटा") + "</div>" +
      "<div class='list'>" +
      actionRow(L("Statistics", "आँकड़े"), "", "open-stats") +
      actionRow(L("Help & shortcuts", "सहायता व शॉर्टकट"), "", "open-help") +
      actionRow(L("About NyayaLekh", "न्यायालेख के बारे में"), "", "open-about") +
      "</div>" +
      "<div style='height:10px'></div>" +
      "<button class='btn danger block' data-act='reset-prefs'>" + L("Reset all settings", "सभी सेटिंग्स रीसेट करें") + "</button>" +
      "<p class='hint' style='margin-top:10px'>" + L("Documents live only on this device. Nothing is uploaded — the app works fully offline.",
        "दस्तावेज़ केवल इसी डिवाइस पर रहते हैं। कुछ भी अपलोड नहीं होता — ऐप पूर्णतः ऑफ़लाइन है।") + "</p>";
  };

  /* --------------------------------------------------------------- export */
  PANELS.export = function () {
    var fmts = [
      ["docx", "DOCX", L("Opens in WPS Office, Word, Google Docs", "WPS Office, Word में खुलता है")],
      ["pdf", "PDF", L("Print-ready via the system print dialog", "सिस्टम प्रिंट से PDF")],
      ["html", "HTML", L("Web page with fonts and layout", "फ़ॉन्ट व लेआउट सहित वेब पेज")],
      ["rtf", "RTF", L("Widely compatible rich text", "विस्तृत संगतता वाला रिच टेक्स्ट")],
      ["txt", "TXT", L("Plain Unicode text", "सादा यूनिकोड पाठ")],
      ["md", "Markdown", L("Structured plain text", "संरचित पाठ")]
    ];
    return "<div class='cards'>" + fmts.map(function (f) {
      return "<button class='card' data-act='export' data-fmt='" + f[0] + "'><span class='cat'>" + f[1] + "</span>" +
        "<strong>" + L("Export ", "निर्यात ") + f[1] + "</strong><small>" + esc(f[2]) + "</small></button>";
    }).join("") + "</div>" +
      "<div class='section-title'>" + L("Other", "अन्य") + "</div>" +
      "<div class='list'>" +
      actionRow(L("Copy full text", "पूरा पाठ कॉपी करें"), "", "copy-doc") +
      actionRow(L("Share as text", "पाठ के रूप में साझा"), "", "share-doc") +
      actionRow(L("Print", "प्रिंट"), "", "print-doc") +
      "</div>" +
      "<p class='hint' style='margin-top:12px'>" + L("Files are written to Documents/NyayaLekh, where WPS Office can open them. PDF export uses Android's print-to-PDF.",
        "फ़ाइलें Documents/NyayaLekh में सहेजी जाती हैं, जहाँ से WPS Office खोल सकता है। PDF हेतु Android प्रिंट सेव करें।") + "</p>";
  };

  /* --------------------------------------------------------------- import */
  PANELS.import = function () {
    return "<div class='cards'>" +
      "<button class='card' data-act='import-file'><span class='cat'>DOCX</span><strong>" + L("Word document", "वर्ड दस्तावेज़") + "</strong><small>WPS Office / Word</small></button>" +
      "<button class='card' data-act='import-file'><span class='cat'>ODT</span><strong>OpenDocument</strong><small>LibreOffice / WPS</small></button>" +
      "<button class='card' data-act='import-file'><span class='cat'>RTF</span><strong>Rich Text</strong><small>Legacy but common</small></button>" +
      "<button class='card' data-act='import-file'><span class='cat'>PDF</span><strong>PDF text</strong><small>" + L("Text layer only", "केवल पाठ परत") + "</small></button>" +
      "<button class='card' data-act='import-file'><span class='cat'>TXT</span><strong>" + L("Plain text", "सादा पाठ") + "</strong><small>UTF-8</small></button>" +
      "<button class='card' data-act='import-file'><span class='cat'>HTML</span><strong>HTML</strong><small>.html</small></button>" +
      "</div>" +
      "<div class='section-title'>" + L("Legacy Hindi fonts", "पुराने हिन्दी फ़ॉन्ट") + "</div>" +
      "<p class='hint'>" + L("Text typed in Kruti Dev or DevLys is detected automatically and converted to Unicode on paste or import.",
        "कृतिदेव या देवलिस में लिखा पाठ चिपकाने/आयात करने पर स्वतः यूनिकोड में बदलता है।") + "</p>" +
      "<button class='btn block' data-act='open-convert'>" + L("Open converter", "परिवर्तक खोलें") + "</button>" +
      "<p class='hint warn' style='margin-top:12px'>" + L("Old binary .doc files are not supported — open them in WPS Office and save as .docx first.",
        "पुरानी .doc फ़ाइलें समर्थित नहीं — WPS Office में खोलकर .docx में सहेजें।") + "</p>";
  };

  /* ---------------------------------------------------------------- court */
  PANELS.court = function () {
    var c = S.doc.court || {};
    return "<div class='field'><label>" + L("Court type", "न्यायालय प्रकार") + "</label><select class='select' data-court='type'>" +
      D.COURTS.map(function (x) {
        return "<option value='" + x.id + "'" + (c.type === x.id ? " selected" : "") + ">" +
          esc(ND.lang() === "hi" ? x.hi : x.en) + " — " + esc(x.hi) + "</option>";
      }).join("") + "</select></div>" +
      "<div class='field'><label>" + L("Place / district", "स्थान / जिला") + "</label><input class='input' data-court='place' value='" + esc(c.place || "") + "' placeholder='जयपुर'></div>" +
      "<div class='field'><label>" + L("Full court name (optional)", "पूरा न्यायालय नाम (वैकल्पिक)") + "</label><input class='input' data-court='name' value='" + esc(c.name || "") + "' placeholder='" + esc(D.COURTS.filter(function (x) { return x.id === c.type; }).map(function (x) { return x.prefix; })[0] || "") + "'></div>" +
      "<div class='grid-2'>" +
      "<div class='field'><label>" + L("Judge", "न्यायाधीश") + "</label><input class='input' data-court='judge' value='" + esc(c.judge || "") + "'></div>" +
      "<div class='field'><label>" + L("Case number", "प्रकरण क्रमांक") + "</label><input class='input' data-court='caseNo' value='" + esc(c.caseNo || "") + "'></div>" +
      "<div class='field'><label>" + L("Prosecutor", "अभियोजक") + "</label><input class='input' data-court='prosecutor' value='" + esc(c.prosecutor || "") + "'></div>" +
      "<div class='field'><label>" + L("Police station", "थाना") + "</label><input class='input' data-court='ps' value='" + esc(c.ps || "") + "'></div>" +
      "</div>" +
      "<div class='field'><label>" + L("Party line", "पक्षकार पंक्ति") + "</label><input class='input' data-court='party' value='" + esc(c.party || "") + "' placeholder='राज्य राजस्थान बनाम …'></div>" +
      "<div class='field'><label>" + L("Sections", "धाराएँ") + "</label><input class='input' data-court='sections' value='" + esc(c.sections || "") + "' placeholder='धारा 302 IPC / 103 BNS'></div>" +
      "<div class='field'><label>" + L("Clerk / reader", "नाज़िर / पेशकार") + "</label><input class='input' data-court='clerk' value='" + esc(c.clerk || "") + "'></div>" +
      "<div class='section-title'>" + L("Preview", "पूर्वावलोकन") + "</div>" +
      "<div style='border:1px solid var(--line);border-radius:9px;padding:10px;font-family:var(--ui-dev);font-size:13.5px'>" +
      esc(D.courtName(S.doc)) + "</div>" +
      "<div class='row' style='margin-top:12px'>" +
      "<button class='btn primary' data-act='court-insert'>" + L("Insert court heading", "न्यायालय शीर्षक जोड़ें") + "</button>" +
      "<button class='btn' data-act='court-fill'>" + L("Fill placeholders", "स्थान-चिह्न भरें") + "</button>" +
      "</div>" +
      "<p class='hint' style='margin-top:10px'>" + L("Placeholders such as {{caseNo}} in the document are replaced with these values; existing text is never overwritten.",
        "दस्तावेज़ के {{caseNo}} जैसे स्थान-चिह्न इन मानों से भरते हैं; मौजूदा पाठ नहीं बदलता।") + "</p>";
  };

  function fillPlaceholders() {
    E.pushUndo();
    var n = 0;
    S.doc.blocks.forEach(function (b) {
      if (!b.html || b.html.indexOf("{{") < 0) return;
      var next = D.applyVars(U.stripTags(b.html), S.doc);
      b.html = U.escapeHtml(next);
      n++;
    });
    E.rerender();
    E.emitChange(true);
    saveDoc();
    status(n ? L("Placeholders filled", "स्थान-चिह्न भर गए") : L("No placeholders found", "कोई स्थान-चिह्न नहीं"), n ? "ok" : "warn");
  }

  /* ---------------------------------------------------------------- fonts */
  PANELS.fonts = function () {
    var q = (S.fontQuery || "").toLowerCase();
    var devs = ND.fonts.dev().filter(function (f) { return !q || (f.label + " " + f.id).toLowerCase().indexOf(q) >= 0; });
    var lats = ND.fonts.latin().filter(function (f) { return !q || (f.label + " " + f.id).toLowerCase().indexOf(q) >= 0; });
    var item = function (f, script) {
      var current = script === "dev" ? S.doc.style.devFont : S.doc.style.latinFont;
      var preview = script === "dev" ? "न्यायालय श्रीमान — क, ख, ग, धारा 302" : "The Court of Sessions — Aa Bb 123";
      return "<button class='font-item" + (current === f.id ? " on" : "") + "' data-act='set-font' data-font='" + f.id + "' data-script='" + script + "'>" +
        "<span><span class='fname' style=\"font-family:'" + esc(f.label) + "'\">" + esc(f.label) + "</span>" +
        "<span class='fmeta'> · " + esc(f.category || f.script) + "</span></span>" +
        "<span class='fprev' style=\"font-family:'" + esc(f.label) + "'\">" + preview + "</span></button>";
    };
    return "<input class='input' id='fontSearch' placeholder='" + esc(L("Search {n} fonts…", "{n} फ़ॉन्ट खोजें…").replace("{n}", ND.fonts.list.length)) + "' value='" + esc(S.fontQuery || "") + "' style='margin-bottom:12px'>" +
      "<div class='section-title'>" + L("Devanagari", "देवनागरी") + " · " + devs.length + "</div>" +
      "<div class='font-list'>" + devs.map(function (f) { return item(f, "dev"); }).join("") + "</div>" +
      "<div class='section-title'>" + L("Latin", "लैटिन") + " · " + lats.length + "</div>" +
      "<div class='font-list'>" + lats.map(function (f) { return item(f, "latin"); }).join("") + "</div>" +
      "<p class='hint' style='margin-top:12px'>" + L("All fonts are bundled with the app and work offline. Hindi paragraphs use the Devanagari face first, then the Latin face for English words.",
        "सभी फ़ॉन्ट ऐप में सम्मिलित हैं और ऑफ़लाइन काम करते हैं। हिन्दी अनुच्छेद पहले देवनागरी फ़ॉन्ट, अंग्रेज़ी शब्दों हेतु लैटिन फ़ॉन्ट लेते हैं।") + "</p>";
  };
  AFTER.fonts = function () {
    var i = el("fontSearch");
    if (i) i.focus();
  };

  /* ----------------------------------------------------------------- stats */
  PANELS.stats = function () {
    var st = D.stats(S.doc);
    var text = D.plainText(S.doc);
    var sentences = (text.match(/[^.!?।॥]+[.!?।॥]+/g) || []).length || (text.trim() ? 1 : 0);
    var rows = [
      [L("Words", "शब्द"), st.words],
      [L("Characters", "अक्षर"), st.chars],
      [L("Characters (no spaces)", "अक्षर (बिना स्पेस)"), text.replace(/\s/g, "").length],
      [L("Paragraphs", "अनुच्छेद"), st.paragraphs],
      [L("Sentences", "वाक्य"), sentences],
      [L("Pages", "पृष्ठ"), E.state.pageCount],
      [L("Reading time", "पढ़ने का समय"), Math.max(1, Math.round(st.words / 200)) + " " + L("min", "मिनट")],
      [L("Devanagari font", "देवनागरी फ़ॉन्ट"), ND.fonts.label(S.doc.style.devFont)],
      [L("Latin font", "लैटिन फ़ॉन्ट"), ND.fonts.label(S.doc.style.latinFont)],
      [L("Created", "बनाया"), U.fmtDate(S.doc.createdAt)],
      [L("Updated", "अद्यतन"), U.fmtDate(S.doc.updatedAt)]
    ];
    return "<div class='list'>" + rows.map(function (r) {
      return "<div class='set-row' style='padding:9px 0'><span class='hint'>" + esc(r[0]) + "</span><strong style='font-size:13px'>" + esc(r[1]) + "</strong></div>";
    }).join("") + "</div>";
  };

  /* ------------------------------------------------------------------ help */
  PANELS.help = function () {
    var sections = [
      [L("Getting started", "शुरुआत"), [
        L("Tap Templates in the left rail to start from a Rajasthan court format.", "बाएँ रेल में प्रारूप दबाकर राजस्थान न्यायालय फ़ॉर्मैट से शुरू करें।"),
        L("Fill Court details once and every {{placeholder}} in the document resolves.", "न्यायालय विवरण एक बार भरें — दस्तावेज़ के सभी {{स्थान-चिह्न}} भर जाएँगे।"),
        L("Documents autosave on this device; find them under Files.", "दस्तावेज़ स्वतः इसी डिवाइस पर सहेजे जाते हैं; Files में मिलेंगे।")
      ]],
      [L("Typing in Hindi", "हिन्दी में लिखना"), [
        L("Use any Android Hindi keyboard (Gboard → हिन्दी). Devanagari renders with the bundled font.", "Android का कोई भी हिन्दी कीबोर्ड (Gboard → हिन्दी) चुनें। देवनागरी सम्मिलित फ़ॉन्ट से स्पष्ट दिखती है।"),
        L("Paste text from an old Kruti Dev document — it converts to Unicode automatically.", "पुराने कृतिदेव दस्तावेज़ से चिपकाएँ — स्वतः यूनिकोड बनेगा।"),
        L("Tools → Fix Devanagari matras repairs गि/कि and nukta slips.", "उपकरण → मात्राएँ सुधारें से गि/कि व नुक़्ता ठीक होते हैं।")
      ]],
      [L("Opening WPS Office files", "WPS Office फ़ाइलें"), [
        L("Menu → Open / import accepts .docx, .odt, .rtf, .txt, .html and text-based PDF.", "मेन्यू → खोलें/आयात में .docx, .odt, .rtf, .txt, .html व पाठ-युक्त PDF चलते हैं।"),
        L("Exports go to Documents/NyayaLekh, visible to WPS Office immediately.", "निर्यात Documents/NyayaLekh में जाता है, WPS Office तुरंत देख सकता है।"),
        L("Old .doc files: open in WPS Office and save as .docx first.", "पुरानी .doc फ़ाइलें: पहले WPS Office में खोलकर .docx सहेजें।")
      ]],
      [L("Shortcuts (with a keyboard)", "शॉर्टकट (कीबोर्ड सहित)"), [
        "Ctrl/⌘ + B / I / U — " + L("bold, italic, underline", "बोल्ड, इटैलिक, अंडरलाइन"),
        "Ctrl/⌘ + F — " + L("find & replace", "खोजें व बदलें"),
        "Ctrl/⌘ + Z / Y — " + L("undo / redo", "पूर्ववत / दोहराएँ"),
        "Ctrl/⌘ + S — " + L("save", "सहेजें"),
        "Ctrl/⌘ + D — " + L("look up the selected word", "चयनित शब्द का अर्थ"),
        "Esc — " + L("close panels and dialogs", "पैनल व संवाद बंद करें")
      ]]
    ];
    return sections.map(function (s) {
      return "<div class='section-title'>" + esc(s[0]) + "</div><div class='list'>" +
        s[1].map(function (t) {
          return "<div class='list-item' style='align-items:flex-start'><span class='grow'><small style='font-size:12.5px;color:var(--ink-2);line-height:1.6'>" + esc(t) + "</small></span></div>";
        }).join("") + "</div>";
    }).join("") + "<div class='section-title'>" + L("Support", "सहायता") + "</div>" +
      "<p class='hint'>NyayaLekh v2.0 · " + L("Fully offline, no account, no tracking.", "पूर्णतः ऑफ़लाइन, कोई खाता नहीं, कोई ट्रैकिंग नहीं।") + "</p>";
  };

  /* ----------------------------------------------------------------- about */
  PANELS.about = function () {
    return "<div style='text-align:center;padding:8px 0 16px'><div class='brand-badge' style='width:56px;height:56px;font-size:24px;margin:0 auto 10px'>न्या</div>" +
      "<strong style='font-size:17px'>NyayaLekh</strong><div class='hint'>" + L("Legal Drafting Suite · v2.0", "विधिक प्रारूपण सूट · v2.0") + "</div></div>" +
      "<p class='hint'>" + L("A word processor built for Hindi legal drafting on Android tablets: paged A4/Legal writing, Devanagari and Latin font library, Rajasthan court templates, offline dictionary and spell check, Kruti Dev conversion and DOCX export.",
        "Android टैबलेट पर हिन्दी विधिक प्रारूपण हेतु शब्द-संसाधक: A4/लीगल पृष्ठ, देवनागरी व लैटिन फ़ॉन्ट संग्रह, राजस्थान न्यायालय प्रारूप, ऑफ़लाइन शब्दकोश व वर्तनी जाँच, कृतिदेव रूपांतरण एवं DOCX निर्यात।") + "</p>" +
      "<div class='section-title'>" + L("Credits", "श्रेय") + "</div>" +
      "<div class='list'>" +
      "<div class='list-item'><span class='grow'><strong>" + L("Fonts", "फ़ॉन्ट") + "</strong><small>SIL Open Font License 1.1 — " + ND.fonts.list.length + " " + L("families bundled", "परिवार सम्मिलित") + "</small></span></div>" +
      "<div class='list-item'><span class='grow'><strong>" + L("Hindi WordNet", "हिन्दी वर्डनेट") + "</strong><small>CFILT, IIT Bombay · GPL — " + L("dictionary & spelling data", "शब्दकोश व वर्तनी डेटा") + "</small></span></div>" +
      "<div class='list-item'><span class='grow'><strong>JSZip</strong><small>MIT — DOCX / ODT " + L("packaging", "पैकेजिंग") + "</small></span></div>" +
      "<div class='list-item'><span class='grow'><strong>Kruti Dev mapping</strong><small>" + L("open legacy-to-Unicode tables", "खुली लीगेसी-यूनिकोड तालिकाएँ") + "</small></span></div>" +
      "</div>" +
      "<div class='section-title'>" + L("Privacy", "गोपनीयता") + "</div>" +
      "<p class='hint'>" + L("No internet permission is required for drafting. Documents, dictionary lookups and dictation stay on the device.",
        "प्रारूपण हेतु इंटरनेट की आवश्यकता नहीं। दस्तावेज़, शब्दकोश व डिक्टेशन डिवाइस पर ही रहते हैं।") + "</p>" +
      "<p class='hint warn'>" + L("Statute cross-reference tables are study aids, not legal advice.", "संविधि तालिकाएँ केवल सहायक हैं, विधिक सलाह नहीं।") + "</p>";
  };

  /* ==========================================================================
   * 6. IMPORT / EXPORT ACTIONS
   * ======================================================================== */
  function doImport() {
    ND.native.pickFile(function (name, base64) {
      if (!name) return;
      status(L("Importing ", "आयात हो रहा है ") + name);
      D.importFile(name, base64).then(function (blocks) {
        if (!blocks || !blocks.length) throw new Error(ND.t("unsupportedFile"));
        var title = String(name).replace(/\.[^.]+$/, "");
        var doc = D.newDoc({ title: title });
        doc.blocks = blocks;
        startDocument(doc);
        saveDoc(true);
        status(L("Imported ", "आयात हुआ ") + name);
        closePanel();
      }).catch(function (e) {
        status((e && e.message) || L("Import failed", "आयात विफल"), "warn", 5000);
      });
    });
  }

  function exportAs(fmt) {
    var doc = S.doc;
    var name = U.safeName(doc.title || "document");
    var finish = function (err, path) {
      if (err) { status(L("Export failed", "निर्यात विफल") + ": " + err, "warn", 5000); return; }
      status(ND.t("exportedTo", { path: path || name }), "ok", 4000);
    };
    if (fmt === "docx") {
      status(L("Building DOCX…", "DOCX बन रहा है…"));
      D.toDocxBlob(doc).then(function (blob) {
        ND.native.saveToDocuments(name + ".docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document", blob, finish);
      }).catch(function (e) { finish(e.message || String(e)); });
      return;
    }
    if (fmt === "pdf") { printDoc(); return; }
    if (fmt === "html") {
      ND.native.saveToDocuments(name + ".html", "text/html", new Blob([D.toHtml(doc)], { type: "text/html" }), finish);
      return;
    }
    if (fmt === "rtf") {
      ND.native.saveToDocuments(name + ".rtf", "application/rtf", new Blob([D.toRtf(doc)], { type: "application/rtf" }), finish);
      return;
    }
    if (fmt === "txt") {
      ND.native.saveToDocuments(name + ".txt", "text/plain", new Blob([D.toText(doc)], { type: "text/plain" }), finish);
      return;
    }
    if (fmt === "md") {
      ND.native.saveToDocuments(name + ".md", "text/markdown", new Blob([D.toMarkdown(doc)], { type: "text/markdown" }), finish);
    }
  }

  function printDoc() {
    saveDoc(true);
    if (ND.native.has()) {
      ND.native.call("printPage");
      status(L("Opening print dialog — choose “Save as PDF”.", "प्रिंट खुल रहा है — “PDF में सहेजें” चुनें।"), "ok", 5000);
    } else {
      window.print();
    }
  }

  function copyWholeDoc() {
    var text = D.plainText(S.doc);
    U.copyText(text).then(function () { status(ND.t("copiedToClipboard")); });
  }

  /* ==========================================================================
   * 7. EVENT WIRING
   * ======================================================================== */
  function bind() {
    /* menu & rail */
    on("btnMenu", "click", openSheet);
    on("menuClose", "click", closeSheet);
    on("scrim", "click", closeSheet);
    on("panelClose", "click", closePanel);
    on("menuLang", "click", function () { ND.toggleLang(); updateLangPills(); });
    on("stLang", "click", function () { ND.toggleLang(); updateLangPills(); });

    $$("#rail .rail-btn, #menuSheet [data-screen]").forEach(function (b) {
      b.addEventListener("click", function () { go(b.getAttribute("data-screen")); });
    });

    /* app bar */
    on("docTitle", "input", function () {
      S.doc.title = this.value;
      document.title = (S.doc.title || ND.t("appName")) + " · " + ND.t("appName");
      saveDoc();
    });
    on("docTitle", "keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); this.blur(); } });
    on("btnUndo", "click", function () { E.undo(); });
    on("btnRedo", "click", function () { E.redo(); });
    on("btnFind", "click", toggleFind);
    on("btnFocus", "click", toggleFocus);
    on("btnTheme", "click", function () {
      var i = THEMES.indexOf(ND.prefs.theme || "light");
      setTheme(THEMES[(i + 1) % THEMES.length]);
      status(L("Theme: ", "थीम: ") + ND.prefs.theme);
    });
    on("btnExport", "click", function () { renderPanel("export"); });

    /* toolbar */
    on("selStyle", "change", function () { E.setBlockType(this.value); });
    on("selSize", "change", function () {
      setStyle("size", parseFloat(this.value) || 12);
      ND.setPref("size", S.doc.style.size, { silent: true });
    });
    on("btnFonts", "click", function () { renderPanel("fonts"); });
    on("btnSpacing", "click", spacingDialog);
    on("btnClearFormat", "click", function () { E.clearFormat(); });
    on("btnMoreFormat", "click", moreFormatDialog);
    on("colorText", "input", function () { E.exec("foreColor", this.value); });
    on("colorHighlight", "input", function () { E.exec("hiliteColor", this.value); });

    $$("#toolbar [data-cmd]").forEach(function (b) {
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function () { E.exec(b.getAttribute("data-cmd")); });
    });
    $$("#toolbar [data-align]").forEach(function (b) {
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function () { E.align(b.getAttribute("data-align")); });
    });
    $$("#toolbar [data-indent]").forEach(function (b) {
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function () { E.indent(parseInt(b.getAttribute("data-indent"), 10)); });
    });

    /* status bar */
    on("stZoomIn", "click", function () { applyZoom(S.zoom + 0.1); ND.setPref("zoom", S.zoom, { silent: true }); });
    on("stZoomOut", "click", function () { applyZoom(S.zoom - 0.1); ND.setPref("zoom", S.zoom, { silent: true }); });
    on("stZoom", "click", function () { applyZoom(1); ND.setPref("zoom", 1, { silent: true }); });
    on("btnZen", "click", toggleFocus);

    /* selection toolbar */
    $$("#selTools [data-cmd]").forEach(function (b) {
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function () { E.exec(b.getAttribute("data-cmd")); });
    });
    $$("#selTools [data-act]").forEach(function (b) {
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-act");
        if (act === "highlight") E.exec("hiliteColor", el("colorHighlight") ? el("colorHighlight").value : "#fde68a");
        else if (act === "dict") {
          var w = window.getSelection().toString().trim().split(/\s+/)[0] || "";
          if (w) { S.dictQuery = w; S.dictResults = null; renderPanel("dictionary"); runDictLookup(w); }
        }
      });
    });

    /* find bar */
    on("findInput", "input", function () {
      var hits = E.find(this.value);
      var c = el("findCount");
      if (c) c.textContent = hits.length ? "1/" + hits.length : "0";
      if (hits.length) { E.gotoHit(0); if (c) c.textContent = (E.state.findIndex + 1) + "/" + hits.length; }
    });
    on("findNext", "click", stepFind.bind(null, 1));
    on("findPrev", "click", stepFind.bind(null, -1));
    on("findClose", "click", closeFind);
    on("replaceOne", "click", function () {
      var q = el("findInput").value, r = el("replaceInput").value;
      if (E.replaceCurrent(q, r)) { status(ND.t("replace")); el("findInput").dispatchEvent(new Event("input")); }
    });
    on("replaceAll", "click", function () {
      var q = el("findInput").value, r = el("replaceInput").value;
      var n = E.replaceAll(q, r);
      status(n ? n + " " + L("replaced", "बदले गए") : L("No matches", "कोई मेल नहीं"), n ? "ok" : "warn");
    });

    /* modal & key handling */
    on("modalClose", "click", closeModal);
    on("modal", "click", function (e) { if (e.target === this) closeModal(); });
    document.addEventListener("keydown", onKey);
    document.addEventListener("nd:lang", onLangChange);
    document.addEventListener("nd:docchange", onDocChange);
    document.addEventListener("nd:dict-word", function (e) {
      var w = (e.detail && e.detail.word) || "";
      if (!w) return;
      S.dictQuery = w;
      S.dictResults = null;
      renderPanel("dictionary");
      runDictLookup(w);
    });
    document.addEventListener("nd:pref", function (e) {
      if (!e.detail || e.detail.key === "*") return;
      if (e.detail.key === "pageView") { applyDocMeta(); }
      if (e.detail.key === "autosave" || e.detail.key === "autoSpell" || e.detail.key === "ruler") applyDocMeta();
    });
    window.addEventListener("beforeunload", function () { saveDoc(true); });

    /* panel + modal delegation */
    var body = el("panelBody");
    if (body) {
      body.addEventListener("click", onPanelClick);
      body.addEventListener("change", onPanelChange);
      body.addEventListener("input", onPanelInput);
    }
    el("modalBody").addEventListener("click", onPanelClick);
  }

  function on(id, ev, fn) {
    var node = el(id);
    if (node) node.addEventListener(ev, fn);
  }

  function onKey(e) {
    var mod = e.ctrlKey || e.metaKey;
    if (e.key === "Escape") {
      if (!el("modal").hidden) { closeModal(); return; }
      if (!el("findbar").hidden) { closeFind(); return; }
      if (!el("menuSheet").hidden) { closeSheet(); return; }
      if (!el("sidePanel").hidden) { closePanel(); return; }
    }
    if (!mod) return;
    var k = e.key.toLowerCase();
    if (k === "f") { e.preventDefault(); toggleFind(); }
    else if (k === "s") { e.preventDefault(); saveDoc(true); status(ND.t("saved")); }
    else if (k === "p") { e.preventDefault(); printDoc(); }
    else if (k === "e") { e.preventDefault(); renderPanel("export"); }
    else if (k === "d" && !window.getSelection().toString()) { e.preventDefault(); renderPanel("dictionary"); }
  }

  function onLangChange() {
    updateLangPills();
    if (S.screen) renderPanel(S.screen);
    syncTitle();
    applyDocMeta();
    updateStats();
  }

  function onDocChange() {
    updateStats();
    if (ND.prefs.autosave !== false) saveDoc();
    else setSaveState(ND.t("unsaved"));
  }

  /* ----------------------------------------------------------------- panels */
  function onPanelClick(e) {
    var mark = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!mark) return;
    var act = mark.getAttribute("data-act");
    var ds = mark.dataset;

    switch (act) {
      case "new-doc": newDocument(); closePanel(); break;
      case "import-file": doImport(); break;
      case "open-doc": openDocument(ds.id); break;
      case "rename-doc": renameDoc(ds.id); break;
      case "delete-doc": deleteDoc(ds.id); break;
      case "tplcat": S.tplCat = ds.cat; renderPanel("templates"); break;
      case "use-tpl": applyTemplate(ds.tpl); break;
      case "seg": handleSeg(mark); break;
      case "ins": handleInsert(ds.what); break;
      case "ins-table": handleInsert("table"); break;
      case "symbol": E.insertTextAtCursor(ds.sym); break;
      case "pickvar": E.insertTextAtCursor(ds.var); closeModal(); break;
      case "toggle": togglePref(ds.pref, mark); break;
      case "margin-preset": {
        var m = D.MARGIN_PRESETS[ds.preset];
        if (m) { S.doc.page.margins = Object.assign({}, m); E.rerender(); saveDoc(); renderPanel("layout"); }
        break;
      }
      case "case": {
        var mode = ds.mode;
        transformSelection(function (t) {
          if (mode === "upper") return t.toUpperCase();
          if (mode === "lower") return t.toLowerCase();
          if (mode === "title") return toTitleCase(t);
          return toSentenceCase(t);
        });
        break;
      }
      case "fix-matras": fixMatrasEverywhere(); break;
      case "smart-quotes": smartQuotesEverywhere(); break;
      case "collapse-spaces": collapseSpaces(); status(L("Spaces tidied", "स्पेस साफ़ हुए")); break;
      case "sort-lines": sortLines(); break;
      case "translit": transformSelection(function (t) { return T.devanagariToRoman(t); }); break;
      case "find": toggleFind(true); break;
      case "select-all": selectAllDoc(); break;
      case "stats": renderPanel("stats"); break;
      case "spell-all": renderPanel("spell"); setTimeout(runSpell, 60); break;
      case "dict-go": runDictLookup(el("dictInput").value); break;
      case "dict-word": S.dictQuery = ds.word; renderPanel("dictionary"); runDictLookup(ds.word); break;
      case "dict-insert": E.insertTextAtCursor(ds.word); status(L("Inserted", "जोड़ा गया")); break;
      case "dict-save": ND.dict.addUserWord(ds.word); status(L("Added to dictionary", "शब्दकोश में जोड़ा")); break;
      case "spell-run": runSpell(); break;
      case "spell-live": ND.setPref("autoSpell", !ND.prefs.autoSpell); renderPanel("spell"); E.decorateSpelling(); break;
      case "spell-fix": {
        var it = (S.spellIssues || [])[parseInt(ds.i, 10)];
        if (it) { replaceWord(it.word, ds.word); S.spellIssues.splice(parseInt(ds.i, 10), 1); renderPanel("spell"); }
        break;
      }
      case "spell-add": {
        var it2 = (S.spellIssues || [])[parseInt(ds.i, 10)];
        if (it2) { ND.dict.addUserWord(it2.word); S.spellIssues.splice(parseInt(ds.i, 10), 1); renderPanel("spell"); }
        break;
      }
      case "spell-goto": {
        var it3 = (S.spellIssues || [])[parseInt(ds.i, 10)];
        if (it3 && it3.blockId) E.gotoBlock(it3.blockId);
        break;
      }
      case "ud-add": {
        var v = (el("udInput") || {}).value || "";
        if (v.trim()) { ND.dict.addUserWord(v.trim()); renderPanel("spell"); }
        break;
      }
      case "ud-del": ND.dict.removeUserWord(ds.word); renderPanel("spell"); break;
      case "voice-start": startVoice(); break;
      case "voice-stop": stopVoice(); break;
      case "voice-insert":
        if (S.voiceText) { E.insertTextAtCursor(S.voiceText); S.voiceText = ""; paintVoice(); status(L("Inserted", "जोड़ा गया")); }
        break;
      case "voice-clear": S.voiceText = ""; paintVoice(); break;
      case "conv-mode": S.convMode = ds.mode; renderPanel("convert"); break;
      case "conv-run": runConvert(); break;
      case "conv-insert": {
        var out = el("convOut");
        if (out && out.value) { E.insertTextAtCursor(out.value); status(L("Inserted", "जोड़ा गया")); }
        break;
      }
      case "conv-copy": {
        var o2 = el("convOut");
        if (o2 && o2.value) U.copyText(o2.value).then(function () { status(ND.t("copiedToClipboard")); });
        break;
      }
      case "conv-swap": {
        var i3 = el("convIn"), o3 = el("convOut");
        if (i3 && o3) { i3.value = o3.value; o3.value = ""; }
        break;
      }
      case "legal-tab": S.legalTab = ds.tab; renderPanel("legal"); break;
      case "open-court": renderPanel("court"); break;
      case "open-fonts": renderPanel("fonts"); break;
      case "open-stats": renderPanel("stats"); break;
      case "open-help": renderPanel("help"); break;
      case "open-about": renderPanel("about"); break;
      case "open-convert": renderPanel("convert"); break;
      case "set-font": {
        var script = ds.script;
        if (script === "dev") { S.doc.style.devFont = ds.font; ND.setPref("devFont", ds.font, { silent: true }); }
        else { S.doc.style.latinFont = ds.font; ND.setPref("latinFont", ds.font, { silent: true }); }
        E.rerender();
        applyDocMeta();
        saveDoc();
        renderPanel("fonts");
        break;
      }
      case "accent": ND.setPref("accent", ds.accent); applyTheme(); renderPanel("settings"); break;
      case "reset-prefs":
        openModal(L("Reset settings?", "सेटिंग्स रीसेट करें?"),
          "<p class='hint'>" + L("Theme, fonts and preferences return to defaults. Documents are kept.",
            "थीम, फ़ॉन्ट व प्राथमिकताएँ डिफ़ॉल्ट होंगी। दस्तावेज़ सुरक्षित रहेंगे।") + "</p>", [
            { label: ND.t("cancel") },
            {
              label: ND.t("reset"), kind: "danger", onClick: function () {
                ND.resetPrefs();
                applyTheme(); applyZoom(1); applyDocMeta(); renderPanel("settings");
                status(L("Settings reset", "सेटिंग्स रीसेट हुईं"));
              }
            }
          ]);
        break;
      case "court-insert": E.insertTextAtCursor(D.courtName(S.doc)); status(L("Court heading inserted", "न्यायालय शीर्षक जोड़ा")); break;
      case "court-fill": fillPlaceholders(); break;
      case "export": exportAs(ds.fmt); break;
      case "copy-doc": copyWholeDoc(); break;
      case "share-doc": {
        var text = D.plainText(S.doc);
        if (ND.native.has()) {
          var blob = new Blob([text], { type: "text/plain" });
          var name = U.safeName(S.doc.title || "document") + ".txt";
          ND.native.saveToDocuments(name, "text/plain", blob, function (err, path) {
            if (!err) ND.native.call("shareFile", path);
          });
        } else {
          U.copyText(text).then(function () { status(ND.t("copiedToClipboard")); });
        }
        break;
      }
      case "print-doc": printDoc(); break;
    }
  }

  function handleSeg(btn) {
    var ds = btn.dataset;
    if (ds.langset) {
      ND.setLang(ds.langset);
      updateLangPills();
      renderPanel(S.screen);
    } else if (ds.lang) {
      S.tplLang = ds.lang;
      renderPanel("templates");
    } else if (ds.pageview) {
      ND.setPref("pageView", ds.pageview);
      applyDocMeta();
      renderPanel("layout");
    } else if (ds.cols) {
      setPage("columns", parseInt(ds.cols, 10));
      renderPanel("layout");
    } else if (ds.theme) {
      setTheme(ds.theme);
      renderPanel("settings");
    } else if (ds.zoom) {
      applyZoom(parseFloat(ds.zoom));
      ND.setPref("zoom", S.zoom, { silent: true });
      renderPanel("layout");
    }
  }

  function togglePref(pref, btn) {
    if (pref === "__page_numbers") {
      setPage("numbers", !(S.doc.page.numbers !== false));
    } else if (pref === "__line_numbers") {
      setPage("lineNumbers", !S.doc.page.lineNumbers);
    } else if (pref === "__page_border") {
      setPage("border", !S.doc.page.border);
    } else {
      ND.setPref(pref, !ND.prefs[pref]);
      if (pref === "showMarks" || pref === "ruler" || pref === "statusBar" || pref === "typewriter") applyDocMeta();
    }
    btn.classList.toggle("on");
    btn.setAttribute("aria-checked", String(btn.classList.contains("on")));
    renderPanel(S.screen);
  }

  function onPanelChange(e) {
    var t = e.target;
    var v = t.type === "checkbox" ? t.checked : t.value;
    if (t.dataset.page) {
      var val = t.dataset.page === "numbers" ? t.checked : v;
      if (["size", "orientation", "headerText", "footerText", "watermark", "numberFormat"].indexOf(t.dataset.page) >= 0) {
        setPage(t.dataset.page, val);
      } else {
        setPage(t.dataset.page, val);
      }
    } else if (t.dataset.margin) {
      if (!S.doc.page.margins) S.doc.page.margins = {};
      S.doc.page.margins[t.dataset.margin] = parseFloat(v) || 25.4;
      E.rerender();
      saveDoc();
    } else if (t.dataset.style) {
      setStyle(t.dataset.style, t.dataset.style === "firstLine" ? Number(v) : v);
      if (t.dataset.style === "size") ND.setPref("size", S.doc.style.size, { silent: true });
    } else if (t.dataset.court) {
      S.doc.court[t.dataset.court] = v;
      if (t.dataset.court === "type" || t.dataset.court === "place" || t.dataset.court === "name") renderPanel("court");
      saveDoc();
    } else if (t.dataset.pref) {
      ND.setPref(t.dataset.pref, v);
      if (S.doc) { E.rerender(); applyDocMeta(); }
    } else if (t.id === "convFont") {
      S.convFont = v;
    }
  }

  function onPanelInput(e) {
    var t = e.target;
    if (t.id === "fileSearch") { S.fileQuery = t.value; paintFiles(); }
    else if (t.id === "dictInput") { runDictLookup(t.value); }
    else if (t.id === "legalSearch") {
      S.legalQuery = t.value;
      var box = el("panelBody");
      var scroll = box ? box.scrollTop : 0;
      renderPanel("legal");
      if (box) box.scrollTop = scroll;
      var i = el("legalSearch");
      if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
    } else if (t.id === "fontSearch") {
      S.fontQuery = t.value;
      renderPanel("fonts");
      var f = el("fontSearch");
      if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); }
    } else if (t.dataset.pageRange === "watermarkOpacity") {
      S.doc.page.watermarkOpacity = parseFloat(t.value) / 100;
      var wm = el("wmVal");
      if (wm) wm.textContent = t.value + "%";
      E.rerender();
      saveDoc();
    } else if (t.dataset.prefnum) {
      ND.setPref(t.dataset.prefnum, parseFloat(t.value), { silent: true });
    }
  }

  function openDocument(id) {
    ND.store.get(id).then(function (doc) {
      if (!doc) { status(L("Document not found", "दस्तावेज़ नहीं मिला"), "warn"); return; }
      startDocument(doc);
      ND.store.kvSet("current", id);
      if (window.innerWidth < 900) closePanel();
    });
  }

  function renameDoc(id) {
    ND.store.get(id).then(function (doc) {
      if (!doc) return;
      promptModal(L("Rename document", "दस्तावेज़ का नाम बदलें"), L("Title", "शीर्षक"), doc.title || "", function (v) {
        doc.title = v.trim() || ND.t("untitled");
        doc.updatedAt = Date.now();
        ND.store.put(doc).then(function () {
          if (S.doc && S.doc.id === id) { S.doc.title = doc.title; syncTitle(); }
          renderPanel("files");
        });
      });
    });
  }

  function deleteDoc(id) {
    openModal(L("Delete document?", "दस्तावेज़ हटाएँ?"),
      "<p class='hint'>" + L("This cannot be undone.", "यह पूर्ववत नहीं होगा।") + "</p>", [
        { label: ND.t("cancel") },
        {
          label: ND.t("delete"), kind: "danger", onClick: function () {
            ND.store.del(id).then(function () {
              status(L("Document deleted", "दस्तावेज़ हटाया"));
              if (S.doc && S.doc.id === id) {
                ND.store.all().then(function (arr) {
                  if (arr && arr.length) startDocument(arr[0]);
                  else newDocument();
                });
              }
              renderPanel("files");
            });
          }
        }
      ]);
  }

  function selectAllDoc() {
    var sel = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(E.state.pagesEl);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /* ------------------------------------------------------------- find/focus */
  function toggleFind(force) {
    var bar = el("findbar");
    if (!bar) return;
    var show = force === true ? true : bar.hidden;
    bar.hidden = !show;
    if (show) {
      var i = el("findInput");
      if (i) { i.focus(); i.select(); }
    } else closeFind();
  }
  function closeFind() {
    var bar = el("findbar");
    if (bar) bar.hidden = true;
    var i = el("findInput");
    if (i && i.value) { i.value = ""; E.find(""); var c = el("findCount"); if (c) c.textContent = ""; }
  }
  function stepFind(dir) {
    var q = el("findInput").value;
    if (!q) return;
    if (!E.state.findHits.length || E.state.findHits[0].id !== undefined) E.find(q);
    var n = E.gotoHit(E.state.findIndex + dir);
    var c = el("findCount");
    if (c) c.textContent = (n + 1) + "/" + E.state.findHits.length;
  }

  function toggleFocus() {
    var onNow = !ND.prefs.focus;
    ND.setPref("focus", onNow);
    document.body.classList.toggle("focus-mode", onNow);
    var b = el("btnFocus");
    if (b) b.classList.toggle("on", onNow);
    status(onNow ? L("Focus mode on", "फ़ोकस मोड चालू") : L("Focus mode off", "फ़ोकस मोड बंद"));
  }

  /* --------------------------------------------------------------- dialogs */
  function spacingDialog() {
    var st = S.doc.style;
    var body = "<div class='field'><label>" + L("Line height", "पंक्ति ऊँचाई") + "</label><div class='row'>" +
      [1, 1.15, 1.5, 1.65, 2].map(function (v) {
        return "<button class='btn " + (Math.abs((st.lh || 1.65) - v) < 0.01 ? "primary" : "") + "' data-sp='" + v + "' onclick=\"ND.app.setLineHeight(" + v + ")\">" + v + "</button>";
      }).join("") + "</div></div>" +
      "<div class='field'><label>" + L("Paragraph gap", "अनुच्छेद अंतर") + "</label><div class='row'>" +
      [0, 4, 6, 10, 14].map(function (v) {
        return "<button class='btn " + ((st.paraSpacing === undefined ? 6 : st.paraSpacing) === v ? "primary" : "") + "' onclick=\"ND.app.setParaGap(" + v + ")\">" + v + " pt</button>";
      }).join("") + "</div></div>";
    openModal(L("Spacing", "रिक्ति"), body, [{ label: ND.t("close") }]);
  }

  A.setLineHeight = function (v) { E.setParagraph({ lh: v }); closeModal(); };
  A.setParaGap = function (v) { E.setParagraph({ paraSpacing: v }); closeModal(); };

  function moreFormatDialog() {
    var body = "<div class='grid-2'>" +
      "<button class='btn' onclick=\"ND.editor.exec('superscript');ND.app.closeModal()\">x² " + L("Superscript", "सुपरस्क्रिप्ट") + "</button>" +
      "<button class='btn' onclick=\"ND.editor.exec('subscript');ND.app.closeModal()\">x₂ " + L("Subscript", "सबस्क्रिप्ट") + "</button>" +
      "<button class='btn' onclick=\"ND.editor.exec('justifyFull')\">" + L("Fully justify", "पूर्ण संरेखण") + "</button>" +
      "<button class='btn' onclick=\"ND.editor.applyToSelection(function(){document.execCommand('insertHTML',false,'<mark>'+window.getSelection()+'</mark>')})\">" + L("Highlight", "हाइलाइट") + "</button>" +
      "<button class='btn' onclick=\"ND.app.setBlockFromDialog('quote')\">" + L("Quotation", "उद्धरण") + "</button>" +
      "<button class='btn' onclick=\"ND.app.setBlockFromDialog('signature')\">" + L("Signature block", "हस्ताक्षर खंड") + "</button>" +
      "<button class='btn' onclick=\"ND.editor.insertBlock('hr','');ND.app.closeModal()\">" + L("Divider", "विभाजक") + "</button>" +
      "<button class='btn' onclick=\"ND.app.insertPageBreak()\">" + L("Page break", "पृष्ठ विराम") + "</button>" +
      "</div>";
    openModal(L("More formatting", "अधिक फ़ॉर्मैटिंग"), body, [{ label: ND.t("close") }]);
  }

  A.closeModal = closeModal;
  A.setBlockFromDialog = function (t) { E.setBlockType(t); closeModal(); };
  A.insertPageBreak = function () { E.insertBlock("pagebreak", ""); closeModal(); };

  /* ==========================================================================
   * 8. BOOT
   * ======================================================================== */
  function boot() {
    ND.loadPrefs();
    ND.initLang();
    ND.fonts.init();
    applyTheme();
    applyZoom(ND.prefs.zoom || 1);
    updateLangPills();
    bind();

    if (ND.prefs.focus) document.body.classList.add("focus-mode");

    var splashMsg = el("splashMsg");
    if (splashMsg) splashMsg.textContent = L("Loading dictionaries and fonts…", "शब्दकोश व फ़ॉन्ट लोड हो रहे हैं…");

    ND.dict.load().then(function () {
      S.dictReady = true;
      if (splashMsg) splashMsg.textContent = L("Ready", "तैयार");
    }).catch(function () {
      S.dictReady = false;
    });

    loadInitial().then(function (doc) {
      startDocument(doc || D.newDoc({}));
      S.ready = true;
      setTimeout(function () {
        var s = el("splash");
        if (s) { s.classList.add("gone"); setTimeout(function () { s.style.display = "none"; }, 420); }
      }, 260);
      if (!doc) {
        setTimeout(function () {
          var first = document.querySelector("#pages .blk");
          if (first) first.focus();
        }, 500);
      }
    }).catch(function (e) {
      console.error("boot failed", e);
      startDocument(D.newDoc({}));
      var s = el("splash");
      if (s) s.style.display = "none";
    });

    /* reflow fonts when they finish loading */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { if (S.doc) E.rerender(); });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
