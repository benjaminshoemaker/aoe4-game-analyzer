const mockFetchGameSummaryFromApi = jest.fn();
const mockLoadStaticData = jest.fn();

jest.mock('@aoe4/analyzer-core/parser/gameSummaryParser', () => ({
  ...jest.requireActual('@aoe4/analyzer-core/parser/gameSummaryParser'),
  fetchGameSummaryFromApi: (...args: unknown[]) => mockFetchGameSummaryFromApi(...args),
}));

jest.mock('@aoe4/analyzer-core/data/fetchStaticData', () => ({
  loadStaticData: (...args: unknown[]) => mockLoadStaticData(...args),
}));

import { GET, clearMatchRouteCacheForTests } from '../../src/app/matches/[profileSlug]/[gameId]/route';
import { GET as GET_HOVER_DATA } from '../../src/app/matches/[profileSlug]/[gameId]/hover-data/route';
import { parseGameSummary } from '@aoe4/analyzer-core/parser/gameSummaryParser';

const zeroStats = {
  ekills: 0,
  edeaths: 0,
  sqprod: 0,
  sqlost: 0,
  bprod: 0,
  upg: 0,
  totalcmds: 0,
};

const zeroScores = { total: 0, military: 0, economy: 0, technology: 0, society: 0 };
const zeroTotals = { food: 0, gold: 0, stone: 0, wood: 0, total: 0 };
const resources = {
  timestamps: [0, 61, 116, 159, 240],
  food: [0, 20, 40, 60, 80],
  gold: [0, 5, 10, 15, 20],
  stone: [0, 0, 0, 0, 0],
  wood: [0, 10, 20, 30, 40],
  foodPerMin: [0, 0, 0, 0, 0],
  goldPerMin: [0, 0, 0, 0, 0],
  stonePerMin: [0, 0, 0, 0, 0],
  woodPerMin: [0, 0, 0, 0, 0],
  total: [0, 0, 0, 0, 0],
  military: [0, 0, 0, 0, 0],
  economy: [0, 0, 0, 0, 0],
  technology: [0, 0, 0, 0, 0],
  society: [0, 0, 0, 0, 0],
};

function makeDenseResources() {
  const timestamps = Array.from({ length: 241 }, (_, index) => index);
  const linear = timestamps.map(timestamp => timestamp);
  const zeroes = timestamps.map(() => 0);

  return {
    timestamps,
    food: linear,
    gold: timestamps.map(timestamp => Math.floor(timestamp / 2)),
    stone: zeroes,
    wood: timestamps.map(timestamp => Math.floor(timestamp / 3)),
    foodPerMin: zeroes,
    goldPerMin: zeroes,
    stonePerMin: zeroes,
    woodPerMin: zeroes,
    total: zeroes,
    military: zeroes,
    economy: zeroes,
    technology: zeroes,
    society: zeroes,
  };
}

function embeddedHoverPayload(body: string): any[] {
  const match = body.match(/<script id="post-match-hover-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) throw new Error('Expected embedded hover payload');
  return JSON.parse(match[1]);
}

function makeSummary(resourceData = resources) {
  return parseGameSummary({
    gameId: 229727104,
    winReason: 'Surrender',
    mapName: 'Dry Arabia',
    mapBiome: 'Desert',
    leaderboard: 'rm_1v1',
    duration: 240,
    startedAt: 0,
    finishedAt: 240,
    players: [
      {
        profileId: 8139502,
        name: 'Beasty',
        civilization: 'sengoku_daimyo',
        team: 1,
        apm: 0,
        result: 'win',
        _stats: zeroStats,
        actions: {},
        scores: zeroScores,
        totalResourcesGathered: zeroTotals,
        totalResourcesSpent: zeroTotals,
        resources: structuredClone(resourceData),
        buildOrder: [
          {
            id: '11266336',
            icon: 'icons/races/sengoku/units/yatai',
            pbgid: 9001316,
            type: 'Unit',
            finished: [],
            constructed: [],
            destroyed: [],
            unknown: {
              '14': [61, 116, 159],
              '15': [170],
            },
          },
        ],
      },
      {
        profileId: 2,
        name: 'Opponent',
        civilization: 'english',
        team: 2,
        apm: 0,
        result: 'loss',
        _stats: zeroStats,
        actions: {},
        scores: zeroScores,
        totalResourcesGathered: zeroTotals,
        totalResourcesSpent: zeroTotals,
        resources: structuredClone(resourceData),
        buildOrder: [],
      },
    ],
  });
}

function makeFightWindowSummary() {
  const resourceData = {
    ...structuredClone(resources),
    timestamps: [0, 60, 90, 120, 150, 180, 240],
    food: [0, 0, 0, 0, 0, 0, 0],
    gold: [0, 0, 0, 0, 0, 0, 0],
    stone: [0, 0, 0, 0, 0, 0, 0],
    wood: [0, 0, 0, 0, 0, 0, 0],
    total: [0, 0, 0, 0, 0, 0, 0],
    military: [0, 0, 0, 0, 0, 0, 0],
    economy: [0, 0, 0, 0, 0, 0, 0],
    technology: [0, 0, 0, 0, 0, 0, 0],
    society: [0, 0, 0, 0, 0, 0, 0],
  };

  return parseGameSummary({
    gameId: 229727105,
    winReason: 'Surrender',
    mapName: 'Dry Arabia',
    mapBiome: 'Desert',
    leaderboard: 'rm_1v1',
    duration: 240,
    startedAt: 0,
    finishedAt: 240,
    players: [
      {
        profileId: 8139502,
        name: 'Beasty',
        civilization: 'english',
        team: 1,
        apm: 0,
        result: 'win',
        _stats: zeroStats,
        actions: {},
        scores: zeroScores,
        totalResourcesGathered: zeroTotals,
        totalResourcesSpent: zeroTotals,
        resources: structuredClone(resourceData),
        buildOrder: [
          {
            id: 'longbowman',
            icon: 'icons/races/english/units/longbowman',
            pbgid: 1002,
            type: 'Unit',
            finished: [60],
            constructed: [],
            destroyed: [],
          },
        ],
      },
      {
        profileId: 2,
        name: 'Opponent',
        civilization: 'french',
        team: 2,
        apm: 0,
        result: 'loss',
        _stats: zeroStats,
        actions: {},
        scores: zeroScores,
        totalResourcesGathered: zeroTotals,
        totalResourcesSpent: zeroTotals,
        resources: structuredClone(resourceData),
        buildOrder: [
          {
            id: 'mangonel',
            icon: 'icons/races/french/units/mangonel',
            pbgid: 1003,
            type: 'Unit',
            finished: [60, 60],
            constructed: [],
            destroyed: [],
          },
          {
            id: 'nest-of-bees',
            icon: 'icons/races/french/units/nest-of-bees',
            pbgid: 1004,
            type: 'Unit',
            finished: [60, 60],
            constructed: [],
            destroyed: [],
          },
          {
            id: 'springald',
            icon: 'icons/races/french/units/springald',
            pbgid: 1005,
            type: 'Unit',
            finished: [60, 60],
            constructed: [],
            destroyed: [],
          },
          {
            id: 'palace-guard',
            icon: 'icons/races/french/units/palace-guard',
            pbgid: 1006,
            type: 'Unit',
            finished: [60, 60],
            constructed: [],
            destroyed: [],
          },
          {
            id: 'knight',
            icon: 'icons/races/french/units/knight',
            pbgid: 1001,
            type: 'Unit',
            finished: [60, 60],
            constructed: [],
            destroyed: [150],
          },
        ],
      },
    ],
  });
}

describe('Sengoku Yatai match route e2e', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearMatchRouteCacheForTests();
    mockLoadStaticData.mockResolvedValue({
      fetchedAt: new Date().toISOString(),
      units: [],
      buildings: [],
      technologies: [],
    });
  });

  it('returns fight context on hover-data snapshots inside the event window', async () => {
    mockLoadStaticData.mockResolvedValue({
      fetchedAt: new Date().toISOString(),
      units: [
        {
          id: 'knight',
          name: 'Knight',
          pbgid: 1001,
          icon: 'icons/races/french/units/knight',
          costs: { food: 140, wood: 0, gold: 100, stone: 0, total: 240 },
          classes: ['cavalry', 'military'],
          civs: ['fr'],
        },
        {
          id: 'longbowman',
          name: 'Longbowman',
          pbgid: 1002,
          icon: 'icons/races/english/units/longbowman',
          costs: { food: 40, wood: 50, gold: 0, stone: 0, total: 90 },
          classes: ['archer', 'military'],
          civs: ['en'],
        },
        {
          id: 'mangonel',
          name: 'Mangonel',
          pbgid: 1003,
          icon: 'icons/races/french/units/mangonel',
          costs: { food: 260, wood: 0, gold: 0, stone: 0, total: 260 },
          classes: ['siege', 'military'],
          civs: ['fr'],
        },
        {
          id: 'nest-of-bees',
          name: 'Nest of Bees',
          pbgid: 1004,
          icon: 'icons/races/french/units/nest-of-bees',
          costs: { food: 255, wood: 0, gold: 0, stone: 0, total: 255 },
          classes: ['siege', 'military'],
          civs: ['fr'],
        },
        {
          id: 'springald',
          name: 'Springald',
          pbgid: 1005,
          icon: 'icons/races/french/units/springald',
          costs: { food: 250, wood: 0, gold: 0, stone: 0, total: 250 },
          classes: ['siege', 'military'],
          civs: ['fr'],
        },
        {
          id: 'palace-guard',
          name: 'Palace Guard',
          pbgid: 1006,
          icon: 'icons/races/french/units/palace-guard',
          costs: { food: 245, wood: 0, gold: 0, stone: 0, total: 245 },
          classes: ['infantry', 'military'],
          civs: ['fr'],
        },
      ],
      buildings: [],
      technologies: [],
    });
    mockFetchGameSummaryFromApi.mockImplementation(() => Promise.resolve(makeFightWindowSummary()));

    const pageResponse = await GET(
      new Request('http://localhost/matches/8139502-Beasty/229727105?sig=b6fc&t=180'),
      {
        params: Promise.resolve({
          profileSlug: '8139502-Beasty',
          gameId: '229727105',
        }),
      }
    );
    const pageBody = await pageResponse.text();
    const embeddedInteriorSnapshot = embeddedHoverPayload(pageBody)
      .find((point: { timestamp: number }) => point.timestamp === 180);

    const hoverResponse = await GET_HOVER_DATA(
      new Request('http://localhost/matches/8139502-Beasty/229727105/hover-data?sig=b6fc'),
      {
        params: Promise.resolve({
          profileSlug: '8139502-Beasty',
          gameId: '229727105',
        }),
      }
    );
    const hoverPayload = await hoverResponse.json();
    const interiorSnapshot = hoverPayload.hoverSnapshots.find((point: { timestamp: number }) => point.timestamp === 180);

    expect(pageResponse.status).toBe(200);
    expect(pageBody).toContain('Event window armies');
    expect(embeddedInteriorSnapshot?.significantEvent?.preEncounterArmies?.player2?.units).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Knight', count: 2, value: 480 }),
      ])
    );
    expect(hoverResponse.status).toBe(200);
    expect(interiorSnapshot?.significantEvent).toEqual(expect.objectContaining({
      kind: 'fight',
      windowStart: 150,
      windowEnd: 210,
      preEncounterArmies: expect.objectContaining({
        player2: expect.objectContaining({
          units: expect.arrayContaining([
            expect.objectContaining({ label: 'Knight', count: 2, value: 480 }),
          ]),
        }),
      }),
      postEncounterArmies: expect.objectContaining({
        player2: expect.objectContaining({
          units: expect.arrayContaining([
            expect.objectContaining({ label: 'Knight', count: 1, value: 240 }),
          ]),
        }),
      }),
    }));
  });

  it('renders Yatai in the economic deployed pool breakdown for the match route', async () => {
    mockFetchGameSummaryFromApi.mockImplementation(() => Promise.resolve(makeSummary()));

    const request = new Request('http://localhost/matches/8139502-Beasty/229727104?sig=b6fc');
    const response = await GET(request, {
      params: Promise.resolve({
        profileSlug: '8139502-Beasty',
        gameId: '229727104',
      }),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(mockFetchGameSummaryFromApi).toHaveBeenCalledWith('8139502-Beasty', 229727104, 'b6fc');
    expect(body).not.toContain('id="post-match-hover-data-url"');
    expect(body).not.toContain('/matches/8139502-Beasty/229727104/hover-data?sig=b6fc');
    expect(body).toContain('data-band-key="economic"');

    const hoverResponse = await GET_HOVER_DATA(
      new Request('http://localhost/matches/8139502-Beasty/229727104/hover-data?sig=b6fc'),
      {
        params: Promise.resolve({
          profileSlug: '8139502-Beasty',
          gameId: '229727104',
        }),
      }
    );
    const hoverPayload = await hoverResponse.json();
    const snapshot = hoverPayload.hoverSnapshots.find((point: { timestamp: number }) => point.timestamp === 159);
    const afterDestroySnapshot = hoverPayload.hoverSnapshots.find((point: { timestamp: number }) => point.timestamp === 240);

    expect(hoverResponse.status).toBe(200);
    expect(snapshot?.bandBreakdown.economic.you).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Yatai', value: 375 }),
    ]));
    expect(afterDestroySnapshot?.bandBreakdown.economic.you).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Yatai', value: 250 }),
    ]));
    expect(snapshot?.allocation.float.you).toBe(105);
    expect(snapshot?.bandBreakdown.float.you).toEqual([
      expect.objectContaining({ label: 'Food', value: 60, percent: 57.1 }),
      expect.objectContaining({ label: 'Wood', value: 30, percent: 28.6 }),
      expect.objectContaining({ label: 'Gold', value: 15, percent: 14.3 }),
    ]);
  });

  it('coarsens dense resource timestamps for the hover-data route', async () => {
    mockFetchGameSummaryFromApi.mockImplementation(() => Promise.resolve(makeSummary(makeDenseResources())));

    const hoverResponse = await GET_HOVER_DATA(
      new Request('http://localhost/matches/8139502-Beasty/229727104/hover-data?sig=b6fc'),
      {
        params: Promise.resolve({
          profileSlug: '8139502-Beasty',
          gameId: '229727104',
        }),
      }
    );
    const hoverPayload = await hoverResponse.json();
    const timestamps = hoverPayload.hoverSnapshots.map((point: { timestamp: number }) => point.timestamp);

    expect(hoverResponse.status).toBe(200);
    expect(timestamps).toEqual(expect.arrayContaining([0, 30, 60, 90, 120, 150, 170, 180, 210, 240]));
    expect(timestamps).not.toContain(1);
    expect(timestamps).not.toContain(2);
    expect(timestamps).not.toContain(61);
    expect(timestamps).not.toContain(116);
    expect(timestamps.length).toBeLessThan(30);
  });
});
