// Generated from pinned TSPS client/rs/model/skeletal/CurveInterpType.ts.
// BSD-2-Clause: licenses/tsps-BSD-2-Clause.txt. Regenerate: node scripts/adapt-tsps-skeletal.mjs.
export var CurveInterpType = /*#__PURE__*/ function(CurveInterpType) {
    CurveInterpType[CurveInterpType["TYPE_0"] = 0] = "TYPE_0";
    CurveInterpType[CurveInterpType["TYPE_1"] = 1] = "TYPE_1";
    CurveInterpType[CurveInterpType["TYPE_2"] = 2] = "TYPE_2";
    CurveInterpType[CurveInterpType["TYPE_3"] = 3] = "TYPE_3";
    CurveInterpType[CurveInterpType["TYPE_4"] = 4] = "TYPE_4";
    return CurveInterpType;
}({});
export function getInterpTypeForId(id) {
    if (id < 0 || id > 4) {
        return 0;
    }
    return id;
}
