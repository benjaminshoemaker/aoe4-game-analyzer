# Research & Suggest Workflow

Step 6 of `/list-todos` — after sorting by priority, before output. Research eligible TODO items and generate actionable suggestions.

## Eligibility Criteria

An item is **eligible** for research if ALL of the following are true:

- Requirements Clarity is **HIGH** or **MEDIUM**
- Item is not completed, deferred, or removed
- Item is in the **top 5** eligible items by priority score

LOW clarity items are skipped — there isn't enough context to construct meaningful search queries.

## Research Protocol

For each eligible item:

### 1. Extract Search Context

From the item's text, description, and any existing clarifications, extract:
- **Technology names** (languages, frameworks, libraries, services)
- **Action verbs** (migrate, integrate, optimize, implement, etc.)
- **Problem domain** (authentication, caching, deployment, etc.)

### 2. Construct Search Queries

Build **2 targeted WebSearch queries** per item. Use project context to make queries specific:

```
Query 1: "{technology} {action} best practices 2026"
Query 2: "{technology} {problem domain} implementation guide"
```

Adapt query patterns to the item. Examples:
- Migration item → `"{framework} migration from {vOld} to {vNew} guide 2026"`
- Integration item → `"{service} {framework} integration tutorial 2026"`
- Performance item → `"{technology} performance optimization techniques"`

### 3. Optional: Fetch Documentation

If search results surface a **highly relevant** documentation URL (official docs, well-known tutorial), use **1 WebFetch** call to extract specific guidance.

Skip WebFetch if:
- Search results already provide sufficient detail
- No single URL stands out as authoritative
- The item is well-understood from search snippets alone

### 4. Extract Findings into Suggestions

Map research findings into the suggestion categories below. **Only include categories that have actual findings** — do not pad with generic advice.

## Suggestion Categories

| Category | What to include |
|----------|----------------|
| **Approach** | Implementation approach supported by research (specific steps, recommended order) |
| **Tools** | Specific tools, libraries, or services with version numbers when available |
| **Pattern** | Architecture or design pattern recommendation from research |
| **Watch out** | Risks, gotchas, common pitfalls, breaking changes, or deprecation warnings |
| **Reference** | URL to the most relevant documentation page |

## Bounds

- **Max 2 WebSearch calls** per item
- **Max 1 WebFetch call** per item
- **Max 5 items** researched per run
- Total maximum: 10 WebSearch + 5 WebFetch calls per run

## Error Handling

**WebSearch failure (single item):**
- Skip the item gracefully
- Record: `**Suggestions:** Research limited — web search unavailable for this item.`
- Continue to next eligible item

**Rate limiting / repeated failures:**
- After **2 consecutive failures**, stop research for remaining items
- Report in summary: "Research stopped after {N} of {M} eligible items due to search errors."
- Items already researched retain their suggestions

**WebFetch failure:**
- Ignore and proceed with search-result snippets only
- Do not retry

**No relevant results:**
- Record: `**Suggestions:** No actionable suggestions found from research.`
