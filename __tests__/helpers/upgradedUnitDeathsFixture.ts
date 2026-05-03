import fs from 'fs';
import path from 'path';
import { StaticDataCache } from '../../src/types';

const hardenedSpearmanPbgid = 700002;
const veteranSpearmanPbgid = 700003;

function zeroResourceSeries(length: number): number[] {
  return Array.from({ length }, () => 0);
}

export function makeUpgradedUnitDeathsFixture(): any {
  const fixturePath = path.resolve(__dirname, '../fixtures/sampleGameSummary.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  const timestamps = [0, 10, 20, 30, 90, 100, 110, 120, 140];
  const zeroes = zeroResourceSeries(timestamps.length);

  fixture.gameId = 909090;
  fixture.duration = 140;
  fixture.players[0] = {
    ...fixture.players[0],
    profileId: 111,
    name: 'UpgradeTester',
    civilization: 'english',
    result: 'win',
    resources: {
      ...fixture.players[0].resources,
      timestamps,
      food: zeroes,
      wood: zeroes,
      gold: zeroes,
      stone: zeroes,
      total: zeroes,
      military: zeroes,
      economy: zeroes,
      technology: zeroes,
      society: zeroes,
      foodPerMin: zeroes,
      woodPerMin: zeroes,
      goldPerMin: zeroes,
      stonePerMin: zeroes,
    },
    buildOrder: [
      {
        id: 'hardened-spearman',
        icon: 'icons/races/common/units/spearman_2',
        pbgid: hardenedSpearmanPbgid,
        type: 'Unit',
        finished: [10, 20, 30],
        constructed: [],
        destroyed: [],
      },
      {
        id: 'veteran-spearman',
        icon: 'icons/races/common/units/spearman_3',
        pbgid: veteranSpearmanPbgid,
        type: 'Unit',
        finished: [100],
        constructed: [],
        destroyed: [90, 110, 120],
      },
    ],
  };
  fixture.players[1] = {
    ...fixture.players[1],
    profileId: 222,
    name: 'Opponent',
    civilization: 'french',
    result: 'loss',
    resources: {
      ...fixture.players[1].resources,
      timestamps,
      food: zeroes,
      wood: zeroes,
      gold: zeroes,
      stone: zeroes,
      total: zeroes,
      military: zeroes,
      economy: zeroes,
      technology: zeroes,
      society: zeroes,
      foodPerMin: zeroes,
      woodPerMin: zeroes,
      goldPerMin: zeroes,
      stonePerMin: zeroes,
    },
    buildOrder: [],
  };

  return fixture;
}

export function makeUpgradedUnitDeathsStaticDataCache(): StaticDataCache {
  return {
    fetchedAt: new Date().toISOString(),
    units: [
      {
        id: 'spearman-2',
        name: 'Hardened Spearman',
        baseId: 'spearman',
        pbgid: hardenedSpearmanPbgid,
        civs: ['en'],
        costs: { food: 60, wood: 20 },
        classes: ['infantry', 'spearman', 'military'],
        displayClasses: ['Spear Infantry'],
        age: 2,
        icon: 'icons/races/common/units/spearman_2',
      },
      {
        id: 'spearman-3',
        name: 'Veteran Spearman',
        baseId: 'spearman',
        pbgid: veteranSpearmanPbgid,
        civs: ['en'],
        costs: { food: 60, wood: 20 },
        classes: ['infantry', 'spearman', 'military'],
        displayClasses: ['Spear Infantry'],
        age: 3,
        icon: 'icons/races/common/units/spearman_3',
      },
    ],
    buildings: [],
    technologies: [],
  };
}
