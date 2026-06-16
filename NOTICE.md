# Notices & third-party data

This project's **source code** is licensed under the MIT License ([LICENSE](LICENSE)).
Some **bundled data** is derived from third parties under different terms:

## Digital Pāḷi Dictionary (DPD) — CC BY-NC-SA

The following files are derived from the
[Digital Pāḷi Dictionary](https://github.com/digitalpalidictionary/dpd-db)
(dpd-db) by Bhikkhu Bodhirasa and contributors, licensed
**Creative Commons Attribution-NonCommercial-ShareAlike (CC BY-NC-SA 4.0)**:

| File | Derived from | Content |
|------|--------------|---------|
| `roots.data.js` | DPD `dpd_roots` | 685 verbal roots (English meanings) |
| `freq-words.json` | DPD `dpd_headwords` | top 8k lemmas by Tipiṭaka frequency, for word completion (lemma, freq, short English meaning) |
| `compounds.json` | DPD `dpd_headwords` (`construction`) | 24k compound → member-lemma splits (samāsa) |
| `desktop/macos/Resources/dpd-dict.json` | DPD `dpd_headwords` | ~75.6k lemma → English meaning |
| `desktop/android/app/src/main/assets/dpd-dict.json` | same | (copy bundled into the Android app) |

The **Chinese glosses** and the hand-authored curated glossary
(`glossary.js`, `tools/curated-roots.mjs`) are original to this project and
are MIT-licensed like the rest of the code.

### What CC BY-NC-SA means here

Because the DPD-derived data is **NonCommercial** and **ShareAlike**:

- Any distribution that **includes** this data is for **non-commercial** use.
- Derivatives of that **data** must remain under CC BY-NC-SA and credit DPD.
- The **code** itself remains MIT — you may reuse the engine, UI, and tooling
  freely, including commercially.

To produce a **fully permissive / commercial** build, remove the DPD-derived
data above and keep only the curated glossary; the transliteration engine and
apps work without it (the dictionary lookups simply cover fewer words).

## Fonts

The web app links Google Noto fonts (Devanagari / Sinhala / Thai / Myanmar /
Serif) via Google Fonts; Noto is licensed under the SIL Open Font License.
