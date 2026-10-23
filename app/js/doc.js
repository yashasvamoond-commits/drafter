/* =============================================================================
 * NyayaLekh — document model, court templates, import and export.
 * ========================================================================== */
(function (global) {
  "use strict";
  var ND = (global.ND = global.ND || {});
  var U = ND.util, T = ND.text;

  var D = (ND.doc = {});

  /* ==========================================================================
   * 1. MODEL
   * ======================================================================== */
  D.PAGE_SIZES = {
    A4: { w: 210, h: 297, label: "A4 · 210 × 297 mm" },
    Legal: { w: 215.9, h: 355.6, label: "Legal · 8.5 × 14 in" },
    Letter: { w: 215.9, h: 279.4, label: "Letter · 8.5 × 11 in" },
    A5: { w: 148, h: 210, label: "A5 · 148 × 210 mm" },
    A3: { w: 297, h: 420, label: "A3 · 297 × 420 mm" }
  };

  D.MARGIN_PRESETS = {
    normal: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
    narrow: { top: 12.7, right: 12.7, bottom: 12.7, left: 12.7 },
    wide: { top: 38.1, right: 38.1, bottom: 38.1, left: 38.1 },
    court: { top: 25.4, right: 25.4, bottom: 25.4, left: 30 },
    binder: { top: 25.4, right: 25.4, bottom: 25.4, left: 38.1 }
  };

  D.newBlock = function (type, html, extra) {
    return Object.assign({
      id: U.uid("b"),
      type: type || "p",
      html: html || "",
      align: "",
      indent: 0,
      marker: ""
    }, extra || {});
  };

  D.newDoc = function (opts) {
    var p = ND.prefs;
    return Object.assign({
      id: U.uid("doc"),
      title: ND.t ? ND.t("untitled") : "Untitled document",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      page: {
        size: p.pageSize || "A4",
        orientation: p.orientation || "portrait",
        margins: Object.assign({}, p.margins),
        numbers: true,
        numberFormat: "n",
        headerText: "",
        footerText: "",
        border: false,
        columns: 1,
        lineNumbers: false,
        watermark: "",
        watermarkOpacity: 0.08
      },
      style: {
        devFont: p.devFont,
        latinFont: p.latinFont,
        size: p.size,
        lh: p.lh,
        paraSpacing: p.paraSpacing,
        justify: false
      },
      court: { type: "JM", place: "", name: "", judge: "", prosecutor: "", caseNo: "", party: "", sections: "", ps: "" },
      meta: { author: "", subject: "", keywords: "" },
      blocks: [D.newBlock("p", "")]
    }, opts || {});
  };

  /** Migrate documents saved by v1 so nothing is lost on upgrade. */
  D.migrate = function (doc) {
    if (!doc) return doc;
    doc.page = doc.page || {};
    var p = doc.page;
    p.size = p.size || "A4";
    p.orientation = p.orientation || "portrait";
    p.margins = Object.assign({ top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 }, p.margins || {});
    if (p.numbers === undefined) p.numbers = true;
    if (p.columns === undefined) p.columns = 1;
    if (!p.numberFormat) p.numberFormat = "n";
    doc.style = doc.style || {};
    var s = doc.style;
    if (!s.devFont) s.devFont = (s.font === "sans" ? "noto-sans-dev" : s.font === "tiro" ? "tiro-dev" : "noto-serif-dev");
    if (!s.latinFont) s.latinFont = "tinos";
    if (!s.size) s.size = 12;
    if (!s.lh) s.lh = 1.65;
    if (s.paraSpacing === undefined) s.paraSpacing = 6;
    doc.court = doc.court || {};
    doc.meta = doc.meta || { author: "", subject: "", keywords: "" };
    (doc.blocks || []).forEach(function (b) {
      if (!b.id) b.id = U.uid("b");
      if (b.type === "center") { b.type = "p"; b.align = "center"; }
      if (b.type === "right") { b.type = "p"; b.align = "right"; }
      if (!b.type) b.type = "p";
      if (b.html === undefined) b.html = "";
    });
    if (!doc.blocks || !doc.blocks.length) doc.blocks = [D.newBlock("p", "")];
    return doc;
  };

  D.plainText = function (doc) {
    return (doc.blocks || []).map(function (b) {
      return U.stripTags(b.html || "").replace(/\u00a0/g, " ");
    }).join("\n");
  };

  D.stats = function (doc) {
    var st = U.wordStats(D.plainText(doc));
    st.paragraphs = Math.max(1, (doc.blocks || []).filter(function (b) { return (b.type === "p" || !b.type || b.type === "li"); }).length);
    return st;
  };

  /* ==========================================================================
   * 2. COURTS & VARIABLES
   * ======================================================================== */
  D.COURTS = [
    { id: "JM", hi: "न्यायिक मजिस्ट्रेट", en: "Judicial Magistrate", prefix: "न्यायालय श्रीमान न्यायिक मजिस्ट्रेट" },
    { id: "ACJM", hi: "अपर मुख्य न्यायिक मजिस्ट्रेट", en: "Additional Chief Judicial Magistrate", prefix: "न्यायालय श्रीमान अपर मुख्य न्यायिक मजिस्ट्रेट" },
    { id: "CJM", hi: "मुख्य न्यायिक मजिस्ट्रेट", en: "Chief Judicial Magistrate", prefix: "न्यायालय श्रीमान मुख्य न्यायिक मजिस्ट्रेट" },
    { id: "ADJ", hi: "अपर जिला एवं सत्र न्यायाधीश", en: "Additional District & Sessions Judge", prefix: "न्यायालय श्रीमान अपर जिला एवं सत्र न्यायाधीश" },
    { id: "DSJ", hi: "जिला एवं सत्र न्यायाधीश", en: "District & Sessions Judge", prefix: "न्यायालय श्रीमान जिला एवं सत्र न्यायाधीश" },
    { id: "CJMAG", hi: "मुख्य न्यायिक मजिस्ट्रेट (ग्रामीण)", en: "CJM (Rural)", prefix: "न्यायालय श्रीमान मुख्य न्यायिक मजिस्ट्रेट (ग्रामीण)" },
    { id: "CIVIL", hi: "सिविल न्यायाधीश", en: "Civil Judge", prefix: "न्यायालय श्रीमान सिविल न्यायाधीश" },
    { id: "FAMILY", hi: "पारिवारिक न्यायालय", en: "Family Court", prefix: "न्यायालय श्रीमान पारिवारिक न्यायाधीश" },
    { id: "MACT", hi: "मोटर दुर्घटना दावा अधिकरण", en: "Motor Accident Claims Tribunal", prefix: "न्यायालय श्रीमान अध्यक्ष, मोटर दुर्घटना दावा अधिकरण" },
    { id: "RENT", hi: "नियंत्रक, किराया नियंत्रण न्यायालय", en: "Rent Control Tribunal", prefix: "न्यायालय श्रीमान नियंत्रक, किराया नियंत्रण" },
    { id: "LOK", hi: "लोक अदालत", en: "Lok Adalat", prefix: "राजस्थान राज्य विधिक सेवा प्राधिकरण — लोक अदालत" },
    { id: "HC", hi: "राजस्थान उच्च न्यायालय", en: "Rajasthan High Court", prefix: "राजस्थान उच्च न्यायालय, जोधपुर / जयपुर" },
    { id: "CONSUMER", hi: "जिला उपभोक्ता विवाद प्रतितोष आयोग", en: "District Consumer Commission", prefix: "जिला उपभोक्ता विवाद प्रतितोष आयोग" },
    { id: "LABOUR", hi: "श्रम न्यायालय", en: "Labour Court", prefix: "न्यायालय श्रीमान श्रम न्यायाधीश" }
  ];

  D.courtName = function (doc) {
    var c = doc.court || {};
    var preset = D.COURTS.filter(function (x) { return x.id === c.type; })[0] || D.COURTS[0];
    var base = c.name && c.name.trim() ? c.name.trim() : preset.prefix;
    var place = (c.place || "").trim();
    if (place && base.indexOf(place) === -1) base += ", " + place;
    return base;
  };

  D.vars = function (doc) {
    var c = doc.court || {};
    var d = new Date();
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    return {
      "{{court}}": D.courtName(doc),
      "{{judge}}": c.judge || "……………………",
      "{{place}}": c.place || "जयपुर",
      "{{date}}": pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear(),
      "{{today}}": pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear(),
      "{{year}}": String(d.getFullYear()),
      "{{caseNo}}": c.caseNo || "………/{{year}}",
      "{{party}}": c.party || "राज्य राजस्थान बनाम ………………",
      "{{sections}}": c.sections || "…………",
      "{{ps}}": c.ps || "थाना …………",
      "{{prosecutor}}": c.prosecutor || "लोक अभियोजक",
      "{{clerk}}": c.clerk || "………"
    };
  };

  D.applyVars = function (text, doc) {
    var v = D.vars(doc);
    return String(text || "").replace(/\{\{[a-zA-Z]+\}\}/g, function (m) { return v[m] !== undefined ? v[m] : m; });
  };

  /* ==========================================================================
   * 3. TEMPLATES
   * ======================================================================== */
  function hi(id, cat, title, sub, blocks) { return { id: id, cat: cat, lang: "hi", title: title, sub: sub, blocks: blocks }; }
  function en(id, cat, title, sub, blocks) { return { id: id, cat: cat, lang: "en", title: title, sub: sub, blocks: blocks }; }

  ND.templates = [
    /* ------------------------------------------------------------ criminal */
    hi("bail", "criminal", "अंतरिम जमानत आवेदन पत्र", "धारा 482 BNSS · न्यायिक मजिस्ट्रेट के समक्ष", [
      "{{court}}", "प्रकरण संख्या {{caseNo}}", "{{party}}",
      "आवेदक / अभियुक्त — …………………………", "धाराएँ — {{sections}} · {{ps}}",
      "=== आवेदन पत्र ===", "महोदय,",
      "विनम्र निवेदन है कि आवेदक के विरुद्ध उपरोक्त प्रकरण में संलग्न धाराओं के अंतर्गत परिवाद/प्रकृति आख्या प्रस्तुत की गई है। आवेदक निर्दोष है तथा उसे केवल सौहार्दपूर्ण व्यापारिक विवाद के कारण झूठा फँसाया गया है।",
      "आवेदक स्थायी निवासी है, उसका कोई पूर्व अपराधिक रिकॉर्ड नहीं है और वह विवेचना में पूर्ण सहयोग करने का वचन देता है। आवेदक के पक्ष में निम्नलिखित आधार हैं—",
      "क) प्रकरण की प्रकृति शमनीय एवं तथ्यात्मक है; आवेदक की भूमिका सामग्री से सिद्ध नहीं होती।",
      "ख) आवेदक पलायन करने वाला नहीं है; उसका कोई पूर्व दण्डित इतिहास नहीं है।",
      "ग) साक्षियों से छेड़छाड़ की कोई संभावना नहीं है और आवेदक विवेचना में पूर्ण सहयोग करेगा।",
      "घ) समाज में आवेदक की प्रतिष्ठा है; गिरफ्तारी से उसकी आजीविका व पारिवारिक जीवन प्रभावित होगा।",
      "अतः श्रीमान न्यायालय से प्रार्थना है कि आवेदक को सुविधाजनक जमानत एवं मुचलके पर अंतरिम जमानत प्रदान करने की कृपा की जाए।",
      "दिनांक {{date}}", "भवदीय,", "─────────────────────",
      "अधिवक्ता, आवेदक/अभियुक्त की ओर से", "स्थान — {{place}}"
    ]),
    hi("anticipatory", "criminal", "अग्रिम जमानत आवेदन", "धारा 482 BNSS (पूर्व 438 CrPC)", [
      "{{court}}", "=== अग्रिम जमानत आवेदन पत्र ===", "प्रकरण — {{caseNo}}",
      "आवेदक — …………………………", "धाराएँ — {{sections}} · {{ps}}", "महोदय,",
      "विनम्र निवेदन है कि आवेदक को उपरोक्त धाराओं में झूठा फँसाए जाने की संभावना है। आवेदक निर्दोष है तथा उसके विरुद्ध कोई विश्वसनीय सामग्री नहीं है।",
      "आवेदक स्थायी निवासी, प्रतिष्ठित नागरिक है और गिरफ्तारी की स्थिति में उसकी प्रतिष्ठा एवं आजीविका को अपूरणीय क्षति होगी।",
      "अतः गिरफ्तारी की स्थिति में आवेदक को अग्रिम जमानत प्रदान करने की कृपा की जाए।",
      "दिनांक {{date}}", "आवेदक / अधिवक्ता"
    ]),
    hi("chargesheet", "criminal", "आरोप पत्र", "पुलिस → न्यायालय · BNSS", [
      "{{court}}", "=== आरोप पत्र ===", "प्रकरण संख्या {{caseNo}}", "थाना — {{ps}}", "धाराएँ — {{sections}}",
      "=== 1. अभियोजन का संक्षिप्त विवरण ===",
      "परिवादी ………………………… की ओर से दिनांक {{date}} को लिखित रिपोर्ट प्राप्त हुई, जिस पर प्रकरण क्रमांक …………/{{year}} अंतर्गत उपरोक्त धाराओं में प्रकरण दर्ज किया गया।",
      "=== 2. तथ्य ===", "विवेचना के दौरान यह सामने आया कि ……………………………………………………………………………………",
      "=== 3. साक्षियों के नाम ===", "क) ……………… पुत्र ……………… निवासी ………………", "ख) ……………… पुत्र ……………… निवासी ………………",
      "=== 4. अभिलेखीय साक्ष्य ===", "क) प्रकृति आख्या  ख) घटनास्थल निरीक्षण मेमो  ग) कब्जा मेमो",
      "=== 5. अभियुक्त का विवरण ===", "नाम — ……………… पुत्र — ……………… निवासी — ……………… आयु — ………… वर्ष",
      "=== 6. निष्कर्ष ===", "उपरोक्त विवेचना से सिद्ध होता है कि अभियुक्त द्वारा उक्त धाराओं के अंतर्गत अपराध किया गया है। अतः आरोप पत्र श्रीमान न्यायालय के समक्ष प्रस्तुत है।",
      "दिनांक {{date}}", "पुलिस अधिकारी / विवेचक", "───────────────", "{{ps}}"
    ]),
    hi("arrest-report", "criminal", "प्रकृति आख्या (गिरफ्तारी रिपोर्ट)", "धारा 58 BNSS", [
      "{{court}}", "प्रकरण संख्या {{caseNo}}", "{{party}}", "धारा — {{sections}}",
      "=== प्रकृति आख्या ===",
      "1. अभियुक्त का नाम — …………………… पुत्र …………………… निवासी ……………………",
      "2. गिरफ्तारी की तिथि — {{date}} समय — ………… बजे",
      "3. गिरफ्तारी स्थान — ………………………………………",
      "4. गिरफ्तार करने वाला अधिकारी — …………………… पद ……………………",
      "5. संलग्न धाराएँ — {{sections}}",
      "6. साक्ष्य/मुद्दामाल का विवरण — ……………………………………",
      "7. अभियुक्त के स्वास्थ्य संबंधी टिप्पणी — …………………………",
      "8. परिवादी को सूचना — सूचित किया गया / प्रयास किया गया",
      "उपरोक्त विवरण श्रीमान न्यायालय के समक्ष प्रस्तुत है।",
      "दिनांक {{date}}", "विवेचक अधिकारी", "──────────────", "{{ps}}"
    ]),
    hi("judgment", "criminal", "निर्णय (दोषसिद्धि / दोषमुक्ति)", "मजिस्ट्रेट / सत्र न्यायालय हेतु पूर्ण प्रारूप", [
      "{{court}}", "=== प्रकरण संख्या {{caseNo}} ===", "{{party}}", "धाराएँ — {{sections}} · {{ps}}",
      "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&", "निर्णय", "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&", "दिनांक — {{date}}",
      "=== 1. प्रकरण का संक्षिप्त इतिहास ===", "अभियोजन का संक्षिप्त कथन यह है कि …………………………………………………………………………………………",
      "=== 2. अभियोजन के साक्षी ===", "अभियोजन पक्ष की ओर से कुल ……… साक्षी परीक्षित हुए—", "क) …………………… (PW-1)  ख) …………………… (PW-2)",
      "=== 3. अभिलेखीय साक्ष्य ===", "प्रदर्श प-1 …………………, प्रदर्श प-2 …………………",
      "=== 4. अभियुक्त का कथन ===",
      "अभियुक्त का कथन धारा 351 BNSS के अंतर्गत अंकित किया गया, जिसमें उसने आरोपों को अस्वीकार किया तथा बचाव में ………………………………… कथन दिया।",
      "=== 5. तर्क एवं विवेचन ===",
      "उभय पक्ष के विद्वान अधिवक्तागण के तर्क सुने गए तथा समस्त अभिलेख का परिशीलन किया गया। अभियोजन के साक्षी …………………… के कथन में परस्पर विरोधाभास है / विश्वसनीयता संदिग्ध है।",
      "=== 6. निष्कर्ष ===",
      "उपरोक्त विवेचन के आधार पर अभियोजन अपने आरोपों को संदेह से परे सिद्ध करने में सफल नहीं हुआ। अतः अभियुक्त को उपरोक्त धाराओं के अंतर्गत दोषमुक्त किया जाता है।",
      "=== 7. आदेश ===",
      "अभियुक्त …………………… को धारा …………………… के अंतर्गत दोषमुक्त किया जाता है। उसके मुचलके उचित प्रक्रिया से रद्द किए जाएँ।",
      "आदेश आज दिनांक {{date}} को हस्ताक्षरित एवं घोषित किया गया।",
      "न्यायाधीश", "──────────────", "{{court}}"
    ]),
    hi("summon", "criminal", "आदेश — समन / वारंट", "न्यायालय आदेश प्रारूप", [
      "{{court}}", "प्रकरण संख्या {{caseNo}}", "{{party}}", "धारा — {{sections}}", "=== आदेश ===",
      "प्रकरण के अभिलेख एवं परिवादी के कथन पर विचार किया गया। प्रथम दृष्ट्या उपरोक्त धाराओं के अंतर्गत पर्याप्त सामग्री विद्यमान है।",
      "अतः अभियुक्त …………………… को दिनांक …………/………/{{year}} को न्यायालय के समक्ष उपस्थित होने हेतु समन/वारंट जारी किया जाता है।",
      "न्यायाधीश", "──────────────", "{{court}}"
    ]),
    hi("statement", "criminal", "अभियुक्त का कथन", "धारा 351 BNSS", [
      "{{court}}", "प्रकरण संख्या {{caseNo}}", "अभियुक्त — ………………………… द्वारा कथन",
      "=== प्रश्न 1 ===", "प्रश्न — क्या आपने उपरोक्त तिथि को …………………………… किया?",
      "उत्तर — मैंने ऐसा कोई कार्य नहीं किया। मुझे झूठा फँसाया गया है।",
      "=== प्रश्न 2 ===", "प्रश्न — क्या आप बचाव में कुछ कहना चाहते हैं?",
      "उत्तर — मैं लिखित बचाव प्रस्तुत करना / साक्षी परीक्षित कराना चाहता हूँ।",
      "दिनांक {{date}}", "हस्ताक्षर / अंगूठा — …………………", "न्यायालय अधिकारी — …………………"
    ]),
    hi("bond", "criminal", "मुचलका एवं जमानतनामा", "धारा 484 BNSS हेतु", [
      "{{court}}", "प्रकरण संख्या {{caseNo}}", "=== मुचलका ===",
      "मैं …………………………… पुत्र …………………………… निवासी …………………………… आयु ………… वर्ष, आज दिनांक {{date}} को निम्नानुसार मुचलका लेता हूँ—",
      "1. मैं श्रीमान न्यायालय द्वारा निर्धारित रु. ………………… की व्यक्तिगत बॉण्ड राशि के लिए उत्तरदायी रहूँगा।",
      "2. मैं इस प्रकरण में सभी तिथियों पर न्यायालय के समक्ष उपस्थित रहूँगा।",
      "3. मैं विवेचना अधिकारी के निर्देशों का पालन करूँगा तथा साक्षियों को प्रभावित नहीं करूँगा।",
      "4. आवश्यकता होने पर पुलिस थाने में हाजिर होऊँगा।",
      "सत्यापन — मैंने उपरोक्त कथन पढ़कर/सुनकर सत्य बताया।",
      "हस्ताक्षर — ……………………", "जमीनदार / प्रतिज्ञाकार — …………………………"
    ]),
    hi("discharge", "criminal", "उन्मोचन आवेदन", "धारा 250 BNSS", [
      "{{court}}", "प्रकरण संख्या {{caseNo}}", "{{party}}", "=== आवेदन ===", "महोदय,",
      "विनम्र निवेदन है कि अभियुक्त के विरुद्ध प्रस्तुत सामग्री में कोई विश्वसनीय साक्ष्य नहीं है तथा प्रकरण में दोषसिद्धि की संभावना नहीं है।",
      "अतः अभियुक्त को उपरोक्त धाराओं से उन्मोचित करने की कृपा की जाए।",
      "दिनांक {{date}}", "अभियुक्त / अधिवक्ता"
    ]),
    hi("maintenance", "criminal", "भरण-पोषण आवेदन", "धारा 144 BNSS / 125 CrPC", [
      "{{court}}", "=== भरण-पोषण आवेदन ===",
      "आवेदक — ………………………… पत्नी/संतान/माता-पिता",
      "प्रत्यर्थी — ………………………… (पति/पुत्र/संतान)",
      "1. यह कि आवेदक प्रत्यर्थी की पत्नी/आश्रित संतान है तथा स्वयं भरण-पोषण में असमर्थ है।",
      "2. यह कि प्रत्यर्थी की मासिक आय रु. ………… है और वह आवेदक का भरण-पोषण करने में सक्षम है, परंतु कर नहीं रहा।",
      "3. यह कि आवेदक के पास कोई स्वतंत्र आय का साधन नहीं है।",
      "=== प्रार्थना ===",
      "अतः प्रत्यर्थी को मासिक रु. ………… भरण-पोषण भत्ता देने का आदेश पारित करने की कृपा की जाए।",
      "दिनांक {{date}}", "आवेदक / अधिवक्ता"
    ]),
    hi("cheque", "criminal", "चेक अनादरण परिवाद", "धारा 138 परक्राम्य लिखत अधिनियम", [
      "{{court}}", "=== परिवाद पत्र (धारा 138 NI Act) ===", "प्रकरण संख्या …………/{{year}}",
      "परिवादी — ………………………………", "अभियुक्त — ………………………………",
      "1. यह कि अभियुक्त ने परिवादी को रु. ………… के भुगतान हेतु दिनांक …………/………/{{year}} का चेक क्रमांक …………… ………… बैंक पर जारी किया।",
      "2. यह कि उक्त चेक दिनांक …………/………/{{year}} को ‘अपर्याप्त धन’ के कारण अनादृत हुआ।",
      "3. यह कि परिवादी ने दिनांक …………/………/{{year}} को विधिक नोटिस भेजा, जो अभियुक्त को …………/………/{{year}} को प्राप्त हुआ।",
      "4. यह कि अभियुक्त ने नोटिस की 15 दिवसीय अवधि में भुगतान नहीं किया।",
      "=== प्रार्थना ===",
      "अतः अभियुक्त के विरुद्ध धारा 138 NI Act के अंतर्गत कार्यवाही करते हुए उसे दोषसिद्ध एवं चेक राशि व हर्जाना देने का आदेश पारित करने की कृपा की जाए।",
      "दिनांक {{date}}", "परिवादी / अधिवक्ता"
    ]),

    /* ---------------------------------------------------------------- civil */
    hi("plaint", "civil", "वाद पत्र (दीवानी)", "सिविल न्यायाधीश हेतु", [
      "{{court}}", "=== वाद पत्र ===", "वाद संख्या …………/{{year}}",
      "वादी — ……………………………… पुत्र ……………………………… निवासी ………………………………",
      "प्रतिवादी — ……………………………… पुत्र ……………………………… निवासी ………………………………",
      "=== विवरण ===",
      "1. वादी प्रस्तुत वाद का स्वामी एवं वाद व्यय जमा करने में सक्षम है।",
      "2. विवरणित भूमि/सम्पत्ति का स्वामी वादी है, जिसका प्रमाण अभिलेखों से स्पष्ट है — ………………………………………",
      "3. वाद-कारण …………………………… को उत्पन्न हुआ, जब प्रतिवादी ने ……………………………… किया।",
      "4. विधिक आधार — शांतिपूर्ण कब्जे के अधिकार का हनन, अनुबंध का भंग तथा निषेधाज्ञा का हक़।",
      "5. वाद का मूल्यांकन ………… रु. एवं न्यायशुल्क ………… रु. है।",
      "=== प्रार्थना ===", "अतः श्रीमान न्यायालय से प्रार्थना है कि—",
      "क) वादी के स्वामित्व एवं कब्जे की घोषणा की डिक्री जारी हो;",
      "ख) प्रतिवादी को उक्त संपत्ति में हस्तक्षेप करने से निषिद्ध किया जाए;",
      "ग) वाद व्यय प्रतिवादी से दिलाया जाए;", "घ) अन्य अनुतोष प्रदान किया जाए।",
      "सत्यापन — मैंने वाद पत्र के कथनों को पढ़कर सत्य पाया।",
      "दिनांक {{date}}", "वादी / अधिवक्ता"
    ]),
    hi("written", "civil", "लिखित कथन", "प्रतिवादी का उत्तर", [
      "{{court}}", "वाद संख्या …………/{{year}}", "वादी — ……………………………… बनाम प्रतिवादी — ………………………………",
      "=== लिखित कथन ===",
      "1. यह कि प्रस्तुत वाद अधिकार क्षेत्र से बाहर एवं विधि-विरुद्ध होने से खारिज करने योग्य है।",
      "2. यह कि वाद पत्र के कथन पूर्णतः असत्य एवं निराधार हैं।",
      "3. यह कि प्रतिवादी ……………………………… का वास्तविक स्वामी है तथा उसका कब्जा विवादित नहीं है।",
      "4. यह कि वादी ने वाद-कारण सिद्ध करने हेतु समुचित तथ्य नहीं दिए हैं।",
      "=== प्रार्थना ===", "अतः वाद खारिज करने तथा वाद व्यय प्रतिवादी को दिलाने की कृपा की जाए।",
      "दिनांक {{date}}", "प्रतिवादी / अधिवक्ता"
    ]),
    hi("injunction", "civil", "अस्थायी निषेधाज्ञा आवेदन", "Order XXXIX Rule 1-2 CPC", [
      "{{court}}", "वाद संख्या …………/{{year}}", "=== आवेदन (अस्थायी निषेधाज्ञा) ===", "महोदय,",
      "विनम्र निवेदन है कि वादी ने प्रस्तुत वाद में ……………………………… की डिक्री हेतु वाद प्रस्तुत किया है। प्रतिवादी विवादित संपत्ति पर अवैध निर्माण/कब्जा करने का प्रयास कर रहा है।",
      "वादी का प्रथम दृष्ट्या सशक्त प्रकरण है, अपूरणीय क्षति होगी तथा सुविधा का संतुलन वादी के पक्ष में है।",
      "अतः प्रतिवादी को वाद के निर्णय तक विवादित संपत्ति में हस्तक्षेप न करने हेतु अस्थायी निषेधाज्ञा का आदेश पारित करने की कृपा की जाए।",
      "दिनांक {{date}}", "वादी / अधिवक्ता"
    ]),
    hi("appeal", "civil", "प्रथम अपील", "जिला न्यायालय / उच्च न्यायालय हेतु", [
      "{{court}}", "=== प्रथम अपील ===", "अपील संख्या …………/{{year}}",
      "अपीलकर्ता — ……………………………… बनाम प्रत्यर्थी — ………………………………",
      "1. यह कि विद्वान अधीनस्थ न्यायालय ने दिनांक …………/………/{{year}} के निर्णय/डिक्री द्वारा ……………………………… का निर्णय पारित किया।",
      "2. यह कि विवादित निर्णय विधि एवं तथ्य के विरुद्ध है तथा अभिलेखीय साक्ष्यों की उपेक्षा की गई है।",
      "3. यह कि विद्वान न्यायालय ने ……………………………… के आधार पर निष्कर्ष दिया, जो विधि-सम्मत नहीं है।",
      "=== प्रार्थना ===", "अतः विवादित निर्णय/डिक्री को अपास्त करने की कृपा की जाए।",
      "दिनांक {{date}}", "अपीलकर्ता / अधिवक्ता"
    ]),
    hi("revision", "civil", "पुनरीक्षण याचिका", "धारा 438 BNSS / 115 CPC", [
      "{{court}}", "=== पुनरीक्षण याचिका ===", "प्रकरण संख्या {{caseNo}}",
      "याचिकाकर्ता — ……………………………… बनाम विरोधी पक्ष — ………………………………",
      "1. यह कि विद्वान अधीनस्थ न्यायालय ने दिनांक …………/………/{{year}} को आदेश पारित किया, जो विधि के विरुद्ध है।",
      "2. यह कि उक्त आदेश में अधिकार क्षेत्र का अभाव है / तथ्यों के गलत अवलोकन से आदेश पारित हुआ।",
      "3. यह कि आदेश से याचिकाकर्ता को अपूरणीय क्षति होगी।",
      "=== प्रार्थना ===", "अतः विवादित आदेश को अपास्त करने की कृपा की जाए।",
      "दिनांक {{date}}", "याचिकाकर्ता / अधिवक्ता"
    ]),
    hi("execution", "civil", "निष्पादन आवेदन", "धारा 47 CPC", [
      "{{court}}", "=== निष्पादन आवेदन ===", "निष्पादन संख्या …………/{{year}}",
      "डिक्रीधारक — ……………………………… बनाम निर्णीत ऋणी — ………………………………",
      "1. यह कि दिनांक …………/………/{{year}} को डिक्री पारित हुई, जिसके अनुसार निर्णीत ऋणी को रु. ………… देने का आदेश है।",
      "2. यह कि डिक्रीधारक ने डिक्री की प्रमाणित प्रतिलिपि प्राप्त कर ली है।",
      "3. यह कि निर्णीत ऋणी ने स्वेच्छा से भुगतान नहीं किया।",
      "=== प्रार्थना ===", "अतः डिक्री का निष्पादन करते हुए निर्णीत ऋणी की संपत्ति कुर्क करने का आदेश दिया जाए।",
      "दिनांक {{date}}", "डिक्रीधारक / अधिवक्ता"
    ]),
    hi("caveat", "civil", "प्रतिबंध याचिका (केविएट)", "Order 45 CPC", [
      "{{court}}", "=== प्रतिबंध याचिका ===",
      "प्रतिबंधकर्ता — ………………………………", "विरोधी पक्ष — ………………………………", "महोदय,",
      "विनम्र निवेदन है कि प्रतिबंधकर्ता को भय है कि विरोधी पक्ष द्वारा उपरोक्त प्रकरण में बिना सूचना कोई आवेदन प्रस्तुत किया जा सकता है। अतः सूचना दिए बिना कोई आदेश पारित न किया जाए।",
      "दिनांक {{date}}", "प्रतिबंधकर्ता / अधिवक्ता"
    ]),

    /* ----------------------------------------------------------------- misc */
    hi("notice", "misc", "विधिक सूचना (लीगल नोटिस)", "अनुबंध / चेक / संपत्ति संबंधी", [
      "सेवा में,", "……………………………", "विषय — विधिक सूचना हेतु", "महोदय,",
      "मैं ……………………………… की ओर से सूचित किया जाता है कि आपने दिनांक …………/………/{{year}} को ……………………………… के संबंध में विवादित कार्य किया, जिससे मेरे पक्षकार को आर्थिक एवं मानसिक क्षति पहुँची है।",
      "अतः आप से अपेक्षा है कि इस सूचना की प्राप्ति के 15 दिवस के भीतर ……………………………… करें, अन्यथा विधिक कार्यवाही प्रारंभ की जाएगी, जिसके समस्त व्यय आपके होंगे।",
      "दिनांक {{date}}", "अधिवक्ता — ………………………………"
    ]),
    hi("affidavit", "misc", "शपथ पत्र", "सत्यापन सहित", [
      "=== शपथ पत्र ===",
      "मैं ……………………………… पुत्र ……………………………… निवासी ……………………………… आयु ………… वर्ष, शपथपूर्वक कथन करता/करती हूँ कि—",
      "1. मैं उपरोक्त प्रकरण का पक्षकार हूँ तथा कथन करने हेतु सक्षम हूँ।",
      "2. उपरोक्त आवेदन पत्र में दिये गए समस्त तथ्य मेरी व्यक्तिगत जानकारी एवं अभिलेखों पर आधारित सत्य हैं।",
      "3. मैंने इन तथ्यों को सत्य निष्ठा से सत्यापित किया है।",
      "सत्यापन — दिनांक {{date}} को स्थान {{place}} पर सत्यापित किया।",
      "शपथकर्ता — …………………………"
    ]),
    hi("vakalatnama", "misc", "वकालतनामा", "अधिवक्ता नियुक्ति", [
      "=== वकालतनामा ===", "{{court}}", "प्रकरण संख्या {{caseNo}}",
      "मैं/हम ……………………………… पक्षकार ……………………………… ने श्री ……………………………… अधिवक्ता को उपरोक्त प्रकरण में अपना अधिवक्ता नियुक्त किया।",
      "अधिवक्ता महोदय को संपूर्ण कार्यवाही करने, दस्तावेज़ प्रस्तुत करने, समझौता/राजीनामा करने तथा आवश्यक आवेदन देने का अधिकार होगा।",
      "दिनांक {{date}}", "पक्षकार — …………………………", "अधिवक्ता — …………………………"
    ]),
    hi("adjourn", "misc", "स्थगन प्रार्थना पत्र", "अधिवक्ता हेतु", [
      "{{court}}", "प्रकरण संख्या {{caseNo}}", "{{party}}", "=== स्थगन प्रार्थना पत्र ===", "महोदय,",
      "विनम्र निवेदन है कि उपरोक्त प्रकरण में आवेदक की ओर से उपस्थित अधिवक्ता न्यायालय के अन्य प्रकरण में व्यस्त होने / अस्वस्थ होने के कारण आज बहस नहीं कर सके।",
      "अतः आज का प्रकरण किसी अन्य तिथि पर स्थगित करने की कृपा की जाए।",
      "दिनांक {{date}}", "आवेदक / अधिवक्ता"
    ]),
    hi("copy", "misc", "नकल आवेदन", "प्रमाणित प्रतिलिपि हेतु", [
      "{{court}}", "प्रकरण संख्या {{caseNo}}", "=== नकल आवेदन पत्र ===", "महोदय,",
      "विनम्र निवेदन है कि नीचे हस्ताक्षरकर्ता उपरोक्त प्रकरण का पक्षकार है। उसे निम्नलिखित दस्तावेज़ों की प्रमाणित नकल आवश्यक है—",
      "1) आवेदन पत्र एवं अनुलग्नक  2) आदेश/निर्णय की प्रमाणित प्रतिलिपि  3) ………………………",
      "अतः उपरोक्त अभिलेखों की प्रमाणित नकल निर्धारित शुल्क प्राप्त करके प्रदान करने की कृपा की जाए।",
      "दिनांक {{date}}", "आवेदक — …………………", "अधिवक्ता — …………………"
    ]),
    hi("rent", "misc", "किराया नियंत्रण आवेदन", "नियंत्रक, किराया नियंत्रण हेतु", [
      "{{court}}", "=== आवेदन पत्र ===",
      "आवेदक / मकान मालिक — ………………………………", "प्रत्यर्थी / किरायेदार — ………………………………",
      "1. यह कि आवेदक उपरोक्त परिसर का मालिक है और प्रत्यर्थी किरायेदार के रूप में रह रहा है।",
      "2. यह कि प्रत्यर्थी ने दिनांक …………/………/{{year}} से किराया देना बंद कर दिया है; बकाया रु. ………… है।",
      "3. यह कि परिसर की आवश्यकता आवेदक के स्वयं/परिवार हेतु है।",
      "=== प्रार्थना ===", "अतः परिसर खाली कराने तथा बकाया किराया दिलाने का आदेश पारित करने की कृपा की जाए।",
      "दिनांक {{date}}", "आवेदक / अधिवक्ता"
    ]),
    hi("mact", "misc", "मोटर दुर्घटना दावा", "MACT हेतु दावा आवेदन", [
      "{{court}}", "=== दावा आवेदन पत्र ===", "दावा संख्या …………/{{year}}",
      "आवेदक — ……………………………… (घायल / मृतक का प्रतिनिधि)",
      "प्रतिवादी 1 — वाहन स्वामी ………………………………", "प्रतिवादी 2 — बीमा कंपनी ………………………………",
      "1. यह कि दिनांक …………/………/{{year}} को …………………………… स्थान पर वाहन क्रमांक …………………… द्वारा लापरवाहीपूर्वक चलाकर दुर्घटना की गई।",
      "2. यह कि दुर्घटना में ……………………………… को गंभीर चोटें आईं / मृत्यु हो गई।",
      "3. यह कि मृतक की आयु ………… वर्ष, आय रु. ………… प्रतिमाह थी।",
      "=== प्रार्थना ===", "अतः मुआवज़ा राशि रु. ………… देने का आदेश पारित करने की कृपा की जाए।",
      "दिनांक {{date}}", "आवेदक / अधिवक्ता"
    ]),
    hi("consumer", "misc", "उपभोक्ता शिकायत", "जिला उपभोक्ता आयोग हेतु", [
      "{{court}}", "=== शिकायत पत्र ===", "शिकायत संख्या …………/{{year}}",
      "शिकायतकर्ता — ………………………………", "विरोधी पक्ष — ………………………………",
      "1. यह कि शिकायतकर्ता ने विरोधी पक्ष से ……………………………… सेवा/वस्तु प्राप्त की, जिसका मूल्य रु. ………… था।",
      "2. यह कि सेवा/वस्तु में ……………………………… दोष था तथा विरोधी पक्ष ने उपभोक्ता अधिकारों का उल्लंघन किया।",
      "3. यह कि शिकायतकर्ता ने विरोधी पक्ष को लिखित सूचना दी, परंतु कोई समाधान नहीं मिला।",
      "=== प्रार्थना ===",
      "अतः वस्तु बदलने / सेवा पुनः देने तथा क्षतिपूर्ति रु. ………… दिलाने का आदेश पारित करने की कृपा की जाए।",
      "दिनांक {{date}}", "शिकायतकर्ता / अधिवक्ता"
    ]),
    hi("writ", "misc", "रिट याचिका", "उच्च न्यायालय हेतु (संक्षिप्त प्रारूप)", [
      "{{court}}", "=== रिट याचिका ===", "डी.बी. सिविल रिट संख्या …………/{{year}}",
      "याचिकाकर्ता — ………………………………", "प्रत्यर्थी — 1. राज्य राजस्थान, 2. ………………………………",
      "1. यह कि याचिकाकर्ता मूल अधिकारों का हकदार नागरिक है।",
      "2. यह कि प्रत्यर्थी द्वारा दिनांक …………/………/{{year}} का आदेश/कार्य ……………………………… मूल अधिकारों का उल्लंघन है।",
      "3. यह कि याचिकाकर्ता के पास कोई अन्य प्रभावी उपचार उपलब्ध नहीं है।",
      "=== प्रार्थना ===",
      "अतः उपरोक्त आदेश/कार्य को रद्द करते हुए उचित रिट जारी करने की कृपा की जाए।",
      "दिनांक {{date}}", "याचिकाकर्ता / अधिवक्ता"
    ]),
    hi("will", "misc", "वसीयत", "संपत्ति वितरण हेतु", [
      "=== वसीयत ===",
      "मैं ……………………………… पुत्र ……………………………… निवासी ……………………………… आयु ………… वर्ष, पूर्ण मानसिक स्वास्थ्य में स्वेच्छा से निम्नलिखित वसीयत करता हूँ—",
      "1. मेरी मृत्यु के पश्चात मेरी अचल/चल संपत्ति का विवरण निम्नलिखित है — ………………………………",
      "2. उक्त संपत्ति में से …………………… हिस्सा श्री/श्रीमती ……………………………… (संबंध …………………… ) को प्रदान किया जाता है।",
      "3. शेष संपत्ति का उत्तराधिकार मेरे विधिक वारिसों को होगा।",
      "4. मैं ……………………………… को इस वसीयत का निष्पादक नियुक्त करता हूँ।",
      "5. यह मेरी अंतिम वसीयत है तथा इससे पूर्व की समस्त वसीयतें रद्द की जाती हैं।",
      "हस्ताक्षर — …………………………", "दिनांक {{date}}", "साक्षी 1 — …………………………", "साक्षी 2 — …………………………"
    ]),

    /* ------------------------------------------------------------- English */
    en("en-bail", "criminal", "Application for bail", "Section 482 BNSS · before the Magistrate", [
      "{{court}}", "Case No. {{caseNo}}", "{{party}}", "Applicant / Accused — …………………………",
      "Sections — {{sections}} · {{ps}}", "=== APPLICATION ===", "Respected Sir/Madam,",
      "It is respectfully submitted that the applicant has been falsely implicated in the above case. The applicant is innocent and the dispute is essentially civil/commercial in nature.",
      "The applicant is a permanent resident, has no previous criminal record and undertakes to cooperate fully with the investigation. The grounds in favour of the applicant are:",
      "a) The offence is compoundable and the applicant's role is not borne out by the material on record.",
      "b) The applicant is not a flight risk and has no prior conviction.",
      "c) There is no likelihood of tampering with evidence; the applicant will cooperate with the investigation.",
      "d) The applicant enjoys a good reputation in society and arrest would affect his livelihood and family.",
      "It is therefore prayed that the applicant be released on interim bail on such terms and surety as this Hon'ble Court may deem fit.",
      "Date: {{date}}", "Yours faithfully,", "─────────────────────", "Counsel for the applicant/accused", "Place — {{place}}"
    ]),
    en("en-notice", "misc", "Legal notice", "General demand notice", [
      "To,", "……………………………", "Subject — Legal notice",
      "Sir/Madam,",
      "Under instructions from and on behalf of my client ………………………………, I hereby serve upon you the following notice.",
      "That on …………/………/{{year}} you ……………………………… , thereby causing my client financial loss and mental agony.",
      "You are hereby called upon to ……………………………… within 15 days of receipt of this notice, failing which my client shall be constrained to initiate appropriate legal proceedings at your risk as to costs.",
      "Date: {{date}}", "Advocate — ………………………………"
    ]),
    en("en-affidavit", "misc", "Affidavit", "With verification", [
      "=== AFFIDAVIT ===",
      "I, ……………………………… son of ……………………………… resident of ……………………………… aged ………… years, do hereby solemnly affirm and state on oath as under:",
      "1. That I am a party to the above matter and am competent to swear this affidavit.",
      "2. That the facts stated in the accompanying application are true to my knowledge and based on the records.",
      "3. That I have verified the above facts as true and correct.",
      "Verified at {{place}} on {{date}}.", "Deponent — …………………………"
    ]),
    en("en-vakalatnama", "misc", "Vakalatnama", "Appointment of counsel", [
      "=== VAKALATNAMA ===", "{{court}}", "Case No. {{caseNo}}",
      "I/We ……………………………… the party ……………………………… do hereby appoint Shri/Smt. ………………………………, Advocate, as my/our counsel in the above matter.",
      "The said counsel is authorised to appear, act, plead, produce documents, enter into compromise and make necessary applications on my/our behalf.",
      "Date: {{date}}", "Party — …………………………", "Advocate — …………………………"
    ]),
    en("en-plaint", "civil", "Civil suit (plaint)", "Before the Civil Judge", [
      "{{court}}", "=== PLAINT ===", "Suit No. …………/{{year}}",
      "Plaintiff — ………………………………", "Defendant — ………………………………",
      "1. That the plaintiff is the owner in possession of the suit property described in the schedule below and is competent to file this suit.",
      "2. That the cause of action arose on …………/………/{{year}} when the defendant ……………………………… .",
      "3. That the plaintiff has valued the suit at ₹ ………… and has paid the requisite court fee.",
      "=== PRAYER ===",
      "It is therefore prayed that this Hon'ble Court may be pleased to decree the suit in favour of the plaintiff and grant:",
      "a) a decree for declaration of title and possession;",
      "b) a permanent injunction restraining the defendant from interfering with the suit property;",
      "c) costs of the suit; and", "d) such other relief as the Court deems fit.",
      "Verification — I have read the plaint and declare its contents true.",
      "Date: {{date}}", "Plaintiff / Advocate"
    ])
  ];

  D.buildTemplate = function (tplId, doc) {
    var t = ND.templates.filter(function (x) { return x.id === tplId; })[0];
    if (!t) return null;
    return t.blocks.map(function (line) {
      var txt = D.applyVars(line, doc);
      if (/^&+.*&+$/.test(txt)) return D.newBlock("h1", U.escapeHtml(txt.replace(/&/g, "").trim()), { align: "center" });
      if (/^=+.*=+$/.test(txt)) return D.newBlock("h2", U.escapeHtml(txt.replace(/=/g, "").trim()), { align: "center" });
      var right = /^(भवदीय|न्यायाधीश|हस्ताक्षर|आवेदक|दिनांक|स्थान|सत्यापन|वादी|प्रतिवादी|अपीलकर्ता|पुलिस अधिकारी|विवेचक|याचिकाकर्ता|प्रतिबंधकर्ता|शपथकर्ता|अधिवक्ता|Deponent|Counsel|Yours faithfully|Date:|Party|Advocate|Plaintiff|Verified|Place)/.test(txt) && txt.length < 70;
      return D.newBlock("p", U.escapeHtml(txt), { align: right ? "right" : "" });
    });
  };

  D.templateTitle = function (t) {
    return t.title;
  };

  /* ==========================================================================
   * 4. EXPORT — DOCX
   * ======================================================================== */
  function xmlEscape(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /** Font names written into exported files — the fonts the user actually chose.
   *  Metric-compatible families are written under the Word/Windows name so a
   *  DOCX opened in WPS Office or Word looks the same on any machine. */
  var FONT_EXPORT_ALIAS = {
    "Tinos (Times-compatible)": "Times New Roman",
    "Arimo (Arial-compatible)": "Arial",
    "Carlito (Calibri-compatible)": "Calibri",
    "Gelasio (Georgia-compatible)": "Georgia"
  };

  function exportFontName(label) {
    if (!label) return "";
    return FONT_EXPORT_ALIAS[label] || label.replace(/\s*\([^)]*\)$/, "");
  }

  function fontNames(doc) {
    var st = (doc && doc.style) || {};
    var dev = "Noto Serif Devanagari", latin = "Times New Roman";
    if (ND.fonts && ND.fonts.label) {
      dev = exportFontName(ND.fonts.label(st.devFont)) || dev;
      latin = exportFontName(ND.fonts.label(st.latinFont)) || latin;
    }
    return { dev: dev, latin: latin };
  }

  function halfPoints(pt) { return Math.round(pt * 2); }
  function twips(mm) { return Math.round(mm * 56.6929); }

  function runProps(base, fmt) {
    var font = base.font;
    var size = fmt.size || halfPoints(base.size);
    return "<w:rPr>" +
      "<w:rFonts w:ascii=\"" + xmlEscape(fmt.latinFont || base.latinFont) + "\" w:hAnsi=\"" + xmlEscape(fmt.latinFont || base.latinFont) + "\" " +
      "w:cs=\"" + xmlEscape(base.font) + "\" w:eastAsia=\"" + xmlEscape(base.font) + "\"/>" +
      (fmt.b ? "<w:b/><w:bCs/>" : "") +
      (fmt.i ? "<w:i/><w:iCs/>" : "") +
      (fmt.u ? "<w:u w:val=\"single\"/>" : "") +
      (fmt.s ? "<w:strike/>" : "") +
      (fmt.sup ? "<w:vertAlign w:val=\"superscript\"/>" : "") +
      (fmt.sub ? "<w:vertAlign w:val=\"subscript\"/>" : "") +
      (fmt.color ? "<w:color w:val=\"" + fmt.color.replace("#", "").toUpperCase() + "\"/>" : "") +
      (fmt.hl ? "<w:highlight w:val=\"" + fmt.hl + "\"/>" : "") +
      (fmt.caps ? "<w:caps/>" : "") +
      (fmt.smallCaps ? "<w:smallCaps/>" : "") +
      "<w:sz w:val=\"" + size + "\"/><w:szCs w:val=\"" + size + "\"/>" +
      "<w:lang w:val=\"hi-IN\" w:bidi=\"hi-IN\"/>" +
      "</w:rPr>";
  }

  function inlineRuns(html, base) {
    var div = document.createElement("div");
    div.innerHTML = String(html || "").replace(/<br\s*\/?>/gi, "\n");
    var out = [];

    function walk(node, fmt) {
      if (node.nodeType === 3) {
        var parts = String(node.nodeValue).split("\n");
        parts.forEach(function (part, i) {
          if (i > 0) out.push("<w:r><w:br/></w:r>");
          if (!part) return;
          out.push("<w:r>" + runProps(base, fmt) + "<w:t xml:space=\"preserve\">" + xmlEscape(part) + "</w:t></w:r>");
        });
        return;
      }
      if (node.nodeType !== 1) return;
      var tag = node.nodeName.toLowerCase();
      var f = Object.assign({}, fmt);
      if (tag === "b" || tag === "strong") f.b = true;
      if (tag === "i" || tag === "em") f.i = true;
      if (tag === "u") f.u = true;
      if (tag === "s" || tag === "strike" || tag === "del") f.s = true;
      if (tag === "sup") f.sup = true;
      if (tag === "sub") f.sub = true;
      if (tag === "mark") f.hl = "yellow";
      if (tag === "br") { out.push("<w:r><w:br/></w:r>"); return; }
      if (node.style) {
        var st = node.style;
        if (st.fontWeight && (st.fontWeight === "bold" || parseInt(st.fontWeight, 10) >= 600)) f.b = true;
        if (st.fontStyle === "italic") f.i = true;
        if (st.textDecoration && st.textDecoration.indexOf("underline") >= 0) f.u = true;
        if (st.textTransform === "uppercase") f.caps = true;
        if (st.color) {
          var rgb = st.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (rgb) f.color = "#" + [1, 2, 3].map(function (i) { return ("0" + parseInt(rgb[i], 10).toString(16)).slice(-2); }).join("");
          else if (/^#[0-9a-f]{6}$/i.test(st.color)) f.color = st.color;
        }
        if (st.backgroundColor && st.backgroundColor !== "transparent" && !/rgba\(0, 0, 0, 0\)/.test(st.backgroundColor)) f.hl = "yellow";
        if (st.fontSize) {
          var px = parseFloat(st.fontSize);
          if (px) f.size = Math.round(px * 1.5);
        }
      }
      Array.prototype.forEach.call(node.childNodes, function (c) { walk(c, f); });
    }
    Array.prototype.forEach.call(div.childNodes, function (n) { walk(n, {}); });
    return out.join("");
  }

  function paragraphXml(b, doc) {
    var style = doc.style || {};
    var jc = b.align || (b.type === "h1" || b.type === "h2" ? "center" : "");
    var spacing = Math.round((style.lh || 1.65) * 240);
    var after = Math.round((style.paraSpacing === undefined ? 6 : style.paraSpacing) * 20);
    var pPr = "<w:pPr>";
    pPr += "<w:spacing w:line=\"" + spacing + "\" w:lineRule=\"auto\" w:before=\"0\" w:after=\"" + after + "\"/>";
    if (style.firstLine) {
      var fl = (style.firstLine === true || style.firstLine === 1) ? 12.7 : Number(style.firstLine);
      pPr += "<w:ind w:firstLine=\"" + twips(fl) + "\"/>";
    };
    if (b.indent) pPr += "<w:ind w:left=\"" + (b.indent * 720) + "\"/>";
    if (jc) pPr += "<w:jc w:val=\"" + ({ left: "left", center: "center", right: "right", justify: "both" })[jc] + "\"/>";
    if (b.type === "h1") pPr += "<w:outlineLvl w:val=\"0\"/>";
    if (b.type === "h2") pPr += "<w:outlineLvl w:val=\"1\"/>";
    if (b.type === "h3") pPr += "<w:outlineLvl w:val=\"2\"/>";
    if (b.type === "quote") pPr += "<w:ind w:left=\"720\"/>";
    pPr += "</w:pPr>";
    var fonts = fontNames(doc);
    var base = {
      font: fonts.dev,
      latinFont: fonts.latin,
      size: style.size || 12
    };
    return "<w:p>" + pPr + inlineRuns(b.html, base) + "</w:p>";
  }

  function tableXml(html, doc) {
    var div = document.createElement("div");
    div.innerHTML = html || "";
    var table = div.querySelector("table");
    if (!table) return "";
    var rows = Array.prototype.slice.call(table.querySelectorAll("tr"));
    if (!rows.length) return "";
    var cols = 0;
    rows.forEach(function (r) { cols = Math.max(cols, r.children.length); });
    if (!cols) return "";
    var width = Math.floor(9360 / cols);
    var grid = "<w:tblGrid>" + new Array(cols + 1).join("<w:gridCol w:w=\"" + width + "\"/>") + "</w:tblGrid>";
    var body = rows.map(function (r) {
      var cells = Array.prototype.slice.call(r.children).map(function (c) {
        var isHead = c.nodeName.toLowerCase() === "th";
        var text = (c.innerText || c.textContent || "").replace(/\s+/g, " ").trim();
        return "<w:tc><w:tcPr><w:tcW w:w=\"" + width + "\" w:type=\"dxa\"/></w:tcPr><w:p><w:pPr><w:spacing w:after=\"20\"/></w:pPr>" +
          "<w:r>" + runProps({ font: fontNames(doc).dev, latinFont: fontNames(doc).latin, size: (doc.style.size || 12) }, { b: isHead }) +
          "<w:t xml:space=\"preserve\">" + xmlEscape(text) + "</w:t></w:r></w:p></w:tc>";
      }).join("");
      return "<w:tr>" + cells + "</w:tr>";
    }).join("");
    return "<w:tbl><w:tblPr><w:tblStyle w:val=\"TableGrid\"/><w:tblW w:w=\"5000\" w:type=\"pct\"/>" +
      "<w:tblBorders>" +
      ["top", "left", "bottom", "right", "insideH", "insideV"].map(function (s) {
        return "<w:" + s + " w:val=\"single\" w:sz=\"4\" w:space=\"0\" w:color=\"808080\"/>";
      }).join("") +
      "</w:tblBorders></w:tblPr>" + grid + body + "</w:tbl>";
  }

  D.toDocxBlob = function (doc) {
    var page = doc.page || {};
    var size = D.PAGE_SIZES[page.size] || D.PAGE_SIZES.A4;
    var landscape = page.orientation === "landscape";
    var w = landscape ? size.h : size.w;
    var h = landscape ? size.w : size.h;
    var m = page.margins || {};

    var body = "";
    (doc.blocks || []).forEach(function (b) {
      if (b.type === "pagebreak") { body += "<w:p><w:r><w:br w:type=\"page\"/></w:r></w:p>"; return; }
      if (b.type === "hr") {
        body += "<w:p><w:pPr><w:pBdr><w:bottom w:val=\"single\" w:sz=\"6\" w:space=\"1\" w:color=\"999999\"/></w:pBdr></w:pPr></w:p>";
        return;
      }
      if (b.type === "table") { body += tableXml(b.html, doc); body += "<w:p/>"; return; }
      if (b.type === "image") { body += "<w:p><w:r><w:t>[Image]</w:t></w:r></w:p>"; return; }
      if (b.type === "li") {
        body += paragraphXml({ html: xmlEscape((b.marker || "•") + " ") + (b.html || ""), align: b.align }, doc);
        return;
      }
      body += paragraphXml(b, doc);
    });
    if (!body) body = "<w:p/>";

    var lnNum = page.lineNumbers
      ? "<w:lnNumType w:countBy=\"" + (page.lineNumberEvery || 1) + "\" w:restart=\"continuous\" w:distance=\"360\"/>"
      : "";
    var cols = page.columns > 1
      ? "<w:cols w:num=\"" + page.columns + "\" w:space=\"720\"/>"
      : "";
    var headerRef = page.headerText ? "<w:headerReference w:type=\"default\" r:id=\"rIdHdr\"/>" : "";
    var footerRef = (page.footerText || page.numbers !== false) ? "<w:footerReference w:type=\"default\" r:id=\"rIdFtr\"/>" : "";

    var sect = "<w:sectPr>" + headerRef + footerRef + lnNum +
      "<w:pgSz w:w=\"" + twips(w) + "\" w:h=\"" + twips(h) + "\"" + (landscape ? " w:orient=\"landscape\"" : "") + "/>" +
      "<w:pgMar w:top=\"" + twips(m.top || 25.4) + "\" w:right=\"" + twips(m.right || 25.4) +
      "\" w:bottom=\"" + twips(m.bottom || 25.4) + "\" w:left=\"" + twips(m.left || 25.4) +
      "\" w:header=\"708\" w:footer=\"708\" w:gutter=\"0\"/>" + cols + "</w:sectPr>";

    var documentXml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" " +
      "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" " +
      "xmlns:v=\"urn:schemas-microsoft-com:vml\" " +
      "xmlns:o=\"urn:schemas-microsoft-com:office:office\" " +
      "xmlns:w10=\"urn:schemas-microsoft-com:office:word\">" +
      "<w:body>" + body + sect + "</w:body></w:document>";

    var headerXml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<w:hdr xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" " +
      "xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\" " +
      "xmlns:w10=\"urn:schemas-microsoft-com:office:word\">" +
      "<w:p><w:pPr><w:jc w:val=\"center\"/><w:pBdr><w:bottom w:val=\"single\" w:sz=\"4\" w:space=\"1\" w:color=\"BFBFBF\"/></w:pBdr></w:pPr>" +
      "<w:r>" + runProps({ font: fontNames(doc).dev, latinFont: fontNames(doc).latin, size: 9 }, {}) +
      "<w:t xml:space=\"preserve\">" + xmlEscape(page.headerText || "") + "</w:t></w:r></w:p>" +
      (page.watermark ? watermarkXml(page.watermark, page.watermarkOpacity) : "") +
      "</w:hdr>";

    var footerXml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<w:ftr xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">" +
      "<w:p><w:pPr><w:jc w:val=\"center\"/><w:pBdr><w:top w:val=\"single\" w:sz=\"4\" w:space=\"1\" w:color=\"BFBFBF\"/></w:pBdr></w:pPr>" +
      (page.footerText ? "<w:r>" + runProps({ font: fontNames(doc).dev, latinFont: fontNames(doc).latin, size: 9 }, {}) +
        "<w:t xml:space=\"preserve\">" + xmlEscape(page.footerText) + "  </w:t></w:r>" : "") +
      (page.numbers !== false
        ? "<w:r>" + runProps({ font: fontNames(doc).dev, latinFont: fontNames(doc).latin, size: 9 }, {}) + "<w:t>Page </w:t></w:r>" +
          "<w:r><w:fldChar w:fldCharType=\"begin\"/></w:r>" +
          "<w:r><w:instrText xml:space=\"preserve\"> PAGE </w:instrText></w:r>" +
          "<w:r><w:fldChar w:fldCharType=\"separate\"/></w:r>" +
          "<w:r><w:t>1</w:t></w:r>" +
          "<w:r><w:fldChar w:fldCharType=\"end\"/></w:r>"
        : "") +
      "</w:p></w:ftr>";

    var contentTypes = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
      "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
      "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
      "<Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>" +
      "<Override PartName=\"/word/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml\"/>" +
      "<Override PartName=\"/word/header1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml\"/>" +
      "<Override PartName=\"/word/footer1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml\"/>" +
      "<Override PartName=\"/docProps/core.xml\" ContentType=\"application/vnd.openxmlformats-package.core-properties+xml\"/>" +
      "<Override PartName=\"/docProps/app.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.extended-properties+xml\"/>" +
      "</Types>";

    var rels = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
      "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"word/document.xml\"/>" +
      "<Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties\" Target=\"docProps/core.xml\"/>" +
      "<Relationship Id=\"rId3\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties\" Target=\"docProps/app.xml\"/>" +
      "</Relationships>";

    var docRels = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">" +
      "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>" +
      "<Relationship Id=\"rIdHdr\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/header\" Target=\"header1.xml\"/>" +
      "<Relationship Id=\"rIdFtr\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer\" Target=\"footer1.xml\"/>" +
      "</Relationships>";

    var styles = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<w:styles xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">" +
      "<w:docDefaults><w:rPrDefault><w:rPr>" +
      "<w:rFonts w:ascii=\"" + xmlEscape(fontNames(doc).latin) + "\" w:hAnsi=\"" + xmlEscape(fontNames(doc).latin) +
      "\" w:cs=\"" + xmlEscape(fontNames(doc).dev) + "\" w:eastAsia=\"" + xmlEscape(fontNames(doc).dev) + "\"/>" +
      "<w:sz w:val=\"" + halfPoints(doc.style.size || 12) + "\"/><w:szCs w:val=\"" + halfPoints(doc.style.size || 12) + "\"/>" +
      "<w:lang w:val=\"hi-IN\" w:bidi=\"hi-IN\"/></w:rPr></w:rPrDefault></w:docDefaults>" +
      "<w:style w:type=\"paragraph\" w:default=\"1\" w:styleId=\"Normal\"><w:name w:val=\"Normal\"/></w:style>" +
      "<w:style w:type=\"table\" w:styleId=\"TableGrid\"><w:name w:val=\"Table Grid\"/>" +
      "<w:tblPr><w:tblBorders><w:top w:val=\"single\" w:sz=\"4\" w:color=\"808080\"/><w:left w:val=\"single\" w:sz=\"4\" w:color=\"808080\"/>" +
      "<w:bottom w:val=\"single\" w:sz=\"4\" w:color=\"808080\"/><w:right w:val=\"single\" w:sz=\"4\" w:color=\"808080\"/>" +
      "<w:insideH w:val=\"single\" w:sz=\"4\" w:color=\"808080\"/><w:insideV w:val=\"single\" w:sz=\"4\" w:color=\"808080\"/>" +
      "</w:tblBorders></w:tblPr></w:style>" +
      "</w:styles>";

    var core = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<cp:coreProperties xmlns:cp=\"http://schemas.openxmlformats.org/package/2006/metadata/core-properties\" " +
      "xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:dcterms=\"http://purl.org/dc/terms/\" " +
      "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">" +
      "<dc:title>" + xmlEscape(doc.title) + "</dc:title>" +
      "<dc:creator>" + xmlEscape((doc.meta && doc.meta.author) || "NyayaLekh") + "</dc:creator>" +
      "<dc:subject>" + xmlEscape((doc.meta && doc.meta.subject) || "") + "</dc:subject>" +
      "<cp:lastModifiedBy>NyayaLekh</cp:lastModifiedBy>" +
      "<dcterms:created xsi:type=\"dcterms:W3CDTF\">" + new Date(doc.createdAt || Date.now()).toISOString() + "</dcterms:created>" +
      "<dcterms:modified xsi:type=\"dcterms:W3CDTF\">" + new Date().toISOString() + "</dcterms:modified>" +
      "</cp:coreProperties>";

    var appXml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<Properties xmlns=\"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties\">" +
      "<Application>NyayaLekh</Application><AppVersion>2.0</AppVersion></Properties>";

    var zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypes);
    zip.folder("_rels").file(".rels", rels);
    zip.folder("word").file("document.xml", documentXml);
    zip.folder("word").file("styles.xml", styles);
    zip.folder("word").file("header1.xml", headerXml);
    zip.folder("word").file("footer1.xml", footerXml);
    zip.folder("word").folder("_rels").file("document.xml.rels", docRels);
    zip.folder("docProps").file("core.xml", core);
    zip.folder("docProps").file("app.xml", appXml);
    return zip.generateAsync({
      type: "arraybuffer",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      compression: "DEFLATE"
    }).then(function (buf) {
      return new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });
    });
  };

  function watermarkXml(text, opacity) {
    var alpha = Math.round((opacity === undefined ? 0.08 : opacity) * 100000);
    return "<w:p><w:r><w:rPr><w:noProof/></w:rPr><w:pict>" +
      "<v:shapetype id=\"_x0000_t136\" coordsize=\"21600,21600\" o:spt=\"136\" adj=\"10800\" path=\"m@7,l@8,m@5,21600l@6,21600e\">" +
      "<v:formulas/><v:path textpathok=\"t\" o:connecttype=\"custom\"/><v:textpath on=\"t\" fitshape=\"t\"/></v:shapetype>" +
      "<v:shape id=\"PowerPlusWaterMarkObject\" type=\"#_x0000_t136\" style=\"position:absolute;margin-left:0;margin-top:0;width:520pt;height:110pt;rotation:-45;z-index:-251658752;mso-position-horizontal:center;mso-position-vertical:center\" o:allowincell=\"f\">" +
      "<v:fill opacity=\"" + alpha + "f\"/><v:textpath style=\"font-family:&quot;Arial&quot;;font-size:1pt\" string=\"" + xmlEscape(text) + "\"/>" +
      "</v:shape></w:pict></w:r></w:p>";
  }

  /* ==========================================================================
   * 5. IMPORT
   * ======================================================================== */
  function base64ToArrayBuffer(b64) {
    var bin = atob(String(b64 || "").replace(/\s/g, ""));
    var len = bin.length, bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  D.base64ToArrayBuffer = base64ToArrayBuffer;

  function runsFromDocxPara(p) {
    var parts = [];
    var runs = p.getElementsByTagName("w:r");
    for (var i = 0; i < runs.length; i++) {
      var r = runs[i];
      var rPr = r.getElementsByTagName("w:rPr")[0];
      var b = false, it = false, u = false, s = false, sup = false, sub = false;
      if (rPr) {
        b = !!rPr.getElementsByTagName("w:b")[0];
        it = !!rPr.getElementsByTagName("w:i")[0];
        u = !!rPr.getElementsByTagName("w:u")[0];
        s = !!rPr.getElementsByTagName("w:strike")[0];
        var va = rPr.getElementsByTagName("w:vertAlign")[0];
        if (va) { sup = va.getAttribute("w:val") === "superscript"; sub = va.getAttribute("w:val") === "subscript"; }
      }
      var texts = r.getElementsByTagName("w:t");
      var buf = "";
      for (var j = 0; j < texts.length; j++) buf += texts[j].textContent;
      if (r.getElementsByTagName("w:br").length) buf += "\n";
      if (!buf) continue;
      var html = U.escapeHtml(buf).replace(/\n/g, "<br>");
      if (b) html = "<b>" + html + "</b>";
      if (it) html = "<i>" + html + "</i>";
      if (u) html = "<u>" + html + "</u>";
      if (s) html = "<s>" + html + "</s>";
      if (sup) html = "<sup>" + html + "</sup>";
      if (sub) html = "<sub>" + html + "</sub>";
      parts.push(html);
    }
    return parts.join("");
  }

  D.importDocx = function (buf) {
    return JSZip.loadAsync(buf).then(function (zip) {
      return zip.file("word/document.xml").async("string");
    }).then(function (xml) {
      var xdoc = new DOMParser().parseFromString(xml, "application/xml");
      var body = xdoc.getElementsByTagName("w:body")[0];
      var blocks = [];
      var nodes = body ? Array.prototype.slice.call(body.childNodes) : [];

      function paraBlock(p) {
        var html = runsFromDocxPara(p);
        var pPr = p.getElementsByTagName("w:pPr")[0];
        var align = "", type = "p";
        if (pPr) {
          var jc = pPr.getElementsByTagName("w:jc")[0];
          if (jc) {
            var v = jc.getAttribute("w:val");
            align = v === "both" ? "justify" : v === "center" ? "center" : v === "right" ? "right" : v === "left" ? "left" : "";
          }
          var ol = pPr.getElementsByTagName("w:outlineLvl")[0];
          if (ol) {
            var lvl = ol.getAttribute("w:val");
            type = lvl === "0" ? "h1" : lvl === "1" ? "h2" : "h3";
          }
          var pStyle = pPr.getElementsByTagName("w:pStyle")[0];
          if (pStyle) {
            var sv = (pStyle.getAttribute("w:val") || "").toLowerCase();
            if (sv.indexOf("heading1") >= 0 || sv === "title") type = "h1";
            else if (sv.indexOf("heading2") >= 0) type = "h2";
            else if (sv.indexOf("heading") >= 0) type = "h3";
            else if (sv.indexOf("quote") >= 0) type = "quote";
          }
        }
        if (!U.stripTags(html).trim() && type === "p") return;
        blocks.push(D.newBlock(type, html, { align: align }));
      }

      function tableBlock(tbl) {
        var rows = Array.prototype.slice.call(tbl.getElementsByTagName("w:tr"));
        if (!rows.length) return;
        var html = "<table><tbody>";
        rows.forEach(function (tr) {
          html += "<tr>";
          Array.prototype.slice.call(tr.getElementsByTagName("w:tc")).forEach(function (tc) {
            var txt = "";
            Array.prototype.slice.call(tc.getElementsByTagName("w:t")).forEach(function (t) { txt += t.textContent; });
            html += "<td>" + U.escapeHtml(txt) + "</td>";
          });
          html += "</tr>";
        });
        html += "</tbody></table>";
        blocks.push(D.newBlock("table", html));
      }

      nodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        var tag = n.nodeName.replace(/^w:/, "");
        if (tag === "p") paraBlock(n);
        else if (tag === "tbl") tableBlock(n);
      });
      if (!blocks.length) blocks = [D.newBlock("p", "")];
      return blocks;
    });
  };

  D.importOdt = function (buf) {
    return JSZip.loadAsync(buf).then(function (zip) {
      return zip.file("content.xml").async("string");
    }).then(function (xml) {
      var xdoc = new DOMParser().parseFromString(xml, "application/xml");
      var blocks = [];
      function push(node, isHeading) {
        var text = node.textContent || "";
        if (!text.trim()) return;
        var st = node.getAttribute("text:style-name") || "";
        var align = /center/i.test(st) ? "center" : /right/i.test(st) ? "right" : "";
        blocks.push(D.newBlock(isHeading ? "h1" : "p", U.escapeHtml(text), { align: align }));
      }
      Array.prototype.forEach.call(xdoc.getElementsByTagName("text:h"), function (h) { push(h, true); });
      Array.prototype.forEach.call(xdoc.getElementsByTagName("text:p"), function (p) { push(p, false); });
      return blocks.length ? blocks : [D.newBlock("p", "")];
    });
  };

  D.importRtf = function (text) {
    var out = [], cur = "";
    var stack = [{ b: 0, i: 0, u: 0 }];
    var i = 0;
    while (i < text.length) {
      var c = text.charAt(i);
      if (c === "\\") {
        var m = /^\\([a-zA-Z]+)(-?\d+)? ?/.exec(text.slice(i));
        if (m) {
          var word = m[1], arg = m[2];
          if (word === "par" || word === "line") { out.push(cur); cur = ""; }
          else if (word === "tab") cur += "\t";
          else if (word === "u") { cur += String.fromCharCode(parseInt(arg, 10)); i += 2; }
          else if (word === "b") stack[stack.length - 1].b = 1;
          else if (word === "i") stack[stack.length - 1].i = 1;
          else if (word === "ul") stack[stack.length - 1].u = 1;
          else if (word === "b0") stack[stack.length - 1].b = 0;
          else if (word === "i0") stack[stack.length - 1].i = 0;
          else if (word === "ulnone") stack[stack.length - 1].u = 0;
          i += m[0].length;
          continue;
        }
        var ctrl = text.charAt(i + 1);
        if (ctrl === "'") { cur += String.fromCharCode(parseInt(text.substr(i + 2, 2), 16)); i += 4; continue; }
        if (ctrl === "\\" || ctrl === "{" || ctrl === "}") { cur += ctrl; i += 2; continue; }
        i += 2; continue;
      }
      if (c === "{") { stack.push(Object.assign({}, stack[stack.length - 1])); i++; continue; }
      if (c === "}") { if (stack.length > 1) stack.pop(); i++; continue; }
      if (c === "\n" || c === "\r") { i++; continue; }
      cur += c;
      i++;
    }
    if (cur) out.push(cur);
    return out.filter(function (l) { return l.trim() !== ""; })
      .map(function (line) { return D.newBlock("p", U.escapeHtml(line)); });
  };

  D.htmlToBlocks = function (html) {
    var d = document.createElement("div");
    d.innerHTML = html;
    U.$$("script,style,meta,link", d).forEach(function (n) { n.remove(); });
    var blocks = [];
    function pushFrom(el) {
      var tag = (el.nodeName || "").toLowerCase();
      var inner = el.innerHTML || "";
      var text = el.textContent || "";
      if (!text.trim() && tag !== "br") return;
      if (tag === "h1") blocks.push(D.newBlock("h1", inner, { align: "center" }));
      else if (/^h[2-3]$/.test(tag)) blocks.push(D.newBlock("h2", inner));
      else if (/^h[4-6]$/.test(tag)) blocks.push(D.newBlock("h3", inner));
      else if (tag === "li") blocks.push(D.newBlock("li", inner, { marker: "•" }));
      else if (tag === "table") {
        var rows = U.$$("tr", el).map(function (tr) {
          return "<tr>" + U.$$("td,th", tr).map(function (td) {
            return "<td>" + U.escapeHtml(td.textContent.trim()) + "</td>";
          }).join("") + "</tr>";
        }).join("");
        blocks.push(D.newBlock("table", "<table><tbody>" + rows + "</tbody></table>"));
      } else if (tag === "p" || tag === "div") {
        blocks.push(D.newBlock("p", inner.replace(/<\/?div[^>]*>/g, "<br>")));
      } else blocks.push(D.newBlock("p", inner));
    }
    Array.prototype.forEach.call(d.childNodes, function (n) {
      if (n.nodeType === 1) pushFrom(n);
      else if (n.nodeType === 3 && n.nodeValue.trim()) blocks.push(D.newBlock("p", U.escapeHtml(n.nodeValue.trim())));
    });
    if (!blocks.length && d.textContent.trim()) {
      d.textContent.split(/\n+/).forEach(function (line) {
        if (line.trim()) blocks.push(D.newBlock("p", U.escapeHtml(line)));
      });
    }
    return blocks;
  };

  /** PDF text extraction using the platform DecompressionStream. */
  function inflatePdf(buf) {
    var bytes = new Uint8Array(buf);
    var full = new TextDecoder("latin1").decode(bytes);
    var streamRe = /stream\r?\n/g, m, jobs = [];
    while ((m = streamRe.exec(full))) {
      var idx = m.index + m[0].length;
      var end = full.indexOf("endstream", idx);
      if (end < 0) continue;
      jobs.push(bytes.slice(idx, end));
    }
    if (!jobs.length) return Promise.reject(new Error(ND.t("pdfNeedsText")));
    var results = [];
    return jobs.reduce(function (p, chunk) {
      return p.then(function () {
        if (typeof DecompressionStream === "undefined") { results.push(""); return; }
        try {
          var stream = new Blob([chunk]).stream().pipeThrough(new DecompressionStream("deflate"));
          return new Response(stream).arrayBuffer().then(function (ab) {
            results.push(extractPdfText(new TextDecoder("latin1").decode(new Uint8Array(ab))));
          }).catch(function () { results.push(""); });
        } catch (e) { results.push(""); }
      });
    }, Promise.resolve()).then(function () {
      var text = results.join("\n").trim();
      if (!text) throw new Error(ND.t("pdfNeedsText"));
      return text;
    });
  }

  function extractPdfText(str) {
    var out = "";
    var re = /\((?:\\.|[^\\)])*\)/g;
    str.split(/(?:Td|TD|T\*|ET)/).forEach(function (line) {
      var m, parts = [];
      while ((m = re.exec(line))) parts.push(m[0].slice(1, -1).replace(/\\([()\\])/g, "$1"));
      var joined = parts.join("");
      if (joined.trim()) out += joined + "\n";
      re.lastIndex = 0;
    });
    return out;
  }

  D.importFile = function (name, base64) {
    var lower = String(name || "").toLowerCase();
    var buf = base64 ? base64ToArrayBuffer(base64) : null;
    if (/\.docx$/.test(lower)) return D.importDocx(buf);
    if (/\.odt$/.test(lower)) return D.importOdt(buf);
    if (/\.rtf$/.test(lower)) return Promise.resolve(D.importRtf(new TextDecoder("utf-8").decode(new Uint8Array(buf))));
    if (/\.(html?|htm)$/.test(lower)) return Promise.resolve(D.htmlToBlocks(new TextDecoder("utf-8").decode(new Uint8Array(buf))));
    if (/\.(txt|md|text)$/.test(lower)) {
      var txt = new TextDecoder("utf-8").decode(new Uint8Array(buf));
      return Promise.resolve(txt.split(/\r?\n/).map(function (l) { return D.newBlock("p", U.escapeHtml(l)); }));
    }
    if (/\.pdf$/.test(lower)) {
      return inflatePdf(buf).then(function (text) {
        return text.split(/\n+/).map(function (l) { return D.newBlock("p", U.escapeHtml(l.trim())); });
      });
    }
    if (/\.doc$/.test(lower)) return Promise.reject(new Error(ND.t("oldDoc")));
    return Promise.reject(new Error(ND.t("unsupportedFile")));
  };

  /* ==========================================================================
   * 6. OTHER EXPORTS
   * ======================================================================== */
  D.toHtml = function (doc) {
    var body = (doc.blocks || []).map(function (b) {
      if (b.type === "pagebreak") return "<div style=\"break-after:page\"></div>";
      if (b.type === "hr") return "<hr>";
      if (b.type === "table" || b.type === "image") return b.html || "";
      var tag = b.type === "h1" ? "h1" : b.type === "h2" ? "h2" : b.type === "h3" ? "h3" : "p";
      var style = "text-align:" + (b.align || (b.type === "h1" || b.type === "h2" ? "center" : "left")) + ";";
      if (b.type === "quote") style += "padding-left:18pt;border-left:2px solid #ccc;font-style:italic;";
      return "<" + tag + " style=\"" + style + "\">" + (b.type === "li" ? (b.marker || "•") + " " : "") + (b.html || "") + "</" + tag + ">";
    }).join("\n");
    var page = doc.page || {};
    return "<!DOCTYPE html><html lang=\"hi\"><head><meta charset=\"utf-8\"><title>" + U.escapeHtml(doc.title) +
      "</title><style>@page{size:" + (page.size === "A4" ? "A4" : page.size) + (page.orientation === "landscape" ? " landscape" : "") +
      ";margin:" + ((page.margins || {}).top || 25.4) + "mm}" +
      "body{font-family:'" + fontNames(doc).dev + "','" + fontNames(doc).latin + "',serif;font-size:" + (doc.style.size || 12) + "pt;line-height:" + (doc.style.lh || 1.65) + ";max-width:180mm;margin:auto;color:#111}" +
      "table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:6px}" +
      "</style></head><body>" + body + "</body></html>";
  };

  D.toText = function (doc) {
    return (doc.blocks || []).map(function (b) {
      if (b.type === "table") return U.stripTags(b.html);
      if (b.type === "pagebreak") return "\n\f\n";
      return b.type === "li" ? (b.marker || "•") + " " + U.stripTags(b.html) : U.stripTags(b.html);
    }).join("\n");
  };

  D.toMarkdown = function (doc) {
    return (doc.blocks || []).map(function (b) {
      var text = U.stripTags(b.html).trim();
      if (b.type === "h1") return "# " + text;
      if (b.type === "h2") return "## " + text;
      if (b.type === "h3") return "### " + text;
      if (b.type === "li") return (b.marker || "-") + " " + text;
      if (b.type === "quote") return "> " + text;
      if (b.type === "hr") return "---";
      if (b.type === "pagebreak") return "\n---\n";
      if (b.type === "table") {
        var div = document.createElement("div");
        div.innerHTML = b.html;
        var rows = U.$$("tr", div).map(function (tr) {
          return "| " + U.$$("td,th", tr).map(function (td) { return td.textContent.trim(); }).join(" | ") + " |";
        });
        if (!rows.length) return text;
        var head = "| " + U.$$("td,th", U.$$("tr", div)[0]).map(function () { return "---"; }).join(" | ") + " |";
        return [rows[0], head].concat(rows.slice(1)).join("\n");
      }
      return text;
    }).join("\n\n");
  };

  D.toRtf = function (doc) {
    function esc(s) {
      var out = "";
      for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c > 127) out += "\\u" + c + "?";
        else if (c === 92 || c === 123 || c === 125) out += "\\" + s.charAt(i);
        else out += s.charAt(i);
      }
      return out;
    }
    var body = (doc.blocks || []).map(function (b) {
      var t = (b.type === "li" ? (b.marker || "•") + " " : "") + U.stripTags(b.html);
      var align = b.align === "center" ? "\\qc " : b.align === "right" ? "\\qr " : b.align === "justify" ? "\\qj " : "\\ql ";
      var bold = (b.type === "h1" || b.type === "h2" || b.type === "h3") ? "\\b " : "";
      return align + bold + esc(t) + "\\b0 \\par";
    }).join("\n");
    var fn = fontNames(doc);
    return "{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 " + fn.dev + ";}{\\f1 " + fn.latin + ";}}" +
      "\\f0\\fs" + Math.round((doc.style.size || 12) * 2) + "\n" + body + "\n}";
  };
})(window);
