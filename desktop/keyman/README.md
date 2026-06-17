# Pali — Keyman keyboards (Windows + cross-platform)

[Keyman](https://keyman.com) keyboards for typing Pali in the Velthuis scheme.
One source per output script compiles to installers for **Windows, macOS,
Linux, web, iOS, Android**. Keyman is SIL's open-source framework built
precisely for minority-language input methods.

| File | Output | Source |
|------|--------|--------|
| [`pali.kmn`](pali.kmn) | **IAST** (romanized) | hand-written |
| [`pali-deva.kmn`](pali-deva.kmn) | **Devanāgarī** | generated |
| [`pali-sinh.kmn`](pali-sinh.kmn) | **Sinhala** | generated |
| [`pali-thai.kmn`](pali-thai.kmn) | **Thai** | generated |
| [`pali-mymr.kmn`](pali-mymr.kmn) | **Myanmar** | generated |

The four native-script keyboards are **generated** from the web engine's glyph
tables by [`build-native.cjs`](build-native.cjs) and **self-verified**: the
generator simulates Keyman's execution model (ordered first-match, `any`/`index`
parallel stores, deadkeys, single pass per keystroke) over the generated rules
and asserts the output matches `pali.js`'s `transliterate()` — currently
**120/120** (30 words × 4 scripts), covering clusters, long vowels, smart nasal
assimilation, niggahīta, and Thai leading-vowel reordering.

```bash
node build-native.cjs        # regenerate the 4 native .kmn + run verification
```

> **Verification status:** the rule *logic* is verified by the simulator, and
> all five `.kmn` (plus the `pali.kps` package) are **compiled in CI by the real
> Keyman compiler** — `kmc`, the cross-platform Node CLI — on every push (see
> [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)). They have not
> yet been smoke-tested on a real device, so do that before relying on them in
> production.

## Compile

The compiler is `kmc`, distributed as the npm package
[`@keymanapp/kmc`](https://www.npmjs.com/package/@keymanapp/kmc) — pure Node, no
Windows/GUI needed (this is what CI uses). Build the keyboards and the package:

```bash
cd desktop/keyman
npm install -g @keymanapp/kmc
for k in pali pali-deva pali-sinh pali-thai pali-mymr; do kmc build file "$k.kmn"; done
kmc build file pali.kps     # -> pali.kmp (installable package of all 5 keyboards)
```

Each keyboard compiles to `*.kmx` (Windows/macOS/Linux) + `*.js` (web/touch);
`pali.kps` bundles all five into a single `pali.kmp`. The
[release workflow](../../.github/workflows/release.yml) builds the `.kmp` and
attaches it to each release as `PaliIME-keyman-<tag>.kmp`. (You can also open
the keyboards in [Keyman Developer](https://keyman.com/developer/) and Build.)

## Install (Windows)

1. Install [Keyman for Windows](https://keyman.com/windows/) (the runtime).
2. Double-click the built `.kmp` (or add `pali.kmx`) to install the keyboard.
3. Switch to it from the Keyman menu / Windows language bar, then type.

## What the rules do

| Type | Get |
|------|-----|
| `aa` `ii` `uu` | ā ī ū |
| `.t .d .n .l` | ṭ ḍ ṇ ḷ  (and `.th .dh` → ṭh ḍh automatically) |
| `.m` | ṃ |
| `"n` / `;n` | ṅ |
| `~n` | ñ |
| `sangha` `panca` | saṅgha pañca  (smart nasal assimilation) |
| `evam ` (+space) | evaṃ  (word-final m → ṃ) |

Aspirates (`kh gh ch jh th dh ph bh`) need no rules — in IAST they are just the
base letter + `h`, produced by typing the keys in order.

The same input scheme drives the native-script keyboards, which output the
abugida directly (clusters via virama, inherent/long vowels, Thai leading
vowels): e.g. in `pali-deva.kmn`, `buddha` → बुद्ध, `sangha` → सङ्घ,
`dhammam ` → धम्मं.

## Notes

- The keyboards are keystroke-only: no script-switch menu or smart-correction
  toggle (rules are always on; use `.m` for an explicit niggahīta before a
  velar, e.g. `sa.mgha` → saṃgha). To switch output script, install the desired
  keyboard. (The macOS IME, by contrast, switches all five scripts from a menu.)
- Each native keyboard targets one script. The 5-way live switching + glossary
  panel live in the web app and the macOS IME.
