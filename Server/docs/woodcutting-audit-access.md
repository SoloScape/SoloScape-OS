# Woodcutting audit: quest access (#46)

Issue #46 remains open. The revision-240 cache contains the relevant native map
placements, but this audit found no server implementation of the quest access
routes or progression that makes those objects available. A basic infected-root harvesting handler has now been registered, but it is still inaccessible without the quest transform and journey. Adding an arbitrary
teleport or setting quest progress on login would not implement the reported
expected behavior.

## Verified cache evidence

Read-only inspection on 11 October 2026 used `ServerCacheManager.init(240)` against
the existing local cache. These are source map coordinates; they do not establish
player access, collision routing, or the coordinates of a copied quest instance.

| Native symbol | Map group | x, z | Level |
| --- | --- | --- | --- |
| `loc.bloodwood_tree1` | 10361 | 2596, 7779 | 0 |
| `loc.bloodwood_tree2` | 10361 | 2600, 7783 | 0 |
| `loc.bloodwood_tree3` | 10361 | 2604, 7780 | 0 |
| `loc.bloodwood_tree4` | 10874 | 2700, 7824 | 0 |
| `loc.bloodwood_tree5` | 10874 | 2693, 7822 | 0 |
| `loc.bloodwood_tree6` | 10874 | 2698, 7819 | 0 |
| `loc.afk_bloodwood_tree` | 10874 | 2697, 7832 | 0 |
| `loc.myq6_vampyrium_portal` | 12664 | 3161, 7710 | 0 |
| `loc.demon_tear_tree_3x3` | 5268 | 1289, 9515 | 1 |
| `loc.demon_tear_tree_3x3` | 5268 | 1295, 9516 | 1 |
| `loc.demon_tear_tree_3x3` | 5268 | 1300, 9509 | 1 |
| `loc.demon_tear_tree_3x3` | 5268 | 1321, 9509 | 1 |
| `loc.demon_tear_tree_3x3` | 5268 | 1325, 9516 | 1 |
| `loc.demon_tear_tree_3x3` | 5268 | 1332, 9508 | 1 |

The Bloodwood tree parents use `varbit.bloodwood_tree_visual_state1` through `6`
and transform to `loc.bloodwood_tree_default01` (Chop),
`loc.bloodwood_tree_default01_cut01` or `cut02` (Tap). Associated native bucket
placements are present in the same two groups. This activity requires its own
chopping, tapping, sap and regeneration behavior; generic log rewards would not
implement it.

The Vampyrium portal parent uses `varbit.myq6` (15464). Stage zero resolves to no
object. Its quest-stage transform list contains
`loc.myq6_vampyrium_portal_vis` (61216), with the Enter action. Neither the presence
of that asset nor an assumed quest completion proves a working travel handler.
[Jagex's release description](https://secure.runescape.com/m=news/the-blood-moon-rises---out-today?oldschool=1)
identifies Vampyrium and Bloodwood as post-completion content for The Blood Moon
Rises.

The infected roots are present as transformed parents, rather than direct
placements of the actionable child. `loc.demon_tear_tree_3x3` (56780) uses
`varbit.vmq4` (16663), resolves to inactive child 56782 at stage zero, and ultimately
to `loc.demon_tear_tree_3x3_op` (56781), named Infected root with Chop. Looking only
for direct placements of 56781 incorrectly reports a missing map asset.

## Remaining implementation and verification

Searches of `content/quest`, `content/areas` and `content/travel` found no `myq6` or
`vmq4` gameplay scripts, portal handling, or native quest entry sequence.
`QuestRequirements` supports assumed or virtual completion checks, while
`QuestPolicySyncScript` sends completion flags to the client without changing real
quest progress. Those mechanisms do not advance these map-object transforms or
provide travel interactions.

A completed fix still needs native entry and return routes, the applicable completion
policy, and the original post-quest Bloodwood chopping/tapping and sap collection. The current infected-root handler awards tears and logs with a provisional log rate; its action still requires end-to-end verification. Verify both completion
and unfinished-quest cases in the client, including actual travel, reachable
objects, rewards and return travel. If quest maps are copied into instances,
verify their mapping rather than treating source coordinates as destinations.

## Reproducible read-only check

`content/skills/woodcutting/src/test/kotlin/org/rsmod/content/skills/woodcutting/WoodcuttingAccessCheck.kt`
is a standalone Kotlin entry point. Compile it against the server runtime jars
and run `org.rsmod.content.skills.woodcutting.WoodcuttingAccessCheckKt` with the
Server directory containing the real cache as the working directory. It checks
that the native assets, quest-stage transforms and parent placements exist, then
prints their symbols and coordinates. It does not mutate progress, load accounts,
start the server or manufacture routes.

The check passed against the existing local cache. Map group 25287 could not be
decoded and was explicitly reported; all required placements were independently
found in the groups above. Passing this check proves asset availability, not
resolution of #46 or gameplay parity. Cache logs and probe jars remain in ignored
`build/` directories.
