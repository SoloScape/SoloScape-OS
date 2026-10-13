import {readFile} from "node:fs/promises";
import {validateRsaPublicKey} from "../browser/login-crypto.mjs";
import {validateNativeGatewayUrl} from "../browser/native-js5.mjs";

// Accept only the generated PUBLIC client.key format; never publish other key material.
export async function loadPublicLoginConfig({keyPath=new URL("../../Server/.data/client.key",import.meta.url),
    gatewayUrl="ws://127.0.0.1:43595/"}={}){
    const gateway=validateNativeGatewayUrl(gatewayUrl);
    const text=await readFile(keyPath,"utf8");
    const match=/^Exponent: ([0-9a-f]+)\r?\nModulus: ([0-9a-f]+)\s*$/i.exec(text);
    if(!match)throw new Error("Expected the generated public client.key format");
    const rsa={exponent:match[1],modulus:match[2]};validateRsaPublicKey(rsa);
    return {revision:240,gatewayUrl:gateway,rsa};
}
