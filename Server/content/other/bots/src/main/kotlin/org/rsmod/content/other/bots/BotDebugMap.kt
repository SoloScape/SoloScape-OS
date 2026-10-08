package org.rsmod.content.other.bots

import com.github.michaelbull.logging.InlineLogger
import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import java.nio.charset.StandardCharsets
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

internal data class BotDebugPoint(
    val x: Int,
    val y: Int,
    val plane: Int,
    val tier: BotPvpRiskTier?,
)

/**
 * Tiny localhost-only live map for visually checking PvP bot distribution.
 *
 * The game thread publishes immutable JSON snapshots. The HTTP thread never reads Player or bot
 * state directly, which keeps the debug page independent of the game loop's mutable collections.
 */
internal class BotDebugMap {
    private val logger = InlineLogger()

    @Volatile
    private var snapshot: String = "[]"

    private var server: HttpServer? = null
    private var executor: ExecutorService? = null

    fun start(port: Int) {
        if (server != null) return
        try {
            val http = HttpServer.create(InetSocketAddress("127.0.0.1", port), 0)
            val worker = Executors.newSingleThreadExecutor { task ->
                Thread(task, "bot-debug-map").apply { isDaemon = true }
            }
            http.executor = worker
            http.createContext("/bots.json") { exchange ->
                if (exchange.requestMethod != "GET") {
                    send(exchange, 405, "text/plain", "Method not allowed")
                } else {
                    send(exchange, 200, "application/json", snapshot)
                }
            }
            http.createContext("/") { exchange ->
                if (exchange.requestMethod != "GET") {
                    send(exchange, 405, "text/plain", "Method not allowed")
                } else if (exchange.requestURI.path != "/") {
                    send(exchange, 404, "text/plain", "Not found")
                } else {
                    send(exchange, 200, "text/html", PAGE)
                }
            }
            executor = worker
            server = http
            http.start()
            logger.info { "PvP bot debug map listening on http://127.0.0.1:$port/" }
        } catch (error: Exception) {
            executor?.shutdownNow()
            executor = null
            server = null
            logger.error(error) { "Could not start PvP bot debug map on port $port" }
        }
    }

    fun update(points: List<BotDebugPoint>) {
        snapshot = points.joinToString(prefix = "[", postfix = "]") { point ->
            val tier = point.tier?.name ?: "Unknown"
            """{"x":${point.x},"y":${point.y},"plane":${point.plane},"tier":"$tier"}"""
        }
    }

    fun stop() {
        server?.stop(0)
        server = null
        executor?.shutdownNow()
        executor = null
        snapshot = "[]"
    }

    private fun send(exchange: HttpExchange, status: Int, contentType: String, body: String) {
        val bytes = body.toByteArray(StandardCharsets.UTF_8)
        exchange.responseHeaders.set("Content-Type", "$contentType; charset=utf-8")
        exchange.responseHeaders.set("Cache-Control", "no-store, max-age=0")
        exchange.sendResponseHeaders(status, bytes.size.toLong())
        exchange.responseBody.use { it.write(bytes) }
    }

    private companion object {
        val PAGE: String = """
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SoloScape PvP Bot Map</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
html,body,#map{height:100%;margin:0;background:#111}
#status{position:absolute;z-index:1000;top:10px;left:50px;background:rgba(0,0,0,.78);color:#fff;
padding:7px 10px;border-radius:4px;font:13px sans-serif;pointer-events:none}
#legend{position:absolute;z-index:1000;bottom:18px;left:10px;background:rgba(0,0,0,.78);color:#fff;
padding:8px 10px;border-radius:4px;font:12px sans-serif;line-height:19px}
.swatch{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px}
</style>
</head>
<body>
<div id="map"></div>
<div id="status">Loading PvP bots…</div>
<div id="legend">
<div><span class="swatch" style="background:#58ff72"></span>LOW</div>
<div><span class="swatch" style="background:#ffe45e"></span>AVERAGE</div>
<div><span class="swatch" style="background:#ff9a42"></span>RISKER</div>
<div><span class="swatch" style="background:#ff4d5a"></span>MAX</div>
<div><span class="swatch" style="background:#fff"></span>UNKNOWN</div>
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const MAX_ZOOM = 11;
const MAP_HEIGHT_MAX_ZOOM_PX = 364544;
const RS_TILE_PX = 32;
const RS_OFFSET_X = 960;
const RS_OFFSET_Y = 6208;

const map = L.map('map', {renderer:L.canvas()});
map.setView([-79, -137], 7);

const plane = 0;
L.tileLayer(
  'https://raw.githubusercontent.com/Explv/osrs_map_tiles/master/0/{z}/{x}/{y}.png',
  {minZoom:4,maxZoom:11,noWrap:true,tms:true,attribution:'OSRS map data'}
).addTo(map);

const dots = L.layerGroup().addTo(map);
const colors = {
  Low:'#58ff72',
  Average:'#ffe45e',
  Risker:'#ff9a42',
  Max:'#ff4d5a',
  Unknown:'#ffffff'
};

function worldToLatLng(x, y) {
  const px = ((x - RS_OFFSET_X) * RS_TILE_PX) + (RS_TILE_PX / 4);
  const py = MAP_HEIGHT_MAX_ZOOM_PX - ((y - RS_OFFSET_Y) * RS_TILE_PX);
  return map.unproject(L.point(px, py), MAX_ZOOM);
}

async function refresh() {
  try {
    const response = await fetch('/bots.json', {cache:'no-store'});
    const bots = await response.json();
    dots.clearLayers();
    let visible = 0;
    for (const bot of bots) {
      if (bot.plane !== plane) continue;
      visible++;
      const color = colors[bot.tier] || colors.Unknown;
      L.circleMarker(worldToLatLng(bot.x, bot.y), {
        radius:4,
        stroke:true,
        color:'#000',
        weight:1,
        fillColor:color,
        fillOpacity:1
      }).addTo(dots);
    }
    document.getElementById('status').textContent =
      visible + ' PvP bots on surface · ' + bots.length + ' total';
  } catch (_) {
    document.getElementById('status').textContent = 'Waiting for server snapshot…';
  }
}
refresh();
setInterval(refresh, 1000);
</script>
</body>
</html>
""".trimIndent()
    }
}
