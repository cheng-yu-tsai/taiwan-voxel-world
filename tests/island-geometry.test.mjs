import assert from 'node:assert/strict';
import test from 'node:test';
import { ISLANDS } from '../site/game/config.js';
import { islandAtPosition, isIslandPoint } from '../site/game/island-geometry.js';

test('finds player positions on the Taiwan polygon and island ellipses', () => {
  for (const island of ISLANDS.filter(item => item.type !== 'cluster')) {
    assert.equal(islandAtPosition(ISLANDS, island.spawn.x + 0.5, island.spawn.z + 0.5), island);
  }
});

test('recognizes each island in a cluster without extending into surrounding sea', () => {
  const matsu = ISLANDS.find(island => island.id === 'matsu');
  for (const shape of matsu.shape) assert.equal(isIslandPoint(matsu, shape.x, shape.z, shape), true);
  assert.equal(islandAtPosition(ISLANDS, 0, 40), null);
  assert.equal(islandAtPosition(ISLANDS, -13.5, 1.5), null);
});

test('uses Taiwan polygon edges rather than its bounding rectangle', () => {
  const taiwan = ISLANDS.find(island => island.id === 'main');
  assert.equal(isIslandPoint(taiwan, -7.5, 0), false);
  assert.equal(isIslandPoint(taiwan, 0, 0), true);
});
