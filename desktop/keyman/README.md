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

> ⚠️ **Verification status:** the rule *logic* is verified by the simulator, but
> the `.kmn` have **not been compiled/run in real Keyman** here (no compiler in
> this environment). Compile in Keyman Developer and smoke-test on-device before
> distributing. The simulator targets documented Keyman semantics; any
> divergence would surface as differences from these expected outputs.

## Compile

Install [Keyman Developer](https://keyman.com/developer/) (Windows) or the
cross-platform CLI, then:

```bash
kmc build pali.kmn          # IAST  -> pali.kmx (Windows/Linux), pali.js (web), ...
kmc build pali-deva.kmn     # Devanāgarī
kmc build pali-sinh.kmn     # Sinhala
kmc build pali-thai.kmn     # Thai
kmc build pali-mymr.kmn     # Myanmar
```

Or open `pali.kmn` in Keyman Developer and press **Build**. To make a
distributable installer, add a package (`.kps`) in Keyman Developer and build
a `.kmp`, which users install via Keyman.

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
