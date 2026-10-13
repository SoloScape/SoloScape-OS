package org.rsmod.content.areas.tutorial

public enum class TutorialStage(
    public val code: Int,
    public val lesson: String,
    public val instruction: String,
) {
    GUIDE(10, "Getting started", "Talk to the Gielinor Guide."),
    SETTINGS(20, "Player controls", "Open the Settings tab (spanner icon)."),
    GUIDE_RETURN(30, "Player controls", "Speak to the Gielinor Guide again."),
    LEAVE_START(40, "Interacting with scenery", "Open the door and follow the path outside."),
    SURVIVAL(50, "Moving around", "Find the Survival Expert by the pond."),
    INVENTORY(60, "Viewing your items", "Open your backpack to view your fishing net."),
    FISH(70, "Catch some shrimp", "Catch shrimp at the pond with your small net."),
    STATS(80, "Your skill stats", "Open the Skills tab to view your levels."),
    SURVIVAL_RETURN(90, "Survival skills", "Speak to the Survival Expert by the pond."),
    CHOP(100, "Cut down a tree", "Use your bronze axe to chop a nearby tree."),
    FIRE(110, "Making a fire", "Use your tinderbox on the logs to light a fire."),
    COOK_FIRST(120, "Cooking your shrimp", "Use raw shrimp on the fire to cook them."),
    COOK_RETRY(130, "Try cooking again", "Catch another shrimp and cook it on the fire."),
    SURVIVAL_FINISH(140, "Survival skills", "Speak to the Survival Expert by the pond."),
    LEAVE_SURVIVAL(150, "Find your next instructor", "Open the gate and follow the path to the kitchen."),
    CHEF(160, "Cooking", "Speak to the Master Chef inside the kitchen."),
    DOUGH(170, "Making dough", "Use the flour on the bucket of water."),
    BREAD(180, "Baking bread", "Cook the bread dough on the range."),
    MUSIC(190, "The music player", "Optional: open the Music tab to hear a track."),
    EMOTES(200, "Emotes", "Optional: open Emotes and try an emote."),
    RUN(210, "Running", "Optional: toggle running using the run orb."),
    LEAVE_KITCHEN(220, "Moving on", "Follow the path to the Quest Guide."),
    QUEST(230, "Quests", "Talk to the Quest Guide."),
    JOURNAL(240, "Your Quest Journal", "Open the Quest Journal tab."),
    QUEST_RETURN(250, "Your Quest Journal", "Talk to the Quest Guide again."),
    DESCEND(260, "Moving on", "Climb down the ladder to the mine."),
    MINER(270, "Mining and Smithing", "Speak to the Mining Instructor beside the rocks."),
    PROSPECT_TIN(280, "Prospecting", "Optional: prospect a grey rock for tin."),
    PROSPECT_COPPER(290, "It's tin", "Optional: prospect a brown rock for copper."),
    MINE_TIN(300, "Mining", "Mine a tin rock with your pickaxe."),
    MINE_COPPER(310, "Mining", "Mine a copper rock with your pickaxe."),
    SMELT(320, "Smelting", "Use the furnace to smelt a bronze bar."),
    MINER_RETURN(330, "Smithing", "Speak to the Mining Instructor beside the furnace."),
    SMITH(340, "Smithing a dagger", "Use a bronze bar on the anvil; make a dagger."),
    LEAVE_MINE(350, "Moving on", "Go through the gate to the Combat Instructor."),
    COMBAT(360, "Combat", "Speak to the Combat Instructor beside the rat pen."),
    EQUIPMENT(370, "Wielding weapons", "Open the Worn Equipment tab."),
    EQUIP_DAGGER(380, "Worn equipment", "Equip your bronze dagger; speak to the Combat Instructor."),
    EQUIP_SWORD(390, "Combat equipment", "Equip the bronze sword and wooden shield."),
    MELEE(400, "Attacking", "Defeat a giant rat using a melee weapon."),
    COMBAT_RETURN(410, "Well done!", "Speak to the Combat Instructor beside the rat pen."),
    RANGED(420, "Ranged combat", "Equip your bow and arrows; shoot a giant rat."),
    LEAVE_COMBAT(430, "Moving on", "Climb the ladder up to the bank."),
    BANK(440, "Banking", "Open the bank booth to view your bank."),
    POLL(450, "Poll booths", "Inspect a poll booth."),
    ACCOUNT(460, "Account Guide", "Talk to the Account Guide."),
    ACCOUNT_MANAGEMENT(462, "Account Management", "Open the Account Management tab."),
    ACCOUNT_RETURN(465, "Account Management", "Speak to the Account Guide again."),
    LEAVE_BANK(470, "Moving on", "Exit the bank and find Brother Brace."),
    PRIEST(480, "Prayer", "Talk to Brother Brace in the church."),
    PRAYER(490, "Your Prayer book", "Open the Prayer tab."),
    BURY(500, "Burying bones", "Bury the bones from your backpack."),
    FRIENDS(510, "Your friends list", "Open the Friends tab."),
    IGNORE(520, "Your ignore list", "Switch to the Ignore list."),
    PRIEST_RETURN(530, "Player conduct", "Talk to Brother Brace again."),
    LEAVE_CHURCH(540, "Your final instructor", "Follow the path to the Magic Instructor."),
    MAGIC(550, "Magic", "Speak to the Magic Instructor beside the chickens."),
    SPELLBOOK(560, "Open your final menu", "Open the Magic spellbook."),
    MAGIC_RETURN(570, "Magic spells", "Speak to the Magic Instructor beside the chickens."),
    CAST(580, "Cast Wind Strike", "Cast Wind Strike on a chicken."),
    DEPART(671, "Home Teleport", "Use your Home Teleport spell to travel to the mainland."),
    IRONMAN_TUTOR(672, "Ironman Mode", "Speak to the Ironman tutor outside the Magic Instructor's house."),
    COMPLETE(1000, "Welcome to Lumbridge", "Explore Lumbridge and begin your adventure.");

    /** Short, action-only instruction shown outside NPC dialogue. */
    public val objective: String
        get() = instruction

    public val controlGuide: Int?
        get() = when (this) {
            LEAVE_START -> 1
            SURVIVAL -> 6
            FISH -> 7
            STATS -> 8
            CHOP -> 9
            FIRE -> 5
            COOK_FIRST, COOK_RETRY -> 10
            BREAD -> 11
            LEAVE_KITCHEN -> 21
            MINE_TIN, MINE_COPPER -> 12
            SMELT -> 13
            SMITH -> 14
            MELEE -> 15
            RANGED -> 16
            LEAVE_COMBAT -> 22
            LEAVE_BANK -> 17
            LEAVE_CHURCH -> 18
            CAST -> 19
            DEPART -> 23
            else -> null
        }

    /** Deprecated tutorial lessons remain recognised so saved stages can be migrated. */
    public val legacyOptional: Boolean
        get() = this in listOf(MUSIC, EMOTES, RUN, PROSPECT_TIN, PROSPECT_COPPER)

    public val requiredNext: TutorialStage
        get() = when (this) {
            BREAD, MUSIC, EMOTES, RUN -> LEAVE_KITCHEN
            MINER, PROSPECT_TIN, PROSPECT_COPPER -> MINE_TIN
            DEPART, IRONMAN_TUTOR -> COMPLETE
            else -> next
        }

    public val resumeStage: TutorialStage
        get() = when (this) {
            MUSIC, EMOTES, RUN -> LEAVE_KITCHEN
            PROSPECT_TIN, PROSPECT_COPPER -> MINE_TIN
            else -> this
        }

    public val next: TutorialStage
        get() = entries.getOrElse(ordinal + 1) { COMPLETE }

    public companion object {
        public fun fromCode(code: Int): TutorialStage? =
            if (code == 590) DEPART else entries.firstOrNull { it.code == code }

        public fun accepts(current: TutorialStage, expected: TutorialStage): Boolean =
            current == expected && current != COMPLETE
    }
}
