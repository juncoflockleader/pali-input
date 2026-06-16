# Pali — Keyman keyboard (Windows + cross-platform)

A [Keyman](https://keyman.com) keyboard implementing the Velthuis → IAST
scheme. One source ([`pali.kmn`](pali.kmn)) compiles to installers for
**Windows, macOS, Linux, web, iOS, Android**. Keyman is SIL's open-source
framework built precisely for minority-language input methods.

## Compile

Install [Keyman Developer](https://keyman.com/developer/) (Windows) or the
cross-platform CLI, then:

```bash
kmc build pali.kmn          # -> pali.kmx (Windows/Linux engine), pali.js (web), ...
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

## Scope (v1)

This keyboard outputs **IAST** (works in any font, the scholarly standard).
Devanāgarī / Sinhala / Thai / Myanmar can be added as additional keyboards
(separate `.kmn` files or store-based layer switching) — the script tables
already exist in the web engine ([`../../pali.js`](../../pali.js)).

Unlike the macOS build, the Keyman keyboard is keystroke-only: no script-switch
menu or smart-correction toggle (the rules are always on; use `.m` for an
explicit niggahīta before a velar, e.g. `sa.mgha` → saṃgha).
