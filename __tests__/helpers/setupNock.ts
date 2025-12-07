import nock from 'nock';
import { sampleUnits, sampleBuildings, sampleTechnologies } from './testData';

nock.disableNetConnect();

const baseUrl = 'https://data.aoe4world.com';

nock(baseUrl).persist().get('/units/all.json').reply(200, sampleUnits);
nock(baseUrl).persist().get('/buildings/all.json').reply(200, sampleBuildings);
nock(baseUrl).persist().get('/technologies/all.json').reply(200, sampleTechnologies);
