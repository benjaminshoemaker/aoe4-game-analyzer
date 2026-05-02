import nock from 'nock';
import fs from 'fs';
import path from 'path';
import { analyzeGame } from '../../src/analysis/gameAnalysis';
import { parseGameSummary } from '../../src/parser/gameSummaryParser';
import { buildPostMatchViewModel } from '../../src/analysis/postMatchViewModel';
import { renderPostMatchHtml } from '../../src/formatters/postMatchHtml';
import { sampleUnits, sampleBuildings, sampleTechnologies } from '../helpers/testData';
import { makeMalianCattleFixture } from '../helpers/malianCattleFixture';
import { makeSengokuYataiFixture } from '../helpers/sengokuYataiFixture';
import {
  makeSplitVillagerDeathsFixture,
  makeSplitVillagerStaticDataCache
} from '../helpers/splitVillagerDeathsFixture';
import {
  makeUnknownBucketMechanicsFixture,
  makeUnknownBucketStaticDataCache
} from '../helpers/unknownBucketMechanicsFixture';

const fixtureData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../fixtures/sampleGameSummary.json'), 'utf-8')
);

const cachePath = path.resolve(__dirname, '../../src/data/staticData.json');

function extractHoverData(html: string): any[] {
  const match = html.match(/<script id="post-match-hover-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('post-match hover data not found');
  return JSON.parse(match[1]);
}

function extractSvg(html: string, id: string): string {
  const match = html.match(new RegExp(`<svg id="${id}"[\\s\\S]*?</svg>`));
  if (!match) throw new Error(`Expected SVG ${id}`);
  return match[0];
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
      'Allocation lead and mix over time',
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

    expect(html).toContain('id="allocation-leader-strip"');
    expect(html).toContain('id="allocation-comparison"');
    expect(html).toContain('data-allocation-leader-segment');
    expect(html).toContain('data-leader="tie"');
    const leaderStrip = extractSvg(html, 'allocation-leader-strip');
    expect(leaderStrip).toContain('data-category-key="economic"');
    expect(leaderStrip).toContain('data-category-key="technology"');
    expect(leaderStrip).toContain('data-category-key="military"');
    expect(leaderStrip).not.toContain('data-category-key="destroyed"');
    expect(leaderStrip).not.toContain('data-category-key="overall"');
    expect(leaderStrip).not.toContain('data-category-key="float"');
    expect(html).toContain('<details class="allocation-read-guide" aria-label="Allocation chart legend">');
    expect(html).toContain('<summary class="allocation-read-guide-summary">How to read this chart</summary>');
    expect(html).toContain('Leader strip: current tracked-value leader by 30-second block');
    expect(html).toContain('Economic, Technology, and Military: percentage share of current tracked pool');
    expect(html).toContain('Destroyed: cumulative value assumed destroyed by opponent');
    expect(html).toContain('Overall: absolute current tracked pool value');
    expect(html).toContain('Float (not deployed): live stockpile resources not currently committed');
    expect(html).toContain('class="allocation-lane allocation-lane-overall"');
    expect(html).toContain('class="allocation-lane allocation-lane-destroyed"');
    expect(html).toContain('class="allocation-lane allocation-lane-float"');
    expect(html).not.toContain('Overall resources');
    expect(html).toContain('data-secondary-section="gather-rate"');
    expect(html).toContain('data-fixed-label="true"');
    expect(html).toContain('x1="96"');
    expect(html).toContain('data-hover-line-strategy');
    expect(html).toContain('data-hover-label-strategy-economic');
    expect(html).toContain('data-hover-label-strategy-technology');
    expect(html).toContain('data-hover-label-strategy-military');
    expect(html).toContain('data-hover-label-strategy-destroyed');
    expect(html).toContain('data-hover-label-strategy-overall');
    expect(html).toContain('data-hover-label-strategy-float');
    expect(html).toContain('data-hover-field="allocationCategory.economic.net.you"');
    expect(html).toContain('data-hover-field="allocationCategory.economic.resourceGeneration.you"');
    expect(html).toContain('data-hover-field="allocationCategory.economic.resourceInfrastructure.delta"');
    expect(html).toContain('data-hover-field="allocationCategory.technology.net.delta"');
    expect(html).toContain('data-hover-field="allocationCategory.military.net.delta"');
    expect(html).toContain('data-hover-field="allocationCategory.other.net.delta"');
    expect(html).toContain('data-hover-field="allocationCategory.military.net.delta"');
    expect(html).toContain('data-hover-field="allocationCategory.military.destroyed.delta"');
    expect(html).toContain('data-hover-field="allocationCategory.military.investment.delta"');
    expect(html).toContain('data-hover-field="allocation.float.delta"');
    expect(html).toContain('data-economic-role-filter="resourceGenerator"');
    expect(html).toContain('data-economic-role-filter="resourceInfrastructure"');
    expect(html).toContain('data-allocation-investment-category="economic"');
    expect(html).toContain('data-band-key="militaryInvestment"');
    expect(html).toContain('Total Economic Investment');
    expect(html).toContain('Total Military Investment');
    expect(html).toContain("selectedEconomicRoleFilter = key === 'economic'");
    expect(html).toContain('function combinedInvestmentBreakdown(point, category)');
    expect(html).toContain('function syncDestroyedRowVisibility(point)');
    expect(html).toContain('data-destroyed-row-category="economic" data-destroyed-row-empty="true" hidden');
    expect(html).toContain('Advancement destroyed');
    expect(html).not.toContain('Technology destroyed');
    expect(html).not.toContain('data-inspector-row="destroyed"');
    expect(html).not.toContain('data-band-key="destroyed"');
    expect(html).toContain('data-allocation-category-accounting="military-destroyed"');
    expect(html).toContain('data-allocation-category-accounting="military-investment"');
    expect(html).toContain('data-band-key="militaryDestroyed"');
    expect(html).toContain('data-inspector-row="float"');
    expect(html).toContain('data-band-key="float"');
    const otherRowIndex = html.indexOf('data-allocation-category-row="other"');
    const otherDestroyedRowIndex = html.indexOf('data-allocation-category-accounting="other-destroyed"');
    const otherInvestmentRowIndex = html.indexOf('data-allocation-category-accounting="other-investment"');
    const totalPoolIndex = html.indexOf('data-total-pool-tooltip');
    const floatRowIndex = html.indexOf('data-inspector-row="float"');
    expect(otherRowIndex).toBeGreaterThanOrEqual(0);
    expect(otherDestroyedRowIndex).toBeGreaterThan(otherRowIndex);
    expect(otherInvestmentRowIndex).toBeGreaterThan(otherDestroyedRowIndex);
    expect(totalPoolIndex).toBeGreaterThan(otherInvestmentRowIndex);
    expect(floatRowIndex).toBeGreaterThan(totalPoolIndex);
    expect(html).toContain('Bands are remapped into Economic, Technology, Military, and Other');
    expect(html).toContain('Overall is absolute current tracked pool value');
    expect(html).toContain('data-total-pool-tooltip');
    expect(html).toContain('Total net pool');
    expect(html).toContain('Age timings');
    expect(html).toContain('You Feudal 3:20');
    expect(html).toContain('Opponent Castle 10:00');
    expect(html).toContain('id="hover-inspector"');
    expect(html).toContain('id="post-match-hover-data"');
    expect(html).toContain('data-hover-timestamp="200"');
    expect(html).toContain('data-allocation-category-toggle="economic" aria-expanded="true"');
    expect(html).toContain('data-allocation-category-toggle="technology" aria-expanded="false"');
    expect(html).toContain('data-allocation-category-toggle="military" aria-expanded="false"');
    expect(html).toContain('data-allocation-category-toggle="other" aria-expanded="false"');
    expect(html).toContain('data-allocation-category-child="military" hidden');
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

    const hoverData = extractHoverData(html);
    const finalHover = hoverData[hoverData.length - 1];
    expect(finalHover.allocation).toEqual(expect.objectContaining({
      destroyed: expect.objectContaining({ you: 0, opponent: 0, delta: 0 }),
      float: expect.objectContaining({
        you: expect.any(Number),
        opponent: expect.any(Number),
      }),
      overall: expect.objectContaining({ you: finalHover.you.total }),
    }));
    const finalTimestamp = finalHover.timestamp;
    let finalResourceIndex = 0;
    summary.players[0].resources.timestamps.forEach((timestamp, index) => {
      if (timestamp <= finalTimestamp) finalResourceIndex = index;
    });
    const resourceKeys = ['food', 'wood', 'gold', 'stone', 'oliveoil'] as const;
    const expectedFloat = resourceKeys
      .reduce((sum, key) => sum + Math.max(0, Math.round(summary.players[0].resources[key]?.[finalResourceIndex] ?? 0)), 0);
    const floatBreakdownTotal = finalHover.bandBreakdown.float.you
      .reduce((sum: number, entry: { value: number }) => sum + entry.value, 0);
    expect(finalHover.accounting.you.float).toBe(expectedFloat);
    expect(floatBreakdownTotal).toBe(expectedFloat);
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
    expect(html).not.toContain('Deployed resource pool over time');
    expect(html).not.toContain('Strategic allocation state');
    expect(html).not.toContain('id="pool-comparison"');
    expect(html).not.toContain('Pool delta (You - Opponent)');

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

  it('renders Sengoku Yatai as economic deployed resource pool value', async () => {
    const summary = parseGameSummary(makeSengokuYataiFixture());
    const analysis = await analyzeGame('111', 229727104, { skipNarrative: true, summary });

    const yataiDeltas = analysis.deployedResourcePools.player1.bandItemDeltas ?? [];
    expect(yataiDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        band: 'economic',
        itemLabel: 'Yatai',
        deltaValue: 125,
      }),
    ]));
    expect(yataiDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        band: 'economic',
        itemLabel: 'Yatai',
        deltaValue: -125,
      }),
    ]));

    const finalPoint = analysis.deployedResourcePools.player1.series[
      analysis.deployedResourcePools.player1.series.length - 1
    ];
    expect(finalPoint.economic).toBeGreaterThanOrEqual(250);

    const model = buildPostMatchViewModel({
      summary,
      analysis,
      perspectiveProfileId: '8139502-Beasty',
      summarySig: 'abc123sig',
    });
    const html = renderPostMatchHtml(model);

    expect(html).toContain('"label":"Yatai"');
    expect(html).toContain('"value":250');
  });

  it('renders confirmed unknown-bucket mechanics as deployed pool values', async () => {
    fs.writeFileSync(cachePath, JSON.stringify(makeUnknownBucketStaticDataCache()), 'utf-8');

    const summary = parseGameSummary(makeUnknownBucketMechanicsFixture());
    const analysis = await analyzeGame('111', 876543, { skipNarrative: true, summary });

    const deltas = analysis.deployedResourcePools.player1.bandItemDeltas ?? [];
    expect(deltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        band: 'economic',
        itemLabel: 'Trade Caravan',
        deltaValue: 80,
        itemEconomicRole: 'resourceGenerator',
      }),
      expect.objectContaining({
        band: 'economic',
        itemLabel: 'Imperial Official',
        deltaValue: 150,
        itemEconomicRole: 'resourceInfrastructure',
      }),
      expect.objectContaining({
        band: 'economic',
        itemLabel: 'Pilgrim',
        deltaValue: 120,
        itemEconomicRole: 'resourceGenerator',
      }),
      expect.objectContaining({ band: 'militaryActive', itemLabel: 'Tower of the Sultan', deltaValue: 1000 }),
      expect.objectContaining({ band: 'militaryActive', itemLabel: 'Battering Ram', deltaValue: 200 }),
      expect.objectContaining({ band: 'militaryActive', itemLabel: 'Mangonel', deltaValue: 600 }),
      expect.objectContaining({ band: 'militaryActive', itemLabel: 'Cheirosiphon', deltaValue: 260 }),
      expect.objectContaining({ band: 'advancement', itemLabel: 'Logistics (Feudal Culture Wing)', deltaValue: 600 }),
    ]));

    const model = buildPostMatchViewModel({
      summary,
      analysis,
      perspectiveProfileId: '111-playerone',
      summarySig: 'abc123sig',
    });
    const html = renderPostMatchHtml(model);
    const hoverPoint = model.trajectory.hoverSnapshots.find(point => point.timestamp === 415);
    const hoverPayload = extractHoverData(html);
    const renderedEconomicSnapshot = hoverPayload.find(point => point.timestamp === 415);

    expect(html).toContain('"label":"Trade Caravan"');
    expect(html).toContain('data-hover-field="allocationCategory.economic.resourceGeneration.you"');
    expect(html).toContain('data-hover-field="allocationCategory.economic.resourceInfrastructure.you"');
    expect(html).toContain('data-economic-role-filter="resourceGenerator"');
    expect(html).toContain('data-economic-role-filter="resourceInfrastructure"');
    expect(html).toContain('data-allocation-investment-category="economic"');
    expect(html).toContain('data-band-key="militaryInvestment"');
    expect(html).toContain("(entry.economicRole || 'resourceInfrastructure') === selectedEconomicRoleFilter");
    expect(html).not.toContain('<li class="band-breakdown-group">Resource generators</li>');
    expect(html).not.toContain('<li class="band-breakdown-group">Resource infrastructure</li>');
    expect(html).toContain('"label":"Pilgrim"');
    expect(html).toContain('"label":"Cheirosiphon"');
    expect(renderedEconomicSnapshot?.allocationCategory.economic).toEqual(expect.objectContaining({
      resourceGeneration: expect.objectContaining({ you: 525 }),
      resourceInfrastructure: expect.objectContaining({ you: 450 }),
    }));
    expect(hoverPoint?.bandBreakdown.economic.you).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Trade Caravan', economicRole: 'resourceGenerator' }),
      expect.objectContaining({ label: 'Imperial Official', economicRole: 'resourceInfrastructure' }),
      expect.objectContaining({ label: 'Pilgrim', economicRole: 'resourceGenerator' }),
    ]));
    expect(html).not.toContain('"label":"Trade Cart"');
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
    expect(point?.accounting?.opponent).toEqual(expect.objectContaining({
      economic: 500,
      destroyed: 50,
      total: 450,
    }));
    expect(point?.allocation?.destroyed).toEqual(expect.objectContaining({
      opponent: 50,
    }));
    expect(point?.bandBreakdown?.destroyed?.opponent).toEqual([
      expect.objectContaining({
        label: 'Villager',
        value: 50,
        count: 1,
        percent: 100,
      }),
    ]);
    expect(analysis.significantResourceLossEvents?.[0]).toEqual(expect.objectContaining({
      victimPlayer: 2,
      kind: 'raid',
      immediateLoss: 50,
      villagerDeaths: 1,
    }));
    expect(point?.significantEvent).toEqual(expect.objectContaining({
      victim: 'opponent',
      kind: 'raid',
      immediateLoss: 50,
      villagerDeaths: 1,
    }));
    expect(html).toContain('data-significant-event-marker');
    expect(html).toContain('Event impact');
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
