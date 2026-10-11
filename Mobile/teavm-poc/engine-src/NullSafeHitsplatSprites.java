/**
 * Browser-only guard for optional combat hitsplat sprite segments.
 *
 * The pinned rev-240 gamepack's au.as actor overlay routine assumes every
 * sprite referenced by the hit-splat definition is available. When a segment
 * is absent, TeaVM's emitted .aa field read throws a raw JavaScript TypeError,
 * ending the original game loop. Treat an unavailable segment as zero width /
 * offset and skip only that sprite draw; all present sprites still execute the
 * game's original ym.av/ym.am software drawing methods.
 *
 * Never synthesize scenery, sprite pixels, hitsplat values, or gameplay state.
 * This helper is called only from the single ASM-scoped hitsplat draw routine.
 */
public final class NullSafeHitsplatSprites {
    private NullSafeHitsplatSprites() { }
    public static int offsetX(ym sprite) { return sprite == null ? 0 : sprite.aa; }
    public static int width(ym sprite) { return sprite == null ? 0 : sprite.ax; }
    public static int height(ym sprite) { return sprite == null ? 0 : sprite.ac; }
    public static void draw(ym sprite, int x, int y) {
        if (sprite != null) sprite.av(x, y);
    }
    public static void drawAlpha(ym sprite, int x, int y, int alpha) {
        if (sprite != null) sprite.am(x, y, alpha);
    }
}
