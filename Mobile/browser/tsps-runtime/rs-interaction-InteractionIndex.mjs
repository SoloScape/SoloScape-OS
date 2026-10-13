// Generated from pinned RSPSApp/tsps: client/rs/interaction/InteractionIndex.ts
// BSD-2-Clause, see licenses/tsps-BSD-2-Clause.txt. Run: node scripts/adapt-tsps-movement.mjs.
export const NO_INTERACTION = -1;
export const PLAYER_INDEX_OFFSET = 0x8000;
export function encodeInteractionIndex(targetType, targetId) {
    const normalizedId = targetId | 0;
    if (normalizedId < 0) {
        return NO_INTERACTION;
    }
    if (targetType === "npc") {
        return normalizedId;
    }
    return PLAYER_INDEX_OFFSET + normalizedId;
}
export function encodeInteractionTarget(target) {
    if (!target) {
        return NO_INTERACTION;
    }
    return encodeInteractionIndex(target.type, target.id);
}
export function decodeInteractionIndex(index) {
    if (!isValidInteractionIndex(index)) {
        return null;
    }
    if (isNpcInteractionIndex(index)) {
        return {
            type: "npc",
            id: index
        };
    }
    return {
        type: "player",
        id: index - PLAYER_INDEX_OFFSET
    };
}
export function decodeInteractionTarget(index) {
    const decoded = decodeInteractionIndex(index);
    return decoded ?? undefined;
}
export function isValidInteractionIndex(index) {
    return Number.isInteger(index) && index >= 0;
}
export function isNpcInteractionIndex(index) {
    return index >= 0 && index < PLAYER_INDEX_OFFSET;
}
export function isPlayerInteractionIndex(index) {
    return index >= PLAYER_INDEX_OFFSET;
}
export function clampInteractionIndex(index) {
    if (typeof index !== "number") {
        return NO_INTERACTION;
    }
    if (index < NO_INTERACTION) {
        return NO_INTERACTION;
    }
    return index | 0;
}
export function resolveInteractionTargetId(index) {
    if (!isValidInteractionIndex(index)) {
        return undefined;
    }
    if (isNpcInteractionIndex(index)) {
        return index;
    }
    return index - PLAYER_INDEX_OFFSET;
}
