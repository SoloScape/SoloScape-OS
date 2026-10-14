"""Conservative Kotlin recompilation for bodies and complete dependent packages.

Body edits retain class ownership; declaration edits rebuild complete packages and
their consumers. On uncertainty, let the caller compile the entire layer.
Existing artifacts are never modified in place.
"""
import hashlib
from pathlib import Path
import re
import struct
import zipfile


_UNSAFE = re.compile(r"\b(?:inline|reified|const|typealias|expect|actual)\b|@file:|@JvmMultifileClass|@JvmName")
_PACKAGE = re.compile(r"(?m)^\s*package\s+([\w.]+)\s*(?:$|;)")
_FUNCTION = re.compile(r"\bfun\b")


def _code_mask(source):
    """Keep code positions, but blank strings and comments (including nested comments)."""
    masked = list(source)
    i, count = 0, len(source)

    def blank(start, end):
        for position in range(start, end):
            if source[position] not in "\r\n":
                masked[position] = " "

    while i < count:
        start = i
        if source.startswith("//", i):
            i = source.find("\n", i)
            if i < 0:
                i = count
        elif source.startswith("/*", i):
            i += 2
            depth = 1
            while i < count and depth:
                if source.startswith("/*", i):
                    depth += 1
                    i += 2
                elif source.startswith("*/", i):
                    depth -= 1
                    i += 2
                else:
                    i += 1
            if depth:
                return None
        elif source.startswith('"""', i):
            i = source.find('"""', i + 3)
            if i < 0:
                return None
            i += 3
        elif source[i] in ('"', "'"):
            quote = source[i]
            i += 1
            while i < count:
                if source[i] == "\\":
                    i += 2
                elif source[i] == quote:
                    i += 1
                    break
                else:
                    i += 1
            else:
                return None
        else:
            i += 1
            continue
        blank(start, i)
    return "".join(masked)


def _matching(mask, start, opening, closing):
    depth = 0
    for i in range(start, len(mask)):
        if mask[i] == opening:
            depth += 1
        elif mask[i] == closing:
            depth -= 1
            if depth == 0:
                return i
    return None


def scaffold_hash(source):
    """Hash source with named function bodies removed, retaining declarations.

    Functions with expression bodies and unfamiliar syntax are not masked; an edit
    there produces a different hash and therefore triggers a full compile.
    """
    mask = _code_mask(source)
    if mask is None or _UNSAFE.search(mask):
        return None
    spans = []
    for match in _FUNCTION.finditer(mask):
        if spans and match.start() < spans[-1][1]:
            continue
        start = match.end()
        paren = mask.find("(", start, start + 160)
        if paren < 0 or any(c in mask[start:paren] for c in "{}=;"):
            continue
        end_paren = _matching(mask, paren, "(", ")")
        if end_paren is None:
            return None
        next_body = end_paren + 1
        while next_body < len(mask) and next_body - end_paren <= 240:
            c = mask[next_body]
            if c == "{":
                close = _matching(mask, next_body, "{", "}")
                if close is None:
                    return None
                spans.append((next_body + 1, close))
                break
            if c in "=;}":
                break
            next_body += 1
    last = 0
    result = []
    for start, end in spans:
        result.extend((source[last:start], "<function-body>"))
        last = end
    result.append(source[last:])
    return hashlib.sha256("".join(result).encode("utf-8")).hexdigest()


def source_scaffold(path):
    return scaffold_hash(path.read_text(encoding="utf-8"))


def source_package(path):
    match = _PACKAGE.search(path.read_text(encoding="utf-8"))
    return match.group(1).replace(".", "/") + "/" if match else ""


def _sourcefile(data):
    """Read a JVM class SourceFile attribute without an external classfile library."""
    try:
        if data[:4] != b"\xca\xfe\xba\xbe":
            return None
        offset = 8

        def u2():
            nonlocal offset
            value = struct.unpack_from(">H", data, offset)[0]
            offset += 2
            return value

        def u4():
            nonlocal offset
            value = struct.unpack_from(">I", data, offset)[0]
            offset += 4
            return value

        entries = [None] * u2()
        i = 1
        while i < len(entries):
            tag = data[offset]
            offset += 1
            if tag == 1:
                length = u2()
                entries[i] = data[offset:offset + length].decode("utf-8", "replace")
                offset += length
            elif tag in (3, 4, 9, 10, 11, 12, 17, 18):
                offset += 4
            elif tag in (5, 6):
                offset += 8
                i += 1
            elif tag in (7, 8, 16, 19, 20):
                offset += 2
            elif tag == 15:
                offset += 3
            else:
                return None
            i += 1
        offset += 6  # access_flags, this_class, super_class
        interfaces = u2()
        offset += 2 * interfaces

        def skip_members():
            nonlocal offset
            for _ in range(u2()):
                offset += 6  # access_flags, name_index, descriptor_index
                for _ in range(u2()):
                    offset += 2
                    size = u4()
                    offset += size

        skip_members()  # fields
        skip_members()  # methods
        for _ in range(u2()):
            name = entries[u2()]
            length = u4()
            if name == "SourceFile" and length == 2:
                return entries[struct.unpack_from(">H", data, offset)[0]]
            offset += length
    except (IndexError, KeyError, TypeError, ValueError, struct.error):
        return None
    return None


def can_patch(old_jar, changed_sources, all_sources):
    """Only attempt a partial compile when class ownership can be proved."""
    owners = {}
    for path in all_sources:
        key = (source_package(path), path.name)
        owners[key] = owners.get(key, 0) + 1
    keys = {(source_package(path), path.name) for path in changed_sources}
    if any(owners[key] != 1 for key in keys):
        return False
    try:
        found = set()
        with zipfile.ZipFile(old_jar) as existing:
            for name in existing.namelist():
                if not name.endswith(".class"):
                    continue
                key = ((name.rpartition("/")[0] + "/") if "/" in name else "",
                       _sourcefile(existing.read(name)))
                if key in keys:
                    found.add(key)
        return keys == found
    except (OSError, ValueError, zipfile.BadZipFile, KeyError):
        return False


def overlay_implementation(old_jar, patch_jar, destination, changed_sources, all_sources):
    """Merge only unchanged-name classes; False means a full compilation is needed."""
    owners = {}
    for path in all_sources:
        key = (source_package(path), path.name)
        owners[key] = owners.get(key, 0) + 1
    changed_keys = {(source_package(path), path.name) for path in changed_sources}
    if any(owners[key] != 1 for key in changed_keys):
        return False
    try:
        with zipfile.ZipFile(old_jar) as previous, zipfile.ZipFile(patch_jar) as patch:
            old_classes = {}
            for name in previous.namelist():
                if not name.endswith(".class"):
                    continue
                key = (name.rpartition("/")[0] + "/" if "/" in name else "",
                       _sourcefile(previous.read(name)))
                if key in changed_keys:
                    old_classes[name] = previous.read(name)
            new_classes = {name: patch.read(name) for name in patch.namelist()
                           if name.endswith(".class")}
            if not old_classes or set(old_classes) != set(new_classes):
                return False
            if any(((name.rpartition("/")[0] + "/") if "/" in name else "",
                    _sourcefile(data)) not in changed_keys
                   for name, data in new_classes.items()):
                return False
            with zipfile.ZipFile(destination, "w") as output:
                for entry in previous.infolist():
                    output.writestr(entry, new_classes.pop(entry.filename,
                                                           previous.read(entry.filename)))
            return True
    except (OSError, ValueError, zipfile.BadZipFile, KeyError):
        return False


def affected_packages(old_jar, changed_sources, all_sources, added_sources=()):
    """Select complete packages and their transitive source-level consumers.

    Whole packages preserve implicit same-package lookup and overload resolution.
    Explicit imports, wildcard imports and qualified references form conservative
    dependency edges. Deletions and unprovable class ownership remain full builds.
    """
    added = set(added_sources)
    sources = {}
    owners = {}
    for path in all_sources:
        source = path.read_text(encoding="utf-8")
        if re.search(r"\b(?:expect|actual)\s+(?:class|object|fun|val|var)\b", source):
            return None
        package = source_package(path)
        if re.search(r"(?m)^\s*package\b", source) and not package:
            return None
        key = (package, path.name)
        if key in owners:
            return None
        owners[key] = path
        sources[path] = (package, source)
    try:
        found = set()
        with zipfile.ZipFile(old_jar) as previous:
            for name in previous.namelist():
                if not name.endswith(".class"):
                    continue
                package = name.rpartition("/")[0] + "/" if "/" in name else ""
                key = (package, _sourcefile(previous.read(name)))
                if key in owners:
                    found.add(owners[key])
        if any(path not in found and path not in added for path in changed_sources):
            return None
    except (OSError, ValueError, zipfile.BadZipFile, KeyError):
        return None
    packages = {package.rstrip("/").replace("/", ".") for package, _ in sources.values()}
    dependencies = {package: set() for package in packages}
    for package, source in sources.values():
        own = package.rstrip("/").replace("/", ".")
        references = re.findall(r"(?<![\w])(?:[\w]+\.)+[\w]+", source)
        references += re.findall(r"\bimport\s+([\w.]+)", source)
        for reference in references:
            reference = reference.rstrip(".")
            while reference:
                if reference in packages:
                    dependencies[own].add(reference)
                    break
                reference = reference.rpartition(".")[0]
        if "" in packages and re.search(r"\bimport\s+\w+\s*(?:\n|$|as\b)", source):
            dependencies[own].add("")
    affected = {sources[path][0].rstrip("/").replace("/", ".") for path in changed_sources}
    while True:
        consumers = {package for package, deps in dependencies.items() if deps & affected}
        if consumers <= affected:
            break
        affected.update(consumers)
    selected = sorted(path for path, (package, _) in sources.items()
                      if package.rstrip("/").replace("/", ".") in affected)
    if any(re.search(r"@file:", sources[path][1]) for path in selected):
        return None
    return selected


def _protobuf_fields(data):
    """Return raw fields so unknown protobuf data is never silently rewritten."""
    def varint(offset):
        value = 0
        for shift in range(0, 70, 7):
            byte = data[offset]
            offset += 1
            value |= (byte & 127) << shift
            if not byte & 128:
                return value, offset
        raise ValueError("Invalid protobuf varint")
    offset = 0
    while offset < len(data):
        start = offset
        tag, offset = varint(offset)
        number, wire = tag >> 3, tag & 7
        if not number:
            raise ValueError("Invalid protobuf field")
        if wire == 2:
            size, offset = varint(offset)
            payload = data[offset:offset + size]
            offset += size
        elif wire == 0:
            _, offset = varint(offset)
            payload = None
        elif wire in (1, 5):
            offset += 8 if wire == 1 else 4
            payload = None
        else:
            raise ValueError("Unsupported protobuf field")
        if offset > len(data):
            raise ValueError("Truncated protobuf field")
        yield number, wire, payload, data[start:offset]


def merge_package_metadata(previous, patch, packages):
    """Replace complete package records in ordinary JVM Kotlin module mappings.

    JVM package remapping and optional annotation tables need index remapping;
    reject those formats instead of risking an invalid module descriptor.
    """
    def split(data):
        count = struct.unpack_from(">I", data)[0]
        if not 1 <= count <= 16:
            raise ValueError("Unsupported Kotlin module header")
        offset = 4 * (count + 1)
        version = struct.unpack_from(">" + "I" * count, data, 4)
        if version[:2] < (1, 4):
            raise ValueError("Unsupported Kotlin metadata version")
        offset += 4
        if offset > len(data):
            raise ValueError("Truncated Kotlin module header")
        return data[:offset], list(_protobuf_fields(data[offset:]))
    header, old_fields = split(previous)
    patch_header, new_fields = split(patch)
    if header != patch_header:
        raise ValueError("Kotlin metadata headers differ")
    def package(field):
        number, wire, payload, _ = field
        if number != 1 or wire != 2:
            raise ValueError("Unsupported Kotlin module tables")
        fields = list(_protobuf_fields(payload))
        names = [value.decode("utf-8") for n, w, value, _ in fields if n == 1 and w == 2]
        if len(names) != 1 or any(n not in (1, 2, 3, 4) for n, _, _, _ in fields):
            raise ValueError("Unsupported Kotlin package mapping")
        return names[0]
    old_tables = [field for field in old_fields if field[0] != 1]
    new_tables = [field for field in new_fields if field[0] != 1]
    if any(n not in (4, 5) or w != 2 or payload for n, w, payload, _ in old_tables + new_tables):
        raise ValueError("Unsupported Kotlin module tables")
    old_fields = [field for field in old_fields if field[0] == 1]
    new_fields = [field for field in new_fields if field[0] == 1]
    if any(package(field) not in packages for field in new_fields):
        raise ValueError("Patch contains unrelated package metadata")
    return header + b"".join(field[3] for field in old_fields if package(field) not in packages) + \
        b"".join(field[3] for field in new_fields) + b"".join(field[3] for field in old_tables)


def overlay_packages(old_jar, patch_jar, destination, selected_sources):
    """Replace all selected package classes and merge their Kotlin module records."""
    keys = {(source_package(path), path.name) for path in selected_sources}
    if len(keys) != len(selected_sources):
        return False
    packages = {package for package, _ in keys}
    fq_packages = {package.rstrip("/").replace("/", ".") for package in packages}
    try:
        with zipfile.ZipFile(old_jar) as previous, zipfile.ZipFile(patch_jar) as patch:
            replacements = {name: patch.read(name) for name in patch.namelist()
                            if name.endswith(".class")}
            if not replacements:
                return False
            for name, data in replacements.items():
                package = name.rpartition("/")[0] + "/" if "/" in name else ""
                root = name.split("$", 1)[0] + ".class"
                source = _sourcefile(data)
                if (package, source) not in keys and "$" in name and root in replacements:
                    source = _sourcefile(replacements[root])
                if (package, source) not in keys:
                    return False
            old_modules = {name for name in previous.namelist() if name.endswith(".kotlin_module")}
            new_modules = {name for name in patch.namelist() if name.endswith(".kotlin_module")}
            if len(old_modules) != 1 or old_modules != new_modules:
                return False
            module = next(iter(old_modules))
            metadata = merge_package_metadata(previous.read(module), patch.read(module), fq_packages)
            with zipfile.ZipFile(destination, "w") as output:
                for entry in previous.infolist():
                    name = entry.filename
                    if name == module:
                        output.writestr(entry, metadata)
                    elif name.endswith(".class") and (
                            name.rpartition("/")[0] + "/" if "/" in name else "") in packages:
                        continue
                    else:
                        output.writestr(entry, previous.read(name))
                for name, data in replacements.items():
                    output.writestr(name, data)
            return True
    except (OSError, ValueError, IndexError, struct.error, zipfile.BadZipFile, KeyError):
        return False


def package_dependency_jar(old_jar, destination, selected_sources):
    """Hide old selected declarations so the compiler cannot see stale overloads."""
    packages = {source_package(path) for path in selected_sources}
    fq_packages = {package.rstrip("/").replace("/", ".") for package in packages}
    try:
        with zipfile.ZipFile(old_jar) as previous:
            modules = [name for name in previous.namelist() if name.endswith(".kotlin_module")]
            if len(modules) != 1:
                return False
            module = modules[0]
            data = previous.read(module)
            count = struct.unpack_from(">I", data)[0]
            metadata = merge_package_metadata(data, data[:4 * (count + 2)], fq_packages)
            with zipfile.ZipFile(destination, "w") as output:
                for entry in previous.infolist():
                    name = entry.filename
                    if name == module:
                        output.writestr(entry, metadata)
                    elif name.endswith(".class") and (
                            name.rpartition("/")[0] + "/" if "/" in name else "") in packages:
                        continue
                    else:
                        output.writestr(entry, previous.read(name))
            return True
    except (OSError, ValueError, IndexError, struct.error, zipfile.BadZipFile, KeyError):
        return False
