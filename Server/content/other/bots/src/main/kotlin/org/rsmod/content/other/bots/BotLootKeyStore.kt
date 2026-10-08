package org.rsmod.content.other.bots

import com.github.michaelbull.logging.InlineLogger
import dev.openrune.types.util.UncheckedType
import jakarta.inject.Inject
import jakarta.inject.Singleton
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardOpenOption
import java.util.Properties
import java.util.WeakHashMap
import org.rsmod.game.inv.InvObj
import org.rsmod.game.obj.Obj

@Singleton
internal class BotLootKeyStore @Inject constructor() {
    private val logger = InlineLogger()
    private val path = Path.of(".data", "bot-loot-keys.properties")
    private val bundles = LinkedHashMap<Int, List<InvObj>>()
    private val groundBundles = WeakHashMap<Obj, Int>()
    private var nextId = 1

    init {
        load()
    }

    @Synchronized
    fun create(items: List<InvObj>): Int {
        require(items.isNotEmpty())
        val id = allocateId()
        bundles[id] = items.map { InvObj(it) }
        persist()
        return id
    }

    @Synchronized
    fun get(id: Int): List<InvObj>? = bundles[id]?.map { InvObj(it) }

    @Synchronized
    fun replace(id: Int, items: List<InvObj>): Boolean {
        if (!bundles.containsKey(id)) return false
        if (items.isEmpty()) {
            remove(id)
        } else {
            bundles[id] = items.map { InvObj(it) }
            persist()
        }
        return true
    }

    @Synchronized
    fun remove(id: Int): List<InvObj>? {
        val removed = bundles.remove(id) ?: return null
        groundBundles.entries.removeIf { it.value == id }
        persist()
        return removed.map { InvObj(it) }
    }

    @Synchronized
    fun bindGround(obj: Obj, bundleId: Int) {
        require(bundleId in bundles)
        groundBundles[obj] = bundleId
    }

    @Synchronized
    fun groundBundle(obj: Obj): Int? = groundBundles[obj]

    @Synchronized
    fun unbindGround(obj: Obj, bundleId: Int): Boolean {
        if (groundBundles[obj] != bundleId) return false
        groundBundles.remove(obj)
        return true
    }

    private fun allocateId(): Int {
        while (nextId <= 0 || bundles.containsKey(nextId)) {
            nextId = if (nextId == Int.MAX_VALUE) 1 else nextId + 1
        }
        val id = nextId
        nextId = if (nextId == Int.MAX_VALUE) 1 else nextId + 1
        return id
    }

    private fun load() {
        if (!Files.isRegularFile(path)) return
        try {
            val properties = Properties()
            Files.newInputStream(path).use(properties::load)
            for (name in properties.stringPropertyNames()) {
                if (!name.startsWith(KEY_PREFIX)) continue
                val id = name.removePrefix(KEY_PREFIX).toIntOrNull() ?: continue
                val items = decode(properties.getProperty(name)) ?: continue
                if (id > 0 && items.isNotEmpty()) bundles[id] = items
            }
            val storedNext = properties.getProperty(NEXT_KEY)?.toIntOrNull() ?: 1
            val highest = bundles.keys.maxOrNull() ?: 0
            nextId = maxOf(storedNext, if (highest == Int.MAX_VALUE) 1 else highest + 1)
        } catch (error: Exception) {
            logger.error(error) { "Could not load bot loot key contents from $path" }
        }
    }

    private fun persist() {
        try {
            Files.createDirectories(path.parent)
            val properties = Properties()
            properties.setProperty(NEXT_KEY, nextId.toString())
            for ((id, items) in bundles) {
                properties.setProperty("$KEY_PREFIX$id", encode(items))
            }
            Files.newOutputStream(
                path,
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING,
                StandardOpenOption.WRITE,
            ).use { properties.store(it, "SoloScape bot loot keys") }
        } catch (error: Exception) {
            logger.error(error) { "Could not save bot loot key contents to $path" }
        }
    }

    companion object {
        private const val NEXT_KEY = "next"
        private const val KEY_PREFIX = "key."

        internal fun encode(items: List<InvObj>): String =
            items.joinToString(";") { "${it.id},${it.count},${it.vars}" }

        @OptIn(UncheckedType::class)
        internal fun decode(value: String): List<InvObj>? =
            runCatching {
                if (value.isBlank()) return@runCatching emptyList()
                value.split(';').map { encoded ->
                    val parts = encoded.split(',')
                    require(parts.size == 3)
                    val id = parts[0].toInt()
                    val count = parts[1].toInt()
                    val vars = parts[2].toInt()
                    require(id >= 0 && count > 0)
                    InvObj(id, count, vars)
                }
            }.getOrNull()
    }
}
