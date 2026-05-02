import fs from 'fs';
import path from 'path';
import { StaticDataCache } from '../../src/types';

export function makeUnknownBucketMechanicsFixture(): any {
  const fixturePath = path.resolve(__dirname, '../fixtures/sampleGameSummary.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

  fixture.gameId = 876543;
  fixture.duration = 2600;
  fixture.players[0] = {
    ...fixture.players[0],
    profileId: 111,
    name: 'Unknown Buckets',
    civilization: 'ayyubids',
    actions: {
      feudalAge: [275],
      upgradeAddCultureWingDarkBAbbHa01: [275],
    },
    resources: {
      ...fixture.players[0].resources,
      timestamps: [0, 61, 100, 200, 253, 275, 333, 355, 415, 1254, 1344, 1613, 2505, 2600],
    },
    buildOrder: [
      {
        id: '11254893',
        icon: 'icons/races/abbasid_historic/upgrades/society',
        pbgid: 2141107,
        type: 'Upgrade',
        finished: [275],
        constructed: [],
        destroyed: [],
        unknown: {},
      },
      {
        id: '11119584',
        icon: 'icons/hud/age/age_display_persistent_2',
        pbgid: 108171,
        type: 'Age',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: { '10': [275] },
      },
      {
        id: '11191836',
        icon: 'icons/races/campaign/units/camel_trader',
        pbgid: 2762454,
        type: 'Unit',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: { '14': [100, 200] },
      },
      {
        id: '11160584',
        icon: 'icons/races/chinese/units/imperial_official',
        pbgid: 2631059,
        type: 'Unit',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: { '14': [0, 253, 333] },
      },
      {
        id: '11265429',
        icon: 'icons/races/templar/units/pilgrim',
        pbgid: 5000301,
        type: 'Unit',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: { '15': [355, 415] },
      },
      {
        id: '11254919',
        icon: 'icons/races/abbasid_historic/units/tower_of_the_sultan',
        pbgid: 2141356,
        type: 'Unit',
        finished: [],
        constructed: [1145],
        destroyed: [],
        unknown: { '6': [1344] },
      },
      {
        id: '11142995',
        icon: 'icons/races/common/units/ram',
        pbgid: 8635755,
        type: 'Unit',
        finished: [],
        constructed: [1128],
        destroyed: [],
        unknown: { '6': [1254] },
      },
      {
        id: '11258380',
        icon: 'icons/races/common/units/mangonel',
        pbgid: 7804932,
        type: 'Unit',
        finished: [],
        constructed: [1442],
        destroyed: [],
        unknown: { '6': [1613] },
      },
      {
        id: '11245398',
        icon: 'icons/races/byzantine/units/chierosiphon',
        pbgid: 2140765,
        type: 'Unit',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: { '6': [2505] },
      },
      {
        id: '11266336',
        icon: 'icons/races/sengoku/units/yatai',
        pbgid: 9001316,
        type: 'Unit',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: {
          '14': [61],
          '15': [523],
        },
      },
      {
        id: '11270094',
        icon: 'icons/races/common/units/trade_cart',
        pbgid: 9003449,
        type: 'Unit',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: { '15': [1139] },
      },
    ],
  };

  return fixture;
}

export function makeUnknownBucketStaticDataCache(): StaticDataCache {
  return {
    fetchedAt: new Date().toISOString(),
    units: [],
    buildings: [],
    technologies: [
      {
        id: 'feudal-culture-wing-logistics-1',
        name: 'Logistics (Feudal Culture Wing)',
        baseId: 'feudal-culture-wing-logistics',
        pbgid: 2141107,
        civs: ['ay'],
        costs: { food: 400, gold: 200 },
        classes: ['abbasid_wing_upgrade', 'age_up_upgrade'],
        age: 1,
        icon: 'icons/races/abbasid_historic/upgrades/society',
      },
    ],
  };
}
