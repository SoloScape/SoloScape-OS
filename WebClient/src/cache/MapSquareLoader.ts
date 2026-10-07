import {
  type Js5Client,
  type Js5DownloadedGroup,
} from './Js5Client';
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
export const MAP_TERRAIN_FILE = 0;
export const MAP_LOCATION_FILE = 1;

export interface LoadedMapSquare {
  readonly mapSquare: MapSquare;
  /**
   * Legacy diagnostic label retained for scene/debug output.
   * Rev-240 archive 5 is keyed by packed mapsquare id, not by group names.
   */
  readonly terrainName: string;
  readonly terrainGroup: number;
  /**
   * Legacy diagnostic label retained for scene/debug output.
   * Terrain and locations are files in the same mapsquare group.
   */
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
    const mapGroup = mapSquare.id;

    this.log?.(
      'Loading mapsquare ' + mapSquare.x + ',' + mapSquare.z +
        ': archive-group=5:' + mapGroup +
        ' terrain-file=' + MAP_TERRAIN_FILE +
        ' locations-file=' + MAP_LOCATION_FILE + '.',
    );

    const download = await this.js5.downloadGroup(
      MAPS_ARCHIVE,
      mapGroup,
    );

    const terrainBytes = requireMapFile(
      download,
      MAP_TERRAIN_FILE,
      terrainName,
    );
    const locationBytes =
      download.files.get(MAP_LOCATION_FILE)?.slice() ?? null;

    const terrain = decodeMapTerrain(terrainBytes);
    const locations = locationBytes
      ? decodeMapLocations(locationBytes)
      : [];

    this.log?.(
      'Decoded mapsquare ' + mapSquare.x + ',' + mapSquare.z +
        ': group=5:' + mapGroup +
        '; terrain=' + terrainBytes.length + ' bytes; locations=' +
        locations.length +
        (locationBytes ? '' : ' (file 1 absent)') + '.',
    );

    return {
      mapSquare,
      terrainName,
      terrainGroup: mapGroup,
      locationName,
      locationGroup: locationBytes ? mapGroup : null,
      terrain,
      locations,
    };
  }
}

function requireMapFile(
  group: Js5DownloadedGroup,
  fileId: number,
  label: string,
): Uint8Array {
  const file = group.files.get(fileId);
  if (!file) {
    throw new Error(
      'Map group 5:' + group.group +
        ' is missing required file ' + fileId +
        ' (' + label + ').',
    );
  }
  return file.slice();
}
