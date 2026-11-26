import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCKS } from '../site/game/config.js';
import { scooterBlockEntries } from '../site/game/street-props.js';

test('creates a deterministic side-profile scooter from known voxel types', () => {
  const entries = scooterBlockEntries(-3, 1, -1);
  assert.equal(entries.length, 8);
  assert.equal(new Set(entries.map(([key]) => key)).size, entries.length);
  assert.ok(entries.some(([key, type]) => key === '-3,1,-1' && type === 'road'));
  assert.ok(entries.some(([key, type]) => key === '-3,1,1' && type === 'road'));
  assert.ok(entries.every(([, type]) => BLOCKS.some(block => block.id === type)));
  assert.deepEqual(scooterBlockEntries(-3, 1, -1), entries);
});

test('moves the complete scooter by the requested integer block origin', () => {
  const entries = scooterBlockEntries(4, 7, 9);
  assert.equal(entries[0][0], '4,7,9');
  assert.equal(entries.at(-1)[0], '4,10,11');
  assert.deepEqual(entries.map(([, type]) => type), scooterBlockEntries(0, 0, 0).map(([, type]) => type));
});

test('rejects fractional and unsafe origin coordinates', () => {
  assert.throws(() => scooterBlockEntries(1.5, 0, 0), TypeError);
  assert.throws(() => scooterBlockEntries(0, 0, Number.MAX_SAFE_INTEGER + 1), TypeError);
});
