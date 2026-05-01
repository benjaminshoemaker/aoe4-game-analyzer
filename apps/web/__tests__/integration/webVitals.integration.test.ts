import { renderPostMatchHtml } from '../../src/lib/aoe4/formatters/postMatchHtml';
import { makeMvpModelFixture } from '../helpers/mvpModelFixture';

describe('web vitals integration', () => {
  it('embeds the non-blocking monitor in generated match pages', () => {
    const html = renderPostMatchHtml(makeMvpModelFixture());

    expect(html).toContain('id="web-vitals-monitor"');
    expect(html).toContain('largest-contentful-paint');
    expect(html).toContain('layout-shift');
    expect(html).toContain('/api/web-vitals');
  });
});
