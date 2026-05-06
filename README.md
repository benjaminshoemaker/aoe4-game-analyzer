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

## Match summary caching
The match analyzer can use a Redis-compatible REST cache for AoE4World summary responses. This is intended for production/serverless deployments where local disk is not durable.

Set either the app-specific variables or the provider defaults:
- `AOE4_SUMMARY_REDIS_REST_URL` and `AOE4_SUMMARY_REDIS_REST_TOKEN`
- or `KV_REST_API_URL` and `KV_REST_API_TOKEN`
- or `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

Optional tuning:
- `AOE4_SUMMARY_CACHE_TTL_SECONDS` defaults to 7 days for successful raw summaries.
- `AOE4_SUMMARY_NEGATIVE_CACHE_TTL_SECONDS` defaults to 3 minutes for AoE4World `429` responses.
- `AOE4_SUMMARY_LOCK_TTL_SECONDS`, `AOE4_SUMMARY_LOCK_WAIT_MS`, and `AOE4_SUMMARY_LOCK_POLL_MS` control cross-instance cold-fetch backoff.

Without Redis configuration, the analyzer keeps using the existing local cache and in-process request coalescing only.

## Testing
Jest covers unit, integration, and end-to-end flows:
```bash
npm test
```
