import type { Js5Client } from './Js5Client';
import {
  decodeModelGeometry,
  type DecodedModelGeometry,
} from './ModelGeometryDecoder';
import type { PlayerAppearance } from '../protocol/PlayerInfoDecoder';
import type { SceneMesh } from '../scene/SceneAssembler';

const CONFIG_ARCHIVE = 2;
const IDENT_KIT_GROUP = 3;
const ITEM_GROUP = 10;
const MODELS_ARCHIVE = 7;

interface ModelPart {
  readonly modelId: number;
  readonly recolorFrom: readonly number[];
  readonly recolorTo: readonly number[];
  readonly retextureFrom: readonly number[];
  readonly retextureTo: readonly number[];
}

interface IdentKitDefinition {
  readonly id: number;
  readonly modelIds: readonly number[];
  readonly recolorFrom: readonly number[];
  readonly recolorTo: readonly number[];
  readonly retextureFrom: readonly number[];
  readonly retextureTo: readonly number[];
}

interface ItemWearDefinition {
  readonly id: number;
  readonly maleModels: readonly number[];
  readonly femaleModels: readonly number[];
  readonly recolorFrom: readonly number[];
  readonly recolorTo: readonly number[];
  readonly retextureFrom: readonly number[];
  readonly retextureTo: readonly number[];
}

/**
 * Resolves a PLAYER_INFO appearance into cache-backed model geometry.
 *
 * Revision 240 still uses the classic appearance slot convention:
 *   0          = empty
 *   256..511   = ident-kit id (value - 256)
 *   >=512      = worn object id (value - 512)
 *
 * The loader intentionally keeps animation/skinning out of this first actor
 * milestone. It builds the player's real body/equipment geometry in bind pose
 * so the local player is visible at the server-provided coordinate.
 */
export class PlayerModelAssetLoader {
  private identKitFilesPromise:
    Promise<ReadonlyMap<number, Uint8Array>> | null = null;
  private itemFilesPromise:
    Promise<ReadonlyMap<number, Uint8Array>> | null = null;
  private readonly modelPromises =
    new Map<number, Promise<DecodedModelGeometry>>();

  constructor(
    private readonly js5: Js5Client,
    private readonly log: ((message: string) => void) | null = null,
  ) {}

  async load(appearance: PlayerAppearance): Promise<SceneMesh | null> {
    if (appearance.transformedNpcId >= 0) {
      this.log?.(
        'Player ' + appearance.name + ' is transformed into NPC ' +
          appearance.transformedNpcId +
          '; NPC-transformed player models are not in this milestone.',
      );
      return null;
    }

    const [identKitFiles, itemFiles] = await Promise.all([
      this.getIdentKitFiles(),
      this.getItemFiles(),
    ]);
    const parts: ModelPart[] = [];

    for (const packed of appearance.identKit) {
      if (packed >= 256 && packed < 512) {
        const id = packed - 256;
        const data = identKitFiles.get(id);
        if (!data) {
          this.log?.('Ident-kit ' + id + ' is missing from config 2:3.');
          continue;
        }
        const definition = decodeIdentKitDefinition(id, data);
        for (const modelId of definition.modelIds) {
          parts.push({
            modelId,
            recolorFrom: definition.recolorFrom,
            recolorTo: definition.recolorTo,
            retextureFrom: definition.retextureFrom,
            retextureTo: definition.retextureTo,
          });
        }
        continue;
      }

      if (packed >= 512) {
        const id = packed - 512;
        const data = itemFiles.get(id);
        if (!data) {
          this.log?.('Worn object ' + id + ' is missing from config 2:10.');
          continue;
        }
        const definition = decodeItemWearDefinition(id, data);
        const modelIds = appearance.bodyType === 1
          ? definition.femaleModels
          : definition.maleModels;
        for (const modelId of modelIds) {
          if (modelId < 0) continue;
          parts.push({
            modelId,
            recolorFrom: definition.recolorFrom,
            recolorTo: definition.recolorTo,
            retextureFrom: definition.retextureFrom,
            retextureTo: definition.retextureTo,
          });
        }
      }
    }

    if (parts.length === 0) {
      this.log?.(
        'Player appearance for ' + appearance.name +
          ' resolved no body/equipment model parts.',
      );
      return null;
    }

    const uniqueModelIds = Array.from(
      new Set(parts.map((part) => part.modelId)),
    );
    await Promise.all(
      uniqueModelIds.map((modelId) => this.getModel(modelId)),
    );

    const builder = new MeshBuilder();
    let triangles = 0;

    for (const part of parts) {
      const model = await this.getModel(part.modelId);
      triangles += appendModelPart(builder, model, part);
    }

    const mesh = builder.finish();
    this.log?.(
      'Local player model ready: name=' + appearance.name +
        '; parts=' + parts.length +
        '; models=' + uniqueModelIds.length +
        '; triangles=' + triangles + '.',
    );
    return mesh.vertexCount > 0 ? mesh : null;
  }

  reset(): void {
    this.identKitFilesPromise = null;
    this.itemFilesPromise = null;
    this.modelPromises.clear();
  }

  private getIdentKitFiles(): Promise<ReadonlyMap<number, Uint8Array>> {
    if (!this.identKitFilesPromise) {
      this.identKitFilesPromise = this.js5
        .downloadGroup(CONFIG_ARCHIVE, IDENT_KIT_GROUP)
        .then((group) => cloneFiles(group.files));
    }
    return this.identKitFilesPromise;
  }

  private getItemFiles(): Promise<ReadonlyMap<number, Uint8Array>> {
    if (!this.itemFilesPromise) {
      this.itemFilesPromise = this.js5
        .downloadGroup(CONFIG_ARCHIVE, ITEM_GROUP)
        .then((group) => cloneFiles(group.files));
    }
    return this.itemFilesPromise;
  }

  private getModel(modelId: number): Promise<DecodedModelGeometry> {
    let pending = this.modelPromises.get(modelId);
    if (!pending) {
      pending = this.js5
        .downloadGroup(MODELS_ARCHIVE, modelId)
        .then((group) => {
          if (group.files.size !== 1) {
            throw new Error(
              'Player model group 7:' + modelId +
                ' expected one file; found ' + group.files.size + '.',
            );
          }
          const data =
            group.files.values().next().value as Uint8Array | undefined;
          if (!data) {
            throw new Error(
              'Player model group 7:' + modelId + ' is empty.',
            );
          }
          return decodeModelGeometry(modelId, data);
        });
      this.modelPromises.set(modelId, pending);
    }
    return pending;
  }
}

function cloneFiles(
  files: ReadonlyMap<number, Uint8Array>,
): ReadonlyMap<number, Uint8Array> {
  return new Map(
    Array.from(
      files,
      ([id, bytes]) => [id, bytes.slice()] as const,
    ),
  );
}

function decodeIdentKitDefinition(
  id: number,
  data: Uint8Array,
): IdentKitDefinition {
  const reader = new DefinitionReader(data);
  let modelIds: number[] = [];
  let recolorFrom: number[] = [];
  let recolorTo: number[] = [];
  let retextureFrom: number[] = [];
  let retextureTo: number[] = [];

  while (true) {
    const opcode = reader.u8();
    if (opcode === 0) break;

    if (opcode === 1 || opcode === 3) {
      if (opcode === 1) reader.u8();
      continue;
    }
    if (opcode === 2) {
      const count = reader.u8();
      modelIds = new Array<number>(count);
      for (let i = 0; i < count; i += 1) {
        modelIds[i] = reader.u16();
      }
      continue;
    }
    if (opcode === 5) {
      const count = reader.u8();
      modelIds = new Array<number>(count);
      for (let i = 0; i < count; i += 1) {
        modelIds[i] = reader.u32();
      }
      continue;
    }
    if (opcode === 40) {
      const pairs = reader.u8();
      recolorFrom = new Array<number>(pairs);
      recolorTo = new Array<number>(pairs);
      for (let i = 0; i < pairs; i += 1) {
        recolorFrom[i] = reader.u16();
        recolorTo[i] = reader.u16();
      }
      continue;
    }
    if (opcode === 41) {
      const pairs = reader.u8();
      retextureFrom = new Array<number>(pairs);
      retextureTo = new Array<number>(pairs);
      for (let i = 0; i < pairs; i += 1) {
        retextureFrom[i] = reader.u16();
        retextureTo[i] = reader.u16();
      }
      continue;
    }
    if (opcode >= 60 && opcode < 70) {
      reader.u16();
      continue;
    }
    if (opcode >= 70 && opcode < 80) {
      reader.u32();
      continue;
    }

    throw new RangeError(
      'Unsupported rev-240 ident-kit opcode ' + opcode +
        ' for kit ' + id + '.',
    );
  }

  if (reader.remaining !== 0) {
    throw new RangeError(
      'Ident-kit ' + id + ' has ' + reader.remaining +
        ' trailing byte(s).',
    );
  }

  return {
    id,
    modelIds,
    recolorFrom,
    recolorTo,
    retextureFrom,
    retextureTo,
  };
}

function decodeItemWearDefinition(
  id: number,
  data: Uint8Array,
): ItemWearDefinition {
  const reader = new DefinitionReader(data);
  const maleModels = [-1, -1, -1];
  const femaleModels = [-1, -1, -1];
  let recolorFrom: number[] = [];
  let recolorTo: number[] = [];
  let retextureFrom: number[] = [];
  let retextureTo: number[] = [];

  while (true) {
    const opcode = reader.u8();
    if (opcode === 0) break;

    switch (opcode) {
      case 1:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 94:
      case 95:
      case 97:
      case 98:
      case 99:
      case 139:
      case 140:
      case 148:
      case 149:
        reader.u16();
        break;
      case 2:
      case 3:
      case 9:
        reader.string();
        break;
      case 11:
      case 15:
      case 16:
      case 65:
      case 160:
      case 251:
        break;
      case 12:
        reader.u32();
        break;
      case 13:
      case 14:
      case 27:
      case 42:
      case 113:
      case 114:
      case 115:
        reader.u8();
        break;
      case 23:
        maleModels[0] = reader.u16();
        reader.u8();
        break;
      case 24:
        maleModels[1] = reader.u16();
        break;
      case 25:
        femaleModels[0] = reader.u16();
        reader.u8();
        break;
      case 26:
        femaleModels[1] = reader.u16();
        break;
      case 30:
      case 31:
      case 32:
      case 33:
      case 34:
      case 35:
      case 36:
      case 37:
      case 38:
      case 39:
        reader.string();
        break;
      case 40: {
        const count = reader.u8();
        recolorFrom = new Array<number>(count);
        recolorTo = new Array<number>(count);
        for (let i = 0; i < count; i += 1) {
          recolorFrom[i] = reader.u16();
          recolorTo[i] = reader.u16();
        }
        break;
      }
      case 41: {
        const count = reader.u8();
        retextureFrom = new Array<number>(count);
        retextureTo = new Array<number>(count);
        for (let i = 0; i < count; i += 1) {
          retextureFrom[i] = reader.u16();
          retextureTo[i] = reader.u16();
        }
        break;
      }
      case 43: {
        reader.u8();
        while (reader.u8() !== 0) {
          reader.string();
        }
        break;
      }
      case 44:
        reader.u32();
        break;
      case 45:
        maleModels[0] = reader.u32();
        reader.u8();
        break;
      case 46:
        maleModels[1] = reader.u32();
        break;
      case 47:
        maleModels[2] = reader.u32();
        break;
      case 48:
        femaleModels[0] = reader.u32();
        reader.u8();
        break;
      case 49:
        femaleModels[1] = reader.u32();
        break;
      case 50:
        femaleModels[2] = reader.u32();
        break;
      case 51:
      case 52:
      case 53:
      case 54:
        reader.u32();
        break;
      case 75:
        reader.i16();
        break;
      case 78:
        maleModels[2] = reader.u16();
        break;
      case 79:
        femaleModels[2] = reader.u16();
        break;
      case 90:
      case 91:
      case 92:
      case 93:
        reader.u16();
        break;
      default:
        if (opcode >= 100 && opcode < 110) {
          reader.u16();
          reader.u16();
          break;
        }
        if (opcode >= 110 && opcode <= 112) {
          reader.u16();
          break;
        }
        if (opcode === 161) {
          const count = reader.u16();
          reader.skip(count * 2);
          break;
        }
        if (opcode === 200) {
          reader.u8();
          reader.u8();
          reader.string();
          break;
        }
        if (opcode === 201) {
          reader.u8();
          reader.u16();
          reader.u16();
          reader.u32();
          reader.u32();
          reader.string();
          break;
        }
        if (opcode === 202) {
          reader.u8();
          reader.u16();
          reader.u16();
          reader.u16();
          reader.u32();
          reader.u32();
          reader.string();
          break;
        }
        if (opcode === 249) {
          skipParams(reader);
          break;
        }
        throw new RangeError(
          'Unsupported rev-240 item opcode ' + opcode +
            ' for worn object ' + id + '.',
        );
    }
  }

  return {
    id,
    maleModels,
    femaleModels,
    recolorFrom,
    recolorTo,
    retextureFrom,
    retextureTo,
  };
}

function skipParams(reader: DefinitionReader): void {
  const count = reader.u8();
  for (let i = 0; i < count; i += 1) {
    const type = reader.u8();
    reader.skip(3);
    if (type === 1) {
      reader.string();
    } else if (type === 2) {
      reader.skip(8);
    } else {
      reader.skip(4);
    }
  }
}

function appendModelPart(
  builder: MeshBuilder,
  model: DecodedModelGeometry,
  part: ModelPart,
): number {
  let triangles = 0;

  for (let face = 0; face < model.faceA.length; face += 1) {
    const alpha = model.faceTransparencies[face]! & 0xff;
    if (alpha >= 254) continue;

    const a = vertex(model, model.faceA[face]!);
    const b = vertex(model, model.faceB[face]!);
    const c = vertex(model, model.faceC[face]!);

    let faceColor = model.faceColors[face]!;
    for (let i = 0; i < part.recolorFrom.length; i += 1) {
      if (faceColor === part.recolorFrom[i]) {
        faceColor = part.recolorTo[i] ?? faceColor;
        break;
      }
    }

    let texture = model.faceTextures[face]!;
    for (let i = 0; i < part.retextureFrom.length; i += 1) {
      if (texture === part.retextureFrom[i]) {
        texture = part.retextureTo[i] ?? texture;
        break;
      }
    }

    const color = shadeByTriangleNormal(
      modelColor(faceColor, texture),
      a,
      b,
      c,
    );
    builder.pushTriangle(a, b, c, color);
    triangles += 1;
  }

  return triangles;
}

function vertex(
  model: DecodedModelGeometry,
  index: number,
): Vec3 {
  return {
    x: model.vertexX[index]!,
    y: -model.vertexY[index]!,
    z: model.vertexZ[index]!,
  };
}

interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

class MeshBuilder {
  private readonly positions: number[] = [];
  private readonly colors: number[] = [];

  pushTriangle(a: Vec3, b: Vec3, c: Vec3, color: Rgb): void {
    this.pushVertex(a, color);
    this.pushVertex(b, color);
    this.pushVertex(c, color);
  }

  finish(): SceneMesh {
    return {
      positions: Float32Array.from(this.positions),
      colors: Uint8Array.from(this.colors),
      vertexCount: this.positions.length / 3,
    };
  }

  private pushVertex(vertexValue: Vec3, color: Rgb): void {
    this.positions.push(
      vertexValue.x,
      vertexValue.y,
      vertexValue.z,
    );
    this.colors.push(
      clamp(Math.round(color.r), 0, 255),
      clamp(Math.round(color.g), 0, 255),
      clamp(Math.round(color.b), 0, 255),
    );
  }
}

function modelColor(faceColor: number, texture: number): Rgb {
  const hue = ((faceColor >>> 10) & 0x3f) / 64;
  const saturation = ((faceColor >>> 7) & 0x7) / 8;
  const lightness = (faceColor & 0x7f) / 128;
  const rgb = hslToRgb(hue, saturation, lightness);
  return texture >= 0 ? scaleRgb(rgb, 0.86) : rgb;
}

function shadeByTriangleNormal(
  base: Rgb,
  a: Vec3,
  b: Vec3,
  c: Vec3,
): Rgb {
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const abZ = b.z - a.z;
  const acX = c.x - a.x;
  const acY = c.y - a.y;
  const acZ = c.z - a.z;
  const nx = abY * acZ - abZ * acY;
  const ny = abZ * acX - abX * acZ;
  const nz = abX * acY - abY * acX;
  const length = Math.hypot(nx, ny, nz) || 1;
  const lightLength = Math.hypot(-0.45, 0.82, -0.35);
  const dot = (
    nx * -0.45 + ny * 0.82 + nz * -0.35
  ) / (length * lightLength);
  const shade = clamp(0.68 + Math.abs(dot) * 0.42, 0.58, 1.12);
  return scaleRgb(base, shade);
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  if (s === 0) {
    const gray = l * 255;
    return { r: gray, g: gray, b: gray };
  }

  const q = l < 0.5
    ? l * (1 + s)
    : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hueToRgb(p, q, h + 1 / 3) * 255,
    g: hueToRgb(p, q, h) * 255,
    b: hueToRgb(p, q, h - 1 / 3) * 255,
  };
}

function hueToRgb(p: number, q: number, input: number): number {
  let t = input;
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}

function scaleRgb(color: Rgb, scale: number): Rgb {
  return {
    r: color.r * scale,
    g: color.g * scale,
    b: color.b * scale,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

class DefinitionReader {
  private offset = 0;

  constructor(private readonly data: Uint8Array) {}

  get remaining(): number {
    return this.data.length - this.offset;
  }

  u8(): number {
    this.require(1);
    return this.data[this.offset++]!;
  }

  i16(): number {
    const value = this.u16();
    return value > 0x7fff ? value - 0x10000 : value;
  }

  u16(): number {
    return (this.u8() << 8) | this.u8();
  }

  u32(): number {
    return (
      ((this.u8() << 24) >>> 0) |
      (this.u8() << 16) |
      (this.u8() << 8) |
      this.u8()
    ) >>> 0;
  }

  string(): string {
    const start = this.offset;
    while (this.offset < this.data.length && this.data[this.offset] !== 0) {
      this.offset += 1;
    }
    if (this.offset >= this.data.length) {
      throw new RangeError('Unterminated config string.');
    }
    const value = new TextDecoder('windows-1252').decode(
      this.data.subarray(start, this.offset),
    );
    this.offset += 1;
    return value;
  }

  skip(length: number): void {
    this.require(length);
    this.offset += length;
  }

  private require(length: number): void {
    if (
      length < 0 ||
      this.offset + length > this.data.length
    ) {
      throw new RangeError(
        'Unexpected end of player model definition at byte ' +
          this.offset + '.',
      );
    }
  }
}
