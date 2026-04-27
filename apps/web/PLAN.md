# AoE4 Web App Plan

## Purpose

Build a Vercel-deployable web app under `apps/web` that presents a stripped-down post-match view from an AoE4World match link. The existing CLI/report implementation remains a staging and reference area only. The web app should copy the needed logic into its own app boundary so it can be changed independently without directly importing runtime code from the root `src` analyzer.

## Product Scope

### Keep

- Match header, including AoE4World summary link.
- Metric card area with `Final pool delta` only.
- `Deployed resource pool over time`.
- Hover inspector, including the `Gather/min` row.
- `Strategic allocation state`, including the chart, readout cards, and strategic state cards.
- Private AoE4World `sig` links.
- Shareable selected timestamp in the URL.

### Leave Out For Now

- Gather rate chart/widget.
- Villager opportunity cost widget.
- Adjusted military active row, widget, breakdown, and matrix.
- `Where the gap came from`.
- `One-line story`.

### Next Step, Not Initial Scope

- Server-side or persistent caching of fetched summaries, static data, or rendered match output.

## Architecture Decision

The web app must not directly depend on the root analyzer implementation at runtime. Instead:

- Create a standalone app in `apps/web` with its own `package.json`, TypeScript config, test config, and build scripts.
- Configure Vercel to use `apps/web` as the project root, or set the Vercel build/install commands so deployment clearly targets `apps/web`.
- Copy the minimum required parser, data loading, analysis, view-model, and rendering code into `apps/web/src/lib/aoe4`.
- Put route and UI code under `apps/web/src/app`.
- Trim the copied renderer to this product surface.
- Keep the copied code intentionally smaller than the staging implementation.
- Treat future divergence between root `src` and `apps/web/src` as acceptable.
- Add an enforceable guard against importing root analyzer code from the web app. At minimum, add a lint/check script that fails on imports matching `../../src`, `../../../src`, or absolute imports from the repository root `src`.

This preserves the root CLI/report code as a tinkering and staging area while making the deployed app easier to reason about.

## Proposed Routes

- `/`  
  Minimal form for pasting an AoE4World match URL.

- `/matches/[profileSlug]/[gameId]`  
  Server-rendered match report.

Supported query params:

- `sig`: AoE4World private game signature.
- `t`: selected timestamp in seconds.

Example:

```text
/matches/123456/230143339?sig=abc123&t=482
```

Rejected route shape unless there is a later routing reason to prefer it:

```text
/matches/123456/games/230143339?sig=abc123&t=482
```

## Data Flow

1. User pastes an AoE4World match URL.
2. App parses profile slug, game id, and optional `sig`.
3. App redirects to the canonical internal route.
4. Server route fetches the AoE4World summary with `camelize=true` and a descriptive non-browser User-Agent.
5. Server builds the copied web view model.
6. Server renders the stripped match page.
7. Client-side chart interactions update only timestamp selection state.

## Timestamp URL Behavior

Use `t=<seconds>` as the canonical selected timestamp parameter.

Initial page load:

- Parse `t`.
- If it matches a hover snapshot, select that snapshot.
- If it does not match exactly, select the nearest available snapshot.
- If `t` is absent or invalid, use the default first snapshot.

Chart selection:

- On click/tap of a timestamp target, pin that timestamp.
- Update the URL with `history.replaceState`.
- Preserve `sig` and all other supported query params.

Unpin/reset:

- `Escape` clears pinned state.
- Remove `t` from the URL when selection is reset.

## Vercel Considerations

- Use Node runtime, not Edge runtime, because the analyzer logic expects Node-compatible APIs and server-side fetching.
- Pin a supported Node major in `apps/web/package.json`.
- Do not rely on writing under the project source tree at runtime. Vercel Functions have read-only filesystem outside temporary scratch space.
- For the initial version, prefer bundling or generating a static-data snapshot during build rather than runtime source-tree caching.
- Keep response size below Vercel Function response limits by removing omitted widget payloads from the embedded hover data, not just hiding the UI.

## Privacy And Private Links

Private `sig` support is required for the initial version.

Rules:

- Preserve `sig` during redirects and timestamp URL updates.
- Do not persist `sig` in any cache until a cache design is explicitly added.
- Avoid logging full private URLs in application logs.
- If the page includes an AoE4World summary link for a private match, include `sig` only when needed to open the same match.

## Copied Code Inventory

Expected copied areas from the staging implementation:

- `src/parser/aoe4WorldUrl.ts` style AoE4World URL parsing.
- `src/parser/gameSummaryParser.ts` style game summary fetching and parsing.
- `src/data/fetchStaticData.ts` style static data loading, changed to avoid runtime source-tree writes.
- `src/parser/buildOrderResolver.ts` style build-order resolution needed by deployed resource pools.
- `src/analysis/resourcePool.ts` style resource-pool reconstruction.
- `src/analysis/postMatchViewModel.ts` style post-match view-model construction, reduced to kept fields only.
- `src/formatters/postMatchHtml.ts` style HTML/SVG rendering for the kept sections.
- The hover timestamp interaction script, reduced to the kept inspector/chart fields.

Expected exclusions from the copied web implementation:

- LLM narrative generation.
- Villager opportunity model.
- Adjusted military active model and matrix explanation code.
- Standalone CLI commands.
- Report file writing.

The web app should keep `hoverSnapshot.gather` only for the hover inspector `Gather/min` row. It should not render a standalone gather-rate visualization.

## Testing Plan

Follow TDD for implementation work.

Unit tests:

- AoE4World URL parsing preserves `sig`.
- Timestamp query parsing handles valid, invalid, missing, and out-of-range values.
- Nearest hover snapshot selection is deterministic.
- Query-string update preserves `sig` while adding/removing `t`.
- Import-boundary check rejects web app imports from the root analyzer `src`.

Integration tests:

- Server match route fetches a mocked summary and renders the kept sections.
- Rendered HTML excludes omitted sections.
- Embedded hover payload excludes omitted villager and adjusted-military payloads.
- Embedded hover payload keeps `gather` for the inspector row.
- Private `sig` is passed to the summary fetcher and preserved in generated links.
- Fixture parity covers header, final pool delta, deployed pool series, strategic allocation state, hover `Gather/min`, private `sig`, and known resource-pool regressions such as Malian cattle.

End-to-end tests:

- Paste a public AoE4World URL and land on the canonical match page.
- Paste a private AoE4World URL with `sig` and land on the canonical match page with `sig` preserved.
- Click a chart timestamp and verify the URL gains `t=<seconds>`.
- Reload a URL with `t=<seconds>` and verify that timestamp is selected.

## Implementation Phases

### Phase 1: App Shell

- Create `apps/web` package.
- Add Vercel-compatible framework setup.
- Add independent build, typecheck, unit, integration, and e2e scripts for `apps/web`.
- Add the no-root-`src` import-boundary check.
- Add root URL form and canonical match route.
- Add copied URL parser tests first.

### Phase 2: Copied Data And Model Layer

- Copy minimal parser/fetch/static-data/resource-pool code.
- Remove CLI-only and report-file concerns.
- Convert static-data access to a read-only bundled/generated snapshot for the initial version.
- Add mocked integration coverage for public and private summary fetches.

### Phase 3: Stripped Renderer

- Copy renderer into the web app.
- Remove omitted sections and omitted hover payload fields.
- Keep header, final pool delta, deployed pool chart, hover inspector with `Gather/min`, and strategic allocation chart/cards.
- Render exactly one metric card: `Final pool delta`.
- Add render tests for kept/excluded sections.

### Phase 4: Timestamp Sharing

- Implement `t` initialization.
- Implement selected timestamp URL updates.
- Add browser/e2e coverage for click, reload, and reset behavior.

### Phase 5: Deployment Readiness

- Add Vercel configuration only if framework defaults are insufficient.
- Confirm Vercel root/build configuration targets `apps/web`.
- Verify build, unit, integration, and e2e tests.
- Deploy preview.
- Smoke-test public and private links.

## Unanswered Questions

- Are profile slugs always acceptable in the internal route, or should the app canonicalize to numeric profile ids after parsing/fetching?
- Should private `sig` be visible in the browser URL long-term, or should a later cache/share-token design hide it?
- Should build-time static data be committed, generated during Vercel build, or fetched on cold start into temporary storage?
- Should the app show a small error explanation when AoE4World returns `404`, `403`, or `429`, or keep initial error handling generic?
- Should mobile layout keep the same inspector-first behavior, or should selected timestamp details move below each chart?

## Acceptance Criteria

- `apps/web` can run and deploy without importing root `src` analyzer modules at runtime.
- `apps/web` has its own package/build/test configuration.
- Vercel deployment configuration targets `apps/web`.
- Public and private AoE4World links render the stripped report.
- Only the requested sections appear.
- The metric area renders exactly one card: `Final pool delta`.
- The hover inspector still includes `Gather/min`.
- Selecting a chart timestamp updates the URL with `t`.
- Loading a URL with `t` restores the selected timestamp.
- Tests cover unit, integration, and end-to-end behavior for the implemented app surface.
