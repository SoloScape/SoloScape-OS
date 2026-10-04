import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

plugins {
    kotlin("jvm") version "2.1.10"
    kotlin("plugin.serialization") version "2.1.10"
    application
    `java-library`
}

kotlin {
    jvmToolchain(21)
}

java {
    withSourcesJar()
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

application {
    mainClass.set("dev.or2.central.CentralBootstrapKt")
}

dependencies {
    implementation(project(":central-common"))
    implementation("dev.or2:central-worldlink:2.0.1") {
        exclude(group = "dev.or2", module = "central-common")
    }

    implementation(platform("io.ktor:ktor-bom:3.1.1"))
    implementation("io.ktor:ktor-server-netty")
    implementation("io.ktor:ktor-server-core")
    implementation("io.ktor:ktor-server-content-negotiation")
    implementation("io.ktor:ktor-serialization-kotlinx-json")
    implementation("io.ktor:ktor-server-status-pages")
    implementation("io.ktor:ktor-server-forwarded-header")
    implementation("io.ktor:ktor-server-config-yaml")

    implementation("com.zaxxer:HikariCP:6.2.1")
    implementation("org.xerial:sqlite-jdbc:3.49.1.0")
    implementation("org.flywaydb:flyway-core:11.3.1")

    implementation("com.sksamuel.hoplite:hoplite-core:2.9.0")
    implementation("com.sksamuel.hoplite:hoplite-yaml:2.9.0")

    implementation("io.insert-koin:koin-ktor:4.0.2")
    implementation("io.insert-koin:koin-logger-slf4j:4.0.2")

    implementation("io.netty:netty-handler:4.1.118.Final")
    implementation("ch.qos.logback:logback-classic:1.5.16")
    implementation("org.reflections:reflections:0.10.2")
    implementation("net.dv8tion:JDA:5.5.1")
    implementation("org.yaml:snakeyaml:2.3")

    testImplementation(kotlin("test"))
    testImplementation("org.junit.jupiter:junit-jupiter:5.11.4")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher:1.11.4")
}

tasks.withType<KotlinCompile>().configureEach {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_21)
    }
}

tasks.test {
    useJUnitPlatform()
}

tasks.named<JavaExec>("run") {
    workingDir = rootProject.layout.projectDirectory.asFile
}

