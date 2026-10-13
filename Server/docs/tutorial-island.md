# Tutorial Island

New characters start at `(3094, 3107, 0)` in the Gielinor Guide's house. Character
creation writes this position explicitly, and new-account login applies the same
position before the initial map rebuild. Existing mainland characters keep their
saved position and do not enter the tutorial.

First-login detection also covers characters created before game login: a loaded
character with no saved login or logout history receives new-character startup,
even when the loader did not create its account in that request. Characters with
saved login history retain their position and tutorial progress.

SoloScape spawns Skippy (`npc.tutorial_skip`) in the Gielinor Guide's
starting building by default, beside the exit door at `(3097, 3108, 0)`,
facing south without wandering. OSRS reference pages confirm that his
event-only Tutorial Island appearance is in the Guide's building / by its
door, but do not specify the exact game tile; `(3097, 3108, 0)` is
SoloScape's local map placement, not a verified Jagex spawn coordinate.
Normal OSRS does **not** enable permanent tutorial skipping, but the
SoloScape-specific shortcut is intentionally enabled at the player's request.
To force the complete tutorial, set `SOLOSCAPE_TUTORIAL_SKIP=false` or
`-Dsoloscape.tutorial.skip=false` (the JVM setting takes precedence).

After the appearance editor's mandatory **Accept**, Skippy offers options
to go straight to the mainland, ask who he is, decide later, or remain
on the island. The skip choice describes the consequences and asks for
a second explicit confirmation. Accepting gives the same mainland starter
inventory and bank coins as normal completion and teleports to Lumbridge,
but does **not** award the Learning the Ropes Quest Point. All other
answers leave the player's tutorial progress untouched; Skippy cannot be
used to bypass the character-creation Accept screen.
The dialogue is adapted from the
[OSRS Skippy transcript](https://oldschool.runescape.wiki/w/Transcript:Skippy),
and the location description is corroborated by the
[OSRS Tutorial Island reference](https://oldschool.runescape.wiki/w/Tutorial_Island).

When a new character first logs into Tutorial Island, the existing appearance
editor opens before the first Gielinor Guide lesson. Confirming the choice
stores `tutorial_appearance_confirmed` as a permanent character attribute, so
relogging does not repeatedly reopen it. Trying to speak to the Guide before
confirmation returns to the editor instead of bypassing character setup.
Logging out before Accept reopens creation on the next login. The saved Guide
stage and confirmation attribute enforce this independently of first-login status.
While appearance is unconfirmed, the server rejects world-viewport and minimap
walking requests, including ctrl/telejump variants. The Escape/close-modal
packet also cannot dismiss creation; it re-sends the authoritative main modal.
Any displaced creator is reopened on the next post-tick, and unfinished movement
routes are discarded. Only the appearance editor's **Confirm/Accept** button
sets `tutorial_appearance_confirmed = 1` and unlocks movement. Normal mainland
Makeover Mage visits remain closable and do not restrict walking.
The rev-240 client supports the reusable Makeover Mage appearance panel
(body type, skin colour and pronouns), not yet all of the newer official
character creator's hair, clothing and palette selectors. The server explicitly
enables click events on both body-type models, pronoun choices, skin-colour
swatches, Apply and Confirm whenever the editor opens. The input path also
honours an explicit event mask for static IF3 component clicks, which can
otherwise be rejected before reaching any gameplay script. Modal recovery
restores these event permissions after a dismissed editor is reopened.
Tutorial confirmation
never invokes the Makeover Mage's NPC dialogue.

The classic island uses its existing revision-240 NPCs and map objects. The
`content/areas/misc/tutorial-island` plugin supplies the complete teaching route:

1. Guide conversation, settings, camera/movement explanation and the starting door.
2. Inventory, fishing, skills, woodcutting, firemaking, and a guaranteed
   successful first cooked shrimp with the Survival Expert.
3. A pot of flour and bucket of water, bread dough and baking bread.
   Music, Emotes and the Run orb are available after baking but no longer
   block reaching the Quest Guide.
4. Quest Guide dialogue and the quest journal, followed by the underground ladder.
5. Mining tin and copper, smelting bronze and making a bronze dagger
   through the normal smithing interface. Prospecting is not required.
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
as a word-for-word official transcript; the remaining required lessons
and their gameplay gates remain unchanged.
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
non-NPC panels now give only a concise, contextual action objective (maximum
two wrapped lines of 40 characters) rather than reproducing instructor speeches.
Objective wording now matches the action gates: running is optional rather
than a required "run to the next guide" lesson, the furnace teaches bronze-bar
smelting, equipment prompts state what to equip and the ranged objective names
the giant rat. These remain concise authored instructions, not verbatim Jagex
UI text. NPC conversations provide the explanations, character and optional recaps.
The standalone verification checks the titled panel and the objective packets.

The [historical interface transcript](https://rune-server.org/threads/tutorial-island-dialogue-interfaces.397139/)
informed the teaching style, but the text is newly written for SoloScape's
implemented sequence rather than copied verbatim. It is not a claim of exact
modern OSRS parity: current OSRS has revised control guidance, and SoloScape
still teaches fishing before woodcutting but no longer forces the first shrimp to burn.

Per the [25 October 2018 OSRS update history](https://oldschool.runescape.wiki/w/Tutorial_Island#Changes),
Music, Emotes and prospecting are no longer required lessons; using Run is
optional. Baking bread (stage 180) now advances directly to LEAVE_KITCHEN
(220), and Dezzick (270) advances directly to MINE_TIN (300). The old stage
codes 190/200/210 and 280/290 are still decoded but automatically migrate
forward on a tick or tutorial overlay refresh, protecting saved characters.
Music and Emotes tabs become available after baking, and clicking either, or
toggling Run, never advances the route. Prospecting requests explain the rock
type but do not advance mining; the existing cache may not expose a visible
Prospect option on rocks, so direct mining is the supported route.
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
after arrival on the other side. The cache exposes `Mine` on the training
rocks, so clicking a rock now mines directly without requiring a prospecting
lesson. This island has one
church door, which also serves as the exit. Ladder destinations use the existing
collision-aware stair navigator. Ordinary teleports remain blocked until departure.
Experience stops at level 3 (174 XP), Hitpoints XP is withheld, and tutorial combat
cannot reduce Hitpoints below one. These restrictions end on arrival in Lumbridge.

Wind Strike quest credit and the completion scroll are awarded at the chicken hit,
while `varp.tutorial` remains at DEPART until a real Home Teleport successfully
arrives in Lumbridge. On departure the server replaces the inventory, equipment and bank contents
from Tutorial Island with the standard OSRS mainland starter kit, including
25 bronze arrows, 25 air and 15 mind runes, 6 water, 4 earth and 2 body runes,
tools, weapons, food and 25 banked coins. This applies to opt-in Skippy
departures as well. Non-starter training supplies do not leave the island, and
run energy is restored. Other teleports stay blocked; Home Teleport bypasses the
island restriction only at that final stage. After a successful Home Teleport,
the character shares a 30-minute cooldown across the standard and Ancient
Home Teleport options currently implemented by this server. No dialogue choice teleports the player,
and the Ironman tutor stays accessible before departure. Skipping with Skippy
does not award quest credit. The revision-240 cache does not contain the 2025 Learning the Ropes quest-list
DB row. SoloScape now opens a live, stage-aware Learning the Ropes record in
the native Quest Journal interface when the Quest tab lesson is first completed.
The `::ropes` command can reopen that record where cheat commands are enabled.
The quest awards one Quest Point on the successful Wind Strike impact and its
journal records the completed state before Home Teleport departure. It does
not yet appear as a selectable entry in the normal Quest List: full quest
manager/list registration needs a newer cache or an explicit client DB-row patch.


## October 2025 onboarding compatibility

The revision-240 gamepack predates Jagex's dedicated familiarity-selection
screen and new 2025 yellow entity/side-icon highlighting assets. The initial
Gielinor Guide dialogue therefore remains the compatible three-choice fallback.
Its response is now saved permanently in the character attribute `tutorial_familiarity`
(1 = brand new, 2 = returning, 3 = experienced), and new/returning characters
receive the Accept Aid default from the server's settings table. This does
not implement Jagex's entire 2025 preferences preset or Adventure Paths.

Both `tutorial_familiarity` and `tutorial_quest_awarded` use persistent
character attributes rather than custom varps, so the standalone server
build works with the existing SERVER cache without running a cache repack.

The older client already understands world/minimap hint-arrow packets. These
now target each instructor's **live NPC slot**, so the overhead marker follows
the Gielinor Guide and the other tutors even if they move from their spawn tiles.
Non-NPC scenery targets still use fixed coordinate hints; all hints clear on
completion. They do not replace the later
official client's glowing NPC/loc outlines or pulsing side-tab icons. Newer
client assets and an authenticated display test are needed for exact parity.

The September 2026 Learning the Ropes walkthrough still teaches fishing and
the Skills tab before woodcutting, firemaking and cooking, so the stage order
and saved tutorial codes remain unchanged. See
https://danielpgleason.com/osrs/reference/learning-the-ropes-734fc10d/
for the contemporary route.

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
short objective panel limits, optional step bypasses, legacy-save migration,
mining without prospecting, Music/Emotes and Run no longer gating progress,
supply recovery, inventory-full recovery,
successful versus incorrect processing events, equipment, passage arrival, XP
limits, combat-style and hit-result gates, desktop/mobile tab handlers, the
one-time Wind Strike quest reward, blocked teleports, the non-departing
Ironman/Magic Instructor dialogue branches, Chef's bucket-of-water supplies,
first-attempt shrimp success on a normal fire, initial bank coins, exact mainland
starter supplies, run energy and the standard no-Skippy default. Character creation is also checked in
an isolated in-memory SQLite database. Outputs stay under
ignored `build/direct/tutorial-verification/`.

This harness does not prove an end-to-end client walkthrough. For release
verification, manually create a disposable character and follow every step in the
original client, including all gates/ladders, fishing/fire/cooking, the smithing
menu, melee and ranged kills, banking, Friends/Ignore, and Wind Strike. Music,
Emotes, Run and prospecting must be skippable; optionally try them without
changing the current required step.
Log out and back in during survival, mining and magic; verify that progress and
position resume. After Wind Strike, close the quest completion scroll, talk to the
Ironman tutor and return to Terrova, then cast the actual Lumbridge Home Teleport
from the Magic tab. Verify the spell animation, continued teleport restrictions
and final arrival. Check fixed, resizable and mobile gameframes. Authentication
remains manual.
