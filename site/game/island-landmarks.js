import { ISLANDS } from './config.js';
import { isIslandPoint } from './island-geometry.js';
import { greenIslandTrailEntries, orchidIslandTrailEntries } from './island-trails.js';
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
const matsuColumnHeights = [3, 2];
const matsuCoastalOutcropShape = [[8, -29, 2], [8, -30, 3], [8, -31, 1]];
const coastalRockHeights = [2, 3];
const taiwanLookout = { x: 0, z: 11, width: 3, depth: 3 };
const islandTrailEntriesById = new Map([
  ['green', greenIslandTrailEntries],
  ['orchid', orchidIslandTrailEntries],
]);

function ellipseCoastalRockEntries(islandId) {
  const island = ISLANDS.find(candidate => candidate.id === islandId);
  if (!island || island.type !== 'ellipse') throw new Error(`${islandId} island ellipse is not configured`);
  const trailEntries = islandTrailEntriesById.get(islandId);
  if (!trailEntries) throw new Error(`${islandId} island trail is not configured`);

  const landform = island.shape;
  const originX = Math.floor(landform.x) - 1;
  const originZ = Math.floor(landform.z - landform.rz);
  const spawnColumn = `${Math.floor(island.spawn.x)},${Math.floor(island.spawn.z)}`;
  const trailColumns = new Set(trailEntries().map(([key]) => {
    const [x, , z] = key.split(',');
    return `${x},${z}`;
  }));
  const entries = [];

  coastalRockHeights.forEach((height, dx) => {
    const x = originX + dx, z = originZ;
    const column = `${x},${z}`;
    if (!isIslandPoint(island, x + 0.5, z + 0.5)) throw new Error(`${island.name} coastal rock falls outside its island`);
    if (column === spawnColumn) throw new Error(`${island.name} coastal rock occupies its spawn column`);
    if (trailColumns.has(column)) throw new Error(`${island.name} coastal rock overlaps its trail`);
    const baseY = terrainHeight(island, x + 0.5, z + 0.5);
    for (let offset = 0; offset < height; offset++) entries.push([`${x},${baseY + offset},${z}`, 'stone']);
  });

  return entries;
}

export function taiwanMountainLookoutEntries() {
  const island = ISLANDS.find(candidate => candidate.id === 'main');
  if (!island || island.type !== 'polygon') throw new Error('Taiwan mainland polygon is not configured');

  const spawnColumn = `${Math.floor(island.spawn.x)},${Math.floor(island.spawn.z)}`;
  const entries = [];
  const surfaceLevels = [];
  for (let dx = 0; dx < taiwanLookout.width; dx++) {
    for (let dz = 0; dz < taiwanLookout.depth; dz++) {
      const x = taiwanLookout.x + dx, z = taiwanLookout.z + dz;
      if (!isIslandPoint(island, x + 0.5, z + 0.5)) throw new Error('Taiwan mountain lookout falls outside the mainland');
      if (`${x},${z}` === spawnColumn) throw new Error('Taiwan mountain lookout occupies the spawn column');
      surfaceLevels.push(terrainHeight(island, x + 0.5, z + 0.5) - 1);
    }
  }

  if (new Set(surfaceLevels).size !== 1) throw new Error('Taiwan mountain lookout deck must stay level');
  const surfaceY = surfaceLevels[0];
  const railY = surfaceY + 1;
  for (let dx = 0; dx < taiwanLookout.width; dx++) {
    for (let dz = 0; dz < taiwanLookout.depth; dz++) {
      const x = taiwanLookout.x + dx, z = taiwanLookout.z + dz;
      entries.push([`${x},${surfaceY},${z}`, 'stone']);
    }
  }

  for (let dx = 0; dx < taiwanLookout.width; dx++) {
    entries.push([`${taiwanLookout.x + dx},${railY},${taiwanLookout.z + taiwanLookout.depth - 1}`, 'wood']);
  }
  entries.push([`${taiwanLookout.x},${railY},${taiwanLookout.z + 1}`, 'wood']);
  entries.push([`${taiwanLookout.x + taiwanLookout.width - 1},${railY},${taiwanLookout.z + 1}`, 'wood']);
  entries.push([`${taiwanLookout.x + 1},${railY + 1},${taiwanLookout.z + taiwanLookout.depth - 1}`, 'sign']);

  const approach = { x: taiwanLookout.x + 1, z: taiwanLookout.z - 1 };
  const approachY = terrainHeight(island, approach.x + 0.5, approach.z + 0.5) - 1;
  if (!isIslandPoint(island, approach.x + 0.5, approach.z + 0.5) || Math.abs(approachY - surfaceY) > 1) {
    throw new Error('Taiwan mountain lookout needs an adjacent southern approach');
  }

  return entries;
}

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

export function matsuStoneTowerEntries() {
  const island = ISLANDS.find(candidate => candidate.id === 'matsu');
  if (!island || island.type !== 'cluster') throw new Error('Matsu island group is not configured');
  const landform = island.shape[0];
  const originX = Math.floor(landform.x);
  const originZ = Math.floor(landform.z) + 1;
  const entries = [];

  matsuColumnHeights.forEach((height, dx) => {
    const x = originX + dx, z = originZ;
    if (!isIslandPoint(island, x + 0.5, z + 0.5, landform)) throw new Error('Matsu tower falls outside its landform');
    const baseY = terrainHeight(island, x + 0.5, z + 0.5);
    for (let offset = 0; offset < height; offset++) entries.push([`${x},${baseY + offset},${z}`, 'stone']);
    if (dx === 0) entries.push([`${x},${baseY + height},${z}`, 'sign']);
  });

  return entries;
}

export function matsuCoastalOutcropEntries() {
  const island = ISLANDS.find(candidate => candidate.id === 'matsu');
  if (!island || island.type !== 'cluster') throw new Error('Matsu island group is not configured');
  const [mainLandform] = island.shape;
  const spawnColumn = `${Math.floor(island.spawn.x)},${Math.floor(island.spawn.z)}`;
  const towerColumns = new Set(matsuStoneTowerEntries().map(([key]) => {
    const [x, , z] = key.split(',');
    return `${x},${z}`;
  }));
  const entries = [];

  for (const [x, z, height] of matsuCoastalOutcropShape) {
    const column = `${x},${z}`;
    if (!isIslandPoint(island, x + 0.5, z + 0.5, mainLandform)) {
      throw new Error('Matsu coastal outcrop falls outside the main island');
    }
    if (column === spawnColumn || towerColumns.has(column)) {
      throw new Error('Matsu coastal outcrop overlaps the spawn or stone tower');
    }
    const edgeDistance = Math.hypot((x + 0.5 - mainLandform.x) / mainLandform.rx,
      (z + 0.5 - mainLandform.z) / mainLandform.rz);
    if (edgeDistance <= 0.6) throw new Error('Matsu coastal outcrop should stay near the island edge');
    const baseY = terrainHeight(island, x + 0.5, z + 0.5);
    for (let offset = 0; offset < height; offset++) entries.push([`${x},${baseY + offset},${z}`, 'stone']);
  }

  return entries;
}

export function greenIslandCoastalRockEntries() {
  return ellipseCoastalRockEntries('green');
}

export function orchidIslandCoastalRockEntries() {
  return ellipseCoastalRockEntries('orchid');
}
