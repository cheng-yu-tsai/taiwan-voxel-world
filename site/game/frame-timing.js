export function summarizeFrameIntervals(intervals) {
  if (!Array.isArray(intervals) || intervals.some(value => !Number.isFinite(value) || value < 0)) {
    throw new TypeError('Frame intervals must be an array of non-negative finite numbers');
  }
  if (intervals.length === 0) return { sampleCount: 0, medianMs: null, p95Ms: null, maxMs: null };

  const ordered = [...intervals].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  const medianMs = ordered.length % 2
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
  const p95Ms = ordered[Math.ceil(ordered.length * 0.95) - 1];

  return {
    sampleCount: ordered.length,
    medianMs,
    p95Ms,
    maxMs: ordered[ordered.length - 1],
  };
}
