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

New characters are created with no display name. On first login, the native
`tutorial_displayname` window opens before appearance creation, using the cache's
name input and stone buttons. **Look up name** checks the shared display-name
format policy, case-insensitive uniqueness and active name reservations. **Set name**
checks availability again and saves the name atomically for the account's unnamed
character before opening appearance creation. Login usernames are no longer
automatically assigned as display names, including in development realms with the
legacy `auto_assign_display_names` setting enabled. Existing chosen names remain intact.
Movement and Escape cannot bypass this screen; logging out without choosing a name
reopens it. A saved name goes straight to the next unfinished setup step on relog.
After a successful lookup, `displayname_button_init` reinitializes **Set name**,
restoring the click action cleared by the native disabled-button script. Merely
calling `displayname_button_draw` changes its appearance and leaves it unclickable.
The regression harness checks this against the local cache bytecode as well as
the server's outgoing script packet.
The native layout and input behaviour follow the
[cache interface](https://github.com/Joshua-F/osrs-dumps/blob/master/interface/tutorial_displayname.if3)
and its native `tutorial_displayname_*` scripts. Authenticated client visual verification
is still required for fixed, resizable and mobile gameframes.

After a display name is chosen, the existing appearance editor opens before the
first Gielinor Guide lesson. Confirming the choice
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
The rev-240 client uses the Makeover Mage panel for body type, skin colour and
pronouns, and the reusable style panel for hair, facial hair, torsos, sleeves,
bottoms, shoes and wristwear. Both panels' category menus route each native
dropdown entry to the correct panel and enable its click events. Styles use the
cache's ordered enums and body-type-specific identity kits; colour choices use
the corresponding hair, top, bottom or shoe palette. Wristwear has no palette.
Apply and close from a style panel saves that choice and returns an unconfirmed
tutorial character to the body-type panel for final Confirm. Movement and Escape
remain blocked throughout creation, including while a style panel is open.
The server explicitly enables click events on both body-type models, pronoun
choices, skin-colour swatches, Apply and Confirm whenever the editor opens. The
input path also honours an explicit event mask for static IF3 component clicks, which can
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

`varp.tutorial` saves the current step; `1000` means departed. The tutorial
overlay is attached to the game HUD, with its native progress bar at the bottom
centre. Lesson instructions use `interface.messagebox_titled` in the chat overlay:
a blue heading above the explanatory parchment text. NPC chat temporarily takes
precedence over this panel, which remains underneath and returns when chat closes.
The orange Control Guide supplements the lesson panel. It is not its replacement.
The guide hides during character setup and NPC chat. Required side tabs
use the cache's `varbit.flashside`, clearing the highlight after the action.

The native `tutorial_overlay_hint` clientscript (2584) supplies the actual Jagex
desktop/mobile wording, colours and four-line layout for fishing, skills,
woodcutting, firemaking, cooking, baking, mining, smelting, smithing, combat,
transitions and Home Teleport. Its short action objectives are separate from the
chatbox lesson title and body. The primary panel does not inherit the helper's
two-line limit.

The supplied [ComfyQuesting video](https://www.youtube.com/watch?v=WVNWI1wtPFU)
is the reference for the corrected primary panels. Directly inspected frames:

- 2:06: `Moving on`, after opening Settings; the door is the next action.
- 2:56: `You've gained some experience`, before opening Skills.
- 3:01: `Skills and Experience`, after opening Skills.
- 3:53: `Cooking`, including selection, using shrimp on a fire and hover-action text.
- 5:13: `Attacking`, explaining the click-to-attack action.
- 5:28: `Well done, you've made your first kill!`, returning to the instructor.
- 5:33: `Rat ranging`, including equipping and remaining outside the pen.
- 5:43: `Banking`, with both the parchment lesson and orange reminder visible.

These observed titles and paragraphs are supplied separately by `panelTitle` and
`panelText`; unobserved panels retain their existing authored text. Opening Settings
now advances directly to the door instruction. Saves at the obsolete Guide-return
stage 30 migrate to stage 40. The native familiarity screen and quest integration
remain in place. The edited video does not expose every stage, so this is not a
claim that every remaining panel or reminder timing matches OSRS exactly.

The [historical interface transcript](https://rune-server.org/threads/tutorial-island-dialogue-interfaces.397139/)
informed the teaching style, but the text is newly written for SoloScape's
implemented sequence rather than copied verbatim. It must not be substituted for
the video-observed modern panels without checking each stage. Fishing precedes woodcutting,
and the first cooked shrimp succeeds.

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
does not award quest credit. The local cache contains `dbrow.quest_learningtheropes`
(quest id 205, row 9643, completion stage 671). It is registered with the quest
manager and becomes a selectable Quest List entry after meeting the Quest Guide.
Its progress reads the existing tutorial varp directly, avoiding a second saved
quest stage that could overwrite tutorial progress. Its journal remains authored
and stage-aware, and `::ropes` also reopens it where cheat commands are enabled.
Wind Strike awards one Quest Point once and advances to native completion stage
671. Saves at the former departure stage 590 migrate to 671 without replaying
rewards. Choosing Ironman at the Magic Instructor switches guidance to the
Ironman tutor (local stage 672); selecting a mode or cancelling the choice returns
Home Teleport guidance. The Node/Group Ironman tutorial route is not implemented.


## October 2025 onboarding compatibility

The local cache already contains `interface.tutorial_player_experience` (929)
and its native initialization script (8558). After accepting appearance, new
characters use this screen's three buttons, official wording, frame and progress
pips before meeting the Gielinor Guide. Selection uses the native pause-button
protocol on content children 1..3; invalid or stale choices are rejected. Walking
and Escape remain blocked until selection, and a displaced screen is restored.
The response is saved permanently in the character attribute `tutorial_familiarity`
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
completion. Native side-tab highlighting is driven by `flashside`; official
enhanced-client NPC/loc outlines are not reproduced in the Java renderer.
An authenticated display test is still needed to verify native guide layout,
familiarity button rendering, highlights and journal selection end to end.

References: [Jagex's 22 October 2025 update](https://secure.runescape.com/m=news/grid-master-rewards-poll--new-player-improvements?oldschool=1),
[native guide script](https://github.com/Joshua-F/osrs-dumps/blob/master/script/%5Bclientscript%2Ctutorial_overlay_hint%5D.cs2),
and [native familiarity interface](https://github.com/Joshua-F/osrs-dumps/blob/master/interface/tutorial_player_experience.if3).
Runtime cache probes confirmed the screen's strings, pause-button components,
quest row and native `flashside` varbit. This is not a claim of complete verbatim
or visual parity for every server-owned message.

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
checks login/resume, native name selection before appearance, invalid/reserved names,
competing name claims, ownership, saved names, Account Management tab/recap and coin safety,
five instructors' replay menus and stage-specific reminders,
native guide selections and fallback line limits, optional step bypasses, legacy-save migration,
mining without prospecting, Music/Emotes and Run no longer gating progress,
supply recovery, inventory-full recovery,
successful versus incorrect processing events, equipment, passage arrival, XP
limits, combat-style and hit-result gates, desktop/mobile tab handlers, the
one-time Wind Strike quest reward, blocked teleports, the non-departing
Ironman/Magic Instructor dialogue branches, Chef's bucket-of-water supplies,
first-attempt shrimp success on a normal fire, initial bank coins, exact mainland
starter supplies, run energy and the configured Skippy behaviour. Character creation is also checked in
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
