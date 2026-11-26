import assert from 'node:assert/strict';
import test from 'node:test';
import { ISLANDS } from '../site/game/config.js';
import { isIslandPoint } from '../site/game/island-geometry.js';
import { terrainHeight } from '../site/game/terrain.js';
import { greenIslandTrailEntries, orchidIslandTrailEntries } from '../site/game/island-trails.js';

const greenIsland = ISLANDS.find(island => island.id === 'green');
const orchidIsland = ISLANDS.find(island => island.id === 'orchid');

test('generates a deterministic, walkable loop of road blocks inside Green Island', () => {
  const entries = greenIslandTrailEntries();
  const repeated = greenIslandTrailEntries();
  assert.deepEqual(repeated, entries);
  assert.ok(entries.length >= 12, 'the trail should form a substantial loop');
  assert.ok(entries.every(([, type]) => type === 'road'));

  const coordinates = entries.map(([key]) => key.split(',').map(Number));
  const horizontalKeys = new Set(coordinates.map(([x, , z]) => `${x},${z}`));
  assert.equal(horizontalKeys.size, entries.length, 'trail coordinates should be unique');
  assert.ok(coordinates.every(([x, y, z]) => {
    const surfaceY = terrainHeight(greenIsland, x + 0.5, z + 0.5) - 1;
    return isIslandPoint(greenIsland, x + 0.5, z + 0.5) && y >= 0 && y <= surfaceY;
  }), 'trail should stay on land and grade only by lowering terrain');

  for (let index = 0; index < coordinates.length; index++) {
    const [x, y, z] = coordinates[index];
    const [nextX, nextY, nextZ] = coordinates[(index + 1) % coordinates.length];
    assert.equal(Math.abs(nextX - x) + Math.abs(nextZ - z), 1, 'loop should use cardinally adjacent blocks');
    assert.ok(Math.abs(nextY - y) <= 1, 'neighboring trail blocks should be step-walkable');
  }

  for (const [x, y, z] of coordinates) {
    const neighbors = [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]];
    assert.equal(neighbors.filter(([nx, nz]) => horizontalKeys.has(`${nx},${nz}`)).length, 2,
      'each trail block should have two horizontal path neighbors');
  }
});

test('generates a deterministic, walkable loop of road blocks inside Orchid Island', () => {
  const entries = orchidIslandTrailEntries();
  assert.deepEqual(orchidIslandTrailEntries(), entries);
  assert.ok(entries.length >= 12, 'the trail should form a substantial loop');
  assert.ok(entries.every(([, type]) => type === 'road'));

  const coordinates = entries.map(([key]) => key.split(',').map(Number));
  const horizontalKeys = new Set(coordinates.map(([x, , z]) => `${x},${z}`));
  assert.equal(horizontalKeys.size, entries.length, 'trail coordinates should be unique');
  assert.ok(coordinates.every(([x, y, z]) => {
    const surfaceY = terrainHeight(orchidIsland, x + 0.5, z + 0.5) - 1;
    return isIslandPoint(orchidIsland, x + 0.5, z + 0.5) && y >= 0 && y <= surfaceY;
  }), 'trail should stay on land and grade only by lowering terrain');

  for (let index = 0; index < coordinates.length; index++) {
    const [x, y, z] = coordinates[index];
    const [nextX, nextY, nextZ] = coordinates[(index + 1) % coordinates.length];
    assert.equal(Math.abs(nextX - x) + Math.abs(nextZ - z), 1, 'loop should use cardinally adjacent blocks');
    assert.ok(Math.abs(nextY - y) <= 1, 'neighboring trail blocks should be step-walkable');
  }

  for (const [x, y, z] of coordinates) {
    const neighbors = [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]];
    assert.equal(neighbors.filter(([nx, nz]) => horizontalKeys.has(`${nx},${nz}`)).length, 2,
      'each trail block should have two horizontal path neighbors');
  }
});
