@file:JvmName("AndroidPlugin")

package mydiscordstuff.radar

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import app.valenced.plugins.plugin
import app.valenced.xposed.api.registerNativeMethod

private const val CHANNEL = "mydiscordstuff.user-radar.activity.v1"
private const val BRIDGE = "mydiscordstuff.user-radar"
@Volatile private var app: Context? = null

private fun manager(ctx: Context): NotificationManager =
    ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

private fun state(ctx: Context): String {
    val notifications = manager(ctx)
    if (Build.VERSION.SDK_INT >= 26) {
        if (notifications.getNotificationChannel(CHANNEL) == null) {
            notifications.createNotificationChannel(NotificationChannel(
                CHANNEL, "UserRadar", NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Alertas de atividade escolhidos no UserRadar" })
        }
    }
    if (!notifications.areNotificationsEnabled()) return "app-blocked"
    if (Build.VERSION.SDK_INT >= 26 &&
        notifications.getNotificationChannel(CHANNEL)?.importance == NotificationManager.IMPORTANCE_NONE
    ) return "channel-blocked"
    return "ready"
}

@Suppress("DEPRECATION")
private fun post(ctx: Context, args: List<Any?>): String {
    val status = state(ctx)
    if (status != "ready") return status
    val title = (args.getOrNull(0) as? String)?.take(96) ?: return "invalid"
    val body = (args.getOrNull(1) as? String)?.take(256) ?: return "invalid"
    val tag = (args.getOrNull(2) as? String)?.take(64) ?: return "invalid"
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(ctx, CHANNEL)
                  else Notification.Builder(ctx).setPriority(Notification.PRIORITY_HIGH)
                      .setDefaults(Notification.DEFAULT_ALL)
    builder.setSmallIcon(android.R.drawable.ic_popup_reminder)
        .setContentTitle(title).setContentText(body).setShowWhen(true)
        .setAutoCancel(true).setCategory(Notification.CATEGORY_SOCIAL)
        .setVisibility(Notification.VISIBILITY_PRIVATE)
    ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)?.let { launch ->
        builder.setContentIntent(PendingIntent.getActivity(ctx, 0, launch,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
    }
    // A separate tag per watched user prevents an unbounded pile of notifications.
    return try {
        manager(ctx).notify("$BRIDGE.$tag", 1, builder.build())
        "sent"
    } catch (_: SecurityException) { "app-blocked" }
}

private fun openSettings(ctx: Context): Boolean {
    val status = state(ctx)
    val details = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        Uri.fromParts("package", ctx.packageName, null))
    val intent = when {
        Build.VERSION.SDK_INT < 26 -> details
        status == "app-blocked" -> Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName)
        else -> Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, ctx.packageName)
            .putExtra(Settings.EXTRA_CHANNEL_ID, CHANNEL)
    }
    return listOf(intent, details).distinct().any {
        runCatching { ctx.startActivity(it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }.isSuccess
    }
}

val userRadar = plugin {
    start {
        withAppContext { app = it.applicationContext }
        registerNativeMethod("$BRIDGE.state") { app?.let(::state) ?: "unavailable" }
        registerNativeMethod("$BRIDGE.notify") { args -> app?.let { post(it, args) } ?: "unavailable" }
        registerNativeMethod("$BRIDGE.settings") { app?.let(::openSettings) ?: false }
    }
    stop { app = null }
}
