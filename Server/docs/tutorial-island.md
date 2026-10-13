# Tutorial Island

New characters start at `(3094, 3107, 0)` in the Gielinor Guide's house. Character
creation writes this position explicitly, and new-account login applies the same
position before the initial map rebuild. Existing mainland characters keep their
saved position and do not enter the tutorial.

First-login detection also covers characters created before game login: a loaded
character with no saved login or logout history receives new-character startup,
even when the loader did not create its account in that request. Characters with
saved login history retain their position and tutorial progress.

Skippy (`npc.tutorial_skip`) stands at `(3097, 3108, 0)`, facing south without
wandering. He asks "Would you like to skip the tutorial?" with **Yes** and **No**.
Yes marks the tutorial complete, clears the new-account flag and any pending
tutorial passage, restores normal tabs/chat, and teleports to Lumbridge.
No closes the dialogue without changing progress or position.

The classic island uses its existing revision-240 NPCs and map objects. The
`content/areas/misc/tutorial-island` plugin supplies the complete teaching route:

1. Guide conversation, settings, camera/movement explanation and the starting door.
2. Inventory, fishing, skills, woodcutting, firemaking, and a guaranteed
   successful first cooked shrimp with the Survival Expert.
3. A pot of flour and bucket of water, bread dough, baking bread, music,
   an actual emote and running.
4. Quest Guide dialogue and the quest journal, followed by the underground ladder.
5. Identifying tin/copper rocks, mining both ores, smelting bronze and making a
   bronze dagger through the normal smithing interface.
6. Equipment, wielding a dagger, equipping sword/shield, a melee rat kill, then
   a ranged rat kill with a shortbow and arrows.
7. Opening the bank (with 25 starter coins already deposited), reading
   the local poll booth, then speaking to the Account Guide. Players open the
   Account Management tab before a follow-up dialogue explains OSRS membership,
   worlds, Bonds, inbox, name changes, links and account security. SoloScape-only
   caveats distinguish unsupported OSRS store and account options. Ultimate
   Ironman receives an explanation instead of access to a bank.
8. Prayer, burying bones, the Friends and Ignore lists, and player conduct.
9. Magic, five air and five mind runes for Wind Strike on a chicken, which awards a
   one-time Learning the Ropes completion scroll, jingle and Quest Point. After
   completion the Magic Instructor teaches Lumbridge Home Teleport. Players can
   talk to the Ironman tutor before casting it to depart for `(3222, 3218, 0)`.

The Guide opens with "Welcome to RuneScape!"; the remaining dialogue is authored
for SoloScape. Lev, the Quest Guide, Dezzick, Vannaka and Brother Brace now have
distinct introductory voices, milestone-specific hints and optional replay menus
once their lessons are complete. In-progress reminders do not advance the lesson,
and replay menus do not award extra supplies. The dialogue draws on the
[OSRS Master Chef](https://oldschool.runescape.wiki/w/Transcript:Master_Chef),
[Quest Guide](https://oldschool.runescape.wiki/w/Transcript:Quest_Guide) and
[Brother Brace](https://oldschool.runescape.wiki/w/Transcript:Brother_Brace)
transcripts and OSRS combat/mining teaching topics. It is rewritten, not copied
as a word-for-word official transcript; SoloScape's existing mandatory lessons
and level gates remain unchanged.
Adam on the island reuses the existing Ironman setup and armour
dialogue. No external account details are requested. The Account Guide draws
on the [OSRS Account Guide transcript](https://oldschool.runescape.wiki/w/Transcript:Account_Guide)
for its teaching topics rather than reproducing Jagex's NPC dialogue verbatim.
The Account tab is a real tutorial lesson: opening stone8 advances
ACCOUNT_MANAGEMENT (462) to ACCOUNT_RETURN (465), then talking to the Account
Guide advances to LEAVE_BANK (470). The pre-existing ACCOUNT (460) and later
stages retain their numeric progress codes to preserve saved characters.
The Guide offers a recap on return visits without handing out additional coins.
He describes OSRS features for context but does not imply that SoloScape
sells memberships or Bonds, or implements OSRS inbox/name-change/store links.

`varp.tutorial` saves the current step; `1000` means completed. The original
tutorial overlay is attached to the full game HUD, with its native progress bar
at the bottom centre. Instructions use the native titled message panel in the
chat overlay, replacing the normal chat log between NPC conversations. Chat
modals take precedence and reveal the instruction again when they close. The
non-NPC panels now use classic Tutorial Island-style titles and short explanations
of what an interaction does, not just single-line objectives. Their instructions
are kept within the native three-line, 40-character-per-line chatbox limit, and
the standalone verification checks both title and text packets.

The [historical interface transcript](https://rune-server.org/threads/tutorial-island-dialogue-interfaces.397139/)
informed the teaching style, but the text is newly written for SoloScape's
implemented sequence rather than copied verbatim. It is not a claim of exact
modern OSRS parity: current OSRS has revised control guidance, and SoloScape
still teaches fishing before woodcutting but no longer forces the first shrimp to burn.
Tabs unlock as their lessons introduce them (Logout is available from the start);
the native client hides icons for closed side panels. Login and gameframe
changes reapply the current lesson, and departure restores all tabs and chat.
Its native bar
uses the cache's 0–20 scale, as shown by the
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
cannot reduce Hitpoints below one. These restrictions end on arrival in Lumbridge.

Wind Strike quest credit and the completion scroll are awarded at the chicken hit,
while `varp.tutorial` remains at DEPART until a real Home Teleport successfully
arrives in Lumbridge. On departure the server tops up to at least 25 air and
15 mind runes in the inventory and 25 coins in the bank, including for Skippy
skip departures. It does not yet normalise the entire OSRS starter inventory;
unrelated gathered items are preserved. Other teleports stay blocked; Home Teleport bypasses the
island restriction only at that final stage. No dialogue choice teleports the player,
and the Ironman tutor stays accessible before departure. Skipping with Skippy
does not award quest credit. The full Learning the Ropes Quest Journal entry
has not been registered with the server quest manager yet; this update covers
the completion reward event and exit mechanics, not journal parity.

## Verification

From the repository root:

```powershell
python tools/build.py Server
python Server/tools/test-tutorial-island.py
```

The standalone verification loads the actual local server cache, registers the
tutorial alongside the existing Friends/Ignore handlers, runs all nine instructor
dialogues and the fishing, chopping, mining, smelting and baking handlers, and
checks login/resume, Account Management tab/recap and coin safety,
five instructors' replay menus and stage-specific reminders,
supply recovery, inventory-full recovery,
successful versus incorrect processing events, equipment, passage arrival, XP
limits, combat-style and hit-result gates, desktop/mobile tab handlers, the
one-time Wind Strike quest reward, blocked teleports, the non-departing
Ironman/Magic Instructor dialogue branches, Chef's bucket-of-water supplies,
first-attempt shrimp success, initial bank coins and starter rune amounts. Character creation is also checked in
an isolated in-memory SQLite database. Outputs stay under
ignored `build/direct/tutorial-verification/`.

This harness does not prove an end-to-end client walkthrough. For release
verification, manually create a disposable character and follow every step in the
original client, including all gates/ladders, fishing/fire/cooking, the smithing
menu, melee and ranged kills, banking, emotes, Friends/Ignore, and Wind Strike.
Log out and back in during survival, mining and magic; verify that progress and
position resume. After Wind Strike, close the quest completion scroll, talk to the
Ironman tutor and return to Terrova, then cast the actual Lumbridge Home Teleport
from the Magic tab. Verify the spell animation, continued teleport restrictions
and final arrival. Check fixed, resizable and mobile gameframes. Authentication
remains manual.
