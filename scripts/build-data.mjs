/**
 * Generates the offline dictionaries in app/data/ from:
 *   - CFILT Hindi WordNet (via the `wordnet-hi` npm package)
 *   - an English word list (via `an-array-of-english-words`)
 *
 * Output files are plain <script> files so the WebView can load them without
 * any bundler or CORS dance:
 *   app/data/hi-words.js   window.HI_WORDS = "word\nword\n..."
 *   app/data/hi-dict.js    window.HI_DICT  = {"शब्द": "अर्थ ..."}
 *   app/data/en-words.js   window.EN_WORDS = "word\nword\n..."
 *
 * Run:  cd scripts && npm install && node build-data.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../app/data");
const wnDir = path.resolve(here, "node_modules/wordnet-hi/db");
fs.mkdirSync(outDir, { recursive: true });

const DEV = /[\u0900-\u097F]/;

function readLines(f) {
  return fs.readFileSync(path.join(wnDir, f), "utf8").split("\n").filter(Boolean);
}

const words = new Set();
const dict = new Map();

// --- headwords from the index files -----------------------------------------
for (const f of ["index.noun", "index.verb", "index.adj", "index.adv"]) {
  for (const line of readLines(f)) {
    const lemma = line.split(" ")[0];
    if (!lemma) continue;
    for (const w of lemma.split("_")) {
      const clean = w.replace(/\(.*?\)/g, "").trim();
      if (clean.length > 1 && DEV.test(clean)) words.add(clean);
    }
    const spaced = lemma.replace(/_/g, " ").trim();
    if (spaced.includes(" ") && DEV.test(spaced)) words.add(spaced);
  }
}

// --- glosses from the data files --------------------------------------------
for (const f of ["data.noun", "data.verb", "data.adj", "data.adv"]) {
  for (const line of readLines(f)) {
    const bar = line.indexOf(" | ");
    if (bar < 0) continue;
    let gloss = line.slice(bar + 3).trim();
    const head = line.slice(0, bar);
    // words live between "ss_type" and the pointer count section; the safest
    // approach is to take the field right after the numeric header.
    // data format: offset lex_id ss_type w_cnt lemma1:lemma2:... p_cnt ...
    const parts = head.trim().split(/\s+/);
    const wcnt = parseInt(parts[2], 16);
    if (!wcnt || Number.isNaN(wcnt)) continue;
    const lemmas = (parts[3] || "")
      .split(":")
      .filter(Boolean)
      .map((w) => w.replace(/_/g, " "));
    const examples = gloss.split(/;\s*"|:\s*"/)[0].trim();
    if (examples.length > 220) gloss = examples.slice(0, 217) + "…";
    else gloss = examples;
    if (!gloss) continue;
    for (const lemma of lemmas) {
      if (!DEV.test(lemma)) continue;
      const prev = dict.get(lemma);
      if (!prev || gloss.length > prev.length) dict.set(lemma, gloss);
    }
  }
}

// --- English word list -------------------------------------------------------
const enPath = path.resolve(here, "node_modules/an-array-of-english-words/index.json");
let enWords = JSON.parse(fs.readFileSync(enPath, "utf8"));
enWords = enWords
  .filter((w) => /^[a-z]{2,22}$/.test(w))
  .sort();
// keep only reasonably common looking entries: drop 1-2 letter noise
const enSet = new Set(enWords.filter((w) => w.length > 2 || ["am", "an", "as", "at", "be", "by", "do", "go", "he", "if", "in", "is", "it", "me", "my", "no", "of", "on", "or", "so", "to", "up", "us", "we"].includes(w)));

const hiSorted = [...words].sort((a, b) => a.localeCompare(b, "hi"));
const dictSorted = [...dict.entries()].sort((a, b) => a[0].localeCompare(b[0], "hi"));

const write = (name, body) => {
  const p = path.join(outDir, name);
  fs.writeFileSync(p, body);
  console.log(`${name}: ${(fs.statSync(p).size / 1024 / 1024).toFixed(2)} MB`);
};

write(
  "hi-words.js",
  "/* generated - CFILT Hindi WordNet headwords */\nwindow.HI_WORDS=" +
    JSON.stringify(hiSorted.join("\n").replace(/\u2028/g, " ")) +
    ";\n"
);
write(
  "hi-dict.js",
  "/* generated - CFILT Hindi WordNet glosses */\nwindow.HI_DICT=" +
    JSON.stringify(Object.fromEntries(dictSorted)) +
    ";\n"
);
write(
  "en-words.js",
  "/* generated - English word list */\nwindow.EN_WORDS=" + JSON.stringify([...enSet].join("\n")) + ";\n"
);

console.log(`hindi words: ${hiSorted.length}, glosses: ${dictSorted.length}, english words: ${enSet.size}`);
