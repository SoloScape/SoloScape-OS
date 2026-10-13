package org.rsmod.content.areas.tutorial

public enum class TutorialStage(
    public val code: Int,
    public val lesson: String,
    public val instruction: String,
) {
    GUIDE(10, "Getting started", "To begin, left-click the Gielinor Guide in this room. If you can't see him, rotate the camera with the arrow keys."),
    SETTINGS(20, "Player controls", "Click the spanner icon to open Settings. Here you can adjust sound, display and other options before continuing."),
    GUIDE_RETURN(30, "Player controls", "Settings let you change how the game looks and feels. Talk to the Gielinor Guide again when you are ready."),
    LEAVE_START(40, "Interacting with scenery", "Left-click doors and other scenery to interact. Right-click for more options, then open the door to go outside."),
    SURVIVAL(50, "Moving around", "Click the ground to walk, or use the minimap to travel farther. Follow the path to the Survival Expert by the pond."),
    INVENTORY(60, "Viewing your items", "Click the backpack icon to open your inventory. This shows what you carry, including your fishing net."),
    FISH(70, "Catch some shrimp", "Click a fishing spot in the pond while carrying your net. Your catch will appear in your inventory."),
    STATS(80, "Your skill stats", "Open the Skills tab, marked by a bar-chart icon. Hover over a skill to see its experience and next level."),
    SURVIVAL_RETURN(90, "Survival skills", "Fishing earns experience that helps your skills grow. Speak to Brynna again to learn Woodcutting and Firemaking."),
    CHOP(100, "Cut down a tree", "An axe lets you gather logs from trees. Keep the bronze axe in your inventory and click a nearby tree to chop it."),
    FIRE(110, "Making a fire", "To light logs, click the tinderbox in your inventory, then click the logs. You can use the fire to cook food."),
    COOK_FIRST(120, "Cooking your shrimp", "Fires can cook food as well as provide warmth. Use the raw shrimp in your inventory on the fire to try cooking it."),
    COOK_RETRY(130, "Burning your shrimp", "Burnt shrimp is common for new cooks. Catch another shrimp, then use it on a fire to try again."),
    SURVIVAL_FINISH(140, "Survival skills", "Well done! Cooked food restores Hitpoints when you are hurt. Talk to Brynna before leaving this area."),
    LEAVE_SURVIVAL(150, "Find your next instructor", "Open the gate and follow the path to the next building. The minimap in the upper-right can help you navigate."),
    CHEF(160, "Cooking", "Speak to the Master Chef in the kitchen. He will show you how to combine ingredients and make bread."),
    DOUGH(170, "Making dough", "To make bread dough, combine flour and water. Use the pot of flour on the jug of water in your inventory."),
    BREAD(180, "Cooking dough", "Click the bread dough in your inventory, then use it on the nearby cooking range to bake your first loaf."),
    MUSIC(190, "The music player", "Open the Music tab to explore the music player. More tunes become available as you travel through Gielinor."),
    EMOTES(200, "Emotes", "Emotes let you express yourself without typing. Open the Emotes tab, then click any available emote to try it."),
    RUN(210, "Running", "Running moves you faster but uses energy. Click the run-energy orb, or use Settings, to turn running on."),
    LEAVE_KITCHEN(220, "Run to the next guide", "Follow the path to the Quest Guide's building. Click the ground or minimap ahead of you to keep moving."),
    QUEST(230, "Quests", "Speak to the Quest Guide. Quests are adventures with tasks and rewards; he will introduce your Quest Journal."),
    JOURNAL(240, "Your Quest Journal", "Open the Quest Journal tab to see your quests. Red means not started, yellow in progress and green completed."),
    QUEST_RETURN(250, "Your Quest Journal", "The journal helps track your adventures and their progress. Speak to the Quest Guide again to continue."),
    DESCEND(260, "Moving on", "It's time to explore underground. Click the ladder in the Quest Guide's building to climb down to the mine."),
    MINER(270, "Mining and Smithing", "Speak to Dezzick, the Mining Instructor. You will learn to gather ore, smelt bronze and smith a weapon."),
    PROSPECT_TIN(280, "Prospecting", "Different rocks contain different ores. Click a grey rock to identify the tin inside before you begin mining."),
    PROSPECT_COPPER(290, "It's tin", "The grey rocks contain tin ore. Now click a brown rock to identify its copper ore before mining."),
    MINE_TIN(300, "Mining", "Carry your bronze pickaxe and click a tin rock to mine it. The ore you obtain will appear in your inventory."),
    MINE_COPPER(310, "Mining", "You have collected tin ore. Now mine a copper rock too; you need both ores to make bronze."),
    SMELT(320, "Smelting", "Take your tin and copper ore to the furnace. Click it to smelt the two ores into one bronze bar."),
    MINER_RETURN(330, "Smithing", "Bronze bars can become weapons and armour. Ask Dezzick for a hammer before working at the anvil."),
    SMITH(340, "Smithing a dagger", "Carry a hammer and bronze bar, then use the bar on the anvil. Choose a bronze dagger in the smithing menu."),
    LEAVE_MINE(350, "Moving on", "Your bronze dagger is ready! Go through the gate and find the Combat Instructor to learn how to use it."),
    COMBAT(360, "Combat", "Speak to Vannaka, the Combat Instructor. He will teach you about equipment and fighting giant rats."),
    EQUIPMENT(370, "Wielding weapons", "Open the Worn Equipment tab, marked by a helmet icon. It shows your equipped items and their bonuses."),
    EQUIP_DAGGER(380, "Worn equipment", "Click the bronze dagger to wield it. Once equipped, talk to Vannaka again."),
    EQUIP_SWORD(390, "Unequipping items", "Remove your dagger, then wield the bronze sword and equip the wooden shield Vannaka gave you."),
    MELEE(400, "Attacking", "Enter the rat pen and attack a giant rat with your sword. Watch the Hitpoints bars while you fight."),
    COMBAT_RETURN(410, "Well done!", "You defeated a rat using melee combat. Return to Vannaka for a bow and arrows to learn Ranged."),
    RANGED(420, "Rat ranging", "Equip your shortbow and bronze arrows, then attack a rat from outside the pen. Bows work at a distance."),
    LEAVE_COMBAT(430, "Moving on", "You have finished the combat lessons. Climb the ladder to the bank above to learn about storing items."),
    BANK(440, "Banking", "Banks keep items safe. Click a bank booth to open your bank. Ultimate Ironman accounts cannot use banks."),
    POLL(450, "Poll booths", "Poll booths let players vote on proposed game updates. Click the booth here to read about SoloScape polls."),
    ACCOUNT(460, "Account safety", "Speak to the Account Guide about banking, valuables and keeping your account safe."),
    LEAVE_BANK(470, "Moving on", "Leave the bank through the door and follow the path to the nearby church for a lesson in Prayer."),
    PRIEST(480, "Prayer", "Speak to Brother Brace in the church. He will explain Prayer and how to train it."),
    PRAYER(490, "Your Prayer book", "Open the Prayer tab to see available prayers. More prayers become available as your Prayer level increases."),
    BURY(500, "Burying bones", "Bury the bones in your inventory to earn Prayer experience, then speak to Brother Brace again."),
    FRIENDS(510, "Your friends list", "Open the Friends tab to see who is online and manage the people you want to keep in touch with."),
    IGNORE(520, "Your ignore list", "The Ignore list helps block unwanted messages. Switch to it from the social tab to learn how it works."),
    PRIEST_RETURN(530, "Player conduct", "Friends and Ignore lists help manage contact with other players. Ask Brother Brace about player conduct."),
    LEAVE_CHURCH(540, "Your final instructor", "You are nearly finished. Leave the church and follow the path to the Magic Instructor beside the chicken pen."),
    MAGIC(550, "Magic", "Speak to the Magic Instructor to learn about runes and spellcasting. You will practise an attack spell."),
    SPELLBOOK(560, "Open your final menu", "Open the Magic tab, marked by a spellbook icon. It shows your spells and the runes they need."),
    MAGIC_RETURN(570, "Magic spells", "Wind Strike is a basic attack spell that uses air and mind runes. Ask the Magic Instructor for some runes."),
    CAST(580, "Cast Wind Strike", "Select Wind Strike in the Magic tab, then click a chicken in the pen to cast the spell using your runes."),
    DEPART(590, "Almost finished", "You have reached the end of Tutorial Island. Talk to the Magic Instructor when you are ready to go to Lumbridge."),
    COMPLETE(1000, "Welcome to Lumbridge", "Your tutorial is complete. Explore Gielinor, try new skills and speak with the people you meet.");

    public val next: TutorialStage
        get() = entries.getOrElse(ordinal + 1) { COMPLETE }

    public companion object {
        public fun fromCode(code: Int): TutorialStage? = entries.firstOrNull { it.code == code }

        public fun accepts(current: TutorialStage, expected: TutorialStage): Boolean =
            current == expected && current != COMPLETE
    }
}
