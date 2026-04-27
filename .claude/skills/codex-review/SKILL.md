---
name: codex-review
description: Have OpenAI Codex review the current branch with documentation research. Use for second-opinion code reviews or when you want cross-AI verification.
argument-hint: "[focus] [--upstream FILE] [--research TOPICS] [--base BRANCH] [--model MODEL] [--mode code|research]"
allowed-tools: Bash, Read, Glob, Grep
---

# Codex Review

Invoke OpenAI's Codex CLI to review the current branch, with instructions to research relevant documentation before reviewing.

## When to Use

- You want a second opinion on your implementation
- You want cross-verification between different AI models
- The implementation uses tools/libraries where current docs would help
- You've completed a feature and want thorough review before merging
- `/phase-checkpoint` invokes this for cross-model review (Step 4)

## Prerequisites

- Codex CLI installed (`codex --version` works)
- Valid OpenAI authentication (`codex login` completed)
- On a feature branch with commits to review

## Arguments

| Argument | Example | Description |
|----------|---------|-------------|
| `focus` | `security` | Focus review on specific area |
| `--upstream FILE` | `--upstream PRODUCT_SPEC.md` | Check that code preserves requirements from upstream doc |
| `--research TOPICS` | `--research "Supabase, NextAuth"` | Explicit technologies for Codex to research |
| `--base BRANCH` | `--base develop` | Compare against different base branch |
| `--model MODEL` | `--model gpt-5.2-codex` | Use specific Codex model (overrides --mode) |
| `--mode MODE` | `--mode research` | Select model by task type: `code` (default) or `research`. When omitted, auto-detected from changed files. |

## Workflow

Copy this checklist and track progress:

```
Codex Review Progress:
- [ ] Step 1: Verify Codex CLI available
- [ ] Step 2: Gather branch context
- [ ] Step 3: Generate review prompt
- [ ] Step 4: Invoke Codex
- [ ] Step 5: Present results
```

## Step 1: Verify Codex CLI

### Check if Running Inside Codex

```bash
# Codex sets CODEX_SANDBOX when running
if [ -n "$CODEX_SANDBOX" ]; then
  echo "RUNNING_IN_CODEX"
fi
```

**If running inside Codex CLI:**
```
CODEX REVIEW: SKIPPED
=====================
Reason: Already running inside Codex CLI.

Cross-model verification requires a different model.
Continuing without cross-model verification.
```

Return early. Do NOT block the parent workflow.

### Check Codex CLI Installed

```bash
codex --version
```

If not installed:
```
Codex CLI is not installed or not in PATH.

Install: https://github.com/openai/codex
Then run: codex login
```

### Check Authentication

```bash
codex login status
```

If not authenticated:
```
Codex authentication failed. Run:
  codex login
```

### Read Configuration

Read `.claude/settings.local.json` for settings:

```bash
# Read models from config
CODE_MODEL=$(jq -r '.codexReview.codeModel // "gpt-5.2-codex"' .claude/settings.local.json 2>/dev/null || echo "gpt-5.2-codex")
RESEARCH_MODEL=$(jq -r '.codexReview.researchModel // "gpt-5.2"' .claude/settings.local.json 2>/dev/null || echo "gpt-5.2")
TIMEOUT_MINS=$(jq -r '.codexReview.reviewTimeoutMinutes // 10' .claude/settings.local.json 2>/dev/null || echo "10")
```

If `codexReview.enabled` is explicitly `false`, skip with message.

### Select Model

Priority order: `--model` flag > `--mode` flag > auto-detection > default (`code`)

```bash
# 1. Explicit --model flag always wins
if [ -n "$EXPLICIT_MODEL" ]; then
  CODEX_MODEL="$EXPLICIT_MODEL"

# 2. Explicit --mode flag
elif [ "$MODE" = "research" ]; then
  CODEX_MODEL="$RESEARCH_MODEL"
elif [ "$MODE" = "code" ]; then
  CODEX_MODEL="$CODE_MODEL"

# 3. Auto-detect from changed files when --mode not provided
else
  # Get changed file extensions
  CODE_EXTENSIONS="ts|tsx|js|jsx|py|go|rs|java|rb|php|swift|kt|c|cpp|h|css|scss|vue|svelte"
  CHANGED_FILES=$(git diff $BASE_BRANCH...HEAD --name-only 2>/dev/null)

  if [ -z "$CHANGED_FILES" ]; then
    # No git diff available — default to code
    CODEX_MODEL="$CODE_MODEL"
  elif echo "$CHANGED_FILES" | grep -qE "\.($CODE_EXTENSIONS)$"; then
    # Has code files — use code model
    CODEX_MODEL="$CODE_MODEL"
  else
    # Only non-code files (md, txt, json, etc.) — use research model
    CODEX_MODEL="$RESEARCH_MODEL"
  fi
fi
```

**Auto-Detection Summary:**

| Changed Files | Inferred Mode | Model |
|---------------|---------------|-------|
| Any `.ts`, `.js`, `.py`, etc. | `code` | `gpt-5.2-codex` |
| Only `.md`, `.txt`, `.json` | `research` | `gpt-5.2` |
| No diff available | `code` (safe default) | `gpt-5.2-codex` |

## Step 2: Gather Branch Context

Collect information about the current branch:

```bash
# Current branch name
git branch --show-current

# Commits on this branch (vs main or specified base)
BASE_BRANCH="${BASE:-main}"
git log --oneline $BASE_BRANCH..HEAD 2>/dev/null || git log --oneline -10

# Changed files summary
git diff $BASE_BRANCH...HEAD --stat 2>/dev/null || git diff HEAD~5 --stat

# Get the merge base
git merge-base $BASE_BRANCH HEAD 2>/dev/null
```

**Auto-detect research topics** from changed files if `--research` not provided:
- Check `package.json` for dependencies
- Look at import statements in changed files
- Identify frameworks (Next.js, React, etc.)

## Step 3: Generate Review Prompt

See [PROMPT_TEMPLATE.md](PROMPT_TEMPLATE.md) for the full prompt structure.

Key sections:
1. **Pre-Review Research** — Technologies Codex should research
2. **Review Context** — Branch, commits, changed files
3. **Upstream Context** (if `--upstream` provided) — Requirements to preserve
4. **Review Instructions** — What to check, output format

## Step 4: Invoke Codex

See [CODEX_INVOCATION.md](CODEX_INVOCATION.md) for detailed command building.

```bash
OUTPUT_FILE="/tmp/codex-review-output-$(date +%s).txt"

# Build model flag
MODEL_FLAG=""
if [ -n "$CODEX_MODEL" ]; then
  MODEL_FLAG="--model $CODEX_MODEL"
fi

# Execute with timeout
timeout $((TIMEOUT_MINS * 60)) bash -c "cat {prompt_file} | codex exec \
  --sandbox danger-full-access \
  -c 'approval_policy=\"never\"' \
  -c 'features.search=true' \
  $MODEL_FLAG \
  -o $OUTPUT_FILE \
  -"
EXIT_CODE=$?
```

**Flags explained:**
- `--sandbox danger-full-access`: Enables network access for documentation research
- `-c 'approval_policy="never"'`: Non-interactive execution
- `-c 'features.search=true'`: Enable web search for documentation research
- `-o $OUTPUT_FILE`: Write final response to file for reliable parsing
- `-`: Read prompt from stdin

**Important:** Do NOT use `2>&1` — Codex streams progress to stderr and final output to stdout. Merging them corrupts the parseable response.

## Step 5: Present Results

Parse and present the Codex output. See [EVALUATION_PRACTICES.md](EVALUATION_PRACTICES.md) for severity classification.

### Output Format (User-Facing)

```
CODEX REVIEW COMPLETE
=====================
Branch: feature/add-auth
Reviewed by: Codex ({model})
Status: PASS WITH NOTES

Critical Issues: None

Recommendations:
1. [src/auth/handler.ts:45] Consider adding rate limiting
   → Suggestion: Use express-rate-limit middleware

2. [src/auth/session.ts:12] Session expiry not explicitly configured
   → Suggestion: Add explicit maxAge to session config

Positive Findings:
- Good separation of concerns in auth module
- Proper error handling for OAuth failures

{If --upstream provided}
Context Preservation: ✓ All 5 items from PRODUCT_SPEC.md preserved
{/If}
```

### Output Format (Programmatic — for /phase-checkpoint)

When invoked by another skill, return structured data:

```json
{
  "status": "pass | pass_with_notes | needs_attention | error | skipped",
  "critical_issues": [],
  "recommendations": [],
  "positive_findings": [],
  "context_preservation": {
    "checked": true,
    "all_preserved": true,
    "missing_items": []
  }
}
```

## Error Handling

| Failure | Action |
|---------|--------|
| Codex CLI not found | Report and stop |
| Authentication failed | Suggest `codex login` |
| No commits on branch | Report nothing to review |
| Codex times out | Return partial output if available |
| Output is malformed | Attempt best-effort parsing |

## Configuration

Read from `.claude/settings.local.json`:

```json
{
  "codexReview": {
    "enabled": true,
    "codeModel": "gpt-5.2-codex",
    "researchModel": "gpt-5.2",
    "reviewTimeoutMinutes": 10,
    "taskTimeoutMinutes": 60
  }
}
```

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Set to `false` to disable Codex review |
| `codeModel` | `"gpt-5.2-codex"` | Model for code review tasks |
| `researchModel` | `"gpt-5.2"` | Model for research/planning tasks |
| `reviewTimeoutMinutes` | `10` | Max time for review invocations |
| `taskTimeoutMinutes` | `60` | Max time for task execution via Codex |

**For CI/headless environments:** Set `CODEX_API_KEY` environment variable for authentication without interactive login.

## Examples

**Basic review:**
```
/codex-review
```

**Focus on security:**
```
/codex-review security
```

**Verify against upstream spec:**
```
/codex-review --upstream PRODUCT_SPEC.md
```

**Explicit research topics:**
```
/codex-review --research "Supabase Auth, Next.js App Router"
```

**Different base branch and model:**
```
/codex-review --base develop --model gpt-5.2-codex
```
