import { renderHomeHtml } from '../../src/lib/homePageHtml';

describe('HomePage form', () => {
  it('renders a raw server-submitted form without Next hydration markers', () => {
    const html = renderHomeHtml();

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('rel="icon"');
    expect(html).toContain('href="data:image/svg+xml');
    expect(html).toContain('<title>AoE4 Match Analyzer</title>');
    expect(html).toContain('See where the game turned.');
    expect(html).toContain('<form method="get" action="/matches/open"');
    expect(html).toContain('<label for="match-url"');
    expect(html).toContain('id="match-url"');
    expect(html).toContain('name="url"');
    expect(html).toContain('type="text"');
    expect(html).toContain('inputmode="url"');
    expect(html).toContain('placeholder="https://aoe4world.com/.../games/..."');
    expect(html).not.toContain('type="url"');
    expect(html).toContain('min-height: 44px');
    expect(html).toContain('min-width: 44px');
    expect(html).not.toContain('self.__next_f');
    expect(html).not.toContain('/_next/static/chunks/');
    expect(html).not.toContain('/favicon.ico');
  });

  it('renders an engaging sample-report entry point without client hydration', () => {
    const html = renderHomeHtml();

    expect(html).toContain('AoE4 Match Analyzer');
    expect(html).toContain('Post-match allocation analysis from <a href="https://aoe4world.com" target="_blank" rel="noopener noreferrer">AoE4World links</a>');
    expect(html).toContain('View sample report');
    expect(html).toContain('/matches/open?url=https%3A%2F%2Faoe4world.com%2Fplayers%2F8139502%2Fgames%2F229727104%3Fsig%3Db6fc4eab80fa84ff983bcb27b4af086a59a09f5d');
    expect(html).toContain('Dry Arabia &middot; 25:03');
    expect(html).toContain('washed up &middot; Sengoku Daimyo');
    expect(html).toContain('2k and still no hands &middot; Macedonian Dynasty');
    expect(html).toContain('Match recap');
    expect(html).toContain('Allocation timeline');
    expect(html).toContain('Selected time');
    expect(html).toContain('Sample report: Dry Arabia');
    expect(html).toContain('Macedonian win');
    expect(html).toContain('@media (max-width: 620px)');
  });

  it('escapes a submitted error message before rendering it', () => {
    const html = renderHomeHtml('<script>alert("bad")</script>');

    expect(html).toContain('&lt;script&gt;alert(&quot;bad&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert("bad")</script>');
  });
});
