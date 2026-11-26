import assert from 'node:assert/strict';
import test from 'node:test';
import { ISLANDS } from '../site/game/config.js';
import { generateDefaultWorldContent } from '../site/game/world-generation.js';

test('generates every configured island before its local landmarks and street content', () => {
  const calls = [];
  const world = Object.fromEntries([
    'generateIsland',
    'seedPenghuLandmark',
    'seedKinmenLandmark',
    'seedMatsuLandmark',
    'seedGreenIslandCoastalRocks',
    'seedOrchidIslandCoastalRocks',
    'seedIslandTrails',
    'seedTaiwanStreet',
  ].map(method => [method, value => calls.push([method, value?.id ?? null])]));

  generateDefaultWorldContent(world);

  assert.deepEqual(calls, [
    ...ISLANDS.map(island => ['generateIsland', island.id]),
    ['seedPenghuLandmark', null],
    ['seedKinmenLandmark', null],
    ['seedMatsuLandmark', null],
    ['seedGreenIslandCoastalRocks', null],
    ['seedOrchidIslandCoastalRocks', null],
    ['seedIslandTrails', null],
    ['seedTaiwanStreet', null],
  ]);
});
