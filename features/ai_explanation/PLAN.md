# AI Explanation Widget Plan

## Product Decision Summary

- Scope: explain the whole game, not the selected timestamp.
- Trigger: lazy generation from the match page, not automatic page-load generation.
- Fallback: no deterministic prose fallback. If generation is unavailable or fails, show an explicit unavailable/error state.
- Output: prose only for the first version.
- Provider/model: OpenAI Responses API with `gpt-5.4-nano`.
- Privacy: the server may send a reduced match-evidence packet to OpenAI, but must not send the `sig` token or signed AoE4World URL.

## Goal

Add an `AI Explanation` widget that answers:

> Why did the winner win this game?

The widget should produce analysis at the same quality level as a human-assisted explanation built from this app's current model: deployed resource pools, strategic allocation, significant fights, final army matchup, age timing, economy composition, destroyed value, and matchup-specific unit composition.

The core implementation must be evidence-first. The app should decide which facts matter; the LLM should write clear prose from those facts.

## OpenAI Integration Notes

Use the OpenAI JavaScript SDK and the Responses API.

Initial request shape:

```ts
const response = await openai.responses.create({
  model: process.env.AI_EXPLANATION_MODEL ?? 'gpt-5.4-nano',
  reasoning: { effort: 'low' },
  instructions,
  input: JSON.stringify(evidencePacket),
  max_output_tokens: 3000,
  store: false,
});
```

Rationale:

- Official docs recommend the Responses API for text generation and especially for reasoning models.
- `gpt-5.4-nano` is a supported model, supports the Responses API, and supports reasoning tokens.
- `reasoning.effort: 'low'` is a practical starting point because the deterministic evidence builder should do most of the judgment work.
- `max_output_tokens` must leave room for reasoning tokens as well as visible prose; start at `3000` and tune from real outputs.
- `store: false` is preferred for this feature because match evidence can include private-game details, even after stripping `sig`.

Do not expose `OPENAI_API_KEY` to the browser. The key must only be read in server-side code.

## Architecture

### 1. Evidence Builder

Create:

`apps/web/src/lib/aoe4/analysis/aiExplanationEvidence.ts`

Responsibilities:

- Accept the existing `GameSummary`, `GameAnalysis`, `PostMatchViewModel`, and perspective profile.
- Produce a compact, typed evidence packet.
- Rank and select high-signal facts before any LLM call.
- Include only whole-game evidence, not arbitrary raw hover snapshots.
- Exclude `sig`, full signed URLs, raw prompt text, and unnecessary player metadata.

Suggested interface:

```ts
export interface AiExplanationEvidence {
  version: 1;
  match: {
    gameId: number;
    map: string;
    durationSeconds: number;
    winReason: string;
    winner: PlayerEvidence;
    loser: PlayerEvidence;
    perspective: 'winner' | 'loser';
  };
  headlineCandidates: string[];
  selectedFacts: EvidenceFact[];
  timeline: TimelineEvidence;
  economy: EconomyEvidence;
  combat: CombatEvidence;
  finalState: FinalStateEvidence;
  caveats: string[];
}
```

The evidence builder should compute at least:

- winner/loser identity and civilizations
- age timings
- final deployed resource delta
- final active military delta
- final destroyed-value delta
- final gather-rate/resource-state delta when meaningful
- top economic composition drivers for each player
- top significant favorable and unfavorable fight events
- final army composition and combat-adjusted matchup summary
- whether the winner's lead came from economy, fight conversion, tech/age timing, final army composition, or a combination

### 2. Story Selector

Create a deterministic layer inside the evidence builder that ranks causal mechanisms.

Initial mechanism taxonomy:

- `economy_scaling`
- `fight_conversion`
- `army_counter_composition`
- `age_or_tech_timing`
- `resource_efficiency`
- `opponent_float_or_unspent_resources`
- `villager_damage`
- `final_army_collapse`

Each mechanism should have:

- a score
- the facts that support it
- a short deterministic label

For the example match, the top mechanisms should be:

1. Malian cattle-backed economy created a deployable economic base.
2. Malians converted French knight investment into destroyed value through favorable fights.
3. The 22:07 fight caused the final French army/economy collapse.
4. Final Donso/Javelin/Sofa composition was decisive into the remaining French army.

### 3. Prompt Builder

Create:

`apps/web/src/lib/aoe4/analysis/aiExplanationPrompt.ts`

Prompt rules:

- Ask for whole-game explanation only.
- Use only supplied evidence.
- Do not invent scouting, relics, map control, intent, or build-order motives unless present in evidence.
- Prefer concrete numbers over vague claims.
- Identify the decisive mechanism before supporting details.
- Write polished prose only.
- Do not return Markdown headings for v1 unless the UI wants them.

The prompt should include the target style:

> Explain the game like a strong AoE4 analyst. The answer should be concise, concrete, and causal. It should say what happened, why it mattered, and what changed the game state.

### 4. OpenAI Service

Create:

`apps/web/src/lib/aoe4/analysis/aiExplanationService.ts`

Responsibilities:

- Instantiate the OpenAI client server-side.
- Read `OPENAI_API_KEY`.
- Use `AI_EXPLANATION_MODEL` if set, else `gpt-5.4-nano`.
- Call the Responses API.
- Return prose plus metadata needed for debugging/tests:
  - model
  - evidence version
  - status
  - incomplete reason, if any
  - token usage, if available
- Treat incomplete/empty output as a failure, not a successful explanation.

No fallback prose generation in v1.

### 5. Route

Add:

`apps/web/src/app/matches/[profileSlug]/[gameId]/ai-explanation/route.ts`

Use `POST`.

Request:

```json
{
  "sig": "optional private-game signature"
}
```

Response:

```json
{
  "explanation": "prose...",
  "model": "gpt-5.4-nano",
  "evidenceVersion": 1
}
```

Important:

- `sig` may be accepted by the route so the server can fetch/build the match model.
- `sig` must not be included in the OpenAI evidence packet.
- Return a clear `503` if `OPENAI_API_KEY` is missing.
- Return a clear `502` if the model returns empty/incomplete output.

### 6. UI Widget

Add an `AI Explanation` panel near the top of the match page, directly under the recap header and before the allocation chart.

Initial UI states:

- Idle: title, one sentence of empty-state copy, `Generate explanation` button.
- Loading: button disabled, compact progress text.
- Success: prose rendered in readable paragraphs.
- Error: concise failure text and retry button.

Implementation detail:

- Existing match HTML is server-rendered string output. Add a static panel to `renderPostMatchHtml`.
- Add client-side script logic that calls the new route lazily when the button is clicked.
- Preserve existing query params for the page, but only pass `sig` to the local route.
- Do not block chart rendering or hover-data loading on AI generation.

## Validation Rules

Before displaying model output, validate:

- output is non-empty
- output is prose, not JSON or bullet-only structure
- output contains the winner civilization or winner name
- output contains the loser civilization or loser name
- if decisive significant events exist, output references at least one top event's time or concrete loss figures
- output must not contain `sig=`
- output must not mention unsupported concepts unless they appear in evidence:
  - relic
  - sacred site
  - water
  - walling
  - trade
  - map control

If validation fails, return a failure response. Do not silently show a weak explanation.

## Testing Plan

Testing is required at all levels.

### Unit Tests

Add tests for:

- evidence builder selects winner/loser correctly when the requested perspective is the loser
- evidence builder excludes `sig` and signed URLs
- mechanism ranking identifies fight conversion when a large favorable fight exists
- mechanism ranking identifies economy scaling when economic pool/composition is dominant
- prompt builder includes evidence constraints and unsupported-concept prohibitions
- OpenAI output validator rejects unsupported concepts and leaked `sig`

Suggested files:

- `apps/web/__tests__/unit/aiExplanationEvidence.test.ts`
- `apps/web/__tests__/unit/aiExplanationPrompt.test.ts`
- `apps/web/__tests__/unit/aiExplanationValidation.test.ts`

### Integration Tests

Add tests for:

- route returns `503` when `OPENAI_API_KEY` is missing
- route calls the OpenAI service with sanitized evidence
- route returns prose for a mocked successful OpenAI response
- route returns failure for empty/incomplete/invalid model output

Suggested file:

- `apps/web/__tests__/integration/aiExplanationRoute.integration.test.ts`

### End-to-End Tests

Add a page-level e2e test that:

- renders a match page
- verifies the `AI Explanation` panel is idle on load
- clicks `Generate explanation`
- intercepts/mocks the route response
- verifies prose appears without breaking allocation chart interactions

Suggested file:

- `apps/web/__tests__/e2e/aiExplanationWidget.test.ts`

## Acceptance Criteria

- The match page includes an `AI Explanation` widget.
- The widget does not call OpenAI until the user clicks `Generate explanation`.
- The widget uses OpenAI Responses API with default model `gpt-5.4-nano`.
- The OpenAI key remains server-only.
- The signed AoE4World `sig` is never sent to OpenAI and never appears in generated prose.
- The LLM receives a compact, ranked evidence packet, not raw hover data.
- Weak, empty, incomplete, or unsupported-concept outputs are rejected.
- Unit, integration, and e2e tests cover the feature.
- Existing post-match chart and hover behavior remains intact.

## Implementation Phases

### Phase 1: Evidence Contract

- Add types and evidence builder.
- Add mechanism ranking.
- Add unit tests around the example-style causal signals.

### Phase 2: Prompt and Validation

- Add prompt builder.
- Add output validator.
- Add unit tests for prompt constraints and validation failures.

### Phase 3: OpenAI Service and Route

- Add `openai` dependency to `apps/web`.
- Add server-side OpenAI service.
- Add lazy `POST` route.
- Mock OpenAI in integration tests.

### Phase 4: Widget UI

- Add panel markup and client-side generation behavior.
- Add loading/success/error states.
- Add e2e coverage with mocked route response.

### Phase 5: Example Match Calibration

- Run the widget against:
  - `230836204` RepleteCactus Malians vs French
  - at least one match where winner had more economy but fewer kills
  - at least one match where final fight was not the primary reason
- Compare outputs against the evidence packet.
- Tune mechanism scoring and prompt wording before widening usage.

## Open Questions For Implementation

- Should generated prose be cached in memory for the dev server session, or should every click re-request OpenAI?
- Should the route support a future `refresh: true` flag to force regeneration?
- Should we log sanitized evidence packets under `tmp/` during development for calibration, or keep them only in tests?
