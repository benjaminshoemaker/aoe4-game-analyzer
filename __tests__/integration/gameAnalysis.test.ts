import nock from 'nock';
import fs from 'fs';
import path from 'path';
import { analyzeGame } from '../../packages/aoe4-core/src/analysis/gameAnalysis';
import { sampleUnits, sampleBuildings, sampleTechnologies } from '../helpers/testData';

const fixtureData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../fixtures/sampleGameSummary.json'), 'utf-8')
);

const cachePath = path.resolve(__dirname, '../../src/data/staticData.json');

describe('analyzeGame integration', () => {
  beforeEach(() => {
    nock.cleanAll();

    // Mock the game summary API
    nock('https://aoe4world.com')
      .get('/players/111/games/123456/summary')
      .query(true)
      .reply(200, fixtureData);

    // Mock static data API
    nock('https://data.aoe4world.com').persist()
      .get('/units/all.json').reply(200, sampleUnits)
      .get('/buildings/all.json').reply(200, sampleBuildings)
      .get('/technologies/all.json').reply(200, sampleTechnologies);
  });

  afterEach(() => {
    nock.cleanAll();
    if (fs.existsSync(cachePath)) {
      fs.unlinkSync(cachePath);
    }
  });

  it('assembles a complete GameAnalysis from fixture data', async () => {
    const analysis = await analyzeGame('111', 123456, { skipNarrative: true });

    expect(analysis.gameId).toBe(123456);
    expect(analysis.mapName).toBe('Dry Arabia');
    expect(analysis.duration).toBe(900);
    expect(analysis.winReason).toBe('elimination');

    // Player summaries
    expect(analysis.player1.name).toBe('PlayerOne');
    expect(analysis.player1.civilization).toBe('English');
    expect(analysis.player1.result).toBe('win');
    expect(analysis.player1.kills).toBe(20);

    expect(analysis.player2.name).toBe('PlayerTwo');
    expect(analysis.player2.civilization).toBe('French');
    expect(analysis.player2.result).toBe('loss');

    // Phases should exist
    expect(analysis.phases.unifiedPhases.length).toBeGreaterThan(0);
    expect(analysis.phases.gameDuration).toBe(900);

    // Phase comparisons should match phase count
    expect(analysis.phaseComparisons.length).toBe(analysis.phases.unifiedPhases.length);

    // Deployed resource pool output exists for both players
    expect(analysis.deployedResourcePools).toBeDefined();
    expect(analysis.deployedResourcePools.player1.series.length).toBeGreaterThan(0);
    expect(analysis.deployedResourcePools.player2.series.length).toBeGreaterThan(0);
    expect(analysis.deployedResourcePools.sharedYAxisMax).toBeGreaterThan(0);
    expect(Array.isArray(analysis.deployedResourcePools.player1.bandItemDeltas ?? [])).toBe(true);
    expect(Array.isArray(analysis.deployedResourcePools.player2.bandItemDeltas ?? [])).toBe(true);
    expect(analysis.combatAdjustedMilitarySeries.length).toBeGreaterThan(0);

    for (const point of analysis.deployedResourcePools.player1.series) {
      expect(point.total).toBe(
        point.economic +
        point.populationCap +
        point.militaryCapacity +
        point.militaryActive +
        point.defensive +
        point.research +
        point.advancement
      );
    }

    for (const point of analysis.combatAdjustedMilitarySeries) {
      expect(point.player1AdjustedMilitaryActive).toBeGreaterThanOrEqual(0);
      expect(point.player2AdjustedMilitaryActive).toBeGreaterThanOrEqual(0);
      expect(point.player1UpgradeMultiplier).toBeGreaterThanOrEqual(1);
      expect(point.player2UpgradeMultiplier).toBeGreaterThanOrEqual(1);

      const p1PoolPoint = analysis.deployedResourcePools.player1.series
        .filter(poolPoint => poolPoint.timestamp <= point.timestamp)
        .slice(-1)[0];
      const p2PoolPoint = analysis.deployedResourcePools.player2.series
        .filter(poolPoint => poolPoint.timestamp <= point.timestamp)
        .slice(-1)[0];

      expect(point.player1RawMilitaryActive).toBeCloseTo(p1PoolPoint?.militaryActive ?? 0, 6);
      expect(point.player2RawMilitaryActive).toBeCloseTo(p2PoolPoint?.militaryActive ?? 0, 6);
    }

    // bottomLine should be null when skipNarrative is true
    expect(analysis.bottomLine).toBeNull();
  });

  it('can skip combat-adjusted military series for web MVP callers', async () => {
    const analysis = await analyzeGame('111', 123456, {
      skipNarrative: true,
      includeCombatAdjustedMilitary: false,
    });

    expect(analysis.deployedResourcePools.player1.series.length).toBeGreaterThan(0);
    expect(analysis.deployedResourcePools.player2.series.length).toBeGreaterThan(0);
    expect(analysis.combatAdjustedMilitarySeries).toEqual([]);
  });

  it('handles games where both players have age-ups in actions', async () => {
    const analysis = await analyzeGame('111', 123456, { skipNarrative: true });

    // Fixture data has age_up actions for both players
    // PlayerOne: age_up at [200, 500], PlayerTwo: age_up at [250, 600]
    // Should create multiple phases from age_up arrays
    expect(analysis.phases.unifiedPhases.length).toBeGreaterThan(1);

    // Should reach Castle age for both players
    const lastPhase = analysis.phases.unifiedPhases[analysis.phases.unifiedPhases.length - 1];
    expect(lastPhase.player1Age).toBe('Castle');
    expect(lastPhase.player2Age).toBe('Castle');
  });

  it('produces valid score deltas in phase comparisons', async () => {
    const analysis = await analyzeGame('111', 123456, { skipNarrative: true });

    for (const comparison of analysis.phaseComparisons) {
      expect(typeof comparison.scoreDeltaAtStart.total).toBe('number');
      expect(typeof comparison.scoreDeltaAtEnd.total).toBe('number');
      expect(typeof comparison.player1Allocation.militaryPercent).toBe('number');
    }
  });
});
