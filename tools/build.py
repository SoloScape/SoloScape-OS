"""Build the client/server with the standalone Kotlin compiler and installed libraries."""
import argparse
from contextlib import contextmanager
import hashlib
import json
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


class Progress:
    def __init__(self, project):
        self.project = project
        self.started = time.monotonic()
        self.terminal = sys.stdout.isatty()
        self.last_label = None

    def update(self, fraction, label):
        elapsed = int(time.monotonic() - self.started)
        filled = int(24 * fraction)
        bar = "#" * filled + "-" * (24 - filled)
        spinner = "|/-\\"[int(time.monotonic() * 4) % 4]
        line = f"{self.project} [{bar}] {fraction:4.0%} {spinner} {label} ({elapsed // 60}:{elapsed % 60:02d})"
        if self.terminal:
            print("\r" + line.ljust(110), end="", flush=True)
        elif label != self.last_label:
            print(line, flush=True)
        self.last_label = label

    def finish(self, label):
        self.update(1, label)
        if self.terminal:
            print(flush=True)


def file_hash(file, cache=None):
    stat = file.stat()
    stamp = [stat.st_size, stat.st_mtime_ns, getattr(stat, "st_ctime_ns", 0)]
    cache_key = str(file.resolve())
    if cache is not None:
        cached = cache.get(cache_key)
        if cached and cached.get("stamp") == stamp:
            digest = cached.get("sha256")
            if isinstance(digest, str):
                return digest

    digest = hashlib.sha256()
    with file.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    value = digest.hexdigest()
    if cache is not None:
        cache[cache_key] = {"stamp": stamp, "sha256": value}
    return value


def remember_hash(file, digest, cache):
    stat = file.stat()
    cache[str(file.resolve())] = {
        "stamp": [stat.st_size, stat.st_mtime_ns, getattr(stat, "st_ctime_ns", 0)],
        "sha256": digest,
    }


def load_hash_cache(file):
    try:
        value = json.loads(file.read_text(encoding="utf-8"))
        if value.get("version") == 1 and isinstance(value.get("files"), dict):
            return value["files"]
    except (OSError, ValueError, AttributeError):
        pass
    return {}


def save_hash_cache(file, cache):
    temporary = file.with_suffix(".tmp")
    temporary.write_text(json.dumps({"version": 1, "files": cache}), encoding="utf-8")
    temporary.replace(file)


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True).encode("utf-8")).hexdigest()


@contextmanager
def build_lock(output):
    with (output / "build.lock").open("a+b") as lock:
        lock.seek(0)
        if lock.read(1) == b"":
            lock.write(b"0")
            lock.flush()
        lock.seek(0)
        if os.name == "nt":
            import msvcrt
            try:
                msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError as error:
                raise RuntimeError("Another build of this project is already running.") from error
        else:
            import fcntl
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        try:
            yield
        finally:
            lock.seek(0)
            if os.name == "nt":
                msvcrt.locking(lock.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(lock, fcntl.LOCK_UN)


def reuse_file(source, destination):
    try:
        os.link(source, destination)
    except OSError:
        shutil.copy2(source, destination)


def run_compiler(command, logfile, progress, label):
    with logfile.open("w", encoding="utf-8") as log:
        process = subprocess.Popen(command, stdout=log, stderr=subprocess.STDOUT)
        while process.poll() is None:
            progress.update(0.15, label)
            try:
                process.wait(timeout=0.25)
            except subprocess.TimeoutExpired:
                pass
    if process.returncode:
        if progress.terminal:
            print()
        print(logfile.read_text(encoding="utf-8", errors="replace")[-8000:], file=sys.stderr)
        raise RuntimeError(f"Compilation failed; see {logfile}")


def java_home():
    candidates = []
    configured = os.environ.get("JAVA_HOME")
    if configured:
        candidates.append(Path(configured))

    path_java = shutil.which("java")
    if path_java:
        candidates.append(Path(path_java).resolve().parent.parent)

    program_files = Path(os.environ.get("ProgramFiles", "C:/Program Files"))
    for pattern in (
        "Eclipse Adoptium/jdk-21*",
        "Java/jdk-21*",
        "Microsoft/jdk-21*",
        "Zulu/zulu-21*",
    ):
        candidates += sorted(program_files.glob(pattern), reverse=True)

    seen = set()
    for home in candidates:
        home = home.resolve()
        if home in seen:
            continue
        seen.add(home)
        java = home / "bin/java.exe"
        if not java.is_file() or not (home / "release").is_file():
            continue
        version = subprocess.run([str(java), "-version"], capture_output=True, text=True)
        output = version.stdout + version.stderr
        if version.returncode == 0 and 'version "21' in output:
            return home
    raise RuntimeError(
        "Install Java 21, put it on PATH, or set JAVA_HOME to its installation directory."
    )


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


def validate_server_runtime(jar):
    with zipfile.ZipFile(jar) as bundle:
        module = bundle.read("org/rsmod/module/ExtendedModule.class")
    if b"<init>" not in module:
        raise RuntimeError("Server compiler produced an incomplete ExtendedModule class; "
                           "refusing to publish or reuse it. Run build.bat --rebuild.")


def build_project(project_name, rebuild, home, compiler_lib):
    project = ROOT / project_name
    progress = Progress(project_name)
    progress.update(0, "Checking inputs")
    installed = project / ("build/install/rsprox/lib" if project_name == "Client"
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
    if project_name == "Server":
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
    internal_names |= {"rsprox"} if project_name == "Client" else {"app", "install", "central-common"}
    internal_versions = {"1.0.5"} if project_name == "Client" else {"0.0.1", "2.0.1-sqlite"}
    internal_files = {f"{name}-{version}.jar" for name in internal_names for version in internal_versions}
    libraries = sorted(file for file in installed.glob("*.jar") if file.name not in internal_files)
    if not libraries:
        raise RuntimeError("The distribution has no external dependency libraries.")

    output = project / "build/direct"
    output.mkdir(parents=True, exist_ok=True)
    with build_lock(output):
        build_runtime(project_name, rebuild, home, compiler_lib, project, output,
                      modules, sources, libraries, progress)


def build_runtime(project_name, rebuild, home, compiler_lib, project, output,
                  modules, sources, libraries, progress):
    runtime = output / "lib"
    manifest_file = output / "build-state.json"
    hash_cache_file = output / "hash-cache.json"
    hash_cache = load_hash_cache(hash_cache_file)

    def flush_hash_cache():
        try:
            save_hash_cache(hash_cache_file, hash_cache)
        except OSError:
            # The hash cache is only a speed optimization; never fail a build because of it.
            pass

    try:
        state = json.loads(manifest_file.read_text(encoding="utf-8"))
        if not isinstance(state, dict) or state.get("version") != 2:
            state = {}
    except (OSError, ValueError):
        state = {}
    artifacts = state.get("artifacts", {})

    def hash_file(file):
        return file_hash(file, hash_cache)

    def valid_artifact(name):
        file = runtime / name
        return file.is_file() and hash_file(file) == artifacts.get(name)

    progress.update(0.05, "Checking source and dependency changes")
    library_hashes = {file.name: hash_file(file) for file in libraries}
    compiler_hashes = {file.name: hash_file(file) for file in sorted(compiler_lib.glob("*.jar"))}
    source_hashes = {file: hash_file(file) for file in sources}
    backend_threads = 1 if project_name == "Server" else 0
    compiler_flags = [project_name, "jvm21", "nested-type-aliases", "contracts",
                      f"backend-threads={backend_threads}",
                      "fast-jar-file-system" if project_name == "Client" else "standard-jar-file-system",
                      "InternalApi+serialization" if project_name == "Server" else ""]
    common_inputs = {
        "compiler": compiler_hashes,
        "kotlin": KOTLIN_VERSION,
        "jdk": (home / "release").read_text(encoding="utf-8"),
        "flags": compiler_flags,
        "libraries": library_hashes,
    }

    # Most client edits are in GUI/proxy/transcriber code, while the historical protocol
    # revisions are large and comparatively stable. Build that closed dependency layer once
    # and compile the small app layer against it. -Xfriend-paths preserves Kotlin `internal`
    # access that previously worked because the whole client was one compiler invocation.
    core_sources = []
    if project_name == "Client":
        core_roots = {"cache", "shared", "protocol"}
        core_modules = [module for module in modules
                        if module.relative_to(project).parts[0] in core_roots]
        core_sources = sorted(file for module in core_modules
                              for file in (module / "src/main").rglob("*.kt"))
    core_source_set = set(core_sources)
    app_sources = [file for file in sources if file not in core_source_set]
    core_name = "soloscape-client-core.jar" if core_sources else None
    core_code_key = None
    if core_sources:
        core_code_key = fingerprint({
            "common": common_inputs,
            "module": "ClientCore",
            "sources": {file.relative_to(project).as_posix(): source_hashes[file]
                        for file in core_sources},
        })
        code_key = fingerprint({
            "common": common_inputs,
            "module": project_name,
            "core": core_code_key,
            "sources": {file.relative_to(project).as_posix(): source_hashes[file]
                        for file in app_sources},
        })
    else:
        code_key = fingerprint({
            "common": common_inputs,
            "module": project_name,
            "sources": {file.relative_to(project).as_posix(): source_hashes[file]
                        for file in app_sources},
        })

    resource_inputs = {}
    for module in modules:
        resources = module / "src/main/resources"
        files = sorted(file for file in resources.rglob("*") if file.is_file())
        if files:
            name = module.relative_to(project).as_posix().replace("/", "-")
            directories = sorted(path for path in resources.rglob("*") if path.is_dir())
            key = fingerprint({"packaging": 1, "client_version": "1.0.5",
                               "files": {file.relative_to(resources).as_posix(): hash_file(file)
                                         for file in files},
                               "directories": [path.relative_to(resources).as_posix() for path in directories]})
            resource_inputs[f"resources-{name}.jar"] = (key, resources, files, directories)
    resource_keys = {name: value[0] for name, value in resource_inputs.items()}
    app_name = f"soloscape-{project_name.lower()}.jar"
    expected = {app_name, *library_hashes, *resource_keys}
    if core_name:
        expected.add(core_name)
    if (not rebuild and state.get("code_key") == code_key
            and state.get("core_code_key") == core_code_key
            and state.get("resource_keys") == resource_keys
            and set(artifacts) == expected
            and runtime.is_dir()
            and {file.name for file in runtime.iterdir()} == expected
            and all(valid_artifact(name) for name in expected)):
        if project_name == "Server":
            validate_server_runtime(runtime / app_name)
        flush_hash_cache()
        progress.finish("Up to date - compilation skipped")
        return

    stage = output / "staging"
    if stage.exists():
        shutil.rmtree(stage)
    stage.mkdir()

    def compile_sources(source_files, destination, module_name, argfile_name,
                        extra_classpath=(), friend_path=None, label=None):
        classpath = [*libraries, *extra_classpath]
        args = ["-no-stdlib", "-no-reflect", "-jvm-target", "21",
                f"-Xbackend-threads={backend_threads}",
                "-Xnested-type-aliases", "-opt-in=kotlin.contracts.ExperimentalContracts",
                "-module-name", module_name,
                "-classpath", os.pathsep.join(str(file) for file in classpath),
                "-d", str(destination)]
        if project_name == "Client":
            args += ["-Xuse-fast-jar-file-system"]
        if friend_path is not None:
            args += [f"-Xfriend-paths={friend_path}"]
        if project_name == "Server":
            args += ["-opt-in=org.rsmod.annotations.InternalApi",
                     f"-Xplugin={compiler_lib / 'kotlin-serialization-compiler-plugin.jar'}"]
        args += [str(file) for file in source_files]
        argfile = output / argfile_name
        argfile.write_text("\n".join('"' + arg.replace("\\", "/").replace('"', '\\"') + '"'
                                     for arg in args), encoding="utf-8")
        run_compiler([str(home / "bin/java.exe"), "-Xmx4g", "-cp", str(compiler_lib / "*"),
                      "org.jetbrains.kotlin.cli.jvm.K2JVMCompiler", "@" + str(argfile)],
                     output / ("compile-core.log" if core_name and destination.name == core_name
                               else "compile.log"),
                     progress, label or f"Compiling {len(source_files)} files")

    core_jar = None
    if core_name:
        core_jar = stage / core_name
        if (not rebuild and state.get("core_code_key") == core_code_key
                and valid_artifact(core_name)):
            reuse_file(runtime / core_name, core_jar)
            progress.update(0.12, f"Reusing client core ({len(core_sources)} files)")
        else:
            compile_sources(core_sources, core_jar, "ClientCore", "compiler-core.args",
                            label=f"Compiling client core ({len(core_sources)} files)")

    app_jar = stage / app_name
    if not rebuild and state.get("code_key") == code_key and valid_artifact(app_name):
        reuse_file(runtime / app_name, app_jar)
        progress.update(0.75, "Reusing compiled app code")
    else:
        extra_classpath = (core_jar,) if core_jar is not None else ()
        compile_sources(app_sources, app_jar, project_name, "compiler.args",
                        extra_classpath=extra_classpath,
                        friend_path=core_jar,
                        label=f"Compiling app layer ({len(app_sources)} files)"
                              if core_jar is not None else f"Compiling {len(app_sources)} files")
        progress.update(0.75, "Compilation complete")
    if project_name == "Server":
        validate_server_runtime(app_jar)

    for index, library in enumerate(libraries):
        if valid_artifact(library.name) and artifacts[library.name] == library_hashes[library.name]:
            reuse_file(runtime / library.name, stage / library.name)
        else:
            shutil.copy2(library, stage / library.name)
        progress.update(0.75 + 0.10 * (index + 1) / len(libraries), "Preparing libraries")
    # Separate resource jars preserve duplicate resource names across content plugins.
    for index, (name, (key, resources, files, directories)) in enumerate(resource_inputs.items()):
        if state.get("resource_keys", {}).get(name) == key and valid_artifact(name):
            reuse_file(runtime / name, stage / name)
        else:
            with zipfile.ZipFile(stage / name, "w", zipfile.ZIP_DEFLATED) as bundle:
                # ClassLoader directory lookup is required by Flyway's SQL scanner.
                for directory in directories:
                    bundle.writestr(directory.relative_to(resources).as_posix() + "/", b"")
                for file in files:
                    resource_name = file.relative_to(resources).as_posix()
                    if project_name == "Client" and file.name == "rsprox.properties":
                        bundle.writestr(resource_name, file.read_text(encoding="utf-8")
                                        .replace("${version}", "1.0.5"))
                    else:
                        bundle.write(file, resource_name)
        progress.update(0.85 + 0.10 * (index + 1) / len(resource_inputs), "Packaging resources")

    new_artifacts = {file.name: file_hash(file) for file in stage.iterdir()}
    new_state = {"version": 2, "code_key": code_key, "core_code_key": core_code_key,
                 "resource_keys": resource_keys, "artifacts": new_artifacts}
    progress.update(0.95, "Publishing build")
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

    # Seed the metadata cache for freshly published output so the next no-change build
    # can validate artifacts without rereading every dependency jar from disk.
    for name, digest in new_artifacts.items():
        remember_hash(runtime / name, digest, hash_cache)
    flush_hash_cache()

    temporary_manifest = output / "build-state.tmp"
    temporary_manifest.write_text(json.dumps(new_state, indent=2), encoding="utf-8")
    temporary_manifest.replace(manifest_file)
    progress.finish("Built successfully")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", choices=["Client", "Server"])
    parser.add_argument("--rebuild", action="store_true", help="Force compilation even when inputs are unchanged")
    options = parser.parse_args()
    build_project(options.project, options.rebuild, java_home(), compiler())


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print(f"Build failed: {error}", file=sys.stderr)
        sys.exit(1)
