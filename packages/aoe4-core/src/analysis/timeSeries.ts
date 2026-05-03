export interface TimestampedPoint {
  timestamp: number;
}

export function pointAtOrBefore<T extends TimestampedPoint>(
  series: T[],
  timestamp: number,
  fallback: T
): T {
  if (series.length === 0) return fallback;

  let candidate = series[0];
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }

  return candidate;
}
