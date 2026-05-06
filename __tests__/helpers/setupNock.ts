import nock from 'nock';
import fs from 'fs';
import path from 'path';
import { sampleUnits, sampleBuildings, sampleTechnologies } from './testData';

nock.disableNetConnect();

const baseUrl = 'https://data.aoe4world.com';
const sampleSummary = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'fixtures', 'sampleGameSummary.json'), 'utf-8'));

nock(baseUrl).persist().get('/units/all.json').reply(200, sampleUnits);
nock(baseUrl).persist().get('/buildings/all.json').reply(200, sampleBuildings);
nock(baseUrl).persist().get('/technologies/all.json').reply(200, sampleTechnologies);
nock('https://aoe4world.com')
  .persist()
  .matchHeader('User-Agent', 'aoe4-game-analyzer-core/0.1 summary-client')
  .get('/players/999/games/123456/summary')
  .query({ camelize: 'true' })
  .reply(200, sampleSummary);
