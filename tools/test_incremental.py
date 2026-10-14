"""Conservative Kotlin source-level rebuild tests; no compiler installation required."""
from pathlib import Path
import struct
import tempfile
import unittest
import zipfile

import incremental


def fake_class(source, value=b""):
    """Minimal class-file envelope with a JVM SourceFile attribute."""
    def utf8(string):
        data = string.encode("utf-8")
        return b"\x01" + struct.pack(">H", len(data)) + data

    return (
        b"\xca\xfe\xba\xbe" + struct.pack(">HHH", 0, 61, 3)
        + utf8("SourceFile") + utf8(source)
        + struct.pack(">HHHHHH", 0, 0, 0, 0, 0, 0)
        + struct.pack(">HHIH", 1, 1, 2, 2) + value
    )


class IncrementalSourceTests(unittest.TestCase):
    def test_body_only_edit_keeps_scaffold(self):
        before = 'package sample\nclass A { fun run(): Int { return 1 } }\n'
        after = before.replace("return 1", "return 2")
        self.assertEqual(incremental.scaffold_hash(before),
                         incremental.scaffold_hash(after))

    def test_signature_edit_invalidates_scaffold(self):
        before = 'package sample\nfun run(): Int { return 1 }\n'
        after = before.replace("Int", "Long")
        self.assertNotEqual(incremental.scaffold_hash(before),
                            incremental.scaffold_hash(after))

    def test_inline_and_constants_disable_fast_path(self):
        self.assertIsNone(incremental.scaffold_hash("inline fun run() { println(1) }"))
        self.assertIsNone(incremental.scaffold_hash("const val key = 1"))

    def test_strings_comments_and_initializers_remain_safe(self):
        before = 'fun run() { /* { /* nested */ } */ println("{") }'
        after = before.replace('println("{")', 'println("}")')
        self.assertEqual(incremental.scaffold_hash(before),
                         incremental.scaffold_hash(after))
        self.assertNotEqual(incremental.scaffold_hash('val s = "before"'),
                            incremental.scaffold_hash('val s = "after"'))

    def test_patch_replaces_only_owned_classes(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            changed = root / "Main.kt"
            other = root / "Other.kt"
            changed.write_text("package sample\nfun main() { println(1) }")
            other.write_text("package sample\nfun other() {}")
            original, partial, merged = (root / name for name in ("old.jar", "delta.jar", "new.jar"))
            with zipfile.ZipFile(original, "w") as output:
                output.writestr("sample/MainKt.class", fake_class("Main.kt", b"old"))
                output.writestr("sample/OtherKt.class", fake_class("Other.kt", b"other"))
                output.writestr("META-INF/Server.kotlin_module", b"metadata")
            with zipfile.ZipFile(partial, "w") as output:
                output.writestr("sample/MainKt.class", fake_class("Main.kt", b"new"))
            self.assertTrue(incremental.can_patch(original, [changed], [changed, other]))
            self.assertTrue(incremental.overlay_implementation(
                original, partial, merged, [changed], [changed, other]))
            with zipfile.ZipFile(merged) as output:
                self.assertTrue(output.read("sample/MainKt.class").endswith(b"new"))
                self.assertTrue(output.read("sample/OtherKt.class").endswith(b"other"))
                self.assertEqual(output.read("META-INF/Server.kotlin_module"), b"metadata")

    def test_duplicate_source_ownership_disables_fast_path(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            one, two = root / "A.kt", root / "other/A.kt"
            two.parent.mkdir()
            one.write_text("package sample\nfun a() {}")
            two.write_text("package sample\nfun b() {}")
            with zipfile.ZipFile(root / "old.jar", "w") as output:
                output.writestr("sample/AKt.class", fake_class("A.kt"))
            self.assertFalse(incremental.can_patch(root / "old.jar", [one], [one, two]))

    def test_generated_class_name_change_rejects_delta(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "A.kt"
            source.write_text("fun a() {}")
            with zipfile.ZipFile(root / "old.jar", "w") as output:
                output.writestr("AKt.class", fake_class("A.kt"))
            with zipfile.ZipFile(root / "delta.jar", "w") as output:
                output.writestr("AnotherKt.class", fake_class("A.kt"))
            self.assertFalse(incremental.overlay_implementation(
                root / "old.jar", root / "delta.jar", root / "new.jar",
                [source], [source]))


if __name__ == "__main__":
    unittest.main()
