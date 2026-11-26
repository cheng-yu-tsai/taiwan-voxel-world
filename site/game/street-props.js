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

const crosswalkShape = [
  [0, 0, 0, 'concrete'], [1, 0, 0, 'concrete'],
  [0, 0, 2, 'concrete'], [1, 0, 2, 'concrete'],
  [0, 0, 4, 'concrete'], [1, 0, 4, 'concrete'],
];

const streetlampShape = [
  [0, 1, 0, 'wood'],
  [0, 2, 0, 'wood'],
  [-1, 2, 0, 'wood'],
  [-2, 2, 0, 'wood'],
  [-2, 1, 0, 'sign'],
];

const streetBenchShape = [
  [0, 1, 0, 'wood'],
  [0, 1, 1, 'wood'],
  [0, 1, 2, 'wood'],
  [1, 1, 0, 'concrete'],
  [1, 1, 2, 'concrete'],
  [1, 2, 0, 'wood'],
  [1, 2, 1, 'wood'],
  [1, 2, 2, 'wood'],
];

function translatedPropEntries(shape, originX, baseY, originZ) {
  if (![originX, baseY, originZ].every(Number.isSafeInteger)) {
    throw new TypeError('Street prop origin must use safe integer block coordinates');
  }
  return shape.map(([dx, dy, dz, type]) => {
    const x = originX + dx, y = baseY + dy, z = originZ + dz;
    if (![x, y, z].every(Number.isSafeInteger)) {
      throw new RangeError('Street prop position exceeds safe integer block coordinates');
    }
    return [`${x},${y},${z}`, type];
  });
}

export function scooterBlockEntries(originX, baseY, originZ) {
  return translatedPropEntries(scooterShape, originX, baseY, originZ);
}

export function crosswalkBlockEntries(originX, baseY, originZ) {
  return translatedPropEntries(crosswalkShape, originX, baseY, originZ);
}

export function streetlampBlockEntries(originX, baseY, originZ) {
  return translatedPropEntries(streetlampShape, originX, baseY, originZ);
}

export function streetBenchBlockEntries(originX, baseY, originZ) {
  return translatedPropEntries(streetBenchShape, originX, baseY, originZ);
}
