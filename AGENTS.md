## Testing policy (non‑negotiable)
- Tests **MUST** cover the functionality being implemented.
- **NEVER** ignore the output of the system or the tests - logs and messages often contain **CRITICAL** information.
- **TEST OUTPUT MUST BE PRISTINE TO PASS.**
- If logs are **supposed** to contain errors, capture and test it.
- **NO EXCEPTIONS POLICY:** Under no circumstances should you mark any test type as "not applicable". Every project, regardless of size or complexity, **MUST** have unit tests, integration tests, **AND** end‑to‑end tests. If you believe a test type doesn't apply, you need the human to say exactly **"I AUTHORIZE YOU TO SKIP WRITING TESTS THIS TIME"**.

### TDD (how we work)
- Write tests **before** implementation.
- Only write enough code to make the failing test pass.
- Refactor continuously while keeping tests green.

**TDD cycle**
1. Write a failing test that defines a desired function or improvement.  
2. Run the test to confirm it fails as expected.  
3. Write minimal code to make the test pass.  
4. Run the test to confirm success.  
5. Refactor while keeping tests green.  
6. Repeat for each new feature or bugfix.

---

## Important checks
- **NEVER** disable functionality to hide a failure. Fix root cause.  
- **NEVER** create duplicate templates or files. Fix the original.  
- **NEVER** claim something is “working” when any functionality is disabled or broken.  
- If you can’t open a file or access something requested, say so. Do not assume contents.  
- **ALWAYS** identify and fix the root cause of template or compilation errors.  
- If git is initialized, ensure a '.gitignore' exists and contains at least:
  
  .env
  .env.local
  .env.*
  
  Ask the human whether additional patterns should be added, and suggest any that you think are important given the project. 

---

## PostHog analytics
- The web app uses PostHog for product analytics. The shared browser analytics bootstrap lives in `apps/web/src/lib/posthogAnalytics.ts`.
- Local development analytics are intentionally sent to PostHog, not suppressed. Local rows should be labeled with `app_environment = local`, `is_local_environment = true`, and `app_hostname = localhost`.
- Match analytics should include stable match identity where applicable: `game_id`, `profile_slug`, and `has_sig`.
- Signature query params are private. Analytics may send `has_sig`, but must never send raw `sig` values or URLs/referrers containing raw, encoded, or nested `sig` query params.
- When changing analytics, cover the behavior with unit, integration, and e2e tests, then verify with PostHog MCP against recent localhost events when possible.

---

## AoE4World API global considerations
- Treat API docs as guidance, not a strict contract; always verify behavior against live responses.
- Always send a descriptive non-browser User-Agent for automated calls.
- Prefer incremental sync patterns (`since` / `updated_since`) and local caching over broad polling.
- For strict RM 1v1 global feed usage, call `/api/v0/games?leaderboard=rm_1v1` (not `rm_solo`).
- On leaderboard-style endpoints, `rm_1v1` can redirect to `rm_solo`; normalize aliases in code.
- Expect response-shape differences:
  - `/api/v0/games` uses `teams[][i].player`
  - player-scoped games endpoints use `teams[][i]` directly
- Expect nullable fields in ongoing/recent games (`rating`, `mmr`, diffs may be null).
- Respect pagination/volume constraints and guardrails:
  - `/api/v0/games` page max is 20
  - profile id batch limits may be enforced on some endpoints
- Avoid high-volume use of dynamically analyzed summary endpoints (`/players/:id/games/:id/summary`) unless explicitly needed; these can rate limit (`429`) and are CPU-expensive.
- Use `/dumps` for historical backfills; use APIs for near-real-time deltas.
