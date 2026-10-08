# TSPS → SoloScape protocol interoperability

Status: **incompatible, network transport groundwork only**. This document records source-observed differences and the engineering requirements. It must not be treated as evidence of a successful login.

## Audited versions

- TSPS pinned at [`b9ca431be440174fce5adf0efbb7afa992358916`](https://github.com/RSPSApp/tsps/commit/b9ca431be440174fce5adf0efbb7afa992358916). Its `server/target.txt` is `osrs-241_2026-09-30`.
- SoloScape's Kotlin server `Server/AGENTS.md` and `Server/README.md` document revision `240.2` and networking via `net.rsprot.protocol.api.NetworkService`.
- Actual deployed SoloScape revision/ports/cache must be confirmed from local `game.yml` and generated/runtime data; documentation may not match a given deployment.

## Wire-level mismatch (verified from source)

| Dimension | TSPS client | SoloScape server |
| --- | --- | --- |
| Transport | Browser `WebSocket` / WebRTC game channel (`client/network/serverConnection/connection/init.ts`) | `rsprot` Netty network service on configured raw TCP `config.gamePort` (`Server/api/net/.../NetworkFactory.kt`) |
| Session hello | Proprietary binary `HELLO=200`, null-terminated client/version (`client/common/packets/ClientPacketId.ts`, `ClientBinaryEncoder.ts`) | Native OSRS login/JS5 handshakes via `rsprot`, not TSPS HELLO |
| Login | Proprietary `LOGIN=204`: null-terminated username and password followed by 32-bit revision in clear inside the game channel | `rsprot` login block with RSA/cryptographic native login path, password or token auth, plus server-side account verification (`ConnectionHandler.kt`) |
| Client movement | TSPS `WALK=210`, x/y shorts + flags byte | Native OSRS movement packets decoded into `MoveGameClickHandler`/`MoveMinimapClickHandler` |
| Outbound packets | Custom packet IDs (e.g. `LOGIN_RESPONSE=3`, `PLAYER_SYNC=20`, `REBUILD_REGION=140`), defined in `client/common/packets/ServerPacketId.ts` | Native OSRS server packet encoders under `rsprot` |
| Cache | OpenRS2-based cache target 241, client-side JS5 and interface definitions | SoloScape cache 240.2 in server configuration/docs, with custom gamevals and generated data |
| UI | TSPS uses its own React/WebGL interface model plus browser host dependencies | Server sends native OSRS interface IDs/scripts and revision-specific CS2 |

TSPS's numeric packet IDs and lengths are **not** interchangeable with native OSRS packet opcodes. A WebSocket wrapping raw TCP does **not** perform semantic packet translation. Blindly passing TSPS login bytes would risk exposing account credentials to an unintended protocol parser; the gateway therefore rejects the first TSPS frame.

## Implemented in this branch

- Pinned TSPS source as a submodule.
- A configurable browser launcher with explicit server/cache URLs, secure-build checks and tests.
- `Mobile/gateway/`: an opt-in, fixed-upstream, binary-only WebSocket-to-raw-TCP transport for clients that already speak native OSRS. Includes explicit origin checks, first-frame native handshake gating, message/queue bounds, backpressure and integration tests with a mock TCP server. Rejects the TSPS 200 HELLO before connecting to upstream.

The gateway currently recognises initial native login / JS5 byte candidates `14, 15, 16, 18`. **This is a transport safety allowlist, not a validated rsprot implementation.** Confirm the exact native revision-240 handshake with real rsprot before production usage. Do not infer successful game login from an echo test.

## Confirmed native rsprot revision-240 JS5 request framing

Inspected the upstream [rsprot `InitJs5RemoteConnectionDecoder.kt`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-shared/src/main/kotlin/net/rsprot/protocol/common/loginprot/incoming/codec/InitJs5RemoteConnectionDecoder.kt) and [`LoginClientProt.kt`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-shared/src/main/kotlin/net/rsprot/protocol/common/loginprot/incoming/prot/LoginClientProt.kt):

- Login opcode: `15` (`INIT_JS5REMOTE_CONNECTION`).
- Fixed payload length: **20 bytes**.
- Layout: 4-byte big-endian **revision** followed by **four 4-byte seed integers** (16 bytes).
- Total request size: **21 bytes**. No length prefix in this fixed-size message.
- The `Mobile/gateway/js5-probe.mjs` implementation now sends this complete request; it generates 16 random seed bytes and logs **no seed material**. The incomplete former implementation wrote only opcode + revision (5 bytes), which leaves rsprot waiting for the remaining 16 bytes and causes a timeout.
- rsprot's `LoginChannelHandler.kt` compares the revision to `RSProtConstants.REVISION`, validates the JS5 source via its address validator, then writes a login response. A successful initial handshake is not proof of completed cache transfer or gameplay.

The user confirmed a local Java 21 process listening at `127.0.0.1:43594` and local `Server/game.yml` setting `game-port: 43594`, `revision: 240`. An initial **five-byte** probe timed out; repeat using the corrected **21-byte** probe before inferring anything about deployed JS5. This observation is not evidence that login works.

## Native game-init pre-authentication framing

The rsprot revision-240 [`LoginClientProt.kt`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-shared/src/main/kotlin/net/rsprot/protocol/common/loginprot/incoming/prot/LoginClientProt.kt) defines `INIT_GAME_CONNECTION` as opcode **14**, fixed payload **0**. [`LoginChannelHandler.kt`](https://github.com/blurite/rsprot/blob/master/protocol/osrs-240/osrs-240-api/src/main/kotlin/net/rsprot/protocol/api/login/LoginChannelHandler.kt) issues `LoginResponse.Successful(sessionId)` after address validation. The revision-240 response encoder writes opcode **0** and then an **8-byte** session ID for this flow. `Mobile/gateway/game-probe.mjs` checks the full nine-byte response (including TCP fragmentation), never exposes the session ID, and never sends credentials. This probes a native TCP endpoint, not the TSPS custom WebSocket protocol. The server's live response must be tested separately from CI mocks.

## Required protocol adapter work (not implemented)

1. **Choose a source-of-truth native client protocol.** Identify the exact SoloScape revision, RSA public modulus, current JS5/cache revision, ISAAC seeds, login block layout and inbound/outbound packet tables from the `rsprot` dependency and SoloScape generated files.
2. **Decide native protocol adapter placement.** Prefer implementing a native OSRS packet encoder/decoder within a client-compatible TSPS fork for fidelity. A server-side custom-to-native translator would need to maintain full ISAAC/RSA session state, re-encode scene/entity updates, maps, varps, interfaces and inventory; it is not a simple opcode remap.
3. **Separate login from credentials.** Do not send TSPS high-level plaintext login frames through the raw OSRS gateway. Implement native authentication with correct encryption and secure `wss://` transport, using test-only accounts until reviewed. Fail closed on revision mismatch.
4. **Align assets.** Resolve cache 241 vs 240.2 and adjust JS5, client scripts, packet tables and map definitions consistently. Do not force the wrong revision value only to suppress the warning.
5. **Game loop milestones.** Validate JS5 cache manifest, handshake, login response, initial region rebuild, player/NPC sync, click-to-walk, UI/inventory, chat and logout/reconnect. Use captured test data stripped of usernames/passwords/tokens.
6. **Mobile verification.** Test viewport/touch/virtual keyboard on modern Android Chrome and iOS Safari after the core native session is stable.

### Acceptance gates

- A real revision-compatible native client completes the game handshake against the SoloScape test server through the WebSocket gateway with no credential leakage in logs.
- TSPS client can subsequently perform login, cache loading, scene rendering and movement with protocol conversion in place.
- Interoperability and mobile smoke tests run in isolated environments; production credentials and cache assets are excluded from commits.

## Security notes

The gateway exposes a raw game TCP stream only to an exact origin allowlist; it is **not** a proxy that authenticates players, protects native credentials, or upgrades existing traffic to an encrypted protocol by itself. Prefer TLS termination and a properly secured server network. No user accounts, secrets or tokens should be committed to the repository.
