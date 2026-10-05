# PvP bots

Wilderness and clan bots use a tick-based controller adapted from the PK behaviours in
[RSPSApp/tsps](https://github.com/RSPSApp/tsps/tree/c40e57fd95c8edb400ded74e1dde9fe87c3e8d7e/server/plugins/bots).
This is a native Kotlin adaptation, not a JavaScript runtime or a replacement combat engine.

## Spawn and configure

`::bots wildy 10 elite` spawns ten elite Wilderness bots.
The optional third argument accepts `novice`, `standard`, `veteran` or `elite`.
It also applies to `clana` and `clanb`; `::botinfo` displays difficulty, loadout and current action.
The default is `pvp.difficulty=standard` in `bots.properties`, overridden by `.data/bots.properties`.
Existing skilling, trading, progression and Castle Wars controllers remain separate.

## Behaviours

- Four difficulty profiles vary reactions, eating, style switches, movement and spec decisions.
- Eighteen native loadouts include pures, zerkers, tanks, mains, ranged, Vengeance,
  standard magic, ancient hybrid/tribrid and F2P range-to-two-handed builds.
- Protection and offensive prayers use native requirements and drain. Reaction delay follows
  a stable observed opponent style instead of instantly countering every equipment change.
- Bots counter protection prayers, avoid melee when frozen out of range, use finisher specs
  when energy and target health permit, and return to their normal gear afterward.
- Supported spells use normal spellbook, rune, level and quest validation. Ancient attacks
  freeze through the normal combat system; standard magic presets can use binding spells.
- Frozen opponents can be kited or stepped underneath between attacks.
- Vengeance, regular food plus karambwan combos, prayer/stat restoration and combat boosts
  use ordinary item and spell handlers. Supplies and special energy are finite during fights.
- Wilderness retreat includes a running grace period, normal teleport restrictions and
  safe restocking. Native death/drops run first; recovered bots re-equip and walk back.
- Target selection prioritises retaliation and continuing a fight, avoids allied players,
  respects Wilderness combat ranges and single-way ownership, and caps bots targeting a
  real player in multiway combat at two.

## Deliberate native differences

SoloScape registers granite maul as an ordinary combat special with two queued hits.
This port prepares and switches that weapon but preserves the engine attack delay; it
does not reproduce TSPS's instant G-maul combos or bypass PvP legality to fabricate them.
Special finisher prediction uses the equipped normal max hit plus a low-HP threshold;
it is a heuristic, not an exact prediction of switched special damage.

TSPS's randomized healing and free stat boosts are replaced with real consumables.
The loadouts are native equivalents of combat families, not a copy of all 89 TSPS gear
archetypes or its hotspot weighting. Existing native quest/prayer unlocks still apply.
This change does not alter official OSRS accuracy or Castle Wars objective logic.

## Verification

The bot workflow compiles the changed Kotlin against the bundled server libraries and runs
the existing bot checks plus `BotPvpCheck`. Decision checks cover reaction cancellation,
counter-style selection, frozen positioning, eating/retreat thresholds, spec energy,
target priority and loadout invariants.

Live acceptance: spawn each difficulty, attack it with changing weapons/protection prayers,
check food and rune depletion, confirm specs obey attack delays, freeze/teleblock a retreating
bot, and kill one to verify loot and return behaviour. Test both singles and multiway and F2P.
A live client is needed to assess combat feel and the installed cache's item/spell availability.

## Attribution

Difficulty parameters and behavioural design derive from RSPSApp/tsps at
`c40e57fd95c8edb400ded74e1dde9fe87c3e8d7e`.
Its BSD-2-Clause notice is preserved in `src/main/resources/TSPS-LICENSE.txt` and is
packaged with this module. Existing SoloScape/RS Mod licensing is unchanged.
