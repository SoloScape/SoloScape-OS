import net.runelite.api.Client;
import net.runelite.api.GameState;
import net.runelite.api.SpritePixels;
import org.soloscape.teavm.platform.awt.Graphics;

/**
 * Native revision-240 mobile click indicator, sourced from index 8 archive
 * 1625 (CLICKCIRCLE_FILLED), not procedurally reconstructed artwork.
 *
 * The original Java client owns click classification, click location and the
 * 400ms native cross lifetime. Draw 20 genuine expanding animation frames
 * instead of down-sampling to the four desktop cross sprite slots. Desktop
 * clients continue to use the original untouched cross assets.
 */
public final class OriginalMobileTapIndicators {
    // The atlas is extracted byte-for-byte from index 8 group 1625 at build
    // authoring time and served as a 2560x64 PNG. This avoids depending on
    // whether the game JS5 pipeline has requested a *mobile-only* group.
    private static final int FRAMES_PER_COLOR=20;
    private static final int ORIGINAL_CROSS_SIZE=16;
    private static boolean touchEnabled;
    private static SpritePixels[] hiddenNativeCrosses;

    private OriginalMobileTapIndicators() {}

    public static void configure(boolean touch) {
        touchEnabled=touch;
        hiddenNativeCrosses=null;
    }

    static int nativeFrame(int crossColor,int crossAge) {
        if(crossColor!=1&&crossColor!=2)return -1;
        if(crossAge<0||crossAge>=400)return -1;
        // Original crossSprites use crossAge / 100; the OSRS Mobile sprite
        // archive has 20 real frames per 400ms native cross animation.
        int phase=Math.min(FRAMES_PER_COLOR-1,crossAge/20);
        return (crossColor==2?FRAMES_PER_COLOR:0)+phase;
    }

    public static void update(Client original) {
        if(!touchEnabled||original==null||original.getGameState()!=GameState.LOGGED_IN)
            return;
        // Suppress *only* the original desktop X. Do not change the encoded
        // click state or its network/menu handling: this overlay uses them.
        SpritePixels[] cross=original.getCrossSprites();
        if(cross==null||cross.length<8)return;
        if(hiddenNativeCrosses!=null&&cross[0]==hiddenNativeCrosses[0] &&
            cross[7]==hiddenNativeCrosses[7])return;
        for(int i=0;i<8;i++)if(cross[i]==null)return;
        SpritePixels[] hidden=new SpritePixels[8];
        for(int i=0;i<8;i++) {
            hidden[i]=new ym(new int[ORIGINAL_CROSS_SIZE*ORIGINAL_CROSS_SIZE],
                ORIGINAL_CROSS_SIZE,ORIGINAL_CROSS_SIZE);
            cross[i]=hidden[i];
        }
        hiddenNativeCrosses=hidden;
    }

    /** Called after the original software framebuffer is presented. */
    public static void draw(Graphics graphics,Client original,int offsetX,int offsetY) {
        if(!touchEnabled||graphics==null||original==null||
            original.getGameState()!=GameState.LOGGED_IN)return;
        update(original);
        if(hiddenNativeCrosses==null)return;

        // These pinned revision-240 obfuscated fields and their decoder
        // multipliers are the SAME ones used by the original cross renderer.
        final int color=client.mm*-2032519679;
        if(color==2&&OriginalMobileInteractHighlight.replacesNpcMarker())return;
        final int age=client.my*1069629167;
        final int index=nativeFrame(color,age);
        if(index<0)return;
        final int x=client.mv*427421377;
        final int y=client.mc*408682907;
        // Sprite atlas frames are 64x64 centered on the original coordinates.
        // The extracted atlas preserves every exact palette pixel and
        // original per-frame transparency/offset, so no fake geometry exists.
        int alpha=255-Math.min(255,(age*255)/400);
        if(alpha<=0)return;
        graphics.drawOriginalTouchCacheFrame(x+offsetX,y+offsetY,index,alpha);
    }
}
