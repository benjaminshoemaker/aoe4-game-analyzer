# Completed Next Steps

Last updated: 2026-05-03 (America/Los_Angeles)

This file records items moved out of `NEXT_STEPS.md` after they are verified as completed or no longer applicable as open backlog work.

## 2026-05-03

- [x] `P0` Finish and stabilize significant-resource-loss event wiring
  - Original goal: ensure `significantResourceLossEvents` is present on `GameAnalysis` and rendered hover points include the selected significant raid/destruction event.
  - Current state: significant resource loss events are produced, converted into timeline events, included in hover snapshots, rendered in the web UI, and shown on the allocation chart as significant-event markers.
  - Verification: `npm test -- __tests__/integration/postMatchView.integration.test.ts` passed; `npm test -- __tests__/e2e/postMatchRender.test.ts -t "renders worker deaths once"` passed.
  - Note: the broader e2e file still has an unrelated destroyed-row tooltip assertion failure, so this item is complete as significant-event wiring work, not as full-suite cleanup.
  - Source: current repo verification on 2026-05-03.

- [x] `P0` Broad Ottoman free-production overlay scope
  - Original goal: model Military School cadence, Janissary-company injections, and related Ottoman free-production paths as a broad accounting overlay.
  - Current decision: do not build a separate free-production overlay for v1. The remaining actionable fix is to classify Military Schools as economic infrastructure while counting produced units normally as military value.
  - Scope notes: Mehmed Imperial Armory stays landmark/advancement value; Mehter belongs to adjusted-military combat-strength modeling.
  - Source: user clarification on 2026-05-03.
