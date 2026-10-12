/*
 * Copyright (c) 2021, Adam <Adam@sigterm.info>
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import net.runelite.api.Actor;
import net.runelite.api.Client;
import net.runelite.api.GameState;
import net.runelite.api.MenuAction;
import net.runelite.api.NPC;
import net.runelite.api.events.InteractingChanged;
import net.runelite.api.events.MenuOptionClicked;
import net.runelite.api.events.NpcDespawned;
import org.soloscape.teavm.platform.awt.Color;

/** NPC interaction portion of RuneLite Interact Highlight, hosted without the
 * desktop dependency injection/event bus. Never consumes or changes an action.
 * Draws the actual animated Java model silhouette in the software scene buffer.
 */
public final class OriginalMobileInteractHighlight {
    private static boolean enabled;
    private static NPC target;
    private static int clickTick,clickCycle;
    private static boolean npcClick;
    private static OriginalNpcOutlineRenderer renderer;
    private OriginalMobileInteractHighlight() {}

    public static void configure(boolean value) {
        enabled=value;
        clear();
        renderer=null;
    }
    private static void clear(){target=null;npcClick=false;}

    public static void post(Object event,Client original) {
        if(!enabled||original==null||original.getGameState()!=GameState.LOGGED_IN) {
            clear();
            return;
        }
        if(event instanceof MenuOptionClicked) {
            MenuOptionClicked click=(MenuOptionClicked)event;
            switch(click.getMenuAction()) {
                case ITEM_USE_ON_NPC:
                case WIDGET_TARGET_ON_NPC:
                case NPC_FIRST_OPTION:
                case NPC_SECOND_OPTION:
                case NPC_THIRD_OPTION:
                case NPC_FOURTH_OPTION:
                case NPC_FIFTH_OPTION:
                    target=click.getMenuEntry().getNpc();
                    npcClick=target!=null;
                    clickTick=original.getTickCount();
                    clickCycle=original.getGameCycle();
                    break;
                case WALK:
                case ITEM_USE:
                case WIDGET_TARGET_ON_WIDGET:
                case ITEM_USE_ON_GROUND_ITEM:
                case WIDGET_TARGET_ON_GROUND_ITEM:
                case ITEM_USE_ON_PLAYER:
                case WIDGET_TARGET_ON_PLAYER:
                case ITEM_FIRST_OPTION:
                case ITEM_SECOND_OPTION:
                case ITEM_THIRD_OPTION:
                case ITEM_FOURTH_OPTION:
                case ITEM_FIFTH_OPTION:
                case GROUND_ITEM_FIRST_OPTION:
                case GROUND_ITEM_SECOND_OPTION:
                case GROUND_ITEM_THIRD_OPTION:
                case GROUND_ITEM_FOURTH_OPTION:
                case GROUND_ITEM_FIFTH_OPTION:
                case ITEM_USE_ON_GAME_OBJECT:
                case WIDGET_TARGET_ON_GAME_OBJECT:
                case GAME_OBJECT_FIRST_OPTION:
                case GAME_OBJECT_SECOND_OPTION:
                case GAME_OBJECT_THIRD_OPTION:
                case GAME_OBJECT_FOURTH_OPTION:
                case GAME_OBJECT_FIFTH_OPTION:
                    clear();
                    break;
                default: break;
            }
        } else if(event instanceof InteractingChanged) {
            InteractingChanged changed=(InteractingChanged)event;
            if(changed.getSource()==original.getLocalPlayer()&&original.getTickCount()>clickTick) {
                Actor actor=changed.getTarget();
                target=actor instanceof NPC?(NPC)actor:null;
            }
        } else if(event instanceof NpcDespawned&&((NpcDespawned)event).getNpc()==target) {
            clear();
        }
    }

    /** Only replaces the marker for the clicked NPC, never other red actions. */
    public static boolean replacesNpcMarker(){return enabled&&npcClick;}

    static Color clickColor(int elapsed) {
        // RuneLite's default yellow -> white flash -> translucent red (10 cycles).
        int start=elapsed<5?0x90ffff00:0x90ffffff;
        int end=elapsed<5?0x90ffffff:0x90ff0000;
        float t=Math.max(0,Math.min(1,(elapsed<5?elapsed:elapsed-5)/5f));
        int r=(int)(((start>>>16)&255)*(1-t)+((end>>>16)&255)*t);
        int g=(int)(((start>>>8)&255)*(1-t)+((end>>>8)&255)*t);
        int b=(int)((start&255)*(1-t)+(end&255)*t);
        return new Color(0x90000000|(r<<16)|(g<<8)|b,true);
    }

    /** Scene callback runs before interfaces, so the outline stays below UI. */
    public static void draw(Client original) {
        if(!enabled||original==null||original.getGameState()!=GameState.LOGGED_IN) {
            clear();return;
        }
        if(target==null)return;
        if(renderer==null)renderer=new OriginalNpcOutlineRenderer(original);
        renderer.drawOutline(target,2,clickColor(original.getGameCycle()-clickCycle),4);
    }
}
