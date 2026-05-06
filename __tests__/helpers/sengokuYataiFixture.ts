import fs from 'fs';
import path from 'path';

export function makeSengokuYataiFixture(): any {
  const fixturePath = path.resolve(__dirname, '../fixtures/sampleGameSummary.json');
  const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
  const timestamps = [0, 100, 110, 130, 150, 170, 300, 600, 900];
  const totalRates = [0, 1000, 1000, 700, 700, 700, 950, 1200, 1400];
  const opponentTotalRates = [0, 900, 900, 900, 900, 900, 1000, 1150, 1300];

  function applyResourceRates(player: any, rates: number[]): void {
    player.resources = {
      ...player.resources,
      timestamps,
      food: timestamps.map((_, index) => index * 100),
      gold: timestamps.map((_, index) => index * 40),
      stone: timestamps.map((_, index) => index * 10),
      wood: timestamps.map((_, index) => index * 80),
      foodPerMin: rates.map(rate => Math.round(rate * 0.4)),
      woodPerMin: rates.map(rate => Math.round(rate * 0.3)),
      goldPerMin: rates.map(rate => Math.round(rate * 0.2)),
      stonePerMin: rates.map(rate => rate - Math.round(rate * 0.4) - Math.round(rate * 0.3) - Math.round(rate * 0.2)),
      total: timestamps.map((_, index) => index * 230),
      military: timestamps.map(() => 0),
      economy: timestamps.map(() => 0),
      technology: timestamps.map(() => 0),
      society: timestamps.map(() => 0),
    };
  }

  fixture.gameId = 229727104;
  fixture.players[0] = {
    ...fixture.players[0],
    profileId: 8139502,
    name: 'Beasty',
    civilization: 'sengoku_daimyo',
    buildOrder: [
      ...fixture.players[0].buildOrder,
      {
        id: '11266336',
        icon: 'icons/races/sengoku/units/yatai',
        pbgid: 9001316,
        type: 'Unit',
        finished: [],
        constructed: [],
        destroyed: [],
        unknown: {
          '14': [61, 116, 159],
          '15': [170],
        },
      },
    ],
  };
  applyResourceRates(fixture.players[0], totalRates);
  applyResourceRates(fixture.players[1], opponentTotalRates);

  return fixture;
}
