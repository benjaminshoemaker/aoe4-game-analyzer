import { analyzeGame } from './aoe4/analysis/gameAnalysis';
import { buildPostMatchViewModel } from './aoe4/analysis/postMatchViewModel';
import { buildPostMatchHoverPayload, renderPostMatchHtml } from './aoe4/formatters/postMatchHtml';
import { fetchGameSummaryFromApi, GameSummary } from './aoe4/parser/gameSummaryParser';

export interface MatchPageParams {
  profileSlug: string;
  gameId: number;
  sig?: string;
  hoverDataUrl?: string;
}

const DELHI_UNSUPPORTED_MESSAGE = "This app doesn't work for Delhi yet.";

export class UnsupportedMatchError extends Error {
  readonly status = 422;

  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedMatchError';
  }
}

function normalizeCivilization(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getUnsupportedMatchMessage(summary: GameSummary): string | null {
  const players = Array.isArray(summary.players) ? summary.players : [];
  const hasDelhi = players.some(player => {
    if (typeof player.civilization !== 'string') return false;
    const civilization = normalizeCivilization(player.civilization);
    return civilization === 'de' || civilization.includes('delhi');
  });

  return hasDelhi ? DELHI_UNSUPPORTED_MESSAGE : null;
}

function renderUnsupportedMatchHtml(message: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AoE4 Match Web</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 28px; font-family: "Trebuchet MS", "Avenir Next", "Gill Sans", sans-serif; background: #f7f2e8; color: #2a1f16; }
    .panel { max-width: 720px; background: #fffdf9; border: 1px solid #d9c9ad; border-radius: 8px; padding: 22px; box-shadow: 0 14px 36px rgba(42, 31, 22, 0.08); }
    h1 { margin: 0 0 10px; font-size: 24px; line-height: 1.2; }
    p { margin: 0; color: #5f5345; font-size: 15px; line-height: 1.45; }
  </style>
</head>
<body>
  <section class="panel">
    <h1>Delhi support unavailable</h1>
    <p>${escapeHtml(message)}</p>
  </section>
</body>
</html>`;
}

export function parseMatchRouteParams(profileSlugRaw: string, gameIdRaw: string): MatchPageParams {
  const profileSlug = decodeURIComponent(profileSlugRaw || '').trim();
  if (!profileSlug) {
    throw new Error('Invalid profile slug');
  }

  const gameId = Number(gameIdRaw);
  if (!Number.isFinite(gameId) || gameId <= 0) {
    throw new Error('Invalid game id');
  }

  return { profileSlug, gameId };
}

async function buildMatchModel(params: MatchPageParams) {
  const summary = await fetchGameSummaryFromApi(params.profileSlug, params.gameId, params.sig);
  const unsupportedMessage = getUnsupportedMatchMessage(summary);
  if (unsupportedMessage) {
    throw new UnsupportedMatchError(unsupportedMessage);
  }

  const analysis = await analyzeGame(params.profileSlug, params.gameId, {
    sig: params.sig,
    skipNarrative: true,
    summary,
  });

  return buildPostMatchViewModel({
    summary,
    analysis,
    perspectiveProfileId: params.profileSlug,
    summarySig: params.sig,
  });
}

export async function buildMatchHtml(params: MatchPageParams): Promise<string> {
  try {
    const model = await buildMatchModel(params);
    return renderPostMatchHtml(model, {
      hoverDataUrl: params.hoverDataUrl,
    });
  } catch (error) {
    if (error instanceof UnsupportedMatchError) {
      return renderUnsupportedMatchHtml(error.message);
    }
    throw error;
  }
}

export async function buildMatchHoverPayload(params: MatchPageParams) {
  const model = await buildMatchModel(params);
  return buildPostMatchHoverPayload(model);
}
