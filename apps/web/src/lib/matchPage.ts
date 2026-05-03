import { analyzeGame } from '@aoe4/analyzer-core/analysis/gameAnalysis';
import { buildPostMatchViewModel } from '@aoe4/analyzer-core/analysis/postMatchViewModel';
import {
  buildWinProbabilityExamples,
  WIN_PROBABILITY_FEATURE_SCHEMA_VERSION,
  WinProbabilityExample,
} from '@aoe4/analyzer-core/analysis/winProbability';
import { buildPostMatchHoverPayload, renderPostMatchHtml } from '@aoe4/analyzer-core/formatters/postMatchHtml';
import { embeddedAoeTokenCss } from './designTokens';
import { fetchGameSummaryFromApi, GameSummary } from '@aoe4/analyzer-core/parser/gameSummaryParser';
import { buildWebVitalsScript } from './webVitals';

export interface MatchPageParams {
  profileSlug: string;
  gameId: number;
  sig?: string;
  hoverDataUrl?: string;
  matchAverageElo?: number | null;
}

export interface MatchWinProbabilityData {
  metadata: {
    modelStatus: 'untrained';
    featureSchemaVersion: typeof WIN_PROBABILITY_FEATURE_SCHEMA_VERSION;
    exampleCount: number;
  };
  examples: WinProbabilityExample[];
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
    :root {
      ${embeddedAoeTokenCss}
      --background: var(--aoe-color-bg);
      --surface: var(--aoe-color-surface);
      --border: var(--aoe-color-border);
      --text: var(--aoe-color-text);
      --muted: var(--aoe-color-muted);
    }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 28px; font-family: var(--aoe-font-display); background: var(--background); color: var(--text); }
    .panel { max-width: 720px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--aoe-radius-md); padding: 22px; box-shadow: var(--aoe-shadow-home-panel); }
    h1 { margin: 0 0 10px; font-size: 24px; line-height: 1.2; }
    p { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.45; }
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

function cloneSummaryForAnalysis(summary: GameSummary): GameSummary {
  return structuredClone(summary);
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

async function buildMatchContext(params: MatchPageParams) {
  const summary = await fetchGameSummaryFromApi(params.profileSlug, params.gameId, params.sig);
  const unsupportedMessage = getUnsupportedMatchMessage(summary);
  if (unsupportedMessage) {
    throw new UnsupportedMatchError(unsupportedMessage);
  }

  const analysis = await analyzeGame(params.profileSlug, params.gameId, {
    sig: params.sig,
    skipNarrative: true,
    summary: cloneSummaryForAnalysis(summary),
  });

  const model = buildPostMatchViewModel({
    summary,
    analysis,
    perspectiveProfileId: params.profileSlug,
    summarySig: params.sig,
  });

  return { summary, analysis, model };
}

async function buildMatchModel(params: MatchPageParams) {
  const { model } = await buildMatchContext(params);
  return model;
}

export async function buildMatchHtml(params: MatchPageParams): Promise<string> {
  try {
    const model = await buildMatchModel(params);
    return renderPostMatchHtml(model, {
      hoverDataUrl: params.hoverDataUrl,
      webVitalsScript: buildWebVitalsScript('/api/web-vitals'),
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

export async function buildMatchWinProbabilityData(params: MatchPageParams): Promise<MatchWinProbabilityData> {
  const { summary, model } = await buildMatchContext(params);
  const examples = buildWinProbabilityExamples({
    summary,
    model,
    perspectiveProfileId: params.profileSlug,
    matchAverageElo: params.matchAverageElo,
  });

  return {
    metadata: {
      modelStatus: 'untrained',
      featureSchemaVersion: WIN_PROBABILITY_FEATURE_SCHEMA_VERSION,
      exampleCount: examples.length,
    },
    examples,
  };
}
