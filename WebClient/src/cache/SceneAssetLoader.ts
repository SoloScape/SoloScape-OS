import type { Js5Client } from './Js5Client';
import {
  decodeLocModelDefinition,
  type LocModelDefinition,
} from './LocModelDefinitionDecoder';
import type { LoadedMapSquare } from './MapSquareLoader';

export const CONFIG_ARCHIVE = 2;
export const LOC_CONFIG_GROUP = 6;
export const MODELS_ARCHIVE = 7;

export interface LoadedSceneAssets {
  readonly locDefinitions: ReadonlyMap<number, LocModelDefinition>;
  readonly modelData: ReadonlyMap<number, Uint8Array>;
}

export class SceneAssetLoader {
  private locFilesPromise: Promise<ReadonlyMap<number, Uint8Array>> | null = null;

  constructor(
    private readonly js5: Js5Client,
    private readonly log: ((message: string) => void) | null = null,
  ) {}

  async loadForMaps(
    maps: readonly LoadedMapSquare[],
  ): Promise<LoadedSceneAssets> {
    const locFiles = await this.getLocFiles();
    const requestedLocIds = new Set<number>();

    for (const map of maps) {
      for (const location of map.locations) {
        requestedLocIds.add(location.id);
      }
    }

    const definitions = new Map<number, LocModelDefinition>();
    const pending = Array.from(requestedLocIds);
    for (let cursor = 0; cursor < pending.length; cursor += 1) {
      const id = pending[cursor]!;
      if (definitions.has(id)) {
        continue;
      }
      const bytes = locFiles.get(id);
      if (!bytes) {
        throw new Error('Loc definition ' + id + ' is missing from 2:6.');
      }
      const definition = decodeLocModelDefinition(id, bytes);
      definitions.set(id, definition);

      for (const transform of definition.transforms) {
        if (transform >= 0 && !definitions.has(transform)) {
          pending.push(transform);
        }
      }
    }

    const modelIds = new Set<number>();
    for (const definition of definitions.values()) {
      for (const modelId of definition.modelIds) {
        modelIds.add(modelId);
      }
    }

    this.log?.(
      'Scene loc metadata ready: placements=' +
        Array.from(requestedLocIds).length +
        '; definitions=' + definitions.size +
        '; models=' + modelIds.size + '.',
    );

    const modelEntries = await Promise.all(
      Array.from(modelIds, async (modelId) => {
        const group = await this.js5.downloadGroup(
          MODELS_ARCHIVE,
          modelId,
        );
        if (group.files.size !== 1) {
          throw new Error(
            'Model group 7:' + modelId +
              ' expected exactly one file; found ' + group.files.size + '.',
          );
        }
        const data = group.files.values().next().value as Uint8Array | undefined;
        if (!data) {
          throw new Error('Model group 7:' + modelId + ' is empty.');
        }
        return [modelId, data.slice()] as const;
      }),
    );

    const modelData = new Map<number, Uint8Array>(modelEntries);
    this.log?.(
      'Scene model payloads ready: ' + modelData.size +
        ' unique model groups downloaded and validated.',
    );

    return {
      locDefinitions: definitions,
      modelData,
    };
  }

  reset(): void {
    this.locFilesPromise = null;
  }

  private getLocFiles(): Promise<ReadonlyMap<number, Uint8Array>> {
    if (!this.locFilesPromise) {
      this.locFilesPromise = this.js5
        .downloadGroup(CONFIG_ARCHIVE, LOC_CONFIG_GROUP)
        .then((group) => {
          this.log?.(
            'Loaded loc definition group 2:6: files=' +
              group.files.size + '.',
          );
          return new Map(
            Array.from(
              group.files,
              ([id, bytes]) => [id, bytes.slice()] as const,
            ),
          );
        });
    }
    return this.locFilesPromise;
  }
}
