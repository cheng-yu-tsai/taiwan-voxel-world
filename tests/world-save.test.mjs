import assert from 'node:assert/strict';
import test from 'node:test';
import { CONFIG_VERSION } from '../site/game/config.js';
import {
  MAX_WORLD_BLOCKS,
  MAX_WORLD_SAVE_BYTES,
  readWorldSaveFile,
  validateWorldSave,
} from '../site/game/world-save.js';

const validSave = {
  version: CONFIG_VERSION,
  blocks: [['0,0,0', 'grass'], ['-1,2,3', 'sign']],
  decorations: [],
};

const file = ({name='backup.json', type='application/json', text=JSON.stringify(validSave), size=new TextEncoder().encode(text).byteLength}={}) => ({
  name,
  type,
  size,
  text: async () => text,
});

test('accepts known block records and returns a detached normalized save', () => {
  const result = validateWorldSave(validSave);
  assert.deepEqual(result, validSave);
  assert.notEqual(result.blocks, validSave.blocks);
  assert.notEqual(result.blocks[0], validSave.blocks[0]);
});

test('rejects non-objects, incompatible versions, and missing block arrays', () => {
  assert.throws(() => validateWorldSave(null), TypeError);
  assert.throws(() => validateWorldSave([]), TypeError);
  assert.throws(() => validateWorldSave({version: -1, blocks: []}), RangeError);
  assert.throws(() => validateWorldSave({version: CONFIG_VERSION}), TypeError);
});

test('migrates version 1 block-only saves without changing block contents', () => {
  const legacy = {version: 1, blocks: [['-4,2,3', 'brick']]};
  assert.deepEqual(validateWorldSave(legacy), {version: CONFIG_VERSION, blocks: legacy.blocks, decorations: []});
});

test('validates and preserves decoration entries in version 2 saves', () => {
  const save = {...validSave, decorations: [['0,1,0', 'flip-flops', 1]]};
  assert.deepEqual(validateWorldSave(save), save);
  assert.throws(() => validateWorldSave({...save, decorations: new Array(50_001)}), RangeError);
  assert.throws(() => validateWorldSave({...save, decorations: [['3,1,4', 'flip-flops', 0]]}), RangeError);
  assert.throws(() => validateWorldSave({...save, blocks: [...save.blocks, ['0,1,0', 'stone']]}), TypeError);
});

test('rejects oversized worlds and malformed block entries', () => {
  assert.throws(() => validateWorldSave({version: CONFIG_VERSION, blocks: new Array(MAX_WORLD_BLOCKS + 1)}), RangeError);
  assert.throws(() => validateWorldSave({...validSave, blocks: [null]}), TypeError);
  assert.throws(() => validateWorldSave({...validSave, blocks: [['0,0,0']]}), TypeError);
  assert.throws(() => validateWorldSave({...validSave, blocks: [['bad,key,here', 'grass']]}), TypeError);
});

test('rejects unknown blocks, duplicate keys, and unreasonable coordinates', () => {
  assert.throws(() => validateWorldSave({...validSave, blocks: [['0,0,0', 'unknown']]}), TypeError);
  assert.throws(() => validateWorldSave({...validSave, blocks: [['0,0,0', 'grass'], ['0,0,0', 'stone']]}), TypeError);
  assert.throws(() => validateWorldSave({...validSave, blocks: [['4097,0,0', 'grass']]}), RangeError);
  assert.throws(() => validateWorldSave({...validSave, blocks: [['0,1025,0', 'grass']]}), RangeError);
  assert.throws(() => validateWorldSave({...validSave, blocks: [['01,0,0', 'grass']]}), TypeError);
  assert.throws(() => validateWorldSave({...validSave, blocks: [['-0,0,0', 'grass']]}), TypeError);
});

test('loads a JSON backup with a supported extension and MIME type', async () => {
  assert.deepEqual(await readWorldSaveFile(file({name:'WORLD.JSON'})), validSave);
  assert.deepEqual(await readWorldSaveFile(file({type:''})), validSave);
  assert.deepEqual(await readWorldSaveFile(file({type:'text/plain'})), validSave);
  const legacy = {version:1,blocks:[['-4,2,3','brick']]};
  assert.deepEqual(await readWorldSaveFile(file({text:JSON.stringify(legacy)})), {version:CONFIG_VERSION,blocks:legacy.blocks,decorations:[]});
});

test('rejects unsupported filenames, MIME types, and sizes before reading', async () => {
  await assert.rejects(readWorldSaveFile(file({name:'backup.txt'})), TypeError);
  await assert.rejects(readWorldSaveFile(file({type:'image/png'})), TypeError);
  await assert.rejects(readWorldSaveFile(file({size:MAX_WORLD_SAVE_BYTES+1})), RangeError);
  await assert.rejects(readWorldSaveFile({name:'backup.json',type:'application/json',size:NaN,text:async()=>''}), TypeError);
  await assert.rejects(readWorldSaveFile({name:'backup.json',type:'application/json',size:1}), TypeError);
});

test('rejects malformed JSON, oversized UTF-8 text, and unreadable files', async () => {
  await assert.rejects(readWorldSaveFile(file({text:'{not JSON'})), SyntaxError);
  await assert.rejects(readWorldSaveFile(file({text:' '.repeat(MAX_WORLD_SAVE_BYTES+1),size:1})), RangeError);
  await assert.rejects(readWorldSaveFile({name:'backup.json',type:'application/json',size:1,text:async()=>{throw new Error('internal')}}), Error);
  await assert.rejects(readWorldSaveFile({name:'backup.json',type:'application/json',size:1,text:async()=>null}), TypeError);
});
