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
  const previousApiKey = process.env.AOE4WORLD_API_KEY;
  const previousRedisUrl = process.env.AOE4_SUMMARY_REDIS_REST_URL;
  const previousRedisToken = process.env.AOE4_SUMMARY_REDIS_REST_TOKEN;
  const previousKvUrl = process.env.KV_REST_API_URL;
  const previousKvToken = process.env.KV_REST_API_TOKEN;
  const previousUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const previousNegativeTtl = process.env.AOE4_SUMMARY_NEGATIVE_CACHE_TTL_SECONDS;
  const previousLockWaitMs = process.env.AOE4_SUMMARY_LOCK_WAIT_MS;
  const previousLockPollMs = process.env.AOE4_SUMMARY_LOCK_POLL_MS;
  const cacheDir = path.resolve(__dirname, '../../tmp/integration-summary-cache');
  const overrideDir = path.resolve(__dirname, '../../tmp/integration-summary-overrides');

  beforeEach(() => {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    fs.rmSync(overrideDir, { recursive: true, force: true });
    delete process.env.AOE4_SUMMARY_CACHE_DIR;
    delete process.env.AOE4_SUMMARY_OVERRIDE_DIR;
    delete process.env.AOE4WORLD_API_KEY;
    delete process.env.AOE4_SUMMARY_REDIS_REST_URL;
    delete process.env.AOE4_SUMMARY_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.AOE4_SUMMARY_NEGATIVE_CACHE_TTL_SECONDS;
    delete process.env.AOE4_SUMMARY_LOCK_WAIT_MS;
    delete process.env.AOE4_SUMMARY_LOCK_POLL_MS;
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
    if (previousApiKey === undefined) {
      delete process.env.AOE4WORLD_API_KEY;
    } else {
      process.env.AOE4WORLD_API_KEY = previousApiKey;
    }
    if (previousRedisUrl === undefined) {
      delete process.env.AOE4_SUMMARY_REDIS_REST_URL;
    } else {
      process.env.AOE4_SUMMARY_REDIS_REST_URL = previousRedisUrl;
    }
    if (previousRedisToken === undefined) {
      delete process.env.AOE4_SUMMARY_REDIS_REST_TOKEN;
    } else {
      process.env.AOE4_SUMMARY_REDIS_REST_TOKEN = previousRedisToken;
    }
    if (previousKvUrl === undefined) {
      delete process.env.KV_REST_API_URL;
    } else {
      process.env.KV_REST_API_URL = previousKvUrl;
    }
    if (previousKvToken === undefined) {
      delete process.env.KV_REST_API_TOKEN;
    } else {
      process.env.KV_REST_API_TOKEN = previousKvToken;
    }
    if (previousUpstashUrl === undefined) {
      delete process.env.UPSTASH_REDIS_REST_URL;
    } else {
      process.env.UPSTASH_REDIS_REST_URL = previousUpstashUrl;
    }
    if (previousUpstashToken === undefined) {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    } else {
      process.env.UPSTASH_REDIS_REST_TOKEN = previousUpstashToken;
    }
    if (previousNegativeTtl === undefined) {
      delete process.env.AOE4_SUMMARY_NEGATIVE_CACHE_TTL_SECONDS;
    } else {
      process.env.AOE4_SUMMARY_NEGATIVE_CACHE_TTL_SECONDS = previousNegativeTtl;
    }
    if (previousLockWaitMs === undefined) {
      delete process.env.AOE4_SUMMARY_LOCK_WAIT_MS;
    } else {
      process.env.AOE4_SUMMARY_LOCK_WAIT_MS = previousLockWaitMs;
    }
    if (previousLockPollMs === undefined) {
      delete process.env.AOE4_SUMMARY_LOCK_POLL_MS;
    } else {
      process.env.AOE4_SUMMARY_LOCK_POLL_MS = previousLockPollMs;
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

  it('appends the configured API key to signed summary requests as api_key', async () => {
    process.env.AOE4WORLD_API_KEY = 'integration-server-token';
    const profileId = '999';
    const gameId = 123456;
    const sig = 'signed-token-123';

    nock('https://aoe4world.com')
      .get(`/players/${profileId}/games/${gameId}/summary`)
      .query({ camelize: 'true', sig, api_key: 'integration-server-token' })
      .matchHeader('accept', 'application/json')
      .matchHeader('user-agent', expectedUserAgent)
      .reply(200, sampleJson);

    const summary = await fetchGameSummaryFromApi(profileId, gameId, sig);

    expect(summary.gameId).toBe(gameId);
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

  it('serves a durable Redis cached summary without an AoE4World request', async () => {
    process.env.AOE4_SUMMARY_REDIS_REST_URL = 'https://redis.example.test';
    process.env.AOE4_SUMMARY_REDIS_REST_TOKEN = 'redis-token';

    const redisRead = nock('https://redis.example.test')
      .post('/', (command) => (
        Array.isArray(command) &&
        command[0] === 'GET' &&
        typeof command[1] === 'string' &&
        command[1].startsWith('aoe4:summary:v1:')
      ))
      .matchHeader('authorization', 'Bearer redis-token')
      .reply(200, { result: JSON.stringify(sampleJson) });

    const blockedNetwork = nock('https://aoe4world.com')
      .get('/players/999/games/123456/summary')
      .query(true)
      .reply(429, { error: 'Too Many Requests' });

    const summary = await fetchGameSummaryFromApi('999', 123456);

    expect(summary.gameId).toBe(123456);
    expect(redisRead.isDone()).toBe(true);
    expect(blockedNetwork.isDone()).toBe(false);
  });

  it('uses a durable Redis negative cache to suppress duplicate 429-prone requests', async () => {
    process.env.AOE4_SUMMARY_REDIS_REST_URL = 'https://redis.example.test';
    process.env.AOE4_SUMMARY_REDIS_REST_TOKEN = 'redis-token';

    nock('https://redis.example.test')
      .post('/', (command) => (
        Array.isArray(command) &&
        command[0] === 'GET' &&
        typeof command[1] === 'string' &&
        command[1].startsWith('aoe4:summary:v1:')
      ))
      .reply(200, { result: null });

    const negativeRead = nock('https://redis.example.test')
      .post('/', (command) => (
        Array.isArray(command) &&
        command[0] === 'GET' &&
        typeof command[1] === 'string' &&
        command[1].startsWith('aoe4:summary-rate-limit:v1:')
      ))
      .reply(200, {
        result: JSON.stringify({
          message: 'AoE4World summary request was recently rate-limited',
        }),
      });

    const blockedNetwork = nock('https://aoe4world.com')
      .get('/players/999/games/123456/summary')
      .query(true)
      .reply(200, sampleJson);

    await expect(fetchGameSummaryFromApi('999', 123456)).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining('recently rate-limited'),
    });
    expect(negativeRead.isDone()).toBe(true);
    expect(blockedNetwork.isDone()).toBe(false);
  });

  it('waits behind a durable Redis lock and uses the populated cache instead of stampeding AoE4World', async () => {
    process.env.AOE4_SUMMARY_REDIS_REST_URL = 'https://redis.example.test';
    process.env.AOE4_SUMMARY_REDIS_REST_TOKEN = 'redis-token';
    process.env.AOE4_SUMMARY_LOCK_WAIT_MS = '20';
    process.env.AOE4_SUMMARY_LOCK_POLL_MS = '1';

    nock('https://redis.example.test')
      .post('/', (command) => (
        Array.isArray(command) &&
        command[0] === 'GET' &&
        typeof command[1] === 'string' &&
        command[1].startsWith('aoe4:summary:v1:')
      ))
      .reply(200, { result: null })
      .post('/', (command) => (
        Array.isArray(command) &&
        command[0] === 'GET' &&
        typeof command[1] === 'string' &&
        command[1].startsWith('aoe4:summary-rate-limit:v1:')
      ))
      .reply(200, { result: null })
      .post('/', (command) => (
        Array.isArray(command) &&
        command[0] === 'SET' &&
        typeof command[1] === 'string' &&
        command[1].startsWith('aoe4:summary-lock:v1:')
      ))
      .reply(200, { result: null })
      .post('/', (command) => (
        Array.isArray(command) &&
        command[0] === 'GET' &&
        typeof command[1] === 'string' &&
        command[1].startsWith('aoe4:summary:v1:')
      ))
      .reply(200, { result: JSON.stringify(sampleJson) });

    const blockedNetwork = nock('https://aoe4world.com')
      .get('/players/999/games/123456/summary')
      .query(true)
      .reply(200, sampleJson);

    const summary = await fetchGameSummaryFromApi('999', 123456);

    expect(summary.gameId).toBe(123456);
    expect(blockedNetwork.isDone()).toBe(false);
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
