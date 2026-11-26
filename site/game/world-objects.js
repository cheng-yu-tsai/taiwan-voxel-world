export const MAX_WORLD_DECORATIONS = 50_000;
export const DECORATIONS = [
  { id: 'flip-flops', name: '藍白拖', swatch: '#5b9cba' },
  { id: 'baseball-bat', name: '球棒', swatch: '#bb8250' },
];

const knownDecorations = new Set(DECORATIONS.map(item => item.id));
const MAX_HORIZONTAL_COORDINATE = 4096;
const MAX_VERTICAL_COORDINATE = 1024;

function parseDecorationKey(key) {
  if (typeof key !== 'string') throw new TypeError('道具座標必須是文字');
  const parts = key.split(',');
  if (parts.length !== 3 || parts.some(part => !/^-?\d+$/.test(part))) throw new TypeError(`無效的道具座標：${key}`);
  const coords = parts.map(Number);
  if (!coords.every(Number.isSafeInteger)) throw new TypeError(`道具座標超出整數範圍：${key}`);
  if (parts.some((part, index) => String(coords[index]) !== part)) throw new TypeError(`道具座標必須使用標準整數格式：${key}`);
  const [x, y, z] = coords;
  if (Math.abs(x) > MAX_HORIZONTAL_COORDINATE || Math.abs(z) > MAX_HORIZONTAL_COORDINATE || y < 1 || y > MAX_VERTICAL_COORDINATE) {
    throw new RangeError(`道具座標超出支援範圍：${key}`);
  }
  return coords;
}

export function decorationKey(x, y, z) {
  if (![x, y, z].every(Number.isSafeInteger)) throw new TypeError('道具座標必須是安全整數');
  const key = `${x},${y},${z}`;
  parseDecorationKey(key);
  return key;
}

export function normalizeDecorationEntries(entries) {
  if (!Array.isArray(entries)) throw new TypeError('存檔缺少道具清單');
  if (entries.length > MAX_WORLD_DECORATIONS) throw new RangeError('道具數量超出上限');
  const seen = new Set();
  return entries.map((entry, index) => {
    if (!Array.isArray(entry) || entry.length !== 3) throw new TypeError(`第 ${index + 1} 個道具資料格式錯誤`);
    const [key, type, rotation] = entry;
    parseDecorationKey(key);
    if (!knownDecorations.has(type)) throw new TypeError(`第 ${index + 1} 個道具類型不支援`);
    if (!Number.isInteger(rotation) || rotation < 0 || rotation > 3) throw new RangeError(`第 ${index + 1} 個道具旋轉角度錯誤`);
    if (seen.has(key)) throw new TypeError(`存檔包含重複道具座標：${key}`);
    seen.add(key);
    return [key, type, rotation];
  });
}

export function canPlaceDecoration(blocks, decorations, key, type, rotation = 0) {
  let coords;
  try {
    coords = parseDecorationKey(key);
  } catch {
    return false;
  }
  if (!knownDecorations.has(type) || !Number.isInteger(rotation) || rotation < 0 || rotation > 3) return false;
  if (blocks.has(key) || decorations.has(key)) return false;
  const [x, y, z] = coords;
  return blocks.has(`${x},${y - 1},${z}`);
}
