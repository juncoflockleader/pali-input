// build-freq-words.cjs — frequency-ranked word list for autocomplete.
//
// Reads the DPD headword TSVs, computes each lemma's total Tipiṭaka frequency
// (sum of freq_data.CstFreq), and writes the top-N lemmas (by frequency) with a
// short English meaning to freq-words.json — used by the web app's word
// completion. Run:
//   node tools/build-freq-words.cjs
//
// Source TSVs (cache, gitignored): desktop/macos/tools/dpd_cache/
//   curl -sS -o desktop/macos/tools/dpd_cache/dpd_headwords_part_00N.tsv \
//     https://raw.githubusercontent.com/digitalpalidictionary/dpd-db/main/db/backup_tsv/dpd_headwords_part_00N.tsv
//
// Data: Digital Pāḷi Dictionary (dpd-db), CC BY-NC-SA. English only.

const fs = require('fs');
const path = require('path');

const TOP_N = 8000;
const cacheDir = path.join(__dirname, '..', 'desktop', 'macos', 'tools', 'dpd_cache');
const parts = ['001', '002', '003'].map((n) => path.join(cacheDir, `dpd_headwords_part_${n}.tsv`));

function splitRow(l) { return l.split('\t').map((f) => f.replace(/^"/, '').replace(/"$/, '').replace(/""/g, '"')); }
function bareLemma(s) { return s.replace(/\s+\d+(\.\d+)?$/, '').trim().toLowerCase(); }
function clip(s) { s = s.replace(/\s+/g, ' ').trim(); return s.length > 40 ? s.slice(0, 39) + '…' : s; }

const agg = new Map(); // lemma -> { freq, en }

for (const file of parts) {
  if (!fs.existsSync(file)) {
    console.error(`missing ${path.relative(process.cwd(), file)} — fetch the DPD headword TSVs first (see header).`);
    process.exit(1);
  }
  const lines = fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n');
  const H = splitRow(lines[0]);
  const L = H.indexOf('lemma_1'), M1 = H.indexOf('meaning_1'), F = H.indexOf('freq_data');
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const f = splitRow(lines[i]);
    if (f.length <= F) continue;
    const key = bareLemma(f[L] || '');
    if (!key) continue;
    let freq = 0;
    const fd = f[F];
    if (fd) {
      try {
        const cst = JSON.parse(fd).CstFreq;
        if (Array.isArray(cst)) for (const n of cst) freq += (n | 0);
      } catch { /* leave 0 */ }
    }
    const meaning = (f[M1] && f[M1] !== '-') ? clip(f[M1]) : '';
    const cur = agg.get(key);
    if (cur) { cur.freq += freq; if (!cur.en && meaning) cur.en = meaning; }
    else agg.set(key, { freq, en: meaning });
  }
}

// Boost the curated core vocabulary so it always ranks first in completion —
// DPD's freq_data is empty for some important words (e.g. nibbāna), and a
// learner most wants to complete to these. Real frequency still orders within
// each tier (curated above the rest).
const BOOST = 1e9;
const curated = require(path.join(__dirname, '..', 'glossary.js')).GLOSSARY;
for (const key of Object.keys(curated)) {
  const cur = agg.get(key);
  if (cur) cur.freq += BOOST;
  else agg.set(key, { freq: BOOST, en: curated[key].en || '' });
}

const ranked = [...agg.entries()]
  .sort((a, b) => b[1].freq - a[1].freq)
  .slice(0, TOP_N)
  .map(([w, v]) => [w, v.freq, v.en]); // compact [lemma, freq, meaning]

const outFile = path.join(__dirname, '..', 'freq-words.json');
fs.writeFileSync(outFile, JSON.stringify(ranked));
const kb = (fs.statSync(outFile).size / 1024).toFixed(0);
console.log(`${agg.size} lemmas; wrote top ${ranked.length} to freq-words.json (${kb} KB)`);
console.log('top 10:', ranked.slice(0, 10).map((r) => `${r[0]}(${r[1]})`).join(' '));
