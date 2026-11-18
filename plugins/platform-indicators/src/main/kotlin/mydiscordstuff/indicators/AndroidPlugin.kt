@file:JvmName("AndroidPlugin")

package mydiscordstuff.indicators

import android.graphics.BitmapFactory
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import android.view.View
import android.widget.TextView
import app.valenced.plugins.plugin
import app.valenced.xposed.api.registerNativeMethod
import de.robv.android.xposed.XC_MethodHook
import de.robv.android.xposed.XposedBridge
import java.lang.reflect.Modifier

private const val TAG = "PlatformIndicators"
private const val CONFIGURE = "mydiscordstuff.platform-indicators.configureTimestamps"

@Suppress("unused")
val indicators = plugin {
    var hooks = emptyList<XC_MethodHook.Unhook>()
    var active: TimestampIcons? = null
    start {
        val renderer = TimestampIcons()
        active = renderer
        val installed = runCatching {
            val rowClass = classLoader.loadClass("com.discord.chat.presentation.message.MessageView")
            val methods = rowClass.declaredMethods.filter {
                !Modifier.isStatic(it.modifiers) &&
                    it.parameterTypes.firstOrNull()?.name == "com.discord.chat.bridge.Message"
            }
            // setMessage binds recycled rows too. Older builds may expose only configureAuthor.
            val binders = listOf("setMessage", "configureAuthor").firstNotNullOfOrNull { name ->
                methods.filter { it.name.substringBefore('-') == name }.takeIf { it.isNotEmpty() }
            }.orEmpty()
            check(binders.isNotEmpty()) { "No supported Android message-header binder found" }
            var timestampId = 0
            val hook = object : XC_MethodHook() {
                override fun afterHookedMethod(param: MethodHookParam) {
                    if (param.hasThrowable()) return
                    val row = param.thisObject as? View ?: return
                    if (timestampId == 0) {
                        val res = row.resources
                        timestampId = res.getIdentifier("timestamp", "id", row.context.packageName)
                        if (timestampId == 0) timestampId = res.getIdentifier("timestamp", "id", "com.discord")
                    }
                    val time = row.findViewById<View>(timestampId) as? TextView ?: return
                    if (time.visibility == View.VISIBLE) renderer.bind(time)
                }
            }
            for (method in binders) hooks = hooks + XposedBridge.hookMethod(method, hook)
            true
        }.getOrElse {
            hooks.forEach { handle -> handle.unhook() }
            hooks = emptyList()
            Log.w(TAG, "Android timestamp icons unavailable", it)
            false
        }
        registerNativeMethod(CONFIGURE) { args ->
            if (!installed || args.size != 5 || active !== renderer) false
            else {
                val icons = args.mapNotNull { value ->
                    val uri = value as? String ?: return@mapNotNull null
                    if (!uri.startsWith("data:image/png;base64,")) return@mapNotNull null
                    val bytes = Base64.decode(uri.substringAfter(','), Base64.DEFAULT)
                    BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                }
                if (icons.size == 5) renderer.bitmaps = icons
                icons.size == 5
            }
        }
    }
    stop {
        hooks.forEach { it.unhook() }
        hooks = emptyList()
        val previous = active
        active = null
        previous?.bitmaps = emptyList()
        Handler(Looper.getMainLooper()).post { previous?.clearViews() }
    }
}
