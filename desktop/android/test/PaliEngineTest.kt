// PaliEngineTest.kt — verifies the Kotlin port matches the JS/Swift engine.
// Pure JVM (no Android). Compile & run with the Kotlin compiler bundled in
// Android Studio (see ../README.md), or:
//   kotlinc app/src/main/java/org/pali/ime/PaliEngine.kt test/PaliEngineTest.kt \
//     -include-runtime -d /tmp/palikt.jar && java -jar /tmp/palikt.jar

import org.pali.ime.PaliEngine
import org.pali.ime.PaliScript
import kotlin.system.exitProcess

var pass = 0
var fail = 0

fun eq(input: String, script: PaliScript, expected: String, smartNasal: Boolean = true) {
    val got = PaliEngine.transliterate(input, script, smartNasal)
    if (got == expected) pass++
    else { fail++; println("FAIL [$script] \"$input\"  expected: $expected  got: $got") }
}

fun main() {
    // Roman / IAST + smart correction
    eq("buddha", PaliScript.ROMAN, "buddha")
    eq("sa\"ngha", PaliScript.ROMAN, "saṅgha")
    eq("sangha", PaliScript.ROMAN, "saṅgha")
    eq("panca", PaliScript.ROMAN, "pañca")
    eq("nibbaana", PaliScript.ROMAN, "nibbāna")
    eq("~naa.na", PaliScript.ROMAN, "ñāṇa")
    eq("araha.m", PaliScript.ROMAN, "arahaṃ")
    eq("Buddha", PaliScript.ROMAN, "Buddha")
    eq("buddham", PaliScript.ROMAN, "buddhaṃ")
    eq("dhammam", PaliScript.ROMAN, "dhammaṃ")
    eq("kamma", PaliScript.ROMAN, "kamma")
    eq("metta", PaliScript.ROMAN, "metta")
    eq("sangha", PaliScript.ROMAN, "sangha", smartNasal = false)
    eq("buddham sara.nam", PaliScript.ROMAN, "buddhaṃ saraṇaṃ")

    // Devanāgarī
    eq("buddha", PaliScript.DEVANAGARI, "बुद्ध")
    eq("dhamma", PaliScript.DEVANAGARI, "धम्म")
    eq("sangha", PaliScript.DEVANAGARI, "सङ्घ")
    eq("nibbaana", PaliScript.DEVANAGARI, "निब्बान")
    eq("pa~n~naa", PaliScript.DEVANAGARI, "पञ्ञा")
    eq("buddham", PaliScript.DEVANAGARI, "बुद्धं")

    // Sinhala
    eq("buddha", PaliScript.SINHALA, "බුද්ධ")
    eq("mettaa", PaliScript.SINHALA, "මෙත්තා")
    eq("pa~n~naa", PaliScript.SINHALA, "පඤ්ඤා")

    // Thai
    eq("buddha", PaliScript.THAI, "พุทฺธ")
    eq("mettaa", PaliScript.THAI, "เมตฺตา")
    eq("araha.m", PaliScript.THAI, "อรหํ")

    // Myanmar (incl. kinzi)
    eq("buddha", PaliScript.MYANMAR, "ဗုဒ္ဓ")
    eq("mettaa", PaliScript.MYANMAR, "မေတ္တာ")
    eq("sangha", PaliScript.MYANMAR, "သင်္ဃ")       // kinzi: ṅ + gh
    eq("sankhaaraa", PaliScript.MYANMAR, "သင်္ခာရာ")  // kinzi: ṅ + kh

    println("\n$pass passed, $fail failed")
    exitProcess(if (fail == 0) 0 else 1)
}
