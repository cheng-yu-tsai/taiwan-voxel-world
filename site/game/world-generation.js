import { ISLANDS } from './config.js';

// Shared by the actual game and the benchmark so fresh-world costs stay representative.
export function generateDefaultWorldContent(world) {
  for (const island of ISLANDS) world.generateIsland(island);
  world.seedPenghuLandmark();
  world.seedKinmenLandmark();
  world.seedMatsuLandmark();
  world.seedGreenIslandCoastalRocks();
  world.seedIslandTrails();
  world.seedTaiwanStreet();
}
