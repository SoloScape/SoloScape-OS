import type { DecodedModelGeometry } from '../cache/ModelGeometryDecoder';

export interface TextureUv {
  readonly u: number;
  readonly v: number;
}

interface Vec3Like {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Resolves the classic/type-0 RuneScape model texture mapping for one face.
 *
 * A face either uses itself as the texture anchor triangle or points at an
 * explicit P/M/N texture triangle through faceTextureCoords. The returned
 * coordinates are affine coordinates on that anchor plane; WebGL's normal
 * perspective interpolation then provides the perspective-correct sampling
 * step that the software rasterizer performs per pixel.
 *
 * The classic lighting step compacts only referenced type-0 texture anchor
 * triangles. If a face points at render type 1..3, that axis is discarded in
 * the lit model and the rasterizer falls back to the face's own A/B/C vertices
 * as its texture basis. Mirror that behaviour here instead of dropping the
 * texture entirely; this is important for many scenery objects.
 */
export function resolveType0FaceTextureUvs(
  model: DecodedModelGeometry,
  face: number,
  vertex: (index: number) => Vec3Like,
): readonly [TextureUv, TextureUv, TextureUv] | null {
  if (face < 0 || face >= model.faceA.length) {
    return null;
  }

  const aIndex = model.faceA[face]!;
  const bIndex = model.faceB[face]!;
  const cIndex = model.faceC[face]!;
  const axis = model.faceTextureCoords[face] ?? -1;

  if (axis < 0) {
    return [
      { u: 0, v: 0 },
      { u: 1, v: 0 },
      { u: 0, v: 1 },
    ];
  }

  if (axis >= model.textureRenderTypes.length) {
    return null;
  }
  if (model.textureRenderTypes[axis] !== 0) {
    return [
      { u: 0, v: 0 },
      { u: 1, v: 0 },
      { u: 0, v: 1 },
    ];
  }

  const pIndex = model.textureFaceA[axis]!;
  const mIndex = model.textureFaceB[axis]!;
  const nIndex = model.textureFaceC[axis]!;
  const vertexCount = model.vertexX.length;
  if (
    pIndex >= vertexCount ||
    mIndex >= vertexCount ||
    nIndex >= vertexCount
  ) {
    return null;
  }

  const p = vertex(pIndex);
  const m = vertex(mIndex);
  const n = vertex(nIndex);
  const a = vertex(aIndex);
  const b = vertex(bIndex);
  const c = vertex(cIndex);

  const uvA = projectToTexturePlane(p, m, n, a);
  const uvB = projectToTexturePlane(p, m, n, b);
  const uvC = projectToTexturePlane(p, m, n, c);
  if (!uvA || !uvB || !uvC) {
    return null;
  }
  return [uvA, uvB, uvC];
}

function projectToTexturePlane(
  p: Vec3Like,
  m: Vec3Like,
  n: Vec3Like,
  q: Vec3Like,
): TextureUv | null {
  const mx = m.x - p.x;
  const my = m.y - p.y;
  const mz = m.z - p.z;
  const nx = n.x - p.x;
  const ny = n.y - p.y;
  const nz = n.z - p.z;
  const qx = q.x - p.x;
  const qy = q.y - p.y;
  const qz = q.z - p.z;

  const mm = mx * mx + my * my + mz * mz;
  const mn = mx * nx + my * ny + mz * nz;
  const nn = nx * nx + ny * ny + nz * nz;
  const qm = qx * mx + qy * my + qz * mz;
  const qn = qx * nx + qy * ny + qz * nz;
  const determinant = mm * nn - mn * mn;
  if (Math.abs(determinant) < 1e-9) {
    return null;
  }

  return {
    u: (qm * nn - qn * mn) / determinant,
    v: (qn * mm - qm * mn) / determinant,
  };
}
