"""Compile and run standalone bank integrity checks against a built SoloScape server."""

import argparse
import os
from pathlib import Path
import subprocess
import tempfile

import build


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache-root", type=Path, help="Server directory with the real cache")
    args = parser.parse_args()
    server = build.ROOT / "Server"
    runtime = server / "build/direct/lib"
    if not (runtime / "soloscape-server.jar").is_file():
        parser.error("Run build.bat Server (or Server/build.bat) first")

    output_dir = server / "build/bank-check"
    output_dir.mkdir(parents=True, exist_ok=True)
    output = Path(tempfile.mkdtemp(prefix="run-", dir=output_dir))
    module = server / "content/interfaces/bank"
    sources = sorted((module / "src/main/kotlin").rglob("*.kt"))
    tests = [
        module / "src/test/kotlin/org/rsmod/content/interfaces/bank/BankCapacityCheck.kt",
        module / "src/test/kotlin/org/rsmod/content/interfaces/bank/BankTabRecoveryCheck.kt",
    ]
    libraries = sorted(runtime.glob("*.jar"))
    destination = output / "bank-checks.jar"
    logging_config = output / "logback-test.xml"
    logging_config.write_text('<configuration><root level="ERROR"/></configuration>', encoding="utf-8")
    compiler_args = [
        "-no-stdlib", "-no-reflect", "-jvm-target", "21",
        "-Xannotation-default-target=param-property",
        "-Xconsistent-data-class-copy-visibility",
        "-opt-in=org.rsmod.annotations.InternalApi",
        "-Xnested-type-aliases",
        "-classpath", os.pathsep.join(map(str, libraries)),
        "-Xfriend-paths=" + str(runtime / "soloscape-server.jar"),
        "-d", str(destination), *map(str, sources + tests),
    ]
    argfile = output / "compiler.args"
    argfile.write_text(
        "\n".join('"' + s.replace("\\", "/").replace('"', '\\"') + '"' for s in compiler_args),
        encoding="utf-8",
    )
    java = build.java_home() / "bin/java.exe"
    subprocess.run(
        [str(java), "-Xmx2g", "-cp", str(build.compiler() / "*"),
         "org.jetbrains.kotlin.cli.jvm.K2JVMCompiler", "@" + str(argfile)],
        check=True,
    )
    for test in tests:
        subprocess.run(
            [str(java), "-Xmx1g", "-Dlogback.configurationFile=" + str(logging_config),
             "-cp", str(destination) + os.pathsep + os.pathsep.join(map(str, libraries)),
             "org.rsmod.content.interfaces.bank." + test.stem + "Kt"],
            cwd=args.cache_root or server,
            check=True,
        )


if __name__ == "__main__":
    main()
