package net.rsprox.proxy.rsa

import java.math.BigInteger
import java.net.InetSocketAddress
import java.nio.file.Files

public fun main() {
    val directory = Files.createTempDirectory("soloscape-public-rsa-test")
    val key = directory.resolve("client.key")
    val fallback = BigInteger("abc", 16)
    val previousProperty = System.getProperty(LocalServerRsa.PUBLIC_KEY_PROPERTY)
    try {
        Files.writeString(key, "Exponent: 10001\nModulus: def\n")
        System.setProperty(LocalServerRsa.PUBLIC_KEY_PROPERTY, key.toString())
        check(LocalServerRsa.resolve(InetSocketAddress("127.0.0.1", 43594), fallback) == BigInteger("def", 16))
        check(LocalServerRsa.resolve(InetSocketAddress("127.0.0.1", 43594), fallback, key) == BigInteger("def", 16))
        check(LocalServerRsa.resolve(InetSocketAddress("::1", 43594), fallback, key) == BigInteger("def", 16))
        Files.writeString(key, "Exponent: 10001\nModulus: 1234\n")
        check(LocalServerRsa.resolve(InetSocketAddress("127.0.0.1", 43594), fallback, key) == BigInteger("1234", 16))
        val missing = directory.resolve("missing.key")
        check(LocalServerRsa.resolve(InetSocketAddress("192.0.2.1", 43594), fallback, missing) == fallback)
        check(LocalServerRsa.resolve(InetSocketAddress("127.0.0.1", 43595), fallback, missing) == fallback)
        check(LocalServerRsa.resolve(InetSocketAddress("127.0.0.1", 43594), fallback, null) == fallback)
        check(LocalServerRsa.resolve(null, fallback, missing) == fallback)
        check(runCatching { LocalServerRsa.resolve(InetSocketAddress("127.0.0.1", 43594), fallback, missing) }.isFailure)
        for (invalid in listOf("Exponent: 3\nModulus: 1234", "Exponent: 10001\nModulus: invalid",
            "Exponent: 10001\nModulus: 0")) {
            Files.writeString(key, invalid)
            check(runCatching { LocalServerRsa.resolve(InetSocketAddress("127.0.0.1", 43594), fallback, key) }.isFailure)
        }
        println("PASS: local IPv4/IPv6 public RSA loading, rotated-key refresh, remote/default preservation and invalid-key errors")
    } finally {
        if (previousProperty == null) System.clearProperty(LocalServerRsa.PUBLIC_KEY_PROPERTY)
        else System.setProperty(LocalServerRsa.PUBLIC_KEY_PROPERTY, previousProperty)
        Files.deleteIfExists(key)
        Files.deleteIfExists(directory)
    }
}
