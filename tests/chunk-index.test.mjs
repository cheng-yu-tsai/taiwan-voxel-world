import assert from 'node:assert/strict';
import test from 'node:test';
import { ChunkBlockIndex, isValidBlockKey } from '../site/game/chunk-index.js';

test('rejects a non-positive or fractional chunk size', () => {
  assert.throws(() => new ChunkBlockIndex(0), RangeError);
  assert.throws(() => new ChunkBlockIndex(2.5), RangeError);
});

test('groups block keys by floored horizontal chunk coordinates', () => {
  const index = new ChunkBlockIndex(16);
  index.add('-1,4,-17');
  index.add('0,1,0');
  index.add('15,2,15');
  assert.deepEqual([...index.get('-1,-2')], ['-1,4,-17']);
  assert.deepEqual([...index.get('0,0')], ['0,1,0', '15,2,15']);
});

test('does not duplicate a block key in its chunk', () => {
  const index = new ChunkBlockIndex(16);
  assert.equal(index.add('3,1,3'), true);
  assert.equal(index.add('3,1,3'), false);
  assert.deepEqual([...index.get('0,0')], ['3,1,3']);
});

test('rejects malformed block keys', () => {
  const index = new ChunkBlockIndex(16);
  assert.throws(() => index.add('1,2'), TypeError);
  assert.throws(() => index.add('1,not-a-number,2'), TypeError);
  assert.throws(() => index.add('9007199254741000,1,2'), TypeError);
  assert.throws(() => index.add(null), TypeError);
  assert.equal(isValidBlockKey('1,-2,3'), true);
  assert.equal(isValidBlockKey('1,2'), false);
});

test('removes keys and deletes an empty chunk bucket', () => {
  const index = new ChunkBlockIndex(16);
  index.add('1,2,1');
  assert.equal(index.remove('9,0,9'), false);
  assert.equal(index.remove('1,2,1'), true);
  assert.equal(index.get('0,0'), undefined);
  assert.deepEqual([...index.chunkKeys()], []);
});

test('clears all chunk buckets', () => {
  const index = new ChunkBlockIndex(16);
  index.add('1,2,1');
  index.add('32,2,-16');
  index.clear();
  assert.equal(index.get('0,0'), undefined);
  assert.deepEqual([...index.chunkKeys()], []);
});
