"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const axios_1 = __importDefault(require("axios"));
const dataModule = __importStar(require("../../src/data/fetchStaticData"));
const testData_1 = require("../helpers/testData");
jest.mock('axios');
const mockedAxios = axios_1.default;
const cachePath = path_1.default.resolve(__dirname, '../../src/data/staticData.json');
describe('loadStaticData', () => {
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
    it('returns cached data when it is fresh', async () => {
        const fetchedAt = new Date().toISOString();
        const cached = (0, testData_1.sampleCache)(fetchedAt);
        fs_1.default.writeFileSync(cachePath, JSON.stringify(cached, null, 2));
        const fetchSpy = jest.spyOn(dataModule, 'fetchAndCacheStaticData');
        const result = await dataModule.loadStaticData();
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(result).toEqual(cached);
    });
    it('refetches and updates cache when data is stale', async () => {
        const staleDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
        const staleCache = (0, testData_1.sampleCache)(staleDate);
        fs_1.default.writeFileSync(cachePath, JSON.stringify(staleCache, null, 2));
        mockedAxios.get
            .mockResolvedValueOnce({ data: testData_1.sampleUnits })
            .mockResolvedValueOnce({ data: testData_1.sampleBuildings })
            .mockResolvedValueOnce({ data: testData_1.sampleTechnologies });
        const result = await dataModule.loadStaticData();
        expect(mockedAxios.get).toHaveBeenCalledTimes(3);
        expect(result.fetchedAt).not.toBe(staleDate);
        const refreshedCache = JSON.parse(fs_1.default.readFileSync(cachePath, 'utf-8'));
        expect(refreshedCache.units).toEqual(testData_1.sampleUnits);
        expect(refreshedCache.buildings).toEqual(testData_1.sampleBuildings);
        expect(refreshedCache.technologies).toEqual(testData_1.sampleTechnologies);
    });
});
