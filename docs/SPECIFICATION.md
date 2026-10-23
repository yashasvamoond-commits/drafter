# न्यायलेख · NyayaLekh — विनिर्देश / Specification

**Version 1.0.0 · 23 October 2026**
Target device: Lenovo Yoga Tab (2026), Android 14+ — also Android 7.0+ phones/tablets, portrait **and** landscape.
Platform: single Android APK (WebView shell) + identical browser build in this repo.

> This document maps **every requirement in the brief** to what was built, how it works, and how to verify it. Hindi first, English alongside. / यह दस्तावेज़ हर माँग को उसके क्रियान्वयन से जोड़ता है।

---

## 0. आवश्यकता → क्रियान्वयन तालिका / Requirement traceability

| # | माँग (Brief) | क्रियान्वयन (Built) | स्थिति | जाँच कैसे करें |
|---|---|---|---|---|
| 1 | Word जैसा ऐप, सभी बुनियादी सुविधाएँ, सब मुफ़्त | रिबन + रेल + साइड पैनल के साथ फुल-स्क्रीन एडिटर; कोई भुगतान/सदस्यता/लॉगिन नहीं | ✅ | ऐप खोलें → रिबन के सभी बटन |
| 2 | हिन्दी पर मुख्य ज़ोर, फ़ॉन्ट बहुत स्पष्ट | 3 embedded देवनागरी फ़ॉन्ट (Noto Serif/Sans, Tiro), 9–32 pt, लाइन-हाइट, justify | ✅ | मेन्यू → फ़ॉन्ट/आकार/थीम |
| 3 | आसान ड्राफ्टिंग (कम टैप) | प्रारूप एक टैप में, वेरिएबल स्वतः भरना, बोलकर लिखना, मात्रा-सुधारक, शॉर्टकट | ✅ | मेन्यू → न्यायालयीन प्रारूप |
| 4 | टैबलेट में WPS Office से बनी फ़ाइलें पढ़ सके | DOCX/ODT/RTF/TXT/HTML आयात (शैली सहित), “Open with NyayaLekh”, Documents/NyayaLekh | ✅ | मेन्यू → फ़ाइल खोलें |
| 5 | राजस्थान न्यायालय JM/ACJM/ADJ टेम्पलेट | 12 न्यायालय presets + 19 प्रारूप; न्यायालय/न्यायाधीश/प्रकरण स्वतः | ✅ | मेन्यू → न्यायालय सेटिंग → प्रारूप |
| 6 | उचित वर्तनी जाँचक | देवनागरी-सचेत Spell checker, Damerau–Levenshtein सुझाव, व्यक्तिगत शब्दकोश | ✅ | रेल → वर्तनी → जाँच शुरू |
| 7 | Speech to Text | Android RecognizerIntent (hi-IN/en-IN), ब्राउज़र में Web Speech | ✅ (डिवाइस सेवा पर निर्भर) | रेल → बोलें |
| 8 | शब्दकोश (“all the words in dictionary”) | 1,06,082 हिन्दी शब्द + 1,03,174 अर्थ + 2,74,801 अंग्रेज़ी शब्द | ✅ | रेल → शब्दकोश |
| 9 | “Properly formats” / फ़ॉर्मैट | A4/Legal/Letter/A5, मार्जिन (मिमी), H1/H2, सूचियाँ, संरेखण, पेज ब्रेक, पेज नंबर | ✅ | मेन्यू → पृष्ठ सेटअप |
| 10 | कन्वर्टर — कृतिदेव/यूनिकोड | द्वि-दिशीय पूर्ण कृतिदेव 010/016 कन्वर्टर + देवलीस/चाणक्य/रेमिंग्टन (प्रायोगिक) | ✅ | रेल → कन्वर्टर |
| 11 | विधिक drafter के सभी उपयोगी उपकरण | BNS/BNSS तालिकाएँ, सीमा अवधि, ब्याज/तिथि कैलकुलेटर, विधिक शब्दावली | ✅ | रेल → विधिक |
| 12 | सीधे इंस्टॉल होने वाला APK लिंक | GitHub Release `apk-latest` (self-signed, automatic CI) | ✅ | README §1 |
| 13 | पोर्ट्रेट + लैंडस्केप | responsive breakpoints; `configChanges` से रोटेट पर पुनः-लेआउट | ✅ | टैबलेट घुमाएँ |
| 14 | “स्पेसिफिकेशन अंग्रेज़ी और हिन्दी में” | यह दस्तावेज़ + README द्विभाषी | ✅ | — |

**जो नहीं है (ईमानदारी से) / Not included:** cloud AI कानूनी सलाह, OCR (स्कैन PDF), `.doc` (97-2003), Play Store वितरण, कृतिदेव फ़ॉन्ट फ़ाइलों का पुनर्वितरण (केवल ग्लिफ़ मैपिंग उपयोग की गई है)।

---

## 1. उत्पाद दृष्टि / Product vision

एक ऐसा ऑफ़लाइन टूल जिससे राजस्थान के अधिवक्ता/न्यायालय कर्मचारी **हिन्दी में मसौदा** लिख सकें, जहाँ हिन्दी टाइपिंग, मात्राएँ, पुराने कृतिदेव फ़ॉन्ट, WPS फ़ाइलें, प्रारूप और प्रिंट — सब एक ही जगह हों, और **डेटा कभी डिवाइस न छोड़े**।

*A single offline workspace for Hindi legal drafting: correct matras, legacy-font conversion, court templates, WPS-compatible import/export, dictionary and spell-check — with no network dependency and no analytics.*

**गैर-लक्ष्य / Non-goals:** केस-मैनेजमेंट/डायरी, ई-फाइलिंग, online sync, AI-generated legal opinions.

---

## 2. आर्किटेक्चर / Architecture

```
┌────────────────────────── Android APK ──────────────────────────┐
│ MainActivity (Java, 0 deps)                                      │
│  ├─ WebView  ← assets/index.html (यही app/ फ़ोल्डर)              │
│  ├─ JS Bridge: pickDocument / begin-append-endFile / printPage /  │
│  │             startVoice / toast                                 │
│  ├─ FileProvider-free SAF picker (ACTION_OPEN_DOCUMENT)           │
│  └─ Documents/NyayaLekh में सहेजना (+ MediaStore पर प्रकाशन)      │
└──────────────────────────────────────────────────────────────────┘
        │ same files
        ▼
app/  index.html · css/app.css · js/{core,text,kd-table,dict,doc,editor,app}.js
      data/{legal.js, hi-words.js, hi-dict.js, en-words.js}  ← CI में निर्मित
      vendor/{jszip.min.js, fonts/*.woff2}
```

**क्यों WebView?** देवनागरी शेपिंग (हरफ़/OpenType) Android के सिस्टम टेक्स्ट इंजन (Harfbuzz) पर चलती है — जो Noto Devanagari से संयुक्ताक्षर/मात्राएँ सही बनाता है; साथ ही एक ही कोड डेस्कटॉप ब्राउज़र, APK और (भविष्य में) Windows पर चलता है।
**क्यों कोई dependency नहीं?** बिल्ड सरल, APK ~5.5 MB, और Play-services के बिना भी चलता है।

---

## 3. टेक्स्ट इंजन / Text engines (`js/text.js` + `js/kd-table.js`)

### 3.1 कृतिदेव → यूनिकोड
- 225-पंक्ति ग्लिफ़ तालिका (कृतिदेव 010/011/016)। क्रम महत्वपूर्ण है: लंबे अनुक्रम पहले।
- विशेष प्रक्रिया: `f` (छोटी इ-मात्रा) संबंधित व्यंजन-समूह के **बाद** ले जाना; `fa` → `िं`; `Z` (रेफ़) को अक्षर-समूह के **आरम्भ** में `र्` बनाना; `ि्` सुधार; `Ê` → `ीZ`; `±` → `Zं`; ZWJ/ZWNJ सफ़ाई; NFC सामान्यीकरण।
- यदि पाठ पहले से >35% देवनागरी है तो उसे छेड़ा नहीं जाता (डबल-कन्वर्ज़न से बचाव)।

उदाहरण (परीक्षणित, CI में भी):
`U;k;ky;` → **न्यायालय** · `fu.kZ; fy[kk x;k gS` → **निर्णय लिखा गया है** · `vkj{kh; vf/kdkjh` → **आरक्षीय अधिकारी** · `funsZ'kkuqlkj okn izLrqr fd;k tkrk gSA` → **निर्देशानुसार वाद प्रस्तुत किया जाता है।**

### 3.2 यूनिकोड → कृतिदेव
व्युत्क्रम तालिका; `ि` को व्यंजन-समूह से पहले (`f`) रखना; `र्` (रेफ़) को समूह के बाद (`Z`); ASCII विराम-चिह्न भी कृतिदेव-अनुरूप (`,`→`]`, `.`→`-`, `?`→`\` आदि)।
**राउंड-ट्रिप परीक्षण:** 8/8 वाक्य `U→K→U` में अपरिवर्तित (CI लॉग देखें)।

### 3.3 अन्य लीगेसी
देवलीस 010 (कृतिदेव + अपवाद), चाणक्य, रेमिंग्टन/कुंडली/आगरा — मैपिंग + `fixMatras`। **प्रायोगिक**, UI में स्पष्ट रूप से चिह्नित।

### 3.4 मात्रा/टाइपो सुधारक (`fixMatras`, `fixTypos`)
- उलटी `ि` (िनर्णय → निर्णय), व्यंजन-समूह सहित (िक्ष → क्षि)।
- स्वतंत्र स्वर + मात्रा (अा → आ), `ॆ/ॊ` → `े/ो`, `ूँ` पुनर्स्थापन।
- हलंत के बाद स्पेस हटाना, अनुस्वार-स्थिति, विराम चिह्न/कोट्स सामान्यीकरण, संख्या-अनुस्वार।

### 3.5 लिप्यंतरण
रोमन → देवनागरी (आईट्रांस-शैली: `aa, ii, uu, M, ~, \, x, GY`) तथा देवनागरी → रोमन (खोज/ई-मेल हेतु)।

---

## 4. शब्दकोश व वर्तनी / Dictionary & spell check

**डेटा निर्माण (`scripts/build-data.mjs`)**
- CFILT Hindi WordNet (`wordnet-hi`): `index.*` से शीर्ष-शब्द, `data.*` से **gloss** (अर्थ) — 1,03,174 प्रविष्टियाँ, 1,06,082 शब्द।
- `an-array-of-english-words`: 2,74,801 शब्द।
- `data/legal.js`: ~230 हस्त-लिखित विधिक शब्द (हिन्दी → English + परिभाषा) जो WordNet में नहीं हैं (जैसे दोषमुक्ति, प्रकृति आख्या, अंतरिम जमानत)।
- आउटपुट सरल `window.*` जावास्क्रिप्ट फ़ाइलें — कोई bundler नहीं; CI में हर बिल्ड पर पुनः बनती हैं (Git में commit नहीं, .gitignore)।

**Spell engine (`js/dict.js`)**
- `isKnown()`: WordNet ∪ विधिक ∪ उपयोगकर्ता शब्दकोश ∪ सामान्य शब्द ∪ प्रत्यय-आधारित रूप-विश्लेषण (`े/ी/ा, ों, ें, ता, त्व, पूर्वक, वाला…`) ∪ संक्षेपाक्षर (BNS/BNSS/MACT…).
- सुझाव: सीमित-संपादन दूरी (Damerau–Levenshtein ≤2) + 2-अक्षर उपसर्ग सूचकांक।
- लाइव अंडरलाइन (केवल सादे अनुच्छेदों में, ताकि कर्सर/फ़ॉर्मैटिंग न टूटे), पूर्ण दस्तावेज़ जाँच, “बदलें”, “शब्दकोश में जोड़ें”, “उस स्थान पर जाएँ”।

**गुणवत्ता जाँच (परीक्षण):** शुद्ध विधिक हिन्दी वाक्यों पर **0 झूठी चेतावनी**; `न्यायलय` और `चाहीये` पकड़े गए, सुझाव `न्यायालय`।

---

## 5. दस्तावेज़ मॉडल, पेजिनेशन व एडिटर

- मॉडल: `doc { id, title, page{size,margins,numbers}, style{font,size,lh}, court{…}, blocks[] }`; block = `{ id, type: p|h1|h2|li|center|right|pagebreak|sig, html, align, indent, marker }`.
- `contenteditable` प्रति-अनुच्छेद (Word जैसा अनुभव, पर स्थिर कर्सर)।
- **माप-आधारित पेजिनेशन:** एक छिपे मापक पृष्ठ में सभी block रेंडर → ऊँचाई जोड़कर A4 उपलब्ध ऊँचाई से विभाजन → वास्तविक `.page` div + पृष्ठ क्रमांक (“1 / 3”)।
- अंडू/रीडू snapshot-आधारित (80 स्तर), कर्सर स्थिति सहित।
- खोज: सभी अनुच्छेदों में मिलान, अगला/पिछला, चयन हाइलाइट।
- पेस्ट सुरक्षा: HTML सैनिटाइज़; कृतिदेव जैसा पाठ पहचानकर **स्वतः यूनिकोड**।
- Ctrl+B/I/U/S/F/P/Z/Y/D शॉर्टकट; Enter पर अनुच्छेद विभाजन, खाली अनुच्छेद पर Backspace से मिलान।

---

## 6. प्रारूप (Templates) व न्यायालय presets

**न्यायालय presets (12):** JM · ACJM · CJM · ADJ · DSJ · CJM (ग्रामीण) · सिविल जज · पारिवारिक न्यायालय · MACT · किराया नियंत्रण · लोक अदालत · राजस्थान उच्च न्यायालय।

**वेरिएबल:** `{{court}} {{judge}} {{place}} {{date}} {{year}} {{caseNo}} {{party}} {{sections}} {{ps}} {{prosecutor}} {{clerk}}` — प्रारूप लगाते समय स्वतः प्रतिस्थापित; न्यायालय सेटिंग में बदलाव तुरंत लागू।

**19 प्रारूप** (श्रेणी: फौजदारी / दीवानी / विविध) — सूची README §2.5 में।
हर प्रारूप: संपादन-योग्य अनुच्छेद, शीर्षक/उपशीर्षक शैलियाँ, हस्ताक्षर-खंड दाएँ संरेखित, उपयुक्त धाराएँ (BNS/BNSS) उल्लिखित।

**नियम:** प्रारूप में केवल *संरचना* दी गई है; तथ्य/नाम भरना उपयोगकर्ता का कार्य है — ऐप कोई विधिक राय नहीं देता।

---

## 7. फ़ाइल इनपुट/आउटपुट

| दिशा | प्रारूप | विवरण |
|---|---|---|
| आयात | `.docx` | `word/document.xml` पार्स — रन, बोल्ड/इटैलिक/अंडरलाइन/स्ट्राइक, सुपर/सब, संरेखण, outlineLvl/pStyle → h1/h2, सूचियाँ |
| आयात | `.odt` | `content.xml` से अनुच्छेद/शीर्षक |
| आयात | `.rtf` | हल्का RTF टोकनाइज़र (`\par`, `\uNNNN`, `\'hh`) |
| आयात | `.txt / .html / .md` | सीधा / DOM आधारित |
| आयात | `.pdf` | `DecompressionStream("deflate")` + `Tj/TJ` निष्कर्षण — केवल टेक्स्ट PDF; स्कैन पर स्पष्ट त्रुटि |
| निर्यात | `.docx` | WordprocessingML (Nirmala UI + `w:cs` हिन्दी, `w:lang hi-IN`, A4/Legal पेज साइज़, मिमी मार्जिन, line spacing, outline levels) — MS Word/Google Docs/WPS में परीक्षित संरचना |
| निर्यात | PDF | Android `PrintManager` → “Save as PDF”; ब्राउज़र में `window.print()` + `@media print` स्टाइल |
| निर्यात | `.html / .txt / .rtf` | दस्तावेज़ का निष्ठापूर्ण रूपांतरण |
| सहेजना | `Documents/NyayaLekh/` | SAF/MediaStore से, WPS Office तुरंत देख सके |

**Android intent:** `VIEW` (docx/odt/txt/pdf) और `SEND` (text/docx) फ़िल्टर — WPS Office से “Open with NyayaLekh”。

---

## 8. Android शेल (`android/`)

- `compileSdk 34`, `minSdk 24` (Android 7.0+), `targetSdk 34`, Java 17, **शून्य third-party dependency**।
- `WebSettings`: DOM storage, file access (+file-url access ताकि `data/*.js` लोड हों), zoom, no cache।
- `MainActivity.Bridge` (`@JavascriptInterface`): `isNative`, `pickDocument`, `beginFile/appendFile/endFile` (chunked base64 — बड़े docx/PDF के लिए), `printPage`, `startVoice`, `stopVoice`, `toast`, `keepAwake`।
- `onBackPressed`: पहले modal → drawer → panel बंद, तब ऐप बाहर (JS से निर्णय)।
- `configChanges`: रोटेशन पर WebView पुनः-निर्माण नहीं → दस्तावेज़/कर्सर सुरक्षित।
- `android:largeHeap` — 1 लाख+ शब्दों का शब्दकोश मेमोरी में।
- अनुमतियाँ: `INTERNET` (केवल वाक् पहचान हेतु), `RECORD_AUDIO`, `WRITE_EXTERNAL_STORAGE` (API ≤28)।

**साइनिंग:** रिलीज़ बिल्ड `signingConfigs.debug` से (CI के स्थायी keystore के बिना) — इसलिए APK सीधे इंस्टॉल होता है; भविष्य के अपडेट के लिए वही साइनिंग-की रखें, अन्यथा अनइंस्टॉल करना पड़ेगा। उत्पादन हेतु अपनी keystore बनाएँ (`android/keystore.jks` + secrets)।

---

## 9. गोपनीयता / Privacy

- कोई नेटवर्क कॉल नहीं (वाक् पहचान को छोड़कर, जो **Android की Google सेवा** करती है — यदि आप वॉइस उपयोग नहीं करते, तो कुछ भी बाहर नहीं जाता)।
- कोई खाता, विज्ञापन, एनालिटिक्स, टेलीमेट्री नहीं।
- दस्तावेज़ IndexedDB (fallback localStorage) में — ऐप डेटा साफ़ करने पर मिट जाते हैं; निर्यातित फ़ाइलें Documents में रहती हैं।

---

## 10. गुणवत्ता-द्वार / Quality gates

| परीक्षण | विधि | परिणाम |
|---|---|---|
| JS सिंटैक्स | `node --check` (सभी 8 फ़ाइलें) | ✅ |
| UI बूट + रेंडर | jsdom में `DOMContentLoaded` → पृष्ठ/ब्लॉक बनते हैं | ✅ |
| सभी 16 स्क्रीन खुलती हैं | jsdom में प्रत्येक `openScreen()` | ✅ 0 त्रुटि |
| प्रारूप निर्माण | 19 प्रारूप × `buildTemplate()` | ✅ |
| DOCX निर्यात | JSZip से blob बनता है (संरचना मान्य) | ✅ |
| कृतिदेव द्वि-दिशीय | 8 वाक्य राउंड-ट्रिप | ✅ 8/8 |
| वर्तनी शुद्धता | शुद्ध विधिक वाक्य → 0 flag; गलत शब्द → flag+सुझाव | ✅ |
| APK बिल्ड | GitHub Actions (Gradle 8.7, AGP 8.5.2, SDK 34) | ✅ |
| फ़ॉन्ट लोडिंग | सभी 7 `.woff2` APK assets में | ✅ |

---

## 11. भविष्य की योजना / Roadmap

1. **OCR** (ML Kit / Tesseract) — स्कैन किए निर्णय/आदेश आयात हेतु।
2. **कृतिदेव फ़ॉन्ट एम्बेड** — पुराने दस्तावेज़ों का विज़ुअल मिलान (लाइसेंस आवश्यक)।
3. **तालिकाएँ व चित्र** — वसीयत/नक्शा/मुद्दामाल हेतु।
4. **DOCX आयात में तालिकाएँ/हेडर-फुटर**।
5. **आरटीएल/उर्दू** समर्थन (राजस्थान न्यायालयों में उर्दू दस्तावेज़)।
6. **अपनी keystore** + Play Store internal testing।
7. **टेम्पलेट संपादक** — अधिवक्ता अपने प्रारूप सहेज सकें (वर्तमान में कोड में)।

---

## 12. शब्दावली (Glossary of UI terms, हिन्दी ⇄ English)

| हिन्दी | English | हिन्दी | English |
|---|---|---|---|
| प्रारूप | template | अनुच्छेद | paragraph |
| वर्तनी | spelling | शब्दकोश | dictionary |
| कन्वर्टर | converter | मात्रा | vowel sign |
| सीमा अवधि | limitation period | मुचलका | bond |
| प्रकृति आख्या | arrest report | दोषमुक्ति | acquittal |
| निर्णय | judgment | प्रतिबंध याचिका | caveat |
| निषेधाज्ञा | injunction | आरोप पत्र | charge sheet |
