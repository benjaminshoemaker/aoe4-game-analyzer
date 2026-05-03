import { StaticDataCache } from '../../src/types';

function makeResourceSeries(population?: number[]) {
  return {
    timestamps: [0, 60, 90, 100, 120, 180, 240, 360],
    food: [0, 100, 150, 180, 220, 350, 500, 900],
    gold: [0, 50, 75, 90, 110, 180, 260, 420],
    stone: [0, 0, 0, 0, 0, 50, 100, 180],
    wood: [0, 80, 130, 180, 240, 360, 480, 760],
    foodPerMin: [100, 120, 125, 130, 135, 140, 145, 150],
    goldPerMin: [80, 85, 90, 95, 100, 105, 110, 115],
    stonePerMin: [0, 0, 0, 0, 10, 15, 20, 25],
    woodPerMin: [100, 110, 115, 120, 125, 130, 135, 140],
    total: [0, 100, 200, 300, 400, 600, 800, 1200],
    military: [0, 0, 0, 0, 25, 50, 75, 100],
    economy: [0, 50, 100, 150, 200, 300, 400, 600],
    technology: [0, 0, 0, 0, 50, 75, 100, 150],
    society: [0, 50, 100, 150, 150, 225, 300, 350],
    ...(population ? { population } : {}),
  };
}

function makeBasePlayer(profileId: number, name: string, civilization: string, team: number) {
  return {
    profileId,
    name,
    civilization,
    team,
    apm: 100,
    result: team === 1 ? 'win' : 'loss',
    _stats: {
      ekills: 0,
      edeaths: 0,
      sqprod: 0,
      sqlost: 0,
      bprod: 0,
      upg: 0,
      totalcmds: 0,
    },
    actions: {},
    scores: {
      total: 0,
      military: 0,
      economy: 0,
      technology: 0,
      society: 0,
    },
    totalResourcesGathered: {
      food: 900,
      gold: 420,
      stone: 180,
      wood: 760,
      total: 2260,
    },
    totalResourcesSpent: {
      food: 600,
      gold: 300,
      stone: 100,
      wood: 600,
      total: 1600,
    },
  };
}

export function makeAccountingFixesRawSummary() {
  return {
    gameId: 999001,
    winReason: 'elimination',
    mapName: 'Dry Arabia',
    mapBiome: 'desert',
    leaderboard: 'rm_1v1',
    duration: 360,
    startedAt: 1710000000,
    finishedAt: 1710000360,
    players: [
      {
        ...makeBasePlayer(111, 'JeanneTester', "Jeanne d'Arc", 1),
        resources: makeResourceSeries([80, 100, 120, 140, 200, 160, 160, 160]),
        buildOrder: [
          {
            id: 'villager',
            icon: 'icons/races/common/units/villager',
            pbgid: 1001,
            type: 'Unit',
            finished: [0, 0, 0, 0, 0],
            constructed: [],
            destroyed: [],
          },
          {
            id: 'jeanne-darc-villager',
            icon: 'icons/races/jeanne_darc/units/jeanne_darc_villager',
            pbgid: 1002,
            type: 'Unit',
            finished: [0],
            constructed: [],
            destroyed: [180],
            transformed: [120],
          },
          {
            id: 'town-center',
            icon: 'icons/races/common/buildings/town_center',
            pbgid: 2001,
            type: 'Building',
            finished: [],
            constructed: [0],
            destroyed: [],
          },
          {
            id: 'military-school',
            icon: 'icons/races/ottomans/buildings/military_school',
            pbgid: 2002,
            type: 'Building',
            finished: [],
            constructed: [90],
            destroyed: [],
          },
          {
            id: 'mehmed-imperial-armory',
            icon: 'icons/races/ottomans/buildings/mehmed_imperial_armory',
            pbgid: 2003,
            type: 'Building',
            finished: [],
            constructed: [100],
            destroyed: [],
          },
        ],
      },
      {
        ...makeBasePlayer(222, 'Opponent', 'English', 2),
        resources: makeResourceSeries(),
        buildOrder: [
          {
            id: 'villager',
            icon: 'icons/races/common/units/villager',
            pbgid: 1001,
            type: 'Unit',
            finished: [0, 0, 0, 0, 0, 0],
            constructed: [],
            destroyed: [],
          },
          {
            id: 'town-center',
            icon: 'icons/races/common/buildings/town_center',
            pbgid: 2001,
            type: 'Building',
            finished: [],
            constructed: [0],
            destroyed: [],
          },
        ],
      },
    ],
  };
}

export function makeAccountingFixesStaticData(): StaticDataCache {
  return {
    fetchedAt: '2026-05-03T00:00:00.000Z',
    units: [
      {
        id: 'villager-1',
        baseId: 'villager',
        name: 'Villager',
        pbgid: 1001,
        civs: ['en', 'je'],
        costs: { food: 50 },
        classes: ['worker', 'villager'],
        displayClasses: ['Worker'],
        age: 1,
        icon: 'icons/races/common/units/villager',
      },
      {
        id: 'jeanne-darc-villager',
        baseId: 'jeanne-darc',
        name: "Jeanne d'Arc",
        pbgid: 1002,
        civs: ['je'],
        costs: { food: 50 },
        classes: ['worker', 'villager', 'hero'],
        displayClasses: ['Hero'],
        age: 1,
        icon: 'icons/races/jeanne_darc/units/jeanne_darc_villager',
      },
    ],
    buildings: [
      {
        id: 'town-center-1',
        baseId: 'town-center',
        name: 'Town Center',
        pbgid: 2001,
        civs: ['en', 'je', 'ot'],
        costs: { wood: 400, stone: 350 },
        classes: ['building', 'town_center'],
        age: 1,
        icon: 'icons/races/common/buildings/town_center',
      },
      {
        id: 'military-school-1',
        baseId: 'military-school',
        name: 'Military School',
        pbgid: 2002,
        civs: ['ot'],
        costs: { wood: 150 },
        classes: ['building', 'military_school_ott', 'free_passive_unit_production'],
        age: 2,
        icon: 'icons/races/ottomans/buildings/military_school',
      },
      {
        id: 'mehmed-imperial-armory-3',
        baseId: 'mehmed-imperial-armory',
        name: 'Mehmed Imperial Armory',
        pbgid: 2003,
        civs: ['ot'],
        costs: { food: 400, gold: 200 },
        classes: ['building', 'landmark', 'siege_production_landmark'],
        age: 3,
        icon: 'icons/races/ottomans/buildings/mehmed_imperial_armory',
      },
    ],
    technologies: [],
  };
}
