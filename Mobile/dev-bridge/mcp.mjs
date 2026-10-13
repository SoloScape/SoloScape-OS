// SoloScape Stage 1 MCP: newline-delimited JSON-RPC over stdio ONLY.
// There is deliberately no listening HTTP endpoint and no remote-control API.
import {Stage1Bridge} from "./bridge.mjs";

const obj=(properties={},required=[])=>({type:"object",properties,required,additionalProperties:false});
const integer=(description,minimum,maximum)=>({type:"integer",description,minimum,maximum});
const tools=[
    {name:"browser_start",description:"Launch a dedicated local Chrome window with the original OpenOSRS diagnostic. Never accesses credentials; login is manual.",inputSchema:obj()},
    {name:"browser_status",description:"Check whether the bridge-owned Chrome diagnostic is connected.",inputSchema:obj()},
    {name:"browser_close",description:"Close only the Chrome session created by this MCP bridge.",inputSchema:obj()},
    {name:"initialize_original_engine",description:"Press Initialize on the original-engine diagnostic, without entering credentials or clicking login.",inputSchema:obj()},
    {name:"get_client_state",description:"Read only sanitized original Java game state, cycle, FPS, and clock telemetry.",inputSchema:obj()},
    {name:"capture_screen",description:"Capture ONLY the original game canvas as PNG, allowed only after a healthy LOGGED_IN state; no login-screen capture.",inputSchema:obj()},
    {name:"click_canvas",description:"Send a real mouse click to the original game canvas after login, in native 765x503 canvas coordinates.",inputSchema:obj({
        x:integer("Original canvas pixel X",0,4095),y:integer("Original canvas pixel Y",0,4095),
        button:{type:"string",enum:["left","right"],default:"left"}},["x","y"])},
    {name:"press_key",description:"Send one navigation, function or alphanumeric key after login; does not accept arbitrary strings or allow login-field entry.",inputSchema:obj({
        key:{type:"string",minLength:1,maxLength:12,description:"Escape, Enter, Tab, Backspace, Space, Arrow directions, F1–F12, or one lowercase letter/digit"}},["key"])},
    {name:"wait_for_state",description:"Wait for an original game state with bounded timeout; does not automate authentication.",inputSchema:obj({
        gameState:{type:"string",enum:["LOGGED_IN","LOGIN_SCREEN","STARTING","LOADING","CONNECTION_LOST","UNAVAILABLE"],default:"LOGGED_IN"},
        timeoutMs:integer("Bounded timeout (milliseconds)",500,60000)})},
    {name:"get_diagnostics",description:"Retrieve sanitized engine exception categories and function/line/column frames; no raw logs or payloads.",inputSchema:obj()},
    {name:"profile_performance",description:"Measure actual original game cycles and presented frames; optionally sample CPU function names, never variable values.",inputSchema:obj({
        durationMs:integer("Sample duration (milliseconds)",500,15000),
        cpu:{type:"boolean",default:false}})},
    {name:"run_smoke_test",description:"Passively validate authenticated world state, advancing original cycles and frames, and absence of callback errors.",inputSchema:obj({
        durationMs:integer("Runtime sample duration (milliseconds)",1000,15000)})}
];
const methods={
    browser_start:bridge=>bridge.browserStart(),
    browser_status:bridge=>bridge.browserStatus(),
    browser_close:bridge=>bridge.browserClose(),
    initialize_original_engine:bridge=>bridge.initializeEngine(),
    get_client_state:bridge=>bridge.getClientState(),
    capture_screen:bridge=>bridge.captureScreen(),
    click_canvas:(bridge,args)=>bridge.clickCanvas(args),
    press_key:(bridge,args)=>bridge.pressKey(args),
    wait_for_state:(bridge,args)=>bridge.waitForState(args),
    get_diagnostics:bridge=>bridge.getDiagnostics(),
    profile_performance:(bridge,args)=>bridge.profilePerformance(args),
    run_smoke_test:(bridge,args)=>bridge.runSmokeTest(args)
};
const ok=(id,result)=>({jsonrpc:"2.0",id,result});
const protocolError=(id,code,message)=>({jsonrpc:"2.0",id,error:{code,message}});
export function createMcpHandler(bridge=new Stage1Bridge()){
    return async message=>{
        if(!message||message.jsonrpc!=="2.0"||typeof message.method!=="string")
            return protocolError(message?.id??null,-32600,"Invalid JSON-RPC request");
        const {id,method,params}=message;
        if(id===undefined)return null; // notifications have no response
        if(!["number","string"].includes(typeof id))
            return protocolError(null,-32600,"Invalid request id");
        if(method==="initialize"){
            return ok(id,{protocolVersion:"2025-03-26",capabilities:{tools:{listChanged:false}},
                serverInfo:{name:"soloscape-original-engine-stage1",version:"0.1.0"},
                instructions:"Local-only original OpenOSRS diagnostic. Browser session is owned by the bridge; login must be manual. Screenshots and inputs are blocked before LOGGED_IN."});
        }
        if(method==="ping")return ok(id,{});
        if(method==="tools/list")return ok(id,{tools});
        if(method!=="tools/call")return protocolError(id,-32601,"Method not found");
        const name=params?.name;
        const args=params?.arguments??{};
        if(typeof name!=="string"||!Object.hasOwn(methods,name))
            return protocolError(id,-32602,"Unknown tool");
        const schema=tools.find(tool=>tool.name===name).inputSchema;
        if(!args||typeof args!=="object"||Array.isArray(args)||
            Object.keys(args).some(k=>!(k in schema.properties))||
            schema.required.some(k=>!Object.hasOwn(args,k)))
            return protocolError(id,-32602,"Invalid tool arguments");
        try{
            const result=await methods[name](bridge,args);
            if(name==="capture_screen")
                return ok(id,{content:[{type:"image",data:result.data,mimeType:result.mimeType}]});
            return ok(id,{content:[{type:"text",text:JSON.stringify(result)}]});
        }catch(error){
            // Do not echo unexpected lower-layer error messages: they can
            // contain filenames, URLs, browser content or other private data.
            const known=error instanceof Error&&
                /^(?:No active bridge|Original|Gameplay actions|Diagnostic|Only|Key not allowed|Unsupported|Invalid|Missing|Chrome|Owned|Original engine|Refusing|Browser|Not|timeoutMs|durationMs|cpu must|x must|y must|Failed)/.test(error.message);
            const text=known?String(error.message).slice(0,240):
                "Tool failed; see the local bridge process for troubleshooting";
            return ok(id,{isError:true,content:[{type:"text",text}]});
        }
    };
}
export {tools};
