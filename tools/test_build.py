"""Focused checks for build cache invalidation and preservation of runnable output."""
import contextlib
import io
from pathlib import Path
import shlex
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import zipfile

import build
from test_incremental import fake_class


class BuildFixture(unittest.TestCase):
    project_name = "Client"
    module_path = "gui/proxy-tool"
    distribution_path = "build/install/rsprox/lib"

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
        self.module = root / self.project_name / self.module_path
        self.source = self.module / "src/main/kotlin/Main.kt"
        self.source.parent.mkdir(parents=True)
        self.source.write_text("fun main() {}")
        self.resources = self.module / "src/main/resources"
        (self.resources / "db/migration").mkdir(parents=True)
        self.resource = self.resources / "db/migration/V1.sql"
        self.resource.write_text("select 1;")
        (self.resources / "rsprox.properties").write_text("app.version=${version}")
        self.library = root / self.project_name / self.distribution_path / "dependency.jar"
        self.library.parent.mkdir(parents=True)
        self.library.write_bytes(b"dependency")
        self.runtime = root / self.project_name / "build/direct/lib"
        self.calls = 0
        self.compilations = []
        self.compile_patch = patch.object(build, "run_compiler", side_effect=self.compile)
        self.compile_patch.start()
        self.addCleanup(self.compile_patch.stop)

    def compile(self, command, logfile, progress, label):
        self.calls += 1
        args = shlex.split(Path(command[-1][1:]).read_text())
        self.compilations.append(args)
        jar = Path(args[args.index("-d") + 1])
        with zipfile.ZipFile(jar, "w") as bundle:
            bundle.writestr("Main.class", f"compiled-{self.calls}")
            if jar.name == "soloscape-server-core.jar":
                bundle.writestr("org/rsmod/module/ExtendedModule.class", b"<init>")

    def run_build(self, rebuild=False):
        with contextlib.redirect_stdout(io.StringIO()):
            build.build_project(self.project_name, rebuild, self.home, self.compiler)


class BuildCacheTests(BuildFixture):

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

    def test_client_core_still_reused_for_app_changes(self):
        core = self.runtime.parents[2] / "protocol/src/main/kotlin/Core.kt"
        core.parent.mkdir(parents=True)
        core.write_text("internal fun core() {}")
        self.run_build()
        self.assertEqual(self.calls, 2)
        self.source.write_text("fun main() { core() }")
        self.run_build()
        self.assertEqual(self.calls, 3)
        self.assertIn("-module-name", self.compilations[0])
        self.assertIn("ClientCore", self.compilations[0])


class ServerBuildCacheTests(BuildFixture):
    project_name = "Server"
    module_path = "content/areas/test"
    distribution_path = "server/app/build/install/app/lib"

    def setUp(self):
        super().setUp()
        for name in build.SERVER_CACHE_FILES:
            cache = build.ROOT / name
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_bytes(b"restored cache data")
        self.core = self.runtime.parents[2] / "engine/module/src/main/kotlin/Core.kt"
        self.core.parent.mkdir(parents=True)
        self.core.write_text("internal fun core() {}")
        self.app = self.runtime.parents[2] / "server/app/src/main/kotlin/App.kt"
        self.app.parent.mkdir(parents=True)
        self.app.write_text("fun app() {}")

    def test_content_edits_reuse_core_and_compile_against_it(self):
        self.run_build()
        core_jar = self.runtime / "soloscape-server-core.jar"
        original = core_jar.read_bytes()
        self.assertEqual(self.calls, 2)
        self.assertIn("ServerCore", self.compilations[0])
        self.assertTrue(any(arg.startswith("-Xplugin=") for arg in self.compilations[0]))
        self.assertIn(str(self.core).replace("\\", "/"), self.compilations[0])
        self.assertNotIn(str(self.source).replace("\\", "/"), self.compilations[0])
        self.assertIn(str(self.app).replace("\\", "/"), self.compilations[1])
        self.source.write_text("fun main() { core() }")
        self.run_build()
        self.assertEqual(self.calls, 3)
        self.assertEqual(core_jar.read_bytes(), original)
        args = self.compilations[-1]
        self.assertIn("Server", args)
        self.assertIn("soloscape-server-core.jar", args[args.index("-classpath") + 1])
        self.assertTrue(any(arg.startswith("-Xfriend-paths=") for arg in args))
        self.assertTrue(any(arg.startswith("-Xplugin=") for arg in args))
        self.run_build()
        self.resource.write_text("select 2;")
        self.run_build()
        self.assertEqual(self.calls, 3)

    def test_one_body_edit_compiles_only_its_source(self):
        self.compile_patch.stop()

        def compiler(command, logfile, progress, label):
            self.calls += 1
            args = shlex.split(Path(command[-1][1:]).read_text())
            self.compilations.append(args)
            jar = Path(args[args.index("-d") + 1])
            with zipfile.ZipFile(jar, "w") as bundle:
                if jar.name == "soloscape-server-core.jar":
                    bundle.writestr("org/rsmod/module/ExtendedModule.class", b"<init>")
                else:
                    bundle.writestr("Main.class", fake_class(
                        "Main.kt", str(self.calls).encode()))

        with patch.object(build, "run_compiler", side_effect=compiler):
            self.run_build()
            self.assertEqual(self.calls, 2)
            self.source.write_text('fun main() { println("changed") }')
            self.run_build()
            self.assertEqual(self.calls, 3)
            self.assertIn(str(self.source).replace("\\", "/"), self.compilations[-1])
            self.assertNotIn(str(self.app).replace("\\", "/"), self.compilations[-1])
            self.assertTrue(any(arg.startswith("-Xfriend-paths=") and "," in arg
                                for arg in self.compilations[-1]))
            with zipfile.ZipFile(self.runtime / "soloscape-server.jar") as bundle:
                self.assertTrue(bundle.read("Main.class").endswith(b"3"))

    def test_core_and_toolchain_changes_rebuild_both_layers(self):
        self.run_build()
        self.core.write_text("internal fun changedCore() {}")
        self.run_build()
        self.assertEqual(self.calls, 4)
        self.library.write_bytes(b"new dependency")
        self.run_build()
        self.assertEqual(self.calls, 6)
        (self.compiler / "kotlin-compiler.jar").write_bytes(b"new compiler")
        self.run_build()
        self.assertEqual(self.calls, 8)
        self.run_build(rebuild=True)
        self.assertEqual(self.calls, 10)

    def test_corrupt_core_is_repaired_and_failed_build_preserves_both_layers(self):
        self.run_build()
        core_jar = self.runtime / "soloscape-server-core.jar"
        core_jar.write_bytes(b"corrupted")
        self.run_build()
        self.assertEqual(self.calls, 3)
        old_core = core_jar.read_bytes()
        old_app = (self.runtime / "soloscape-server.jar").read_bytes()
        manifest = self.runtime.parent / "build-state.json"
        old_state = manifest.read_bytes()
        self.core.write_text("changed core")
        def fail_app(command, logfile, progress, label):
            if "app layer" in label:
                raise RuntimeError("content compilation failed")
            return self.compile(command, logfile, progress, label)
        with patch.object(build, "run_compiler", side_effect=fail_app):
            with self.assertRaises(RuntimeError):
                self.run_build()
        self.assertEqual(core_jar.read_bytes(), old_core)
        self.assertEqual((self.runtime / "soloscape-server.jar").read_bytes(), old_app)
        self.assertEqual(manifest.read_bytes(), old_state)

    def test_deleted_content_and_app_changes_recompile_only_app(self):
        self.run_build()
        self.app.write_text("fun changedApp() {}")
        self.run_build()
        self.assertEqual(self.calls, 3)
        self.source.unlink()
        self.run_build()
        self.assertEqual(self.calls, 4)
        self.assertNotIn(str(self.source).replace("\\", "/"), self.compilations[-1])

    def test_missing_app_and_api_changes_invalidate_the_correct_layers(self):
        api = self.runtime.parents[2] / "api/generated/src/main/kotlin/Generated.kt"
        api.parent.mkdir(parents=True)
        api.write_text("fun generated() {}")
        self.run_build()
        self.assertIn(str(api).replace("\\", "/"), self.compilations[0])
        (self.runtime / "soloscape-server.jar").unlink()
        self.run_build()
        self.assertEqual(self.calls, 3)
        api.write_text("fun changedGenerated() {}")
        self.run_build()
        self.assertEqual(self.calls, 5)


class ServerCacheLfsTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        root_patch = patch.object(build, "ROOT", self.root)
        root_patch.start()
        self.addCleanup(root_patch.stop)
        self.files = [self.root / name for name in build.SERVER_CACHE_FILES]
        for file in self.files:
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(build.LFS_POINTER_HEADER + b"\noid sha256:abc\nsize 100\n")

    def restore(self):
        for file in self.files:
            file.write_bytes(b"cache data")

    def ensure(self):
        with contextlib.redirect_stdout(io.StringIO()):
            build.ensure_server_cache()

    def test_hydrated_cache_needs_no_git(self):
        self.restore()
        with patch.object(build.subprocess, "run") as run:
            self.ensure()
        run.assert_not_called()

    def test_local_checkout_restores_pointers_without_download(self):
        def checkout(command, **kwargs):
            self.assertEqual(command[4], "checkout")
            self.assertEqual(command[5:], list(build.SERVER_CACHE_FILES))
            self.restore()
            return subprocess.CompletedProcess(command, 0)
        with patch.object(build.subprocess, "run", side_effect=checkout) as run:
            self.ensure()
        self.assertEqual(run.call_count, 1)

    def test_missing_local_objects_trigger_targeted_download(self):
        self.files[1].unlink()
        def run_git(command, **kwargs):
            if command[4] == "pull":
                self.assertIn("--include=" + ",".join(build.SERVER_CACHE_FILES), command)
                self.assertIn("--exclude=", command)
                self.restore()
            return subprocess.CompletedProcess(command, 0)
        with patch.object(build.subprocess, "run", side_effect=run_git) as run:
            self.ensure()
        self.assertEqual(run.call_count, 2)

    def test_failed_or_incomplete_restoration_stops_build(self):
        for result in (subprocess.CompletedProcess([], 1), subprocess.CompletedProcess([], 0)):
            with self.subTest(returncode=result.returncode):
                with patch.object(build.subprocess, "run", return_value=result):
                    with self.assertRaisesRegex(RuntimeError, "server cache data|Server cache data"):
                        self.ensure()
        with patch.object(build.subprocess, "run", side_effect=FileNotFoundError()):
            with self.assertRaisesRegex(RuntimeError, "Install Git LFS"):
                self.ensure()

    def test_preflight_runs_before_server_compilation(self):
        with patch.object(build, "ensure_server_cache", side_effect=RuntimeError("LFS failed")):
            with patch.object(build, "run_compiler") as compile:
                with self.assertRaisesRegex(RuntimeError, "LFS failed"):
                    build.build_project("Server", False, self.root, self.root)
        compile.assert_not_called()


if __name__ == "__main__":
    unittest.main()
