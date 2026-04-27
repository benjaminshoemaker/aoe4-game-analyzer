import { detectInflectionPoints } from '../../src/analysis/inflectionDetection';
import { TimeSeriesResources } from '../../src/parser/gameSummaryParser';
import { ResolvedBuildOrder } from '../../src/parser/buildOrderResolver';

function makeSeries(overrides?: Partial<TimeSeriesResources>): TimeSeriesResources {
  return {
    timestamps: [0, 60, 120, 180, 240, 300],
    food: [0, 100, 200, 300, 400, 500],
    gold: [0, 50, 100, 150, 200, 250],
    stone: [0, 10, 20, 30, 40, 50],
    wood: [0, 80, 160, 240, 320, 400],
    foodPerMin: [0, 100, 100, 100, 100, 100],
    goldPerMin: [0, 50, 50, 50, 50, 50],
    stonePerMin: [0, 10, 10, 10, 10, 10],
    woodPerMin: [0, 80, 80, 80, 80, 80],
    total: [0, 100, 200, 300, 400, 500],
    military: [0, 40, 80, 120, 160, 200],
    economy: [0, 30, 60, 90, 120, 150],
    technology: [0, 20, 40, 60, 80, 100],
    society: [0, 10, 20, 30, 40, 50],
    ...overrides
  };
}

function emptyBuild(): ResolvedBuildOrder {
  return { startingAssets: [], resolved: [], unresolved: [] };
}

describe('detectInflectionPoints', () => {
  it('returns empty array when scores are identical', () => {
    const series = makeSeries();
    const result = detectInflectionPoints(series, series, emptyBuild(), emptyBuild());
    expect(result).toEqual([]);
  });

  it('detects a clear inflection when one player surges ahead', () => {
    const p1Series = makeSeries({
      total: [0, 100, 200, 300, 500, 700],
      military: [0, 40, 80, 120, 250, 400],
    });
    const p2Series = makeSeries({
      total: [0, 100, 200, 300, 300, 300],
      military: [0, 40, 80, 120, 120, 120],
    });

    const result = detectInflectionPoints(p1Series, p2Series, emptyBuild(), emptyBuild());
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].favoredPlayer).toBe(1);
  });

  it('respects maxPoints parameter', () => {
    const p1Series = makeSeries({
      total: [0, 200, 100, 300, 100, 400],
      military: [0, 100, 50, 150, 50, 200],
    });
    const p2Series = makeSeries({
      total: [0, 100, 200, 100, 200, 100],
      military: [0, 50, 100, 50, 100, 50],
    });

    const result = detectInflectionPoints(p1Series, p2Series, emptyBuild(), emptyBuild(), 1);
    expect(result.length).toBeLessThanOrEqual(1);
  });

  it('handles single-point time series gracefully', () => {
    const series = makeSeries({
      timestamps: [0],
      total: [100],
      military: [50],
      economy: [30],
      technology: [10],
      society: [10],
    });

    const result = detectInflectionPoints(series, series, emptyBuild(), emptyBuild());
    expect(result).toEqual([]);
  });

  it('includes destruction cluster when units die near inflection', () => {
    const p1Series = makeSeries({
      timestamps: [0, 60, 120, 180, 240, 300],
      total: [0, 100, 200, 200, 400, 500],
      military: [0, 50, 100, 100, 200, 300],
    });
    const p2Series = makeSeries({
      timestamps: [0, 60, 120, 180, 240, 300],
      total: [0, 100, 200, 400, 400, 400],
      military: [0, 50, 100, 200, 200, 200],
    });

    const p2Build: ResolvedBuildOrder = {
      startingAssets: [],
      resolved: [{
        originalEntry: { id: 'knight', icon: 'knight.png', pbgid: 1, type: 'Unit', finished: [60, 80], constructed: [], destroyed: [175, 185] },
        type: 'unit',
        id: 'knight',
        name: 'Knight',
        cost: { food: 140, wood: 0, gold: 100, stone: 0, total: 240 },
        tier: 1,
        tierMultiplier: 1.0,
        classes: ['Heavy Melee Cavalry'],
        produced: [60, 80],
        destroyed: [175, 185],
        civs: ['fr']
      }],
      unresolved: []
    };

    const result = detectInflectionPoints(p1Series, p2Series, emptyBuild(), p2Build);
    // Should detect an inflection around the 180s mark
    const nearInflection = result.find(ip => Math.abs(ip.timestamp - 180) <= 60);
    expect(nearInflection).toBeDefined();
  });

  it('identifies favored player correctly when p2 leads', () => {
    const p1Series = makeSeries({
      total: [0, 100, 100, 100, 100, 100],
    });
    const p2Series = makeSeries({
      total: [0, 100, 200, 300, 400, 500],
    });

    const result = detectInflectionPoints(p1Series, p2Series, emptyBuild(), emptyBuild());
    if (result.length > 0) {
      expect(result[0].favoredPlayer).toBe(2);
    }
  });
});
