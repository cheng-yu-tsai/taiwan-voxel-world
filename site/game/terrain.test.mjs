import assert from 'node:assert/strict';
import test from 'node:test';
import { ISLANDS } from './config.js';
import { terrainHeight } from './terrain.js';

const island = id => ISLANDS.find(item => item.id === id);
const height = (id, x, z) => terrainHeight(island(id), x, z);

test('Taiwan main island keeps a mountain spine within the prototype height limits', () => {
  const samples = [-18, -12, -6, 0, 6, 12, 18].map(z => height('main', 1.5, z + 0.5));
  assert.ok(Math.max(...samples) >= 10);
  assert.ok(samples.every(value => value >= 1 && value <= 15));
});

test('Penghu stays low and gently varied', () => {
  const samples = [-21.5, -20.5, -19.5, -18.5].map(x => height('penghu', x, 1.5));
  assert.ok(samples.every(value => value >= 2 && value <= 3));
});

test('Kinmen forms rolling hills that taper toward the shore', () => {
  const hill = height('kinmen', -31.5, 13.5);
  const shore = height('kinmen', -28.5, 13.5);
  assert.ok(hill >= 4);
  assert.ok(hill > shore);
  assert.ok(shore >= 2);
});

test('Matsu keeps rocky relief across its island chain', () => {
  const samples = [];
  for (let x = 7.5; x <= 14.5; x += 1) {
    for (let z = -34.5; z <= -27.5; z += 1) {
      if (island('matsu').shape.some(shape => ((x - shape.x) / shape.rx) ** 2 + ((z - shape.z) / shape.rz) ** 2 <= 1)) {
        samples.push(height('matsu', x, z));
      }
    }
  }
  assert.ok(Math.max(...samples) - Math.min(...samples) >= 2);
});

test('Green Island rises from a steep volcanic coast', () => {
  const summit = height('green', 17.5, -2.5);
  const coast = height('green', 19.5, -2.5);
  assert.ok(summit >= 8);
  assert.ok(summit - coast >= 4);
});

test('Orchid Island gets two peaks along its north-south ridge', () => {
  const northPeak = height('orchid', 23.5, 6.5);
  const southPeak = height('orchid', 23.5, 9.5);
  const coast = height('orchid', 25.5, 7.5);
  assert.ok(northPeak >= 7);
  assert.ok(southPeak >= 7);
  assert.ok(northPeak > coast && southPeak > coast);
});

test('terrain is deterministic for the same island and coordinates', () => {
  const samples = ISLANDS.map(item => terrainHeight(item, item.spawn.x + 0.5, item.spawn.z + 0.5));
  const repeated = ISLANDS.map(item => terrainHeight(item, item.spawn.x + 0.5, item.spawn.z + 0.5));
  assert.deepEqual(repeated, samples);
});

test('unknown islands receive a safe low rolling fallback', () => {
  const unknown = { id: 'test', type: 'ellipse', shape: { x: 0, z: 0, rx: 2, rz: 3 } };
  const value = terrainHeight(unknown, 0.5, 0.5);
  assert.ok(value >= 2 && value <= 5);
});
