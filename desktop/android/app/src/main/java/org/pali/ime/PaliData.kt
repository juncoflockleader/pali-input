// PaliData.kt — glossary / dictionary lookup for the suggestion bar.
// Loads the curated bilingual glossary (pali-data.json) and the full DPD
// dictionary (dpd-dict.json) from app assets. Lookup priority:
//   curated bilingual (has 中文) -> DPD (English) -> none.

package org.pali.ime

import android.content.Context
import org.json.JSONObject

data class GlossResult(val en: String, val zh: String, val key: String, val stem: Boolean)

class PaliData private constructor(
    private val glossary: Map<String, Pair<String, String>>, // word -> (en, zh)
    private val dpd: JSONObject                               // lemma -> meaning (English)
) {
    fun lookup(word: String): GlossResult? {
        val k = word.lowercase()
        glossary[k]?.let { return GlossResult(it.first, it.second, k, false) }
        stemKey(k)?.let { k2 -> glossary[k2]?.let { return GlossResult(it.first, it.second, k2, true) } }
        if (dpd.has(k)) return GlossResult(dpd.optString(k), "", k, false)
        stemKey(k)?.let { k2 -> if (dpd.has(k2)) return GlossResult(dpd.optString(k2), "", k2, true) }
        return null
    }

    // strip a trailing niggahīta / -m (common accusative ending)
    private fun stemKey(k: String): String? =
        if (k.isNotEmpty() && (k.last() == 'ṃ' || k.last() == 'm')) k.dropLast(1) else null

    companion object {
        fun load(ctx: Context): PaliData {
            val g = HashMap<String, Pair<String, String>>()
            val paliData = ctx.assets.open("pali-data.json").bufferedReader().use { it.readText() }
            val gloss = JSONObject(paliData).getJSONObject("glossary")
            for (key in gloss.keys()) {
                val o = gloss.getJSONObject(key)
                g[key] = Pair(o.optString("en"), o.optString("zh"))
            }
            val dpdText = ctx.assets.open("dpd-dict.json").bufferedReader().use { it.readText() }
            return PaliData(g, JSONObject(dpdText))
        }
    }
}
