#!/usr/bin/env python3
"""Sanity-check supplemental equip metadata. Does not test live game behaviour."""

from __future__ import annotations

import csv
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TSV = (
    ROOT
    / "Server/api/player/src/main/resources/org/rsmod/api/player/worn/"
    / "equipment-stat-requirements.tsv"
)
HANDLER = ROOT / "Server/api/player/src/main/kotlin/org/rsmod/api/player/worn/HeldEquipOp.kt"
ALLOWED_SKILLS = {"attack", "defence", "strength", "hitpoints", "ranged", "magic", "prayer"}

def main() -> None:
    entries: dict[int, dict[str, int]] = defaultdict(dict)
    with TSV.open(encoding="utf-8", newline="") as stream:
        reader = csv.reader(
            (line for line in stream if line.strip() and not line.lstrip().startswith("#")),
            delimiter="\t",
        )
        header = next(reader)
        assert header == ["item_id", "skill", "level"], header
        for index, columns in enumerate(reader, start=2):
            assert len(columns) == 3, (index, columns)
            id_str, skill, level_str = columns
            item_id, level = int(id_str), int(level_str)
            assert item_id >= 0, (index, item_id)
            assert skill in ALLOWED_SKILLS, (index, skill)
            assert 2 <= level <= 99, (index, level)
            assert skill not in entries[item_id], (index, item_id, skill)
            entries[item_id][skill] = level

    checks = {
        1357: ("attack", 30), # Adamant axe
        1359: ("attack", 40), # Rune axe
        6739: ("attack", 60), # Dragon axe
        1275: ("attack", 40), # Rune pickaxe
        11920: ("attack", 60), # Dragon pickaxe
        1213: ("attack", 40), # Rune dagger
        1113: ("defence", 40), # Rune chainbody
    }
    for item_id, (skill, level) in checks.items():
        assert entries[item_id].get(skill) == level, (item_id, skill)

    # Ammo can be equipped without the Ranged level required to shoot it.
    for ammo_id in (892, 9243):
        assert ammo_id not in entries, ammo_id

    # Source-backed items with native requirements must not get duplicate entries.
    assert 1333 not in entries, "Rune scimitar already has native 40 Attack"

    # Catch empty or accidentally truncated resource files.
    row_count = sum(map(len, entries.values()))
    assert row_count >= 1700, row_count
    assert len(entries) >= 1300, len(entries)

    # Assert the table is in use, not just shipped as a resource.
    assert "EquipmentStatSupplement.unmetRequirements" in HANDLER.read_text(
        encoding="utf-8"
    ), "Runtime equip path does not consult supplemental requirements"

    print(
        f"Validated {row_count} supplemental combat equip requirements "
        f"for {len(entries)} item IDs"
    )

if __name__ == "__main__":
    main()
