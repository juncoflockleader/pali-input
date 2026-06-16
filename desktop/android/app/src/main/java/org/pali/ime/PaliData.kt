// PaliData.kt — glossary/dictionary lookup + morphological splitter for the
// suggestion bar. Mirrors glossary.js + predict.js + PaliData.swift.
//
// Loads the curated bilingual glossary + roots/affixes (pali-data.json) and the
// full DPD dictionary (dpd-dict.json) from app assets. Pure logic (besides JSON
// loading) so analyze() can be unit-tested on the JVM.

package org.pali.ime

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class GlossResult(val en: String, val zh: String, val key: String, val stem: Boolean)
data class StemMatch(val kind: String, val label: String, val en: String, val zh: String) // root/word/raw
data class PrefixHit(val form: String, val en: String, val zh: String)
data class EndingHit(val end: String, val en: String, val zh: String)
data class Analysis(
    val prefixes: List<PrefixHit>,
    val stem: StemMatch,
    val ending: EndingHit?,
    val full: Boolean,
    val recognized: Int,
) {
    val morphemes: Int get() = prefixes.size + if (ending == null) 0 else 1
}

class PaliData private constructor(
    private val glossary: Map<String, Pair<String, String>>,
    private val dpd: JSONObject,
    private val rootForms: List<RootEntry>,
    private val prefixesAll: List<AffixEntry>,
    private val endingsSorted: List<EndingEntry>,
    private val glossAkk: List<GlossAkk>,
    private val freqWords: List<Triple<String, Int, String>>, // pre-sorted by freq desc
    private val compounds: Map<String, List<String>>,         // compound lemma -> members
) {
    private class RootEntry(val root: String, val en: String, val zh: String, val forms: List<Pair<String, List<String>>>)
    private class AffixEntry(val form: String, val en: String, val zh: String, val akk: List<String>)
    private class EndingEntry(val end: String, val en: String, val zh: String, val akk: List<String>)
    private class GlossAkk(val w: String, val akk: List<String>, val en: String, val zh: String)

    // MARK: gloss lookup (curated bilingual -> DPD English)
    fun lookup(word: String): GlossResult? {
        val k = word.lowercase()
        glossary[k]?.let { return GlossResult(it.first, it.second, k, false) }
        stemKey(k)?.let { k2 -> glossary[k2]?.let { return GlossResult(it.first, it.second, k2, true) } }
        if (dpd.has(k)) return GlossResult(dpd.optString(k), "", k, false)
        stemKey(k)?.let { k2 -> if (dpd.has(k2)) return GlossResult(dpd.optString(k2), "", k2, true) }
        // inflection fallback: analyze and return the best full stem's gloss
        val a = analyze(toAkk(k), 1).firstOrNull()
        if (a != null && a.full && a.stem.en.isNotEmpty()) {
            return GlossResult(a.stem.en, a.stem.zh, a.stem.label, true)
        }
        return null
    }
    private fun stemKey(k: String): String? =
        if (k.isNotEmpty() && (k.last() == 'ṃ' || k.last() == 'm')) k.dropLast(1) else null

    // MARK: compound (samāsa) split — member lemmas, or empty if not a compound
    fun splitCompound(word: String, lemma: String? = null): List<String> {
        val w = word.lowercase()
        compounds[w]?.let { return it }
        if (w.isNotEmpty() && (w.last() == 'ṃ' || w.last() == 'm')) compounds[w.dropLast(1)]?.let { return it }
        lemma?.lowercase()?.let { l -> compounds[l]?.let { return it } }
        return emptyList()
    }

    // MARK: word completion (frequency-ranked; freqWords is pre-sorted)
    fun completeWord(prefix: String, limit: Int = 6): List<Pair<String, String>> {
        val p = prefix.lowercase()
        if (p.isEmpty()) return emptyList()
        val out = ArrayList<Pair<String, String>>()
        for (t in freqWords) {
            if (t.first.length > p.length && t.first.startsWith(p)) {
                out.add(Pair(t.first, t.third))
                if (out.size >= limit) break
            }
        }
        return out
    }

    // MARK: akkhara helpers (lenient nasals / final-m)
    private fun akkEq(u: String, l: String): Boolean {
        if (u == l) return true
        if (u == "n" && (l == "ṅ" || l == "ñ" || l == "ṇ")) return true
        if (u == "m" && l == "ṃ") return true
        return false
    }
    private fun startsWith(lex: List<String>, pre: List<String>): Boolean {
        if (pre.size > lex.size) return false
        for (i in pre.indices) if (!akkEq(pre[i], lex[i])) return false
        return true
    }
    private fun endsWith(arr: List<String>, suf: List<String>): Boolean {
        if (suf.size > arr.size) return false
        val off = arr.size - suf.size
        for (i in suf.indices) if (!akkEq(arr[off + i], suf[i])) return false
        return true
    }
    private fun equalAkk(a: List<String>, b: List<String>) = a.size == b.size && startsWith(a, b)

    private fun matchStemWord(stem: List<String>): StemMatch? {
        for (g in glossAkk) if (equalAkk(g.akk, stem)) return StemMatch("word", g.w, g.en, g.zh)
        for (g in glossAkk) if (g.akk.size > stem.size && g.akk.size - stem.size <= 1 && startsWith(g.akk, stem))
            return StemMatch("word", g.w, g.en, g.zh)
        return null
    }
    private fun matchStemRoot(stem: List<String>): StemMatch? {
        for (rf in rootForms) for (f in rf.forms) {
            if (equalAkk(f.second, stem) ||
                (stem.size > f.second.size && stem.size - f.second.size <= 1 && startsWith(stem, f.second)))
                return StemMatch("root", "√" + rf.root, rf.en, rf.zh)
        }
        return null
    }
    private fun matchStemDpd(stem: List<String>): StemMatch? {
        val key = stem.joinToString("")
        if (dpd.has(key)) return StemMatch("word", key, dpd.optString(key), "")
        return null
    }

    // MARK: morphological split (prefix + root/word + ending)
    fun analyze(akk: List<String>, limit: Int = 2): List<Analysis> {
        if (akk.isEmpty()) return emptyList()

        val prefixOpts = ArrayList<Pair<List<PrefixHit>, List<String>>>()
        prefixOpts.add(Pair(emptyList(), akk))
        for (p in prefixesAll) {
            if (akk.size > p.akk.size && startsWith(akk, p.akk)) {
                val rest1 = akk.subList(p.akk.size, akk.size).toList()
                val ph = PrefixHit(p.form, p.en, p.zh)
                prefixOpts.add(Pair(listOf(ph), rest1))
                for (q in prefixesAll) {
                    if (rest1.size > q.akk.size && startsWith(rest1, q.akk)) {
                        prefixOpts.add(Pair(listOf(ph, PrefixHit(q.form, q.en, q.zh)), rest1.subList(q.akk.size, rest1.size).toList()))
                    }
                }
            }
        }

        val cands = ArrayList<Analysis>()
        for ((prefixes, rest) in prefixOpts) {
            val endOpts = ArrayList<Pair<EndingEntry?, List<String>>>()
            endOpts.add(Pair(null, rest))
            for (e in endingsSorted) {
                if (rest.size > e.akk.size && endsWith(rest, e.akk)) {
                    endOpts.add(Pair(e, rest.subList(0, rest.size - e.akk.size).toList()))
                }
            }
            for ((ending, stem) in endOpts) {
                if (stem.isEmpty()) continue
                val match = matchStemWord(stem) ?: matchStemRoot(stem) ?: matchStemDpd(stem)
                val stemM = match ?: StemMatch("raw", stem.joinToString(""), "", "")
                val pfxLen = akk.size - rest.size
                val endLen = rest.size - stem.size
                val stemLen = if (match != null) stem.size else 0
                val endingHit = ending?.let { EndingHit(it.end, it.en, it.zh) }
                cands.add(Analysis(prefixes, stemM, endingHit, match != null, pfxLen + endLen + stemLen))
            }
        }

        cands.sortWith(
            compareByDescending<Analysis> { it.full }
                .thenByDescending { it.recognized }
                .thenBy { it.morphemes }
                .thenBy { it.prefixes.size }
        )
        val seen = HashSet<String>()
        val dedup = ArrayList<Analysis>()
        for (c in cands) {
            val sig = c.prefixes.joinToString("+") { it.form } + "|" + c.stem.label
            if (seen.add(sig)) dedup.add(c)
        }
        val fulls = dedup.filter { it.full }
        return if (fulls.isNotEmpty()) fulls.take(limit) else dedup.take(1)
    }

    companion object {
        fun toAkk(s: String): List<String> =
            PaliEngine.tokenize(s, false).filter { it.type != TokType.OTHER }.map { it.iast }

        fun load(ctx: Context): PaliData {
            val pt = ctx.assets.open("pali-data.json").bufferedReader().use { it.readText() }
            val dt = ctx.assets.open("dpd-dict.json").bufferedReader().use { it.readText() }
            val ft = ctx.assets.open("freq-words.json").bufferedReader().use { it.readText() }
            val ct = ctx.assets.open("compounds.json").bufferedReader().use { it.readText() }
            return build(JSONObject(pt), JSONObject(dt), ft, ct)
        }
        // For JVM tests: construct from JSON text directly.
        fun fromJson(paliText: String, dpdText: String, freqText: String, compoundsText: String): PaliData =
            build(JSONObject(paliText), JSONObject(dpdText), freqText, compoundsText)

        private fun build(pali: JSONObject, dpd: JSONObject, freqText: String, compoundsText: String): PaliData {
            val gmap = HashMap<String, Pair<String, String>>()
            val gloss = pali.getJSONObject("glossary")
            for (k in gloss.keys()) {
                val o = gloss.getJSONObject(k)
                gmap[k] = Pair(o.optString("en"), o.optString("zh"))
            }
            val glossAkk = gmap.map { (k, v) -> GlossAkk(k, toAkk(k), v.first, v.second) }

            val rootForms = ArrayList<RootEntry>()
            val ra = pali.getJSONArray("roots")
            for (i in 0 until ra.length()) {
                val o = ra.getJSONObject(i)
                val fa = o.getJSONArray("forms")
                val forms = ArrayList<Pair<String, List<String>>>()
                for (j in 0 until fa.length()) { val f = fa.getString(j); forms.add(Pair(f, toAkk(f))) }
                rootForms.add(RootEntry(o.optString("root"), o.optString("en"), o.optString("zh"), forms))
            }

            val prefixesAll = ArrayList<AffixEntry>()
            for (key in listOf("upasagga", "prefixExtra")) {
                val arr = pali.optJSONArray(key) ?: continue
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    prefixesAll.add(AffixEntry(o.optString("form"), o.optString("en"), o.optString("zh"), toAkk(o.optString("form"))))
                }
            }

            val endings = ArrayList<EndingEntry>()
            val ea = pali.getJSONArray("endings")
            for (i in 0 until ea.length()) {
                val o = ea.getJSONObject(i)
                endings.add(EndingEntry(o.optString("end"), o.optString("en"), o.optString("zh"), toAkk(o.optString("end"))))
            }
            endings.sortByDescending { it.akk.size }

            val freqWords = ArrayList<Triple<String, Int, String>>()
            val fa = JSONArray(freqText)
            for (i in 0 until fa.length()) {
                val row = fa.getJSONArray(i)
                freqWords.add(Triple(row.getString(0), row.optInt(1, 0), if (row.length() >= 3) row.optString(2) else ""))
            }

            val comp = HashMap<String, List<String>>()
            val cj = JSONObject(compoundsText)
            for (k in cj.keys()) {
                val arr = cj.getJSONArray(k)
                val ms = ArrayList<String>(arr.length())
                for (i in 0 until arr.length()) ms.add(arr.getString(i))
                comp[k] = ms
            }

            return PaliData(gmap, dpd, rootForms, prefixesAll, endings, glossAkk, freqWords, comp)
        }
    }
}
