import nock from 'nock';
import fs from 'fs';
import path from 'path';
import {
  clearGameSummaryFetchStateForTests,
  fetchGameSummaryFromApi,
} from '../../packages/aoe4-core/src/parser/gameSummaryParser';

describe('fetchGameSummaryFromApi', () => {
  const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'sampleGameSummary.json');
  const sampleJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  const expectedUserAgent = 'aoe4-game-analyzer-core/0.1 summary-fetcher';
  const previousCacheDir = process.env.AOE4_SUMMARY_CACHE_DIR;
  const previousOverrideDir = process.env.AOE4_SUMMARY_OVERRIDE_DIR;
  const cacheDir = path.resolve(__dirname, '../../tmp/integration-summary-cache');
  const overrideDir = path.resolve(__dirname, '../../tmp/integration-summary-overrides');

  beforeEach(() => {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    fs.rmSync(overrideDir, { recursive: true, force: true });
    delete process.env.AOE4_SUMMARY_CACHE_DIR;
    delete process.env.AOE4_SUMMARY_OVERRIDE_DIR;
    clearGameSummaryFetchStateForTests();
  });

  afterEach(() => {
    nock.cleanAll();
    fs.rmSync(cacheDir, { recursive: true, force: true });
    fs.rmSync(overrideDir, { recursive: true, force: true });
    clearGameSummaryFetchStateForTests();
    if (previousCacheDir === undefined) {
      delete process.env.AOE4_SUMMARY_CACHE_DIR;
    } else {
      process.env.AOE4_SUMMARY_CACHE_DIR = previousCacheDir;
    }
    if (previousOverrideDir === undefined) {
      delete process.env.AOE4_SUMMARY_OVERRIDE_DIR;
    } else {
      process.env.AOE4_SUMMARY_OVERRIDE_DIR = previousOverrideDir;
    }
  });

  it('fetches and parses game summary from AoE4World', async () => {
    const profileId = '999';
    const gameId = 123456;
    nock('https://aoe4world.com')
      .get(`/players/${profileId}/games/${gameId}/summary`)
      .query({ camelize: 'true' })
      .matchHeader('accept', 'application/json')
      .matchHeader('user-agent', expectedUserAgent)
      .reply(200, sampleJson);

    const summary = await fetchGameSummaryFromApi(profileId, gameId);

    expect(summary.gameId).toBe(123456);
    expect(summary.players).toHaveLength(2);
    expect(summary.players[0].name).toBe('PlayerOne');
  });

  it('uses the signed query first when a sig is present', async () => {
    const profileId = '999';
    const gameId = 123456;
    const sig = 'signed-token-123';

    const unsignedRequest = nock('https://aoe4world.com')
      .get(`/players/${profileId}/games/${gameId}/summary`)
      .query({ camelize: 'true' })
      .matchHeader('accept', 'application/json')
      .matchHeader('user-agent', expectedUserAgent)
      .reply(404, { error: 'Not Found' });

    nock('https://aoe4world.com')
      .get(`/players/${profileId}/games/${gameId}/summary`)
      .query({ camelize: 'true', sig })
      .matchHeader('accept', 'application/json')
      .matchHeader('user-agent', expectedUserAgent)
      .reply(200, sampleJson);

    const summary = await fetchGameSummaryFromApi(profileId, gameId, sig);

    expect(summary.gameId).toBe(gameId);
    expect(unsignedRequest.isDone()).toBe(false);
  });

  it('falls back to the unsigned public summary when the signed request is rate-limited', async () => {
    const profileId = '999';
    const gameId = 123456;
    const sig = 'signed-token-123';

    const signedRequest = nock('https://aoe4world.com')
      .get(`/players/${profileId}/games/${gameId}/summary`)
      .query({ camelize: 'true', sig })
      .matchHeader('accept', 'application/json')
      .matchHeader('user-agent', expectedUserAgent)
      .reply(429, { error: 'Too Many Requests' });

    const unsignedRequest = nock('https://aoe4world.com')
      .get(`/players/${profileId}/games/${gameId}/summary`)
      .query({ camelize: 'true' })
      .matchHeader('accept', 'application/json')
      .matchHeader('user-agent', expectedUserAgent)
      .reply(200, sampleJson);

    const summary = await fetchGameSummaryFromApi(profileId, gameId, sig);

    expect(summary.gameId).toBe(gameId);
    expect(signedRequest.isDone()).toBe(true);
    expect(unsignedRequest.isDone()).toBe(true);
  });

  it('exposes AoE4World rate-limit status on fetch failures', async () => {
    const profileId = '999';
    const gameId = 123456;

    nock('https://aoe4world.com')
      .get(`/players/${profileId}/games/${gameId}/summary`)
      .query({ camelize: 'true' })
      .matchHeader('accept', 'application/json')
      .matchHeader('user-agent', expectedUserAgent)
      .reply(429, { error: 'Too Many Requests' });

    await expect(fetchGameSummaryFromApi(profileId, gameId)).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining('(429)'),
    });
  });

  it('serves a configured cached summary without another AoE4World request', async () => {
    process.env.AOE4_SUMMARY_CACHE_DIR = cacheDir;
    const profileId = '999';
    const gameId = 123456;
    const sig = 'signed-token-123';

    const firstRequest = nock('https://aoe4world.com')
      .get(`/players/${profileId}/games/${gameId}/summary`)
      .query({ camelize: 'true', sig })
      .matchHeader('accept', 'application/json')
      .matchHeader('user-agent', expectedUserAgent)
      .reply(200, sampleJson);

    const secondRequest = nock('https://aoe4world.com')
      .get(`/players/${profileId}/games/${gameId}/summary`)
      .query({ camelize: 'true', sig })
      .reply(429, { error: 'Too Many Requests' });

    const first = await fetchGameSummaryFromApi(profileId, gameId, sig);
    const second = await fetchGameSummaryFromApi(profileId, gameId, sig);

    expect(first.gameId).toBe(gameId);
    expect(second.gameId).toBe(gameId);
    expect(firstRequest.isDone()).toBe(true);
    expect(secondRequest.isDone()).toBe(false);
    expect(fs.readdirSync(cacheDir)).toHaveLength(1);
  });

  it('uses a local override summary file for a specific game id without network access', async () => {
    process.env.AOE4_SUMMARY_OVERRIDE_DIR = overrideDir;
    fs.mkdirSync(overrideDir, { recursive: true });
    fs.writeFileSync(path.join(overrideDir, '123456.json'), JSON.stringify(sampleJson), 'utf-8');

    const blockedNetwork = nock('https://aoe4world.com')
      .get('/players/999/games/123456/summary')
      .query(true)
      .reply(429, { error: 'Too Many Requests' });

    const summary = await fetchGameSummaryFromApi('999', 123456, 'signed-token-123');

    expect(summary.gameId).toBe(123456);
    expect(blockedNetwork.isDone()).toBe(false);
  });
});
