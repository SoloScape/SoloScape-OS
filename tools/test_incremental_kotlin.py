"""Exercise package recompilation with the installed Kotlin compiler and JVM."""
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
import zipfile

import build
import incremental


class KotlinPackageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.compiler = build.ROOT / ".build-tools/kotlinc/lib"
        if not (cls.compiler / "kotlin-compiler.jar").is_file():
            raise unittest.SkipTest("Standalone Kotlin compiler is not installed")
        try:
            cls.java = build.java_home() / "bin/java.exe"
        except RuntimeError as error:
            raise unittest.SkipTest(str(error))

    def compile(self, root, sources, output, dependencies=()):
        libraries = list(self.compiler.glob("kotlin-stdlib*.jar"))
        args = ["-no-stdlib", "-no-reflect", "-jvm-target", "21", "-module-name", "Fixture",
                "-classpath", os.pathsep.join(str(p) for p in libraries + list(dependencies)),
                "-d", str(output)] + [str(p) for p in sources]
        argfile = root / (output.stem + ".args")
        argfile.write_text("\n".join('"' + a.replace("\\", "/") + '"' for a in args))
        result = subprocess.run([str(self.java), "-Xmx512m", "-cp", str(self.compiler / "*"),
                                 "org.jetbrains.kotlin.cli.jvm.K2JVMCompiler", "@" + str(argfile)],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_signature_addition_inline_classes_metadata_and_runtime(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            api, consumer, downstream, other, added = [root / (name + ".kt") for name in
                                                       ("Api", "Consumer", "Downstream", "Other", "Added")]
            api.write_text("package api\nclass Obsolete\nfun result(value: Int = 1) = value\n"
                           "fun sorted(values: List<Int>) = values.sortedBy { it }\n")
            consumer.write_text("package consumer\nimport api.result\nfun use() = result().toString()\n")
            downstream.write_text("package downstream\nimport consumer.use\nfun value() = use()\n")
            other.write_text('package untouched\nfun retained() = "kept"\n')
            old, patch, merged = (root / name for name in ("old.jar", "patch.jar", "merged.jar"))
            sources = [api, consumer, downstream, other]
            self.compile(root, sources, old)
            api.write_text("package api\nclass Replacement\nfun result(value: Long = 7) = value\n"
                           "fun sorted(values: List<Int>) = values.sortedBy { it }\n")
            added.write_text('package api\nfun added() = "added"\n')
            selected = incremental.affected_packages(old, [api, added], sources + [added], [added])
            self.assertEqual(set(selected), {api, added, consumer, downstream})
            dependencies = root / "dependencies.jar"
            self.assertTrue(incremental.package_dependency_jar(old, dependencies, selected))
            self.compile(root, selected, patch, [dependencies])
            self.assertTrue(incremental.overlay_packages(old, patch, merged, selected))
            with zipfile.ZipFile(old) as previous, zipfile.ZipFile(merged) as updated:
                self.assertNotIn("api/Obsolete.class", updated.namelist())
                self.assertIn("api/Replacement.class", updated.namelist())
                self.assertEqual(previous.read("untouched/OtherKt.class"),
                                 updated.read("untouched/OtherKt.class"))
            verifier = root / "Verify.kt"
            verifier.write_text('import api.added\nimport downstream.value\nimport untouched.retained\n'
                                'fun main() { check(value() == "7"); check(added() == "added"); '
                                'check(retained() == "kept"); check(api.sorted(listOf(3, 1)) == listOf(1, 3)); '
                                'println("Merged Kotlin packages work") }\n')
            executable = root / "verify.jar"
            self.compile(root, [verifier], executable, [merged])
            result = subprocess.run([str(self.java), "-cp", os.pathsep.join(
                [str(executable), str(merged), str(self.compiler / "kotlin-stdlib.jar")]), "VerifyKt"],
                capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("Merged Kotlin packages work", result.stdout)


if __name__ == "__main__":
    unittest.main()
