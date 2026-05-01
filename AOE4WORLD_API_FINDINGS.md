# AoE4World API Findings

Last verified: 2026-04-23 (America/Los_Angeles)

This document captures observed capabilities and caveats of AoE4World APIs, based on:
- API docs: `https://aoe4world.com/api`
- Live endpoint probing (JSON responses and status codes)
- Data docs: `https://data.aoe4world.com/`
- Dumps index: `https://aoe4world.com/dumps`
- Source review of `https://github.com/aoe4world/data`, `https://github.com/aoe4world/explorer`, and `https://github.com/aoe4world/replays-api`
- AoE4World FAQ notes on leaderboards, game summaries, and Explorer data sourcing

## High-level Surface Area

### Multiplayer API (`/api/v0`)
- Players
  - `GET /api/v0/players/:profile_id`
  - `GET /api/v0/players/:profile_id/games`
  - `GET /api/v0/players/:profile_id/games/:game_id`
  - `GET /api/v0/players/:profile_id/games/last`
  - `GET /api/v0/players/search`
  - `GET /api/v0/players/autocomplete`
- Leaderboards
  - `GET /api/v0/leaderboards/:leaderboard`
- Games feed
  - `GET /api/v0/games`
- Stats
  - `GET /api/v0/stats/<kind>/civilizations`
  - `GET /api/v0/stats/<kind>/matchups`
  - `GET /api/v0/stats/<kind>/maps`
  - `GET /api/v0/stats/<kind>/maps/:map_id`
- Esports
  - `GET /api/v0/esports/leaderboards/1`

### Game-summary endpoint used by this repo
- `GET /players/:profile_id/games/:game_id/summary?camelize=true`
- This endpoint is not part of the `/api/v0` docs section and is CPU-expensive.
- During probing it frequently returned `429` (rate-limited).

### Static data service (`data.aoe4world.com`)
- Canonical generated game data from AoE4 files:
  - `/units/**`, `/buildings/**`, `/technologies/**`, `/upgrades/**`
  - `/units/all.json`, `/buildings/all.json`, `/technologies/all.json`
  - also “unified” grouped formats (`all-unified`, per-base-item unified files)

### Bulk dumps (`/dumps`)
- Historical downloads for games and leaderboard snapshots.
- Examples observed:
  - `games_qm_1v1_YYYY_q#.json.gz`
  - `games_rm_1v1_s#.json.gz`
  - `leadersboards_qm_1v1.csv.gz`
  - `leadersboards_rm_1v1_elo.csv.gz`
  - `leadersboards_rm_1v1_weekly.csv.zip`

## Source Lineage and Higher-Fidelity Upstreams

### Static game data
- `aoe4world/data` is parsed from installed Age of Empires IV game files.
- The update flow starts from raw archives such as `Attrib.sga`, `UIArt.sga`, and `LocaleEnglish.sga`, unpacked with AOEMods.Essence.
- The hosted JSON is a normalized, developer-friendly, tooltip-oriented layer, not the raw game data.
- Higher-fidelity upstream for mechanics/static data: the local AoE4 game archives themselves, especially `Attrib.sga`.

### Explorer
- `aoe4world/explorer` is primarily a UI over `aoe4world/data`.
- The repo uses `aoe4world/data` as a git submodule.
- Treat Explorer as a useful visualization/validation surface, not as a separate upstream data source.

### Live profiles, leaderboards, and match metadata
- AoE4World appears to ingest this layer from the official Relic/Microsoft leaderboard/API services.
- Evidence: AoE4World FAQ says leaderboard removals are done by Relic, country is synced from the official leaderboard/API, and missing matches can happen when the leaderboard service fails to report ongoing games.
- Higher-fidelity upstream for public match metadata is likely the official Relic/Microsoft service used by the in-game/official Age leaderboard, but it may not expose richer per-game timelines publicly.

### Game summaries and replay-derived timelines
- `aoe4world/replays-api` parses compressed replay summary files and generates normalized game summaries.
- Its API accepts a `url`, downloads the compressed summary, decompresses it, parses it with `ReplaySummaryParser`, and returns a generated `GameSummary` plus compatibility output.
- This layer is richer than `/api/v0/games` for timelines/build orders/resource curves, but it is still partly interpreted.
- AoE4World FAQ notes that in-game scores match the game, while values like total resources spent and army value can miss discounted units, Ovoo double production, discounted research, Wololo conversions, and similar mechanics.
- Higher-fidelity upstream for per-game analysis is the replay summary file, and potentially full replay parsing where available. The normalized AoE4World summary is convenient but should not be treated as perfect ground truth.

### Bulk history
- `/dumps` are the preferred source for broad historical backfills instead of crawling the API.
- These dumps are AoE4World-derived snapshots, not a first-party raw upstream.

## 1v1-Focused Findings (RM + QM)

## 1) Canonical identifiers
- Ranked 1v1 leaderboard key: `rm_solo`
- Ranked 1v1 game-kind key: `rm_1v1`
- Quick Match 1v1 key: `qm_1v1`

Important distinction:
- `/leaderboards/:leaderboard` uses leaderboard identities (`rm_solo`, `qm_1v1`).
- `/games?leaderboard=...` behaves as game-kind filtering. For strict RM 1v1 global feed, use `rm_1v1`.

## 2) Players endpoints (1v1 usage)

### `GET /api/v0/players/:profile_id`
- Includes `modes` with both `rm_solo` and `qm_1v1`.
- Each mode typically includes:
  - `rating`, `rank`, `rank_level`, `games_count`, `wins_count`, `losses_count`
  - `max_rating`, `max_rating_1m`, `max_rating_7d`
  - `streak`, `last_game_at`, `win_rate`
  - `rating_history` (time-keyed object)
  - `previous_seasons` present on ranked mode snapshots

### `GET /api/v0/players/:profile_id/games`
Useful params for 1v1:
- `leaderboard=rm_solo|rm_1v1|qm_1v1`
- `since=` (unix or datetime)
- `opponent_profile_id=...`
- `include_alts=true|false`
- `limit` (observed max effective value: 50)
- `api_key` for private games

Behavior:
- `leaderboard=rm_solo` and `leaderboard=rm_1v1` both returned RM 1v1 player games.
- `include_alts=true` expands `filters.profile_ids` to linked alternate accounts.
- Invalid `api_key` returned:
  - `{ "error": "Invalid api_key" }`

### `GET /api/v0/players/:profile_id/games/last`
- Efficient single-record check; docs explicitly recommend it for polling.
- Supports `include_alts`.
- `include_stats=true` did not produce an obvious shape difference in observed live responses.

## 3) Leaderboards endpoints (1v1 usage)

### `GET /api/v0/leaderboards/rm_solo`
### `GET /api/v0/leaderboards/qm_1v1`
Params:
- `page`, `query`, `country`, `profile_id`/`profile_ids`, `time`

Observed:
- `rm_1v1` path returned HTTP `301` redirect to `rm_solo`.
- `time=...` can backfill rating snapshots; some fields (e.g. rank/rank_level) may be null at historical points.
- `profile_ids` over 50 returned explicit error:
  - `"Passing more than 50 profile ids is not allowed"`

## 4) Global games feed (`/api/v0/games`) for 1v1 ingestion

Recommended for 1v1:
- RM: `leaderboard=rm_1v1`
- QM: `leaderboard=qm_1v1`
- Incremental:
  - `order=started_at&since=...`
  - or `order=updated_at&updated_since=...`

Observed constraints/behavior:
- `page > 20` returns error: `"Page greater than 20 is not supported"`
- `per_page` appears effectively fixed at 50 (responses reported `per_page: 50`)
- `updated_since` works even though not echoed in `filters` payload
- `leaderboard=rm_solo` returned a broad multi-kind filter list (not strict RM 1v1)
- `/games` teams shape differs from player-scoped endpoints:
  - `/games`: `teams[][i].player.{...}`
  - player-scoped: `teams[][i].{...}` (no `player` wrapper)

## 5) 1v1 stats endpoints

### RM
- `GET /api/v0/stats/rm_solo/civilizations`
- `GET /api/v0/stats/rm_solo/matchups`
- `GET /api/v0/stats/rm_solo/maps`
- `GET /api/v0/stats/rm_solo/maps/:map_id`

### QM
- `GET /api/v0/stats/qm_1v1/civilizations`
- `GET /api/v0/stats/qm_1v1/matchups`
- `GET /api/v0/stats/qm_1v1/maps`
- `GET /api/v0/stats/qm_1v1/maps/:map_id`

Filters:
- RM: `rank_level`, `rating`, `patch`
- QM: `rating`, `patch`
- Maps: `include_civs=true` includes civ breakdown per map (object keyed by civ id)

Observed:
- Invalid `rating`/`rank_level`/`patch` values were often silently normalized to default/null instead of returning errors.
- Response includes metadata fields (`leaderboard`/`kind`, `patch`, `rating`, `rank_level`) and `data`.

## Docs-vs-Live Drift Observed

1. Search minimum length:
- Docs state `query` length `>= 3` for search/autocomplete.
- Live `players/search` accepted shorter queries in observed runs.

2. Games leaderboard semantics:
- Docs note game-kind semantics for `/games` and no `rm_solo` support.
- Live accepted `leaderboard=rm_solo` but expanded it into many kinds (not 1v1-only), confirming the need to use `rm_1v1` for strict filtering.

3. Stats availability:
- Some documented team stats endpoints for larger team modes returned `404` in live probing (outside 1v1 scope, but relevant as proof of drift).

4. Legacy alias handling:
- `rm_1v1` continues to redirect to `rm_solo` on leaderboard/autocomplete-style endpoints.

## Operational and Reliability Notes

- Use a descriptive User-Agent (docs explicitly request this).
- Avoid bulk-crawling expensive endpoints, especially summary analysis endpoints.
- Prefer dumps for historical backfills; use APIs for incremental near-real-time updates.
- Build tolerant parsers:
  - allow null ratings/mmr for ongoing games
  - handle both teams payload shapes
  - treat some documented params as hints (server may ignore or normalize)

## Recommended 1v1 Ingestion Pattern

1. Backfill:
- Use `/dumps` files for `games_rm_1v1_*` and `games_qm_1v1_*`.

2. Incremental online sync:
- Poll `/api/v0/games?leaderboard=rm_1v1&order=updated_at&updated_since=...`
- Poll `/api/v0/games?leaderboard=qm_1v1&order=updated_at&updated_since=...`
- Keep overlap window (e.g., last watermark minus ~1 minute).

3. Player-tracking optimization:
- For watched profiles, use `/api/v0/players/:id/games/last` first.
- Pull full player games only when a new game is detected.

4. Enrichment:
- Use `/players/:id` modes for rank/rating histories.
- Use `/stats/...` endpoints for contextual meta layers (civ/map/matchup priors).
