import assert from 'node:assert/strict';
import test from 'node:test';
import { ISLANDS } from '../site/game/config.js';
import { isIslandPoint } from '../site/game/island-geometry.js';
import { terrainHeight } from '../site/game/terrain.js';
import { penghuBasaltColumnEntries } from '../site/game/island-landmarks.js';

const penghu = ISLANDS.find(island => island.id === 'penghu');

test('generates six deterministic stone columns on Penghu land above its terrain', () => {
  const entries = penghuBasaltColumnEntries();
  assert.deepEqual(penghuBasaltColumnEntries(), entries);
  assert.equal(entries.length, 17);
  assert.ok(entries.every(([, type]) => type === 'stone'));
  assert.equal(new Set(entries.map(([key]) => key)).size, entries.length);

  const columns = new Map();
  for (const [key] of entries) {
    const [x, y, z] = key.split(',').map(Number);
    const columnKey = `${x},${z}`;
    if (!columns.has(columnKey)) columns.set(columnKey, []);
    columns.get(columnKey).push(y);
    assert.ok(isIslandPoint(penghu, x + 0.5, z + 0.5, penghu.shape[0]));
  }
  assert.equal(columns.size, 6);

  for (const [columnKey, levels] of columns) {
    const [x, z] = columnKey.split(',').map(Number);
    const baseY = terrainHeight(penghu, x + 0.5, z + 0.5);
    levels.sort((a, b) => a - b);
    assert.equal(levels[0], baseY, 'columns should start just above existing terrain');
    assert.deepEqual(levels, Array.from({ length: levels.length }, (_, i) => baseY + i));
  }
});
