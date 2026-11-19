package app.valenced.xposed.api

import android.app.Activity
import android.content.Context

// Compile-only signatures. Valenced supplies the implementation at runtime.
interface HostScope {
    fun withAppContext(block: (Context) -> Unit)
    fun withAppActivity(block: (Activity) -> Unit)
}
external fun HostScope.registerNativeMethod(name: String, handler: (List<Any?>) -> Any?)
