// MainActivity.kt — minimal launcher: explains how to enable the keyboard and
// opens the system input-method settings.

package org.pali.ime

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        }
        root.addView(TextView(this).apply {
            text = "Pali Keyboard\n\nType romanized Pali (Velthuis) → get Pali script.\n\n" +
                "1) Enable “Pali (Velthuis)” in keyboard settings.\n" +
                "2) Switch to it from any text field (🌐).\n" +
                "3) The bar shows the converted Pali + its meaning."
            textSize = 16f
        })
        root.addView(Button(this).apply {
            text = "Open keyboard settings"
            setOnClickListener { startActivity(Intent(Settings.ACTION_INPUT_METHOD_SETTINGS)) }
        })
        setContentView(root)
    }
}
