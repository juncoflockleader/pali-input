# Pali Phonetic IME · 巴利语拼音输入法

> 🌐 **Languages**: **English** ｜ [中文](README_CN.md)

Type the **pronunciation** of Pali in plain ASCII and get proper Pali script.

[![CI](https://github.com/juncoflockleader/pali-input/actions/workflows/ci.yml/badge.svg)](https://github.com/juncoflockleader/pali-input/actions/workflows/ci.yml)

**🌐 Live demo: https://juncoflockleader.github.io/pali-input/**
(installable as a PWA, works offline; remembers your script + smart-correction settings)

Pali has no script of its own — it has always been written in many. This tool
transliterates easy-to-type Latin spelling, live, into:

| Output | Notes |
|--------|-------|
| **IAST** | diacritic Roman (`buddhaṃ saraṇaṃ gacchāmi`) — the academic / dictionary standard |
| **देवनागरी** | Devanāgarī — South Asian scholarship, Tipiṭaka editions |
| **සිංහල** | Sinhala — Sri Lankan Theravāda |
| **ไทย** | Thai — Thai Tipiṭaka tradition |
| **မြန်မာ** | Myanmar — Burmese Tipiṭaka tradition (incl. the *kinzi* form of conjunct ṅ) |

## Desktop & mobile IMEs

Beyond the web page, the same engine ships as **system-wide input methods** (type
Pali directly in any app) — see [`desktop/`](desktop/):

- **macOS** (native InputMethodKit / Swift): `cd desktop/macos && ./build.sh install`
  → enable “Pali” under System Settings → Keyboard → Input Sources. The engine is a
  faithful Swift port of `pali.js` (verified char-for-char against the JS tests); the
  menu switches all 5 scripts, a floating panel shows meaning + morphology + the full
  DPD dictionary, and it has a **Chinese-IME-style candidate window** (number to
  select, `-`/`=` to page) with **next-word prediction**.
- **iOS / iPadOS** (native keyboard extension / Swift): reuses the same engine; build
  with Xcode — see [`desktop/ios/`](desktop/ios/).
- **Android** (native InputMethodService / Kotlin): the engine ported to Kotlin (JVM
  tests pass); open [`desktop/android/`](desktop/android/) in Android Studio.
- **Windows etc.** ([Keyman](https://keyman.com)): 5 keyboard sources (IAST + native
  Devanāgarī / Sinhala / Thai / Myanmar — the latter generated from the engine's tables
  and verified char-for-char by a rule simulator). Compile with Keyman Developer to get
  Windows/macOS/Linux/web/mobile packages — see [`desktop/keyman/`](desktop/keyman/).

## Download

The latest [release](https://github.com/juncoflockleader/pali-input/releases/latest)
ships ready-to-install packages:

- **macOS** — `PaliIME-macOS-v1.1.0.zip` (ad-hoc signed). Unzip to get `PaliIME.app`,
  put it in `~/Library/Input Methods/`, then add “Pali” under System Settings → Keyboard
  → Input Sources. On first launch, if Gatekeeper blocks it, click **Open Anyway** in
  System Settings → Privacy & Security.
- **Android** — `PaliIME-v1.1.0.apk` (debug-signed, sideloadable). Allow “install
  unknown apps”, install it, then enable the Pali keyboard under Settings → System →
  Languages & input.
- **Web / PWA** — nothing to download: use the [live version](https://juncoflockleader.github.io/pali-input/)
  and “Add to Home Screen / Install as app” for offline use.
- **iOS** — Apple does not allow self-hosted installs; use the web PWA or a Keyman
  keyboard instead.

Packages are built and uploaded automatically by
[`.github/workflows/release.yml`](.github/workflows/release.yml) when a `v*` tag is pushed.

## Usage (web)

No build step required.

- **Just open it**: double-click `index.html` in a browser (works offline).
- **Or serve locally**:
  ```bash
  python3 -m http.server 8000
  # then open http://localhost:8000
  ```

## Input scheme

Follows the common **Velthuis** ASCII convention, and also accepts diacritic IAST
pasted directly.

| Category | Type | Get |
|----------|------|-----|
| Long vowels | `aa` `ii` `uu` | ā ī ū |
| Retroflex | `.t` `.th` `.d` `.dh` `.n` `.l` | ṭ ṭh ḍ ḍh ṇ ḷ |
| Nasal ṅ (velar) | `"n` (or `;n`) | ṅ |
| Nasal ñ (palatal) | `~n` | ñ |
| Niggahīta ṃ | `.m` | ṃ |
| Aspirates | `kh gh ch jh th dh ph bh` | unchanged |

All other letters (`k g c j t d p b n m y r l v s h` and `a i u e o`) are typed as they sound.

## Prediction & word formation

For **the word you're currently typing**, the panel offers several live aids
(see [predict.js](predict.js)):

1. **Next sound** — *akkhara*-level prefix prediction from real Pali words/roots: the
   lexicon (root forms + common words) is broken into *akkhara* (Pali letter) sequences,
   prefix-matched against what you've typed, and ranked by frequency. Each candidate
   shows the sound and how to type it; **click to append**. With no lexicon match it
   falls back to **phonotactic** rules (which sounds may legally follow).
2. **Completion** — whole-word completion ranked by Tipiṭaka frequency; and **Next word**
   — predicts the following word from a bigram model over the Pali canon (click to append,
   chains into the next prediction).
3. **Roots √dhātu** — matching [Pali roots](roots.js) with EN/中文 glosses; also matched
   via present-tense stems (e.g. `pass` → √dis “see”), and **prefixes are stripped
   automatically** (`anubudh` → upasagga `anu-` + √budh). Click to fill the word.
4. **Prefixes upasagga** — the 20 traditional verbal prefixes, listed as you type.
5. **Analysis** — morphological split of the **whole word**: `prefix + root/word + ending`,
   color-coded and glossed. For example:
   - `dhammassa` → **dhamma** (Dhamma) + **-assa** (genitive · “of …”)
   - `anugacchati` → **anu-** + **√gam** (go) + **-ti** (verb · 3rd person)
   - `anattā` → **an-** (negation) + **attā** (self)
   Endings are matched with the full **vibhatti** (case/tense endings) + common
   **kita/taddhita** suffix tables (see `ENDINGS` in [roots.js](roots.js)); the stem is
   then looked up among the **685 roots** + the glossary.

Akkhara matching is **lenient about nasals**: a typed `n` matches ṅ/ñ/ṇ (assimilation
before a stop), and word-final `m` matches niggahīta ṃ, so half-typed words still predict
well (`san` predicts toward saṅkhāra).

> **On “100% coverage”**: the prefixes (20 upasagga) are a closed set — 100% covered;
> the roots are imported from the [DPD dataset](https://github.com/digitalpalidictionary/dpd-db)
> — **685** of them (English glosses from DPD, authoritative; 85 with Chinese + present
> stem) — covering all DPD Pali roots. More importantly, **root + affix ≠ translation**:
> meaning is lexicalized and often non-compositional, and many words (particles,
> pronouns, numerals, proper names, compounds) aren't built from roots. So this panel is
> **morphological analysis / teaching**; real “translation” coverage depends on the size
> of the glossary ([glossary.js](glossary.js)).

## Meanings (English / Chinese)

Below the output, each word's **English and Chinese gloss** is shown:

- ~200 curated common Pali words (core doctrinal terms, chanting vocabulary, particles)
  — see [glossary.js](glossary.js); words not curated fall back to the full DPD
  dictionary (~75.6k entries, English only).
- Common accusative / niggahīta endings are folded automatically
  (`buddhaṃ → buddha`, `saraṇaṃ → saraṇa`); inflected forms resolve to their stem's gloss
  via morphological analysis.
- **Compound (samāsa) splitting**: `satipaṭṭhāna → sati + upaṭṭhāna`.
- A few well-known verses get a **whole-phrase translation**, e.g.:
  - `buddhaṃ saraṇaṃ gacchāmi` → “I go to the Buddha for refuge. 我皈依佛。”
  - `sabbe sattā sukhī hontu` → “May all beings be happy. 愿一切众生快乐。”

Glosses are a study aid for common words, not a complete dictionary; unlisted words show “—”.

### Smart correction (on by default)

Auto-corrects nasals per Pali orthography so you can just type by sound; the UI **shows
what changed** (e.g. `buddham → buddhaṃ`).

**1. Nasal assimilation** — `n` assimilates to the place of the following stop:

| You type | You get | |
|----------|---------|---|
| `sangha` | saṅgha | n + velar → ṅ |
| `panca` | pañca | n + palatal → ñ |
| `dan.da` | daṇḍa | n + retroflex → ṇ |
| `sambodhi` | sambodhi | n + labial → m |

`n` before a dental stays put (`danta` → danta, `ananda` → ananda).

**2. Word-final niggahīta** — a Pali word-final `m` is always ṃ, so the dot is added:

| You type | You get |
|----------|---------|
| `buddham` | buddhaṃ |
| `evam` | evaṃ |
| `dhammam` | dhammaṃ |

Only **word-final** m is corrected; medial m is left alone, so geminates (`kamma` stays
kamma) and m+vowel (`metta` stays metta) aren't touched.

To keep the niggahīta spelling (e.g. `saṃgha`), type `.m`: `sa.mgha` → saṃgha.
Turn off “Smart correction” in the UI to disable all of the above.

## Examples

| Input | IAST |
|-------|------|
| `buddha.m sara.na.m gacchaami` | buddhaṃ saraṇaṃ gacchāmi |
| `namo tassa bhagavato` | namo tassa bhagavato |
| `sabbe sattaa sukhii hontu` | sabbe sattā sukhī hontu |
| `aniccaa vata sa"nkhaaraa` | aniccā vata saṅkhārā |

## Architecture

```
pali-ime/
├── index.html   UI structure
├── styles.css   styles
├── app.js       UI logic (live transliteration, tabs, copy, prediction, per-word glosses)
├── pali.js      transliteration engine (no deps; browser + Node)
├── glossary.js  Pali → English / Chinese lexicon (~200 entries + verse phrases)
├── roots.data.js  generated: 685 roots (DPD import + Chinese), do not hand-edit
├── roots.js     prefixes upasagga (20) + endings vibhatti/suffixes (42) + loads roots.data.js
├── predict.js   next-sound + root/prefix match + morphology + completion + next-word
├── bigram.json  generated: next-word model (Pali-canon bigram, 67k head words)
├── tools/       DPD import pipeline (build-roots.mjs + cache) + build-bigram.cjs
├── test.js      tests (118: transliteration + lexicon + prediction + analysis + completion + next-word)
└── desktop/     native IMEs (macOS / iOS / Android / Keyman)
```

The transliteration engine is a pure-function pipeline:

```
tokenize(text) → [phoneme tokens] → render<Script>(tokens)
```

Each token is stored internally as a canonical IAST letter, tagged by type (vowel /
consonant / niggahīta / passthrough). Every script renderer shares one generic
**abugida** algorithm: consonants carry the inherent vowel `a`, other vowels replace it
with a sign, conjuncts stack with virama, word-initial vowels use independent forms. Thai
additionally reorders the leading vowels `เ/โ`.

## Data pipeline

**Roots** come from **[Digital Pāḷi Dictionary (dpd-db)](https://github.com/digitalpalidictionary/dpd-db)**
(licensed CC BY-NC-SA). `roots.data.js` is generated — **do not hand-edit**; rebuild with:

```bash
# 1) fetch the DPD roots table (TSV)
curl -sS -o tools/dpd_cache/dpd_roots.tsv \
  https://raw.githubusercontent.com/digitalpalidictionary/dpd-db/main/db/backup_tsv/dpd_roots_part_001.tsv

# 2) merge DPD English glosses + our Chinese/stems → roots.data.js
node tools/build-roots.mjs        # => 685 roots (85 Chinese, 600 English-only)
```

- English glosses (`root_meaning`) are taken from DPD, authoritative.
- Chinese + present-tense stems come from [tools/curated-roots.mjs](tools/curated-roots.mjs)
  (maintained by us), layered onto the matching root at merge time.
- Homographic roots from different groups are deduped by bare root and their senses merged.

**Next-word prediction (bigram)** — [bigram.json](bigram.json) is built from the Pali
canon. Rebuild it (corpus: [SuttaCentral bilara-data](https://github.com/suttacentral/bilara-data),
licensed CC0):

```bash
git clone --filter=blob:none --no-checkout --depth 1 -b published \
  https://github.com/suttacentral/bilara-data /tmp/bilara
(cd /tmp/bilara && git sparse-checkout set root/pli/ms && git checkout)
node tools/build-bigram.cjs /tmp/bilara/root/pli/ms   # => bigram.json (2.86M tokens, 67k heads)
```

> **Not done — a larger gloss dictionary**: DPD has ~80k headwords, but they're too large
> and English-only for a pure front-end page. The bilingual translation lexicon stays
> hand-maintained in [glossary.js](glossary.js) and can grow over time.

## Tests

```bash
node test.js   # 118 passed, 0 failed
```

Tests cover the known-correct spelling in all 5 scripts (e.g. buddha → बुद्ध / බුද්ධ /
พุทฺธ / ဗုဒ္ဓ), plus the lexicon, morphological analysis, completion, and next-word
prediction. The native engines (Swift / Kotlin) are tested separately by CI.

## Known limitations

- **Myanmar**: ṅ as a conjunct-initial *kinzi* (င်္, e.g. saṅgha → သင်္ဃ) is handled correctly.
- The engine targets standard Pali phonology; it doesn't handle Sanskrit-only sounds
  (ṛ ṝ ḹ ś ṣ ḥ, etc.).

## Distribution

How each target reaches users (mechanism only):

| Target | How | Developer account? |
|--------|-----|--------------------|
| **Web / PWA** | hosted on GitHub Pages, share a link; installable to home screen / dock, offline | No |
| **macOS** | release ships the `.app` (ad-hoc signed). **Personal use**: click “Open Anyway” in System Settings → Privacy & Security on first launch. **Zero-warning public**: Developer ID signing + notarization | Personal: no; signing + notarization needs an Apple account |
| **iOS / iPadOS** | build with Xcode, run on device/simulator; for others use App Store or TestFlight | Apple account required |
| **Android** | release ships the `.apk` for sideload; or publish to Google Play | sideload: no; Play: yes |
| **Keyman** (Win/Linux/web/mobile) | compile `.kmn` with Keyman Developer → packages; users load it in the free Keyman app | No Apple/Google account |

**Recommendation**: for the widest, zero-friction reach, lead with the **web PWA** (add to
home screen on phones, install as an app on desktop, offline either way) — it covers most
cases. iOS without an account: use the PWA or a Keyman keyboard. Android: ship the APK
directly. macOS: unsigned is fine for personal use; add Developer ID notarization only
when you need zero-warning public distribution.

## Roadmap & License

- Planned improvements are in [ROADMAP.md](ROADMAP.md).
- **Code** is **MIT** ([LICENSE](LICENSE)).
- **Bundled DPD data** (`roots.data.js`, `dpd-dict.json`) is from the
  [Digital Pāḷi Dictionary](https://github.com/digitalpalidictionary/dpd-db) under
  **CC BY-NC-SA** (non-commercial + share-alike) — see [NOTICE.md](NOTICE.md). A
  distribution that includes this data is non-commercial; a pure-MIT / commercial build
  must remove the DPD data (keeping only the hand-curated lexicon).
- The **next-word corpus** ([bilara-data](https://github.com/suttacentral/bilara-data)) is **CC0**.
