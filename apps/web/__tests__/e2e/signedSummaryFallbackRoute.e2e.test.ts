const mockLoadStaticData = jest.fn();

jest.mock('@aoe4/analyzer-core/data/fetchStaticData', () => ({
  ...jest.requireActual('@aoe4/analyzer-core/data/fetchStaticData'),
  loadStaticData: (...args: unknown[]) => mockLoadStaticData(...args),
}));

import fs from 'fs';
import path from 'path';
import nock from 'nock';
import { GET, clearMatchRouteCacheForTests } from '../../src/app/matches/[profileSlug]/[gameId]/route';

describe('signed summary fallback route e2e', () => {
  const fixturePath = path.resolve(__dirname, '../../../../__tests__/fixtures/sampleGameSummary.json');
  const sampleJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

  beforeEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
    clearMatchRouteCacheForTests();
    mockLoadStaticData.mockResolvedValue({
      fetchedAt: new Date().toISOString(),
      units: [],
      buildings: [],
      technologies: [],
    });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('renders a match with sig by using the public summary when the signed endpoint is rate-limited', async () => {
    const signedRequest = nock('https://aoe4world.com')
      .get('/players/999/games/123456/summary')
      .query({ camelize: 'true', sig: 'signed-token-123' })
      .reply(429, { error: 'Too Many Requests' });

    const unsignedRequest = nock('https://aoe4world.com')
      .get('/players/999/games/123456/summary')
      .query({ camelize: 'true' })
      .reply(200, sampleJson);

    const response = await GET(
      new Request('http://localhost/matches/999/123456?sig=signed-token-123'),
      {
        params: Promise.resolve({
          profileSlug: '999',
          gameId: '123456',
        }),
      }
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('PlayerOne');
    expect(signedRequest.isDone()).toBe(false);
    expect(unsignedRequest.isDone()).toBe(true);
  });
});
