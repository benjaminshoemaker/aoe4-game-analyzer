import { parseAoe4WorldGameUrl } from '../../src/parser/aoe4WorldUrl';

describe('parseAoe4WorldGameUrl', () => {
  it('parses canonical aoe4world URL with signature', () => {
    const parsed = parseAoe4WorldGameUrl(
      'https://aoe4world.com/players/8097972-RepleteCactus/games/229999593?sig=abc123'
    );

    expect(parsed).toEqual({
      originalUrl: 'https://aoe4world.com/players/8097972-RepleteCactus/games/229999593?sig=abc123',
      profileSlug: '8097972-RepleteCactus',
      gameId: 229999593,
      sig: 'abc123',
    });
  });

  it('parses www host and no signature', () => {
    const parsed = parseAoe4WorldGameUrl(
      'https://www.aoe4world.com/players/1234567/games/987654321'
    );

    expect(parsed).toEqual({
      originalUrl: 'https://www.aoe4world.com/players/1234567/games/987654321',
      profileSlug: '1234567',
      gameId: 987654321,
      sig: undefined,
    });
  });

  it('parses scheme-less URL by normalizing to https', () => {
    const parsed = parseAoe4WorldGameUrl(
      'aoe4world.com/players/42/games/777?sig=xyz'
    );

    expect(parsed.profileSlug).toBe('42');
    expect(parsed.gameId).toBe(777);
    expect(parsed.sig).toBe('xyz');
  });

  it('throws for unsupported host', () => {
    expect(() =>
      parseAoe4WorldGameUrl('https://example.com/players/1/games/2')
    ).toThrow(/Invalid AoE4World game URL/);
  });

  it('throws for invalid path', () => {
    expect(() =>
      parseAoe4WorldGameUrl('https://aoe4world.com/games/2')
    ).toThrow(/Invalid AoE4World game URL/);
  });

  it('throws for invalid game id', () => {
    expect(() =>
      parseAoe4WorldGameUrl('https://aoe4world.com/players/1/games/not-a-number')
    ).toThrow(/Invalid AoE4World game URL/);

    expect(() =>
      parseAoe4WorldGameUrl('https://aoe4world.com/players/1/games/0')
    ).toThrow(/Invalid AoE4World game URL/);
  });
});
