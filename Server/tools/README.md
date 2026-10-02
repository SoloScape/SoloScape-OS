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

`scripts/DeleteAccount.java` lists or deletes accounts in the embedded database while
the server is running. Supply the PostgreSQL JDBC driver on the classpath:

```powershell
java -cp <postgresql-driver.jar> tools/scripts/DeleteAccount.java list
java -cp <postgresql-driver.jar> tools/scripts/DeleteAccount.java delete <account name>
```

## Content progress

```powershell
node tools/progress/content-progress.mjs
```

The generator reads `.data/osrs-dumps/dump.npc` and the reference JSON files in
`progress/`. It writes `PROGRESS.md` and the content progress block in `README.md`.
The wiki dumping tools use the same NPC dump location.
