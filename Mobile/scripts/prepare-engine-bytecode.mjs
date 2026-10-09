import {spawnSync} from "node:child_process";
import {existsSync,mkdirSync,writeFileSync,copyFileSync} from "node:fs";
import {join,delimiter,dirname} from "node:path";

export function engineLibraries(env=process.env){
    const home=env.USERPROFILE||env.HOME;
    if(!home&&!env.SOLOSCAPE_MAVEN_REPOSITORY)throw new Error("Cannot locate Maven repository.");
    const repo=env.SOLOSCAPE_MAVEN_REPOSITORY||join(home,".m2/repository");
    const asm=["asm","asm-tree","asm-commons"].map(name=>join(repo,"org/ow2/asm",name,"9.8",`${name}-9.8.jar`));
    const parser=["teavm-core","teavm-relocated-libs-asm","teavm-relocated-libs-asm-tree",
        "teavm-relocated-libs-asm-commons","teavm-relocated-libs-hppc"].map(name=>
        join(repo,"org/teavm",name,"0.15.0",`${name}-0.15.0.jar`));
    for(const file of [...asm,...parser])if(!existsSync(file))
        throw new Error("Missing engine-tool dependency: "+file+". Resolve ASM 9.8 and TeaVM 0.15.0 Maven dependencies first.");
    return {asm:asm.join(delimiter),parser:parser.join(delimiter)};
}
function execute(binary,args,{env,run=spawnSync,logPath}={}){
    const result=run(binary,args,{env,encoding:"utf8",maxBuffer:32*1024*1024});
    const log=(result.stdout||"")+(result.stderr||"");
    if(logPath)writeFileSync(logPath,log);
    if(result.error||result.status!==0)throw new Error((result.error?.message||log.trim()||"Engine tool failed").slice(0,8000));
    return result.stdout.trim();
}
export function compileEngineTools({root,target,jdk,env=process.env,run=spawnSync,fixture=false}){
    const libraries=engineLibraries(env),classes=join(target,"tools");mkdirSync(classes,{recursive:true});
    const sources=[join(root,"teavm-poc/scripts/NormalizeEngine.java"),join(root,"teavm-poc/scripts/ParseEngine.java"),
        join(root,"teavm-poc/scripts/AdaptEnginePlatform.java")];
    if(fixture)sources.push(join(root,"tests/fixtures/EngineConstantsTest.java"),join(root,"tests/fixtures/EngineFieldCollisionTest.java"),join(root,"tests/fixtures/EnginePlatformTransformTest.java"),
        join(root,"tests/fixtures/EngineServicesJvmTest.java"),
        join(root,"teavm-poc/engine-src/org/soloscape/teavm/platform/BrowserObjectInputStream.java"),
        join(root,"teavm-poc/engine-src/org/soloscape/teavm/platform/HeapMemory.java"),
        join(root,"teavm-poc/engine-src/org/soloscape/teavm/platform/fs/BrowserProperties.java"));
    const javac=jdk.home?join(jdk.home,"bin",process.platform==="win32"?"javac.exe":"javac"):"javac";
    execute(javac,["-cp",libraries.asm+delimiter+libraries.parser,"-d",classes,...sources],
        {env,run,logPath:join(target,"tools-compile.log")});
    return {libraries,classes};
}
export function prepareEngineBytecode({root,target,gamepack,api,jdk,env=process.env,run=spawnSync}){
    const {libraries,classes}=compileEngineTools({root,target,jdk,env,run});
    const normalized=join(target,"gamepack-normalized.jar");
    const adaptation=JSON.parse(execute(jdk.binary,["-cp",classes+delimiter+libraries.asm,"NormalizeEngine",gamepack,normalized],
        {env,run,logPath:join(target,"normalization.log")}));
    const adapted=join(target,"gamepack-browser.jar"),adaptedApi=join(target,"api-browser.jar");
    // Keep the original injected JAR's tiny non-class classpath resources local.
    // TeaVM does not automatically embed resources from system-scope JARs.
    const browserResources=join(target,"resources");mkdirSync(browserResources,{recursive:true});
    const jar=jdk.home?join(jdk.home,"bin",process.platform==="win32"?"jar.exe":"jar"):"jar";
    execute(jar,["xf",gamepack,"client.serial","compilercontrol.json"],
        {env,run:((binary,args,options)=>run(binary,args,{...options,cwd:browserResources}))});
    for(const name of ["client.serial","compilercontrol.json"])
        if(!existsSync(join(browserResources,name)))
            throw new Error("Pinned client resource was not extracted: "+name);
    // This four-byte source resource belongs to the pinned RuneLite API's
    // OverlayIndex, not to injected-client.oprs. Do not synthesize its contents.
    const overlayIndex=join(dirname(gamepack),"runelite","index");
    if(!existsSync(overlayIndex))throw new Error("Pinned RuneLite overlay index missing: "+overlayIndex);
    const overlayDir=join(browserResources,"runelite");
    mkdirSync(overlayDir,{recursive:true});
    copyFileSync(overlayIndex,join(overlayDir,"index"));
    const resources=join(target,"generated-resources");mkdirSync(resources,{recursive:true});
    for(const [input,output] of [[normalized,adapted],[api,adaptedApi]])
        execute(jdk.binary,["-cp",classes+delimiter+libraries.asm,"AdaptEnginePlatform",input,output,
            ...(input===normalized?[join(resources,"soloscape-engine-reflection-types.txt")]:[])],{env,run});
    const parser=JSON.parse(execute(jdk.binary,["-cp",classes+delimiter+libraries.parser,"ParseEngine",adapted],
        {env,run,logPath:join(target,"parser.log")}));
    return {gamepack:adapted,api:adaptedApi,adaptation,parser};
}
export function verifyEngineConstants({root,target,jdk,env=process.env,run=spawnSync}){
    const {libraries,classes}=compileEngineTools({root,target,jdk,env,run,fixture:true});
    const classpath=classes+delimiter+libraries.asm;
    const constants=execute(jdk.binary,["-cp",classpath,"EngineConstantsTest"],
        {env,run,logPath:join(target,"constants-test.log")});
    const collisions=execute(jdk.binary,["-cp",classpath,"EngineFieldCollisionTest"],
        {env,run,logPath:join(target,"field-collision-test.log")});
    return constants+"\n"+collisions;
}
export function verifyEnginePlatformTransform({root,target,jdk,env=process.env,run=spawnSync}){
    const {libraries,classes}=compileEngineTools({root,target,jdk,env,run,fixture:true});
    return execute(jdk.binary,["-cp",classes+delimiter+libraries.asm,"EnginePlatformTransformTest"],
        {env,run,logPath:join(target,"platform-transform-test.log")});
}
export function verifyEngineServicesJvm({root,target,jdk,env=process.env,run=spawnSync}){
    const {libraries,classes}=compileEngineTools({root,target,jdk,env,run,fixture:true});
    return execute(jdk.binary,["-cp",classes+delimiter+libraries.asm,"EngineServicesJvmTest"],
        {env,run,logPath:join(target,"services-jvm-test.log")});
}
