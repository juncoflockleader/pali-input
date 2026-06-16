# Roadmap · 路线图

Improvement backlog for the Pali phonetic input method. Grouped by theme,
roughly prioritized. Checked = shipped.

## Shipped (today)

- Transliteration engine: 5 scripts (IAST / Devanāgarī / Sinhala / Thai /
  Myanmar), smart nasal assimilation, word-final `m → ṃ`. Ported & verified on
  web (JS), macOS/iOS (Swift), Android (Kotlin), Keyman (generated + simulated).
- Web app (live: https://juncoflockleader.github.io/pali-input/): live
  transliteration, next-sound prediction, root/affix morphological splitter,
  169 bilingual glosses + chant phrases, two-column layout.
- Native IMEs: macOS (InputMethodKit), iOS (keyboard extension), Android
  (InputMethodService); gloss + morphological split in the bar.
- Keyman: 5 keyboards (IAST + 4 native), generated + simulator-verified.
- Data: 685 roots (DPD) + 20 upasagga + endings; full DPD dictionary
  (~75.6k lemmas, English) bundled in the native apps.

## A. Prediction / suggestions

- [x] **Word completion (单词补全)** — *web done.* Prefix-matches a
      frequency-ranked word list in the 补全 candidate row, click to insert.
      Next: wire into the native apps (macOS/iOS/Android).
- [x] **Frequency ranking** — `tools/build-freq-words.cjs` sums DPD
      `freq_data.CstFreq` per lemma → `freq-words.json` (top 8k). Curated core
      vocabulary is boosted (DPD freq is empty for some core words, e.g.
      nibbāna), so a learner's key words always surface first.
- [ ] **Compound / phrase (词组) suggestions** — known-compound completion;
      true samāsa splitting needs a corpus (harder).
- [ ] **Inflection-aware lookup** — import DPD's inflected-form → headword map
      so any declined/conjugated word resolves to a gloss (biggest UX win for
      the dictionary).

## B. Data quality

- [ ] Chinese coverage beyond the 169 curated words (no good open CN–Pali
      source; expand by hand or partner data).
- [ ] Myanmar *kinzi* (ṅ-cluster) is an approximation — refine.
- [ ] Sandhi (word-boundary sound changes) — advanced.

## C. Web / UX polish

- [ ] **PWA**: manifest + service worker → installable, truly offline.
- [ ] **Persist settings** (script choice, smart correction) via localStorage.
- [ ] Mobile-web layout tuning; accessibility (ARIA, keyboard nav).

## D. Engineering / distribution

- [x] **LICENSE** — MIT for our code; DPD data stays CC BY-NC-SA (see
      [NOTICE.md](NOTICE.md)).
- [ ] **CI** (GitHub Actions): run all suites on push — web (Node), Swift,
      Kotlin (engine + analyzer), Keyman simulator.
- [ ] Dedupe the bundled DPD dict (currently copied to macOS Resources +
      Android assets) via a build step.
- [ ] Commit a buildable iOS Xcode project (e.g. XcodeGen spec).
- [ ] Tagged releases; Keyman `.kmp` packages; signed/notarized macOS build.

## Notes

- **Licensing constraint:** bundling DPD data (CC BY-NC-SA) means the *combined
  distribution* is non-commercial + share-alike. Our code is MIT; a fully
  permissive/commercial build would require removing the DPD-derived data
  (dict + imported roots), keeping only the curated glossary.
