# Woodcutting audit implementation

Branch `fix/woodcutting-audit` covers issues #35–#46. It is not a claim that all
twelve issues are ready to close. Source changes use the original server's
inventory, skill awards, timers, native scenery and personal map transforms.

| Issue | Source implementation | Remaining requirement |
| --- | --- | --- |
| #35 | Crystal charge/check/uncharge/revert, 10,000 initial charges and 20,000 cap | Native menu and save/reload gameplay verification |
| #36 | Infernal charge checks and 5,000-charge creation/recharge | Native menu and save/reload gameplay verification |
| #37 | Selected infernal axe burns 1/3 of burnable yields for half Firemaking XP | Live chopping verification |
| #38 | Handle conversion with inventory safety; ordinary anvil/hammer and crystal singing-bowl recipes | Live conversion and cancellation verification |
| #39 | Felling selection, animation, ration bonus and suppressed yields; carried/worn Forestry kit storage | Apply the persistent kit cache configuration; live verification |
| #40 | Native Sulliuscep rotation, loot tables, fossil settings, ordinary/clue nests | Live six-tree route and reward verification |
| #41 | Blisterwood harvesting and 1/10 interruption without removing the tree | Live interruption verification; some rate endpoints are interpolated |
| #42 | Natural Rosewood harvesting and 458 active-tick timer | Farmed-tree personal depletion/regrowth is not implemented |
| #43 | Natural Ironwood harvesting and 400 active-tick timer | Live depletion/respawn verification |
| #44 | Natural Camphor harvesting and 200 active-tick timer | Live depletion/respawn verification |
| #45 | Jatoba harvesting, level 40 and 92 XP | Its authored depletion rule is unverified; current fallback is documented |
| #46 | Native assets and quest transforms investigated, with a reproducible cache check | Missing native quest access/progression and post-quest resource handlers |

The source fixes prevent successful consumed yields from creating log inventory
entries or product counts, while retaining Woodcutting XP and completion events.
Infernal charges are spent only on burned logs; crystal charges are spent on
obtained products. Equal-rate axes prefer a felling axe when rations are available.
Inventory failures spend no crystal charges or rations.

## Local validation

From the repository root, run:

```powershell
python tools/build_runner.py Server
python tools/test_woodcutting.py
```

If the worktree contains cache pointer files, use `--cache-root` with the Server
directory that contains the real revision-240 cache. The check process reads that
cache; it does not start game services or load player accounts. Compiler jars,
check artifacts and logging configuration stay under ignored build directories.
Each check run has its own output directory to prevent concurrent runs from
overwriting the executable jar.

The standalone checks execute inventory mutations, harvest awards, native axe
selection, successful Sulliuscep and Blisterwood handlers, rejected interactions,
real transformation tables, source map placements and loot boundaries. They are
separate from the historical integration tests, which still depend on an older
cache/testing API. Passing these checks is not evidence of authenticated client
play or full skill parity.

## Cache deployment and open dependencies

Native `inv.forestry_kit` is temporary in older packed revision-240 caches.
The raw-cache override in `.data/raw-cache/server/inv.toml` changes it to
persistent, always stacking and unprotected, with 28 storage slots. Until that
overlay is rebuilt into the deployed cache, `Inventory.create` applies the
same definition, including a minimum 28-slot capacity, when creating this
specific inventory. This covers both player deposits and the account inventory
restoration path on login, so stored rations remain persistent
without requiring a separate cache rebuild. The deposit handler still refuses
any explicitly temporary storage instead of silently losing items on logout.
Rebuilding the cache with the overlay is recommended for consistency.

Keep #42 open for the missing farmed-tree lifecycle and #46 open for its quest
dependency. Those need their own implementations and proof. Do not replace a
personal farming parent with a shared world stump or add a shortcut teleport to
claim completion.

See [axe details](woodcutting-audit-axes.md),
[special tree rates and limitations](../content/skills/woodcutting/SPECIAL_TREES.md)
and [quest-access evidence](woodcutting-audit-access.md).
