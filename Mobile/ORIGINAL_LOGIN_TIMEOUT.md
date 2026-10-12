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
