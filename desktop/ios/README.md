# Pali Keyboard — iOS (custom keyboard extension)

A native iOS keyboard. Type romanized Pali (Velthuis); the converted Pali is
inserted live, a tappable **completion strip** suggests frequency-ranked whole
words, and the suggestion bar shows the gloss + morphological split. A key
cycles the output script (IAST / Devanāgarī / Sinhala / Thai / Myanmar); the
globe switches keyboards.

**The engine is shared, not duplicated** — `KeyboardViewController.swift` reuses
[`../macos/Sources/PaliEngine.swift`](../macos/Sources/PaliEngine.swift) and
[`PaliData.swift`](../macos/Sources/PaliData.swift) verbatim (verified to
type-check for iOS).

## Layout

```
PaliKeyboard/
  KeyboardViewController.swift   the keyboard (UIInputViewController)
  Info.plist                     keyboard-extension declaration
build-check.sh                   type-checks the sources against the iOS SDK
```

## Verify (no Xcode project needed)

```bash
./build-check.sh        # => iOS sources type-check ✓
```

## Build the installable keyboard (Xcode)

iOS keyboards ship as an **app extension inside a containing app**, which needs
an Xcode project:

1. Xcode → New Project → **App** (e.g. “Pali Keyboard”).
2. File → New → Target → **Custom Keyboard Extension** (e.g. “PaliKeyboard”).
3. In the extension target, replace its `KeyboardViewController.swift` with this
   one, and **add to the target**:
   - `../macos/Sources/PaliEngine.swift`, `../macos/Sources/PaliData.swift`
   - `../macos/Resources/pali-data.json`, `dpd-dict.json`, `freq-words.json`,
     `compounds.json`, `bigram.json` (Build Phases → Copy Bundle Resources)
4. Use this folder's `Info.plist` (or merge its `NSExtension` block).
5. Run on a device/simulator, then **Settings → General → Keyboard → Keyboards
   → Add New Keyboard → Pali**, and switch to it with the globe.

## Notes / limitations

- `RequestsOpenAccess` is **false** — everything (transliteration + the 75k-word
  DPD dictionary) is bundled, so the keyboard needs no network/full access.
- Live insert uses delete-and-replace (`deleteBackward` × N, then `insertText`),
  the standard technique since `UITextDocumentProxy` has no reliable marked text.
- Distribution to other devices needs an Apple Developer account
  (TestFlight / App Store). This repo provides the sources, not a signed build.
