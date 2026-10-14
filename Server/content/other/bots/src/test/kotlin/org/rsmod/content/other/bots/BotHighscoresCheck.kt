package org.rsmod.content.other.bots

import com.fasterxml.jackson.databind.ObjectMapper
import java.net.ServerSocket
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import org.rsmod.game.entity.Player
import org.rsmod.game.stat.PlayerSkillXPTable
import dev.openrune.ServerCacheManager

object BotHighscoresCheck {
    @JvmStatic
    fun main(args: Array<String>) {
        fun make(name: String, id: String, bot: Boolean, woodXp: Int, miningXp: Int) =
            HighscoreEntry(id, name, bot, false, "2026-10-14T00:00:00Z",
                HighscoreRanking.skills.associateWith {
                    val xp = when (it) {
                        "woodcutting" -> woodXp
                        "mining" -> miningXp
                        else -> 0
                    }
                    HighscoreSkill(1, xp)
                }, 23, (woodXp + miningXp).toLong())
        val a = make("A real player", "human-a", false, 1000, 0)
        val b = make("B world bot", "worldbot_1", true, 900, 4000)
        val c = make("C real player", "human-c", false, 1000, 100)
        check(HighscoreRanking.ranks(listOf(a, b, c)).map { it.id } ==
            listOf("worldbot_1", "human-c", "human-a"))
        check(HighscoreRanking.ranks(listOf(a, b, c), "woodcutting").map { it.id } ==
            listOf("human-a", "human-c", "worldbot_1"))
        check(HighscoreRanking.ranks(listOf(a, b, c), "mining").first().bot)
        check(runCatching { HighscoreRanking.ranks(listOf(a), "not-a-skill") }.isFailure)

        ServerCacheManager.init(240).close()
        val human = Player().apply {
            username = "highscore_human"
            displayName = "Highscore Human"
            for (skill in BotSkills.all) {
                val level = if (skill == "stat.woodcutting") 52 else 1
                statMap.setFineXP(skill, PlayerSkillXPTable.getFineXPFromLevel(level))
                statMap.setBaseLevel(skill, level.toByte())
            }
        }
        val bot = Player().apply {
            username = "worldbot_123"
            displayName = "Tree Chopper"
            for (skill in BotSkills.all) {
                val level = if (skill == "stat.woodcutting") 80 else 1
                statMap.setFineXP(skill, PlayerSkillXPTable.getFineXPFromLevel(level))
                statMap.setBaseLevel(skill, level.toByte())
            }
        }
        val page = BotHighscores()
        page.capture(listOf(human, bot)) { it === bot }
        val port = ServerSocket(0).use { it.localPort }
        page.startHttp(port)
        try {
            val client = HttpClient.newHttpClient()
            fun request(path: String, post: Boolean = false): HttpResponse<String> {
                val request = HttpRequest.newBuilder(URI("http://127.0.0.1:$port$path"))
                if (post) request.POST(HttpRequest.BodyPublishers.noBody())
                return client.send(request.build(), HttpResponse.BodyHandlers.ofString())
            }
            val response = request("/highscores.json")
            check(response.statusCode() == 200)
            val json = ObjectMapper().readTree(response.body())
            check(json.path("entries").size() == 2)
            val first = json.path("entries")[0]
            check(first.path("name").asText() == "Tree Chopper")
            check(first.path("bot").asBoolean())
            check(first.path("skills").path("woodcutting").path("level").asInt() == 80)
            check(first.path("totalXp").asLong() > json.path("entries")[1].path("totalXp").asLong())
            check(json.path("entries")[1].path("bot").asBoolean() == false)
            check(request("/highscores").body().contains("Hall of Fame"))
            check(request("/highscores.json", true).statusCode() == 405)
            check(request("/highscores/unknown").statusCode() == 404)

            page.departing(human, false)
            val offline = ObjectMapper().readTree(request("/highscores.json").body())
            check(offline.path("entries").any {
                it.path("name").asText() == "Highscore Human" && !it.path("online").asBoolean()
            })
            page.capture(listOf(bot)) { true }
            check(ObjectMapper().readTree(request("/highscores.json").body()).path("entries").size() == 2)
        } finally {
            page.stop()
        }
        println("BotHighscoresCheck OK: skill rankings, player/bot separation, offline entries, live HTTP")
    }
}
