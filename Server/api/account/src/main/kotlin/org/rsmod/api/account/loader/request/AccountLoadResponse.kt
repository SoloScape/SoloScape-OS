package org.rsmod.api.account.loader.request

import dev.or2.central.account.AccountData
import org.rsmod.api.account.character.CharacterDataTransformer

public sealed class AccountLoadResponse {
    public sealed class Ok : AccountLoadResponse() {
        public abstract val auth: AccountLoadAuth
        public abstract val account: AccountData
        public abstract val transforms: List<CharacterDataTransformer<*>>

        public data class NewAccount(
            override val auth: AccountLoadAuth,
            override val account: AccountData,
            override val transforms: List<CharacterDataTransformer<*>>,
        ) : Ok()

        public data class LoadAccount(
            override val auth: AccountLoadAuth,
            override val account: AccountData,
            override val transforms: List<CharacterDataTransformer<*>>,
        ) : Ok()
    }

    public sealed class Err : AccountLoadResponse() {
        public data object AccountNotFound : Err()

        public data object ShutdownInProgress : Err()

        public data object InternalServiceError : Err()

        public data object Timeout : Err()

        public data class Exception(val reason: Throwable) : Err()
    }
}

public fun AccountLoadResponse.Ok.isNewAccount(): Boolean {
    // Registration may create the character before the game loader sees it. In that
    // case it is a LoadAccount response, but still needs first-login initialisation.
    val character = account.characterData
    return this is AccountLoadResponse.Ok.NewAccount ||
        (character.lastLogin == null && character.lastLogout == null)
}
