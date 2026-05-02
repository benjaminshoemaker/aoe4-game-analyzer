import { renderPostMatchHtml } from '@aoe4/analyzer-core/formatters/postMatchHtml';
import { buildWebVitalsScript } from '../../src/lib/webVitals';
import { makeMvpModelFixture } from '../helpers/mvpModelFixture';

describe('web vitals integration', () => {
  it('embeds the non-blocking monitor in generated match pages', () => {
    const html = renderPostMatchHtml(makeMvpModelFixture(), {
      webVitalsScript: buildWebVitalsScript('/api/web-vitals'),
    });

    expect(html).toContain('id="web-vitals-monitor"');
    expect(html).toContain('largest-contentful-paint');
    expect(html).toContain('layout-shift');
    expect(html).toContain('/api/web-vitals');
  });
});
