package org.rsmod.content.other.bots

import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCMType
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.util.Properties
import org.rsmod.api.player.stat.PlayerSkillXP
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.inv.Inventory
import org.rsmod.game.stat.PlayerSkillXPTable

class BotProfileStore(private val directory: Path = Path.of(".data", "bots")) {
    fun load(player: Player): String? {
        val file = path(player.username)
        if (!Files.isRegularFile(file)) return null
        val data = Properties().apply { Files.newInputStream(file).use { load(it) } }
        for (skill in BotSkills.all) {
            val xp = data.getProperty(skill)?.toIntOrNull() ?: continue
            val level = PlayerSkillXPTable.getLevelFromFineXP(xp).coerceIn(1, 99)
            player.statMap.setFineXP(skill, xp)
            player.statMap.setBaseLevel(skill, level.toByte())
            player.statMap.setCurrentLevel(skill, level.toByte())
        }
        restore(player.inv, data, "inv")
        restore(player.bank, data, "bank")
        restore(player.worn, data, "worn")
        player.appearance.combatLevel = PlayerSkillXP.calculateCombatLevel(player)
        player.rebuildAppearance()
        return data.getProperty("task")
    }

    fun save(player: Player, task: String?) {
        Files.createDirectories(directory)
        val data = Properties()
        for (skill in BotSkills.all) data.setProperty(skill, player.statMap.getFineXP(skill).toString())
        task?.let { data.setProperty("task", it) }
        capture(player.inv, data, "inv")
        capture(player.bank, data, "bank")
        capture(player.worn, data, "worn")
        val file = path(player.username)
        val temporary = Files.createTempFile(directory, "bot-", ".tmp")
        try {
            Files.newOutputStream(temporary).use { data.store(it, "SoloScape progressive bot") }
            try {
                Files.move(temporary, file, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
            } catch (_: java.nio.file.AtomicMoveNotSupportedException) {
                Files.move(temporary, file, StandardCopyOption.REPLACE_EXISTING)
            }
        } finally {
            Files.deleteIfExists(temporary)
        }
    }

    private fun path(username: String): Path {
        require(username.matches(Regex("[a-z0-9_]+")))
        return directory.resolve("$username.properties")
    }

    private fun capture(inv: Inventory, data: Properties, prefix: String) {
        for (slot in inv.indices) {
            val obj = inv[slot] ?: continue
            val symbol = RSCM.getReverseMapping(RSCMType.OBJ, obj.id)
            data.setProperty("$prefix.$slot", "$symbol,${obj.count},${obj.vars}")
        }
    }

    private fun restore(inv: Inventory, data: Properties, prefix: String) {
        for (slot in inv.indices) {
            val parts = data.getProperty("$prefix.$slot")?.split(',') ?: continue
            if (parts.size != 3) continue
            val count = parts[1].toIntOrNull()?.takeIf { it > 0 } ?: continue
            val vars = parts[2].toIntOrNull() ?: continue
            inv[slot] = InvObj(parts[0], count, vars)
        }
    }
}

object BotSkills {
    val all = listOf(
        "stat.attack", "stat.defence", "stat.strength", "stat.hitpoints", "stat.ranged",
        "stat.prayer", "stat.magic", "stat.cooking", "stat.woodcutting", "stat.fletching",
        "stat.fishing", "stat.firemaking", "stat.crafting", "stat.smithing", "stat.mining",
        "stat.herblore", "stat.agility", "stat.thieving", "stat.slayer", "stat.farming",
        "stat.runecraft", "stat.hunter", "stat.construction",
    )
    fun levels(player: Player): Map<String, Int> =
        all.associate { it.removePrefix("stat.").let { name ->
            (if (name == "runecraft") "runecrafting" else name) to player.statMap.getBaseLevel(it).toInt()
        } } + ("combat" to player.appearance.combatLevel)
}
