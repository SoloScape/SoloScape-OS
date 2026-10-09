// Generated from pinned TSPS client/rs/model/skeletal/SkeletalBase.ts.
// BSD-2-Clause: licenses/tsps-BSD-2-Clause.txt. Regenerate: node scripts/adapt-tsps-skeletal.mjs.
import { SkeletalBone } from "./rs-model-skeletal-SkeletalBone.mjs";
import { SkeletalSeq } from "./rs-model-skeletal-SkeletalSeq.mjs";
export class SkeletalBase {
    bones;
    poseCount;
    constructor(buffer, count){
        this.bones = new Array(count);
        this.poseCount = buffer.readUnsignedByte();
        for(let i = 0; i < this.bones.length; i++){
            this.bones[i] = new SkeletalBone(this.poseCount, buffer, false);
        }
        this.linkBones();
    }
    linkBones() {
        for(let i = 0; i < this.bones.length; i++){
            const bone = this.bones[i];
            if (bone.parentId >= 0) {
                bone.parent = this.bones[bone.parentId];
            }
        }
    }
    updateAnimMatrices(skeletalSeq, frame, masks = undefined, mask = false) {
        const poseId = skeletalSeq.poseId;
        let boneIndex = 0;
        for (const bone of this.bones){
            if (masks === undefined || masks[boneIndex] === mask) {
                skeletalSeq.updateAnimMatrix(frame, bone, boneIndex, poseId);
            }
            boneIndex++;
        }
    }
    getBoneCount() {
        return this.bones.length;
    }
    getBone(id) {
        if (id >= this.getBoneCount()) {
            return undefined;
        }
        return this.bones[id];
    }
}
