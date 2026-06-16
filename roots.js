// roots.js — Pali verbal roots (dhātu), prefixes (upasagga), and a small
// reference set of common suffixes. Feeds the morphological / next-sound hints.
//
// DHATU entries: { root, forms, en, zh }. `forms` lists IAST spellings to match
// against (the root plus its common present stem) — e.g. gam → "gacch".
//
// Exposes window.PaliRoots = { DHATU, UPASAGGA, SUFFIXES }.

(function (global) {
  'use strict';

  // Verbal roots (dhātu) are loaded from the generated roots.data.js
  // (DPD import + curated Chinese). Build with: node tools/build-roots.mjs
  let DATA = global.PaliRootsData;
  if (!DATA && typeof require !== "undefined") { try { DATA = require("./roots.data.js"); } catch (e) { DATA = null; } }
  const DHATU = (DATA && DATA.DHATU) || [];

  // The 20 traditional verbal prefixes.
  const UPASAGGA = [
    { form: 'pa', en: 'forth, out; intensive', zh: '出；前；强调' },
    { form: 'parā', en: 'away, back, aside', zh: '离；反；back' },
    { form: 'apa', en: 'away, off, down', zh: '离去；脱' },
    { form: 'saṃ', en: 'together, complete(ly), with', zh: '共；全；完全' },
    { form: 'anu', en: 'after, along, following, sub-', zh: '随；后；顺' },
    { form: 'ava', en: 'down, away (also: o-)', zh: '下；离' },
    { form: 'ni', en: 'down, into, in', zh: '下；入' },
    { form: 'nī', en: 'out, without, away (nis-)', zh: '出；离；无' },
    { form: 'u', en: 'up, out (ud-)', zh: '上；出' },
    { form: 'du', en: 'bad, hard, difficult (dur-)', zh: '难；恶' },
    { form: 'vi', en: 'apart, dis-, intensive, special', zh: '分；别；special' },
    { form: 'ā', en: 'to, towards, near; reversal', zh: '向；至；近' },
    { form: 'adhi', en: 'over, above, on, superior', zh: '增上；在…之上' },
    { form: 'api', en: 'on, close on (also: pi)', zh: '附；上' },
    { form: 'ati', en: 'over, beyond, excessive', zh: '过；超；极' },
    { form: 'su', en: 'well, good, easy', zh: '善；好；易' },
    { form: 'abhi', en: 'towards, onto; intensive', zh: '对；现；增上' },
    { form: 'paṭi', en: 'against, back, towards, re-', zh: '反；对；回' },
    { form: 'pari', en: 'around, about, completely', zh: '遍；周；全' },
    { form: 'upa', en: 'near, towards, sub-, minor', zh: '近；副；次' },
  ];

  // A small reference of common suffixes / endings (shown, not predicted).
  const SUFFIXES = [
    { suffix: '-tā / -tta', en: 'state, -ness (abstract noun)', zh: '…性；…状态' },
    { suffix: '-in / -ī', en: 'possessing, having', zh: '具有…的' },
    { suffix: '-maya', en: 'made of, consisting of', zh: '所成的；…制' },
    { suffix: '-ka', en: 'adjective / diminutive', zh: '形容词／小称' },
    { suffix: '-tvā', en: 'having done… (absolutive)', zh: '做了…之后（连续体）' },
    { suffix: '-tabba / -anīya', en: 'to be done (gerundive)', zh: '应被…（义务分词）' },
    { suffix: '-nta / -māna', en: 'doing… (present participle)', zh: '正在…（现在分词）' },
    { suffix: '-ta / -na', en: 'done… (past participle)', zh: '已…（过去分词）' },
  ];

  // Privative prefix (a nipāta, not one of the 20 upasagga, but very common):
  // anicca = a + nicca, anattā = an + attā.
  const PREFIX_EXTRA = [
    { form: 'a', en: 'not, un- (privative, before a consonant)', zh: '无；非（否定）' },
    { form: 'an', en: 'not, un- (privative, before a vowel)', zh: '无；非（否定，元音前）' },
  ];

  // Inflectional endings (vibhatti) and the most common derivational suffixes
  // (kita/taddhita). Used by the word-splitter to peel a likely ending off the
  // end of a word. `kind`: verb / case / nonfinite / deriv. Ambiguous endings
  // carry a slash-gloss — this is a hint, not a disambiguated parse.
  const ENDINGS = [
    // present indicative (active)
    { end: 'mi', kind: 'verb', en: '1sg "I …"', zh: '动词·我…' },
    { end: 'ma', kind: 'verb', en: '1pl "we …"', zh: '动词·我们…' },
    { end: 'si', kind: 'verb', en: '2sg "you …"', zh: '动词·你…' },
    { end: 'tha', kind: 'verb', en: '2pl "you all …"', zh: '动词·你们…' },
    { end: 'ti', kind: 'verb', en: '3sg "he/she/it …s"', zh: '动词·他/她…' },
    { end: 'anti', kind: 'verb', en: '3pl "they …"', zh: '动词·他们…' },
    // imperative / optative / aorist / future
    { end: 'tu', kind: 'verb', en: '3sg imperative "let him …"', zh: '命令·愿他…' },
    { end: 'antu', kind: 'verb', en: '3pl imperative', zh: '命令·愿他们…' },
    { end: 'eyya', kind: 'verb', en: 'optative "should/would …"', zh: '愿望·应／会…' },
    { end: 'esi', kind: 'verb', en: '2sg aorist "you …ed"', zh: '过去·你…了' },
    { end: 'iṃsu', kind: 'verb', en: '3pl aorist "they …ed"', zh: '过去·他们…了' },
    { end: 'ssati', kind: 'verb', en: '3sg future "will …"', zh: '未来·将…' },
    { end: 'ssāmi', kind: 'verb', en: '1sg future "I will …"', zh: '未来·我将…' },
    // non-finite
    { end: 'tvāna', kind: 'nonfinite', en: 'absolutive "having …ed"', zh: '连续体·…了之后' },
    { end: 'tvā', kind: 'nonfinite', en: 'absolutive "having …ed"', zh: '连续体·…了之后' },
    { end: 'tuṃ', kind: 'nonfinite', en: 'infinitive "to …"', zh: '不定式·去…' },
    { end: 'māna', kind: 'nonfinite', en: 'present participle "…ing"', zh: '现在分词·正在…的' },
    { end: 'anta', kind: 'nonfinite', en: 'present participle "…ing"', zh: '现在分词·正在…的' },
    { end: 'tabba', kind: 'nonfinite', en: 'gerundive "to be …ed"', zh: '义务分词·应被…的' },
    { end: 'anīya', kind: 'nonfinite', en: 'gerundive "to be …ed"', zh: '义务分词·应被…的' },
    { end: 'ita', kind: 'nonfinite', en: 'past participle "…ed"', zh: '过去分词·已…的' },
    // common noun case endings (-a stems, masc/neut)
    { end: 'assa', kind: 'case', en: 'gen./dat. sg. "of/to"', zh: '属格·…的；与格' },
    { end: 'asmiṃ', kind: 'case', en: 'loc. sg. "in/on"', zh: '处格·于…' },
    { end: 'amhi', kind: 'case', en: 'loc. sg. "in/on"', zh: '处格·于…' },
    { end: 'asmā', kind: 'case', en: 'abl. sg. "from"', zh: '从格·从…' },
    { end: 'ena', kind: 'case', en: 'instr. sg. "by/with"', zh: '具格·以…' },
    { end: 'āya', kind: 'case', en: 'dat./gen. sg.; fem.', zh: '与格／属格；阴性' },
    { end: 'ānaṃ', kind: 'case', en: 'gen./dat. pl. "of/to (pl.)"', zh: '属格复数·…们的' },
    { end: 'ehi', kind: 'case', en: 'instr./abl. pl. "by/from (pl.)"', zh: '具格／从格复数' },
    { end: 'esu', kind: 'case', en: 'loc. pl. "in (pl.)"', zh: '处格复数·于…们' },
    { end: 'āni', kind: 'case', en: 'nom./acc. pl. neut.', zh: '中性复数·主/宾格' },
    { end: 'aṃ', kind: 'case', en: 'acc. sg. "(object)"; nom./acc. neut.', zh: '宾格单数；中性' },
    { end: 'o', kind: 'case', en: 'nom. sg. masc. "(subject)"', zh: '主格单数（阳性）' },
    { end: 'ā', kind: 'case', en: 'nom. pl.; abl. sg.; fem. stem', zh: '主格复数／从格／阴性' },
    { end: 'e', kind: 'case', en: 'acc. pl.; loc. sg.', zh: '宾格复数／处格' },
    // derivational (taddhita / kita)
    { end: 'tta', kind: 'deriv', en: 'abstract noun "-ness/-hood"', zh: '抽象名词·…性' },
    { end: 'tā', kind: 'deriv', en: 'abstract noun "-ness"', zh: '抽象名词·…性' },
    { end: 'maya', kind: 'deriv', en: 'made of, consisting of', zh: '…所成的' },
    { end: 'vant', kind: 'deriv', en: 'having, possessing', zh: '具有…的' },
    { end: 'mant', kind: 'deriv', en: 'having, possessing', zh: '具有…的' },
    { end: 'tara', kind: 'deriv', en: 'comparative "more …"', zh: '比较级·较…' },
    { end: 'tama', kind: 'deriv', en: 'superlative "most …"', zh: '最高级·最…' },
  ];

  global.PaliRoots = { DHATU, UPASAGGA, SUFFIXES, ENDINGS, PREFIX_EXTRA };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.PaliRoots;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
