export const JS5_CONFIG_ARCHIVE = 2;
export const JS5_NPC_DEFINITION_GROUP = 9;
export const JS5_VARBIT_DEFINITION_GROUP = 14;

export const JS5_STARTUP_DEFINITION_GROUPS = {
  npc: {
    kind: 'npc',
    archive: JS5_CONFIG_ARCHIVE,
    group: JS5_NPC_DEFINITION_GROUP,
  },
  varbit: {
    kind: 'varbit',
    archive: JS5_CONFIG_ARCHIVE,
    group: JS5_VARBIT_DEFINITION_GROUP,
  },
} as const;

export type Js5StartupDefinitionKind =
  keyof typeof JS5_STARTUP_DEFINITION_GROUPS;

export interface Js5DefinitionAsset<
  Kind extends Js5StartupDefinitionKind,
> {
  kind: Kind;
  id: number;
  data: Uint8Array;
}

export interface Js5VarBitDefinition {
  id: number;
  baseVar: number;
  startBit: number;
  endBit: number;
}

export interface Js5StartupAssets {
  npcDefinitionFiles:
    ReadonlyMap<number, Js5DefinitionAsset<'npc'>>;
  varbitDefinitions:
    ReadonlyMap<number, Js5VarBitDefinition>;
}

export interface Js5StartupAssetSource {
  downloadGroup(
    archive: number,
    group: number,
    urgent?: boolean,
  ): Promise<{
    files: ReadonlyMap<number, Uint8Array>;
  }>;
}

export async function loadJs5StartupAssets(
  source: Js5StartupAssetSource,
  onLog?: (message: string) => void,
): Promise<Js5StartupAssets> {
  const npcSpec = JS5_STARTUP_DEFINITION_GROUPS.npc;
  const varbitSpec = JS5_STARTUP_DEFINITION_GROUPS.varbit;

  onLog?.(
    'Loading typed startup definition groups ' +
    npcSpec.archive + ':' + npcSpec.group + ' (npc) and ' +
    varbitSpec.archive + ':' + varbitSpec.group + ' (varbit).',
  );

  const [npcGroup, varbitGroup] = await Promise.all([
    source.downloadGroup(npcSpec.archive, npcSpec.group, true),
    source.downloadGroup(varbitSpec.archive, varbitSpec.group, true),
  ]);

  const npcDefinitionFiles =
    new Map<number, Js5DefinitionAsset<'npc'>>();

  for (const [id, data] of npcGroup.files) {
    npcDefinitionFiles.set(id, {
      kind: 'npc',
      id,
      data: data.slice(),
    });
  }

  const varbitDefinitions =
    new Map<number, Js5VarBitDefinition>();

  for (const [id, data] of varbitGroup.files) {
    varbitDefinitions.set(
      id,
      decodeJs5VarBitDefinition(id, data),
    );
  }

  onLog?.(
    'Typed startup definitions ready: ' +
    npcDefinitionFiles.size + ' NPC definition files; ' +
    varbitDefinitions.size + ' varbit definitions.',
  );

  return {
    npcDefinitionFiles,
    varbitDefinitions,
  };
}

/**
 * Decode the complete varbit definition format used by the revision-240 cache.
 *
 * The desktop cache implementation in this repository accepts opcode 1
 * (base varp, start bit, end bit) followed by opcode 0 terminator.
 */
export function decodeJs5VarBitDefinition(
  id: number,
  data: Uint8Array,
): Js5VarBitDefinition {
  const reader = new DefinitionReader(data);
  let baseVar = 0;
  let startBit = 0;
  let endBit = 0;
  let terminated = false;

  while (reader.remaining > 0) {
    const opcode = reader.readU8();

    if (opcode === 0) {
      terminated = true;
      break;
    }

    if (opcode !== 1) {
      throw new Error(
        'Varbit ' + id + ' has unsupported opcode ' + opcode + '.',
      );
    }

    baseVar = reader.readU16();
    startBit = reader.readU8();
    endBit = reader.readU8();
  }

  if (!terminated) {
    throw new Error(
      'Varbit ' + id + ' is missing its opcode-0 terminator.',
    );
  }

  if (reader.remaining !== 0) {
    throw new Error(
      'Varbit ' + id + ' has ' + reader.remaining +
      ' trailing byte(s) after its terminator.',
    );
  }

  return {
    id,
    baseVar,
    startBit,
    endBit,
  };
}

class DefinitionReader {
  private offset = 0;

  constructor(private readonly data: Uint8Array) {}

  get remaining(): number {
    return this.data.length - this.offset;
  }

  readU8(): number {
    this.require(1);
    return this.data[this.offset++]!;
  }

  readU16(): number {
    this.require(2);
    const value =
      (this.data[this.offset]! << 8) |
      this.data[this.offset + 1]!;
    this.offset += 2;
    return value;
  }

  private require(length: number): void {
    if (this.offset + length > this.data.length) {
      throw new Error(
        'Unexpected end of startup definition at byte ' +
        this.offset + '.',
      );
    }
  }
}
