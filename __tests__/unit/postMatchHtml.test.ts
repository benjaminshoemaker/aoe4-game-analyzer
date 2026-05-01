import {
  buildAllocationCategories,
  buildAllocationLeaderSegments,
  renderPostMatchHtml
} from '../../src/formatters/postMatchHtml';
import { PostMatchViewModel } from '../../src/analysis/postMatchViewModel';

function extractSvg(html: string, id: string): string {
  const match = html.match(new RegExp(`<svg id="${id}"[\\s\\S]*?</svg>`));
  if (!match) throw new Error(`Expected SVG ${id}`);
  return match[0];
}

function extractAllocationLane(html: string, key: string): string {
  const match = html.match(new RegExp(`<g class="allocation-lane allocation-lane-${key}">[\\s\\S]*?</g>`));
  if (!match) throw new Error(`Expected allocation lane ${key}`);
  return match[0];
}

describe('renderPostMatchHtml', () => {
  it('maps deployed pool bands into allocation categories', () => {
    expect(buildAllocationCategories({
      economic: 100,
      populationCap: 25,
      militaryCapacity: 30,
      militaryActive: 70,
      defensive: 50,
      research: 40,
      advancement: 160,
      destroyed: 40,
      float: 125,
      total: 435,
    } as any)).toEqual({
      economic: 100,
      technology: 200,
      military: 150,
      other: 25,
      destroyed: 40,
      overall: 435,
      float: 125,
    });
  });

  it('builds strict 30-second leader segments for the three strategic categories', () => {
    const segments = buildAllocationLeaderSegments([
      {
        timestamp: 0,
        you: {
          economic: 100,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 0,
          defensive: 0,
          research: 0,
          advancement: 0,
          destroyed: 0,
          float: 0,
          total: 100,
        },
        opponent: {
          economic: 100,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 0,
          defensive: 0,
          research: 0,
          advancement: 0,
          destroyed: 0,
          float: 0,
          total: 100,
        },
      },
      {
        timestamp: 30,
        you: {
          economic: 140,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 20,
          defensive: 0,
          research: 0,
          advancement: 0,
          destroyed: 0,
          float: 100,
          total: 160,
        },
        opponent: {
          economic: 120,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 60,
          defensive: 0,
          research: 0,
          advancement: 0,
          destroyed: 50,
          float: 20,
          total: 130,
        },
      },
    ] as any, 60);

    expect(segments.filter(segment => segment.categoryKey === 'economic')).toEqual([
      expect.objectContaining({ start: 0, end: 30, leader: 'you' }),
      expect.objectContaining({ start: 30, end: 60, leader: 'you' }),
    ]);
    expect(segments.find(segment => segment.categoryKey === 'technology' && segment.start === 0))
      .toEqual(expect.objectContaining({ leader: 'tie' }));
    expect(segments.find(segment => segment.categoryKey === 'military' && segment.start === 30))
      .toEqual(expect.objectContaining({ leader: 'opponent' }));
    expect(new Set(segments.map(segment => segment.categoryKey))).toEqual(new Set([
      'economic',
      'technology',
      'military',
    ]));
    expect(segments.find(segment => segment.categoryKey === 'destroyed')).toBeUndefined();
    expect(segments.find(segment => segment.categoryKey === 'overall')).toBeUndefined();
    expect(segments.find(segment => segment.categoryKey === 'float')).toBeUndefined();
  });

  it('shows counts for band composition items, merges upgraded military labels, and carries research categories', () => {
    const model: PostMatchViewModel = {
      header: {
        mode: 'Ranked 1v1',
        durationLabel: '10:00',
        map: 'Dry Arabia',
        summaryUrl: 'https://aoe4world.com/players/111/games/123456',
        youCivilization: 'English',
        opponentCivilization: 'French',
        outcome: 'Defeated 10:00',
      },
      deferredBanner: null,
      metricCards: {
        finalPoolDelta: 0,
        castleAgeDeltaSeconds: 0,
        yourBet: {
          label: 'balanced',
          subtitlePercent: 34,
          economicPercent: 31,
          militaryPercent: 34,
        },
        opponentBet: {
          label: 'balanced',
          subtitlePercent: 35,
          economicPercent: 30,
          militaryPercent: 35,
        },
      },
      trajectory: {
        durationSeconds: 600,
        yAxisMax: 1000,
        youSeries: [{
          timestamp: 0,
          economic: 50,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 168,
          defensive: 0,
          research: 100,
          advancement: 500,
          total: 818,
        }],
        opponentSeries: [{
          timestamp: 0,
          economic: 50,
          populationCap: 0,
          militaryCapacity: 0,
          militaryActive: 120,
          defensive: 0,
          research: 100,
          advancement: 400,
          total: 670,
        }],
        adjustedMilitarySeries: [{
          timestamp: 0,
          you: 201.6,
          opponent: 132,
          delta: 69.6,
          youRawMilitaryActive: 168,
          opponentRawMilitaryActive: 120,
          youCounterAdjustedMilitaryActive: 183.27,
          opponentCounterAdjustedMilitaryActive: 125.71,
          youUpgradeMultiplier: 1.1,
          opponentUpgradeMultiplier: 1.05,
          youUnitBreakdown: [
            {
              unitId: 'hardened-spearman',
              unitName: 'Hardened Spearman',
              count: 1,
              rawValue: 88,
              counterFactor: 1.12,
              upgradeFactor: 1.08,
              adjustedValue: 106.44,
              deltaValue: 18.44,
              why: 'Hardened Spearman exploits Knight (1.12x). Completed military techs amplify this unit further.',
            },
            {
              unitId: 'spearman',
              unitName: 'Spearman',
              count: 1,
              rawValue: 80,
              counterFactor: 0.96,
              upgradeFactor: 1.02,
              adjustedValue: 78.34,
              deltaValue: -1.66,
              why: 'Spearman is pressured by opposing composition.',
            }
          ],
          opponentUnitBreakdown: [
            {
              unitId: 'knight',
              unitName: 'Knight',
              count: 1,
              rawValue: 120,
              counterFactor: 1.05,
              upgradeFactor: 1.05,
              adjustedValue: 132.3,
              deltaValue: 12.3,
              why: 'Knight exploits Spearman (1.05x). Completed military techs amplify this unit further.',
            }
          ],
        }],
        youBandItemDeltas: [
          {
            timestamp: 0,
            band: 'economic',
            itemKey: 'unit:villager',
            itemLabel: 'Villager',
            deltaValue: 50,
            deltaCount: 1,
          },
          {
            timestamp: 0,
            band: 'militaryActive',
            itemKey: 'unit:spearman',
            itemLabel: 'Spearman',
            deltaValue: 80,
            deltaCount: 1,
          },
          {
            timestamp: 0,
            band: 'militaryActive',
            itemKey: 'unit:hardened-spearman',
            itemLabel: 'Hardened Spearman',
            deltaValue: 88,
            deltaCount: 1,
          },
          {
            timestamp: 0,
            band: 'research',
            itemKey: 'upgrade:wheelbarrow',
            itemLabel: 'Wheelbarrow',
            itemCategory: 'economic',
            deltaValue: 100,
            deltaCount: 1,
          },
          {
            timestamp: 0,
            band: 'advancement',
            itemKey: 'advancement:castle-age',
            itemLabel: 'Castle Age Advancement',
            deltaValue: 500,
            deltaCount: 1,
          },
        ],
        opponentBandItemDeltas: [],
        hoverSnapshots: [{
          timestamp: 0,
          timeLabel: '0:00',
          markers: [],
          you: {
            economic: 50,
            populationCap: 0,
            militaryCapacity: 0,
            militaryActive: 168,
            defensive: 0,
            research: 100,
            advancement: 500,
            total: 818,
          },
          opponent: {
            economic: 50,
            populationCap: 0,
            militaryCapacity: 0,
            militaryActive: 120,
            defensive: 0,
            research: 100,
            advancement: 400,
            total: 670,
          },
          delta: {
            economic: 0,
            populationCap: 0,
            militaryCapacity: 0,
            militaryActive: 48,
            defensive: 0,
            research: 0,
            advancement: 100,
            total: 148,
          },
          gather: {
            you: 500,
            opponent: 480,
            delta: 20,
          },
          villagerOpportunity: {
            you: {
              timestamp: 0,
              cumulativeLoss: 0,
              cumulativeResourcesGained: 1000,
              cumulativeResourcesPossible: 1000,
            },
            opponent: {
              timestamp: 0,
              cumulativeLoss: 0,
              cumulativeResourcesGained: 900,
              cumulativeResourcesPossible: 900,
            },
          },
          adjustedMilitary: {
            you: 202,
            opponent: 132,
            delta: 70,
            youRaw: 168,
            opponentRaw: 120,
            youCounterAdjusted: 183.27,
            opponentCounterAdjusted: 125.71,
            youCounterMultiplier: 1.091,
            opponentCounterMultiplier: 1.048,
            youUpgradeMultiplier: 1.1,
            opponentUpgradeMultiplier: 1.05,
            youPct: 20,
            opponentPct: 10,
            youUnitBreakdown: [
              {
                unitId: 'hardened-spearman',
                unitName: 'Hardened Spearman',
                count: 1,
                rawValue: 88,
                counterFactor: 1.12,
                upgradeFactor: 1.08,
                adjustedValue: 106.44,
                deltaValue: 18.44,
                why: 'Hardened Spearman exploits Knight (1.12x). Completed military techs amplify this unit further.',
              },
              {
                unitId: 'spearman',
                unitName: 'Spearman',
                count: 1,
                rawValue: 80,
                counterFactor: 0.96,
                upgradeFactor: 1.02,
                adjustedValue: 78.34,
                deltaValue: -1.66,
                why: 'Spearman is pressured by opposing composition.',
              }
            ],
            opponentUnitBreakdown: [
              {
                unitId: 'knight',
                unitName: 'Knight',
                count: 1,
                rawValue: 120,
                counterFactor: 1.05,
                upgradeFactor: 1.05,
                adjustedValue: 132.3,
                deltaValue: 12.3,
                why: 'Knight exploits Spearman (1.05x). Completed military techs amplify this unit further.',
              }
            ],
          },
          bandBreakdown: {
            economic: {
              you: [{ label: 'Villager', value: 50, percent: 100, count: 1 }],
              opponent: [],
            },
            populationCap: { you: [], opponent: [] },
            militaryCapacity: { you: [], opponent: [] },
            militaryActive: {
              you: [
                { label: 'Spearman', value: 80, percent: 47.6, count: 1 },
                { label: 'Hardened Spearman', value: 88, percent: 52.4, count: 1 },
              ],
              opponent: [],
            },
            defensive: { you: [], opponent: [] },
            research: {
              you: [{ label: 'Wheelbarrow', value: 100, percent: 100, count: 1, category: 'economic' }],
              opponent: [],
            },
            advancement: {
              you: [{ label: 'Castle Age Advancement', value: 500, percent: 100, count: 1 }],
              opponent: [],
            },
          },
        }],
        ageMarkers: [],
      },
      gatherRate: {
        durationSeconds: 600,
        youSeries: [{ timestamp: 0, ratePerMin: 500 }],
        opponentSeries: [{ timestamp: 0, ratePerMin: 480 }],
      },
      villagerOpportunity: {
        targetVillagers: 120,
        resourceSeries: {
          you: [{
            timestamp: 0,
            cumulativeLoss: 0,
            cumulativeResourcesGained: 1000,
            cumulativeResourcesPossible: 1000,
          }],
          opponent: [{
            timestamp: 0,
            cumulativeLoss: 0,
            cumulativeResourcesGained: 900,
            cumulativeResourcesPossible: 900,
          }],
        },
        context: {
          you: {
            totalResourcesGathered: 1000,
            totalPossibleResources: 1250,
            cumulativeLoss: 250,
            lossShareOfPossible: 0.2,
            damageDealtToOpponent: 120,
            damageDealtToOpponentPossible: 960,
            damageDealtToOpponentShare: 0.125,
            netEcoSwing: -130,
          },
          opponent: {
            totalResourcesGathered: 900,
            totalPossibleResources: 1080,
            cumulativeLoss: 180,
            lossShareOfPossible: 1 / 6,
            damageDealtToOpponent: 60,
            damageDealtToOpponentPossible: 1060,
            damageDealtToOpponentShare: 60 / 1060,
            netEcoSwing: -120,
          },
        },
        you: {
          baselineRateRpm: 40,
          targetVillagers: 120,
          upgradeEvents: [],
          series: [{
            timestamp: 0,
            expectedVillagerRateRpm: 40,
            expectedVillagers: 0,
            producedVillagers: 10,
            aliveVillagers: 9,
            underproductionDeficit: 0,
            deathDeficit: 0,
            totalDeficit: 0,
            underproductionLossPerMin: 0,
            deathLossPerMin: 0,
            totalLossPerMin: 0,
            cumulativeUnderproductionLoss: 0,
            cumulativeDeathLoss: 0,
            cumulativeTotalLoss: 0,
          }],
        },
        opponent: {
          baselineRateRpm: 40,
          targetVillagers: 120,
          upgradeEvents: [],
          series: [{
            timestamp: 0,
            expectedVillagerRateRpm: 40,
            expectedVillagers: 0,
            producedVillagers: 0,
            aliveVillagers: 0,
            underproductionDeficit: 0,
            deathDeficit: 0,
            totalDeficit: 0,
            underproductionLossPerMin: 0,
            deathLossPerMin: 0,
            totalLossPerMin: 0,
            cumulativeUnderproductionLoss: 0,
            cumulativeDeathLoss: 0,
            cumulativeTotalLoss: 0,
          }],
        },
      },
      events: [],
      oneLineStory: 'Placeholder',
    };
    const significantEvent = {
      id: 'significant-loss-opponent-0',
      timestamp: 0,
      windowStart: 0,
      windowEnd: 60,
      timeLabel: '0:00',
      victim: 'opponent',
      victimLabel: 'French',
      player1Civilization: 'English',
      player2Civilization: 'French',
      victimCivilization: 'French',
      actorCivilization: 'English',
      headline: 'English raided French and killed one villager.',
      kind: 'raid',
      label: 'Raid',
      shortLabel: 'Raid',
      description: 'French lost 140 resources of villager opportunity impact.',
      impactSummary: '220 gross impact.',
      grossImpact: 220,
      grossLoss: 140,
      immediateLoss: 50,
      villagerOpportunityLoss: 90,
      denominator: 670,
      pctOfDeployed: 20.9,
      villagerDeaths: 1,
      topLosses: [{ label: 'Villager', value: 50, count: 1, band: 'economic' }],
      encounterLosses: {
        player1: [{ label: 'Archer', value: 80, count: 1, band: 'militaryActive' }],
        player2: [{ label: 'Villager', value: 50, count: 1, band: 'economic' }],
      },
      playerImpacts: {
        player1: {
          immediateLoss: 80,
          villagerOpportunityLoss: 0,
          grossLoss: 80,
          denominator: 818,
          pctOfDeployed: 9.8,
          villagerDeaths: 0,
          losses: [{ label: 'Archer', value: 80, count: 1, band: 'militaryActive' }],
          topLosses: [{ label: 'Archer', value: 80, count: 1, band: 'militaryActive' }],
        },
        player2: {
          immediateLoss: 50,
          villagerOpportunityLoss: 90,
          grossLoss: 140,
          denominator: 670,
          pctOfDeployed: 20.9,
          villagerDeaths: 1,
          losses: [{ label: 'Villager', value: 50, count: 1, band: 'economic' }],
          topLosses: [{ label: 'Villager', value: 50, count: 1, band: 'economic' }],
        },
      },
    };
    (model.trajectory as any).significantEvents = [significantEvent];
    (model.trajectory.hoverSnapshots[0] as any).significantEvent = significantEvent;

    const html = renderPostMatchHtml(model);

    expect(html).toContain('Allocation lead and mix over time');
    expect(html.indexOf('Allocation lead and mix over time')).toBeLessThan(html.indexOf('Gather rate'));
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
    expect(html).not.toContain('allocation-read-guide-title">Reading the chart');
    expect(html).toContain('Leader strip: absolute deployed-value leader by 30-second block');
    expect(html).toContain('Economic, Technology, and Military: percentage share of strategic allocation');
    expect(html).toContain('Overall: absolute deployed resource value, including Other');
    expect(html).toContain('Destroyed: cumulative value assumed destroyed by opponent');
    expect(html).toContain('Float (not deployed): gathered resources not currently committed');
    expect(html).toContain('class="allocation-lane allocation-lane-overall"');
    expect(html).toContain('class="allocation-lane allocation-lane-destroyed"');
    expect(html).toContain('class="allocation-lane allocation-lane-float"');
    expect(html).not.toContain('Overall resources');
    expect(html).not.toContain('Economic share');
    expect(html).toContain('grid-template-columns: minmax(0, 1fr) clamp(300px, 30vw, 340px);');
    expect(html).toContain('.wrap {\n      width: min(100%, 1240px);');
    expect(html).toContain('.panel {\n      min-width: 0;');
    expect(html).toContain('.civ-chip {\n      display: inline-flex;');
    expect(html).toContain('max-width: 100%;\n      overflow-wrap: anywhere;');
    expect(html).toContain('.chart-stack {\n      min-width: 0;\n      overflow-x: auto;');
    expect(html).toContain('@media (max-width: 520px)');
    expect(html).toContain('.wrap { width: calc(100vw - 24px); max-width: calc(100vw - 24px); }');
    expect(html).toContain('.chips { flex-direction: column; align-items: stretch; }');
    expect(html).toContain('.civ-chip { width: 100%; }');
    expect(html).toContain('.metrics { grid-template-columns: 1fr; }');
    expect(html).toContain('.chart-stack .leader-strip,\n      .chart-stack .strategy-chart { min-width: 680px; }');
    expect(html).toContain('font-size: 13px;');
    expect(html).toContain('font-size: 14px;');
    expect(html).toContain('class="panel secondary-panel" data-secondary-section="gather-rate"');
    expect(html).toContain('data-fixed-label="true"');
    expect(html).toContain('x1="96"');
    expect(html).toContain('data-hover-line-strategy');
    expect(html).toContain('data-hover-label-strategy-economic');
    expect(html).toContain('data-hover-label-strategy-technology');
    expect(html).toContain('data-hover-label-strategy-military');
    expect(html).toContain('data-hover-label-strategy-destroyed');
    expect(html).toContain('data-hover-label-strategy-overall');
    expect(html).toContain('data-hover-label-strategy-float');
    expect(html).toContain('data-hover-field="allocation.economic.you"');
    expect(html).toContain('data-hover-field="allocation.technology.delta"');
    expect(html).toContain('data-hover-field="allocation.military.delta"');
    expect(html).toContain('data-hover-field="allocation.other.delta"');
    expect(html).toContain('data-hover-field="allocation.destroyed.delta"');
    expect(html).toContain('data-hover-field="allocation.float.delta"');
    expect(html).toContain('data-inspector-row="destroyed"');
    expect(html).toContain('data-band-key="destroyed"');
    expect(html).toContain('data-significant-event-loss-summary="player2"');
    expect(html).toContain('data-significant-event-loss-villager-opportunity="player2">90</dd>');
    expect(html).toContain('data-significant-event-loss-share-label="player2">Share of French deployed</dt>');
    expect(html).not.toContain('<dt>Share of deployed</dt>');
    const otherRowIndex = html.indexOf('data-allocation-category-row="other"');
    const destroyedRowIndex = html.indexOf('data-inspector-row="destroyed"');
    const totalPoolIndex = html.indexOf('data-total-pool-tooltip');
    expect(otherRowIndex).toBeGreaterThanOrEqual(0);
    expect(destroyedRowIndex).toBeGreaterThan(otherRowIndex);
    expect(totalPoolIndex).toBeGreaterThan(destroyedRowIndex);
    expect(html).toContain('data-total-pool-tooltip');
    expect(html).toContain('Economic + Technology + Military + Other - Destroyed = Total pool');
    expect(html).toContain('Bands are remapped into Economic, Technology, Military, and Other');
    expect(html).toContain('Overall is absolute deployed resource value after subtracting Destroyed');
    expect(html).toContain('data-allocation-category-toggle="economic" aria-expanded="true"');
    expect(html).toContain('data-allocation-category-toggle="technology" aria-expanded="false"');
    expect(html).toContain('data-allocation-category-toggle="military" aria-expanded="false"');
    expect(html).toContain('data-allocation-category-toggle="other" aria-expanded="false"');
    expect(html).toContain('data-allocation-category-child="military" hidden');
    expect(html).toContain('"strategy":');
    expect(html).toContain('"allocation":');
    expect(html).toContain('"delta":-1.3');
    expect(html).toContain('"you":73.3');
    expect(html).toContain('"opponent":74.6');
    expect(html).not.toContain('Strategic allocation state');
    expect(html).not.toContain('Deployed resource pool over time');
    expect(html).not.toContain('id="pool-comparison"');
    expect(html).toContain('"label":"Villager"');
    expect(html).toContain('"label":"Hardened Spearman"');
    expect(html).toContain('"label":"Spearman"');
    expect(html).not.toContain('"label":"Villager (1)"');
    expect(html).not.toContain('"label":"Spearman (1)"');
    expect(html).toContain('"category":"economic"');
    expect(html).toContain('data-open-adjusted-explainer');
    expect(html).toContain('Villagers lost');
    expect(html).toContain('Villagers lost</span><strong>1</strong>');
    expect(html).toContain('Unrecovered villager-seconds');
    expect(html).toContain('Unrecovered villager-seconds</span><strong>0s</strong>');
    expect(html.indexOf('Unrecovered villager-seconds')).toBeLessThan(html.indexOf('Underproduction deficit'));
    expect(html).toContain('Loss of possible gather');
    expect(html).toContain('Damage dealt to opponent eco');
    expect(html).toContain('Loss of possible gather</span><strong>20.0%</strong>');
    expect(html).toContain('Damage dealt to opponent eco</span><strong>12.5%</strong>');
    expect(html).toContain('Resources gained');
    expect(html).toContain('Resources possible');
    expect(html).toContain('data-hover-line-villager-you');
    expect(html).toContain('data-hover-line-villager-opponent');
    expect(html).toContain('data-hover-label-villager-you-loss');
    expect(html).toContain('data-hover-label-villager-opponent-possible');
    expect(html).toContain('(+20.0%)');
    expect(html).toContain('table-layout: fixed;');
    expect(html).toContain('class="inspector-adjusted-value-main"');
    expect(html).toContain('class="inspector-adjusted-value-pct"');
    expect(html).toContain('overflow-wrap: anywhere;');
    expect(html).toContain('class="inspector-table-wrap" tabindex="0" role="region" aria-label="Hover inspector values table"');
    expect(html).toContain('data-cell-label="You"');
    expect(html).toContain('data-cell-label="Opp"');
    expect(html).toContain('data-cell-label="Delta"');
    expect(html).toContain('@media (max-width: 760px)');
    expect(html).toContain('content: attr(data-cell-label);');
    expect(html).toContain('class="band-item-label band-item-label-truncated"');
    expect(html).toContain('title="Villager" tabindex="0"');
    expect(html).toContain('.inspector-table-wrap:focus-visible');
    expect(html).toContain('.band-item-label-truncated:focus-visible');
    expect(html).toContain('"label":"Wheelbarrow"');
    expect(html).not.toContain('"label":"Wheelbarrow (1)"');
    expect(html).toContain('"label":"Castle Age Advancement"');
    expect(html).not.toContain('"label":"Castle Age Advancement (1)"');
    expect(html).toContain('Adjusted military active breakdown');
    expect(html).toContain('Matchup matrix');
    expect(html).toContain('Rows are your top military units. Columns are opponent top military units. Each cell is a direct pairwise interaction.');
    expect(html).not.toContain('Per-unit adjustment breakdown');
    expect(html).toContain('Hardened Spearman');
    expect(html).toContain('Knight');
    expect(html).toContain('data-adjusted-field="matrixMock"');
    expect(html).toContain('data-adjusted-field="matrixWhy"');
    expect(html).toContain('adjusted-matrix-cell-btn');
    expect(html).toContain('Select a matchup cell');
    expect(html).toContain("Click any matrix value to see that cell's exact computation and explanation.");
    expect(html).toContain('This cell uses a direct');
    expect(html).toContain('What this means:');
    expect(html).toContain('Effective DPS:');
    expect(html).toContain('Survivability:');
    expect(html).toContain('Efficiency per resources:');
    expect(html).toContain('Raw edge:');
    expect(html).toContain('Displayed score:');
    expect(html).toContain('Key math inputs');
    expect(html).toContain('applyFromButton(buttons[0]);');
    expect(html).not.toContain('Row perspective:');
    expect(html).not.toContain('Column perspective:');
    expect(html).not.toContain('Row why:');
    expect(html).not.toContain('Column why:');
    expect(html).not.toContain('data-matrix-row-why=');
    expect(html).not.toContain('data-matrix-col-why=');
    expect(html).toContain('data-adjusted-field="timeLabel"');
    expect(html).toContain('data-adjusted-field="you.raw"');
    expect(html).toContain('data-adjusted-field="you.counterAdjusted"');
    expect(html).toContain('data-adjusted-field="you.upgradeMultiplier"');
    expect(html).toContain('data-adjusted-field="you.final"');
    expect(html).toContain('data-adjusted-field="opponent.raw"');
    expect(html).toContain('data-adjusted-field="opponent.counterAdjusted"');
    expect(html).toContain('data-adjusted-field="opponent.upgradeMultiplier"');
    expect(html).toContain('data-adjusted-field="opponent.final"');
    expect(html).toContain('<td data-adjusted-field="you.raw">168</td>');
    expect(html).toContain('<td data-adjusted-field="you.counterAdjusted">183.27</td>');
    expect(html).toContain('<td data-adjusted-field="you.upgradeMultiplier">1.100x</td>');
    expect(html).toContain('<td data-adjusted-field="you.final">202</td>');
    expect(html).toContain('You: 168 × 1.091x × 1.100x = 202');
    expect(html).toContain('<td data-adjusted-field="opponent.raw">120</td>');
    expect(html).toContain('<td data-adjusted-field="opponent.counterAdjusted">125.71</td>');
    expect(html).toContain('<td data-adjusted-field="opponent.upgradeMultiplier">1.050x</td>');
    expect(html).toContain('<td data-adjusted-field="opponent.final">132</td>');
    expect(html).toContain('Opponent: 120 × 1.048x × 1.050x = 132');
    expect(html).not.toContain('function matrixProxyValue');
    expect(html).not.toContain('function matrixHeatClass');
    expect(html).not.toContain('function matrixCellPerspective');
  });

  it('labels early military vs technology by differential, even when economy remains the largest share', () => {
    const baseSeriesPoint = {
      timestamp: 0,
      economic: 800,
      populationCap: 100,
      militaryCapacity: 0,
      militaryActive: 0,
      defensive: 0,
      research: 0,
      advancement: 0,
      total: 900,
    };

    const emptyBandBreakdown = {
      economic: { you: [], opponent: [] },
      populationCap: { you: [], opponent: [] },
      militaryCapacity: { you: [], opponent: [] },
      militaryActive: { you: [], opponent: [] },
      defensive: { you: [], opponent: [] },
      research: { you: [], opponent: [] },
      advancement: { you: [], opponent: [] },
    };

    const model: PostMatchViewModel = {
      header: {
        mode: 'Ranked 1v1',
        durationLabel: '2:00',
        map: 'Dry Arabia',
        summaryUrl: 'https://aoe4world.com/players/111/games/123456',
        youCivilization: 'Abbasid Dynasty',
        opponentCivilization: 'Abbasid Dynasty',
        outcome: 'Defeated 2:00',
      },
      deferredBanner: null,
      metricCards: {
        finalPoolDelta: 0,
        castleAgeDeltaSeconds: null,
        yourBet: null,
        opponentBet: null,
      },
      trajectory: {
        durationSeconds: 120,
        yAxisMax: 1500,
        youSeries: [
          baseSeriesPoint,
          {
            timestamp: 60,
            economic: 850,
            populationCap: 120,
            militaryCapacity: 20,
            militaryActive: 20,
            defensive: 0,
            research: 0,
            advancement: 150,
            total: 1160,
          },
        ],
        opponentSeries: [
          baseSeriesPoint,
          {
            timestamp: 60,
            economic: 820,
            populationCap: 120,
            militaryCapacity: 120,
            militaryActive: 180,
            defensive: 0,
            research: 0,
            advancement: 0,
            total: 1240,
          },
        ],
        adjustedMilitarySeries: [],
        youBandItemDeltas: [],
        opponentBandItemDeltas: [],
        hoverSnapshots: [
          {
            timestamp: 0,
            timeLabel: '0:00',
            markers: [],
            you: {
              economic: 800,
              populationCap: 100,
              militaryCapacity: 0,
              militaryActive: 0,
              defensive: 0,
              research: 0,
              advancement: 0,
              total: 900,
            },
            opponent: {
              economic: 800,
              populationCap: 100,
              militaryCapacity: 0,
              militaryActive: 0,
              defensive: 0,
              research: 0,
              advancement: 0,
              total: 900,
            },
            delta: {
              economic: 0,
              populationCap: 0,
              militaryCapacity: 0,
              militaryActive: 0,
              defensive: 0,
              research: 0,
              advancement: 0,
              total: 0,
            },
            gather: { you: 350, opponent: 350, delta: 0 },
            villagerOpportunity: {
              you: {
                timestamp: 0,
                cumulativeLoss: 0,
                cumulativeResourcesGained: 900,
                cumulativeResourcesPossible: 900,
              },
              opponent: {
                timestamp: 0,
                cumulativeLoss: 0,
                cumulativeResourcesGained: 900,
                cumulativeResourcesPossible: 900,
              },
            },
            adjustedMilitary: {
              you: 0,
              opponent: 0,
              delta: 0,
              youRaw: 0,
              opponentRaw: 0,
              youCounterAdjusted: 0,
              opponentCounterAdjusted: 0,
              youCounterMultiplier: null,
              opponentCounterMultiplier: null,
              youUpgradeMultiplier: 1,
              opponentUpgradeMultiplier: 1,
              youPct: null,
              opponentPct: null,
              youUnitBreakdown: [],
              opponentUnitBreakdown: [],
            },
            bandBreakdown: emptyBandBreakdown,
            accounting: {
              you: {
                economic: 800,
                populationCap: 100,
                militaryCapacity: 0,
                militaryActive: 0,
                defensive: 0,
                research: 0,
                advancement: 0,
                destroyed: 0,
                float: 0,
                gathered: 900,
                total: 900,
              },
              opponent: {
                economic: 800,
                populationCap: 100,
                militaryCapacity: 0,
                militaryActive: 0,
                defensive: 0,
                research: 0,
                advancement: 0,
                destroyed: 0,
                float: 0,
                gathered: 900,
                total: 900,
              },
              delta: {
                economic: 0,
                populationCap: 0,
                militaryCapacity: 0,
                militaryActive: 0,
                defensive: 0,
                research: 0,
                advancement: 0,
                destroyed: 0,
                float: 0,
                gathered: 0,
                total: 0,
              },
            },
          },
          {
            timestamp: 60,
            timeLabel: '1:00',
            markers: [],
            you: {
              economic: 850,
              populationCap: 120,
              militaryCapacity: 20,
              militaryActive: 20,
              defensive: 0,
              research: 0,
              advancement: 150,
              total: 1160,
            },
            opponent: {
              economic: 820,
              populationCap: 120,
              militaryCapacity: 120,
              militaryActive: 180,
              defensive: 0,
              research: 0,
              advancement: 0,
              total: 1240,
            },
            delta: {
              economic: 30,
              populationCap: 0,
              militaryCapacity: -100,
              militaryActive: -160,
              defensive: 0,
              research: 0,
              advancement: 150,
              total: -80,
            },
            gather: { you: 420, opponent: 400, delta: 20 },
            villagerOpportunity: {
              you: {
                timestamp: 60,
                cumulativeLoss: 0,
                cumulativeResourcesGained: 1160,
                cumulativeResourcesPossible: 1160,
              },
              opponent: {
                timestamp: 60,
                cumulativeLoss: 0,
                cumulativeResourcesGained: 1240,
                cumulativeResourcesPossible: 1240,
              },
            },
            adjustedMilitary: {
              you: 40,
              opponent: 300,
              delta: -260,
              youRaw: 40,
              opponentRaw: 300,
              youCounterAdjusted: 40,
              opponentCounterAdjusted: 300,
              youCounterMultiplier: 1,
              opponentCounterMultiplier: 1,
              youUpgradeMultiplier: 1,
              opponentUpgradeMultiplier: 1,
              youPct: 0,
              opponentPct: 0,
              youUnitBreakdown: [],
              opponentUnitBreakdown: [],
            },
            bandBreakdown: emptyBandBreakdown,
            accounting: {
              you: {
                economic: 850,
                populationCap: 120,
                militaryCapacity: 20,
                militaryActive: 20,
                defensive: 0,
                research: 0,
                advancement: 150,
                destroyed: 0,
                float: 340,
                gathered: 1500,
                total: 1160,
              },
              opponent: {
                economic: 820,
                populationCap: 120,
                militaryCapacity: 120,
                militaryActive: 180,
                defensive: 0,
                research: 0,
                advancement: 0,
                destroyed: 0,
                float: 1000,
                gathered: 2240,
                total: 1240,
              },
              delta: {
                economic: 30,
                populationCap: 0,
                militaryCapacity: -100,
                militaryActive: -160,
                defensive: 0,
                research: 0,
                advancement: 150,
                destroyed: 0,
                float: -660,
                gathered: -740,
                total: -80,
              },
            },
          },
        ],
        ageMarkers: [],
      },
      gatherRate: {
        durationSeconds: 120,
        youSeries: [
          { timestamp: 0, ratePerMin: 350 },
          { timestamp: 60, ratePerMin: 420 },
        ],
        opponentSeries: [
          { timestamp: 0, ratePerMin: 350 },
          { timestamp: 60, ratePerMin: 400 },
        ],
      },
      villagerOpportunity: {
        targetVillagers: 120,
        you: {
          baselineRateRpm: 40,
          targetVillagers: 120,
          upgradeEvents: [],
          series: [],
        },
        opponent: {
          baselineRateRpm: 40,
          targetVillagers: 120,
          upgradeEvents: [],
          series: [],
        },
        resourceSeries: {
          you: [
            {
              timestamp: 0,
              cumulativeLoss: 0,
              cumulativeResourcesGained: 900,
              cumulativeResourcesPossible: 900,
            },
            {
              timestamp: 60,
              cumulativeLoss: 0,
              cumulativeResourcesGained: 1160,
              cumulativeResourcesPossible: 1160,
            },
          ],
          opponent: [
            {
              timestamp: 0,
              cumulativeLoss: 0,
              cumulativeResourcesGained: 900,
              cumulativeResourcesPossible: 900,
            },
            {
              timestamp: 60,
              cumulativeLoss: 0,
              cumulativeResourcesGained: 1240,
              cumulativeResourcesPossible: 1240,
            },
          ],
        },
        context: {
          you: {
            totalResourcesGathered: 1160,
            totalPossibleResources: 1160,
            cumulativeLoss: 0,
            lossShareOfPossible: 0,
            damageDealtToOpponent: 0,
            damageDealtToOpponentPossible: 1240,
            damageDealtToOpponentShare: 0,
            netEcoSwing: 0,
          },
          opponent: {
            totalResourcesGathered: 1240,
            totalPossibleResources: 1240,
            cumulativeLoss: 0,
            lossShareOfPossible: 0,
            damageDealtToOpponent: 0,
            damageDealtToOpponentPossible: 1160,
            damageDealtToOpponentShare: 0,
            netEcoSwing: 0,
          },
        },
      },
      events: [],
      oneLineStory: 'Placeholder',
    };

    const html = renderPostMatchHtml(model);

    expect(html).toContain('"allocation":');
    expect(html).toContain('"technology":{"you":150');
    expect(html).toContain('"military":{"you":40,"opponent":300');
    expect(html).toContain('data-category-key="technology"');
    expect(html).toContain('data-category-key="military"');
    expect(extractAllocationLane(html, 'float')).toContain('>1,000<');
    expect(extractAllocationLane(html, 'military')).toContain('>30.0%<');
  });
});
