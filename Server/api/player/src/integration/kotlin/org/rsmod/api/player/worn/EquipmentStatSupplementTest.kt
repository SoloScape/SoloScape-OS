package org.rsmod.api.player.worn

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class EquipmentStatSupplementTest {
    private fun level(itemId: Int, skill: String): Int? =
        EquipmentStatSupplement.requirementsFor(itemId)
            .firstOrNull { it.skill == skill }?.level

    @Test
    fun `axes and pickaxes require Attack to wield`() {
        assertEquals(30, level(1357, "attack")) // Adamant axe
        assertEquals(40, level(1359, "attack")) // Rune axe
        assertEquals(60, level(6739, "attack")) // Dragon axe
        assertEquals(40, level(1275, "attack")) // Rune pickaxe
        assertEquals(60, level(11920, "attack")) // Dragon pickaxe
    }

    @Test
    fun `ordinary melee weapons and armour gain missing requirements`() {
        assertEquals(40, level(1213, "attack")) // Rune dagger
        assertEquals(40, level(1373, "attack")) // Rune battleaxe
        assertEquals(40, level(1113, "defence")) // Rune chainbody
        assertEquals(40, level(1079, "defence")) // Rune platelegs
    }

    @Test
    fun `existing cache stats take precedence over supplementary stats`() {
        assertEquals(
            emptyList<EquipmentStatSupplement.Requirement>(),
            EquipmentStatSupplement.additionalRequirements(1357, setOf("stat.attack")),
        )
        assertEquals(
            emptyList<EquipmentStatSupplement.Requirement>(),
            EquipmentStatSupplement.additionalRequirements(1333, setOf("stat.attack")),
        )
    }

    @Test
    fun `equipping arrows is not gated by their ranged use requirement`() {
        assertTrue(EquipmentStatSupplement.requirementsFor(892).isEmpty()) // Rune arrows
        assertTrue(EquipmentStatSupplement.requirementsFor(9243).isEmpty()) // Diamond bolts (e)
    }

    @Test
    fun `low-level equipment remains available`() {
        assertTrue(EquipmentStatSupplement.requirementsFor(1351).isEmpty()) // Bronze axe
        assertTrue(EquipmentStatSupplement.requirementsFor(1265).isEmpty()) // Bronze pickaxe
    }

    @Test
    fun `multiple missing requirements are represented without two-stat limit`() {
        val requirements = EquipmentStatSupplement.requirementsFor(10146) // Orange salamander
        assertEquals(3, requirements.size)
        assertTrue(requirements.any { it.skill == "ranged" && it.level == 50 })
        assertTrue(requirements.any { it.skill == "attack" && it.level == 50 })
        assertTrue(requirements.any { it.skill == "magic" && it.level == 50 })
    }

    @Test
    fun `supplement is nonempty and does not add quiver requirements`() {
        assertFalse(EquipmentStatSupplement.requirementsFor(1357).isEmpty())
        assertTrue(EquipmentStatSupplement.requirementsFor(806).isEmpty()) // Rune dart
    }
}
