# PvP bots

Wilderness and clan bots use a tick-based controller adapted from the PK behaviours in
[RSPSApp/tsps](https://github.com/RSPSApp/tsps/tree/c40e57fd95c8edb400ded74e1dde9fe87c3e8d7e/server/plugins/bots).
This is a native Kotlin adaptation, not a JavaScript runtime or a replacement combat engine.
The workflow pins the TSPS PvP loadout and hotspot JSON blobs at that revision before running
the port checks.

## Configure

World bot population is controlled by `.data/bots.properties` under the server working
directory. The server creates this file from the bundled defaults if it is missing.
Edit the file and restart the server to apply changes; settings are read at startup.

For example, to run ten elite Wilderness bots and disable the other world populations:

```properties
enabled=true
members=true
skilling=0
progressive=0
combat=0
wilderness=10
trade=0
dropparty=0
clanone=0
clantwo=0
pvp.difficulty=elite
```

Each mode's value sets its bot count; zero disables that population. `enabled=false`
disables world bot spawning. `members` selects members or F2P builds.
`pvp.difficulty` accepts `novice`, `standard`, `veteran` or `elite` and applies to
Wilderness and both clan populations. The default is `standard`.
`::botinfo` displays difficulty, TSPS archetype/hotspot and current action.
Population changes use the properties file; the spawn/removal commands are removed.
Existing skilling, trading, progression and Castle Wars controllers remain separate.

## Skilling equipment and gathering

Skilling bots wear job-specific worker clothes and leave the shield slot empty.
Members upgrade to lumberjack clothing at 44 Woodcutting, and prospector or angler
clothing at 40 Mining or Fishing. Beginners and F2P bots use simple work clothes;
cooks wear chef hats and white aprons, smiths and crafters wear brown aprons, and
runecrafters wear robes with wizard hats or matching rune tiaras. Individual styles
vary cape use and headwear. Fishing, cooking and smithing outfits normally omit capes.
Members with 99 in their current task skill wear its skillcape. Outfits refresh at
bank resupply after job or level changes, reusing stored clothing. Saved armour is
banked instead of covering the new outfit. Farming and thieving tasks are not yet
part of this bot catalogue.
Woodcutters and miners wield the highest ordinary axe or pickaxe allowed by their
skill level, Attack level and world membership, up to Dragon.
Tool tiers are stocked at initialization; bank resupply updates the tool after a
task change or level increase. Saved progressive profiles also have old swords and
shields moved into their bank when initialized for skilling.

Gathering selects reachable resources and checks tree/rock level requirements.
Woodcutting task names also match the cache's `Oak tree`, `Willow tree`, `Yew tree`
and other tree-name suffixes, rather than searching only for the bare species.
Oaks, willows, yews and magic trees allow multiple woodcutters, each reserving a
separate standing tile. All fishing bots can share a spot and its reachable standing
tiles, without an occupancy limit. Net tasks accept the cache's `Small Net` option;
rod tasks also match `Rod Fishing spot`. Other resources retain exclusive ownership.
If the first approach tile is occupied, bots try other reachable tiles accepted by the native
location interaction strategy. Temporary depletion causes a retry after ten game
cycles, widening the local search from 12 to 30 tiles; ten failed attempts trigger
a bank return and a new task selection.
Pending interactions still receive movement/XP stall checks,
so a blocked interaction cannot bypass recovery indefinitely. Full inventories,
task expiry, progression milestones and missing supplies still trigger banking.
`::botinfo` shows whether a bot is working, waiting for a resource or recovering.

Gate and other explicit crossing waypoints require exact arrival on both sides;
ordinary waypoints retain their two-tile tolerance and destination spread. Al Kharid
crossings use the native `Pay-toll(10gp)` action, and bots retain a 100-coin travel
reserve when banking. Blocked walking links can be replanned through road points
using native collision checks. Repeated movement failures exclude the failed task
for 1,000 game cycles before another activity is selected. An unavailable route to
a bank is never treated as arrival. Bank returns and stall recovery use native
walking/running routes; recovery never teleports a bot to the bank.
Protected actions with no movement or XP for
200 cycles (120 seconds) are cancelled once the player is no longer delayed, so
an unhandled dialogue or modal cannot suppress the bot controller indefinitely.

The cache-backed `BotSkillingCheck` covers tool tiers, case-insensitive supply
requirements, native equipment transactions, saved shield removal and mining
level eligibility, shared-tree species and cache-backed targets for every
woodcutting task. `BotActionsCheck` covers separate standing tiles, occupied
approaches, rotated footprints, exhausted capacity and unreachable trees.
It also checks 300 fishing approaches at an occupied spot and rejects unreachable spots.
`BotMovementCheck` covers exact gate endpoints, collision-aware detours and the
protected-action timeout, including movement/XP resets. Fishing names, options
and the toll-gate operation are also checked against the installed cache.
Confirm harvesting animations, inventory/XP gains and bank
returns in a live game after restarting the rebuilt server.

## Local bot debugger

After rebuilding and restarting the server, run `::botdebug on` as an administrator.
Open `http://127.0.0.1:7071/debug` (or your configured `debug.map.port`) to filter
bots by name, task or failure reason. The existing localhost map must be enabled
with `debug.map.enabled=true` for the browser page; file export works independently.
Click a status to inspect its target-selection report and last 16 activity changes.
Idle seconds measure time without movement or XP; they indicate a possible stall,
not proof that a harvesting attempt failed.

Every ten game ticks the debugger exports an atomic, readable snapshot to
`Server/build/bot-debug/snapshot.json`, ignored by Git. Codex can read that file
directly during play, so no chat text needs to be pasted. It includes task/phase,
position, route waypoint and steps, pending interaction, delay/protection flags,
inventory usage, resource retries, stall checks, recoveries and the explicit reason
for returning to bank. Selection reports count matching candidates rejected for
level eligibility, reservations, unavailable options or lack of a free reachable
approach. This distinguishes a missing target from a crowded/blocked approach.

Run `::botdebug off` to stop recording; the last file remains for inspection and its
timestamp identifies when it was captured. Debugging is off by default and stops
with the server. File writes run off the game thread using immutable snapshots and
a single coalesced pending export. Reports include only bot gameplay fields, never
account credentials or real-player records. `BotDebuggerCheck` verifies history
bounds, progress/idle tracking, export and read-only localhost HTTP endpoints.

## Wilderness squads

Wilderness PKers have a 25% chance to start a squad instead of spawning alone. Squad
sizes are randomly chosen as duos, trios or quads, up to the remaining Wilderness
population. Only multi-combat areas are used for squad spawn points; if no suitable
reachable multiway tile exists, the bot spawns solo.

`pvp.teams.chance=0.25` in `.data/bots.properties` controls the group spawn chance.
Set it to `0` to disable teams, or `1` to attempt teams whenever at least two bot
slots remain. Each squad counts toward the configured `wilderness` population,
rather than adding extra bots.

A squad has a leader who patrols inside multi-combat. Followers spawn nearby,
follow the leader instead of independently roaming, and adopt the leader's target.
If any member is attacked, all eligible squad members prioritise that attacker.
They never attack their own squadmates, and group-assisted targeting only operates
when both attacker and target are in multi-combat. Each bot still obeys native
Wilderness level, combat-bracket, combat ownership, spell and weapon restrictions.
If a leader dies or despawns, an active member takes over; respawning survivors
return to their leader or the squad's multi-combat home. `::botinfo` shows a bot's
squad size and whether it is the leader or a member.

## Player-led Wilderness teams

In addition to bot-only squads, lone Wilderness PK bots periodically have a 15%
chance to ask a nearby real player `Team?` in public chat. The bot must be idle,
within ten tiles, and in the Wilderness. Only the addressed player's public-chat
`yes` accepts the offer; `no` rejects it and makes the bot move on with an
extended retry cooldown. The rejecting player is temporarily ignored as a PvP
target unless they attack the bot first. Offers expire after 30 game cycles, and bots do not
issue overlapping requests to the same player.

Once accepted, the bot follows the player and targets whoever the player is
attacking, whoever attacks the player, or attackers threatening the bot itself.
It cannot target its own human teammate. Attacks still obey all native PvP rules
including single-way ownership and Wilderness combat levels. If the player logs
out, dies, teleports out of the Wilderness or crosses south of the ditch, the
bot stops following and resumes its normal Wilderness behaviour. This is
independent of the random duo/trio/quad bot squads.

Configure `pvp.player-team.chance=0.15` in `.data/bots.properties` (0 disables
offers, 1 always offers when checked and an eligible player is nearby). This
setting applies to each periodic opportunity, not to a one-time spawn roll.

## Behaviours

- Four difficulty profiles vary reactions, eating, style switches, movement, specials,
  next-hit decisions and one-tick G-maul probability/cooldown.
- All 89 pinned TSPS archetype ids, weights and exact seven-stat lines are represented.
  Their pinned spellbooks and autocast spells are copied explicitly, including F2P bind/magic
  packages. The archetypes expand from 18 verified native SoloScape equipment templates.
- The 89 archetypes retain all 28 TSPS loadout-family memberships. Wilderness assignment filters
  families by world type and difficulty before applying archetype and hotspot style weights.
- The five enabled TSPS Wilderness hotspots are represented with their source anchors, areas,
  target/max populations, roam radii, profile/family gates, style/activity weights and fight caps.
  Spawn distribution follows `targetBots`; idle roaming is constrained to the assigned hotspot.
- Protection and offensive prayers use native requirements and drain. Reaction delay follows
  a stable observed opponent style instead of instantly countering every equipment change.
- Bots counter protection prayers, avoid melee when frozen out of range, use finisher specs
  when energy and target health permit, and return to their normal gear afterward.
- Veteran/elite G-maul archetypes can use the TSPS-style one-tick path when already committed to
  the target, attack-ready within two ticks and in melee range. The native special button owns
  the queued G-maul blows and energy spend; the bot holds the spec weapon briefly before switching.
- Supported spells use normal spellbook, rune, level and quest validation. Ancient attacks
  freeze through the normal combat system; standard/F2P magic builds carry the runes required
  for their copied autocasts and Bind where applicable.
- Frozen opponents can be kited or stepped underneath between attacks.
- Vengeance, regular food plus karambwan combos, prayer/stat restoration and combat boosts
  use ordinary item and spell handlers. Supplies and special energy are finite during fights.
- Wilderness retreat includes a running grace period, normal teleport restrictions and
  safe restocking. Native death/drops run first; recovered bots re-equip and walk back.
- Target selection prioritises retaliation and continuing a fight, avoids allied players,
  respects Wilderness combat ranges and single-way ownership, and caps bots targeting a
  real player in multiway combat at two.

## Deliberate native differences

The 89 TSPS archetypes keep their source identity, weighting, stats and magic configuration,
but their full per-slot TSPS equipment/inventory randomisation is not copied item-for-item.
They map onto 18 native equipment templates whose gameval symbols are validated in CI. This keeps
all switches executable in SoloScape while retaining the source archetype distribution.

SoloScape's existing combat engine remains authoritative. The one-tick G-maul controller does not
fabricate hits, bypass attack legality or alter weapon special rules; it only schedules the native
G-maul special in the TSPS timing window. Special finisher prediction remains a heuristic based on
the native equipped max hit and target health rather than an exact switched-special damage model.

TSPS's randomized healing and free stat boosts are replaced with real consumables. Hotspot
`activityWeights` and `maxSimultaneousFights` are retained as source metadata; assignment, family
selection, style weighting and bounded roaming are active, while those two higher-level population
signals are not used to replace SoloScape's native combat/target ownership rules. Existing native
quest/prayer unlocks still apply. This change does not alter official OSRS accuracy or Castle Wars
objective logic.

## Verification

The bot workflow compiles the changed Kotlin against the bundled server libraries and runs the
existing bot checks plus `BotPvpCheck`. Before compiling, it downloads the two pinned TSPS PvP
JSON files and rejects them unless their Git blob hashes match the expected source revision.
Decision checks cover reaction cancellation, counter-style selection, frozen positioning,
eating/retreat thresholds, finite spec energy, target priority, exactly 89 archetypes/28 families,
exact TSPS stats and 41/27/21 normal/ancient/lunar spellbook counts, five hotspot contracts,
18 native templates, F2P magic rune coverage and native gameval mappings.

Live acceptance: configure each difficulty and restart the server, attack it with changing
weapons/protection prayers, check food/rune depletion and hotspot roaming, confirm ordinary specs
obey native attack delays, exercise a veteran/elite G-maul build in melee range, freeze/teleblock a
retreating bot, and kill one to verify loot and return behaviour. Test singles, multiway and F2P.
A live client is still needed to assess combat feel and installed-cache item/spell availability.

## Attribution

Difficulty parameters, archetype metadata, hotspot definitions and behavioural design derive from
RSPSApp/tsps at `c40e57fd95c8edb400ded74e1dde9fe87c3e8d7e`.
Its BSD-2-Clause notice is preserved in `src/main/resources/TSPS-LICENSE.txt` and is packaged with
this module. Existing SoloScape/RS Mod licensing is unchanged.
