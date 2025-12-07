# aoe4-game-analyzer

CLI for fetching and inspecting static Age of Empires IV data from [aoe4world](https://data.aoe4world.com/).

## Prerequisites
- Node.js 18+
- `npm install`

## Usage
Build the CLI:
```bash
npm run build
```

Run commands (after building):
```bash
node dist/index.js fetch-data    # Force refresh and cache static data
node dist/index.js check-data    # Show cache status and age
node dist/index.js test-upgrade-parsing  # Demo tier + upgrade parsing
```

During development you can also run directly with TypeScript:
```bash
node -r ts-node/register src/index.ts fetch-data
node -r ts-node/register src/index.ts check-data
node -r ts-node/register src/index.ts test-upgrade-parsing
npm run cli -- fetch-data           # repo-local alias for ts-node
npm run cli -- test-counters        # run the counter demo with random armies
```

### Commands
- `fetch-data` — Downloads units, buildings, and technologies from aoe4world, writes `src/data/staticData.json`, and prints the cache summary.
- `check-data` — Loads cached data if it is fresher than 7 days (otherwise refetches), then prints `Data cached at [date], [X] units, [Y] buildings, [Z] technologies` plus age info.
- `test-upgrade-parsing` — Parses sample unit icon paths into tier multipliers and looks up a few upgrade IDs (including alternate naming variants).

## Data caching
- Cache file: `src/data/staticData.json` (auto-created, gitignored).
- Stored fields: `units`, `buildings`, `technologies`, `fetchedAt` (ISO timestamp).
- Cache is considered stale after 7 days; stale or missing cache triggers a refetch.
- `fetch-data` always refreshes regardless of age.

## Testing
Jest covers unit, integration, and end-to-end flows:
```bash
npm test
```
