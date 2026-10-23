/* =============================================================================
 * NyayaLekh — UI localisation. English is the default language; Hindi is a
 * first-class alternative. Document content is never touched by this file.
 * Usage:  ND.t("key")            → string
 *         ND.t("key", {n: 3})    → string with {n} substituted
 *         ND.toggleLang()        → switches + re-renders the chrome
 * ========================================================================== */
(function (global) {
  "use strict";
  var ND = (global.ND = global.ND || {});

  var STRINGS = {
    en: {
      /* app chrome */
      appName: "NyayaLekh",
      appTagline: "Legal Drafting Suite",
      menu: "Menu",
      untitled: "Untitled document",
      saved: "Saved",
      saving: "Saving…",
      unsaved: "Unsaved",
      savingError: "Save failed",
      undo: "Undo", redo: "Redo", search: "Find", export: "Export",
      close: "Close", cancel: "Cancel", save: "Save", apply: "Apply", insert: "Insert",
      delete: "Delete", rename: "Rename", duplicate: "Duplicate", open: "Open",
      back: "Back", done: "Done", add: "Add", remove: "Remove", reset: "Reset",
      yes: "Yes", no: "No", ok: "OK", none: "None", custom: "Custom",
      more: "More", preview: "Preview", total: "Total", on: "On", off: "Off",
      copy: "Copy", copied: "Copied", replace: "Replace", replaceAll: "Replace all",
      goTo: "Go to", loadMore: "Load more",

      /* rail + panels */
      files: "Files", templates: "Templates", insert: "Insert", layout: "Layout",
      tools: "Tools", dictionary: "Dictionary", spell: "Spell check", voice: "Voice",
      convert: "Converter", legal: "Legal", settings: "Settings",
      file: "File", home: "Home", edit: "Edit", view: "View", help: "Help",

      /* file menu */
      newDoc: "New document", newFromTemplate: "New from template",
      openFile: "Open / import file", recent: "Recent documents",
      myFiles: "My documents", exportDoc: "Export", printPdf: "Print / PDF",
      wordCount: "Word count", docInfo: "Document info",
      deleteConfirm: "Delete this document permanently? This cannot be undone.",

      /* formatting */
      style: "Style", fontHindi: "Hindi font", fontLatin: "Latin font",
      fontSize: "Size", lineSpacing: "Line spacing", paraSpacing: "Paragraph spacing",
      alignment: "Alignment", alignLeft: "Align left", alignCenter: "Center",
      alignRight: "Align right", alignJustify: "Justify",
      bold: "Bold", italic: "Italic", underline: "Underline", strike: "Strikethrough",
      superscript: "Superscript", subscript: "Subscript",
      textColor: "Text colour", highlight: "Highlight", clearFormat: "Clear formatting",
      bulletList: "Bulleted list", numberedList: "Numbered list",
      increaseIndent: "Increase indent", decreaseIndent: "Decrease indent",
      firstLine: "First-line indent", heading1: "Title", heading2: "Heading",
      heading3: "Sub-heading", body: "Body text", quote: "Quotation",
      signature: "Signature block", smallCaps: "Small caps", upperCase: "UPPERCASE",
      normalStyle: "Normal", courtStyle: "Court heading",

      /* page / layout */
      pageSetup: "Page setup", pageSize: "Paper size", orientation: "Orientation",
      portrait: "Portrait", landscape: "Landscape", margins: "Margins",
      top: "Top", right: "Right", bottom: "Bottom", left: "Left",
      marginPresets: "Margin presets", normalMargins: "Normal", narrowMargins: "Narrow",
      wideMargins: "Wide", courtMargins: "Court (1 inch)",
      headerFooter: "Header & footer", headerText: "Header text", footerText: "Footer text",
      pageNumbers: "Page numbers", pageNumberFormat: "Format",
      lineNumbers: "Line numbers", lineNumberEvery: "Every n lines",
      watermark: "Watermark", watermarkText: "Watermark text", opacity: "Opacity",
      pageBorder: "Page border", columns: "Columns", mm: "mm",
      showRuler: "Show ruler", continuous: "Continuous scroll", paged: "Paged view",
      focusMode: "Focus mode", typewriterMode: "Typewriter mode", pageMarks: "Formatting marks",

      /* insert */
      table: "Table", rows: "Rows", cols: "Columns", horizontalRule: "Divider line",
      pageBreak: "Page break", dateTime: "Date & time", symbols: "Symbols",
      field: "Document field", footnote: "Note", toc: "Table of contents",
      image: "Image", insertTable: "Insert table", insertImage: "Insert image",
      selectFile: "Choose file", symbolCategories: "Category",
      fieldCourt: "Court name", fieldCase: "Case number", fieldParty: "Party",
      fieldSections: "Sections", fieldPlace: "Place", fieldDate: "Date",
      fieldJudge: "Judge", fieldYear: "Year",

      /* tools */
      findReplace: "Find & replace", findText: "Find", replaceWith: "Replace with",
      caseConvert: "Change case", sentenceCase: "Sentence case", titleCase: "Title case",
      lowerCase: "lowercase", upperCase: "UPPERCASE", capitalize: "Capitalise",
      cleanup: "Clean up text", trimSpaces: "Remove extra spaces",
      smartQuotes: "Smart quotes", fixMatras: "Fix Devanagari matras",
      sortLines: "Sort lines", numberLines: "Number paragraphs", deDupe: "Remove duplicates",
      transliterate: "Transliterate", romanToHindi: "Roman → Devanagari",
      hindiToRoman: "Devanagari → Roman", wordGoal: "Word goal",
      readingTime: "Reading time", minutes: "min", words: "words", chars: "characters",
      paragraphs: "paragraphs", pages: "pages", sentences: "sentences",
      selectAll: "Select all text", copyAll: "Copy whole document",
      docStats: "Document statistics", applyToSelection: "Applies to the selection",

      /* dictionary */
      dictHindiToEnglish: "Hindi → English", dictEnglishToHindi: "English → Hindi",
      dictSearchPlaceholder: "Type a word…", dictMeaning: "Meaning",
      dictRelated: "Related entries", dictSuggestions: "Did you mean",
      dictSource: "Source", dictNoEntry: "No entry found. Try one of the suggestions below.",
      dictInsertWord: "Insert this word", dictAddToDict: "Add to dictionary",
      legalGlossary: "Legal glossary",

      /* spell check */
      spellIntro: "Checks Hindi and English spelling across the whole document using the built-in offline dictionary.",
      spellStart: "Start check", spellNoErrors: "No spelling errors found ✓",
      spellErrors: "possible issues found", spellSuggestions: "Suggestions",
      spellAdd: "Add word", spellJump: "Go to", spellIgnore: "Ignore",
      spellPersonal: "Personal dictionary", spellPersonalEmpty: "No custom words yet.",
      spellLive: "Underline errors as I type", spellCheckHindi: "Check Hindi",
      spellCheckEnglish: "Check English", dictSize: "Dictionary size",

      /* voice */
      voiceTitle: "Voice typing", voiceIntro: "Speak and the text appears here. Uses your device speech service.",
      voiceStart: "Start listening", voiceStop: "Stop", voiceLang: "Language",
      voiceReady: "Ready", voiceListening: "Listening…", voicePaused: "Stopped",
      voiceInsert: "Insert into document", voiceClear: "Clear",
      voiceUnsupported: "Speech recognition is not available on this device. Install Google speech services or type instead.",
      voiceTip: "Tip: speak in a quiet room; say “dhara”, “nyayalaya” clearly.",
      voiceHindi: "Hindi (India)", voiceEnglishIN: "English (India)", voiceEnglishUS: "English (US)",

      /* converter */
      convTitle: "Legacy font converter", convIntro: "Convert Kruti Dev / DevLys / Chanakya / Remington text to Unicode and back.",
      convKrutiToUni: "Kruti Dev → Unicode", convUniToKruti: "Unicode → Kruti Dev",
      convSourceFont: "Source font", convInput: "Paste legacy text here (e.g. U;k;ky;)",
      convOutput: "Unicode output appears here", convPaste: "Paste from clipboard",
      convInsert: "Insert into document", convCopy: "Copy",
      convNote: "Kruti Dev 010/016 is fully supported and round-trip tested. Chanakya and Remington are experimental — check the result.",
      convExperimental: "experimental", convSample: "Load sample",

      /* legal */
      legalTitle: "Legal tools", bnsIpc: "BNS ↔ IPC", bnssCrpc: "BNSS ↔ CrPC",
      limitation: "Limitation periods", interestCalc: "Interest calculator",
      dateCalc: "Date calculator", legalForms: "Quick forms",
      fromDate: "From date", days: "Days", principal: "Principal (₹)", rate: "Annual rate (%)",
      years: "Years", calculate: "Calculate", result: "Result", lastDate: "Last date",
      simpleInterest: "Simple interest", compoundInterest: "Compound interest",
      legalDisclaimer: "Indicative only — verify against the official Gazette text before filing.",
      offence: "Subject", section: "Section", provision: "Provision",

      /* export */
      exportTitle: "Export", exportIntro: "Files are saved to Documents/NyayaLekh on your tablet where WPS Office can open them.",
      fmtDocx: "Word (.docx)", fmtDocxHint: "Opens in MS Word, WPS Office and Google Docs",
      fmtPdf: "PDF", fmtPdfHint: "Print-ready; uses Android ‘Save as PDF’",
      fmtHtml: "Web page (.html)", fmtHtmlHint: "For e-mail or websites",
      fmtTxt: "Plain text (.txt)", fmtTxtHint: "Simple, unformatted text",
      fmtRtf: "Rich text (.rtf)", fmtRtfHint: "For older software",
      fmtMd: "Markdown (.md)", fmtMdHint: "For notes and publishing tools",
      copyDoc: "Copy entire document", share: "Share", downloaded: "Downloaded",
      exportedTo: "Saved to", exportFailed: "Could not save the file",

      /* import */
      importTitle: "Open / import", importIntro: "Open files created in WPS Office, MS Word, LibreOffice or Google Docs.",
      importPick: "Choose a file from this device",
      importNote: "Tip: older .doc files should first be re-saved as .docx in WPS Office. Scanned PDFs need OCR and cannot be imported.",
      legacyDetected: "Legacy font detected",
      legacyQuestion: "This text looks like Kruti Dev / legacy font. Convert it to Unicode?",
      convertNow: "Convert to Unicode", imported: "Imported", paragraphsImported: "paragraphs imported",

      /* settings */
      settingsTitle: "Settings", language: "Language", interfaceLanguage: "Interface language",
      theme: "Theme", themeAuto: "System", themeLight: "Light", themeDark: "Dark", themeSepia: "Sepia",
      accent: "Accent colour", editorOptions: "Editor", autosave: "Autosave",
      autosaveHint: "Save changes automatically", autoSpellHint: "Underline misspelt words",
      defaultFonts: "Default fonts", defaultHindiFont: "Default Hindi font",
      defaultLatinFont: "Default Latin font", defaultSize: "Default size",
      fontLibrary: "Font library", fontLibraryHint: "All fonts are bundled and work offline",
      fontsAvailable: "fonts available", licence: "Licence", about: "About",
      helpTitle: "Help & shortcuts", shortcuts: "Keyboard shortcuts",
      aboutTitle: "About NyayaLekh", version: "Version", privacyNote: "Everything stays on your device — no accounts, no tracking, no ads.",
      resetSettings: "Reset all settings", resetDone: "Settings restored to defaults",
      languageChanged: "Interface language changed",
      dataPrivacy: "Privacy", openSource: "Open source & credits",
      writingSettings: "Writing", documentDefaults: "New documents",

      /* misc */
      courtSettings: "Court details", courtType: "Court type", place: "Place / district",
      courtFullName: "Full court name (optional)", judgeName: "Judge name",
      caseNo: "Case number", party: "Party", sections: "Sections", policeStation: "Police station",
      prosecutor: "Public prosecutor", courtDetailsSaved: "Court details saved",
      templatesHint: "Court, case number, parties and date fill in automatically from Court details.",
      templateApplied: "Template inserted", newDocumentCreated: "New document created",
      nothingToUndo: "Nothing to undo", selectTextFirst: "Select some text first",
      operationDone: "Done", chooseTemplate: "Choose a template", all: "All",
      criminal: "Criminal", civil: "Civil", miscCat: "Miscellaneous",
      insertIntoCurrent: "Insert into current document", useAsNew: "Use as new document",
      previewLabel: "Preview", wordsLabel: "words",
      readingTimeVal: "Reading time",
      offline: "Offline", free: "Free", proFeature: "Included free",
      docLanguageNote: "Document content is not affected by the interface language.",
      searchDocs: "Search documents", noDocs: "No saved documents yet.",
      pageOf: "Page {n} of {total}",
      zoom: "Zoom", fitWidth: "Fit width", actualSize: "100%",
      line: "Line", column: "Column",
      somethingWentWrong: "Something went wrong",
      copiedToClipboard: "Copied to clipboard",
      fixedMatras: "Matras corrected",
      noTextSelected: "Select plain text in the document first",
      pdfNeedsText: "Could not extract text from this PDF (it may be a scan).",
      unsupportedFile: "This file type is not supported.",
      oldDoc: "Legacy .doc files are not supported — re-save as .docx in WPS Office.",
      imageInserted: "Image inserted",
      tableInserted: "Table inserted",
      tocInserted: "Table of contents inserted",
      tocEmpty: "Add headings to the document first",
      textStats: "{words} words · {chars} characters",
      savedAt: "Saved at {time}"
    },

    hi: {
      appName: "न्यायलेख",
      appTagline: "विधिक प्रारूपण सूट",
      menu: "मेन्यू",
      untitled: "अनाम दस्तावेज़",
      saved: "सहेजा गया",
      saving: "सहेजा जा रहा है…",
      unsaved: "असहेजा",
      savingError: "सहेजने में त्रुटि",
      undo: "पूर्ववत", redo: "पुनः", search: "खोजें", export: "निर्यात",
      close: "बंद करें", cancel: "रद्द करें", save: "सहेजें", apply: "लागू करें", insert: "जोड़ें",
      delete: "हटाएँ", rename: "नाम बदलें", duplicate: "प्रतिलिपि", open: "खोलें",
      back: "वापस", done: "पूर्ण", add: "जोड़ें", remove: "हटाएँ", reset: "रीसेट",
      yes: "हाँ", no: "नहीं", ok: "ठीक", none: "कोई नहीं", custom: "कस्टम",
      more: "अधिक", preview: "पूर्वावलोकन", total: "कुल", on: "चालू", off: "बंद",
      copy: "प्रतिलिपि", copied: "कॉपी हो गया", replace: "बदलें", replaceAll: "सभी बदलें",
      goTo: "जाएँ", loadMore: "और दिखाएँ",

      files: "फ़ाइलें", templates: "प्रारूप", insert: "जोड़ें", layout: "लेआउट",
      tools: "औज़ार", dictionary: "शब्दकोश", spell: "वर्तनी", voice: "बोलें",
      convert: "कन्वर्टर", legal: "विधिक", settings: "सेटिंग",
      file: "फ़ाइल", home: "होम", edit: "संपादन", view: "दृश्य", help: "सहायता",

      newDoc: "नया दस्तावेज़", newFromTemplate: "प्रारूप से नया",
      openFile: "फ़ाइल खोलें / आयात", recent: "हाल के दस्तावेज़",
      myFiles: "मेरे दस्तावेज़", exportDoc: "निर्यात", printPdf: "प्रिंट / PDF",
      wordCount: "शब्द गणना", docInfo: "दस्तावेज़ जानकारी",
      deleteConfirm: "क्या आप इस दस्तावेज़ को स्थायी रूप से हटाना चाहते हैं? यह वापस नहीं आएगा।",

      style: "शैली", fontHindi: "हिन्दी फ़ॉन्ट", fontLatin: "लैटिन फ़ॉन्ट",
      fontSize: "आकार", lineSpacing: "पंक्ति अंतर", paraSpacing: "अनुच्छेद अंतर",
      alignment: "संरेखण", alignLeft: "बाएँ", alignCenter: "केंद्र",
      alignRight: "दाएँ", alignJustify: "सीधा (Justify)",
      bold: "मोटा", italic: "तिरछा", underline: "रेखांकित", strike: "काटें",
      superscript: "उर्ध्व", subscript: "अधो",
      textColor: "पाठ रंग", highlight: "हाइलाइट", clearFormat: "फ़ॉर्मैट हटाएँ",
      bulletList: "बिंदु सूची", numberedList: "क्रमांक सूची",
      increaseIndent: "इंडेंट बढ़ाएँ", decreaseIndent: "इंडेंट घटाएँ",
      firstLine: "पहली पंक्ति इंडेंट", heading1: "शीर्षक", heading2: "उपशीर्षक",
      heading3: "उप-उपशीर्षक", body: "सामान्य पाठ", quote: "उद्धरण",
      signature: "हस्ताक्षर खंड", smallCaps: "छोटे अक्षर", upperCase: "बड़े अक्षर",
      normalStyle: "सामान्य", courtStyle: "न्यायालय शीर्षक",

      pageSetup: "पृष्ठ सेटअप", pageSize: "कागज़ आकार", orientation: "दिशा",
      portrait: "खड़ा", landscape: "आड़ा", margins: "मार्जिन",
      top: "ऊपर", right: "दाएँ", bottom: "नीचे", left: "बाएँ",
      marginPresets: "मार्जिन प्रीसेट", normalMargins: "सामान्य", narrowMargins: "संकीर्ण",
      wideMargins: "चौड़ा", courtMargins: "न्यायालय (1 इंच)",
      headerFooter: "हेडर व फुटर", headerText: "हेडर पाठ", footerText: "फुटर पाठ",
      pageNumbers: "पृष्ठ क्रमांक", pageNumberFormat: "प्रारूप",
      lineNumbers: "पंक्ति क्रमांक", lineNumberEvery: "प्रत्येक n पंक्ति",
      watermark: "वॉटरमार्क", watermarkText: "वॉटरमार्क पाठ", opacity: "पारदर्शिता",
      pageBorder: "पृष्ठ किनारा", columns: "स्तंभ", mm: "मिमी",
      showRuler: "रूलर दिखाएँ", continuous: "सतत स्क्रॉल", paged: "पृष्ठ दृश्य",
      focusMode: "फ़ोकस मोड", typewriterMode: "टाइपराइटर मोड", pageMarks: "फ़ॉर्मैटिंग चिह्न",

      table: "तालिका", rows: "पंक्तियाँ", cols: "स्तंभ", horizontalRule: "विभाजक रेखा",
      pageBreak: "पृष्ठ विराम", dateTime: "तिथि व समय", symbols: "प्रतीक",
      field: "दस्तावेज़ फ़ील्ड", footnote: "टिप्पणी", toc: "विषय-सूची",
      image: "चित्र", insertTable: "तालिका जोड़ें", insertImage: "चित्र जोड़ें",
      selectFile: "फ़ाइल चुनें", symbolCategories: "श्रेणी",
      fieldCourt: "न्यायालय नाम", fieldCase: "प्रकरण संख्या", fieldParty: "पक्षकार",
      fieldSections: "धाराएँ", fieldPlace: "स्थान", fieldDate: "तिथि",
      fieldJudge: "न्यायाधीश", fieldYear: "वर्ष",

      findReplace: "खोजें व बदलें", findText: "खोजें", replaceWith: "इससे बदलें",
      caseConvert: "अक्षर बदलें", sentenceCase: "वाक्य शैली", titleCase: "शीर्षक शैली",
      lowerCase: "छोटे अक्षर", upperCase: "बड़े अक्षर", capitalize: "पहला अक्षर बड़ा",
      cleanup: "पाठ साफ़ करें", trimSpaces: "अतिरिक्त स्पेस हटाएँ",
      smartQuotes: "स्मार्ट कोट्स", fixMatras: "देवनागरी मात्रा सुधारें",
      sortLines: "पंक्तियाँ क्रम में", numberLines: "अनुच्छेद क्रमांकित करें", deDupe: "पुनरावृत्ति हटाएँ",
      transliterate: "लिप्यंतरण", romanToHindi: "रोमन → देवनागरी",
      hindiToRoman: "देवनागरी → रोमन", wordGoal: "शब्द लक्ष्य",
      readingTime: "पढ़ने का समय", minutes: "मिनट", words: "शब्द", chars: "अक्षर",
      paragraphs: "अनुच्छेद", pages: "पृष्ठ", sentences: "वाक्य",
      selectAll: "सारा पाठ चुनें", copyAll: "पूरा दस्तावेज़ कॉपी करें",
      docStats: "दस्तावेज़ आँकड़े", applyToSelection: "चयन पर लागू होता है",

      dictHindiToEnglish: "हिन्दी → अंग्रेज़ी", dictEnglishToHindi: "अंग्रेज़ी → हिन्दी",
      dictSearchPlaceholder: "शब्द लिखें…", dictMeaning: "अर्थ",
      dictRelated: "संबंधित प्रविष्टियाँ", dictSuggestions: "शायद आप यह चाहते थे",
      dictSource: "स्रोत", dictNoEntry: "प्रविष्टि नहीं मिली। नीचे सुझाव देखें।",
      dictInsertWord: "यह शब्द जोड़ें", dictAddToDict: "शब्दकोश में जोड़ें",
      legalGlossary: "विधिक शब्दावली",

      spellIntro: "अंतर्निहित ऑफ़लाइन शब्दकोश से पूरे दस्तावेज़ की हिन्दी व अंग्रेज़ी वर्तनी जाँचें।",
      spellStart: "जाँच शुरू करें", spellNoErrors: "कोई वर्तनी त्रुटि नहीं मिली ✓",
      spellErrors: "संभावित त्रुटियाँ मिलीं", spellSuggestions: "सुझाव",
      spellAdd: "शब्द जोड़ें", spellJump: "वहाँ जाएँ", spellIgnore: "छोड़ें",
      spellPersonal: "व्यक्तिगत शब्दकोश", spellPersonalEmpty: "अभी कोई शब्द नहीं जोड़ा।",
      spellLive: "टाइप करते समय त्रुटियाँ रेखांकित करें", spellCheckHindi: "हिन्दी जाँचें",
      spellCheckEnglish: "अंग्रेज़ी जाँचें", dictSize: "शब्दकोश आकार",

      voiceTitle: "बोलकर लिखें", voiceIntro: "बोलिए और पाठ यहाँ दिखेगा। डिवाइस की वाक् सेवा उपयोग होती है।",
      voiceStart: "सुनना शुरू करें", voiceStop: "रोकें", voiceLang: "भाषा",
      voiceReady: "तैयार", voiceListening: "सुन रहा है…", voicePaused: "रुका हुआ",
      voiceInsert: "दस्तावेज़ में जोड़ें", voiceClear: "साफ़ करें",
      voiceUnsupported: "इस डिवाइस पर वाक् पहचान उपलब्ध नहीं है। Google वाक् सेवा स्थापित करें या टाइप करें।",
      voiceTip: "सुझाव: शांत कमरे में स्पष्ट बोलें; ‘धारा’, ‘न्यायालय’ जैसे शब्द बोलें।",
      voiceHindi: "हिन्दी (भारत)", voiceEnglishIN: "अंग्रेज़ी (भारत)", voiceEnglishUS: "अंग्रेज़ी (US)",

      convTitle: "लीगेसी फ़ॉन्ट कन्वर्टर", convIntro: "कृतिदेव / देवलीस / चाणक्य / रेमिंग्टन पाठ को यूनिकोड में और वापस बदलें।",
      convKrutiToUni: "कृतिदेव → यूनिकोड", convUniToKruti: "यूनिकोड → कृतिदेव",
      convSourceFont: "स्रोत फ़ॉन्ट", convInput: "पुराने फ़ॉन्ट का पाठ यहाँ चिपकाएँ (जैसे U;k;ky;)",
      convOutput: "यूनिकोड परिणाम यहाँ", convPaste: "क्लिपबोर्ड से चिपकाएँ",
      convInsert: "दस्तावेज़ में जोड़ें", convCopy: "प्रतिलिपि",
      convNote: "कृतिदेव 010/016 पूर्णतः समर्थित है। चाणक्य व रेमिंग्टन प्रायोगिक हैं — परिणाम जाँचें।",
      convExperimental: "प्रायोगिक", convSample: "नमूना लोड करें",

      legalTitle: "विधिक उपकरण", bnsIpc: "BNS ↔ IPC", bnssCrpc: "BNSS ↔ CrPC",
      limitation: "सीमा अवधि", interestCalc: "ब्याज कैलकुलेटर",
      dateCalc: "तिथि गणना", legalForms: "त्वरित प्रपत्र",
      fromDate: "आरंभ तिथि", days: "दिन", principal: "मूलधन (₹)", rate: "वार्षिक दर (%)",
      years: "वर्ष", calculate: "गणना करें", result: "परिणाम", lastDate: "अंतिम तिथि",
      simpleInterest: "साधारण ब्याज", compoundInterest: "चक्रवृद्धि ब्याज",
      legalDisclaimer: "केवल संकेतात्मक — फाइलिंग से पहले आधिकारिक राजपत्र से पुष्टि करें।",
      offence: "विषय", section: "धारा", provision: "प्रावधान",

      exportTitle: "निर्यात", exportIntro: "फ़ाइलें टैबलेट के Documents/NyayaLekh में सहेजी जाती हैं, जहाँ से WPS Office खोल सकता है।",
      fmtDocx: "Word (.docx)", fmtDocxHint: "MS Word, WPS Office व Google Docs में खुलता है",
      fmtPdf: "PDF", fmtPdfHint: "प्रिंट-योग्य; Android ‘Save as PDF’ उपयोग करता है",
      fmtHtml: "वेब पेज (.html)", fmtHtmlHint: "ई-मेल या वेबसाइट हेतु",
      fmtTxt: "सादा पाठ (.txt)", fmtTxtHint: "सरल, बिना फ़ॉर्मैटिंग",
      fmtRtf: "रिच टेक्स्ट (.rtf)", fmtRtfHint: "पुराने सॉफ़्टवेयर हेतु",
      fmtMd: "मार्कडाउन (.md)", fmtMdHint: "नोट्स व प्रकाशन उपकरण हेतु",
      copyDoc: "पूरा दस्तावेज़ कॉपी करें", share: "साझा करें", downloaded: "डाउनलोड हुआ",
      exportedTo: "यहाँ सहेजा गया", exportFailed: "फ़ाइल सहेजी नहीं जा सकी",

      importTitle: "खोलें / आयात", importIntro: "WPS Office, MS Word, LibreOffice या Google Docs से बनी फ़ाइलें खोलें।",
      importPick: "इस डिवाइस से फ़ाइल चुनें",
      importNote: "सुझाव: पुरानी .doc फ़ाइल पहले WPS Office में .docx के रूप में सहेजें। स्कैन की PDF आयात नहीं हो सकती।",
      legacyDetected: "पुराना फ़ॉन्ट मिला",
      legacyQuestion: "यह पाठ कृतिदेव/लीगेसी फ़ॉन्ट जैसा लगता है। इसे यूनिकोड में बदलें?",
      convertNow: "यूनिकोड में बदलें", imported: "आयात हुआ", paragraphsImported: "अनुच्छेद आयात हुए",

      settingsTitle: "सेटिंग", language: "भाषा", interfaceLanguage: "इंटरफ़ेस भाषा",
      theme: "थीम", themeAuto: "सिस्टम", themeLight: "हल्का", themeDark: "गहरा", themeSepia: "सेपिया",
      accent: "मुख्य रंग", editorOptions: "एडिटर", autosave: "स्वतः सहेजें",
      autosaveHint: "परिवर्तन स्वतः सहेजें", autoSpellHint: "गलत शब्दों के नीचे रेखा",
      defaultFonts: "डिफ़ॉल्ट फ़ॉन्ट", defaultHindiFont: "डिफ़ॉल्ट हिन्दी फ़ॉन्ट",
      defaultLatinFont: "डिफ़ॉल्ट लैटिन फ़ॉन्ट", defaultSize: "डिफ़ॉल्ट आकार",
      fontLibrary: "फ़ॉन्ट लाइब्रेरी", fontLibraryHint: "सभी फ़ॉन्ट ऐप में हैं और ऑफ़लाइन चलते हैं",
      fontsAvailable: "फ़ॉन्ट उपलब्ध", licence: "लाइसेंस", about: "परिचय",
      helpTitle: "सहायता व शॉर्टकट", shortcuts: "कीबोर्ड शॉर्टकट",
      aboutTitle: "न्यायलेख के बारे में", version: "संस्करण", privacyNote: "सब कुछ आपके डिवाइस पर — कोई खाता, ट्रैकिंग या विज्ञापन नहीं।",
      resetSettings: "सभी सेटिंग रीसेट करें", resetDone: "सेटिंग डिफ़ॉल्ट पर लौटीं",
      languageChanged: "इंटरफ़ेस भाषा बदली गई",
      dataPrivacy: "गोपनीयता", openSource: "ओपन सोर्स व श्रेय",
      writingSettings: "लेखन", documentDefaults: "नए दस्तावेज़",

      courtSettings: "न्यायालय विवरण", courtType: "न्यायालय प्रकार", place: "स्थान / जिला",
      courtFullName: "न्यायालय का पूरा नाम (वैकल्पिक)", judgeName: "न्यायाधीश का नाम",
      caseNo: "प्रकरण संख्या", party: "पक्षकार", sections: "धाराएँ", policeStation: "थाना",
      prosecutor: "लोक अभियोजक", courtDetailsSaved: "न्यायालय विवरण सहेजा गया",
      templatesHint: "न्यायालय, प्रकरण संख्या, पक्षकार व तिथि स्वतः ‘न्यायालय विवरण’ से भरते हैं।",
      templateApplied: "प्रारूप जोड़ा गया", newDocumentCreated: "नया दस्तावेज़ बना",
      nothingToUndo: "पूर्ववत करने हेतु कुछ नहीं", selectTextFirst: "पहले पाठ चुनें",
      operationDone: "हो गया", chooseTemplate: "प्रारूप चुनें", all: "सभी",
      criminal: "फौजदारी", civil: "दीवानी", miscCat: "विविध",
      insertIntoCurrent: "वर्तमान दस्तावेज़ में जोड़ें", useAsNew: "नया दस्तावेज़ बनाएँ",
      previewLabel: "पूर्वावलोकन", wordsLabel: "शब्द",
      readingTimeVal: "पढ़ने का समय",
      offline: "ऑफ़लाइन", free: "निःशुल्क", proFeature: "निःशुल्क उपलब्ध",
      docLanguageNote: "इंटरफ़ेस भाषा का दस्तावेज़ के पाठ पर कोई प्रभाव नहीं पड़ता।",
      searchDocs: "दस्तावेज़ खोजें", noDocs: "अभी कोई दस्तावेज़ सहेजा नहीं।",
      pageOf: "पृष्ठ {n} / {total}",
      zoom: "ज़ूम", fitWidth: "चौड़ाई में", actualSize: "100%",
      line: "पंक्ति", column: "स्तंभ",
      somethingWentWrong: "कुछ गड़बड़ हुई",
      copiedToClipboard: "क्लिपबोर्ड पर कॉपी हुआ",
      fixedMatras: "मात्राएँ सुधारी गईं",
      noTextSelected: "पहले दस्तावेज़ में सादा पाठ चुनें",
      pdfNeedsText: "इस PDF से पाठ नहीं निकाला जा सका (संभवतः स्कैन है)।",
      unsupportedFile: "यह फ़ाइल प्रकार समर्थित नहीं है।",
      oldDoc: "पुरानी .doc फ़ाइल समर्थित नहीं — WPS Office में .docx के रूप में सहेजें।",
      imageInserted: "चित्र जोड़ा गया",
      tableInserted: "तालिका जोड़ी गई",
      tocInserted: "विषय-सूची जोड़ी गई",
      tocEmpty: "पहले दस्तावेज़ में शीर्षक जोड़ें",
      textStats: "{words} शब्द · {chars} अक्षर",
      savedAt: "{time} पर सहेजा गया"
    }
  };


  /* -- runtime additions (v2 shell) -------------------------------------- */
  var EXTRA = {
    en: {
      cancel: "Cancel", save: "Save", rename: "Rename", add: "Add", replace: "Replace",
      reset: "Reset", heading1: "Title", heading2: "Heading", quote: "Quotation",
      selectTextFirst: "Place the cursor in the document first"
    },
    hi: {
      cancel: "रद्द करें", save: "सहेजें", rename: "नाम बदलें", add: "जोड़ें",
      replace: "बदलें", reset: "रीसेट", heading1: "शीर्षक", heading2: "उपशीर्षक",
      quote: "उद्धरण", selectTextFirst: "पहले दस्तावेज़ में कर्सर रखें"
    }
  };
  Object.keys(EXTRA).forEach(function (k) {
    Object.keys(EXTRA[k]).forEach(function (key) { STRINGS[k][key] = EXTRA[k][key]; });
  });

  var lang = "en";

  function format(s, vars) {
    if (!vars) return s;
    return s.replace(/\{(\w+)\}/g, function (m, k) {
      return vars[k] !== undefined ? String(vars[k]) : m;
    });
  }

  ND.t = function (key, vars) {
    var table = STRINGS[lang] || STRINGS.en;
    var s = table[key];
    if (s === undefined) s = STRINGS.en[key];
    if (s === undefined) return key;
    return format(s, vars);
  };

  ND.lang = function () { return lang; };

  ND.setLang = function (next, opts) {
    lang = next === "hi" ? "hi" : "en";
    try { localStorage.setItem("nd.lang", lang); } catch (e) {}
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("data-lang", lang);
    // static labels
    document.querySelectorAll("[data-i18n]").forEach(function (n) {
      n.textContent = ND.t(n.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (n) {
      n.title = ND.t(n.getAttribute("data-i18n-title"));
      n.setAttribute("aria-label", n.title);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(function (n) {
      n.placeholder = ND.t(n.getAttribute("data-i18n-ph"));
    });
    document.dispatchEvent(new CustomEvent("nd:lang", { detail: { lang: lang } }));
    if (!opts || opts.toast !== false) {
      // translation of the confirmation itself
      var msg = lang === "hi" ? "इंटरफ़ेस भाषा: हिन्दी" : "Interface language: English";
      if (typeof ND.util !== "undefined" && ND.util.toast) ND.util.toast(msg, "ok", 1400);
    }
    return lang;
  };

  ND.toggleLang = function () { return ND.setLang(lang === "en" ? "hi" : "en"); };

  ND.initLang = function () {
    var stored = null;
    try { stored = localStorage.getItem("nd.lang"); } catch (e) {}
    lang = stored === "hi" ? "hi" : "en";        // English is the default
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("data-lang", lang);
  };

  ND.STRINGS = STRINGS;
})(window);
