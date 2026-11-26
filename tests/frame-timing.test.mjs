import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeFrameIntervals } from '../site/game/frame-timing.js';

test('returns null timing values when no frames were sampled', () => {
  assert.deepEqual(summarizeFrameIntervals([]), {
    sampleCount: 0,
    medianMs: null,
    p95Ms: null,
    maxMs: null,
  });
});

test('reports median, nearest-rank P95, and maximum without changing input', () => {
  const intervals = Array.from({length: 20}, (_, index) => 20 - index);
  const original = [...intervals];
  assert.deepEqual(summarizeFrameIntervals(intervals), {
    sampleCount: 20,
    medianMs: 10.5,
    p95Ms: 19,
    maxMs: 20,
  });
  assert.deepEqual(intervals, original);
});

test('handles a single sample and zero-millisecond intervals', () => {
  assert.deepEqual(summarizeFrameIntervals([0]), {
    sampleCount: 1,
    medianMs: 0,
    p95Ms: 0,
    maxMs: 0,
  });
});

test('rejects non-array, negative, and non-finite frame intervals', () => {
  assert.throws(() => summarizeFrameIntervals(null), TypeError);
  assert.throws(() => summarizeFrameIntervals([-0.1]), TypeError);
  assert.throws(() => summarizeFrameIntervals([NaN]), TypeError);
  assert.throws(() => summarizeFrameIntervals([Infinity]), TypeError);
});
