"""Verify local RSA selection using synthetic public keys; never inspect private keys."""
from pathlib import Path
import subprocess
import sys

import build

root = Path(__file__).resolve().parents[1]
client = root / "Client"
output = client / "build/direct/rsa-verification"
output.mkdir(parents=True, exist_ok=True)
classpath = ";".join(str(jar) for jar in (client / "build/direct/lib").glob("*.jar"))
java = str(build.java_home() / "bin/java.exe")
sources = [client / "proxy/src/test/kotlin/net/rsprox/proxy/rsa/LocalServerRsaVerification.kt"]
if "--packaged" not in sys.argv:
    sources.append(client / "proxy/src/main/kotlin/net/rsprox/proxy/rsa/LocalServerRsa.kt")
subprocess.run([java, "-Xmx1g", "-cp", str(build.compiler() / "*"),
    "org.jetbrains.kotlin.cli.jvm.K2JVMCompiler", "-jvm-target", "21",
    "-Xskip-prerelease-check", "-Xallow-unstable-dependencies", "-no-stdlib", "-no-reflect",
    "-classpath", classpath, "-d", str(output / "tests.jar"), *map(str, sources)], check=True)
subprocess.run([java, "-cp", str(output / "tests.jar") + ";" + classpath,
    "net.rsprox.proxy.rsa.LocalServerRsaVerificationKt"], check=True)
