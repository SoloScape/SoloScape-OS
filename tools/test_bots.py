"""Compile bot sources and run focused checks against the locally built server."""

import argparse
import os
from pathlib import Path
import subprocess
import tempfile

import build


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime", type=Path, help="Isolated runtime lib directory")
    args = parser.parse_args()
    server = build.ROOT / "Server"
    runtime = (args.runtime or server / "build/direct/lib").resolve()
    if not (runtime / "soloscape-server.jar").is_file():
        parser.error("Build the server before running bot checks")
    runs = server / "build/bot-verification"
    runs.mkdir(parents=True, exist_ok=True)
    output = Path(tempfile.mkdtemp(prefix="run-", dir=runs))
    module = server / "content/other/bots"
    sources = sorted((module / "src/main/kotlin").rglob("*.kt"))
    names = ["BotTickWorkCheck", "BotMovementCheck", "BotActionsCheck", "BotCrowdingCheck",
             "BotPlannerCheck", "BotSkillingCheck", "BotRoutineCheck", "BotFleeCheck",
             "BotGravestoneCheck", "BotPortCheck"]
    tests = [module / "src/test/kotlin/org/rsmod/content/other/bots" / (name + ".kt")
             for name in names]
    classpath = os.pathsep.join(str(path) for path in sorted(runtime.glob("*.jar")))
    destination = output / "checks.jar"
    compiler_args = [
        "-no-stdlib", "-no-reflect", "-jvm-target", "21", "-Xbackend-threads=1",
        "-Xannotation-default-target=param-property", "-Xconsistent-data-class-copy-visibility",
        "-opt-in=org.rsmod.annotations.InternalApi", "-opt-in=kotlin.contracts.ExperimentalContracts",
        "-Xnested-type-aliases", "-classpath", classpath,
        "-Xfriend-paths=" + str(runtime / "soloscape-server-core.jar") + "," +
        str(runtime / "soloscape-server.jar"), "-d", str(destination), *map(str, sources + tests),
    ]
    argfile = output / "compiler.args"
    argfile.write_text("\n".join('"' + arg.replace("\\", "/").replace('"', '\\"') + '"'
                                  for arg in compiler_args), encoding="utf-8")
    java = build.java_home() / "bin/java.exe"
    subprocess.run([str(java), "-Xmx2g", "-cp", str(build.compiler() / "*"),
                    "org.jetbrains.kotlin.cli.jvm.K2JVMCompiler", "@" + str(argfile)], check=True)
    logging = output / "logback-test.xml"
    logging.write_text('<configuration><root level="ERROR"/></configuration>', encoding="utf-8")
    for name, test in zip(names, tests):
        entry = name if "@JvmStatic" in test.read_text(encoding="utf-8") else name + "Kt"
        subprocess.run([str(java), "-Xmx1g", "-Dlogback.configurationFile=" + str(logging),
                        "-cp", str(destination) + os.pathsep + str(runtime / "*"),
                        "org.rsmod.content.other.bots." + entry], cwd=server, check=True)


if __name__ == "__main__":
    main()
