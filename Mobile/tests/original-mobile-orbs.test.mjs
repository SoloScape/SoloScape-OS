import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {findTeaVmJdk} from "../scripts/build-teavm.mjs";

test("production mobile orb alignment moves only four number labels and tolerates missing widgets",async t=>{
    let jdk;
    try{jdk=findTeaVmJdk();}catch(error){t.skip(error.message);return;}
    const source=await readFile(new URL("../teavm-poc/engine-src/EngineBridge.java",import.meta.url),"utf8");
    const method=source.match(/(private static void alignOriginalMobileOrbNumbers\(net\.runelite\.api\.Client original\) \{[\s\S]*?\n    \})/)?.[1];
    const children=source.match(/private static final int\[\] mobileOrbNumberChildren = [^;]+;/)?.[0];
    assert.ok(method&&children,"execute the production alignment method and widget IDs");
    const target=mkdtempSync(join(tmpdir(),"soloscape-mobile-orbs-"));
    t.after(()=>rmSync(target,{recursive:true,force:true}));
    const api=join(target,"net/runelite/api");
    const widgets=join(api,"widgets");mkdirSync(widgets,{recursive:true});
    writeFileSync(join(api,"Client.java"),"package net.runelite.api; public interface Client { net.runelite.api.widgets.Widget getWidget(int group,int child); }");
    writeFileSync(join(widgets,"Widget.java"),`package net.runelite.api.widgets;
public class Widget {
 public int type=4,height=13,y=16,revalidations; public Widget parent;
 public int getType(){return type;} public int getHeight(){return height;}
 public Widget getParent(){return parent;} public int getOriginalY(){return y;}
 public Widget setOriginalY(int value){y=value;return this;}
 public void revalidate(){revalidations++;}
}`);
    writeFileSync(join(target,"OriginalMobileLayout.java"),await readFile(new URL("../teavm-poc/engine-src/OriginalMobileLayout.java",import.meta.url),"utf8"));
    writeFileSync(join(target,"OrbRegression.java"),`public class OrbRegression {
 ${children}
 ${method}
 static void check(boolean ok,String message){if(!ok)throw new AssertionError(message);}
 public static void main(String[] args){
  java.util.Map<Integer,net.runelite.api.widgets.Widget> labels=new java.util.HashMap<>();
  net.runelite.api.widgets.Widget orb=new net.runelite.api.widgets.Widget();
  orb.type=0;orb.height=34;orb.y=37;
  for(int child:new int[]{10,21,29,37}){
   net.runelite.api.widgets.Widget label=new net.runelite.api.widgets.Widget();
   label.parent=orb;labels.put(child,label);
  }
  net.runelite.api.widgets.Widget unrelated=new net.runelite.api.widgets.Widget();
  unrelated.parent=orb;labels.put(6,unrelated);
  net.runelite.api.Client client=(group,child)->group==160?labels.get(child):null;
  alignOriginalMobileOrbNumbers(client);
  for(int child:new int[]{10,21,29,37})check(labels.get(child).y==10,"number centred beside orb");
  check(orb.y==37&&unrelated.y==16,"orb circles and other widgets unchanged");
  alignOriginalMobileOrbNumbers(client);
  for(int child:new int[]{10,21,29,37})check(labels.get(child).revalidations==1,"idempotent revalidation");
  labels.remove(10);labels.get(21).parent=null;labels.get(29).type=5;labels.get(37).height=0;
  alignOriginalMobileOrbNumbers(client);
  for(int child:new int[]{21,29,37})check(labels.get(child).revalidations==1,"unavailable widgets skipped");
 }
}`);
    const javac=jdk.home?join(jdk.home,"bin",process.platform==="win32"?"javac.exe":"javac"):"javac";
    const built=spawnSync(javac,["-d",target,join(api,"Client.java"),join(widgets,"Widget.java"),join(target,"OriginalMobileLayout.java"),join(target,"OrbRegression.java")],{encoding:"utf8"});
    assert.equal(built.status,0,built.stderr||built.error?.message);
    const result=spawnSync(jdk.binary,["-cp",target,"OrbRegression"],{encoding:"utf8"});
    assert.equal(result.status,0,result.stderr||result.error?.message);
});
