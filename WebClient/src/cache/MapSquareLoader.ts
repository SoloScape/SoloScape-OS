import {
  type Js5Client,
  type Js5DownloadedGroup,
} from './Js5Client';
import { js5NameHash } from './Js5NameHash';
import {
  decodeMapLocations,
  type MapLocation,
} from './MapLocationDecoder';
import {
  decodeMapTerrain,
  type MapTerrain,
} from './MapTerrainDecoder';
import type { MapSquare } from '../protocol/RegionRebuildDecoder';

export const MAPS_ARCHIVE = 5;

export interface LoadedMapSquare {
  readonly mapSquare: MapSquare;
  readonly terrainName: string;
  readonly terrainGroup: number;
  readonly locationName: string;
  readonly locationGroup: number | null;
  readonly terrain: MapTerrain;
  readonly locations: readonly MapLocation[];
}

export class MapSquareLoader {
  constructor(
    private readonly js5: Js5Client,
    private readonly log: ((message: string) => void) | null = null,
  ) {}

  async loadMany(
    mapSquares: readonly MapSquare[],
  ): Promise<LoadedMapSquare[]> {
    const unique = new Map<number, MapSquare>();
    for (const square of mapSquares) {
      unique.set(square.id, square);
    }

    const jobs = Array.from(unique.values(), (square) => this.load(square));
    return Promise.all(jobs);
  }

  async load(mapSquare: MapSquare): Promise<LoadedMapSquare> {
    const terrainName = 'm' + mapSquare.x + '_' + mapSquare.z;
    const locationName = 'l' + mapSquare.x + '_' + mapSquare.z;
    const terrainGroup = this.resolveGroup(terrainName);

    if (terrainGroup === null) {
      throw new Error(
        'Maps archive is missing terrain group ' + terrainName + '.',
      );
    }

    const locationGroup = this.resolveGroup(locationName);

    this.log?.(
      'Loading mapsquare ' + mapSquare.x + ',' + mapSquare.z +
        ': terrain=' + terrainName + '->5:' + terrainGroup +
        (locationGroup === null
          ? '; locations=' + locationName + ' missing/empty.'
          : '; locations=' + locationName + '->5:' + locationGroup + '.'),
    );

    const [terrainDownload, locationDownload] = await Promise.all([
      this.js5.downloadGroup(MAPS_ARCHIVE, terrainGroup),
      locationGroup === null
        ? Promise.resolve<Js5DownloadedGroup | null>(null)
        : this.js5.downloadGroup(MAPS_ARCHIVE, locationGroup),
    ]);

    const terrainBytes = requireSingleFile(
      terrainDownload,
      terrainName,
    );
    const locationBytes = locationDownload
      ? requireSingleFile(locationDownload, locationName)
      : null;

    const terrain = decodeMapTerrain(terrainBytes);
    const locations = locationBytes
      ? decodeMapLocations(locationBytes)
      : [];

    this.log?.(
      'Decoded mapsquare ' + mapSquare.x + ',' + mapSquare.z +
        ': terrain=' + terrainBytes.length + ' bytes; locations=' +
        locations.length + '.',
    );

    return {
      mapSquare,
      terrainName,
      terrainGroup,
      locationName,
      locationGroup,
      terrain,
      locations,
    };
  }

  private resolveGroup(name: string): number | null {
    const table = this.js5.getArchiveReferenceTable(MAPS_ARCHIVE);
    if (!table) {
      throw new Error('Maps archive reference table 5 is unavailable.');
    }
    if (!table.hasNames) {
      throw new Error(
        'Maps archive reference table 5 does not contain group name hashes.',
      );
    }

    const hash = js5NameHash(name);
    const group = table.groups.find((entry) => entry.nameHash === hash);
    return group?.id ?? null;
  }
}

function requireSingleFile(
  group: Js5DownloadedGroup,
  name: string,
): Uint8Array {
  if (group.files.size !== 1) {
    throw new Error(
      'Map group ' + name + ' (5:' + group.group +
        ') expected exactly one file; found ' + group.files.size + '.',
    );
  }
  const file = group.files.values().next().value as Uint8Array | undefined;
  if (!file) {
    throw new Error('Map group ' + name + ' is empty.');
  }
  return file;
}
