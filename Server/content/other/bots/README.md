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
