import type { Js5Client } from './Js5Client';
import { js5NameHash } from './Js5NameHash';
import {
  decodeCacheSpriteGroup,
  type CacheSpriteFrame,
} from './CacheSpriteDecoder';

export const TITLE_BINARY_ARCHIVE = 10;
export const TITLE_SPRITE_ARCHIVE = 8;
export const TITLE_FONT_METRICS_ARCHIVE = 13;

export interface CacheFontAsset {
  readonly name: string;
  readonly glyphs: readonly CacheSpriteFrame[];
  readonly metrics: Uint8Array;
}

export interface TitleScreenAssets {
  readonly backgroundJpeg: Uint8Array;
  readonly logo: CacheSpriteFrame;
  readonly titleBox: CacheSpriteFrame;
  readonly titleButton: CacheSpriteFrame;
  readonly runes: readonly CacheSpriteFrame[];
  readonly plain12: CacheFontAsset;
  readonly bold12: CacheFontAsset;
  readonly provenance: Readonly<{
    background: string;
    logo: string;
    titleBox: string;
    titleButton: string;
    runes: string;
    plain12: string;
    bold12: string;
  }>;
}

interface NamedGroup {
  readonly name: string;
  readonly group: number;
}

export async function loadTitleScreenAssets(
  js5: Js5Client,
  log?: (message: string) => void,
): Promise<TitleScreenAssets> {
  const background = resolveNamedGroup(
    js5,
    TITLE_BINARY_ARCHIVE,
    ['title.jpg'],
  );
  const logo = resolveNamedGroup(
    js5,
    TITLE_SPRITE_ARCHIVE,
    ['logo_osrs', 'logo'],
  );
  const titleBox = resolveNamedGroup(
    js5,
    TITLE_SPRITE_ARCHIVE,
    ['titlebox'],
  );
  const titleButton = resolveNamedGroup(
    js5,
    TITLE_SPRITE_ARCHIVE,
    ['titlebutton'],
  );
  const runes = resolveNamedGroup(
    js5,
    TITLE_SPRITE_ARCHIVE,
    ['runes'],
  );
  const plain12Sprites = resolveNamedGroup(
    js5,
    TITLE_SPRITE_ARCHIVE,
    ['p12_full'],
  );
  const bold12Sprites = resolveNamedGroup(
    js5,
    TITLE_SPRITE_ARCHIVE,
    ['b12_full'],
  );
  const plain12Metrics = resolveNamedGroup(
    js5,
    TITLE_FONT_METRICS_ARCHIVE,
    ['p12_full'],
  );
  const bold12Metrics = resolveNamedGroup(
    js5,
    TITLE_FONT_METRICS_ARCHIVE,
    ['b12_full'],
  );

  logResolved(log, 'title background', TITLE_BINARY_ARCHIVE, background);
  logResolved(log, 'title logo', TITLE_SPRITE_ARCHIVE, logo);
  logResolved(log, 'title box', TITLE_SPRITE_ARCHIVE, titleBox);
  logResolved(log, 'title button', TITLE_SPRITE_ARCHIVE, titleButton);
  logResolved(log, 'login rune masks', TITLE_SPRITE_ARCHIVE, runes);
  logResolved(log, 'p12 sprite font', TITLE_SPRITE_ARCHIVE, plain12Sprites);
  logResolved(log, 'b12 sprite font', TITLE_SPRITE_ARCHIVE, bold12Sprites);
  logResolved(
    log,
    'p12 font metrics',
    TITLE_FONT_METRICS_ARCHIVE,
    plain12Metrics,
  );
  logResolved(
    log,
    'b12 font metrics',
    TITLE_FONT_METRICS_ARCHIVE,
    bold12Metrics,
  );

  const [
    backgroundGroup,
    logoGroup,
    titleBoxGroup,
    titleButtonGroup,
    runesGroup,
    plain12SpriteGroup,
    bold12SpriteGroup,
    plain12MetricGroup,
    bold12MetricGroup,
  ] = await Promise.all([
    js5.downloadGroup(TITLE_BINARY_ARCHIVE, background.group),
    js5.downloadGroup(TITLE_SPRITE_ARCHIVE, logo.group),
    js5.downloadGroup(TITLE_SPRITE_ARCHIVE, titleBox.group),
    js5.downloadGroup(TITLE_SPRITE_ARCHIVE, titleButton.group),
    js5.downloadGroup(TITLE_SPRITE_ARCHIVE, runes.group),
    js5.downloadGroup(TITLE_SPRITE_ARCHIVE, plain12Sprites.group),
    js5.downloadGroup(TITLE_SPRITE_ARCHIVE, bold12Sprites.group),
    js5.downloadGroup(TITLE_FONT_METRICS_ARCHIVE, plain12Metrics.group),
    js5.downloadGroup(TITLE_FONT_METRICS_ARCHIVE, bold12Metrics.group),
  ]);

  const backgroundJpeg = requireGroupFile(
    backgroundGroup.files,
    background.name,
  );
  const logoFrames = decodeCacheSpriteGroup(
    requireGroupFile(logoGroup.files, logo.name),
  );
  const titleBoxFrames = decodeCacheSpriteGroup(
    requireGroupFile(titleBoxGroup.files, titleBox.name),
  );
  const titleButtonFrames = decodeCacheSpriteGroup(
    requireGroupFile(titleButtonGroup.files, titleButton.name),
  );
  const runeFrames = decodeCacheSpriteGroup(
    requireGroupFile(runesGroup.files, runes.name),
  );
  const plain12Glyphs = decodeCacheSpriteGroup(
    requireGroupFile(plain12SpriteGroup.files, plain12Sprites.name),
  );
  const bold12Glyphs = decodeCacheSpriteGroup(
    requireGroupFile(bold12SpriteGroup.files, bold12Sprites.name),
  );

  const backgroundLabel =
    TITLE_BINARY_ARCHIVE + ':' + background.group + ' (' + background.name + ')';
  const logoLabel =
    TITLE_SPRITE_ARCHIVE + ':' + logo.group + ' (' + logo.name + ')';
  const titleBoxLabel =
    TITLE_SPRITE_ARCHIVE + ':' + titleBox.group + ' (' + titleBox.name + ')';
  const titleButtonLabel =
    TITLE_SPRITE_ARCHIVE + ':' + titleButton.group + ' (' + titleButton.name + ')';
  const runesLabel =
    TITLE_SPRITE_ARCHIVE + ':' + runes.group + ' (' + runes.name + ')';

  log?.(
    'Cache title screen assets decoded from SERVER cache: ' +
      backgroundLabel + ', ' + logoLabel + ', ' +
      titleBoxLabel + ', ' + titleButtonLabel + ', ' +
      runesLabel + ' (' + runeFrames.length + ' masks).',
  );

  return {
    backgroundJpeg,
    logo: requireFirstSprite(logoFrames, logo.name),
    titleBox: requireFirstSprite(titleBoxFrames, titleBox.name),
    titleButton: requireFirstSprite(titleButtonFrames, titleButton.name),
    runes: requireSprites(runeFrames, runes.name),
    plain12: {
      name: plain12Sprites.name,
      glyphs: plain12Glyphs,
      metrics: requireGroupFile(
        plain12MetricGroup.files,
        plain12Metrics.name,
      ),
    },
    bold12: {
      name: bold12Sprites.name,
      glyphs: bold12Glyphs,
      metrics: requireGroupFile(
        bold12MetricGroup.files,
        bold12Metrics.name,
      ),
    },
    provenance: {
      background: backgroundLabel,
      logo: logoLabel,
      titleBox: titleBoxLabel,
      titleButton: titleButtonLabel,
      runes: runesLabel,
      plain12:
        TITLE_SPRITE_ARCHIVE + ':' + plain12Sprites.group +
        ' + ' + TITLE_FONT_METRICS_ARCHIVE + ':' +
        plain12Metrics.group + ' (' + plain12Sprites.name + ')',
      bold12:
        TITLE_SPRITE_ARCHIVE + ':' + bold12Sprites.group +
        ' + ' + TITLE_FONT_METRICS_ARCHIVE + ':' +
        bold12Metrics.group + ' (' + bold12Sprites.name + ')',
    },
  };
}

export function resolveNamedGroup(
  js5: Pick<Js5Client, 'getArchiveReferenceTable'>,
  archive: number,
  candidates: readonly string[],
): NamedGroup {
  const table = js5.getArchiveReferenceTable(archive);
  if (!table) {
    throw new Error(
      'Cache archive ' + archive + ' reference table is unavailable.',
    );
  }
  if (!table.hasNames) {
    throw new Error(
      'Cache archive ' + archive +
        ' does not contain group name hashes.',
    );
  }

  for (const name of candidates) {
    const hash = js5NameHash(name);
    const entry = table.groups.find(
      (group) => group.nameHash === hash,
    );
    if (entry) {
      return { name, group: entry.id };
    }
  }

  throw new Error(
    'SERVER cache archive ' + archive +
      ' is missing required named group: ' +
      candidates.join(' or ') + '.',
  );
}

function requireGroupFile(
  files: ReadonlyMap<number, Uint8Array>,
  label: string,
): Uint8Array {
  const zero = files.get(0);
  if (zero) {
    return zero.slice();
  }

  if (files.size === 1) {
    const value = files.values().next().value as Uint8Array | undefined;
    if (value) {
      return value.slice();
    }
  }

  throw new Error(
    'Cache group ' + label +
      ' expected file 0 or one unambiguous file; found ' +
      files.size + ' files.',
  );
}

function requireSprites(
  sprites: readonly CacheSpriteFrame[],
  label: string,
): readonly CacheSpriteFrame[] {
  if (sprites.length === 0) {
    throw new Error('Cache sprite group ' + label + ' is empty.');
  }
  return sprites;
}

function requireFirstSprite(
  sprites: readonly CacheSpriteFrame[],
  label: string,
): CacheSpriteFrame {
  const sprite = sprites[0];
  if (!sprite) {
    throw new Error('Cache sprite group ' + label + ' is empty.');
  }
  return sprite;
}

function logResolved(
  log: ((message: string) => void) | undefined,
  label: string,
  archive: number,
  group: NamedGroup,
): void {
  log?.(
    'Resolved cache ' + label + ': ' +
      group.name + ' -> ' + archive + ':' + group.group + '.',
  );
}
