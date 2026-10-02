"""Check the merged content's shared identifiers and single handler ownership."""
from collections import defaultdict
from pathlib import Path
import json
import re
import tomllib

ROOT = Path(__file__).resolve().parents[2]
mappings = defaultdict(lambda: defaultdict(set))
symbols = defaultdict(lambda: defaultdict(set))

for source in (ROOT / '.data/gamevals').glob('*.rscm'):
    for line in source.read_text(encoding='utf-8-sig').splitlines():
        if '=' not in line:
            continue
        name, value = line.split('=', 1)
        if value.lstrip('-').isdigit():
            mappings[source.stem][int(value)].add(name)
            symbols[source.stem][name].add(int(value))

for directory in ('content', 'api'):
    for source in (ROOT / directory).glob('**/gamevals.toml'):
        if any(part in ('build', 'out', 'target') for part in source.parts):
            continue
        data = tomllib.loads(source.read_text(encoding='utf-8-sig'))
        for namespace, values in data.get('gamevals', {}).items():
            for name, value in values.items():
                if isinstance(value, int) and value >= 0:
                    mappings[namespace][value].add(name)
                    symbols[namespace][name].add(value)

errors = []
for namespace, values in mappings.items():
    for value, names in values.items():
        if value >= 0 and len(names) > 1:
            errors.append(f'{namespace} ID {value} is shared by {sorted(names)}')
for namespace, names in symbols.items():
    for name, values in names.items():
        if len(values) > 1:
            errors.append(f'{namespace}.{name} has inconsistent IDs: {sorted(values)}')

for entry in json.loads((ROOT / 'docs/max-content-id-remaps.json').read_text()):
    actual = symbols[entry['namespace']][entry['name']]
    if actual != {entry['new']}:
        errors.append(f"Remap missing for {entry['namespace']}.{entry['name']}: {actual}")

for source in (ROOT / 'content').rglob('*.kt'):
    if 'build' in source.parts:
        continue
    text = source.read_text(encoding='utf-8-sig')
    if re.search(r'^(<<<<<<<|=======|>>>>>>>)', text, re.M):
        errors.append(f'Unresolved conflict in {source.relative_to(ROOT)}')

retired = [
    'content/skills/agility/src/main/kotlin/org/rsmod/content/skills/agility/rooftop/RooftopScript.kt',
    'content/skills/thieving/src/main/kotlin/org/rsmod/content/skills/thieving/pickpocket/PickpocketScript.kt',
    'content/skills/thieving/src/main/kotlin/org/rsmod/content/skills/thieving/stalls/StallScript.kt',
]
for path in retired:
    if (ROOT / path).exists():
        errors.append(f'Duplicate retired handler remains: {path}')

if errors:
    raise SystemExit('\n'.join(errors))
print('PASS: gameval IDs and remaps are consistent; no conflict markers or retired duplicate handlers.')
