"""Friendly Windows build wrapper with progress estimates and a persistent build log."""
import argparse
import json
from pathlib import Path
import re
import sys
import time

import build as build_impl

ROOT = Path(__file__).resolve().parents[1]
LOG_FILE = ROOT / "build.log"
TIMINGS_FILE = ROOT / ".build-tools" / "build-progress.json"
COMPILE_RE = re.compile(r"^Compiling(?: client core| app layer)? \(?([0-9]+) files\)?$")


class BuildLogger:
    def __init__(self, path):
        self.path = path
        self.stream = None

    def __enter__(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.stream = self.path.open("w", encoding="utf-8", newline="\n")
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        if self.stream is not None:
            self.stream.close()

    def write(self, message):
        stamp = time.strftime("%Y-%m-%d %H:%M:%S")
        self.stream.write(f"[{stamp}] {message.rstrip()}\n")
        self.stream.flush()

    def append_file(self, title, path):
        if not path.is_file():
            return
        text = path.read_text(encoding="utf-8", errors="replace")
        if not text.strip():
            return
        self.write(f"--- {title}: {path.relative_to(ROOT)} ---")
        self.stream.write(text)
        if not text.endswith("\n"):
            self.stream.write("\n")
        self.stream.flush()


def load_timings():
    try:
        value = json.loads(TIMINGS_FILE.read_text(encoding="utf-8"))
        if isinstance(value, dict):
            return value
    except (OSError, ValueError):
        pass
    return {}


def save_timings(value):
    try:
        TIMINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
        temporary = TIMINGS_FILE.with_suffix(".tmp")
        temporary.write_text(json.dumps(value, indent=2), encoding="utf-8")
        temporary.replace(TIMINGS_FILE)
    except OSError:
        pass


LOGGER = None
TIMINGS = load_timings()
PROGRESS_INSTANCES = []


class FriendlyProgress(build_impl.Progress):
    """Show estimated source progress while Kotlin is inside one long compiler call.

    The standalone Kotlin CLI does not expose per-source completion callbacks during
    analysis/codegen. The counter is therefore explicitly marked as estimated and is
    based on source count plus learned seconds-per-file from earlier local builds.
    Real build-stage percentages remain authoritative before and after compilation.
    """

    def __init__(self, project):
        super().__init__(project)
        self.last_fraction = 0.0
        self.compile_label = None
        self.compile_total = 0
        self.compile_started = None
        self.compile_base = 0.15
        self.last_non_tty_emit = 0.0
        self.saw_compile = False
        PROGRESS_INSTANCES.append(self)

    def _timing_key(self, label):
        if label.startswith("Compiling client core"):
            return f"{self.project}:core"
        if label.startswith("Compiling app layer"):
            return f"{self.project}:app"
        return f"{self.project}:all"

    def _record_compile_timing(self):
        if self.compile_started is None or not self.compile_label or self.compile_total <= 0:
            return
        elapsed = max(0.1, time.monotonic() - self.compile_started)
        seconds_per_file = elapsed / self.compile_total
        key = self._timing_key(self.compile_label)
        previous = TIMINGS.get(key)
        if isinstance(previous, (int, float)) and previous > 0:
            seconds_per_file = previous * 0.65 + seconds_per_file * 0.35
        TIMINGS[key] = seconds_per_file
        save_timings(TIMINGS)
        if LOGGER:
            LOGGER.write(
                f"{self.project}: {self.compile_label} finished in {elapsed:.1f}s "
                f"({self.compile_total} source files)"
            )
        self.compile_started = None
        self.compile_label = None
        self.compile_total = 0

    def _start_compile(self, label, total):
        if self.compile_label != label:
            self._record_compile_timing()
            self.compile_label = label
            self.compile_total = total
            self.compile_started = time.monotonic()
            self.compile_base = max(0.15, self.last_fraction)
            self.saw_compile = True
            if LOGGER:
                LOGGER.write(f"{self.project}: {label}")

    def _estimated_compile_progress(self, label, total):
        self._start_compile(label, total)
        elapsed = max(0.0, time.monotonic() - self.compile_started)
        key = self._timing_key(label)
        seconds_per_file = TIMINGS.get(key)
        if not isinstance(seconds_per_file, (int, float)) or seconds_per_file <= 0:
            seconds_per_file = 0.025 if self.project == "Server" else 0.020
        expected = max(10.0, total * seconds_per_file)
        ratio = min(0.985, elapsed / max(expected, elapsed + 10.0))
        estimated_done = min(total - 1, int(total * ratio)) if total > 1 else 0
        fraction = self.compile_base + (0.74 - self.compile_base) * ratio
        return fraction, f"Compiling ~{estimated_done}/{total} files (estimated)"

    def update(self, fraction, label):
        match = COMPILE_RE.match(label)
        if fraction <= 0.15 and match:
            fraction, display_label = self._estimated_compile_progress(label, int(match.group(1)))
        else:
            if self.compile_started is not None:
                self._record_compile_timing()
            display_label = label

        fraction = max(self.last_fraction, min(1.0, fraction))
        self.last_fraction = fraction
        elapsed = int(time.monotonic() - self.started)
        filled = min(24, int(24 * fraction))
        bar = "#" * filled + "-" * (24 - filled)
        spinner = "|/-\\"[int(time.monotonic() * 4) % 4]
        line = (
            f"{self.project} [{bar}] {fraction:5.1%} {spinner} "
            f"{display_label} ({elapsed // 60}:{elapsed % 60:02d})"
        )

        now = time.monotonic()
        if self.terminal:
            print("\r" + line.ljust(120), end="", flush=True)
        elif label != self.last_label or now - self.last_non_tty_emit >= 10.0:
            print(line, flush=True)
            self.last_non_tty_emit = now

        if LOGGER and label != self.last_label and not match:
            LOGGER.write(f"{self.project}: {label} ({fraction:.1%})")
        self.last_label = label

    def finish(self, label):
        if self.compile_started is not None:
            self._record_compile_timing()
        self.update(1.0, label)
        if self.terminal:
            print(flush=True)


def append_compiler_logs(project_name, progress):
    if not progress or not progress.saw_compile:
        return
    output = ROOT / project_name / "build" / "direct"
    LOGGER.append_file(f"{project_name} compiler output", output / "compile.log")
    LOGGER.append_file(f"{project_name} core compiler output", output / "compile-core.log")


def build_one(project_name, rebuild, home, compiler_lib):
    before = len(PROGRESS_INSTANCES)
    LOGGER.write(f"Starting {project_name} build{' (--rebuild)' if rebuild else ''}")
    try:
        build_impl.build_project(project_name, rebuild, home, compiler_lib)
    except Exception:
        progress = PROGRESS_INSTANCES[-1] if len(PROGRESS_INSTANCES) > before else None
        append_compiler_logs(project_name, progress)
        raise
    progress = PROGRESS_INSTANCES[-1] if len(PROGRESS_INSTANCES) > before else None
    append_compiler_logs(project_name, progress)
    LOGGER.write(f"{project_name} build completed successfully")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", choices=["All", "Client", "Server"])
    parser.add_argument("--rebuild", action="store_true", help="Force compilation even when inputs are unchanged")
    options = parser.parse_args()

    build_impl.Progress = FriendlyProgress
    home = build_impl.java_home()
    compiler_lib = build_impl.compiler()

    projects = ["Client", "Server"] if options.project == "All" else [options.project]
    for index, project_name in enumerate(projects, 1):
        if len(projects) > 1:
            print(f"[{index}/{len(projects)}] Building {project_name.lower()}...")
        build_one(project_name, options.rebuild, home, compiler_lib)


if __name__ == "__main__":
    with BuildLogger(LOG_FILE) as logger:
        LOGGER = logger
        LOGGER.write("Build started")
        try:
            main()
        except (RuntimeError, OSError, build_impl.subprocess.CalledProcessError) as error:
            if sys.stdout.isatty():
                print()
            print(f"Build failed: {error}", file=sys.stderr)
            LOGGER.write(f"Build failed: {error}")
            sys.exit(1)
        except KeyboardInterrupt:
            if sys.stdout.isatty():
                print()
            print("Build cancelled.", file=sys.stderr)
            LOGGER.write("Build cancelled")
            sys.exit(130)
        else:
            LOGGER.write("Build finished successfully")
            print(f"Build log: {LOG_FILE}")
