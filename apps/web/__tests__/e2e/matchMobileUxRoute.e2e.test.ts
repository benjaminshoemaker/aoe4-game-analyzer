import { GET } from '../../src/app/matches/[profileSlug]/[gameId]/route';
import { renderPostMatchHtml } from '@aoe4/analyzer-core/formatters/postMatchHtml';
import { makeMvpModelFixture } from '../helpers/mvpModelFixture';

const buildMatchHtml = jest.fn();
const parseMatchRouteParams = jest.fn();

jest.mock('../../src/lib/matchPage', () => ({
  buildMatchHtml: (...args: unknown[]) => buildMatchHtml(...args),
  parseMatchRouteParams: (...args: unknown[]) => parseMatchRouteParams(...args),
}));

describe('match route mobile UX', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns match HTML with mobile controls before the chart', async () => {
    parseMatchRouteParams.mockReturnValue({ profileSlug: 'my-slug', gameId: 230143339 });
    buildMatchHtml.mockResolvedValue(renderPostMatchHtml(makeMvpModelFixture()));

    const response = await GET(new Request('http://localhost/matches/my-slug/230143339'), {
      params: Promise.resolve({
        profileSlug: 'my-slug',
        gameId: '230143339',
      }),
    });
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('data-mobile-snapshot-controls');
    expect(body.indexOf('data-mobile-snapshot-controls')).toBeLessThan(body.indexOf('id="allocation-leader-strip"'));
    expect(body).toContain('@media (max-width: 760px), (pointer: coarse)');
    expect(body).toContain('.mobile-timeline-button:focus-visible,');
  });
});
