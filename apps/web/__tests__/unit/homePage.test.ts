import { renderHomeHtml } from '../../src/lib/homePageHtml';

describe('HomePage form', () => {
  it('renders a raw server-submitted form without Next hydration markers', () => {
    const html = renderHomeHtml();

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('rel="icon"');
    expect(html).toContain('href="data:image/svg+xml');
    expect(html).toContain('<title>AoE4 Match Analyzer</title>');
    expect(html).toContain('See where the game turned.');
    expect(html).toContain('1v1 match report');
    expect(html).toContain('Paste an AoE4World 1v1 match link. See economy, army, and fight timing in one report.');
    expect(html).toContain('<form method="get" action="/matches/open"');
    expect(html).toContain('<label for="match-url"');
    expect(html).toContain('id="match-url"');
    expect(html).toContain('name="url"');
    expect(html).toContain('type="text"');
    expect(html).toContain('inputmode="url"');
    expect(html).toContain('placeholder="https://aoe4world.com/.../games/..."');
    expect(html).toContain('Currently supports 1v1 games only.');
    expect(html).toContain('class="support-note"');
    expect(html).toContain('class="feature-chips"');
    expect(html).toContain('Selected moment');
    expect(html).toContain('id="posthog-analytics"');
    expect(html).toContain('posthog.init');
    expect(html).toContain('autocapture: false');
    expect(html).toContain('disable_session_recording: true');
    expect(html).toContain('match url submitted');
    expect(html).toContain('sample report opened');
    expect(html).not.toContain('type="url"');
    expect(html).toContain('min-height: 44px');
    expect(html).toContain('min-width: 44px');
    expect(html).not.toContain('self.__next_f');
    expect(html).not.toContain('/_next/static/chunks/');
    expect(html).not.toContain('/favicon.ico');
    expect(html).not.toContain('Paste an AoE4World match link and inspect the resource mix');
  });

  it('renders an engaging sample-report entry point without client hydration', () => {
    const html = renderHomeHtml();

    expect(html).toContain('AoE4 Match Analyzer');
    expect(html).toContain('Post-match allocation analysis from <a href="https://aoe4world.com" target="_blank" rel="noopener noreferrer">AoE4World links</a>');
    expect(html).toContain('<a href="https://www.reddit.com/user/shoe7525/" target="_blank" rel="noopener noreferrer">Feedback? DM me on Reddit</a>');
    expect(html).toContain('View sample report');
    expect(html).toContain('/matches/8139502/229727104?sig=b6fc4eab80fa84ff983bcb27b4af086a59a09f5d&t=1191');
    expect(html).toContain('Ranked 1v1 &middot; 25:03');
    expect(html).toContain('washed up &middot; Sengoku Daimyo');
    expect(html).toContain('2k and still no hands &middot; Macedonian Dynasty');
    expect(html).toContain('Selected Time');
    expect(html).toContain('Chart focus.');
    expect(html).toContain('Economy edge.');
    expect(html).toContain('Army edge.');
    expect(html).toContain('Resource state over time');
    expect(html).toContain('At 19:51, the military line separates.');
    expect(html).toContain('Sample report: Dry Arabia');
    expect(html).toContain('Macedonian win');
    expect(html).toContain('@media (max-width: 620px)');
    expect(html).not.toContain('State before the late divergence.');
    expect(html).not.toContain('Higher economic deployment for most of the game.');
    expect(html).not.toContain('Military and tech pressure before the final fights.');
    expect(html).not.toContain('Why 19:51 matters');
  });

  it('escapes a submitted error message before rendering it', () => {
    const html = renderHomeHtml('<script>alert("bad")</script>');

    expect(html).toContain('&lt;script&gt;alert(&quot;bad&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert("bad")</script>');
  });
});
