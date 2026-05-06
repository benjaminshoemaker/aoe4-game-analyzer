import { buildPlayerDeployedPoolSeries } from '../../packages/aoe4-core/src/analysis/resourcePool';
import { buildVillagerOpportunityForPlayer } from '../../packages/aoe4-core/src/analysis/villagerOpportunity';
import { resolveAllBuildOrders } from '../../packages/aoe4-core/src/parser/buildOrderResolver';
import { parseGameSummary } from '../../packages/aoe4-core/src/parser/gameSummaryParser';
import {
  makeAccountingFixesRawSummary,
  makeAccountingFixesStaticData,
} from '../helpers/accountingFixesFixture';

function pointAt<T extends { timestamp: number }>(series: T[], timestamp: number): T {
  let candidate = series[0];
  for (const point of series) {
    if (point.timestamp > timestamp) break;
    candidate = point;
  }
  return candidate;
}

describe('accounting fixes integration', () => {
  it('carries total-pop, Military School, landmark, and Jeanne transform accounting through parse and resolution', () => {
    const summary = parseGameSummary(makeAccountingFixesRawSummary());
    const staticData = makeAccountingFixesStaticData();
    const player = summary.players[0];
    const resolved = resolveAllBuildOrders(player, staticData);

    expect(player.resources.population).toEqual([80, 100, 120, 140, 200, 160, 160, 160]);
    expect(player.buildOrder.find(entry => entry.id === 'jeanne-darc-villager')?.transformed).toEqual([120]);

    const villagerOpportunity = buildVillagerOpportunityForPlayer({
      player,
      duration: summary.duration,
    });
    const villagerAt120 = pointAt(villagerOpportunity.series, 120);
    const villagerAt360 = pointAt(villagerOpportunity.series, 360);

    expect(villagerAt360.expectedVillagers).toBe(villagerAt120.expectedVillagers);
    expect(pointAt(villagerOpportunity.series, 180).deathDeficit).toBe(0);

    const deployed = buildPlayerDeployedPoolSeries(player, resolved, summary.duration);
    expect(deployed.bandItemDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        band: 'economic',
        itemLabel: 'Military School',
        deltaValue: 150,
      }),
      expect.objectContaining({
        band: 'advancement',
        itemLabel: 'Mehmed Imperial Armory',
        deltaValue: 600,
      }),
      expect.objectContaining({
        timestamp: 120,
        band: 'militaryActive',
        itemLabel: "Jeanne d'Arc",
        deltaValue: 50,
      }),
    ]));
    expect(pointAt(deployed.series, 120).militaryActive).toBe(50);
    expect(pointAt(deployed.series, 180).militaryActive).toBe(0);
  });
});
