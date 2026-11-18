package app.valenced.xposed.api

// Public JVM signatures from Valenced's android/api HostScope.kt. The host
// supplies their implementations. build-native.sh excludes this source set from DEX.
interface HostScope { val classLoader: ClassLoader }
external fun HostScope.registerNativeMethod(name: String, handler: (List<Any?>) -> Any?)
