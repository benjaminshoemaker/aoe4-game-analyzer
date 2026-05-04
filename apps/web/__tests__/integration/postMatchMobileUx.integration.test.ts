import { renderPostMatchHtml } from '@aoe4/analyzer-core/formatters/postMatchHtml';
import { makeMvpModelFixture } from '../helpers/mvpModelFixture';

describe('post-match mobile UX integration', () => {
  it('keeps mobile timestamp controls synchronized with the shared hover payload', () => {
    const html = renderPostMatchHtml(makeMvpModelFixture());

    expect(html).toContain('<script id="post-match-hover-data" type="application/json">');
    expect(html).toContain('data-mobile-current-time');
    expect(html).toContain('data-mobile-current-context');
    expect(html).toContain('data-mobile-summary-value="overall"');
    expect(html).toContain('data-mobile-summary-detail="overall"');
    expect(html).toContain('setMobileSummary(\'overall\', allocation.overall);');
    expect(html).toContain('setText(\'[data-mobile-current-time]\', point.timeLabel);');
    expect(html).toContain('document.querySelectorAll(\'[data-mobile-timeline-slider]\')');
    expect(html).toContain('var targetIndex = safePointIndex(Number(slider.value));');
    expect(html).toContain("selectPointByIndex(targetIndex, true, false, 'mobile-slider');");
    expect(html).toContain("trackMobileTimelineChanged(hoverData[targetIndex], 'mobile-slider', targetIndex);");
    expect(html).toContain("trackAnalyticsEvent('mobile timeline changed'");
  });
});
