import assert from 'node:assert/strict';
import test from 'node:test';
import { ISLANDS } from '../site/game/config.js';
import { isIslandPoint } from '../site/game/island-geometry.js';
import { greenIslandTrailEntries, orchidIslandTrailEntries } from '../site/game/island-trails.js';
import { terrainHeight } from '../site/game/terrain.js';
import {
  greenIslandCoastalRockEntries,
  kinmenWindLionEntries,
  matsuStoneTowerEntries,
  orchidIslandCoastalRockEntries,
  penghuBasaltColumnEntries,
  taiwanMountainLookoutEntries,
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

test('generates deterministic Green Island coastal rocks above land and clear of the trail', () => {
  const green = ISLANDS.find(island => island.id === 'green');
  const entries = greenIslandCoastalRockEntries();
  const trail = new Set(greenIslandTrailEntries().map(([key]) => {
    const [x, , z] = key.split(',');
    return `${x},${z}`;
  }));
  assert.deepEqual(greenIslandCoastalRockEntries(), entries);
  assert.equal(entries.length, 5);
  assert.ok(entries.every(([, type]) => type === 'stone'));
  assert.equal(new Set(entries.map(([key]) => key)).size, entries.length);

  const columns = new Map();
  for (const [key] of entries) {
    const [x, y, z] = key.split(',').map(Number);
    const columnKey = `${x},${z}`;
    if (!columns.has(columnKey)) columns.set(columnKey, []);
    columns.get(columnKey).push(y);
    assert.ok(isIslandPoint(green, x + 0.5, z + 0.5));
    assert.ok(!trail.has(columnKey));
  }
  assert.equal(columns.size, 2);
  assert.equal(columns.has(`${Math.floor(green.spawn.x)},${Math.floor(green.spawn.z)}`), false);
  for (const [columnKey, levels] of columns) {
    const [x, z] = columnKey.split(',').map(Number);
    const baseY = terrainHeight(green, x + 0.5, z + 0.5);
    levels.sort((a, b) => a - b);
    assert.equal(levels[0], baseY);
    assert.deepEqual(levels, Array.from({ length: levels.length }, (_, index) => baseY + index));
  }
});

test('generates deterministic Orchid Island coastal rocks above land and clear of the trail and spawn', () => {
  const orchid = ISLANDS.find(island => island.id === 'orchid');
  const entries = orchidIslandCoastalRockEntries();
  const trail = new Set(orchidIslandTrailEntries().map(([key]) => {
    const [x, , z] = key.split(',');
    return `${x},${z}`;
  }));
  assert.deepEqual(orchidIslandCoastalRockEntries(), entries);
  assert.equal(entries.length, 5);
  assert.ok(entries.every(([, type]) => type === 'stone'));
  assert.equal(new Set(entries.map(([key]) => key)).size, entries.length);

  const columns = new Map();
  for (const [key] of entries) {
    const [x, y, z] = key.split(',').map(Number);
    const columnKey = `${x},${z}`;
    if (!columns.has(columnKey)) columns.set(columnKey, []);
    columns.get(columnKey).push(y);
    assert.ok(isIslandPoint(orchid, x + 0.5, z + 0.5));
    assert.ok(!trail.has(columnKey));
  }
  assert.equal(columns.size, 2);
  assert.equal(columns.has(`${Math.floor(orchid.spawn.x)},${Math.floor(orchid.spawn.z)}`), false);
  for (const [columnKey, levels] of columns) {
    const [x, z] = columnKey.split(',').map(Number);
    const baseY = terrainHeight(orchid, x + 0.5, z + 0.5);
    levels.sort((a, b) => a - b);
    assert.equal(levels[0], baseY);
    assert.deepEqual(levels, Array.from({ length: levels.length }, (_, index) => baseY + index));
  }
});

test('creates a walkable Taiwan ridge lookout with a clear southern entrance', () => {
  const main = ISLANDS.find(island => island.id === 'main');
  const entries = taiwanMountainLookoutEntries();
  const byKey = new Map(entries);
  const heights = [];

  for (let x = 0; x < 3; x++) {
    for (let z = 11; z < 14; z++) {
      const groundY = terrainHeight(main, x + 0.5, z + 0.5) - 1;
      heights.push(groundY);
      assert.equal(byKey.get(`${x},${groundY},${z}`), 'stone');
      assert.ok(isIslandPoint(main, x + 0.5, z + 0.5));
      assert.notEqual(`${x},${z}`, `${Math.floor(main.spawn.x)},${Math.floor(main.spawn.z)}`);
    }
  }

  assert.equal(new Set(entries.map(([key]) => key)).size, entries.length);
  assert.equal(Math.min(...heights), Math.max(...heights), 'the stone deck should remain level');
  assert.ok(isIslandPoint(main, 1.5, 10.5), 'the approach should remain on the mainland');
  assert.ok(Math.abs(terrainHeight(main, 1.5, 10.5) - 1 - heights[0]) <= 1,
    'the southern approach should be within one step of the deck');
  assert.equal(entries.filter(([, type]) => type === 'stone').length, 9);
  assert.equal(entries.filter(([, type]) => type === 'wood').length, 5);
  assert.equal(entries.filter(([, type]) => type === 'sign').length, 1);
  assert.equal(byKey.get('1,13,11'), undefined, 'the southern center should stay open as the entrance');
  assert.equal(byKey.get('1,14,13'), 'sign', 'the sign should sit above the rear-center rail');
});
