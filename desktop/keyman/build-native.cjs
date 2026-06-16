// build-native.cjs — generate native-script Keyman keyboards (Devanāgarī,
// Sinhala, Thai, Myanmar) from the verified engine tables, and self-verify
// the generated rules by simulating Keyman's execution model and comparing to
// pali.js's transliterate() output.
//
//   node desktop/keyman/build-native.cjs
//
// Output: pali-deva.kmn, pali-sinh.kmn, pali-thai.kmn, pali-mymr.kmn
//
// Why a simulator: there's no Keyman compiler here, and abugida rules (inherent
// vowel, clusters, long vowels, Thai reordering) are easy to get wrong. The
// simulator runs the SAME rule list the .kmn is serialized from, using Keyman's
// documented semantics (ordered first-match, any()/index() parallel stores,
// deadkeys, single pass per keystroke). Passing it verifies the rule LOGIC; the
// only residual risk is simulator-vs-real-Keyman differences (flagged in README).

const path = require('path');
const fs = require('fs');
const Pali = require(path.join(__dirname, '..', '..', 'pali.js'));

const SCRIPTS = {
  deva: { id: 'devanagari', name: 'Pali — Devanāgarī', lang: 'pi-Deva' },
  sinh: { id: 'sinhala', name: 'Pali — Sinhala', lang: 'pi-Sinh' },
  thai: { id: 'thai', name: 'Pali — Thai', lang: 'pi-Thai' },
  mymr: { id: 'myanmar', name: 'Pali — Myanmar', lang: 'pi-Mymr' },
};

const CONS_KEYS = { k: 'k', g: 'g', c: 'c', j: 'j', t: 't', d: 'd', p: 'p', b: 'b', n: 'n', m: 'm', y: 'y', r: 'r', l: 'l', v: 'v', w: 'v', s: 's', h: 'h' };
const ASPIRABLE = ['k', 'g', 'c', 'j', 'ṭ', 'ḍ', 't', 'd', 'p', 'b'];
const ASP_OF = { k: 'kh', g: 'gh', c: 'ch', j: 'jh', ṭ: 'ṭh', ḍ: 'ḍh', t: 'th', d: 'dh', p: 'ph', b: 'bh' };
const SMART = { k: 'ṅ', g: 'ṅ', c: 'ñ', j: 'ñ', p: 'm', b: 'm' };       // n + key -> nasal (velar/palatal/labial)
const DOT_CONS = { t: 'ṭ', d: 'ḍ', n: 'ṇ', l: 'ḷ' };                     // .t .d .n .l
const SMART_RETRO = 'ṇ';                                                // n + .t/.d/.. -> ṇ

// --- build the ordered rule list for one script ----------------------------
function buildRules(scriptId) {
  const t = Pali.TABLES[scriptId];
  const lead = t.leadingVowels || {};
  const cg = (i) => t.cons[i];
  const vi = (i) => t.vowelIndep[i];
  const vs = (i) => t.vowelSign[i];
  const vir = t.stacker, anus = t.anusvara;

  const consGlyphs = Object.keys(t.cons).map((i) => t.cons[i]);
  const stores = {
    CG: consGlyphs,
    ASP: ASPIRABLE.map(cg),
    ASPH: ASPIRABLE.map((i) => cg(ASP_OF[i])),
  };

  const R = [];
  const rule = (ctx, key, out) => R.push({ ctx, key, out });
  const A = (s) => ({ any: s });
  const IDX = (s) => ({ idx: s });
  const DK = (n) => ({ dk: n });

  // 1. aspiration: aspirable consonant + 'h' -> aspirated form
  rule([A('ASP')], 'h', [IDX('ASPH')]);

  // 2. smart nasal: n + velar/palatal/labial stop -> homorganic nasal cluster
  for (const k of Object.keys(SMART)) rule([cg('n')], k, [cg(SMART[k]), vir, cg(k)]);
  // 3. smart retroflex: n + (dot)t/d/n/l -> ṇ + retroflex cluster
  for (const k of Object.keys(DOT_CONS)) rule([cg('n'), DK('dot')], k, [cg(SMART_RETRO), vir, cg(DOT_CONS[k])]);

  // 4. long vowels (repeat) — dependent signs and independent letters
  rule([vs('i')], 'i', [vs('ī')]);
  rule([vs('u')], 'u', [vs('ū')]);
  rule([vi('i')], 'i', [vi('ī')]);
  rule([vi('u')], 'u', [vi('ū')]);
  rule([vi('a'), DK('a')], 'a', [vi('ā')]);     // independent ā (before generic dk(a)+a)
  // 5. long ā dependent
  rule([DK('a')], 'a', [vs('ā')]);

  // 6. dot/quote/tilde clusters (after a consonant) — must beat plain clusters
  for (const k of Object.keys(DOT_CONS)) rule([A('CG'), DK('dot')], k, [IDX('CG'), vir, cg(DOT_CONS[k])]);
  rule([A('CG'), DK('dq')], 'n', [IDX('CG'), vir, cg('ṅ')]);
  rule([A('CG'), DK('tilde')], 'n', [IDX('CG'), vir, cg('ñ')]);
  // 7. dot/quote/tilde standalone (after vowel / start)
  for (const k of Object.keys(DOT_CONS)) rule([DK('dot')], k, [cg(DOT_CONS[k])]);
  rule([DK('dot')], 'm', [anus]);                // .m -> niggahīta
  rule([DK('dq')], 'n', [cg('ṅ')]);
  rule([DK('tilde')], 'n', [cg('ñ')]);
  // 8. dot cleanup: a stray '.' before space is a literal period
  rule([DK('dot')], ' ', ['.', ' ']);

  // 9. consonant clusters: consonant + consonant -> virama + new consonant
  for (const k of Object.keys(CONS_KEYS)) rule([A('CG')], k, [IDX('CG'), vir, cg(CONS_KEYS[k])]);
  // 10. vowel after consonant -> dependent sign (a -> inherent + dk marker)
  rule([A('CG')], 'a', [IDX('CG'), DK('a')]);
  rule([A('CG')], 'i', [IDX('CG'), vs('i')]);
  rule([A('CG')], 'u', [IDX('CG'), vs('u')]);
  // Leading vowels (Thai เ/โ) go before the consonant; append an invisible
  // "vowel taken" deadkey so the next consonant won't cluster with this one
  // and word-final-m won't misfire (the consonant already has its vowel).
  if (lead.e) rule([A('CG')], 'e', [lead.e, IDX('CG'), DK('v')]); else rule([A('CG')], 'e', [IDX('CG'), vs('e')]);
  if (lead.o) rule([A('CG')], 'o', [lead.o, IDX('CG'), DK('v')]); else rule([A('CG')], 'o', [IDX('CG'), vs('o')]);

  // 11. prefix producers (deadkeys)
  rule([], '.', [DK('dot')]);
  rule([], '"', [DK('dq')]);
  rule([], '~', [DK('tilde')]);

  // 12. word-final m -> niggahīta (committed on space)
  rule([cg('m')], ' ', [anus, ' ']);

  // 13. consonant standalone (after vowel / start)
  for (const k of Object.keys(CONS_KEYS)) rule([], k, [cg(CONS_KEYS[k])]);
  // 14. independent vowels (after vowel / start)
  rule([], 'a', [vi('a'), DK('a')]);
  rule([], 'i', [vi('i')]);
  rule([], 'u', [vi('u')]);
  rule([], 'e', [vi('e')]);
  rule([], 'o', [vi('o')]);

  return { rules: R, stores };
}

// --- Keyman execution-model simulator ---------------------------------------
function simulate({ rules, stores }, input) {
  const buf = []; // units: {g} glyph, or {dk} deadkey
  const isGlyph = (u) => u.g !== undefined;

  for (const key of input) {
    let fired = false;
    for (const r of rules) {
      if (r.key !== key) continue;
      const need = r.ctx.length;
      if (need > buf.length) continue;
      let ok = true;
      let anyStore = null, anyPos = -1;
      for (let i = 0; i < need; i++) {
        const tok = r.ctx[i];
        const u = buf[buf.length - need + i];
        if (typeof tok === 'string') { if (!isGlyph(u) || u.g !== tok) { ok = false; break; } }
        else if (tok.any) {
          if (!isGlyph(u)) { ok = false; break; }
          const pos = stores[tok.any].indexOf(u.g);
          if (pos < 0) { ok = false; break; }
          anyStore = tok.any; anyPos = pos;
        } else if (tok.dk) { if (u.dk !== tok.dk) { ok = false; break; } }
      }
      if (!ok) continue;
      buf.length -= need;
      for (const o of r.out) {
        if (typeof o === 'string') buf.push({ g: o });
        else if (o.idx) buf.push({ g: stores[o.idx][anyPos] });
        else if (o.dk) buf.push({ dk: o.dk });
      }
      fired = true;
      break;
    }
    if (!fired) buf.push({ g: key });
  }
  return buf.filter(isGlyph).map((u) => u.g).join('');
}

// --- .kmn serialization -----------------------------------------------------
function uplus(s) {
  return [...s].map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ');
}
function keyTok(k) { return k === ' ' ? '[K_SPACE]' : `'${k}'`; }
function ctxTok(tok, pos) {
  if (typeof tok === 'string') return uplus(tok);
  if (tok.any) return `any(${tok.any})`;
  if (tok.dk) return `deadkey(${tok.dk})`;
  return '';
}
function outTok(tok, ctx) {
  if (typeof tok === 'string') return uplus(tok);
  if (tok.idx) {
    const p = ctx.findIndex((c) => typeof c === 'object' && c.any) + 1;
    return `index(${tok.idx}, ${p})`;
  }
  if (tok.dk) return `deadkey(${tok.dk})`;
  return '';
}
function serialize(scriptKey, { rules, stores }) {
  const meta = SCRIPTS[scriptKey];
  const L = [];
  L.push(`c ${meta.name} — Velthuis input -> ${meta.name.split('— ')[1]} (GENERATED by build-native.cjs)`);
  L.push(`c Source: pali.js script tables. Do not edit by hand; re-run the generator.`);
  L.push('');
  L.push(`store(&VERSION) '10.0'`);
  L.push(`store(&NAME) '${meta.name}'`);
  L.push(`store(&KEYBOARDVERSION) '1.0'`);
  L.push(`store(&TARGETS) 'any'`);
  L.push('');
  for (const s of Object.keys(stores)) L.push(`store(${s}) ${stores[s].map(uplus).join(' ')}`);
  L.push('');
  L.push('begin Unicode > use(main)');
  L.push('');
  L.push('group(main) using keys');
  L.push('');
  for (const r of rules) {
    const ctx = r.ctx.map((t, i) => ctxTok(t, i)).join(' ');
    const left = (ctx ? ctx + ' ' : '') + '+ ' + keyTok(r.key);
    const out = r.out.map((o) => outTok(o, r.ctx)).join(' ');
    L.push(`${left} > ${out}`);
  }
  L.push('');
  return L.join('\n');
}

// --- verify + write ---------------------------------------------------------
const WORDS = [
  'buddha', 'dhamma', 'sangha', 'nibbaana', 'bhikkhu', 'pa~n~naa', 'mettaa',
  'araha.m', 'sa.msaara', '~naa.na', 'citta', 'kamma', 'iti', 'eva', 'panca',
  'da.n.da', 'aniccaa', 'sa"nkhaaraa', 'gacchaami', 'sabbe', 'sattaa', 'sukhii',
  'hontu', 'namo', 'tassa', 'bhagavato', 'buddham', 'dhammam', 'evam', 'ko.n.da',
];

let totalPass = 0, totalFail = 0;
for (const key of Object.keys(SCRIPTS)) {
  const built = buildRules(SCRIPTS[key].id);
  let pass = 0, fail = 0;
  for (const w of WORDS) {
    const expected = Pali.transliterate(w, SCRIPTS[key].id, { smartNasal: true });
    // simulate with a trailing space (commit), then strip it
    let got = simulate(built, w + ' ');
    if (got.endsWith(' ')) got = got.slice(0, -1);
    if (got === expected) pass++;
    else { fail++; console.log(`  FAIL [${key}] ${w}: expected ${expected} got ${got}`); }
  }
  totalPass += pass; totalFail += fail;
  const outFile = path.join(__dirname, `pali-${key}.kmn`);
  fs.writeFileSync(outFile, serialize(key, built));
  console.log(`${key}: ${pass}/${WORDS.length} words match engine; wrote ${path.basename(outFile)} (${built.rules.length} rules)`);
}
console.log(`\nTOTAL: ${totalPass} passed, ${totalFail} failed`);
process.exit(totalFail ? 1 : 0);
