package org.rsmod.content.areas.tutorial

import jakarta.inject.Inject
import org.rsmod.content.quest.manager.ItemRewardDisplay
import org.rsmod.content.quest.manager.Quest
import org.rsmod.content.quest.manager.QuestJournalContent
import org.rsmod.content.quest.manager.QuestJournalRegistry
import org.rsmod.content.quest.manager.rewards
import org.rsmod.plugin.scripts.PluginScript
import org.rsmod.plugin.scripts.ScriptContext

public class TutorialQuestScript @Inject constructor(private val progress: TutorialProgress) :
    PluginScript() {
    public val quest: Quest = Quest.register(
        "quest_learningtheropes",
        "varp.tutorial",
        ItemRewardDisplay("obj.airrune"),
        rewards { scroll("Access to the mainland", "Lumbridge Home Teleport") },
        varpAuthoritative = true,
        visibleInJournal = { it.tutorialProgress >= TutorialStage.JOURNAL.code },
    )

    override fun ScriptContext.startup() {
        QuestJournalRegistry.register(quest, QuestJournalContent(
            subTitle = { "talking to the Quest Guide on Tutorial Island." },
            questLog = { progress.journalLines(it.player).joinToString("\n") },
            completedLog = { progress.journalLines(it.player).joinToString("\n") },
        ))
    }
}
