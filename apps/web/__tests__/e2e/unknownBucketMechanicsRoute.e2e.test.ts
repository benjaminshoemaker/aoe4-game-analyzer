const mockFetchGameSummaryFromApi = jest.fn();
const mockLoadStaticData = jest.fn();

jest.mock('@aoe4/analyzer-core/parser/gameSummaryParser', () => ({
  ...jest.requireActual('@aoe4/analyzer-core/parser/gameSummaryParser'),
  fetchGameSummaryFromApi: (...args: unknown[]) => mockFetchGameSummaryFromApi(...args),
}));

jest.mock('@aoe4/analyzer-core/data/fetchStaticData', () => ({
  loadStaticData: (...args: unknown[]) => mockLoadStaticData(...args),
}));

import { GET } from '../../src/app/matches/[profileSlug]/[gameId]/route';
import { GET as GET_HOVER_DATA } from '../../src/app/matches/[profileSlug]/[gameId]/hover-data/route';
import { parseGameSummary } from '@aoe4/analyzer-core/parser/gameSummaryParser';
import {
  makeUnknownBucketStaticData,
  makeUnknownBucketSummary,
} from '../helpers/unknownBucketMechanics';

describe('unknown build-order bucket match route e2e', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadStaticData.mockResolvedValue(makeUnknownBucketStaticData());
  });

  it('serves confirmed unknown-bucket mechanics in hover data', async () => {
    mockFetchGameSummaryFromApi.mockResolvedValue(parseGameSummary(makeUnknownBucketSummary()));

    const response = await GET(new Request('http://localhost/matches/111-Unknown/876543?sig=b6fc'), {
      params: Promise.resolve({
        profileSlug: '111-Unknown',
        gameId: '876543',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('data-hover-field="allocationCategory.economic.resourceGeneration.you"');
    expect(body).toContain('data-hover-field="allocationCategory.economic.resourceInfrastructure.you"');
    expect(body).toContain('data-economic-role-filter="resourceGenerator"');
    expect(body).toContain('data-economic-role-filter="resourceInfrastructure"');
    expect(body).toContain('data-allocation-investment-category="economic"');
    expect(body).toContain('data-band-key="militaryInvestment"');
    expect(body).toContain('Total Economic Investment');
    expect(body).toContain('Total Military Investment');
    expect(body).toContain("selectedEconomicRoleFilter = key === 'economic'");
    expect(body).toContain('data-destroyed-row-category="economic" data-destroyed-row-empty="true" hidden');
    expect(body).toContain('Advancement destroyed');
    expect(body).not.toContain('Technology destroyed');
    expect(body).not.toContain('<li class="band-breakdown-group">Resource generators</li>');
    expect(body).not.toContain('<li class="band-breakdown-group">Resource infrastructure</li>');

    const hoverResponse = await GET_HOVER_DATA(
      new Request('http://localhost/matches/111-Unknown/876543/hover-data?sig=b6fc'),
      {
        params: Promise.resolve({
          profileSlug: '111-Unknown',
          gameId: '876543',
        }),
      }
    );
    const hoverPayload = await hoverResponse.json();
    const economicSnapshot = hoverPayload.hoverSnapshots.find((point: { timestamp: number }) => point.timestamp === 415);
    const militarySnapshot = hoverPayload.hoverSnapshots.find((point: { timestamp: number }) => point.timestamp === 2505);

    expect(hoverResponse.status).toBe(200);
    expect(economicSnapshot?.allocationCategory.economic).toEqual(expect.objectContaining({
      resourceGeneration: expect.objectContaining({ you: 985 }),
      resourceInfrastructure: expect.objectContaining({ you: 850 }),
    }));
    expect(economicSnapshot?.bandBreakdown.economic.you).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Trade Caravan',
        value: 160,
        economicRole: 'resourceGenerator',
      }),
      expect.objectContaining({
        label: 'Fishing Boat',
        value: 225,
        economicRole: 'resourceGenerator',
      }),
      expect.objectContaining({
        label: 'Trader',
        value: 360,
        economicRole: 'resourceGenerator',
      }),
      expect.objectContaining({
        label: 'Imperial Official',
        value: 450,
        economicRole: 'resourceInfrastructure',
      }),
      expect.objectContaining({
        label: 'Pit Mine',
        value: 150,
        economicRole: 'resourceInfrastructure',
      }),
      expect.objectContaining({
        label: 'Ger',
        value: 100,
        economicRole: 'resourceInfrastructure',
      }),
      expect.objectContaining({
        label: 'Ovoo',
        value: 150,
        economicRole: 'resourceInfrastructure',
      }),
      expect.objectContaining({
        label: 'Pilgrim',
        value: 240,
        economicRole: 'resourceGenerator',
      }),
    ]));
    expect(militarySnapshot?.bandBreakdown.militaryActive.you).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Tower of the Sultan', value: 1000 }),
      expect.objectContaining({ label: 'Battering Ram', value: 200 }),
      expect.objectContaining({ label: 'Mangonel', value: 600 }),
      expect.objectContaining({ label: 'Cheirosiphon', value: 260 }),
    ]));
  });
});
