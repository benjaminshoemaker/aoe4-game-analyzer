import { pointAtOrBefore } from '../../packages/aoe4-core/src/analysis/timeSeries';

describe('time series helpers', () => {
  it('returns the latest point at or before the requested timestamp', () => {
    const fallback = { timestamp: 0, value: 0 };
    const points = [
      { timestamp: 10, value: 1 },
      { timestamp: 20, value: 2 },
      { timestamp: 30, value: 3 },
    ];

    expect(pointAtOrBefore(points, 5, fallback)).toEqual(points[0]);
    expect(pointAtOrBefore(points, 20, fallback)).toEqual(points[1]);
    expect(pointAtOrBefore(points, 29, fallback)).toEqual(points[1]);
    expect(pointAtOrBefore([], 29, fallback)).toEqual(fallback);
  });
});
