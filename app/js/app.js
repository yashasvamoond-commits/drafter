/* =============================================================================
 * NyayaLekh — application shell: screens, panels, menus, export & voice.
 * ========================================================================== */
(function (global) {
  "use strict";
  var ND = (global.ND = global.ND || {});
  var U = ND.util, D = ND.doc, T = ND.text, E = ND.editor, S = ND.settings;

  var A = (ND.app = {});
  var current = null;          // current document
  var saveTimer = null;
  var lastSaved = 0;

  /* ==========================================================================
   * modal helpers
   * ======================================================================== */
  function modal(title, build, footer) {
    var m = document.getElementById("modal");
    document.getElementById("modalTitle").textContent = title;
    var body = document.getElementById("modalBody");
    var foot = document.getElementById("modalFoot");
    body.innerHTML = "";
    foot.innerHTML = "";
    build(body);
    (footer || []).forEach(function (b) {
      var btn = U.el("button", { class: "btn " + (b.cls || ""), text: b.label });
      btn.addEventListener("click", function () {
        if (b.onClick) {
          var keep = b.onClick(body);
          if (keep === true) return;
        }
        if (b.keepOpen !== true) closeModal();
      });
      foot.appendChild(btn);
    });
    m.hidden = false;
    var firstInput = body.querySelector("input,textarea,select");
    if (firstInput) setTimeout(function () { firstInput.focus(); }, 60);
  }
  function closeModal() { document.getElementById("modal").hidden = true; }
  A.modal = modal;
  A.closeModal = closeModal;

  function confirmBox(title, message, onYes, yesLabel) {
    modal(title, function (b) {
      b.appendChild(U.el("p", { text: message, style: { margin: "4px 0 8px", lineHeight: "1.6" } }));
    }, [
      { label: "रद्द करें", cls: "ghost" },
      { label: yesLabel || "हाँ, करें", cls: "accent", onClick: onYes }
    ]);
  }

  /* ==========================================================================
   * side panel
   * ======================================================================== */
  function openPanel(title, build) {
    var p = document.getElementById("sidePanel");
    document.getElementById("panelTitle").textContent = title;
    var body = document.getElementById("panelBody");
    body.innerHTML = "";
    build(body);
    p.hidden = false;
    document.querySelectorAll(".railbtn").forEach(function (b) { b.classList.remove("on"); });
    closeDrawer();
  }
  function closePanel() { document.getElementById("sidePanel").hidden = true; }

  /* ==========================================================================
   * document lifecycle
   * ======================================================================== */
  function loadDoc(doc) {
    current = doc;
    document.getElementById("docTitle").value = doc.title || "अनाम दस्तावेज़";
    E.init(doc);
    E.setDoc(doc);
    updateStats();
    fitZoom();
    setSaveState("saved");
  }

  function newDoc(opts) {
    var doc = D.newDoc(opts);
    loadDoc(doc);
    ND.store.put(doc);
    U.toast("नया दस्तावेज़ बनाया गया", "ok");
  }

  function autosave() {
    clearTimeout(saveTimer);
    if (!S.autosave) return;
    setSaveState("saving");
    saveTimer = setTimeout(function () {
      if (!current) return;
      current.updatedAt = Date.now();
      ND.store.put(JSON.parse(JSON.stringify(current))).then(function () {
        lastSaved = Date.now();
        setSaveState("saved");
      }).catch(function () { setSaveState("error"); });
    }, 900);
  }

  function setSaveState(kind) {
    var el = document.getElementById("stSave");
    var sub = document.getElementById("docSub");
    if (!el) return;
    var txt = { saved: "सहेजा गया", saving: "सहेजा जा रहा है…", error: "सहेजने में त्रुटि" }[kind] || "";
    el.textContent = txt;
    el.classList.toggle("dirty", kind !== "saved");
    if (sub) sub.textContent = txt + " · " + ND.i18n.t("words") + " " + (D.stats(current).words || 0);
  }

  function updateStats() {
    if (!current) return;
    E.updateStats();
    setSaveState(lastSaved ? "saved" : "saved");
  }

  /* ==========================================================================
   * screens
   * ======================================================================== */

  /* ---------------------------------------------------------------- templates */
  function screenTemplates() {
    openPanel("न्यायालयीन प्रारूप", function (body) {
      var cats = [
        { id: "all", label: "सभी" },
        { id: "criminal", label: "फौजदारी" },
        { id: "civil", label: "दीवानी" },
        { id: "misc", label: "विविध" }
      ];
      var tabs = U.el("div", { class: "tabs" });
      var list = U.el("div", { class: "list" });
      cats.forEach(function (c, i) {
        var b = U.el("button", { text: c.label, class: i === 0 ? "on" : "" });
        b.addEventListener("click", function () {
          tabs.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
          b.classList.add("on");
          render(c.id);
        });
        tabs.appendChild(b);
      });
      function render(cat) {
        list.innerHTML = "";
        ND.templates.filter(function (t) { return cat === "all" || t.cat === cat; }).forEach(function (t) {
          var item = U.el("div", { class: "item" });
          var grow = U.el("div", { class: "grow" });
          grow.appendChild(U.el("strong", { text: t.title }));
          grow.appendChild(U.el("small", { text: t.sub }));
          item.appendChild(grow);
          item.appendChild(U.el("button", { class: "btn sm", text: "लगाएँ" }));
          item.addEventListener("click", function () { insertTemplate(t); });
          list.appendChild(item);
        });
      }
      body.appendChild(tabs);
      body.appendChild(list);
      body.appendChild(U.el("p", { class: "hint", text: "प्रारूप में न्यायालय का नाम, प्रकरण संख्या, पक्षकार एवं दिनांक स्वतः भर जाते हैं — इन्हें ‘न्यायालय सेटिंग’ में बदलें।" }));
      render("all");
    });
  }

  function insertTemplate(t) {
    var blocks = D.buildTemplate(t.id, current);
    if (!blocks) return;
    var apply = function (replace) {
      E.pushUndo();
      if (replace) current.blocks = blocks;
      else current.blocks = current.blocks.concat(blocks);
      current.title = t.title;
      document.getElementById("docTitle").value = t.title;
      E.setDoc(current);
      autosave();
      U.toast(replace ? "प्रारूप खोला गया" : "प्रारूप जोड़ा गया", "ok");
    };
    modal(t.title, function (b) {
      b.appendChild(U.el("p", { class: "hint", text: t.sub }));
      b.appendChild(U.el("div", { class: "card", style: { marginTop: "10px" }, text: "पूर्वावलोकन:" }));
      var prev = U.el("div", { style: { maxHeight: "240px", overflow: "auto", fontFamily: '"Noto Serif Dev", serif', fontSize: "13px", lineHeight: "1.7", background: "var(--surface-2)", padding: "10px", borderRadius: "10px", whiteSpace: "pre-wrap" } });
      prev.textContent = blocks.slice(0, 14).map(function (x) { return U.stripTags(x.html); }).join("\n");
      b.appendChild(prev);
    }, [
      { label: "रद्द करें", cls: "ghost" },
      { label: "वर्तमान में जोड़ें", onClick: function () { apply(false); } },
      { label: "नया दस्तावेज़", cls: "accent", onClick: function () { apply(true); } }
    ]);
  }

  /* ------------------------------------------------------------------ files */
  function screenFiles() {
    openPanel("मेरी फ़ाइलें", function (body) {
      var list = U.el("div", { class: "list" });
      body.appendChild(list);
      ND.store.all().then(function (docs) {
        list.innerHTML = "";
        if (!docs.length) {
          list.appendChild(U.el("div", { class: "empty-state", text: "कोई सहेजा गया दस्तावेज़ नहीं है।" }));
          return;
        }
        docs.forEach(function (d) {
          var item = U.el("div", { class: "item" });
          var grow = U.el("div", { class: "grow" });
          grow.appendChild(U.el("strong", { text: d.title || "अनाम" }));
          var st = D.stats(d);
          grow.appendChild(U.el("small", { text: U.fmtDate(d.updatedAt) + " · " + st.words + " शब्द" }));
          item.appendChild(grow);
          var open = U.el("button", { class: "btn sm primary", text: "खोलें" });
          open.addEventListener("click", function () { loadDoc(d); closePanel(); U.toast("खोला गया", "ok"); });
          var more = U.el("button", { class: "sbtn", text: "⋯" });
          more.addEventListener("click", function () { fileActions(d); });
          item.appendChild(open);
          item.appendChild(more);
          list.appendChild(item);
        });
      });
    });
  }

  function fileActions(d) {
    modal(d.title || "दस्तावेज़", function (b) {
      var actions = [
        ["नाम बदलें", function () {
          var inp = U.el("input", { class: "input", value: d.title });
          b.innerHTML = "";
          b.appendChild(U.el("div", { class: "field" }, [U.el("label", { text: "नया नाम" }), inp]));
          b.appendChild(U.el("button", {
            class: "btn primary", text: "सहेजें", onclick: function () {
              d.title = inp.value || d.title;
              ND.store.put(d).then(function () {
                if (current && current.id === d.id) document.getElementById("docTitle").value = d.title;
                closeModal(); screenFiles();
              });
            }
          }));
        }],
        ["प्रतिलिपि बनाएँ", function () {
          var copy = JSON.parse(JSON.stringify(d));
          copy.id = U.uid("doc");
          copy.title = d.title + " (प्रतिलिपि)";
          copy.createdAt = Date.now();
          copy.updatedAt = Date.now();
          ND.store.put(copy).then(function () { closeModal(); screenFiles(); U.toast("प्रतिलिपि बनाई गई", "ok"); });
        }],
        ["निर्यात करें", function () { closeModal(); screenExport(d); }],
        ["हटाएँ", function () {
          closeModal();
          confirmBox("दस्तावेज़ हटाएँ", "क्या आप वास्तव में ‘" + (d.title || "") + "’ हटाना चाहते हैं? यह क्रिया वापस नहीं ली जा सकती।", function () {
            ND.store.del(d.id).then(function () {
              if (current && current.id === d.id) newDoc();
              screenFiles();
              U.toast("हटा दिया गया", "ok");
            });
          }, "हटाएँ");
        }]
      ];
      b.appendChild(U.el("div", { class: "list" }, actions.map(function (a) {
        var btn = U.el("button", { class: "btn block", text: a[0], style: { justifyContent: "flex-start" } });
        btn.addEventListener("click", a[1]);
        return btn;
      })));
    }, [{ label: "बंद करें", cls: "ghost" }]);
  }

  /* ----------------------------------------------------------------- export */
  function screenExport(doc) {
    var d = doc || current;
    modal("निर्यात / प्रिंट", function (b) {
      b.appendChild(U.el("p", { class: "hint", text: "फ़ाइलें टैबलेट के Documents/NyayaLekh फ़ोल्डर में सहेजी जाती हैं, जहाँ से WPS Office सीधे खोल सकता है।" }));
      var grid = U.el("div", { class: "cards", style: { marginTop: "12px" } });
      var opts = [
        ["Word (.docx)", "MS Word / WPS Office में खुलने योग्य", "docx"],
        ["PDF (प्रिंट)", "सीधे प्रिंट या ‘PDF में सहेजें’", "pdf"],
        ["HTML", "वेब/ई-मेल हेतु", "html"],
        ["Plain text (.txt)", "सरल पाठ", "txt"],
        ["RTF", "पुराने सिस्टम हेतु", "rtf"]
      ];
      opts.forEach(function (o) {
        var c = U.el("button", { class: "card" }, [
          U.el("strong", { text: o[0] }),
          U.el("small", { text: o[1] })
        ]);
        c.addEventListener("click", function () {
          closeModal();
          doExport(d, o[2]);
        });
        grid.appendChild(c);
      });
      b.appendChild(grid);
    }, [{ label: "बंद करें", cls: "ghost" }]);
  }

  function doExport(doc, kind) {
    var name = U.safeName(doc.title);
    if (kind === "docx") {
      D.toDocxBlob(doc).then(function (blob) {
        saveBlob(name + ".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", blob);
      });
    } else if (kind === "pdf") {
      if (ND.native.has()) { ND.native.call("printPage"); U.toast("प्रिंट डायलॉग खुल रहा है — ‘PDF के रूप में सहेजें’ चुनें", "ok", 3500); }
      else { window.print(); }
    } else if (kind === "html") {
      saveBlob(name + ".html", "text/html", new Blob([D.toHtml(doc)], { type: "text/html;charset=utf-8" }));
    } else if (kind === "txt") {
      saveBlob(name + ".txt", "text/plain", new Blob([D.toText(doc)], { type: "text/plain;charset=utf-8" }));
    } else if (kind === "rtf") {
      saveBlob(name + ".rtf", "application/rtf", new Blob([D.toRtf(doc)], { type: "application/rtf" }));
    }
  }

  function saveBlob(name, mime, blob) {
    if (ND.native.has()) {
      U.toast("सहेजा जा रहा है…", "", 1200);
      ND.native.saveToDocuments(name, mime, blob, function (err, path) {
        if (err) U.toast("सहेजने में समस्या: " + err, "err");
        else U.toast("सहेजा गया: " + (path || name), "ok", 3200);
      });
    } else {
      U.download(name, blob);
      U.toast("डाउनलोड शुरू: " + name, "ok");
    }
  }

  /* ----------------------------------------------------------------- import */
  function screenImport() {
    modal("फ़ाइल खोलें / आयात", function (b) {
      b.appendChild(U.el("p", { class: "hint", text: "WPS Office, MS Word, OpenOffice आदि से बनी .docx / .odt / .rtf / .txt / .html फ़ाइलें खोलें।" }));
      var btn = U.el("button", { class: "btn accent block", text: "टैबलेट से फ़ाइल चुनें", style: { marginTop: "12px" } });
      btn.addEventListener("click", function () {
        ND.native.pickFile(function (name, b64) {
          closeModal();
          importFromBase64(name, b64);
        });
      });
      b.appendChild(btn);
      b.appendChild(U.el("p", { class: "hint", style: { marginTop: "10px" },
        text: "टिप: पुरानी .doc फ़ाइल को WPS Office में खोलकर .docx के रूप में सहेजें। PDF आयात केवल टेक्स्ट वाली PDF हेतु कार्य करता है।" }));
    }, [{ label: "बंद करें", cls: "ghost" }]);
  }

  function importFromBase64(name, b64) {
    U.toast("आयात हो रहा है…", "", 1500);
    D.importFile(name, b64).then(function (blocks) {
      // legacy font detection
      var plain = blocks.map(function (x) { return U.stripTags(x.html); }).join("\n");
      var legacy = T.devRatio(plain) < 0.3 && /[\[\]{}<>;~|\\]/.test(plain);
      var finish = function () {
        var doc = D.newDoc({ title: name.replace(/\.[^.]+$/, ""), blocks: blocks });
        loadDoc(doc);
        ND.store.put(doc);
        U.toast("आयात सफल — " + blocks.length + " अनुच्छेद", "ok");
      };
      if (legacy) {
        confirmBox("पुराना फ़ॉन्ट मिला", "इस फ़ाइल का पाठ कृतिदेव/लीगेसी फ़ॉन्ट में लगता है। क्या इसे यूनिकोड में बदल दिया जाए?", function () {
          blocks.forEach(function (x) {
            x.html = U.escapeHtml(T.fixMatras(T.krutiToUnicode(U.stripTags(x.html))));
          });
          finish();
        }, "यूनिकोड में बदलें");
      } else finish();
    }).catch(function (err) {
      U.toast(err.message || "आयात असफल", "err", 4000);
    });
  }

  /* ----------------------------------------------------------------- courts */
  function screenCourts() {
    openPanel("न्यायालय सेटिंग", function (b) {
      var c = Object.assign({}, current.court);
      var sel = U.el("select", { class: "input" });
      D.COURTS.forEach(function (x) {
        var o = U.el("option", { value: x.id, text: x.hi + " (" + x.en + ")" });
        if (c.type === x.id) o.selected = true;
        sel.appendChild(o);
      });
      function field(label, key, ph) {
        var inp = U.el("input", { class: "input", value: c[key] || "", placeholder: ph || "" });
        inp.addEventListener("input", function () { c[key] = inp.value; });
        return U.el("div", { class: "field" }, [U.el("label", { text: label }), inp]);
      }
      b.appendChild(U.el("div", { class: "field" }, [U.el("label", { text: "न्यायालय का प्रकार" }), sel]));
      b.appendChild(U.el("p", { class: "hint", text: "JM = न्यायिक मजिस्ट्रेट · ACJM = अपर मुख्य न्यायिक मजिस्ट्रेट · ADJ = अपर जिला एवं सत्र न्यायाधीश" }));
      b.appendChild(field("स्थान / जिला", "place", "जयपुर"));
      b.appendChild(field("न्यायालय का पूरा नाम (वैकल्पिक)", "name", "न्यायालय श्रीमान अपर मुख्य न्यायिक मजिस्ट्रेट संख्या-3, जयपुर"));
      b.appendChild(field("न्यायाधीश का नाम", "judge", "श्री ………………"));
      b.appendChild(field("प्रकरण संख्या", "caseNo", "123/2026"));
      b.appendChild(field("पक्षकार", "party", "राज्य राजस्थान बनाम …………"));
      b.appendChild(field("धाराएँ", "sections", "धारा 115(2) BNS"));
      b.appendChild(field("थाना", "ps", "थाना …………"));
      b.appendChild(field("लोक अभियोजक", "prosecutor", ""));
      var save = U.el("button", { class: "btn accent block", text: "सहेजें", style: { marginTop: "10px" } });
      save.addEventListener("click", function () {
        c.type = sel.value;
        current.court = c;
        autosave();
        U.toast("न्यायालय विवरण सहेजा गया", "ok");
        closePanel();
      });
      b.appendChild(save);
    });
  }

  /* ------------------------------------------------------------ page & style */
  function screenPage() {
    openPanel("पृष्ठ सेटअप", function (b) {
      var p = current.page;
      var sizeSel = U.el("select", { class: "input" });
      Object.keys(D.PAGE_SIZES).forEach(function (k) {
        var o = U.el("option", { value: k, text: D.PAGE_SIZES[k].label });
        if (p.size === k) o.selected = true;
        sizeSel.appendChild(o);
      });
      sizeSel.addEventListener("change", function () {
        p.size = sizeSel.value; E.setDoc(current); autosave();
      });
      b.appendChild(U.el("div", { class: "field" }, [U.el("label", { text: "पृष्ठ आकार" }), sizeSel]));

      var mg = U.el("div", { class: "grid2" });
      [["top", "ऊपर"], ["right", "दाएँ"], ["bottom", "नीचे"], ["left", "बाएँ"]].forEach(function (x) {
        var inp = U.el("input", { class: "input", type: "number", step: "1", value: p.margins[x[0]] });
        inp.addEventListener("change", function () {
          p.margins[x[0]] = parseFloat(inp.value) || 0;
          E.setDoc(current); autosave();
        });
        mg.appendChild(U.el("div", { class: "field" }, [U.el("label", { text: x[1] + " (मिमी)" }), inp]));
      });
      b.appendChild(U.el("h4", { text: "मार्जिन", style: { margin: "12px 0 6px" } }));
      b.appendChild(mg);

      var sw = U.el("div", { class: "setrow" }, [
        U.el("div", { class: "lbl" }, [U.el("strong", { text: "पृष्ठ क्रमांक" }), U.el("small", { text: "प्रत्येक पृष्ठ के नीचे" })]),
        toggle(p.numbers !== false, function (v) { p.numbers = v; E.setDoc(current); autosave(); })
      ]);
      b.appendChild(sw);
      b.appendChild(U.el("p", { class: "hint", text: "राजस्थान न्यायालयों में सामान्यतः A4, मार्जिन 25.4 मिमी (1 इंच) का उपयोग होता है।" }));
    });
  }

  function toggle(on, onChange) {
    var t = U.el("div", { class: "switch" + (on ? " on" : "") }, [U.el("i")]);
    t.addEventListener("click", function () {
      var v = !t.classList.contains("on");
      t.classList.toggle("on", v);
      onChange(v);
    });
    return t;
  }

  function screenDisplay() {
    openPanel("फ़ॉन्ट, आकार व थीम", function (b) {
      var st = current.style;
      var fonts = [["serif", "Noto Serif देवनागरी (न्यायालयीन)"], ["sans", "Noto Sans देवनागरी (स्पष्ट)"], ["tiro", "Tiro देवनागरी (पारंपरिक)"], ["mono", "मशीन (Mono)"]];
      var fsel = U.el("select", { class: "input" });
      fonts.forEach(function (f) {
        var o = U.el("option", { value: f[0], text: f[1] });
        if (st.font === f[0]) o.selected = true;
        fsel.appendChild(o);
      });
      fsel.addEventListener("change", function () { st.font = fsel.value; E.setDoc(current); autosave(); });
      b.appendChild(U.el("div", { class: "field" }, [U.el("label", { text: "हिन्दी फ़ॉन्ट" }), fsel]));

      var size = U.el("input", { class: "input", type: "range", min: "9", max: "24", step: "0.5", value: st.size });
      var sizeVal = U.el("span", { text: st.size + " pt", style: { fontSize: "12px", color: "var(--ink-soft)" } });
      size.addEventListener("input", function () { sizeVal.textContent = size.value + " pt"; });
      size.addEventListener("change", function () { st.size = parseFloat(size.value); E.setDoc(current); autosave(); });
      b.appendChild(U.el("div", { class: "field" }, [U.el("label", { text: "अक्षर आकार" }), size, sizeVal]));

      var lh = U.el("input", { class: "input", type: "range", min: "1.2", max: "2.4", step: "0.05", value: st.lh });
      var lhVal = U.el("span", { text: String(st.lh), style: { fontSize: "12px", color: "var(--ink-soft)" } });
      lh.addEventListener("input", function () { lhVal.textContent = lh.value; });
      lh.addEventListener("change", function () { st.lh = parseFloat(lh.value); E.lineHeight(st.lh); autosave(); });
      b.appendChild(U.el("div", { class: "field" }, [U.el("label", { text: "पंक्ति अंतर" }), lh, lhVal]));

      b.appendChild(U.el("h4", { text: "थीम", style: { margin: "14px 0 4px" } }));
      var themes = [["auto", "स्वतः (सिस्टम)"], ["light", "हल्का"], ["dark", "गहरा"]];
      var tsel = U.el("select", { class: "input" });
      themes.forEach(function (t) {
        var o = U.el("option", { value: t[0], text: t[1] });
        if (S.theme === t[0]) o.selected = true;
        tsel.appendChild(o);
      });
      tsel.addEventListener("change", function () {
        S.theme = tsel.value; ND.settings.set("theme", tsel.value);
        document.documentElement.setAttribute("data-theme", tsel.value === "auto" ? "" : tsel.value);
      });
      b.appendChild(U.el("div", { class: "field" }, [U.el("label", { text: "रंग योजना" }), tsel]));

      b.appendChild(U.el("div", { class: "setrow" }, [
        U.el("div", { class: "lbl" }, [U.el("strong", { text: "स्वतः वर्तनी जाँच" }), U.el("small", { text: "गलत शब्दों के नीचे लाल रेखा" })]),
        toggle(!!S.autoSpell, function (v) { ND.settings.set("autoSpell", v); })
      ]));
      b.appendChild(U.el("div", { class: "setrow" }, [
        U.el("div", { class: "lbl" }, [U.el("strong", { text: "स्वतः सहेजें" }), U.el("small", { text: "प्रत्येक परिवर्तन पर" })]),
        toggle(!!S.autosave, function (v) { ND.settings.set("autosave", v); })
      ]));
      b.appendChild(U.el("div", { class: "setrow" }, [
        U.el("div", { class: "lbl" }, [U.el("strong", { text: "पृष्ठ क्रमांक" }), U.el("small", { text: "पाद लेख" })]),
        toggle(current.page.numbers !== false, function (v) { current.page.numbers = v; E.setDoc(current); autosave(); })
      ]));
    });
  }

  /* ---------------------------------------------------------------- dictionary */
  var dictTab = "hi";

  function screenDict(initial) {
    openPanel("हिन्दी–अंग्रेज़ी शब्दकोश", function (b) {
      var tabs = U.el("div", { class: "tabs" });
      var t1 = U.el("button", { text: "हिन्दी → अंग्रेज़ी", class: dictTab === "hi" ? "on" : "" });
      var t2 = U.el("button", { text: "English → हिन्दी", class: dictTab === "en" ? "on" : "" });
      tabs.appendChild(t1); tabs.appendChild(t2);

      var search = U.el("input", { class: "input", placeholder: "शब्द लिखें…", value: initial || "" });
      var results = U.el("div", { style: { marginTop: "10px" } });
      b.appendChild(tabs);
      b.appendChild(U.el("div", { class: "dict-search" }, [search]));

      t1.addEventListener("click", function () { dictTab = "hi"; t1.classList.add("on"); t2.classList.remove("on"); run(); });
      t2.addEventListener("click", function () { dictTab = "en"; t2.classList.add("on"); t1.classList.remove("on"); run(); });

      var loadNote = U.el("p", { class: "hint", text: ND.dict.ready ? "" : "शब्दकोश लोड हो रहा है…" });
      b.appendChild(loadNote);
      b.appendChild(results);

      function run() {
        var q = search.value.trim();
        results.innerHTML = "";
        if (!q) {
          results.appendChild(U.el("p", { class: "hint", text: dictTab === "hi"
            ? "हिन्दी शब्द लिखें — अर्थ, पर्यायवाची एवं विधिक अंग्रेज़ी शब्द मिलेंगे।"
            : "अंग्रेज़ी शब्द लिखें — हिन्दी विधिक शब्द मिलेंगे।" }));
          return;
        }
        if (!ND.dict.ready) { ND.dict.load().then(run); return; }
        if (dictTab === "hi") {
          ND.dict.loadGloss().then(function () {
            var entry = ND.dict.lookupHindi(q);
            var head = U.el("div", { class: "dict-entry" });
            var hh = U.el("div", { class: "head" }, [U.el("span", { class: "hw", text: q })]);
            if (entry.legal) hh.appendChild(U.el("span", { class: "en", text: entry.legal.e }));
            head.appendChild(hh);
            if (entry.legal && entry.legal.g) head.appendChild(U.el("div", { class: "gloss", text: entry.legal.g }));
            entry.gloss.forEach(function (g) {
              head.appendChild(U.el("div", { class: "gloss", text: g.text }));
              head.appendChild(U.el("div", { class: "meta", text: "स्रोत: " + g.src }));
            });
            if (!entry.legal && !entry.gloss.length) {
              head.appendChild(U.el("div", { class: "gloss", text: "इस शब्द की प्रविष्टि नहीं मिली। नीचे मिलते-जुलते शब्द देखें।" }));
            }
            results.appendChild(head);

            var sugs = ND.dict.suggest(q, 10);
            if (sugs.length) {
              var box = U.el("div", { style: { marginTop: "8px" } }, [U.el("div", { class: "hint", text: "मिलते-जुलते शब्द:" })]);
              sugs.forEach(function (w) {
                var chip = U.el("button", { class: "dict-chip", text: w });
                chip.addEventListener("click", function () { search.value = w; run(); });
                box.appendChild(chip);
              });
              results.appendChild(box);
            }
            var list = ND.dict.search(q, 20);
            if (list.length) {
              results.appendChild(U.el("h4", { text: "अन्य प्रविष्टियाँ", style: { margin: "14px 0 4px", fontSize: "13px" } }));
              list.forEach(function (r) {
                var row = U.el("div", { class: "dict-entry" });
                var h = U.el("div", { class: "head" }, [U.el("span", { class: "hw", text: r.h || "—" })]);
                if (r.e) h.appendChild(U.el("span", { class: "en", text: r.e }));
                row.appendChild(h);
                if (r.g) row.appendChild(U.el("div", { class: "gloss", text: r.g }));
                row.addEventListener("click", function () { search.value = r.h || r.e; run(); });
                results.appendChild(row);
              });
            }
            var insert = U.el("button", { class: "btn sm", text: "दस्तावेज़ में जोड़ें", style: { marginTop: "10px" } });
            insert.addEventListener("click", function () {
              E.insertTextAtCursor(q);
              U.toast("जोड़ा गया", "ok");
            });
            results.appendChild(insert);
          });
        } else {
          var e = ND.dict.lookupEnglish(q);
          if (!e.entries.length) {
            results.appendChild(U.el("p", { class: "hint", text: "यह अंग्रेज़ी शब्द विधिक शब्दावली में नहीं मिला। नीचे सुझाव देखें।" }));
            var sug2 = ND.dict.suggest(q, 12);
            var box2 = U.el("div", { style: { marginTop: "6px" } });
            sug2.forEach(function (w) {
              var chip = U.el("button", { class: "dict-chip", text: w });
              chip.addEventListener("click", function () { search.value = w; run(); });
              box2.appendChild(chip);
            });
            results.appendChild(box2);
          }
          e.entries.forEach(function (row) {
            var d = U.el("div", { class: "dict-entry" });
            d.appendChild(U.el("div", { class: "head" }, [
              U.el("span", { class: "hw", text: row.h }),
              U.el("span", { class: "en", text: row.e })
            ]));
            if (row.g) d.appendChild(U.el("div", { class: "gloss", text: row.g }));
            results.appendChild(d);
          });
        }
      }
      search.addEventListener("input", U.debounce(run, 220));
      search.addEventListener("keydown", function (ev) { if (ev.key === "Enter") run(); });
      if (!ND.dict.ready) ND.dict.load().then(run);
      else run();
    });
  }

  /* ------------------------------------------------------------------- spell */
  function screenSpell() {
    openPanel("वर्तनी जाँचक", function (b) {
      var out = U.el("div");
      b.appendChild(U.el("p", { class: "hint", text: "पूरे दस्तावेज़ की हिन्दी एवं अंग्रेज़ी वर्तनी की जाँच करें। शब्दकोश पूर्णतः ऑफ़लाइन है।" }));
      var run = U.el("button", { class: "btn accent block", text: "जाँच शुरू करें", style: { margin: "10px 0" } });
      b.appendChild(run);
      b.appendChild(out);

      run.addEventListener("click", function () {
        out.innerHTML = "";
        U.toast("जाँच हो रही है…", "", 1200);
        ND.dict.load().then(function () {
          var found = [];
          current.blocks.forEach(function (blk) {
            var text = U.stripTags(blk.html);
            ND.dict.checkText(text).forEach(function (i) { found.push({ blk: blk, it: i }); });
          });
          if (!found.length) {
            out.appendChild(U.el("div", { class: "empty-state", text: "कोई वर्तनी त्रुटि नहीं मिली ✓" }));
            return;
          }
          out.appendChild(U.el("p", { class: "hint", text: found.length + " संभावित त्रुटियाँ मिलीं" }));
          var list = U.el("div");
          found.slice(0, 120).forEach(function (f) {
            var item = U.el("div", { class: "spell-item" });
            var bad = U.el("div", { class: "bad", text: f.it.word });
            var right = U.el("div", { class: "grow" });
            var sugs = U.el("div", { class: "sugs" });
            var sugg = ND.dict.suggest(f.it.word, 5);
            if (!sugg.length) sugs.appendChild(U.el("span", { class: "hint", text: "कोई सुझाव नहीं" }));
            sugg.forEach(function (s) {
              var chip = U.el("button", { class: "sug", text: s });
              chip.addEventListener("click", function () {
                E.replaceInBlock(f.blk.id, f.it.index, f.it.length, s);
                chip.classList.add("on");
                chip.style.background = "var(--accent)";
                chip.style.color = "#fff";
              });
              sugs.appendChild(chip);
            });
            var addBtn = U.el("button", { class: "sug", text: "＋ शब्दकोश" });
            addBtn.addEventListener("click", function () {
              ND.dict.addUserWord(f.it.word);
              U.toast("शब्दकोश में जोड़ा: " + f.it.word, "ok");
            });
            var goBtn = U.el("button", { class: "sug", text: "जाएँ" });
            goBtn.addEventListener("click", function () { E.gotoBlock(f.blk.id); });
            var tools = U.el("div", { class: "sugs", style: { marginTop: "4px" } }, [addBtn, goBtn]);
            right.appendChild(sugs);
            right.appendChild(tools);
            item.appendChild(bad);
            item.appendChild(right);
            list.appendChild(item);
          });
          out.appendChild(list);
        });
      });
    });
  }

  /* --------------------------------------------------------------- converter */
  var convState = { from: "krutidev", to: "unicode", dir: "u2d" };

  function screenConvert(seedText) {
    openPanel("कृतिदेव / लीगेसी कन्वर्टर", function (b) {
      var fontSel = U.el("select", { class: "input" });
      [["krutidev", "कृतिदेव 010/016"], ["devlys", "देवलीस 010"], ["chanakya", "चाणक्य"], ["remington", "रेमिंग्टन / कुंडली / आगरा"]]
        .forEach(function (f) { fontSel.appendChild(U.el("option", { value: f[0], text: f[1] })); });

      var inp = U.el("textarea", { class: "area", placeholder: "यहाँ पुराने फ़ॉन्ट का पाठ चिपकाएँ (जैसे U;k;ky;)" });
      var out = U.el("textarea", { class: "area", placeholder: "यूनिकोड परिणाम यहाँ दिखेगा", readonly: true });
      if (seedText) inp.value = seedText;

      var dirRow = U.el("div", { class: "rowline", style: { marginBottom: "8px" } });
      var b1 = U.el("button", { class: "btn sm primary", text: "कृतिदेव → यूनिकोड" });
      var b2 = U.el("button", { class: "btn sm", text: "यूनिकोड → कृतिदेव" });
      dirRow.appendChild(b1); dirRow.appendChild(b2);

      function doConvert() {
        var v = inp.value;
        if (!v) { out.value = ""; return; }
        out.value = convState.dir === "u2d"
          ? T.convertLegacy(v, fontSel.value)
          : T.unicodeToKruti(v);
      }
      b1.addEventListener("click", function () { convState.dir = "u2d"; b1.classList.add("primary"); b2.classList.remove("primary"); doConvert(); });
      b2.addEventListener("click", function () { convState.dir = "d2u"; b2.classList.add("primary"); b1.classList.remove("primary"); doConvert(); });

      inp.addEventListener("input", U.debounce(doConvert, 200));
      fontSel.addEventListener("change", doConvert);

      var wrap = U.el("div", { class: "conv-wrap" });
      wrap.appendChild(inp);
      wrap.appendChild(out);
      b.appendChild(dirRow);
      b.appendChild(U.el("div", { class: "field" }, [U.el("label", { text: "स्रोत फ़ॉन्ट" }), fontSel]));
      b.appendChild(wrap);

      var actions = U.el("div", { class: "rowline", style: { marginTop: "10px" } });
      var copyBtn = U.el("button", { class: "btn sm", text: "प्रतिलिपि" });
      copyBtn.addEventListener("click", function () {
        out.select();
        document.execCommand("copy");
        U.toast("कॉपी हो गया", "ok");
      });
      var insBtn = U.el("button", { class: "btn sm accent", text: "दस्तावेज़ में जोड़ें" });
      insBtn.addEventListener("click", function () {
        E.insertTextAtCursor(out.value || inp.value);
        U.toast("दस्तावेज़ में जोड़ा गया", "ok");
      });
      var pasteBtn = U.el("button", { class: "btn sm", text: "क्लिपबोर्ड से" });
      pasteBtn.addEventListener("click", function () {
        if (navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then(function (t) { inp.value = t; doConvert(); });
        } else U.toast("क्लिपबोर्ड उपलब्ध नहीं — Ctrl+V से चिपकाएँ", "warn");
      });
      actions.appendChild(copyBtn); actions.appendChild(insBtn); actions.appendChild(pasteBtn);
      b.appendChild(actions);
      b.appendChild(U.el("p", { class: "hint", style: { marginTop: "10px" },
        text: "चाणक्य/रेमिंग्टन रूपांतरण प्रायोगिक हैं — परिणाम जाँचकर ही प्रयोग करें। कृतिदेव 010/016 पूर्णतः समर्थित है।" }));
      doConvert();
    });
  }

  /* ----------------------------------------------------------- transliteration */
  function screenTranslit() {
    openPanel("लिप्यंतरण — रोमन से हिन्दी टाइपिंग", function (b) {
      var inp = U.el("textarea", { class: "area", placeholder: "yahan roman mein likhen… (jaise: nyayalaya mein aapaka swagat hai)" });
      var out = U.el("textarea", { class: "area", readonly: true, placeholder: "हिन्दी परिणाम" });
      function go() { out.value = T.romanToDevanagari(inp.value); }
      inp.addEventListener("input", U.debounce(go, 120));
      var back = U.el("button", { class: "btn sm", text: "हिन्दी → रोमन" });
      back.addEventListener("click", function () {
        var tmp = inp.value; inp.value = out.value; out.value = T.devanagariToRoman(tmp);
      });
      var ins = U.el("button", { class: "btn sm accent", text: "दस्तावेज़ में जोड़ें" });
      ins.addEventListener("click", function () { E.insertTextAtCursor(out.value); U.toast("जोड़ा गया", "ok"); });
      b.appendChild(inp);
      b.appendChild(U.el("div", { class: "rowline", style: { margin: "8px 0" } }, [back, ins]));
      b.appendChild(out);
      b.appendChild(U.el("p", { class: "hint", style: { marginTop: "8px" },
        text: "नियम: aa = आ · ii = ई · uu = ऊ · M = ं · ~ = ँ · \\ = हलंत। उदाहरण: ‘raajasthaan’ → राजस्थान।" }));
      go();
    });
  }

  /* --------------------------------------------------------------- matra fixer */
  function screenTypo() {
    openPanel("मात्रा-सुधारक", function (b) {
      var inp = U.el("textarea", { class: "area", placeholder: "जहाँ मात्राएँ उलटी हों या रूपांतरण में गड़बड़ी हो, वह पाठ यहाँ चिपकाएँ" });
      var out = U.el("textarea", { class: "area", readonly: true });
      var info = U.el("p", { class: "hint" });
      function go() {
        var fixed = T.fixTypos(inp.value);
        out.value = fixed;
        info.textContent = inp.value ? (T.diffCount(inp.value, fixed) + " स्थानों पर सुधार") : "";
      }
      inp.addEventListener("input", U.debounce(go, 200));
      var ins = U.el("button", { class: "btn sm accent", text: "दस्तावेज़ में जोड़ें" });
      ins.addEventListener("click", function () { E.insertTextAtCursor(out.value); U.toast("जोड़ा गया", "ok"); });
      var fixDoc = U.el("button", { class: "btn sm", text: "पूरे दस्तावेज़ पर लगाएँ" });
      fixDoc.addEventListener("click", function () {
        E.pushUndo();
        current.blocks.forEach(function (blk) {
          if (blk.type === "pagebreak") return;
          var plain = U.stripTags(blk.html);
          var fixed = T.fixTypos(plain);
          if (fixed !== plain) blk.html = U.escapeHtml(fixed);
        });
        E.setDoc(current);
        autosave();
        U.toast("मात्रा सुधार लागू किया गया", "ok");
      });
      b.appendChild(inp);
      b.appendChild(U.el("div", { class: "rowline", style: { margin: "8px 0" } }, [ins, fixDoc]));
      b.appendChild(out);
      b.appendChild(info);
      go();
    });
  }

  /* -------------------------------------------------------------------- voice */
  var recognition = null, voiceTarget = "append", listening = false;

  function startVoice(lang, onText, onEnd) {
    if (ND.native.has()) {
      global.NDVoiceResult = function (text, isFinal) {
        if (text) onText(text, isFinal);
        if (isFinal === false) return;
      };
      global.NDVoiceEnd = function () { listening = false; onEnd && onEnd(); };
      var ok = ND.native.call("startVoice", lang || "hi-IN");
      listening = !!ok || true;
      return true;
    }
    var SR = global.SpeechRecognition || global.webkitSpeechRecognition;
    if (!SR) return false;
    try {
      recognition = new SR();
      recognition.lang = lang || "hi-IN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = function (e) {
        var finalText = "", interim = "";
        for (var i = e.resultIndex; i < e.results.length; i++) {
          var r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else interim += r[0].transcript;
        }
        if (finalText) onText(finalText, true);
        if (interim) onText(interim, false);
      };
      recognition.onend = function () { listening = false; onEnd && onEnd(); };
      recognition.onerror = function (e) {
        listening = false;
        U.toast("वॉइस त्रुटि: " + (e.error || ""), "err");
        onEnd && onEnd();
      };
      recognition.start();
      listening = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  function stopVoice() {
    if (recognition) { try { recognition.stop(); } catch (e) {} }
    if (ND.native.has()) ND.native.call("stopVoice");
    listening = false;
  }

  function screenVoice() {
    openPanel("बोलकर लिखें (Speech to Text)", function (b) {
      var langSel = U.el("select", { class: "input" }, [
        U.el("option", { value: "hi-IN", text: "हिन्दी (भारत)" }),
        U.el("option", { value: "en-IN", text: "English (India)" }),
        U.el("option", { value: "en-US", text: "English (US)" })
      ]);
      var status = U.el("p", { class: "hint", text: "तैयार" });
      var dot = U.el("span", { id: "voiceDot" });
      var box = U.el("div", {
        class: "area", contenteditable: "true",
        style: { minHeight: "140px", background: "var(--surface)", padding: "10px", borderRadius: "10px", border: "1px solid var(--line)" },
        "data-ph": "बोलना शुरू करें…"
      });
      var live = U.el("div", { class: "hint", style: { minHeight: "18px", color: "var(--accent)" } });

      var start = U.el("button", { class: "btn accent block", text: "🎙 बोलना शुरू करें" });
      var insert = U.el("button", { class: "btn block", text: "दस्तावेज़ में जोड़ें" });

      start.addEventListener("click", function () {
        if (listening) { stopVoice(); start.textContent = "🎙 बोलना शुरू करें"; dot.classList.remove("live"); status.textContent = "रुका हुआ"; return; }
        var ok = startVoice(langSel.value, function (text, isFinal) {
          if (isFinal) {
            box.textContent = (box.textContent + " " + text).trim();
            live.textContent = "";
          } else live.textContent = text;
          status.textContent = "सुन रहा है…";
          dot.classList.add("live");
        }, function () {
          start.textContent = "🎙 बोलना शुरू करें";
          dot.classList.remove("live");
          status.textContent = "रुका हुआ";
        });
        if (!ok) {
          U.toast("इस डिवाइस में वॉइस पहचान उपलब्ध नहीं है। Google ऐप / स्पीच सेवा जाँचें।", "err", 4000);
          return;
        }
        start.textContent = "⏹ रोकें";
        dot.classList.add("live");
        status.textContent = "सुन रहा है…";
      });
      insert.addEventListener("click", function () {
        if (!box.textContent.trim()) { U.toast("कुछ बोलें पहले", "warn"); return; }
        E.insertTextAtCursor(box.textContent.trim());
        U.toast("दस्तावेज़ में जोड़ा गया", "ok");
      });

      b.appendChild(langSel);
      b.appendChild(U.el("div", { class: "rowline", style: { margin: "8px 0" } }, [dot, status]));
      b.appendChild(box);
      b.appendChild(live);
      b.appendChild(U.el("div", { class: "rowline", style: { marginTop: "10px" } }, [start]));
      b.appendChild(insert);
      b.appendChild(U.el("p", { class: "hint", style: { marginTop: "10px" },
        text: "सुझाव: शांत कमरे में, स्पष्ट उच्चारण करें। हिन्दी में ‘धारा’, ‘न्यायालय’ जैसे शब्द बोलें।" }));
    });
  }

  /* -------------------------------------------------------------- legal tools */
  function screenLegal() {
    openPanel("विधिक सहायक", function (b) {
      var tabs = U.el("div", { class: "tabs" });
      var body = U.el("div");
      var views = ["BNS ↔ IPC", "BNSS ↔ CrPC", "सीमा अवधि", "ब्याज कैलकुलेटर", "तिथि गणना", "चालान बनाएँ"];
      var cur = 0;
      views.forEach(function (v, i) {
        var t = U.el("button", { text: v, class: i === 0 ? "on" : "" });
        t.addEventListener("click", function () {
          cur = i;
          tabs.querySelectorAll("button").forEach(function (x) { x.classList.remove("on"); });
          t.classList.add("on");
          render();
        });
        tabs.appendChild(t);
      });

      function table(rows, head) {
        var wrap = U.el("div", { style: { overflowX: "auto" } });
        var tbl = U.el("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12.5px" } });
        var thead = U.el("tr");
        head.forEach(function (h) { thead.appendChild(U.el("th", { text: h, style: { textAlign: "left", padding: "6px", borderBottom: "2px solid var(--line)", whiteSpace: "nowrap" } })); });
        tbl.appendChild(thead);
        rows.forEach(function (r) {
          var tr = U.el("tr");
          r.forEach(function (c, i) {
            tr.appendChild(U.el("td", { text: c, style: { padding: "6px", borderBottom: "1px solid var(--line-soft)", verticalAlign: "top", fontWeight: i === 0 ? "600" : "400", whiteSpace: "nowrap" } }));
          });
          tbl.appendChild(tr);
        });
        wrap.appendChild(tbl);
        return wrap;
      }

      function render() {
        body.innerHTML = "";
        if (cur === 0) {
          body.appendChild(U.el("p", { class: "hint", text: "संकेतात्मक मिलान — आधिकारिक BNS पाठ से पुष्टि अवश्य करें।" }));
          body.appendChild(table(ND.BNS_IPC, ["BNS", "IPC", "विषय"]));
        } else if (cur === 1) {
          body.appendChild(U.el("p", { class: "hint", text: "संकेतात्मक मिलान — आधिकारिक BNSS पाठ से पुष्टि अवश्य करें।" }));
          body.appendChild(table(ND.BNSS_CRPC, ["BNSS", "CrPC", "विषय"]));
        } else if (cur === 2) {
          body.appendChild(U.el("p", { class: "hint", text: "सीमा अधिनियम, 1963 के सामान्य प्रावधान (संकेतात्मक)।" }));
          var d = U.el("div", { class: "field" }, [U.el("label", { text: "वाद कारण की तिथि" })]);
          var dateInp = U.el("input", { class: "input", type: "date" });
          d.appendChild(dateInp);
          body.appendChild(d);
          var calc = U.el("button", { class: "btn sm", text: "देय तिथि निकालें" });
          var res = U.el("div", { class: "hint", style: { marginTop: "8px" } });
          calc.addEventListener("click", function () {
            res.innerHTML = "";
            if (!dateInp.value) { U.toast("तिथि चुनें", "warn"); return; }
            ND.LIMITATION.forEach(function (l) {
              if (!l[2]) return;
              var dt = new Date(dateInp.value);
              dt.setDate(dt.getDate() + l[2]);
              var row = U.el("div", { style: { padding: "4px 0", borderBottom: "1px solid var(--line-soft)" } }, [
                U.el("strong", { text: l[0] + " — " }),
                U.el("span", { text: "अंतिम तिथि: " + dt.toLocaleDateString("hi-IN") })
              ]);
              res.appendChild(row);
            });
          });
          body.appendChild(calc);
          body.appendChild(res);
          body.appendChild(U.el("h3", { text: "सामान्य अवधियाँ", style: { fontSize: "13px", margin: "14px 0 6px" } }));
          body.appendChild(table(ND.LIMITATION.map(function (l) { return [l[0], l[1]]; }), ["प्रकरण", "अवधि"]));
        } else if (cur === 3) {
          var p = U.el("input", { class: "input", type: "number", placeholder: "मूलधन (रु.)" });
          var r = U.el("input", { class: "input", type: "number", placeholder: "वार्षिक दर (%)" });
          var y = U.el("input", { class: "input", type: "number", placeholder: "अवधि (वर्ष)" });
          var out = U.el("div", { class: "hint", style: { marginTop: "10px" } });
          var go = U.el("button", { class: "btn accent block", text: "गणना करें" });
          go.addEventListener("click", function () {
            var P = parseFloat(p.value) || 0, R = parseFloat(r.value) || 0, Y = parseFloat(y.value) || 0;
            var simple = P * R * Y / 100;
            var comp = P * (Math.pow(1 + R / 100, Y) - 1);
            out.innerHTML = "";
            out.appendChild(U.el("div", { text: "साधारण ब्याज: रु. " + simple.toFixed(2) + " · कुल: रु. " + (P + simple).toFixed(2) }));
            out.appendChild(U.el("div", { text: "चक्रवृद्धि ब्याज: रु. " + comp.toFixed(2) + " · कुल: रु. " + (P + comp).toFixed(2) }));
            var add = U.el("button", { class: "btn sm", text: "दस्तावेज़ में जोड़ें", style: { marginTop: "8px" } });
            add.addEventListener("click", function () {
              E.insertTextAtCursor("मूलधन रु. " + P + " पर " + R + "% वार्षिक दर से " + Y + " वर्ष का साधारण ब्याज रु. " + simple.toFixed(2) + " है।");
            });
            out.appendChild(add);
          });
          body.appendChild(U.el("div", { class: "field" }, [U.el("label", { text: "मूलधन (रु.)" }), p]));
          body.appendChild(U.el("div", { class: "field" }, [U.el("label", { text: "वार्षिक ब्याज दर (%)" }), r]));
          body.appendChild(U.el("div", { class: "field" }, [U.el("label", { text: "अवधि (वर्ष)" }), y]));
          body.appendChild(go);
          body.appendChild(out);
          body.appendChild(U.el("p", { class: "hint", text: "धारा 34 CPC के अंतर्गत ब्याज की गणना में न्यायालय की विवेकाधीन शक्ति होती है।" }));
        } else if (cur === 4) {
          var from = U.el("input", { class: "input", type: "date" });
          var days = U.el("input", { class: "input", type: "number", placeholder: "दिन जोड़ें/घटाएँ" });
          var out2 = U.el("div", { class: "hint", style: { marginTop: "10px" } });
          var go2 = U.el("button", { class: "btn accent block", text: "गणना करें" });
          go2.addEventListener("click", function () {
            if (!from.value) return;
            var d1 = new Date(from.value);
            var d2 = new Date(d1);
            d2.setDate(d2.getDate() + (parseInt(days.value, 10) || 0));
            out2.textContent = "परिणाम तिथि: " + d2.toLocaleDateString("hi-IN") + " (" + d2.toLocaleDateString("en-IN", { weekday: "long" }) + ")";
          });
          body.appendChild(U.el("div", { class: "field" }, [U.el("label", { text: "आरंभ तिथि" }), from]));
          body.appendChild(U.el("div", { class: "field" }, [U.el("label", { text: "दिन (ऋणात्मक भी)" }), days]));
          body.appendChild(go2);
          body.appendChild(out2);
        } else {
          var forms = [
            ["समन आदेश", "order-summon"], ["वारंट", "order-summon"], ["जमानत आवेदन", "bail"],
            ["नकल आवेदन", "copy-app"], ["स्थगन पत्र", "adjourn"]
          ];
          forms.forEach(function (f) {
            var btn = U.el("button", { class: "btn block", text: f[0], style: { justifyContent: "flex-start", marginBottom: "6px" } });
            btn.addEventListener("click", function () {
              var tp = ND.templates.filter(function (x) { return x.id === f[1]; })[0];
              insertTemplate(tp);
            });
            body.appendChild(btn);
          });
          body.appendChild(U.el("p", { class: "hint", text: "अधिक प्रारूप ‘न्यायालयीन प्रारूप’ में उपलब्ध हैं।" }));
        }
      }
      b.appendChild(tabs);
      b.appendChild(body);
      render();
    });
  }

  /* ------------------------------------------------------------------- help */
  function screenHelp() {
    modal("सहायता एवं शॉर्टकट", function (b) {
      var rows = [
        ["Ctrl + B / I / U", "मोटा · तिरछा · रेखांकित"],
        ["Ctrl + S", "दस्तावेज़ सहेजें"],
        ["Ctrl + F", "खोजें"],
        ["Ctrl + P", "प्रिंट / PDF"],
        ["Ctrl + Z / Y", "पूर्ववत / पुनः"],
        ["Ctrl + D", "चुने शब्द का अर्थ"],
        ["Enter", "नया अनुच्छेद"],
        ["Tab", "इंडेंट (चार स्पेस)"],
        ["Backspace (खाली पंक्ति)", "अनुच्छेद मिलाएँ"]
      ];
      var l = U.el("div", { class: "list" });
      rows.forEach(function (r) {
        l.appendChild(U.el("div", { class: "item" }, [
          U.el("div", { class: "grow" }, [U.el("strong", { text: r[1] }), U.el("small", { text: r[0] })]),
          U.el("kbd", { text: r[0].split(" / ")[0] })
        ]));
      });
      b.appendChild(l);
      b.appendChild(U.el("h4", { text: "काम करने का तरीका", style: { margin: "14px 0 6px", fontSize: "13px" } }));
      b.appendChild(U.el("p", { class: "hint", text: "1) ‘न्यायालय सेटिंग’ में न्यायालय, न्यायाधीश, प्रकरण संख्या भरें। 2) ‘न्यायालयीन प्रारूप’ से आवश्यक प्रारूप चुनें। 3) पाठ बोलकर या टाइप करके पूरा करें। 4) ‘वर्तनी जाँचक’ चलाएँ। 5) .docx या PDF में निर्यात करें।" }));
      b.appendChild(U.el("p", { class: "hint", text: "फ़ाइलें डिवाइस के Documents/NyayaLekh फ़ोल्डर में सहेजी जाती हैं — WPS Office वहाँ से सीधे खोल सकता है।" }));
    }, [{ label: "समझ गया", cls: "accent" }]);
  }

  function screenAbout() {
    modal("परिचय एवं लाइसेंस", function (b) {
      b.appendChild(U.el("h3", { text: "न्यायलेख — NyayaLekh v1.0", style: { margin: "0 0 4px" } }));
      b.appendChild(U.el("p", { class: "hint", text: "राजस्थान के न्यायालयों में हिन्दी में विधिक प्रारूपण हेतु बनाया गया ऑफ़लाइन ऐप। सभी सुविधाएँ निःशुल्क एवं पूर्णतः ऑफ़लाइन हैं; कोई भी पाठ डिवाइस से बाहर नहीं जाता।" }));
      var stats = ND.dict.stats();
      b.appendChild(U.el("p", { class: "hint", text: "शब्दकोश: " + stats.hindi.toLocaleString("hi-IN") + " हिन्दी शब्द · " + stats.legal + " विधिक शब्द · " + stats.english.toLocaleString("hi-IN") + " अंग्रेज़ी शब्द" }));
      b.appendChild(U.el("h4", { text: "ओपन सोर्स एवं आभार", style: { margin: "12px 0 4px", fontSize: "13px" } }));
      b.appendChild(U.el("p", { class: "hint", text: "• Noto Serif / Noto Sans Devanagari, Tiro Devanagari Hindi — SIL Open Font License 1.1 (Google Fonts) · • CFILT Hindi WordNet, IIT Bombay — शब्दकोश डेटा · • JSZip (MIT) · • Kruti Dev mapping table — @bharattype/hindi-transliteration (MIT) · • English lexicon — an-array-of-english-words (MIT)" }));
      b.appendChild(U.el("p", { class: "hint", text: "यह ऐप किसी भी प्रकार की विधिक सलाह नहीं देता; प्रारूप केवल मसौदा तैयार करने में सहायक हैं — अंतिम पुष्टि संबंधित अधिनियम एवं न्यायालयीन नियमों से करें।" }));
    }, [{ label: "बंद करें", cls: "accent" }]);
  }

  /* ==========================================================================
   * drawer, find, zoom
   * ======================================================================== */
  function openDrawer() {
    document.getElementById("drawer").hidden = false;
    document.getElementById("scrim").hidden = false;
  }
  function closeDrawer() {
    document.getElementById("drawer").hidden = true;
    document.getElementById("scrim").hidden = true;
  }

  var findState = { hits: [], idx: -1 };
  function openFind() {
    var f = document.getElementById("findbar");
    f.hidden = false;
    document.getElementById("findInput").focus();
  }
  function closeFind() {
    document.getElementById("findbar").hidden = true;
    findState = { hits: [], idx: -1 };
  }

  function fitZoom() {
    var canvas = document.getElementById("canvasWrap");
    var size = D.PAGE_SIZES[current.page.size] || D.PAGE_SIZES.A4;
    var pageW = size.w * 3.7795275591;   // mm → px
    var avail = canvas.clientWidth - 24;
    var z = Math.min(1.35, Math.max(0.25, avail / pageW));
    if (window.innerWidth > pageW + 100) z = Math.min(z, 1);
    setZoom(z);
  }

  function setZoom(z) {
    z = Math.max(0.25, Math.min(2.2, z));
    document.documentElement.style.setProperty("--zoom", z.toFixed(2));
    S.zoom = z;
    var el = document.getElementById("stZoom");
    if (el) el.textContent = Math.round(z * 100) + "%";
  }

  /* ==========================================================================
   * screen router
   * ======================================================================== */
  function openScreen(name, arg) {
    switch (name) {
      case "new":
        confirmBox("नया दस्तावेज़", "वर्तमान दस्तावेज़ सहेजा जा चुका है। नया खाली दस्तावेज़ खोलें?", function () {
          newDoc();
        }, "नया खोलें");
        break;
      case "templates": screenTemplates(); break;
      case "files": screenFiles(); break;
      case "import": screenImport(); break;
      case "export": screenExport(current); break;
      case "courts": screenCourts(); break;
      case "page": screenPage(); break;
      case "display": screenDisplay(); break;
      case "dict": screenDict(arg); break;
      case "spell": screenSpell(); break;
      case "convert": screenConvert(arg); break;
      case "translit": screenTranslit(); break;
      case "typo": screenTypo(); break;
      case "voice": screenVoice(); break;
      case "legal": screenLegal(); break;
      case "help": screenHelp(); break;
      case "about": screenAbout(); break;
      default: break;
    }
  }
  A.openScreen = openScreen;

  /* ==========================================================================
   * wiring
   * ======================================================================== */
  function wire() {
    document.getElementById("btnMenu").addEventListener("click", function () {
      var d = document.getElementById("drawer");
      if (d.hidden) openDrawer(); else closeDrawer();
    });
    document.getElementById("scrim").addEventListener("click", closeDrawer);
    document.getElementById("panelClose").addEventListener("click", closePanel);
    document.getElementById("modalClose").addEventListener("click", closeModal);
    document.getElementById("modal").addEventListener("click", function (e) {
      if (e.target.id === "modal") closeModal();
    });
    document.getElementById("btnExport").addEventListener("click", function () { screenExport(current); });

    document.querySelectorAll("[data-open]").forEach(function (b) {
      b.addEventListener("click", function () {
        openScreen(b.getAttribute("data-open"));
      });
    });

    // ribbon commands
    document.querySelectorAll("[data-cmd]").forEach(function (b) {
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function () {
        var cmd = b.getAttribute("data-cmd");
        E.exec(cmd);
      });
    });
    document.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-act");
        if (act === "indent") E.indent(1);
        else if (act === "outdent") E.indent(-1);
        else if (act === "clearFmt") E.clearFormat();
        else if (act === "lineHeight") {
          var v = prompt("पंक्ति अंतर (1.2 – 2.4)", String(current.style.lh));
          if (v) E.lineHeight(parseFloat(v) || 1.65);
        } else if (act === "para") {
          openScreen("page");
        }
      });
    });
    document.querySelectorAll("[data-insert]").forEach(function (b) {
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function () {
        var t = b.getAttribute("data-insert");
        if (t === "h1" || t === "h2") E.setBlockType(t);
        else if (t === "center") E.align("center");
        else if (t === "right") E.align("right");
        else if (t === "pagebreak") E.insertBlock("pagebreak");
      });
    });

    document.getElementById("selFont").addEventListener("change", function () {
      current.style.font = this.value;
      E.setDoc(current); autosave();
    });
    document.getElementById("selSize").addEventListener("change", function () {
      current.style.size = parseFloat(this.value);
      E.setDoc(current); autosave();
    });

    document.getElementById("docTitle").addEventListener("change", function () {
      current.title = this.value || "अनाम दस्तावेज़";
      autosave();
    });

    document.getElementById("btnUndo").addEventListener("click", E.undo);
    document.getElementById("btnRedo").addEventListener("click", E.redo);
    document.getElementById("btnSearch").addEventListener("click", openFind);

    document.getElementById("stLang").addEventListener("click", function () {
      ND.i18n.toggle();
      U.toast(ND.i18n.lang === "hi" ? "भाषा: हिन्दी" : "Language: English");
    });
    document.getElementById("stZoomIn").addEventListener("click", function () { setZoom((S.zoom || 1) + 0.1); });
    document.getElementById("stZoomOut").addEventListener("click", function () { setZoom((S.zoom || 1) - 0.1); });
    document.getElementById("stZoom").addEventListener("click", fitZoom);
    document.getElementById("btnKeyboard").addEventListener("click", function () {
      var el = document.querySelector(".blk");
      if (el) el.focus();
    });

    // find bar
    var findInput = document.getElementById("findInput");
    findInput.addEventListener("input", U.debounce(function () {
      findState.hits = E.find(findInput.value);
      findState.idx = -1;
      document.getElementById("findCount").textContent = findState.hits.length ? findState.hits.length + " मिले" : "0";
      if (findState.hits.length) { findState.idx = E.gotoHit(0); }
    }, 200));
    document.getElementById("findNext").addEventListener("click", function () { findState.idx = E.gotoHit(findState.idx + 1); });
    document.getElementById("findPrev").addEventListener("click", function () { findState.idx = E.gotoHit(findState.idx - 1); });
    document.getElementById("findClose").addEventListener("click", closeFind);
    findInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeFind();
      if (e.key === "Enter") { findState.idx = E.gotoHit(findState.idx + (e.shiftKey ? -1 : 1)); }
    });

    // selection tools
    document.querySelectorAll("#selTools button").forEach(function (b) {
      b.addEventListener("mousedown", function (e) { e.preventDefault(); });
      b.addEventListener("click", function () {
        if (b.hasAttribute("data-cmd")) { E.exec(b.getAttribute("data-cmd")); }
        else if (b.getAttribute("data-act") === "highlight") {
          E.exec("hiliteColor", "#fef08a");
        } else if (b.getAttribute("data-act") === "comment") {
          var sel = window.getSelection();
          var word = sel.toString().trim();
          if (word) openScreen("dict", word);
        }
      });
    });

    document.addEventListener("nd:docchange", function () {
      updateStats();
      setSaveState("saving");
      autosave();
    });
    document.addEventListener("nd:save", function () {
      if (current) {
        ND.store.put(JSON.parse(JSON.stringify(current))).then(function () {
          U.toast("सहेजा गया", "ok", 1200);
          setSaveState("saved");
        });
      }
    });
    document.addEventListener("nd:print", function () { doExport(current, "pdf"); });
    document.addEventListener("nd:find", openFind);
    document.addEventListener("nd:dict-selection", function () {
      var sel = window.getSelection().toString().trim();
      if (sel) openScreen("dict", sel);
      else openScreen("dict");
    });
    document.addEventListener("nd:settings", function (e) {
      if (!e.detail) return;
      if (e.detail.key === "theme" || e.detail.key === "*") {
        var th = S.theme;
        document.documentElement.setAttribute("data-theme", th === "auto" ? "" : th);
      }
    });

    window.addEventListener("resize", U.debounce(fitZoom, 300));
    window.addEventListener("orientationchange", function () {
      setTimeout(fitZoom, 350);
    });

    // native voice result hook (Android RecognizerIntent)
    global.NDVoiceResult = global.NDVoiceResult || function () {};
  }

  /* ==========================================================================
   * boot
   * ======================================================================== */
  function boot() {
    ND.i18n.init();
    ND.settings.load().then(function () {
      document.documentElement.setAttribute("data-theme", S.theme === "auto" ? "" : S.theme);
      wire();
      ND.store.all().then(function (docs) {
        var doc;
        if (docs && docs.length) doc = docs[0];
        else doc = D.newDoc();
        loadDoc(doc);
        if (!docs || !docs.length) ND.store.put(doc);
        hideSplash();
        setTimeout(function () {
          ND.dict.load().then(function () {
            E.decorateSpelling();
            var msg = document.getElementById("splashMsg");
            if (msg) msg.textContent = "तैयार";
          });
        }, 400);
      }).catch(function () {
        loadDoc(D.newDoc());
        hideSplash();
      });
    });
    // safety: never leave the splash up
    setTimeout(hideSplash, 6000);
  }

  function hideSplash() {
    var s = document.getElementById("splash");
    if (!s || s.classList.contains("gone")) return;
    s.classList.add("gone");
    setTimeout(function () { s.remove(); }, 400);
  }

  A.boot = boot;
  document.addEventListener("DOMContentLoaded", boot);
})(window);
