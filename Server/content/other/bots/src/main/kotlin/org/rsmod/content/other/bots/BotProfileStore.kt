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
        val file = resolveProfile(player)
        if (!Files.isRegularFile(file)) return null
        val data = Properties().apply { Files.newInputStream(file).use { load(it) } }
        for (skill in BotSkills.all) {
            val stored = data.getProperty(skill)
                ?: if (skill == "stat.runecrafting") data.getProperty("stat.runecraft") else null
            val xp = stored?.toIntOrNull() ?: continue
            val level = PlayerSkillXPTable.getLevelFromFineXP(xp).coerceIn(1, 99)
            player.statMap.setFineXP(skill, xp)
            player.statMap.setBaseLevel(skill, level.toByte())
            player.statMap.setCurrentLevel(skill, level.toByte())
        }
        val bank = player.invMap.getOrPut("inv.bank")
        // v2 snapshots include deliberately empty inventories, so clear seeded defaults first.
        val snapshot = data.getProperty("snapshot.version") == "2"
        restore(player.inv, data, "inv", snapshot)
        restore(bank, data, "bank", snapshot)
        restore(player.worn, data, "worn", snapshot)
        player.appearance.combatLevel = PlayerSkillXP.calculateCombatLevel(player)
        player.rebuildAppearance()
        return data.getProperty("task")
    }

    fun loadGoal(player: Player): BotTrainingGoal? {
        val file = resolveProfile(player)
        if (!Files.isRegularFile(file)) return null
        val data = Properties().apply { Files.newInputStream(file).use { load(it) } }
        return BotTrainingGoal.parse(data.getProperty("goal"))
    }

    fun save(player: Player, task: String?, goal: BotTrainingGoal? = null) {
        Files.createDirectories(directory)
        val data = Properties()
        data.setProperty("snapshot.version", "2")
        data.setProperty("profile.username", player.username)
        data.setProperty("profile.display-name", player.displayName)
        for (skill in BotSkills.all) data.setProperty(skill, player.statMap.getFineXP(skill).toString())
        task?.let { data.setProperty("task", it) }
        goal?.let { data.setProperty("goal", it.toString()) }
        val bank = player.invMap.getOrPut("inv.bank")
        capture(player.inv, data, "inv")
        capture(bank, data, "bank")
        capture(player.worn, data, "worn")
        val file = resolveProfile(player)
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

    /**
     * The first catalogue use of a display name gets a plain readable filename.
     * Repeated names (and later recycled identities) keep the name first but add
     * an ID suffix to avoid overwriting somebody else's progress.
     */
    internal fun profilePath(player: Player): Path {
        val name = player.displayName.trim()
        require(name.isNotEmpty() && name.length <= 80 &&
            name.matches(Regex("[A-Za-z0-9][A-Za-z0-9 _-]*"))) {
            "Unsafe bot display name for profile filename: $name"
        }
        val id = player.username.removePrefix("worldbot_").toIntOrNull()
            ?.takeIf { player.username == "worldbot_$it" && it > 0 }
        val expected = id?.let { SourceBotCatalog.names.getOrNull((it - 1) % SourceBotCatalog.names.size) }
        val first = SourceBotCatalog.names.indexOfFirst { it.equals(name, ignoreCase = true) }
        val reserved = name.uppercase() in setOf("CON", "PRN", "AUX", "NUL") ||
            Regex("(?i)(COM|LPT)[1-9]").matches(name)
        val needsSuffix = reserved || (id != null &&
            (expected == null || !expected.equals(name, ignoreCase = true) ||
                first != (id - 1)))
        val filename = if (needsSuffix) "$name (\${player.username})" else name
        return directory.resolve("$filename.properties")
    }

    private fun legacyPath(username: String): Path {
        require(username.matches(Regex("[a-z0-9_]+"))) { "Invalid internal bot ID" }
        return directory.resolve("$username.properties")
    }

    private fun read(file: Path): Properties =
        Properties().apply { Files.newInputStream(file).use { load(it) } }

    /** Migrate only this internal ID's old save. Never overwrite a differently owned save. */
    private fun resolveProfile(player: Player): Path {
        val named = profilePath(player)
        if (Files.exists(named)) {
            check(Files.isRegularFile(named)) { "Bot profile path is not a file: $named" }
            val owner = read(named).getProperty("profile.username")
            check(owner == player.username) {
                "Bot profile filename collision at $named (owner=$owner, requested=\${player.username})"
            }
            return named
        }
        val old = legacyPath(player.username)
        if (!Files.isRegularFile(old)) return named

        val data = read(old)
        data.setProperty("profile.username", player.username)
        data.setProperty("profile.display-name", player.displayName)
        Files.createDirectories(directory)
        val temporary = Files.createTempFile(directory, "bot-migrate-", ".tmp")
        try {
            Files.newOutputStream(temporary).use { data.store(it, "SoloScape bot profile") }
            // The old file is deleted only after its full contents are written under
            // the new name; no merge or overwrite of any existing named profile.
            check(!Files.exists(named)) { "Bot profile filename already exists: $named" }
            try {
                Files.move(temporary, named, StandardCopyOption.ATOMIC_MOVE)
            } catch (_: java.nio.file.AtomicMoveNotSupportedException) {
                Files.move(temporary, named)
            }
            Files.delete(old)
        } finally {
            Files.deleteIfExists(temporary)
        }
        return named
    }

    private fun capture(inv: Inventory, data: Properties, prefix: String) {
        for (slot in inv.indices) {
            val obj = inv[slot] ?: continue
            val symbol = RSCM.getReverseMapping(RSCMType.OBJ, obj.id)
            data.setProperty("$prefix.$slot", "$symbol,${obj.count},${obj.vars}")
        }
    }

    private fun restore(inv: Inventory, data: Properties, prefix: String, snapshot: Boolean) {
        if (snapshot) for (slot in inv.indices) inv[slot] = null
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
        "stat.runecrafting", "stat.hunter", "stat.construction",
    )
    fun levels(player: Player): Map<String, Int> =
        all.associate { it.removePrefix("stat.") to player.statMap.getBaseLevel(it).toInt() } +
            ("combat" to player.appearance.combatLevel)
}
