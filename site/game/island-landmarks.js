import { ISLANDS } from './config.js';
import { isIslandPoint } from './island-geometry.js';
import { terrainHeight } from './terrain.js';

const columnHeights = [3, 4, 3, 2, 3, 2];

export function penghuBasaltColumnEntries() {
  const island = ISLANDS.find(candidate => candidate.id === 'penghu');
  if (!island || island.type !== 'cluster') throw new Error('Penghu island group is not configured');
  const landform = island.shape[0];
  const originX = Math.floor(landform.x) - 1;
  const originZ = Math.floor(landform.z) - 1;
  const entries = [];

  columnHeights.forEach((height, index) => {
    const x = originX + index % 3;
    const z = originZ + Math.floor(index / 3);
    if (!isIslandPoint(island, x + 0.5, z + 0.5, landform)) {
      throw new Error('Penghu basalt column falls outside its landform');
    }
    const baseY = terrainHeight(island, x + 0.5, z + 0.5);
    for (let y = 0; y < height; y++) entries.push([`${x},${baseY + y},${z}`, 'stone']);
  });

  return entries;
}
