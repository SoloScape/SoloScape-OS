import assert from 'node:assert/strict';
import test from 'node:test';
import {
  decodeJs5VarBitDefinition,
  JS5_CONFIG_ARCHIVE,
  JS5_NPC_DEFINITION_GROUP,
  JS5_VARBIT_DEFINITION_GROUP,
  loadJs5StartupAssets,
  type Js5StartupAssetSource,
} from './Js5StartupAssets';

test('loads the exact revision-240 startup definition groups', async () => {
  const requests: Array<[number, number, boolean | undefined]> = [];

  const source: Js5StartupAssetSource = {
    async downloadGroup(archive, group, urgent) {
      requests.push([archive, group, urgent]);

      if (group === JS5_NPC_DEFINITION_GROUP) {
        return {
          files: new Map([
            [100, new Uint8Array([1, 2, 3])],
          ]),
        };
      }

      if (group === JS5_VARBIT_DEFINITION_GROUP) {
        return {
          files: new Map([
            [7, new Uint8Array([1, 0x12, 0x34, 2, 5, 0])],
          ]),
        };
      }

      throw new Error('Unexpected group ' + group);
    },
  };

  const assets = await loadJs5StartupAssets(source);

  assert.deepEqual(requests, [
    [JS5_CONFIG_ARCHIVE, JS5_NPC_DEFINITION_GROUP, true],
    [JS5_CONFIG_ARCHIVE, JS5_VARBIT_DEFINITION_GROUP, true],
  ]);

  assert.deepEqual(assets.npcDefinitionFiles.get(100), {
    kind: 'npc',
    id: 100,
    data: new Uint8Array([1, 2, 3]),
  });
  assert.deepEqual(assets.varbitDefinitions.get(7), {
    id: 7,
    baseVar: 0x1234,
    startBit: 2,
    endBit: 5,
  });
});

test('decodes opcode-1 varbit definitions', () => {
  assert.deepEqual(
    decodeJs5VarBitDefinition(
      55,
      new Uint8Array([1, 0xab, 0xcd, 4, 9, 0]),
    ),
    {
      id: 55,
      baseVar: 0xabcd,
      startBit: 4,
      endBit: 9,
    },
  );
});

test('rejects unknown varbit opcodes', () => {
  assert.throws(
    () => decodeJs5VarBitDefinition(
      1,
      new Uint8Array([2, 0]),
    ),
    /unsupported opcode 2/,
  );
});

test('rejects unterminated varbit definitions', () => {
  assert.throws(
    () => decodeJs5VarBitDefinition(
      1,
      new Uint8Array([1, 0, 1, 0, 1]),
    ),
    /missing its opcode-0 terminator/,
  );
});
