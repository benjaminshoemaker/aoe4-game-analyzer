import {
  escapeHtml,
  formatNumber,
  formatSigned,
  formatTime,
} from '../../packages/aoe4-core/src/formatters/sharedFormatters';

describe('shared post-match formatters', () => {
  it('formats common labels consistently across model and renderer code', () => {
    expect(formatTime(125.8)).toBe('2:05');
    expect(formatNumber(1234.4)).toBe('1,234');
    expect(formatSigned(42.2)).toBe('+42');
    expect(formatSigned(-42.2)).toBe('-42');
    expect(escapeHtml(`A&B <"x">`)).toBe('A&amp;B &lt;&quot;x&quot;&gt;');
  });
});
