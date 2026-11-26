import { BLOCKS, CONFIG_VERSION } from './config.js';
import { MAX_WORLD_DECORATIONS, normalizeDecorationEntries } from './world-objects.js';

export const MAX_WORLD_BLOCKS = 500_000;
export const MAX_WORLD_SAVE_BYTES = 32 * 1024 * 1024;
const MAX_HORIZONTAL_COORDINATE = 4096;
const MAX_VERTICAL_COORDINATE = 1024;
const knownBlocks = new Set(BLOCKS.map(block => block.id));

function validateBlockKey(key) {
  if (typeof key !== 'string') throw new TypeError('方塊座標必須是文字');
  const parts = key.split(',');
  if (parts.length !== 3 || parts.some(part => !/^-?\d+$/.test(part))) throw new TypeError(`無效的方塊座標：${key}`);
  const [x, y, z] = parts.map(Number);
  if (![x, y, z].every(Number.isSafeInteger)) throw new TypeError(`無效的方塊座標：${key}`);
  if (parts.some((part, index) => String([x, y, z][index]) !== part)) throw new TypeError(`方塊座標必須使用標準整數格式：${key}`);
  if (Math.abs(x) > MAX_HORIZONTAL_COORDINATE || Math.abs(z) > MAX_HORIZONTAL_COORDINATE || y < 0 || y > MAX_VERTICAL_COORDINATE) {
    throw new RangeError(`方塊座標超出支援範圍：${key}`);
  }
}

export function validateWorldSave(save) {
  if (!save || typeof save !== 'object' || Array.isArray(save)) throw new TypeError('存檔格式必須是物件');
  if (save.version !== 1 && save.version !== CONFIG_VERSION) throw new RangeError('不支援這個存檔版本');
  if (!Array.isArray(save.blocks)) throw new TypeError('存檔缺少方塊清單');
  if (save.blocks.length > MAX_WORLD_BLOCKS) throw new RangeError('方塊數量超出上限');
  const seen = new Set();
  const blocks = save.blocks.map((entry, index) => {
    if (!Array.isArray(entry) || entry.length !== 2) throw new TypeError(`第 ${index + 1} 個方塊資料格式錯誤`);
    const [key, type] = entry;
    validateBlockKey(key);
    if (!knownBlocks.has(type)) throw new TypeError(`第 ${index + 1} 個方塊類型不支援`);
    if (seen.has(key)) throw new TypeError(`存檔包含重複座標：${key}`);
    seen.add(key);
    return [key, type];
  });
  let decorations = [];
  if (save.version === CONFIG_VERSION) decorations = normalizeDecorationEntries(save.decorations);
  else if (save.decorations !== undefined) throw new TypeError('版本 1 存檔不能包含道具清單');
  if (decorations.length > MAX_WORLD_DECORATIONS) throw new RangeError('道具數量超出上限');
  const blockKeys = new Set(blocks.map(([key]) => key));
  for (const [key] of decorations) {
    if (blockKeys.has(key)) throw new TypeError(`道具座標被方塊佔用：${key}`);
    const [x,y,z]=key.split(',').map(Number);
    if (!blockKeys.has(`${x},${y-1},${z}`)) throw new RangeError(`道具缺少支撐方塊：${key}`);
  }
  return { version: CONFIG_VERSION, blocks, decorations };
}

export async function readWorldSaveFile(file) {
  if (!file || typeof file !== 'object' || typeof file.name !== 'string' || typeof file.text !== 'function') throw new TypeError('無法讀取這個檔案');
  if (!file.name.toLowerCase().endsWith('.json')) throw new TypeError('請選擇 JSON 存檔');
  const mimeType = typeof file.type === 'string' ? file.type.split(';', 1)[0].trim().toLowerCase() : '';
  if (mimeType && !['application/json', 'text/plain'].includes(mimeType)) throw new TypeError('這個檔案類型不是 JSON');
  if (!Number.isFinite(file.size) || file.size < 0) throw new TypeError('無法確認檔案大小');
  if (file.size > MAX_WORLD_SAVE_BYTES) throw new RangeError('存檔超過 32 MB 上限');
  const text = await file.text();
  if (typeof text !== 'string') throw new TypeError('無法讀取檔案內容');
  if (new TextEncoder().encode(text).byteLength > MAX_WORLD_SAVE_BYTES) throw new RangeError('存檔超過 32 MB 上限');
  return validateWorldSave(JSON.parse(text));
}
