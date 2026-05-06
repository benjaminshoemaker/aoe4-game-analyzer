const mockLoadStaticData = jest.fn();

jest.mock('@aoe4/analyzer-core/data/fetchStaticData', () => ({
  ...jest.requireActual('@aoe4/analyzer-core/data/fetchStaticData'),
  loadStaticData: (...args: unknown[]) => mockLoadStaticData(...args),
}));

import fs from 'fs';
import path from 'path';
import nock from 'nock';
import { GET, clearMatchRouteCacheForTests } from '../../src/app/matches/[profileSlug]/[gameId]/route';
import { clearGameSummaryFetchStateForTests } from '@aoe4/analyzer-core/parser/gameSummaryParser';

describe('signed summary fallback route e2e', () => {
  const fixturePath = path.resolve(__dirname, '../../../../__tests__/fixtures/sampleGameSummary.json');
  const sampleJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  const previousApiKey = process.env.AOE4WORLD_API_KEY;
  const previousRedisUrl = process.env.AOE4_SUMMARY_REDIS_REST_URL;
  const previousRedisToken = process.env.AOE4_SUMMARY_REDIS_REST_TOKEN;
  const previousKvUrl = process.env.KV_REST_API_URL;
  const previousKvToken = process.env.KV_REST_API_TOKEN;
  const previousUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const previousUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const previousLockWaitMs = process.env.AOE4_SUMMARY_LOCK_WAIT_MS;
  const previousLockPollMs = process.env.AOE4_SUMMARY_LOCK_POLL_MS;

  beforeEach(() => {
    jest.clearAllMocks();
    nock.cleanAll();
    clearMatchRouteCacheForTests();
    clearGameSummaryFetchStateForTests();
    delete process.env.AOE4WORLD_API_KEY;
    delete process.env.AOE4_SUMMARY_REDIS_REST_URL;
    delete process.env.AOE4_SUMMARY_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.AOE4_SUMMARY_LOCK_WAIT_MS;
    delete process.env.AOE4_SUMMARY_LOCK_POLL_MS;
    mockLoadStaticData.mockResolvedValue({
      fetchedAt: new Date().toISOString(),
      units: [],
      buildings: [],
      technologies: [],
    });
  });

  afterEach(() => {
    nock.cleanAll();
    clearGameSummaryFetchStateForTests();
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

  it('renders a match by falling back to the public summary when the signed endpoint is rate-limited', async () => {
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
    expect(signedRequest.isDone()).toBe(true);
    expect(unsignedRequest.isDone()).toBe(true);
  });

  it('does not probe the public summary before a signed private match request', async () => {
    const publicRequest = nock('https://aoe4world.com')
      .get('/players/999/games/123456/summary')
      .query({ camelize: 'true' })
      .reply(404, { error: 'Not Found' });

    const signedRequest = nock('https://aoe4world.com')
      .get('/players/999/games/123456/summary')
      .query({ camelize: 'true', sig: 'signed-token-123' })
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

    expect(response.status).toBe(200);
    expect(signedRequest.isDone()).toBe(true);
    expect(publicRequest.isDone()).toBe(false);
  });

  it('keeps the AoE4World API key server-side when rendering a signed match route', async () => {
    process.env.AOE4WORLD_API_KEY = 'route-server-token';
    const signedRequest = nock('https://aoe4world.com')
      .get('/players/999/games/123456/summary')
      .query({ camelize: 'true', sig: 'signed-token-123', api_key: 'route-server-token' })
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
    expect(body).not.toContain('route-server-token');
    expect(body).not.toContain('api_key=route-server-token');
    expect(body).not.toContain('apiKey=route-server-token');
    expect(signedRequest.isDone()).toBe(true);
  });

  it('renders a match from the durable Redis summary cache when AoE4World is unavailable', async () => {
    process.env.AOE4_SUMMARY_REDIS_REST_URL = 'https://redis.example.test';
    process.env.AOE4_SUMMARY_REDIS_REST_TOKEN = 'redis-token';

    const redisRead = nock('https://redis.example.test')
      .post('/', (command) => (
        Array.isArray(command) &&
        command[0] === 'GET' &&
        typeof command[1] === 'string' &&
        command[1].startsWith('aoe4:summary:v1:')
      ))
      .reply(200, { result: JSON.stringify(sampleJson) });

    const upstream = nock('https://aoe4world.com')
      .get('/players/999/games/123456/summary')
      .query(true)
      .reply(429, { error: 'Too Many Requests' });

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
    expect(redisRead.isDone()).toBe(true);
    expect(upstream.isDone()).toBe(false);
  });

  it('renders the rate-limit recovery page from the durable Redis negative cache', async () => {
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

    const upstream = nock('https://aoe4world.com')
      .get('/players/999/games/123456/summary')
      .query(true)
      .reply(200, sampleJson);

    const response = await GET(
      new Request('http://localhost/matches/999/123456'),
      {
        params: Promise.resolve({
          profileSlug: '999',
          gameId: '123456',
        }),
      }
    );
    const body = await response.text();

    expect(response.status).toBe(429);
    expect(body).toContain('Match analysis is temporarily delayed');
    expect(body).toContain('recently rate-limited');
    expect(negativeRead.isDone()).toBe(true);
    expect(upstream.isDone()).toBe(false);
  });

  it('waits behind a durable Redis lock and renders the peer-populated report', async () => {
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

    const upstream = nock('https://aoe4world.com')
      .get('/players/999/games/123456/summary')
      .query(true)
      .reply(200, sampleJson);

    const response = await GET(
      new Request('http://localhost/matches/999/123456'),
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
    expect(upstream.isDone()).toBe(false);
  });

  it('coalesces concurrent route renders for the same signed match into one upstream summary request', async () => {
    const signedRequest = nock('https://aoe4world.com')
      .get('/players/999/games/123456/summary')
      .query({ camelize: 'true', sig: 'signed-token-123' })
      .delay(25)
      .reply(200, sampleJson);

    const context = {
      params: Promise.resolve({
        profileSlug: '999',
        gameId: '123456',
      }),
    };
    const request = new Request('http://localhost/matches/999/123456?sig=signed-token-123');

    const [first, second] = await Promise.all([
      GET(request, context),
      GET(request, context),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(signedRequest.isDone()).toBe(true);
  });
});
