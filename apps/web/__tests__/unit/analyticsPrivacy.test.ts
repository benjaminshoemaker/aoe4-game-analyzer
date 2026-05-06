import {
  browserAnalyticsPrivacyScript,
  sanitizeAnalyticsProperties,
  stripSensitiveQueryParams,
} from '../../src/lib/analyticsPrivacy';

describe('analytics privacy policy', () => {
  it('sanitizes private signature data through one reusable module', () => {
    const properties = sanitizeAnalyticsProperties({
      sig: 'private',
      signature_token_value: 'private',
      current_url: '/matches/foo/123?sig=private&t=90',
      nested: '/matches/loading?to=%2Fmatches%2Ffoo%2F123%3Fsig%3Dprivate%26t%3D90',
      has_sig: true,
      count: 2,
      ignored: { raw: true },
    });

    expect(properties).toEqual({
      current_url: '/matches/foo/123?t=90',
      nested: '/matches/loading?to=%2Fmatches%2Ffoo%2F123%3Ft%3D90',
      has_sig: true,
      count: 2,
    });
    expect(JSON.stringify(properties)).not.toContain('private');
  });

  it('exports browser-parseable privacy helpers for the generated bootstrap', () => {
    expect(stripSensitiveQueryParams('https://aoe4world.com/players/1/games/2?sig=abc&t=90'))
      .toBe('https://aoe4world.com/players/1/games/2?t=90');
    expect(() => new Function(`${browserAnalyticsPrivacyScript()}; return sanitizeProperties({sig: 'x'});`))
      .not.toThrow();
  });
});
