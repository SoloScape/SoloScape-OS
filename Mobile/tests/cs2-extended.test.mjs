import assert from "node:assert/strict";
import {test} from "node:test";
import {runWidgetScript} from "../browser/native-scripts.mjs";

const script=(commands,extra={})=>({
    instructions:commands.map(([op,value=0])=>({op,value})),
    localInts:0,localStrings:0,intArgs:0,stringArgs:0,longArgs:0,switches:[],...extra
});
const uid=219*65536+1;
const scene=()=>{
    const widget={uid,groupId:219,type:4,rawX:0,rawY:0,rawWidth:180,rawHeight:50,
        color:0,text:"",actions:[],fontId:1,isIf3:true};
    return {widgets:new Map([[uid,widget]]),roots:[widget]};
};
const run=(commands,s=scene(),options={},loader={})=>runWidgetScript({
    load:async()=>script(commands),
    varbit:async()=>({base:1,start:3,end:6}),
    ...loader
},58,[],s,options);

test("CS2 arithmetic retains signed 32-bit maths, long intermediate scaling and bounds errors",async()=>{
    const varcs=new Map();
    await run([[0,2147483647],[0,2],[0,2],[4018],[43,1],
        [0,-2147483648],[0,2],[4002],[43,2],
        [0,255],[0,4],[0,7],[4029],[43,3],
        [0,1],[0,31],[0,31],[4027],[43,4],[21]],scene(),{varcs});
    assert.equal(varcs.get(1),2147483647);
    assert.equal(varcs.get(2),0);
    assert.equal(varcs.get(3),15);
    assert.equal(varcs.get(4),-2147483647);
    await assert.rejects(run([[0,12],[0,0],[4003],[21]]),/division by zero/);
    await assert.rejects(run([[0,3],[0,5],[0,4],[4027],[21]]),/bit range/);
    await assert.rejects(run([[3,"m"],[3,"f"],[4105],[21]]),/gender unavailable/);
});

test("CS2 text operations preserve stack order and cache markup handling",async()=>{
    const varcStrings=new Map(),varcs=new Map();
    await run([[3,"Quick "],[3,"<red>Fox</red>"],[4101],[4119],[4122],[50,10],
        [3,"Gold: "],[0,42],[4100],[50,11],
        [3,"A"],[0,66],[4112],[50,12],
        [3,"ABCD"],[0,1],[0,3],[4118],[50,13],
        [3,"ABCD"],[0,67],[4120],[43,14],
        [3,"Hello World"],[3,"World"],[0,2],[4121],[43,15],[21]],scene(),{varcs,varcStrings});
    assert.equal(varcStrings.get(10),"QUICK FOX");
    assert.equal(varcStrings.get(11),"Gold: 42");
    assert.equal(varcStrings.get(12),"AB");
    assert.equal(varcStrings.get(13),"BC");
    assert.equal(varcs.get(14),2);
    assert.equal(varcs.get(15),6);
});

test("varp, varbit, integer and string varcs read back across calls",async()=>{
    const varps=new Map([[1,0b10000011]]),varcs=new Map(),varcStrings=new Map();
    await run([[0,9],[27,7],[25,7],[43,5],[0,99],[2,2],[1,2],[43,6],
        [3,"hello"],[50,12],[49,12],[50,13],[21]],scene(),
        {varps,varcs,varcStrings});
    // A different varbit definition may be supplied by the cache loader.
    assert.equal(varps.get(1),0b11001011);
    assert.equal(varcs.get(5),9);
    assert.equal(varps.get(2),99);
    assert.equal(varcs.get(6),99);
    assert.equal(varcStrings.get(13),"hello");
    await assert.rejects(run([[0,16],[27,7],[21]]),/outside bounds/);
});

test("widget CS2 supports explicit and active targets, actions, text getters and respects server patches",async()=>{
    const group=scene(),strings=new Map(),ints=new Map(),widget=group.roots[0];
    await run([[0,uid],[201],
        [0,10],[0,20],[0,0],[0,0],[1000],
        [3,"Continue"],[1112],
        [0,1],[3,"Use"],[1300],
        [0,1],[1801],[50,1],
        [0,uid],[2602],[50,2],
        [0,455],[0,uid],[2105],
        [0,widget.uid],[2500],[43,3],[21]],
        group,{varcStrings:strings,varcs:ints,canWrite:(_,key)=>key!=="rawY"});
    assert.equal(widget.rawX,10);
    assert.equal(widget.rawY,0);
    assert.equal(widget.spriteId,455);
    assert.equal(widget.actions[0],"Use");
    assert.equal(strings.get(1),"Use");
    assert.equal(strings.get(2),"Continue");
    assert.equal(ints.get(3),10);
    await assert.rejects(run([[0,uid],[201],[0,1],[0,0],[0,1],[0,1],[1000],[1500],[21]],scene()),/resolved widget geometry unavailable/);
});

test("unimplemented CS2 opcodes still fail instead of pretending to execute",async()=>{
    await assert.rejects(run([[9999],[21]]),/Unsupported/);
});

test("CS2 fixed int arrays enforce bounds and preserve values through script calls",async()=>{
    const vars=new Map();
    await run([[0,3],[44,105],[0,2],[0,99],[46,0],[0,2],[45,0],[43,2],[21]],
        scene(),{varcs:vars});
    assert.equal(vars.get(2),99);
    await assert.rejects(run([[0,5001],[44,105],[21]]),/array bounds/);
    await assert.rejects(run([[0,0],[45,0],[21]]),/Undefined CS2 array/);
    await assert.rejects(run([[0,2],[44,105],[0,4],[45,0],[21]]),/array index/);
});

test("CS2 long constants, locals and comparisons survive nested calls",async()=>{
    const vars=new Map();
    const scripts=new Map([
        [58,script([[61,42n],[40,200],[43,1],[21]])],
        [200,script([[66,0],[61,42n],[69,2],[0,0],[6,1],[0,1],[21]],
            {longArgs:1,localLongs:1})]
    ]);
    await runWidgetScript({load:async id=>scripts.get(id)},58,[],scene(),{varcs:vars});
    assert.equal(vars.get(1),1);
    await runWidgetScript({load:async()=>script([[61,100n],[67,0],[66,0],[61,100n],[69,2],
        [0,0],[6,1],[0,1],[43,2],[21]],{localLongs:1})},58,[],scene(),{varcs:vars});
    assert.equal(vars.get(2),1);
});
