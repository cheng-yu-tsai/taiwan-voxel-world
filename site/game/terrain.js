function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function nearestLandform(island, x, z) {
  const landforms = island.type === 'cluster' ? island.shape : [island.shape];
  return landforms.reduce((closest, shape) => {
    const dx = (x - shape.x) / shape.rx;
    const dz = (z - shape.z) / shape.rz;
    const distance = Math.hypot(dx, dz);
    return !closest || distance < closest.distance ? { shape, dx, dz, distance } : closest;
  }, null);
}

function ridgeTexture(x, z) {
  return Math.abs(Math.sin(x * 1.35 + z * 0.8)) * 0.7
    + Math.abs(Math.cos(z * 1.1 - x * 0.6)) * 0.35;
}

export function terrainHeight(island, x, z) {
  if (island.id === 'main') {
    const ridge = 0.75 + Math.sin(z * 0.21) * 0.82 + Math.sin(z * 0.07) * 0.55;
    const distance = Math.abs(x - ridge);
    const range = Math.exp(-(distance * distance) / 19);
    const foothill = Math.exp(-(distance * distance) / 73);
    const variation = Math.sin(x * 1.7 + z * 0.62) * 0.55 + Math.cos(z * 0.83 - x * 0.38) * 0.4;
    return clamp(1 + Math.round(10.5 * range + 2.2 * foothill + variation), 1, 15);
  }

  if (island.id === 'penghu') {
    return 2 + Math.round(Math.max(0, Math.sin(x * 1.3 + z) * 0.8));
  }

  const landform = nearestLandform(island, x, z);
  const { dx, dz, distance } = landform;
  const edge = Math.max(0, 1 - distance);

  if (island.id === 'kinmen') {
    const lowHills = 1.8 * edge + ridgeTexture(x, z) * 0.65;
    return clamp(2 + Math.round(lowHills), 2, 5);
  }

  if (island.id === 'matsu') {
    const rockyRidge = Math.abs(Math.sin(x * 3.1 + z * 2.3)) * 2.4;
    const unevenCoast = Math.abs(Math.cos(x * 1.6 - z * 1.7)) * 1.2;
    return clamp(2 + Math.round(edge * 1.1 + rockyRidge + unevenCoast), 2, 6);
  }

  if (island.id === 'green') {
    const summit = 8.2 * Math.exp(-((dx - 0.1) ** 2 + (dz + 0.05) ** 2) / 0.4);
    const volcanicSlope = summit + edge * 0.8 + ridgeTexture(x, z) * 0.45;
    return clamp(2 + Math.round(volcanicSlope), 2, 12);
  }

  if (island.id === 'orchid') {
    const northPeak = 7.5 * Math.exp(-((dx - 0.08) ** 2 / 0.35) - ((dz + 0.14) ** 2 / 0.16));
    const southPeak = 6.5 * Math.exp(-((dx - 0.08) ** 2 / 0.35) - ((dz - 0.68) ** 2 / 0.16));
    const ridge = Math.max(northPeak, southPeak) + edge * 1.2 + ridgeTexture(x, z) * 0.55;
    return clamp(2 + Math.round(ridge), 2, 12);
  }

  return clamp(2 + Math.round(edge + ridgeTexture(x, z) * 0.5), 2, 5);
}
