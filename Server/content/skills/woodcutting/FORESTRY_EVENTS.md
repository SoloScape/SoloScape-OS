# Forestry events — implementation notes

Source: [OSRS Wiki: Forestry](https://oldschool.runescape.wiki/w/Forestry_event) (October 2026 reference).
This is a working server-side implementation, not a claim of exact modern OSRS probability/XP parity.
Native client/map assets must exist in the configured cache for an event to spawn.

## Nine supported events

| Type | Mechanics | Rewards |
|---|---|---|
| Rising Roots | Six native roots in a reachable 5x5 area; one visibly anima-infused root rotates every 18 ticks after the opening 30 ticks. One click continues chopping while the root remains available; requires an axe. | Woodcutting XP, bark |
| Struggling Sapling | Native 1x1 sapling; collecting three ordered ingredients visibly changes the inventory mulch through its three native stages. Packed mulch is consumed when applied; collective growth uses nutrition from 10% to 100%. | Woodcutting/Farming XP, bark, leaves on success |
| Friendly Ent | Five entlings announce native haircut requests, walk along validated routes, and accept Prune-top/back/sides on options 3/4/5. Incorrect choices stun the player; completed entlings use the pruned model. | Woodcutting/Fletching XP, bark, leaves and an egg nest on the ground (guaranteed when all five are pruned) |
| Flowering Tree | Eight differently coloured bush NPCs; five phases of two matching pollen bushes | Woodcutting XP and bark |
| Woodcutting Leprechaun | Six non-clickable End of Rainbow scenery objects appear one by one on reachable tiles; the previous rainbow is removed before the next. Standing exactly on each grants 12 persistent fifth-luck units (up to 255). Each subsequent successful level 2+ Woodcutting harvest consumes five units for bonus XP and about 22.4 anima bark. NPC acts as a bank deposit box; eligible choppers may deposit anything, visitors only logs/woodcutting materials. Warning at 38 ticks before leaving. | Banking utility, deferred Woodcutting XP and bark |
| Beehive | Native unfinished → halfway → completed NPC (IDs 12515–12517); six shared hives with a 3-tick transition, a spawn-time chopper-based log target, individual per-hive contribution tracking and optional native bees/wild hive scenery | 15 Construction XP per log, Woodcutting XP, 2–6 bark by log tier, 25–26 bark and a separate 2/3 sturdy-parts roll for each completed hive a player helped build |
| Poachers | Frightened fox, poachers, 15 possible timed traps; loss after three missed traps | Hunter/Woodcutting XP, bark, fox whistle chance |
| Enchantment Ritual | Eight groups of five reachable, native coloured/shaped circles. Standing on the unique circle rewards each player once per step and heals the dryad once for the shared step. | Woodcutting XP (2 x level + 60 per step; 2 x correct steps x level + 55 at completion), bark, petal garland chance |
| Pheasant Control | Four reachable nests; three visible pheasants guard occupied nests and one empty nest changes up to eight times. A real inventory egg is consumed by the forester. Returning pheasants stun nearby players and steal held eggs. | Thieving/Woodcutting XP, bark and feathers on delivery, golden egg chance on collection; no completion reward |

## World rules

- A Forestry kit is necessary for a spawn; the selected event is randomly chosen from all nine.
- A skilling roll records a player's recent tree history even on a failed log roll. Only the last two tree sessions in the past 300 server cycles are used for eligibility.
- An event is scheduled during the tree's lifetime and can attempt to appear on tree depletion; a final spawn roll uses tree level and nearby player count.
- Other events within 30 tiles, including one already active, block nearby spawning; a tree also receives a 40–120 second scheduling buffer.
- Eligibility is captured at the start and removed if the player chops away before interacting. Ineligible players may still interact for reduced XP.
- Participation progress is per player; event objectives and entities are shared for every player in the area.
- Native event assets use exact gameval symbols rather than display-name matching. Colour tags on flowering bushes, beehives and fox traps do not prevent spawning or handler registration. The dryad is excluded from the ritual-circle variant list.
- Placement checks full footprints, existing scenery, allocated collision and an exact reachable path. It does not replace existing trees or fabricate fallback assets. Partial events are discarded when required objectives cannot be placed.
- Event entities are removed on success, timeout or plugin shutdown. Temporary mulch and eggs are removed on completion, logout and shutdown. XP rewards require matching contribution state and the inventory supplies.
- Session data and normal per-event progress are ephemeral. **Exception:** Leprechaun's luck is an `AttributeKey<Int>` persisted under `forestry_leprechaun_luck` across logouts/restarts. The kit's bark storage is used **only** if its inventory scope is permanent.

### Beehive lifecycle and reward audit (15 October 2026)

- One global progress counter is shared across players. The first 50% of each hive uses NPC 12515; reaching 50% switches to 12516; completion displays 12517 for three game ticks before a new, reachable unfinished hive is spawned at another tile. The event ends after six complete hives or the 250-tick time limit; missing stage assets cause the event to fail closed.
- Each player is tracked separately for the current hive. Contributing a single log qualifies for that hive's 2/3 sturdy-parts roll **only if that hive actually completes**. A half-finished hive does not grant a parts roll on timeout. The player must have been eligible at spawn and remain nearby on completion. The event-wide completion handler does not duplicate these awards.
- Completing a hive awards 25 (2/5) or 26 (3/5) bark plus bonus Woodcutting XP per eligible contributor. Supplying logs awards 15 Construction XP and level-scaled Woodcutting XP, with 2–6 bark depending on log type; late visitors receive only 1 Woodcutting XP and cannot earn parts.
- Scaling uses `10 × min(active choppers, 10)` logs per hive, with a minimum of one chopper. This is a **provisional balancing formula**: the OSRS Wiki confirms the number of active choppers scales difficulty up to ten, but its formula was not available in the retrieved text. It is isolated in `ForestryHiveRules.logsPerHive` for exact parity adjustment once verified. Native animation IDs and exact XP scaling beyond the cited level-50 examples remain unconfirmed.
- Inventory logs are consumed first. A log basket/Forestry basket can be used only if its corresponding `inv.log_basket` / `inv.forestry_basket` permanent inventory already exists and the player actually carries the basket. **A complete log basket storage/equipment UI has not been found in this repository**: the event must not create or destroy artificial basket contents. Native basket UI/inventory integration remains a separate prerequisite for end-to-end parity.
- Optional Friendly Bees and Wild Beehive NPCs are selected only when a matching cache-backed asset exists. Test in the client that they render, and confirm the correct build interaction, animations and sound. Members status is checked using the player membership flag; a distinct world-membership selector is still needed for precise free-world gating.
- Cache-backed `ForestryEventsCheck` tests six full hive cycles, halfway/complete models, scaling with two choppers, late spectators and timeout without a rare-part reward. `ForestryHiveCheck` asserts reward thresholds, log tiers, and part-roll probabilities. The branch push workflow builds the server and runs `tools/test_woodcutting.py`.

### Beehive quantity and animation controls (15 October 2026)

Click **Build** on an unfinished beehive to open the native dialogue with **1, 5, 10, X, All, Cancel**. X asks for a numerical count; All uses all currently available logs (limited by the current hive's remaining progress and event duration). The menu is an intentional SoloScape player-friendly addition and is not a claim that the OSRS event exposes a Make-X interface.

Each log is consumed **after** the existing native POH Construction animation (`seq.human_poh_build`) plays for two game ticks. Logs and rewards are processed individually; adding multiple logs does not duplicate a completion reward. The action stops automatically if the player moves, another action interrupts protected access, the original hive changes or despawns, the event ends, or logs run out. The selected amount is capped by the number of valid available inventory/real basket logs. Cancelling the menu or entering zero performs no build and consumes nothing.

The player-build animation uses a cache-backed Construction sequence known to be available on SoloScape; the exact original Forestry Beehive animation sequence still requires live OSRS verification. The pure quantity rules, cache asset and inventory updates have additional regression checks, but **the actual in-client dialogue and click-driven animation must be verified in-game** with `::forestry HIVE`.

### Differences still requiring live verification

Exact tree-specific spawn odds, XP/bark reward tables, animations, membership-world detection, variation in event NPC graphics, bush colour/shape cache mappings and placement geometry are not verified in a running client. The event uses conservative approximation for those values and fails closed when a cache object/NPC cannot be found. Leprechaun rainbows now grant a persistent chopping buff on tile overlap rather than an immediate click reward. The bonus XP formula is a conservative tree-level/base-XP approximation because the exact OSRS equation is not exposed in the retrieved source. The bank handler deposits directly from the inventory; log/Forestry basket contents and special player-owned item containers remain for gameplay testing because no matching basket storage implementation was located. Friendly Ent item rewards and non-participant final rewards also need parity review.

The existing revision-240 cache contains the assets used by these fixes; no cache conversion is needed. Authenticated in-client testing is still required to verify rendering, clickable options, movement and inventory updates on the wire. A successful build or server-side check **does not** establish visual gameplay parity.

## Development

- Event state, spawns, handlers, and rewards: `scripts/ForestryEvents.kt`.
- Exact native assets, collision-aware placement and inventory supplies: `scripts/ForestryAssets.kt`, `scripts/ForestryPlacement.kt`, `scripts/ForestrySupplies.kt`.
- Persistent fifth-unit luck handling: `scripts/ForestryLeprechaunLuck.kt`.
- Spawn formulas, contribution accounting, mulch, and eligible tree history: `scripts/ForestryRules.kt`.
- Hook from native Woodcutting skilling rolls: `scripts/Woodcutting.kt`.
- Standalone regression checks: `src/test/kotlin/org/rsmod/content/skills/woodcutting/scripts/ForestryRulesCheck.kt`.
- Real-cache and registry event checks: `src/test/kotlin/org/rsmod/content/skills/woodcutting/scripts/ForestryEventsCheck.kt`. Covers all nine spawns and timeout cleanup, blocked-tile rejection, repeating root chops and 18-tick visible infusion, mulch consumption, entling requests/options/movement, serial rainbows and deferred chopping XP/bark, hive building, trap disarming, ritual tile rewards/healing, and pheasant rotation/egg delivery/stuns. Also checks logout supply cleanup and duplicate action rejection.

## Forestry audit fixes

The nine numbered reports in the Forestry tab of `osrs skills audit (1).xlsx` are tracked by issues #51 through #59. This branch addresses the reported mechanisms with the native assets above. All nine still require the authenticated client check described below before visual parity is claimed. No Woodcutting-tab issue is included in this audit scope.

To validate locally (Windows checkout with the complete server cache/dependencies), run `build.bat Server`, then `python tools/test_woodcutting.py`. Next, login with a developer test account and run `::forestry ROOTS` (or `SAPLING`, `ENT`, `FLOWERS`, `LEPRECHAUN`, `HIVE`, `FOX`, `RITUAL`, `PHEASANT`). This is a protected cheat command; only one event can be active nearby. For Leprechaun testing: `::forestry LEPRECHAUN`, walk onto each coloured end-of-rainbow tile (do not click), wait for the sequential spawns and 38-tick leaving warning, then successfully chop an oak or higher tree and confirm luck reduces by five, bonus bark/XP is awarded, and remaining luck survives relogging. Test eligible vs late-arriving player banking, non-stackable logs, ironman restrictions, and full bank capacity. Exercise all other events, test concurrent eligible/non-eligible players and verify no server warnings, collisions or item/XP dupes. Member/non-member world gating must be connected once the server exposes world type.
