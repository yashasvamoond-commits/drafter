/* =============================================================================
 * NyayaLekh — the writing surface: paged layout, rich-text editing, undo,
 * find, spell decoration and selection tools.
 * ========================================================================== */
(function (global) {
  "use strict";
  var ND = (global.ND = global.ND || {});
  var U = ND.util, D = ND.doc, T = ND.text;

  var E = (ND.editor = {});
  var state = {
    doc: null,
    caret: null,
    undo: [],
    redo: [],
    lastSnapshot: "",
    decorating: false,
    findHits: [],
    findIndex: -1,
    suppressPaginate: false
  };
  E.state = state;

  var pagesEl, canvasEl;

  function mm(v) { return v * 3.7795275591; }  // mm → CSS px (96 dpi)

  /* ------------------------------------------------------------- page frame */
  function applyPageStyle() {
    var doc = state.doc;
    var size = D.PAGE_SIZES[doc.page.size] || D.PAGE_SIZES.A4;
    var root = document.documentElement;
    root.style.setProperty("--page-w", size.w + "mm");
    root.style.setProperty("--page-h", size.h + "mm");
    root.style.setProperty("--page-pad-top", doc.page.margins.top + "mm");
    root.style.setProperty("--page-pad-right", doc.page.margins.right + "mm");
    root.style.setProperty("--page-pad-bottom", doc.page.margins.bottom + "mm");
    root.style.setProperty("--page-pad-left", doc.page.margins.left + "mm");
    root.style.setProperty("--doc-size", (doc.style.size || 12) + "pt");
    root.style.setProperty("--doc-lh", String(doc.style.lh || 1.65));
    pagesEl.dataset.font = doc.style.font || "serif";
    var fam = doc.style.font === "sans" ? '"Noto Sans Dev", sans-serif'
      : doc.style.font === "tiro" ? '"Tiro Dev", serif'
      : doc.style.font === "mono" ? 'ui-monospace, monospace'
      : '"Noto Serif Dev", serif';
    pagesEl.style.fontFamily = fam;
  }

  /* --------------------------------------------------------------- rendering */
  function blockEl(b) {
    var el = document.createElement("div");
    el.className = "blk" + (b.align ? " align-" + b.align : "");
    el.dataset.id = b.id;
    el.dataset.type = b.type || "p";
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "false");
    el.innerHTML = b.html || "";
    if (b.type === "li") el.dataset.marker = b.marker || "•";
    if (b.indent) el.style.paddingLeft = (b.indent * 6) + "mm";
    if (b.type === "h1" || b.type === "h2") el.setAttribute("aria-label", b.type === "h1" ? "शीर्षक" : "उपशीर्षक");
    if (!U.stripTags(b.html || "").trim() && b.type !== "pagebreak") {
      el.classList.add("empty");
      el.dataset.ph = b.type === "h1" ? "शीर्षक लिखें…" : "यहाँ लिखें…";
    }
    return el;
  }

  function renderPages() {
    var doc = state.doc;
    applyPageStyle();
    pagesEl.innerHTML = "";

    // measuring page keeps identical typography
    var meas = document.createElement("div");
    meas.className = "page measure";
    meas.style.position = "absolute";
    meas.style.visibility = "hidden";
    meas.style.left = "-10000px";
    meas.style.top = "0";
    meas.style.height = "auto";
    meas.style.minHeight = "0";
    document.body.appendChild(meas);

    var nodes = doc.blocks.map(function (b) {
      var el = blockEl(b);
      meas.appendChild(el);
      return { el: el, h: 0, block: b };
    });
    // force layout, then measure
    nodes.forEach(function (n) {
      var cs = getComputedStyle(n.el);
      n.h = n.el.offsetHeight + parseFloat(cs.marginTop || 0) + parseFloat(cs.marginBottom || 0);
    });
    nodes.forEach(function (n) { if (n.el.parentNode) n.el.parentNode.removeChild(n.el); });
    document.body.removeChild(meas);

    var size = D.PAGE_SIZES[doc.page.size] || D.PAGE_SIZES.A4;
    var avail = mm(size.h) - mm(doc.page.margins.top) - mm(doc.page.margins.bottom) - mm(10);

    var pages = [[]], used = 0;
    nodes.forEach(function (n) {
      if (n.block.type === "pagebreak") {
        pages[pages.length - 1].push(n);
        pages.push([]);
        used = 0;
        return;
      }
      var h = Math.max(n.h, 18);
      if (used + h > avail && pages[pages.length - 1].length) {
        pages.push([]);
        used = 0;
      }
      pages[pages.length - 1].push(n);
      used += h;
    });
    if (pages.length > 1 && pages[pages.length - 1].length === 0) pages.pop();

    pages.forEach(function (list, i) {
      var pg = document.createElement("div");
      pg.className = "page";
      pg.dataset.page = String(i + 1);
      list.forEach(function (n) { pg.appendChild(n.el); });
      if (doc.page.numbers !== false) {
        var num = document.createElement("div");
        num.className = "page-number";
        num.textContent = (i + 1) + " / " + pages.length;
        pg.appendChild(num);
      }
      pagesEl.appendChild(pg);
    });

    updateStatusPages(pages.length);
    E.pageCount = pages.length;
  }

  function updateStatusPages(n) {
    var el = document.getElementById("stPage");
    if (el) el.textContent = "पृष्ठ " + (state.currentPage || 1) + "/" + n;
  }

  /* ----------------------------------------------------------- caret helpers */
  function caretOffset(el) {
    var sel = window.getSelection();
    if (!sel.rangeCount) return 0;
    var range = sel.getRangeAt(0).cloneRange();
    range.selectNodeContents(el);
    range.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
    return range.toString().length;
  }

  function setCaret(el, offset) {
    if (!el) return;
    var range = document.createRange();
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var node, count = 0, done = false;
    while ((node = walker.nextNode())) {
      var len = node.nodeValue.length;
      if (count + len >= offset) {
        range.setStart(node, Math.max(0, offset - count));
        range.collapse(true);
        done = true;
        break;
      }
      count += len;
    }
    if (!done) {
      range.selectNodeContents(el);
      range.collapse(false);
    }
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  E.saveCaret = function () {
    var el = document.activeElement;
    if (!el || !el.classList || !el.classList.contains("blk")) return null;
    return { id: el.dataset.id, offset: caretOffset(el) };
  };

  E.restoreCaret = function (c) {
    if (!c) return;
    var el = pagesEl.querySelector('.blk[data-id="' + c.id + '"]');
    if (!el) return;
    el.focus({ preventScroll: true });
    setCaret(el, c.offset);
  };

  /* ---------------------------------------------------------------- the model */
  E.setDoc = function (doc, opts) {
    state.doc = doc;
    state.undo = [];
    state.redo = [];
    state.lastSnapshot = JSON.stringify(doc.blocks);
    renderPages();
    if (!opts || opts.focus !== false) {
      var first = pagesEl.querySelector(".blk");
      if (first) { first.focus(); setCaret(first, 0); }
    }
    E.emitChange(true);
  };

  E.getDoc = function () { return state.doc; };

  E.syncBlock = function (el) {
    var id = el.dataset.id;
    var b = state.doc.blocks.filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    b.html = el.innerHTML;
    if (b.html === "<br>") b.html = "";
    if (U.stripTags(b.html).trim() === "") el.classList.add("empty");
    else el.classList.remove("empty");
    if (el.dataset.align) b.align = el.dataset.align;
  };

  E.syncAll = function () {
    U.$$(".blk", pagesEl).forEach(function (el) {
      if (el.isContentEditable) E.syncBlock(el);
    });
  };

  var emitTimer;
  E.emitChange = function (immediate) {
    clearTimeout(emitTimer);
    var fire = function () {
      state.doc.updatedAt = Date.now();
      document.dispatchEvent(new CustomEvent("nd:docchange", { detail: { doc: state.doc } }));
    };
    if (immediate) fire();
    else emitTimer = setTimeout(fire, 250);
  };

  /* ------------------------------------------------------------------- undo */
  function snapshot() {
    var s = JSON.stringify(state.doc.blocks);
    if (s === state.lastSnapshot) return;
    state.undo.push({ blocks: state.lastSnapshot, caret: E.saveCaret() });
    if (state.undo.length > 80) state.undo.shift();
    state.lastSnapshot = s;
    state.redo = [];
    refreshUndoButtons();
  }
  function refreshUndoButtons() {
    var u = document.getElementById("btnUndo"), r = document.getElementById("btnRedo");
    if (u) u.disabled = state.undo.length === 0;
    if (r) r.disabled = state.redo.length === 0;
  }
  E.pushUndo = function () {
    state.undo.push({ blocks: state.lastSnapshot, caret: E.saveCaret() });
    state.lastSnapshot = JSON.stringify(state.doc.blocks);
    refreshUndoButtons();
  };

  E.undo = function () {
    if (!state.undo.length) return;
    var prev = state.undo.pop();
    state.redo.push({ blocks: JSON.stringify(state.doc.blocks), caret: E.saveCaret() });
    state.doc.blocks = JSON.parse(prev.blocks);
    state.lastSnapshot = prev.blocks;
    renderPages();
    E.restoreCaret(prev.caret);
    E.emitChange(true);
    refreshUndoButtons();
  };

  E.redo = function () {
    if (!state.redo.length) return;
    var next = state.redo.pop();
    state.undo.push({ blocks: JSON.stringify(state.doc.blocks), caret: E.saveCaret() });
    state.doc.blocks = JSON.parse(next.blocks);
    state.lastSnapshot = next.blocks;
    renderPages();
    E.restoreCaret(next.caret);
    E.emitChange(true);
    refreshUndoButtons();
  };

  /* ------------------------------------------------------------- formatting */
  E.exec = function (cmd, val) {
    var el = document.activeElement;
    var inEditor = el && el.classList && el.classList.contains("blk");
    if (!inEditor) {
      // apply to selection if inside the editor
      var sel = window.getSelection();
      if (!sel.rangeCount || !pagesEl.contains(sel.anchorNode)) {
        U.toast("पहले पाठ चुनें", "warn");
        return;
      }
    }
    E.pushUndo();
    document.execCommand(cmd, false, val || null);
    if (el && el.classList) E.syncBlock(el);
    E.emitChange();
    updateToolbar();
  };

  E.setBlockType = function (type) {
    var el = document.activeElement;
    if (!el || !el.classList.contains("blk")) return;
    var b = state.doc.blocks.filter(function (x) { return x.id === el.dataset.id; })[0];
    if (!b) return;
    E.pushUndo();
    b.type = type;
    el.dataset.type = type;
    if (type === "h1" || type === "h2") {
      el.classList.remove("align-left", "align-right", "align-justify");
    }
    if (type === "li") el.dataset.marker = "•";
    renderPages();
    var again = pagesEl.querySelector('.blk[data-id="' + b.id + '"]');
    if (again) { again.focus(); setCaret(again, caretOffsetFromText(again)); }
    E.emitChange(true);
  };

  function caretOffsetFromText(el) { return el.textContent.length; }

  E.indent = function (dir) {
    var el = document.activeElement;
    if (!el || !el.classList.contains("blk")) return;
    var b = state.doc.blocks.filter(function (x) { return x.id === el.dataset.id; })[0];
    if (!b) return;
    E.pushUndo();
    b.indent = Math.max(0, Math.min(6, (b.indent || 0) + dir));
    el.style.paddingLeft = b.indent ? (b.indent * 6) + "mm" : "";
    E.emitChange();
  };

  E.align = function (mode) {
    var el = document.activeElement;
    if (!el || !el.classList.contains("blk")) return;
    var b = state.doc.blocks.filter(function (x) { return x.id === el.dataset.id; })[0];
    if (!b) return;
    E.pushUndo();
    b.align = b.align === mode ? "" : mode;
    el.className = "blk" + (b.align ? " align-" + b.align : "") + (U.stripTags(b.html).trim() ? "" : " empty");
    E.emitChange();
  };

  E.lineHeight = function (lh) {
    state.doc.style.lh = lh;
    applyPageStyle();
    renderPages();
    E.emitChange(true);
  };

  E.clearFormat = function () {
    var sel = window.getSelection();
    if (!sel.rangeCount) return;
    E.pushUndo();
    document.execCommand("removeFormat");
    var el = document.activeElement;
    if (el && el.classList.contains("blk")) E.syncBlock(el);
    E.emitChange();
  };

  /* ---------------------------------------------------------- block creation */
  E.insertBlock = function (type, html, afterId, align) {
    var b = D.newBlock(type || "p", html || "");
    if (align) b.align = align;
    var idx = state.doc.blocks.length - 1;
    if (afterId) {
      for (var i = 0; i < state.doc.blocks.length; i++) {
        if (state.doc.blocks[i].id === afterId) { idx = i; break; }
      }
    }
    state.doc.blocks.splice(idx + 1, 0, b);
    renderPages();
    var el = pagesEl.querySelector('.blk[data-id="' + b.id + '"]');
    if (el) { el.focus(); setCaret(el, caretOffsetFromText(el)); }
    E.emitChange();
    return b;
  };

  E.insertHtmlAtCursor = function (html) {
    var el = document.activeElement;
    if (!el || !el.classList || !el.classList.contains("blk")) {
      E.insertBlock("p", html);
      return;
    }
    E.pushUndo();
    document.execCommand("insertHTML", false, html);
    E.syncBlock(el);
    E.emitChange();
  };

  E.insertTextAtCursor = function (text) {
    E.insertHtmlAtCursor(U.escapeHtml(text).replace(/\n/g, "<br>"));
  };

  E.replaceInBlock = function (blockId, index, len, newText) {
    var b = state.doc.blocks.filter(function (x) { return x.id === blockId; })[0];
    if (!b) return;
    var plain = U.stripTags(b.html);
    var updated = plain.slice(0, index) + newText + plain.slice(index + len);
    b.html = U.escapeHtml(updated);
    var el = pagesEl.querySelector('.blk[data-id="' + blockId + '"]');
    if (el) { renderPages(); }
    E.emitChange();
  };

  /* --------------------------------------------------------- keyboard & input */
  function activeBlock() {
    var el = document.activeElement;
    return el && el.classList && el.classList.contains("blk") ? el : null;
  }

  function onKeyDown(e) {
    var el = activeBlock();
    var meta = e.ctrlKey || e.metaKey;

    if (meta && !e.altKey) {
      var k = e.key.toLowerCase();
      if (k === "b") { e.preventDefault(); E.exec("bold"); return; }
      if (k === "i") { e.preventDefault(); E.exec("italic"); return; }
      if (k === "u") { e.preventDefault(); E.exec("underline"); return; }
      if (k === "s") { e.preventDefault(); document.dispatchEvent(new CustomEvent("nd:save")); return; }
      if (k === "f") { e.preventDefault(); document.dispatchEvent(new CustomEvent("nd:find")); return; }
      if (k === "p") { e.preventDefault(); document.dispatchEvent(new CustomEvent("nd:print")); return; }
      if (k === "z" && !e.shiftKey) { e.preventDefault(); E.undo(); return; }
      if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); E.redo(); return; }
      if (k === "d") { e.preventDefault(); document.dispatchEvent(new CustomEvent("nd:dict-selection")); return; }
    }
    if (!el) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      E.syncBlock(el);
      var id = el.dataset.id;
      var b = state.doc.blocks.filter(function (x) { return x.id === id; })[0];
      var atEnd = caretOffset(el) >= (el.textContent || "").length;
      if (b && b.type === "h1" || b && b.type === "h2") {
        if (atEnd) { E.insertBlock("p", "", id); return; }
      }
      if (atEnd) { E.insertBlock("p", "", id); }
      else {
        // split the paragraph at the caret
        var sel = window.getSelection();
        var range = sel.getRangeAt(0);
        var after = document.createRange();
        after.setStart(range.endContainer, range.endOffset);
        after.setEndAfter(el.lastChild || el);
        var frag = after.extractContents();
        var tmp = document.createElement("div");
        tmp.appendChild(frag);
        E.syncBlock(el);
        E.insertBlock("p", tmp.innerHTML, id);
      }
      return;
    }

    if (e.key === "Backspace") {
      if ((el.textContent || "").length === 0 && state.doc.blocks.length > 1) {
        e.preventDefault();
        var idx = 0;
        for (var k = 0; k < state.doc.blocks.length; k++) {
          if (state.doc.blocks[k].id === el.dataset.id) { idx = k; break; }
        }
        if (idx > 0) {
          var prevB = state.doc.blocks[idx - 1];
          E.pushUndo();
          state.doc.blocks.splice(idx, 1);
          renderPages();
          var prevEl = pagesEl.querySelector('.blk[data-id="' + prevB.id + '"]');
          if (prevEl) { prevEl.focus(); setCaret(prevEl, (prevEl.textContent || "").length); }
          E.emitChange(true);
        }
        return;
      }
    }

    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertText", false, "\u00a0\u00a0\u00a0\u00a0");
      E.syncBlock(el);
      return;
    }
  }

  var decorateTimer;
  function onInput(e) {
    var el = activeBlock();
    if (!el) return;
    E.syncBlock(el);
    E.emitChange();
    updateToolbar();
    clearTimeout(decorateTimer);
    schedulePagination();
  }

  var paginateTimer;
  function schedulePagination() {
    clearTimeout(paginateTimer);
    paginateTimer = setTimeout(function () {
      var caret = E.saveCaret();
      E.syncAll();
      renderPages();
      E.restoreCaret(caret);
      decorateSpelling();
    }, 900);
  }

  /* ------------------------------------------------------------- spell marks */
  function decorateSpelling() {
    if (!ND.settings.autoSpell || !ND.dict.ready) return;
    // never decorate the block being edited: it breaks the caret
    var focused = activeBlock();
    U.$$(".blk", pagesEl).forEach(function (el) {
      if (el === focused) { stripMarks(el); return; }
      if (el.dataset.type === "pagebreak") return;
      stripMarks(el);
      var html = el.innerHTML;
      if (!html || html.indexOf("<") >= 0) return;   // skip richly formatted runs
      var text = el.textContent;
      var issues = ND.dict.checkText(text);
      if (!issues.length) return;
      var out = "", pos = 0;
      issues.forEach(function (it) {
        out += U.escapeHtml(text.slice(pos, it.index)) +
          '<span class="sp-err" data-w="' + U.escapeHtml(it.word) + '">' + U.escapeHtml(it.word) + "</span>";
        pos = it.index + it.length;
      });
      out += U.escapeHtml(text.slice(pos));
      el.innerHTML = out;
    });
  }
  E.decorateSpelling = U.debounce(decorateSpelling, 1200);

  function stripMarks(el) {
    if (!el.querySelector || !el.querySelector(".sp-err")) return;
    el.innerHTML = el.innerHTML.replace(/<span class="sp-err"[^>]*>(.*?)<\/span>/g, "$1");
  }

  /* -------------------------------------------------------------- find & goto */
  E.find = function (q) {
    state.findHits = [];
    if (!q) return [];
    var lower = q.toLowerCase();
    U.$$(".blk", pagesEl).forEach(function (el) {
      if (el.dataset.type === "pagebreak") return;
      var text = (el.textContent || "").toLowerCase();
      var i = text.indexOf(lower);
      while (i >= 0) {
        state.findHits.push({ id: el.dataset.id, index: i, len: q.length });
        i = text.indexOf(lower, i + q.length);
      }
    });
    return state.findHits;
  };

  E.gotoHit = function (n) {
    if (!state.findHits.length) return;
    state.findIndex = (n + state.findHits.length) % state.findHits.length;
    var hit = state.findHits[state.findIndex];
    var el = pagesEl.querySelector('.blk[data-id="' + hit.id + '"]');
    if (!el) return;
    var textNode = el.firstChild;
    if (!textNode) return;
    var range = document.createRange();
    try {
      range.setStart(textNode, hit.index);
      range.setEnd(textNode, Math.min(hit.index + hit.len, textNode.nodeValue.length));
    } catch (err) { return; }
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    return state.findIndex;
  };

  E.gotoBlock = function (id) {
    var el = pagesEl.querySelector('.blk[data-id="' + id + '"]');
    if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.focus({ preventScroll: true }); }
  };

  /* --------------------------------------------------------- selection tools */
  function onSelectionChange() {
    var sel = window.getSelection();
    var bar = document.getElementById("selTools");
    if (!sel.rangeCount || sel.isCollapsed || !pagesEl.contains(sel.anchorNode)) {
      bar.hidden = true;
      return;
    }
    var rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) { bar.hidden = true; return; }
    bar.hidden = false;
    var zoom = parseFloat(getComputedStyle(pagesEl).zoom) || 1;
    bar.style.left = Math.max(90, Math.min(window.innerWidth - 90, rect.left + rect.width / 2)) + "px";
    bar.style.top = Math.max(60, rect.top - 8) + "px";
  }

  function updateToolbar() {
    ["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList"].forEach(function (c) {
      var btn = document.querySelector('.rbtn[data-cmd="' + c + '"]');
      if (!btn) return;
      try { btn.classList.toggle("on", document.queryCommandState(c)); } catch (e) {}
    });
  }

  /* ------------------------------------------------------------- status info */
  function updateStats() {
    var doc = state.doc;
    var st = D.stats(doc);
    var w = document.getElementById("stWords");
    var c = document.getElementById("stChars");
    if (w) w.textContent = st.words.toLocaleString("hi-IN") + " शब्द";
    if (c) c.textContent = st.charsNoSpace.toLocaleString("hi-IN") + " अक्षर";
  }
  E.updateStats = updateStats;

  /* ------------------------------------------------------------ click handling */
  function onClick(e) {
    var page = e.target.closest ? e.target.closest(".page") : null;
    if (page) {
      state.currentPage = parseInt(page.dataset.page || "1", 10);
      updateStatusPages(E.pageCount || 1);
    }
    var mark = e.target.closest ? e.target.closest(".sp-err") : null;
    if (mark && !mark.isContentEditable) return;
    if (e.target.classList && e.target.classList.contains("page")) {
      // click on empty page area → focus last block of that page
      var blocks = e.target.querySelectorAll(".blk");
      if (blocks.length) {
        var last = blocks[blocks.length - 1];
        last.focus();
        setCaret(last, (last.textContent || "").length);
      }
    }
  }

  /* --------------------------------------------------------------- bootstrap */
  var inited = false;
  E.init = function (doc) {
    if (inited) { E.setDoc(doc); return; }
    inited = true;
    pagesEl = document.getElementById("pages");
    canvasEl = document.getElementById("canvas");
    state.doc = doc;
    applyPageStyle();
    renderPages();

    document.addEventListener("input", onInput);
    document.addEventListener("keydown", function (e) {
      if (pagesEl.contains(document.activeElement)) onKeyDown(e);
    });
    // global shortcuts even when focus is outside the paper
    document.addEventListener("keydown", function (e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      var k = e.key.toLowerCase();
      if (k === "s") { e.preventDefault(); document.dispatchEvent(new CustomEvent("nd:save")); }
      if (k === "f") { e.preventDefault(); document.dispatchEvent(new CustomEvent("nd:find")); }
      if (k === "p") { e.preventDefault(); document.dispatchEvent(new CustomEvent("nd:print")); }
    });
    document.addEventListener("selectionchange", U.throttle(onSelectionChange, 120));
    pagesEl.addEventListener("click", onClick);
    pagesEl.addEventListener("focusin", function (e) {
      if (e.target.classList && e.target.classList.contains("blk")) stripMarks(e.target);
      updateToolbar();
    });
    pagesEl.addEventListener("blur", function () { E.syncAll(); }, true);
    pagesEl.addEventListener("paste", onPaste);
    pagesEl.addEventListener("drop", function (e) { e.preventDefault(); });
    document.addEventListener("nd:settings", function (e) {
      if (!e.detail || e.detail.key === "*" || /^(autoSpell|pageNumbers|font|fontSize|lineHeight)$/.test(e.detail.key)) {
        applyPageStyle();
        if (e.detail.key === "autoSpell") { decorateSpelling(); }
      }
    });
    window.addEventListener("resize", U.debounce(function () {
      var caret = E.saveCaret();
      renderPages();
      E.restoreCaret(caret);
    }, 250));
    refreshUndoButtons();
  };

  /* ------------------------------------------------------------------- paste */
  function onPaste(e) {
    var cd = e.clipboardData || window.clipboardData;
    if (!cd) return;
    var html = cd.getData("text/html");
    var text = cd.getData("text/plain") || "";
    e.preventDefault();

    // WPS / Kruti Dev legacy text pasted in: convert silently when it is clearly legacy
    var looksLegacy = T.devRatio(text) < 0.15 && /[\[\]{}<>;~|\\]/.test(text) && text.length > 6;
    if (looksLegacy) {
      var converted = T.krutiToUnicode(text);
      if (T.devRatio(converted) > 0.4) {
        document.execCommand("insertHTML", false, U.nl2br(converted));
        var el = activeBlock(); if (el) E.syncBlock(el);
        E.emitChange();
        U.toast("कृतिदेव पाठ स्वतः यूनिकोड में बदला गया", "ok");
        return;
      }
    }
    if (html) {
      var clean = sanitize(html);
      document.execCommand("insertHTML", false, clean);
    } else {
      document.execCommand("insertText", false, text);
    }
    var el2 = activeBlock();
    if (el2) E.syncBlock(el2);
    E.emitChange();
  }

  function sanitize(html) {
    var d = document.createElement("div");
    d.innerHTML = html;
    U.$$("script,style,meta,link,iframe,object,embed,img,svg", d).forEach(function (n) { n.remove(); });
    var allowed = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, STRIKE: 1, SUP: 1, SUB: 1, BR: 1, SPAN: 1, MARK: 1, DIV: 1, P: 1, LI: 1, OL: 1, UL: 1 };
    U.$$("*", d).forEach(function (n) {
      if (!allowed[n.tagName]) {
        n.replaceWith.apply(n, Array.prototype.slice.call(n.childNodes).concat([document.createTextNode("")]));
        return;
      }
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        if (a.name !== "style" && a.name !== "class") n.removeAttribute(a.name);
      });
      if (n.getAttribute && n.getAttribute("class")) n.removeAttribute("class");
      if (n.style) {
        var keep = { fontWeight: n.style.fontWeight, fontStyle: n.style.fontStyle, textDecoration: n.style.textDecoration, color: n.style.color, backgroundColor: n.style.backgroundColor };
        n.removeAttribute("style");
        for (var k in keep) if (keep[k]) n.style[k] = keep[k];
      }
    });
    // div/p inside a block become line breaks
    return d.innerHTML.replace(/<\/?(div|p|li|ul|ol)[^>]*>/gi, "<br>").replace(/(<br>)+/g, "<br>").replace(/^<br>|<br>$/g, "");
  }
})(window);
