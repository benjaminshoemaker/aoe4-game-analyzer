# Session Learnings

> Persistent knowledge extracted from AI coding sessions.
> Captures decisions, context, action items, and insights that should survive between sessions.
> Add entries with `/capture-session` (full sweep) or `/capture-learning` (single item).

## Decisions

- **[2026-05-02]** Post-match `militaryActive` should match AoE4World army value semantics: live units use base resource cost, not tier-scaled replacement value. Upgrade/tier scaling belongs in separate combat-adjusted views, not the raw army-value hover number. *(source: conversation/code verification)*
- **[2026-05-02]** Unit lifecycle accounting must operate across a unit line, not only per resolved build-order row; upgraded-row deaths should consume active lower-tier units with the same `baseId`/line key when the upgraded row has no active count. *(source: conversation/code verification)*
- **[2026-05-02]** Destroyed-only upgraded unit rows must remain in `ResolvedBuildOrder.resolved`; dropping them loses AoE4World death events such as Veteran Spearman/Sipahi deaths after an upgrade. *(source: conversation/code verification)*
- **[2026-05-02]** Religious units such as Imam and Monk count as `militaryActive` army value for AoE4World alignment, while religious buildings such as monasteries remain economic infrastructure. *(source: conversation/code verification)*
- **[2026-05-01]** Yatai unit `pbgid=9001316` uses AoE4World `unknown["14"]` as production and `unknown["15"]` as destruction/removal; counting only bucket `14` creates impossible active Yatai counts in live match `229727104`. *(source: conversation/code verification)*
- **[2026-05-01]** Yatai Trade Cart `pbgid=9003449` is a zero-cost delivery/output artifact, not deployed capital; its `unknown["15"]` bucket should remain ignored and it should not appear in deployed-resource breakdowns. *(source: conversation/code verification)*
- **[2026-05-01]** Keep root analyzer and `apps/web` resolver/mapping copies in sync for unknown-bucket handling so static reports and the deployed Next app use the same accounting semantics. *(source: conversation/code verification)*
- **[2026-05-01]** Use `apps/web` as the standalone Vercel web app boundary. The root/static report remains the staging/reference area, and the deployable app should copy needed logic rather than directly importing root analyzer runtime code. *(source: conversation)*
- **[2026-05-01]** Replace separate "Deployed resource pool over time" and "Strategic allocation state" sections with one "Allocation lead and mix over time" widget because it captures the same strategic signal more simply. *(source: conversation)*
- **[2026-05-01]** Remap deployed-resource bands into larger categories: Economic, Technology, Military, and Other, so the widget is easier to scan while preserving band-level inspector detail. *(source: conversation)*
- **[2026-05-01]** Allocation category mapping is: Economic band to Economic; population cap to Other; military buildings, military active, and defensive to Military; research and advancement to Technology. *(source: conversation)*
- **[2026-05-01]** Allocation charts use mixed encoding: Economic, Technology, and Military show percentage share, while Overall shows absolute deployed resource value. Share is best for strategic mix; Overall should preserve total deployed-resource scale. *(source: conversation)*
- **[2026-05-01]** Hover inspector keeps original band rows and composition behavior, with added collapsible category headers, preserving detail access while reducing visual overload. *(source: conversation)*
- **[2026-05-01]** Vercel production project is named `aoe4-game-analyzer-web`, with explicit `apps/web/vercel.json` to force Next.js deployment config because the first project config defaulted to static output and failed deployment. *(source: conversation)*
- **[2026-05-01]** Float should mean literal live stockpile only, from resource series food/wood/gold/stone/olive oil. Inferred residual mixes real float with model gaps and normalization artifacts, so it should not be labeled as float. *(source: conversation)*
- **[2026-05-01]** Same-timestamp production/destruction must remain separate in item deltas, even though active pool value nets to zero, because destroyed accounting needs the negative event. *(source: conversation)*
- **[2026-05-01]** Reconciliation gaps should be exposed separately from Float; model-health diagnostics should not be presented as player strategy allocation. *(source: conversation)*

## Action Items

- [ ] **[2026-05-02]** Consider adding a durable real-match regression fixture for RepleteCactus game `231277359` so the exact AoE4World `17:40` army-value case is covered in addition to the synthetic upgraded-death fixture. — Owner: engineering
- [ ] **[2026-05-02]** Review non-hover consumers such as `armyReconstruction` and `significantResourceLossEvents` for the same cross-tier death and tier-multiplier assumptions if they are expected to match raw AoE4World army value. — Owner: engineering
- [ ] **[2026-05-01]** Add `@LEARNINGS.md` to `CLAUDE.md` if Claude sessions should auto-load these learnings. — Owner: project maintainer
- [ ] **[2026-05-01]** Resolve `npm audit` findings for `next`/`postcss`; current fix path suggests a breaking Next 16 upgrade. — Owner: project maintainer
- [ ] **[2026-05-01]** Decide whether to delete the empty Vercel project named `web`; user said "never mind," so it remains. — Owner: user
- [ ] **[2026-05-01]** Commit and push the deployment config addition `apps/web/vercel.json` and any current web/static changes. — Owner: project maintainer
- [ ] **[2026-05-01]** Consider adding caching for AoE4World/API fetches in `apps/web`. — Owner: project maintainer
- [ ] **[2026-05-01]** Consider setting Vercel project settings explicitly in dashboard/API for framework/Node version instead of relying only on `vercel.json`. — Owner: project maintainer
- [ ] **[2026-05-01]** Add a diagnostic reconciliation row or section: `raw gathered - live stockpile - modeled gross costs`, ideally with per-resource breakdown. — Owner: engineering
- [ ] **[2026-05-01]** Revisit `buildCumulativeGatheredSeries` scaling for timestamp-level accounting; consider raw vs scaled gathered series. — Owner: engineering
- [ ] **[2026-05-01]** Continue/finish separate Yatai and unknown-bucket work already in progress. — Owner: engineering

## Context

- **[2026-05-02]** In RepleteCactus/Ottomans game `231277359`, AoE4World army value at `17:40` (`t=1060`) is `1485`; after the fix, the web hover model reports `Mehter=720`, `Spearman=400`, `Imam=300`, and `Scout=65`. *(source: conversation/code verification)*
- **[2026-05-02]** The discrepancy for game `231277359` was decomposed as: Hardened/Sipahi tier multipliers inflated live value, Veteran destroyed-only rows were dropped or could not subtract lower-tier active units, and Imams were excluded from `militaryActive`. *(source: conversation/code verification)*
- **[2026-05-02]** Regression coverage for upgraded-unit army value now spans unit tests (`resourcePool`, `buildOrderResolver`), post-match integration, and CLI e2e via `__tests__/helpers/upgradedUnitDeathsFixture.ts`. *(source: conversation/code verification)*
- **[2026-05-02]** Verification commands for commit `46ea161 Fix upgraded unit army value accounting` were root `npm run build`, root `npm test`, `npm --workspace aoe4-game-analyzer-web run verify`, and `npm --workspace aoe4-game-analyzer-web run build`. *(source: conversation/code verification)*
- **[2026-05-01]** In live cached match `tmp/229727104-live.summary.json`, Sengoku Yatai resolves to 9 production timestamps and 7 destruction/removal timestamps; at `t=1362`, the correct active Yatai count is `3` with value `375`. *(source: conversation/code verification)*
- **[2026-05-01]** Verification commands used for the Yatai/Yatai Trade Cart accounting change were root `npm test -- --runInBand`, root `npm run build`, and `cd apps/web && npm run verify`. *(source: conversation/code verification)*
- **[2026-05-01]** Production app URL is `https://aoe4-game-analyzer-web.vercel.app`. *(source: conversation)*
- **[2026-05-01]** Vercel account/scope used for deployment is `benshoemakerxyz-3472s-projects`. *(source: conversation)*
- **[2026-05-01]** `vercel project add` created `aoe4-game-analyzer-web` with "Other" framework/static output defaults; adding `apps/web/vercel.json` made production deployment work. *(source: conversation)*
- **[2026-05-01]** `vercel ls --yes` unexpectedly auto-linked/created local Vercel metadata and an empty project named `web`. *(source: conversation)*
- **[2026-05-01]** `apps/web/.gitignore` now includes `.vercel` and `.env*.local`; Vercel link created local ignored `.vercel` metadata and `.env.local`. *(source: conversation)*
- **[2026-05-01]** Production home page was smoke-tested with `curl` and returned `200`; private `sig` match route was not production-smoke-tested to avoid transmitting a private sig without explicit confirmation. *(source: conversation)*
- **[2026-05-01]** In Beasty/Sengoku match `229727104`, at `21:09`, raw gathered was `33,471`, visible stockpile was `1,685`, modeled active + destroyed costs after the same-timestamp fix were `31,546`, leaving only `240` true raw ledger gap. *(source: conversation)*
- **[2026-05-01]** The midgame gathered-series scaling artifact in the Beasty/Sengoku `21:09` example was `+1,381`: model gathered `34,852` versus raw gathered sample `33,471`. *(source: conversation)*
- **[2026-05-01]** The previous roughly `3,700` unexplained resources decomposed into Yatai cost, gathered-series scaling, same-timestamp delta netting, and a small raw ledger mismatch. *(source: conversation)*
- **[2026-05-01]** The same-timestamp issue affected three Mounted Samurai in the Beasty/Sengoku example: `3 * 324 = 972`. *(source: conversation)*

## Bugs & Issues

- **[2026-05-02]** Webapp army value showed `5313` instead of AoE4World `1485` at `17:40` for RepleteCactus game `231277359`. Fixed in commit `46ea161` by using base unit cost for raw live army value, preserving destroyed-only upgraded rows, applying upgraded deaths across active unit-line tiers, and classifying religious units as military army value. *(source: conversation/code verification)*
- **[2026-05-02]** Local port `3000` had an older unresponsive `next-server`; fixed-route verification used a fresh dev server on `3001` and also found an older server on `3005` still serving stale `1185` output. Status: local environment cleanup may be needed outside the committed fix. *(source: conversation/code verification)*
- **[2026-05-01]** Yatai active count regressed to `9` when `9001316` bucket `15` was changed back to ignored. Fixed by restoring bucket `15` as destruction/removal and updating tests/audit expectations. *(source: conversation/code verification)*
- **[2026-05-01]** Focused tests briefly passed while live Yatai behavior was wrong because expectations had been changed to accept ignored Yatai bucket `15`; fixed by asserting Yatai bucket `15` produces `-125` deltas while Trade Cart bucket `15` remains ignored. *(source: conversation/code verification)*
- **[2026-05-01]** Vercel first production deployment failed with "No Output Directory named `public` found" because the project used static output defaults. Fixed by adding `apps/web/vercel.json`. *(source: conversation)*
- **[2026-05-01]** Running `npm --prefix apps/web run verify` concurrently with `npm --prefix apps/web run build` can race on `.next/types` and cause TS6053 missing-file errors. Fixed operationally by running them serially. *(source: conversation)*
- **[2026-05-01]** Allocation UI had text overlap/sprawl and too-small inspector/table text. Fixed with collapsed guide/secondary panels, larger type, wider chart area, narrower inspector, and mobile chart scrolling. *(source: conversation)*
- **[2026-05-01]** Vercel install reports 2 audit findings: 1 moderate and 1 high. Status: open/deferred. *(source: conversation)*
- **[2026-05-01]** Empty Vercel project `web` has no deployments. Status: left in place after user canceled deletion. *(source: conversation)*
- **[2026-05-01]** Same-timestamp production/destruction item deltas collapsed to zero because the aggregation key was `timestamp|band|itemKey`. Fixed in commit `8f3f932 Fix same-timestamp resource pool deltas`. *(source: conversation)*
- **[2026-05-01]** Gathered-series normalization is useful for smooth charts but misleading for exact timestamp ledger reconciliation. Status: open/deferred. *(source: conversation)*
- **[2026-05-01]** Full root/app verification is currently blocked by existing unknown-bucket/Yatai worktree changes, including failing `buildOrderResolver` expectations and unknown-bucket tests. Status: open/unrelated to same-timestamp fix. *(source: conversation)*

## Deferred Investigations

- **[2026-05-02]** Clarify labels around `allocation.military` versus raw `militaryActive`; the former can include broader military-category deployed value while the latter is the AoE4World-style live army value. *(source: conversation/code verification)*
- **[2026-05-01]** Consider adding a durable fixture derived from live match `229727104` so future unknown-bucket changes are checked against the real Yatai event sequence, not only synthetic timings. *(source: conversation)*
- **[2026-05-01]** Add web-app caching for AoE4World responses and static data. *(source: conversation)*
- **[2026-05-01]** Upgrade Next/PostCSS safely rather than using `npm audit fix --force` blindly. *(source: conversation)*
- **[2026-05-01]** Add a production-safe smoke test for a known public match route. *(source: conversation)*
- **[2026-05-01]** Clean up the empty `web` Vercel project if the user explicitly confirms deletion later. *(source: conversation)*
- **[2026-05-01]** Design the reconciliation UI so it is inspectable but clearly labeled as model/accounting diagnostic data. *(source: conversation)*
- **[2026-05-01]** Decide whether reconciliation should use raw AoE4World cumulative gathered arrays exclusively, or expose both raw and scaled values with labels. *(source: conversation)*
