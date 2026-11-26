import assert from 'node:assert/strict';
import test from 'node:test';
import { syntheticBlockEntries } from '../site/game/benchmark-data.js';

test('creates the requested number of unique distributed block records', () => {
  for (const count of [5000, 20000]) {
    const entries = [...syntheticBlockEntries(count, 'distributed')];
    assert.equal(entries.length, count);
    assert.equal(new Set(entries.map(([key]) => key)).size, entries.length);
    assert.ok(entries.every(([, type]) => type === 'stone'));
  }
});

test('keeps dense workload within one horizontal chunk with vertical gaps', () => {
  for (const chunkSize of [10, 16, 24]) {
    const entries = [...syntheticBlockEntries(2000, 'single-chunk', chunkSize)];
    const chunkKeys = new Set(entries.map(([key]) => {
      const [x, , z] = key.split(',').map(Number);
      return `${Math.floor(x / chunkSize)},${Math.floor(z / chunkSize)}`;
    }));
    assert.equal(entries.length, 2000);
    assert.equal(chunkKeys.size, 1);
    assert.equal(new Set(entries.map(([key]) => key)).size, entries.length);
  }
});

test('rejects invalid synthetic workloads', () => {
  assert.throws(() => [...syntheticBlockEntries(-1, 'distributed')], RangeError);
  assert.throws(() => [...syntheticBlockEntries(1.5, 'distributed')], RangeError);
  assert.throws(() => [...syntheticBlockEntries(1, 'unknown')], TypeError);
  assert.throws(() => [...syntheticBlockEntries(1, 'distributed', 0)], RangeError);
});
