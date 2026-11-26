function pointInPolygon(x, z, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i], [xj, zj] = polygon[j];
    const crosses = ((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi + Number.EPSILON) + xi);
    if (crosses) inside = !inside;
  }
  return inside;
}

function insideEllipse(x, z, shape) {
  return ((x - shape.x) / shape.rx) ** 2 + ((z - shape.z) / shape.rz) ** 2 <= 1;
}

export function isIslandPoint(island, x, z, shape) {
  if (island.type === 'polygon') return pointInPolygon(x, z, island.shape);
  const shapes = shape ? [shape] : island.type === 'cluster' ? island.shape : [island.shape];
  return shapes.some(candidate => insideEllipse(x, z, candidate));
}

export function islandAtPosition(islands, x, z) {
  return islands.find(island => isIslandPoint(island, x, z)) ?? null;
}
