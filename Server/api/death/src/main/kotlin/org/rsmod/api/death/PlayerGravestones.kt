package org.rsmod.api.death

import com.github.michaelbull.logging.InlineLogger
import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM
import dev.openrune.rscm.RSCMType
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import java.util.Properties
import org.rsmod.api.repo.loc.LocRepository
import org.rsmod.game.entity.Player
import org.rsmod.game.entity.PlayerList
import org.rsmod.game.inv.InvObj
import org.rsmod.game.loc.LocAngle
import org.rsmod.game.loc.LocInfo
import org.rsmod.game.loc.LocShape
import org.rsmod.map.CoordGrid

/**
 * Owner-only overworld PvM graves. Save the inventory before the death code clears it.
 * Subsequent deaths append to the original grave; the offline clock is paused. Expired
 * items are retained in the same persistent record for Death's Office recovery.
 *
 * PvP, Wilderness, UIM and instanced deaths keep their existing dedicated rules.
 */
@Singleton
public class PlayerGravestones @Inject constructor(
    private val players: PlayerList,
    private val locs: LocRepository,
) {
    public data class Grave(
        val owner: String,
        val coords: CoordGrid,
        val items: MutableList<InvObj>,
        var remaining: Int = GRAVE_TICKS,
        var office: Boolean = false,
    )

    private val logger = InlineLogger()
    private val directory: Path = Path.of(".data", "gravestones")
    private val records = linkedMapOf<String, Grave>()
    private val markers = mutableMapOf<CoordGrid, LocInfo>()
    private var ticks = 0
    private var loaded = false

    /** Read from the cache rather than assuming a cache revision has a particular loc id. */
    private val marker by lazy {
        ServerCacheManager.getObjects().values.firstOrNull { type ->
            type.name.contains("gravestone", ignoreCase = true) &&
                (0..4).any { type.actions.getOpOrNull(it) != null }
        }
    }

    public fun markerSymbol(): String? = marker?.let {
        RSCM.getReverseMapping(RSCMType.LOC, it.id)
    }

    public fun load() {
        if (loaded) return
        loaded = true
        if (!Files.isDirectory(directory)) return
        Files.list(directory).use { stream ->
            stream.filter { it.fileName.toString().endsWith(".properties") }.forEach { file ->
                runCatching { read(file) }.onSuccess { grave ->
                    if (grave.items.isNotEmpty()) {
                        records[grave.owner] = grave
                        if (!grave.office) spawnMarker(grave.coords)
                    }
                }.onFailure { error ->
                    logger.error(error) { "Could not load grave $file; retaining file" }
                }
            }
        }
    }

    public fun grave(player: Player): Grave? {
        load()
        return records[player.username.lowercase()]
    }

    /** Throws on disk errors, so the death path can fall back to ordinary ground items. */
    public fun store(player: Player, coords: CoordGrid, items: List<InvObj>): Boolean {
        if (items.isEmpty()) return false
        load()
        val owner = player.username.lowercase()
        val previous = records[owner]
        val next = if (previous == null) {
            Grave(owner, coords, items.toMutableList())
        } else {
            Grave(owner, if (previous.office) coords else previous.coords,
                (previous.items + items).toMutableList(), GRAVE_TICKS)
        }
        persist(next) // Disk first: never clear the deceased's items without recoverable storage.
        if (previous != null && previous.coords != next.coords) removeMarker(previous.coords)
        records[owner] = next
        spawnMarker(next.coords)
        return true
    }

    public fun tick() {
        load()
        ticks++
        val online = players.mapNotNull { it?.username?.lowercase() }.toSet()
        for (grave in records.values) {
            if (grave.office || grave.owner !in online) continue
            grave.remaining--
            if (grave.remaining <= 0) {
                grave.office = true
                removeMarker(grave.coords)
                runCatching { persist(grave) }.onFailure { error ->
                    logger.error(error) { "Could not save expired grave for ${grave.owner}" }
                }
            } else if (ticks % 100 == 0) {
                runCatching { persist(grave) }.onFailure { error ->
                    logger.error(error) { "Could not checkpoint grave for ${grave.owner}" }
                }
            }
        }
    }

    /**
     * Recovery-of-last-resort for simulated players that have repeatedly failed to find any
     * walkable route to their grave. Preserve the items and owner, but move the claim to Death's
     * Office instead of leaving an unreachable grave and an idle bot forever. Only the owner
     * can trigger it; callers should first try routing for several minutes.
     *
     * Persist the new record before publishing the change to prevent item loss if disk IO fails.
     */
    public fun moveUnreachableGraveToOffice(player: Player): Boolean {
        val grave = grave(player) ?: return false
        if (grave.office) return true
        val updated = grave.copy(office = true)
        try {
            persist(updated)
        } catch (error: Exception) {
            logger.error(error) { "Could not secure unreachable grave for ${grave.owner}" }
            return false
        }
        records[grave.owner] = updated
        removeMarker(grave.coords)
        return true
    }

    /** Returns claimed count, 0 if too far away, no room, or another player's grave. */
    public fun reclaim(
        player: Player,
        fromOffice: Boolean = false,
        markerCoords: CoordGrid? = null,
    ): Int {
        val grave = grave(player) ?: return 0
        if (fromOffice != grave.office) return 0
        if (markerCoords != null && markerCoords != grave.coords) return 0
        if (!fromOffice && (player.coords.level != grave.coords.level ||
            player.coords.chebyshevDistance(grave.coords) > 3)) return 0
        val free = player.inv.indices.filter { player.inv[it] == null }
        if (free.isEmpty()) return 0
        var count = 0
        for (slot in free) {
            if (count >= grave.items.size) break
            player.inv[slot] = grave.items[count].copy()
            count++
        }
        if (count == 0) return 0
        grave.items.subList(0, count).clear()
        if (grave.items.isEmpty()) {
            records.remove(grave.owner)
            removeMarker(grave.coords)
            Files.deleteIfExists(path(grave.owner))
        } else persist(grave)
        return count
    }

    public fun shutdown() {
        if (!loaded) return
        for (grave in records.values) {
            runCatching { persist(grave) }.onFailure { error ->
                logger.error(error) { "Could not save grave for ${grave.owner} on shutdown" }
            }
        }
    }

    private fun spawnMarker(coords: CoordGrid) {
        if (coords in markers) return
        val type = marker ?: return
        // A temporary dynamic loc acts as a visible grave. Never change scenery where the
        // cache lacks a matching marker; recovery still works through ::grave.
        val loc = locs.add(coords, type, Int.MAX_VALUE, LocAngle.West,
            LocShape.CentrepieceStraight)
        markers[coords] = loc
    }

    private fun removeMarker(coords: CoordGrid) {
        if (records.values.any { !it.office && it.coords == coords }) return
        markers.remove(coords)?.let { locs.del(it, Int.MAX_VALUE) }
    }

    private fun path(owner: String): Path {
        // Player usernames need not be valid filesystem names. Hash instead of rejecting
        // names or permitting user-controlled paths to escape the grave directory.
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(owner.toByteArray(Charsets.UTF_8))
            .joinToString("") { byte -> "%02x".format(byte.toInt() and 0xff) }
        return directory.resolve("$digest.properties")
    }

    private fun persist(grave: Grave) {
        Files.createDirectories(directory)
        val data = Properties()
        data.setProperty("owner", grave.owner)
        data.setProperty("coords", "${grave.coords.x},${grave.coords.z},${grave.coords.level}")
        data.setProperty("remaining", grave.remaining.toString())
        data.setProperty("office", grave.office.toString())
        data.setProperty("item.count", grave.items.size.toString())
        grave.items.forEachIndexed { index, item ->
            val symbol = RSCM.getReverseMapping(RSCMType.OBJ, item.id)
            data.setProperty("item.$index", "$symbol,${item.count},${item.vars}")
        }
        val tmp = Files.createTempFile(directory, "grave-", ".tmp")
        try {
            Files.newOutputStream(tmp).use { data.store(it, "SoloScape PvM grave") }
            try {
                Files.move(tmp, path(grave.owner),
                    StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
            } catch (_: java.nio.file.AtomicMoveNotSupportedException) {
                Files.move(tmp, path(grave.owner), StandardCopyOption.REPLACE_EXISTING)
            }
        } finally {
            Files.deleteIfExists(tmp)
        }
    }

    private fun read(path: Path): Grave {
        val data = Properties().apply { Files.newInputStream(path).use { load(it) } }
        val owner = data.getProperty("owner") ?: error("Missing grave owner")
        val coords = data.getProperty("coords")!!.split(',').map(String::toInt)
        require(coords.size == 3)
        val itemCount = data.getProperty("item.count")?.toIntOrNull()?.coerceIn(0, 50000)
            ?: (0 until 200).count { data.getProperty("item.$it") != null }
        val items = (0 until itemCount).mapNotNull { index ->
            val triple = data.getProperty("item.$index")?.split(',') ?: return@mapNotNull null
            if (triple.size != 3) return@mapNotNull null
            InvObj(triple[0], triple[1].toInt(), triple[2].toInt())
        }.toMutableList()
        return Grave(owner, CoordGrid(coords[0], coords[1], coords[2]), items,
            data.getProperty("remaining")?.toIntOrNull()?.coerceAtLeast(0) ?: GRAVE_TICKS,
            data.getProperty("office")?.toBoolean() ?: false)
    }

    public companion object {
        public const val GRAVE_TICKS: Int = 1500 // Fifteen minutes of player-online game time.
    }
}
