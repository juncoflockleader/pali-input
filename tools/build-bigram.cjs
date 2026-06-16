// build-bigram.cjs — next-word prediction model from a Pali corpus.
//
// Reads the SuttaCentral Mahāsaṅgīti Pali root text (bilara-data JSON), counts
// word bigrams within each file (document order), and writes bigram.json:
//   { word: [topSuccessor1, topSuccessor2, ...] }  (by corpus frequency)
//
//   node tools/build-bigram.cjs [corpusDir]
//   corpusDir defaults to tools/corpus; populate it with a sparse checkout:
//     git clone --filter=blob:none --no-checkout --depth 1 -b published \
//       https://github.com/suttacentral/bilara-data tools/_bilara
//     (cd tools/_bilara && git sparse-checkout set root/pli/ms && git checkout)
//     then point this script at tools/_bilara/root/pli/ms
//
// Corpus: SuttaCentral bilara-data (CC0). Text is normalized ṁ→ṃ to match our
// IAST data.

const fs = require('fs');
const path = require('path');

const corpusDir = process.argv[2] || path.join(__dirname, 'corpus');
const TOP_K = 5;        // successors kept per word
const MIN_COUNT = 2;    // a successor must occur at least this many times

const WORD = /[a-zāīūṃṅñṭḍṇḷ]+/g;
function tokenize(text) {
  return (text.toLowerCase().replace(/ṁ/g, 'ṃ').match(WORD)) || [];
}

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.json')) out.push(p);
  }
  return out;
}

if (!fs.existsSync(corpusDir)) {
  console.error(`corpus dir not found: ${corpusDir} (see header for how to fetch)`);
  process.exit(1);
}

const files = walk(corpusDir, []);
const bigrams = new Map(); // head -> Map(next -> count)
let tokenTotal = 0;

for (const file of files) {
  let obj;
  try { obj = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
  // join the file's segments in document order, then tokenize as one stream
  const toks = tokenize(Object.values(obj).join(' '));
  tokenTotal += toks.length;
  for (let i = 0; i < toks.length - 1; i++) {
    const a = toks[i], b = toks[i + 1];
    let m = bigrams.get(a);
    if (!m) { m = new Map(); bigrams.set(a, m); }
    m.set(b, (m.get(b) || 0) + 1);
  }
}

const out = {};
let heads = 0;
for (const [head, succ] of bigrams) {
  const top = [...succ.entries()]
    .filter(([, c]) => c >= MIN_COUNT)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_K)
    .map(([w]) => w);
  if (top.length) { out[head] = top; heads++; }
}

const outFile = path.join(__dirname, '..', 'bigram.json');
fs.writeFileSync(outFile, JSON.stringify(out));
const mb = (fs.statSync(outFile).size / 1048576).toFixed(2);
console.log(`${files.length} files, ${tokenTotal} tokens; ${heads} head words -> bigram.json (${mb} MB)`);
for (const w of ['buddhaṃ', 'namo', 'sabbe', 'evaṃ', 'bhikkhave', 'iti'])
  if (out[w]) console.log(`  ${w} → ${out[w].join(' / ')}`);
