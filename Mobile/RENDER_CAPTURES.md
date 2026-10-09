# Matched renderer captures

No matched RuneLite capture pair is checked in. Renderer changes and synthetic
tests do not establish visual parity. Record a pair from the same cache,
scene state, camera, frame dimensions, settings and animation tick before
making a frame comparison.

The authenticated `TeaVmWorldBridge` exposes an explicit developer method:

```js
const capture = await worldBridge.capture({
    frameId: "lumbridge-stationary-001",
    serverTick: 100,
    clientCycle: 3000
});
const {downloadWorldCapture} = await import("/render-capture.mjs");
downloadWorldCapture(capture, "mobile-lumbridge-001");
```

Call this on the actual bridge instance from a developer harness. The method
does not expose credentials or create a global debugging interface. Tick
identifiers must come from the synchronized recording or replay; entering an
arbitrary tick number does not synchronize live clients. The helper redraws
the current world and reads its WebGL framebuffer synchronously, then exports
a world-only PNG and a JSON manifest. Interface canvases are excluded. Camera
angles are radians, distance and target use the mobile renderer's world units,
and `camera.origin` converts region-local targets into world coordinates.

The manifest whitelists cache archive CRC/revision fingerprints, map templates,
varps, player position/orientation, actor and scenery animation frames, public
appearance configuration, camera, viewport, GPU settings, roof level,
texture clock, and explicit synchronization identifiers. Session state,
account names, passwords, tokens and XTEA keys are excluded. Review exported
game-state data before sharing it.

Record RuneLite's viewport PNG and independently measured equivalent metadata
using the same `soloscape-render-capture-v1` manifest schema. Translate camera
units explicitly from the actual reference camera; copying the mobile manifest
onto an unrelated screenshot does not create a matched pair. Preserve the
reference's renderer identity in `source`. Record all relevant actor, scenery,
animation and lighting state in the capture procedure: the exported manifest
is a reproducibility aid, and cannot prove that two independently running
clients actually had identical world state.

The world framebuffer redraw does not rebuild actor geometry. Actor buffers
can therefore reflect an earlier model update than the sampled player ECS
state, and NPC positions in the manifest are protocol endpoints rather than
the interpolated positions actually drawn. Static scenery identities, spot
effects and appearance customisations are not fully enumerated. Resolved
dynamic scenery children do record the selected definition, sequence and
cached frame. Use a synchronized replay and independently record the missing
state before treating the manifests as a matched reference experiment.

Run the comparison with Python and Pillow:

```text
python Mobile/scripts/compare-render-captures.py mobile.png mobile.json runelite.png runelite.json --diff difference.png
```

The CLI requires equal `match` metadata and equal image dimensions. It refuses
resizing, cropping and metadata mismatches, writes an RGBA absolute difference
PNG, and reports changed pixels and channel errors. An exact match concerns
only that recorded frame. Compare multiple scenes, rotations, planes, morph
states, instance templates, and animation cycles to assess broader fidelity.
Browser antialiasing and touch rendering settings are included because they
can change the pixels. The bundled Codex Python runtime includes Pillow;
ordinary Python environments need Pillow installed separately.

Public references:

- [RuneLite GPU plugin documentation](https://github.com/runelite/runelite/wiki/GPU)
  describes the reference plugin and its configuration.
- [YouTube visual reference](https://www.youtube.com/watch?v=bMSr9PRiF2k)
  is qualitative only. Video compression, camera motion, unknown cache/state,
  and unrecorded settings prevent a matched pixel comparison.
