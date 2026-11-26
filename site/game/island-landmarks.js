import { ISLANDS } from './config.js';
import { isIslandPoint } from './island-geometry.js';
import { terrainHeight } from './terrain.js';

const columnHeights = [3, 4, 3, 2, 3, 2];
const windLionShape = [
  [0, 0, 1], [2, 0, 1],
  [1, 0, 0], [1, 0, 1],
  [1, 1, 1], [1, 2, 1],
  [1, 3, 1], [0, 3, 1], [2, 3, 1],
  [1, 4, 1], [0, 4, 1], [2, 4, 1],
  [1, 2, 0],
];

export function penghuBasaltColumnEntries() {
  const island = ISLANDS.find(candidate => candidate.id === 'penghu');
  if (!island || island.type !== 'cluster') throw new Error('Penghu island group is not configured');
  const landform = island.shape[0];
  const originX = Math.floor(landform.x) - 1;
  const originZ = Math.floor(landform.z) + 1;
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

export function kinmenWindLionEntries() {
  const island = ISLANDS.find(candidate => candidate.id === 'kinmen');
  if (!island || island.type !== 'ellipse') throw new Error('Kinmen island ellipse is not configured');
  const shape = island.shape;
  const originX = Math.floor(shape.x) - 1;
  const originZ = Math.floor(shape.z) + 1;
  return windLionShape.map(([dx, dy, dz]) => {
    const x = originX + dx, z = originZ + dz;
    if (!isIslandPoint(island, x + 0.5, z + 0.5)) throw new Error('Kinmen guardian falls outside its island');
    const y = terrainHeight(island, x + 0.5, z + 0.5) + dy;
    return [`${x},${y},${z}`, 'stone'];
  });
}
