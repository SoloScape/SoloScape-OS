package org.rsmod.content.other.bots

/** Keep the grave as the first recovery option; use secure Death's Office storage only
 * after repeated, unsuccessful route searches have lasted two minutes of game time. */
internal object BotGraveRecoveryPolicy {
    const val OFFICE_AFTER_UNREACHABLE_CYCLES = 200

    fun shouldUseOffice(firstRouteFailure: Int, cycle: Int): Boolean =
        firstRouteFailure >= 0 && cycle >= firstRouteFailure &&
            cycle - firstRouteFailure >= OFFICE_AFTER_UNREACHABLE_CYCLES
}
