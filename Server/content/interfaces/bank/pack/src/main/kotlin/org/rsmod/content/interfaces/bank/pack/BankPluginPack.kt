package org.rsmod.content.interfaces.bank.pack

import dev.openrune.pack.PluginPack
import java.io.File

class BankPluginPack : PluginPack() {
    override fun resourceRoot(): File? =
        super.resourceRoot()
            ?: File("../content/interfaces/bank/pack/src/main/resources/pack")
                .takeIf { it.isDirectory }
}
