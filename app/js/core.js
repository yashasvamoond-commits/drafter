/* =============================================================================
 * NyayaLekh — core: utilities, native bridge, offline storage, preferences,
 * and the font registry helpers.
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
      if (c == null || c === false) return;
      n.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
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

  U.escapeHtml = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  U.stripTags = function (html) {
    var d = document.createElement("div");
    d.innerHTML = String(html || "").replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n").replace(/<br\s*\/?>/gi, "\n");
    return (d.textContent || "").replace(/\u00a0/g, " ");
  };
  U.nl2br = function (s) { return U.escapeHtml(s).replace(/\n/g, "<br>"); };

  U.toast = function (msg, kind, ms) {
    var host = document.getElementById("toasts");
    if (!host) return;
    var t = U.el("div", { class: "toast " + (kind || ""), text: msg });
    host.appendChild(t);
    setTimeout(function () {
      t.classList.add("out");
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
  U.today = function () {
    var d = new Date();
    var pad = function (n) { return n < 10 ? "0" + n : n; };
    return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear();
  };

  U.DEV = /[\u0900-\u097F]/;
  U.hasDevanagari = function (s) { return U.DEV.test(s || ""); };
  U.wordStats = function (text) {
    var t = (text || "").trim();
    if (!t) return { words: 0, chars: 0, charsNoSpace: 0, sentences: 0, paragraphs: 0 };
    var words = t.split(/[\s\u00a0]+/).filter(Boolean).length;
    return {
      words: words,
      chars: t.length,
      charsNoSpace: t.replace(/\s/g, "").length,
      sentences: (t.match(/[।.!?]+/g) || []).length,
      paragraphs: (t.match(/\n\s*\n/g) || []).length + 1
    };
  };

  U.copyText = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); });
    }
    legacyCopy(text);
    return Promise.resolve();
  };
  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
  }
  U.copyText = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { legacyCopy(text); });
    }
    legacyCopy(text);
    return Promise.resolve();
  };

  /* ------------------------------------------------------------ native shell */
  ND.native = {
    has: function () { return !!(global.NativeApp && global.NativeApp.isNative); },
    call: function (fn, arg) {
      try {
        if (global.NativeApp && typeof global.NativeApp[fn] === "function") return global.NativeApp[fn](arg);
      } catch (e) { console.warn("native call failed", fn, e); }
      return null;
    },
    pickFile: function (cb) {
      if (this.has()) {
        global.NativeFilePicked = function (name, base64) { cb(name, base64); };
        this.call("pickDocument");
        return;
      }
      var input = U.el("input", { type: "file", accept: ".docx,.odt,.pdf,.rtf,.txt,.html,.htm,.md,.png,.jpg,.jpeg,.webp", style: { display: "none" } });
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
    saveToDocuments: function (name, mime, blob, cb) {
      if (!this.has()) { U.download(name, blob); cb && cb(null, name); return; }
      var self = this;
      var reader = new FileReader();
      reader.onload = function () {
        var b64 = String(reader.result).split(",")[1] || "";
        var chunk = 700000, i = 0, id = "f" + Date.now();
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

  /* ---------------------------------------------------------------- storage */
  function openDB() {
    return new Promise(function (res, rej) {
      var req = indexedDB.open("nyayalekh", 3);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("docs")) {
          var s = db.createObjectStore("docs", { keyPath: "id" });
          s.createIndex("updatedAt", "updatedAt");
        }
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
        if (!db.objectStoreNames.contains("templates")) db.createObjectStore("templates", { keyPath: "id" });
      };
      req.onsuccess = function () { res(req.result); };
      req.onerror = function () { rej(req.error); };
    });
  }

  var dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = openDB().catch(function (err) {
      console.warn("IndexedDB unavailable, falling back to localStorage", err);
      throw err;
    });
    return dbp;
  }

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

  var LS = {
    key: function (id) { return "nd.doc." + id; },
    index: function () { try { return JSON.parse(localStorage.getItem("nd.docIndex") || "[]"); } catch (e) { return []; } },
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
    }
  };

  ND.store = {
    put: function (doc) {
      return tx("docs", "readwrite", function (s) { s.put(doc); return doc.id; })
        .catch(function () { return LS.put(doc); });
    },
    get: function (id) {
      return tx("docs", "readonly", function (s) { return s.get(id); }).catch(function () { return LS.get(id); });
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
    all: function () {
      return ND.store.allRaw().catch(function () { return LS.all(); }).then(function (arr) {
        arr = arr || [];
        if (arr.length) return arr;
        return LS.all().then(function (lsArr) { return (lsArr && lsArr.length) ? lsArr : arr; });
      });
    },
    del: function (id) {
      return tx("docs", "readwrite", function (s) { s.delete(id); }).catch(function () { return LS.del(id); });
    },
    kvSet: function (k, v) {
      return tx("kv", "readwrite", function (s) { s.put(v, k); }).catch(function () {
        try { localStorage.setItem("nd.kv." + k, JSON.stringify(v)); } catch (e) {}
      });
    },
    kvGet: function (k, dflt) {
      return tx("kv", "readonly", function (s) { return s.get(k); })
        .then(function (v) { return v === undefined ? dflt : v; })
        .catch(function () {
          try {
            var raw = localStorage.getItem("nd.kv." + k);
            return raw === null ? dflt : JSON.parse(raw);
          } catch (e) { return dflt; }
        });
    }
  };

  /* ------------------------------------------------------------- preferences */
  var DEFAULTS = {
    lang: "en",
    theme: "light",            // light | dark | sepia | auto
    accent: "indigo",          // indigo | saffron | teal | plum | slate
    devFont: "noto-serif-dev",
    latinFont: "tinos",
    size: 12,
    lh: 1.65,
    paraSpacing: 6,
    autoSpell: true,
    autosave: true,
    ruler: true,
    pageView: "paged",         // paged | continuous
    focus: false,
    typewriter: false,
    showMarks: false,
    pageSize: "A4",
    orientation: "portrait",
    margins: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
    zoom: 1,
    statusBar: true
  };

  var prefs = Object.assign({}, DEFAULTS);
  prefs.margins = Object.assign({}, DEFAULTS.margins);
  ND.prefs = prefs;
  ND.DEFAULTS = DEFAULTS;

  ND.loadPrefs = function () {
    var raw = null;
    try { raw = localStorage.getItem("nd.prefs"); } catch (e) {}
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        Object.keys(parsed).forEach(function (k) {
          if (k === "margins") prefs.margins = Object.assign({}, DEFAULTS.margins, parsed.margins || {});
          else prefs[k] = parsed[k];
        });
      } catch (e) {}
    }
    return prefs;
  };

  ND.savePrefs = function () {
    try { localStorage.setItem("nd.prefs", JSON.stringify(prefs)); } catch (e) {}
  };

  ND.setPref = function (key, value, opts) {
    prefs[key] = value;
    ND.savePrefs();
    if (!opts || opts.silent !== true) {
      document.dispatchEvent(new CustomEvent("nd:pref", { detail: { key: key, value: value } }));
    }
  };
  ND.resetPrefs = function () {
    Object.assign(prefs, DEFAULTS);
    prefs.margins = Object.assign({}, DEFAULTS.margins);
    ND.savePrefs();
    document.dispatchEvent(new CustomEvent("nd:pref", { detail: { key: "*" } }));
  };

  /* ------------------------------------------------------------ font library */
  var FONTS = (ND.fonts = {
    list: [],
    byId: {}
  });

  FONTS.init = function () {
    var cat = global.ND.FONT_CATALOG || [];
    FONTS.list = cat;
    FONTS.byId = {};
    cat.forEach(function (f) { FONTS.byId[f.id] = f; });
    if (!FONTS.byId[prefs.devFont]) prefs.devFont = (cat.filter(function (f) { return f.script === "dev"; })[0] || {}).id || "serif";
    if (!FONTS.byId[prefs.latinFont]) prefs.latinFont = (cat.filter(function (f) { return f.script === "latin"; })[0] || {}).id || "serif";
  };

  FONTS.dev = function () { return FONTS.list.filter(function (f) { return f.script === "dev"; }); };
  FONTS.latin = function () { return FONTS.list.filter(function (f) { return f.script === "latin"; }); };
  FONTS.label = function (id) { return (FONTS.byId[id] || {}).label || id; };

  /** CSS stack: Devanagari face first, then the Latin face for Latin glyphs. */
  FONTS.stack = function (devId, latinId) {
    var dev = FONTS.byId[devId] || FONTS.byId[prefs.devFont];
    var lat = FONTS.byId[latinId] || FONTS.byId[prefs.latinFont];
    var stack = [];
    if (dev) stack.push('"' + dev.label + '"');
    if (lat) stack.push('"' + lat.label + '"');
    stack.push("serif");
    return stack.join(", ");
  };

  ND.currency = function (n) {
    try { return Number(n).toLocaleString("en-IN"); } catch (e) { return String(n); }
  };
})(window);
