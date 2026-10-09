import {spawnSync} from "node:child_process";
import {existsSync,mkdirSync,writeFileSync} from "node:fs";
import {join,delimiter} from "node:path";

export function engineLibraries(env=process.env){
    const home=env.USERPROFILE||env.HOME;
    if(!home&&!env.SOLOSCAPE_MAVEN_REPOSITORY)throw new Error("Cannot locate Maven repository.");
    const repo=env.SOLOSCAPE_MAVEN_REPOSITORY||join(home,".m2/repository");
    const asm=["asm","asm-tree"].map(name=>join(repo,"org/ow2/asm",name,"9.8",`${name}-9.8.jar`));
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
    const sources=[join(root,"teavm-poc/scripts/NormalizeEngine.java"),join(root,"teavm-poc/scripts/ParseEngine.java")];
    if(fixture)sources.push(join(root,"tests/fixtures/EngineConstantsTest.java"));
    const javac=jdk.home?join(jdk.home,"bin",process.platform==="win32"?"javac.exe":"javac"):"javac";
    execute(javac,["-cp",libraries.asm+delimiter+libraries.parser,"-d",classes,...sources],
        {env,run,logPath:join(target,"tools-compile.log")});
    return {libraries,classes};
}
export function prepareEngineBytecode({root,target,gamepack,jdk,env=process.env,run=spawnSync}){
    const {libraries,classes}=compileEngineTools({root,target,jdk,env,run});
    const normalized=join(target,"gamepack-normalized.jar");
    const adaptation=JSON.parse(execute(jdk.binary,["-cp",classes+delimiter+libraries.asm,"NormalizeEngine",gamepack,normalized],
        {env,run,logPath:join(target,"normalization.log")}));
    const parser=JSON.parse(execute(jdk.binary,["-cp",classes+delimiter+libraries.parser,"ParseEngine",normalized],
        {env,run,logPath:join(target,"parser.log")}));
    return {gamepack:normalized,adaptation,parser};
}
export function verifyEngineConstants({root,target,jdk,env=process.env,run=spawnSync}){
    const {libraries,classes}=compileEngineTools({root,target,jdk,env,run,fixture:true});
    return execute(jdk.binary,["-cp",classes+delimiter+libraries.asm,"EngineConstantsTest"],
        {env,run,logPath:join(target,"constants-test.log")});
}
