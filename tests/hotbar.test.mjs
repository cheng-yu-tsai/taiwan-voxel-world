import assert from 'node:assert/strict';
import test from 'node:test';
import { BLOCKS } from '../site/game/config.js';
import { blockForHotkey, hotkeyForIndex } from '../site/game/hotbar.js';

test('maps number keys 1 through 9 and 0 to the ten configured blocks', () => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  assert.deepEqual(keys.map(key => blockForHotkey(key, BLOCKS)?.id), BLOCKS.map(block => block.id));
});

test('returns no selection for non-digit keys or unavailable slots', () => {
  assert.equal(blockForHotkey('m', BLOCKS), null);
  assert.equal(blockForHotkey('7', BLOCKS.slice(0, 6)), null);
  assert.equal(blockForHotkey('0', BLOCKS.slice(0, 6)), null);
  assert.equal(blockForHotkey('1', new Array(1)), null);
});

test('labels the tenth slot as zero and rejects indexes outside number keys', () => {
  assert.deepEqual(Array.from({length: 10}, (_, index) => hotkeyForIndex(index)), ['1','2','3','4','5','6','7','8','9','0']);
  assert.equal(hotkeyForIndex(-1), null);
  assert.equal(hotkeyForIndex(10), null);
  assert.equal(hotkeyForIndex(1.5), null);
});
