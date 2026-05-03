import { renderPostMatchHtml } from '@aoe4/analyzer-core/formatters/postMatchHtml';
import { makeMvpModelFixture } from '../helpers/mvpModelFixture';

describe('post-match mobile UX', () => {
  it('places selected timestamp controls before the scaled chart and defines mobile accessibility affordances', () => {
    const html = renderPostMatchHtml(makeMvpModelFixture());

    expect(html).toContain('data-mobile-snapshot-controls');
    expect(html.indexOf('data-mobile-snapshot-controls')).toBeLessThan(html.indexOf('id="allocation-leader-strip"'));
    expect(html.indexOf('data-mobile-snapshot-controls')).toBeLessThan(html.indexOf('id="hover-inspector"'));
    expect(html).toContain('@media (max-width: 760px), (pointer: coarse)');
    expect(html).toContain('.mobile-snapshot-controls { display: grid; }');
    expect(html).toContain('.hover-inspector > .inspector-eyebrow,');
    expect(html).toContain('.recap-link:focus-visible,');
    expect(html).toContain('.mobile-timeline-button:focus-visible,');
    expect(html).toContain('.mobile-timeline-slider:focus-visible,');
    expect(html).toContain('.allocation-category-toggle:focus-visible,');
    expect(html).toContain('.band-toggle:focus-visible');
    expect(html).toContain('@media (max-width: 340px)');
    expect(html).toContain("window.matchMedia('(max-width: 760px), (pointer: coarse)').matches");
  });
});
