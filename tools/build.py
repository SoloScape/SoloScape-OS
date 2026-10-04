"""Build the client/server with the standalone Kotlin compiler and installed libraries."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
KOTLIN_VERSION = "2.2.10"


def java_home():
    candidates = [Path(os.environ.get("JAVA_HOME", "__missing__"))]
    candidates += sorted(Path(os.environ.get("ProgramFiles", "C:/Program Files"))
                         .glob("Eclipse Adoptium/jdk-21*"), reverse=True)
    for home in candidates:
        if (home / "bin/java.exe").is_file():
            version = subprocess.run([str(home / "bin/java.exe"), "-version"],
                                     capture_output=True, text=True)
            if 'version "21.' in version.stderr:
                return home
    raise RuntimeError("Install Java 21 or set JAVA_HOME to its installation directory.")


def compiler():
    tools = ROOT / ".build-tools"
    compiler_lib = tools / "kotlinc/lib"
    if not (compiler_lib / "kotlin-compiler.jar").is_file():
        tools.mkdir(exist_ok=True)
        archive = tools / f"kotlin-compiler-{KOTLIN_VERSION}.zip"
        print(f"Downloading standalone Kotlin {KOTLIN_VERSION}...", flush=True)
        urllib.request.urlretrieve(
            f"https://github.com/JetBrains/kotlin/releases/download/v{KOTLIN_VERSION}/"
            f"kotlin-compiler-{KOTLIN_VERSION}.zip", archive)
        with zipfile.ZipFile(archive) as bundle:
            bundle.extractall(tools)
    return compiler_lib


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", choices=["Client", "Server"])
    options = parser.parse_args()
    project = ROOT / options.project
    home = java_home()
    compiler_lib = compiler()
    installed = project / ("build/install/rsprox/lib" if options.project == "Client"
                           else "server/app/build/install/app/lib")
    if not installed.is_dir():
        raise RuntimeError(f"Restore the matching distribution and dependency libraries to {installed}.")

    # Discover main sources only. Generated server API sources are included here.
    modules = []
    for directory, children, _ in os.walk(project):
        children[:] = sorted(name for name in children
                             if name not in {"build", "target", ".data", ".gradle", ".git", "node_modules"})
        path = Path(directory)
        if path.name == "src" and (path / "main").is_dir():
            modules.append(path.parent)
            children[:] = []
    if options.project == "Server":
        modules = [module for module in modules if module.relative_to(project).parts[0]
                   not in {"tools", "example-plugin", "build-logic"}
                   and module.relative_to(project).as_posix() != "central-sqlite/central-app"]
    else:
        # The installer launcher and RuneLite-injected extension have separate SDKs;
        # neither belongs to the proxy GUI runtime classpath.
        modules = [module for module in modules if module.relative_to(project).parts[0]
                   not in {"launcher", "runelite", "installer"}]

    sources = sorted(file for module in modules for file in (module / "src/main").rglob("*.kt"))
    if not sources:
        raise RuntimeError("No Kotlin sources found.")
    internal_names = {module.name for module in modules}
    internal_names |= {module.parent.name + "-pack" for module in modules if module.name == "pack"}
    internal_names |= {"rsprox"} if options.project == "Client" else {"app", "install", "central-common"}
    internal_versions = {"1.0.5"} if options.project == "Client" else {"0.0.1", "2.0.1-sqlite"}
    internal_files = {f"{name}-{version}.jar" for name in internal_names for version in internal_versions}
    libraries = sorted(file for file in installed.glob("*.jar") if file.name not in internal_files)
    if not libraries:
        raise RuntimeError("The distribution has no external dependency libraries.")

    output = project / "build/direct"
    output.mkdir(parents=True, exist_ok=True)
    stage = output / "staging"
    if stage.exists():
        shutil.rmtree(stage)
    stage.mkdir()
    app_jar = stage / f"soloscape-{options.project.lower()}.jar"
    args = ["-no-stdlib", "-no-reflect", "-jvm-target", "21", "-Xnested-type-aliases",
            "-opt-in=kotlin.contracts.ExperimentalContracts", "-module-name", options.project,
            "-classpath", os.pathsep.join(str(file) for file in libraries), "-d", str(app_jar)]
    if options.project == "Server":
        args += ["-opt-in=org.rsmod.annotations.InternalApi",
                 f"-Xplugin={compiler_lib / 'kotlin-serialization-compiler-plugin.jar'}"]
    args += [str(file) for file in sources]
    argfile = output / "compiler.args"
    argfile.write_text("\n".join('"' + arg.replace("\\", "/").replace('"', '\\"') + '"'
                                 for arg in args), encoding="utf-8")
    print(f"Compiling {len(sources)} {options.project} source files...", flush=True)
    subprocess.run([str(home / "bin/java.exe"), "-Xmx4g", "-cp", str(compiler_lib / "*"),
                    "org.jetbrains.kotlin.cli.jvm.K2JVMCompiler", "@" + str(argfile)], check=True)

    for library in libraries:
        shutil.copy2(library, stage / library.name)
    # Separate resource jars preserve duplicate resource names across content plugins.
    for module in modules:
        resources = module / "src/main/resources"
        files = sorted(file for file in resources.rglob("*") if file.is_file())
        if files:
            name = module.relative_to(project).as_posix().replace("/", "-")
            with zipfile.ZipFile(stage / f"resources-{name}.jar", "w", zipfile.ZIP_DEFLATED) as bundle:
                # ClassLoader directory lookup is required by Flyway's SQL scanner.
                for directory in sorted(path for path in resources.rglob("*") if path.is_dir()):
                    bundle.writestr(directory.relative_to(resources).as_posix() + "/", b"")
                for file in files:
                    resource_name = file.relative_to(resources).as_posix()
                    if options.project == "Client" and file.name == "rsprox.properties":
                        bundle.writestr(resource_name, file.read_text(encoding="utf-8")
                                        .replace("${version}", "1.0.5"))
                    else:
                        bundle.write(file, resource_name)
    runtime = output / "lib"
    previous = output / f"previous-{time.time_ns()}"
    if runtime.exists():
        # Rename before publishing so a locked jar cannot leave a partial runtime.
        runtime.rename(previous)
    try:
        stage.rename(runtime)
    except OSError:
        if previous.exists():
            previous.rename(runtime)
        raise
    if previous.exists():
        shutil.rmtree(previous, ignore_errors=True)
    print(f"{options.project} built from source. Run {project / 'run.bat'}", flush=True)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print(f"Build failed: {error}", file=sys.stderr)
        sys.exit(1)
