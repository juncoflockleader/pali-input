// gen-data.cjs — export the web app's glossary + root/affix data as a single
// JSON bundled into the macOS input method (so the IME can show meanings and
// morphological analysis without re-typing the data).
//
//   node desktop/macos/tools/gen-data.cjs   ->  desktop/macos/Resources/pali-data.json

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..', '..'); // repo root
const G = require(path.join(root, 'glossary.js'));
const R = require(path.join(root, 'roots.js')); // pulls in roots.data.js

const data = {
  glossary: G.GLOSSARY,
  phrases: G.PHRASES,
  roots: R.DHATU,
  upasagga: R.UPASAGGA,
  endings: R.ENDINGS,
  prefixExtra: R.PREFIX_EXTRA,
};

const outDir = path.join(__dirname, '..', 'Resources');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'pali-data.json');
fs.writeFileSync(outFile, JSON.stringify(data));

console.log(
  `wrote ${path.relative(root, outFile)}: ` +
  `${Object.keys(data.glossary).length} glossary, ${data.roots.length} roots, ` +
  `${data.upasagga.length} upasagga, ${data.endings.length} endings ` +
  `(${(fs.statSync(outFile).size / 1024).toFixed(0)} KB)`
);
