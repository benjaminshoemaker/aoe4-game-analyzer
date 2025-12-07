import nock from 'nock';
import fs from 'fs';
import path from 'path';
import { fetchGameSummaryFromApi } from '../../src/parser/gameSummaryParser';

describe('fetchGameSummaryFromApi', () => {
  const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'sampleGameSummary.json');
  const sampleJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

  afterEach(() => {
    nock.cleanAll();
  });

  it('fetches and parses game summary from AoE4World', async () => {
    const profileId = '999';
    const gameId = 123456;
    nock('https://aoe4world.com')
      .get(`/api/v0/players/${profileId}/games/${gameId}/summary`)
      .query(true)
      .reply(200, sampleJson);

    const summary = await fetchGameSummaryFromApi(profileId, gameId);

    expect(summary.gameId).toBe(123456);
    expect(summary.players).toHaveLength(2);
    expect(summary.players[0].name).toBe('PlayerOne');
  });
});
