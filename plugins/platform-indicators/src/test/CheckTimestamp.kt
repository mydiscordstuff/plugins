package mydiscordstuff.indicators

fun main(args: Array<String>) {
    val encoded = java.io.File(args.single()).readText()
    val mark = checkNotNull(TimestampMark.pattern.find(encoded))
    check(mark.range.first == "17:06".length)
    check(mark.groupValues[1].map { it.code - 0xFE00 } == listOf(2, 0, 4, 0, 0))
    check(encoded.removeRange(mark.range) == "17:06")
    check(TimestampMark.palette[4] == 0xFFED4351.toInt())
    check(TimestampMark.pattern.find("20:53") == null)
}
