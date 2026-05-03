export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, Math.floor(seconds % 60));
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatSigned(value: number): string {
  if (value > 0) return `+${Math.round(value)}`;
  return `${Math.round(value)}`;
}

export function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

export function formatPrecise(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return 'n/a';
  return Number(value.toFixed(decimals)).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return 'n/a';
  return `${(value * 100).toFixed(decimals)}%`;
}

export function roundToTenth(value: number): number {
  const rounded = Number(value.toFixed(1));
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function formatStrategyShare(value: number): string {
  return `${roundToTenth(value).toFixed(1)}%`;
}

export function formatSignedPercentagePoints(value: number): string {
  const rounded = roundToTenth(value);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(1)}pp`;
}
