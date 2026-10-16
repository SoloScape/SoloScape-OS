# Forestry events — implementation notes

Source: [OSRS Wiki: Forestry](https://oldschool.runescape.wiki/w/Forestry_event) (October 2026 reference).
This is a working server-side implementation, not a claim of exact modern OSRS probability/XP parity.
Native client/map assets must exist in the configured cache for an event to spawn.

## Nine supported events

| Type | Mechanics | Rewards |
|---|---|---|
| Rising Roots | Six native roots on reachable tiles inside a 5x5 grid centred on the tree (centre tile excluded), with ordinary roots periodically relocating within the grid. First anima-infused root at 25–35 ticks; then every 20 ticks, up to six appearances. Four-tick chopping by default; two-tick rolls require actual Auto Retaliate flinching with a fast weapon and cancel/re-click timing. Woodcutting 15 and an axe required. Felling-axe rations can add XP but reduce bark. | Woodcutting XP and per-chop bark (no completion payout) |
| Struggling Sapling | Native 1x1 sapling; collecting three ordered ingredients visibly changes the inventory mulch through its three native stages. Packed mulch is consumed when applied; collective growth uses nutrition from 10% to 100%. | Woodcutting/Farming XP, bark, leaves on success |
| Friendly Ent | Five entlings announce native haircut requests, walk along validated routes, and accept Prune-top/back/sides on options 3/4/5. Incorrect choices stun the player; completed entlings use the pruned model. | Woodcutting/Fletching XP, bark, leaves and an egg nest on the ground (guaranteed when all five are pruned) |
| Flowering Tree | Eight differently coloured bush NPCs; five phases of two matching pollen bushes | Woodcutting XP and bark |
| Woodcutting Leprechaun | Six non-clickable End of Rainbow scenery objects appear one by one on reachable tiles; the previous rainbow is removed before the next. Standing exactly on each grants 12 persistent fifth-luck units (up to 255). Each subsequent successful level 2+ Woodcutting harvest consumes five units for bonus XP and about 22.4 anima bark. NPC acts as a bank deposit box; eligible choppers may deposit anything, visitors only logs/woodcutting materials. Warning at 38 ticks before leaving. | Banking utility, deferred Woodcutting XP and bark |
| Beehive | Native unfinished → halfway → completed NPC (IDs 12515–12517); six shared hives, 50-log maximum, POH eligibility, basket support, membership-world gating, and 3-tick transitions | Log-tier Construction/Woodcutting XP and 2–6 bark per log, 25–26 bark and independent 2/3 sturdy-parts roll per completed hive |
| Poachers | Frightened fox, poachers, 15 possible timed traps; loss after three missed traps | Hunter/Woodcutting XP, bark, fox whistle chance |
| Enchantment Ritual | Eight groups of five reachable, native coloured/shaped circles. Standing on the unique circle rewards each player once per step and heals the dryad once for the shared step. | Woodcutting XP (2 x level + 60 per step; 2 x correct steps x level + 55 at completion), bark, petal garland chance |
| Pheasant Control | Four reachable nests; three visible pheasants guard occupied nests and one empty nest changes up to eight times. A real inventory egg is consumed by the forester. Returning pheasants stun nearby players and steal held eggs. | Thieving/Woodcutting XP, bark and feathers on delivery, golden egg chance on collection; no completion reward |

### Rising Roots OSRS parity (16 October 2026)

- [OSRS Wiki: Rising roots](https://oldschool.runescape.wiki/w/Rising_roots), August 2026 revision: 93-second duration; the first anima root emerges between ticks 25 and 35, changes at 20-tick intervals, and appears at most six times.
- A regular chop grants 0.55 times visible Woodcutting level XP; an anima-root chop grants 1.2 times visible Woodcutting level XP, before outfit multipliers. Bark uses level-scaled brackets of 2–4 regular and 8–13 infused, with one bark for ineligible arrivals. Exact intra-bracket probabilities are not published; this implementation interpolates by level.
- Felling axes with available Forester's rations consume one ration per chop, gain 10% XP and have a 20% chance of receiving no bark. Normal chopping follows the same player actionDelay clock as ordinary Woodcutting. Two-tick rolls require the existing combat engine to flinch an idle player (Auto Retaliate enabled, a fast weapon, and correctly timed incoming hits), then a manually restarted root interaction; merely having a recent lastcombat value is insufficient, and double-rolls in one tick are blocked.
- Roots receive no generic event-completion XP or bark, and the per-chop bark is not capped at 256 by the contribution tracker. Root placements and regular-root relocations stay inside the 5x5 grid centred on the tree (24 possible locations excluding the tree tile). Six roots coexist initially, with one converting to an anima-infused root during its active phase; no more than one infused root exists at a time. The exact regular-root count and movement cadence remain provisional pending live OSRS comparison.
- Native **rise/sink animations** now reproduce the visible underground transitions in [Theoatrix's Forestry guide, 2:37–2:44](https://youtu.be/zbGQtgRI3L4?t=157): `seq.forestry_rising_roots_spawn` (10085) and `seq.forestry_rising_roots_despawn` (10086), both lasting seven ticks in the revision-240 cache. Initial roots rise; idle regular roots sink in place for seven ticks before relocating and rising at the new tile. Anima-root switches begin sinking seven ticks ahead of the original first/20-tick appearance schedule, and the special/ordinary replacements rise together when that scheduled switch occurs. Chopping is paused on sinking roots. Relocation leaves the old root in place until its animation ends, retains the six-root count, respects the 5x5 collision/path checks, and restores the old root if its reserved destination becomes obstructed.

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
- Completing a hive awards 25 (2/5) or 26 (3/5) bark plus bonus Woodcutting XP per eligible contributor. Supplying logs awards log-tier XP and bark: regular logs grant 40% of Woodcutting level, 20% of Construction level, and 2–3 bark; oak/willow/teak/maple/mahogany grant 55–60% Woodcutting, 30% Construction, and 4–5 bark; arctic pine/yew/magic/redwood grant 75–80% Woodcutting, 40% Construction, and 5–6 bark. Construction XP requires an owned POH, as checked through the real HouseStore. Late visitors receive only 1 Woodcutting XP and cannot earn parts. Successful sturdy-parts drops print the OSRS reward message.
- Scaling currently uses `5 × min(active choppers, 10)` logs per hive, with a minimum of one chopper and a hard cap of **50 logs**. This **intermediate interpolation is provisional**: the OSRS Wiki confirms the ten-chopper and fifty-log limits, but its mathematical equation is missing from the accessible text mirror. It is isolated in `ForestryHiveRules.logsPerHive` for exact parity adjustment once verified. Native animation IDs and exact XP scaling beyond the cited level-50 examples remain unconfirmed.
- Inventory logs are consumed first, then the durable 28-log shared basket contents; the basket must be carried or worn. Both Log basket and Forestry basket have real cache-backed open/closed inventory item forms (28140/28142 and 28143/28145), switched on Open/Close. Fill transfers genuine inventory logs; Check reports count and type and offers a separate **Empty logs** choice, instead of conflating Open with Empty. Forestry basket provides **View** and **Configure** submenus for its log storage. Stored contents remain shared when swapping basket types or wearing them.
- With a basket open, Woodcutting deposits harvested logs into it even when the inventory is full, preserving the skilling XP, notifications, and axe charges; it never puts a duplicate log into inventory. When the native Bank Deposit Containers component is available, its button deposits held **or worn** baskets using the existing bank's transactional insertion pathway; failed/full-bank transfers leave remaining logs untouched. The component is optional for older caches and diagnostic mapping is logged by `ForestryEventsCheck`. Deposit-box bank-side right-click actions, every Forestry kit submenu detail, and live bank UI geometry still require in-client validation.
- Optional Friendly Bees and Wild Beehive NPCs are selected only when a matching cache-backed asset exists. Friendly Bee swarms periodically wander short, routed distances around the event, avoiding occupied objective tiles; the beekeeper and beehive stay still. Test in the client that they render and roam, and confirm the correct build interaction, animations and sound. Members status is checked using both the player membership flag and `members-world` from `game.yml` (defaults to true; set false for an F2P world).
- Cache-backed `ForestryEventsCheck` tests six full hive cycles, halfway/complete models, scaling with two choppers, late spectators and timeout without a rare-part reward. `ForestryHiveCheck` asserts reward thresholds, log tiers, and part-roll probabilities. The branch push workflow builds the server and runs `tools/test_woodcutting.py`.

### Beehive reward-list audit (15 October 2026)

The Old School RuneScape Wiki's 4 August 2026 Beehive rewards table includes
**Achey tree logs** (regular), **Jatoba logs** (intermediate), and **Camphor,
Ironwood, and Rosewood logs** (high-tier), in addition to the previously
supported logs. All fifteen are now present in `ForestryRules.logs`. Jatoba
uses the 55–60%-of-Woodcutting-level, 30%-of-Construction-level, 4–5-bark
tier; Camphor/Ironwood/Rosewood use 75–80% Woodcutting, 40% Construction,
5–6 bark. Basket and Beehive inventory input both use the same shared
accepted-log list. New hardwoods are only usable if real item definitions
exist in the running cache; `ForestryEventsCheck` prints these four cache
names/IDs and verifies mappings when available (the cache currently built
by CI may predate the newer Sailing items).

The completion XP calculation remains isolated in
`ForestryHiveRules.completionXp(level)` as **5.45 × level − 0.02 × level²**.
The regular Wiki page's equation fails to render in the accessible text mirror
but this exact formula also appears in the
[OSRS Wiki's user sandbox Beehive graph source](https://oldschool.runescape.wiki/w/Module:Sandbox/User:Keplare/Beehive_event).
A sandbox source corroborates the equation, but is **not authoritative
proof** that the current game applies the same formula or rounding.
`ForestryHiveCheck` snapshots this provisional curve at 50/60/70/80/90/99
to detect regressions, without misrepresenting those predictions as measured
OSRS XP. The per-hive 25 (2/5) / 26 (3/5) bark and 2/3 sturdy-parts reward,
and the requirement for at least one contributed log per completed hive,
remain unchanged.

### Beehive shared visual progress and completed-hive dialogue (15 October 2026)

At [3:08 in the player's reference footage](https://youtu.be/zbGQtgRI3L4?t=188),
the unfinished Beehive shows a **red-to-green progress bar above the NPC**:
the red remainder shrinks from right to left as logs are added and the green
fill increases left to right. The native NPC health headbar (`health_70`,
ID 12 in this cache) is now reused as the hive's shared progress indicator.
Its **70 discrete segments** are enough to visibly increase after every
log even for a 50-log hive. We send 0% when the hive first appears,
update after every log (including stage changes), show 100% on completion,
and reset to 0% for each of the six new hives. While idle we re-send the
bar every 15 game ticks to keep it visible. It is visible to all nearby
players and represents shared hive progress, not damage or combat HP.

The clip shows the exact completed-hive dialogue, **"The hive is complete
and won't benefit from any more wood."**, with a **"Click here to continue"**
pause when the completed hive is clicked. Clicking Build on a completed
hive now uses native `mesbox` rather than a plain game message. When a
player finishes the final log on a hive, that same text is also sent as a
game message, without interrupting the repeated-build queue. This preserves
the original click-to-continue interaction without blocking the automatic
construction loop.

`ForestryHiveCheck` tests the full red-to-green progression and verifies
that every contributed log advances the fill, including at the 50-log cap.
`ForestryEventsCheck` captures the actual public NPC headbar emitted at
spawn and after each log across six hives. In-client positioning and
persistence still need visual verification.

### Beehive native quantity interface (15 October 2026)

Click **Build** on an unfinished Beehive to open the **native OSRS SkillMulti chatbox item/quantity interface** (`interface.skillmulti`, client script 2046) instead of the old plain-text options menu. Its exact title is **"How many logs would you like to add?"** as seen at 03:06 in the supplied OSRS gameplay footage. Select a quantity (1, 5, X, All, with any additional buttons the native client supports), then click **the actual log type** shown in the item list to begin building. The selector now enumerates only the real logs in the player's inventory and any carried/worn basket, grouping each available log type in its own item tile with its genuine cache icon. It **does not** display the Beehive/sturdy-parts output icon. This fixes the issue reported in the 19:16 in-game screenshot.

The native interface is already used by Fletching and other SoloScape skilling scripts, including its Make-X quantity input handling. When only a few logs are carried, the client's CS2 normally hides the 5/X quantity buttons and shows only 1/All. The Beehive selector supplies a **display-only minimum quantity of 9** to keep the full native controls visible; all server-side selections are still clamped to the actual count of the *selected log type*, so 5/X/All cannot fabricate logs. Selecting a quantity **alone does not consume logs**; clicking a log item starts building *that type only*. The build queue consumes that type from inventory, then from existing basket storage. Running out of the selected type stops building instead of switching to another type. Closing/cancelling the selection consumes nothing.

Each log is consumed **after** the existing native POH Construction animation (`seq.human_poh_build`) plays for two game ticks. Logs and rewards are processed individually; multiple logs do not duplicate a hive-completion reward. Building stops if the player moves, another action interrupts access, the current hive changes or despawns, the event ends, or logs run out. Attempting to add wood to a completed hive now produces the original footage's message: **"The hive is complete and won't benefit from any more wood."**

The Beehive building loop now plays the supplied hammer audio IDs through native sound gamevals: **1767** (`synth.hammer_and_build`) at the start of a new hive and at the start of its second (halfway) building section, and **1770** (`synth.hammering`) on the intervening repeated log actions. Each sound is paired with the native construction animation when that action starts, not awarded after completion or triggered from opening the quantity dialogue. The sound choice is pure and regression-tested for 5-log and 50-log hives. Client playback, proximity/audibility to other players, and exact OSRS sound scheduling still require a live comparison; the IDs are user-supplied. The exact character animation still requires an in-client OSRS comparison. Native `SkillMulti` availability and item definitions are verified by the cache-backed Forestry test; quantity configuration and title are checked by `ForestryHiveCheck`, and inventory/basket per-type selection/consumption by `ForestryLogBasketCheck`. The new minimum-display control and appearance of 1/5/X/All still require a manual client smoke test.

### Differences still requiring live verification

Exact tree-specific spawn odds, XP/bark reward tables, animations, membership-world detection, variation in event NPC graphics, bush colour/shape cache mappings and placement geometry are not verified in a running client. The event uses conservative approximation for those values and fails closed when a cache object/NPC cannot be found. Leprechaun rainbows now grant a persistent chopping buff on tile overlap rather than an immediate click reward. The bonus XP formula is a conservative level-based approximation because the exact OSRS equation is not exposed in the retrieved source. The bank 'Empty Containers' button for worn log baskets and special player-owned item containers remains for gameplay testing. Exact basket Fill/Open/Empty interactions and item variant selection require live-client validation. Friendly Ent item rewards and non-participant final rewards also need parity review.

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
