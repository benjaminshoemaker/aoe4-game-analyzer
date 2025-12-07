"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const testData_1 = require("../helpers/testData");
const projectRoot = path_1.default.resolve(__dirname, '..', '..');
const cliEntry = path_1.default.resolve(projectRoot, 'src/index.ts');
const cachePath = path_1.default.resolve(projectRoot, 'src/data/staticData.json');
const tsNodeRegister = require.resolve('ts-node/register');
const setupNock = path_1.default.resolve(projectRoot, '__tests__/helpers/setupNock.ts');
function runCli(args) {
    return (0, child_process_1.spawnSync)('node', ['-r', tsNodeRegister, '-r', setupNock, cliEntry, ...args], {
        cwd: projectRoot,
        encoding: 'utf-8',
        env: { ...process.env, FORCE_COLOR: '0' }
    });
}
describe('CLI end-to-end', () => {
    beforeEach(() => {
        if (fs_1.default.existsSync(cachePath)) {
            fs_1.default.unlinkSync(cachePath);
        }
    });
    afterAll(() => {
        if (fs_1.default.existsSync(cachePath)) {
            fs_1.default.unlinkSync(cachePath);
        }
    });
    it('fetch-data downloads and caches data', () => {
        const result = runCli(['fetch-data']);
        expect(result.status).toBe(0);
        expect(fs_1.default.existsSync(cachePath)).toBe(true);
        const cached = JSON.parse(fs_1.default.readFileSync(cachePath, 'utf-8'));
        expect(cached.units).toHaveLength(testData_1.sampleUnits.length);
        expect(cached.buildings).toHaveLength(testData_1.sampleBuildings.length);
        expect(cached.technologies).toHaveLength(testData_1.sampleTechnologies.length);
    });
    it('check-data reports cache status', () => {
        // Ensure cache exists first
        const fetchResult = runCli(['fetch-data']);
        expect(fetchResult.status).toBe(0);
        const result = runCli(['check-data']);
        expect(result.status).toBe(0);
        expect(result.stdout).toMatch(/Data cached at .*?, 1 units, 1 buildings, 1 technologies/);
    });
});
