import assert from 'node:assert/strict';
import test from 'node:test';
import { BlockEditHistory } from '../site/game/block-edit-history.js';

test('stores edits for undo and redo in the expected order', () => {
  const history = new BlockEditHistory();
  const first = { key: '0,1,0', before: null, after: 'grass' };
  const second = { key: '1,1,0', before: 'soil', after: null };
  history.record(first);
  history.record(second);
  assert.deepEqual(history.undo(), second);
  assert.deepEqual(history.undo(), first);
  assert.deepEqual(history.redo(), first);
  assert.deepEqual(history.redo(), second);
});

test('keeps block and decoration edits in one undo and redo order', () => {
  const history = new BlockEditHistory();
  const block = { key: '0,1,0', before: null, after: 'stone' };
  const decoration = { kind: 'decoration', key: '0,2,0', before: null, after: { type: 'flip-flops', rotation: 1 } };
  history.record(block);
  history.record(decoration);
  assert.deepEqual(history.undo(), decoration);
  assert.deepEqual(history.undo(), block);
  assert.deepEqual(history.redo(), block);
  assert.deepEqual(history.redo(), decoration);
});

test('clears redo history when a new edit follows an undo', () => {
  const history = new BlockEditHistory();
  history.record({ key: '0,0,0', before: null, after: 'grass' });
  history.undo();
  history.record({ key: '1,0,0', before: null, after: 'stone' });
  assert.equal(history.redo(), null);
});

test('bounds history and can be cleared after reset or import', () => {
  const history = new BlockEditHistory(2);
  for (let x = 0; x < 3; x++) history.record({ key: `${x},0,0`, before: null, after: 'grass' });
  assert.equal(history.undo().key, '2,0,0');
  assert.equal(history.undo().key, '1,0,0');
  assert.equal(history.undo(), null);
  history.record({ key: '4,0,0', before: null, after: 'soil' });
  history.clear();
  assert.equal(history.undo(), null);
  assert.equal(history.redo(), null);
});

test('requires a positive integer history limit', () => {
  assert.throws(() => new BlockEditHistory(0), RangeError);
  assert.throws(() => new BlockEditHistory(1.5), RangeError);
});

test('reports which history actions are currently available', () => {
  const history = new BlockEditHistory();
  assert.deepEqual(history.status, { canUndo: false, canRedo: false });
  history.record({ key: '0,0,0', before: null, after: 'grass' });
  assert.deepEqual(history.status, { canUndo: true, canRedo: false });
  history.undo();
  assert.deepEqual(history.status, { canUndo: false, canRedo: true });
  history.clear();
  assert.deepEqual(history.status, { canUndo: false, canRedo: false });
});
