function parseBlockKey(blockKey) {
  if (typeof blockKey !== 'string') throw new TypeError('Block keys must be strings');
  const parts = blockKey.split(',');
  if (parts.length !== 3 || parts.some(part => !/^-?\d+$/.test(part))) {
    throw new TypeError(`Invalid block key: ${blockKey}`);
  }
  const coordinates = parts.map(Number);
  if (!coordinates.every(Number.isSafeInteger)) throw new TypeError(`Invalid block key: ${blockKey}`);
  return coordinates;
}

export function isValidBlockKey(blockKey) {
  try {
    parseBlockKey(blockKey);
    return true;
  } catch {
    return false;
  }
}

export class ChunkBlockIndex {
  constructor(chunkSize) {
    if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
      throw new RangeError('Chunk size must be a positive integer');
    }
    this.chunkSize = chunkSize;
    this.byChunk = new Map();
  }

  keyFor(x, z) {
    return `${Math.floor(x / this.chunkSize)},${Math.floor(z / this.chunkSize)}`;
  }

  add(blockKey) {
    const [x, , z] = parseBlockKey(blockKey);
    const chunkKey = this.keyFor(x, z);
    let blockKeys = this.byChunk.get(chunkKey);
    if (!blockKeys) {
      blockKeys = new Set();
      this.byChunk.set(chunkKey, blockKeys);
    }
    if (blockKeys.has(blockKey)) return false;
    blockKeys.add(blockKey);
    return true;
  }

  remove(blockKey) {
    const [x, , z] = parseBlockKey(blockKey);
    const chunkKey = this.keyFor(x, z);
    const blockKeys = this.byChunk.get(chunkKey);
    if (!blockKeys?.delete(blockKey)) return false;
    if (blockKeys.size === 0) this.byChunk.delete(chunkKey);
    return true;
  }

  get(chunkKey) {
    return this.byChunk.get(chunkKey);
  }

  chunkKeys() {
    return this.byChunk.keys();
  }

  clear() {
    this.byChunk.clear();
  }
}
