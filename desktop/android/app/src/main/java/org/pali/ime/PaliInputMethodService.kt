// PaliInputMethodService.kt — the Android IME.
//
// A transliteration keyboard: keys feed an ASCII buffer; the converted Pali is
// shown as composing (underlined) text inline and in the suggestion bar with
// its gloss; space / return / punctuation commits. A button cycles the output
// script (IAST / Devanāgarī / Sinhala / Thai / Myanmar); the globe switches IME.

package org.pali.ime

import android.inputmethodservice.InputMethodService
import android.view.View
import android.view.ViewGroup
import android.view.Gravity
import android.widget.Button
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.TextView

class PaliInputMethodService : InputMethodService() {

    private var buffer = StringBuilder()
    private var script = PaliScript.ROMAN
    private var smartNasal = true
    private var data: PaliData? = null

    private lateinit var suggestion: TextView
    private lateinit var completionRow: LinearLayout

    private val scripts = listOf(
        PaliScript.ROMAN to "IAST", PaliScript.DEVANAGARI to "देव", PaliScript.SINHALA to "සිං",
        PaliScript.THAI to "ไทย", PaliScript.MYANMAR to "မြန်"
    )

    override fun onCreate() {
        super.onCreate()
        // The DPD dictionary is ~4 MB; load off the main thread.
        Thread { data = PaliData.load(applicationContext) }.start()
    }

    private val rows = listOf("qwertyuiop", "asdfghjkl", "zxcvbnm")

    override fun onCreateInputView(): View {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = ViewGroup.LayoutParams(MATCH, WRAP)
        }

        // tappable completion strip (frequency-ranked whole-word suggestions)
        completionRow = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        val compScroll = HorizontalScrollView(this).apply { isFillViewport = false; addView(completionRow) }
        root.addView(compScroll)

        suggestion = TextView(this).apply {
            textSize = 16f
            maxLines = 2
            setPadding(24, 12, 24, 12)
            gravity = Gravity.CENTER_VERTICAL
        }
        root.addView(suggestion)

        for (r in rows) root.addView(letterRow(r))

        // function row: special chars + controls
        val fn = rowLayout()
        fn.addView(key(".", weight = 1f) { onChar('.') })
        fn.addView(key("\"", weight = 1f) { onChar('"') })
        fn.addView(key("~", weight = 1f) { onChar('~') })
        fn.addView(key(scriptLabel(), weight = 1.6f) { cycleScript(it) })
        fn.addView(key("space", weight = 3f) { onSpace() })
        fn.addView(key("⌫", weight = 1.4f) { onDelete() })
        fn.addView(key("↵", weight = 1.4f) { onReturn() })
        fn.addView(key("🌐", weight = 1.2f) { switchAway() })
        root.addView(fn)

        refresh()
        return root
    }

    // --- key building ---
    private fun letterRow(letters: String): LinearLayout {
        val row = rowLayout()
        for (ch in letters) row.addView(key(ch.toString(), weight = 1f) { onChar(ch) })
        return row
    }
    private fun rowLayout() = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        layoutParams = LinearLayout.LayoutParams(MATCH, WRAP)
    }
    private fun key(label: String, weight: Float, onTap: (Button) -> Unit): Button {
        val b = Button(this)
        b.text = label
        b.isAllCaps = false
        b.layoutParams = LinearLayout.LayoutParams(0, WRAP, weight).apply { setMargins(4, 4, 4, 4) }
        b.setOnClickListener { onTap(b) }
        return b
    }

    // --- input handling ---
    private fun onChar(c: Char) { buffer.append(c); refresh() }

    private fun onSpace() {
        if (buffer.isNotEmpty()) commitWord()
        currentInputConnection?.commitText(" ", 1)
    }
    private fun onReturn() {
        if (buffer.isNotEmpty()) commitWord()
        else currentInputConnection?.commitText("\n", 1)
    }
    private fun onDelete() {
        val ic = currentInputConnection ?: return
        if (buffer.isNotEmpty()) {
            buffer.deleteCharAt(buffer.length - 1)
            if (buffer.isEmpty()) { ic.setComposingText("", 1); ic.finishComposingText() }
            refresh()
        } else {
            ic.deleteSurroundingText(1, 0)
        }
    }

    private val converted: String get() = PaliEngine.transliterate(buffer.toString(), script, smartNasal)

    private fun refresh() {
        val ic = currentInputConnection
        if (buffer.isEmpty()) {
            suggestion.text = scriptLabel()
            completionRow.removeAllViews()
            return
        }
        val out = converted
        ic?.setComposingText(out, 1)
        val iast = PaliEngine.transliterate(buffer.toString(), PaliScript.ROMAN, smartNasal)
        val d = data
        populateCompletions(d, iast)
        val g = d?.lookup(iast)
        val line1 = if (g != null) {
            val zh = if (g.zh.isEmpty()) "" else " · ${g.zh}"
            "$out   ${g.en}$zh"
        } else out
        // compound (samāsa) split
        val compound = d?.splitCompound(iast, g?.key) ?: emptyList()
        val line1full = if (compound.isNotEmpty()) "$line1   ⊕ ${compound.joinToString(" + ")}" else line1
        // morphological split (prefix + root/word + ending)
        val split = d?.analyze(PaliData.toAkk(iast), 1)?.firstOrNull()?.let { a ->
            val pf = a.prefixes.joinToString("") { it.form + "-" }
            val end = a.ending?.let { " -" + it.end } ?: ""
            "$pf${a.stem.label}$end"
        }
        suggestion.text = if (split != null && split != out) "$line1full\n$split" else line1full
    }

    // Frequency-ranked whole-word completions, tappable to accept.
    private fun populateCompletions(d: PaliData?, iast: String) {
        completionRow.removeAllViews()
        if (d == null) return
        for (c in d.completeWord(iast, 8)) {
            val b = Button(this)
            b.text = c.first
            b.isAllCaps = false
            b.setOnClickListener { acceptCompletion(c.first) }
            completionRow.addView(b)
        }
    }
    // The engine accepts IAST input directly, so set the buffer to the lemma.
    private fun acceptCompletion(lemma: String) {
        buffer.setLength(0)
        buffer.append(lemma)
        refresh()
    }

    private fun commitWord() {
        currentInputConnection?.finishComposingText()
        buffer.setLength(0)
        suggestion.text = scriptLabel()
        completionRow.removeAllViews()
    }

    private fun cycleScript(b: Button) {
        val i = scripts.indexOfFirst { it.first == script }
        script = scripts[(i + 1) % scripts.size].first
        b.text = scriptLabel()
        refresh()
    }
    private fun scriptLabel() = scripts.first { it.first == script }.second

    private fun switchAway() {
        // Open the system keyboard picker so the user can switch IME.
        val imm = getSystemService(android.view.inputmethod.InputMethodManager::class.java)
        imm?.showInputMethodPicker()
    }

    override fun onFinishInput() {
        super.onFinishInput()
        buffer.setLength(0)
    }

    companion object {
        private const val MATCH = ViewGroup.LayoutParams.MATCH_PARENT
        private const val WRAP = ViewGroup.LayoutParams.WRAP_CONTENT
    }
}
