// Strictly bounded, account-free original JavaScript crash metadata.
// The browser never posts raw JS exceptions, login packets, names or chat.
const categories=new Set(["MEMORY","NULL_REFERENCE","BOUNDS","JAVA_STATE","JAVASCRIPT","NETWORK","UNKNOWN"]);
const states=new Set(["LOGGED_IN","LOGIN_SCREEN","LOGGING_IN","LOGIN_SCREEN_AUTHENTICATOR","LOADING","HOPPING","CONNECTION_LOST","STARTING","UNKNOWN","UNAVAILABLE"]);
const frame=/^[A-Za-z_$][A-Za-z0-9_$]{0,59}:[0-9]{1,7}:[0-9]{1,6}$/;
export function makeOriginalClientCrashReport(category,gameState,trace){
    const frames=typeof trace==="string"?trace.split("|").map(s=>s.trim()).filter(s=>frame.test(s)).slice(0,12):[];
    return {
        category:categories.has(category)?category:"UNKNOWN",
        gameState:states.has(gameState)?gameState:"UNKNOWN",
        frames
    };
}
export function parseOriginalClientCrashReport(body){
    if(typeof body!=="string"||body.length>900)throw new Error("Invalid crash report");
    const obj=JSON.parse(body);
    if(!obj||Array.isArray(obj)||typeof obj!=="object"||
        Object.keys(obj).sort().join(",")!=="category,frames,gameState"||
        !categories.has(obj.category)||!states.has(obj.gameState)||
        !Array.isArray(obj.frames)||obj.frames.length>12||
        obj.frames.some(f=>typeof f!=="string"||!frame.test(f)))
        throw new Error("Invalid crash report");
    return {category:obj.category,gameState:obj.gameState,frames:obj.frames};
}
export function sendOriginalClientCrashReport(category,gameState,trace,
    navigatorRef=globalThis.navigator){
    const report=makeOriginalClientCrashReport(category,gameState,trace);
    try {
        // Only fixed category/state and sanitised JavaScript function locations.
        // No raw Throwable text or user-controlled strings reach the server.
        return !!navigatorRef?.sendBeacon?.("/original-client-crash",
            new Blob([JSON.stringify(report)],{type:"application/json"}));
    }catch{return false;}
}
