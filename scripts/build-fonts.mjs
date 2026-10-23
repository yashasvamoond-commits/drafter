/**
 * Builds the bundled font library:
 *   app/vendor/fonts/<id>-<weight>.woff2   (self-hosted, offline)
 *   app/css/fonts.css                      @font-face rules with unicode-range
 *   app/js/fonts.js                        window.ND.FONT_CATALOG + FAMILIES
 *
 * Only 400/600/700 static weights are kept, and only the subset that matters
 * (devanagari for Hindi faces, latin for the Latin faces) so the APK stays lean.
 *
 * Run: cd scripts && npm install && node build-fonts.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const work = path.join(here, ".fonts-work");
const outFonts = path.resolve(here, "../app/vendor/fonts");
const outCss = path.resolve(here, "../app/css/fonts.css");
const outJs = path.resolve(here, "../app/js/fonts.js");

/**
 * id, npm package, display label, script, category
 * category: serif | sans | display | handwriting | mono
 */
const CATALOG = [
  // ---------------------------------------------------------------- Devanagari
  ["noto-serif-dev", "noto-serif-devanagari", "Noto Serif Devanagari", "dev", "serif"],
  ["noto-sans-dev", "noto-sans-devanagari", "Noto Sans Devanagari", "dev", "sans"],
  ["tiro-dev", "tiro-devanagari-hindi", "Tiro Devanagari Hindi", "dev", "serif"],
  ["mukta", "mukta", "Mukta", "dev", "sans"],
  ["hind", "hind", "Hind", "dev", "sans"],
  ["khula", "khula", "Khula", "dev", "sans"],
  ["sarala", "sarala", "Sarala", "dev", "sans"],
  ["karma", "karma", "Karma", "dev", "serif"],
  ["martel", "martel", "Martel", "dev", "serif"],
  ["martel-sans", "martel-sans", "Martel Sans", "dev", "sans"],
  ["halant", "halant", "Halant", "dev", "serif"],
  ["sahitya", "sahitya", "Sahitya", "dev", "serif"],
  ["amita", "amita", "Amita", "dev", "handwriting"],
  ["kadwa", "kadwa", "Kadwa", "dev", "serif"],
  ["sura", "sura", "Sura", "dev", "serif"],
  ["vesper-libre", "vesper-libre", "Vesper Libre", "dev", "serif"],
  ["eczar", "eczar", "Eczar", "dev", "display"],
  ["inknut-antiqua", "inknut-antiqua", "Inknut Antiqua", "dev", "display"],
  ["poppins", "poppins", "Poppins", "dev", "sans"],
  ["baloo-2", "baloo-2", "Baloo 2", "dev", "display"],
  ["anek-dev", "anek-devanagari", "Anek Devanagari", "dev", "sans"],
  ["ibm-plex-dev", "ibm-plex-sans-devanagari", "IBM Plex Sans Devanagari", "dev", "sans"],
  ["kalam", "kalam", "Kalam", "dev", "handwriting"],
  ["rozha-one", "rozha-one", "Rozha One", "dev", "display"],
  ["yatra-one", "yatra-one", "Yatra One", "dev", "display"],
  ["ranga", "ranga", "Ranga", "dev", "display"],
  ["asar", "asar", "Asar", "dev", "serif"],
  ["sumana", "sumana", "Sumana", "dev", "serif"],

  // --------------------------------------------------------------------- Latin
  ["tinos", "tinos", "Tinos (Times-compatible)", "latin", "serif"],
  ["arimo", "arimo", "Arimo (Arial-compatible)", "latin", "sans"],
  ["carlito", "carlito", "Carlito (Calibri-compatible)", "latin", "sans"],
  ["gelasio", "gelasio", "Gelasio (Georgia-compatible)", "latin", "serif"],
  ["eb-garamond", "eb-garamond", "EB Garamond", "latin", "serif"],
  ["crimson-pro", "crimson-pro", "Crimson Pro", "latin", "serif"],
  ["libre-baskerville", "libre-baskerville", "Libre Baskerville", "latin", "serif"],
  ["merriweather", "merriweather", "Merriweather", "latin", "serif"],
  ["lora", "lora", "Lora", "latin", "serif"],
  ["source-serif-4", "source-serif-4", "Source Serif 4", "latin", "serif"],
  ["playfair", "playfair-display", "Playfair Display", "latin", "display"],
  ["spectral", "spectral", "Spectral", "latin", "serif"],
  ["bitter", "bitter", "Bitter", "latin", "serif"],
  ["literata", "literata", "Literata", "latin", "serif"],
  ["pt-serif", "pt-serif", "PT Serif", "latin", "serif"],
  ["cormorant", "cormorant-garamond", "Cormorant Garamond", "latin", "serif"],
  ["ibm-plex-serif", "ibm-plex-serif", "IBM Plex Serif", "latin", "serif"],
  ["inter", "inter", "Inter", "latin", "sans"],
  ["roboto", "roboto", "Roboto", "latin", "sans"],
  ["open-sans", "open-sans", "Open Sans", "latin", "sans"],
  ["lato", "lato", "Lato", "latin", "sans"],
  ["montserrat", "montserrat", "Montserrat", "latin", "sans"],
  ["work-sans", "work-sans", "Work Sans", "latin", "sans"],
  ["source-sans-3", "source-sans-3", "Source Sans 3", "latin", "sans"],
  ["ibm-plex-sans", "ibm-plex-sans", "IBM Plex Sans", "latin", "sans"],
  ["nunito-sans", "nunito-sans", "Nunito Sans", "latin", "sans"],
  ["public-sans", "public-sans", "Public Sans", "latin", "sans"],
  ["libre-franklin", "libre-franklin", "Libre Franklin", "latin", "sans"],
  ["alexandria", "alexandria", "Alexandria", "latin", "sans"],
  ["jetbrains-mono", "jetbrains-mono", "JetBrains Mono", "latin", "mono"],
  ["courier-prime", "courier-prime", "Courier Prime", "latin", "mono"],
  ["ibm-plex-mono", "ibm-plex-mono", "IBM Plex Mono", "latin", "mono"],
  ["roboto-mono", "roboto-mono", "Roboto Mono", "latin", "mono"],
  ["source-code-pro", "source-code-pro", "Source Code Pro", "latin", "mono"]
];

const WEIGHTS = ["400", "600", "700"];
const SUBSET = { dev: "devanagari", latin: "latin" };
const UNICODE = {
  dev: "U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B09",
  latin: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"
};

fs.mkdirSync(outFonts, { recursive: true });
fs.mkdirSync(work, { recursive: true });

const pkgs = [...new Set(CATALOG.map((c) => c[1]))];
console.log(`installing ${pkgs.length} font packages…`);
execFileSync("npm", ["install", "--no-save", "--no-audit", "--no-fund", "--silent", ...pkgs.map((p) => `@fontsource/${p}`)], {
  cwd: work,
  stdio: "inherit"
});

const faces = [];
const families = [];

for (const [id, pkg, label, script, category] of CATALOG) {
  const dir = path.join(work, "node_modules/@fontsource", pkg, "files");
  if (!fs.existsSync(dir)) {
    console.warn(`  ! ${id}: no files dir`);
    continue;
  }
  const all = fs.readdirSync(dir);
  const found = [];
  for (const w of WEIGHTS) {
    const f = all.find((n) => n.includes(`-${SUBSET[script]}-${w}-normal.woff2`));
    if (!f) continue;
    const target = `${id}-${w}.woff2`;
    fs.copyFileSync(path.join(dir, f), path.join(outFonts, target));
    found.push({ weight: w, file: `../vendor/fonts/${target}`, bytes: fs.statSync(path.join(dir, f)).size });
  }
  if (!found.length) {
    console.warn(`  ! ${id}: no ${script} subset`);
    continue;
  }
  // drop the extra 600 face if 400+700 already cover it, to save space
  const kept = found.filter((f) => f.weight !== "600" || found.length === 1);
  for (const f of found) if (!kept.includes(f)) fs.unlinkSync(path.join(outFonts, `${id}-${f.weight}.woff2`));

  for (const f of kept) {
    faces.push(
      `@font-face{font-family:"${label}";font-style:normal;font-weight:${f.weight};font-display:swap;` +
      `src:url("${f.file}") format("woff2");unicode-range:${UNICODE[script]}}`
    );
  }
  families.push({
    id, label, script, category,
    weights: kept.map((k) => k.weight),
    bytes: kept.reduce((a, b) => a + b.bytes, 0)
  });
  console.log(`  ✓ ${id.padEnd(18)} ${kept.map((k) => k.weight).join("/")}`);
}

const header = `/* Generated by scripts/build-fonts.mjs — do not edit.
   All faces are self-hosted (offline) and licensed under the SIL Open Font
   License 1.1 via Google Fonts / Fontsource. See docs/FONTS.md. */\n`;
fs.writeFileSync(outCss, header + faces.join("\n") + "\n");

const totalBytes = families.reduce((a, f) => a + f.bytes, 0);
fs.writeFileSync(
  outJs,
  `/* Generated by scripts/build-fonts.mjs — font registry used by the UI. */\n` +
  `window.ND=window.ND||{};\n` +
  `window.ND.FONT_CATALOG=${JSON.stringify(families, null, 1)};\n`
);

console.log(`\n${families.length} families, ${faces.length} faces, ${(totalBytes / 1048576).toFixed(2)} MB`);
console.log(`css → ${outCss}`);
