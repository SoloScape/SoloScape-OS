# External reference comparison notes

Source: DayV-git/osrsreboxed-db `data/items/items-skill-requirements.json`, last updated 18 Sep 2026. OSRSReboxed is a third-party, manually curated, incomplete requirements mapping and contains no quest gates. Its stated requirements are not necessarily **equipment/wield** requirements: skilling-use gates and ammunition-use gates must be handled separately. This CSV is **review candidates only**, not a list of confirmed bugs.

The runtime CSV from the user's 15 Oct 2026 server has 6,354 equippable entries. Reference IDs number 2140; entries overlapping the runtime cache number 2121. These 2908 combat-skill requirements (only expected levels above 1) compare as 735 matching, 2159 missing, 6 lower and 8 higher. The 2173 differing requirement entries involve 1506 distinct items.

The 128 Ranged mismatches on ammunition in the quiver slot require special treatment: arrows and other ammunition may be equipped without meeting the level needed to use them in combat. **Do not add equip-level checks blindly from this CSV.**

The output intentionally excludes non-combat skills such as Mining or Woodcutting because their **use** requirements may be different from **wield** requirements. Revalidate the third-party baseline against current OSRS wiki, check quests separately, and run negative/positive equip tests on the server. The report is not a gameplay test, not authoritative, and not a completed all-item fix.
