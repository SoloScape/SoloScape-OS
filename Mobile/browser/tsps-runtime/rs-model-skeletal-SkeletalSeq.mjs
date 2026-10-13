// Generated from pinned TSPS client/rs/model/skeletal/SkeletalSeq.ts.
// BSD-2-Clause: licenses/tsps-BSD-2-Clause.txt. Regenerate: node scripts/adapt-tsps-skeletal.mjs.
import {ByteBuffer} from "../cache-reader.mjs";
import { mat4, quat, vec3 } from "./skeletal-math.mjs";
import { Curve } from "./rs-model-skeletal-Curve.mjs";
import { getCurveIndex, getCurveTypeForId } from "./rs-model-skeletal-CurveType.mjs";
import { MatrixPool } from "./rs-model-skeletal-MatrixPool.mjs";
import { QuatPool } from "./rs-model-skeletal-QuatPool.mjs";
import { SkeletalBase } from "./rs-model-skeletal-SkeletalBase.mjs";
import { SkeletalBone } from "./rs-model-skeletal-SkeletalBone.mjs";
import { SkeletalTransformType, getCurveCount, getTransformTypeForId } from "./rs-model-skeletal-SkeletalTransformType.mjs";
const rotateAxis = vec3.create();
const scaleVector = vec3.create();
export class SkeletalSeq {
    id;
    version;
    base;
    skeletalBase;
    poseId;
    curveCount;
    boneCurves;
    curves;
    hasAlphaTransform = false;
    static load(baseLoader, id, data) {
        const buffer = new ByteBuffer(data);
        const version = buffer.readUnsignedByte();
        const baseId = buffer.readUnsignedShort();
        const base = baseLoader.load(baseId);
        if (!base) {
            throw new Error("Invalid skeletal base id: " + baseId);
        }
        const skeletalBase = base.skeletalBase;
        if (!skeletalBase) {
            throw new Error("Missing skeletal base: " + baseId);
        }
        return new SkeletalSeq(id, version, base, skeletalBase, buffer);
    }
    constructor(id, version, base, skeletalBase, buffer){
        this.id = id;
        this.version = version;
        this.base = base;
        this.skeletalBase = skeletalBase;
        buffer.readUnsignedShort();
        buffer.readUnsignedShort();
        this.poseId = buffer.readUnsignedByte();
        this.curveCount = buffer.readUnsignedShort();
        this.boneCurves = new Array(skeletalBase.bones.length);
        this.curves = new Array(base.count);
        for(let i = 0; i < this.curveCount; i++){
            const transformType = getTransformTypeForId(buffer.readUnsignedByte());
            const boneIndex = buffer.readSmart2();
            const curveType = getCurveTypeForId(buffer.readUnsignedByte());
            const curve = new Curve(i);
            curve.decode(buffer, version);
            let curves;
            if (transformType === SkeletalTransformType.BONE) {
                curves = this.boneCurves;
            } else {
                curves = this.curves;
            }
            if (curves[boneIndex] === undefined) {
                curves[boneIndex] = new Array(getCurveCount(transformType));
            }
            curve.load();
            curves[boneIndex][getCurveIndex(curveType)] = curve;
            if (transformType === SkeletalTransformType.ALPHA) {
                this.hasAlphaTransform = true;
            }
        }
    }
    updateAnimMatrix(frame, bone, boneIndex, poseId) {
        const matrix = MatrixPool.get();
        this.applyRotation(matrix, boneIndex, bone, frame);
        this.applyScaling(matrix, boneIndex, bone, frame);
        this.applyTranslation(matrix, boneIndex, bone, frame);
        bone.setAnimMatrix(matrix);
        MatrixPool.release(matrix);
    }
    applyRotation(matrix, boneIndex, bone, frame) {
        const rotation = bone.getRotation(this.poseId);
        let rotateX = rotation[0];
        let rotateY = rotation[1];
        let rotateZ = rotation[2];
        if (this.boneCurves[boneIndex]) {
            const curveX = this.boneCurves[boneIndex][0];
            const curveY = this.boneCurves[boneIndex][1];
            const curveZ = this.boneCurves[boneIndex][2];
            if (curveX) {
                rotateX = curveX.getValue(frame);
            }
            if (curveY) {
                rotateY = curveY.getValue(frame);
            }
            if (curveZ) {
                rotateZ = curveZ.getValue(frame);
            }
        }
        const quatX = QuatPool.get();
        vec3.set(rotateAxis, 1, 0, 0);
        quat.setAxisAngle(quatX, rotateAxis, rotateX);
        const quatY = QuatPool.get();
        vec3.set(rotateAxis, 0, 1, 0);
        quat.setAxisAngle(quatY, rotateAxis, rotateY);
        const quatZ = QuatPool.get();
        vec3.set(rotateAxis, 0, 0, 1);
        quat.setAxisAngle(quatZ, rotateAxis, rotateZ);
        const quaternion = QuatPool.get();
        quat.mul(quaternion, quatZ, quaternion);
        quat.mul(quaternion, quatX, quaternion);
        quat.mul(quaternion, quatY, quaternion);
        const rotateMatrix = MatrixPool.get();
        mat4.fromQuat(rotateMatrix, quaternion);
        mat4.mul(matrix, rotateMatrix, matrix);
        QuatPool.release(quatX);
        QuatPool.release(quatY);
        QuatPool.release(quatZ);
        QuatPool.release(quaternion);
        MatrixPool.release(rotateMatrix);
    }
    applyScaling(matrix, boneIndex, bone, frame) {
        const scaling = bone.getScaling(this.poseId);
        let scaleX = scaling[0];
        let scaleY = scaling[1];
        let scaleZ = scaling[2];
        if (this.boneCurves[boneIndex]) {
            const curveX = this.boneCurves[boneIndex][6];
            const curveY = this.boneCurves[boneIndex][7];
            const curveZ = this.boneCurves[boneIndex][8];
            if (curveX) {
                scaleX = curveX.getValue(frame);
            }
            if (curveY) {
                scaleY = curveY.getValue(frame);
            }
            if (curveZ) {
                scaleZ = curveZ.getValue(frame);
            }
        }
        const scaleMatrix = MatrixPool.get();
        vec3.set(scaleVector, scaleX, scaleY, scaleZ);
        mat4.fromScaling(scaleMatrix, scaleVector);
        mat4.mul(matrix, scaleMatrix, matrix);
        MatrixPool.release(scaleMatrix);
    }
    applyTranslation(matrix, boneIndex, bone, frame) {
        const translation = bone.getTranslation(this.poseId);
        let transX = translation[0];
        let transY = translation[1];
        let transZ = translation[2];
        if (this.boneCurves[boneIndex]) {
            const curveX = this.boneCurves[boneIndex][3];
            const curveY = this.boneCurves[boneIndex][4];
            const curveZ = this.boneCurves[boneIndex][5];
            if (curveX) {
                transX = curveX.getValue(frame);
            }
            if (curveY) {
                transY = curveY.getValue(frame);
            }
            if (curveZ) {
                transZ = curveZ.getValue(frame);
            }
        }
        matrix[12] = transX;
        matrix[13] = transY;
        matrix[14] = transZ;
    }
}
