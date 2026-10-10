// Observe ONLY public native game-init and login result status bytes.
// The eight-byte game challenge and all client login packet contents are
// never retained, logged or exposed. The gateway continues forwarding
// bytes unchanged; this observer is diagnostic-only.
export function createGameLoginStatusObserver(onStatus=()=>{}){
    let clientFrames=0,handshakeBytes=0,initialStatus=null,loginResultSeen=false;
    return {
        clientFrame(){clientFrames++;},
        serverFrame(bytes){
            if(loginResultSeen||!bytes?.length)return;
            let offset=0;
            if(handshakeBytes===0){
                initialStatus=bytes[0];
                onStatus("gameInitStatus",initialStatus);
                handshakeBytes=1;
                offset=1;
                if(initialStatus!==0){loginResultSeen=true;return;}
            }
            if(handshakeBytes<9){
                const n=Math.min(bytes.length-offset,9-handshakeBytes);
                handshakeBytes+=n;
                offset+=n;
            }
            if(handshakeBytes===9&&clientFrames>=2&&offset<bytes.length){
                // Only the first byte *after* the entire nine-byte challenge
                // can be the server's public login response status.
                onStatus("gameLoginStatus",bytes[offset]);
                loginResultSeen=true;
            }
        }
    };
}
