const { transliterate, SCRIPTS } = window.Pali;
const Glossary = window.PaliGlossary;
const Predict = window.PaliPredict;

const $ = (id) => document.getElementById(id);
const input = $('input');
const output = $('output');
const tabsEl = $('tabs');
const smartNasal = $('smartNasal');
const scriptHint = $('scriptHint');
const glossaryEl = $('glossary');
const phraseEl = $('phraseTrans');
const correctionsEl = $('corrections');
const nextSoundsEl = $('nextSounds');
const rootHintsEl = $('rootHints');
const affixHintsEl = $('affixHints');
const analysisEl = $('analysis');
const completionsEl = $('completions');

// Frequency-ranked word list for completion — lazy-loaded (~366 KB) on first use.
let freqWords = null;
let freqLoading = false;
function ensureFreqWords() {
  if (freqWords || freqLoading) return;
  freqLoading = true;
  fetch('freq-words.json')
    .then((r) => r.json())
    .then((d) => { freqWords = d; render(); })
    .catch(() => { freqLoading = false; });
}

// Reverse map: IAST akkhara -> how to type it in the ASCII scheme.
const IAST_TO_INPUT = {
  ā: 'aa', ī: 'ii', ū: 'uu', ṃ: '.m', ṅ: '"n', ñ: '~n',
  ṭ: '.t', ṭh: '.th', ḍ: '.d', ḍh: '.dh', ṇ: '.n', ḷ: '.l',
};
const akkToInput = (a) => IAST_TO_INPUT[a] || a;
const iastToInput = (iast) => Predict.toAkk(iast).map(akkToInput).join('');
// Join an English + (optional) Chinese gloss; many DPD roots are English-only.
const glossPair = (en, zh) => (zh ? `${escapeHtml(en)} · ${escapeHtml(zh)}` : escapeHtml(en || ''));

// Replace the word currently being typed (last whitespace token) with `repl`.
function setCurrentWord(repl) {
  const v = input.value;
  const m = v.match(/(\S*)$/);
  input.value = v.slice(0, v.length - m[1].length) + repl;
  input.focus();
  render();
}
function appendToInput(s) {
  input.value += s;
  input.focus();
  render();
}
function currentWord() {
  const m = input.value.match(/(\S*)$/);
  return m ? m[1] : '';
}

// Short lang codes drive the script-specific @font-face rules in CSS.
const LANG = { roman: 'rom', devanagari: 'dev', sinhala: 'sin', thai: 'tha', myanmar: 'mya' };
const HINTS = {
  roman: '罗马转写（IAST），带变音符号——学术与词典通用。',
  devanagari: '天城文——南亚学术与三藏校勘常用。',
  sinhala: '僧伽罗文——斯里兰卡上座部传统。',
  thai: '泰文——泰国三藏传统（用 phinthu 标记连写）。',
  myanmar: '缅甸文——缅甸三藏传统（ṅ 连写的 kinzi 形为近似）。',
};

// --- Persisted preferences (script + smart correction) ---------------------
const PREFS = {
  get(k, d) { try { const v = localStorage.getItem('pali.' + k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('pali.' + k, v); } catch {} },
};

let current = 'roman';
{
  const savedScript = PREFS.get('script', null);
  if (savedScript && SCRIPTS[savedScript]) current = savedScript;
  const savedSmart = PREFS.get('smart', null);
  if (savedSmart !== null) smartNasal.checked = savedSmart === '1';
}

// --- Build script tabs ------------------------------------------------------
for (const key of Object.keys(SCRIPTS)) {
  const s = SCRIPTS[key];
  const btn = document.createElement('button');
  btn.className = 'tab' + (key === current ? ' active' : '');
  btn.type = 'button';
  btn.dataset.script = key;
  btn.innerHTML = `<span class="lab">${s.label}</span><span class="lab-native">${s.native}</span>`;
  btn.addEventListener('click', () => selectScript(key));
  tabsEl.appendChild(btn);
}

function selectScript(key) {
  current = key;
  PREFS.set('script', key);
  for (const t of tabsEl.children) t.classList.toggle('active', t.dataset.script === key);
  output.setAttribute('lang', LANG[key]);
  scriptHint.textContent = HINTS[key];
  render();
}

// --- Examples ---------------------------------------------------------------
const EXAMPLES = [
  'buddha.m sara.na.m gacchaami',
  'namo tassa bhagavato',
  'sabbe sattaa sukhii hontu',
  'aniccaa vata sa"nkhaaraa',
  'pa~n~naa',
  'nibbaana',
];
const exEl = $('examples');
for (const ex of EXAMPLES) {
  const chip = document.createElement('button');
  chip.className = 'chip';
  chip.type = 'button';
  chip.textContent = ex;
  chip.addEventListener('click', () => {
    input.value = ex;
    render();
    input.focus();
  });
  exEl.appendChild(chip);
}

// --- Reference table --------------------------------------------------------
const REF_GROUPS = [
  {
    title: '元音 Vowels',
    rows: [
      ['a', 'a'], ['aa', 'ā'], ['i', 'i'], ['ii', 'ī'],
      ['u', 'u'], ['uu', 'ū'], ['e', 'e'], ['o', 'o'],
    ],
  },
  {
    title: '卷舌音 Retroflex',
    rows: [
      ['.t', 'ṭ'], ['.th', 'ṭh'], ['.d', 'ḍ'],
      ['.dh', 'ḍh'], ['.n', 'ṇ'], ['.l', 'ḷ'],
    ],
  },
  {
    title: '鼻音 Nasals',
    rows: [
      ['"n', 'ṅ'], ['~n', 'ñ'], ['.n', 'ṇ'],
      ['n', 'n'], ['m', 'm'], ['.m', 'ṃ'],
    ],
  },
  {
    title: '送气音 Aspirates',
    rows: [
      ['kh', 'kh'], ['gh', 'gh'], ['ch', 'ch'], ['jh', 'jh'],
      ['th', 'th'], ['dh', 'dh'], ['ph', 'ph'], ['bh', 'bh'],
    ],
  },
];
const refBody = $('refBody');
for (const g of REF_GROUPS) {
  const div = document.createElement('div');
  div.className = 'ref-group';
  div.innerHTML = `<h4>${g.title}</h4>` + g.rows
    .map(([code, out]) => `<div class="ref-row"><code>${escapeHtml(code)}</code><span class="out">${out}</span></div>`)
    .join('');
  refBody.appendChild(div);
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// --- Live transliteration ---------------------------------------------------
function render() {
  const text = input.value;
  const opts = { smartNasal: smartNasal.checked };
  output.textContent = text ? transliterate(text, current, opts) : '';
  renderCorrections(text);
  renderGlossary(text);
  renderPredict();
}

// Frequency-ranked word completions for the word being typed.
function renderCompletions(word) {
  if (!word) { completionsEl.innerHTML = '<span class="h-empty">输入一个词…</span>'; return; }
  ensureFreqWords();
  if (!freqWords) { completionsEl.innerHTML = '<span class="h-empty">加载词频表…</span>'; return; }
  const iast = transliterate(word, 'roman', { smartNasal: true }).toLowerCase();
  const list = Predict.completeWord(iast, freqWords, 6);
  completionsEl.innerHTML = list.length
    ? list
        .map((c) => `<button class="h-chip" data-fill="${escapeHtml(iastToInput(c.w))}" title="点选填入">${escapeHtml(c.w)}${c.en ? ` <span class="h-gloss">${escapeHtml(c.en)}</span>` : ''}</button>`)
        .join('')
    : '<span class="h-empty">无补全</span>';
}

// Render the morphological split (prefix + root/word + ending) of a word.
function renderAnalysis(word) {
  if (!word) {
    analysisEl.innerHTML = '<span class="h-empty">输入一个词…</span>';
    return;
  }
  const iast = transliterate(word, 'roman', { smartNasal: true });
  const cands = Predict.analyze(Predict.toAkk(iast), 2);
  if (!cands.length) {
    analysisEl.innerHTML = '<span class="h-empty">—</span>';
    return;
  }
  analysisEl.innerHTML = cands
    .map((c) => {
      const pills = [];
      for (const p of c.prefixes) pills.push(`<span class="ap pre" title="${escapeHtml(p.en + ' · ' + p.zh)}">${escapeHtml(p.form)}-</span>`);
      pills.push(`<span class="ap ${c.stem.kind}">${escapeHtml(c.stem.label)}</span>`);
      if (c.ending) pills.push(`<span class="ap end" title="${escapeHtml(c.ending.en)}">-${escapeHtml(c.ending.end)}</span>`);
      const stemGloss = c.stem.en ? glossPair(c.stem.en, c.stem.zh) : '';
      const endGloss = c.ending ? escapeHtml(c.ending.zh) : '';
      const gloss = stemGloss && endGloss ? `${stemGloss} ｜ ${endGloss}` : stemGloss || endGloss;
      return `<div class="a-row">${pills.join('<span class="ap-plus">+</span>')}${gloss ? `<span class="ap-gloss">${gloss}</span>` : ''}</div>`;
    })
    .join('');
}

// Predict next sounds + matching roots/affixes for the word being typed.
function renderPredict() {
  const word = currentWord();
  const pre = Predict.toAkk(word);

  renderCompletions(word);
  renderAnalysis(word);

  // Next sounds — clickable, append the typed form of that akkhara.
  const next = Predict.nextSounds(pre, 12);
  nextSoundsEl.innerHTML = next
    .map((a) => `<button class="ns-chip" data-app="${escapeHtml(akkToInput(a))}">${escapeHtml(a)}<span class="ns-key">${escapeHtml(akkToInput(a))}</span></button>`)
    .join('');

  // Roots and affixes only once at least one sound is typed.
  if (!pre.length) {
    rootHintsEl.innerHTML = '<span class="h-empty">输入一个音…</span>';
    affixHintsEl.innerHTML = '<span class="h-empty">输入一个音…</span>';
    return;
  }

  const roots = Predict.matchRoots(pre, 14);
  rootHintsEl.innerHTML = roots.length
    ? roots
        .map((r) => {
          const fill = (r.prefix ? iastToInput(r.prefix) : '') + iastToInput(r.form);
          const pfx = r.prefix ? `<span class="r-pfx">${escapeHtml(r.prefix)}-</span>` : '';
          return `<button class="h-chip" data-fill="${escapeHtml(fill)}" title="点选填入">${pfx}√${escapeHtml(r.root)} <span class="h-gloss">${glossPair(r.en, r.zh)}</span></button>`;
        })
        .join('')
    : '<span class="h-empty">无匹配词根</span>';

  const affixes = Predict.matchAffixes(pre, 12);
  affixHintsEl.innerHTML = affixes.length
    ? affixes
        .map((u) => `<button class="h-chip${u.complete ? ' done' : ''}" data-fill="${escapeHtml(iastToInput(u.form))}" title="点选填入">${escapeHtml(u.form)}-<span class="h-gloss">${escapeHtml(u.en)} · ${escapeHtml(u.zh)}</span></button>`)
        .join('')
    : '<span class="h-empty">无匹配前缀</span>';
}

// Show what "smart correction" changed vs. a naive read of the input, per word
// (e.g. buddham → buddhaṃ, sangha → saṅgha). Only when the toggle is on.
function renderCorrections(text) {
  if (!smartNasal.checked || !text.trim()) {
    correctionsEl.hidden = true;
    correctionsEl.innerHTML = '';
    return;
  }
  const seen = new Set();
  const items = [];
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const word = raw.replace(/^[^\p{L}.~";]+|[^\p{L}.~";]+$/gu, '');
    if (!word) continue;
    const naive = transliterate(word, 'roman', { smartNasal: false });
    const smart = transliterate(word, 'roman', { smartNasal: true });
    if (naive !== smart && !seen.has(word)) {
      seen.add(word);
      items.push(`<span class="corr"><b>${escapeHtml(word)}</b> → ${escapeHtml(smart)}</span>`);
    }
  }
  if (items.length) {
    correctionsEl.hidden = false;
    correctionsEl.innerHTML = '<span class="corr-label">智能纠正 Auto-corrected:</span> ' + items.join('，');
  } else {
    correctionsEl.hidden = true;
    correctionsEl.innerHTML = '';
  }
}

// Normalize a raw input word to its IAST form for glossary lookup.
// Smart-nasal is forced on here so e.g. "sangha" resolves to "saṅgha"
// regardless of the display toggle, then surrounding punctuation is stripped.
function normWord(raw) {
  const iast = transliterate(raw, 'roman', { smartNasal: true });
  return iast.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
}

function renderGlossary(text) {
  // Whole-phrase translation for well-known chants.
  const whole = transliterate(text, 'roman', { smartNasal: true })
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:!?。，；：！？'"“”]+$/u, '');
  const phrase = whole ? Glossary.lookupPhrase(whole) : null;
  if (phrase) {
    phraseEl.hidden = false;
    phraseEl.innerHTML =
      `<div class="pt-en">${escapeHtml(phrase.en)}</div>` +
      `<div class="pt-zh">${escapeHtml(phrase.zh)}</div>`;
  } else {
    phraseEl.hidden = true;
    phraseEl.innerHTML = '';
  }

  // Word-by-word glossary.
  const words = text.split(/\s+/).filter(Boolean).slice(0, 80);
  const rows = [];
  for (const raw of words) {
    const iast = normWord(raw);
    if (!iast) continue;
    let hit = Glossary.lookup(iast);
    // inflection fallback: morphologically resolve declined/conjugated forms
    if (!hit) {
      const a = Predict.analyze(Predict.toAkk(iast), 1)[0];
      if (a && a.full && a.stem.en) hit = { en: a.stem.en, zh: a.stem.zh, key: a.stem.label, stem: true };
    }
    const stem = hit && hit.stem ? ` <span class="stem">→ ${escapeHtml(hit.key)}</span>` : '';
    rows.push(
      `<div class="g-row${hit ? '' : ' unknown'}">` +
        `<span class="g-pali">${escapeHtml(iast)}${stem}</span>` +
        `<span class="g-en">${hit ? escapeHtml(hit.en) : '—'}</span>` +
        `<span class="g-zh">${hit ? escapeHtml(hit.zh) : '—'}</span>` +
      `</div>`
    );
  }
  glossaryEl.innerHTML = rows.length
    ? rows.join('')
    : '<div class="g-empty">输入巴利词以查看英文与中文释义…</div>';
}

input.addEventListener('input', render);
smartNasal.addEventListener('change', () => { PREFS.set('smart', smartNasal.checked ? '1' : '0'); render(); });

// Clickable prediction chips (event delegation — chips are rebuilt each render).
nextSoundsEl.addEventListener('click', (e) => {
  const chip = e.target.closest('.ns-chip');
  if (chip) appendToInput(chip.dataset.app);
});
function fillHandler(e) {
  const chip = e.target.closest('.h-chip');
  if (chip) setCurrentWord(chip.dataset.fill);
}
rootHintsEl.addEventListener('click', fillHandler);
affixHintsEl.addEventListener('click', fillHandler);
completionsEl.addEventListener('click', fillHandler);

$('clearBtn').addEventListener('click', () => {
  input.value = '';
  render();
  input.focus();
});

// --- Copy -------------------------------------------------------------------
const copyBtn = $('copyBtn');
copyBtn.addEventListener('click', async () => {
  const text = output.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const r = document.createRange();
    r.selectNodeContents(output);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(r);
    document.execCommand('copy');
    sel.removeAllRanges();
  }
  copyBtn.textContent = '已复制';
  copyBtn.classList.add('copied');
  setTimeout(() => {
    copyBtn.textContent = '复制';
    copyBtn.classList.remove('copied');
  }, 1200);
});

// --- Init -------------------------------------------------------------------
output.setAttribute('lang', LANG[current]);
scriptHint.textContent = HINTS[current];
input.value = EXAMPLES[0];
render();
