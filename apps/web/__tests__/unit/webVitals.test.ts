import { buildWebVitalsScript } from '../../src/lib/webVitals';

describe('web vitals monitor', () => {
  it('observes LCP, CLS, and interaction latency without blocking first paint', () => {
    const script = buildWebVitalsScript('/api/web-vitals');

    expect(script).toContain('PerformanceObserver');
    expect(script).toContain('largest-contentful-paint');
    expect(script).toContain('layout-shift');
    expect(script).toContain("type: 'event'");
    expect(script).toContain('durationThreshold: 40');
    expect(script).toContain('navigator.sendBeacon');
    expect(script).toContain('/api/web-vitals');
  });
});
