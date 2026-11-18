#!/usr/bin/env bash
# Offline build. The SDK and compilers are provided by the Android runner.
set -euo pipefail
src="$(cd "$(dirname "$0")" && pwd)"
out="${1:?pass an output directory}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$out" "$work/host"
android="${ANDROID_HOME:?Android SDK required}/platforms/android-36/android.jar"
d8="$ANDROID_HOME/build-tools/36.0.0/d8"
javac --release 8 -proc:none -d "$work/host" "$src"/compileOnly/*.java
kotlinc "$src"/compileOnly/*.kt -jvm-target 1.8 -d "$work/host-api.jar"
kotlinc "$src/main/kotlin" -jvm-target 1.8 -Xlambdas=class \
  -classpath "$android:$work/host:$work/host-api.jar" -d "$work/plugin-classes.jar"
node "$src/test/row.cjs" > "$work/timestamp.txt"
kotlinc "$src/main/kotlin/mydiscordstuff/indicators/TimestampMark.kt" \
  "$src/test/CheckTimestamp.kt" -d "$work/check.jar"
kotlin -classpath "$work/check.jar" mydiscordstuff.indicators.CheckTimestampKt "$work/timestamp.txt"
# Only our implementation is a program input. Android, Xposed and Valenced are provided by the host.
kotlin_lib="$(dirname "$(dirname "$(readlink -f "$(command -v kotlinc)")")")/lib"
"$d8" --min-api 24 --lib "$android" --classpath "$work/host" \
  --classpath "$work/host-api.jar" --classpath "$kotlin_lib/kotlin-stdlib.jar" \
  --output "$out/plugin.jar" "$work/plugin-classes.jar"
