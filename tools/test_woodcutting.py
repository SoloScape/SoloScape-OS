"""Compile and run the woodcutting audit checks against a locally built server."""

import argparse
import os
from pathlib import Path
import subprocess
import tempfile

import build


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache-root", type=Path, help="Server directory containing real cache files")
    args = parser.parse_args()
    server = build.ROOT / "Server"
    runtime = server / "build/direct/lib"
    if not (runtime / "soloscape-server.jar").is_file():
        parser.error("Run build.bat Server (or Server/build.bat) first")
    runs = server / "build/woodcutting-check"
    runs.mkdir(parents=True, exist_ok=True)
    output = Path(tempfile.mkdtemp(prefix="run-", dir=runs))
    module = server / "content/skills/woodcutting"
    sources = sorted((module / "src/main/kotlin").rglob("*.kt"))
    singing = server / "content/skills/smithing/src/main/kotlin/org/rsmod/content/skills/smithing"
    sources += [singing / "CrystalSingingOutputs.kt", singing / "CrystalSingingScript.kt"]
    tests = sorted((module / "src/test/kotlin").rglob("*.kt"))
    checks = [path for path in tests if path.name.endswith("Check.kt")]
    if not checks:
        parser.error("No standalone audit checks found")
    libraries = sorted(runtime.glob("*.jar"))
    classpath = os.pathsep.join(map(str, libraries))
    destination = output / "audit-checks.jar"
    logging_config = output / "logback-test.xml"
    logging_config.write_text('<configuration><root level="ERROR"/></configuration>', encoding="utf-8")
    compiler_args = [
        "-no-stdlib", "-no-reflect", "-jvm-target", "21",
        "-Xannotation-default-target=param-property",
        "-Xconsistent-data-class-copy-visibility",
        "-opt-in=org.rsmod.annotations.InternalApi",
        "-Xnested-type-aliases", "-classpath", classpath,
        "-Xfriend-paths=" + str(runtime / "soloscape-server.jar"),
        "-d", str(destination), *map(str, sources + tests),
    ]
    argfile = output / "compiler.args"
    argfile.write_text("\n".join('"' + s.replace("\\", "/").replace('"', '\\"') + '"'
                                  for s in compiler_args), encoding="utf-8")
    java = build.java_home() / "bin/java.exe"
    subprocess.run([str(java), "-Xmx2g", "-cp", str(build.compiler() / "*"),
                    "org.jetbrains.kotlin.cli.jvm.K2JVMCompiler", "@" + str(argfile)], check=True)
    for check in checks:
        package = next(line.removeprefix("package ").strip()
                       for line in check.read_text(encoding="utf-8").splitlines()
                       if line.startswith("package "))
        subprocess.run([str(java), "-Xmx1g", "-Dlogback.configurationFile=" + str(logging_config),
                        "-cp", str(destination) + os.pathsep + str(runtime / "*"),
                        package + "." + check.stem + "Kt"],
                       cwd=args.cache_root or server, check=True)


if __name__ == "__main__":
    main()
