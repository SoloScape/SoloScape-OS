> Historical build instructions: the build system and its workflows have been removed. Commands and build-file examples below require a separately configured build system.

# SQLite storage

Run `gradlew run` from `Server/`. The game and bundled Central create and share
`.data/soloscape.db`. No PostgreSQL installation or process is required.
This switch starts fresh: existing `.data/postgres` files are left intact and are
not imported or deleted. Accounts are created through the normal login flow.

```yaml
central:
  same-instance: true
  host: "127.0.0.1"
  link-port: 9091
  sqlite:
    jdbc-url: "jdbc:sqlite:.data/soloscape.db"
    pool-size: 4
```

`OPENRUNE_JDBC_URL` overrides the SQLite path for both services. Use a persistent
file, not an in-memory database. Remote Central deployments must also use the
SQLite adaptation; each world must share the same database file with Central.
Independent database files do not synchronize accounts or player saves.

Foreign keys are enabled on every connection. WAL permits simultaneous readers;
writes remain serialized, with a 10-second busy timeout. Timestamps are stored as
UTC epoch milliseconds and UUIDs/JSON as text. Transactional triggers enqueue
notifications for live names, mutes, punishments, Discord links, reboots,
broadcasts, and the world list. Central polls every 200 ms, acknowledging each
notification after handling it. Delivery retries can replay an event.

To back up, stop the server and copy the database file. If copying while running,
use SQLite's backup API; copying only the `.db` file can omit WAL changes.

To roll back, stop the SQLite server, restore the prior code and `game.yml`
Postgres configuration, then start with the retained `.data/postgres` directory.
New SQLite accounts and progress will not appear in the old database.

The SQLite Central source is bundled in `central-sqlite/` because the published
Central 2.0.1 library contains PostgreSQL-specific SQL and notifications.
