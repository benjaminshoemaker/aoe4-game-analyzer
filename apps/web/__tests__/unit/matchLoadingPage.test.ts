import { renderMatchLoadingHtml, safeMatchLoadingTarget } from '../../src/lib/matchLoadingPageHtml';

describe('match loading page', () => {
  it('renders an accessible branded loading shell without exposing the signed URL as visible text', () => {
    const html = renderMatchLoadingHtml('/matches/my-slug/230143339?sig=abc123');

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('Building match report');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Fetching match summary');
    expect(html).toContain('Resolving units and tech');
    expect(html).toContain('Building resource timeline');
    expect(html).toContain('Rendering report');
    expect(html).toContain('This match is still processing.');
    expect(html).toContain('prefers-reduced-motion');
    expect(html).toContain('window.location.replace(targetHref)');
    expect(html).toContain('"\\/matches\\/my-slug\\/230143339?sig=abc123"');
    expect(html).not.toContain('>abc123<');
    expect(html).not.toContain('/_next/static/chunks/');
    expect(html).not.toContain('self.__next_f');
  });

  it('accepts only internal concrete match report targets', () => {
    expect(safeMatchLoadingTarget('/matches/my-slug/230143339?sig=abc123')).toBe('/matches/my-slug/230143339?sig=abc123');
    expect(safeMatchLoadingTarget('https://evil.example/matches/my-slug/230143339')).toBeNull();
    expect(safeMatchLoadingTarget('/matches/loading?to=%2Fmatches%2Fmy-slug%2F230143339')).toBeNull();
    expect(safeMatchLoadingTarget('/matches/open?url=abc')).toBeNull();
    expect(safeMatchLoadingTarget('/matches/my-slug/not-a-game')).toBeNull();
  });
});
