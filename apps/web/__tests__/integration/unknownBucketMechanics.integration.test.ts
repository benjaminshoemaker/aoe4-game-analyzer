import { buildDeployedResourcePools } from '@aoe4/analyzer-core/analysis/resourcePool';
import { resolveAllBuildOrders } from '@aoe4/analyzer-core/parser/buildOrderResolver';
import { parseGameSummary } from '@aoe4/analyzer-core/parser/gameSummaryParser';
import {
  makeUnknownBucketStaticData,
  makeUnknownBucketSummary,
} from '../helpers/unknownBucketMechanics';

describe('unknown build-order bucket mechanics integration', () => {
  it('counts confirmed unknown-bucket mechanics in deployed pools', () => {
    const summary = parseGameSummary(makeUnknownBucketSummary());
    const player1Build = resolveAllBuildOrders(summary.players[0], makeUnknownBucketStaticData());
    const player2Build = resolveAllBuildOrders(summary.players[1], makeUnknownBucketStaticData());
    const pools = buildDeployedResourcePools(summary, player1Build, player2Build);

    expect(player1Build.unresolved).toEqual([]);
    expect(pools.player1.bandItemDeltas).toEqual(expect.arrayContaining([
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
  });
});
