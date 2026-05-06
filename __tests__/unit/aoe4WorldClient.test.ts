import {
  AOE4WORLD_STATIC_DATA_ENDPOINTS,
  buildAoe4WorldHeaders,
  buildGameSummaryRequest,
} from '../../packages/aoe4-core/src/aoe4world/client';

describe('AoE4World client policy', () => {
  const botDetectorTerms = /fetch|spider|crawler|scraper|bot/i;

  it('centralizes summary endpoint, camelize, sig, and headers', () => {
    const request = buildGameSummaryRequest('8097972-steam', 230143339, 'private-sig');

    expect(request.url).toBe('https://aoe4world.com/players/8097972-steam/games/230143339/summary');
    expect(request.params).toEqual({
      camelize: 'true',
      sig: 'private-sig',
    });
    expect(request.headers).toEqual(buildAoe4WorldHeaders('summary'));
    expect(request.headers['User-Agent']).toContain('aoe4-game-analyzer-core');
    expect(request.headers['User-Agent']).not.toContain('Mozilla');
    expect(request.headers['User-Agent']).not.toMatch(botDetectorTerms);
  });

  it('adds the configured AoE4World API key as api_key query param', () => {
    const request = buildGameSummaryRequest('8097972-steam', 230143339, 'private-sig', 'server-token');

    expect(request.params).toEqual({
      camelize: 'true',
      sig: 'private-sig',
      api_key: 'server-token',
    });
    expect(request.params).not.toHaveProperty('apiKey');
    expect(request.params).not.toHaveProperty('apikey');
  });

  it('centralizes static data endpoints and request headers', () => {
    expect(AOE4WORLD_STATIC_DATA_ENDPOINTS).toEqual({
      units: 'https://data.aoe4world.com/units/all.json',
      buildings: 'https://data.aoe4world.com/buildings/all.json',
      technologies: 'https://data.aoe4world.com/technologies/all.json',
    });
    expect(buildAoe4WorldHeaders('static-data')['User-Agent']).toBe('aoe4-game-analyzer-core/0.1 static-data-client');
    expect(buildAoe4WorldHeaders('static-data')['User-Agent']).not.toMatch(botDetectorTerms);
  });
});
