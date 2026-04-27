# Interactive Q&A Workflow

After displaying the prioritized list and summary, offer the user an interactive session to clarify requirements or review research suggestions.

## Step 1: Choose Action

Use the AskUserQuestion tool to ask:

```
Question: "What would you like to do next?"
Header: "Q&A Mode"
Options:
  - Label: "Clarify an item"
    Description: "Ask questions about a specific item to improve its requirements"
  - Label: "Review suggestions"
    Description: "Discuss and accept/reject research suggestions for items"
  - Label: "I'm done"
    Description: "Exit without further changes"
```

- **"Clarify an item"** → proceed to Step 2 (Select Item to Clarify)
- **"Review suggestions"** → proceed to Step 8 (Review Suggestions)
- **"I'm done"** → go to Exit Summary

After completing either a clarification round or a suggestions review round, return to this Step 1 prompt.

## Step 2: Select Item to Clarify

Use AskUserQuestion to let them pick an item:

```
Question: "Which item would you like to clarify? (Enter the priority number)"
Header: "Select Item"
Options:
  - Label: "1. {first item title}"
    Description: "Score: {N}/10 — {next action}"
  - Label: "2. {second item title}"
    Description: "Score: {N}/10 — {next action}"
  - Label: "3. {third item title}"
    Description: "Score: {N}/10 — {next action}"
  - Label: "4. {fourth item title}"
    Description: "Score: {N}/10 — {next action}"
```

Note: Only show up to 4 items per question (tool limit). If more items exist, include "Other" option for the user to type a number.

## Step 3: Summarize Current State

Before asking questions, output a summary of the selected item's current state so the user has context:

```markdown
---

## Clarifying: {Item Title}

**Current Score:** {N}/10 {multiplier if applicable}
**Requirements Clarity:** {Low|Medium|High}

**What's documented:**
{Summary of what's currently in TODOS.md for this item — existing description, any prior clarifications}

**What needs clarification:**
{List the open questions that will be asked}

---
```

This gives the user context before they start answering questions.

## Step 4: Ask Open Questions One at a Time

For the selected item, ask each open question individually using AskUserQuestion:

```
Question: "{The open question from the analysis}"
Header: "{Item title (truncated)}"
Options:
  - Label: "{Claude's recommended answer}"
    Description: "(Recommended) {Brief rationale for this recommendation}"
  - Label: "{Alternative answer 1}"
    Description: "{Why someone might choose this}"
  - Label: "{Alternative answer 2}"
    Description: "{Why someone might choose this}"
```

**Important guidelines for questions:**
- Ask ONE question at a time
- Always provide Claude's recommendation as the FIRST option with "(Recommended)" in the description
- Provide 2-3 reasonable alternatives as other options
- The user can always select "Other" to provide a custom answer
- Wait for each answer before asking the next question

## Step 5: Update TODOS.md with Clarifications

After all questions for an item are answered, update TODOS.md:

1. Find the item's section in TODOS.md
2. Add a new subsection or update the existing description with the clarifications
3. Format the clarifications clearly:

```markdown
### {Item Title}

{Original description}

**Clarifications (from Q&A {date}):**
- {Question 1}: {Answer 1}
- {Question 2}: {Answer 2}
- {Question 3}: {Answer 3}
```

Use the Edit tool to make these updates.

## Step 6: Summarize Understanding

After updating TODOS.md, output a summary of the clarified item:

```markdown
---

## Summary: {Item Title}

**Updated Score:** {N}/10 (re-evaluate based on new clarity)
**Requirements Clarity:** {Low|Medium|High} (updated)

**Current understanding:**
{2-4 sentences synthesizing what we now know about this item — the problem it solves, the approach, key decisions made}

**Implementation approach:**
{Brief description of how to implement, based on clarifications}

**Remaining questions (if any):**
- {Any questions still unanswered}

---
```

## Step 7: Check Implementation Readiness

Use AskUserQuestion to ask if the item is ready for implementation:

```
Question: "Is this item ready for implementation?"
Header: "Ready?"
Options:
  - Label: "Yes, mark as [ready]"
    Description: "Add [ready] tag to TODOS.md — item can be implemented"
  - Label: "No, needs more clarification"
    Description: "Continue Q&A on this item"
  - Label: "No, move to another item"
    Description: "Select a different item to clarify"
  - Label: "No, I'm done for now"
    Description: "Exit Q&A mode"
```

**If "Yes, mark as [ready]":**
- Add `[ready]` tag to the TODO item in TODOS.md
- Return to Step 1 (unified action prompt)

**If "No, needs more clarification":**
- Ask what additional questions need answering
- Return to Step 4 with new questions

**If "No, move to another item":**
- Return to Step 2 to select another item

**If "No, I'm done for now":**
- Go to Exit Summary

## Step 8: Review Suggestions

When the user selects "Review suggestions" from Step 1:

### 8a: Select Item with Suggestions

Show items that have research suggestions (up to 4 per prompt):

```
Question: "Which item's suggestions would you like to review?"
Header: "Suggestions"
Options:
  - Label: "1. {item title}"
    Description: "{N} suggestions"
  - Label: "2. {item title}"
    Description: "{N} suggestions"
  - Label: "3. {item title}"
    Description: "{N} suggestions"
  - Label: "4. {item title}"
    Description: "{N} suggestions"
```

If no items have suggestions, inform the user and return to Step 1.

### 8b: Review Each Suggestion

For the selected item, present each suggestion one at a time:

```
Question: "Add this suggestion to TODOS.md?"
Header: "{Item title}"
Options:
  - Label: "Yes, add"
    Description: "{first 80 chars of the suggestion text}"
  - Label: "Skip this one"
    Description: "Don't add to TODOS.md"
```

Output the full suggestion text before asking, so the user can read it in context.

### 8c: Write Accepted Suggestions

After reviewing all suggestions for the item, append accepted suggestions to the item in TODOS.md:

```markdown
**Suggestions (from research {date}):**
- {Accepted suggestion 1}
- {Accepted suggestion 2}
```

Use the Edit tool to add this section. If no suggestions were accepted, skip the write.

### 8d: Return to Main Prompt

After completing the suggestion review for one item, return to Step 1 (unified action prompt).

## Exit Summary

When exiting Q&A mode, output:

```markdown
## Q&A Session Complete

**Items clarified:** {count}
**Suggestions accepted:** {count}
{List of items that were clarified or had suggestions accepted, with brief summary of decisions made}

TODOS.md has been updated with the changes above.
```
