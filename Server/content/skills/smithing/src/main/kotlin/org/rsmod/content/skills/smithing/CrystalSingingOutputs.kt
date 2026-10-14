package org.rsmod.content.skills.smithing

import dev.openrune.ServerCacheManager
import dev.openrune.rscm.RSCM.asRSCM
import dev.openrune.rscm.RSCMType
import org.rsmod.utils.bits.withBits

fun crystalSingingOutputVars(output: String): Int {
    if (output != "obj.crystal_axe" && output != "obj.crystal_axe_2h") return 0
    val chargeVar = ServerCacheManager.getVarObj(
        "varobj.crystal_weapon_charges".asRSCM(RSCMType.VAROBJ),
    )!!
    return 0.withBits(chargeVar.bits, 10_000)
}
