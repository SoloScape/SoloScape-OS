package org.rsmod.content.skills.construction.house

import jakarta.inject.Singleton
import org.rsmod.api.attr.AttributeKey
import org.rsmod.content.skills.construction.HouseLayout
import org.rsmod.content.skills.construction.data.HouseLocation
import org.rsmod.content.skills.construction.data.HouseStyle
import org.rsmod.game.entity.Player

@Singleton
class HouseStore {
    fun state(player: Player): HouseLayout {
        val saved = player.attr[LAYOUT]
        val layout = HouseLayout.decode(saved)
        if (saved == null) {
            val header = player.attr[LEGACY]?.substringBefore(';')?.split(',')
            layout.owned = header?.getOrNull(0) == "1"
            layout.style = HouseStyle.entries.firstOrNull { it.name == header?.getOrNull(1) } ?: layout.style
            layout.location = HouseLocation.entries.firstOrNull { it.name == header?.getOrNull(2) } ?: layout.location
        }
        return layout
    }

    fun save(player: Player, layout: HouseLayout) {
        player.attr[LAYOUT] = layout.encode()
    }

    fun update(player: Player, block: (HouseLayout) -> Unit) {
        val layout = state(player)
        block(layout)
        save(player, layout)
    }

    private companion object {
        val LAYOUT = AttributeKey<String>(persistenceKey = "poh_layout")
        val LEGACY = AttributeKey<String>(persistenceKey = "poh_house")
    }
}
