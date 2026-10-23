/* =============================================================================
 * NyayaLekh — offline Hindi/English dictionary, spell checker and suggestion
 * engine.  Data files: app/data/hi-words.js, hi-dict.js, en-words.js
 * (generated from CFILT Hindi WordNet + an English lexicon).
 * ========================================================================== */
(function (global) {
  "use strict";
  var ND = (global.ND = global.ND || {});
  var U = ND.util, T = ND.text;

  var DICT = (ND.dict = {
    ready: false,
    loading: null,
    fullLoaded: false,
    hi: null,          // Set of Hindi words
    en: null,          // Set of English words
    hiPrefix: null,    // prefix index for suggestions
    enPrefix: null,
    gloss: null,       // Hindi WordNet glosses (large, lazy)
    legal: null,       // curated legal glossary
    user: {}           // user dictionary
  });

  var HI_DEVA = /^[\u0900-\u097F\u200c\u200d]+$/;
  var EN_WORD = /^[A-Za-z][A-Za-z'\-]*$/;

  /* -------------------------------------------------------------- user words */
  try { DICT.user = JSON.parse(localStorage.getItem("nd.userdict") || "{}"); } catch (e) { DICT.user = {}; }
  DICT.addUserWord = function (w) {
    w = String(w || "").trim();
    if (!w) return;
    DICT.user[w] = 1;
    try { localStorage.setItem("nd.userdict", JSON.stringify(DICT.user)); } catch (e) {}
  };
  DICT.removeUserWord = function (w) {
    delete DICT.user[w];
    try { localStorage.setItem("nd.userdict", JSON.stringify(DICT.user)); } catch (e) {}
  };

  /* ------------------------------------------------------------- script load */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error("cannot load " + src)); };
      document.head.appendChild(s);
    });
  }

  function buildPrefixIndex(list) {
    var idx = Object.create(null);
    for (var i = 0; i < list.length; i++) {
      var w = list[i];
      if (!w) continue;
      var key = w.slice(0, 2);
      (idx[key] || (idx[key] = [])).push(w);
    }
    return idx;
  }

  DICT.load = function () {
    if (DICT.ready) return Promise.resolve();
    if (DICT.loading) return DICT.loading;
    DICT.loading = loadScript("data/hi-words.js")
      .then(function () { return loadScript("data/en-words.js"); })
      .then(function () {
        var hi = String(global.HI_WORDS || "").split("\n");
        var en = String(global.EN_WORDS || "").split("\n");
        DICT.hi = new Set(hi);
        DICT.en = new Set(en);
        // extra vocabulary the WordNet dump lacks but drafters type constantly
        ND.LEGAL.forEach(function (e) {
          if (e.h) DICT.hi.add(e.h);
          if (e.e) e.e.split(/[\s/,()]+/).forEach(function (p) { if (p.length > 2) DICT.en.add(p.toLowerCase()); });
        });
        DICT.hiPrefix = buildPrefixIndex(hi);
        DICT.enPrefix = buildPrefixIndex(en);
        DICT.ready = true;
        DICT.legal = ND.LEGAL;
        document.dispatchEvent(new CustomEvent("nd:dictready"));
      })
      .catch(function (err) {
        console.warn("dictionary load failed", err);
        DICT.hi = new Set();
        DICT.en = new Set();
        DICT.hiPrefix = Object.create(null);
        DICT.enPrefix = Object.create(null);
        DICT.ready = true;
      });
    return DICT.loading;
  };

  DICT.loadGloss = function () {
    if (DICT.fullLoaded) return Promise.resolve();
    return loadScript("data/hi-dict.js").then(function () {
      DICT.gloss = global.HI_DICT || {};
      DICT.fullLoaded = true;
    });
  };

  /* ----------------------------------------------------------------- lookup */
  DICT.lookupHindi = function (word) {
    var w = String(word || "").trim();
    var out = { word: w, gloss: [], legal: null, related: [] };
    if (DICT.legal) {
      var hit = DICT.legal.filter(function (e) { return e.h === w; })[0];
      if (hit) out.legal = hit;
    }
    if (DICT.gloss && DICT.gloss[w]) out.gloss.push({ src: "हिन्दी शब्दकोश (CFILT WordNet)", text: DICT.gloss[w] });
    if (DICT.legal) {
      DICT.legal.forEach(function (e) {
        if (e.h !== w && (e.h.indexOf(w) >= 0) && out.related.length < 12) out.related.push(e);
      });
    }
    return out;
  };

  DICT.lookupEnglish = function (word) {
    var w = String(word || "").trim().toLowerCase();
    var out = { word: w, entries: [] };
    if (DICT.legal) {
      DICT.legal.forEach(function (e) {
        var parts = (e.e || "").toLowerCase().split(/[\s/,()]+/);
        if (parts.indexOf(w) >= 0 && out.entries.length < 25) out.entries.push(e);
      });
    }
    return out;
  };

  /** Prefix search for the dictionary tab. */
  DICT.search = function (q, limit) {
    q = String(q || "").trim();
    limit = limit || 40;
    var res = [];
    if (!q) return res;
    var isDev = T.isDevanagari(q);

    if (isDev) {
      if (DICT.legal) {
        DICT.legal.forEach(function (e) {
          if (e.h.indexOf(q) === 0 || e.h.indexOf(q) > 0) res.push({ h: e.h, e: e.e, g: e.g, src: "विधिक शब्दावली" });
        });
      }
      if (DICT.hiPrefix) {
        var key = q.slice(0, 2);
        var bucket = (q.length === 1 ? DICT.hiPrefix[q] || [] : DICT.hiPrefix[key] || [])
          .filter(function (w) { return w.indexOf(q) === 0; });
        bucket.slice(0, limit).forEach(function (w) {
          if (!res.some(function (r) { return r.h === w; })) res.push({ h: w, src: "WordNet" });
        });
      }
    } else {
      if (DICT.legal) {
        DICT.legal.forEach(function (e) {
          if ((e.e || "").toLowerCase().indexOf(q.toLowerCase()) === 0 ||
              (e.e || "").toLowerCase().indexOf(" " + q.toLowerCase()) > 0) {
            res.push({ h: e.h, e: e.e, g: e.g, src: "विधिक शब्दावली" });
          }
        });
      }
      if (DICT.enPrefix) {
        var k2 = q.toLowerCase().slice(0, 2);
        (DICT.enPrefix[k2] || []).filter(function (w) { return w.indexOf(q.toLowerCase()) === 0; })
          .slice(0, limit).forEach(function (w) {
            if (!res.some(function (r) { return (r.e || "").toLowerCase() === w; })) {
              res.push({ h: "", e: w, src: "English lexicon" });
            }
          });
      }
    }
    return res.slice(0, limit);
  };

  /* -------------------------------------------------------------- spell check */
  function stripPunct(w) {
    return w.replace(/^[«»"'“”‘’()[\]{}<>.,;:!?।॥\-–—*]+|[«»"'“”‘’()[\]{}<>.,;:!?।॥\-–—*]+$/g, "");
  }

  var COMMON_OK = {
    "है": 1, "हैं": 1, "था": 1, "थी": 1, "थे": 1, "हो": 1, "हुआ": 1, "हुई": 1, "हुए": 1, "होता": 1,
    "होती": 1, "होते": 1, "कर": 1, "करना": 1, "किया": 1, "की": 1, "का": 1, "के": 1, "को": 1, "से": 1,
    "में": 1, "पर": 1, "और": 1, "या": 1, "यह": 1, "वह": 1, "जो": 1, "कि": 1, "नहीं": 1, "ना": 1,
    "भी": 1, "तक": 1, "साथ": 1, "लिए": 1, "द्वारा": 1, "अतः": 1, "तथा": 1, "एवं": 1, "अथवा": 1,
    "कृपया": 1, "श्रीमान": 1, "महोदय": 1, "भवदीय": 1, "दिनांक": 1, "स्थान": 1, "हस्ताक्षर": 1,
    "प्रार्थना": 1, "निवेदन": 1, "विनम्र": 1, "आदेश": 1, "निर्णय": 1, "प्रकरण": 1, "धारा": 1,
    "न्यायालय": 1, "अभियुक्त": 1, "परिवादी": 1, "गवाह": 1, "साक्षी": 1, "साक्ष्य": 1, "वादी": 1,
    "प्रतिवादी": 1, "अधिवक्ता": 1, "जमानत": 1, "मुचलका": 1, "आवेदन": 1, "पत्र": 1, "प्रतिलिपि": 1,
    "अनुसूची": 1, "उपधारा": 1, "खंड": 1, "अपील": 1, "याचिका": 1, "आरोप": 1, "दोष": 1, "सजा": 1,
    "राजस्थान": 1, "जयपुर": 1, "जोधपुर": 1, "कोर्ट": 1, "माननीय": 1, "विद्वान": 1, "कुल": 1,
    "नाम": 1, "पुत्र": 1, "पुत्री": 1, "पत्नी": 1, "निवासी": 1, "आयु": 1, "वर्ष": 1, "माह": 1,
    "रुपये": 1, "रु": 1, "प्रतिशत": 1, "तिथि": 1, "समय": 1, "बजे": 1, "अनुसार": 1, "क्रमांक": 1,
    "संख्या": 1, "विषय": 1, "सेवा": 1, "महाभियोग": 1, "अभिलेख": 1, "दस्तावेज़": 1, "अनुलग्नक": 1
  };

  /** Known-good check: WordNet, legal glossary, user dictionary, inflection. */
  DICT.isKnown = function (word, lang) {
    var w = stripPunct(String(word || ""));
    if (!w || w.length < 2) return true;
    if (/^[०-९0-9]+$/.test(w)) return true;
    if (DICT.user[w]) return true;
    if (COMMON_OK[w]) return true;

    if (HI_DEVA.test(w)) {
      if (DICT.hi && DICT.hi.has(w)) return true;
      // common Hindi suffixes / postpositions glued by drafters
      var suf = ["ों", "ें", "ाएँ", "ियाँ", "ियों", "ता", "त्व", "पूर्वक", "सहित", "रहित", "युक्त", "वाला", "वाली", "वाले", "कर", "करके"];
      for (var i = 0; i < suf.length; i++) {
        if (w.length > suf[i].length + 1 && w.slice(-suf[i].length) === suf[i]) {
          var stem = w.slice(0, -suf[i].length);
          if (DICT.hi && (DICT.hi.has(stem) || DICT.hi.has(stem + "ा") || DICT.hi.has(stem + "ी"))) return true;
        }
      }
      return false;
    }
    if (EN_WORD.test(w)) {
      var lw = w.toLowerCase();
      if (DICT.en && DICT.en.has(lw)) return true;
      if (/^(s|es|ed|ing|ly|s')$/.test(lw.slice(-3)) && DICT.en && DICT.en.has(lw.slice(0, -2))) return true;
      return false;
    }
    return true;
  };

  /** Damerau-Levenshtein distance, capped for speed. */
  function editDistance(a, b, cap) {
    cap = cap || 3;
    if (Math.abs(a.length - b.length) > cap) return cap + 1;
    var la = a.length, lb = b.length;
    var prev = new Array(lb + 1), cur = new Array(lb + 1), prev2 = new Array(lb + 1);
    for (var j = 0; j <= lb; j++) prev[j] = j;
    for (var i = 1; i <= la; i++) {
      cur[0] = i;
      var best = cur[0];
      for (var j2 = 1; j2 <= lb; j2++) {
        var cost = a.charAt(i - 1) === b.charAt(j2 - 1) ? 0 : 1;
        cur[j2] = Math.min(prev[j2] + 1, cur[j2 - 1] + 1, prev[j2 - 1] + cost);
        if (i > 1 && j2 > 1 && a.charAt(i - 1) === b.charAt(j2 - 2) && a.charAt(i - 2) === b.charAt(j2 - 1)) {
          cur[j2] = Math.min(cur[j2], prev2[j2 - 2] + 1);
        }
        if (cur[j2] < best) best = cur[j2];
      }
      if (best > cap) return cap + 1;
      var tmp = prev2; prev2 = prev; prev = cur; cur = tmp;
    }
    return prev[lb];
  }

  DICT.suggest = function (word, max) {
    max = max || 6;
    var w = stripPunct(String(word || ""));
    if (!w) return [];
    var isDev = HI_DEVA.test(w);
    var index = isDev ? DICT.hiPrefix : DICT.enPrefix;
    if (!index) return [];
    var q = isDev ? w : w.toLowerCase();
    var candidates = [];
    var k1 = q.slice(0, 1), k2 = q.slice(0, 2);
    [k1, k2].forEach(function (k) {
      (index[k] || []).forEach(function (c) { candidates.push(c); });
    });
    // fall back to a length-filtered sweep for 1-letter prefixes
    if (candidates.length < 30) {
      var all = isDev ? DICT.hi : DICT.en;
      if (all) {
        var step = 0;
        all.forEach(function (c) {
          if (step++ % 7 === 0 && Math.abs(c.length - q.length) <= 2) candidates.push(c);
        });
      }
    }
    var seen = Object.create(null);
    var scored = [];
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (seen[c]) continue;
      seen[c] = 1;
      if (Math.abs(c.length - q.length) > 2) continue;
      var d = editDistance(q, c, 2);
      if (d <= 2 && d > 0) scored.push({ w: c, d: d });
    }
    scored.sort(function (a, b) { return a.d - b.d || a.w.length - b.w.length; });
    return scored.slice(0, max).map(function (s) { return s.w; });
  };

  /**
   * Spell-check a whole text. Returns issues with block index + offsets so the
   * UI can jump straight to them.
   */
  DICT.checkText = function (text) {
    var issues = [];
    var re = /[\u0900-\u097F\u200c\u200d]+|[A-Za-z][A-Za-z'\-]+/g;
    var m;
    while ((m = re.exec(text))) {
      var raw = m[0];
      var word = stripPunct(raw);
      if (!word || word.length < 2) continue;
      if (isNaN(parseInt(word, 10)) === false) continue;
      if (!DICT.isKnown(word)) {
        issues.push({ word: word, index: m.index, length: word.length });
      }
    }
    return issues;
  };

  DICT.stats = function () {
    return {
      hindi: DICT.hi ? DICT.hi.size : 0,
      english: DICT.en ? DICT.en.size : 0,
      gloss: DICT.gloss ? Object.keys(DICT.gloss).length : 0,
      legal: (ND.LEGAL || []).length
    };
  };
})(window);
