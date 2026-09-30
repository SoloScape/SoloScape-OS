package org.rsmod.server.install

import com.github.ajalt.clikt.core.CliktCommand
import com.github.ajalt.clikt.core.main
import com.github.ajalt.clikt.parameters.options.default
import com.github.ajalt.clikt.parameters.options.flag
import com.github.ajalt.clikt.parameters.options.option
import com.github.michaelbull.logging.InlineLogger
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.Paths
import java.security.KeyPairGenerator
import java.security.Security
import java.security.interfaces.RSAPrivateKey
import java.security.interfaces.RSAPublicKey
import kotlin.io.path.absolutePathString
import kotlin.io.path.createDirectories
import kotlin.io.path.exists
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.bouncycastle.util.io.pem.PemObject
import org.bouncycastle.util.io.pem.PemWriter
import org.rsmod.api.core.Build
import org.rsmod.server.shared.DirectoryConstants

fun main(args: Array<String>): Unit = GameNetworkRsaGenerator().main(args)

class GameNetworkRsaGenerator : CliktCommand(name = "generate-rsa") {
    private val preferredDir by option("-outputDir")
    private val privateKeyFileName by option("-privateKeyFile").default("game.key")
    private val publicModFileName by option("-publicModFile").default("client.key")
    private val rsproxTargetFileName by option("-rsproxTargetFile").default("rsprox-target.yaml")
    private val fileOverwrite by option("-fileOverwrite").flag(default = false)

    private val logger = InlineLogger()

    private val cacheDir: Path
        get() = preferredDir?.let { Paths.get(it) } ?: DirectoryConstants.DATA_PATH

    override fun run() {
        val gameKeyFile = cacheDir.resolve(privateKeyFileName)
        val clientModFile = cacheDir.resolve(publicModFileName)
        val rsproxTargetFile = cacheDir.resolve(rsproxTargetFileName)
        if (!fileOverwrite) {
            if (gameKeyFile.exists()) {
                logger.info { "RSA key file already found: $gameKeyFile" }
                writeRsproxTargetFromPublicKey(clientModFile, rsproxTargetFile)
                return
            }
        }
        cacheDir.createDirectories()
        logger.info { "Generating RSA key to ${gameKeyFile.absolutePathString()}" }
        create(gameKeyFile, clientModFile, rsproxTargetFile)
        logger.info { "Generated RSA key." }
    }

    private fun create(
        privateKeyFile: Path,
        pubModFile: Path,
        rsproxTargetFile: Path,
        bitLength: Int = 1024,
    ) {
        Security.addProvider(BouncyCastleProvider())

        val keyPairGenerator = KeyPairGenerator.getInstance("RSA", "BC")
        keyPairGenerator.initialize(bitLength)
        val keyPair = keyPairGenerator.generateKeyPair()

        val privateKey = keyPair.private as RSAPrivateKey
        val publicKey = keyPair.public as RSAPublicKey

        val publicExponent = publicKey.publicExponent.toString(16)
        val publicModulus = publicKey.modulus.toString(16)

        PemWriter(Files.newBufferedWriter(privateKeyFile)).use { writer ->
            writer.writeObject(PemObject("RSA PRIVATE KEY", privateKey.encoded))
        }

        Files.newBufferedWriter(pubModFile).use { writer ->
            writer.write("Exponent: $publicExponent")
            writer.newLine()
            writer.write("Modulus: $publicModulus")
        }
        writeRsproxTarget(rsproxTargetFile, publicModulus)

        println()
        println("Place these keys in the client (find BigInteger(\"10001\" in client code):")
        println("--------------------")
        println("exponent: $publicExponent")
        println("modulus: $publicModulus")
        println("--------------------")
        println("Additionally, these details have been written to ${pubModFile.toAbsolutePath()}")
        println(
            "An importable RSProx target has been written to ${rsproxTargetFile.toAbsolutePath()}"
        )
        println()
    }

    private fun writeRsproxTargetFromPublicKey(pubModFile: Path, rsproxTargetFile: Path) {
        if (!pubModFile.exists()) {
            logger.warn { "RSA public modulus file not found: $pubModFile" }
            return
        }
        val modulus =
            Files.readAllLines(pubModFile)
                .firstOrNull { it.startsWith("Modulus:") }
                ?.substringAfter(':')
                ?.trim()
        if (modulus.isNullOrEmpty()) {
            logger.warn { "RSA public modulus not found in: $pubModFile" }
            return
        }
        writeRsproxTarget(rsproxTargetFile, modulus)
        logger.info { "Wrote importable RSProx target to $rsproxTargetFile" }
    }

    private fun writeRsproxTarget(file: Path, modulus: String) {
        Files.newBufferedWriter(file).use { writer ->
            writer.write(
                """
                config:
                  - name: RS Mod Local
                    jav_config_url: https://client.blurite.io/jav_local_${Build.MAJOR}.ws
                    modulus: $modulus
                    revision: ${Build.MAJOR}.1
                    game_server_port: 43594
                """
                    .trimIndent()
            )
            writer.newLine()
        }
    }
}
