/* =============================================================================
 * NyayaLekh — text engines
 *   • Kruti Dev 010/011/016 ⇄ Unicode (full table, both directions)
 *   • DevLys 010 / Agra / Remington-Kundli / Chanakya  →  Unicode (preview first)
 *   • Devanagari normaliser, matra/typo fixer
 *   • Roman ⇄ Devanagari transliteration (ITRANS style)
 * Kruti Dev glyph table © the MIT-licensed @bharattype/hindi-transliteration
 * project (see app/js/kd-table.js); the reverse engine and the rest of this
 * file are part of NyayaLekh.
 * ========================================================================== */
(function (global) {
  "use strict";
  var ND = (global.ND = global.ND || {});
  var T = (ND.text = ND.text || {});

  var DEV = /[\u0900-\u097F]/;
  T.isDevanagari = function (s) { return DEV.test(s || ""); };
  T.devRatio = function (s) {
    var t = String(s || "").replace(/\s/g, "");
    if (!t.length) return 0;
    return (t.match(/[\u0900-\u097F]/g) || []).length / t.length;
  };

  var IS_CONS = /[\u0915-\u0939\u0958-\u095F\u0979\u097A]/;
  function isCons(c) { return !!c && IS_CONS.test(c); }
  var MATRAS = { "\u093E": 1, "\u093F": 1, "\u0940": 1, "\u0941": 1, "\u0942": 1, "\u0943": 1, "\u0947": 1, "\u0948": 1, "\u094B": 1, "\u094C": 1, "\u0902": 1, "\u0903": 1, "\u0901": 1, "\u0945": 1, "\u093C": 1, "\u0949": 1, "\u094A": 1, "\u0946": 1 };
  T.MATRAS = MATRAS;

  /* ==========================================================================
   * 1. KRUTI DEV  →  UNICODE
   * ======================================================================== */
  var KD = T.KD_PAIRS || [];
  T.krutiReady = KD.length > 0;

  T.krutiToUnicode = function (input) {
    if (!input) return "";
    // already Unicode? do not mangle it.
    if (T.devRatio(input) > 0.35) return T.fixMatras(input);

    var text = String(input);
    for (var i = 0; i < KD.length; i++) {
      if (KD[i][0]) text = text.split(KD[i][0]).join(KD[i][1]);
    }

    text = text.split("\u00b1").join("Z\u0902");
    text = text.split("\u00c6").join("\u0930\u094Df");

    // "f" (short i) precedes the consonant cluster it belongs to
    var pos = text.indexOf("f");
    while (pos !== -1 && pos + 1 < text.length) {
      text = text.slice(0, pos) + text.charAt(pos + 1) + "\u093F" + text.slice(pos + 2);
      pos = text.indexOf("f", pos + 2);
    }
    text = text.split("\u00c7").join("fa");
    text = text.split("\u00c9").join("\u0930\u094Dfa");
    var pf = text.indexOf("fa");
    while (pf !== -1 && pf + 2 < text.length) {
      text = text.slice(0, pf) + text.charAt(pf + 2) + "\u093F\u0902" + text.slice(pf + 3);
      pf = text.indexOf("fa", pf + 2);
    }
    text = text.split("\u00ca").join("\u0940Z");

    var wi = text.indexOf("\u093F\u094D");
    while (wi !== -1 && wi + 2 < text.length) {
      text = text.slice(0, wi) + "\u094D" + text.charAt(wi + 2) + "\u093F" + text.slice(wi + 3);
      wi = text.indexOf("\u093F\u094D", wi + 2);
    }

    // reph marker "Z" → र् at the head of its syllable
    var z = text.indexOf("Z");
    while (z > 0) {
      var start = z - 1;
      while (start > 0 && MATRAS[text.charAt(start)]) start--;
      while (start >= 2 && text.charAt(start - 1) === "\u094D") start -= 2;
      var syl = text.slice(start, z);
      text = text.slice(0, start) + "\u0930\u094D" + syl + text.slice(z + 1);
      z = text.indexOf("Z");
    }
    text = text.replace(/Z/g, "");
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");
    try { text = text.normalize("NFC"); } catch (e) {}
    return text;
  };

  /* ==========================================================================
   * 2. UNICODE  →  KRUTI DEV
   * ======================================================================== */
  var REV = (function () {
    var m = {};
    for (var i = 0; i < KD.length; i++) {
      var u = KD[i][1], k = KD[i][0];
      if (!u || !k) continue;
      if (!DEV.test(u)) continue;              // skip ASCII helper hacks
      if (/[\u200B-\u200D\uFEFF]/.test(u)) continue;
      if (m[u] === undefined) m[u] = k;
    }
    // canonical single letters (the table has several aliases; keep the glyph
    // that every Kruti Dev 010/016 font draws correctly)
    var canon = {
      "क": "d", "ख": "[k", "ग": "x", "घ": "?k", "ङ": "³", "च": "p", "छ": "N", "ज": "t",
      "झ": ">", "ञ": "÷", "ट": "V", "ठ": "B", "ड": "M", "ढ": "<", "ण": ".k", "त": "r",
      "थ": "Fk", "द": "n", "ध": "/k", "न": "u", "प": "i", "फ": "Q", "ब": "c", "भ": "Hk",
      "म": "e", "य": ";", "र": "j", "ल": "y", "व": "o", "श": "'k", "ष": "\"k", "स": "l",
      "ह": "g", "ळ": "G", "ा": "k", "ी": "h", "ु": "q", "ू": "w", "ृ": "`", "े": "s",
      "ै": "S", "ो": "ks", "ौ": "kS", "ं": "a", "ँ": "¡", "ः": "%", "्": "~", "।": "A",
      "ॐ": "¬", "ऽ": "•", "़": "+", "ॅ": "W", "ॉ": "‚",
      "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9",
      "अ": "v", "आ": "vk", "इ": "b", "ई": "bZ", "उ": "m", "ऊ": "Å", "ऋ": "_", "ए": ",",
      "ऐ": ",s", "ओ": "vks", "औ": "vkS", "ऑ": "v‚",
      "क्ष": "{k", "त्र": "=", "ज्ञ": "K", "प्र": "iz", "श्र": "J", "क्र": "Ø",
      "द्य": "|", "ह्म": "ã", "ह्य": "á", "हृ": "â", "ह्न": "à", "द्ध": "¼", "द्व": ")",
      "ट्ट": "Vª", "ट्ठ": "Bª", "ड्ड": "Mª", "ड्ढ": "<ªª", "छ्य": "Nî", "ट्य": "Vî",
      "ठ्य": "Bî", "ड्य": "Mî", "ढ्य": "<î", "द्र": "nz", "क्क": "D", "ज्ञ्": "K~",
      "त्त": "Ùk", "क्त": "ä"
    };
    for (var c in canon) if (canon.hasOwnProperty(c)) m[c] = canon[c];
    // ASCII punctuation as drawn by Kruti Dev fonts
    m[","] = "]"; m["."] = "-"; m["-"] = "&"; m["/"] = "@"; m["?"] = "\\";
    m["\u2018"] = "^"; m["\u2019"] = "*"; m["\u201C"] = "Þ"; m["\u201D"] = "ß";
    m["ि"] = "f";
    return m;
  })();
  var REV_KEYS = Object.keys(REV).sort(function (a, b) { return b.length - a.length; });

  function moveIMatraBefore(s) {
    var out = "", i = 0;
    while (i < s.length) {
      var c = s.charAt(i);
      if (isCons(c)) {
        var cluster = c, j = i + 1;
        while (s.charAt(j) === "\u094D" && isCons(s.charAt(j + 1))) { cluster += s.charAt(j) + s.charAt(j + 1); j += 2; }
        if (s.charAt(j) === "\u093C") { cluster += "\u093C"; j++; }   // nukta
        if (s.charAt(j) === "\u093F") { out += "\u093F" + cluster; j++; }
        else out += cluster;
        i = j;
      } else { out += c; i++; }
    }
    return out;
  }

  function moveRephAfter(s) {
    var out = "", i = 0;
    while (i < s.length) {
      if (s.charAt(i) === "\u0930" && s.charAt(i + 1) === "\u094D") {
        var j = i + 2;
        if (!isCons(s.charAt(j))) { out += "\u0930\u094D"; i += 2; continue; }
        var syl = s.charAt(j);
        j++;
        while (s.charAt(j) === "\u094D" && isCons(s.charAt(j + 1))) { syl += s.charAt(j) + s.charAt(j + 1); j += 2; }
        while (j < s.length && MATRAS[s.charAt(j)]) { syl += s.charAt(j); j++; }
        out += syl + "Z";
        i = j;
      } else { out += s.charAt(i); i++; }
    }
    return out;
  }

  T.unicodeToKruti = function (input) {
    if (!input) return "";
    var t = String(input);
    try { t = t.normalize("NFC"); } catch (e) {}
    t = moveIMatraBefore(t);
    t = moveRephAfter(t);
    var out = "", i = 0;
    while (i < t.length) {
      var hit = null;
      for (var k = 0; k < REV_KEYS.length; k++) {
        var key = REV_KEYS[k];
        if (key.length === 1 && t.charAt(i) !== key) continue;
        if (t.substr(i, key.length) === key) { hit = key; break; }
      }
      if (hit) { out += REV[hit]; i += hit.length; }
      else {
        var ch = t.charAt(i);
        if (ch === "Z") { out += "Z"; }
        else out += ch;
        i++;
      }
    }
    return out;
  };

  /* ==========================================================================
   * 3. OTHER LEGACY FONTS (preview is always shown before applying)
   * ======================================================================== */
  // DevLys 010 is Kruti Dev 010 with a couple of different signs.
  T.devlysToUnicode = function (input) {
    return T.krutiToUnicode(String(input || "").replace(/\u00b5/g, "(").replace(/\u00bd/g, ")"));
  };

  // Agra / Remington (Kundli) — common key layout, extended below.
  var REM = {
    "d": "क", "[k": "ख", "x": "ग", "?k": "घ", "p": "च", "N": "छ", "t": "ज", ">": "झ",
    "V": "ट", "B": "ठ", "M": "ड", "<": "ढ", ".k": "ण", "r": "त", "Fk": "थ", "n": "द",
    "/k": "ध", "u": "न", "i": "प", "Q": "फ", "c": "ब", "Hk": "भ", "e": "म", ";": "य",
    "j": "र", "y": "ल", "o": "व", "'k": "श", "\"k": "ष", "l": "स", "g": "ह", "G": "ळ",
    "k": "ा", "h": "ी", "q": "ु", "w": "ू", "`": "ृ", "s": "े", "S": "ै", "ks": "ो", "kS": "ौ",
    "a": "ं", "¡": "ँ", "%": "ः", "~": "्", "A": "।", "v": "अ", "vk": "आ", "b": "इ",
    "bZ": "ई", "m": "उ", "Å": "ऊ", "_": "ऋ", ",": "ए", ",s": "ऐ", "vks": "ओ", "vkS": "औ",
    "v‚": "ऑ", "{k": "क्ष", "=": "त्र", "K": "ज्ञ", "Ø": "क्र", "J": "श्र", "|": "द्य",
    "0": "०", "1": "१", "2": "२", "3": "३", "4": "४", "5": "५", "6": "६", "7": "७", "8": "८", "9": "९"
  };
  var REM_ORDER = Object.keys(REM).sort(function (a, b) { return b.length - a.length; });

  function mapLegacy(src, map, order) {
    var out = "";
    for (var i = 0; i < src.length; i++) {
      var hit = false;
      for (var k = 0; k < order.length; k++) {
        var key = order[k];
        if (src.substr(i, key.length) === key) { out += map[key]; i += key.length - 1; hit = true; break; }
      }
      if (!hit) out += src.charAt(i);
    }
    return T.fixMatras(out);
  }

  T.remingtonToUnicode = function (input) { return mapLegacy(String(input || ""), REM, REM_ORDER); };
  T.agraToUnicode = function (input) { return mapLegacy(String(input || ""), REM, REM_ORDER); };
  T.kundliToUnicode = function (input) { return mapLegacy(String(input || ""), REM, REM_ORDER); };

  // Chanakya layout (widely used by Rajasthan e-courts typists).
  var CHA = {
    "v": "अ", "vk": "आ", "b": "इ", "bZ": "ई", "m": "उ", "Å": "ऊ", "_": "ऋ", ",": "ए", ",s": "ऐ",
    "vks": "ओ", "vkS": "औ", "d": "क", "[k": "ख", "x": "ग", "?k": "घ", "M": "ङ",
    "p": "च", "N": "छ", "t": "ज", ">": "झ", "¥": "ञ", "V": "ट", "B": "ठ", "M+": "ड",
    "<+": "ढ", ".k": "ण", "r": "त", "Fk": "थ", "n": "द", "/k": "ध", "u": "न", "i": "प",
    "Q": "फ", "c": "ब", "Hk": "भ", "e": "म", ";": "य", "j": "र", "y": "ल", "o": "व",
    "'": "श", "\"": "ष", "l": "स", "g": "ह", "k": "ा", "h": "ी", "q": "ु", "w": "ू",
    "`": "ृ", "s": "े", "S": "ै", "ks": "ो", "kS": "ौ", "a": "ं", "¡": "ँ", "%": "ः",
    "~": "्", "A": "।", "{k": "क्ष", "=": "त्र", "K": "ज्ञ", "Ø": "क्र", "J": "श्र"
  };
  var CHA_ORDER = Object.keys(CHA).sort(function (a, b) { return b.length - a.length; });
  T.chanakyaToUnicode = function (input) { return mapLegacy(String(input || ""), CHA, CHA_ORDER); };

  /** Auto-detects which legacy font produced a run of text. */
  T.detectLegacy = function (s) {
    var t = String(s || "");
    if (!t.trim()) return "none";
    if (T.devRatio(t) > 0.5) return "unicode";
    var kdHits = (t.match(/[\[{;.~|`]/g) || []).length;
    if (kdHits / t.length > 0.06) return "krutidev";
    return "latin";
  };

  T.convertLegacy = function (s, font) {
    switch (font) {
      case "krutidev": case "kruti": return T.krutiToUnicode(s);
      case "devlys": return T.devlysToUnicode(s);
      case "chanakya": return T.chanakyaToUnicode(s);
      case "remington": case "kundli": case "agra": return T.remingtonToUnicode(s);
      case "unicode": return T.fixMatras(s);
      default: return T.krutiToUnicode(s);
    }
  };

  /* ==========================================================================
   * 4. NORMALISER / MATRA FIXER
   * ======================================================================== */
  T.normalize = function (s) {
    var t = String(s == null ? "" : s);
    t = t.replace(/\r\n?/g, "\n");
    try { t = t.normalize("NFC"); } catch (e) {}
    t = t.replace(/[\u200B-\u200D\uFEFF]/g, "");
    t = t.replace(/[ \t\u00a0]+/g, " ");
    t = t.replace(/ +, */g, ", ");
    t = t.replace(/\s+।/g, "।").replace(/।(?=[^\s।\n])/g, "। ");
    t = t.replace(/।\s*।/g, "॥");
    return t;
  };

  /** Repairs legacy-order matras and other common conversion damage. */
  T.fixMatras = function (s) {
    var t = String(s == null ? "" : s);
    // Kruti Dev renders "ूँ" as ू + candra; restore the anusvara it stands for
    t = t.replace(/\u0942\u0945/g, "\u0942\u0901");
    t = t.replace(/\u0946/g, "\u0947").replace(/\u094A/g, "\u094B").replace(/\u0945/g, "\u0948");
    t = t.replace(/\u0958/g, "क\u093C").replace(/\u0959/g, "ख\u093C").replace(/\u095A/g, "ग\u093C")
      .replace(/\u095B/g, "ज\u093C").replace(/\u095C/g, "ड\u093C").replace(/\u095D/g, "ढ\u093C")
      .replace(/\u095E/g, "फ\u093C").replace(/\u095F/g, "य\u093C");

    // "ि" typed in front of its consonant cluster: िक → कि, िक्ष → क्षि
    var out = "", i = 0;
    while (i < t.length) {
      if (t.charAt(i) === "\u093F") {
        var prev = out.charAt(out.length - 1);
        if (prev && (isCons(prev) || MATRAS[prev] || prev === "\u094D")) { out += "\u093F"; i++; continue; }
        var j = i + 1, cluster = "";
        while (isCons(t.charAt(j))) {
          cluster += t.charAt(j); j++;
          if (t.charAt(j) === "\u094D" && isCons(t.charAt(j + 1))) { cluster += "\u094D"; j++; continue; }
          break;
        }
        if (cluster) { out += cluster + "\u093F"; i = j; continue; }
        out += "\u093F"; i++; continue;
      }
      out += t.charAt(i); i++;
    }
    t = out;

    // independent vowel followed by a dependent sign: अा → आ
    t = t.replace(/अा/g, "आ").replace(/अि/g, "इ").replace(/अी/g, "ई")
      .replace(/अु/g, "उ").replace(/अू/g, "ऊ").replace(/अे/g, "ए").replace(/अै/g, "ऐ")
      .replace(/अो/g, "ओ").replace(/अौ/g, "औ");

    // space between a virama and the next consonant
    t = t.replace(/([\u0915-\u0939])\u094D\s+([\u0915-\u0939])/g, "$1\u094D$2");
    return t;
  };

  var TYPO_RULES = [
    [/ऱ/g, "र"], [/\u0934/g, "ल"], [/य़/g, "य"],
    [/\s+([,;:])/g, "$1"],
    [/\(\s+/g, "("], [/\s+\)/g, ")"],
    [/([।॥])\s*([।॥])/g, "॥"],
    [/"\s*([^"]{1,200}?)\s*"/g, "\u201c$1\u201d"],
    [/\s+\./g, "."],
    [/[ \t]{2,}/g, " "],
    [/(\d)\s*\/\s*(\d)/g, "$1/$2"],
    [/([०-९])\s*\/\s*([०-९])/g, "$1/$2"],
    [/अनुसूची\s*([०-९0-9])/g, "अनुसूची $1"],
    [/धारा\s*([०-९0-9])/g, "धारा $1"]
  ];

  T.fixTypos = function (s) {
    var t = T.fixMatras(String(s == null ? "" : s));
    for (var i = 0; i < TYPO_RULES.length; i++) t = t.replace(TYPO_RULES[i][0], TYPO_RULES[i][1]);
    return t;
  };

  T.diffCount = function (a, b) {
    if (a === b) return 0;
    var n = 0, len = Math.max(a.length, b.length);
    for (var i = 0; i < len; i++) if (a.charAt(i) !== b.charAt(i)) n++;
    return n;
  };

  /* ==========================================================================
   * 5. TRANSLITERATION
   * ======================================================================== */
  var CONS_MAP = {
    "kh": "ख", "gh": "घ", "chh": "छ", "ch": "च", "jh": "झ", "Th": "ठ", "Dh": "ढ",
    "th": "थ", "dh": "ध", "ph": "फ", "bh": "भ", "sh": "श", "Sh": "ष", "Rh": "ढ़",
    "k": "क", "q": "क़", "K": "ख़", "g": "ग", "G": "ग़", "ng": "ङ", "~n": "ञ",
    "j": "ज", "z": "ज़", "T": "ट", "D": "ड", "N": "ण", "t": "त", "d": "द", "n": "न",
    "p": "प", "f": "फ़", "b": "ब", "m": "म", "y": "य", "r": "र", "R": "ड़", "l": "ल",
    "v": "व", "w": "व", "s": "स", "h": "ह", "L": "ळ", "x": "क्ष", "GY": "ज्ञ", "dny": "ज्ञ"
  };
  var VOWEL_MAP = {
    "aa": "आ", "A": "आ", "ai": "ऐ", "au": "औ", "aw": "ऑ", "ii": "ई", "ee": "ई", "I": "ई",
    "uu": "ऊ", "oo": "ऊ", "U": "ऊ", "Ri": "ऋ", "a": "अ", "i": "इ", "u": "उ", "e": "ए",
    "o": "ओ", "E": "ए", "O": "ओ"
  };
  var MATRA_MAP = {
    "aa": "ा", "A": "ा", "ai": "ै", "au": "ौ", "aw": "ॉ", "ii": "ी", "ee": "ी", "I": "ी",
    "uu": "ू", "oo": "ू", "U": "ू", "Ri": "ृ", "a": "", "i": "ि", "u": "ु", "e": "े",
    "o": "ो", "E": "े", "O": "ो"
  };
  var SIGN_MAP = { "M": "ं", "H": "ः", "~": "ँ", ".n": "ँ", "OM": "ॐ", "|": "।", "||": "॥" };

  function longestKey(map, s, i) {
    var best = null;
    for (var k in map) {
      if (!map.hasOwnProperty(k)) continue;
      if (k.length > s.length - i) continue;
      if (s.substr(i, k.length) === k && (!best || k.length > best.length)) best = k;
    }
    return best;
  }

  /** Convert one Roman token to Devanagari (ITRANS-ish, forgiving). */
  T.romanToDevanagari = function (roman) {
    var s = String(roman || "");
    var out = "", i = 0, lastCons = false;
    while (i < s.length) {
      var ch = s.charAt(i);

      if (ch === "n" && s.charAt(i + 1) === "g" && !/[aeiou]/.test(s.charAt(i + 2) || "")) {
        out += (lastCons ? "्" : "") + "ङ"; lastCons = true; i += 2; continue;
      }
      var sign = longestKey(SIGN_MAP, s, i);
      if (sign && (sign === "M" || sign === "H" || sign === "~" || sign === ".n" || sign === "OM" || sign === "|" || sign === "||")) {
        out += SIGN_MAP[sign]; lastCons = false; i += sign.length; continue;
      }
      var c = longestKey(CONS_MAP, s, i);
      var v = longestKey(VOWEL_MAP, s, i);
      if (c && (!v || c.length >= v.length)) {
        if (lastCons) out += "\u094D";
        out += CONS_MAP[c];
        lastCons = true;
        i += c.length;
        continue;
      }
      if (v) {
        out += lastCons ? MATRA_MAP[v] : VOWEL_MAP[v];
        lastCons = false;
        i += v.length;
        continue;
      }
      if (ch === "\\" || ch === ".") {
        if (lastCons) out += "\u094D";
        lastCons = false; i++; continue;
      }
      if (/[0-9]/.test(ch)) { out += "०१२३४५६७८९".charAt(+ch); lastCons = false; i++; continue; }
      if (ch === ".") { out += "।"; lastCons = false; i++; continue; }
      out += ch;
      lastCons = false;
      i++;
    }
    return out;
  };

  var REV_VOW = { "अ": "a", "आ": "aa", "इ": "i", "ई": "ii", "उ": "u", "ऊ": "uu", "ऋ": "ri", "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "ऑ": "aw" };
  var REV_CONS = { "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng", "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny", "ट": "T", "ठ": "Th", "ड": "D", "ढ": "Dh", "ण": "N", "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n", "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m", "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh", "ष": "Sh", "स": "s", "ह": "h", "ळ": "L", "क्ष": "x", "ज्ञ": "GY", "त्र": "tr", "श्र": "shr", "ड़": "R", "ढ़": "Rh", "क़": "q", "ख़": "K", "ग़": "G", "ज़": "z", "फ़": "f" };
  var REV_MATRA = { "ा": "aa", "ि": "i", "ी": "ii", "ु": "u", "ू": "uu", "ृ": "ri", "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ॉ": "aw", "ॅ": "e", "ं": "M", "ः": "H", "ँ": "~", "़": "" };

  T.devanagariToRoman = function (text) {
    var s = String(text || ""), out = "";
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i), n = s.charAt(i + 1);
      if (c === "\u094D") { continue; }
      if (REV_CONS[c]) {
        out += REV_CONS[c];
        if (n === "\u094D") { /* half form: no inherent vowel */ }
        else if (REV_MATRA[n] !== undefined && n) { out += REV_MATRA[n]; i++; }
        else out += "a";
        continue;
      }
      if (REV_MATRA[c] !== undefined) { out += REV_MATRA[c]; continue; }
      if (REV_VOW[c]) { out += REV_VOW[c]; continue; }
      if (c === "।") { out += "."; continue; }
      if (c === "॥") { out += "||"; continue; }
      if (/[०१२३४५६७८९]/.test(c)) { out += "०१२३४५६७८९".indexOf(c); continue; }
      out += c;
    }
    return out.replace(/a(?=[\s.,;:!?।]|$)/g, "");
  };

  /* ==========================================================================
   * 6. SAME-SCRIPT TRANSLITERATION (Hindi → Bengali/Gujarati/… blocks)
   * ======================================================================== */
  var OFFSET = { bengali: 0x0980 - 0x0900, gurmukhi: 0x0A00 - 0x0900, gujarati: 0x0A80 - 0x0900, oriya: 0x0B00 - 0x0900, tamil: 0x0B80 - 0x0900, telugu: 0x0C00 - 0x0900, kannada: 0x0C80 - 0x0900, malayalam: 0x0D00 - 0x0900 };
  T.toScript = function (text, script) {
    var off = OFFSET[script];
    if (!off) return text;
    return String(text || "").replace(/[\u0900-\u097F]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) + off);
    });
  };
})(window);
