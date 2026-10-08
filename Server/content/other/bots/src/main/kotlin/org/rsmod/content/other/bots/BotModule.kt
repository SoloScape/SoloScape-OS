package org.rsmod.content.other.bots

import org.rsmod.api.death.PlayerDeathHook
import org.rsmod.api.death.PlayerDeathItemHook
import org.rsmod.api.death.PlayerRespawnHook
import org.rsmod.api.player.hook.PlayerObjTakeRedirectHook
import org.rsmod.plugin.module.PluginModule

public class BotModule : PluginModule() {
    override fun bind() {
        addSetBinding<PlayerDeathHook>(BotLootKeyDeathHook::class.java)
        addSetBinding<PlayerDeathItemHook>(BotLootKeyItemHook::class.java)
        addSetBinding<PlayerRespawnHook>(BotPvpRespawnHook::class.java)
        addSetBinding<PlayerObjTakeRedirectHook>(BotLootKeyGroundTakeHook::class.java)
    }
}
