package org.rsmod.content.areas.city.falador.npcs

import dev.openrune.ServerCacheManager
import dev.openrune.definition.type.widget.IfEvent
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import dev.openrune.util.Wearpos
import org.rsmod.api.player.dialogue.Dialogue
import org.rsmod.api.attr.AttributeKey
import org.rsmod.api.player.protect.ProtectedAccess
import org.rsmod.api.player.ui.IfModalButton
import org.rsmod.api.player.ui.ifSetEvents
import org.rsmod.api.player.vars.VarPlayerIntMapSetter
import org.rsmod.api.script.onIfClose
import org.rsmod.api.script.onIfOpen
import org.rsmod.api.script.onIfModalButton
import org.rsmod.api.script.onOpNpc1
import org.rsmod.api.script.onOpNpc4
import org.rsmod.api.script.onOpNpc5
import org.rsmod.api.table.FacialHairStylesRow
import org.rsmod.api.table.HairStylesRow
import org.rsmod.api.table.TorsoStylesRow
import org.rsmod.api.table.SleeveStylesRow
import org.rsmod.api.table.LeggingStylesRow
import org.rsmod.api.table.ShoeStylesRow
import org.rsmod.api.table.HandStylesRow
import org.rsmod.game.entity.Player
import org.rsmod.game.entity.player.Appearance
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

private enum class MakeoverType(
    val interfaceType: Int,
    val stylesEnum: String,
    val kitSlot: Int,
    val colourSlot: Int?,
    val coloursEnum: String?,
    val request: String,
    val brochure: String,
) {
    Hair(
        interfaceType = 0,
        stylesEnum = "enum.makeover_hair_styles",
        kitSlot = 0,
        colourSlot = 0,
        coloursEnum = "enum.makeover_hair_colours",
        request = "I'd like a haircut please.",
        brochure = "Please select the hairstyle you would like from this brochure. " +
            "I'll even throw in a free recolour.",
    ),
    FacialHair(
        interfaceType = 1,
        stylesEnum = "enum.makeover_facial_hair_styles",
        kitSlot = 1,
        colourSlot = 0,
        coloursEnum = "enum.makeover_hair_colours",
        request = "I'd like a shave please.",
        brochure = "Please select the facial hair you would like from this brochure. " +
            "I'll even throw in a free recolour.",
    ),
    Torso(3, "enum.makeover_torso_styles", 2, 1, "enum.makeover_top_colours", "", ""),
    Sleeves(4, "enum.makeover_sleeve_styles", 3, 1, "enum.makeover_top_colours", "", ""),
    Bottoms(5, "enum.makeover_legging_styles", 5, 2, "enum.makeover_bottom_colours", "", ""),
    Shoes(6, "enum.makeover_shoe_styles", 6, 3, "enum.makeover_shoe_colours", "", ""),
    Wristwear(7, "enum.makeover_hand_styles", 4, null, null, "", ""),
}

class HairdresserScript : PluginScript() {
    override fun ScriptContext.startup() {
        onOpNpc1(HAIRDRESSER) { startDialogue(it.npc) { hairdresser() } }
        onOpNpc4(HAIRDRESSER) { openMakeover(MakeoverType.Hair) }
        onOpNpc5(HAIRDRESSER) { openMakeover(MakeoverType.FacialHair) }

        onIfOpen("interface.makeover") { player.initializeStyleEditor() }
        onIfModalButton("component.makeover:burger_menu_frame") {
            val category = appearanceMenuCategory(it.comsub) ?: return@onIfModalButton
            ifClose()
            vars["varbit.makeover_interface_type"] = category
            ifOpenMainModal(if (category == 2) "interface.makeover_mage" else "interface.makeover")
        }
        onIfModalButton("component.makeover:item_area") { previewStyle(it) }
        onIfModalButton("component.makeover:colours") { previewColour(it) }
        onIfModalButton("component.makeover:select") { applyStyle(close = false) }
        onIfModalButton("component.makeover:select_and_close") { applyStyle(close = true) }
        onIfClose("interface.makeover") { player.revertUnappliedStyle() }
    }

    private suspend fun Dialogue.hairdresser() {
        chatNpc(
            happy,
            "Good afternoon. In need of a haircut are we? Currently we're offering this service " +
                "for free!",
        )
        val type =
            choice3(
                MakeoverType.Hair.request,
                MakeoverType.Hair,
                MakeoverType.FacialHair.request,
                MakeoverType.FacialHair,
                "No thank you.",
                null,
                title = "Select an option",
            )
        if (type == null) {
            chatPlayer(neutral, "No thank you.")
            chatNpc(neutral, "Very well. Come back if you change your mind.")
            return
        }
        chatPlayer(happy, type.request)
        chatNpc(happy, type.brochure)
        if (hasHatOn()) {
            return
        }
        access.showMakeover(type)
    }

    private suspend fun ProtectedAccess.openMakeover(type: MakeoverType) {
        startDialogue {
            if (!hasHatOn()) {
                access.showMakeover(type)
            }
        }
    }

    private suspend fun Dialogue.hasHatOn(): Boolean {
        val hat = player.worn[Wearpos.Hat.slot] ?: return false
        objbox(hat, "You should take off your hat if you want to get a haircut!")
        return true
    }

    private fun ProtectedAccess.showMakeover(type: MakeoverType) {
        ifClose()
        vars["varbit.makeover_interface_type"] = type.interfaceType
        vars["varbit.makeover_bodytype"] = player.appearance.bodyType
        ifOpenMainModal("interface.makeover")
    }

    private fun Player.initializeStyleEditor() {
        val type = MakeoverType.entries.firstOrNull {
            it.interfaceType == vars["varbit.makeover_interface_type"]
        } ?: return
        val styles = type.styles()
        val kit = appearance.identKitSnapshot()[type.kitSlot].toInt()
        val colour = type.colourSlot?.let { appearance.coloursSnapshot()[it].toInt() } ?: 0
        val current = styles.indexOfFirst { it.kitFor(this) == kit }.coerceAtLeast(0)

        VarPlayerIntMapSetter.set(this, VAR_ACTIVE, 1)
        VarPlayerIntMapSetter.set(this, VAR_ORIGINAL_KIT, kit + 1)
        VarPlayerIntMapSetter.set(this, VAR_ORIGINAL_COLOUR, colour)
        VarPlayerIntMapSetter.set(this, "varbit.makeover_bodytype", appearance.bodyType)
        VarPlayerIntMapSetter.set(this, "varp.makeover_hair", current * SLOTS_PER_STYLE)
        VarPlayerIntMapSetter.set(this, "varp.makeover_colour", colour)

        ifSetEvents("component.makeover:item_area", 0 until styles.size * SLOTS_PER_STYLE, IfEvent.Op1)
        val colours = type.coloursEnum?.let {
            ServerCacheManager.getEnum(it.asRSCM(RSCMType.ENUM))?.values?.size
        } ?: 0
        if (colours > 0) {
            ifSetEvents("component.makeover:colours", 0 until colours * SLOTS_PER_COLOUR, IfEvent.Op1)
        }
        ifSetEvents("component.makeover:select", 0..10, IfEvent.Op1)
        ifSetEvents("component.makeover:select_and_close", 0..10, IfEvent.Op1)
        ifSetEvents("component.makeover:burger_menu_frame", 10..24, IfEvent.Op1)
    }

    private fun ProtectedAccess.previewStyle(button: IfModalButton) {
        val type = player.activeMakeover() ?: return
        if (button.comsub < 0) return
        val style = type.styles().getOrNull(button.comsub / SLOTS_PER_STYLE) ?: return
        vars["varp.makeover_hair"] = button.comsub - button.comsub % SLOTS_PER_STYLE
        player.appearance.setIdentKit(type.kitSlot, style.kitFor(player))
    }

    private fun ProtectedAccess.previewColour(button: IfModalButton) {
        val type = player.activeMakeover() ?: return
        val slot = type.colourSlot ?: return
        val palette = type.coloursEnum?.let {
            ServerCacheManager.getEnum(it.asRSCM(RSCMType.ENUM))
        } ?: return
        if (button.comsub < 0) return
        val colour = button.comsub / SLOTS_PER_COLOUR
        if (colour !in palette.values.keys) return
        vars["varp.makeover_colour"] = colour
        player.appearance.setColour(slot, colour)
    }

    private fun ProtectedAccess.applyStyle(close: Boolean) {
        val type = player.activeMakeover() ?: return
        val appearance = player.appearance
        vars[VAR_ORIGINAL_KIT] = appearance.identKitSnapshot()[type.kitSlot] + 1
        type.colourSlot?.let { vars[VAR_ORIGINAL_COLOUR] = appearance.coloursSnapshot()[it].toInt() }
        if (close) {
            ifClose()
            if (player.vars["varp.tutorial"] == 10 &&
                player.attr[TUTORIAL_APPEARANCE_CONFIRMED] != 1) {
                ifOpenMainModal("interface.makeover_mage")
            }
        }
    }

    private fun Player.revertUnappliedStyle() {
        val type = activeMakeover() ?: return
        val kit = vars[VAR_ORIGINAL_KIT] - 1
        appearance.setIdentKit(type.kitSlot, kit)
        type.colourSlot?.let { appearance.setColour(it, vars[VAR_ORIGINAL_COLOUR]) }
        VarPlayerIntMapSetter.set(this, VAR_ACTIVE, 0)
    }

    private fun Player.activeMakeover(): MakeoverType? {
        if (vars[VAR_ACTIVE] == 0) {
            return null
        }
        val interfaceType = vars["varbit.makeover_interface_type"]
        return MakeoverType.entries.firstOrNull { it.interfaceType == interfaceType }
    }

    private fun MakeoverType.styles(): List<MakeoverStyle> {
        val enum =
            ServerCacheManager.getEnum(stylesEnum.asRSCM(RSCMType.ENUM)) ?: return emptyList()
        return enum.values.entries
            .sortedBy { it.key }
            .map { (_, row) ->
                val rowId = (row as Number).toInt() and 0xFFFF
                when (this) {
                    MakeoverType.Hair ->
                        HairStylesRow.getRow(rowId).let {
                            MakeoverStyle(it.playerKitIdTypeA, it.playerKitIdTypeB)
                        }
                    MakeoverType.FacialHair ->
                        FacialHairStylesRow.getRow(rowId).let {
                            MakeoverStyle(it.playerKitIdTypeA, it.playerKitIdTypeB)
                        }
                    MakeoverType.Torso -> TorsoStylesRow.getRow(rowId).let {
                        MakeoverStyle(it.playerKitIdTypeA, it.playerKitIdTypeB)
                    }
                    MakeoverType.Sleeves -> SleeveStylesRow.getRow(rowId).let {
                        MakeoverStyle(it.playerKitIdTypeA, it.playerKitIdTypeB)
                    }
                    MakeoverType.Bottoms -> LeggingStylesRow.getRow(rowId).let {
                        MakeoverStyle(it.playerKitIdTypeA, it.playerKitIdTypeB)
                    }
                    MakeoverType.Shoes -> ShoeStylesRow.getRow(rowId).let {
                        MakeoverStyle(it.playerKitIdTypeA, it.playerKitIdTypeB)
                    }
                    MakeoverType.Wristwear -> HandStylesRow.getRow(rowId).let {
                        MakeoverStyle(it.playerKitIdTypeA, it.playerKitIdTypeB)
                    }
                }
            }
    }

    private class MakeoverStyle(val kitTypeA: Int, val kitTypeB: Int) {
        fun kitFor(player: Player): Int =
            if (player.appearance.bodyType == Appearance.BODY_TYPE_A) kitTypeA else kitTypeB
    }

    private companion object {
        val TUTORIAL_APPEARANCE_CONFIRMED = AttributeKey<Int>("tutorial_appearance_confirmed")
        const val HAIRDRESSER = "npc.hairdresser"
        const val SLOTS_PER_STYLE = 5
        const val SLOTS_PER_COLOUR = 2

        const val VAR_ACTIVE = "varbit.falador_makeover_active"
        const val VAR_ORIGINAL_KIT = "varbit.falador_makeover_original_kit"
        const val VAR_ORIGINAL_COLOUR = "varbit.falador_makeover_original_colour"
    }
}

internal fun appearanceMenuCategory(comsub: Int): Int? =
    if (comsub in 10..24 && comsub % 2 == 0) (comsub - 10) / 2 else null
