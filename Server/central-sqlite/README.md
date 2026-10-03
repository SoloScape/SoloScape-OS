# SQLite Central

Adapted from OpenRune/OpenRune-Central-Server, commit `13a39b81fa668e10b7f6a12fd45545597e12119d` (version 2.0.1).
Upstream: https://github.com/OpenRune/OpenRune-Central-Server
Upstream Maven metadata identifies the license as Apache-2.0.

The bundled composite build replaces `dev.or2:central-common` and
`dev.or2:openrune-central`. The world-link protocol remains the published 2.0.1 library.
Local changes provide SQLite schema, SQL, JDBC bindings, and a transactional
notification outbox in place of PostgreSQL LISTEN/NOTIFY.
