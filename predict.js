// predict.js — akkhara-level next-sound prediction + root/affix matching.
//
// Everything works on sequences of *akkhara* (Pali letters), not raw chars, so
// "kh", "ṭh" etc. count as one unit. A small lexicon (roots + common words) is
// tokenized once; prefix-matching it gives both the likely next sound and the
// matching roots/affixes. Phonotactic rules are the fallback when nothing in
// the lexicon matches.
//
// Exposes window.PaliPredict = { nextSounds, matchRoots, matchAffixes, toAkk }.

(function (global) {
  'use strict';

  function api() {
    const Pali = global.Pali;
    const Roots = global.PaliRoots || { DHATU: [], UPASAGGA: [], SUFFIXES: [] };
    const Glossary = global.PaliGlossary || { GLOSSARY: {} };

    // Tokenize an IAST string into an akkhara array (drop spaces/punct).
    function toAkk(iast) {
      return Pali.tokenize(iast, { smartNasal: false })
        .filter((t) => t.type !== 'X')
        .map((t) => t.iast);
    }

    // Lenient akkhara equality for *prediction*: a user-typed plain `n` may
    // still become a homorganic nasal once the next stop is typed, and a
    // trailing `m` may be the niggahīta — so accept those as matches.
    function akkEq(user, lex) {
      if (user === lex) return true;
      if (user === 'n' && (lex === 'ṅ' || lex === 'ñ' || lex === 'ṇ')) return true;
      if (user === 'm' && lex === 'ṃ') return true;
      return false;
    }

    function startsWithAkk(lex, pre) {
      if (pre.length > lex.length) return false;
      for (let i = 0; i < pre.length; i++) if (!akkEq(pre[i], lex[i])) return false;
      return true;
    }

    // Build the prediction lexicon: every glossary word + every root form,
    // each as an akkhara array. Deduplicated by string key.
    const LEXICON = [];
    (function build() {
      const seen = new Set();
      const add = (iast) => {
        const akk = toAkk(iast);
        if (!akk.length) return;
        const key = akk.join('');
        if (seen.has(key)) return;
        seen.add(key);
        LEXICON.push(akk);
      };
      for (const w of Object.keys(Glossary.GLOSSARY)) add(w);
      for (const d of Roots.DHATU) for (const f of d.forms) add(f);
    })();

    const UPASAGGA = Roots.UPASAGGA.map((u) => ({ ...u, akk: toAkk(u.form) }));
    const DHATU = Roots.DHATU.map((d) => ({
      ...d,
      formAkk: d.forms.map((f) => ({ form: f, akk: toAkk(f) })),
    }));

    // For the word-splitter: all prefixes (upasagga + privative), every ending
    // (longest first), and the glossary as akkhara arrays.
    const PREFIXES_ALL = UPASAGGA.concat(
      (Roots.PREFIX_EXTRA || []).map((u) => ({ ...u, akk: toAkk(u.form), extra: true }))
    );
    const ENDINGS = (Roots.ENDINGS || [])
      .map((e) => ({ ...e, akk: toAkk(e.end) }))
      .sort((a, b) => b.akk.length - a.akk.length);
    const GLOSS_AKK = Object.keys(Glossary.GLOSSARY).map((w) => ({
      w, akk: toAkk(w), en: Glossary.GLOSSARY[w].en, zh: Glossary.GLOSSARY[w].zh,
    }));

    const equalAkk = (a, b) => a.length === b.length && startsWithAkk(a, b);
    function endsWithAkk(arr, suf) {
      if (suf.length > arr.length) return false;
      const off = arr.length - suf.length;
      for (let i = 0; i < suf.length; i++) if (!akkEq(arr[off + i], suf[i])) return false;
      return true;
    }

    // --- Phonotactic fallback ------------------------------------------------
    const VOWELS = ['a', 'ā', 'i', 'ī', 'u', 'ū', 'e', 'o'];
    const COMMON_ONSETS = ['k', 'g', 'c', 'j', 't', 'd', 'n', 'p', 'b', 'm', 'y', 'r', 'l', 'v', 's', 'h', 'dh', 'bh', 'kh', 'gh'];
    // What may follow a consonant inside a cluster (besides taking a vowel).
    const CLUSTER_AFTER = {
      k: ['k', 'kh'], g: ['g', 'gh'], c: ['c', 'ch'], j: ['j', 'jh'],
      ṭ: ['ṭ', 'ṭh'], ḍ: ['ḍ', 'ḍh'], t: ['t', 'th'], d: ['d', 'dh', 'v'],
      p: ['p', 'ph'], b: ['b', 'bh'],
      ṅ: ['k', 'kh', 'g', 'gh'], ñ: ['c', 'ch', 'j', 'jh'],
      ṇ: ['ṭ', 'ṭh', 'ḍ', 'ḍh', 'h'], n: ['t', 'th', 'd', 'dh', 'n', 'h'],
      m: ['p', 'ph', 'b', 'bh', 'm', 'h'],
      s: ['s', 't', 'm', 'v'], y: ['y', 'h'], r: [], l: ['l', 'h', 'y'],
      ḷ: ['h'], v: ['h', 'y'], h: [],
    };
    const isVowel = (a) => VOWELS.indexOf(a) >= 0;
    const isConsonant = (a) => a !== 'ṃ' && !isVowel(a);

    function phonotacticNext(pre) {
      if (!pre.length) return COMMON_ONSETS.concat(VOWELS);
      const last = pre[pre.length - 1];
      if (last === 'ṃ' || isVowel(last)) return COMMON_ONSETS.slice();
      // last is a consonant awaiting a nucleus: a vowel, or a cluster member
      return VOWELS.concat(CLUSTER_AFTER[last] || []);
    }

    // --- Public: next likely sounds -----------------------------------------
    function nextSounds(pre, limit) {
      limit = limit || 12;
      const counts = new Map();
      for (const lex of LEXICON) {
        if (lex.length > pre.length && startsWithAkk(lex, pre)) {
          const nxt = lex[pre.length];
          counts.set(nxt, (counts.get(nxt) || 0) + 1);
        }
      }
      let ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
      if (!ranked.length) ranked = phonotacticNext(pre);
      else {
        // append any phonotactically-valid sounds not already present
        for (const s of phonotacticNext(pre)) if (ranked.indexOf(s) < 0) ranked.push(s);
      }
      return ranked.slice(0, limit);
    }

    // --- Public: matching roots ---------------------------------------------
    function matchRoots(pre, limit) {
      limit = limit || 12;
      const out = [];
      const pushed = new Set();
      const tryMatch = (prefixLabel, sub) => {
        for (const d of DHATU) {
          if (pushed.has(prefixLabel + '|' + d.root)) continue;
          const hit = d.formAkk.find((fa) => startsWithAkk(fa.akk, sub));
          if (hit) {
            pushed.add(prefixLabel + '|' + d.root);
            out.push({ root: d.root, form: hit.form, en: d.en, zh: d.zh, prefix: prefixLabel || null });
          }
        }
      };
      tryMatch('', pre);
      // also try stripping a leading upasagga the user has already typed
      for (const u of UPASAGGA) {
        if (pre.length > u.akk.length && startsWithAkk(pre, u.akk)) {
          tryMatch(u.form, pre.slice(u.akk.length));
        }
      }
      return out.slice(0, limit);
    }

    // --- Public: matching prefixes (upasagga) -------------------------------
    function matchAffixes(pre, limit) {
      limit = limit || 12;
      const out = [];
      for (const u of UPASAGGA) {
        // user is mid-typing the prefix, OR has typed it and continued
        if (startsWithAkk(u.akk, pre) || (pre.length >= u.akk.length && startsWithAkk(pre, u.akk))) {
          out.push({ form: u.form, en: u.en, zh: u.zh, complete: pre.length >= u.akk.length });
        }
      }
      return out.slice(0, limit);
    }

    // --- Public: morphological split (prefix + root/stem + ending) ----------
    function matchStemRoot(stem) {
      for (const d of DHATU) {
        for (const fa of d.formAkk) {
          // stem is the root form, possibly plus one stem-vowel (gacch + a)
          if (equalAkk(fa.akk, stem) ||
              (stem.length > fa.akk.length && stem.length - fa.akk.length <= 1 && startsWithAkk(stem, fa.akk))) {
            return { kind: 'root', label: '√' + d.root, en: d.en, zh: d.zh };
          }
        }
      }
      return null;
    }
    function matchStemWord(stem) {
      for (const g of GLOSS_AKK) if (equalAkk(g.akk, stem)) return { kind: 'word', label: g.w, en: g.en, zh: g.zh };
      for (const g of GLOSS_AKK) {
        if (g.akk.length > stem.length && g.akk.length - stem.length <= 1 && startsWithAkk(g.akk, stem)) {
          return { kind: 'word', label: g.w, en: g.en, zh: g.zh };
        }
      }
      return null;
    }

    function analyze(akk, limit) {
      limit = limit || 3;
      if (!akk.length) return [];

      // peel 0, 1, or 2 leading prefixes
      const prefixOpts = [{ prefixes: [], rest: akk }];
      for (const p of PREFIXES_ALL) {
        if (akk.length > p.akk.length && startsWithAkk(akk, p.akk)) {
          const rest1 = akk.slice(p.akk.length);
          prefixOpts.push({ prefixes: [p], rest: rest1 });
          for (const q of PREFIXES_ALL) {
            if (rest1.length > q.akk.length && startsWithAkk(rest1, q.akk)) {
              prefixOpts.push({ prefixes: [p, q], rest: rest1.slice(q.akk.length) });
            }
          }
        }
      }

      const cands = [];
      for (const po of prefixOpts) {
        // peel 0 or 1 ending
        const endOpts = [{ ending: null, stem: po.rest }];
        for (const e of ENDINGS) {
          if (po.rest.length > e.akk.length && endsWithAkk(po.rest, e.akk)) {
            endOpts.push({ ending: e, stem: po.rest.slice(0, po.rest.length - e.akk.length) });
          }
        }
        for (const eo of endOpts) {
          if (!eo.stem.length) continue;
          const stemMatch = matchStemWord(eo.stem) || matchStemRoot(eo.stem);
          const pfxLen = po.prefixes.reduce((n, p) => n + p.akk.length, 0);
          const endLen = eo.ending ? eo.ending.akk.length : 0;
          const stemLen = stemMatch ? eo.stem.length : 0;
          const recognized = pfxLen + endLen + stemLen;
          cands.push({
            prefixes: po.prefixes.map((p) => ({ form: p.form, en: p.en, zh: p.zh })),
            stem: stemMatch || { kind: 'raw', label: eo.stem.join(''), en: '', zh: '' },
            ending: eo.ending ? { end: eo.ending.end, en: eo.ending.en, zh: eo.ending.zh } : null,
            full: !!stemMatch,
            recognized,
          });
        }
      }

      // rank: explained stems first, most of the word recognized, then the
      // simplest split (fewest prefixes + endings) for an equal explanation.
      const morphemes = (c) => c.prefixes.length + (c.ending ? 1 : 0);
      cands.sort((a, b) => (b.full - a.full) || (b.recognized - a.recognized) || (morphemes(a) - morphemes(b)) || (a.prefixes.length - b.prefixes.length));
      // dedupe by (prefixes + stem) ignoring the ending, so "anattā" collapses
      // with the redundant "anattā + -ā" but stays distinct from "an + attā".
      const seen = new Set();
      const dedup = [];
      for (const c of cands) {
        const sig = c.prefixes.map((p) => p.form).join('+') + '|' + c.stem.label;
        if (seen.has(sig)) continue;
        seen.add(sig);
        dedup.push(c);
      }
      // Prefer analyses whose stem is a known root/word; only if there are none
      // do we fall back to a single best-guess (raw stem) split.
      const fulls = dedup.filter((c) => c.full);
      return fulls.length ? fulls.slice(0, limit) : dedup.slice(0, 1);
    }

    return { nextSounds, matchRoots, matchAffixes, analyze, toAkk, isConsonant, isVowel, LEXICON };
  }

  // Lazily initialize on first use (after Pali/Roots/Glossary have loaded).
  let inst = null;
  global.PaliPredict = {
    _init() { return (inst = inst || api()); },
    nextSounds(p, l) { return this._init().nextSounds(p, l); },
    matchRoots(p, l) { return this._init().matchRoots(p, l); },
    matchAffixes(p, l) { return this._init().matchAffixes(p, l); },
    analyze(p, l) { return this._init().analyze(p, l); },
    toAkk(s) { return this._init().toAkk(s); },
    // Word completion: prefix-match a frequency-ranked word list (array of
    // [lemma, freq, meaning], pre-sorted by freq desc). Pure — no engine init.
    completeWord(prefix, words, limit) {
      limit = limit || 6;
      const p = (prefix || '').toLowerCase();
      if (!p || !words) return [];
      const out = [];
      for (const e of words) {
        if (e[0].length > p.length && e[0].startsWith(p)) {
          out.push({ w: e[0], freq: e[1], en: e[2] || '' });
          if (out.length >= limit) break;
        }
      }
      return out;
    },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.PaliPredict;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
