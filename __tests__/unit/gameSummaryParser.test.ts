import path from 'path';
import { parseGameSummary, loadGameSummaryFromFile } from '../../packages/aoe4-core/src/parser/gameSummaryParser';

describe('gameSummaryParser', () => {
  const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'sampleGameSummary.json');

  it('parses a valid game summary object', () => {
    const json = loadGameSummaryFromFile(fixturePath);
    const parsed = parseGameSummary(json);

    expect(parsed.gameId).toBe(123456);
    expect(parsed.mapName).toBe('Dry Arabia');
    expect(parsed.players).toHaveLength(2);
    expect(parsed.players[0].buildOrder).toHaveLength(2);
    expect(parsed.players[1].buildOrder).toHaveLength(1);
    expect(parsed.players[0].actions.age_up).toEqual([200, 500]);
  });

  it('throws when required fields are missing', () => {
    expect(() => parseGameSummary({})).toThrow(/players/);
  });

  it('normalizes nullable mapBiome to "unknown"', () => {
    const json = loadGameSummaryFromFile(fixturePath);
    const withNullBiome = {
      ...json,
      mapBiome: null,
    };

    const parsed = parseGameSummary(withNullBiome);
    expect(parsed.mapBiome).toBe('unknown');
  });

  it('coerces nullable _stats counters to zero', () => {
    const json = loadGameSummaryFromFile(fixturePath);
    const withNullableStats = {
      ...json,
      players: json.players.map((player: any, index: number) =>
        index === 0
          ? {
            ...player,
            _stats: {
              ...player._stats,
              ekills: null,
              edeaths: null,
            },
          }
          : player
      ),
    };

    const parsed = parseGameSummary(withNullableStats);
    expect(parsed.players[0]._stats.ekills).toBe(0);
    expect(parsed.players[0]._stats.edeaths).toBe(0);
  });

  it('preserves unknown build-order timestamp buckets for nonstandard unit events', () => {
    const json = loadGameSummaryFromFile(fixturePath);
    const withCattleUnknownBucket = {
      ...json,
      players: json.players.map((player: any, index: number) =>
        index === 0
          ? {
            ...player,
            buildOrder: [
              ...player.buildOrder,
              {
                id: '11216283',
                icon: 'icons/races/malian/units/cattle',
                pbgid: 2059966,
                type: 'Unit',
                finished: [],
                constructed: [],
                destroyed: [],
                unknown: {
                  '14': [120, 180],
                },
              },
            ],
          }
          : player
      ),
    };

    const parsed = parseGameSummary(withCattleUnknownBucket);
    const cattle = parsed.players[0].buildOrder.find(entry => entry.pbgid === 2059966);

    expect(cattle?.unknown?.['14']).toEqual([120, 180]);
  });

  it('preserves optional total-population and transformed timestamp series', () => {
    const json = loadGameSummaryFromFile(fixturePath);
    const withOptionalSeries = {
      ...json,
      players: json.players.map((player: any, index: number) =>
        index === 0
          ? {
            ...player,
            resources: {
              ...player.resources,
              population: [90, 200, 160],
            },
            buildOrder: [
              ...player.buildOrder,
              {
                id: 'jeanne-darc-villager',
                icon: 'icons/races/jeanne_darc/units/jeanne_darc_villager',
                pbgid: 424242,
                type: 'Unit',
                finished: [0],
                constructed: [],
                destroyed: [180],
                transformed: [120],
              },
            ],
          }
          : player
      ),
    };

    const parsed = parseGameSummary(withOptionalSeries);
    const jeanne = parsed.players[0].buildOrder.find(entry => entry.pbgid === 424242);

    expect((parsed.players[0].resources as any).population).toEqual([90, 200, 160]);
    expect((jeanne as any)?.transformed).toEqual([120]);
  });
});
