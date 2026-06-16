# PaliIME — macOS input method (InputMethodKit)

A native macOS input method. Type romanized Pali (Velthuis ASCII); a live
underlined pre-edit shows the converted Pali; space / return / punctuation
commits it. Switch the target script (IAST / Devanāgarī / Sinhala / Thai /
Myanmar) and toggle smart correction from the input-method menu.

While you compose, a small floating **info panel** appears beside the caret
showing the same hints as the web app: the word's English/Chinese **gloss**
and a **morphological split** (prefix + root/word + ending) — e.g. typing
`anugacchati` shows `anu- √gam -ti` with “to go”. It's informational only
(never takes focus). The data (169 glosses, 685 roots) is bundled as
`Resources/pali-data.json`, generated from the web app by `tools/gen-data.cjs`.

## Requirements

- macOS 11+
- Xcode command-line tools / Swift (`swiftc`) — verified with Swift 6.3.

## Build

```bash
./build.sh                 # -> build/PaliIME.app
./build.sh install         # build + copy to ~/Library/Input Methods/
```

No Xcode project: `build.sh` compiles the Swift sources, assembles the
`.app` bundle, lints the Info.plist, and ad-hoc codesigns it.

## Install & enable

1. `./build.sh install`
2. Log out and back in (first install only — macOS scans
   `~/Library/Input Methods/` at login). Or run `killall PaliIME` to restart it.
3. **System Settings → Keyboard → Input Sources → Edit → `+`** → search
   **“Pali”** → add it.
4. Pick **Pali** from the input menu (the flag/⌃Space switcher), then type in
   any app. Use the input-method menu to choose the output script.

## Layout

```
Sources/
  PaliEngine.swift       transliteration engine (Swift port of pali.js)
  PaliData.swift         glossary lookup + morphological splitter (ports predict.js)
  InfoPanel.swift        floating gloss / analysis panel beside the caret
  PaliController.swift   IMKInputController: buffer, pre-edit, commit, menu, info
  PaliEngineTest.swift   35 assertions vs. the JS engine + glossary/analysis
  main.swift             IMKServer bootstrap
Resources/pali-data.json glossary + roots (generated; bundled into the .app)
tools/gen-data.cjs       regenerates pali-data.json from the web app's data
Info.plist               IMK input-method registration
build.sh                 (regen data) + compile + assemble + (optionally) install
```

## Test the engine + data

```bash
swiftc -parse-as-library Sources/PaliEngine.swift Sources/PaliData.swift Sources/PaliEngineTest.swift -o /tmp/palitest && /tmp/palitest
# => 35 passed, 0 failed   (run from desktop/macos so Resources/ resolves)
```

## Notes / limitations

- The engine, smart nasal assimilation, word-final `m → ṃ`, and all five
  scripts match the web app exactly (shared logic, verified by the test).
- The rich glossary / root-analysis panels are web-app features, not part of
  the keystroke-level IME (an IME just transliterates).
- Distribution to other Macs needs Developer ID signing + notarization; the
  ad-hoc signature here is for local use.
