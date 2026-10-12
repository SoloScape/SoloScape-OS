package org.rsmod.content.areas.tutorial

public enum class TutorialStage(
    public val code: Int,
    public val lesson: String,
    public val instruction: String,
) {
    GUIDE(10, "Welcome", "Talk to the Gielinor Guide inside the starting house."),
    SETTINGS(20, "Controls", "Open the Settings tab using the spanner button."),
    GUIDE_RETURN(30, "Controls", "Talk to the Gielinor Guide again."),
    LEAVE_START(40, "Movement", "Click the door to leave the starting house."),
    SURVIVAL(50, "Survival", "Talk to the Survival Expert beside the pond."),
    INVENTORY(60, "Inventory", "Open your Inventory using the backpack button."),
    FISH(70, "Fishing", "Net a fishing spot in the pond to catch a shrimp."),
    STATS(80, "Skills", "Open the Skills tab to see your Fishing experience."),
    SURVIVAL_RETURN(90, "Survival", "Talk to the Survival Expert about making a fire."),
    CHOP(100, "Woodcutting", "Chop a nearby tree with your bronze axe."),
    FIRE(110, "Firemaking", "Use your tinderbox on the logs to light a fire."),
    COOK_FIRST(120, "Cooking", "Use a raw shrimp on the fire. Your first attempt will burn."),
    COOK_RETRY(130, "Cooking", "Catch another shrimp and cook it on a fire successfully."),
    SURVIVAL_FINISH(140, "Survival", "Talk to the Survival Expert, then leave through the gate."),
    LEAVE_SURVIVAL(150, "Survival", "Open the gate and follow the path to the kitchen."),
    CHEF(160, "Cooking", "Talk to the Master Chef inside the kitchen."),
    DOUGH(170, "Bread", "Use the pot of flour on the jug of water and choose bread dough."),
    BREAD(180, "Bread", "Use your bread dough on the cooking range."),
    MUSIC(190, "Music", "Open the Music tab to view the music player."),
    EMOTES(200, "Emotes", "Open the Emotes tab and try an emote."),
    RUN(210, "Running", "Turn on running using the run-energy orb or Settings tab."),
    LEAVE_KITCHEN(220, "Movement", "Leave the kitchen and follow the path to the Quest Guide."),
    QUEST(230, "Quests", "Talk to the Quest Guide in the next building."),
    JOURNAL(240, "Quests", "Open the Quest Journal tab."),
    QUEST_RETURN(250, "Quests", "Talk to the Quest Guide again."),
    DESCEND(260, "Exploring", "Climb down the ladder into the underground training area."),
    MINER(270, "Mining", "Talk to the Mining Instructor."),
    PROSPECT_TIN(280, "Prospecting", "Click a tin rock to identify the ore inside."),
    PROSPECT_COPPER(290, "Prospecting", "Click a copper rock to identify the ore inside."),
    MINE_TIN(300, "Mining", "Mine a piece of tin ore."),
    MINE_COPPER(310, "Mining", "Mine a piece of copper ore."),
    SMELT(320, "Smelting", "Use the furnace to smelt your copper and tin into a bronze bar."),
    MINER_RETURN(330, "Smithing", "Talk to the Mining Instructor to receive a hammer."),
    SMITH(340, "Smithing", "Use your bronze bar on an anvil to make a bronze dagger."),
    LEAVE_MINE(350, "Combat", "Open the gate to the combat training area."),
    COMBAT(360, "Combat", "Talk to the Combat Instructor, Vannaka."),
    EQUIPMENT(370, "Equipment", "Open the Worn Equipment tab."),
    EQUIP_DAGGER(380, "Equipment", "Wield your bronze dagger, then talk to Vannaka."),
    EQUIP_SWORD(390, "Equipment", "Wield the bronze sword and equip the wooden shield."),
    MELEE(400, "Melee", "Enter the rat pen and kill a giant rat with melee."),
    COMBAT_RETURN(410, "Ranged", "Return to Vannaka for a shortbow and bronze arrows."),
    RANGED(420, "Ranged", "Wield the shortbow and arrows, then kill a rat from outside the pen."),
    LEAVE_COMBAT(430, "Banking", "Climb the ladder to the bank."),
    BANK(440, "Banking", "Use the bank booth to open your bank."),
    POLL(450, "Polls", "Read the poll booth in the bank."),
    ACCOUNT(460, "Account safety", "Talk to the Account Guide about banking and account safety."),
    LEAVE_BANK(470, "Prayer", "Leave the bank and walk to the church."),
    PRIEST(480, "Prayer", "Talk to Brother Brace inside the church."),
    PRAYER(490, "Prayer", "Open the Prayer tab."),
    BURY(500, "Prayer", "Bury a set of bones, then speak to Brother Brace."),
    FRIENDS(510, "Friends", "Open the Friends tab."),
    IGNORE(520, "Ignore list", "Switch from Friends to the Ignore list."),
    PRIEST_RETURN(530, "Community", "Talk to Brother Brace about friends and player conduct."),
    LEAVE_CHURCH(540, "Magic", "Leave through the church door and find the Magic Instructor."),
    MAGIC(550, "Magic", "Talk to the Magic Instructor by the chicken pen."),
    SPELLBOOK(560, "Magic", "Open the Magic tab."),
    MAGIC_RETURN(570, "Runes", "Talk to the Magic Instructor to receive air and mind runes."),
    CAST(580, "Magic", "Select Wind Strike and cast it on a chicken in the pen."),
    DEPART(590, "Ready to explore", "Talk to the Magic Instructor to travel to Lumbridge."),
    COMPLETE(1000, "Complete", "Welcome to Lumbridge! Your adventure starts here.");

    public val next: TutorialStage
        get() = entries.getOrElse(ordinal + 1) { COMPLETE }

    public companion object {
        public fun fromCode(code: Int): TutorialStage? = entries.firstOrNull { it.code == code }

        public fun accepts(current: TutorialStage, expected: TutorialStage): Boolean =
            current == expected && current != COMPLETE
    }
}
