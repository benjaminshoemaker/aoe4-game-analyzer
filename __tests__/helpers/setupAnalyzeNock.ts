import nock from 'nock';
import fs from 'fs';
import path from 'path';
import { makeMalianCattleFixture } from './malianCattleFixture';
import { makeSengokuYataiFixture } from './sengokuYataiFixture';
import { makeSplitVillagerDeathsFixture } from './splitVillagerDeathsFixture';

const fixtureData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../fixtures/sampleGameSummary.json'), 'utf-8')
);
const malianCattleFixture = makeMalianCattleFixture();
const sengokuYataiFixture = makeSengokuYataiFixture();
const splitVillagerDeathsFixture = makeSplitVillagerDeathsFixture();

nock('https://aoe4world.com')
  .persist()
  .get('/players/111/games/123456/summary')
  .query(true)
  .reply(200, fixtureData);

nock('https://aoe4world.com')
  .persist()
  .get('/players/111/games/654321/summary')
  .query(true)
  .reply(200, malianCattleFixture);

nock('https://aoe4world.com')
  .persist()
  .get('/players/111/games/229727104/summary')
  .query(true)
  .reply(200, sengokuYataiFixture);

nock('https://aoe4world.com')
  .persist()
  .get('/players/111/games/765432/summary')
  .query(true)
  .reply(200, splitVillagerDeathsFixture);
