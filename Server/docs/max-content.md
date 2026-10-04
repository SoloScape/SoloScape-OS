> Historical build instructions: the build system and its workflows have been removed. Commands and build-file examples below require a separately configured build system.

# max-content integration

This checkout starts from Blade9766's `Content-Drop` at `d586bfdf1` and integrates
the requested sources locally on the `max-content` branch. The original checkouts
in `../OpenRuneForks` are unchanged. Nothing has been pushed or published.

| Source | Integrated revision | Selection |
| --- | --- | --- |
| OpenRune upstream | `ea1329d47` | All five commits missing from Blade, including the boss DSL and cutscene movement fixes |
| [Agility #227](https://github.com/OpenRune/OpenRune-Server/pull/227) | `98fe5d9a0` | New course and shortcut engine, cache tables, tests, dump tools and documentation |
| [Construction #228](https://github.com/OpenRune/OpenRune-Server/pull/228) | `b1b4e4237` | New house layout, furniture tables, dispensers, pools, portals, nexus and room removal |
| [Farming #231](https://github.com/OpenRune/OpenRune-Server/pull/231) | `97aa0afa7` | Cache-backed crops and patches, including snape grass, with shared interaction dispatch |
| [Thieving #230](https://github.com/OpenRune/OpenRune-Server/pull/230) | `8769932da` | Cache-backed pickpocket and stall tables and automatic NPC target binding |
| [Fletching #262](https://github.com/OpenRune/OpenRune-Server/pull/262) | `1fe33a476` | Knife speedup ported to Blade's existing recipe engine; cape and bolt-tip animations were already implemented |
| [Quests #242](https://github.com/OpenRune/OpenRune-Server/pull/242) | `29ae4dcbe`, `56789de18`, `cac2d9058` | Pirate's Treasure, Doric's Quest and Prince Ali Rescue, with their dependent interactions and cache configs |
| [Zulrah #237](https://github.com/OpenRune/OpenRune-Server/pull/237) | `f2c754561` | Zulrah encounters, rotations, projectiles and rewards |
| EvolvedMind | `80a8ddf3a`, `4bf85522e`, `d90e760ce`, `e10bcc4ea`, pet files from `a53731b25` | RSA PEM fix, retained external plugin classloaders and Windows shadow copies, deferred-loading regression probe, packed component gamevals and pet form cycling |

## Integration decisions

- One engine owns each upgraded skill's interactions. Retired Blade handlers are
  removed rather than left to compete for the same operations.
- Agility keeps Blade's trainer dialogue, basalt crossings and Wilderness
  dispenser/reward logic. The new course engine calls the existing Wilderness
  lap hooks. The old movement helpers remain for the basalt crossings.
- Construction uses the catesweb engine and retains Blade's sawmill, estate
  agents, house purchasing, relocation, eleven styles and stairs. Building stairs
  creates a matching upper room and return staircase, visible after re-entry.
  Old ownership/style/location metadata is read from `poh_house`; its room and
  furniture saves are not converted to `poh_layout`. The original attribute is
  preserved. Other donor gaps are documented in `construction.md`.
- Farming routes the donor's covered patches to its new engine and keeps Blade's
  extended patches, including hops, under the same interaction dispatcher. Tool
  storage, produce noting and gardener protection are retained. Protection uses
  an unused bit in the donor's packed patch state. Covered patches switch to the
  donor's varp storage; existing crops stored in Blade's `farming_patches`
  attribute are not migrated into those varps.
- Thieving keeps Blade's chests, equipment checks, rogue outfit loot bonus,
  gloves/cape success bonuses, dodgy necklace protection, Rocky rolls for
  existing targets and configured XP modifiers.
- The six other #242 quests already have Blade implementations, including
  the banked Ghostspeak amulet and Fred's "The Thing" dialogue. Those are kept.
- Prince Ali's Ned and Aggie branches extend the existing Dragon Slayer and
  Goblin Diplomacy NPC handlers. Blade's toll gate remains the loc handler.
- Pirate's Treasure uses Blade's existing spade dispatcher. Other buried quest
  sites retain their existing handlers.
- Removed boss DSL arguments were dead fields upstream; affected Blade quest
  specs and Zulrah now use the current API.
- 162 conflicting IDs are reassigned in `max-content-id-remaps.json`, preserving
  the existing Blade mappings. These include donor skill symbols and upstream's
  Muspah hit counter. Symbolic references allow the code/config to follow the
  new IDs without numeric rewrites in gameplay scripts.
- EvolvedMind's commands-browser overhaul, debug commands and generated progress
  churn are excluded. Zulrah is merged once from #237.

## Verification

Use Java 21. For PowerShell on this machine:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Eclipse Adoptium/jdk-21.0.12.8-hotspot'
python tools/scripts/check-max-content.py
./gradlew.bat :or-cache:buildCache
```

`check-max-content.py` checks shared symbolic ID consistency, the recorded ID
remaps, conflict markers and retired duplicate handlers. The merged cache has
been built successfully, generating the Kotlin table classes required by the
server and tests.

Passed validation:

- Complete server Kotlin compilation.
- Agility, Construction, Farming, Thieving and their pack module tests.
- Fletching, quest, pets and cache module tests.
- A further server compile and Construction tests after estate/style/stair integration.
- The symbolic ID and duplicate-handler checker.
- 293 JUnit tests: zero failures, errors or skipped tests.
- Spotless checks for the integrated skill, quest and boss modules. Its line-ending
  setting is explicitly LF to match `.editorconfig` on Windows.

Test results are available under each module's `build/reports/tests/test` folder.
The full test command was:

```powershell
./gradlew.bat :server:app:compileKotlin `
  :content:skills:agility:test :content:skills:agility:agility-pack:test `
  :content:skills:construction:test :content:skills:construction:construction-pack:test `
  :content:skills:farming:test :content:skills:farming:farming-pack:test `
  :content:skills:thieving:test :content:skills:thieving:thieving-pack:test `
  :content:skills:fletching:test :content:quest:test :content:other:pets:test :or-cache:test
```

The donor PRs include draft or incomplete game content. Source/cache compilation
does not establish parity with live OSRS; in-client gameplay has not been exercised
for this combined checkout. Consult each imported verification document for known
content limitations.
