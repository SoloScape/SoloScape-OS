import type { Js5Client } from './Js5Client';
import { cacheSpriteToRgba, decodeCacheSpriteGroup, type CacheSpriteFrame } from './CacheSpriteDecoder';
import { CacheInterfaceStore } from './CacheInterfaceDefinitions';
import { resolveNamedGroup, type CacheFontAsset } from './TitleScreenAssets';

export const GAME_SPRITE_ARCHIVE = 8;

/** Cache-sourced graphics and font assets for the game HUD. */
export interface CacheGameUiAssets {
  readonly sideIcons: readonly CacheSpriteFrame[];
  readonly plain12: CacheFontAsset;
  readonly bold12: CacheFontAsset;
  readonly interfaces: CacheInterfaceStore;
  readonly source: string;
}

/**
 * The title loader already fetches and validates p12/b12 bitmap glyphs and
 * archive-13 metrics. Reuse them instead of shipping CSS/web-font copies.
 */
export async function loadCacheGameUiAssets(
  js5: Js5Client,
  fonts: Pick<CacheGameUiAssets, 'plain12' | 'bold12'>,
  log?: (line: string) => void,
): Promise<CacheGameUiAssets> {
  const icons = resolveNamedGroup(js5, GAME_SPRITE_ARCHIVE, ['sideicons']);
  const group = await js5.downloadGroup(GAME_SPRITE_ARCHIVE, icons.group);
  const file = group.files.get(0) ?? group.files.values().next().value;
  if (!file) throw new Error('Cache sideicons group contains no sprite file.');
  const sideIcons = decodeCacheSpriteGroup(file);
  if (!sideIcons.length) throw new Error('Cache sideicons group contains no frames.');
  const interfaces = new CacheInterfaceStore(js5);
  const source = GAME_SPRITE_ARCHIVE + ':' + icons.group + ' (' + icons.name + ')';
  log?.('Loaded ' + sideIcons.length + ' original side-icon sprites from ' + source +
    '; fonts are the original archive 8/13 bitmap fonts; archive 3 interfaces available on demand.');
  return { sideIcons, plain12: fonts.plain12, bold12: fonts.bold12, interfaces, source };
}

/** Convert a decoded palette/alpha cache sprite into browser canvas pixels. */
export function cacheSpriteCanvas(frame: CacheSpriteFrame): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, frame.width);
  canvas.height = Math.max(1, frame.height);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas unavailable for game cache sprite.');
  const pixels = context.createImageData(frame.width, frame.height);
  pixels.data.set(cacheSpriteToRgba(frame));
  context.putImageData(pixels, 0, 0);
  return canvas;
}

/**
 * Sprite ids in IF3 widgets refer to JS5 archive-8 group ids, not web assets.
 * Load the exact group on demand, validating it via Js5Client.
 */
export async function loadInterfaceSprite(
  js5: Js5Client,
  spriteId: number,
): Promise<readonly CacheSpriteFrame[]> {
  if (!Number.isSafeInteger(spriteId) || spriteId < 0) {
    throw new Error('Invalid cache sprite id ' + spriteId);
  }
  const table = js5.getArchiveReferenceTable(GAME_SPRITE_ARCHIVE);
  if (!table?.groups.some((group) => group.id === spriteId)) {
    throw new Error('No cache sprite group 8:' + spriteId);
  }
  const group = await js5.downloadGroup(GAME_SPRITE_ARCHIVE, spriteId);
  const file = group.files.get(0) ?? group.files.values().next().value;
  if (!file) throw new Error('Empty sprite group 8:' + spriteId);
  return decodeCacheSpriteGroup(file);
}
