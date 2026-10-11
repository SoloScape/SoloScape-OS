// Generated from pinned TSPS client/rs/model/skeletal/CurveType.ts.
// BSD-2-Clause: licenses/tsps-BSD-2-Clause.txt. Regenerate: node scripts/adapt-tsps-skeletal.mjs.
export var CurveType = /*#__PURE__*/ function(CurveType) {
    CurveType[CurveType["TYPE_0"] = 0] = "TYPE_0";
    CurveType[CurveType["TYPE_1"] = 1] = "TYPE_1";
    CurveType[CurveType["TYPE_2"] = 2] = "TYPE_2";
    CurveType[CurveType["TYPE_3"] = 3] = "TYPE_3";
    CurveType[CurveType["TYPE_4"] = 4] = "TYPE_4";
    CurveType[CurveType["TYPE_5"] = 5] = "TYPE_5";
    CurveType[CurveType["TYPE_6"] = 6] = "TYPE_6";
    CurveType[CurveType["TYPE_7"] = 7] = "TYPE_7";
    CurveType[CurveType["TYPE_8"] = 8] = "TYPE_8";
    CurveType[CurveType["TYPE_9"] = 9] = "TYPE_9";
    CurveType[CurveType["TYPE_10"] = 10] = "TYPE_10";
    CurveType[CurveType["TYPE_11"] = 11] = "TYPE_11";
    CurveType[CurveType["TYPE_12"] = 12] = "TYPE_12";
    CurveType[CurveType["TYPE_13"] = 13] = "TYPE_13";
    CurveType[CurveType["TYPE_14"] = 14] = "TYPE_14";
    CurveType[CurveType["TYPE_15"] = 15] = "TYPE_15";
    CurveType[CurveType["TYPE_16"] = 16] = "TYPE_16";
    return CurveType;
}({});
export function getCurveTypeForId(id) {
    if (id < 0 || id > 16) {
        return 0;
    }
    return id;
}
const CURVE_INDICES = [
    -1,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    0,
    1,
    2,
    3,
    4,
    5,
    0
];
export function getCurveIndex(type) {
    return CURVE_INDICES[type];
}
