#!/usr/bin/env bash
set -euo pipefail
src="$(cd "$(dirname "$0")" && pwd)"
out="${1:?pass an output directory}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$out"
android="${ANDROID_HOME:?Android SDK required}/platforms/android-36/android.jar"
d8="$ANDROID_HOME/build-tools/36.0.0/d8"
node --test "$src/test/radar.cjs"
kotlinc "$src"/compileOnly/*.kt -classpath "$android" -jvm-target 1.8 -d "$work/host-api.jar"
kotlinc "$src/main/kotlin" -classpath "$android:$work/host-api.jar" \
  -jvm-target 1.8 -Xlambdas=class -d "$work/plugin-classes.jar"
kotlin_lib="$(dirname "$(dirname "$(readlink -f "$(command -v kotlinc)")")")/lib"
"$d8" --min-api 24 --lib "$android" --classpath "$work/host-api.jar" \
  --classpath "$kotlin_lib/kotlin-stdlib.jar" --output "$out/plugin.jar" "$work/plugin-classes.jar"
