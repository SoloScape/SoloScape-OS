# Original-engine scenery audit — 11 October 2026

## Result

**More scenery decoding gaps remain after the Lumbridge fountain patch.**
An isolated TeaVM build of the original location-definition constructor loses
untyped model lists that the original JVM decoder retains. The current
`BrowserOriginalLocationModels` helper restores 10,503 of 36,639 such
definitions, leaving **26,136 definitions with missing model lists**.
This is a reproducible offline decoding defect, not a screenshot count of
invisible objects or proof that every affected placement is currently loaded.

The remaining definitions occur in **2,133,850 source placements across
2,428 region archives**. All these affected placements use shape 10 or 11,
the large/game-object shapes which use untyped model lists. Some are unnamed
scenery, and some can be hidden by normal plane, roof, visibility or game-state
rules. Do not equate this total with objects that a player should see at once.

No production decoder or renderer was changed during this audit. The previous
fountain patch remains in place; its definition now produces model 1497 in
the isolated TeaVM comparison, matching the JVM.

## Coverage and checks

Audited checkout: `feature/mobile` at `b2da8a04`.
Pinned revision-240 gamepack SHA-256:
`25f42961c400bd9dfff1554402441c0ba6d1cffd011163cb9b0b4c42ae194f85`.

| Check | Result |
| --- | --- |
| Original index-2/group-6 location definitions | 62,522 examined; original JVM constructor decoded all without errors |
| Definitions with typed model lists | 21,167; isolated TeaVM model IDs and typed-list lengths match the JVM |
| Definitions with untyped model lists | 36,639; TeaVM loses the original list before the compatibility helper |
| Definitions with no direct model list | 4,716; not automatically treated as missing scenery |
| Untyped lists restored by the current helper | 10,503 |
| Model-list differences remaining after restoration | 26,136; all empty lists, no wrong nonempty model-ID lists found |
| Referenced original index-7 model archives | 31,746 unique archives; all present, sector chains valid, containers decompressed to nonempty bytes |
| Region archives with successfully decoded location streams | 2,936 in each cache |
| Source placements examined | 4,980,884 in each cache; every definition ID exists in the audited original definition corpus |
| LIVE versus SERVER location-file comparison | All 2,936 decoded files have identical SHA-256 values |
| Region archives containing affected placements | 2,428 |
| Additional index-5 archive | Group 25287 has 37 three-byte files in both caches; file 1 is not a valid location stream, so this archive is excluded from region-placement totals |

The SERVER reference table has 3,241 groups versus 2,937 in LIVE. The additional
304 SERVER groups do not expose the combined file-1 location layout used by
these region archives. They are not counted as missing client regions merely
because the catalogs have different total group counts.

## Why the current helper misses these definitions

The helper returns without restoring a model list when a valid prefix opcode
is not in its small allowlist. The complete corpus check against the actual
Java helper gives the following first rejection points:

| Prefix | Definitions blocked | Meaning |
| --- | ---: | --- |
| 30–34 | 10,954 | Object action strings before the model list |
| 22 | 6,419 | Merge normals flag |
| 21 | 6,189 | Terrain contour flag |
| 64 | 2,149 | Clipping flag |
| 62 | 423 | Rotation flag |
| 79 | 1 | Variable-length ambient sound metadata |
| 93 | 1 | Additional object metadata |
| **Total** | **26,136** | |

This is broader than another missing model archive or a fountain-specific
rendering issue. The verified failure is in the Java-to-JavaScript
definition-decoding/restoration path. The exact compiler or transformation
mechanism that loses the original untyped array is still to be localized;
the audit does not assign an unproven internal TeaVM root cause.

An initial secondary JavaScript cache decoder could not decode 67 definitions
containing opcode 101 and interpreted later repeated model lists differently
for 59 definitions. Those preliminary results were replaced with the original
JVM constructor as the authoritative reference. The final counts above include
all 62,522 definitions and do not rely on those incomplete decoder results.

## Lumbridge and examples elsewhere

| Original region group | Source placements | Placements using definitions with remaining model-list gaps |
| --- | ---: | ---: |
| 12850 | 4,726 | 136 |
| 12851 | 2,359 | 140 |
| 13106 | 1,247 | 116 |
| 13107 | 664 | 122 |
| **Total** | **8,996** | **514** |

Named affected definitions in these regions include castle winches, a closed
chest, drawers, a chest, a statue and plants; the church altar and organ;
signposts, a furnace and a rusted anvil; and nearby potatoes, hay, shelves,
crates, bushes, trees, cacti and rockslides. These are source-placement and
compiled-decoder findings, not individual authenticated visual observations.

Across the entire examined map corpus, named examples include:

| Name | Source placements using affected definitions |
| --- | ---: |
| Rockslide | 10,947 |
| Plant | 8,334 |
| Tree | 7,793 |
| Darkwood tree | 4,957 |
| Wheat | 2,836 |
| Hedge | 1,700 |
| Ladder | 1,594 |
| Crate | 1,257 |
| Barrel | 925 |
| Chest | 749 |
| Stairs | 721 |
| Table | 717 |

Names group multiple original definitions. Most affected placements are
unnamed scenery and are not included in this example table.

## Evidence method and limits

The audit read the original LIVE and SERVER caches without writing them.
It extracted the complete definition corpus and compared the original `om`
constructor on the JVM with an isolated TeaVM build of the browser-adapted
constructor and current restoration helper. Comparisons used exact model IDs
and typed-list lengths, not just definition names or archive existence.

The isolated harness suppresses the `om.oo` post-definition RuneLite hook so
an offline definition lookup does not require a running client callback.
That hook handles an icon field and a callback, not `ck`/`co` model lists.
The constructor's decoding instructions and restoration call are retained.
This harness is local diagnostic output only, not the production engine.

The audit does **not** prove model face geometry, textures, animation frames,
transform selection under every varbit/varp state, software drawing, scene
insertion, instance placement, roof clipping, cold-login behavior or region
transition behavior. Model container availability is not geometric/rendering
parity. No authenticated gameplay screenshots were obtained in this audit;
the existing controller session remained at STARTING with hidden-page telemetry.
Keep the broader missing-scenery issue open until original-client scene and
screenshot checks pass after repair.

Raw corpora, temporary harnesses and all measurements remain ignored under
`teavm-poc/target/engine/scenery-audit/`, principally:

- `original-decoder.tsv`: the complete original JVM reference.
- `teavm-decoder.tsv` and `teavm-comparison.json`: compiled decoder results.
- `report.json`: model availability, region counts and cache comparisons.
- `helper-rejections.txt` and `rejection-counts.json`: fallback rejection evidence.
- `teavm-decoder-build.log`: successful isolated TeaVM compilation.

The next repair should cover the verified prefix formats or correct the
underlying untyped-array loss, retain original cache/gameplay semantics, and
rerun this complete corpus comparison. Acceptance requires zero unexplained
model-list differences plus manually authenticated original-client scene and
screenshot checks, including Lumbridge, vegetation, stairs, a region crossing
and a cold login. Do not add substitute JavaScript scenery or rewrite model
opcodes in the original cache.
