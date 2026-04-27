import nock from 'nock';
import fs from 'fs';
import path from 'path';
import { analyzeGame } from '../../src/analysis/gameAnalysis';
import { parseGameSummary } from '../../src/parser/gameSummaryParser';
import { buildPostMatchViewModel } from '../../src/analysis/postMatchViewModel';
import { renderPostMatchHtml } from '../../src/formatters/postMatchHtml';
import { sampleUnits, sampleBuildings, sampleTechnologies } from '../helpers/testData';
import { makeMalianCattleFixture } from '../helpers/malianCattleFixture';
import {
  makeSplitVillagerDeathsFixture,
  makeSplitVillagerStaticDataCache
} from '../helpers/splitVillagerDeathsFixture';

const fixtureData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../fixtures/sampleGameSummary.json'), 'utf-8')
);

const cachePath = path.resolve(__dirname, '../../src/data/staticData.json');

function extractHoverData(html: string): any[] {
  const match = html.match(/<script id="post-match-hover-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('post-match hover data not found');
  return JSON.parse(match[1]);
}

describe('post-match view integration', () => {
  beforeEach(() => {
    nock.cleanAll();

    nock('https://aoe4world.com')
      .get('/players/111/games/123456/summary')
      .query(true)
      .reply(200, fixtureData);

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

  it('builds a complete post-match model and renders all required sections in order', async () => {
    const summary = parseGameSummary(fixtureData);
    const analysis = await analyzeGame('111', 123456, { skipNarrative: true, summary });

    const model = buildPostMatchViewModel({
      summary,
      analysis,
      perspectiveProfileId: '111-playerone',
      summarySig: 'abc123sig',
    });

    expect(model.header.mode).toBeTruthy();
    expect(model.metricCards.finalPoolDelta).toBeDefined();
    expect(model.trajectory.youSeries.length).toBeGreaterThan(0);
    expect(model.trajectory.adjustedMilitarySeries.length).toBeGreaterThan(0);
    expect(Array.isArray(model.trajectory.youBandItemDeltas)).toBe(true);
    expect(Array.isArray(model.trajectory.opponentBandItemDeltas)).toBe(true);
    expect(model.gatherRate.youSeries.length).toBeGreaterThan(0);
    expect(model.villagerOpportunity.you.series.length).toBeGreaterThan(0);
    expect(model.villagerOpportunity.opponent.series.length).toBeGreaterThan(0);
    expect(model.villagerOpportunity.targetVillagers).toBe(120);
    expect(model.villagerOpportunity.you.baselineRateRpm).toBe(40);
    expect(model.villagerOpportunity.opponent.baselineRateRpm).toBe(40);
    expect(model.villagerOpportunity.context.you.totalResourcesGathered).toBe(summary.players[0].totalResourcesGathered.total);
    expect(model.villagerOpportunity.context.opponent.totalResourcesGathered).toBe(summary.players[1].totalResourcesGathered.total);
    expect(model.villagerOpportunity.context.you.lossShareOfPossible).toBeGreaterThanOrEqual(0);
    expect(model.villagerOpportunity.context.you.damageDealtToOpponentShare).toBeGreaterThanOrEqual(0);
    expect(model.villagerOpportunity.context.opponent.lossShareOfPossible).toBeGreaterThanOrEqual(0);
    expect(model.villagerOpportunity.context.opponent.damageDealtToOpponentShare).toBeGreaterThanOrEqual(0);
    expect(model.villagerOpportunity.resourceSeries.you.length).toBeGreaterThan(0);
    expect(model.villagerOpportunity.resourceSeries.opponent.length).toBeGreaterThan(0);
    const youFinalResourceSeries = model.villagerOpportunity.resourceSeries.you[
      model.villagerOpportunity.resourceSeries.you.length - 1
    ];
    const opponentFinalResourceSeries = model.villagerOpportunity.resourceSeries.opponent[
      model.villagerOpportunity.resourceSeries.opponent.length - 1
    ];
    expect(youFinalResourceSeries.cumulativeResourcesGained).toBeCloseTo(
      summary.players[0].totalResourcesGathered.total,
      3
    );
    expect(opponentFinalResourceSeries.cumulativeResourcesGained).toBeCloseTo(
      summary.players[1].totalResourcesGathered.total,
      3
    );
    expect(youFinalResourceSeries.cumulativeResourcesPossible).toBeCloseTo(
      youFinalResourceSeries.cumulativeResourcesGained + youFinalResourceSeries.cumulativeLoss,
      6
    );
    expect(opponentFinalResourceSeries.cumulativeResourcesPossible).toBeCloseTo(
      opponentFinalResourceSeries.cumulativeResourcesGained + opponentFinalResourceSeries.cumulativeLoss,
      6
    );
    const youFinalVillager = model.villagerOpportunity.you.series[model.villagerOpportunity.you.series.length - 1];
    const opponentFinalVillager = model.villagerOpportunity.opponent.series[model.villagerOpportunity.opponent.series.length - 1];
    expect(youFinalVillager.underproductionDeficit).toBe(69);
    expect(opponentFinalVillager.underproductionDeficit).toBe(49);
    expect(model.trajectory.ageMarkers).toEqual(expect.arrayContaining([
      expect.objectContaining({ player: 'you', age: 'Feudal', timestamp: 200 }),
      expect.objectContaining({ player: 'opponent', age: 'Castle', timestamp: 600 })
    ]));
    expect(model.oneLineStory.length).toBeGreaterThan(0);

    const html = renderPostMatchHtml(model);

    const sections = [
      'Match recap',
      'Deployed resource pool over time',
      'Strategic allocation state',
      'Gather rate',
      'Villager opportunity cost',
      'Where the gap came from',
      'One-line story'
    ];

    let cursor = 0;
    for (const section of sections) {
      const idx = html.indexOf(section, cursor);
      expect(idx).toBeGreaterThanOrEqual(cursor);
      cursor = idx + 1;
    }

    expect(html).toContain('id="pool-comparison"');
    expect(html).toContain('id="strategy-allocation"');
    expect(html).toContain('data-hover-line-strategy');
    expect(html).toContain('data-hover-field="strategy.economy.delta"');
    expect(html).toContain('data-hover-field="strategy.military.delta"');
    expect(html).toContain('data-hover-field="strategy.technology.delta"');
    expect(html).toContain('Technology combines all research plus advancement');
    expect(html).toContain('Military combines active army plus military buildings');
    expect(html).toContain('Age timings');
    expect(html).toContain('Pool delta (You - Opponent)');
    expect(html).toContain('You Feudal 3:20');
    expect(html).toContain('Opponent Castle 10:00');
    expect(html).toContain('id="hover-inspector"');
    expect(html).toContain('id="post-match-hover-data"');
    expect(html).toContain('data-hover-timestamp="200"');
    expect(html).toContain('data-hover-label-pool-total-you');
    expect(html).toContain('Research');
    expect(html).toContain('Population cap');
    expect(html).toContain('Advancement');
    expect(html).toContain('AoE4World summary');
    expect(html).toContain('https://aoe4world.com/players/111/games/123456?sig=abc123sig');
    expect(html).toContain('Adjusted mil active');
    expect(html).toContain('data-open-adjusted-explainer');
    expect(html).toContain('Adjusted military active method');
    expect(html).toContain('CounterAdjustedArmyValue');
    expect(html).toContain('Adjusted military active breakdown');
    expect(html).toContain('Matchup matrix');
    expect(html).toContain('data-adjusted-field="matrixMock"');
    expect(html).toContain('data-adjusted-field="matrixWhy"');
    expect(html).toContain('adjusted-matrix-cell-btn');
    expect(html).toContain('id="villager-opportunity"');
    expect(html).toContain('id="villager-opportunity-you"');
    expect(html).toContain('id="villager-opportunity-opponent"');
    expect(html).toContain('Expected villager rate');
    expect(html).toContain('Unrecovered villager-seconds');
    expect(html).toContain('Underproduction');
    expect(html.indexOf('Unrecovered villager-seconds')).toBeLessThan(html.indexOf('Underproduction deficit'));
    expect(html).toContain('Villagers lost');
    expect(html).toContain('Cumulative loss');
    expect(html).toContain('Resources gained');
    expect(html).toContain('Resources possible');
    expect(html).toContain('data-hover-line-villager-you');
    expect(html).toContain('data-hover-line-villager-opponent');
    expect(html).toContain('data-hover-label-villager-you-loss');
    expect(html).toContain('data-hover-label-villager-opponent-possible');
    expect(html).toContain('data-adjusted-field="timeLabel"');
    expect(html).toContain('data-adjusted-field="you.raw"');
    expect(html).toContain('data-adjusted-field="you.counterAdjusted"');
    expect(html).toContain('data-adjusted-field="you.upgradeMultiplier"');
    expect(html).toContain('data-adjusted-field="you.final"');
    expect(html).toContain('data-adjusted-field="opponent.raw"');
    expect(html).toContain('data-adjusted-field="opponent.counterAdjusted"');
    expect(html).toContain('data-adjusted-field="opponent.upgradeMultiplier"');
    expect(html).toContain('data-adjusted-field="opponent.final"');
    expect(html).toContain('Military research');
    expect(html).toContain('Economic research');
    expect(html).toContain('data-hover-field="adjustedMilitary.you"');
    expect(html).toContain('data-band-key="economic"');
    expect(html).toContain('data-band-key="populationCap"');
    expect(html).toContain('data-band-key="advancement"');
    expect(html).toContain('data-band-breakdown-title');
    expect(html).toContain('data-band-breakdown-list="you"');
    expect(html).toContain('class="inspector-table-wrap" tabindex="0" role="region" aria-label="Hover inspector values table"');
    expect(html).toContain('data-cell-label="You"');
    expect(html).toContain('data-cell-label="Opp"');
    expect(html).toContain('data-cell-label="Delta"');
    expect(html).toContain('class="band-item-label band-item-label-truncated"');
    expect(html).toContain('@media (max-width: 760px)');
    expect(html).toContain('content: attr(data-cell-label);');
    expect(html).not.toContain('"label":"Wheelbarrow (1)"');
    expect(html).toContain('function updateInspector');
    expect(html).toContain('Click to pin');

    const milActiveIndex = html.indexOf('data-band-key="militaryActive"');
    const adjustedIndex = html.indexOf('Adjusted mil active');
    const defensiveIndex = html.indexOf('data-band-key="defensive"');
    expect(milActiveIndex).toBeGreaterThanOrEqual(0);
    expect(adjustedIndex).toBeGreaterThan(milActiveIndex);
    expect(defensiveIndex).toBeGreaterThan(adjustedIndex);
    expect(html).not.toContain('id="pool-you"');
    expect(html).not.toContain('id="pool-opponent"');

  });

  it('renders Malian cattle as economic deployed resource pool value', async () => {
    const summary = parseGameSummary(makeMalianCattleFixture());
    const analysis = await analyzeGame('111', 654321, { skipNarrative: true, summary });

    const cattleDeltas = analysis.deployedResourcePools.player1.bandItemDeltas ?? [];
    expect(cattleDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        band: 'economic',
        itemLabel: 'Cattle',
        deltaValue: 90,
      }),
    ]));

    const finalPoint = analysis.deployedResourcePools.player1.series[
      analysis.deployedResourcePools.player1.series.length - 1
    ];
    expect(finalPoint.economic).toBeGreaterThanOrEqual(180);
    expect(finalPoint.militaryActive).toBe(0);

    const model = buildPostMatchViewModel({
      summary,
      analysis,
      perspectiveProfileId: '111-playerone',
      summarySig: 'abc123sig',
    });
    const html = renderPostMatchHtml(model);

    expect(html).toContain('"label":"Cattle"');
    expect(html).toContain('"value":180');
  });

  it('does not double-subtract villager deaths after splitting starting assets from trained workers', async () => {
    fs.writeFileSync(cachePath, JSON.stringify(makeSplitVillagerStaticDataCache()), 'utf-8');

    const summary = parseGameSummary(makeSplitVillagerDeathsFixture());
    const analysis = await analyzeGame('111', 765432, { skipNarrative: true, summary });

    const model = buildPostMatchViewModel({
      summary,
      analysis,
      perspectiveProfileId: '111-playerone',
      summarySig: 'abc123sig',
    });
    const html = renderPostMatchHtml(model);
    const hoverData = extractHoverData(html);
    const point = hoverData.find(snapshot => snapshot.timestamp === 150);
    const opponentVillager = point?.bandBreakdown?.economic?.opponent?.find(
      (entry: any) => entry.label === 'Villager'
    );

    expect(opponentVillager).toEqual(expect.objectContaining({
      label: 'Villager',
      value: 450,
      count: 9,
    }));
  });

  it('normalizes rm_solo leaderboard alias to Ranked 1v1 in recap header', async () => {
    const rmSoloFixture = {
      ...fixtureData,
      leaderboard: 'rm_solo',
    };
    const summary = parseGameSummary(rmSoloFixture);
    const analysis = await analyzeGame('111', 123456, { skipNarrative: true, summary });

    const model = buildPostMatchViewModel({
      summary,
      analysis,
      perspectiveProfileId: '111-playerone',
      summarySig: 'abc123sig',
    });

    expect(model.header.mode).toBe('Ranked 1v1');
  });

  it('surfaces analysis inflection points in recap events', async () => {
    const summary = parseGameSummary(fixtureData);
    const analysis = await analyzeGame('111', 123456, { skipNarrative: true, summary });

    analysis.inflectionPoints = [{
      timestamp: 17,
      scoreType: 'military',
      deltaShift: 333,
      magnitude: 333,
      favoredPlayer: 1,
      destructionCluster: null,
    }];

    const model = buildPostMatchViewModel({
      summary,
      analysis,
      perspectiveProfileId: '111-playerone',
      summarySig: 'abc123sig',
    });

    expect(model.events.some(event => event.description.includes('Analysis inflection'))).toBe(true);
  });
});
