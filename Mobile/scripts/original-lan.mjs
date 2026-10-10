// Opt-in trusted-LAN access to the original-engine development page.
// Never use this listener on an untrusted Wi-Fi or route it to the Internet.
import {networkInterfaces} from "node:os";
import {isIP} from "node:net";

function asIPv4(address){
    if(typeof address!=="string")return null;
    const v=address.startsWith("::ffff:")?address.slice(7):address;
    return isIP(v)===4?v:null;
}
function octets(ip){return ip.split(".").map(Number);}
function privateV4(ip){
    const p=octets(ip);
    return p[0]===10||(p[0]===172&&p[1]>=16&&p[1]<=31)||
        (p[0]===192&&p[1]===168);
}
export function createLanPolicy({interfaces=networkInterfaces(),preferredIp=null}={}){
    const candidates=[];
    for(const [adapter,entries] of Object.entries(interfaces)){
        for(const it of entries||[]){
            const ip=asIPv4(it.address),mask=asIPv4(it.netmask);
            if(it.internal||!ip||!mask||!privateV4(ip))continue;
            const virtual=/tailscale|wsl|docker|virtual|vmware|hyper-v|vbox|vpn|zerotier/i.test(adapter);
            const physical=/wi-?fi|wlan|ethernet/i.test(adapter);
            candidates.push({ip,mask,adapter,priority:virtual?0:physical?2:1});
        }
    }
    let chosen;
    if(preferredIp){
        chosen=candidates.find(c=>c.ip===preferredIp);
        if(!chosen)throw new Error("LAN IP must be an active private IPv4 interface on this PC");
    }else{
        candidates.sort((a,b)=>b.priority-a.priority);
        chosen=candidates[0];
    }
    if(!chosen)throw new Error("No private IPv4 LAN interface found; set SOLOSCAPE_ENGINE_LAN_IP");
    const network=octets(chosen.ip).map((v,i)=>v&octets(chosen.mask)[i]);
    const sameNetwork=peer=>{
        const ip=asIPv4(peer);
        return ip!==null&&privateV4(ip)&&octets(ip).every((v,i)=>
            (v&octets(chosen.mask)[i])===network[i]);
    };
    const isAllowedPeer=peer=>
        peer==="127.0.0.1"||peer==="::1"||peer==="::ffff:127.0.0.1"||sameNetwork(peer);
    return {ip:chosen.ip,adapter:chosen.adapter,isAllowedPeer};
}
export function isLocalPeer(peer){
    return ["127.0.0.1","::1","::ffff:127.0.0.1"].includes(peer);
}
