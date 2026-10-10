/** Browser interface-script capability; independent of the desktop login wire format. */
public final class OriginalMobileLayout {
    private static boolean enabled;
    private static boolean requested;
    public static void configure(boolean value) { enabled = value; requested = false; }
    public static boolean isMobile(boolean original) { return enabled || original; }
    public static boolean shouldUseResizable(boolean loginScreen, boolean resized) {
        return enabled && loginScreen && !resized;
    }
    public static boolean shouldAlignOrbNumbers(boolean loggedIn, int root) {
        return enabled && loggedIn && root == 601;
    }
    public static int orbNumberY(int orbHeight, int numberHeight) {
        return Math.max(0, (orbHeight - numberHeight) / 2);
    }
    public static boolean shouldRequest(boolean loggedIn, int root) {
        if (!loggedIn) { requested = false; return false; }
        if (!enabled || requested || root < 0 || root == 601) return false;
        requested = true;
        return true;
    }
}
