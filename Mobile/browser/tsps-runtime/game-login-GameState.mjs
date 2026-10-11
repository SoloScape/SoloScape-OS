// Generated from pinned TSPS client/game/login/GameState.ts
// BSD-2-Clause: see Mobile/licenses/tsps-BSD-2-Clause.txt.
// Regenerate using: node scripts/adapt-tsps-loading.mjs
export var GameState = /*#__PURE__*/ function(GameState) {
    GameState[GameState["DOWNLOADING"] = -1] = "DOWNLOADING";
    GameState[GameState["LOADING"] = 0] = "LOADING";
    GameState[GameState["LOGIN_SCREEN"] = 10] = "LOGIN_SCREEN";
    GameState[GameState["CONNECTING"] = 20] = "CONNECTING";
    GameState[GameState["LOADING_GAME"] = 25] = "LOADING_GAME";
    GameState[GameState["LOGGED_IN"] = 30] = "LOGGED_IN";
    GameState[GameState["RECONNECTING"] = 40] = "RECONNECTING";
    GameState[GameState["PLEASE_WAIT"] = 45] = "PLEASE_WAIT";
    GameState[GameState["SPECIAL_LOGIN"] = 50] = "SPECIAL_LOGIN";
    GameState[GameState["CONNECTION_LOST"] = 100] = "CONNECTION_LOST";
    GameState[GameState["ERROR"] = 1000] = "ERROR";
    return GameState;
}({});
export var LoginIndex = /*#__PURE__*/ function(LoginIndex) {
    LoginIndex[LoginIndex["WELCOME"] = 0] = "WELCOME";
    LoginIndex[LoginIndex["WARNING"] = 1] = "WARNING";
    LoginIndex[LoginIndex["LOGIN_FORM"] = 2] = "LOGIN_FORM";
    LoginIndex[LoginIndex["INVALID_CREDENTIALS"] = 3] = "INVALID_CREDENTIALS";
    LoginIndex[LoginIndex["AUTHENTICATOR"] = 4] = "AUTHENTICATOR";
    LoginIndex[LoginIndex["FORGOT_PASSWORD"] = 5] = "FORGOT_PASSWORD";
    LoginIndex[LoginIndex["MESSAGE"] = 6] = "MESSAGE";
    LoginIndex[LoginIndex["DATE_OF_BIRTH"] = 7] = "DATE_OF_BIRTH";
    LoginIndex[LoginIndex["NOT_ELIGIBLE"] = 8] = "NOT_ELIGIBLE";
    LoginIndex[LoginIndex["TRY_AGAIN"] = 9] = "TRY_AGAIN";
    LoginIndex[LoginIndex["WELCOME_DISPLAY_NAME"] = 10] = "WELCOME_DISPLAY_NAME";
    LoginIndex[LoginIndex["WORLD_HOP_WARNING"] = 11] = "WORLD_HOP_WARNING";
    LoginIndex[LoginIndex["TERMS"] = 12] = "TERMS";
    LoginIndex[LoginIndex["MUST_ACCEPT_TERMS"] = 13] = "MUST_ACCEPT_TERMS";
    LoginIndex[LoginIndex["BANNED"] = 14] = "BANNED";
    LoginIndex[LoginIndex["OK_MESSAGE"] = 24] = "OK_MESSAGE";
    LoginIndex[LoginIndex["DOB_NOT_SET"] = 32] = "DOB_NOT_SET";
    LoginIndex[LoginIndex["DOWNLOAD_LAUNCHER"] = 33] = "DOWNLOAD_LAUNCHER";
    return LoginIndex;
}({});
