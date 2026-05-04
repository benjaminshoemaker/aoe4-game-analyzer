import { escapeHtml } from '@aoe4/analyzer-core/formatters/sharedFormatters';
import { embeddedAoeTokenCss } from './designTokens';

const baseOrigin = 'http://aoe4.local';
const matchTargetPattern = /^\/matches\/[^/]+\/[1-9]\d*$/;

function scriptString(value: string): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\//g, '\\/');
}

export function safeMatchLoadingTarget(rawTarget: string | null): string | null {
  if (typeof rawTarget !== 'string') return null;

  const trimmed = rawTarget.trim();
  if (!trimmed.startsWith('/matches/')) return null;
  if (trimmed.startsWith('/matches/loading') || trimmed.startsWith('/matches/open')) return null;

  let target: URL;
  try {
    target = new URL(trimmed, baseOrigin);
  } catch (_error) {
    return null;
  }

  if (target.origin !== baseOrigin) return null;
  if (!matchTargetPattern.test(target.pathname)) return null;

  return `${target.pathname}${target.search}`;
}

export function renderMatchLoadingHtml(targetHref: string): string {
  const escapedTarget = escapeHtml(targetHref);
  const targetScript = scriptString(targetHref);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Building match report · AoE4 Match Web</title>
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
      --primary-contrast: var(--aoe-color-primary-contrast);
      --you: var(--aoe-color-you);
      --opponent: var(--aoe-color-opponent);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        linear-gradient(135deg, var(--aoe-color-home-glow-primary), transparent 34%),
        linear-gradient(315deg, var(--aoe-color-home-glow-secondary), transparent 38%),
        var(--background);
      color: var(--text);
      font-family: var(--aoe-font-display);
    }
    .loading-layout {
      width: min(1040px, 100%);
      min-height: 100vh;
      margin: 0 auto;
      padding: 32px 24px;
      display: grid;
      grid-template-columns: minmax(280px, 0.72fr) minmax(320px, 1fr);
      gap: 24px;
      align-items: center;
    }
    .status-panel,
    .preview-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--aoe-radius-md);
      box-shadow: var(--aoe-shadow-home-panel);
    }
    .status-panel { padding: 24px; }
    .preview-panel { padding: 16px; background: var(--surface-alt); }
    .eyebrow {
      margin: 0 0 8px;
      color: var(--primary);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 30px;
      line-height: 1.15;
      letter-spacing: 0;
    }
    .lede {
      margin: 0 0 20px;
      color: var(--muted);
      font-size: 15px;
      line-height: 1.5;
    }
    .status-line {
      min-height: 44px;
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 16px;
      padding: 10px 12px;
      border: 1px solid var(--report-border);
      border-radius: var(--aoe-radius-md);
      background: var(--aoe-color-report-control-bg);
      color: var(--text);
      font-size: 14px;
      font-weight: 700;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      flex: 0 0 auto;
      border-radius: 999px;
      background: var(--primary);
      animation: pulse 1.4s ease-in-out infinite;
    }
    .loading-meter {
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: var(--aoe-color-bg-accent);
    }
    .loading-meter span {
      display: block;
      width: 42%;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--primary), var(--opponent));
      animation: meter 2.4s ease-in-out infinite;
    }
    .stage-list {
      display: grid;
      gap: 8px;
      margin: 18px 0 0;
      padding: 0;
      list-style: none;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.35;
    }
    .stage-list li {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .stage-list li::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: var(--report-border);
    }
    .stage-list li[aria-current="step"] {
      color: var(--text);
      font-weight: 700;
    }
    .stage-list li[aria-current="step"]::before {
      background: var(--primary);
    }
    .long-wait {
      margin: 16px 0 0;
      padding: 12px;
      border: 1px solid var(--report-border);
      border-radius: var(--aoe-radius-md);
      background: var(--aoe-color-report-control-selected);
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin-top: 14px;
    }
    .actions a {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: var(--aoe-radius-md);
      color: var(--text);
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      transition: background-color 180ms ease, border-color 180ms ease, color 180ms ease;
    }
    .actions a:hover { background: var(--aoe-color-report-control-hover); }
    .actions a:focus-visible {
      outline: 2px solid var(--aoe-color-report-focus);
      outline-offset: 2px;
    }
    .automatic-note {
      margin: 18px 0 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.45;
    }
    .skeleton-header,
    .skeleton-chart,
    .skeleton-inspector {
      border: 1px solid var(--report-border);
      border-radius: var(--aoe-radius-md);
      background: var(--aoe-color-report-control-bg);
    }
    .skeleton-header {
      display: grid;
      gap: 10px;
      margin-bottom: 12px;
      padding: 14px;
    }
    .skeleton-title,
    .skeleton-line,
    .skeleton-chip,
    .skeleton-cell,
    .skeleton-bar {
      border-radius: var(--aoe-radius-sm);
      background: linear-gradient(90deg, var(--aoe-color-report-border-subtle), var(--aoe-color-report-border), var(--aoe-color-report-border-subtle));
      background-size: 220% 100%;
      animation: shimmer 1.8s ease-in-out infinite;
    }
    .skeleton-title { width: 52%; height: 20px; }
    .skeleton-line { width: 76%; height: 12px; }
    .skeleton-chip-row { display: flex; gap: 8px; }
    .skeleton-chip { width: 96px; height: 24px; }
    .skeleton-chart {
      height: 280px;
      margin-bottom: 12px;
      padding: 18px;
      display: grid;
      align-content: end;
      gap: 12px;
    }
    .skeleton-bar { height: 28px; }
    .skeleton-bar.you { width: 86%; background-image: linear-gradient(90deg, rgba(55, 138, 221, 0.16), rgba(55, 138, 221, 0.34), rgba(55, 138, 221, 0.16)); }
    .skeleton-bar.opponent { width: 68%; background-image: linear-gradient(90deg, rgba(216, 90, 48, 0.16), rgba(216, 90, 48, 0.34), rgba(216, 90, 48, 0.16)); }
    .skeleton-inspector {
      padding: 14px;
      display: grid;
      gap: 8px;
    }
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .skeleton-cell { height: 38px; }
    noscript p {
      width: min(760px, calc(100% - 48px));
      margin: -72px auto 32px;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.45;
    }
    noscript a { color: var(--aoe-color-report-link); font-weight: 700; }
    @keyframes pulse {
      0%, 100% { opacity: 0.48; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1); }
    }
    @keyframes meter {
      0% { transform: translateX(-110%); }
      50% { transform: translateX(72%); }
      100% { transform: translateX(210%); }
    }
    @keyframes shimmer {
      0% { background-position: 120% 0; }
      100% { background-position: -120% 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .status-dot,
      .loading-meter span,
      .skeleton-title,
      .skeleton-line,
      .skeleton-chip,
      .skeleton-cell,
      .skeleton-bar {
        animation: none;
      }
    }
    @media (max-width: 760px) {
      .loading-layout {
        min-height: auto;
        padding: 20px;
        grid-template-columns: 1fr;
        align-items: start;
      }
      h1 { font-size: 26px; }
      .preview-panel { padding: 12px; }
      .skeleton-chart { height: 220px; }
    }
  </style>
</head>
<body>
  <main class="loading-layout" aria-labelledby="loading-title">
    <section class="status-panel">
      <p class="eyebrow">Match analysis</p>
      <h1 id="loading-title">Building match report</h1>
      <p class="lede">Fetching AoE4World data, resolving build orders, and preparing the timeline.</p>
      <div class="status-line" role="status" aria-live="polite" aria-atomic="true">
        <span class="status-dot" aria-hidden="true"></span>
        <span id="loading-stage">Fetching match summary</span>
      </div>
      <div class="loading-meter" aria-hidden="true"><span></span></div>
      <ol class="stage-list" aria-label="Match report loading steps">
        <li data-stage-index="0" aria-current="step">Fetching match summary</li>
        <li data-stage-index="1">Resolving units and tech</li>
        <li data-stage-index="2">Building resource timeline</li>
        <li data-stage-index="3">Rendering report</li>
      </ol>
      <p id="long-wait-message" class="long-wait" hidden>This match is still processing. First loads can take longer; reloads are usually faster.</p>
      <p class="automatic-note">Opening automatically.</p>
      <div class="actions">
        <a href="/">Back to URL entry</a>
      </div>
    </section>
    <section class="preview-panel" aria-label="Match report preview skeleton">
      <div class="skeleton-header">
        <div class="skeleton-title"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-chip-row">
          <div class="skeleton-chip"></div>
          <div class="skeleton-chip"></div>
        </div>
      </div>
      <div class="skeleton-chart">
        <div class="skeleton-bar you"></div>
        <div class="skeleton-bar opponent"></div>
        <div class="skeleton-bar"></div>
      </div>
      <div class="skeleton-inspector">
        <div class="skeleton-line"></div>
        <div class="skeleton-grid">
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
          <div class="skeleton-cell"></div>
        </div>
      </div>
    </section>
  </main>
  <noscript>
    <p>JavaScript is required to continue automatically. <a href="${escapedTarget}">Continue to the match report</a>.</p>
  </noscript>
  <script>
    (function () {
      var targetHref = ${targetScript};
      var stages = ['Fetching match summary', 'Resolving units and tech', 'Building resource timeline', 'Rendering report'];
      var stageText = document.getElementById('loading-stage');
      var stageItems = document.querySelectorAll('[data-stage-index]');
      var longWait = document.getElementById('long-wait-message');
      var index = 0;
      var stageIntervalId = null;
      var longWaitTimerId = null;

      function setStage(nextIndex) {
        index = Math.min(nextIndex, stages.length - 1);
        if (stageText) stageText.textContent = stages[index];
        for (var i = 0; i < stageItems.length; i += 1) {
          if (i === index) {
            stageItems[i].setAttribute('aria-current', 'step');
          } else {
            stageItems[i].removeAttribute('aria-current');
          }
        }
      }

      stageIntervalId = window.setInterval(function () {
        setStage(index + 1);
      }, 2800);

      longWaitTimerId = window.setTimeout(function () {
        if (longWait) longWait.hidden = false;
      }, 10000);

      function clearTimers() {
        if (stageIntervalId !== null) {
          window.clearInterval(stageIntervalId);
          stageIntervalId = null;
        }
        if (longWaitTimerId !== null) {
          window.clearTimeout(longWaitTimerId);
          longWaitTimerId = null;
        }
      }

      function navigateToReport() {
        clearTimers();
        window.location.replace(targetHref);
      }

      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(function () {
          window.setTimeout(navigateToReport, 160);
        });
      } else {
        window.setTimeout(navigateToReport, 160);
      }
    })();
  </script>
</body>
</html>`;
}
