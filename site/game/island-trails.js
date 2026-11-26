import { ISLANDS } from './config.js';
import { terrainHeight } from './terrain.js';
import { isIslandPoint } from './island-geometry.js';

const TRAIL_RADIUS = 0.76;
const TRACE_STEPS = 128;

function appendConnected(route, point, used, islandName, closesLoop = false) {
  const previous = route.at(-1);
  const distance = Math.abs(point.x - previous.x) + Math.abs(point.z - previous.z);
  if (distance === 0) return;
  if (distance !== 1) {
    throw new Error(`${islandName} trail sampling skipped a land block`);
  }
  if (closesLoop) return;
  const key = `${point.x},${point.z}`;
  if (used.has(key)) throw new Error(`${islandName} trail crossed itself`);
  route.push(point);
  used.add(key);
}

function gradeHeights(surfaceHeights) {
  const count = surfaceHeights.length;
  return surfaceHeights.map((_, index) => {
    let graded = Infinity;
    for (let source = 0; source < count; source++) {
      const directDistance = Math.abs(index - source);
      const loopDistance = Math.min(directDistance, count - directDistance);
      graded = Math.min(graded, surfaceHeights[source] + loopDistance);
    }
    return graded;
  });
}

function islandTrailEntries(islandId) {
  const island = ISLANDS.find(candidate => candidate.id === islandId);
  if (!island || island.type !== 'ellipse') throw new Error(`Island ellipse is not configured: ${islandId}`);
  const islandName = island.name;
  const shape = island.shape;
  const route = [];
  const used = new Set();

  for (let step = 0; step < TRACE_STEPS; step++) {
    const angle = step * Math.PI * 2 / TRACE_STEPS;
    const x = Math.floor(shape.x + Math.cos(angle) * shape.rx * TRAIL_RADIUS);
    const z = Math.floor(shape.z + Math.sin(angle) * shape.rz * TRAIL_RADIUS);
    if (!isIslandPoint(island, x + 0.5, z + 0.5)) continue;
    if (!route.length) {
      route.push({ x, z });
      used.add(`${x},${z}`);
    } else {
      appendConnected(route, { x, z }, used, islandName);
    }
  }

  if (route.length < 4) throw new Error(`${islandName} trail is too small to form a loop`);
  appendConnected(route, route[0], used, islandName, true);

  const surfaceHeights = route.map(({ x, z }) => terrainHeight(island, x + 0.5, z + 0.5) - 1);
  const trailHeights = gradeHeights(surfaceHeights);
  return route.map(({ x, z }, index) => [`${x},${trailHeights[index]},${z}`, 'road']);
}

export function greenIslandTrailEntries() {
  return islandTrailEntries('green');
}

export function orchidIslandTrailEntries() {
  return islandTrailEntries('orchid');
}
