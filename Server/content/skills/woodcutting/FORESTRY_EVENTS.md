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
| Woodcutting Leprechaun | Log deposit into native player bank, six rainbow effects | Utility, Woodcutting XP and bark |
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
- Session data and per-event rewards are not persisted as long-lived player attributes. The kit's bark storage is used **only** if its inventory scope is permanent.

### Differences still requiring live verification

Exact tree-specific spawn odds, XP/bark reward tables, animations, membership-world detection, variation in event NPC graphics, bush colour/shape cache mappings and placement geometry are not verified in a running client. The event uses conservative approximation for those values and fails closed when a cache object/NPC cannot be found. The Leprechaun's rainbow effect is an immediate interaction reward here rather than a true timed chopping buff; log-basket depositing and special player-owned item containers remain for gameplay testing. Friendly Ent item rewards and non-participant final rewards also need parity review.

The server requires a rebuilt cache and authenticated in-client testing to confirm that each of the nine spawns visually and has its expected clickable options. A successful GitHub commit **does not** establish runtime parity.

## Development

- Event state, spawns, handlers, and rewards: `scripts/ForestryEvents.kt`.
- Spawn formulas, contribution accounting, mulch, and eligible tree history: `scripts/ForestryRules.kt`.
- Hook from native Woodcutting skilling rolls: `scripts/Woodcutting.kt`.
- Standalone regression checks: `src/test/kotlin/org/rsmod/content/skills/woodcutting/scripts/ForestryRulesCheck.kt`.

To validate locally (Windows checkout with the complete server cache/dependencies), run `build.bat Server`, then `python tools/test_woodcutting.py`. Next, login with a test account, activate each event, test concurrent eligible/non-eligible players and verify no server warnings, collisions or item/XP dupes. Member/non-member world gating must be connected once the server exposes world type.
