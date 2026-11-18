package de.robv.android.xposed;

import java.lang.reflect.Member;

public final class XposedBridge {
    public static native XC_MethodHook.Unhook hookMethod(Member method, XC_MethodHook callback);
}
