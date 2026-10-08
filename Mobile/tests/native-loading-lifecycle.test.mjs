import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {NativeOsrsLoadingLifecycle,GameState,LoadingRequirement} from "../browser/native-loading-lifecycle.mjs";
import {GameStateMachine} from "../browser/tsps-runtime/game-state-GameStateMachine.mjs";
import {LoadingTracker} from "../browser/tsps-runtime/game-state-LoadingTracker.mjs";

const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const awaitState=async(lifecycle,desired,timeoutMs=300)=>{
    const started=performance.now();
    while(lifecycle.state!==desired&&performance.now()-started<timeoutMs)await pause(5);
    assert.equal(lifecycle.state,desired);
};

test("login uses the pinned TSPS state machine and loading requirements",()=>{
    const changes=[];
    const lifecycle=new NativeOsrsLoadingLifecycle({fogMs:10,minDisplayMs:10,onState:({to})=>changes.push(to)});
    assert.ok(lifecycle.states instanceof GameStateMachine);
    assert.ok(lifecycle.tracker instanceof LoadingTracker);
    lifecycle.begin();
    assert.equal(lifecycle.state,GameState.CONNECTING);
    assert.deepEqual(lifecycle.progress.pending,[LoadingRequirement.HANDSHAKE_COMPLETE,LoadingRequirement.MAP_DATA_LOADED]);
    lifecycle.authenticated();
    assert.equal(lifecycle.state,GameState.LOADING_GAME);
    assert.deepEqual(lifecycle.progress.pending,[LoadingRequirement.MAP_DATA_LOADED]);
    assert.deepEqual(changes,[GameState.CONNECTING,GameState.LOADING_GAME]);
    lifecycle.dispose();
});

test("map packet and handshake are not enough: wait for a rendered map and fog fade",async()=>{
    const lifecycle=new NativeOsrsLoadingLifecycle({fogMs:35,minDisplayMs:10});
    lifecycle.begin();lifecycle.authenticated();
    await pause(45);
    assert.equal(lifecycle.state,GameState.LOADING_GAME,"map frame has not appeared");
    lifecycle.mapFrameReady();
    await pause(10);
    assert.equal(lifecycle.state,GameState.LOADING_GAME,"1-second equivalent fog time is not complete");
    await pause(55);
    assert.equal(lifecycle.state,GameState.LOGGED_IN);
    lifecycle.dispose();
});

test("TSPS minimum loading display is enforced even if a map is ready immediately",async()=>{
    const lifecycle=new NativeOsrsLoadingLifecycle({fogMs:1,minDisplayMs:70});
    lifecycle.begin();lifecycle.authenticated();lifecycle.mapFrameReady();
    await pause(15);
    assert.equal(lifecycle.state,GameState.LOADING_GAME);
    await pause(70);
    assert.equal(lifecycle.state,GameState.LOGGED_IN);
    lifecycle.dispose();
});

test("logout cancels pending map frame callbacks; later game load starts a fresh session",async()=>{
    const lifecycle=new NativeOsrsLoadingLifecycle({fogMs:35,minDisplayMs:5});
    lifecycle.begin();lifecycle.authenticated();lifecycle.mapFrameReady();lifecycle.reset();
    await pause(55);
    assert.equal(lifecycle.state,GameState.LOGIN_SCREEN);
    assert.equal(lifecycle.progress.isComplete,false);
    lifecycle.begin();lifecycle.authenticated();lifecycle.mapFrameReady();
    await pause(60);
    assert.equal(lifecycle.state,GameState.LOGGED_IN);
    lifecycle.dispose();
});

test("later server map rebuild returns from logged in to loading without reconnecting",async()=>{
    const lifecycle=new NativeOsrsLoadingLifecycle({fogMs:1,minDisplayMs:1});
    lifecycle.begin();lifecycle.authenticated();lifecycle.mapFrameReady();
    await awaitState(lifecycle,GameState.LOGGED_IN);
    lifecycle.beginRegionLoad();
    assert.equal(lifecycle.state,GameState.LOADING_GAME);
    assert.deepEqual(lifecycle.progress.pending,[LoadingRequirement.MAP_DATA_LOADED]);
    lifecycle.mapFrameReady();
    await awaitState(lifecycle,GameState.LOGGED_IN);
    lifecycle.dispose();
});

test("only the classic loading label is visible; extra map progress is hidden",()=>{
    const html=readFileSync(new URL("../browser/index.html",import.meta.url),"utf8");
    const css=readFileSync(new URL("../browser/world.css",import.meta.url),"utf8");
    assert.match(html,/Loading - please wait\./);
    assert.match(css,/\.loading\s+#loading-detail\s*\{\s*display:\s*none\s*\}/);
});
