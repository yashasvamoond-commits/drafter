/* =============================================================================
 * NyayaLekh — document model, Rajasthan court templates, import & export.
 * ========================================================================== */
(function (global) {
  "use strict";
  var ND = (global.ND = global.ND || {});
  var U = ND.util, T = ND.text;

  /* ==========================================================================
   * 1. MODEL
   * ======================================================================== */
  var D = (ND.doc = {});

  D.PAGE_SIZES = {
    A4: { w: 210, h: 297, label: "A4 (210 × 297 मिमी)" },
    Legal: { w: 215.9, h: 355.6, label: "Legal (8.5 × 14 in)" },
    Letter: { w: 215.9, h: 279.4, label: "Letter (8.5 × 11 in)" },
    A5: { w: 148, h: 210, label: "A5 (148 × 210 मिमी)" }
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
    var s = ND.settings;
    return Object.assign({
      id: U.uid("doc"),
      title: "अनाम दस्तावेज़",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      page: { size: s.pageSize || "A4", margins: Object.assign({}, s.margins), numbers: true },
      style: { font: s.font, size: s.fontSize, lh: s.lineHeight },
      court: { type: "JM", place: "", name: "", judge: "", prosecutor: "" },
      blocks: [D.newBlock("p", "")]
    }, opts || {});
  };

  D.plainText = function (doc) {
    return (doc.blocks || []).map(function (b) {
      return U.stripTags(b.html || "").replace(/\u00a0/g, " ");
    }).join("\n");
  };

  D.stats = function (doc) { return U.wordStats(D.plainText(doc)); };

  D.touch = function (doc) { doc.updatedAt = Date.now(); return doc; };

  /* ==========================================================================
   * 2. COURT / PARTY PRESETS  (Rajasthan)
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
    { id: "HC", hi: "राजस्थान उच्च न्यायालय", en: "Rajasthan High Court", prefix: "राजस्थान उच्च न्यायालय, जोधपुर / जयपुर" }
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
    var today = new Date();
    var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
    return {
      "{{court}}": D.courtName(doc),
      "{{judge}}": c.judge || "……………………",
      "{{place}}": c.place || "जयपुर",
      "{{date}}": pad(today.getDate()) + "." + pad(today.getMonth() + 1) + "." + today.getFullYear(),
      "{{today}}": pad(today.getDate()) + "." + pad(today.getMonth() + 1) + "." + today.getFullYear(),
      "{{year}}": String(today.getFullYear()),
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
  function tpl(id, cat, title, sub, blocks) { return { id: id, cat: cat, title: title, sub: sub, blocks: blocks }; }

  ND.templates = [
    /* ---------------- criminal ---------------- */
    tpl("bail", "criminal", "अंतरिम जमानत आवेदन पत्र",
      "धारा 482 BNSS / 438 CrPC · अपर मुख्य/न्यायिक मजिस्ट्रेट के समक्ष", [
        "{{court}}",
        "प्रकरण संख्या {{caseNo}}",
        "{{party}}",
        "आवेदक / अभियुक्त — …………………………",
        "धाराएँ — {{sections}} · {{ps}}",
        "==================== आवेदन पत्र ====================",
        "महोदय,",
        "विनम्र निवेदन है कि आवेदक के विरुद्ध उपरोक्त प्रकरण में संलग्न धाराओं के अंतर्गत परिवाद/प्रकृति आख्या प्रस्तुत की गई है। आवेदक निर्दोष है तथा उसे केवल सौहार्दपूर्ण व्यापारिक विवाद के कारण झूठा फँसाया गया है।",
        "आवेदक स्थायी निवासी है, उसका कोई पूर्व अपराधिक रिकॉर्ड नहीं है और वह विवेचना में पूर्ण सहयोग करने का वचन देता है। आवेदक के पक्ष में निम्नलिखित आधार हैं—",
        "क) प्रकरण की प्रकृति शमनीय एवं तथ्यात्मक है; आवेदक की भूमिका सामग्री से सिद्ध नहीं होती।",
        "ख) आवेदक पलायन करने वाला नहीं है; उसका कोई पूर्व दण्डित इतिहास नहीं है।",
        "ग) साक्षियों/साक्ष्यों से छेड़छाड़ की कोई संभावना नहीं है और आवेदक विवेचना में पूर्ण सहयोग करेगा।",
        "घ) समाज में आवेदक की प्रतिष्ठा है; अभियुक्त के रूप में गिरफ्तारी से उसकी आजीविका एवं पारिवारिक जीवन प्रभावित होगा।",
        "अतः श्रीमान न्यायालय से प्रार्थना है कि आवेदक को सुविधाजनक जमानत एवं मुचलके पर अंतरिम जमानत प्रदान करने की कृपा की जाए।",
        "दिनांक {{date}}",
        "भवदीय,",
        "─────────────────────",
        "अधिवक्ता, आवेदक/अभियुक्त की ओर से",
        "स्थान — {{place}}"
      ]),

    tpl("chargesheet", "criminal", "आरोप पत्र (प्रकरण पत्र)",
      "पुलिस थाना → न्यायालय · भारतीय नागरिक सुरक्षा संहिता", [
        "{{court}}",
        "=== आरोप पत्र ===",
        "प्रकरण संख्या {{caseNo}}",
        "थाना — {{ps}}",
        "धाराएँ — {{sections}}",
        "=== 1. अभियोजन का संक्षिप्त विवरण ===",
        "परिवादी ………………………… की ओर से दिनांक {{date}} को लिखित रिपोर्ट प्राप्त हुई, जिस पर प्रकरण क्रमांक …………/{{year}} अंतर्गत उपरोक्त धाराओं में प्रकरण दर्ज किया गया।",
        "=== 2. तथ्य ===",
        "विवेचना के दौरान यह सामने आया कि ……………………………………………………………………………………",
        "=== 3. साक्षियों के नाम ===",
        "क) ……………… पुत्र ……………… निवासी ………………",
        "ख) ……………… पुत्र ……………… निवासी ………………",
        "=== 4. अभिलेखीय साक्ष्य ===",
        "क) प्रकृति आख्या / रिपोर्ट  ख) घटनास्थल निरीक्षण मेमो  ग) कब्जा मेमो",
        "=== 5. अभियुक्त का विवरण ===",
        "नाम — ……………… पुत्र — ……………… निवासी — ……………… आयु — ………… वर्ष",
        "=== 6. निष्कर्ष ===",
        "उपरोक्त विवेचना से यह सिद्ध होता है कि अभियुक्त द्वारा उक्त धाराओं के अंतर्गत अपराध किया गया है। अतः आरोप पत्र श्रीमान न्यायालय के समक्ष प्रस्तुत है।",
        "दिनांक {{date}}",
        "पुलिस अधिकारी / विवेचक",
        "───────────────",
        "{{ps}}"
      ]),

    tpl("fir-report", "criminal", "प्रकृति आख्या (गिरफ्तारी रिपोर्ट)",
      "धारा 58 BNSS · अभिरक्षा हेतु न्यायालय को रिपोर्ट", [
        "{{court}}",
        "प्रकरण संख्या {{caseNo}}",
        "{{party}}",
        "धारा — {{sections}}",
        "=== प्रकृति आख्या ===",
        "1. अभियुक्त का नाम — …………………… पुत्र …………………… निवासी ……………………",
        "2. गिरफ्तारी की तिथि — {{date}} समय — ………… बजे",
        "3. गिरफ्तारी स्थान — ………………………………………",
        "4. गिरफ्तार करने वाला अधिकारी — …………………… पद ……………………",
        "5. संलग्न धाराएँ — {{sections}}",
        "6. साक्ष्य/मुद्दामाल का विवरण — ……………………………………",
        "7. अभियुक्त के स्वास्थ्य संबंधी टिप्पणी — …………………………",
        "8. परिवादी की सूचना — सूचित किया गया / प्रयास किया गया",
        "उपरोक्त विवरण श्रीमान न्यायालय के समक्ष प्रस्तुत है।",
        "दिनांक {{date}}",
        "विवेचक अधिकारी",
        "──────────────",
        "{{ps}}"
      ]),

    tpl("judgment", "criminal", "निर्णय (दोषसिद्धि / दोषमुक्ति)",
      "सत्र/मजिस्ट्रेट न्यायालय हेतु पूर्ण निर्णय प्रारूप", [
        "{{court}}",
        "=== प्रकरण संख्या {{caseNo}} ===",
        "{{party}}",
        "धाराएँ — {{sections}} · {{ps}}",
        "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&",
        "निर्णय",
        "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&",
        "दिनांक — {{date}}",
        "=== 1. प्रकरण का संक्षिप्त इतिहास ===",
        "अभियोजन का संक्षिप्त कथन यह है कि …………………………………………………………………………………………",
        "=== 2. अभियोजन के साक्षी ===",
        "अभियोजन पक्ष की ओर से कुल ……… साक्षी परीक्षित हुए, जिनका विवरण निम्नानुसार है—",
        "क) …………………… (PW-1)  ख) …………………… (PW-2)",
        "=== 3. अभिलेखीय साक्ष्य ===",
        "प्रदर्श प-1 …………………, प्रदर्श प-2 …………………",
        "=== 4. अभियुक्त का कथन ===",
        "अभियुक्त का कथन धारा 351 BNSS के अंतर्गत अंकित किया गया, जिसमें उसने अपने ऊपर लगाए गए आरोपों को अस्वीकार किया तथा अपने बचाव में ………………………………… कथन दिया।",
        "=== 5. तर्क एवं विवेचन ===",
        "उभय पक्ष के विद्वान अधिवक्तागण के तर्क सुने गए तथा समस्त अभिलेख का परिशीलन किया गया। अभियोजन के साक्षी …………………… के कथन में परस्पर विरोधाभास है / विश्वसनीयता संदिग्ध है।",
        "=== 6. निष्कर्ष ===",
        "उपरोक्त विवेचन के आधार पर यह निष्कर्ष निकलता है कि अभियोजन अपने आरोपों को संदेह से परे सिद्ध करने में सफल नहीं हुआ। अतः अभियुक्त को उपरोक्त धाराओं के अंतर्गत दोषमुक्त किया जाता है।",
        "=== 7. आदेश ===",
        "अभियुक्त …………………… को धारा …………………… के अंतर्गत दोषमुक्त किया जाता है। उसके मुचलके उचित प्रक्रिया से रद्द किए जाएँ।",
        "आदेश आज दिनांक {{date}} को हस्ताक्षरित एवं घोषित किया गया।",
        "न्यायाधीश",
        "──────────────",
        "{{court}}"
      ]),

    tpl("order-summon", "criminal", "आदेश — समन / वारंट",
      "न्यायालय आदेश प्रारूप", [
        "{{court}}",
        "प्रकरण संख्या {{caseNo}}",
        "{{party}}",
        "धारा — {{sections}}",
        "=== आदेश ===",
        "प्रकरण के अभिलेख एवं परिवादी के कथन पर विचार किया गया। प्रथम दृष्ट्या उपरोक्त धाराओं के अंतर्गत अभियुक्त के विरुद्ध पर्याप्त सामग्री विद्यमान है।",
        "अतः अभियुक्त …………………… को दिनांक …………/………/{{year}} को न्यायालय के समक्ष उपस्थित होने हेतु समन/वारंट जारी किया जाता है।",
        "न्यायाधीश",
        "──────────────",
        "{{court}}"
      ]),

    tpl("statement-351", "criminal", "अभियुक्त का कथन",
      "धारा 351 BNSS / 313 CrPC", [
        "{{court}}",
        "प्रकरण संख्या {{caseNo}}",
        "अभियुक्त — ………………………… द्वारा कथन",
        "=== प्रश्न 1 ===",
        "प्रश्न — क्या आपने उपरोक्त तिथि को …………………………… किया?",
        "उत्तर — मैंने ऐसा कोई कार्य नहीं किया। मुझे झूठा फँसाया गया है।",
        "=== प्रश्न 2 ===",
        "प्रश्न — क्या आप अपने बचाव में कुछ कहना चाहते हैं?",
        "उत्तर — मैं लिखित बचाव प्रस्तुत करना चाहता हूँ / साक्षी परीक्षित कराना चाहता हूँ।",
        "दिनांक {{date}}",
        "हस्ताक्षर / अंगूठा — …………………",
        "न्यायालय अधिकारी — …………………"
      ]),

    tpl("bailbond", "criminal", "मुचलका एवं जमानतनामा",
      "धारा 484 BNSS हेतु प्रारूप", [
        "{{court}}",
        "प्रकरण संख्या {{caseNo}}",
        "=== मुचलका ===",
        "मैं …………………………… पुत्र …………………………… निवासी …………………………… आयु ………… वर्ष, आज दिनांक {{date}} को निम्नानुसार मुचलका लेता हूँ—",
        "1. मैं श्रीमान न्यायालय द्वारा निर्धारित रु. ………………… की राशि की व्यक्तिगत बॉण्ड राशि के लिए उत्तरदायी रहूँगा।",
        "2. मैं इस प्रकरण में सभी तिथियों पर न्यायालय के समक्ष उपस्थित रहूँगा।",
        "3. मैं विवेचना अधिकारी के निर्देशों का पालन करूँगा तथा प्रकरण से संबंधित साक्षियों को प्रभावित नहीं करूँगा।",
        "4. आवश्यकता होने पर पुलिस थाने में हाजिर होूँगा।",
        "सत्यापन — मैंने उपरोक्त कथन पढ़कर/सुनकर सत्य बताया।",
        "हस्ताक्षर — ……………………",
        "जमीनदार / प्रतिज्ञाकार का नाम एवं हस्ताक्षर — …………………………"
      ]),

    tpl("adjourn", "misc", "स्थगन प्रार्थना पत्र",
      "अधिवक्ता हेतु प्रारूप", [
        "{{court}}",
        "प्रकरण संख्या {{caseNo}}",
        "{{party}}",
        "=== स्थगन प्रार्थना पत्र ===",
        "महोदय,",
        "विनम्र निवेदन है कि उपरोक्त प्रकरण में आवेदक परिवादी/अभियुक्त की ओर से उपस्थित अधिवक्ता के न्यायालय के अन्य प्रकरण में व्यस्त रहने / अस्वस्थ होने के कारण आज प्रकरण पर व्यक्तिगत रूप से बहस नहीं की जा सकी।",
        "अतः आज का प्रकरण किसी अन्य तिथि पर स्थगित करने की कृपा की जाए। प्रकरण में किसी भी पक्षकार का कोई अनावश्यक विलंब नहीं किया जा रहा है।",
        "दिनांक {{date}}",
        "आवेदक / अधिवक्ता"
      ]),

    tpl("copy-app", "misc", "नकल आवेदन",
      "प्रतिलिपि / निर्णय की प्रमाणित नकल हेतु", [
        "{{court}}",
        "प्रकरण संख्या {{caseNo}}",
        "=== नकल आवेदन पत्र ===",
        "महोदय,",
        "विनम्र निवेदन है कि नीचे हस्ताक्षरकर्ता उपरोक्त प्रकरण का पक्षकार है। उसे प्रकरण में प्रस्तुत निम्नलिखित दस्तावेज़ों की प्रमाणित नकल आवश्यक है—",
        "1) आवेदन पत्र एवं अनुलग्नक  2) आदेश/निर्णय की प्रमाणित प्रतिलिपि  3) ………………………",
        "अतः उपरोक्त अभिलेखों की प्रमाणित नकल निर्धारित शुल्क प्राप्त करके प्रदान करने की कृपा की जाए।",
        "दिनांक {{date}}",
        "आवेदक — …………………",
        "अधिवक्ता — …………………"
      ]),

    /* ---------------- civil ---------------- */
    tpl("plaint", "civil", "वाद पत्र (दीवानी)",
      "सिविल न्यायाधीश / अस्थायी निषेधाज्ञा सहित", [
        "{{court}}",
        "=== वाद पत्र ===",
        "वाद संख्या …………/{{year}}",
        "वादी — ……………………………… पुत्र ……………………………… निवासी ………………………………",
        "प्रतिवादी — ……………………………… पुत्र ……………………………… निवासी ………………………………",
        "=== विवरण ===",
        "1. वादी प्रस्तुत वाद का स्वामी एवं वाद व्यय जमा करने में सक्षम है।",
        "2. विवरणित निम्नलिखित भूमि/सम्पत्ति का स्वामी वादी है, जिसका प्रमाण अभिलेखों से स्पष्ट है — ………………………………………",
        "3. वाद-कारण …………………………… को उत्पन्न हुआ, जब प्रतिवादी ने ……………………………… किया।",
        "4. विधिक आधार — संपत्ति के शांतिपूर्ण कब्जे के अधिकार का हनन, अनुबंध का भंग, तथा निषेधाज्ञा का हक़।",
        "5. वाद का मूल्यांकन ………… रु. एवं न्यायशुल्क ………… रु. है।",
        "=== प्रार्थना ===",
        "अतः श्रीमान न्यायालय से प्रार्थना है कि—",
        "क) प्रतिवादी के विरुद्ध वादी के स्वामित्व एवं कब्जे की घोषणा की डिक्री जारी हो;",
        "ख) प्रतिवादी को उपरोक्त संपत्ति में हस्तक्षेप करने से निषिद्ध करने हेतु आदेश हो;",
        "ग) वाद व्यय प्रतिवादी से वादी को दिलाया जाए;",
        "घ) अन्य आवश्यक अनुतोष प्रदान किया जाए।",
        "सत्यापन — मैंने वाद पत्र के कथनों को पढ़कर सत्य पाया।",
        "दिनांक {{date}}",
        "वादी / अधिवक्ता"
      ]),

    tpl("written", "civil", "लिखित कथन",
      "प्रतिवादी का उत्तर", [
        "{{court}}",
        "वाद संख्या …………/{{year}}",
        "वादी — ……………………………… बनाम प्रतिवादी — ………………………………",
        "=== लिखित कथन ===",
        "1. यह कि प्रस्तुत वाद अधिकार क्षेत्र से बाहर एवं विधि-विरुद्ध होने से खारिज करने योग्य है।",
        "2. यह कि वाद पत्र में दिये गये कथन पूर्णतः असत्य एवं निराधार हैं।",
        "3. यह कि प्रतिवादी ……………………………… का वास्तविक स्वामी है तथा उसका कब्जा विवादित नहीं है।",
        "4. यह कि वादी ने वाद-कारण सिद्ध करने हेतु समुचित तथ्य नहीं दिए हैं।",
        "=== प्रार्थना ===",
        "अतः वाद खारिज करने तथा वाद व्यय प्रतिवादी को दिलाने की कृपा की जाए।",
        "दिनांक {{date}}",
        "प्रतिवादी / अधिवक्ता"
      ]),

    tpl("injunction", "civil", "अस्थायी निषेधाज्ञा आवेदन",
      "Order XXXIX Rule 1-2 CPC", [
        "{{court}}",
        "वाद संख्या …………/{{year}}",
        "=== आवेदन (अस्थायी निषेधाज्ञा) ===",
        "महोदय,",
        "विनम्र निवेदन है कि वादी ने प्रस्तुत वाद में ……………………………… की डिक्री हेतु वाद प्रस्तुत किया है। प्रतिवादी द्वारा विवादित संपत्ति पर अवैध रूप से निर्माण/कब्जा करने का प्रयास किया जा रहा है।",
        "वादी का प्रथम दृष्ट्या सशक्त प्रकरण है, अपूरणीय क्षति होगी तथा सुविधा का संतुलन वादी के पक्ष में है।",
        "अतः प्रतिवादी को वाद के निर्णय तक विवादित संपत्ति में किसी प्रकार का हस्तक्षेप न करने हेतु अस्थायी निषेधाज्ञा का आदेश पारित करने की कृपा की जाए।",
        "दिनांक {{date}}",
        "वादी / अधिवक्ता"
      ]),

    tpl("appeal", "civil", "प्रथम अपील",
      "जिला न्यायालय / उच्च न्यायालय हेतु", [
        "{{court}}",
        "=== प्रथम अपील ===",
        "अपील संख्या …………/{{year}}",
        "अपीलकर्ता — ……………………………… बनाम प्रत्यर्थी — ………………………………",
        "1. यह कि विद्वान अधीनस्थ न्यायालय ने दिनांक …………/………/{{year}} के निर्णय/डिक्री द्वारा ……………………………… का निर्णय पारित किया।",
        "2. यह कि विवादित निर्णय विधि एवं तथ्य के विरुद्ध है तथा उसमें अभिलेखीय साक्ष्यों की उपेक्षा की गई है।",
        "3. यह कि विद्वान न्यायालय ने ……………………………… के आधार पर विवादित निष्कर्ष दिया, जो विधि-सम्मत नहीं है।",
        "=== प्रार्थना ===",
        "अतः निम्नलिखित मुद्दों पर विचार करते हुए विवादित निर्णय/डिक्री को अपास्त करने की कृपा की जाए।",
        "दिनांक {{date}}",
        "अपीलकर्ता / अधिवक्ता"
      ]),

    tpl("revision", "civil", "पुनरीक्षण (Criminal Revision)",
      "धारा 438 BNSS / 397 CrPC", [
        "{{court}}",
        "=== पुनरीक्षण याचिका ===",
        "प्रकरण संख्या {{caseNo}}",
        "याचिकाकर्ता — ……………………………… बनाम विरोधी पक्ष — ………………………………",
        "1. यह कि विद्वान अधीनस्थ न्यायालय ने दिनांक …………/………/{{year}} को आदेश पारित किया, जो विधि के विरुद्ध है।",
        "2. यह कि उक्त आदेश में अधिकार क्षेत्र का अभाव है / तथ्यों के गलत अवलोकन से आदेश पारित हुआ है।",
        "3. यह कि आदेश से याचिकाकर्ता को अपूरणीय क्षति होगी।",
        "=== प्रार्थना ===",
        "अतः विवादित आदेश को अपास्त करने की कृपा की जाए।",
        "दिनांक {{date}}",
        "याचिकाकर्ता / अधिवक्ता"
      ]),

    tpl("caveat", "misc", "प्रतिबंध याचिका / केविएट",
      "न्यायालय में सूचना", [
        "{{court}}",
        "=== प्रतिबंध याचिका ===",
        "प्रतिबंधकर्ता — ………………………………",
        "विरोधी पक्ष — ………………………………",
        "महोदय,",
        "विनम्र निवेदन है कि प्रतिबंधकर्ता को भय है कि विरोधी पक्ष द्वारा उपरोक्त प्रकरण में बिना सूचना दिए कोई आवेदन प्रस्तुत किया जा सकता है। अतः कृपया सूचना दिए बिना कोई आदेश पारित न किया जाए।",
        "दिनांक {{date}}",
        "प्रतिबंधकर्ता / अधिवक्ता"
      ]),

    tpl("affidavit", "misc", "शपथ पत्र",
      "सत्यापन सहित प्रारूप", [
        "=== शपथ पत्र ===",
        "मैं ……………………………… पुत्र ……………………………… निवासी ……………………………… आयु ………… वर्ष, शपथपूर्वक कथन करता/करती हूँ कि—",
        "1. मैं उपरोक्त प्रकरण का पक्षकार हूँ तथा कथन करने हेतु सक्षम हूँ।",
        "2. उपरोक्त आवेदन पत्र में दिये गए समस्त तथ्य मेरी व्यक्तिगत जानकारी एवं अभिलेखों पर आधारित सत्य हैं।",
        "3. मैंने इन तथ्यों को सत्य निष्ठा से सत्यापित किया है।",
        "सत्यापन — दिनांक {{date}} को स्थान {{place}} पर सत्यापित किया।",
        "शपथकर्ता — …………………………"
      ]),

    tpl("notice", "misc", "विधिक सूचना (लीगल नोटिस)",
      "अनुबंध/चेक/संपत्ति संबंधी", [
        "सेवा में,",
        "……………………………",
        "विषय — विधिक सूचना हेतु",
        "महोदय,",
        "मैं ……………………………… की ओर से सूचित किया जाता है कि आपने दिनांक …………/………/{{year}} को ……………………………… के संबंध में विवादित कार्य किया, जिससे मेरे पक्षकार को आर्थिक एवं मानसिक क्षति पहुँची है।",
        "अतः आप से अपेक्षा है कि इस सूचना की प्राप्ति के 15 दिवस के भीतर ……………………………… करें, अन्यथा विधिक कार्यवाही प्रारंभ की जाएगी, जिसके समस्त व्यय आपके होंगे।",
        "दिनांक {{date}}",
        "अधिवक्ता — ………………………………"
      ]),

    tpl("rent", "misc", "किराया नियंत्रण आवेदन",
      "नियंत्रक, किराया नियंत्रण हेतु", [
        "{{court}}",
        "=== आवेदन पत्र ===",
        "आवेदक / मकान मालिक — ………………………………",
        "प्रत्यर्थी / किरायेदार — ………………………………",
        "1. यह कि आवेदक उपरोक्त परिसर का मालिक है और प्रत्यर्थी किरायेदार के रूप में रह रहा है।",
        "2. यह कि प्रत्यर्थी ने दिनांक …………/………/{{year}} से किराया देना बंद कर दिया है, बकाया राशि रु. ………… है।",
        "3. यह कि परिसर की आवश्यकता आवेदक के स्वयं/परिवार हेतु है।",
        "=== प्रार्थना ===",
        "अतः परिसर खाली कराने तथा बकाया किराया दिलाने का आदेश पारित करने की कृपा की जाए।",
        "दिनांक {{date}}",
        "आवेदक / अधिवक्ता"
      ]),

    tpl("mact", "misc", "मोटर दुर्घटना दावा (MACT)",
      "अधिकरण हेतु दावा आवेदन", [
        "{{court}}",
        "=== दावा आवेदन पत्र ===",
        "दावा संख्या …………/{{year}}",
        "आवेदक — ……………………………… (दुर्घटना में घायल / मृतक का प्रतिनिधि)",
        "प्रतिवादी 1 — वाहन स्वामी ………………………………",
        "प्रतिवादी 2 — बीमा कंपनी ………………………………",
        "1. यह कि दिनांक …………/………/{{year}} को …………………………… स्थान पर वाहन क्रमांक …………………… द्वारा लापरवाहीपूर्वक चलाकर दुर्घटना की गई।",
        "2. यह कि दुर्घटना में ……………………………… को गंभीर चोटें आईं / मृत्यु हो गई।",
        "3. यह कि मृतक की आयु ………… वर्ष, आय रु. ………… प्रतिमाह थी।",
        "=== प्रार्थना ===",
        "अतः मुआवज़ा राशि रु. ………… देने का आदेश पारित करने की कृपा की जाए।",
        "दिनांक {{date}}",
        "आवेदक / अधिवक्ता"
      ])
  ];

  D.buildTemplate = function (tplId, doc) {
    var t = ND.templates.filter(function (x) { return x.id === tplId; })[0];
    if (!t) return null;
    var blocks = t.blocks.map(function (line) {
      var txt = D.applyVars(line, doc);
      if (/^&+.*&+$/.test(txt)) return D.newBlock("h1", U.escapeHtml(txt.replace(/&/g, "").trim()), { align: "center" });
      if (/^=+.*=+$/.test(txt)) return D.newBlock("h2", U.escapeHtml(txt.replace(/=/g, "").trim()), { align: "center" });
      return D.newBlock("p", U.escapeHtml(txt), { align: /^(भवदीय|न्यायाधीश|हस्ताक्षर|आवेदक|दिनांक|स्थान|सत्यापन|वादी|प्रतिवादी|अपीलकर्ता|पुलिस अधिकारी|विवेचक|याचिकाकर्ता|प्रतिबंधकर्ता|शपथकर्ता|अधिवक्ता)/.test(txt) && txt.length < 60 ? "right" : "" });
    });
    return blocks;
  };

  /* ==========================================================================
   * 4. DOCX EXPORT  (Word / WPS Office compatible)
   * ======================================================================== */
  var FONT_FILES = { serif: "Nirmala UI", sans: "Nirmala UI", tiro: "Nirmala UI", mono: "Consolas" };

  function xmlEscape(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function inlineRuns(html, base) {
    var div = document.createElement("div");
    div.innerHTML = html || "";
    var out = [];
    var sizeHalf = Math.round((base.size || 12) * 2);

    function walk(node, fmt) {
      if (node.nodeType === 3) {
        var text = node.nodeValue;
        if (!text) return;
        var rPr = "<w:rPr>" +
          "<w:rFonts w:ascii=\"" + base.font + "\" w:hAnsi=\"" + base.font + "\" w:cs=\"" + base.font + "\" w:eastAsia=\"" + base.font + "\"/>" +
          (fmt.b ? "<w:b/><w:bCs/>" : "") +
          (fmt.i ? "<w:i/><w:iCs/>" : "") +
          (fmt.u ? "<w:u w:val=\"single\"/>" : "") +
          (fmt.s ? "<w:strike/>" : "") +
          (fmt.sup ? "<w:vertAlign w:val=\"superscript\"/>" : "") +
          (fmt.sub ? "<w:vertAlign w:val=\"subscript\"/>" : "") +
          (fmt.color ? "<w:color w:val=\"" + fmt.color.replace("#", "").toUpperCase() + "\"/>" : "") +
          (fmt.hl ? "<w:highlight w:val=\"yellow\"/>" : "") +
          (fmt.size ? "<w:sz w:val=\"" + fmt.size + "\"/><w:szCs w:val=\"" + fmt.size + "\"/>" : "<w:sz w:val=\"" + sizeHalf + "\"/><w:szCs w:val=\"" + sizeHalf + "\"/>") +
          "<w:lang w:val=\"hi-IN\" w:bidi=\"hi-IN\"/>" +
          "</w:rPr>";
        out.push("<w:r>" + rPr + "<w:t xml:space=\"preserve\">" + xmlEscape(text) + "</w:t></w:r>");
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
      if (tag === "mark") f.hl = true;
      if (tag === "br") { out.push("<w:r><w:br/></w:r>"); return; }
      if (tag === "span" || tag === "font") {
        if (node.style && node.style.color) {
          var rgb = node.style.color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (rgb) f.color = "#" + [1, 2, 3].map(function (i) { return ("0" + parseInt(rgb[i], 10).toString(16)).slice(-2); }).join("");
          else if (/^#[0-9a-f]{6}$/i.test(node.style.color)) f.color = node.style.color;
        }
        if (node.style && node.style.backgroundColor && node.style.backgroundColor !== "transparent") f.hl = true;
        if (node.style && node.style.fontSize) {
          var px = parseFloat(node.style.fontSize);
          if (px) f.size = Math.round(px * 1.5); // px → half-points (approx.)
        }
      }
      Array.prototype.forEach.call(node.childNodes, function (c) { walk(c, f); });
    }
    Array.prototype.forEach.call(div.childNodes, function (n) { walk(n, {}); });
    return out.join("");
  }

  function paragraphXml(b, doc) {
    var style = doc.style || {};
    var jc = b.align || (b.type === "h1" ? "center" : b.type === "center" ? "center" : b.type === "right" ? "right" : "");
    var pPr = "<w:pPr>";
    pPr += "<w:spacing w:line=\"" + Math.round((style.lh || 1.65) * 240) + "\" w:lineRule=\"auto\" w:before=\"40\" w:after=\"40\"/>";
    if (jc) pPr += "<w:jc w:val=\"" + ({ left: "left", center: "center", right: "right", justify: "both" })[jc] + "\"/>";
    if (b.indent) pPr += "<w:ind w:left=\"" + (b.indent * 720) + "\"/>";
    if (b.type === "h1") pPr += "<w:outlineLvl w:val=\"0\"/>";
    if (b.type === "h2") pPr += "<w:outlineLvl w:val=\"1\"/>";
    pPr += "</w:pPr>";
    var base = { font: FONT_FILES[style.font] || "Nirmala UI", size: style.size || 12 };
    return "<w:p>" + pPr + inlineRuns(b.html, base) + "</w:p>";
  }

  D.toDocxBlob = function (doc) {
    var body = "";
    (doc.blocks || []).forEach(function (b) {
      if (b.type === "pagebreak") {
        body += "<w:p><w:r><w:br w:type=\"page\"/></w:r></w:p>";
        return;
      }
      if (b.type === "li") {
        var txt = b.marker ? b.marker + " " : "• ";
        body += paragraphXml({ html: xmlEscape(txt) + (b.html || ""), align: b.align }, doc);
        return;
      }
      body += paragraphXml(b, doc);
    });
    if (!body) body = "<w:p/>";

    var sect = "<w:sectPr><w:pgSz w:w=\"" + Math.round((doc.page.size === "A4" ? 210 : 215.9) * 56.7) +
      "\" w:h=\"" + Math.round((doc.page.size === "A4" ? 297 : doc.page.size === "Legal" ? 355.6 : 279.4) * 56.7) + "\"/>" +
      "<w:pgMar w:top=\"" + Math.round((doc.page.margins.top || 25.4) * 56.7) +
      "\" w:right=\"" + Math.round((doc.page.margins.right || 25.4) * 56.7) +
      "\" w:bottom=\"" + Math.round((doc.page.margins.bottom || 25.4) * 56.7) +
      "\" w:left=\"" + Math.round((doc.page.margins.left || 25.4) * 56.7) +
      "\" w:header=\"720\" w:footer=\"720\" w:gutter=\"0\"/></w:sectPr>";

    var documentXml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" " +
      "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">" +
      "<w:body>" + body + sect + "</w:body></w:document>";

    var contentTypes = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
      "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
      "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
      "<Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/>" +
      "<Override PartName=\"/word/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml\"/>" +
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
      "</Relationships>";

    var styles = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<w:styles xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">" +
      "<w:docDefaults><w:rPrDefault><w:rPr>" +
      "<w:rFonts w:ascii=\"Nirmala UI\" w:hAnsi=\"Nirmala UI\" w:cs=\"Nirmala UI\" w:eastAsia=\"Nirmala UI\"/>" +
      "<w:sz w:val=\"" + Math.round((doc.style.size || 12) * 2) + "\"/><w:szCs w:val=\"" + Math.round((doc.style.size || 12) * 2) + "\"/>" +
      "<w:lang w:val=\"hi-IN\" w:bidi=\"hi-IN\"/>" +
      "</w:rPr></w:rPrDefault></w:docDefaults>" +
      "<w:style w:type=\"paragraph\" w:default=\"1\" w:styleId=\"Normal\"><w:name w:val=\"Normal\"/></w:style>" +
      "</w:styles>";

    var core = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<cp:coreProperties xmlns:cp=\"http://schemas.openxmlformats.org/package/2006/metadata/core-properties\" " +
      "xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:dcterms=\"http://purl.org/dc/terms/\" " +
      "xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">" +
      "<dc:title>" + xmlEscape(doc.title) + "</dc:title><dc:creator>NyayaLekh</dc:creator>" +
      "<cp:lastModifiedBy>NyayaLekh</cp:lastModifiedBy>" +
      "<dcterms:created xsi:type=\"dcterms:W3CDTF\">" + new Date(doc.createdAt || Date.now()).toISOString() + "</dcterms:created>" +
      "<dcterms:modified xsi:type=\"dcterms:W3CDTF\">" + new Date().toISOString() + "</dcterms:modified>" +
      "</cp:coreProperties>";

    var appXml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" +
      "<Properties xmlns=\"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties\">" +
      "<Application>NyayaLekh</Application></Properties>";

    var zip = new JSZip();
    zip.file("[Content_Types].xml", contentTypes);
    zip.folder("_rels").file(".rels", rels);
    zip.folder("word").file("document.xml", documentXml);
    zip.folder("word").file("styles.xml", styles);
    zip.folder("word").folder("_rels").file("document.xml.rels", docRels);
    zip.folder("docProps").file("core.xml", core);
    zip.folder("docProps").file("app.xml", appXml);
    return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", compression: "DEFLATE" });
  };

  /* ==========================================================================
   * 5. IMPORT: DOCX / ODT / RTF / HTML / TXT / PDF
   * ======================================================================== */
  function base64ToArrayBuffer(b64) {
    var bin = atob(b64.replace(/\s/g, ""));
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
      var parser = new DOMParser();
      var xdoc = parser.parseFromString(xml, "application/xml");
      var paras = xdoc.getElementsByTagName("w:p");
      var blocks = [];
      for (var i = 0; i < paras.length; i++) {
        var p = paras[i];
        var html = runsFromDocxPara(p);
        var pPr = p.getElementsByTagName("w:pPr")[0];
        var align = "";
        var type = "p";
        if (pPr) {
          var jc = pPr.getElementsByTagName("w:jc")[0];
          if (jc) {
            var v = jc.getAttribute("w:val");
            align = v === "both" ? "justify" : v === "center" ? "center" : v === "right" ? "right" : v === "left" ? "left" : "";
          }
          var ol = pPr.getElementsByTagName("w:outlineLvl")[0];
          if (ol) type = ol.getAttribute("w:val") === "0" ? "h1" : "h2";
          var pStyle = pPr.getElementsByTagName("w:pStyle")[0];
          if (pStyle) {
            var sv = (pStyle.getAttribute("w:val") || "").toLowerCase();
            if (sv.indexOf("heading1") >= 0 || sv === "title") type = "h1";
            else if (sv.indexOf("heading") >= 0) type = "h2";
            if (sv.indexOf("list") >= 0) type = "li";
          }
          var ind = pPr.getElementsByTagName("w:ind")[0];
          if (ind && type === "p") type = "p";
        }
        blocks.push({ id: U.uid("b"), type: type, html: html, align: align, indent: 0, marker: "" });
      }
      if (!blocks.length) blocks = [D.newBlock("p", "")];
      return blocks;
    });
  };

  D.importOdt = function (buf) {
    return JSZip.loadAsync(buf).then(function (zip) {
      return zip.file("content.xml").async("string");
    }).then(function (xml) {
      var xdoc = new DOMParser().parseFromString(xml, "application/xml");
      var ps = xdoc.getElementsByTagName("text:p");
      var hs = xdoc.getElementsByTagName("text:h");
      var blocks = [];
      function push(node, isHeading) {
        var text = node.textContent || "";
        var align = "";
        var st = node.getAttribute("text:style-name") || "";
        if (/center|Center/i.test(st)) align = "center";
        blocks.push({ id: U.uid("b"), type: isHeading ? "h1" : "p", html: U.escapeHtml(text), align: align, indent: 0, marker: "" });
      }
      Array.prototype.forEach.call(hs, function (h) { push(h, true); });
      Array.prototype.forEach.call(ps, function (p) { push(p, false); });
      return blocks.length ? blocks : [D.newBlock("p", "")];
    });
  };

  D.importRtf = function (text) {
    var out = [];
    var cur = "";
    var stack = [{ b: 0, i: 0, u: 0 }];
    var i = 0;
    var pendingSkip = 0;
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
    return out.filter(function (l) { return l.trim() !== ""; }).map(function (line) {
      return { id: U.uid("b"), type: "p", html: U.escapeHtml(line), align: "", indent: 0, marker: "" };
    });
  };

  D.htmlToBlocks = function (html) {
    var d = document.createElement("div");
    d.innerHTML = html;
    // strip scripts/styles
    U.$$("script,style,meta,link", d).forEach(function (n) { n.remove(); });
    var blocks = [];
    var nodes = d.childNodes;
    function pushFrom(el) {
      var tag = (el.nodeName || "").toLowerCase();
      var inner = el.innerHTML || "";
      var text = el.textContent || "";
      if (!text.trim() && tag !== "br") return;
      if (tag === "h1") blocks.push({ type: "h1", html: inner, align: "center" });
      else if (/^h[2-6]$/.test(tag)) blocks.push({ type: "h2", html: inner, align: "" });
      else if (tag === "li") blocks.push({ type: "li", html: inner, align: "", marker: "•" });
      else if (tag === "p" || tag === "div") blocks.push({ type: "p", html: inner.replace(/<div>/g, "<br>").replace(/<\/div>/g, ""), align: "" });
      else if (tag === "table") {
        U.$$("tr", el).forEach(function (tr) {
          var cells = U.$$("td,th", tr).map(function (td) { return td.textContent.trim(); }).join(" | ");
          if (cells.trim()) blocks.push({ type: "p", html: U.escapeHtml(cells), align: "" });
        });
      } else blocks.push({ type: "p", html: inner, align: "" });
    }
    Array.prototype.forEach.call(nodes, function (n) {
      if (n.nodeType === 1) pushFrom(n);
      else if (n.nodeType === 3 && n.nodeValue.trim()) blocks.push({ type: "p", html: U.escapeHtml(n.nodeValue.trim()), align: "" });
    });
    if (!blocks.length && d.textContent.trim()) {
      d.textContent.split(/\n+/).forEach(function (line) {
        if (line.trim()) blocks.push({ type: "p", html: U.escapeHtml(line), align: "" });
      });
    }
    return blocks.map(function (b) {
      return { id: U.uid("b"), type: b.type, html: b.html, align: b.align || "", indent: 0, marker: b.marker || "" };
    });
  };

  /** Unified entry point used by the UI. */
  D.importFile = function (name, base64) {
    var lower = (name || "").toLowerCase();
    var buf = base64 ? base64ToArrayBuffer(base64) : null;
    if (/\.docx$/.test(lower)) return D.importDocx(buf);
    if (/\.odt$/.test(lower)) return D.importOdt(buf);
    if (/\.rtf$/.test(lower)) return Promise.resolve(D.importRtf(new TextDecoder("utf-8").decode(new Uint8Array(buf))));
    if (/\.(html?|htm)$/.test(lower)) return Promise.resolve(D.htmlToBlocks(new TextDecoder("utf-8").decode(new Uint8Array(buf))));
    if (/\.(txt|md|text)$/.test(lower)) {
      var txt = new TextDecoder("utf-8").decode(new Uint8Array(buf));
      return Promise.resolve(txt.split(/\r?\n/).map(function (l) {
        return { id: U.uid("b"), type: "p", html: U.escapeHtml(l), align: "", indent: 0, marker: "" };
      }));
    }
    if (/\.pdf$/.test(lower)) {
      return inflatePdf(buf).then(function (txt) {
        return txt.split(/\n+/).map(function (l) {
          return { id: U.uid("b"), type: "p", html: U.escapeHtml(l.trim()), align: "", indent: 0, marker: "" };
        });
      });
    }
    if (/\.doc$/.test(lower)) {
      throw new Error("पुरानी .doc फ़ाइल समर्थित नहीं है — WPS Office में खोलकर .docx के रूप में सहेजें।");
    }
    throw new Error("इस फ़ाइल प्रकार का समर्थन नहीं है।");
  };

  /** PDF streams are inflated with the platform's DecompressionStream. */
  function inflatePdf(buf) {
    var bytes = new Uint8Array(buf);
    var decoder = new TextDecoder("latin1");
    var full = decoder.decode(bytes);
    var streamRe = /stream\r?\n/g, m, jobs = [], idx = 0;
    while ((m = streamRe.exec(full))) {
      idx = m.index + m[0].length;
      var end = full.indexOf("endstream", idx);
      if (end < 0) continue;
      var slice = bytes.slice(idx, end);
      jobs.push(slice);
    }
    if (!jobs.length) return Promise.reject(new Error("PDF में धारा नहीं मिली।"));

    var results = [];
    return jobs.reduce(function (p, chunk) {
      return p.then(function () {
        if (typeof DecompressionStream === "undefined") { results.push(""); return; }
        try {
          var ds = new DecompressionStream("deflate");
          var stream = new Blob([chunk]).stream().pipeThrough(ds);
          return new Response(stream).arrayBuffer().then(function (ab) {
            results.push(extractPdfText(new TextDecoder("latin1").decode(new Uint8Array(ab))));
          }).catch(function () { results.push(""); });
        } catch (e) { results.push(""); }
      });
    }, Promise.resolve()).then(function () {
      var text = results.join("\n").trim();
      if (!text) throw new Error("PDF का पाठ निकाला नहीं जा सका (संभवतः स्कैन की गई फ़ाइल है)।");
      return text;
    });
  }

  /* ==========================================================================
   * 6. OTHER EXPORTS
   * ======================================================================== */
  D.toHtml = function (doc) {
    var body = (doc.blocks || []).map(function (b) {
      if (b.type === "pagebreak") return "<div style=\"page-break-after:always\"></div>";
      var style = "margin:0 0 6pt;text-align:" + (b.align || (b.type === "h1" ? "center" : "left")) + ";";
      if (b.type === "h1") style += "font-size:16pt;font-weight:700;text-align:center;";
      if (b.type === "h2") style += "font-size:13pt;font-weight:700;";
      if (b.type === "li") style += "padding-left:18pt;";
      return "<p style=\"" + style + "\">" + (b.type === "li" ? (b.marker || "•") + " " : "") + (b.html || "") + "</p>";
    }).join("\n");
    return "<!DOCTYPE html><html lang=\"hi\"><head><meta charset=\"utf-8\"><title>" + U.escapeHtml(doc.title) +
      "</title><style>@page{size:" + (doc.page.size === "A4" ? "A4" : doc.page.size) + ";margin:" + doc.page.margins.top + "mm}" +
      "body{font-family:'Noto Serif Devanagari','Nirmala UI',serif;font-size:" + (doc.style.size || 12) + "pt;line-height:" + (doc.style.lh || 1.65) + ";max-width:190mm;margin:auto}" +
      "</style></head><body>" + body + "</body></html>";
  };

  D.toText = function (doc) {
    return (doc.blocks || []).map(function (b) {
      return b.type === "li" ? (b.marker || "•") + " " + U.stripTags(b.html) : U.stripTags(b.html);
    }).join("\n");
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
      var bold = b.type === "h1" || b.type === "h2" ? "\\b " : "";
      return align + bold + esc(t) + "\\b0 \\par";
    }).join("\n");
    return "{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Nirmala UI;}}\\f0\\fs" + Math.round((doc.style.size || 12) * 2) + "\n" + body + "\n}";
  };
})(window);
