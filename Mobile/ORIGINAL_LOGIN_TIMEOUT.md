# HTTP mobile login challenge performance

On 12 October 2026 the user reported repeated login timeouts on an iPhone 16 Pro
Max using Safari. Safe loopback gateway statuses showed accepted game-init (0),
then a proof-of-work challenge (69). Several attempts ended without a subsequent
server result; one returned already-logged-in (5). An earlier attempt completed
the challenge and received login success (2). These statuses narrow the failures
to the challenge/post-challenge stage; they do not prove its precise cause.

The original Java challenge solver and login deadlines remain unchanged. On HTTP
LAN origins, `BrowserDigest` uses the bundled SHA-256 implementation. Previously
every hash scheduled a microtask to resume the TeaVM coroutine. Local hashes now
complete inline, with the existing timer yield every 256 hashes retained. Secure
origins still use Web Crypto. The SHA-256 implementation compares matching public
prefixes in four-byte words and reuses scratch buffers for the same long-prefix
workload. It still hashes each changing suffix and padding, returns independent
results, and checks the complete prefix before reusing its compression state.

Validation:

- `node --test tests/original-sha256.test.mjs`: standard vectors, prefix changes,
  padding/block boundaries, unaligned input, shrinking nonces, independent results,
  inline completion, periodic yields and secure-origin Web Crypto.
- `node teavm-poc/scripts/verify-platform.mjs --digest`: compiles `DigestProof`
  as a separate TeaVM entry point, runs 20,000 synthetic public hashes through
  the actual Java digest adapter, checks the combined output against Node SHA-256,
  and verifies that an event-loop heartbeat runs. This fixture is not reachable
  from the production `EngineBridge` entry point and performs no login.
- One PC comparison took 1,274 ms before and 1,107 ms after. This is a synthetic
  workload measurement, not an iPhone benchmark or proof that timeouts are fixed.

The engine build, module check, full suite (615 passed, 3 skipped) and bridge-owned
Chrome login-screen smoke passed. After reloading the updated build, the user
reported a much faster successful Safari login on the iPhone 16 Pro Max. This is
one authenticated success; repeated Safari login attempts remain necessary before
marking the intermittent timeout resolved. No authentication packets or account
data are captured by the fixture. Generated proof reports stay in ignored
`teavm-poc/target/engine/`.

## Repeated Safari timeouts after the first optimization

The user subsequently reproduced the timeout after pressing Login at
`http://192.168.0.129:3097/`, with Safari kept open. The latest failed gateway
session again received game-init success (0) and challenge (69), then closed
without a challenge response. This establishes the failing stage, but does not
directly measure the phone's computation or prove that hashing is the only cause.

Read-only inspection of the installed rsprot revision-240 classes found a default
SHA-256 difficulty of 18 bits. A random challenge therefore needs approximately
262,144 hashes on average, with an unbounded random tail. The earlier 20,000-hash
fixture substantially underestimated this workload. It also called BrowserDigest
directly rather than the original gamepack's `ag.fa` hash method.

The HTTP adapter now hashes synchronously into the Java result buffer, using a
byte view of the existing input buffer. It checks a cooperative eight-millisecond
work budget every 256 hashes and yields through a MessageChannel task when the
budget is exhausted. Both ports are closed after each yield. Runtimes without
MessageChannel use a timer. The next work slice starts when the callback resumes,
so waiting for a timer does not consume the next slice. The original Java solver,
nonce sequence, difficulty, login protocol and deadlines remain unchanged; secure
origins still use Web Crypto.

The separate `DigestProof` fixture now calls the original `ag.fa` method, with
synthetic public data and a default workload of 262,144 hashes. Set
`SOLOSCAPE_DIGEST_PROOF_HASHES` to a value from 20,000 through 1,048,576 for larger
bounded runs. The verifier checks every workload's combined result against Node
SHA-256 and requires an event-loop heartbeat.

Measurements on this PC: the original adapter took 15,568 ms for 262,144 hashes;
the updated adapter took 8,145 ms. An isolated, bridge-owned headless Chrome
fixture completed 1,048,576 hashes in 32,121 ms, with 1,305 heartbeat callbacks
and the same combined hash as Node. These are synthetic PC measurements, not
iPhone timings or proof that all random challenges finish before login deadlines.
The browser fixture and reports are stored only in ignored
`teavm-poc/target/engine/`. Repeated authenticated Safari verification is still
required before declaring the intermittent timeout resolved.

The final full suite passed (617 passed, 3 skipped), as did
`npm run build:openosrs-engine`, `npm run test:openosrs-engine` and the
bridge-owned Chrome login-screen smoke. The updated build is served by the
existing local development host; Safari must reload to load it.
