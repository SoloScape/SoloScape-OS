# Special tree audit

The handlers use revision-240 native objects and their existing transforms. They do not spawn replacement trees or change the source world map.

| Tree | Level | XP | Active chopping before depletion | Respawn |
| --- | ---: | ---: | --- | --- |
| Jatoba | 40 | 92 | Old hardwood 1/8 baseline; authored depletion unverified | 14 ticks |
| Camphor | 66 | 143.5 | 200 active ticks | 99 ticks |
| Ironwood | 80 | 175 | 400 active ticks | 200 ticks |
| Rosewood | 92 | 212.5 | 458 active ticks | 205 ticks |
| Sulliuscep | 65 | 127 | 1/16 per successful yield | Personal rotation to the next native mushroom |
| Blisterwood | 62 | 76 | 1/10 interruption per log; tree remains | Immediate new interaction |

Natural lumber trees use the original woodcutting duration controller and native stump types. The current Farming implementation does not provide a personalized hardwood harvesting/regrowth lifecycle. Mature farmed Camphor, Ironwood and Rosewood variants now register Chop handlers and use the ordinary 1/8 chance per successful log. Depletion is tracked in a persistent per-player, per-tree-location cooldown rather than replacing the shared world loc. The cooldown prevents further chopping until it expires even across logouts. However, the Farming plugin still does not implement a native hardwood planting/check-health/visual stump lifecycle, so **the complete farmed-tree experience (including the owner-only stump display) remains incomplete**.

Sulliusceps use `varbit.fossil_cep` and the six original `loc.fossil_cep_multi1..6` transforms. The stage persists through the existing player variable system and only the active grown mushroom can be harvested. The pre-roll table gives numulite (5â€“16), small/medium/large/rare unidentified fossils, followed by the 90/9/1 mushroom, mort myre fungus and sulliuscep cap table. The native regular-fossil and rare-fossil block settings are respected separately.

Current Sulliuscep documentation permits occasional ordinary bird nests and clue nests. Ordinary nests use the documented 1/256 base chance and 3 egg / 32 ring / 65 seed type table, with the strung rabbit foot's reduction to 95 slots. Clue nests use independent tier rolls, their documented 343,000 base chance and level formula, existing clue ownership in inventories/bank, and the server's X Marks the Spot scroll-box behavior. Combat Achievement and other equipment rate modifiers are not added here. Blisterwood gives no nest rewards and remains in place after the spider interruption. Older indexed wiki results say Sulliusceps do not give bird nests; the current raw page was used for this implementation.

All nine axe tiers for the four lumber trees and Sulliusceps use the published rate endpoints. Blisterwood's published developer-confirmed endpoints cover bronze (15/50) and dragon (61/186). Intermediate and crystal endpoints are interpolated and clearly identified in source; exact original rates remain unverified. Jatoba's published page gives its respawn time but omits its depletion rule, so its 1/8 fallback remains an explicit fidelity limitation. Neither limitation should be called proven original-game parity.

`SpecialTreesCheck.kt` verifies real cache actions, products, stump identities, ordinary/felling axe rate lookup, the native personal six-stage transformation cycle, fossil pre-roll paths and settings, all outcomes of the 90/9/1 table, and clue-rate endpoints. It does not establish in-game navigation, quest completion, Farming parity or visual gameplay.

Sources retrieved 11 October 2026:

- [Sulliuscep](https://oldschool.runescape.wiki/w/Sulliuscep)
- [Blisterwood tree](https://oldschool.runescape.wiki/w/Blisterwood_tree)
- [Jatoba tree](https://oldschool.runescape.wiki/w/Jatoba_tree)
- [Camphor tree](https://oldschool.runescape.wiki/w/Camphor_tree)
- [Ironwood tree](https://oldschool.runescape.wiki/w/Ironwood_tree)
- [Rosewood tree](https://oldschool.runescape.wiki/w/Rosewood_tree)
- [Woodcutting tree timers](https://oldschool.runescape.wiki/w/Woodcutting#Mechanics)
- [Clue nest formula and eligibility](https://oldschool.runescape.wiki/w/Clue_nest)

- [Bird nest type and base chance](https://oldschool.runescape.wiki/w/Bird_nest)

## Quest-dependent resource progress (#46)

The revision-240 infected root child `loc.demon_tear_tree_3x3_op` now has a Woodcutting handler that checks level 80 and the Final Dawn completion policy, grants demon tears and occasional logs, and does not globally deplete the root. The incidental-log chance is provisional until source rates can be independently validated. This does **not** provide the Final Dawn progression or routes to the Ruins of Mokhaiotl. Bloodwood (level 77) is a sap-bleeding and bucket-tapping activity, not a log tree; its post-Blood Moon Rises quest travel and harvesting remain unimplemented. Do not mark #46 resolved without the actual in-client routes, sap bucket behavior and quest-stage transforms.
