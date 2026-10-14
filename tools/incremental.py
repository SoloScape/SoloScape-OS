"""Conservative source-level Kotlin recompilation for implementation-only edits.

A partial CLI compilation is safe only when the source's declarations and generated
class names stay identical. On any uncertainty, return False and let the caller
compile the entire layer. Existing artifacts are never modified in place.
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
