// pali.js — Pali phonetic transliteration engine.
//
// Input: an ASCII "pronunciation" spelling of Pali (a Velthuis-style scheme,
//        also accepting real IAST diacritics on input).
// Output: Pali rendered in a chosen script — IAST (Roman with diacritics),
//         Devanāgarī, Sinhala, Thai, or Myanmar.
//
// The pipeline is: tokenize(text) -> [phoneme tokens] -> render<Script>(tokens).
// Each phoneme token is the canonical IAST letter tagged with a type:
//   'V' vowel, 'C' consonant, 'M' niggahīta (ṃ), 'X' passthrough (space/punct).
//
// Self-contained IIFE: exposes only `Pali`. Works as a classic browser
// <script> (window.Pali) and as a CommonJS module in Node (require). No build.

(function (global) {
  'use strict';

  // -------------------------------------------------------------------------
  // Tokenizer
  // -------------------------------------------------------------------------

  // [input spelling, canonical IAST, type]. Longer inputs are matched first.
  const RAW_TOKENS = [
    // long vowels (double) — must beat single vowels
    ['aa', 'ā', 'V'], ['ii', 'ī', 'V'], ['uu', 'ū', 'V'],
    // short / other vowels
    ['a', 'a', 'V'], ['i', 'i', 'V'], ['u', 'u', 'V'], ['e', 'e', 'V'], ['o', 'o', 'V'],
    // vowels already typed with diacritics
    ['ā', 'ā', 'V'], ['ī', 'ī', 'V'], ['ū', 'ū', 'V'],

    // niggahīta (anusvāra)
    ['.m', 'ṃ', 'M'], ['ṃ', 'ṃ', 'M'], ['ṁ', 'ṃ', 'M'],

    // place-specific nasals (explicit)
    ['"n', 'ṅ', 'C'], [';n', 'ṅ', 'C'], ['ṅ', 'ṅ', 'C'],
    ['~n', 'ñ', 'C'], ['ñ', 'ñ', 'C'],

    // retroflex (cerebral) consonants — dot prefix, aspirates before plain
    ['.th', 'ṭh', 'C'], ['.t', 'ṭ', 'C'],
    ['.dh', 'ḍh', 'C'], ['.d', 'ḍ', 'C'],
    ['.n', 'ṇ', 'C'], ['.l', 'ḷ', 'C'],
    ['ṭh', 'ṭh', 'C'], ['ṭ', 'ṭ', 'C'],
    ['ḍh', 'ḍh', 'C'], ['ḍ', 'ḍ', 'C'],
    ['ṇ', 'ṇ', 'C'], ['ḷ', 'ḷ', 'C'],

    // aspirated consonants — must beat their plain form
    ['kh', 'kh', 'C'], ['gh', 'gh', 'C'],
    ['ch', 'ch', 'C'], ['jh', 'jh', 'C'],
    ['th', 'th', 'C'], ['dh', 'dh', 'C'],
    ['ph', 'ph', 'C'], ['bh', 'bh', 'C'],

    // plain consonants
    ['k', 'k', 'C'], ['g', 'g', 'C'],
    ['c', 'c', 'C'], ['j', 'j', 'C'],
    ['t', 't', 'C'], ['d', 'd', 'C'],
    ['p', 'p', 'C'], ['b', 'b', 'C'],
    ['n', 'n', 'C'], ['m', 'm', 'C'],
    ['y', 'y', 'C'], ['r', 'r', 'C'], ['l', 'l', 'C'],
    ['v', 'v', 'C'], ['w', 'v', 'C'], ['s', 's', 'C'], ['h', 'h', 'C'],
  ];

  // Match longest spellings first so e.g. ".th" beats ".t" beats "t".
  const TOKENS = [...RAW_TOKENS].sort((a, b) => b[0].length - a[0].length);

  // Homorganic nasal assimilation: a plain `n` adopts the place of the stop
  // that follows it (the regular Pali orthographic rule). Lets a user type the
  // "pronunciation" — e.g. "sangha" -> saṅgha, "panca" -> pañca.
  const NASAL_BEFORE = {
    k: 'ṅ', kh: 'ṅ', g: 'ṅ', gh: 'ṅ',
    c: 'ñ', ch: 'ñ', j: 'ñ', jh: 'ñ',
    ṭ: 'ṇ', ṭh: 'ṇ', ḍ: 'ṇ', ḍh: 'ṇ',
    p: 'm', ph: 'm', b: 'm', bh: 'm',
  };

  function isUpper(ch) {
    return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
  }

  /**
   * Convert an input string into a list of phoneme tokens.
   * @param {string} text
   * @param {{smartNasal?: boolean}} [opts]
   * @returns {Array<{type:string, iast:string, upper:boolean}>}
   */
  function tokenize(text, opts) {
    opts = opts || {};
    const smartNasal = opts.smartNasal !== false; // default on
    const tokens = [];
    let i = 0;
    const lower = text.toLowerCase();

    outer: while (i < text.length) {
      for (const [inp, iast, type] of TOKENS) {
        if (lower.startsWith(inp, i)) {
          tokens.push({ type, iast, upper: isUpper(text[i]) });
          i += inp.length;
          continue outer;
        }
      }
      // Unmatched char (space, digit, punctuation, newline) — pass through.
      tokens.push({ type: 'X', iast: text[i], upper: false });
      i += 1;
    }

    if (smartNasal) {
      applyNasalAssimilation(tokens);
      applyFinalNiggahita(tokens);
    }
    return tokens;
  }

  function applyNasalAssimilation(tokens) {
    for (let k = 0; k < tokens.length - 1; k++) {
      const t = tokens[k];
      if (t.type === 'C' && t.iast === 'n') {
        const next = tokens[k + 1];
        if (next.type === 'C' && NASAL_BEFORE[next.iast]) {
          t.iast = NASAL_BEFORE[next.iast];
        }
      }
    }
  }

  // A word-final plain `m` is always the niggahīta ṃ in Pali (no Pali word ends
  // in a plain `m`), so e.g. "buddham" -> "buddhaṃ". Only word-final: a medial
  // `m` could be a geminate (kamma) or precede a vowel (metta) and must stay.
  function applyFinalNiggahita(tokens) {
    for (let k = 0; k < tokens.length; k++) {
      const t = tokens[k];
      if (t.type === 'C' && t.iast === 'm') {
        const next = tokens[k + 1];
        if (!next || next.type === 'X') {
          t.type = 'M';
          t.iast = 'ṃ';
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Roman / IAST renderer
  // -------------------------------------------------------------------------

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function renderRoman(tokens) {
    return tokens.map((t) => (t.upper ? cap(t.iast) : t.iast)).join('');
  }

  // -------------------------------------------------------------------------
  // Generic abugida (Brahmic) renderer
  // -------------------------------------------------------------------------
  //
  // Brahmic scripts are abugidas: a consonant carries an inherent `a`. A vowel
  // other than `a` replaces it with a dependent sign; a consonant cluster
  // stacks with a virama between members; a word-initial vowel is independent.

  function renderAbugida(tokens, m) {
    const out = [];
    let run = []; // pending consonants forming a cluster

    const flushWithVowel = (vowel) => {
      let s = '';
      for (let k = 0; k < run.length - 1; k++) s += m.cons[run[k]] + m.stacker;
      const last = run[run.length - 1];
      if (m.leadingVowels && m.leadingVowels[vowel] !== undefined) {
        s += m.leadingVowels[vowel] + m.cons[last];
      } else {
        s += m.cons[last] + (m.vowelSign[vowel] || '');
      }
      out.push(s);
      run = [];
    };

    const flushDead = () => {
      for (const c of run) out.push(m.cons[c] + m.killer);
      run = [];
    };

    for (const t of tokens) {
      if (t.type === 'C') {
        run.push(t.iast);
      } else if (t.type === 'V') {
        if (run.length) flushWithVowel(t.iast);
        else out.push(m.vowelIndep[t.iast]);
      } else if (t.type === 'M') {
        if (run.length) flushDead();
        out.push(m.anusvara);
      } else {
        if (run.length) flushDead();
        out.push(t.iast);
      }
    }
    if (run.length) flushDead();
    return out.join('');
  }

  // -------------------------------------------------------------------------
  // Script tables
  // -------------------------------------------------------------------------

  const DEVANAGARI = {
    cons: {
      k: 'क', kh: 'ख', g: 'ग', gh: 'घ', ṅ: 'ङ',
      c: 'च', ch: 'छ', j: 'ज', jh: 'झ', ñ: 'ञ',
      ṭ: 'ट', ṭh: 'ठ', ḍ: 'ड', ḍh: 'ढ', ṇ: 'ण',
      t: 'त', th: 'थ', d: 'द', dh: 'ध', n: 'न',
      p: 'प', ph: 'फ', b: 'ब', bh: 'भ', m: 'म',
      y: 'य', r: 'र', l: 'ल', ḷ: 'ळ', v: 'व', s: 'स', h: 'ह',
    },
    vowelIndep: { a: 'अ', ā: 'आ', i: 'इ', ī: 'ई', u: 'उ', ū: 'ऊ', e: 'ए', o: 'ओ' },
    vowelSign: { a: '', ā: 'ा', i: 'ि', ī: 'ी', u: 'ु', ū: 'ू', e: 'े', o: 'ो' },
    stacker: '्', killer: '्', anusvara: 'ं',
  };

  const SINHALA = {
    cons: {
      k: 'ක', kh: 'ඛ', g: 'ග', gh: 'ඝ', ṅ: 'ඞ',
      c: 'ච', ch: 'ඡ', j: 'ජ', jh: 'ඣ', ñ: 'ඤ',
      ṭ: 'ට', ṭh: 'ඨ', ḍ: 'ඩ', ḍh: 'ඪ', ṇ: 'ණ',
      t: 'ත', th: 'ථ', d: 'ද', dh: 'ධ', n: 'න',
      p: 'ප', ph: 'ඵ', b: 'බ', bh: 'භ', m: 'ම',
      y: 'ය', r: 'ර', l: 'ල', ḷ: 'ළ', v: 'ව', s: 'ස', h: 'හ',
    },
    vowelIndep: { a: 'අ', ā: 'ආ', i: 'ඉ', ī: 'ඊ', u: 'උ', ū: 'ඌ', e: 'එ', o: 'ඔ' },
    vowelSign: { a: '', ā: 'ා', i: 'ි', ī: 'ී', u: 'ු', ū: 'ූ', e: 'ෙ', o: 'ො' },
    stacker: '්', killer: '්', anusvara: 'ං',
  };

  const THAI = {
    cons: {
      k: 'ก', kh: 'ข', g: 'ค', gh: 'ฆ', ṅ: 'ง',
      c: 'จ', ch: 'ฉ', j: 'ช', jh: 'ฌ', ñ: 'ญ',
      ṭ: 'ฏ', ṭh: 'ฐ', ḍ: 'ฑ', ḍh: 'ฒ', ṇ: 'ณ',
      t: 'ต', th: 'ถ', d: 'ท', dh: 'ธ', n: 'น',
      p: 'ป', ph: 'ผ', b: 'พ', bh: 'ภ', m: 'ม',
      y: 'ย', r: 'ร', l: 'ล', ḷ: 'ฬ', v: 'ว', s: 'ส', h: 'ห',
    },
    // Initial vowels ride on the carrier อ.
    vowelIndep: { a: 'อ', ā: 'อา', i: 'อิ', ī: 'อี', u: 'อุ', ū: 'อู', e: 'เอ', o: 'โอ' },
    vowelSign: { a: '', ā: 'า', i: 'ิ', ī: 'ี', u: 'ุ', ū: 'ู', e: '', o: '' },
    leadingVowels: { e: 'เ', o: 'โ' }, // written before their consonant
    stacker: 'ฺ', killer: 'ฺ', anusvara: 'ํ', // phinthu, nikhahit
  };

  const MYANMAR = {
    cons: {
      k: 'က', kh: 'ခ', g: 'ဂ', gh: 'ဃ', ṅ: 'င',
      c: 'စ', ch: 'ဆ', j: 'ဇ', jh: 'ဈ', ñ: 'ဉ',
      ṭ: 'ဋ', ṭh: 'ဌ', ḍ: 'ဍ', ḍh: 'ဎ', ṇ: 'ဏ',
      t: 'တ', th: 'ထ', d: 'ဒ', dh: 'ဓ', n: 'န',
      p: 'ပ', ph: 'ဖ', b: 'ဗ', bh: 'ဘ', m: 'မ',
      y: 'ယ', r: 'ရ', l: 'လ', ḷ: 'ဠ', v: 'ဝ', s: 'သ', h: 'ဟ',
    },
    vowelIndep: { a: 'အ', ā: 'အာ', i: 'ဣ', ī: 'ဤ', u: 'ဥ', ū: 'ဦ', e: 'ဧ', o: 'ဩ' },
    vowelSign: { a: '', ā: 'ာ', i: 'ိ', ī: 'ီ', u: 'ု', ū: 'ူ', e: 'ေ', o: 'ော' },
    stacker: '္', killer: '်', anusvara: 'ံ', // virama (stacker), asat, anusvara
  };

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  const SCRIPTS = {
    roman: { id: 'roman', label: 'IAST', native: 'Roman', render: renderRoman },
    devanagari: { id: 'devanagari', label: 'देवनागरी', native: 'Devanāgarī', render: (t) => renderAbugida(t, DEVANAGARI) },
    sinhala: { id: 'sinhala', label: 'සිංහල', native: 'Sinhala', render: (t) => renderAbugida(t, SINHALA) },
    thai: { id: 'thai', label: 'ไทย', native: 'Thai', render: (t) => renderAbugida(t, THAI) },
    myanmar: { id: 'myanmar', label: 'မြန်မာ', native: 'Myanmar', render: (t) => renderAbugida(t, MYANMAR) },
  };

  /**
   * Transliterate an ASCII Pali spelling into the given script.
   * @param {string} text
   * @param {string} script  one of Object.keys(SCRIPTS)
   * @param {{smartNasal?: boolean}} [opts]
   */
  function transliterate(text, script, opts) {
    const s = SCRIPTS[script || 'roman'];
    if (!s) throw new Error('Unknown script: ' + script);
    return s.render(tokenize(text, opts));
  }

  /** Transliterate into every script at once. */
  function transliterateAll(text, opts) {
    const tokens = tokenize(text, opts);
    const result = {};
    for (const key of Object.keys(SCRIPTS)) result[key] = SCRIPTS[key].render(tokens);
    return result;
  }

  const Pali = { tokenize, transliterate, transliterateAll, SCRIPTS };

  // Dual export: CommonJS (Node) and global (browser classic <script>).
  if (typeof module !== 'undefined' && module.exports) module.exports = Pali;
  global.Pali = Pali;
})(typeof globalThis !== 'undefined' ? globalThis : this);
