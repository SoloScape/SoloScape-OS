package org.rsmod.content.other.bots

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.types.ItemServerType
import dev.openrune.util.Wearpos
import dev.openrune.types.aconverted.interf.IfButtonOp
import jakarta.inject.Inject
import jakarta.inject.Singleton
import kotlin.math.abs
import org.rsmod.api.area.checker.AreaChecker
import org.rsmod.api.area.checker.wildernessLevel
import org.rsmod.api.combat.commons.magic.MagicSpell
import org.rsmod.api.combat.commons.styles.MeleeAttackStyle
import org.rsmod.api.combat.commons.styles.RangedAttackStyle
import org.rsmod.api.combat.commons.types.MeleeAttackType
import org.rsmod.api.combat.commons.types.RangedAttackType
import org.rsmod.api.combat.manager.MagicRuneManager
import org.rsmod.api.combat.manager.PlayerAttackManager
import org.rsmod.api.combat.weapon.styles.AttackStyles
import org.rsmod.api.combat.weapon.types.AttackTypes
import org.rsmod.api.invtx.invAdd
import org.rsmod.api.player.hook.PlayerTeleportValidator
import org.rsmod.api.player.hook.TeleportType
import org.rsmod.api.player.interact.HeldInteractions
import org.rsmod.api.player.interact.PlayerInteractions
import org.rsmod.api.player.interact.PlayerTInteractions
import org.rsmod.api.player.isInCombat
import org.rsmod.api.player.isInPvpCombat
import org.rsmod.api.player.isValidTarget
import org.rsmod.api.player.mapMultiway
import org.rsmod.api.player.protect.ProtectedAccessLauncher
import org.rsmod.api.player.stat.prayerLvl
import org.rsmod.api.player.stat.basePrayerLvl
import org.rsmod.api.player.stat.baseHitpointsLvl
import org.rsmod.api.player.stat.hitpoints
import org.rsmod.api.player.stat.stat
import org.rsmod.api.player.stat.statBase
import org.rsmod.api.player.vars.VarPlayerIntMapSetter
import org.rsmod.api.player.ui.IfOverlayButton
import org.rsmod.api.player.worn.HeldEquipOp
import org.rsmod.api.player.worn.HeldEquipResult
import org.rsmod.api.specials.SpecialAttack
import org.rsmod.api.specials.SpecialAttackRegistry
import org.rsmod.api.spells.MagicSpellRegistry
import org.rsmod.content.interfaces.prayer.tab.Prayer
import org.rsmod.content.interfaces.prayer.tab.PrayerRepository
import org.rsmod.events.EventBus
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj
import org.rsmod.game.interact.HeldOp
import org.rsmod.game.interact.InteractionOp
import org.rsmod.game.interact.InteractionPlayerOp
import org.rsmod.game.interact.InteractionPlayerT
import org.rsmod.map.CoordGrid

/**
 * Turns decisions into ordinary player actions. The combat scripts own all attack delays, rune
 * costs, hits, specials, prayer requirements, consume locks and teleport validation.
 *
 * A true result from an asynchronous action means it was submitted, not that its later effect
 * succeeded. Eating and drinking additionally check the synchronous inventory change so a refused
 * consume cannot stall the controller. Other actions must be observed afterward.
 */
@Singleton
class BotPvpActions @Inject constructor(
    private val access: ProtectedAccessLauncher,
    private val events: EventBus,
    private val held: HeldInteractions,
    private val equipment: HeldEquipOp,
    private val interactions: PlayerInteractions,
    private val spellInteractions: PlayerTInteractions,
    private val spells: MagicSpellRegistry,
    private val runes: MagicRuneManager,
    private val attackTypes: AttackTypes,
    private val attackStyles: AttackStyles,
    private val attacks: PlayerAttackManager,
    private val specials: SpecialAttackRegistry,
    private val prayers: PrayerRepository,
    private val areas: AreaChecker,
    private val teleports: PlayerTeleportValidator,
) {
    fun styleOf(player: Player): BotPvpStyle {
        if (player.interaction is InteractionPlayerT || player.vars["varbit.autocast_set"] == 1) {
            return BotPvpStyle.Magic
        }
        val type = attackTypes.get(player)
        return when {
            type?.isRanged == true -> BotPvpStyle.Ranged
            type?.isMagic == true -> BotPvpStyle.Magic
            else -> BotPvpStyle.Melee
        }
    }

    fun protection(player: Player): BotPvpStyle? = BotPvpStyle.entries.firstOrNull {
        player.vars[protectionVar(it)] != 0
    }

    fun pray(player: Player, style: BotPvpStyle): Boolean {
        val prayer = prayers.prayerList.firstOrNull { it.enabled == protectionVar(style) }
            ?: return false
        return queuePrayer(player, prayer)
    }

    fun prayOffensive(player: Player, style: BotPvpStyle): Boolean {
        val choices = when (style) {
            BotPvpStyle.Melee -> listOf(
                "varbit.prayer_piety", "varbit.prayer_chivalry", "varbit.prayer_ultimatestrength",
                "varbit.prayer_superhumanstrength", "varbit.prayer_burstofstrength",
            )
            BotPvpStyle.Ranged -> listOf(
                "varbit.prayer_rigour", "varbit.prayer_eagleeye", "varbit.prayer_hawkeye",
                "varbit.prayer_sharpeye",
            )
            BotPvpStyle.Magic -> listOf(
                "varbit.prayer_augury", "varbit.prayer_mysticmight", "varbit.prayer_mysticlore",
                "varbit.prayer_mysticwill",
            )
        }
        val prayer = choices.firstNotNullOfOrNull { key ->
            prayers.prayerList.firstOrNull { it.enabled == key && it.hasAllRequirements(player) }
        } ?: return false
        return queuePrayer(player, prayer)
    }

    private fun queuePrayer(player: Player, prayer: Prayer): Boolean {
        if (player.vars[prayer.enabled] != 0 || player.prayerLvl <= 0 ||
            !prayer.hasAllRequirements(player) ||
            player.queueList.count("queue.prayer_toggle") >= 2
        ) return false
        // Two queued toggles allow protection and offensive prayers together; the controller
        // controls reaction frequency so a pending prayer is not accidentally toggled back off.
        player.strongQueue("queue.prayer_toggle", 1, args = prayer)
        return true
    }

    /** Equipment must already be held; this cannot create or refill items during a fight. */
    fun equip(player: Player, items: List<String>): Boolean {
        if (player.isAccessProtected || player.isDelayed) return false
        val types = items.map { item(it) ?: return false }
        if (types.any { type ->
                player.worn.objs.none { it?.id == type.id } &&
                    player.inv.objs.none { it?.id == type.id }
            }
        ) return false
        for (type in types) {
            if (player.worn.objs.any { it?.id == type.id }) continue
            val slot = player.inv.indices.firstOrNull { player.inv[it]?.id == type.id } ?: return false
            if (equipment.equip(player, slot, player.inv) !is HeldEquipResult.Success) return false
        }
        // Success includes already wearing the full set (needed for repeat casts/finishers).
        return types.all { type -> player.worn.objs.any { it?.id == type.id } }
    }

    fun canCast(player: Player, spell: String): Boolean =
        resolveSpell(spell)?.let { runes.canCastSpell(player, it) } == true

    fun attack(player: Player, target: Player, spell: String? = null): Boolean {
        if (!validTarget(player, target) || player.isAccessProtected || player.isDelayed) return false
        if (spell == null) {
            val current = player.interaction as? InteractionPlayerOp
            if (current?.target === target && current.op == InteractionOp.Op2) return true
            interactions.interact(player, target, InteractionOp.Op2)
        } else {
            val magic = resolveSpell(spell) ?: return false
            if (!runes.canCastSpell(player, magic)) return false
            val current = player.interaction as? InteractionPlayerT
            if (current?.target === target && current.component == magic.component) return true
            spellInteractions.interact(player, target, magic.component, -1, null)
        }
        return true
    }

    /** Native energy is in tenths of a percent: 1000 is a full bar. */
    fun specialEnergy(player: Player): Int = player.vars["varp.sa_energy"]

    fun specialCost(finisher: String): Int {
        val type = item(finisher) ?: return Int.MAX_VALUE
        // Specialized costs (< 10) require weapon-specific rules, so omit those weapons from
        // generic bot finishers instead of assuming they are free.
        val cost = when (val special = specials[InvObj(type)]) {
            is SpecialAttack.Melee -> special.energyInHundreds
            is SpecialAttack.Ranged -> special.energyInHundreds
            is SpecialAttack.Magic -> special.energyInHundreds
            is SpecialAttack.Spell -> special.energyInHundreds
            is SpecialAttack.Instant -> special.energyInHundreds
            else -> return Int.MAX_VALUE
        }
        return cost.takeIf { it >= 10 } ?: Int.MAX_VALUE
    }

    fun cancelSpecial(player: Player): Boolean {
        if (player.vars["varp.sa_attack"] != 1) return false
        return button(player, "component.combat_interface:special_attack")
    }

    fun clearPrayers(player: Player) {
        if (player.queueList.count("queue.prayer_toggle") > 0) return
        val managed = listOf(
            "varbit.prayer_protectfrommelee", "varbit.prayer_protectfrommissiles",
            "varbit.prayer_protectfrommagic", "varbit.prayer_smite", "varbit.prayer_piety",
            "varbit.prayer_chivalry", "varbit.prayer_ultimatestrength",
            "varbit.prayer_superhumanstrength", "varbit.prayer_burstofstrength",
            "varbit.prayer_rigour", "varbit.prayer_eagleeye", "varbit.prayer_hawkeye",
            "varbit.prayer_sharpeye", "varbit.prayer_augury", "varbit.prayer_mysticmight",
            "varbit.prayer_mysticlore", "varbit.prayer_mysticwill",
        )
        prayers.prayerList.filter {
            it.enabled in managed && player.vars[it.enabled] != 0
        }.take(2).forEach { player.strongQueue("queue.prayer_toggle", 1, args = it) }
    }

    fun smite(player: Player): Boolean {
        val prayer = prayers.prayerList.firstOrNull { it.enabled == "varbit.prayer_smite" }
            ?: return false
        return queuePrayer(player, prayer)
    }

    fun special(player: Player): Boolean {
        // Do not toggle an already armed attack off. Granite maul is a native ordinary combat
        // special with two queued blows here, so it also respects the current attack delay.
        if (player.vars["varp.sa_attack"] != 0 || specialEnergy(player) <= 0) return false
        return button(player, "component.combat_interface:special_attack")
    }

    fun vengeance(player: Player): Boolean {
        val spell = resolveSpell("obj.94_vengeance") ?: return false
        if (!runes.canCastSpell(player, spell)) return false
        return access.launch(player) {
            events.publish(this, IfOverlayButton(spell.component, -1, null, IfButtonOp.Op1))
        }
    }

    fun foodCount(player: Player): Int = player.inv.objs.filterNotNull().sumOf {
        if (isFood(it.id)) it.count else 0
    }

    fun eat(player: Player, combo: Boolean): Boolean {
        val normal = player.inv.indices.firstOrNull {
            val obj = player.inv[it]
            obj != null && isFood(obj.id) && !isKarambwan(obj.id)
        }
        val comboSlot = player.inv.indices.firstOrNull {
            player.inv[it]?.id?.let(::isKarambwan) == true
        }
        if (normal == null && comboSlot == null) return false
        val before = inventorySnapshot(player)
        val launched = access.launch(player) {
            if (normal != null) held.interact(this, player.inv, normal, HeldOp.Op1)
            // Both clicks in one access are necessary for native combo eating; its consume locks
            // still decide whether either click succeeds and add the real combat delay.
            if ((combo || normal == null) && comboSlot != null) {
                held.interact(this, player.inv, comboSlot, HeldOp.Op1)
            }
        }
        return launched && inventorySnapshot(player) != before
    }

    fun drink(player: Player, restore: Boolean): Boolean {
        val depletedPrayer = player.prayerLvl * 100 <= player.basePrayerLvl * 25
        val combatStats = listOf("stat.attack", "stat.strength", "stat.ranged", "stat.magic", "stat.defence")
        val drained = combatStats.any { player.stat(it) < player.statBase(it) }
        val style = styleOf(player)
        val slot = player.inv.indices.firstOrNull {
            val type = player.inv[it]?.id?.let(ServerCacheManager::getItem)
                ?: return@firstOrNull false
            if (type.interfaceOptions?.none { it.equals("Drink", true) } != false) {
                return@firstOrNull false
            }
            val name = type.name
            when {
                restore && name.startsWith("Super restore", true) -> depletedPrayer || drained
                restore && name.startsWith("Prayer potion", true) -> depletedPrayer
                // Restore a brew's stat drains before drinking another dose.
                restore && name.startsWith("Saradomin brew", true) ->
                    !drained && player.hitpoints * 100 <= player.baseHitpointsLvl * 55
                restore -> false
                name.startsWith("Super combat potion", true) -> style == BotPvpStyle.Melee &&
                    listOf("stat.attack", "stat.strength").any { player.stat(it) <= player.statBase(it) }
                name.startsWith("Super attack", true) || name.startsWith("Attack potion", true) ->
                    style == BotPvpStyle.Melee && player.stat("stat.attack") <= player.statBase("stat.attack")
                name.startsWith("Super strength", true) || name.startsWith("Strength potion", true) ->
                    style == BotPvpStyle.Melee && player.stat("stat.strength") <= player.statBase("stat.strength")
                name.startsWith("Ranging potion", true) ->
                    style == BotPvpStyle.Ranged && player.stat("stat.ranged") <= player.statBase("stat.ranged")
                name.startsWith("Magic potion", true) ->
                    style == BotPvpStyle.Magic && player.stat("stat.magic") <= player.statBase("stat.magic")
                else -> false
            }
        } ?: return false
        val before = inventorySnapshot(player)
        val launched = access.launch(player) { held.interact(this, player.inv, slot, HeldOp.Op1) }
        return launched && inventorySnapshot(player) != before
    }

    fun teleport(player: Player): Boolean {
        if (player.actionDelay > player.currentMapClock ||
            teleports.validate(player, TeleportType.Standard, areas) != null
        ) return false
        val type = item("obj.poh_tablet_lumbridgeteleport") ?: return false
        val slot = player.inv.indices.firstOrNull { player.inv[it]?.id == type.id } ?: return false
        return access.launch(player) { held.interact(this, player.inv, slot, HeldOp.Op1) }
    }

    /**
     * Synthetic population relocation after a safe restock. This deliberately uses an exempt
     * telejump rather than making a respawned deep-Wilderness bot walk from Lumbridge through the
     * ditch on every death.
     */
    fun relocate(player: Player, destination: CoordGrid): Boolean =
        access.launch(player) {
            telejump(destination, TeleportType.Exempt)
        }

    /**
     * Side-effect-free target prefilter. Native attack scripts remain authoritative for opt-out,
     * skull prevention, hooks, line of sight and any remaining legality checks.
     */
    fun validTarget(player: Player, target: Player): Boolean {
        if (player === target || !player.isValidTarget() || !target.isValidTarget() ||
            player.coords.level != target.coords.level
        ) return false
        val depth = minOf(player.coords.wildernessLevel(areas), target.coords.wildernessLevel(areas))
        if (depth < 1 || abs(player.combatLevel - target.combatLevel) > depth) return false
        if (!player.mapMultiway(areas)) {
            val owner = player.vars["varp.pk_predator1"]
            if (player.isInCombat() && owner != -1 && owner != target.uid.packed) return false
            // A conservative refusal avoids stealing a live NPC fight. Stale NPC ownership is
            // cleared by native combat; the target can be reconsidered on the next cycle.
            if (player.isInCombat() && player.vars["varp.aggressive_npc"] != -1) return false
            val otherOwner = target.vars["varp.pk_predator1"]
            if (target.isInPvpCombat() && otherOwner != -1 && otherOwner != player.uid.packed) {
                return false
            }
        }
        return true
    }

    /** Normal equipped hit projection; accuracy and special multipliers are not guaranteed hits. */
    fun estimatedMaxHit(
        player: Player,
        target: Player,
        style: BotPvpStyle,
        spell: String? = null,
    ): Int {
        val type = attackTypes.get(player)
        val stance = attackStyles.get(player)
        return when (style) {
            BotPvpStyle.Melee -> attacks.calculateMeleeMaxHit(
                player, target, MeleeAttackType.from(type), MeleeAttackStyle.from(stance), 1.0,
            )
            BotPvpStyle.Ranged -> attacks.calculateRangedMaxHit(
                player, target, RangedAttackType.from(type), RangedAttackStyle.from(stance), 1.0, 0,
            )
            BotPvpStyle.Magic -> {
                val magic = spell?.let(::resolveSpell) ?: return 0
                attacks.calculateSpellMaxHit(
                    player, target, magic.obj, magic.spellbook, magic.maxHit, 5, false,
                ).last
            }
        }
    }

    /**
     * Spawn/safe-restock only. Call after setting loadout levels and spellbook, never in combat.
     * Primary gear is equipped before swaps and supplies are added so the inventory fits 28 slots.
     */
    fun seed(player: Player, loadout: BotPvpLoadout): Boolean =
        seedFailure(player, loadout) == null

    /**
     * Returns null after a successful safe-state seed, otherwise a diagnostic explaining exactly
     * why this loadout could not be constructed. Initial equipment is written directly to worn
     * slots on purpose: Player worn-state setters are intended for initialization/debugging, while
     * HeldEquipOp is an interactive action and may reject synthetic players through normal player
     * restrictions. Live combat switches still go through HeldEquipOp in [equip].
     */
    fun seedFailure(player: Player, loadout: BotPvpLoadout): String? {
        if ((player.processedMapClock > 0 && player.isInCombat()) ||
            player.isAccessProtected || player.isDelayed
        ) return "player is not in a safe seed state"

        val primary = loadout.styles[loadout.primaryStyle]
            ?: return "primary style ${loadout.primaryStyle} has no equipment"
        val extras = (loadout.styles.values.flatten() + loadout.specialWeapons).distinct() -
            primary.toSet()
        val required = (primary + extras + loadout.runes.keys + loadout.consumables.keys +
            loadout.food).distinct()

        val types = LinkedHashMap<String, ItemServerType>(required.size)
        for (symbol in required) {
            val type = item(symbol)
                ?: return "item $symbol is missing from the installed cache"
            types[symbol] = type
        }
        val runePackTypes = LinkedHashMap<Int, ItemServerType>(loadout.runePacks.size)
        for (id in loadout.runePacks.keys) {
            val type = ServerCacheManager.getItem(id)
                ?: return "item id $id is missing from the installed cache"
            runePackTypes[id] = type
        }

        val fixedSlots = extras.size +
            loadout.runes.size + loadout.consumables.entries.sumOf {
                if (types.getValue(it.key).stackable) 1 else it.value
            } + loadout.runePacks.entries.sumOf {
                if (runePackTypes.getValue(it.key).stackable) 1 else it.value
            }
        if (fixedSlots > 24) {
            return "loadout reserves $fixedSlots inventory slots before food (maximum 24)"
        }

        VarPlayerIntMapSetter.set(player, "varbit.spellbook", loadout.spellbook.varValue)
        player.inv.fillNulls()
        player.worn.fillNulls()

        for (symbol in primary) {
            val type = types.getValue(symbol)
            val wearpos = Wearpos[type.wearpos1]
                ?: return "primary item $symbol has no wearable slot"
            if (wearpos.isClientOnly) {
                return "primary item $symbol resolves to client-only wear position $wearpos"
            }
            if (player.worn[wearpos.slot] != null) {
                return "primary item $symbol conflicts at wear position $wearpos"
            }
            player.worn[wearpos.slot] = InvObj(type, if (type.stackable) 500 else 1)
        }

        for (symbol in extras) {
            val type = types.getValue(symbol)
            player.invAdd(player.inv, type.id, if (type.stackable) 500 else 1)
            if (player.inv.objs.none { it?.id == type.id }) {
                return "could not add swap/special item $symbol to inventory"
            }
        }
        for ((symbol, count) in loadout.runes + loadout.consumables) {
            val type = types.getValue(symbol)
            player.invAdd(player.inv, type.id, count)
            val present = player.inv.objs.filterNotNull()
                .filter { it.id == type.id }
                .sumOf { it.count }
            if (present < count) {
                return "could not add $count x $symbol to inventory (found $present)"
            }
        }
        for ((id, count) in loadout.runePacks) {
            val type = runePackTypes.getValue(id)
            player.invAdd(player.inv, type.id, count)
            val present = player.inv.objs.filterNotNull()
                .filter { it.id == type.id }
                .sumOf { it.count }
            if (present < count) {
                return "could not add $count x item id $id to inventory (found $present)"
            }
        }

        val free = player.inv.objs.count { it == null }
        if (free < 4) return "only $free inventory slots remain for food"
        val food = types.getValue(loadout.food)
        player.invAdd(player.inv, food.id, free - 1)
        player.rebuildAppearance()
        if (foodCount(player) < 3) {
            return "food ${loadout.food} was not recognized as edible after seeding"
        }
        return null
    }

    // Native consumable handlers update inventory synchronously, including a dose/portion ID
    // change. Comparing slots also detects partial foods that do not reduce the occupied count.
    private fun inventorySnapshot(player: Player): List<Pair<Int, Int>?> =
        player.inv.objs.map { it?.let { obj -> obj.id to obj.count } }

    private fun button(player: Player, component: String): Boolean = access.launch(player) {
        events.publish(this, IfOverlayButton(ServerCacheManager.fromComponent(component),
            -1, null, IfButtonOp.Op1))
    }

    private fun item(symbol: String): ItemServerType? =
        ServerCacheManager.getItem(symbol.asRSCM(RSCMType.OBJ))

    private fun resolveSpell(name: String): MagicSpell? = if (name.startsWith("obj.")) {
        item(name)?.let(spells::getObjSpell)
    } else {
        spells.allSpells().firstOrNull { it.name.equals(name, true) }
    }

    private fun isFood(id: Int): Boolean =
        ServerCacheManager.getItem(id)?.interfaceOptions?.any { it.equals("Eat", true) } == true

    private fun isKarambwan(id: Int): Boolean =
        ServerCacheManager.getItem(id)?.name.equals("Cooked karambwan", true)

    private fun protectionVar(style: BotPvpStyle): String = when (style) {
        BotPvpStyle.Melee -> "varbit.prayer_protectfrommelee"
        BotPvpStyle.Ranged -> "varbit.prayer_protectfrommissiles"
        BotPvpStyle.Magic -> "varbit.prayer_protectfrommagic"
    }
}
