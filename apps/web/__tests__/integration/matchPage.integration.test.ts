import { buildMatchHtml, buildMatchHoverPayload, buildMatchWinProbabilityData } from '../../src/lib/matchPage';

const fetchGameSummaryFromApi = jest.fn();
const analyzeGame = jest.fn();
const buildPostMatchViewModel = jest.fn();
const buildPostMatchHoverPayload = jest.fn();
const renderPostMatchHtml = jest.fn();
const buildWinProbabilityExamples = jest.fn();

jest.mock('@aoe4/analyzer-core/parser/gameSummaryParser', () => ({
  fetchGameSummaryFromApi: (...args: unknown[]) => fetchGameSummaryFromApi(...args),
}));

jest.mock('@aoe4/analyzer-core/analysis/gameAnalysis', () => ({
  analyzeGame: (...args: unknown[]) => analyzeGame(...args),
}));

jest.mock('@aoe4/analyzer-core/analysis/postMatchViewModel', () => ({
  buildPostMatchViewModel: (...args: unknown[]) => buildPostMatchViewModel(...args),
}));

jest.mock('@aoe4/analyzer-core/formatters/postMatchHtml', () => ({
  buildPostMatchHoverPayload: (...args: unknown[]) => buildPostMatchHoverPayload(...args),
  renderPostMatchHtml: (...args: unknown[]) => renderPostMatchHtml(...args),
}));

jest.mock('@aoe4/analyzer-core/analysis/winProbability', () => ({
  WIN_PROBABILITY_FEATURE_SCHEMA_VERSION: 'wp-state-v1',
  buildWinProbabilityExamples: (...args: unknown[]) => buildWinProbabilityExamples(...args),
}));

describe('buildMatchHtml integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a Delhi unsupported page without running analysis', async () => {
    fetchGameSummaryFromApi.mockResolvedValue({
      gameId: 231103171,
      players: [
        { civilization: 'delhi_sultanate' },
        { civilization: 'english' },
      ],
    });
    analyzeGame.mockRejectedValue(new Error('should not analyze Delhi games'));

    const html = await buildMatchHtml({
      profileSlug: 'my-slug',
      gameId: 231103171,
      sig: 'abc123',
    });

    expect(analyzeGame).not.toHaveBeenCalled();
    expect(buildPostMatchViewModel).not.toHaveBeenCalled();
    expect(renderPostMatchHtml).not.toHaveBeenCalled();
    expect(html).toContain("This app doesn&#39;t work for Delhi yet.");
    expect(html).toContain('Delhi support unavailable');
    expect(html).toContain('--aoe-color-bg: #f7f2e8;');
    expect(html).toContain('--background: var(--aoe-color-bg);');
    expect(html).toContain('--surface: var(--aoe-color-surface);');
    expect(html).toContain('--border: var(--aoe-color-border);');
    expect(html).toContain('--text: var(--aoe-color-text);');
    expect(html).toContain('--muted: var(--aoe-color-muted);');
    expect(html).toContain('font-family: var(--aoe-font-display);');
    expect(html).not.toContain('background: #f7f2e8;');
  });

  it('fetches summary with sig and orchestrates analysis + render', async () => {
    const summary = { gameId: 230143339 };
    const analysis = { gameId: 230143339 };
    const model = { header: { summaryUrl: 'https://aoe4world.com' } };

    fetchGameSummaryFromApi.mockResolvedValue(summary);
    analyzeGame.mockResolvedValue(analysis);
    buildPostMatchViewModel.mockReturnValue(model);
    renderPostMatchHtml.mockReturnValue('<html>ok</html>');

    const html = await buildMatchHtml({
      profileSlug: 'my-slug',
      gameId: 230143339,
      sig: 'abc123',
    });

    expect(fetchGameSummaryFromApi).toHaveBeenCalledWith('my-slug', 230143339, 'abc123');
    expect(analyzeGame).toHaveBeenCalledWith('my-slug', 230143339, {
      sig: 'abc123',
      skipNarrative: true,
      includeCombatAdjustedMilitary: false,
      summary,
    });
    expect(buildPostMatchViewModel).toHaveBeenCalledWith({
      summary,
      analysis,
      perspectiveProfileId: 'my-slug',
      summarySig: 'abc123',
    });
    expect(renderPostMatchHtml).toHaveBeenCalledWith(model, {
      webVitalsScript: expect.stringContaining('/api/web-vitals'),
    });
    expect(html).toBe('<html>ok</html>');
  });

  it('builds the compact hover payload through the same analysis pipeline', async () => {
    const summary = { gameId: 230143339 };
    const analysis = { gameId: 230143339 };
    const model = { header: { summaryUrl: 'https://aoe4world.com' } };
    const payload = [{ timestamp: 0 }];

    fetchGameSummaryFromApi.mockResolvedValue(summary);
    analyzeGame.mockResolvedValue(analysis);
    buildPostMatchViewModel.mockReturnValue(model);
    buildPostMatchHoverPayload.mockReturnValue(payload);

    await expect(buildMatchHoverPayload({
      profileSlug: 'my-slug',
      gameId: 230143339,
      sig: 'abc123',
    })).resolves.toBe(payload);

    expect(buildPostMatchHoverPayload).toHaveBeenCalledWith(model);
  });

  it('builds win-probability training data through the same post-match model', async () => {
    const summary = { gameId: 230143339 };
    const analysis = { gameId: 230143339 };
    const model = { trajectory: { hoverSnapshots: [{ timestamp: 0 }] } };
    const examples = [{ timestampSeconds: 0, perspective: 'you' }];

    fetchGameSummaryFromApi.mockResolvedValue(summary);
    analyzeGame.mockResolvedValue(analysis);
    buildPostMatchViewModel.mockReturnValue(model);
    buildWinProbabilityExamples.mockReturnValue(examples);

    await expect(buildMatchWinProbabilityData({
      profileSlug: 'my-slug',
      gameId: 230143339,
      sig: 'abc123',
      matchAverageElo: 972,
    })).resolves.toEqual({
      examples,
      metadata: {
        modelStatus: 'untrained',
        featureSchemaVersion: 'wp-state-v1',
        exampleCount: 1,
      },
    });

    expect(buildWinProbabilityExamples).toHaveBeenCalledWith({
      summary,
      model,
      perspectiveProfileId: 'my-slug',
      matchAverageElo: 972,
    });
  });
});
