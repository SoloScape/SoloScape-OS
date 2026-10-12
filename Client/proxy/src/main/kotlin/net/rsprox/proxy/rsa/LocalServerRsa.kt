package net.rsprox.proxy.rsa

import java.math.BigInteger
import java.net.InetSocketAddress
import java.net.SocketAddress
import java.nio.file.Files
import java.nio.file.Path

/** Resolve the local SoloScape server's public key without touching its private key. */
public object LocalServerRsa {
    public const val PUBLIC_KEY_PROPERTY: String = "soloscape.publicKeyFile"

    public fun resolve(
        upstream: SocketAddress?,
        configured: BigInteger,
        publicKeyFile: Path? = System.getProperty(PUBLIC_KEY_PROPERTY)?.let { Path.of(it) },
    ): BigInteger {
        val endpoint = upstream as? InetSocketAddress ?: return configured
        if (endpoint.address?.isLoopbackAddress != true || endpoint.port != 43594 || publicKeyFile == null) {
            return configured
        }
        check(Files.isRegularFile(publicKeyFile)) {
            "SoloScape public RSA key is missing: $publicKeyFile. Start the server before logging in."
        }
        val fields = Files.readAllLines(publicKeyFile).mapNotNull { line ->
            val parts = line.split(':', limit = 2)
            if (parts.size == 2) parts[0].trim() to parts[1].trim() else null
        }.toMap()
        check(fields["Exponent"]?.equals("10001", ignoreCase = true) == true) {
            "SoloScape public RSA key must use exponent 10001: $publicKeyFile"
        }
        val modulus = fields["Modulus"]
        check(modulus != null && modulus.matches(Regex("[0-9a-fA-F]+"))) {
            "SoloScape public RSA modulus is missing or invalid: $publicKeyFile"
        }
        return BigInteger(modulus, 16).also {
            check(it.signum() > 0) { "SoloScape public RSA modulus must be positive: $publicKeyFile" }
        }
    }
}
