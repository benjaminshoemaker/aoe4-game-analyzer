import { renderHomeHtml } from '../../src/lib/homePageHtml';

describe('HomePage form', () => {
  it('renders a raw server-submitted form without Next hydration markers', () => {
    const html = renderHomeHtml();

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('rel="icon"');
    expect(html).toContain('href="data:image/svg+xml');
    expect(html).toContain('<form method="get" action="/matches/open"');
    expect(html).toContain('<label for="match-url"');
    expect(html).toContain('id="match-url"');
    expect(html).toContain('name="url"');
    expect(html).toContain('type="text"');
    expect(html).toContain('inputmode="url"');
    expect(html).not.toContain('type="url"');
    expect(html).toContain('min-height: 44px');
    expect(html).toContain('min-width: 44px');
    expect(html).not.toContain('self.__next_f');
    expect(html).not.toContain('/_next/static/chunks/');
    expect(html).not.toContain('/favicon.ico');
  });

  it('escapes a submitted error message before rendering it', () => {
    const html = renderHomeHtml('<script>alert("bad")</script>');

    expect(html).toContain('&lt;script&gt;alert(&quot;bad&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert("bad")</script>');
  });
});
