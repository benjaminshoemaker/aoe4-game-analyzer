import fs from 'fs';
import path from 'path';
import { StaticDataCache } from '../../src/types';

const splitVillagerPbgid = 6094899;

export function makeSplitVillagerDeathsFixture(): any {
  const fixturePath = path.resolve(__dirname, '../fixtures/sampleGameSummary.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

  fixture.gameId = 765432;
  fixture.players[1] = {
    ...fixture.players[1],
    civilization: 'sengoku_daimyo',
    buildOrder: [
      {
        id: '11119068',
        icon: 'icons/races/japanese/units/villager',
        pbgid: splitVillagerPbgid,
        type: 'Unit',
        finished: [0, 0, 0, 0, 0, 0, 30, 60, 90, 120],
        constructed: [],
        destroyed: [150],
      },
    ],
  };

  return fixture;
}

export function makeSplitVillagerStaticDataCache(): StaticDataCache {
  return {
    fetchedAt: new Date().toISOString(),
    units: [
      {
        id: 'villager-1',
        name: 'Villager',
        baseId: 'villager',
        pbgid: splitVillagerPbgid,
        civs: ['sen'],
        costs: { food: 50 },
        classes: ['villager', 'worker'],
        displayClasses: ['Worker'],
        age: 1,
        icon: 'icons/races/japanese/units/villager',
      },
    ],
    buildings: [],
    technologies: [],
  };
}
