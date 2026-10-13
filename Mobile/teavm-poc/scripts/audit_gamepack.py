"""Inspect locally owned Java class dependencies without copying the gamepack.

Usage: python scripts/audit_gamepack.py path/to/injected-client.oprs
Only aggregate class counts are printed. Never include the gamepack in git.
"""
import sys
import zipfile
from pathlib import Path

PREFIXES = {
    "AWT": b"java/awt/",
    "Swing": b"javax/swing/",
    "JVM System API": b"java/lang/System",
    "reflection": b"java/lang/reflect/",
    "classloaders": b"java/lang/ClassLoader",
    "desktop sockets": b"java/net/",
    "threads": b"java/lang/Thread",
}
if len(sys.argv) != 2:
    sys.exit("Usage: py -3 scripts/audit_gamepack.py path/to/injected-client.oprs")
path = Path(sys.argv[1])
if path.suffix not in {".oprs", ".jar", ".zip"}:
    sys.exit("Expected a local .oprs or .jar archive.")
with zipfile.ZipFile(path) as jar:
    classes = [item for item in jar.infolist() if item.filename.endswith(".class")]
    counts = {key: 0 for key in PREFIXES}
    for item in classes:
        if item.file_size > 5_000_000:
            sys.exit("Unexpected oversized class in local gamepack")
        blob = jar.read(item)
        for key, marker in PREFIXES.items():
            if marker in blob:
                counts[key] += 1
print("Local OpenOSRS gamepack dependency summary (no class bytes saved)")
print("Classes:", len(classes))
for key, count in counts.items():
    print(f"{key}: {count} classes reference a matching constant")
print("Note: byte-marker counts are conservative indicators, not a compile report.")
