# Completed Next Steps

Last updated: 2026-05-06 (America/Los_Angeles)

This file records items moved out of `NEXT_STEPS.md` after they are verified as completed or no longer applicable as open backlog work.

## 2026-05-06

- [x] `P0` Villager idle-time proxy from gather-rate drops
  - Implemented in the current narrower event-window form as gather disruption: significant resource-loss windows compare in-window gather rates against the window-start baseline, threshold out weak/noisy drops, and report resource shortfall plus idle-equivalent villager-seconds.
  - The signal is attached to affected-side event impacts, rendered under Event impact -> Encounter losses, and accumulated into Opportunity lost by selected time as a separate component from villager deaths, underproduction, and TC idle seconds.
  - Verification: recent commits `892e4ed` and `8fc9daa` added/updated unit, integration, and e2e coverage across `significantResourceLossEvents`, post-match HTML/hover rendering, and the match route.
  - Scope note: this intentionally does not attempt arbitrary all-game gather-rate-drop classification; the remaining P1 item is only about whether to also show this existing signal in the standalone Villager opportunity section.

## 2026-05-03

- [x] `P0` Villager-opportunity cap parity with product rule (120-villager target OR 200-pop cap)
  - Implemented expected-villager growth lock once either the configured 120-villager target is reached or parsed total population reaches 200.
  - The 200-pop lock is permanent for the rest of the match, even if observed population drops later.
  - Verification: full `npm test` passed after targeted unit/integration/e2e coverage.

- [x] `P0` Ottoman Military School economic-infrastructure classification
  - Military Schools now classify as `economic` infrastructure, analogous to Pit Mine-style economic investment.
  - Produced units still count normally as `militaryActive`; Mehmed Imperial Armory stays landmark/advancement value.
  - Verification: full `npm test` passed after targeted unit/integration/e2e coverage.

- [x] `P0` Jeanne d'Arc villager-to-military transform accounting
  - Parsed `transformed` timestamps are preserved.
  - Jeanne counts as economic villager value before transform, military value after transform, and post-transform death is not counted as a villager death.
  - Verification: full `npm test` passed after targeted unit/integration/e2e coverage.

- [x] `P0` Finish and stabilize significant-resource-loss event wiring
  - Original goal: ensure `significantResourceLossEvents` is present on `GameAnalysis` and rendered hover points include the selected significant raid/destruction event.
  - Current state: significant resource loss events are produced, converted into timeline events, included in hover snapshots, rendered in the web UI, and shown on the allocation chart as significant-event markers.
  - Verification: `npm test -- __tests__/integration/postMatchView.integration.test.ts` passed; `npm test -- __tests__/e2e/postMatchRender.test.ts -t "renders worker deaths once"` passed.
  - Note: the broader e2e file still has an unrelated destroyed-row tooltip assertion failure, so this item is complete as significant-event wiring work, not as full-suite cleanup.
  - Source: current repo verification on 2026-05-03.

- [x] `P0` Broad Ottoman free-production overlay scope
  - Original goal: model Military School cadence, Janissary-company injections, and related Ottoman free-production paths as a broad accounting overlay.
  - Current decision: do not build a separate free-production overlay for v1. Military School classification is tracked above as completed; produced units continue to count normally as military value.
  - Scope notes: Mehmed Imperial Armory stays landmark/advancement value; Mehter belongs to adjusted-military combat-strength modeling.
  - Source: user clarification on 2026-05-03.
