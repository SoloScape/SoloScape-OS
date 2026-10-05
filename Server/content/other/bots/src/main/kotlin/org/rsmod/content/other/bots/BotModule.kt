package org.rsmod.content.other.bots

import org.rsmod.api.death.PlayerDeathHook
import org.rsmod.api.death.PlayerDeathItemHook
import org.rsmod.plugin.module.PluginModule

public class BotModule : PluginModule() {
    override fun bind() {
        addSetBinding<PlayerDeathHook>(BotLootKeyDeathHook::class.java)
        addSetBinding<PlayerDeathItemHook>(BotLootKeyItemHook::class.java)
    }
}
