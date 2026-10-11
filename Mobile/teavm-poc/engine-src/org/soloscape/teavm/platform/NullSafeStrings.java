package org.soloscape.teavm.platform;

/**
 * Null-safe action comparison used only for the pinned rev-240 client's
 * optional NPC menu entries. Null means that action slot is absent.
 *
 * Keep the original engine's menu ordering, renderer and protocol untouched.
 */
public final class NullSafeStrings {
    private NullSafeStrings() {}

    public static boolean equalsIgnoreCase(String value, String expected) {
        return value != null && value.equalsIgnoreCase(expected);
    }
}
