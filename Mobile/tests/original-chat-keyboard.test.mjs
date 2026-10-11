import test from "node:test";
import assert from "node:assert/strict";
import {readFile,mkdtemp,mkdir,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {findTeaVmJdk} from "../scripts/build-teavm.mjs";

test("production chat keyboard action follows native widget visibility, bounds and chat toggle",async t=>{
    let jdk;
    try{jdk=findTeaVmJdk();}catch(error){t.skip(error.message);return;}
    const source=await readFile(new URL("../teavm-poc/engine-src/EngineBridge.java",import.meta.url),"utf8");
    const update=source.match(/private static void updateOriginalChatKeyboard\(net\.runelite\.api\.Client original\) \{[\s\S]*?\n    \}/)?.[0];
    const action=source.match(/public static int originalChatKeyboardActionAt\(int x,int y\) \{[\s\S]*?\n    \}/)?.[0];
    const fields=source.match(/private static (?:int|boolean) chatKeyboard[^;]+;/g);
    assert.ok(update&&action&&fields?.length===2);
    const target=await mkdtemp(join(tmpdir(),"soloscape-chat-keyboard-"));
    t.after(()=>rm(target,{recursive:true,force:true}));
    const sources={
        "net/runelite/api/GameState.java":"package net.runelite.api; public enum GameState {LOGGED_IN, LOGIN_SCREEN}",
        "org/soloscape/teavm/platform/awt/Rectangle.java":`package org.soloscape.teavm.platform.awt;
public class Rectangle {public int x=10,y=80,width=58,height=40;}`,
        "net/runelite/api/widgets/Widget.java":`package net.runelite.api.widgets;
public class Widget {
 public boolean hidden; public org.soloscape.teavm.platform.awt.Rectangle bounds=new org.soloscape.teavm.platform.awt.Rectangle();
 public boolean isHidden(){return hidden;} public org.soloscape.teavm.platform.awt.Rectangle getBounds(){return bounds;}
}`,
        "net/runelite/api/Client.java":`package net.runelite.api;
public interface Client {
 GameState getGameState(); int getTopLevelInterfaceId(); int getVarcIntValue(int id);
 net.runelite.api.widgets.Widget getWidget(int group,int child);
}`,
        "ChatKeyboardRegression.java":`public class ChatKeyboardRegression {
 static Object engine; ${fields.join("\n")} ${update} ${action}
 static class Client implements net.runelite.api.Client {
  int root=601,open=0; net.runelite.api.GameState state=net.runelite.api.GameState.LOGGED_IN;
  net.runelite.api.widgets.Widget button=new net.runelite.api.widgets.Widget();
  public net.runelite.api.GameState getGameState(){return state;}
  public int getTopLevelInterfaceId(){return root;}
  public int getVarcIntValue(int id){check(id==1226,"native chat toggle");return open;}
  public net.runelite.api.widgets.Widget getWidget(int group,int child){
   check(group==601&&child==48,"native chatting_button");return button;
  }
 }
 static void check(boolean ok,String message){if(!ok)throw new AssertionError(message);}
 public static void main(String[] args){
  Client c=new Client();engine=c;updateOriginalChatKeyboard(c);
  check(originalChatKeyboardActionAt(10,80)==1,"opens at native button top-left");
  check(originalChatKeyboardActionAt(67,119)==1,"opens inside native bounds");
  check(originalChatKeyboardActionAt(68,80)==0&&originalChatKeyboardActionAt(10,120)==0,"excludes adjacent UI");
  c.open=1;updateOriginalChatKeyboard(c);check(originalChatKeyboardActionAt(20,90)==2,"native close toggle");
  c.button.bounds.x=200;updateOriginalChatKeyboard(c);
  check(originalChatKeyboardActionAt(20,90)==0&&originalChatKeyboardActionAt(220,90)==2,"rotation follows live bounds");
  c.button.hidden=true;updateOriginalChatKeyboard(c);check(originalChatKeyboardActionAt(220,90)==0,"hidden ancestor or button");
  c.button.hidden=false;c.button.bounds.width=0;updateOriginalChatKeyboard(c);
  check(originalChatKeyboardActionAt(220,90)==0,"empty bounds");
  c.button=null;updateOriginalChatKeyboard(c);check(originalChatKeyboardActionAt(220,90)==0,"missing widget");
  c.root=161;updateOriginalChatKeyboard(c);check(originalChatKeyboardActionAt(220,90)==0,"desktop isolated");
  c.state=net.runelite.api.GameState.LOGIN_SCREEN;check(originalChatKeyboardActionAt(220,90)==0,"login isolated");
 }
}`
    };
    const paths=[];
    for(const [name,source] of Object.entries(sources)){
        const path=join(target,name);await mkdir(join(path,".."),{recursive:true});
        await writeFile(path,source);paths.push(path);
    }
    const javac=jdk.home?join(jdk.home,"bin",process.platform==="win32"?"javac.exe":"javac"):"javac";
    const compiled=spawnSync(javac,["-d",target,...paths],{encoding:"utf8"});
    assert.equal(compiled.status,0,compiled.stderr||compiled.error?.message);
    const run=spawnSync(jdk.binary,["-cp",target,"ChatKeyboardRegression"],{encoding:"utf8"});
    assert.equal(run.status,0,run.stderr||run.error?.message);
});
