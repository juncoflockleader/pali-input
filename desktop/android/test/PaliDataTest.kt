// PaliDataTest.kt — JVM test for the Kotlin gloss lookup + morphological
// splitter, loading the real bundled JSON. Run from desktop/android with
// org.json on the classpath (see ../README.md / the verify command).

import org.pali.ime.PaliData
import org.pali.ime.Analysis
import java.io.File
import kotlin.system.exitProcess

fun main() {
    var pass = 0
    var fail = 0
    fun check(cond: Boolean, msg: String) { if (cond) pass++ else { fail++; println("FAIL $msg") } }

    val pali = File("app/src/main/assets/pali-data.json").readText()
    val dpd = File("app/src/main/assets/dpd-dict.json").readText()
    val freq = File("app/src/main/assets/freq-words.json").readText()
    val pd = PaliData.fromJson(pali, dpd, freq)

    // gloss lookup
    check(pd.lookup("buddha")?.zh == "佛；觉者", "gloss buddha")
    check(pd.lookup("mettā")?.zh == "慈；慈爱", "gloss mettā")
    check(pd.lookup("buddhaṃ")?.let { it.stem && it.key == "buddha" } == true, "stem buddhaṃ")
    // full DPD dictionary (English-only words not in the curated glossary)
    check((pd.lookup("kusala")?.en ?: "").isNotEmpty(), "dpd kusala")
    check((pd.lookup("rukkha")?.en ?: "").isNotEmpty(), "dpd rukkha")

    fun hasA(w: String, pred: (Analysis) -> Boolean, msg: String) {
        val a = pd.analyze(PaliData.toAkk(w), 3)
        check(a.any(pred), "analyze $msg -> " +
            a.joinToString { it.prefixes.joinToString("+") { p -> p.form } + "|" + it.stem.label + "|" + (it.ending?.end ?: "") })
    }
    hasA("dhammassa", { it.stem.label == "dhamma" && it.ending?.end == "assa" }, "dhammassa")
    hasA("gacchati", { it.stem.label == "√gam" || it.stem.label == "gacchati" }, "gacchati")
    hasA("anugacchati", { a -> a.prefixes.any { it.form == "anu" } && a.stem.label == "√gam" }, "anugacchati")
    hasA("anattā", { a -> a.prefixes.any { it.form == "an" } && a.stem.label == "attā" }, "anattā")

    // word completion
    check(pd.completeWord("nibb", 6).any { it.first == "nibbāna" }, "completeWord nibb -> nibbāna")
    check(pd.completeWord("dhamma", 6).none { it.first == "dhamma" }, "completeWord skips exact")
    check(pd.completeWord("", 6).isEmpty(), "completeWord empty prefix")

    println("\n$pass passed, $fail failed")
    exitProcess(if (fail == 0) 0 else 1)
}
