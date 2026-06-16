// gen-dpd-dict.cjs — build a compact lemma -> English-meaning dictionary from
// the full Digital Pāḷi Dictionary headword tables, for the macOS IME's info
// panel (so it can gloss far more than the 169 curated bilingual words).
//
//   node desktop/macos/tools/gen-dpd-dict.cjs   ->  desktop/macos/Resources/dpd-dict.json
//
// Reads tools/dpd_cache/dpd_headwords_part_00{1,2,3}.tsv. Fetch them first:
//   for n in 001 002 003; do curl -sS -o desktop/macos/tools/dpd_cache/dpd_headwords_part_$n.tsv \
//     https://raw.githubusercontent.com/digitalpalidictionary/dpd-db/main/db/backup_tsv/dpd_headwords_part_$n.tsv; done
//
// Data: Digital Pāḷi Dictionary (dpd-db), CC BY-NC-SA. English only.

const fs = require('fs');
const path = require('path');

const cacheDir = path.join(__dirname, 'dpd_cache');
const parts = ['001', '002', '003'].map((n) => path.join(cacheDir, `dpd_headwords_part_${n}.tsv`));

function splitRow(line) {
  return line.split('\t').map((f) => f.replace(/^"|"$/g, '').replace(/""/g, '"'));
}
// "dhamma 1.1" / "a 2.2" -> "dhamma" / "a"; lowercased
function bareLemma(s) {
  return s.replace(/\s+\d+(\.\d+)?$/, '').trim().toLowerCase();
}
function clip(s) {
  s = s.replace(/\s+/g, ' ').trim();
  return s.length > 90 ? s.slice(0, 89) + '…' : s;
}

const dict = new Map(); // lemma -> array of distinct meanings (max 2)
let rows = 0;

for (const file of parts) {
  if (!fs.existsSync(file)) {
    console.error(`missing ${path.relative(process.cwd(), file)} — fetch the DPD headword TSVs first (see header).`);
    process.exit(1);
  }
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const H = splitRow(lines[0]);
  const L = H.indexOf('lemma_1'), M1 = H.indexOf('meaning_1'), M2 = H.indexOf('meaning_2');
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const f = splitRow(lines[i]);
    if (f.length <= M1) continue;
    const meaning = (f[M1] && f[M1] !== '-') ? f[M1] : (f[M2] || '');
    if (!meaning || meaning === '-') continue;
    const key = bareLemma(f[L] || '');
    if (!key) continue;
    rows++;
    const m = clip(meaning);
    const arr = dict.get(key) || [];
    if (arr.length < 2 && !arr.includes(m)) arr.push(m);
    dict.set(key, arr);
  }
}

const out = {};
for (const [k, arr] of dict) out[k] = arr.join('; ');

const outFile = path.join(__dirname, '..', 'Resources', 'dpd-dict.json');
fs.writeFileSync(outFile, JSON.stringify(out));
const mb = (fs.statSync(outFile).size / 1048576).toFixed(1);
console.log(`processed ${rows} senses -> ${Object.keys(out).length} unique lemmas; wrote dpd-dict.json (${mb} MB)`);
