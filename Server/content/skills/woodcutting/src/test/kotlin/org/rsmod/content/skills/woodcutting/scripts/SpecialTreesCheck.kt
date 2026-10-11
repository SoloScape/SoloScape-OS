package org.rsmod.content.skills.woodcutting.scripts

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import org.rsmod.api.random.GameRandom
import org.rsmod.game.entity.Player
import org.rsmod.game.inv.InvObj

private class TableRolls(vararg values: Int) : GameRandom {
    private val rolls = ArrayDeque(values.toList())
    override fun of(maxExclusive: Int): Int = rolls.removeFirst().also { check(it in 0 until maxExclusive) }
    override fun of(minInclusive: Int, maxInclusive: Int): Int =
        rolls.removeFirst().also { check(it in minInclusive..maxInclusive) }
    override fun randomDouble(): Double = error("Unexpected double roll")
}

fun main() {
    ServerCacheManager.init(240).close()
    val expected = listOf(
        Triple("jatoba", 40, 92.0), Triple("camphor", 66, 143.5),
        Triple("ironwood", 80, 175.0), Triple("rosewood", 92, 212.5),
    )
    for ((wood, level, xp) in expected) {
        val name = "loc.${wood}_tree"
        val definition = checkNotNull(SpecialTreeDefinitions.get(name))
        val type = checkNotNull(ServerCacheManager.getObject(name.asRSCM(RSCMType.LOC)))
        check(type.actions.getOpOrNull(0) == "Chop down")
        check(definition.level == level && definition.xp == xp)
        check(ServerCacheManager.getObject(definition.stump.asRSCM(RSCMType.LOC)) != null)
        check(ServerCacheManager.getItem(definition.product.asRSCM(RSCMType.OBJ)) != null)
        // The real server rate lookup must work despite the native type lacking content.tree params.
        val rates = Woodcutting.cutSuccessRates(type, InvObj("obj.dragon_axe"))
        check(rates == definition.axeRates[7])
        val felling = Woodcutting.cutSuccessRates(type, InvObj("obj.dragon_axe_2h"))
        check(felling == rates)
    }
    check(SpecialTreeDefinitions.get("loc.camphor_tree")!!.despawnTicks == 200)
    check(SpecialTreeDefinitions.get("loc.ironwood_tree")!!.despawnTicks == 400)
    check(SpecialTreeDefinitions.get("loc.rosewood_tree")!!.despawnTicks == 458)
    check(SpecialTreeDefinitions.get("loc.rosewood_tree_fullygrown")!!.depletionDenominator == 8)
    check(SpecialTreeDefinitions.get("loc.rosewood_tree_fullygrown_claimxp") == null)
    val player = Player()
    repeat(12) { chop ->
        check(player.sulliuscepStage == chop % 6)
        for (index in 0..5) {
            val parent = ServerCacheManager.getObject("loc.fossil_cep_multi${index + 1}".asRSCM())!!
            val grown = "loc.fossil_cep_grown".asRSCM(RSCMType.LOC)
            val sprout = "loc.fossil_cep_sprout".asRSCM(RSCMType.LOC)
            check((parent.transforms!!.getOrNull(player.sulliuscepStage) ?: parent.transforms!!.last()) == if (index == chop % 6) grown else sprout)
        }
        player.sulliuscepStage = SpecialTreeDefinitions.nextSulliuscep(player.sulliuscepStage)
    }
    check(SpecialTreeDefinitions.rates("loc.fossil_cep_grown", "obj.dragon_axe") == (45 to 228))
    check(SpecialTreeDefinitions.rates("loc.blisterwood_tree", "obj.bronze_axe") == (15 to 50))
    check(SpecialTreeDefinitions.rates("loc.blisterwood_tree", "obj.dragon_axe") == (61 to 186))
    check(sulliuscepClueDenominator(99, 0) == 344)
    check(sulliuscepClueDenominator(99, 4) == 17236)
    val drops = listOf(
        sulliuscepProduct(TableRolls(0, 16), false, false) to SulliuscepProduct("obj.fossil_numulite", 16),
        sulliuscepProduct(TableRolls(174, 0), false, false) to SulliuscepProduct("obj.fossil_small_unid"),
        sulliuscepProduct(TableRolls(174, 349, 0), false, false) to SulliuscepProduct("obj.fossil_medium_unid"),
        sulliuscepProduct(TableRolls(174, 349, 699, 0), false, false) to SulliuscepProduct("obj.fossil_large_unid"),
        sulliuscepProduct(TableRolls(174, 349, 699, 874, 0), false, false) to SulliuscepProduct("obj.fossil_rare_unid"),
        sulliuscepProduct(TableRolls(174, 99), true, true) to SulliuscepProduct("obj.fossil_sulliuscep_cap"),
        sulliuscepProduct(TableRolls(174, 90), true, true) to SulliuscepProduct("obj.mortmyremushroom"),
    )
    for ((actual, target) in drops) {
        check(actual == target)
        check(ServerCacheManager.getItem(actual.item.asRSCM(RSCMType.OBJ)) != null)
    }
    val counts = (0 until 100).map { sulliuscepProduct(TableRolls(174, it), true, true).item }
        .groupingBy { it }.eachCount()
    check(counts == mapOf("obj.bittercap_mushroom" to 90, "obj.mortmyremushroom" to 9,
        "obj.fossil_sulliuscep_cap" to 1))
    runSpecialTreeChopTests()
    check((0 until 100).map(::ordinaryBirdNest).groupingBy { it }.eachCount().values.sorted() == listOf(1, 1, 1, 32, 65))
    println("Special trees: native rates/stumps/products; personal six-stage rotation; pre-roll and 90/9/1 table checks passed.")
}
