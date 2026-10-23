/* =============================================================================
 * NyayaLekh — writing surface: paged layout, rich text, headers/footers,
 * watermarks, line numbers, tables, TOC, undo and find/replace.
 * ========================================================================== */
(function (global) {
  "use strict";
  var ND = (global.ND = global.ND || {});
  var U = ND.util, D = ND.doc, T = ND.text;

  var E = (ND.editor = {});
  var S = {
    doc: null,
    pagesEl: null,
    canvasEl: null,
    undo: [],
    redo: [],
    lastSnapshot: "",
    pageCount: 1,
    currentPage: 1,
    blockPage: {},
    findHits: [],
    findIndex: -1,
    inited: false
  };
  E.state = S;
  E.pageCount = 1;

  /* --------------------------------------------------------------- geometry */
  function mm(v) { return v * 3.7795275591; }

  function pageDims() {
    var p = S.doc.page || {};
    var size = D.PAGE_SIZES[p.size] || D.PAGE_SIZES.A4;
    var landscape = p.orientation === "landscape";
    return {
      w: landscape ? size.h : size.w,
      h: landscape ? size.w : size.h,
      margins: p.margins || {}
    };
  }

  function applyPageStyle() {
    var doc = S.doc;
    var dims = pageDims();
    var root = document.documentElement;
    var p = doc.page || {};
    var st = doc.style || {};
    root.style.setProperty("--page-w", dims.w + "mm");
    root.style.setProperty("--page-h", dims.h + "mm");
    root.style.setProperty("--pad-top", (dims.margins.top || 25.4) + "mm");
    root.style.setProperty("--pad-right", (dims.margins.right || 25.4) + "mm");
    root.style.setProperty("--pad-bottom", (dims.margins.bottom || 25.4) + "mm");
    root.style.setProperty("--pad-left", (dims.margins.left || 25.4) + "mm");
    root.style.setProperty("--doc-size", (st.size || 12) + "pt");
    root.style.setProperty("--doc-lh", String(st.lh || 1.65));
    root.style.setProperty("--doc-para", (st.paraSpacing === undefined ? 6 : st.paraSpacing) + "pt");
    root.style.setProperty("--doc-cols", String(p.columns || 1));
    root.style.setProperty("--doc-first", (st.firstLine ? 12 : 0) + "mm");
    root.style.setProperty("--doc-font", ND.fonts.stack(st.devFont, st.latinFont));
    document.body.classList.toggle("no-ruler", ND.prefs.ruler === false);
    document.body.classList.toggle("focus-mode", !!ND.prefs.focus);
    document.body.classList.toggle("typewriter", !!ND.prefs.typewriter);
    document.body.classList.toggle("no-status", ND.prefs.statusBar === false);
  }

  /* --------------------------------------------------------------- rendering */
  function isTextBlock(b) {
    return ["p", "h1", "h2", "h3", "quote", "signature", "li", ""].indexOf(b.type || "p") >= 0;
  }

  function placeholderFor(b) {
    if (b.type === "h1") return ND.t("heading1") + "…";
    if (b.type === "h2") return ND.t("heading2") + "…";
    if (b.type === "h3") return ND.t("heading3") + "…";
    if (b.type === "quote") return ND.t("quote") + "…";
    if (b.type === "signature") return ND.t("signature") + "…";
    return "…";
  }

  function blockEl(b) {
    var el = document.createElement("div");
    el.className = "blk" + (b.align ? " align-" + b.align : "");
    el.dataset.id = b.id;
    el.dataset.type = b.type || "p";
    if (b.type === "pagebreak" || b.type === "hr") {
      el.setAttribute("contenteditable", "false");
      el.innerHTML = "";
      return el;
    }
    if (b.type === "image") {
      el.setAttribute("contenteditable", "false");
      el.innerHTML = b.html || "";
      return el;
    }
    if (b.type === "toc") {
      el.setAttribute("contenteditable", "false");
      el.innerHTML = b.html || "";
      return el;
    }
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "false");
    el.innerHTML = b.html || "";
    if (b.type === "li") el.dataset.marker = b.marker || "•";
    if (b.indent) el.style.paddingLeft = (b.indent * 6) + "mm";
    if (!U.stripTags(b.html || "").trim() && isTextBlock(b)) {
      el.classList.add("empty");
      el.dataset.ph = placeholderFor(b);
    }
    return el;
  }

  function pageShell(index, total) {
    var doc = S.doc;
    var p = doc.page || {};
    var pg = document.createElement("div");
    pg.className = "page" + (p.border ? " bordered" : "");
    pg.dataset.page = String(index + 1);

    if (p.watermark) {
      var wm = document.createElement("div");
      wm.className = "watermark";
      var span = document.createElement("span");
      span.textContent = p.watermark;
      span.style.opacity = String(p.watermarkOpacity === undefined ? 0.08 : p.watermarkOpacity);
      wm.appendChild(span);
      pg.appendChild(wm);
    }
    if (p.headerText) {
      var h = document.createElement("div");
      h.className = "page-header";
      h.textContent = p.headerText;
      pg.appendChild(h);
    }
    if (p.lineNumbers) {
      var ln = document.createElement("div");
      ln.className = "line-numbers";
      pg.appendChild(ln);
    }
    var body = document.createElement("div");
    body.className = "page-body" + ((p.columns || 1) > 1 ? " page-cols" : "");
    body.style.flex = "1 1 auto";
    pg.appendChild(body);

    if (p.footerText) {
      var f = document.createElement("div");
      f.className = "page-footer";
      f.textContent = p.footerText;
      pg.appendChild(f);
    }
    if (p.numbers !== false) {
      var num = document.createElement("div");
      num.className = "page-number";
      num.textContent = pageNumberText(index + 1, total, p.numberFormat || "n");
      pg.appendChild(num);
    }
    return pg;
  }

  function pageNumberText(n, total, fmt) {
    if (fmt === "n-of-total") return ND.t("pageOf", { n: n, total: total });
    if (fmt === "roman") return "— " + toRoman(n) + " —";
    return String(n);
  }

  function toRoman(num) {
    var map = [[1000, "m"], [900, "cm"], [500, "d"], [400, "cd"], [100, "c"], [90, "xc"], [50, "l"], [40, "xl"], [10, "x"], [9, "ix"], [5, "v"], [4, "iv"], [1, "i"]];
    var out = "";
    map.forEach(function (pair) {
      while (num >= pair[0]) { out += pair[1]; num -= pair[0]; }
    });
    return out;
  }

  function renderPages() {
    var doc = S.doc;
    applyPageStyle();
    S.pagesEl.innerHTML = "";
    var p = doc.page || {};
    var dims = pageDims();

    /* measure in an off-screen page with identical typography */
    var meas = pageShell(0, 1);
    meas.style.position = "absolute";
    meas.style.visibility = "hidden";
    meas.style.left = "-12000px";
    meas.style.top = "0";
    meas.style.height = "auto";
    meas.style.minHeight = "0";
    document.body.appendChild(meas);
    var measBody = meas.querySelector(".page-body");

    var nodes = [];
    doc.blocks.forEach(function (b) {
      var el = blockEl(b);
      measBody.appendChild(el);
      nodes.push({ el: el, block: b, h: 0 });
    });
    nodes.forEach(function (n) {
      var cs = getComputedStyle(n.el);
      n.h = n.el.offsetHeight + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
      if (n.el.dataset.type === "pagebreak") n.h = 0;
    });
    nodes.forEach(function (n) { if (n.el.parentNode) n.el.parentNode.removeChild(n.el); });
    meas.remove();

    var headerH = p.headerText ? 34 : 0;
    var footerH = (p.footerText ? 30 : 0) + (p.numbers !== false ? 26 : 0);
    var cols = Math.max(1, p.columns || 1);
    var avail = mm(dims.h) - mm(dims.margins.top) - mm(dims.margins.bottom) - headerH - footerH - mm(6);
    if (cols > 1) avail = avail * cols;

    var pages = [[]], used = 0;
    nodes.forEach(function (n) {
      if (n.block.type === "pagebreak") {
        pages[pages.length - 1].push(n);
        pages.push([]);
        used = 0;
        return;
      }
      var h = Math.max(n.h, 20);
      if (used + h > avail && pages[pages.length - 1].length) {
        pages.push([]);
        used = 0;
      }
      pages[pages.length - 1].push(n);
      used += h;
    });
    while (pages.length > 1 && pages[pages.length - 1].length === 0) pages.pop();

    S.blockPage = {};
    pages.forEach(function (list, i) {
      var pg = pageShell(i, pages.length);
      var body = pg.querySelector(".page-body");
      list.forEach(function (n) {
        if (n.block.type !== "pagebreak") body.appendChild(n.el);
        S.blockPage[n.block.id] = i + 1;
      });
      if (p.lineNumbers) fillLineNumbers(pg, dims);
      S.pagesEl.appendChild(pg);
    });

    S.pageCount = pages.length;
    E.pageCount = pages.length;
    updatePageStatus();
    refreshToc();
  }

  function fillLineNumbers(pg, dims) {
    var gutter = pg.querySelector(".line-numbers");
    if (!gutter) return;
    var style = getComputedStyle(document.documentElement);
    var size = parseFloat(style.getPropertyValue("--doc-size")) || 12;
    var lh = parseFloat(style.getPropertyValue("--doc-lh")) || 1.65;
    var lineH = size * lh * (96 / 72);
    var height = mm(dims.h) - mm(dims.margins.top) - mm(dims.margins.bottom);
    var count = Math.max(1, Math.floor(height / lineH));
    var step = (S.doc.page.lineNumberEvery || 1);
    var html = "";
    for (var i = 1; i <= count; i += step) html += "<span>" + i + "</span>";
    gutter.innerHTML = html;
  }

  /* --------------------------------------------------------------------- TOC */
  E.buildTocHtml = function (doc) {
    var heads = (doc.blocks || []).filter(function (b) { return b.type === "h1" || b.type === "h2" || b.type === "h3"; });
    if (!heads.length) return "";
    return heads.map(function (b) {
      var text = U.stripTags(b.html).trim() || "…";
      var indent = b.type === "h2" ? 12 : b.type === "h3" ? 24 : 0;
      return "<div class='toc-line' style='padding-left:" + indent + "px'><span>" + U.escapeHtml(text) +
        "</span><span class='leader'></span><span data-page='" + b.id + "'>" + (S.blockPage[b.id] || "") + "</span></div>";
    }).join("");
  };

  function refreshToc() {
    U.$$('.blk[data-type="toc"]', S.pagesEl).forEach(function (el) {
      var html = E.buildTocHtml(S.doc);
      if (html && el.innerHTML !== html) {
        el.innerHTML = html;
        var b = blockById(el.dataset.id);
        if (b) b.html = html;
      }
    });
  }

  /* ------------------------------------------------------------------ helpers */
  function blockById(id) {
    for (var i = 0; i < S.doc.blocks.length; i++) if (S.doc.blocks[i].id === id) return S.doc.blocks[i];
    return null;
  }
  function blockIndex(id) {
    for (var i = 0; i < S.doc.blocks.length; i++) if (S.doc.blocks[i].id === id) return i;
    return -1;
  }
  function editable(el) {
    return !!el && !!el.getAttribute && el.getAttribute("contenteditable") === "true";
  }
  E.editable = editable;

  function activeBlock() {
    var el = document.activeElement;
    return el && el.classList && el.classList.contains("blk") && editable(el) ? el : null;
  }
  E.activeBlock = activeBlock;

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
    var el = activeBlock();
    if (!el) return null;
    return { id: el.dataset.id, offset: caretOffset(el) };
  };

  E.restoreCaret = function (c) {
    if (!c) return;
    var el = S.pagesEl.querySelector('.blk[data-id="' + c.id + '"]');
    if (!el) return;
    el.focus({ preventScroll: true });
    setCaret(el, c.offset);
  };

  E.syncBlock = function (el) {
    if (!el) return;
    var b = blockById(el.dataset.id);
    if (!b) return;
    if (b.type === "image" || b.type === "toc" || b.type === "table") return;
    b.html = el.innerHTML === "<br>" ? "" : el.innerHTML;
    var empty = !U.stripTags(b.html).trim();
    el.classList.toggle("empty", empty && isTextBlock(b));
  };

  E.syncAll = function () {
    U.$$(".blk", S.pagesEl).forEach(function (el) {
      if (editable(el)) E.syncBlock(el);
      else if (el.dataset.type === "table") {
        var b = blockById(el.dataset.id);
        if (b) b.html = el.innerHTML;
      }
    });
  };

  /* ------------------------------------------------------------------- setup */
  E.setDoc = function (doc, opts) {
    var caret = E.saveCaret();
    S.doc = doc;
    S.undo = [];
    S.redo = [];
    S.lastSnapshot = JSON.stringify(doc.blocks);
    renderPages();
    if (caret) E.restoreCaret(caret);
    else if (doc.blocks.length) {
      var first = S.pagesEl.querySelector(".blk");
      if (first && editable(first) && (!opts || opts.focus !== false)) {
        first.focus({ preventScroll: true });
        setCaret(first, 0);
      }
    }
    refreshUndoButtons();
    E.emitChange(true);
  };

  E.rerender = function () {
    var caret = E.saveCaret();
    renderPages();
    if (caret) E.restoreCaret(caret);
  };

  E.getDoc = function () { return S.doc; };

  E.emitChange = function (immediate) {
    clearTimeout(E._emit);
    var fire = function () {
      S.doc.updatedAt = Date.now();
      document.dispatchEvent(new CustomEvent("nd:docchange", { detail: { doc: S.doc } }));
    };
    if (immediate) fire();
    else E._emit = setTimeout(fire, 220);
  };

  /* -------------------------------------------------------------------- undo */
  function pushSnapshot() {
    var snap = JSON.stringify(S.doc.blocks);
    if (snap === S.lastSnapshot) return;
    S.undo.push({ blocks: S.lastSnapshot, caret: E.saveCaret() });
    if (S.undo.length > 100) S.undo.shift();
    S.lastSnapshot = snap;
    S.redo = [];
    refreshUndoButtons();
  }
  E.pushUndo = function () {
    S.undo.push({ blocks: S.lastSnapshot, caret: E.saveCaret() });
    S.lastSnapshot = JSON.stringify(S.doc.blocks);
    refreshUndoButtons();
  };
  function refreshUndoButtons() {
    var u = document.getElementById("btnUndo"), r = document.getElementById("btnRedo");
    if (u) u.disabled = S.undo.length === 0;
    if (r) r.disabled = S.redo.length === 0;
  }

  E.undo = function () {
    if (!S.undo.length) { U.toast(ND.t("nothingToUndo")); return; }
    var prev = S.undo.pop();
    S.redo.push({ blocks: JSON.stringify(S.doc.blocks), caret: E.saveCaret() });
    S.doc.blocks = JSON.parse(prev.blocks);
    S.lastSnapshot = prev.blocks;
    renderPages();
    E.restoreCaret(prev.caret);
    E.emitChange(true);
    refreshUndoButtons();
  };

  E.redo = function () {
    if (!S.redo.length) return;
    var next = S.redo.pop();
    S.undo.push({ blocks: JSON.stringify(S.doc.blocks), caret: E.saveCaret() });
    S.doc.blocks = JSON.parse(next.blocks);
    S.lastSnapshot = next.blocks;
    renderPages();
    E.restoreCaret(next.caret);
    E.emitChange(true);
    refreshUndoButtons();
  };

  /* -------------------------------------------------------------- formatting */
  E.exec = function (cmd, val) {
    var el = activeBlock();
    if (!el) {
      var sel = window.getSelection();
      if (!sel.rangeCount || !S.pagesEl.contains(sel.anchorNode)) {
        U.toast(ND.t("selectTextFirst"), "warn");
        return;
      }
    }
    pushSnapshot();
    document.execCommand(cmd, false, val === undefined ? null : val);
    if (el) E.syncBlock(el);
    E.emitChange();
    updateToolbar();
  };

  E.applyToSelection = function (fn) {
    var sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed || !S.pagesEl.contains(sel.anchorNode)) return false;
    pushSnapshot();
    fn(sel);
    var el = activeBlock();
    if (el) E.syncBlock(el);
    E.emitChange();
    return true;
  };

  E.setBlockType = function (type) {
    var el = activeBlock();
    var block = el ? blockById(el.dataset.id) : null;
    if (!block) {
      var sel = window.getSelection();
      if (sel.rangeCount && S.pagesEl.contains(sel.anchorNode)) {
        var node = sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement;
        var blkEl = node.closest(".blk");
        if (blkEl) block = blockById(blkEl.dataset.id), el = blkEl;
      }
    }
    if (!block) return;
    E.pushUndo();
    block.type = type === "body" ? "p" : type;
    if (block.type === "li") block.marker = "•";
    E.rerender();
    var again = S.pagesEl.querySelector('.blk[data-id="' + block.id + '"]');
    if (again && editable(again)) { again.focus({ preventScroll: true }); setCaret(again, 0); }
    E.emitChange(true);
    document.dispatchEvent(new CustomEvent("nd:blocktype", { detail: { type: block.type } }));
  };

  E.align = function (mode) {
    var el = activeBlock();
    if (!el) return;
    var b = blockById(el.dataset.id);
    if (!b) return;
    E.pushUndo();
    b.align = b.align === mode ? "" : mode;
    el.classList.remove("align-center", "align-right", "align-justify", "align-left");
    if (b.align) el.classList.add("align-" + b.align);
    E.emitChange();
    updateToolbar();
  };

  E.indent = function (dir) {
    var el = activeBlock();
    if (!el) return;
    var b = blockById(el.dataset.id);
    if (!b) return;
    E.pushUndo();
    b.indent = Math.max(0, Math.min(8, (b.indent || 0) + dir));
    el.style.paddingLeft = b.indent ? (b.indent * 6) + "mm" : "";
    E.emitChange();
  };

  E.clearFormat = function () {
    var el = activeBlock();
    if (!el) return;
    E.pushUndo();
    document.execCommand("removeFormat");
    var b = blockById(el.dataset.id);
    if (b) { b.type = "p"; b.align = ""; b.indent = 0; }
    E.syncBlock(el);
    E.rerender();
    E.emitChange(true);
  };

  E.setParagraph = function (opts) {
    E.pushUndo();
    var st = S.doc.style;
    if (opts.lh !== undefined) st.lh = opts.lh;
    if (opts.paraSpacing !== undefined) st.paraSpacing = opts.paraSpacing;
    if (opts.firstLine !== undefined) st.firstLine = opts.firstLine;
    if (opts.size !== undefined) st.size = opts.size;
    if (opts.devFont !== undefined) st.devFont = opts.devFont;
    if (opts.latinFont !== undefined) st.latinFont = opts.latinFont;
    E.rerender();
    E.emitChange(true);
  };

  /* ---------------------------------------------------------- block creation */
  E.insertBlock = function (type, html, afterId, opts) {
    var b = D.newBlock(type || "p", html || "", opts || {});
    var idx = afterId ? blockIndex(afterId) : S.doc.blocks.length - 1;
    if (idx < 0) idx = S.doc.blocks.length - 1;
    S.doc.blocks.splice(idx + 1, 0, b);
    E.pushUndo();
    renderPages();
    var el = S.pagesEl.querySelector('.blk[data-id="' + b.id + '"]');
    if (el && editable(el)) { el.focus({ preventScroll: true }); setCaret(el, 0); }
    E.emitChange();
    return b;
  };

  E.insertHtmlAtCursor = function (html) {
    var el = activeBlock();
    if (!el) {
      var b = D.newBlock("p", html);
      S.doc.blocks.push(b);
      E.pushUndo();
      renderPages();
      E.emitChange(true);
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

  E.insertTable = function (rows, cols) {
    var html = "<table><tbody>";
    for (var r = 0; r < rows; r++) {
      html += "<tr>";
      for (var c = 0; c < cols; c++) html += "<td><br></td>";
      html += "</tr>";
    }
    html += "</tbody></table>";
    var el = activeBlock();
    var after = el ? el.dataset.id : (S.doc.blocks[S.doc.blocks.length - 1] || {}).id;
    var b = D.newBlock("table", html);
    var idx = after ? blockIndex(after) : S.doc.blocks.length - 1;
    S.doc.blocks.splice(idx + 1, 0, b);
    E.pushUndo();
    renderPages();
    var tableEl = S.pagesEl.querySelector('.blk[data-id="' + b.id + '"]');
    if (tableEl) {
      tableEl.setAttribute("contenteditable", "true");
      tableEl.setAttribute("spellcheck", "false");
      var cell = tableEl.querySelector("td");
      if (cell) cell.focus();
    }
    E.emitChange(true);
    return b;
  };

  E.insertImage = function (dataUrl, widthPct) {
    var html = "<img src=\"" + dataUrl + "\" alt=\"\" style=\"width:" + (widthPct || 70) + "%\">";
    var el = activeBlock();
    var after = el ? el.dataset.id : (S.doc.blocks[S.doc.blocks.length - 1] || {}).id;
    var b = D.newBlock("image", html);
    var idx = after ? blockIndex(after) : S.doc.blocks.length - 1;
    S.doc.blocks.splice(idx + 1, 0, b);
    E.pushUndo();
    renderPages();
    E.emitChange(true);
    return b;
  };

  E.insertToc = function () {
    var html = E.buildTocHtml(S.doc);
    if (!html) { U.toast(ND.t("tocEmpty"), "warn"); return null; }
    var el = activeBlock();
    var after = el ? el.dataset.id : null;
    var b = D.newBlock("toc", html);
    var idx = after ? blockIndex(after) : S.doc.blocks.length - 1;
    S.doc.blocks.splice(idx + 1, 0, b);
    E.pushUndo();
    E.rerender();
    E.emitChange(true);
    return b;
  };

  E.deleteBlock = function (id) {
    var idx = blockIndex(id);
    if (idx < 0) return;
    E.pushUndo();
    S.doc.blocks.splice(idx, 1);
    if (!S.doc.blocks.length) S.doc.blocks.push(D.newBlock("p", ""));
    renderPages();
    E.emitChange(true);
  };

  /* --------------------------------------------------------- input & keyboard */
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

  var typingTimer, typingBase = null;

  /** Coalesce keystrokes into one undo step (Word-like typing groups). */
  function noteTyping() {
    if (typingBase === null) typingBase = S.lastSnapshot;
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () {
      var snap = JSON.stringify(S.doc.blocks);
      if (typingBase !== null && typingBase !== snap) {
        S.undo.push({ blocks: typingBase, caret: null });
        if (S.undo.length > 100) S.undo.shift();
        S.lastSnapshot = snap;
        S.redo = [];
        refreshUndoButtons();
      }
      typingBase = null;
    }, 1200);
  }

  function onInput() {
    var el = activeBlock();
    if (!el) return;
    E.syncBlock(el);
    noteTyping();
    E.emitChange();
    updateToolbar();
    schedulePagination();
  }

  function onKeyDown(e) {
    var el = activeBlock();
    if (!el) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      E.syncBlock(el);
      var b = blockById(el.dataset.id);
      var atEnd = caretOffset(el) >= (el.textContent || "").length;
      if ((b.type === "h1" || b.type === "h2" || b.type === "h3") && atEnd) {
        E.insertBlock("p", "", b.id);
        return;
      }
      if (atEnd) {
        E.insertBlock(b.type === "li" ? "li" : "p", "", b.id, b.type === "li" ? { marker: b.marker || "•" } : null);
        return;
      }
      var sel = window.getSelection();
      var range = sel.getRangeAt(0);
      var after = document.createRange();
      after.setStart(range.endContainer, range.endOffset);
      after.setEndAfter(el.lastChild || el);
      var frag = after.extractContents();
      var tmp = document.createElement("div");
      tmp.appendChild(frag);
      E.syncBlock(el);
      E.insertBlock("p", tmp.innerHTML, b.id);
      return;
    }

    if (e.key === "Backspace") {
      var el2 = activeBlock();
      if (el2 && (el2.textContent || "").length === 0) {
        var idx = blockIndex(el2.dataset.id);
        if (idx > 0) {
          e.preventDefault();
          var prevB = S.doc.blocks[idx - 1];
          if (prevB.type === "pagebreak" || prevB.type === "hr" || prevB.type === "image") {
            E.deleteBlock(prevB.id);
            return;
          }
          E.pushUndo();
          S.doc.blocks.splice(idx, 1);
          renderPages();
          var prevEl = S.pagesEl.querySelector('.blk[data-id="' + prevB.id + '"]');
          if (prevEl && editable(prevEl)) {
            prevEl.focus({ preventScroll: true });
            setCaret(prevEl, (prevEl.textContent || "").length);
          }
          E.emitChange(true);
          return;
        }
      }
    }

    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertText", false, "\u00a0\u00a0\u00a0\u00a0");
      E.syncBlock(el);
      E.emitChange();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      var k = e.key.toLowerCase();
      if (k === "b") { e.preventDefault(); E.exec("bold"); }
      else if (k === "i") { e.preventDefault(); E.exec("italic"); }
      else if (k === "u") { e.preventDefault(); E.exec("underline"); }
      else if (k === "z" && !e.shiftKey) { e.preventDefault(); E.undo(); }
      else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); E.redo(); }
      else if (k === "d") {
        e.preventDefault();
        var word = window.getSelection().toString().trim();
        document.dispatchEvent(new CustomEvent("nd:dict-word", { detail: { word: word } }));
      }
    }
  }

  /* ------------------------------------------------------------- spell marks */
  function decorateSpelling() {
    if (!ND.prefs.autoSpell || !ND.dict.ready) return;
    var focused = activeBlock();
    U.$$(".blk", S.pagesEl).forEach(function (el) {
      if (el === focused || !editable(el)) return;
      if (el.dataset.type === "pagebreak") return;
      stripMarks(el);
      if (el.innerHTML.indexOf("<") >= 0) return;
      var text = el.textContent;
      if (!text) return;
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
  E.decorateSpelling = U.debounce(decorateSpelling, 1000);

  function stripMarks(el) {
    if (!el.querySelector || !el.querySelector(".sp-err")) return;
    el.innerHTML = el.innerHTML.replace(/<span class="sp-err"[^>]*>(.*?)<\/span>/g, "$1");
  }

  /* ---------------------------------------------------------- find & replace */
  E.find = function (q) {
    S.findHits = [];
    if (!q) return [];
    var lower = q.toLowerCase();
    U.$$(".blk", S.pagesEl).forEach(function (el) {
      if (!editable(el)) return;
      var text = (el.textContent || "").toLowerCase();
      var i = text.indexOf(lower);
      while (i >= 0) {
        S.findHits.push({ id: el.dataset.id, index: i, len: q.length });
        i = text.indexOf(lower, i + Math.max(1, q.length));
      }
    });
    return S.findHits;
  };

  E.gotoHit = function (n) {
    if (!S.findHits.length) return -1;
    S.findIndex = (n + S.findHits.length) % S.findHits.length;
    var hit = S.findHits[S.findIndex];
    var el = S.pagesEl.querySelector('.blk[data-id="' + hit.id + '"]');
    if (!el) return S.findIndex;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var node, count = 0, target = null, offset = 0;
    while ((node = walker.nextNode())) {
      if (count + node.nodeValue.length > hit.index) { target = node; offset = hit.index - count; break; }
      count += node.nodeValue.length;
    }
    if (!target) return S.findIndex;
    var range = document.createRange();
    range.setStart(target, offset);
    range.setEnd(target, Math.min(offset + hit.len, target.nodeValue.length));
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    return S.findIndex;
  };

  E.replaceCurrent = function (q, replacement) {
    var sel = window.getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return false;
    var text = sel.toString();
    if (text.toLowerCase() !== q.toLowerCase()) return false;
    E.pushUndo();
    document.execCommand("insertText", false, replacement);
    var el = activeBlock();
    if (el) E.syncBlock(el);
    E.emitChange();
    return true;
  };

  E.replaceAll = function (q, replacement) {
    if (!q) return 0;
    var count = 0;
    E.pushUndo();
    S.doc.blocks.forEach(function (b) {
      if (!isTextBlock(b) || !b.html) return;
      var plain = U.stripTags(b.html);
      if (plain.toLowerCase().indexOf(q.toLowerCase()) < 0) return;
      var re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      var next = plain.replace(re, replacement);
      count += (plain.match(re) || []).length;
      b.html = U.escapeHtml(next);
    });
    if (count) {
      E.rerender();
      E.emitChange(true);
    }
    return count;
  };

  /* -------------------------------------------------------------- goto block */
  E.gotoBlock = function (id) {
    var el = S.pagesEl.querySelector('.blk[data-id="' + id + '"]');
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    if (editable(el)) el.focus({ preventScroll: true });
  };

  /* -------------------------------------------------------------- toolbar UI */
  function updateToolbar() {
    ["bold", "italic", "underline", "strikeThrough"].forEach(function (cmd) {
      var btn = document.querySelector('[data-cmd="' + cmd + '"]');
      if (!btn) return;
      var on = false;
      try { on = document.queryCommandState(cmd); } catch (e) {}
      btn.classList.toggle("on", on);
    });
    var el = activeBlock();
    var b = el ? blockById(el.dataset.id) : null;
    var styleSel = document.getElementById("selStyle");
    if (styleSel && b) {
      var map = { p: "body", h1: "h1", h2: "h2", h3: "h3", quote: "quote", signature: "signature", li: "body" };
      styleSel.value = map[b.type] || "body";
    }
  }
  E.updateToolbar = updateToolbar;

  /* ------------------------------------------------------------ page numbers */
  function updatePageStatus() {
    var el = document.getElementById("stPage");
    if (el) el.textContent = ND.t("pageOf", { n: S.currentPage, total: S.pageCount });
  }

  function onScroll() {
    var pages = U.$$(".page", S.pagesEl);
    if (!pages.length) return;
    var canvasRect = S.canvasEl.getBoundingClientRect();
    var mid = canvasRect.top + canvasRect.height * 0.35;
    for (var i = 0; i < pages.length; i++) {
      var r = pages[i].getBoundingClientRect();
      if (r.bottom > mid) {
        if (S.currentPage !== i + 1) { S.currentPage = i + 1; updatePageStatus(); }
        break;
      }
    }
  }

  /* ------------------------------------------------------- selection toolbar */
  function onSelectionChange() {
    var sel = window.getSelection();
    var bar = document.getElementById("selTools");
    if (!bar) return;
    if (!sel.rangeCount || sel.isCollapsed || !S.pagesEl.contains(sel.anchorNode)) {
      bar.hidden = true;
      return;
    }
    var rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.style.left = Math.max(90, Math.min(window.innerWidth - 90, rect.left + rect.width / 2)) + "px";
    bar.style.top = Math.max(58, rect.top - 8) + "px";
  }

  /* ------------------------------------------------------------------- paste */
  function onPaste(e) {
    var cd = e.clipboardData || window.clipboardData;
    if (!cd) return;
    var html = cd.getData("text/html");
    var text = cd.getData("text/plain") || "";
    e.preventDefault();

    var looksLegacy = T.devRatio(text) < 0.15 && /[\[\]{}<>;~|\\]/.test(text) && text.length > 6;
    if (looksLegacy) {
      var converted = T.krutiToUnicode(text);
      if (T.devRatio(converted) > 0.4) {
        document.execCommand("insertHTML", false, U.nl2br(converted));
        var el = activeBlock();
        if (el) E.syncBlock(el);
        E.emitChange();
        U.toast(ND.lang() === "hi" ? "कृतिदेव पाठ यूनिकोड में बदला गया" : "Kruti Dev text converted to Unicode", "ok");
        return;
      }
    }
    if (html) document.execCommand("insertHTML", false, sanitize(html));
    else document.execCommand("insertText", false, text);
    var el2 = activeBlock();
    if (el2) E.syncBlock(el2);
    E.emitChange();
  }

  function sanitize(html) {
    var d = document.createElement("div");
    d.innerHTML = html;
    U.$$("script,style,meta,link,iframe,object,embed,svg,input,button", d).forEach(function (n) { n.remove(); });
    var allowed = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, STRIKE: 1, SUP: 1, SUB: 1, BR: 1, SPAN: 1, MARK: 1, DIV: 1, P: 1, LI: 1, OL: 1, UL: 1, TABLE: 1, TBODY: 1, TR: 1, TD: 1, TH: 1, IMG: 1 };
    U.$$("*", d).forEach(function (n) {
      if (!allowed[n.tagName]) {
        var parent = n.parentNode;
        while (n.firstChild) parent.insertBefore(n.firstChild, n);
        parent.removeChild(n);
        return;
      }
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        if (a.name === "style" || a.name === "class") return;
        if (n.tagName === "IMG" && (a.name === "src" || a.name === "alt")) return;
        n.removeAttribute(a.name);
      });
      if (n.style) {
        var keep = {
          fontWeight: n.style.fontWeight, fontStyle: n.style.fontStyle,
          textDecoration: n.style.textDecoration, color: n.style.color,
          backgroundColor: n.style.backgroundColor, fontSize: n.style.fontSize
        };
        n.removeAttribute("style");
        Object.keys(keep).forEach(function (k) { if (keep[k]) n.style[k] = keep[k]; });
      }
    });
    return d.innerHTML.replace(/<\/?(div|p|li|ul|ol)[^>]*>/gi, "<br>").replace(/(<br>){2,}/g, "<br>").replace(/^<br>|<br>$/g, "");
  }

  /* ---------------------------------------------------------------- bootstrap */
  E.init = function (doc) {
    S.pagesEl = document.getElementById("pages");
    S.canvasEl = document.getElementById("canvas");
    S.doc = doc;
    if (S.inited) { E.rerender(); return; }
    S.inited = true;
    applyPageStyle();
    renderPages();

    document.addEventListener("input", function (e) {
      if (S.pagesEl.contains(e.target)) onInput();
    });
    S.pagesEl.addEventListener("keydown", function (e) {
      if (S.pagesEl.contains(e.target)) onKeyDown(e);
    });
    document.addEventListener("selectionchange", U.throttle(onSelectionChange, 100));
    S.pagesEl.addEventListener("focusin", function (e) {
      var el = e.target;
      if (el.classList && el.classList.contains("blk")) stripMarks(el);
      U.$$(".blk.active", S.pagesEl).forEach(function (n) { n.classList.remove("active"); });
      if (el.classList && el.classList.contains("blk")) el.classList.add("active");
      updateToolbar();
    });
    S.pagesEl.addEventListener("paste", onPaste);
    S.pagesEl.addEventListener("drop", function (e) { e.preventDefault(); });
    S.pagesEl.addEventListener("click", function (e) {
      var mark = e.target.closest ? e.target.closest(".sp-err") : null;
      if (mark) {
        var word = mark.getAttribute("data-w");
        document.dispatchEvent(new CustomEvent("nd:dict-word", { detail: { word: word } }));
        return;
      }
      var pageEl = e.target.closest ? e.target.closest(".page") : null;
      if (pageEl) {
        S.currentPage = parseInt(pageEl.dataset.page, 10) || 1;
        updatePageStatus();
        if (e.target.classList && e.target.classList.contains("page-body")) {
          var blocks = pageEl.querySelectorAll(".blk[contenteditable='true']");
          if (blocks.length) blocks[blocks.length - 1].focus();
        }
      }
    });
    S.canvasEl.addEventListener("scroll", U.throttle(onScroll, 120));

    document.addEventListener("nd:pref", function (e) {
      if (!e.detail || e.detail.key === "*" ||
          ["ruler", "focus", "typewriter", "statusBar", "theme", "accent"].indexOf(e.detail.key) >= 0) {
        applyPageStyle();
      }
      if (e.detail && e.detail.key === "autoSpell") decorateSpelling();
    });
    window.addEventListener("resize", U.debounce(function () { E.rerender(); }, 260));
  };

  E.setViewPref = function (key, value) {
    ND.setPref(key, value);
    applyPageStyle();
  };

  E.updateNumbers = function () { updatePageStatus(); };
  E.applyPageStyle = applyPageStyle;
})(window);
