// build-compounds.cjs — compound (samāsa) → member-lemmas map, from DPD.
//
// Reads the DPD headword TSVs and, for every compound headword (those with a
// compound_construction), parses the `construction` field into member lemmas
// (taking the underlying form before any "X > Y" sandhi notation). Writes
// compounds.json: { lemma: ["member1", "member2", ...] }.
//
//   node tools/build-compounds.cjs
//
// Source TSVs (cache, gitignored): desktop/macos/tools/dpd_cache/
// Data: Digital Pāḷi Dictionary (dpd-db), CC BY-NC-SA.

const fs = require('fs');
const path = require('path');

const cacheDir = path.join(__dirname, '..', 'desktop', 'macos', 'tools', 'dpd_cache');
const parts = ['001', '002', '003'].map((n) => path.join(cacheDir, `dpd_headwords_part_${n}.tsv`));

const split = (l) => l.split('\t').map((f) => f.replace(/^"/, '').replace(/"$/, '').replace(/""/g, '"'));
const bareLemma = (s) => s.replace(/\s+\d+(\.\d+)?$/, '').trim().toLowerCase();

// "na > a + sammā + saṃbuddha" -> ["na","sammā","saṃbuddha"]  (underlying lemmas)
function members(construction) {
  return construction
    .split(' + ')
    .map((p) => { const i = p.indexOf(' > '); return (i >= 0 ? p.slice(0, i) : p).trim(); })
    .filter(Boolean);
}

const map = new Map();
for (const file of parts) {
  if (!fs.existsSync(file)) { console.error(`missing ${file} — fetch DPD headword TSVs first`); process.exit(1); }
  const lines = fs.readFileSync(file, 'utf8').replace(/\r/g, '').split('\n');
  const H = split(lines[0]);
  const L = H.indexOf('lemma_1'), C = H.indexOf('construction'), CC = H.indexOf('compound_construction');
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const f = split(lines[i]);
    if (f.length <= CC) continue;
    const cc = f[CC] || '';
    if (!cc || cc === '-') continue;          // only compounds
    const m = members(f[C] || '');
    if (m.length < 2) continue;                // a compound has >= 2 members
    const key = bareLemma(f[L] || '');
    if (key && !map.has(key)) map.set(key, m);  // first sense wins
  }
}

const out = {};
for (const [k, v] of map) out[k] = v;
const outFile = path.join(__dirname, '..', 'compounds.json');
fs.writeFileSync(outFile, JSON.stringify(out));
const kb = (fs.statSync(outFile).size / 1024).toFixed(0);
console.log(`${map.size} compounds -> compounds.json (${kb} KB)`);
for (const w of ['dhammacakkappavattana', 'buddhānussati', 'lokuttara', 'satipaṭṭhāna', 'paṭiccasamuppāda'])
  if (out[w]) console.log(`  ${w} = ${out[w].join(' + ')}`);
