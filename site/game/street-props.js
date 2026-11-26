const scooterShape = [
  [0, 0, 0, 'road'],
  [0, 0, 2, 'road'],
  [0, 1, 0, 'stone'],
  [0, 1, 1, 'brick'],
  [0, 1, 2, 'stone'],
  [0, 2, 1, 'wood'],
  [0, 2, 2, 'sign'],
  [0, 3, 2, 'wood'],
];

export function scooterBlockEntries(originX, baseY, originZ) {
  if (![originX, baseY, originZ].every(Number.isSafeInteger)) {
    throw new TypeError('Scooter origin must use safe integer block coordinates');
  }
  return scooterShape.map(([dx, dy, dz, type]) => {
    const x = originX + dx, y = baseY + dy, z = originZ + dz;
    if (![x, y, z].every(Number.isSafeInteger)) {
      throw new RangeError('Scooter position exceeds safe integer block coordinates');
    }
    return [`${x},${y},${z}`, type];
  });
}
