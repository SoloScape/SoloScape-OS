# Tutorial Island

New characters start at `(3094, 3107, 0)` in the Gielinor Guide's house. Character
creation writes this position explicitly, and new-account login applies the same
position before the initial map rebuild. Existing mainland characters keep their
saved position and do not enter the tutorial.

The classic island uses its existing revision-240 NPCs and map objects. The
`content/areas/misc/tutorial-island` plugin supplies the complete teaching route:

1. Guide conversation, settings, camera/movement explanation and the starting door.
2. Inventory, fishing, skills, woodcutting, firemaking, a burned shrimp and a
   successful retry with the Survival Expert.
3. Flour and water, bread dough, baking bread, music, an actual emote and running.
4. Quest Guide dialogue and the quest journal, followed by the underground ladder.
5. Identifying tin/copper rocks, mining both ores, smelting bronze and making a
   bronze dagger through the normal smithing interface.
6. Equipment, wielding a dagger, equipping sword/shield, a melee rat kill, then
   a ranged rat kill with a shortbow and arrows.
7. Opening a bank, reading the local poll booth, finance/account-safety dialogue
   and the starter coins. Ultimate Ironman receives an explanation instead of
   access to a bank.
8. Prayer, burying bones, the Friends and Ignore lists, and player conduct.
9. Magic, runes, a successful offensive spell on a chicken, and an explicit choice
   to stay or depart for Lumbridge `(3222, 3218, 0)`.

The Guide opens with "Welcome to RuneScape!"; the remaining dialogue is authored
for SoloScape. Adam on the island reuses the existing Ironman setup and armour
dialogue. No external account details are requested.

`varp.tutorial` saves the current step; `1000` means completed. The original
tutorial overlay is attached to the full game HUD, with its native progress bar
at the bottom centre. Instructions use the native titled message panel in the
chat overlay, replacing the normal chat log between NPC conversations. Chat
modals take precedence and reveal the instruction again when they close. Tabs
unlock as their lessons introduce them (Logout is available from the start);
the native client hides icons for closed side panels. Login and gameframe
changes reapply the current lesson, and departure restores all tabs and chat.
Its native bar
uses the cache's 0â€“20 scale, as shown by the
[original progress-bar clientscript](https://raw.githubusercontent.com/Joshua-F/osrs-dumps/master/script/%5Bproc%2Ctutorial_progressbar_set%5D.cs2).
Use `::tutorial` to repeat the current instruction. Tutor reminders replace missing
tools and materials without advancing the lesson or repeatedly adding supplies
already held, worn or banked. Full inventories leave the current step intact.

Doors gate later areas until their lessons are finished; passage lessons advance
after arrival on the other side. The cache exposes only `Mine` on the training
rocks, so initial clicks identify the ore before mining. This island has one
church door, which also serves as the exit. Ladder destinations use the existing
collision-aware stair navigator. Ordinary teleports remain blocked until departure.
Experience stops at level 3 (174 XP), Hitpoints XP is withheld, and tutorial combat
cannot reduce Hitpoints below one. These restrictions end upon completion.

## Verification

From the repository root:

```powershell
python tools/build.py Server
python Server/tools/test-tutorial-island.py
```

The standalone verification loads the actual local server cache, registers the
tutorial alongside the existing Friends/Ignore handlers, runs all nine instructor
dialogues and the fishing, chopping, mining, smelting and baking handlers, and
checks login/resume, supply recovery, inventory-full recovery,
successful versus incorrect processing events, equipment, passage arrival, XP
limits, combat-style and hit-result gates, desktop/mobile tab handlers, teleport
restrictions, and both departure choices. Character creation is also checked in
an isolated in-memory SQLite database. Outputs stay under
ignored `build/direct/tutorial-verification/`.

This harness does not prove an end-to-end client walkthrough. For release
verification, manually create a disposable character and follow every step in the
original client, including all gates/ladders, fishing/fire/cooking, the smithing
menu, melee and ranged kills, banking, emotes, Friends/Ignore, and Wind Strike.
Log out and back in during survival, mining and magic; verify that progress and
position resume. Check fixed, resizable and mobile gameframes and the final
Lumbridge arrival. Authentication remains manual.
