// The "View sample report" link on the home page and the analytics
// click handler that fires when it's clicked both need to know which
// match the sample points at. Define it once here so the home-page
// link, the analytics properties, and any future test assertions stay
// in sync.
export const SAMPLE_MATCH = {
  profileSlug: '8139502',
  gameId: 229727104,
  sig: 'b6fc4eab80fa84ff983bcb27b4af086a59a09f5d',
  // Pre-selects the inspector at this match-time so the sample report
  // opens on the inflection point referenced in the home-page card.
  selectedTimeSeconds: 1191,
} as const;
