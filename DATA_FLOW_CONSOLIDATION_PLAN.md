# Data Flow Consolidation Plan

## Purpose

Fix the current split-source metric problem holistically by making the AoE4 analysis pipeline a single shared implementation used by both the root CLI/report flow and the `apps/web` Next app. The target end state is:

- One canonical implementation for each metric and business rule.
- No copied analyzer logic under `apps/web`.
- No renderer-side metric formulas.
- Thin runtime adapters for CLI, web routes, file output, caching, and UI surface selection.
- Automated guards that fail when metric logic is reintroduced outside the shared core.

This plan supersedes the older `apps/web/PLAN.md` architecture decision that allowed future divergence between the root `src` analyzer and `apps/web/src/lib/aoe4`.

## Current Problems

### Split Analyzer Copies

The same business concepts currently exist in two places:

- Root analyzer: `src/analysis`, `src/parser`, `src/data`, `src/formatters`.
- Web copy: `apps/web/src/lib/aoe4`.

Some files remain byte-identical, but several important metric files have already drifted:

- `resourcePool.ts`
- `postMatchViewModel.ts`
- `postMatchHtml.ts`
- `fetchStaticData.ts`
- `gameSummaryParser.ts`

This makes root CLI reports and web reports capable of showing different values for the same match.

### Renderer-Side Metric Logic

The HTML renderer currently calculates or reshapes business concepts such as allocation categories, allocation comparisons, opportunity-lost lanes, and adjusted-military payloads. That makes the renderer a second metric layer instead of a presentation layer.

### Inconsistent External API Policy

The web static-data loader sends a descriptive User-Agent, while the root static-data loader does not. AoE4World API behavior should be governed by one shared client policy.

## Target Architecture

### Package Layout

Create a shared package:

```text
packages/aoe4-core/
  src/
    aoe4world/
    analysis/
    metrics/
    parser/
    presentation/
    types/
```

The root CLI and the web app become consumers:

```text
src/
  index.ts                    # CLI adapter only
  formatters/cliFormatter.ts   # CLI-only text formatting

apps/web/src/
  app/                         # Next routes/pages
  lib/matchPage.ts             # web adapter only
  lib/urlCanonicalization.ts   # web routing helper
```

After migration, delete `apps/web/src/lib/aoe4`. The web app must import from `@aoe4/analyzer-core`, not from copied local analyzer code.

### Build And Deployment Shape

Turn the repository into an npm workspace:

```json
{
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}
```

Build order:

- `@aoe4/analyzer-core` builds first.
- Root CLI imports the built core package.
- `apps/web` imports the same core package.

Vercel should target the repository as a monorepo instead of treating `apps/web` as an isolated root that cannot see `packages/aoe4-core`. The web build command should run through the workspace, for example:

```bash
npm --workspace apps/web run build
```

Deployment migration details:

- Change Vercel Root Directory to the repository root so `packages/aoe4-core` is available during install and build.
- Refresh the root lockfile after adding npm workspaces. Do not rely on the current `apps/web/package-lock.json` as the only lockfile once the core package exists.
- Update Vercel install command to run from the repository root:

```bash
npm install
```

- Update Vercel build command to:

```bash
npm --workspace apps/web run build
```

- Keep `apps/web/package.json` pinned to Node `20.x`, and ensure the root workspace does not override it with an incompatible engine.
- Update or remove the current `apps/web/vercel.json`, which currently contains `buildCommand: npm run build` and `installCommand: npm install`; that file is correct only when `apps/web` is treated as an isolated project root.
- Verify the migrated deployment with a Vercel preview or local `vercel build` from the repository root.

## Single Metric Pipeline

All report surfaces must use this pipeline:

1. Parse or fetch `GameSummary` using shared parser/client code.
2. Load static AoE4World data using shared endpoint definitions and shared request headers.
3. Resolve build-order entries using shared resolver logic.
4. Build `GameAnalysis` using shared analysis functions.
5. Build canonical metric series using shared metric modules.
6. Build a canonical `PostMatchViewModel`.
7. Apply a presentation-surface serializer to include or exclude sections.
8. Render the serialized view model.

No CLI command, web route, or HTML renderer should calculate the metric values below directly.

## Core Public API

Expose a small intentional API from `@aoe4/analyzer-core`:

```ts
export {
  fetchGameSummaryFromApi,
  parseGameSummary,
  loadGameSummaryFromFile,
  parseAoe4WorldGameUrl,
  resolveAllBuildOrders,
  validateAllItemsResolved,
  buildGameAnalysis,
  buildPostMatchViewModel,
  serializePostMatchViewModel,
  renderPostMatchHtml,
  formatGameAnalysis,
  createStaticDataLoader,
  createFileStaticDataCache,
  calculateValueAdjustedMatchup,
  classifyUnit,
  formatValueAdjustedMatchup,
  parseUnitCatalogFromJson,
  writeUnitCounterMatrixArtifacts,
  parseUnitTierFromIcon,
  getUpgradeEffect,
};
```

The exact names can change during implementation, but the contract must be explicit before root and web migrations begin.

## Root CLI Migration Inventory

The root CLI must preserve every current command while moving business logic into core.

| Command | Current responsibilities | Core exports after migration | Adapter responsibilities that stay in root `src` |
| --- | --- | --- | --- |
| `fetch-data` | Force refresh AoE4World static data and write `src/data/staticData.json` | `createStaticDataLoader`, `createFileStaticDataCache` | Default cache path, console status text, process exit code |
| `check-data` | Read fresh cache or refetch stale static data | `createStaticDataLoader`, `createFileStaticDataCache` | Cache age label, console status text |
| `test-upgrade-parsing` | Demo unit icon tier parsing and upgrade lookup | `parseUnitTierFromIcon`, `getUpgradeEffect` | Demo seed/sample selection and console formatting |
| `parse` | Parse local summary JSON and print basic match metadata | `loadGameSummaryFromFile`, `parseGameSummary` | CLI argument parsing and console formatting |
| `fetch-game` | Fetch AoE4World summary and print basic match metadata | `fetchGameSummaryFromApi` | CLI argument parsing, `sig` option, console formatting |
| `resolve-build-order` | Resolve build orders against static data and optionally print chronology | `createStaticDataLoader`, `resolveAllBuildOrders`, `validateAllItemsResolved` | Verbose console output, local cache path, process exit code |
| `test-counters` | Demo unit classification and value-adjusted matchup | `classifyUnit`, `calculateValueAdjustedMatchup`, `formatValueAdjustedMatchup`, `createStaticDataLoader` | Demo unit samples, seeded random army generation, console formatting |
| `generate-unit-counter-matrix` | Read unit catalog or static data and write TSV artifacts | `parseUnitCatalogFromJson`, `writeUnitCounterMatrixArtifacts`, `createStaticDataLoader` | Input/output path resolution and file-write destination |
| `analyze` | Fetch/analyze a game and print JSON or CLI text | `buildGameAnalysis`, `formatGameAnalysis` or CLI-only formatter backed by core model | Commander options, stdout mode selection, process exit code |
| `render-post-match` | Fetch/analyze a game and write HTML report | `fetchGameSummaryFromApi`, `buildGameAnalysis`, `buildPostMatchViewModel`, `serializePostMatchViewModel`, `renderPostMatchHtml` | Default output path under `reports/resource-flow`, directory creation, file writing |

No command should keep a private copy of metric, parser, AoE4World endpoint, or static-data normalization logic after migration.

## Canonical Metric Rules

### Deployed Resource Pool

Canonical module:

```text
packages/aoe4-core/src/metrics/deployedResourcePool.ts
```

Rules:

- Classification bands remain:
  - `economic`
  - `populationCap`
  - `militaryCapacity`
  - `militaryActive`
  - `defensive`
  - `research`
  - `advancement`
- Resource commitment is counted at the timestamp where the investment becomes committed.
- Buildings use constructed timestamps.
- Units use produced/finished timestamps.
- Research uses finished timestamps unless a reliable resource-commit timestamp exists.
- Advancement uses constructed/start timestamps when available, because the age-up investment is committed at start; fallback to finished timestamps when no constructed timestamp exists.
- Destroyed value is tracked as a cumulative accounting adjustment, not as a deployed band.
- Research is not decremented by destruction.

This resolves the current root/web drift where root uses `item.produced` for advancement while web uses `originalEntry.constructed`.

### Resource Accounting

Canonical module:

```text
packages/aoe4-core/src/metrics/resourceAccounting.ts
```

Rules:

- Gross band value is current deployed value plus cumulative destroyed value in that band.
- `destroyed` is cumulative value lost through negative deployed-pool deltas.
- `total` is `grossBandTotal - destroyed`.
- `gathered` is cumulative gathered resource value from AoE4World resource series.
- `float` is `max(0, gathered - total - destroyed)`.

These formulas should be exported as named helpers and tested directly.

### Strategic Allocation

Canonical module:

```text
packages/aoe4-core/src/metrics/strategicAllocation.ts
```

Rules:

- `economic = economic`
- `technology = research + advancement`
- `military = militaryCapacity + militaryActive + defensive`
- `other = populationCap`
- `overall = max(0, economic + technology + military + other - destroyed)`
- `float = resourceAccounting.float`
- `opportunityLost = villagerOpportunity.cumulativeLoss`

`opportunityLost` is a non-deployed counterfactual lane. It may be shown beside strategic allocation, but it must not be folded into deployed-resource totals or share denominators.

### Opportunity Lost

Canonical module:

```text
packages/aoe4-core/src/metrics/villagerOpportunity.ts
```

Rules:

- Keep the existing policy-driven villager model.
- Keep the configured villager target and population-cap stop rules.
- Keep explicit civ production modifiers.
- Emit one canonical series with:
  - underproduction loss
  - death loss
  - cumulative loss
  - supporting buckets for tooltip/breakdown display

Renderer code may display or omit this data, but must not derive it again.

### Age Analysis

Canonical module:

```text
packages/aoe4-core/src/metrics/ageAnalysis.ts
```

Rules:

- Age windows are derived from shared age-up timing helpers.
- Dark age starts at `0`.
- Each later age starts when that player reaches the age.
- Window summaries use the canonical deployed-resource and strategic-allocation series.
- Thresholds for "meaningful" and "similar" age investment differences live in a named policy object exported from the module.

### Adjusted Military And Matrix

Canonical modules:

```text
packages/aoe4-core/src/metrics/adjustedMilitary.ts
packages/aoe4-core/src/metrics/counterMatrix.ts
```

Rules:

- The adjusted military value and unit matrix are computed once in core.
- If a report surface excludes adjusted-military UI, a serializer removes those fields from the rendered payload.
- No renderer should replace the matrix with an empty one as a calculation shortcut.

### AoE4World Client Policy

Canonical module:

```text
packages/aoe4-core/src/aoe4world/client.ts
```

Rules:

- All automated requests send a descriptive non-browser User-Agent.
- Summary fetches use `/players/:profileSlug/games/:gameId/summary?camelize=true`.
- Static data fetches use:
  - `https://data.aoe4world.com/units/all.json`
  - `https://data.aoe4world.com/buildings/all.json`
  - `https://data.aoe4world.com/technologies/all.json`
- `sig` is supported by the summary fetcher and preserved by adapters where needed.
- Endpoint URLs and header construction are exported helpers; callers should not hardcode them.

Caching remains adapter-specific:

- CLI may keep the current file cache.
- Web may use in-memory or deployment-safe caching.
- Both adapters must call the same static-data fetch/client helpers.

### Static Data And Catalog Injection

Canonical metrics must not read static data from `__dirname`-relative files. Current code has hidden coupling to `src/data/staticData.json`, including counter/combat helpers that read from disk as a fallback. That fallback becomes unsafe after moving code into a built package because `__dirname` will point at package output, not the current source tree.

Rules:

- Static catalogs are loaded by adapters through an explicit loader.
- Core analysis functions receive `StaticDataCache` or specific catalogs as parameters.
- Counter and adjusted-military helpers receive unit/technology catalogs explicitly.
- The CLI file cache remains an adapter-level implementation detail.
- The web loader must not write into the source tree at runtime.
- Tests must cover both CLI file-cache behavior and web no-source-write behavior.

## Presentation Surface Model

Create a shared surface definition:

```text
packages/aoe4-core/src/presentation/reportSurface.ts
```

Example:

```ts
export type ReportSurface = 'full' | 'web-mvp';
```

The core view model is built once. A serializer then selects fields for the requested surface:

- `full`: root CLI/report development surface.
- `web-mvp`: deployed web surface.

The serializer can remove sections from the DOM payload, but it cannot compute replacement metrics.

## Duplication Guardrails

Add a verification script:

```text
scripts/check-aoe4-core-boundary.mjs
```

The script should fail if:

- `apps/web/src/lib/aoe4` exists.
- Files under `apps/web/src` define known metric functions such as `buildAllocationCategories`, `buildPlayerDeployedPoolSeries`, `buildPostMatchViewModel`, `buildCombatAdjustedSeries`, or `buildVillagerOpportunity`.
- Files under root `src/analysis`, `src/parser`, or `src/data` contain canonical metric implementations instead of CLI adapters or re-exports.
- AoE4World URLs or User-Agent strings are hardcoded outside `packages/aoe4-core/src/aoe4world`.

Keep `apps/web/scripts/check-no-root-imports.mjs` or replace it with the broader boundary script once the web app imports the workspace package correctly.

## Implementation Phases

### Phase 0: Characterization Tests First

Write failing or characterization tests before moving code.

Tests:

- Deployed-resource advancement timing uses constructed/start timestamps when available.
- Strategic allocation bucket formulas match the canonical rules.
- `opportunityLost` is excluded from share denominators.
- Adjusted military matrix data is preserved in the canonical full model.
- Web surface serialization removes omitted fields without recalculating replacements.
- Static data requests include the canonical User-Agent.
- Summary requests include `camelize=true`, optional `sig`, and canonical headers.

### Phase 1: Extract Core Package

- Add `packages/aoe4-core/package.json`.
- Move shared types, parser, static-data endpoint helpers, build-order resolver, analysis, and metric modules into the core package.
- Preserve public function names only where useful; otherwise expose a small intentional API from `packages/aoe4-core/src/index.ts`.
- Add core unit, integration, and end-to-end tests.
- Build the core package before root and web builds.

Core package test scripts:

```json
{
  "scripts": {
    "test:unit": "jest --runInBand __tests__/unit",
    "test:integration": "jest --runInBand __tests__/integration",
    "test:e2e": "jest --runInBand __tests__/e2e",
    "test": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "verify": "npm run build && npm run test"
  }
}
```

Core end-to-end tests should exercise the package's public pipeline from fixture summary input through analysis, canonical metric model, surface serialization, and rendered HTML. This keeps the test type meaningful even though the package itself does not own a browser route.

### Phase 2: Move Metric Logic Out Of Renderers

- Move allocation category computation from `postMatchHtml.ts` into `strategicAllocation.ts`.
- Move age analysis generation into `ageAnalysis.ts`.
- Move opportunity-lost bucket generation into `villagerOpportunity.ts`.
- Make `postMatchHtml.ts` accept precomputed values and only format/render them.
- Add tests that scan renderer files for forbidden metric helper names.

### Phase 3: Convert Root CLI To Core Consumer

- Add root `test:unit`, `test:integration`, `test:e2e`, and `verify` scripts before migration work depends on them.
- Replace root analyzer imports with `@aoe4/analyzer-core`.
- Keep CLI-specific command parsing, file writing, chalk formatting, and local cache wiring in root `src`.
- Remove or convert old root metric modules to thin re-exports only during transition, then delete them once imports are migrated.
- Run root unit, integration, and e2e tests.

### Phase 4: Convert Web App To Core Consumer

- Replace `apps/web/src/lib/aoe4` imports with `@aoe4/analyzer-core`.
- Delete `apps/web/src/lib/aoe4`.
- Keep Next route handling, URL canonicalization, error HTML, and page shell in `apps/web`.
- Update Vercel/workspace build settings so the web app can resolve the core package. Include the root workspace install command, web workspace build command, Node version check, and preview deployment verification in this phase.
- Run web unit, integration, and e2e tests.

### Phase 5: Add Parity And Boundary Tests

- Add one fixture-driven test that builds the full root report model and the web MVP model from the same canonical core output.
- Assert shared metric values are identical before surface serialization.
- Assert surface serialization only removes fields or sections; it does not mutate metric values.
- Add the boundary script to root and web verification commands.

### Phase 6: Remove Superseded Plan Assumptions

- Update `apps/web/PLAN.md` to remove "future divergence is acceptable".
- Document the new rule: web may have a smaller UI surface, but metric definitions live only in `@aoe4/analyzer-core`.
- Update README with workspace build/test commands.

## Verification Commands

Root:

```bash
npm run build
npm run test:unit
npm run test:integration
npm run test:e2e
node scripts/check-aoe4-core-boundary.mjs
```

Core:

```bash
npm --workspace packages/aoe4-core run test:unit
npm --workspace packages/aoe4-core run test:integration
npm --workspace packages/aoe4-core run test:e2e
npm --workspace packages/aoe4-core run verify
```

Web:

```bash
npm --workspace apps/web run typecheck
npm --workspace apps/web run test:unit
npm --workspace apps/web run test:integration
npm --workspace apps/web run test:e2e
npm --workspace apps/web run build
```

End-to-end coverage must remain present. Do not mark any test type as not applicable.

## Acceptance Criteria

- `packages/aoe4-core` is the only location for parser, analysis, metric, AoE4World endpoint, and metric view-model logic.
- Root CLI/report and `apps/web` both import the same core package.
- `apps/web/src/lib/aoe4` is deleted.
- Strategic allocation, deployed resource pools, opportunity lost, age analysis, adjusted military, and AoE4World client policy each have exactly one implementation.
- Renderers do not contain metric formulas.
- Web MVP output may omit sections, but all included metric values match the canonical core output.
- Boundary checks fail if copied metric logic is reintroduced.
- Unit, integration, and end-to-end tests cover the migrated behavior.
- The core package, root CLI, and web app each expose unit, integration, and end-to-end test commands, and all are run in verification.

## Risks And Mitigations

- **Vercel monorepo setup risk:** Update deployment configuration in the same phase as the workspace package migration. Verify with a preview deployment.
- **Large move risk:** Extract one domain at a time, keeping tests green after each move.
- **CLI regression risk:** Use the command-by-command migration inventory as a checklist and keep a fixture or mocked test for each command.
- **Hidden static-data path risk:** Remove `__dirname`-relative static-data reads from core metric code and require explicit catalog injection.
- **Hidden renderer coupling:** Add forbidden-helper-name scans and fixture parity tests before deleting the copied web modules.
- **Type/module-system friction:** Keep `@aoe4/analyzer-core` API small and build to JavaScript before consumers import it.
- **Surface-vs-metric confusion:** Require serializers to be deletion-only for omitted sections. They may not recompute replacement values.

## Recommended First Implementation Slice

Start with `deployedResourcePool`, `resourceAccounting`, and `strategicAllocation` because they are the current source of visible metric divergence. Do not begin with the full renderer move.

First slice steps:

1. Add core package shell.
2. Add unit, integration, and end-to-end characterization tests for advancement timing, allocation formulas, static-data client policy, and fixture pipeline output.
3. Move deployed-resource and allocation calculation into core.
4. Remove hidden static-data file reads from the moved code and inject catalogs explicitly.
5. Make root and web consume those modules.
6. Add a parity test against one real fixture.
7. Run core, root, and web unit/integration/e2e tests.
