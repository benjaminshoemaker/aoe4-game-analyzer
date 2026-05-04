import { escapeHtml } from '@aoe4/analyzer-core/formatters/sharedFormatters';
import { embeddedAoeTokenCss } from './designTokens';

const exampleUrl = 'https://aoe4world.com/.../games/...';
const sampleMatchHref =
  '/matches/open?url=https%3A%2F%2Faoe4world.com%2Fplayers%2F8139502%2Fgames%2F229727104%3Fsig%3Db6fc4eab80fa84ff983bcb27b4af086a59a09f5d';
const faviconHref = "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2032%2032'%3E%3Crect%20width='32'%20height='32'%20rx='6'%20fill='%239b2f1f'/%3E%3Cpath%20d='M8%2022h16v3H8zM10%208h12l-2%2012h-8z'%20fill='%23fff9f5'/%3E%3C/svg%3E";
const redditFeedbackHref = 'https://www.reddit.com/user/shoe7525/';

export function renderHomeHtml(errorText?: string | null): string {
  const escapedError = errorText ? escapeHtml(errorText) : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AoE4 Match Analyzer</title>
  <meta name="description" content="Paste an AoE4World match link and inspect post-match allocation analysis." />
  <link rel="icon" href="${faviconHref}" />
  <style>
    :root {
      ${embeddedAoeTokenCss}
      --background: var(--aoe-color-bg);
      --surface: var(--aoe-color-surface);
      --surface-alt: var(--aoe-color-report-surface);
      --border: var(--aoe-color-border);
      --report-border: var(--aoe-color-report-border);
      --text: var(--aoe-color-text);
      --muted: var(--aoe-color-muted);
      --primary: var(--aoe-color-primary);
      --primary-border: var(--aoe-color-primary-border);
      --primary-contrast: var(--aoe-color-primary-contrast);
      --focus: var(--aoe-color-report-focus);
      --sample-sengoku: var(--aoe-color-opponent);
      --sample-macedonian: var(--aoe-color-you);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        linear-gradient(135deg, var(--aoe-color-home-glow-primary), transparent 34%),
        linear-gradient(315deg, var(--aoe-color-home-glow-secondary), transparent 38%),
        radial-gradient(circle at 50% 100%, rgba(55, 138, 221, 0.08), transparent 30%),
        var(--background);
      color: var(--text);
      font-family: var(--aoe-font-display);
    }
    a { color: inherit; }
    .page-shell {
      width: min(1160px, 100%);
      min-height: 100vh;
      margin: 0 auto;
      padding: 24px;
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 24px;
    }
    .topbar {
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: var(--text);
      font-size: 15px;
      font-weight: 800;
      text-decoration: none;
    }
    .brand-mark {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border: 1px solid var(--primary-border);
      border-radius: 7px;
      background: var(--primary);
      color: var(--primary-contrast);
      font-size: 16px;
      line-height: 1;
    }
    .topbar-meta {
      color: var(--muted);
      font-size: 13px;
      font-weight: 700;
    }
    .topbar-meta a {
      color: var(--aoe-color-report-link);
      text-decoration: underline;
      text-underline-offset: 3px;
      transition: color 180ms ease;
    }
    .topbar-meta a:hover { color: var(--primary); }
    .topbar-meta a:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
      border-radius: var(--aoe-radius-sm);
    }
    .hero-grid {
      display: grid;
      grid-template-columns: minmax(0, 0.9fr) minmax(360px, 1.1fr);
      gap: 24px;
      align-items: center;
    }
    .hero-panel,
    .preview-panel {
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: var(--aoe-radius-lg);
      box-shadow: var(--aoe-shadow-home-panel);
    }
    .hero-panel {
      background: var(--surface);
      padding: 28px;
    }
    .eyebrow {
      margin: 0 0 10px;
      color: var(--primary);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      color: var(--text);
      font-size: clamp(34px, 5vw, 56px);
      line-height: 0.98;
      letter-spacing: 0;
    }
    .lede {
      max-width: 620px;
      margin: 16px 0 0;
      color: var(--muted);
      font-size: 16px;
      line-height: 1.55;
    }
    .form-card {
      margin-top: 24px;
      display: grid;
      gap: 12px;
    }
    label {
      color: var(--text);
      font-size: 13px;
      font-weight: 800;
    }
    .input-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
    }
    input {
      width: 100%;
      min-width: 0;
      min-height: 44px;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: var(--aoe-radius-md);
      background: var(--aoe-color-field-bg);
      color: var(--text);
      font: inherit;
      font-size: 15px;
      transition: border-color 180ms ease, box-shadow 180ms ease;
    }
    input:focus-visible,
    button:focus-visible,
    .sample-link:focus-visible {
      outline: 2px solid var(--focus);
      outline-offset: 2px;
    }
    input:focus {
      border-color: var(--focus);
      box-shadow: 0 0 0 3px rgba(31, 111, 183, 0.12);
    }
    button,
    .sample-link {
      min-width: 44px;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 14px;
      border-radius: var(--aoe-radius-md);
      font: inherit;
      font-size: 15px;
      font-weight: 800;
      text-decoration: none;
      cursor: pointer;
      transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
    }
    button {
      border: 1px solid var(--primary-border);
      background: var(--primary);
      color: var(--primary-contrast);
    }
    button:hover { background: var(--primary-border); }
    .sample-link {
      justify-self: start;
      border: 1px solid var(--border);
      background: #fff;
      color: var(--text);
    }
    .sample-link:hover {
      border-color: var(--report-border);
      background: var(--aoe-color-report-bg);
    }
    .cta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
    }
    .sample-note {
      color: var(--muted);
      font-size: 13px;
      line-height: 1.35;
    }
    .proof-grid {
      margin-top: 24px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .proof-card {
      min-width: 0;
      padding: 12px;
      border: 1px solid var(--report-border);
      border-radius: var(--aoe-radius-md);
      background: var(--surface-alt);
    }
    .proof-label {
      margin: 0 0 6px;
      color: var(--text);
      font-size: 13px;
      font-weight: 800;
    }
    .proof-copy {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
    }
    .preview-panel {
      overflow: hidden;
      background: var(--aoe-color-report-bg);
      font-family: var(--aoe-font-report);
    }
    .preview-header {
      padding: 16px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 16px;
      align-items: start;
      border-bottom: 1px solid var(--report-border);
      background: var(--surface-alt);
    }
    .preview-title {
      margin: 0;
      color: var(--aoe-color-report-text);
      font-size: 21px;
      line-height: 1.15;
      font-weight: 800;
    }
    .preview-meta {
      margin: 6px 0 0;
      color: var(--aoe-color-report-muted);
      font-size: 13px;
      line-height: 1.35;
    }
    .outcome-badge {
      padding: 6px 10px;
      border: 1px solid #bcd3ea;
      border-radius: 999px;
      background: #f2f7fc;
      color: #0c447c;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .player-chips {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .player-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 30px;
      max-width: 100%;
      padding: 6px 10px;
      border: 1px solid var(--report-border);
      border-radius: 999px;
      background: #fff;
      color: var(--aoe-color-report-text);
      font-size: 12px;
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .swatch {
      width: 10px;
      height: 10px;
      flex: 0 0 auto;
      border-radius: 999px;
    }
    .preview-body {
      padding: 14px;
      display: grid;
      gap: 12px;
    }
    .mini-summary {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .metric-card {
      min-width: 0;
      padding: 11px;
      border: 1px solid var(--report-border);
      border-radius: var(--aoe-radius-md);
      background: #fff;
      box-shadow: var(--aoe-shadow-panel);
    }
    .metric-label {
      color: var(--aoe-color-report-muted);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .metric-value {
      margin-top: 7px;
      color: var(--aoe-color-report-text);
      font-size: 22px;
      font-weight: 850;
      font-variant-numeric: tabular-nums;
    }
    .metric-copy {
      margin-top: 4px;
      color: var(--aoe-color-report-muted);
      font-size: 12px;
      line-height: 1.25;
    }
    .chart-card {
      padding: 12px;
      border: 1px solid var(--report-border);
      border-radius: var(--aoe-radius-md);
      background: #fff;
      box-shadow: var(--aoe-shadow-panel);
    }
    .chart-title {
      margin: 0 0 10px;
      color: var(--aoe-color-report-text);
      font-size: 13px;
      font-weight: 850;
    }
    .chart {
      position: relative;
      height: 190px;
      border: 1px solid var(--aoe-color-report-border-subtle);
      border-radius: var(--aoe-radius-md);
      background:
        linear-gradient(var(--aoe-color-report-border-subtle) 1px, transparent 1px) 0 0 / 100% 25%,
        linear-gradient(90deg, var(--aoe-color-report-border-subtle) 1px, transparent 1px) 0 0 / 20% 100%,
        var(--aoe-color-report-chart-bg);
      overflow: hidden;
    }
    .chart svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .event-marker {
      position: absolute;
      top: 22%;
      left: 58%;
      width: 1px;
      height: 62%;
      background: rgba(31, 26, 20, 0.16);
    }
    .event-marker span {
      position: absolute;
      top: -13px;
      left: 8px;
      padding: 3px 7px;
      border: 1px solid var(--report-border);
      border-radius: 999px;
      background: #fff;
      color: var(--aoe-color-report-text);
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
    }
    .selected-summary {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 10px;
    }
    .selected-card {
      min-width: 0;
      padding: 11px;
      border: 1px solid var(--report-border);
      border-radius: var(--aoe-radius-md);
      background: var(--surface-alt);
    }
    .selected-card strong {
      display: block;
      color: var(--aoe-color-report-text);
      font-size: 13px;
      line-height: 1.25;
    }
    .selected-card span {
      display: block;
      margin-top: 5px;
      color: var(--aoe-color-report-muted);
      font-size: 12px;
      line-height: 1.35;
    }
    .error {
      margin: 12px 0 0;
      color: var(--aoe-color-error);
      font-size: 13px;
      line-height: 1.4;
    }
    @media (max-width: 920px) {
      .page-shell { padding: 20px; }
      .hero-grid {
        grid-template-columns: 1fr;
        align-content: start;
      }
    }
    @media (max-width: 620px) {
      .page-shell {
        padding: 18px;
        gap: 16px;
      }
      .topbar {
        align-items: flex-start;
        flex-direction: column;
        gap: 8px;
      }
      .hero-panel { padding: 24px; }
      h1 { font-size: 38px; }
      .lede { font-size: 15px; }
      .input-row,
      .proof-grid,
      .mini-summary,
      .selected-summary {
        grid-template-columns: 1fr;
      }
      button,
      .sample-link {
        width: 100%;
      }
      .sample-note { width: 100%; }
      .preview-header { grid-template-columns: 1fr; }
      .outcome-badge { justify-self: start; }
      .chart { height: 160px; }
    }
  </style>
</head>
<body>
  <div class="page-shell">
    <header class="topbar" aria-label="Product">
      <a class="brand" href="/">
        <span class="brand-mark" aria-hidden="true">A4</span>
        <span>AoE4 Match Analyzer</span>
      </a>
      <div class="topbar-meta">Post-match allocation analysis from <a href="https://aoe4world.com" target="_blank" rel="noopener noreferrer">AoE4World links</a> &middot; <a href="${redditFeedbackHref}" target="_blank" rel="noopener noreferrer">Feedback? DM me on Reddit</a></div>
    </header>

    <main class="hero-grid">
      <section class="hero-panel" aria-labelledby="home-title">
        <p class="eyebrow">Match recap from real game data</p>
        <h1 id="home-title">See where the game turned.</h1>
        <p class="lede">
          Paste an AoE4World match link and inspect the resource mix, selected-time
          state, and fight windows that shaped the result.
        </p>

        <form method="get" action="/matches/open" class="form-card">
          <label for="match-url">AoE4World match URL</label>
          <div class="input-row">
            <input id="match-url" type="text" inputmode="url" name="url" placeholder="${exampleUrl}" required />
            <button type="submit">Open Match</button>
          </div>
          ${escapedError ? `<p class="error">${escapedError}</p>` : ''}
        </form>

        <div class="cta-row" aria-label="Sample report">
          <a class="sample-link" href="${sampleMatchHref}">View sample report</a>
          <span class="sample-note">Dry Arabia &middot; 25:03 &middot; washed up vs 2k and still no hands</span>
        </div>

        <div class="proof-grid" aria-label="What the report includes">
          <div class="proof-card">
            <p class="proof-label">Match recap</p>
            <p class="proof-copy">Start with a compact read of map, players, duration, and outcome.</p>
          </div>
          <div class="proof-card">
            <p class="proof-label">Allocation timeline</p>
            <p class="proof-copy">Compare economy, military, and technology pressure over time.</p>
          </div>
          <div class="proof-card">
            <p class="proof-label">Selected time</p>
            <p class="proof-copy">Click a timestamp to inspect only that moment's numbers.</p>
          </div>
        </div>
      </section>

      <aside class="preview-panel" aria-label="Sample report preview">
        <div class="preview-header">
          <div>
            <h2 class="preview-title">Sample report: Dry Arabia</h2>
            <p class="preview-meta">Ranked 1v1 &middot; 25:03 &middot; investments, fights, outcome</p>
            <div class="player-chips">
              <span class="player-chip"><span class="swatch" style="background: var(--sample-sengoku)"></span>washed up &middot; Sengoku Daimyo</span>
              <span class="player-chip"><span class="swatch" style="background: var(--sample-macedonian)"></span>2k and still no hands &middot; Macedonian Dynasty</span>
            </div>
          </div>
          <span class="outcome-badge">Macedonian win</span>
        </div>

        <div class="preview-body">
          <div class="mini-summary" aria-label="Sample highlights">
            <div class="metric-card">
              <div class="metric-label">Selected time</div>
              <div class="metric-value">19:51</div>
              <div class="metric-copy">State before the late divergence.</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Economy</div>
              <div class="metric-value" style="color: var(--sample-sengoku)">Sengoku</div>
              <div class="metric-copy">Higher economic deployment for most of the game.</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">Military</div>
              <div class="metric-value" style="color: var(--sample-macedonian)">Macedonian</div>
              <div class="metric-copy">Military and tech pressure before the final fights.</div>
            </div>
          </div>

          <div class="chart-card">
            <p class="chart-title">Resource state over time</p>
            <div class="chart" role="img" aria-label="Mock chart preview showing two players' allocation lines over time">
              <svg viewBox="0 0 640 190" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0,130 C70,126 120,102 180,110 C260,122 305,78 360,90 C440,108 500,116 640,82" fill="none" stroke="var(--sample-sengoku)" stroke-width="4" />
                <path d="M0,118 C84,114 135,96 198,101 C260,106 316,114 382,94 C468,69 530,58 640,44" fill="none" stroke="var(--sample-macedonian)" stroke-width="4" stroke-dasharray="10 7" />
                <path d="M0,160 C90,156 154,148 234,139 C318,132 415,118 640,108" fill="none" stroke="#58764f" stroke-width="3" opacity="0.85" />
              </svg>
              <div class="event-marker"><span>Fight 19:51</span></div>
            </div>
          </div>

          <div class="selected-summary" aria-label="Selected time summary">
            <div class="selected-card">
              <strong>What changed after this point</strong>
              <span>Macedonian military and technology deployment separates before the decisive fight windows.</span>
            </div>
            <div class="selected-card">
              <strong>Why the preview matters</strong>
              <span>The sample link shows the real report before users need to find their own match URL.</span>
            </div>
          </div>
        </div>
      </aside>
    </main>
  </div>
</body>
</html>`;
}
