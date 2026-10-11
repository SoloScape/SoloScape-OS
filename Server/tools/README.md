# Developer tools

Run these commands from the repository root.

| Directory | Purpose |
| --- | --- |
| `scripts/` | Standalone repository maintenance and account utilities |
| `progress/` | Offline content progress generator and committed wiki reference data |
| `combat-anims/` | NPC combat animation resolution and reference extraction |
| [osrs-mcp/](osrs-mcp/README.md) | Cache and wiki MCP server |
| `wiki-dumping/` | Wiki importers for drops, shops, spawns and Slayer data |

## Maintenance scripts

```powershell
python tools/scripts/check-max-content.py
python tools/scripts/fix_gameval_conflicts.py --help
```

`check-max-content.py` validates gameval IDs, integration remaps and handler ownership.
`fix_gameval_conflicts.py` detects and rewrites custom IDs that collide with reserved IDs;
review its options before running it.

`scripts/DeleteAccount.java` lists or deletes accounts in the SQLite database. Stop the server before deleting an account. Supply the
SQLite JDBC driver and its SLF4J dependency on the classpath (from the server runtime libraries):

```powershell
java -cp "<sqlite-driver.jar>;<slf4j-api.jar>" tools/scripts/DeleteAccount.java list
java -cp "<sqlite-driver.jar>;<slf4j-api.jar>" tools/scripts/DeleteAccount.java delete <account name>
```

## Content progress

Validate the compiled server's desktop/mobile orb selection after a server build:

```powershell
java -cp "build/direct/lib/*" tools/scripts/VerifyOrbInterfaces.java
```

```powershell
node tools/progress/content-progress.mjs
```

The generator reads `.data/osrs-dumps/dump.npc` and the reference JSON files in
`progress/`. It writes `PROGRESS.md` and the content progress block in `README.md`.
The wiki dumping tools use the same NPC dump location.
