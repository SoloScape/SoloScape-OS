// Observe only the publicly documented native handshake and login-result
// statuses. Challenge bodies, encrypted login packets, credentials and the
// solution are NEVER retained, logged or inspected. The gateway forwards the
// original byte stream unchanged.
export function createGameLoginStatusObserver(onStatus=()=>{}){
    let clientFrames=0,handshakeBytes=0,initialStatus=null,finished=false;
    let firstResultSeen=false,readingChallenge=false,headerBytes=0,challengeSize=0;
    let challengeRemaining=0;
    return {
        clientFrame(){clientFrames++;},
        serverFrame(bytes){
            if(finished||!bytes?.length)return;
            let offset=0;
            if(handshakeBytes===0){
                initialStatus=bytes[0];
                onStatus("gameInitStatus",initialStatus);
                handshakeBytes=1;
                offset=1;
                if(initialStatus!==0){finished=true;return;}
            }
            if(handshakeBytes<9){
                const n=Math.min(bytes.length-offset,9-handshakeBytes);
                handshakeBytes+=n;
                offset+=n;
            }
            if(handshakeBytes!==9)return;
            while(offset<bytes.length&&!finished){
                if(!firstResultSeen){
                    if(clientFrames<2)return; // No login packet yet.
                    const result=bytes[offset++];
                    firstResultSeen=true;
                    onStatus("gameLoginStatus",result);
                    if(result!==69){finished=true;return;}
                    readingChallenge=true;
                }
                if(readingChallenge){
                    // 69 = proof-of-work challenge. Skip its 2-byte length and
                    // opaque payload, even across arbitrary TCP boundaries.
                    while(headerBytes<2&&offset<bytes.length){
                        challengeSize=(challengeSize<<8)|bytes[offset++];
                        headerBytes++;
                    }
                    if(headerBytes<2)return;
                    if(challengeSize<4||challengeSize>1024){finished=true;return;}
                    if(challengeRemaining===0)challengeRemaining=challengeSize;
                    const ignored=Math.min(challengeRemaining,bytes.length-offset);
                    offset+=ignored;
                    challengeRemaining-=ignored;
                    if(challengeRemaining>0)return;
                    readingChallenge=false;
                }
                if(!readingChallenge){
                    if(offset>=bytes.length||clientFrames<3)return;
                    // The first public result after the client's challenge
                    // response, not any byte from its opaque challenge body.
                    onStatus("gamePostChallengeStatus",bytes[offset]);
                    finished=true;
                }
            }
        }
    };
}
