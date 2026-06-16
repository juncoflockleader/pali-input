// Verification tests for the Pali transliteration engine.
// Run: node test.js
const { transliterate, tokenize } = require('./pali.js');

let pass = 0;
let fail = 0;

function eq(input, script, expected, opts) {
  const got = transliterate(input, script, opts);
  if (got === expected) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL [${script}] "${input}"`);
    console.log(`   expected: ${expected}  (${codepoints(expected)})`);
    console.log(`   got:      ${got}  (${codepoints(got)})`);
  }
}

function codepoints(s) {
  return [...s].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');
}

// --- Roman / IAST: the input scheme decodes to correct diacritics ----------
eq('buddha', 'roman', 'buddha');
eq('dhamma', 'roman', 'dhamma');
eq('sa"ngha', 'roman', 'saṅgha');
eq('sangha', 'roman', 'saṅgha'); // smart nasal assimilation
eq('panca', 'roman', 'pañca'); // n -> ñ before palatal
eq('da.n.da', 'roman', 'daṇḍa');
eq('nibbaana', 'roman', 'nibbāna');
eq('bhikkhu', 'roman', 'bhikkhu');
eq('~naa.na', 'roman', 'ñāṇa');
eq('mettaa', 'roman', 'mettā');
eq('pa~n~naa', 'roman', 'paññā');
eq('araha.m', 'roman', 'arahaṃ');
eq('dhamma.m', 'roman', 'dhammaṃ');
eq('sa.msaara', 'roman', 'saṃsāra');
eq('Buddha', 'roman', 'Buddha'); // capitalization preserved
eq('.taa', 'roman', 'ṭā');
eq('ko.n.dañña', 'roman', 'koṇḍañña');
eq('buddha.m sara.na.m', 'roman', 'buddhaṃ saraṇaṃ'); // passthrough
eq('sangha', 'roman', 'sangha', { smartNasal: false }); // toggle off
// word-final m -> niggahīta ṃ (smart correction)
eq('buddham', 'roman', 'buddhaṃ');
eq('evam', 'roman', 'evaṃ');
eq('aham', 'roman', 'ahaṃ');
eq('dhammam', 'roman', 'dhammaṃ');
eq('buddham saranam', 'roman', 'buddhaṃ saranaṃ'); // each word's final m
eq('buddham.', 'roman', 'buddhaṃ.'); // m before punctuation is still final
eq('kamma', 'roman', 'kamma'); // medial geminate mm must NOT change
eq('metta', 'roman', 'metta'); // medial m before vowel must NOT change
eq('amba', 'roman', 'amba'); // medial m before consonant must NOT change
eq('buddham', 'roman', 'buddham', { smartNasal: false }); // off: unchanged
eq('buddham', 'devanagari', 'बुद्धं'); // ṃ -> anusvara in Devanagari

// --- Devanāgarī -------------------------------------------------------------
eq('buddha', 'devanagari', 'बुद्ध');
eq('dhamma', 'devanagari', 'धम्म');
eq('sangha', 'devanagari', 'सङ्घ');
eq('nibbaana', 'devanagari', 'निब्बान');
eq('bhikkhu', 'devanagari', 'भिक्खु');
eq('~naa.na', 'devanagari', 'ञाण');
eq('mettaa', 'devanagari', 'मेत्ता');
eq('pa~n~naa', 'devanagari', 'पञ्ञा');
eq('araha.m', 'devanagari', 'अरहं');
eq('dhamma.m', 'devanagari', 'धम्मं');
eq('sa.msaara', 'devanagari', 'संसार');
eq('kamma', 'devanagari', 'कम्म');
eq('citta', 'devanagari', 'चित्त');
eq('iti', 'devanagari', 'इति');

// --- Sinhala ----------------------------------------------------------------
eq('buddha', 'sinhala', 'බුද්ධ');
eq('dhamma', 'sinhala', 'ධම්ම');
eq('sangha', 'sinhala', 'සඞ්ඝ');
eq('nibbaana', 'sinhala', 'නිබ්බාන');
eq('bhikkhu', 'sinhala', 'භික්ඛු');
eq('mettaa', 'sinhala', 'මෙත්තා');
eq('pa~n~naa', 'sinhala', 'පඤ්ඤා');

// --- Thai -------------------------------------------------------------------
eq('buddha', 'thai', 'พุทฺธ');
eq('dhamma', 'thai', 'ธมฺม');
eq('sangha', 'thai', 'สงฺฆ');
eq('nibbaana', 'thai', 'นิพฺพาน');
eq('bhikkhu', 'thai', 'ภิกฺขุ');
eq('mettaa', 'thai', 'เมตฺตา');
eq('araha.m', 'thai', 'อรหํ');

// --- Myanmar (kinzi clusters not handled; non-kinzi words verified) ---------
eq('buddha', 'myanmar', 'ဗုဒ္ဓ');
eq('dhamma', 'myanmar', 'ဓမ္မ');
eq('nibbaana', 'myanmar', 'နိဗ္ဗာန');
eq('bhikkhu', 'myanmar', 'ဘိက္ခု');
eq('mettaa', 'myanmar', 'မေတ္တာ');

// --- Tokenizer sanity -------------------------------------------------------
{
  const t = tokenize('attha');
  const iast = t.map((x) => x.iast).join(',');
  if (iast !== 'a,t,th,a') { fail++; console.log(`FAIL tokenize attha -> ${iast}`); } else pass++;
}

// --- Glossary ---------------------------------------------------------------
const G = require('./glossary.js');

function glossEq(word, lang, expected) {
  const hit = G.lookup(word);
  const got = hit ? hit[lang] : null;
  if (got === expected) {
    pass++;
  } else {
    fail++;
    console.log(`FAIL glossary "${word}".${lang} -> ${got} (expected ${expected})`);
  }
}

glossEq('buddha', 'zh', '佛；觉者');
glossEq('dhamma', 'en', 'the teaching; truth; phenomenon; nature');
glossEq('nibbāna', 'zh', '涅槃；寂灭');
glossEq('mettā', 'zh', '慈；慈爱');
glossEq('buddhaṃ', 'zh', '佛；觉者'); // stem fallback: buddhaṃ -> buddha
glossEq('saraṇaṃ', 'zh', '皈依；庇护处'); // stem fallback
glossEq('gacchāmi', 'en', 'I go');
glossEq('sattā', 'zh', '众生');

{
  // stem flag is set on fallback matches
  const hit = G.lookup('dhammaṃ');
  if (hit && hit.stem && hit.key === 'dhamma') pass++;
  else { fail++; console.log('FAIL glossary stem flag for dhammaṃ'); }
}
{
  // unknown word returns null
  if (G.lookup('xyzzy') === null) pass++;
  else { fail++; console.log('FAIL glossary unknown word should be null'); }
}
{
  // phrase lookup
  const p = G.lookupPhrase('buddhaṃ saraṇaṃ gacchāmi');
  if (p && p.zh === '我皈依佛。') pass++;
  else { fail++; console.log('FAIL phrase lookup'); }
}

// --- Predictor --------------------------------------------------------------
require('./roots.js');
const P = require('./predict.js');

function assert(cond, msg) {
  if (cond) pass++;
  else { fail++; console.log(`FAIL ${msg}`); }
}

// toAkk tokenizes into akkhara (digraphs are one unit)
assert(P.toAkk('buddha').join('|') === 'b|u|d|dh|a', 'toAkk buddha');
assert(P.toAkk('ṭhā').join('|') === 'ṭh|ā', 'toAkk ṭhā');

// next sound after "bu" should include d (buddha, budh...)
assert(P.nextSounds(P.toAkk('bu')).includes('d'), 'nextSounds bu -> d');
// after "buddh" should include a vowel a (buddha)
assert(P.nextSounds(P.toAkk('buddh')).includes('a'), 'nextSounds buddh -> a');
// empty prefix falls back to onsets/vowels (non-empty list)
assert(P.nextSounds([]).length > 0, 'nextSounds empty -> fallback');
// a consonant with no lexicon continuation still offers vowels (phonotactic)
assert(P.nextSounds(['ph']).includes('a'), 'nextSounds phonotactic vowel fallback');

// root matching: "ga" matches gam (go)
{
  const r = P.matchRoots(P.toAkk('ga'));
  assert(r.some((x) => x.root === 'gam'), 'matchRoots ga -> gam');
}
// present-stem matching: "gacch" matches gam via its stem form
{
  const r = P.matchRoots(P.toAkk('gacch'));
  assert(r.some((x) => x.root === 'gam' && x.form === 'gacch'), 'matchRoots gacch -> gam stem');
}
// prefix-stripping: "anubudh" -> upasagga anu- + root budh
{
  const r = P.matchRoots(P.toAkk('anubudh'));
  assert(r.some((x) => x.root === 'budh' && x.prefix === 'anu'), 'matchRoots anubudh -> anu+budh');
}
// affix matching: "an" matches anu- (mid-typing)
{
  const a = P.matchAffixes(P.toAkk('an'));
  assert(a.some((x) => x.form === 'anu'), 'matchAffixes an -> anu');
}
// affix matching: "anu" is a complete prefix
{
  const a = P.matchAffixes(P.toAkk('anu'));
  assert(a.some((x) => x.form === 'anu' && x.complete), 'matchAffixes anu complete');
}
// lenient nasal: user "san" should predict toward saṅkhāra / santi
{
  const ns = P.nextSounds(P.toAkk('san'));
  assert(ns.includes('kh') || ns.includes('t'), 'nextSounds san -> kh/t (lenient nasal)');
}

// --- Morphological splitter -------------------------------------------------
function firstAnalysis(word) {
  return P.analyze(P.toAkk(word), 3);
}
function hasSplit(word, predicate, msg) {
  const a = firstAnalysis(word);
  assert(a.some(predicate), msg + ` (got: ${JSON.stringify(a.map((c) => ({ p: c.prefixes.map((x) => x.form), s: c.stem.label, e: c.ending && c.ending.end })))})`);
}

// noun: stem (word) + case ending
hasSplit('dhammassa', (c) => c.stem.label === 'dhamma' && c.ending && c.ending.end === 'assa', 'dhammassa -> dhamma + -assa');
hasSplit('nibbānaṃ', (c) => c.stem.label === 'nibbāna' && c.ending && c.ending.end === 'aṃ', 'nibbānaṃ -> nibbāna + -aṃ');
hasSplit('paññāya', (c) => c.stem.label === 'paññā' && c.ending && c.ending.end === 'āya', 'paññāya -> paññā + -āya');
// verb: root + ending
hasSplit('gacchati', (c) => c.stem.label === '√gam' && c.ending && c.ending.end === 'ti', 'gacchati -> √gam + -ti');
// prefix + root + ending
hasSplit('anugacchati', (c) => c.prefixes.some((p) => p.form === 'anu') && c.stem.label === '√gam', 'anugacchati -> anu + √gam');
// privative prefix
hasSplit('anattā', (c) => c.prefixes.some((p) => p.form === 'an') && c.stem.label === 'attā', 'anattā -> an + attā');
// whole-word match (no inflection)
hasSplit('mettā', (c) => c.stem.label === 'mettā', 'mettā -> mettā (lemma)');
// every full analysis has a recognized stem
{
  const a = firstAnalysis('viññāṇaṃ');
  assert(a.length && a[0].full && a[0].stem.label === 'viññāṇa', 'viññāṇaṃ -> viññāṇa full');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
