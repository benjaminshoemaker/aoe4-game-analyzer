"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nock_1 = __importDefault(require("nock"));
const testData_1 = require("./testData");
nock_1.default.disableNetConnect();
const baseUrl = 'https://data.aoe4world.com';
(0, nock_1.default)(baseUrl).persist().get('/units/all.json').reply(200, testData_1.sampleUnits);
(0, nock_1.default)(baseUrl).persist().get('/buildings/all.json').reply(200, testData_1.sampleBuildings);
(0, nock_1.default)(baseUrl).persist().get('/technologies/all.json').reply(200, testData_1.sampleTechnologies);
