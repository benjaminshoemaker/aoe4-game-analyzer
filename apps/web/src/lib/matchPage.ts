import {
  analyzeGame,
  buildPostMatchHoverPayload,
  buildPostMatchViewModel,
  buildWinProbabilityExamples,
  escapeHtml,
  fetchGameSummaryFromApi,
  GameSummary,
  renderPostMatchHtml,
  WIN_PROBABILITY_FEATURE_SCHEMA_VERSION,
  WinProbabilityExample,
} from '@aoe4/analyzer-core';
import { embeddedAoeTokenCss } from './designTokens';
import { buildMatchAnalyticsProperties, buildPostHogAnalyticsScript } from './posthogAnalytics';
import { buildWebVitalsScript } from './webVitals';

export interface MatchPageParams {
  profileSlug: string;
  gameId: number;
  sig?: string;
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
const NON_1V1_UNSUPPORTED_PREFIX = 'This tool currently supports 1:1 matches only.';
const NON_1V1_UNSUPPORTED_HELP = 'Please paste a 1:1 AoE4World match URL.';

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

function getCivilizationUnsupportedMessage(summary: GameSummary): string | null {
  const players = Array.isArray(summary.players) ? summary.players : [];
  const hasDelhi = players.some(player => {
    if (typeof player.civilization !== 'string') return false;
    const civilization = normalizeCivilization(player.civilization);
    return civilization === 'de' || civilization.includes('delhi');
  });

  return hasDelhi ? DELHI_UNSUPPORTED_MESSAGE : null;
}

function describeMatchShape(summary: GameSummary): string {
  const players = Array.isArray(summary.players) ? summary.players : [];
  const teamCount = new Set(players.map(player => player.team)).size;
  const playerLabel = `${players.length} ${players.length === 1 ? 'player' : 'players'}`;
  const teamLabel = `${teamCount} ${teamCount === 1 ? 'team' : 'teams'}`;
  return teamCount === 1
    ? `${playerLabel} on ${teamLabel}`
    : `${playerLabel} across ${teamLabel}`;
}

function isOneVsOneMatch(summary: GameSummary): boolean {
  const players = Array.isArray(summary.players) ? summary.players : [];
  if (players.length !== 2) return false;
  return new Set(players.map(player => player.team)).size === 2;
}

function getNonOneVsOneUnsupportedMessage(summary: GameSummary): string | null {
  if (isOneVsOneMatch(summary)) return null;
  return `${NON_1V1_UNSUPPORTED_PREFIX} The imported AoE4World match appears to have ${describeMatchShape(summary)}, so team games and free-for-all games are not handled yet.`;
}

function unsupportedTitleForMessage(message: string): string {
  if (message.startsWith(NON_1V1_UNSUPPORTED_PREFIX)) {
    return 'Unsupported match type';
  }
  return 'Delhi support unavailable';
}

function unsupportedHelpForMessage(message: string): string | null {
  return message.startsWith(NON_1V1_UNSUPPORTED_PREFIX)
    ? NON_1V1_UNSUPPORTED_HELP
    : null;
}

export function getUnsupportedMatchMessage(summary: GameSummary): string | null {
  return getNonOneVsOneUnsupportedMessage(summary) ?? getCivilizationUnsupportedMessage(summary);
}

function renderUnsupportedMatchHtml(message: string): string {
  const title = unsupportedTitleForMessage(message);
  const help = unsupportedHelpForMessage(message);
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
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    ${help ? `<p>${escapeHtml(help)}</p>` : ''}
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
    includeCombatAdjustedMilitary: false,
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
      webVitalsScript: buildWebVitalsScript('/api/web-vitals'),
      analyticsScript: buildPostHogAnalyticsScript({
        surface: 'match',
        baseProperties: buildMatchAnalyticsProperties(params, model),
        initialEventName: 'match viewed',
      }),
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
