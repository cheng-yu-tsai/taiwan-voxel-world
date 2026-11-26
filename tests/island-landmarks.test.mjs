import assert from 'node:assert/strict';
import test from 'node:test';
import { ISLANDS } from '../site/game/config.js';
import { isIslandPoint } from '../site/game/island-geometry.js';
import { terrainHeight } from '../site/game/terrain.js';
import {
  kinmenWindLionEntries,
  matsuStoneTowerEntries,
  penghuBasaltColumnEntries,
} from '../site/game/island-landmarks.js';

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
  assert.equal(columns.has(`${Math.floor(penghu.spawn.x)},${Math.floor(penghu.spawn.z)}`), false,
    'the landmark should leave the destination spawn column clear');

  for (const [columnKey, levels] of columns) {
    const [x, z] = columnKey.split(',').map(Number);
    const baseY = terrainHeight(penghu, x + 0.5, z + 0.5);
    levels.sort((a, b) => a - b);
    assert.equal(levels[0], baseY, 'columns should start just above existing terrain');
    assert.deepEqual(levels, Array.from({ length: levels.length }, (_, i) => baseY + i));
  }
});

test('generates a stylized Kinmen stone guardian on land away from the spawn', () => {
  const kinmen = ISLANDS.find(island => island.id === 'kinmen');
  const entries = kinmenWindLionEntries();
  assert.deepEqual(kinmenWindLionEntries(), entries);
  assert.equal(entries.length, 13);
  assert.ok(entries.every(([, type]) => type === 'stone'));
  assert.equal(new Set(entries.map(([key]) => key)).size, entries.length);

  const columns = new Map();
  for (const [key] of entries) {
    const [x, y, z] = key.split(',').map(Number);
    const columnKey = `${x},${z}`;
    if (!columns.has(columnKey)) columns.set(columnKey, []);
    columns.get(columnKey).push(y);
    assert.ok(isIslandPoint(kinmen, x + 0.5, z + 0.5));
    assert.ok(y >= terrainHeight(kinmen, x + 0.5, z + 0.5));
  }
  assert.equal(columns.has(`${Math.floor(kinmen.spawn.x)},${Math.floor(kinmen.spawn.z)}`), false);
  for (const [columnKey, levels] of columns) {
    const [x, z] = columnKey.split(',').map(Number);
    assert.ok(levels.includes(terrainHeight(kinmen, x + 0.5, z + 0.5)));
  }
});

test('generates a stone landmark tower on Matsu land with a sign at its top', () => {
  const matsu = ISLANDS.find(island => island.id === 'matsu');
  const entries = matsuStoneTowerEntries();
  assert.deepEqual(matsuStoneTowerEntries(), entries);
  assert.equal(entries.length, 6);
  assert.equal(new Set(entries.map(([key]) => key)).size, entries.length);

  const columns = new Map();
  for (const [key, type] of entries) {
    const [x, y, z] = key.split(',').map(Number);
    const columnKey = `${x},${z}`;
    if (!columns.has(columnKey)) columns.set(columnKey, []);
    columns.get(columnKey).push({ y, type });
    assert.ok(isIslandPoint(matsu, x + 0.5, z + 0.5, matsu.shape[0]));
  }
  assert.equal(columns.has(`${Math.floor(matsu.spawn.x)},${Math.floor(matsu.spawn.z)}`), false);
  for (const [columnKey, blocks] of columns) {
    const [x, z] = columnKey.split(',').map(Number);
    const baseY = terrainHeight(matsu, x + 0.5, z + 0.5);
    const levels = blocks.sort((a, b) => a.y - b.y);
    assert.equal(levels[0].y, baseY);
    assert.ok(levels.slice(0, -1).every(block => block.type === 'stone'));
    if (levels.length > 1 && levels.at(-1).type === 'sign') {
      assert.equal(levels.at(-1).y, baseY + levels.length - 1);
    }
  }
  assert.equal(entries.filter(([, type]) => type === 'sign').length, 1);
});
