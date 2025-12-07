"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const fetchStaticData_1 = require("../../src/data/fetchStaticData");
const testData_1 = require("../helpers/testData");
jest.mock('axios');
const mockedAxios = axios_1.default;
const cachePath = path_1.default.resolve(__dirname, '../../src/data/staticData.json');
describe('fetchAndCacheStaticData', () => {
    beforeEach(() => {
        mockedAxios.get.mockReset();
        if (fs_1.default.existsSync(cachePath)) {
            fs_1.default.unlinkSync(cachePath);
        }
    });
    afterAll(() => {
        if (fs_1.default.existsSync(cachePath)) {
            fs_1.default.unlinkSync(cachePath);
        }
    });
    it('fetches endpoints and caches combined data with timestamp', async () => {
        mockedAxios.get
            .mockResolvedValueOnce({ data: testData_1.sampleUnits })
            .mockResolvedValueOnce({ data: testData_1.sampleBuildings })
            .mockResolvedValueOnce({ data: testData_1.sampleTechnologies });
        const result = await (0, fetchStaticData_1.fetchAndCacheStaticData)();
        expect(mockedAxios.get).toHaveBeenNthCalledWith(1, 'https://data.aoe4world.com/units/all.json');
        expect(mockedAxios.get).toHaveBeenNthCalledWith(2, 'https://data.aoe4world.com/buildings/all.json');
        expect(mockedAxios.get).toHaveBeenNthCalledWith(3, 'https://data.aoe4world.com/technologies/all.json');
        expect(result.units).toEqual(testData_1.sampleUnits);
        expect(result.buildings).toEqual(testData_1.sampleBuildings);
        expect(result.technologies).toEqual(testData_1.sampleTechnologies);
        expect(fs_1.default.existsSync(cachePath)).toBe(true);
        const cacheContent = JSON.parse(fs_1.default.readFileSync(cachePath, 'utf-8'));
        expect(cacheContent.units).toEqual(testData_1.sampleUnits);
        expect(cacheContent.buildings).toEqual(testData_1.sampleBuildings);
        expect(cacheContent.technologies).toEqual(testData_1.sampleTechnologies);
        expect(typeof cacheContent.fetchedAt).toBe('string');
        expect(Number.isNaN(Date.parse(cacheContent.fetchedAt))).toBe(false);
    });
});
