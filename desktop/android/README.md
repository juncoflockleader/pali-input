# Pali Keyboard — Android (InputMethodService)

A native Android keyboard. Type romanized Pali (Velthuis); the converted Pali
is shown as composing (underlined) text inline and in the suggestion bar with
its English/Chinese gloss. A key cycles the output script (IAST / Devanāgarī /
Sinhala / Thai / Myanmar); the globe opens the keyboard picker.

## Layout

```
app/src/main/
  java/org/pali/ime/
    PaliEngine.kt              transliteration engine (Kotlin port of pali.js)
    PaliData.kt                glossary + DPD dictionary lookup (from assets)
    PaliInputMethodService.kt  the IME (keyboard view + suggestion bar + commit)
    MainActivity.kt            launcher: instructions + open keyboard settings
  assets/
    pali-data.json             169 bilingual glosses + roots/affixes
    dpd-dict.json              full DPD dictionary (~75.6k lemmas, English)
  res/xml/method.xml           IME metadata
  AndroidManifest.xml
test/PaliEngineTest.kt         JVM unit test: engine vs expected output
build.gradle.kts, settings.gradle.kts, app/build.gradle.kts
```

## Build & install

Open `desktop/android` in **Android Studio**, let it sync (it may offer to
update the AGP/Gradle versions for your SDK — accept), then Run on a device or
emulator. Then **Settings → System → Languages & input → On-screen keyboard →
Manage keyboards → enable “Pali (Velthuis)”**, and switch to it from any field.

## Verify the engine (no full build)

The engine is pure Kotlin and is unit-tested on the JVM with the Kotlin
compiler bundled in Android Studio:

```bash
KOTLINC="/Applications/Android Studio.app/Contents/plugins/Kotlin/kotlinc/bin/kotlinc"
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
  "$KOTLINC" app/src/main/java/org/pali/ime/PaliEngine.kt test/PaliEngineTest.kt \
  -include-runtime -d /tmp/palikt.jar
"$JAVA_HOME/bin/java" -jar /tmp/palikt.jar      # => 28 passed, 0 failed
```

The engine output matches the web/macOS engines exactly (same test vectors).

## Notes / limitations

- v1 shows the **gloss** in the suggestion bar (curated bilingual → DPD
  English). The full morphological split (prefix+root+ending) that the macOS
  IME shows isn't ported to Android yet — `PaliEngine.kt` + `PaliData.kt` are in
  place to add it.
- The DPD dictionary (~4 MB) is parsed once on a background thread at startup.
- Gradle versions in the build files are a known-good combo; Android Studio may
  adjust them to match your installed SDK/Gradle.
