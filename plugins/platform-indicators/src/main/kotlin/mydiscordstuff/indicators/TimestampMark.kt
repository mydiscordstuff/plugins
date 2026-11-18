package mydiscordstuff.indicators

internal object TimestampMark {
    // Device order matches the web, desktop and mobile presence data in index.js.
    val pattern = Regex("\u2063\u2062\u2063([\uFE00-\uFE05]{5})\u2063")
    val palette = intArrayOf(0, 0xFFC93A55.toInt(), 0xFF37B875.toInt(),
        0xFFE5A42E.toInt(), 0xFFED4351.toInt(), 0xFF9196A5.toInt())
}
