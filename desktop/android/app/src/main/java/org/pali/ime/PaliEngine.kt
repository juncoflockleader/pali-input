// PaliEngine.kt — Kotlin port of pali.js / PaliEngine.swift.
//
// Faithful 1:1 port of the tokenizer, smart-nasal / final-niggahīta correction,
// and the five script renderers. Pure Kotlin (no Android deps) so it can be
// unit-tested on the JVM (see test/PaliEngineTest.kt) and reused by the IME.

package org.pali.ime

enum class TokType { VOWEL, CONSONANT, NIGGAHITA, OTHER }
data class Tok(var type: TokType, var iast: String, val upper: Boolean)
enum class PaliScript { ROMAN, DEVANAGARI, SINHALA, THAI, MYANMAR }

private class Abugida(
    val cons: Map<String, String>,
    val vowelIndep: Map<String, String>,
    val vowelSign: Map<String, String>,
    val leadingVowels: Map<String, String>?,   // Thai only
    val stacker: String,
    val killer: String,
    val anusvara: String,
)

object PaliEngine {

    // [input, canonical IAST, type]. Longest input matched first.
    private val rawTokens: List<Triple<String, String, TokType>> = listOf(
        Triple("aa", "ā", TokType.VOWEL), Triple("ii", "ī", TokType.VOWEL), Triple("uu", "ū", TokType.VOWEL),
        Triple("a", "a", TokType.VOWEL), Triple("i", "i", TokType.VOWEL), Triple("u", "u", TokType.VOWEL),
        Triple("e", "e", TokType.VOWEL), Triple("o", "o", TokType.VOWEL),
        Triple("ā", "ā", TokType.VOWEL), Triple("ī", "ī", TokType.VOWEL), Triple("ū", "ū", TokType.VOWEL),

        Triple(".m", "ṃ", TokType.NIGGAHITA), Triple("ṃ", "ṃ", TokType.NIGGAHITA), Triple("ṁ", "ṃ", TokType.NIGGAHITA),

        Triple("\"n", "ṅ", TokType.CONSONANT), Triple(";n", "ṅ", TokType.CONSONANT), Triple("ṅ", "ṅ", TokType.CONSONANT),
        Triple("~n", "ñ", TokType.CONSONANT), Triple("ñ", "ñ", TokType.CONSONANT),

        Triple(".th", "ṭh", TokType.CONSONANT), Triple(".t", "ṭ", TokType.CONSONANT),
        Triple(".dh", "ḍh", TokType.CONSONANT), Triple(".d", "ḍ", TokType.CONSONANT),
        Triple(".n", "ṇ", TokType.CONSONANT), Triple(".l", "ḷ", TokType.CONSONANT),
        Triple("ṭh", "ṭh", TokType.CONSONANT), Triple("ṭ", "ṭ", TokType.CONSONANT),
        Triple("ḍh", "ḍh", TokType.CONSONANT), Triple("ḍ", "ḍ", TokType.CONSONANT),
        Triple("ṇ", "ṇ", TokType.CONSONANT), Triple("ḷ", "ḷ", TokType.CONSONANT),

        Triple("kh", "kh", TokType.CONSONANT), Triple("gh", "gh", TokType.CONSONANT),
        Triple("ch", "ch", TokType.CONSONANT), Triple("jh", "jh", TokType.CONSONANT),
        Triple("th", "th", TokType.CONSONANT), Triple("dh", "dh", TokType.CONSONANT),
        Triple("ph", "ph", TokType.CONSONANT), Triple("bh", "bh", TokType.CONSONANT),

        Triple("k", "k", TokType.CONSONANT), Triple("g", "g", TokType.CONSONANT),
        Triple("c", "c", TokType.CONSONANT), Triple("j", "j", TokType.CONSONANT),
        Triple("t", "t", TokType.CONSONANT), Triple("d", "d", TokType.CONSONANT),
        Triple("p", "p", TokType.CONSONANT), Triple("b", "b", TokType.CONSONANT),
        Triple("n", "n", TokType.CONSONANT), Triple("m", "m", TokType.CONSONANT),
        Triple("y", "y", TokType.CONSONANT), Triple("r", "r", TokType.CONSONANT), Triple("l", "l", TokType.CONSONANT),
        Triple("v", "v", TokType.CONSONANT), Triple("w", "v", TokType.CONSONANT),
        Triple("s", "s", TokType.CONSONANT), Triple("h", "h", TokType.CONSONANT),
    )

    private val tokens = rawTokens
        .map { Triple(it.first.lowercase(), it.second, it.third) }
        .sortedByDescending { it.first.length }

    private val nasalBefore = mapOf(
        "k" to "ṅ", "kh" to "ṅ", "g" to "ṅ", "gh" to "ṅ",
        "c" to "ñ", "ch" to "ñ", "j" to "ñ", "jh" to "ñ",
        "ṭ" to "ṇ", "ṭh" to "ṇ", "ḍ" to "ṇ", "ḍh" to "ṇ",
        "p" to "m", "ph" to "m", "b" to "m", "bh" to "m",
    )

    fun tokenize(text: String, smartNasal: Boolean = true): List<Tok> {
        val lower = text.lowercase()
        val n = text.length
        val out = ArrayList<Tok>()
        var i = 0
        outer@ while (i < n) {
            for ((inp, iast, type) in tokens) {
                if (i + inp.length <= n && lower.startsWith(inp, i)) {
                    out.add(Tok(type, iast, text[i].isUpperCase()))
                    i += inp.length
                    continue@outer
                }
            }
            out.add(Tok(TokType.OTHER, text[i].toString(), false))
            i += 1
        }
        if (smartNasal) {
            applyNasalAssimilation(out)
            applyFinalNiggahita(out)
        }
        return out
    }

    private fun applyNasalAssimilation(toks: MutableList<Tok>) {
        for (k in 0 until toks.size - 1) {
            val t = toks[k]
            if (t.type == TokType.CONSONANT && t.iast == "n") {
                val next = toks[k + 1]
                val repl = nasalBefore[next.iast]
                if (next.type == TokType.CONSONANT && repl != null) t.iast = repl
            }
        }
    }

    private fun applyFinalNiggahita(toks: MutableList<Tok>) {
        for (k in toks.indices) {
            val t = toks[k]
            if (t.type == TokType.CONSONANT && t.iast == "m") {
                val isFinal = (k + 1 >= toks.size) || toks[k + 1].type == TokType.OTHER
                if (isFinal) { t.type = TokType.NIGGAHITA; t.iast = "ṃ" }
            }
        }
    }

    private fun renderRoman(toks: List<Tok>): String {
        val sb = StringBuilder()
        for (t in toks) {
            if (t.upper && t.iast.isNotEmpty())
                sb.append(t.iast[0].uppercaseChar()).append(t.iast.substring(1))
            else sb.append(t.iast)
        }
        return sb.toString()
    }

    private fun renderAbugida(toks: List<Tok>, m: Abugida): String {
        val out = StringBuilder()
        val run = ArrayList<String>()

        fun flushWithVowel(vowel: String) {
            val sb = StringBuilder()
            for (k in 0 until run.size - 1) sb.append(m.cons[run[k]] ?: "").append(m.stacker)
            val last = run[run.size - 1]
            val lv = m.leadingVowels?.get(vowel)
            if (lv != null) sb.append(lv).append(m.cons[last] ?: "")
            else sb.append(m.cons[last] ?: "").append(m.vowelSign[vowel] ?: "")
            out.append(sb)
            run.clear()
        }
        fun flushDead() {
            for (c in run) out.append(m.cons[c] ?: "").append(m.killer)
            run.clear()
        }

        for (t in toks) when (t.type) {
            TokType.CONSONANT -> run.add(t.iast)
            TokType.VOWEL -> if (run.isNotEmpty()) flushWithVowel(t.iast) else out.append(m.vowelIndep[t.iast] ?: t.iast)
            TokType.NIGGAHITA -> { if (run.isNotEmpty()) flushDead(); out.append(m.anusvara) }
            TokType.OTHER -> { if (run.isNotEmpty()) flushDead(); out.append(t.iast) }
        }
        if (run.isNotEmpty()) flushDead()
        return out.toString()
    }

    fun transliterate(text: String, script: PaliScript, smartNasal: Boolean = true): String {
        val toks = tokenize(text, smartNasal)
        return when (script) {
            PaliScript.ROMAN -> renderRoman(toks)
            PaliScript.DEVANAGARI -> renderAbugida(toks, DEVANAGARI)
            PaliScript.SINHALA -> renderAbugida(toks, SINHALA)
            PaliScript.THAI -> renderAbugida(toks, THAI)
            PaliScript.MYANMAR -> renderAbugida(toks, MYANMAR)
        }
    }

    private val DEVANAGARI = Abugida(
        cons = mapOf(
            "k" to "क", "kh" to "ख", "g" to "ग", "gh" to "घ", "ṅ" to "ङ",
            "c" to "च", "ch" to "छ", "j" to "ज", "jh" to "झ", "ñ" to "ञ",
            "ṭ" to "ट", "ṭh" to "ठ", "ḍ" to "ड", "ḍh" to "ढ", "ṇ" to "ण",
            "t" to "त", "th" to "थ", "d" to "द", "dh" to "ध", "n" to "न",
            "p" to "प", "ph" to "फ", "b" to "ब", "bh" to "भ", "m" to "म",
            "y" to "य", "r" to "र", "l" to "ल", "ḷ" to "ळ", "v" to "व", "s" to "स", "h" to "ह"),
        vowelIndep = mapOf("a" to "अ", "ā" to "आ", "i" to "इ", "ī" to "ई", "u" to "उ", "ū" to "ऊ", "e" to "ए", "o" to "ओ"),
        vowelSign = mapOf("a" to "", "ā" to "ा", "i" to "ि", "ī" to "ी", "u" to "ु", "ū" to "ू", "e" to "े", "o" to "ो"),
        leadingVowels = null, stacker = "्", killer = "्", anusvara = "ं")

    private val SINHALA = Abugida(
        cons = mapOf(
            "k" to "ක", "kh" to "ඛ", "g" to "ග", "gh" to "ඝ", "ṅ" to "ඞ",
            "c" to "ච", "ch" to "ඡ", "j" to "ජ", "jh" to "ඣ", "ñ" to "ඤ",
            "ṭ" to "ට", "ṭh" to "ඨ", "ḍ" to "ඩ", "ḍh" to "ඪ", "ṇ" to "ණ",
            "t" to "ත", "th" to "ථ", "d" to "ද", "dh" to "ධ", "n" to "න",
            "p" to "ප", "ph" to "ඵ", "b" to "බ", "bh" to "භ", "m" to "ම",
            "y" to "ය", "r" to "ර", "l" to "ල", "ḷ" to "ළ", "v" to "ව", "s" to "ස", "h" to "හ"),
        vowelIndep = mapOf("a" to "අ", "ā" to "ආ", "i" to "ඉ", "ī" to "ඊ", "u" to "උ", "ū" to "ඌ", "e" to "එ", "o" to "ඔ"),
        vowelSign = mapOf("a" to "", "ā" to "ා", "i" to "ි", "ī" to "ී", "u" to "ු", "ū" to "ූ", "e" to "ෙ", "o" to "ො"),
        leadingVowels = null, stacker = "්", killer = "්", anusvara = "ං")

    private val THAI = Abugida(
        cons = mapOf(
            "k" to "ก", "kh" to "ข", "g" to "ค", "gh" to "ฆ", "ṅ" to "ง",
            "c" to "จ", "ch" to "ฉ", "j" to "ช", "jh" to "ฌ", "ñ" to "ญ",
            "ṭ" to "ฏ", "ṭh" to "ฐ", "ḍ" to "ฑ", "ḍh" to "ฒ", "ṇ" to "ณ",
            "t" to "ต", "th" to "ถ", "d" to "ท", "dh" to "ธ", "n" to "น",
            "p" to "ป", "ph" to "ผ", "b" to "พ", "bh" to "ภ", "m" to "ม",
            "y" to "ย", "r" to "ร", "l" to "ล", "ḷ" to "ฬ", "v" to "ว", "s" to "ส", "h" to "ห"),
        vowelIndep = mapOf("a" to "อ", "ā" to "อา", "i" to "อิ", "ī" to "อี", "u" to "อุ", "ū" to "อู", "e" to "เอ", "o" to "โอ"),
        vowelSign = mapOf("a" to "", "ā" to "า", "i" to "ิ", "ī" to "ี", "u" to "ุ", "ū" to "ู", "e" to "", "o" to ""),
        leadingVowels = mapOf("e" to "เ", "o" to "โ"), stacker = "ฺ", killer = "ฺ", anusvara = "ํ")

    private val MYANMAR = Abugida(
        cons = mapOf(
            "k" to "က", "kh" to "ခ", "g" to "ဂ", "gh" to "ဃ", "ṅ" to "င",
            "c" to "စ", "ch" to "ဆ", "j" to "ဇ", "jh" to "ဈ", "ñ" to "ဉ",
            "ṭ" to "ဋ", "ṭh" to "ဌ", "ḍ" to "ဍ", "ḍh" to "ဎ", "ṇ" to "ဏ",
            "t" to "တ", "th" to "ထ", "d" to "ဒ", "dh" to "ဓ", "n" to "န",
            "p" to "ပ", "ph" to "ဖ", "b" to "ဗ", "bh" to "ဘ", "m" to "မ",
            "y" to "ယ", "r" to "ရ", "l" to "လ", "ḷ" to "ဠ", "v" to "ဝ", "s" to "သ", "h" to "ဟ"),
        vowelIndep = mapOf("a" to "အ", "ā" to "အာ", "i" to "ဣ", "ī" to "ဤ", "u" to "ဥ", "ū" to "ဦ", "e" to "ဧ", "o" to "ဩ"),
        vowelSign = mapOf("a" to "", "ā" to "ာ", "i" to "ိ", "ī" to "ီ", "u" to "ု", "ū" to "ူ", "e" to "ေ", "o" to "ော"),
        leadingVowels = null, stacker = "္", killer = "်", anusvara = "ံ")
}
