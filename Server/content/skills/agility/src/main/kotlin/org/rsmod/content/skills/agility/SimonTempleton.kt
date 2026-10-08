package org.rsmod.content.skills.agility

import org.rsmod.api.player.dialogue.Dialogue
import org.rsmod.api.script.onOpNpc1
import org.rsmod.api.script.onOpNpcU
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

class SimonTempleton : PluginScript() {
    override fun ScriptContext.startup() {
        onOpNpc1(SIMON) {
            startDialogue(it.npc) { simonDialogue() }
        }
        onOpNpcU(SIMON, PYRAMID_TOP) {
            val slot = it.invSlot
            startDialogue(it.npc) { sellUsedTop(slot) }
        }
    }

    private suspend fun Dialogue.simonDialogue() {
        if (vars[SIMON_JOB] == 0) {
            introduction()
            if (player.inv.count(PYRAMID_TOP) == 0) {
                return
            }
        }

        val count = player.inv.count(PYRAMID_TOP)
        if (count > 0) {
            offerPyramidTops(count)
        } else {
            noPyramidTopDialogue()
        }
    }

    private suspend fun Dialogue.introduction() {
        chatPlayer(neutral, "Hello. Who are you?")
        chatNpc(happy, "G'day, mate. Simon Templeton's the name.")
        vars[SIMON_NAMED] = 1

        chatPlayer(quiz, "What are you doing all the way out here?")
        chatNpc(
            neutral,
            "I've got a contract to recover artefacts from the top of this pyramid.",
        )
        chatPlayer(quiz, "Why don't you climb up and get them yourself?")
        chatNpc(
            worried,
            "An old injury from Sophanem has caught up with me. My back isn't up to that climb these days.",
        )
        chatNpc(
            happy,
            "Bring me any golden pyramid tops you find and I'll pay 10,000 coins for each one.",
        )
        vars[SIMON_JOB] = 1
    }

    private suspend fun Dialogue.noPyramidTopDialogue() {
        chatPlayer(neutral, "Hello, Simon.")
        chatNpc(happy, "G'day, mate. Got any new artefacts for me?")
        chatPlayer(neutral, "No, I haven't.")
        chatNpc(
            neutral,
            "Keep at it. Someone else might reach the top and grab them before you do.",
        )
        chatPlayer(neutral, "I'll see what I can find. Goodbye.")
    }

    private suspend fun Dialogue.offerPyramidTops(count: Int) {
        chatNpc(happy, "G'day, mate. Got any new artefacts for me?")
        val noun = if (count == 1) "pyramid top" else "pyramid tops"
        when (
            choice2(
                "Sell the $noun.",
                true,
                "Keep the $noun.",
                false,
            )
        ) {
            true -> sellTops(count)
            false -> {
                chatPlayer(neutral, "I'll hang on to them for now.")
                chatNpc(worried, "Fair enough. Take care of them; valuable artefacts attract attention.")
            }
        }
    }

    private suspend fun Dialogue.sellTops(count: Int) {
        val payout = AgilityPyramidRewards.coinsForTops(count)
        val removed = access.invDel(access.inv, PYRAMID_TOP, count)
        if (!removed.success) {
            mesbox("You no longer have the pyramid top.")
            return
        }

        val added = access.invAdd(access.inv, COINS, payout)
        if (!added.success) {
            access.invAdd(access.inv, PYRAMID_TOP, count)
            mesbox("Simon cannot pay you right now.")
            return
        }

        val noun = if (count == 1) "pyramid top" else "$count pyramid tops"
        objbox(
            PYRAMID_TOP,
            "You hand over the $noun and Simon gives you $payout coins.",
        )
        thanksForSale()
    }

    private suspend fun Dialogue.sellUsedTop(slot: Int) {
        val removed = access.invDel(access.inv, PYRAMID_TOP, count = 1, slot = slot)
        if (!removed.success) {
            mesbox("You no longer have the pyramid top.")
            return
        }

        val payout = AgilityPyramidRewards.PYRAMID_TOP_VALUE
        val added = access.invAdd(access.inv, COINS, payout)
        if (!added.success) {
            access.invAdd(access.inv, PYRAMID_TOP)
            mesbox("Simon cannot pay you right now.")
            return
        }

        objbox(
            PYRAMID_TOP,
            "You hand over the pyramid top and Simon gives you $payout coins.",
        )
        thanksForSale()
    }

    private suspend fun Dialogue.thanksForSale() {
        chatNpc(
            happy,
            "Ripper! Thanks, mate. That's another artefact for the contract.",
        )
        chatPlayer(quiz, "Who's the contract for? I thought you worked with the museum.")
        chatNpc(
            shifty,
            "Mind your own bizzo, mate. If you find another one, you know where I'll be.",
        )
    }

    private companion object {
        const val SIMON = "npc.agility_pyramid_simon"
        const val PYRAMID_TOP = "obj.agility_pyramid_gold_pyramid"
        const val COINS = "obj.coins"

        const val SIMON_NAMED = "varbit.agility_pyramid_simon_named"
        const val SIMON_JOB = "varbit.agility_pyramid_simon_job"
    }
}
