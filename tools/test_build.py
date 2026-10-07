"""Focused checks for build cache invalidation and preservation of runnable output."""
import contextlib
import io
from pathlib import Path
import shlex
import tempfile
import unittest
from unittest.mock import patch
import zipfile

import build


class BuildCacheTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        root = Path(self.temporary.name)
        self.root_patch = patch.object(build, "ROOT", root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)
        self.home = root / "jdk"
        self.home.mkdir()
        (self.home / "release").write_text("JAVA_VERSION=21")
        self.compiler = root / "compiler"
        self.compiler.mkdir()
        (self.compiler / "kotlin-compiler.jar").write_bytes(b"compiler")
        self.module = root / "Client/gui/proxy-tool"
        self.source = self.module / "src/main/kotlin/Main.kt"
        self.source.parent.mkdir(parents=True)
        self.source.write_text("fun main() {}")
        self.resources = self.module / "src/main/resources"
        (self.resources / "db/migration").mkdir(parents=True)
        self.resource = self.resources / "db/migration/V1.sql"
        self.resource.write_text("select 1;")
        (self.resources / "rsprox.properties").write_text("app.version=${version}")
        self.library = root / "Client/build/install/rsprox/lib/dependency.jar"
        self.library.parent.mkdir(parents=True)
        self.library.write_bytes(b"dependency")
        self.runtime = root / "Client/build/direct/lib"
        self.calls = 0
        self.compile_patch = patch.object(build, "run_compiler", side_effect=self.compile)
        self.compile_patch.start()
        self.addCleanup(self.compile_patch.stop)

    def compile(self, command, logfile, progress, label):
        self.calls += 1
        args = shlex.split(Path(command[-1][1:]).read_text())
        jar = Path(args[args.index("-d") + 1])
        with zipfile.ZipFile(jar, "w") as bundle:
            bundle.writestr("Main.class", f"compiled-{self.calls}")

    def run_build(self, rebuild=False):
        with contextlib.redirect_stdout(io.StringIO()):
            build.build_project("Client", rebuild, self.home, self.compiler)

    def test_unchanged_and_resource_only_builds_skip_compilation(self):
        self.run_build()
        self.run_build()
        self.assertEqual(self.calls, 1)
        self.resource.write_text("select 2;")
        self.run_build()
        self.assertEqual(self.calls, 1)
        with zipfile.ZipFile(self.runtime / "resources-gui-proxy-tool.jar") as jar:
            self.assertEqual(jar.read("db/migration/V1.sql"), b"select 2;")
            self.assertIn("db/migration/", jar.namelist())
            self.assertEqual(jar.read("rsprox.properties"), b"app.version=1.0.5")

    def test_source_dependency_compiler_and_force_invalidate_code(self):
        self.run_build()
        self.source.write_text('fun main() { println("changed") }')
        self.run_build()
        self.library.write_bytes(b"new dependency")
        self.run_build()
        (self.compiler / "kotlin-compiler.jar").write_bytes(b"new compiler")
        self.run_build()
        self.run_build(rebuild=True)
        self.assertEqual(self.calls, 5)

    def test_missing_or_corrupt_artifacts_are_repaired(self):
        self.run_build()
        (self.runtime / "resources-gui-proxy-tool.jar").unlink()
        self.run_build()
        self.assertEqual(self.calls, 1)
        (self.runtime / "soloscape-client.jar").write_bytes(b"corrupted")
        self.run_build()
        self.assertEqual(self.calls, 2)
        (self.runtime / "unexpected.jar").write_bytes(b"stale")
        self.run_build()
        self.assertFalse((self.runtime / "unexpected.jar").exists())

    def test_removed_inputs_are_removed_from_output(self):
        self.run_build()
        self.resource.unlink()
        self.run_build()
        with zipfile.ZipFile(self.runtime / "resources-gui-proxy-tool.jar") as jar:
            self.assertNotIn("db/migration/V1.sql", jar.namelist())
        self.source.unlink()
        replacement = self.source.with_name("Other.kt")
        replacement.write_text("fun other() {}")
        self.run_build()
        self.assertEqual(self.calls, 2)

    def test_failure_preserves_previous_runtime_and_cache(self):
        self.run_build()
        old_jar = (self.runtime / "soloscape-client.jar").read_bytes()
        manifest = self.runtime.parent / "build-state.json"
        old_state = manifest.read_bytes()
        self.source.write_text("invalid Kotlin")
        with patch.object(build, "run_compiler", side_effect=RuntimeError("compile failed")):
            with self.assertRaises(RuntimeError):
                self.run_build()
        self.assertEqual((self.runtime / "soloscape-client.jar").read_bytes(), old_jar)
        self.assertEqual(manifest.read_bytes(), old_state)


class JavaHomeTests(unittest.TestCase):
    def test_java_home_finds_java_21_on_path(self):
        with tempfile.TemporaryDirectory() as temporary:
            home = Path(temporary) / "jdk-21"
            java = home / "bin/java.exe"
            java.parent.mkdir(parents=True)
            java.write_bytes(b"")
            (home / "release").write_text('JAVA_VERSION="21.0.8"')

            version = type(
                "Version",
                (),
                {
                    "returncode": 0,
                    "stdout": "",
                    "stderr": 'openjdk version "21.0.8" 2025-07-15',
                },
            )()
            with patch.dict(build.os.environ, {}, clear=True):
                with patch.object(build.shutil, "which", return_value=str(java)), \
                        patch.object(build.subprocess, "run", return_value=version):
                    self.assertEqual(build.java_home(), home.resolve())


if __name__ == "__main__":
    unittest.main()
