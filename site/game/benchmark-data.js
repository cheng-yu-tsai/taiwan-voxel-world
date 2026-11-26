export function* syntheticBlockEntries(count, layout, chunkSize = 16) {
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Synthetic block count must be a non-negative safe integer');
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) throw new RangeError('Chunk size must be a positive integer');
  if (!['distributed', 'single-chunk'].includes(layout)) throw new TypeError(`Unknown synthetic workload layout: ${layout}`);
  const chunkOrigin = Math.ceil(800 / chunkSize) * chunkSize;

  for (let index = 0; index < count; index++) {
    let x, y, z;
    if (layout === 'single-chunk') {
      x = chunkOrigin + index % chunkSize;
      z = chunkOrigin + Math.floor(index / chunkSize) % chunkSize;
      y = 10 + Math.floor(index / (chunkSize ** 2)) * 2;
    } else {
      x = 100 + index % 160;
      z = 100 + Math.floor(index / 160);
      y = 1 + index % 5;
    }
    yield [`${x},${y},${z}`, 'stone'];
  }
}
