package org.rsmod.content.other.bots

import java.util.Properties
import org.rsmod.game.inv.InvObj

public fun main() {
    for (mode in BotMode.entries) {
        check(BotMode.parse(mode.name) == mode)
        check(BotMode.parse(mode.name.lowercase()) == mode)
        val separated = mode.name.replace(Regex("([a-z])([A-Z])"), "$1_$2").lowercase()
        check(BotMode.parse(separated) == mode)
    }
    check(BotMode.parse("wildy") == BotMode.Wilderness)
    check(BotMode.parse("clana") == BotMode.ClanOne)
    check(BotMode.parse("clanb") == BotMode.ClanTwo)
    check(BotMode.parse("unknown") == null)

    check("stat.runecrafting" in BotSkills.all)
    check("stat.runecraft" !in BotSkills.all)
    check(BotSkills.all.distinct().size == BotSkills.all.size)
    check(BotSkills.all.all { it.startsWith("stat.") })

    check(WildernessPatrols.centers.size >= 10)
    check(WildernessPatrols.centers.distinct().size == WildernessPatrols.centers.size)
    check(WildernessPatrols.centers.all { it.level == 0 && it.z >= 3520 })
    check(
        (1..WildernessPatrols.centers.size)
            .map(WildernessPatrols::center)
            .toSet()
            .size == WildernessPatrols.centers.size
    )

    check(BotLootKeys.types == List(BotLootKeys.MAX_KEYS) { "obj.wildy_loot_key$it" })
    check(BotLootKeys.types.distinct().size == BotLootKeys.MAX_KEYS)
    check(BotLootKeys.typeForCount(0) == "obj.wildy_loot_key0")
    check(BotLootKeys.typeForCount(BotLootKeys.MAX_KEYS - 1) == "obj.wildy_loot_key4")
    check(BotLootKeys.typeForCount(BotLootKeys.MAX_KEYS) == null)
    check(BotLootKeys.chests.size >= 6)
    check(BotLootKeys.chests.all { it.startsWith("loc.wildy_hub_loot_chest_") })

    val encodedLoot =
        listOf(
            InvObj("obj.coins", 12_345),
            InvObj("obj.shark", 7, vars = 19),
        )
    check(BotLootKeyStore.decode(BotLootKeyStore.encode(encodedLoot)) == encodedLoot)
    check(BotLootKeyStore.decode("not,a,valid,bundle") == null)

    val tasks = SourceBotCatalog.tasks
    check(tasks.any { it.kind == BotTaskKind.Trade })
    check(tasks.any { it.kind == BotTaskKind.DropParty })
    check(tasks.any { it.kind == BotTaskKind.Combat })
    val progressiveStarter = tasks.single { it.id == "DraynorTreeWoodcutting" }
    check(progressiveStarter.kind == BotTaskKind.Woodcutting)
    check(!progressiveStarter.members)
    check(progressiveStarter.minimumLevel == 1)
    check(tasks.all { it.minimumLevel in 1..99 && it.maximumLevel in it.minimumLevel..99 })
    check(tasks.all {
        it.minimumCombatLevel in 3..126 &&
            it.maximumCombatLevel in it.minimumCombatLevel..126
    })
    check(tasks.all { it.requiredItems.values.all { count -> count > 0 } })
    check(tasks.all { it.requiredLevels.values.all { level -> level in 1..99 } })

    val properties = Properties()
    val resource = checkNotNull(object {}.javaClass.getResourceAsStream("/bots.properties"))
    resource.use(properties::load)
    check(properties.getProperty("enabled") in setOf("true", "false"))
    check(properties.getProperty("members") in setOf("true", "false"))
    var configuredBots = 0
    for (mode in BotMode.entries) {
        val key = mode.name.lowercase()
        val count = checkNotNull(properties.getProperty(key)).toInt()
        check(count >= 0)
        configuredBots += count
    }
    check(configuredBots <= BotPopulation.MAX_BOTS)

    println(
        "Bot port contracts passed: ${BotMode.entries.size} modes, ${tasks.size} activities, " +
            "$configuredBots configured world bots, ${BotLootKeys.MAX_KEYS} loot key slots."
    )
}
