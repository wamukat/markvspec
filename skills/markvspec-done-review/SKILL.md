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
   - relevant docs such as `AGENT.md`, `docs/en/design-spec.md`,
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
- Project notes: read AGENT.md.
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
