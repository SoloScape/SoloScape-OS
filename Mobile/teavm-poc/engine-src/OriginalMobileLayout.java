/** Browser interface-script capability; independent of the desktop login wire format. */
public final class OriginalMobileLayout {
    private static boolean enabled;
    private static boolean requested;
    public static void configure(boolean value) { enabled = value; requested = false; }
    public static boolean isMobile(boolean original) { return enabled || original; }
    public static boolean shouldUseResizable(boolean loginScreen, boolean resized) {
        return shouldUseResizable(loginScreen, false, resized);
    }
    /** A settings change may reset the desktop window flag after login. */
    public static boolean shouldUseResizable(boolean loginScreen, boolean loggedIn, boolean resized) {
        return enabled && (loginScreen || loggedIn) && !resized;
    }
    public static boolean shouldRequest(boolean loggedIn, int root) {
        if (!loggedIn) { requested = false; return false; }
        if (!enabled || root < 0) return false;
        // Once mobile root 601 has appeared, a later desktop root needs a new
        // mobileui request. FPS/graphics settings can replace the root without
        // logging out, so the original once-per-login guard was too strict.
        if (root == 601) { requested = false; return false; }
        if (requested) return false;
        requested = true;
        return true;
    }
}
