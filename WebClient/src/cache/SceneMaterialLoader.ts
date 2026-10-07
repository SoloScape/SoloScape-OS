import type { Js5Client } from './Js5Client';
import {
  decodeCacheSpriteGroup,
  type CacheSpriteFrame,
} from './CacheSpriteDecoder';
import {
  decodeFloorOverlayDefinition,
  decodeFloorUnderlayDefinition,
  type FloorOverlayDefinition,
  type FloorUnderlayDefinition,
} from './FloorDefinitionDecoder';
import {
  decodeTextureDefinition,
  type TextureDefinition,
} from './TextureDefinitionDecoder';
import type { LoadedMapSquare } from './MapSquareLoader';
import type { LoadedSceneAssets } from './SceneAssetLoader';

export const FLOOR_CONFIG_ARCHIVE = 2;
export const FLOOR_UNDERLAY_GROUP = 1;
export const FLOOR_OVERLAY_GROUP = 4;
export const SPRITE_ARCHIVE = 8;
export const TEXTURE_ARCHIVE = 9;
export const TEXTURE_DEFINITION_GROUP = 0;
export const SCENE_TEXTURE_SIZE = 128;

export interface SceneTextureLayer {
  readonly id: number;
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

export interface SceneFloorMaterials {
  readonly underlays: ReadonlyMap<number, FloorUnderlayDefinition>;
  readonly overlays: ReadonlyMap<number, FloorOverlayDefinition>;
  readonly textureAverageRgb: ReadonlyMap<number, number>;
  /** Cache texture ids with decoded RGBA layers ready for GPU sampling. */
  readonly residentTextureIds: ReadonlySet<number>;
}

export interface SceneMaterialAssets extends SceneFloorMaterials {
  readonly textureLayers: readonly SceneTextureLayer[];
}

/**
 * Loads the classic cache material chain used by the scene:
 *
 *   config 2:1 / 2:4 -> floor definitions
 *   archive 9:0      -> texture definitions
 *   archive 8:<id>   -> indexed sprite backing each texture
 *
 * Rev-240 texture definitions are the compact rev-233+ format: one archive-8
 * sprite id plus packed-HSL fallback colour, opacity and animation metadata.
 * The sprite is normalized, gamma-corrected at 0.8 and expanded to a 128x128
 * RGBA layer for WebGL2 sampling.
 */
export class SceneMaterialLoader {
  private underlayFilesPromise:
    Promise<ReadonlyMap<number, Uint8Array>> | null = null;
  private overlayFilesPromise:
    Promise<ReadonlyMap<number, Uint8Array>> | null = null;
  private textureFilesPromise:
    Promise<ReadonlyMap<number, Uint8Array>> | null = null;
  private readonly textureLayers = new Map<number, SceneTextureLayer>();
  private readonly textureAverageRgb = new Map<number, number>();
  private readonly texturePromises =
    new Map<number, Promise<SceneTextureLayer | null>>();

  constructor(
    private readonly js5: Js5Client,
    private readonly log: ((message: string) => void) | null = null,
  ) {}

  async loadForScene(
    maps: readonly LoadedMapSquare[],
    sceneAssets: LoadedSceneAssets,
  ): Promise<SceneMaterialAssets> {
    const [underlayFiles, overlayFiles] = await Promise.all([
      this.getUnderlayFiles(),
      this.getOverlayFiles(),
    ]);

    const underlayIds = new Set<number>();
    const overlayIds = new Set<number>();
    for (const map of maps) {
      for (const rawId of map.terrain.underlayIds) {
        if (rawId > 0) underlayIds.add(rawId - 1);
      }
      for (const id of map.terrain.overlayIds) {
        if (id >= 0) overlayIds.add(id);
      }
    }

    const underlays = new Map<number, FloorUnderlayDefinition>();
    for (const id of underlayIds) {
      const bytes = underlayFiles.get(id);
      if (!bytes) {
        this.log?.('Floor underlay ' + id + ' is missing from 2:1.');
        continue;
      }
      underlays.set(id, decodeFloorUnderlayDefinition(id, bytes));
    }

    const overlays = new Map<number, FloorOverlayDefinition>();
    for (const id of overlayIds) {
      const bytes = overlayFiles.get(id);
      if (!bytes) {
        this.log?.('Floor overlay ' + id + ' is missing from 2:4.');
        continue;
      }
      overlays.set(id, decodeFloorOverlayDefinition(id, bytes));
    }

    const textureIds = new Set<number>();
    for (const overlay of overlays.values()) {
      if (overlay.texture >= 0) textureIds.add(overlay.texture);
    }
    for (const model of sceneAssets.models.values()) {
      for (const texture of model.faceTextures) {
        if (texture >= 0) textureIds.add(texture);
      }
    }
    for (const definition of sceneAssets.locDefinitions.values()) {
      for (const texture of definition.retextureTo) {
        if (texture >= 0) textureIds.add(texture);
      }
    }

    const textureLayers = await this.ensureTextureIds(textureIds);
    this.log?.(
      'Scene materials ready: underlays=' + underlays.size +
        '; overlays=' + overlays.size +
        '; requested-textures=' + textureIds.size +
        '; decoded-textures=' + textureLayers.length + '.',
    );

    return {
      underlays,
      overlays,
      textureAverageRgb: new Map(this.textureAverageRgb),
      residentTextureIds: new Set(
        textureLayers.map((layer) => layer.id),
      ),
      textureLayers,
    };
  }

  async ensureTextureIds(
    textureIds: Iterable<number>,
  ): Promise<readonly SceneTextureLayer[]> {
    const unique = Array.from(
      new Set(Array.from(textureIds, (id) => Math.trunc(id))),
    ).filter((id) => id >= 0);

    await Promise.all(unique.map((id) => this.ensureTexture(id)));
    return Array.from(this.textureLayers.values())
      .sort((a, b) => a.id - b.id);
  }

  reset(): void {
    this.underlayFilesPromise = null;
    this.overlayFilesPromise = null;
    this.textureFilesPromise = null;
    this.textureLayers.clear();
    this.textureAverageRgb.clear();
    this.texturePromises.clear();
  }

  private getUnderlayFiles(): Promise<ReadonlyMap<number, Uint8Array>> {
    if (!this.underlayFilesPromise) {
      this.underlayFilesPromise = this.js5
        .downloadGroup(FLOOR_CONFIG_ARCHIVE, FLOOR_UNDERLAY_GROUP)
        .then((group) => cloneFiles(group.files));
    }
    return this.underlayFilesPromise;
  }

  private getOverlayFiles(): Promise<ReadonlyMap<number, Uint8Array>> {
    if (!this.overlayFilesPromise) {
      this.overlayFilesPromise = this.js5
        .downloadGroup(FLOOR_CONFIG_ARCHIVE, FLOOR_OVERLAY_GROUP)
        .then((group) => cloneFiles(group.files));
    }
    return this.overlayFilesPromise;
  }

  private getTextureFiles(): Promise<ReadonlyMap<number, Uint8Array>> {
    if (!this.textureFilesPromise) {
      this.textureFilesPromise = this.js5
        .downloadGroup(TEXTURE_ARCHIVE, TEXTURE_DEFINITION_GROUP)
        .then((group) => {
          this.log?.(
            'Loaded texture definition group 9:0: files=' +
              group.files.size + '.',
          );
          return cloneFiles(group.files);
        });
    }
    return this.textureFilesPromise;
  }

  private ensureTexture(
    textureId: number,
  ): Promise<SceneTextureLayer | null> {
    const existing = this.textureLayers.get(textureId);
    if (existing) return Promise.resolve(existing);

    let pending = this.texturePromises.get(textureId);
    if (!pending) {
      pending = this.loadTexture(textureId)
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : String(error);
          this.log?.(
            'Texture ' + textureId + ' could not be loaded: ' + message,
          );
          return null;
        });
      this.texturePromises.set(textureId, pending);
    }
    return pending;
  }

  private async loadTexture(
    textureId: number,
  ): Promise<SceneTextureLayer | null> {
    const textureFiles = await this.getTextureFiles();
    const bytes = textureFiles.get(textureId);
    if (!bytes) {
      throw new Error('definition is missing from archive 9 group 0');
    }

    const definition = decodeTextureDefinition(textureId, bytes);
    this.textureAverageRgb.set(textureId, definition.averageRgb);
    const spriteId = definition.fileIds[0];
    if (spriteId === undefined) {
      throw new Error('definition has no sprite id');
    }

    const spriteGroup = await this.js5.downloadGroup(
      SPRITE_ARCHIVE,
      spriteId,
    );
    const spriteBytes = requireSingleFile(
      spriteGroup.files,
      'texture sprite 8:' + spriteId,
    );
    const frames = decodeCacheSpriteGroup(spriteBytes);
    const sprite = frames[0];
    if (!sprite) {
      throw new Error('sprite group 8:' + spriteId + ' contains no frames');
    }

    const layer: SceneTextureLayer = {
      id: textureId,
      width: SCENE_TEXTURE_SIZE,
      height: SCENE_TEXTURE_SIZE,
      rgba: buildTextureRgba(definition, sprite),
    };
    this.textureLayers.set(textureId, layer);
    return layer;
  }
}

function buildTextureRgba(
  definition: TextureDefinition,
  sprite: CacheSpriteFrame,
): Uint8Array {
  const sheetWidth = sprite.sheetWidth;
  const sheetHeight = sprite.sheetHeight;
  if (
    sheetWidth <= 0 ||
    sheetHeight <= 0 ||
    sprite.xOffset < 0 ||
    sprite.yOffset < 0 ||
    sprite.xOffset + sprite.width > sheetWidth ||
    sprite.yOffset + sprite.height > sheetHeight
  ) {
    throw new RangeError(
      'Texture ' + definition.id + ' has invalid sprite sheet geometry.',
    );
  }

  const palette = sprite.palette.slice();
  const transform = definition.colourTransforms[0] ?? 0;
  applyColourTransform(palette, transform);
  for (let i = 0; i < palette.length; i += 1) {
    palette[i] = gammaCorrect(palette[i]!, 0.8);
  }

  const pixelCount = sheetWidth * sheetHeight;
  const indices = new Uint8Array(pixelCount);
  const alpha = sprite.alpha ? new Uint8Array(pixelCount) : null;

  for (let y = 0; y < sprite.height; y += 1) {
    for (let x = 0; x < sprite.width; x += 1) {
      const src = x + y * sprite.width;
      const dst =
        (sprite.xOffset + x) +
        (sprite.yOffset + y) * sheetWidth;
      indices[dst] = sprite.indices[src]!;
      if (alpha && sprite.alpha) {
        alpha[dst] = sprite.alpha[src]!;
      }
    }
  }

  const rgba = new Uint8Array(
    SCENE_TEXTURE_SIZE * SCENE_TEXTURE_SIZE * 4,
  );
  for (let y = 0; y < SCENE_TEXTURE_SIZE; y += 1) {
    const sourceY = Math.min(
      sheetHeight - 1,
      Math.floor(y * sheetHeight / SCENE_TEXTURE_SIZE),
    );
    for (let x = 0; x < SCENE_TEXTURE_SIZE; x += 1) {
      const sourceX = Math.min(
        sheetWidth - 1,
        Math.floor(x * sheetWidth / SCENE_TEXTURE_SIZE),
      );
      const source = sourceX + sourceY * sheetWidth;
      const paletteIndex = indices[source]!;
      const rgb = palette[paletteIndex] ?? 0;
      const output = (x + y * SCENE_TEXTURE_SIZE) * 4;
      rgba[output] = (rgb >>> 16) & 0xff;
      rgba[output + 1] = (rgb >>> 8) & 0xff;
      rgba[output + 2] = rgb & 0xff;
      rgba[output + 3] = definition.opaque
        ? 0xff
        : alpha
          ? alpha[source]!
          : paletteIndex === 0
            ? 0
            : 0xff;
    }
  }
  return rgba;
}

function applyColourTransform(
  palette: Uint32Array,
  transform: number,
): void {
  if ((transform >>> 24) !== 3) {
    return;
  }

  const tint = transform & 0x00ff00ff;
  const green = (transform >>> 8) & 0xff;
  for (let i = 0; i < palette.length; i += 1) {
    const rgb = palette[i]!;
    if ((rgb >>> 8) !== (rgb & 0xffff)) {
      continue;
    }
    const intensity = rgb & 0xff;
    palette[i] =
      ((tint * intensity >>> 8) & 0x00ff00ff) |
      ((green * intensity) & 0x0000ff00);
  }
}

function gammaCorrect(rgb: number, gamma: number): number {
  const r = Math.floor(
    Math.pow(((rgb >>> 16) & 0xff) / 256, gamma) * 256,
  );
  const g = Math.floor(
    Math.pow(((rgb >>> 8) & 0xff) / 256, gamma) * 256,
  );
  const b = Math.floor(
    Math.pow((rgb & 0xff) / 256, gamma) * 256,
  );
  return (
    (clampByte(r) << 16) |
    (clampByte(g) << 8) |
    clampByte(b)
  ) >>> 0;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, value));
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

function requireSingleFile(
  files: ReadonlyMap<number, Uint8Array>,
  label: string,
): Uint8Array {
  const zero = files.get(0);
  if (zero) return zero.slice();
  if (files.size === 1) {
    return files.values().next().value!.slice();
  }
  throw new Error(
    label + ' expected file 0 or one unambiguous file; found ' +
      files.size + '.',
  );
}
