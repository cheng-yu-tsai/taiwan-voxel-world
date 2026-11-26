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

export function summarizeLongAnimationFrames(entries, supported = true) {
  if (!Array.isArray(entries) || typeof supported !== 'boolean') {
    throw new TypeError('Long animation frame data must be an array with a support flag');
  }
  if (!supported) {
    return { supported: false, frameCount: null, maxDurationMs: null, topScripts: [] };
  }

  const scriptTotals = new Map();
  let maxDurationMs = null;
  for (const entry of entries) {
    if (!entry || typeof entry !== 'object' || !Number.isFinite(entry.duration) || entry.duration < 0
      || (entry.scripts !== undefined && !Array.isArray(entry.scripts))) {
      throw new TypeError('Long animation frame entries must include valid durations and script lists');
    }
    maxDurationMs = maxDurationMs === null ? entry.duration : Math.max(maxDurationMs, entry.duration);
    for (const script of entry.scripts ?? []) {
      if (!script || typeof script !== 'object' || typeof script.sourceURL !== 'string'
        || !Number.isFinite(script.duration) || script.duration < 0) {
        throw new TypeError('Long animation frame scripts must include a source URL and valid duration');
      }
      const total = scriptTotals.get(script.sourceURL) ?? { sourceURL: script.sourceURL, sampleCount: 0, totalDurationMs: 0 };
      total.sampleCount++;
      total.totalDurationMs += script.duration;
      scriptTotals.set(script.sourceURL, total);
    }
  }

  const topScripts = [...scriptTotals.values()].sort((left, right) =>
    right.totalDurationMs - left.totalDurationMs || left.sourceURL.localeCompare(right.sourceURL));
  return { supported: true, frameCount: entries.length, maxDurationMs, topScripts };
}
