import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import {resolve,join,delimiter} from "node:path";
import {fileURLToPath} from "node:url";
import {spawnSync} from "node:child_process";
import {findTeaVmJdk} from "../scripts/build-teavm.mjs";

test("original NPC outlines project real animated model faces, clip pixels and clear interaction state",t=>{
    const root=fileURLToPath(new URL("../",import.meta.url));
    const manifest=JSON.parse(readFileSync(join(root,"openosrs-reference.json")));
    const reference=resolve(process.env.SOLOSCAPE_OPENOSRS_ROOT||resolve(root,manifest.localDefault));
    const api=resolve(process.env.SOLOSCAPE_OPENOSRS_API||join(reference,`runelite-api/build/libs/runelite-api-${manifest.version}.jar`));
    if(!existsSync(api)){t.skip("Pinned RuneLite API jar unavailable");return;}
    let jdk;
    try{jdk=findTeaVmJdk();}catch(error){t.skip(error.message);return;}
    const dir=mkdtempSync(join(tmpdir(),"soloscape-interact-highlight-"));
    t.after(()=>rmSync(dir,{recursive:true,force:true}));
    const fixture=join(dir,"HighlightProof.java");
    writeFileSync(fixture,`
import java.lang.reflect.*;
import java.util.*;
import net.runelite.api.*;
import net.runelite.api.coords.LocalPoint;
import net.runelite.api.events.*;
import org.soloscape.teavm.platform.awt.Color;
public class HighlightProof {
 static void check(boolean value){if(!value)throw new AssertionError();}
 static <T> T mock(Class<T> type,Map<String,Object> values){
  return type.cast(Proxy.newProxyInstance(type.getClassLoader(),new Class[]{type},(p,m,a)->{
   if(m.getName().equals("equals"))return p==a[0];
   if(m.getName().equals("hashCode"))return System.identityHashCode(p);
   if(values.containsKey(m.getName()))return values.get(m.getName());
   Class<?> r=m.getReturnType();
   if(r==boolean.class)return false;if(r==int.class)return 0;
   if(r==long.class)return 0L;if(r==float.class)return 0f;
   if(r==double.class)return 0d;return null;
  }));
 }
 static MenuOptionClicked click(MenuAction action,NPC npc){
  Map<String,Object> entry=new HashMap<>();entry.put("getType",action);entry.put("getNpc",npc);
  return new MenuOptionClicked(mock(MenuEntry.class,entry));
 }
 public static void main(String[] args){
  int[] pixels=new int[256*256];
  Map<String,Object> buffer=new HashMap<>();
  buffer.put("getPixels",pixels);buffer.put("getWidth",256);buffer.put("getHeight",256);
  Map<String,Object> world=new HashMap<>();world.put("isTopLevel",true);
  world.put("getSizeX",104);world.put("getSizeY",104);
  world.put("getTileHeights",new int[4][105][105]);world.put("getTileSettings",new byte[4][104][104]);
  WorldView wv=mock(WorldView.class,world);
  Map<String,Object> state=new HashMap<>();
  state.put("getGameState",GameState.LOGGED_IN);state.put("getViewportWidth",200);
  state.put("getViewportHeight",200);state.put("getViewportXOffset",20);state.put("getViewportYOffset",20);
  state.put("getCameraX",1000);state.put("getCameraY",0);state.put("getCameraZ",0);
  state.put("getScale",512);state.put("getTopLevelWorldView",wv);state.put("getWorldView",wv);
  state.put("getBufferProvider",mock(MainBufferProvider.class,buffer));state.put("getGameCycle",100);state.put("getTickCount",1);
  Player player=mock(Player.class,new HashMap<>());state.put("getLocalPlayer",player);
  Client client=mock(Client.class,state);
  Map<String,Object> geometry=new HashMap<>();
  geometry.put("getVerticesCount",3);geometry.put("getVerticesX",new float[]{-30,30,0});
  geometry.put("getVerticesY",new float[]{-60,-60,0});geometry.put("getVerticesZ",new float[]{0,0,0});
  geometry.put("getFaceCount",1);geometry.put("getFaceIndices1",new int[]{1});
  geometry.put("getFaceIndices2",new int[]{0});geometry.put("getFaceIndices3",new int[]{2});
  geometry.put("getFaceColors3",new int[]{1});
  Map<String,Object> npcState=new HashMap<>();npcState.put("getLocalLocation",new LocalPoint(1000,1000));
  npcState.put("getModel",mock(Model.class,geometry));NPC npc=mock(NPC.class,npcState);
  OriginalMobileInteractHighlight.configure(true);
  for(MenuAction action:new MenuAction[]{MenuAction.NPC_FIRST_OPTION,MenuAction.NPC_SECOND_OPTION,
    MenuAction.NPC_THIRD_OPTION,MenuAction.NPC_FOURTH_OPTION,MenuAction.NPC_FIFTH_OPTION,
    MenuAction.ITEM_USE_ON_NPC,MenuAction.WIDGET_TARGET_ON_NPC}){
   OriginalMobileInteractHighlight.post(click(action,npc),client);
   check(OriginalMobileInteractHighlight.replacesNpcMarker());
  }
  OriginalMobileInteractHighlight.draw(client);
  int painted=0;
  for(int i=0;i<pixels.length;i++)if(pixels[i]!=0){
   painted++;int x=i%256,y=i/256;check(x>=20&&x<220&&y>=20&&y<220);
  }
  check(painted>0);int[] before=pixels.clone();Arrays.fill(pixels,0);
  geometry.put("getVerticesX",new float[]{-60,60,0});
  OriginalMobileInteractHighlight.draw(client);check(!Arrays.equals(before,pixels));
  check(OriginalMobileInteractHighlight.clickColor(0).getRGB()==0x90ffff00);
  check(OriginalMobileInteractHighlight.clickColor(5).getRGB()==0x90ffffff);
  check(OriginalMobileInteractHighlight.clickColor(10).getRGB()==0x90ff0000);
  check(OriginalMobileInteractHighlight.clickColor(100).getRGB()==0x90ff0000);
  OriginalMobileInteractHighlight.post(click(MenuAction.WALK,null),client);
  check(!OriginalMobileInteractHighlight.replacesNpcMarker());Arrays.fill(pixels,0);
  OriginalMobileInteractHighlight.draw(client);check(Arrays.equals(pixels,new int[pixels.length]));
  OriginalMobileInteractHighlight.post(click(MenuAction.NPC_FIRST_OPTION,npc),client);
  state.put("getTickCount",2);
  OriginalMobileInteractHighlight.post(new InteractingChanged(player,null),client);
  Arrays.fill(pixels,0);OriginalMobileInteractHighlight.draw(client);
  check(Arrays.equals(pixels,new int[pixels.length]));
  OriginalMobileInteractHighlight.post(click(MenuAction.NPC_SECOND_OPTION,npc),client);
  OriginalMobileInteractHighlight.post(new NpcDespawned(npc),client);
  check(!OriginalMobileInteractHighlight.replacesNpcMarker());
  OriginalMobileInteractHighlight.post(click(MenuAction.NPC_FIRST_OPTION,npc),client);
  state.put("getGameState",GameState.LOGIN_SCREEN);OriginalMobileInteractHighlight.draw(client);
  check(!OriginalMobileInteractHighlight.replacesNpcMarker());
  state.put("getGameState",GameState.LOGGED_IN);OriginalMobileInteractHighlight.configure(false);
  OriginalMobileInteractHighlight.post(click(MenuAction.NPC_SECOND_OPTION,npc),client);
  check(!OriginalMobileInteractHighlight.replacesNpcMarker());
  System.out.println("PASS animated silhouettes, viewport clipping, click colors, NPC menu actions, walk/end/despawn/logout clears");
 }
}
`);
    const sources=["OriginalMobileInteractHighlight.java","OriginalNpcOutlineRenderer.java","IntBlockBuffer.java",
        "org/soloscape/teavm/platform/awt/Color.java"].map(file=>join(root,"teavm-poc/engine-src",file));
    const javac=jdk.home?join(jdk.home,"bin",process.platform==="win32"?"javac.exe":"javac"):"javac";
    const compile=spawnSync(javac,["-cp",api,"-d",dir,...sources,fixture],{encoding:"utf8"});
    assert.equal(compile.status,0,compile.stderr||compile.error?.message);
    const run=spawnSync(jdk.binary,["-cp",dir+delimiter+api,"HighlightProof"],{encoding:"utf8"});
    assert.equal(run.status,0,run.stderr||run.error?.message);
    assert.match(run.stdout,/PASS animated silhouettes/);
});
