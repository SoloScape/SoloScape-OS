# Runtime equipment audit (15 October 2026)

Tracking issue: [#60](https://github.com/SoloScape/SoloScape-OS/issues/60)

## Why a runtime audit is necessary

Players reproduced wielding an adamant axe at 11 Attack (49 Woodcutting), and subsequently reported that axes, pickaxes **and ordinary weapons** also appeared to ignore Attack requirements. Individual variants and all other skill/quest requirements have **not** been exhaustively verified in a live client.

The common equip path is `HeldInteractions` -> `HeldEquipOp`. Prior to the fix in PR #61, the latter only rejected stat requirements that existed in the loaded `statreq1_skill/statreq1_level` and `statreq2_skill/statreq2_level` pairs. An item with neither skill field has no equip stat checks from that method. `levelrequire` is **not** an equip requirement; it governs skill use, including mining/woodcutting.

## Static audit of tracked TOML overrides (main branch)

Parsed the entire `Server/.data/raw-cache/server/items.toml` (Git blob `b85a6eab47eef58ef192128115b1d2a308d4023c`):

| Metric | Result |
| --- | ---: |
| Item override blocks | 5,200 |
| Blocks setting `weaponCategory` | 1,131 |
| Weapon-category blocks with at least one explicit `statreq[12]` field | 65 |
| Weapon-category blocks without explicit `statreq[12]` fields | 1,066 |
| All override blocks with at least one explicit stat requirement field | 150 |
| Axe-category overrides with explicit stat requirement | 0 of 56 |
| Pickaxe-category overrides with explicit stat requirement | 0 of 28 |
| SlashSword-category overrides with explicit stat requirement | 0 of 86 |
| StabSword-category overrides with explicit stat requirement | 0 of 116 |
| Crossbow-category overrides with explicit stat requirement | 0 of 34 |
| Bow-category overrides with explicit stat requirement | 42 of 91 |
| Staff-category overrides with explicit stat requirement | 23 of 120 |

Examples lacking **explicit override** wield requirements: `obj.adamant_axe`, `obj.dragon_pickaxe`, `obj.rune_scimitar`, `obj.rune_platebody`, `obj.dragon_platebody`, `obj.masori_body`, `obj.rune_kiteshield`. Examples with explicit overrides: `obj.yew_shortbow` (40 Ranged), `obj.mystic_fire_staff` (40 Attack and 40 Magic), skill capes (99 associated skill).

**Interpretation warning:** An override can inherit properties from a base game item. The counts above do NOT prove 1,066 broken weapons, nor cover all equippable items; the complete cache has additional items and equips.

## How to enumerate EVERY runtime-equippable item

PR #61 includes the administrator-only `::equipmentaudit` command. After a server build and restart, run it with an administrator account. It writes:

- `Server/build/equipment-audit/runtime-equipment.csv` (if the server's working directory is `Server/`). One row for **every runtime item accepted as an equipment candidate** by the same primary wear-slot lookup used by `HeldEquipOp`. Excludes certificates, placeholders and dummy items.
- `Server/build/equipment-audit/summary.txt` with loaded/equippable counts, missing/malformed metadata and slot distribution.

The CSV contains numeric item IDs, internal names, display names, wear slots, both native equip skill/level requirement pairs, **effective and supplemental equipment requirements**, and the *separate* skilling-use requirement. It also flags expected Attack levels for a conservative set of regular metal axes/pickaxes/weapons; **these flags are candidate anomalies, not final verdicts for unusual variants**.

The export command itself does not change equipment rules, spawn items, or edit accounts. The initial export was supplied from the deployed cache and counted 34,606 loaded items / 6,354 equippable items. A **post-fix** export is needed to verify the additional requirements loaded as intended.

## Remaining audit and acceptance criteria

1. Re-run the revised audit export after deployment to capture **effective** requirements and retain the CSV as evidence. Confirm every equippable item/variant is included across **weapon, shield, head, chest, legs, hands, feet, cape, neck, ammo/quiver and ring** positions.
2. Join the runtime CSV against authoritative OSRS equipment skill and quest requirements. Include low-level/no-requirement gear, specialist weapons, charged/inactive/ornamented items, Barrows, crystal, raids, boss gear, skilling outfits, achievement/quest rewards and holiday items. Do **not** invent level requirements for items without them.
3. Test negative and positive level boundaries per expected requirement (below required level **must fail**, at required level **must pass**, subject to other valid gates). Cover **Attack, Strength, Defence, Ranged, Magic, Prayer** and any other stat conditions.
4. Independently verify relevant quest and activity restrictions, including cases that are not represented by the two stat parameter pairs.
5. For axes/pickaxes/harpoons, separately verify **using from inventory** versus **wielding**. A low Attack level must not block legitimate inventory skilling use.
6. Verify a distinct message is sent when the requirement is unmet, the item remains in inventory, no equipment transaction/event occurs, and forged client equip requests cannot bypass checks.
7. Retest representative known boundaries and regressions on the live client after any fix. Include a data-integrity test that fails when key high-level gear loses requirement metadata.

### Current status

**Confirmed:** user-reported low-Attack wielding of adamant axe and additional reports of low-Attack weapons. Shared code path and static override coverage examined.

**Not yet confirmed:** precise runtime root cause, number of invalid equip definitions, full item-specific compliance and corrected behaviour after patch.

The audit branch now also includes **server-side supplementary combat equip requirements**. It must not be represented as a complete OSRS item compliance fix until item-by-item verification and live equipment boundary tests are performed.

## First corrective pass on PR #61

The player-provided deployed-cache export yielded 6,354 equippable item IDs. It was compared with the maintained DayV-git OSRS community requirements data (last updated 18 September 2026), **excluding ammo/quiver Ranged use requirements** and conservatively avoiding ambiguous max-cape/Pest-seal rules.

- New per-item stat supplement: `Server/api/player/src/main/resources/org/rsmod/api/player/worn/equipment-stat-requirements.tsv`. **1,751 added combat-skill checks on 1,330 item IDs** where the runtime metadata lacked a requirement. Includes conventional metal axes, pickaxes, melee weapons, armour, bows, mage gear and representative multi-stat equipment.
- Applied centrally in `HeldEquipOp`: the existing `statreq1`/`statreq2` data **takes precedence for the same skill**; supplemental requirements reject equipping if the player's base level is below the stated level.
- Handles any number of supplemental stat requirements per item, unlike the two native stat pairs. Validates rows strictly and fails loudly if the CSV-equivalent TSV resource is missing.
- New regression tests validate expected requirements, ammunition exemptions, native precedence, multi-skill items, and exact Attack level boundaries. These **do not yet constitute full live equip transaction tests**.
- `::equipmentaudit` now exports both **native** and **effective** equip requirements, and flags expected Attack gaps after the supplement. The native source-level count may remain high; the effective count is the important post-fix value.

### Deliberate non-changes

No automatic conversion of Mining, Woodcutting or Fishing *use* levels into wield requirements. Quiver ammunition is not gated merely by its combat-use Ranged requirement. No guessed quest/unlock gates are added. Existing native stat requirements (including discrepancies relative to a third-party source) are not overridden. Known special multi-quest exceptions and items missing from the source still need focused review.

### Validation status

Changes are committed on draft PR #61 but **not built or play-tested from this assistant session**. Live confirmation, automated build execution, and quest-specific compliance are outstanding. Keep the PR draft until completed.
