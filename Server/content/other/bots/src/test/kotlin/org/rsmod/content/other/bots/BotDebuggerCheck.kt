package org.rsmod.content.other.bots

import com.fasterxml.jackson.databind.ObjectMapper
import java.net.ServerSocket
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.file.Files

object BotDebuggerCheck {
    @JvmStatic
    fun main(args: Array<String>) {
        val output = Files.createTempDirectory("bot-debug-check-").resolve("snapshot.json")
        val debugger = BotDebugger(output)
        val mapper = ObjectMapper()
        fun sample(position: String = "3100,3250,0", xp: Long = 0, status: String = "waiting") =
            mapOf<String, Any?>("name" to "test \"bot\"", "position" to position,
                "totalXp" to xp, "status" to status, "task" to "Oak", "phase" to "Working",
                "returnReason" to null, "selection" to "matched=0")
        check(debugger.snapshot(0, listOf(sample())) == null)
        debugger.start()
        try {
            val initial = mapper.readTree(checkNotNull(debugger.snapshot(0, listOf(sample()))))
            check(initial["bots"][0]["name"].asText() == "test \"bot\"")
            check(debugger.snapshot(1, listOf(sample())) == null)
            val idle = mapper.readTree(checkNotNull(debugger.snapshot(10, listOf(sample()))))
            check(idle["bots"][0]["idleSeconds"].asDouble() == 6.0)
            val progress = mapper.readTree(checkNotNull(debugger.snapshot(20, listOf(sample(xp = 10)))))
            check(progress["bots"][0]["idleSeconds"].asDouble() == 0.0)
            val moved = mapper.readTree(checkNotNull(debugger.snapshot(30, listOf(sample("3101,3250,0", 10)))))
            check(moved["bots"][0]["idleSeconds"].asDouble() == 0.0)
            var json = ""
            for (cycle in 40..400 step 10) {
                json = checkNotNull(debugger.snapshot(cycle, listOf(sample(status = "state $cycle"))))
            }
            check(mapper.readTree(json)["bots"][0]["history"].size() == 16)
            val empty = checkNotNull(debugger.snapshot(410, emptyList()))
            check(mapper.readTree(empty)["bots"].size() == 0)
            val deadline = System.nanoTime() + 5_000_000_000L
            while ((!Files.exists(output) || Files.readString(output) != empty) && System.nanoTime() < deadline) {
                Thread.sleep(50)
            }
            check(Files.readString(output) == empty) { "Latest immutable snapshot was not exported" }
            checkHttp(json)
        } finally { debugger.stop() }
        check(debugger.snapshot(420, listOf(sample())) == null)
        println("Bot debugger checks passed: idle/progress tracking, bounded history, JSON escaping, atomic export and read-only localhost endpoints.")
    }

    private fun checkHttp(json: String) {
        val port = ServerSocket(0).use { it.localPort }
        val map = BotDebugMap()
        map.start(port)
        try {
            map.diagnostics(json)
            val client = HttpClient.newBuilder().connectTimeout(java.time.Duration.ofSeconds(2)).build()
            fun request(path: String, post: Boolean = false): HttpResponse<String> {
                val builder = HttpRequest.newBuilder(URI("http://127.0.0.1:$port$path"))
                    .timeout(java.time.Duration.ofSeconds(3))
                if (post) builder.POST(HttpRequest.BodyPublishers.noBody())
                return client.send(builder.build(), HttpResponse.BodyHandlers.ofString())
            }
            check(request("/diagnostics.json").body() == json)
            check(request("/debug").body().contains("Bot debugger"))
            check(request("/diagnostics.json", true).statusCode() == 405)
            check(request("/debug", true).statusCode() == 405)
            check(request("/bots.json").body() == "[]")
        } finally { map.stop() }
    }
}
