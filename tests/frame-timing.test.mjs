import assert from 'node:assert/strict';
import test from 'node:test';
import {
  summarizeFrameIntervals,
  summarizeLongAnimationFrames,
  summarizeVisibilityStateEntries,
} from '../site/game/frame-timing.js';

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

test('retains initial background and visible transitions from supported visibility history', () => {
  const entries = [
    { name: 'hidden', startTime: 0 },
    { name: 'visible', startTime: 214.36 },
  ];
  const original = structuredClone(entries);
  assert.deepEqual(summarizeVisibilityStateEntries(entries, 'visible'), {
    supported: true,
    initialState: 'hidden',
    transitions: [
      { state: 'hidden', startTimeMs: 0 },
      { state: 'visible', startTimeMs: 214.4 },
    ],
    currentState: 'visible',
  });
  assert.deepEqual(entries, original);
});

test('leaves initial visibility unknown when history is unavailable', () => {
  assert.deepEqual(summarizeVisibilityStateEntries([], 'visible', false), {
    supported: false,
    initialState: null,
    transitions: [],
    currentState: 'visible',
  });
});

test('rejects malformed visibility history', () => {
  assert.throws(() => summarizeVisibilityStateEntries(null, 'visible'), TypeError);
  assert.throws(() => summarizeVisibilityStateEntries([{ name: 'prerender', startTime: 0 }], 'visible'), TypeError);
  assert.throws(() => summarizeVisibilityStateEntries([{ name: 'hidden', startTime: -1 }], 'visible'), TypeError);
  assert.throws(() => summarizeVisibilityStateEntries([], 'occluded'), TypeError);
});

test('distinguishes unsupported long-frame timing from a supported empty sample', () => {
  assert.deepEqual(summarizeLongAnimationFrames([], false), {
    supported: false,
    frameCount: null,
    maxDurationMs: null,
    topScripts: [],
  });
  assert.deepEqual(summarizeLongAnimationFrames([]), {
    supported: true,
    frameCount: 0,
    maxDurationMs: null,
    topScripts: [],
  });
  assert.deepEqual(summarizeLongAnimationFrames([{ duration: 63 }]), {
    supported: true,
    frameCount: 1,
    maxDurationMs: 63,
    topScripts: [],
  });
});

test('summarizes long frames and ranks scripts by accumulated duration', () => {
  const frames = [
    { duration: 76, scripts: [{ sourceURL: '/game.js', duration: 8 }, { sourceURL: 'three.js', duration: 12 }] },
    { duration: 108, scripts: [{ sourceURL: '/game.js', duration: 30 }, { sourceURL: 'three.js', duration: 4 }] },
    { duration: 51, scripts: [] },
  ];
  const original = structuredClone(frames);

  assert.deepEqual(summarizeLongAnimationFrames(frames), {
    supported: true,
    frameCount: 3,
    maxDurationMs: 108,
    topScripts: [
      { sourceURL: '/game.js', sampleCount: 2, totalDurationMs: 38 },
      { sourceURL: 'three.js', sampleCount: 2, totalDurationMs: 16 },
    ],
  });
  assert.deepEqual(frames, original);
});

test('rejects malformed long-frame entries and script timing data', () => {
  assert.throws(() => summarizeLongAnimationFrames(null), TypeError);
  assert.throws(() => summarizeLongAnimationFrames([{ duration: -1 }]), TypeError);
  assert.throws(() => summarizeLongAnimationFrames([{ duration: NaN }]), TypeError);
  assert.throws(() => summarizeLongAnimationFrames([{ duration: 60, scripts: {} }]), TypeError);
  assert.throws(() => summarizeLongAnimationFrames([{ duration: 60, scripts: [{ sourceURL: '/game.js', duration: Infinity }] }]), TypeError);
  assert.throws(() => summarizeLongAnimationFrames([], 'unsupported'), TypeError);
});
