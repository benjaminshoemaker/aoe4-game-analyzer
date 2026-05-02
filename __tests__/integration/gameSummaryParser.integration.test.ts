import nock from 'nock';
import fs from 'fs';
import path from 'path';
import { fetchGameSummaryFromApi } from '../../src/parser/gameSummaryParser';

describe('fetchGameSummaryFromApi', () => {
  const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'sampleGameSummary.json');
  const sampleJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  const expectedUserAgent = 'aoe4-game-analyzer-core/0.1 summary-client';

  afterEach(() => {
    nock.cleanAll();
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

  it('passes signature token through query params', async () => {
    const profileId = '999';
    const gameId = 123456;
    const sig = 'signed-token-123';

    nock('https://aoe4world.com')
      .get(`/players/${profileId}/games/${gameId}/summary`)
      .query({ camelize: 'true', sig })
      .matchHeader('accept', 'application/json')
      .matchHeader('user-agent', expectedUserAgent)
      .reply(200, sampleJson);

    const summary = await fetchGameSummaryFromApi(profileId, gameId, sig);
    expect(summary.gameId).toBe(gameId);
  });
});
