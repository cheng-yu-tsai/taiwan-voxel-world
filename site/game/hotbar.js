export function blockForHotkey(key, blocks) {
  const slotNumber = key === '0' ? 10 : /^[1-9]$/.test(key) ? Number(key) : 0;
  const index = slotNumber - 1;
  if (index < 0 || index >= Math.min(blocks.length, 10)) return null;
  return blocks[index] ?? null;
}

export function hotkeyForIndex(index) {
  if (!Number.isInteger(index) || index < 0 || index > 9) return null;
  return String((index + 1) % 10);
}
