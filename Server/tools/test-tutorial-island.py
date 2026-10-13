"""Compile and run the Tutorial Island verification against the local server build and cache."""
from pathlib import Path
import subprocess
import sys
import sqlite3

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
import build

server = ROOT / "Server"
with sqlite3.connect(":memory:") as database:
    database.executescript("""
        CREATE TABLE accounts (id INTEGER PRIMARY KEY, account_name TEXT);
        CREATE TABLE account_characters (
            account_id INTEGER, display_name TEXT,
            x INTEGER DEFAULT 3200, z INTEGER DEFAULT 3200, level INTEGER DEFAULT 0
        );
        INSERT INTO accounts VALUES (1, 'tutorial_fixture');
        INSERT INTO account_characters VALUES (1, 'existing_fixture', 3222, 3218, 0);
    """)
    sql = (server / "central-sqlite/central-common/src/main/resources/sql/game/character/"
                    "characters_insert_display_name_from_account.sql").read_text(encoding="utf-8")
    database.execute(sql, (1, 1))
    assert database.execute("SELECT x, z, level FROM account_characters ORDER BY rowid").fetchall() == [
        (3222, 3218, 0), (3094, 3107, 0)
    ]
print("PASS: new-character SQL spawn and existing-character preservation", flush=True)
runtime = server / "build/direct/lib"
if not (runtime / "soloscape-server.jar").is_file():
    raise SystemExit("Build the server first: python tools/build.py Server")
output = server / "build/direct/tutorial-verification"
output.mkdir(parents=True, exist_ok=True)
source = server / ("content/areas/misc/tutorial-island/src/test/kotlin/"
                   "org/rsmod/content/areas/tutorial/TutorialIslandVerification.kt")
classpath = ";".join(str(jar) for jar in runtime.glob("*.jar"))
java = str(build.java_home() / "bin/java.exe")
sources = [source]
if "--source" in sys.argv[1:]:
    sources += list((server / "content/areas/misc/tutorial-island/src/main/kotlin").rglob("*.kt"))
    sources.append(server / "api/account/src/main/kotlin/org/rsmod/api/account/loader/request/AccountLoadResponse.kt")
compile_args = ["-jvm-target", "21",
                "-Xcontext-parameters", "-Xnested-type-aliases", "-Xskip-prerelease-check",
                "-Xallow-unstable-dependencies",
                "-no-stdlib", "-no-reflect", "-classpath", classpath,
                "-d", str(output / "tests.jar"), *map(str, sources)]
args_file = output / "compiler.args"
args_file.write_text("\n".join('"' + arg.replace("\\", "/").replace('"', '\\"') + '"'
                               for arg in compile_args), encoding="utf-8")
compile_result = subprocess.run([java, "-Xmx1g", "-cp", str(build.compiler() / "*"),
                "org.jetbrains.kotlin.cli.jvm.K2JVMCompiler", "@" + str(args_file)],
                capture_output=True, text=True)
(output / "compile.log").write_text(compile_result.stdout + compile_result.stderr, encoding="utf-8")
if compile_result.returncode:
    print((compile_result.stdout + compile_result.stderr)[-6000:])
    raise SystemExit(compile_result.returncode)
test_result = subprocess.run([java, "-Xmx2g", "-cp", str(output / "tests.jar") + ";" + str(runtime / "*"),
                "org.rsmod.content.areas.tutorial.TutorialIslandVerificationKt"],
               cwd=server, capture_output=True, text=True)
(output / "test.log").write_text(test_result.stdout + test_result.stderr, encoding="utf-8")
print((test_result.stdout + test_result.stderr)[-6000:] if test_result.returncode
      else "\n".join(line for line in test_result.stdout.splitlines() if line.startswith("PASS:")))
raise SystemExit(test_result.returncode)
