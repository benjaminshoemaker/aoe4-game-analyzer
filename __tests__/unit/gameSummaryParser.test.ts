import path from 'path';
import { parseGameSummary, loadGameSummaryFromFile } from '../../src/parser/gameSummaryParser';

describe('gameSummaryParser', () => {
  const fixturePath = path.resolve(__dirname, '..', 'fixtures', 'sampleGameSummary.json');

  it('parses a valid game summary object', () => {
    const json = loadGameSummaryFromFile(fixturePath);
    const parsed = parseGameSummary(json);

    expect(parsed.gameId).toBe(123456);
    expect(parsed.mapName).toBe('Dry Arabia');
    expect(parsed.players).toHaveLength(2);
    expect(parsed.players[0].buildOrder).toHaveLength(2);
    expect(parsed.players[1].buildOrder).toHaveLength(1);
    expect(parsed.players[0].actions.age_up).toEqual([200, 500]);
  });

  it('throws when required fields are missing', () => {
    expect(() => parseGameSummary({})).toThrow(/players/);
  });
});
