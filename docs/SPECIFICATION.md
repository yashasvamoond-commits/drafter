# NyayaLekh v2.0 — Specification and verification record

This document maps every requirement the user stated for the tablet app to the code that implements it and to the check that proves it works. It is written so that a later change can be tested against the same table.

- Product: **NyayaLekh (न्यायलेख)** — offline legal drafting for Android tablets, primarily Hindi with English support.
- Target device: **Lenovo Yoga Tab Plus (2026)**, Android, used in **portrait and landscape**.
- Distribution: a directly downloadable, self-signed **APK** (no Play Store), rebuilt by CI on every push.
- Delivery format: static web application (`app/`) packaged as WebView assets (`android/`).

---

## 1. Requirement matrix

Legend: **R** = requirement, **I** = implementation, **V** = verification.

| # | Requirement (user's words) | Implementation | Verification |
|---|---|---|---|
| R1 | Installable APK straight from a link, no Play Store | `android/` WebView shell (minSdk 24, targetSdk 34) built by `.github/workflows/build-apk.yml`; release tag `apk-latest` | CI "Assemble APK" + "Verify APK contents" must pass; release asset `NyayaLekh-2.0.0.apk` published |
| R2 | Works in portrait and landscape | responsive CSS (`@media` breakpoints 520/900 px), wide `configChanges` in the manifest so rotation never recreates the WebView, page geometry recomputed from `page.orientation` | jsdom screen sweep; manual rotation check on device |
| R3 | Interface in **English (default) and Hindi** | `app/js/i18n.js` (165 + 10 keys, `ND.t`, `ND.setLang`), `ND.lang()` stored in `localStorage.nd.lang`, `data-i18n` / `data-i18n-title` / `data-i18n-ph` attributes, `EN/हिं` pill in the status bar and menu | jsdom: `ND.setLang("hi")` retranslates chrome and panels (`lang hi: hi / title=…`) |
| R4 | Attractive, minimal "pro" UI | `app/css/app.css` design system: paper canvas, 11-item rail, one format bar, side panel, status bar, light/sepia/dark/auto themes, five accents | jsdom renders all 19 panels without error; visual check in browser preview |
| R5 | Every pro settings/formatting/layout option | Page setup (5 sizes, orientation, 5 margin presets + mm, columns, header/footer, page numbers ×3 formats, line numbers, border, watermark + opacity, paged/continuous, zoom, ruler, paragraph marks, first-line indent, line height, paragraph gap, font size, per-script fonts) | jsdom layout interactions: size→Legal, orientation→landscape, watermark, page-number toggle all mutate the document model and re-render |
| R6 | All English + Devanagari fonts available offline | 62 families / 120 woff2 faces in `app/vendor/fonts`, generated `app/css/fonts.css` + `app/js/fonts.js`, `ND.fonts.stack()` for mixed-script paragraphs, Font library panel with live previews | jsdom: `fonts: 62 total, dev=28, latin=34`; 62 `.font-item` nodes rendered; CI requires ≥100 faces / ≥45 families inside the APK |
| R7 | Hindi renders very clearly | Devanagari subsets carry `unicode-range: U+0900-097F…`; Noto Serif/Sans Devanagari, Tiro, Mukta, Hind and 23 more; default `noto-serif-dev` at 12 pt / 1.65 line height | font pipeline output; CI asset check for the Devanagari faces |
| R8 | English drafting supported | Latin families (Tinos, EB Garamond, Literata, Inter, Roboto, JetBrains Mono…), English templates, English word list | jsdom: `ND.fonts.latin().length = 34`; English templates present |
| R9 | Open files created in WPS Office (.docx/.odt/.rtf/.txt, general file access) | `D.importDocx` (JSZip + DOMParser, w:p/w:tbl/w:r formatting), `D.importOdt`, `D.importRtf`, `D.htmlToBlocks`, plain text, text-layer PDF (`DecompressionStream`); file picker through `NativeApp.pickDocument` or a browser `<input type=file>` | jsdom imports are stubbed only by JSZip's async pipeline; DOCX **export** parts validated 9/9 XML-clean |
| R10 | Rajasthan court templates: JM, ACJM, ADJ (cause title, parties, headings, prayer, verification, place/date) | `D.COURTS` (14 types) + 33 templates in `ND.templates`; `D.buildTemplate` handles `===`/`&&&` heading sentinels and right-aligns signature/date lines; placeholders resolved by `D.applyVars` | jsdom: bail template → 19 blocks, first block “न्यायालय श्रीमान …”, court heading follows the Court details panel (`…अपर जिला एवं सत्र न्यायाधीश, जोधपुर`) |
| R11 | Proper spell checker | `ND.dict.checkText` + `isKnown` (WordNet, legal glossary, user dictionary, matra suffix stemming) + Damerau-Levenshtein `suggest`; live underline decoration and whole-document review panel | jsdom spell probe on “यह न्यायलय … चाहीये …” returns exactly `न्यायलय`, `चाहीये`; suggestions include `न्यायालय` |
| R12 | Comprehensive dictionary | 106,082 Hindi headwords, 103,174 WordNet glosses (lazy), 274,801 English words, 221-entry curated legal glossary; Hindi/English lookup with legal definitions and insertion | jsdom: dictionary panel lookup returns 2 legal entries and renders 853 chars of result HTML |
| R13 | Speech-to-text | Voice panel → `NativeApp.startVoice` with `NDVoiceResult` / `NDVoiceEnd` callbacks; `webkitSpeechRecognition` fallback in a browser; hi-IN / en-IN selection | jsdom confirms panel and handlers wire up; recognition itself requires a device |
| R14 | Kruti Dev ↔ Unicode converter | `ND.text.krutiToUnicode`, `unicodeToKruti`, plus DevLys, Chanakya, Remington/Kundli, `fixMatras`; automatic detection on paste | jsdom: `U;k;ky;` → `न्यायालय`; paste path converts legacy-looking text |
| R15 | Formatter | Six paragraph styles, alignment, indent, spacing, colour/highlight, tables, images, TOC, page setup, export presets | jsdom formatting + table/image/TOC insert paths, undo/redo, find/replace all exercised |
| R16 | DOCX output that a court/WPS machine can open | `D.toDocxBlob` builds 9 OOXML parts (document, styles, header, footer, rels, core/app props) with headers, footers, PAGE field, watermark VML, columns, line numbering, landscape geometry, tables and run-level formatting; fonts written under their real or metric-compatible names | jsdom capture: 9/9 parts present, 9/9 XML parse clean; checks `sectPr/landscape/columns/lineNumbers/table/devFont/headerRef` all true |
| R17 | Everything offline | no runtime network calls; dictionaries, fonts and legal data shipped in the APK; only `INTERNET` permission retained for user-initiated share intents | code review; APK asset verification lists every data/font file |
| R18 | Documents persist and are findable | IndexedDB `nyayalekh` (`docs`/`kv`) with a `localStorage` fallback; autosave debounce 700 ms; Files panel with full-text search, rename, duplicate, delete | jsdom Files panel renders and lists; fallback path exercised in jsdom (no IndexedDB) |
| R19 | Legal/specification-compliant feature set | BNS ↔ IPC (47), BNSS ↔ CrPC (35), limitation (14), court rules (8), disclaimers visible in the panels, help and README | jsdom legal panel renders 73 KB of reference HTML; disclaimer present |
| R20 | Proper attribution | OFL notice for 62 families in `docs/FONTS.md`, CFILT Hindi WordNet (GPL) credit, MIT libraries credited, About panel lists all of it | `docs/FONTS.md`; About panel text |

---

## 2. Architecture

```
android/app/src/main/            Java 17 WebView shell, no third-party dependencies
  AndroidManifest.xml            INTERNET, RECORD_AUDIO, single MainActivity, VIEW/SEND intent filters
  java/…/MainActivity.java       asset loader + JS bridge (files, voice, print, toast, keep-awake)
  res/                            adaptive launcher icon, theme, strings
app/                             the whole product, shared verbatim with the browser preview
  index.html                     shell: app bar, format bar, rail, canvas, panel, status bar, sheets
  css/app.css                    design system and page geometry
  css/fonts.css                  generated @font-face rules (unicode-range per script)
  js/core.js                     utilities, native bridge, IndexedDB store, preferences, font registry API
  js/i18n.js                     English + Hindi strings, language switching
  js/text.js                     legacy-font conversion, matra repair, transliteration
  js/dict.js                     dictionary, spell engine, suggestions
  js/kd-table.js                 Kruti Dev / DevLys / Chanakya mapping tables
  js/doc.js                      document model, templates, courts, DOCX/HTML/RTF/TXT/MD export, importers
  js/editor.js                   paged contenteditable canvas, pagination, undo, find, spell marks
  js/app.js                      router, 19 panels, import/export, voice, settings
  js/fonts.js                    generated font registry
  vendor/fonts/*.woff2           120 self-hosted faces
  vendor/jszip.min.js            DOCX/ODT packaging
  data/legal.js                  glossary and statute cross-reference tables
  data/hi-words.js, hi-dict.js, en-words.js   generated dictionaries (not committed)
scripts/build-data.mjs           dictionary generation (CFILT WordNet + English lexicon)
scripts/build-fonts.mjs          font pipeline (Fontsource → woff2 + CSS + registry)
```

Document model (`ND.doc.newDoc`) — everything the UI edits lives in one serialisable object:

```js
{ id, title, createdAt, updatedAt,
  page:  { size, orientation, margins{top,right,bottom,left}, numbers, numberFormat,
           headerText, footerText, border, columns, lineNumbers, watermark, watermarkOpacity },
  style: { devFont, latinFont, size, lh, paraSpacing, firstLine, justify },
  court: { type, place, name, judge, prosecutor, caseNo, party, sections, ps, clerk },
  meta:  { author, subject, keywords },
  blocks:[{ id, type, html, align, indent, marker }] }
```

Block types: `p`, `h1`, `h2`, `h3`, `quote`, `signature`, `li`, `table`, `image`, `toc`, `hr`, `pagebreak`.

---

## 3. Verification log (current tree)

Headless jsdom harness against the real `app/index.html` and every script in load order:

| Check | Result |
|---|---|
| Boot in jsdom (no IndexedDB → localStorage fallback) | `app.state.ready = true`, 1 page rendered |
| All 19 panels render | files 380 B, templates 7.3 KB, insert 4.3 KB, layout 5.2 KB, tools 2.1 KB, dictionary 1.4 KB, spell 0.7 KB, voice 1.2 KB, convert 1.4 KB, legal 73 KB, settings 7.0 KB, export/import 1.7 KB, court 2.8 KB, fonts 19.7 KB, stats 1.5 KB, help 3.7 KB, about 1.4 KB |
| Typing + model sync | `न्यायालय श्रीमान न्यायिक मजिस्ट्रेट, जयपुर` written to `blocks[0].html` |
| Layout controls | size → `Legal`, orientation → `landscape`, watermark → `COPY`, page numbers toggled |
| Court panel | type `ADJ` + place `जोधपुर` → `न्यायालय श्रीमान अपर जिला एवं सत्र न्यायाधीश, जोधपुर` |
| Placeholder fill | `{{court}} — प्रकरण {{caseNo}}` resolved in place |
| Dictionary | 106,082 Hindi / 274,801 English words loaded; `न्यायालय` → 2 legal entries |
| Spell check | planted errors `न्यायलय`, `चाहीये` detected; `न्यायालय` suggested |
| Templates | bail template → 19 blocks; title and court heading correct |
| Tables / images | inserted and typed correctly; undo steps back through them |
| Find | 2 hits for `302` across blocks |
| Export | HTML 502 chars, TXT 40, MD 41, RTF 290; DOCX 9 parts, 9/9 XML-clean, 7/7 content checks |
| Language | `ND.setLang("hi")` → chrome, panel title and status bar switch; back to English cleanly |
| Fonts | 62 families, 28 Devanagari, 34 Latin, 62 preview rows |
| Converter | `U;k;ky;` → `न्यायालय` |
| Console | 0 JS errors, 0 warnings (other than jsdom's missing IndexedDB/print APIs) |

Not testable in the sandbox (no JVM, no Android SDK, no Chromium): `gradle assembleDebug`, real WebView rendering, speech recognition, `DecompressionStream` PDF parsing and the print dialog. The CI APK build plus the asset verification step cover the packaging half; the device covers the rest.

---

## 4. Distribution

1. Push to `main` or a `arena/**` branch, or run the workflow manually.
2. CI rebuilds dictionaries and the font library, assembles the debug APK, verifies required assets (including ≥100 woff2 faces and the generated font CSS/JS), uploads the artifact and replaces the `apk-latest` release.
3. Direct link: `https://github.com/yashasvamoond-commits/drafter/releases/download/apk-latest/NyayaLekh-2.0.0.apk`.

Installation requires allowing "install unknown apps" once; the APK is self-signed and is not distributed through Play Store.

---

## 5. Deliberate limits

- No OCR for scanned PDFs; no support for legacy binary `.doc`.
- Speech depends on the Android speech engine and an installed Hindi voice pack.
- DOCX font names are advisory: a machine without the chosen Devanagari font substitutes its own.
- Statute cross-reference tables are aids, not authority; the disclaimer is repeated in the legal panel and the README.
