// Generated from pinned TSPS client/rs/model/skeletal/SkeletalTransformType.ts.
// BSD-2-Clause: licenses/tsps-BSD-2-Clause.txt. Regenerate: node scripts/adapt-tsps-skeletal.mjs.
export var SkeletalTransformType = /*#__PURE__*/ function(SkeletalTransformType) {
    SkeletalTransformType[SkeletalTransformType["TYPE_0"] = 0] = "TYPE_0";
    SkeletalTransformType[SkeletalTransformType["BONE"] = 1] = "BONE";
    SkeletalTransformType[SkeletalTransformType["TYPE_2"] = 2] = "TYPE_2";
    SkeletalTransformType[SkeletalTransformType["TYPE_3"] = 3] = "TYPE_3";
    SkeletalTransformType[SkeletalTransformType["ALPHA"] = 4] = "ALPHA";
    SkeletalTransformType[SkeletalTransformType["TYPE_5"] = 5] = "TYPE_5";
    return SkeletalTransformType;
}({});
export function getTransformTypeForId(id) {
    if (id < 0 || id > 5) {
        return 0;
    }
    return id;
}
const CURVE_COUNTS = [
    0,
    9,
    3,
    6,
    1,
    3
];
export function getCurveCount(type) {
    return CURVE_COUNTS[type];
}
