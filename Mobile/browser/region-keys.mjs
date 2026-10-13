// Local development map keys, loaded only from an explicitly configured file.
export function normalizeRegionKeys(input){
    const output={};
    const entries=Array.isArray(input)?input.map(row=>[row.mapsquare??row.region,row.key??row.keys]):Object.entries(input??{});
    if(entries.length>65536)throw new Error("Too many region keys");
    for(const [region,key] of entries){
        const id=Number(region);
        if(!Number.isInteger(id)||id<0||id>65535||!Array.isArray(key)||key.length!==4||
            !key.every(n=>Number.isInteger(n)&&n>=-2147483648&&n<=4294967295))throw new Error("Invalid local region key configuration");
        output[id]=key;
    }
    return output;
}
