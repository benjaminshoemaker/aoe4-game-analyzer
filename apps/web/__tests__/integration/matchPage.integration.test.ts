import { buildMatchHtml, buildMatchHoverPayload } from '../../src/lib/matchPage';

const fetchGameSummaryFromApi = jest.fn();
const analyzeGame = jest.fn();
const buildPostMatchViewModel = jest.fn();
const buildPostMatchHoverPayload = jest.fn();
const renderPostMatchHtml = jest.fn();

jest.mock('../../src/lib/aoe4/parser/gameSummaryParser', () => ({
  fetchGameSummaryFromApi: (...args: unknown[]) => fetchGameSummaryFromApi(...args),
}));

jest.mock('../../src/lib/aoe4/analysis/gameAnalysis', () => ({
  analyzeGame: (...args: unknown[]) => analyzeGame(...args),
}));

jest.mock('../../src/lib/aoe4/analysis/postMatchViewModel', () => ({
  buildPostMatchViewModel: (...args: unknown[]) => buildPostMatchViewModel(...args),
}));

jest.mock('../../src/lib/aoe4/formatters/postMatchHtml', () => ({
  buildPostMatchHoverPayload: (...args: unknown[]) => buildPostMatchHoverPayload(...args),
  renderPostMatchHtml: (...args: unknown[]) => renderPostMatchHtml(...args),
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
      hoverDataUrl: '/matches/my-slug/230143339/hover-data?sig=abc123',
    });

    expect(fetchGameSummaryFromApi).toHaveBeenCalledWith('my-slug', 230143339, 'abc123');
    expect(analyzeGame).toHaveBeenCalledWith('my-slug', 230143339, {
      sig: 'abc123',
      skipNarrative: true,
      summary,
    });
    expect(buildPostMatchViewModel).toHaveBeenCalledWith({
      summary,
      analysis,
      perspectiveProfileId: 'my-slug',
      summarySig: 'abc123',
    });
    expect(renderPostMatchHtml).toHaveBeenCalledWith(model, {
      hoverDataUrl: '/matches/my-slug/230143339/hover-data?sig=abc123',
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
});
