


<h1 align="center">
  <img width="333" height="82" alt="Asset 5" src="https://github.com/user-attachments/assets/0a892a2f-9ad6-43f9-affa-2e9a865a1d70" />
</h1>

<p align="center">
  <a href="https://github.com/OpenRune/OpenRune-Server/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/github/license/OpenRune/OpenRune-Server?style=for-the-badge&color=6f42c1"/></a>
  <a href="https://oldschool.runescape.wiki/w/Update:Leagues_V:_Raging_Echos_Rewards_Are_Here"><img alt="Revision 240.2" src="https://img.shields.io/badge/Revision-240.2-blueviolet?style=for-the-badge"/></a>
  <a href="https://trello.com/b/A0LefFDs/later"><img alt="Roadmap" src="https://img.shields.io/badge/Trello-Roadmap-026AA7?style=for-the-badge&logo=trello&logoColor=white"/></a>
  <a href="https://github.com/Mark7625/OpenRune-Server/"><img alt="Lines of Code" src="https://img.shields.io/endpoint?url=https%3A%2F%2Fghloc.vercel.app%2Fapi%2FOpenRune%2FOpenRune-Server%2Fbadge%3Fformat%3Dhuman&style=for-the-badge&color=teal"/></a>
  <a href="https://discord.gg/v2qcXzBCwf">
    <img alt="Discord" src="https://img.shields.io/discord/1445802914156249241?label=Discord&logo=discord&logoColor=white&style=for-the-badge&color=5865F2"/>
  </a>
</p>

<p align="center">OpenRune Server is a modular fork of RSMod/Alter that powers an OSRS-compatible server with a plug-and-play plugin ecosystem focused on extensibility and ease of use.</p>

## 🤔 What is OpenRune Server?
OpenRune Server builds on the foundation laid by [RSMod](https://github.com/rsmod/rsmod) to deliver a flexible, developer-friendly OSRS game server. Its modular architecture lets you ship new gameplay features as standalone plugins without touching core engine code. Server owners with little to no programming experience can rely on contributors to drop prebuilt plugins into the `content` module and have them load automatically at runtime.

## 🚀 Why Choose OpenRune Server?
### 🔧 Modular by design
OpenRune Server loads plugins dynamically, making it simple to extend gameplay, content, or systems while keeping the base server clean.

### 👥 Community-driven
Active maintainers review contributions, publish roadmap updates, and support users through Discord and Trello.

### 📏 OSRS-compatible
OpenRune Server adheres to OSRS protocols, giving you the freedom to connect any compliant client and customize server-side behavior.


<!-- content-progress:start -->

## 📊 Content progress

Skills **23/23** · Bosses **38/169** · Raids **0/4** · Minigames **0/51**

Full breakdown in **[PROGRESS.md](PROGRESS.md)**, including every content module and
the bosses that already have drop tables and only need the encounter writing.

<!-- content-progress:end -->
## 🛠️ Getting Started



1. **Clone the repository**
   - `File → New → Project from Version Control` in IntelliJ, then paste `https://github.com/OpenRune/OpenRune-Server.git`.
   - Alternatively, clone via Git CLI and open the project manually.

2. **Install dependencies**
   - Ensure you have [IntelliJ IDEA](https://www.jetbrains.com/idea/download/#section=windows).
   - Set the project SDK to Java 21: `File → Project Structure → SDK`. (The `:tools:osrs-mcp` module is built with Java 17 via Gradle’s JVM toolchain; other modules target Java 21.)
3. **Gradle bootstrap**
   - Open the Gradle tool window.
   - Run `OpenRune Server → Tasks → installation → install`.
   - From a terminal in the server directory, use `./gradlew install` (`.\gradlew.bat install` on Windows). Run this before the first `build`: it downloads the cache and generates `api/generated/src`. The module's `build.gradle.kts` is checked in; its generated sources are ignored.
   - When the task completes, run `OpenRune Server → Tasks → application → run`.

4. **Verify startup**
   - A successful boot prints `OpenRune Server Successfully initialized` in the terminal.
   - If you only see `OpenRune Server Loaded up in x ms.` you likely skipped a step.

Setup screenshots are available in [docs/images/](docs/images/).

## Project structure

| Directory | Contents |
| --- | --- |
| `content/` | Gameplay plugins, grouped by area, skill, boss, interface and other categories |
| `api/` | Domain APIs used by gameplay plugins |
| `engine/` | Game loop, events, routing and plugin framework |
| `server/` | Application entry point, installation, logging and services |
| `or-cache/` | Cache builder and inspection tools |
| `build-logic/`, `gradle/` | Shared build conventions, dependency versions and Gradle wrapper |
| `example-plugin/` | Source template for external plugins |
| `plugins/` | Installed external plugin jars and their local enabled state |
| `.data/` | Gamevals, cache inputs, reference dumps and local runtime data |
| [tools/](tools/README.md) | Developer utilities and maintenance scripts |
| [docs/](docs/README.md) | Development guides, verification checklists and integration notes |

Generated `build/`, `.gradle/` and `.kotlin/` directories are disposable and recreated by
Gradle. Keep `.data/`, installed plugins and local configuration when cleaning a checkout.

## Windows launchers

On Windows, `build.bat` also prepares the standalone server used by `run.bat`.
The first launch prepares it automatically if it is missing; subsequent launches
run directly without Gradle or a Kotlin compiler. Run `build.bat` again after source
changes, and rebuild the cache separately when changing pack resources or gamevals.

The server starts with a 256 MB heap and allows it to grow to 2 GB. Total process
memory includes additional native and JVM allocations. To increase the heap for
a larger world, set `SOLOSCAPE_SERVER_HEAP` (for example, `set SOLOSCAPE_SERVER_HEAP=4g`)
before running `run.bat`. Additional JVM arguments can be supplied through
`SOLOSCAPE_SERVER_JAVA_OPTS`. Source builds use a temporary Gradle process with
the Kotlin compiler inside it, a 2 GB heap limit, and at most two workers.

## 🎮 Client Setup

> [!TIP]
> Use [RSProx](https://github.com/blurite/rsprox/releases) to connect; it is actively maintained by trusted developers and supports the required OSRS protocols.

For Windows:
1. Press `⊞ + R` and enter `%USERPROFILE%`.
2. Locate (or create) the `.rsprox` directory.
3. Create `proxy-targets.yaml` with:

```yaml
config:
  - id: 1
    name: OpenRune Server
    jav_config_url: https://client.blurite.io/jav_local_240.ws
    varp_count: 15000
    revision: 240.2
    modulus: YOUR_MODULUS_KEY_HERE
```

Find the modulus in the project root `.data/client.key`, copy it exactly, and replace `YOUR_MODULUS_KEY_HERE`. If `.rsprox` does not exist, launching RSProx once will create it.
Note: RSprox for Private Servers only works currently on Windows and Linux, NOT MacOS!

> [!WARNING]
> And stay away from client's like Devious, as they have been caught adding Account Stealer into their client.
## 🤖 AI testing (MCP)

The [OpenRune-Developer-Tools](https://github.com/OpenRune/OpenRune-Developer-Tools) client plugin runs a local MCP server (`http://127.0.0.1:7780/mcp`) so AI agents like Claude can test server content in a live client: walk NPC dialogue trees, screenshot and diff interfaces, read varbits/clientscript history, interact with NPCs/objects/items and wait on game conditions. A live dashboard at `http://127.0.0.1:7780/` shows every call the AI makes, with results and screenshots. Setup, example prompts and verification flows are documented in [AGENTS.md](AGENTS.md).

## 📦 Release builds

CI can produce a self-contained `openrune-server-release.zip` with `server.jar`, `game.yml`, and compiled `.data/`. Pushes to `production` publish automatically; other branches can be built manually from **Actions → Release Server**.

See [docs/RELEASE_CI.md](docs/RELEASE_CI.md) for what the workflow does, how to run it manually, and how to build from `production` vs `main`/feature branches.

## 🗺️ Project Planning
- Public roadmap and task board: [OpenRune Server Trello](https://trello.com/b/A0LefFDs/later).
- Trello write access and contributor listing are reserved for active maintainers—contact Chris via Discord with a short summary of your work if you need access.

## 💬 Bug Reports & Support
- Open an issue on [GitHub](https://github.com/OpenRune/OpenRune-Server/issues) with reproduction details.
- Reach the team directly in the [Discord server](https://discord.gg/HAwN6N8F).

## 🙏 Acknowledgments
- Cache management powered by [OpenRune-FileStore](https://github.com/OpenRune/OpenRune-FileStore).
- Original Base [RsMod2](https://github.com/rsmod/rsmod).

## 💙 Contributors
<a href="https://github.com/OpenRune/OpenRune-Server/graphs/contributors" target="_blank"><img src="https://contrib.rocks/image?repo=OpenRune/OpenRune-Server&columns=18" alt="Avatars of all contributors"></a>
