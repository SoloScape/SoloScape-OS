# Forestry events — implementation notes

Source: [OSRS Wiki: Forestry](https://oldschool.runescape.wiki/w/Forestry_event) (October 2026 reference).
This is a working server-side implementation, not a claim of exact modern OSRS probability/XP parity.
Native client/map assets must exist in the configured cache for an event to spawn.

## Nine supported events

| Type | Mechanics | Rewards |
|---|---|---|
| Rising Roots | Six shared roots; rotating anima-infused harvest window, requires axe | Woodcutting XP, bark |
| Struggling Sapling | Three ordered mulch ingredients from five piles; nutrition from 10% to 100%; collective sapling growth | Woodcutting/Farming XP, bark, leaves on success |
| Friendly Ent | Five entlings with different pruning requirements, shared completion progress | Woodcutting/Fletching XP, bark, leaves and possible egg nest |
| Flowering Tree | Eight differently coloured bush NPCs; five phases of two matching pollen bushes | Woodcutting XP and bark |
| Woodcutting Leprechaun | Six non-clickable End of Rainbow scenery objects appear one by one; standing exactly on each grants 12 persistent fifth-luck units (up to 255). Each subsequent successful level 2+ Woodcutting harvest consumes five units for bonus XP and about 22.4 anima bark. NPC acts as a bank deposit box; eligible choppers may deposit anything, visitors only logs/woodcutting materials. Warning at 38 ticks before leaving. | Banking utility, deferred Woodcutting XP and bark |
| Beehive | Native unfinished beehive NPC; logs consumed over six collective hives | Construction/Woodcutting XP, bark and sturdy beehive parts |
| Poachers | Frightened fox, poachers, 15 possible timed traps; loss after three missed traps | Hunter/Woodcutting XP, bark, fox whistle chance |
| Enchantment Ritual | Dryad and eight timed groups of five native coloured/shaped ritual-circle NPCs | Woodcutting XP, bark, petal garland chance |
| Pheasant Control | Four nests with a moving guard, one egg at a time, timed delivery to forester | Thieving/Woodcutting XP, bark, pheasant feathers, golden egg |

## World rules

- A Forestry kit is necessary for a spawn; the selected event is randomly chosen from all nine.
- A skilling roll records a player's recent tree history even on a failed log roll. Only the last two tree sessions in the past 300 server cycles are used for eligibility.
- An event is scheduled during the tree's lifetime and can attempt to appear on tree depletion; a final spawn roll uses tree level and nearby player count.
- Other events within 30 tiles, including one already active, block nearby spawning; a tree also receives a 40–120 second scheduling buffer.
- Eligibility is captured at the start and removed if the player chops away before interacting. Ineligible players may still interact for reduced XP.
- Participation progress is per player; event objectives and entities are shared for every player in the area.
- Session data and normal per-event progress are ephemeral. **Exception:** Leprechaun's luck is an `AttributeKey<Int>` persisted under `forestry_leprechaun_luck` across logouts/restarts. The kit's bark storage is used **only** if its inventory scope is permanent.

### Differences still requiring live verification

Exact tree-specific spawn odds, XP/bark reward tables, animations, membership-world detection, variation in event NPC graphics, bush colour/shape cache mappings and placement geometry are not verified in a running client. The event uses conservative approximation for those values and fails closed when a cache object/NPC cannot be found. Leprechaun rainbows now grant a persistent chopping buff on tile overlap rather than an immediate click reward. The bonus XP formula is a conservative tree-level/base-XP approximation because the exact OSRS equation is not exposed in the retrieved source. The bank handler deposits directly from the inventory; log/Forestry basket contents and special player-owned item containers remain for gameplay testing because no matching basket storage implementation was located. Friendly Ent item rewards and non-participant final rewards also need parity review.

The server requires a rebuilt cache and authenticated in-client testing to confirm that each of the nine spawns visually and has its expected clickable options. A successful GitHub commit **does not** establish runtime parity.

## Development

- Event state, spawns, handlers, and rewards: `scripts/ForestryEvents.kt`.
- Persistent fifth-unit luck handling: `scripts/ForestryLeprechaunLuck.kt`.
- Spawn formulas, contribution accounting, mulch, and eligible tree history: `scripts/ForestryRules.kt`.
- Hook from native Woodcutting skilling rolls: `scripts/Woodcutting.kt`.
- Standalone regression checks: `src/test/kotlin/org/rsmod/content/skills/woodcutting/scripts/ForestryRulesCheck.kt`.

To validate locally (Windows checkout with the complete server cache/dependencies), run `build.bat Server`, then `python tools/test_woodcutting.py`. Next, login with a developer test account and run `::forestry ROOTS` (or `SAPLING`, `ENT`, `FLOWERS`, `LEPRECHAUN`, `HIVE`, `FOX`, `RITUAL`, `PHEASANT`). This is a protected cheat command; only one event can be active nearby. For Leprechaun testing: `::forestry LEPRECHAUN`, walk onto each coloured end-of-rainbow tile (do not click), wait for the sequential spawns and 38-tick leaving warning, then successfully chop an oak or higher tree and confirm luck reduces by five, bonus bark/XP is awarded, and remaining luck survives relogging. Test eligible vs late-arriving player banking, non-stackable logs, ironman restrictions, and full bank capacity. Exercise all other events, test concurrent eligible/non-eligible players and verify no server warnings, collisions or item/XP dupes. Member/non-member world gating must be connected once the server exposes world type.
