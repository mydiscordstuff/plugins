package mydiscordstuff.indicators

import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.ImageSpan
import android.widget.TextView
import java.util.WeakHashMap
import kotlin.math.roundToInt

internal class TimestampIcons {
    private val ownRange = Any()
    private val visible = WeakHashMap<TextView, Boolean>()
    @Volatile var bitmaps: List<Bitmap> = emptyList()

    fun bind(view: TextView) {
        val original = view.text ?: return
        val match = TimestampMark.pattern.find(original) ?: return
        val icons = bitmaps
        val text = SpannableStringBuilder(original)
        val start = match.range.first
        text.delete(start, match.range.last + 1)
        var end = start
        if (icons.size == 5) {
            val size = view.textSize.roundToInt().coerceAtLeast(1)
            for ((device, selector) in match.groupValues[1].withIndex()) {
                val color = selector.code - 0xFE00
                if (color == 0) continue
                val drawable = BitmapDrawable(view.resources, icons[device]).mutate()
                drawable.setTint(TimestampMark.palette[color])
                drawable.setBounds(0, 0, size, size)
                text.insert(end, "\u00a0\uFFFC")
                text.setSpan(ImageSpan(drawable, ImageSpan.ALIGN_BASELINE), end + 1, end + 2,
                    Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                end += 2
            }
        }
        if (end > start) {
            text.setSpan(ownRange, start, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
            visible[view] = true
        }
        view.text = text
    }

    fun clearViews() {
        for (view in visible.keys.toList()) {
            val text = view.text as? Spanned ?: continue
            val start = text.getSpanStart(ownRange)
            if (start >= 0) view.text = SpannableStringBuilder(text).delete(start, text.getSpanEnd(ownRange))
        }
        visible.clear()
    }
}
