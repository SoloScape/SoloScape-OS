plugins {
    id("base-conventions")
    id("game-cache-test-conventions")
}

tasks.test {
    inputs.dir(rootProject.file(".data/cache/LIVE"))
}

dependencies {
    testImplementation(libs.fastutil)
    testImplementation(libs.rsprot.api)
    testImplementation(libs.or2.all.cache)
    implementation(projects.api.pluginCommons)
    implementation(projects.api.attr)
    implementation(projects.api.config)
    implementation(projects.api.instances)
    implementation(projects.api.mechanics.toxins)
    implementation(projects.api.player)
    implementation(projects.api.registry)
    implementation(projects.api.repo)
    implementation(projects.content.generic.genericLocs)
}
