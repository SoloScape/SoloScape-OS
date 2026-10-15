"""Build the pinned RSProt observer overlay into a copy of its original model jar."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import zipfile


def prepare(root, libraries, home, compiler):
    vendor = root / "Server/vendor/rsprot-observers"
    manifest = json.loads((vendor / "upstream.json").read_text(encoding="utf-8"))
    name = "osrs-240-model-" + manifest["version"] + ".jar"
    original = next((path for path in libraries if path.name == name), None)
    if original is None:
        raise RuntimeError("Unsupported RSProt model version for observer overlay")
    digest = hashlib.sha256(original.read_bytes()).hexdigest()
    if digest != manifest["modelSha256"]:
        raise RuntimeError("RSProt model hash mismatch; review the observer overlay before rebuilding")
    sources = sorted((vendor / "src").glob("*.kt"))
    state = hashlib.sha256()
    state.update(Path(__file__).read_bytes())
    state.update(original.read_bytes())
    for path in sources:
        state.update(path.read_bytes())
    for path in sorted(compiler.glob("*.jar")):
        state.update(path.name.encode())
        state.update(str(path.stat().st_mtime_ns).encode())
    stamp = state.hexdigest()
    output = root / ".build-tools/rsprot-observers" / stamp
    output.mkdir(parents=True, exist_ok=True)
    patched = output / name
    state_file = output / "state.txt"
    if not patched.exists() or not state_file.exists() or state_file.read_text() != stamp:
        delta = output / "overlay.jar"
        args = [
            "-no-stdlib", "-no-reflect", "-jvm-target", "21",
            "-module-name", "osrs-240-model", "-Xskip-prerelease-check",
            "-Xallow-unstable-dependencies", "-Xconsistent-data-class-copy-visibility",
            "-classpath", os.pathsep.join(map(str, libraries)),
            "-Xfriend-paths=" + str(original), "-d", str(delta), *map(str, sources),
        ]
        argfile = output / "compiler.args"
        argfile.write_text("\n".join('"' + arg.replace("\\", "/").replace('"', '\\"') + '"'
                                      for arg in args), encoding="utf-8")
        result = subprocess.run([str(home / "bin/java.exe"), "-Xmx1g", "-cp",
                                 str(compiler / "*"), "org.jetbrains.kotlin.cli.jvm.K2JVMCompiler",
                                 "@" + str(argfile)], capture_output=True, text=True)
        (output / "compile.log").write_text(result.stdout + result.stderr, encoding="utf-8")
        if result.returncode:
            raise RuntimeError("RSProt observer overlay compilation failed:\n" + result.stderr[-5000:])
        staged = output / (name + ".tmp")
        with zipfile.ZipFile(original) as base, zipfile.ZipFile(delta) as overlay:
            classes = {entry.filename: overlay.read(entry) for entry in overlay.infolist()
                       if entry.filename.endswith(".class")}
            with zipfile.ZipFile(staged, "w", zipfile.ZIP_DEFLATED) as bundle:
                for entry in base.infolist():
                    if entry.filename not in classes:
                        bundle.writestr(entry, base.read(entry))
                for filename, content in classes.items():
                    bundle.writestr(filename, content)
        staged.replace(patched)
        state_file.write_text(stamp)
    return [patched if path == original else path for path in libraries]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Run the observer visibility fixture")
    args = parser.parse_args()
    import build
    libraries = sorted((build.ROOT / "Server/server/app/build/install/app/lib").glob("*.jar"))
    home = build.java_home()
    compiler = build.compiler()
    libraries = prepare(build.ROOT, libraries, home, compiler)
    if not args.check:
        print("RSProt observer overlay compiled")
        return
    output = build.ROOT / ".build-tools/rsprot-observers"
    checks = output / "checks.jar"
    model = next(path for path in libraries if path.name.startswith("osrs-240-model-"))
    sources = sorted((build.ROOT / "Server/vendor/rsprot-observers/test").glob("*.kt"))
    classpath = os.pathsep.join(map(str, libraries))
    compile_args = ["-no-stdlib", "-no-reflect", "-jvm-target", "21",
                    "-module-name", "osrs-240-model", "-classpath", classpath,
                    "-Xfriend-paths=" + str(model), "-d", str(checks), *map(str, sources)]
    argfile = output / "check-compiler.args"
    argfile.write_text("\n".join('"' + arg.replace("\\", "/").replace('"', '\\"') + '"'
                                  for arg in compile_args), encoding="utf-8")
    subprocess.run([str(home / "bin/java.exe"), "-Xmx1g", "-cp", str(compiler / "*"),
                    "org.jetbrains.kotlin.cli.jvm.K2JVMCompiler", "@" + str(argfile)], check=True)
    run_args = ["-Xmx512m", "-cp", str(checks) + os.pathsep + classpath,
                "net.rsprot.protocol.game.outgoing.info.ObserverAdmissionCheck"]
    runfile = output / "check-runtime.args"
    runfile.write_text("\n".join('"' + arg.replace("\\", "/").replace('"', '\\"') + '"'
                                  for arg in run_args), encoding="utf-8")
    subprocess.run([str(home / "bin/java.exe"), "@" + str(runfile)], check=True)



if __name__ == "__main__":
    main()
