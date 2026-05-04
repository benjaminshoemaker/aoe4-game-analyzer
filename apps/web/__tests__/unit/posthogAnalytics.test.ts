import {
  buildHomePostHogAnalyticsScript,
  buildMatchAnalyticsProperties,
  buildPostHogAnalyticsScript,
  postHogConfigFromEnv,
  postHogDeploymentEnvironmentFromEnv,
  stripSensitiveQueryParams,
} from '../../src/lib/posthogAnalytics';
import { makeMvpModelFixture } from '../helpers/mvpModelFixture';

function expectBrowserScriptToParse(script: string) {
  expect(() => new Function(script)).not.toThrow();
}

describe('PostHog analytics helpers', () => {
  it('uses the configured PostHog project defaults with env overrides', () => {
    expect(postHogConfigFromEnv({})).toEqual({
      token: 'phc_mPGKCTfkNwcknrDkvcVBXknJ74uehvu2hhnTzmjg8A8o',
      host: 'https://us.i.posthog.com',
    });

    expect(postHogConfigFromEnv({
      NEXT_PUBLIC_POSTHOG_TOKEN: 'phc_custom',
      NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com/',
    })).toEqual({
      token: 'phc_custom',
      host: 'https://eu.i.posthog.com',
    });
  });

  it('labels the deployment environment from explicit, Vercel, or Node env values', () => {
    expect(postHogDeploymentEnvironmentFromEnv({
      NEXT_PUBLIC_POSTHOG_ENVIRONMENT: 'production',
      VERCEL_ENV: 'preview',
    })).toBe('production');
    expect(postHogDeploymentEnvironmentFromEnv({
      NEXT_PUBLIC_VERCEL_ENV: 'preview',
    })).toBe('preview');
    expect(postHogDeploymentEnvironmentFromEnv({
      VERCEL_ENV: 'production',
    })).toBe('production');
    expect(postHogDeploymentEnvironmentFromEnv({
      NODE_ENV: 'development',
    })).toBe('development');
    expect(postHogDeploymentEnvironmentFromEnv({})).toBe('production');
  });

  it('renders a privacy-scoped PostHog bootstrap with explicit capture only', () => {
    const script = buildPostHogAnalyticsScript({
      surface: 'match',
      baseProperties: {
        game_id: 230143339,
        has_sig: true,
      },
      initialEventName: 'match viewed',
    });

    expect(script).toContain('posthog.init');
    expect(script).toContain('phc_mPGKCTfkNwcknrDkvcVBXknJ74uehvu2hhnTzmjg8A8o');
    expect(script).toContain('https://us.i.posthog.com');
    expect(script).toContain('autocapture: false');
    expect(script).toContain('capture_pageview: false');
    expect(script).toContain('disable_session_recording: true');
    expect(script).toContain('request_batching: false');
    expect(script).toContain('before_send: sanitizeCaptureResult');
    expect(script).toContain('deployment_environment');
    expect(script).toContain('app_environment');
    expect(script).toContain('app_hostname');
    expect(script).toContain('is_local_environment');
    expect(script).toContain("capture('match viewed'");
    expect(script).toContain("capture('$pageview'");
  });

  it('renders browser-parseable analytics JavaScript', () => {
    expectBrowserScriptToParse(buildPostHogAnalyticsScript({
      surface: 'match',
      baseProperties: {
        game_id: 230143339,
        has_sig: true,
      },
      initialEventName: 'match viewed',
    }));
    expectBrowserScriptToParse(buildHomePostHogAnalyticsScript());
  });

  it('does not suppress localhost events because local testing should be visible and labeled', () => {
    const script = buildPostHogAnalyticsScript({
      surface: 'home',
    });

    expect(script).toContain('is_local_environment');
    expect(script).toContain("app_environment: isLocal ? 'local' : deploymentEnvironment");
    expect(script).not.toContain('aoe4_enable_local_analytics');
  });

  it('adds acquisition and engagement properties without exposing full URLs', () => {
    const script = buildPostHogAnalyticsScript({
      surface: 'match',
      baseProperties: {
        game_id: 230143339,
        has_sig: true,
      },
      initialEventName: 'match viewed',
    });

    expect(script).toContain('utm_source');
    expect(script).toContain('utm_medium');
    expect(script).toContain('utm_campaign');
    expect(script).toContain('referrer_host');
    expect(script).toContain('app_pathname');
    expect(script).toContain('match engagement summary');
    expect(script).toContain('time_on_page_ms');
    expect(script).toContain('interaction_count');
    expect(script).toContain('max_scroll_depth_pct');
    expect(script).toContain('timestamp_selection_count');
    expect(script).toContain('filter_change_count');
    expect(script).toContain('outbound_click_count');
    expect(script).toContain('send_instantly: true');
    expect(script).toContain("transport: 'sendBeacon'");
  });

  it('strips private signature query params from URL-like analytics values', () => {
    expect(stripSensitiveQueryParams('https://aoe4world.com/players/111/games/123456?sig=abc123&t=90'))
      .toBe('https://aoe4world.com/players/111/games/123456?t=90');
    expect(stripSensitiveQueryParams('/matches/my-slug/123456?sig=abc123&t=90'))
      .toBe('/matches/my-slug/123456?t=90');
    expect(stripSensitiveQueryParams('http://localhost:3000/matches/loading?to=%2Fmatches%2Fmy-slug%2F123456%3Fsig%3Dabc123%26t%3D90'))
      .toBe('http://localhost:3000/matches/loading?to=%2Fmatches%2Fmy-slug%2F123456%3Ft%3D90');
    expect(stripSensitiveQueryParams('/matches/loading?to=%2Fmatches%2Fmy-slug%2F123456%3Fsig%3Dabc123%26t%3D90'))
      .toBe('/matches/loading?to=%2Fmatches%2Fmy-slug%2F123456%3Ft%3D90');
    expect(stripSensitiveQueryParams('plain value')).toBe('plain value');
  });

  it('builds match properties without leaking the private signature token', () => {
    const model = makeMvpModelFixture();
    const properties = buildMatchAnalyticsProperties({
      profileSlug: 'my-slug',
      gameId: 230143339,
      sig: 'abc123',
    }, model);

    expect(properties).toEqual(expect.objectContaining({
      surface: 'match',
      profile_slug: 'my-slug',
      game_id: 230143339,
      has_sig: true,
      map: model.header.map,
      mode: model.header.mode,
      duration_label: model.header.durationLabel,
      outcome: model.header.outcome,
    }));
    expect(JSON.stringify(properties)).not.toContain('abc123');
    expect(JSON.stringify(properties)).not.toContain('sig=');
  });

  it('wires home page form and sample report events without sending raw submitted URLs', () => {
    const script = buildHomePostHogAnalyticsScript();

    expect(script).toContain('home match url submitted');
    expect(script).toContain('home match url rejected');
    expect(script).toContain('home sample report opened');
    expect(script).toContain('home outbound link clicked');
    expect(script).toContain('home engagement summary');
    expect(script).toContain('extractMatchProperties');
    expect(script).toContain('destination_host');
    expect(script).not.toContain('rawMatchUrl');
  });
});
