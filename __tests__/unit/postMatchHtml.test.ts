import { renderPostMatchHtml } from '../../src/formatters/postMatchHtml';
import { PostMatchViewModel } from '../../src/analysis/postMatchViewModel';

describe('renderPostMatchHtml', () => {
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

    const html = renderPostMatchHtml(model);

    expect(html).toContain('Strategic allocation state');
    expect(html.indexOf('Deployed resource pool over time')).toBeLessThan(html.indexOf('Strategic allocation state'));
    expect(html.indexOf('Strategic allocation state')).toBeLessThan(html.indexOf('Gather rate'));
    expect(html).toContain('id="strategy-allocation"');
    expect(html).toContain('data-hover-line-strategy');
    expect(html).toContain('data-hover-field="strategy.economy.delta"');
    expect(html).toContain('data-hover-field="strategy.military.delta"');
    expect(html).toContain('data-hover-field="strategy.technology.delta"');
    expect(html).toContain('Technology combines all research plus advancement');
    expect(html).toContain('Military combines active army plus military buildings');
    expect(html).toContain('"strategy":');
    expect(html).toContain('"delta":-1.3');
    expect(html).toContain('"you":73.3');
    expect(html).toContain('"opponent":74.6');
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

    expect(html).toContain('You Technology · Opp Military');
    expect(html).toContain('Technology vs military: watch whether pressure denies map access before the tech investment pays off.');
  });
});
