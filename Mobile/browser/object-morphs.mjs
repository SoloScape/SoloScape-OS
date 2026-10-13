// Revision-240 LocType transform selection. State belongs to the authenticated
// interface session; definitions and model bytes remain immutable cache assets.
export async function resolveObjectMorph(definition,{definition:load,varbit,varps=new Map()}={}){
    const visited=new Set();
    while(definition?.transforms){
        if(visited.has(definition.id)||visited.size>=32)throw new Error("Cyclic location transformation");
        visited.add(definition.id);
        let selector=-1;
        if(definition.transformVarbit>=0){
            const bits=await varbit(definition.transformVarbit),width=bits.end-bits.start+1;
            if(width<1||width>32)throw new Error("Invalid location varbit bounds");
            selector=((varps.get(bits.base)??0)>>>bits.start)&(width===32?-1:2**width-1);
        }else if(definition.transformVarp>=0)selector=varps.get(definition.transformVarp)??0;
        const transforms=definition.transforms;
        const id=transforms[selector>=0&&selector<transforms.length-1?selector:transforms.length-1];
        if(id===65535||id===-1)return null;
        definition=await load(id);
        if(!definition)throw new Error("Missing transformed location definition "+id);
    }
    return definition;
}
