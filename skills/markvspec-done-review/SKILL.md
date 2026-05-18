---
name: markvspec-done-review
description: "Project-specific workflow for MarkVSpec Kanban todo implementation and completion. Use when picking todo tickets or before moving any MarkVSpec Kanbalone ticket to done. Requires blocker-aware ticket selection, implementation, verification, commit, independent sub-agent review, Kanban comment, and done transition."
---

# MarkVSpec Done Review

Use this skill when working through MarkVSpec Kanbalone `todo` tickets, and before
moving any MarkVSpec Kanbalone ticket to `done`.

## Rule

When the user asks to process todo tickets, the assistant's role is to pick
todo tickets, implement them, commit the work, require sub-agent review, fix
review findings, and keep going until the requested todo set is exhausted or
blocked.

Never move a MarkVSpec ticket to `done` until an independent sub-agent has reviewed
the completed local changes.

When accepting tickets from the `acceptance` lane, do not rely only on implementer
comments, passing tests, or a sub-agent's "no blocking findings" summary. The
acceptance reviewer must inspect the actual output that the user will see,
especially for preview, document, export, print, table, marker, chip, layout,
style, and i18n changes.

This applies to all tickets on:

- Board URL: `http://localhost:3470/boards/7`
- Board ID: `7`

## Todo Pickup Workflow

1. Use `kanbalone-api` to read board `7` and identify tickets in the `todo` lane.
2. Pick tickets in blocker order:
   - Do not start a ticket while any blocker is incomplete.
   - Prefer the lowest todo position among currently unblocked tickets.
   - When a blocker is completed during the session, continue to newly unblocked dependent tickets.
3. If a ticket is blocked by an incomplete ticket outside the requested set, report it and continue other unblocked todo tickets.
4. Move the active ticket to `doing` before implementation.
5. Keep changes scoped to the active ticket unless two tickets are tightly coupled and the blocker order justifies a grouped commit.
6. Commit intentionally after each coherent ticket or tightly coupled ticket group.
7. Use the required pre-done review workflow below before moving each ticket to `done`.

## Acceptance Review Workflow

Use this workflow when the user asks to accept tickets, review the `acceptance`
lane, or move completed work to `done`.

1. Read each candidate ticket and its latest implementation comments.
2. Confirm that an independent sub-agent review is recorded. If it is missing,
   do not accept the ticket.
3. Review the implementation diff, not only the comment summary.
4. Run verification in a separate git worktree when the user or workspace state
   requires isolation. Do not run tests in the main workspace if another agent is
   working there.
5. For UI, preview, generated document, export, PDF, print, style, marker/chip,
   table, i18n, or example changes, inspect generated output:
   - generate or open the relevant HTML preview/export
   - generate PDF/print artifacts when the ticket affects print or PDF behavior
   - inspect the affected sections directly, not only the existence of files
   - compare the result against the user's stated design intent and recent
     product decisions, not only the ticket's narrow acceptance criteria
6. Check at least one representative target example and any obvious related
   examples. If a change claims a cross-cutting rule, sample across the relevant
   table/section families.
7. Look for visual and semantic regressions the user would notice immediately:
   - unreadable wrapping or wasted column width
   - marker-only, ID-only, and Marker/ID chip representation mixed without a rule
   - table columns that contradict recent naming or display decisions
   - duplicated, missing, or stale localized text
   - hidden scrollbars, clipped content, overlapping labels, or print overflow
   - behavior that satisfies a CSS/string test but fails the actual preview
8. If the output is poor or inconsistent, create or update a follow-up ticket
   before moving anything to `done`. If the flaw invalidates the current ticket's
   acceptance, add a review comment and move the ticket back to `todo`.
9. If accepting the ticket, add a Kanbalone comment that states both:
   - commands/tests that passed
   - concrete generated outputs or sections inspected
10. Move the ticket to `done` with `isResolved: false` unless the user explicitly
    asks to resolve it.

For visual tickets, "tests passed" is never enough by itself. If the reviewer did
not inspect the resulting preview/export/PDF, the ticket is not accepted.

## Required Workflow

1. Finish the implementation and run relevant local verification.
2. Spawn a sub-agent for an independent review.
3. Ask the sub-agent to review the diff and focus on bugs, regressions, missing
   validation, missing tests, project convention violations, and Kanban acceptance
   criteria.
4. Give the sub-agent enough context:
   - ticket ID and title
   - acceptance criteria
   - changed file list
   - verification commands and results
   - relevant docs such as `AGENTS.md`, `docs/en/design-spec.md`,
     `docs/en/dsl.md`, `docs/ja/design-spec.md`, or `docs/ja/dsl.md`
5. Do not ask the sub-agent to implement changes unless the review explicitly
   finds issues and the user authorizes delegation.
6. Address all blocking review findings locally.
7. If changes were made after the review, run verification again. For material
   changes, request another sub-agent review.
8. Add a Kanbalone comment summarizing:
   - commit SHA(s)
   - reviewer/sub-agent result
   - issues found, if any
   - fixes made after review
   - verification commands
9. Only then move the ticket to `done`. If the user explicitly asked to complete
   the ticket, use `isResolved: true`; otherwise follow the ticket workflow
   requested in the current conversation.

## Review Prompt Template

Use a prompt like:

```text
Review MarkVSpec ticket <ID>: <title>.

Context:
- Project notes: read AGENTS.md.
- Relevant spec docs: <paths>.
- Acceptance criteria: <paste criteria>.
- Changed files: <list>.
- Verification run: <commands and pass/fail result>.

Task:
Perform a code-review style check of the current local changes for this ticket.
Prioritize bugs, regressions, missing validation, missing tests, and mismatches
with AGENT.md or the relevant docs. Do not edit files. Return findings ordered
by severity with file/line references where possible. If there are no blocking
findings, say so clearly and mention residual risks.
```

## Kanbalone Comment Template

```text
Pre-done review completed.

Reviewer result:
- <summary>

Fixes after review:
- <none or list>

Verification:
- `<command>` passed.
```

## If Sub-Agents Are Unavailable

Do not move the ticket to `done`. Add a Kanbalone comment:

```text
Blocked from moving to done: sub-agent review is required but unavailable.
```

Leave the ticket in `doing`.
