package org.rsmod.content.other.bots

internal class BotActivityCache<T> {
    private var eligibilityKey: Any? = null
    private var eligible: List<T>? = null
    private var supplyKey: Any? = null
    private var supplied: List<T>? = null
    private var nextSupplyRefresh = 0

    fun eligible(key: Any, build: () -> List<T>): List<T> {
        if (key != eligibilityKey || eligible == null) {
            eligible = build()
            eligibilityKey = key
            invalidateSupplies()
        }
        return checkNotNull(eligible)
    }

    fun supplied(key: Any, cycle: Int, lifetime: Int, build: () -> List<T>): List<T> {
        if (key != supplyKey || supplied == null || cycle >= nextSupplyRefresh) {
            supplied = build()
            supplyKey = key
            nextSupplyRefresh = cycle + lifetime
        }
        return checkNotNull(supplied)
    }

    fun invalidateSupplies() { supplied = null }
}
