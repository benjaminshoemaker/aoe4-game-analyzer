const mockFetchGameSummaryFromApi = jest.fn();
const mockLoadStaticData = jest.fn();

jest.mock('../../src/lib/aoe4/parser/gameSummaryParser', () => ({
  ...jest.requireActual('../../src/lib/aoe4/parser/gameSummaryParser'),
  fetchGameSummaryFromApi: (...args: unknown[]) => mockFetchGameSummaryFromApi(...args),
}));

jest.mock('../../src/lib/aoe4/data/fetchStaticData', () => ({
  loadStaticData: (...args: unknown[]) => mockLoadStaticData(...args),
}));

import { GET } from '../../src/app/matches/[profileSlug]/[gameId]/route';
import { GET as GET_HOVER_DATA } from '../../src/app/matches/[profileSlug]/[gameId]/hover-data/route';
import { parseGameSummary } from '../../src/lib/aoe4/parser/gameSummaryParser';

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

function makeSummary() {
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
        resources,
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
        resources,
        buildOrder: [],
      },
    ],
  });
}

describe('Sengoku Yatai match route e2e', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadStaticData.mockResolvedValue({
      fetchedAt: new Date().toISOString(),
      units: [],
      buildings: [],
      technologies: [],
    });
  });

  it('renders Yatai in the economic deployed pool breakdown for the match route', async () => {
    mockFetchGameSummaryFromApi.mockResolvedValue(makeSummary());

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
    expect(body).toContain('id="post-match-hover-data-url"');
    expect(body).toContain('/matches/8139502-Beasty/229727104/hover-data?sig=b6fc');
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

    expect(hoverResponse.status).toBe(200);
    expect(snapshot?.bandBreakdown.economic.you).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Yatai', value: 375 }),
    ]));
    expect(snapshot?.allocation.float.you).toBe(105);
    expect(snapshot?.bandBreakdown.float.you).toEqual([
      expect.objectContaining({ label: 'Food', value: 60, percent: 57.1 }),
      expect.objectContaining({ label: 'Wood', value: 30, percent: 28.6 }),
      expect.objectContaining({ label: 'Gold', value: 15, percent: 14.3 }),
    ]);
  });
});
