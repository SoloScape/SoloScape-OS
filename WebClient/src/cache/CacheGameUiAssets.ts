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
  const interfaces = new CacheInterfaceStore(js5);
  let sideIcons: readonly CacheSpriteFrame[] = [];
  let source = 'no sideicons group';
  try {
    const icons = resolveNamedGroup(js5, GAME_SPRITE_ARCHIVE, ['sideicons']);
    const group = await js5.downloadGroup(GAME_SPRITE_ARCHIVE, icons.group);
    const file = group.files.get(0) ?? group.files.values().next().value;
    if (!file) throw new Error('Empty cache sideicons group.');
    sideIcons = decodeCacheSpriteGroup(file);
    source = GAME_SPRITE_ARCHIVE + ':' + icons.group + ' (' + icons.name + ')';
  } catch (error: unknown) {
    log?.('Original side icons not available: ' +
      (error instanceof Error ? error.message : String(error)));
  }
  log?.('Cache game UI ready: ' + sideIcons.length + ' original side icons; ' +
    'archive-8/13 bitmap fonts; ' + interfaces.availableGroupIds.length +
    ' archive-3 interface groups available for on-demand rendering.');
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

/**
 * Widget font ids refer to archive-8 glyph sprite groups. Archive-13 metrics
 * are matched by reference-table name hash where available.
 */
export async function loadInterfaceFont(
  js5: Js5Client,
  fontId: number,
): Promise<CacheFontAsset> {
  const spritesTable = js5.getArchiveReferenceTable(8);
  const metricsTable = js5.getArchiveReferenceTable(13);
  const entry = spritesTable?.groups.find((group) => group.id === fontId);
  if (!entry || !metricsTable) {
    throw new Error('Missing cached widget font sprites/metrics ' + fontId);
  }
  const metrics = entry.nameHash === null
    ? metricsTable.groups.find((group) => group.id === fontId)
    : metricsTable.groups.find((group) => group.nameHash === entry.nameHash);
  if (!metrics) throw new Error('Missing metrics for cached widget font ' + fontId);
  const [glyphGroup, metricGroup] = await Promise.all([
    js5.downloadGroup(8, fontId), js5.downloadGroup(13, metrics.id),
  ]);
  const glyphBytes = glyphGroup.files.get(0) ?? glyphGroup.files.values().next().value;
  const metricsBytes = metricGroup.files.get(0) ?? metricGroup.files.values().next().value;
  if (!glyphBytes || !metricsBytes) throw new Error('Empty widget font ' + fontId);
  return {
    name: 'cache-font-' + fontId,
    glyphs: decodeCacheSpriteGroup(glyphBytes),
    metrics: metricsBytes,
  };
}
