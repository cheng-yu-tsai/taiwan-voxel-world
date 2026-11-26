import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DECORATIONS,
  canPlaceDecoration,
  decorationKey,
  normalizeDecorationEntries,
} from '../site/game/world-objects.js';

test('offers distinct placeable flip-flops and baseball bat decorations', () => {
  assert.deepEqual(DECORATIONS.map(({id,name})=>[id,name]), [['flip-flops','藍白拖'],['baseball-bat','球棒'],['toy-pistol','玩具手槍']]);
  assert.equal(new Set(DECORATIONS.map(item=>item.id)).size, DECORATIONS.length);
});

test('uses stable integer-cell keys for decoration anchors', () => {
  assert.equal(decorationKey(-4, 3, 9), '-4,3,9');
  assert.throws(() => decorationKey(0.5, 1, 0), TypeError);
  assert.throws(() => decorationKey(0, -1, 0), RangeError);
});

test('accepts a supported decoration on top of an empty supported cell', () => {
  const type = DECORATIONS[0].id;
  assert.equal(canPlaceDecoration(new Map([['-2,4,7', 'grass']]), new Map(), '-2,5,7', type, 0), true);
  assert.equal(canPlaceDecoration(new Map([['-2,4,7', 'grass']]), new Map(), '-2,5,7', 'baseball-bat', 2), true);
  assert.equal(canPlaceDecoration(new Map([['-2,4,7', 'grass']]), new Map(), '-2,5,7', 'toy-pistol', 3), true);
});

test('rejects unsupported, occupied, duplicate, unsupported-type and invalid-rotation placements', () => {
  const type = DECORATIONS[0].id;
  const blocks = new Map([['1,0,1', 'grass'], ['1,1,1', 'stone']]);
  assert.equal(canPlaceDecoration(blocks, new Map(), '1,1,1', type, 0), false);
  assert.equal(canPlaceDecoration(blocks, new Map(), '1,3,1', type, 0), false);
  assert.equal(canPlaceDecoration(blocks, new Map([['1,2,1', { type, rotation: 0 }]]), '1,2,1', type, 0), false);
  assert.equal(canPlaceDecoration(blocks, new Map(), '1,1,1', 'unknown', 0), false);
  assert.equal(canPlaceDecoration(blocks, new Map(), '1,1,1', type, 4), false);
  assert.equal(canPlaceDecoration(blocks, new Map(), '4097,1,1', type, 0), false);
});

test('normalizes saved decorations and rejects malformed, duplicate or unknown entries', () => {
  const type = DECORATIONS[0].id;
  const source = [['-2,5,7', type, 3]];
  const normalized = normalizeDecorationEntries(source);
  assert.deepEqual(normalized, source);
  assert.notEqual(normalized, source);
  assert.notEqual(normalized[0], source[0]);
  assert.throws(() => normalizeDecorationEntries(null), TypeError);
  assert.throws(() => normalizeDecorationEntries([['0,0,0', type]]), TypeError);
  assert.throws(() => normalizeDecorationEntries([['bad,key,here', type, 0]]), TypeError);
  assert.throws(() => normalizeDecorationEntries([['0,1,0', 'unknown', 0]]), TypeError);
  assert.throws(() => normalizeDecorationEntries([['0,1,0', type, -1]]), RangeError);
  assert.throws(() => normalizeDecorationEntries([['0,1,0', type, 0], ['0,1,0', type, 1]]), TypeError);
});
