# Fonts bundled with NyayaLekh

NyayaLekh ships **62 font families / 120 faces** (4.39 MB) inside the APK so that Hindi and English documents render identically on a tablet with **no internet connection**.

All families are licensed under the **SIL Open Font License 1.1** and were fetched from [Fontsource](https://fontsource.org/) (which republishes Google Fonts). The licence of each family permits bundling and redistribution inside an application; the fonts are not sold separately and are not modified, apart from being subset to the script-specific woff2 files published by Fontsource.

Files:

- `app/vendor/fonts/<id>-<weight>.woff2` — self-hosted faces (400 and 700 where the family provides them).
- `app/css/fonts.css` — generated `@font-face` rules with `unicode-range`, so a Devanagari face is only used for Devanagari codepoints and the Latin face takes over for English words in the same paragraph.
- `app/js/fonts.js` — generated `ND.FONT_CATALOG` registry used by the font library UI.
- `scripts/build-fonts.mjs` — regenerates all of the above (`node scripts/build-fonts.mjs`); it is also run by the APK workflow.

## Devanagari families (28)

| Family | Style | Weights | Size |
|---|---|---|---|
| Noto Serif Devanagari | serif | 400, 700 | 104 KB |
| Noto Sans Devanagari | sans | 400, 700 | 102 KB |
| Tiro Devanagari Hindi | serif | 400 | 97 KB |
| Mukta | sans | 400, 700 | 200 KB |
| Hind | sans | 400, 700 | 142 KB |
| Khula | sans | 400, 700 | 82 KB |
| Sarala | sans | 400, 700 | 75 KB |
| Karma | serif | 400, 700 | 161 KB |
| Martel | serif | 400, 700 | 89 KB |
| Martel Sans | sans | 400, 700 | 76 KB |
| Halant | serif | 400, 700 | 156 KB |
| Sahitya | serif | 400, 700 | 104 KB |
| Amita | handwriting | 400, 700 | 98 KB |
| Kadwa | serif | 400, 700 | 76 KB |
| Sura | serif | 400, 700 | 62 KB |
| Vesper Libre | serif | 400, 700 | 92 KB |
| Eczar | display | 400, 700 | 95 KB |
| Inknut Antiqua | display | 400, 700 | 153 KB |
| Poppins | sans | 400, 700 | 77 KB |
| Baloo 2 | display | 400, 700 | 121 KB |
| Anek Devanagari | sans | 400, 700 | 184 KB |
| IBM Plex Sans Devanagari | sans | 400, 700 | 148 KB |
| Kalam | handwriting | 400, 700 | 213 KB |
| Rozha One | display | 400 | 71 KB |
| Yatra One | display | 400 | 70 KB |
| Ranga | display | 400, 700 | 56 KB |
| Asar | serif | 400 | 157 KB |
| Sumana | serif | 400, 700 | 75 KB |

## Latin families (34)

| Family | Style | Weights | Size |
|---|---|---|---|
| Tinos (Times-compatible) | serif | 400, 700 | 36 KB |
| Arimo (Arial-compatible) | sans | 400, 700 | 22 KB |
| Carlito (Calibri-compatible) | sans | 400, 700 | 60 KB |
| Gelasio (Georgia-compatible) | serif | 400, 700 | 38 KB |
| EB Garamond | serif | 400, 700 | 48 KB |
| Crimson Pro | serif | 400, 700 | 36 KB |
| Libre Baskerville | serif | 400, 700 | 40 KB |
| Merriweather | serif | 400, 700 | 96 KB |
| Lora | serif | 400, 700 | 41 KB |
| Source Serif 4 | serif | 400, 700 | 41 KB |
| Playfair Display | display | 400, 700 | 44 KB |
| Spectral | serif | 400, 700 | 44 KB |
| Bitter | serif | 400, 700 | 36 KB |
| Literata | serif | 400, 700 | 41 KB |
| PT Serif | serif | 400, 700 | 61 KB |
| Cormorant Garamond | serif | 400, 700 | 44 KB |
| IBM Plex Serif | serif | 400, 700 | 39 KB |
| Inter | sans | 400, 700 | 47 KB |
| Roboto | sans | 400, 700 | 43 KB |
| Open Sans | sans | 400, 700 | 36 KB |
| Lato | sans | 400, 700 | 46 KB |
| Montserrat | sans | 400, 700 | 37 KB |
| Work Sans | sans | 400, 700 | 40 KB |
| Source Sans 3 | sans | 400, 700 | 31 KB |
| IBM Plex Sans | sans | 400, 700 | 44 KB |
| Nunito Sans | sans | 400, 700 | 27 KB |
| Public Sans | sans | 400, 700 | 29 KB |
| Libre Franklin | sans | 400, 700 | 31 KB |
| Alexandria | sans | 400, 700 | 25 KB |
| JetBrains Mono | mono | 400, 700 | 42 KB |
| Courier Prime | mono | 400, 700 | 37 KB |
| IBM Plex Mono | mono | 400, 700 | 29 KB |
| Roboto Mono | mono | 400, 700 | 25 KB |
| Source Code Pro | mono | 400, 700 | 23 KB |

## Rebuilding

```bash
node scripts/build-fonts.mjs       # downloads @fontsource packages into scripts/.fonts-work
```

The registry `CATALOG` inside the script is the single source of truth: add a family id, npm package, display label, script and category, then re-run and commit the generated files.

## Licence notice

SIL Open Font License 1.1 — <https://scripts.sil.org/OFL>. Each family keeps its own copyright line, available in the `@fontsource` package metadata and in the upstream Google Fonts repository. Metric-compatible families are written into exported DOCX/RTF files under their Word/Windows names (Tinos → Times New Roman, Arimo → Arial, Carlito → Calibri, Gelasio → Georgia) so that a document opened on a court PC keeps its measurements.
