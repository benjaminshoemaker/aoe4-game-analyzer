import { buildPlayerDeployedPoolSeries } from '../../src/analysis/resourcePool';
import { reconstructArmyAt } from '../../src/analysis/armyReconstruction';
import { resolveAllBuildOrders } from '../../src/parser/buildOrderResolver';
import { parseGameSummary } from '../../src/parser/gameSummaryParser';
import { StaticDataCache } from '../../src/types';
import {
  makeSplitVillagerDeathsFixture,
  makeSplitVillagerStaticDataCache
} from '../helpers/splitVillagerDeathsFixture';

describe('buildOrderResolver', () => {
  it('resolves Knights Templar unknown commanderie age-up choices by PBGID', () => {
    const staticData: StaticDataCache = {
      fetchedAt: new Date().toISOString(),
      units: [],
      buildings: [],
      technologies: [
        {
          id: 'knights-hospitaller-1',
          name: 'Knights Hospitaller',
          baseId: 'knights-hospitaller',
          pbgid: 5000201,
          civs: ['kt'],
          costs: { food: 400, gold: 200 },
          classes: ['age_up_upgrade', 'scar_dark_age_upgrade'],
          age: 1,
          icon: 'icons/races/templar/technologies/knights-hospitaller-1',
        },
      ],
    };
    const fixture = makeSplitVillagerDeathsFixture();
    fixture.players[1].civilization = 'knights_templar';
    fixture.players[1].buildOrder = [{
      id: '11265377',
      icon: 'icons/races/templar/commanderieflags/civ_icon_medium_knight_hospitalier',
      pbgid: 5000201,
      type: 'Unknown',
      finished: [264],
      constructed: [],
      destroyed: [],
    }];

    const summary = parseGameSummary(fixture);
    const player = summary.players[1];
    const resolved = resolveAllBuildOrders(player, staticData);
    const pool = buildPlayerDeployedPoolSeries(player, resolved, summary.duration);

    expect(resolved.unresolved).toEqual([]);
    expect(resolved.resolved[0]).toEqual(expect.objectContaining({
      type: 'upgrade',
      name: 'Knights Hospitaller',
      produced: [264],
    }));
    expect(pool.series.find(point => point.timestamp === 264)?.advancement).toBe(600);
    expect(pool.bandItemDeltas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        timestamp: 264,
        band: 'advancement',
        itemLabel: 'Knights Hospitaller',
        deltaValue: 600,
      }),
    ]));
  });

  it('does not duplicate destroyed events when splitting starting and later production', () => {
    const summary = parseGameSummary(makeSplitVillagerDeathsFixture());
    const player = summary.players[1];
    const resolved = resolveAllBuildOrders(player, makeSplitVillagerStaticDataCache());

    const startingVillagers = resolved.startingAssets.find(item => item.name === 'Villager');
    const trainedVillagers = resolved.resolved.find(item => item.name === 'Villager');

    expect(startingVillagers?.produced).toHaveLength(6);
    expect(trainedVillagers?.produced).toHaveLength(4);
    expect([
      ...(startingVillagers?.destroyed ?? []),
      ...(trainedVillagers?.destroyed ?? []),
    ]).toEqual([150]);

    const pool = buildPlayerDeployedPoolSeries(player, resolved, summary.duration);
    const at150 = pool.series.find(point => point.timestamp === 150);
    const villagerSnapshot = pool.bandItemSnapshots
      ?.find(point => point.timestamp === 150)
      ?.bands.economic.find(entry => entry.itemLabel === 'Villager');

    expect(at150?.economic).toBe(450);
    expect(villagerSnapshot?.count).toBe(9);
  });

  it('preserves early destruction on starting assets when later production exists', () => {
    const fixture = makeSplitVillagerDeathsFixture();
    fixture.players[1].buildOrder[0] = {
      id: 'spearman',
      icon: 'icons/races/common/units/spearman',
      pbgid: 700001,
      type: 'Unit',
      finished: [0, 0, 30],
      constructed: [],
      destroyed: [10],
    };

    const staticData: StaticDataCache = {
      fetchedAt: new Date().toISOString(),
      units: [
        {
          id: 'spearman-1',
          name: 'Spearman',
          baseId: 'spearman',
          pbgid: 700001,
          civs: ['en'],
          costs: { food: 60, wood: 20 },
          classes: ['infantry', 'spearman'],
          displayClasses: ['Spear Infantry'],
          age: 1,
          icon: 'icons/races/common/units/spearman',
        },
      ],
      buildings: [],
      technologies: [],
    };

    const summary = parseGameSummary(fixture);
    const player = summary.players[1];
    const resolved = resolveAllBuildOrders(player, staticData);
    const armyAt20 = reconstructArmyAt(resolved, 20);
    const totalAt20 = armyAt20.reduce((sum, entry) => sum + entry.count, 0);

    expect(totalAt20).toBe(1);
  });
});
