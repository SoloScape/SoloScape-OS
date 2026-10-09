import assert from "node:assert/strict";
import test from "node:test";
import {createServer} from "node:http";
import {spawn} from "node:child_process";
import {once} from "node:events";
import {readFile,mkdtemp,rm} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";

// Exercise the served entry point and real title/session code. Only the cache
// artwork, TeaVM exports, native socket and world renderer are fixture boundaries.
test("mobile homepage keeps scaled title controls, login and world lifecycle in sync",
    {timeout:30000,skip:!process.env.CHROME_BIN},async()=>{
    const browserRoot=new URL("../browser/",import.meta.url);
    const siteRoot=new URL("../teavm-poc/site/",import.meta.url);
    const stubs=new Map([
        ["/native-js5.mjs",`export * from "/fixture-js5.mjs";export class NativeJs5Cache {
            async loadMaster(){return Array.from({length:23},(_,archive)=>({archive,crc:archive+1}));}
        }`],
        ["/connection-config.mjs",`export const connectionConfig=Promise.resolve({
            revision:240,gatewayUrl:"ws://fixture/",rsa:{modulus:"fixture",exponent:"10001"}});`],
        ["/teavm/bridge.js",`let mode=0;
            export const revision=()=>240,titleMode=()=>mode;
            export const titleReset=()=>mode=0,titleReady=()=>mode=1;
            export const titleExistingUser=()=>{if(mode===1)mode=2;};
            export const titleConnecting=()=>{if(mode===2)mode=4;};
            export const titleAuthenticated=()=>{if(mode===4)mode=3;};
            export const titleLoginFailed=()=>{if(mode===4)mode=2;};
            export const titleBack=()=>mode=1;`],
        ["/title-screen.mjs",`import {NativeTitleScreen} from "/fixture-title.mjs";
            NativeTitleScreen.prototype.start=async function(){
                const font={measure:s=>s.length*6,draw:(ctx,s,x,y,color)=>{
                    ctx.fillStyle=color;ctx.font="12px monospace";ctx.fillText(s,x,y);
                }};
                this.assets.font=this.assets.small=font;
                this.music={muted:false,show(){},hide(){},dispose(){},unlock(){},
                    toggle(){this.muted=!this.muted;}};
                window.fixtureTitle=this;this.canvas.dataset.loaded="true";this.showWelcome();
            };
            export {NativeTitleScreen};`],
        ["/native-login.mjs",`export class NativeGameSession {
            constructor(options){this.options=options;this.connected=false;}
            async login(details){
                const username=details.username;
                if(!details.password)throw new Error("Password was cleared too early");
                await new Promise(r=>setTimeout(r,20));
                if(username==="rejected")throw new Error("Invalid username or password");
                this.connected=true;
                const account={playerIndex:7,member:true};
                this.options.onAuthenticated(account);
                this.options.onPacket({name:"REBUILD_NORMAL_V2",payload:new Uint8Array()});
                return account;
            }
            close(){this.connected=false;}
        }`],
        ["/teavm-world.mjs",`export class TeaVmWorldBridge {
            constructor(options){Object.assign(this,options);}
            activate(session){
                if(!session.connected)throw new Error("World activated before authentication");
                this.active=true;this.stage.hidden=false;this.title.hidden=true;
            }
            handle(){if(!this.active)throw new Error("First packet lost before scene activation");}
            dispose(){this.active=false;this.stage.hidden=true;this.title.hidden=false;}
        }`],
    ]);
    const runner=`<script type="module">
        const check=(value,message)=>{if(!value)throw new Error(message);};
        const wait=async condition=>{
            for(let i=0;i<200;i++){if(condition())return;await new Promise(r=>setTimeout(r,10));}
            throw new Error("Title state timed out: "+document.querySelector("#client-status").textContent+" "+window.fixtureErrors.join("; "));
        };
        try{
            await wait(()=>window.fixtureTitle);
            const title=window.fixtureTitle,screen=document.querySelector("#screen");
            const form=document.querySelector("#login-form"),status=document.querySelector("#client-status");
            const user=document.querySelector("#login-username"),pass=document.querySelector("#login-password");
            const click=id=>document.getElementById(id).click();
            for(const width of [765,390,593]){
                screen.style.width=width+"px";title.paint();
                const bounds=title.canvas.getBoundingClientRect(),button=document.querySelector("#title-login").getBoundingClientRect();
                check(Math.abs(button.left-bounds.left-388.5*bounds.width/765)<1,"Scaled button drifted from artwork");
                click("title-world-switch");
                check(title.mode==="world-select"&&!document.querySelector("#title-world-back").hidden,"World selector failed");
                check(getComputedStyle(title.stage).transform!=="none","World selector lost its mobile transform");
                click("title-world-back");
            }
            click("title-login");check(!form.hidden,"Existing user failed to open login");
            check(!document.querySelector("#login-otp"),"Extra authenticator row on ordinary login");
            check(getComputedStyle(user).backgroundColor==="rgba(0, 0, 0, 0)","Browser field chrome remains");
            form.requestSubmit();check(status.textContent.includes("username/email"),"Missing username bypassed validation");
            user.value="rejected";pass.value="fixture-password";form.requestSubmit();
            await wait(()=>title.mode==="login"&&status.textContent.includes("Invalid username"));
            check(pass.value===""&&!document.querySelector("#login-submit").disabled,"Rejected login left stale controls/password");
            user.value="accepted";pass.value="fixture-password";form.requestSubmit();
            await wait(()=>!title.visible);
            check(document.querySelector("#title-screen").hidden&&!document.querySelector("#world-stage").hidden,"Title covered authenticated world");
            click("world-disconnect");
            check(title.visible&&title.mode==="welcome"&&!document.querySelector("#title-screen").hidden,"Logout did not restore title");
            click("title-mute");check(title.music.muted,"Mute control is disconnected");
            title.dispose();await fetch("/result?status=pass");
        }catch(error){await fetch("/result?status="+encodeURIComponent(error.stack));}
    </script>`;
    let report;
    const result=new Promise(resolve=>report=resolve);
    const server=createServer(async(req,res)=>{
        try{
            if(req.url.startsWith("/result?")){
                report(new URL(req.url,"http://localhost").searchParams.get("status"));res.end("ok");return;
            }
            res.setHeader("Content-Type",req.url==="/"?"text/html":req.url.endsWith(".css")?"text/css":"text/javascript");
            if(req.url==="/")res.end((await readFile(new URL("title.html",siteRoot),"utf8"))
                .replace("<head>",`<head><script>window.fixtureErrors=[];window.addEventListener("error",e=>window.fixtureErrors.push(e.message));</script>`)
                .replace("</body>",runner+"</body>"));
            else if(stubs.has(req.url))res.end(stubs.get(req.url));
            else if(req.url==="/fixture-title.mjs")res.end(await readFile(new URL("title-screen.mjs",browserRoot)));
            else if(req.url==="/fixture-js5.mjs")res.end(await readFile(new URL("native-js5.mjs",browserRoot)));
            else if(req.url.startsWith("/teavm/"))res.end(await readFile(new URL(req.url.slice(7),siteRoot)));
            else res.end(await readFile(new URL(req.url.slice(1),browserRoot)));
        }catch(error){res.statusCode=500;res.end(error.message);}
    });
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const profile=await mkdtemp(join(tmpdir(),"soloscape-title-"));
    let child,timer;
    try{
        child=spawn(process.env.CHROME_BIN,["--headless","--no-sandbox","--no-first-run",
            "--disable-extensions","--disable-background-networking","--window-size=1000,900",
            "--user-data-dir="+profile,"http://127.0.0.1:"+server.address().port+"/"],{stdio:"ignore"});
        const failed=new Promise((_,reject)=>{
            child.once("error",reject);
            timer=setTimeout(()=>reject(new Error("No title homepage result")),20000);
        });
        assert.equal(await Promise.race([result,failed]),"pass");
    }finally{
        clearTimeout(timer);
        if(child&&child.exitCode===null&&child.signalCode===null){child.kill();await once(child,"exit");}
        await new Promise(resolve=>server.close(resolve));
        await rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
    }
});
