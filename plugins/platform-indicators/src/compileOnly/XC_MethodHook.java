package de.robv.android.xposed;

// Compile-only signatures of Xposed API 82. The runtime classes come from Valenced.
public abstract class XC_MethodHook {
    public static final class MethodHookParam {
        public Object thisObject;
        public native boolean hasThrowable();
    }
    public class Unhook { public native void unhook(); }
    protected void afterHookedMethod(MethodHookParam param) throws Throwable {}
}
