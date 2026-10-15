# Bot tick scheduling

World bots share the server's 600 ms game thread. Normal decisions use a stable
three-tick phase based on bot identity, including after retries. Initial skilling
and progressive task planning runs on these scheduled decisions rather than in
the population spawn loop.

Bot routing admits normal decisions until it has spent 60 ms or performed 256
native route searches in a cycle. This is a soft admission limit: an in-flight
road search completes normally. Resource selection also stops after 32 native
searches per selection, and resumes with rotated resource candidates. Deferred
selection does not count as an unreachable resource or advance stall recovery.
The next cycle starts after the last admitted bot, so overloaded batches rotate
fairly. NPC escape, grave recovery and PvP handling retain priority.

Coordinate reachability results are reused within a decision, then cleared.
Occupied player coordinates are collected lazily once per bot cycle. Destination
reservations update the shared occupancy counts immediately, and excluding a bot
never hides another player or reservation on the same tile. Spawn placement
refreshes the snapshot as the population changes.

Failed resource and walking attempts back off for 10, 20, 40, 80, then 100 ticks,
with up to nine ticks of jitter and alignment to the bot's decision phase. Success
resets the relevant failure count. Native routing and interactions remain in use.

Run `python tools/test_bots.py` from the repository root. An isolated build can be
checked with `--runtime <absolute-path-to-runtime-lib>`.

Validate performance after rebuilding and restarting the server at the same bot
population. Compare overrun frequency and maximum processing time, and verify
walking, gathering, banking, blocked-resource recovery and NPC escapes. Passing
the offline checks does not establish a live tick-time improvement.
