import org.rsmod.api.player.ui.OrbsInterfaceKt;

/** Run against the freshly built server JARs without starting the server. */
class VerifyOrbInterfaces {
    public static void main(String[] args) {
        check(false, false, "interface.orbs");
        check(false, true, "interface.orbs_nomap");
        check(true, false, "interface.orbs_osm");
        check(true, true, "interface.orbs_osm_nomap");
        System.out.println("PASS: desktop/mobile and expanded/collapsed orb interfaces");
    }

    private static void check(boolean mobile, boolean minimized, String expected) {
        String actual = OrbsInterfaceKt.selectOrbsInterface(mobile, minimized);
        if (!expected.equals(actual)) {
            throw new AssertionError("mobile=" + mobile + ", minimized=" + minimized + ": " + actual);
        }
    }
}
