import { escapeHtml } from '@aoe4/analyzer-core';
import { parseMatchRouteParams } from '../../../../lib/matchPage';
import { stripSensitiveQueryParams } from '../../../../lib/analyticsPrivacy';
import { embeddedAoeTokenCss } from '../../../../lib/designTokens';
import { SAMPLE_MATCH } from '../../../../lib/sampleMatch';

export type MatchRouteContext = {
  params: Promise<{ profileSlug: string; gameId: string }>;
};

const RATE_LIMIT_STATUS = 429;

function sampleMatchHref(): string {
  return `/matches/${encodeURIComponent(SAMPLE_MATCH.profileSlug)}/${SAMPLE_MATCH.gameId}?sig=${encodeURIComponent(SAMPLE_MATCH.sig)}&t=${SAMPLE_MATCH.selectedTimeSeconds}`;
}

function formatIncidentTimestamp(now = new Date()): string {
  return now.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function sanitizedErrorMessage(message: string): string {
  return escapeHtml(stripSensitiveQueryParams(message));
}

function matchErrorPageStyle(): string {
  return `
    :root {
      ${embeddedAoeTokenCss}
      --background: var(--aoe-color-bg);
      --surface: var(--aoe-color-surface);
      --border: var(--aoe-color-border);
      --text: var(--aoe-color-text);
      --muted: var(--aoe-color-muted);
      --primary: var(--aoe-color-primary);
      --primary-border: var(--aoe-color-primary-border);
      --primary-contrast: var(--aoe-color-primary-contrast);
      --field-bg: var(--aoe-color-field-bg);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 28px;
      font-family: var(--aoe-font-display);
      background: var(--background);
      color: var(--text);
    }
    .panel {
      max-width: 840px;
      margin: 0 auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--aoe-radius-lg);
      padding: clamp(18px, 4vw, 30px);
      box-shadow: var(--aoe-shadow-home-panel);
    }
    .eyebrow {
      margin: 0 0 10px;
      color: var(--primary);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    h1 { margin: 0 0 12px; font-size: clamp(26px, 6vw, 38px); line-height: 1.05; letter-spacing: 0; }
    p { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.55; }
    .lede { max-width: 68ch; color: var(--text); font-size: 17px; }
    .status-note { margin-top: 14px; color: var(--muted); font-size: 13px; }
    .status-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 10px;
      margin: 22px 0;
      padding: 0;
      list-style: none;
    }
    .status-list li {
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: var(--aoe-radius-md);
      padding: 12px;
      background: var(--field-bg);
    }
    .status-label {
      display: block;
      color: var(--text);
      font-size: 14px;
      font-weight: 700;
    }
    .status-detail {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.35;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 22px 0 0;
    }
    .action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      border: 1px solid var(--border);
      border-radius: var(--aoe-radius-md);
      padding: 0 14px;
      color: var(--text);
      background: var(--field-bg);
      font: inherit;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
    }
    .action.primary {
      border-color: var(--primary-border);
      background: var(--primary);
      color: var(--primary-contrast);
    }
    .action:hover,
    .action:focus-visible {
      outline: 2px solid var(--aoe-color-report-focus);
      outline-offset: 2px;
    }
    .revisit {
      margin-top: 14px;
      max-width: 62ch;
      font-size: 14px;
    }
    details {
      margin-top: 22px;
      border-top: 1px solid var(--border);
      padding-top: 14px;
    }
    summary {
      color: var(--text);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }
    .technical-detail {
      margin-top: 8px;
      overflow-wrap: anywhere;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 12px;
      line-height: 1.5;
    }
  `;
}

function copyLinkScript(): string {
  return `
  <script>
    (function () {
      var button = document.querySelector('[data-copy-link]');
      if (!button || !navigator.clipboard) return;
      var originalText = button.textContent;
      button.addEventListener('click', function () {
        navigator.clipboard.writeText(window.location.href).then(function () {
          button.textContent = 'Copied';
          window.setTimeout(function () {
            button.textContent = originalText;
          }, 1600);
        }).catch(function () {
          button.textContent = 'Copy failed';
          window.setTimeout(function () {
            button.textContent = originalText;
          }, 1600);
        });
      });
    }());
  </script>`;
}

function rateLimitErrorPanel(message: string): string {
  return `
  <section class="panel incident" aria-labelledby="match-error-title">
    <p class="eyebrow">Known AoE4World rate limit</p>
    <h1 id="match-error-title">Match analysis is temporarily delayed</h1>
    <p class="lede">AoE4World is rate-limiting match summary requests right now. This match link is valid, but the analyzer cannot fetch the underlying summary yet.</p>
    <p class="status-note">Known issue &middot; AoE4World contacted &middot; Last checked ${escapeHtml(formatIncidentTimestamp())}</p>
    <ul class="status-list" aria-label="Match load status">
      <li>
        <span class="status-label">Match URL parsed</span>
        <span class="status-detail">The link format is valid and can be reused.</span>
      </li>
      <li>
        <span class="status-label">Summary request rate-limited</span>
        <span class="status-detail">AoE4World returned 429 before analysis could start.</span>
      </li>
      <li>
        <span class="status-label">Cached report unavailable</span>
        <span class="status-detail">No previously rendered report was available for this exact match.</span>
      </li>
      <li>
        <span class="status-label">Next retry window</span>
        <span class="status-detail">Come back in a few minutes and use this same URL.</span>
      </li>
    </ul>
    <p class="revisit">Come back to this exact URL. Once AoE4World accepts the summary request again, this page can render the report without changing the link.</p>
    <div class="actions" aria-label="Recovery actions">
      <a class="action primary" href="">Try again</a>
      <button class="action" type="button" data-copy-link>Copy link</button>
      <a class="action" href="${sampleMatchHref()}">View sample report</a>
    </div>
    <details>
      <summary>Technical detail</summary>
      <p class="technical-detail">${sanitizedErrorMessage(message)}</p>
    </details>
  </section>
  ${copyLinkScript()}`;
}

function genericErrorPanel(message: string, status: number): string {
  return `
  <section class="panel">
    <h1>Unable to load match (${status})</h1>
    <p>${sanitizedErrorMessage(message)}</p>
  </section>`;
}

export function buildMatchRouteErrorDocument(message: string, status: number): string {
  const panel = status === RATE_LIMIT_STATUS
    ? rateLimitErrorPanel(message)
    : genericErrorPanel(message, status);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AoE4 Match Web</title>
  <style>${matchErrorPageStyle()}</style>
</head>
<body>
${panel}
</body>
</html>`;
}

export async function readMatchRouteRequest(
  request: Request,
  context: MatchRouteContext
) {
  const params = await context.params;
  const parsed = parseMatchRouteParams(params.profileSlug, params.gameId);
  const url = new URL(request.url);
  return {
    params,
    parsed,
    url,
    sig: url.searchParams.get('sig') ?? undefined,
  };
}

export function requestSig(request: Request): string | undefined {
  return new URL(request.url).searchParams.get('sig') ?? undefined;
}

export function parseMatchAverageElo(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function jsonNoStoreResponse(
  body: unknown,
  init: ResponseInit = {}
): Response {
  const headers = new Headers(init.headers);
  headers.set('cache-control', 'no-store');

  return Response.json(body, {
    ...init,
    headers,
  });
}

export function jsonNoStoreError(error: unknown, status = 500): Response {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return jsonNoStoreResponse({ error: message }, { status });
}
