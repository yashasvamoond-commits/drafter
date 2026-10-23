# NyayaLekh — न्यायलेख

**A word processor for Hindi legal drafting on Android tablets.** English-first interface, switchable to Hindi, built for Rajasthan district-court practice (JM · ACJM · ADJ and beyond). Ships as an installable APK — no Play Store, no account, no internet needed.

| | |
|---|---|
| **Download the APK** | <https://github.com/yashasvamoond-commits/drafter/releases/download/apk-latest/NyayaLekh-2.0.0.apk> |
| **All builds** | <https://github.com/yashasvamoond-commits/drafter/releases/tag/apk-latest> |
| **Version** | v2.0.0 · Android 7.0+ (minSdk 24) · arm64 / armv7 tablets |
| **Interface** | English (default) + हिन्दी, switch any time from the EN / हिं pill |
| **Fonts** | 62 families / 120 faces bundled offline (28 Devanagari, 34 Latin) |
| **Privacy** | Everything stays on the device: no login, no analytics, no network calls while drafting |

> **Honest notes**
> 1. The APK is **self-signed** (not published on Play Store). Android will ask you to allow installs from your browser/Files app the first time.
> 2. The BNS/BNSS ↔ IPC/CrPC tables and the limitation list are **indicative study aids**, not legal advice. Verify against the official Gazette and the Rajasthan High Court Rules before filing.
> 3. Hindi speech-to-text depends on the speech engine installed on the tablet; install the Hindi voice pack once (Android Settings → System → Languages & input → Voice input) and dictation then works offline.
> 4. There is no cloud, no AI service and no telemetry by design — a client's draft never leaves the tablet.

---

## 1. Install on a Lenovo Yoga Tab Plus (or any Android 7+ device)

1. Open the **APK link** above in the tablet's browser → `NyayaLekh-2.0.0.apk` downloads.
2. Tap the download notification → Android asks for permission: allow **“Install unknown apps”** for the browser or Files app.
3. If Play Protect warns about an unknown developer, choose **“Install anyway”** — normal for a self-signed APK.
4. Open the app. The first screen is ready in a couple of seconds while the dictionaries initialise.
5. Rotate the tablet: the layout works in **portrait and landscape**.

The release tag `apk-latest` always holds the newest build, so the link above stays valid for future versions.

---

## 2. What is new in v2

- **English-first interface** with a complete Hindi translation; one tap on the **EN / हिं** pill in the status bar (or the menu) flips everything, including panel titles, help and dialogs. Document text is never touched.
- **A real font library**: 62 families (Noto Serif/Sans Devanagari, Tiro, Mukta, Hind, Khula, Sarala, Karma, Martel, Halant, Sahitya, Amita, Kadwa, Sura, Eczar, Kalam, Rozha One, Yatra One, Anek, IBM Plex Devanagari … plus Tinos, EB Garamond, Crimson, Literata, Merriweather, Lora, Inter, Roboto, Source Sans/Serif, JetBrains Mono, Courier Prime and more). Pick the Devanagari face and the Latin face separately; each paragraph mixes both correctly.
- **Redesigned, quieter UI**: paper-first canvas, a single slim format bar, a side panel that holds everything (no modal mazes), and a status bar with words, characters, page and zoom.
- **Full page-setup panel**: A4 / Legal / Letter / A5 / A3, portrait or landscape, five margin presets plus millimetre control, 1–3 columns, header and footer text, page numbers (plain / “Page 1 of 4” / roman), last-line and paragraph settings, legal **line numbering**, page border, **watermark** with opacity, paged or continuous view.
- **Insert panel**: date, place, case number, sections, party line, court heading, signature block, page break, divider, table, image, table of contents, merge fields and a symbol palette.
- **33 court templates** (28 Hindi, 5 English) across criminal / civil / misc, with placeholders fed from **Court details** (14 Rajasthan court types).
- **Bilingual dictionary, legal glossary, spell check, voice dictation, Kruti Dev ⇄ Unicode converter** and legal reference tables — all still fully offline.

---

## 3. What it does

### Writing and formatting
- Paged A4/Legal/Letter/A5/A3 canvas with true pagination while typing, correct headers/footers, page numbers and watermarks — what you see is what prints.
- Bold, italic, underline, strike, super/subscript, text colour and highlight, six paragraph styles (body, title, heading, sub-heading, quotation, signature block), four alignments, indent/outdent, line spacing and paragraph gaps, first-line indent.
- Tables with editable cells, inline images, horizontal rules, page breaks, table of contents with live page numbers, merge fields (`{{court}}`, `{{caseNo}}`, `{{sections}}`, `{{date}}` …).
- Undo/redo with Word-like typing groups, find & replace, select all, zoom 80–150 %, focus mode, typewriter scrolling, paragraph marks, ruler toggle.
- Continuous or paged view (a single tap in Page setup) for long judgments.

### Hindi drafting
- Devanagari rendered from bundled fonts — no missing matras, no tofu, no internet fetch.
- **Fix Devanagari matras** repairs the classic गि/कि ordering and nukta slips.
- **Kruti Dev / DevLys / Chanakya / Remington → Unicode** conversion, both directions. Pasting legacy text into the editor converts it automatically.
- Hindi ⇄ Roman transliteration for names and citations.

### Rajasthan court workflow
- Court details panel with **14 court types** — JM, ACJM, CJM, ADJ, DSJ, CJM (Rural), Civil Judge, Family Court, MACT, Rent Control, Lok Adalat, Rajasthan High Court, District Consumer Commission, Labour Court — plus place, judge, prosecutor, police station, case number, party line, sections and clerk.
- Court heading and all `{{placeholders}}` fill from that panel without overwriting existing text.
- 33 ready formats: bail, anticipatory bail, charge sheet, arrest report, judgment, summon, statement, bond, discharge, maintenance, cheque §138, plaint, written statement, injunction, appeal, revision, execution, caveat, notice, affidavit, vakalatnama, adjournment, certified copy, rent, MACT, consumer, writ, will — plus English bail/notice/affidavit/vakalatnama/plaint.
- Legal reference: 221-term legal glossary, BNS ↔ IPC (47 entries), BNSS ↔ CrPC (35), limitation periods (14) and court-rule notes.

### Files
- **Open** `.docx`, `.odt`, `.rtf`, `.txt`, `.md`, `.html` and text-based `.pdf` — including files produced by WPS Office on the tablet.
- **Export** DOCX (header, footer, watermark, columns, line numbers, tables, inline formatting, correct fonts), PDF through Android's print-to-PDF, HTML, RTF, TXT and Markdown.
- Files are written to `Documents/NyayaLekh`, which WPS Office, Google Files and the court printing workflow can open immediately.
- Documents autosave on the device; the Files panel searches inside document text, renames, duplicates and deletes.

### Language tools
- **Spell check** against the offline Hindi WordNet lexicon (106,082 headwords) plus a 274,801-word English list, with Damerau-Levenshtein suggestions, legal-term and acronym allowlists, and a personal dictionary. Live underline while typing, or check the whole document on demand.
- **Dictionary**: Hindi ⇄ English lookup, legal glossary entries with explanations, insert a word straight into the draft.
- **Voice**: dictate in Hindi or English with the system speech engine; review the transcript, then insert at the cursor.
- **Document statistics**: words, characters with and without spaces, paragraphs, sentences, pages, reading time.

---

## 4. Keyboard shortcuts (external keyboard or Chromebook)

| Keys | Action |
|---|---|
| `Ctrl/⌘ + B` / `I` / `U` | bold / italic / underline |
| `Ctrl/⌘ + F` | find & replace |
| `Ctrl/⌘ + Z` / `Shift+Z` or `Y` | undo / redo |
| `Ctrl/⌘ + S` | save now |
| `Ctrl/⌘ + P` | print / save as PDF |
| `Ctrl/⌘ + E` | export panel |
| `Ctrl/⌘ + D` | dictionary for the selected word |
| `Tab` | insert a run of spaces inside a paragraph |
| `Esc` | close panel, dialog or find bar |

---

## 5. Known limits

- **Old binary `.doc` files** are not supported. Open them in WPS Office and save as `.docx` first — WPS does that in two taps.
- **Scanned PDFs** have no text layer, so importing them yields nothing; OCR is out of scope.
- Speech recognition quality depends on the installed engine and the Hindi voice pack.
- DOCX export writes the chosen fonts by name. A court PC without those fonts substitutes its own; metric-compatible families are exported as Times New Roman / Arial / Calibri / Georgia so measurements survive.
- The font library is 4.4 MB of the APK; that is the price of rendering Hindi properly offline.

---

## 6. Build it yourself

Everything the APK contains lives in this repository:

```
app/            the entire application (HTML/CSS/JS, fonts, dictionaries) — also runs in a browser
android/        a dependency-free WebView shell (MainActivity.java, manifest, resources)
scripts/        build-data.mjs (dictionaries), build-fonts.mjs (font library)
.github/workflows/build-apk.yml   CI that builds the APK and publishes the release
docs/           SPECIFICATION.md, FONTS.md
```

```bash
# 1. dictionaries (106k Hindi words + 103k glosses + 274k English words)
cd scripts && npm install && node build-data.mjs && cd ..

# 2. font library (62 families → app/vendor/fonts, app/css/fonts.css, app/js/fonts.js)
node scripts/build-fonts.mjs

# 3. APK (needs JDK 17 + Android SDK 34)
cd android && gradle :app:assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

Pushing to `main` (or running the workflow manually) rebuilds and republishes `apk-latest`.

To preview the UI without Android, serve `app/` with any static server (`python3 -m http.server -d app 8000`) — the browser build uses the same files as the APK.

---

## 7. Credits and licences

- **Fonts** — 62 families under the **SIL Open Font License 1.1**, fetched from [Fontsource](https://fontsource.org/) / Google Fonts. Full list: [docs/FONTS.md](docs/FONTS.md).
- **Hindi WordNet** — CFILT, IIT Bombay, **GPL**; headwords and glosses generate `app/data/hi-words.js` and `app/data/hi-dict.js`.
- **English word list** — `an-array-of-english-words` (MIT).
- **JSZip** — MIT, MIT-licensed zip writer used for DOCX/ODT packaging.
- **Kruti Dev / DevLys / Chanakya mapping tables** — open legacy-to-Unicode tables, embedded in `app/js/kd-table.js`.
- Application code: MIT.

NyayaLekh is not affiliated with WPS Office, Google, or any court. It is a drafting tool; the drafter remains responsible for every word filed.
