import assert from 'node:assert/strict';
import test from 'node:test';
import { Rev240UiState } from './Rev240UiState';

function packet(name: string, bytes: number[] | Uint8Array) {
  return { name, payload: new Uint8Array(bytes) };
}

test('decodes revision-240 IF_OPENTOP, IF_OPENSUB, IF_MOVESUB and IF_CLOSESUB transforms', () => {
  const state = new Rev240UiState();
  assert.equal(state.apply(packet('IF_OPENTOP', [0xa4, 0x02])), true);
  assert.equal(state.topLevelInterface, 548);
  state.apply(packet('IF_OPENSUB', [1, 0x15, 0, 0x24, 2, 0x12, 0]));
  assert.deepEqual(state.subInterfaces.get(0x02240012), {
    type: 1, groupId: 149, destination: 0x02240012,
  });
  state.apply(packet('IF_MOVESUB', [0x24, 2, 0x12, 0, 0x24, 2, 0x13, 0]));
  assert.equal(state.subInterfaces.has(0x02240012), false);
  assert.equal(state.subInterfaces.get(0x02240013)?.groupId, 149);
  state.apply(packet('IF_CLOSESUB', [2, 0x24, 0, 0x13]));
  assert.equal(state.subInterfaces.size, 0);
});

test('IF_RESYNC_V2 atomically replaces server top/sub bindings and events', () => {
  const state = new Rev240UiState();
  const bytes = [
    0x02, 0x24, 0, 1,
    0x02, 0x24, 0, 0x12, 0, 0x95, 1,
    0x02, 0x24, 0, 0x12, 0, 0, 0, 0x1b,
    0, 0, 0, 1, 0, 0, 0, 2,
  ];
  state.apply(packet('IF_RESYNC_V2', bytes));
  assert.equal(state.topLevelInterface, 548);
  assert.equal(state.subInterfaces.get(0x02240012)?.groupId, 149);
  assert.deepEqual(state.interfaceEvents.get(0x02240012), [
    { start: 0, end: 27, events1: 1, events2: 2 },
  ]);
  assert.throws(() => state.apply(packet('IF_RESYNC_V2', [0, 3, 0, 2])),
    /Truncated/);
  assert.equal(state.topLevelInterface, 548);
});

test('original widget text, visibility and scrolling follow rsprot transforms', () => {
  const state = new Rev240UiState();
  state.apply(packet('IF_SETTEXT', [0, 2, 0, 0x95, 72, 105, 0]));
  state.apply(packet('IF_SETHIDE', [127, 0, 2, 0, 0x95]));
  state.apply(packet('IF_SETSCROLLPOS', [0x95, 0, 2, 0, 0, 50]));
  assert.deepEqual(state.widgetChanges.get(0x00950002), {
    text: 'Hi', hidden: true, scrollPosition: 50,
  });
});

test('UPDATE_INV_FULL and PARTIAL include id+1, special counts, sparse slots', () => {
  const state = new Rev240UiState();
  const head = [0, 0x95, 0, 2, 0, 93];
  state.apply(packet('UPDATE_INV_FULL', [
    ...head, 0, 2,
    126, 1, 0xa0,
    128, 0, 0,
  ]));
  assert.deepEqual(state.inventories.get(93)?.items, [
    { id: 415, count: 2 }, { id: -1, count: 0 },
  ]);
  assert.equal(state.inventoryForWidget(0x00950002)?.inventoryId, 93);
  state.apply(packet('UPDATE_INV_PARTIAL', [
    ...head, 1, 4, 1, 255, 0, 1, 0x86, 0xa0,
  ]));
  assert.deepEqual(state.inventories.get(93)?.items[1], { id: 1024, count: 100000 });
  state.apply(packet('UPDATE_INV_STOPTRANSMIT', [93, 0]));
  assert.equal(state.inventories.size, 0);
});

test('UPDATE_STAT_V2 applies transformed XP, level and run energy', () => {
  const state = new Rev240UiState();
  state.apply(packet('UPDATE_STAT_V2', [
    128, 0x04, 0x03, 0x02, 0x01, 10, 119,
  ]));
  assert.deepEqual(state.skills.get(0), {
    id: 0, experience: 0x01020304, currentLevel: 9, invisibleBoostedLevel: 10,
  });
  state.apply(packet('UPDATE_RUNENERGY', [0x26, 0xac]));
  assert.equal(state.runEnergy, 9900);
});

test('VARP_SMALL and LARGE decode byte transforms; reset clears state', () => {
  const state = new Rev240UiState();
  state.apply(packet('VARP_SMALL', [1, 0x82, 3]));
  assert.equal(state.varps.get(0x0102), -3);
  state.apply(packet('VARP_LARGE', [0x82, 1, 4, 3, 2, 1]));
  assert.equal(state.varps.get(0x0102), 0x01020304);
  state.apply(packet('VARP_RESET', []));
  assert.equal(state.varps.size, 0);
});

test('UI state ignores unrelated game packets and rejects truncated relevant data', () => {
  const state = new Rev240UiState();
  const version = state.version;
  assert.equal(state.apply(packet('PLAYER_INFO', [1, 2, 3])), false);
  assert.equal(state.version, version);
  assert.throws(() => state.apply(packet('UPDATE_INV_FULL', [0])),
    /Truncated/);
});

test('IF_SETMODEL_V2, IF_SETCOLOUR, IF_SETPOSITION retain server widget data', () => {
  const state = new Rev240UiState();
  const id = 0x00950002;
  // p4Alt1(42) + p4Alt1(widget id)
  state.apply(packet('IF_SETMODEL_V2', [42, 0, 0, 0, 2, 0, 0x95, 0]));
  assert.equal(state.widgetChanges.get(id)?.modelId, 42);

  // p2Alt3(0x7c1f) and p4Alt1(widget id)
  state.apply(packet('IF_SETCOLOUR', [0x9f, 0x7c, 2, 0, 0x95, 0]));
  assert.equal(state.widgetChanges.get(id)?.colour, 0xf800f8);

  // p2Alt2(12), p2Alt2(24), p4Alt1(widget id)
  state.apply(packet('IF_SETPOSITION', [0, 140, 0, 152, 2, 0, 0x95, 0]));
  assert.equal(state.widgetChanges.get(id)?.x, 12);
  assert.equal(state.widgetChanges.get(id)?.y, 24);
});

test('new server top interface clears obsolete widget state', () => {
  const state = new Rev240UiState();
  state.apply(packet('IF_SETTEXT', [0, 2, 0, 0x95, 72, 105, 0]));
  assert.equal(state.widgetChanges.size, 1);
  state.apply(packet('IF_OPENTOP', [0xa4, 2]));
  assert.equal(state.widgetChanges.size, 0);
});
