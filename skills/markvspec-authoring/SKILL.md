---
name: markvspec-authoring
description: Use when creating or editing MarkVSpec `.vspec.md` screen specifications, especially from requirements notes, screen ideas, or existing Markdown design material.
---

# MarkVSpec Authoring

Use this skill when creating or editing `.vspec.md` files.

MarkVSpec is a Markdown-first screen specification format. Keep the document semantic and implementation-neutral:

- One `.vspec.md` file describes one screen.
- YAML Front Matter is only for document-level metadata.
- Markdown headings declare screens, layouts, elements, actions, rules, and related objects.
- Markdown bullets declare properties, rules, conditions, transitions, and effects.
- Do not use Markdown tables as canonical source.
- Do not write raw CSS classes, raw colors, dimensions, or htmx attributes into the specification.
- Model htmx-style behavior with semantic Actions, Process steps, process-local `case:` branches, and `display:` effects.

For non-trivial authoring, read the bundled reference first:

- `references/dsl-authoring-reference.md`

When the local project also has DSL docs, use them as the canonical release source before substantial or uncertain edits:

- `docs/en/user/dsl.md`
- `docs/ja/user/dsl.md`
- nearby parser-tested examples under `examples/`

Do not rely on older snippets or memory when these docs are present. This skill is still expected to work when installed outside the repository, so the bundled reference and canonical patterns below must be enough to draft a valid `.vspec.md` without the repository docs.

## CLI Availability

This skill is normally installed by the MarkVSpec CLI, so assume the `markvspec` command should be available in the user's environment.

If `markvspec` is not available or a required command fails because of environment setup:

- Do not pretend validation or diagnosis passed.
- Continue only when the requested edit can be made safely from the source text.
- Report the exact command you tried, the failure summary, and the validation or diagnosis risk that remains.
- If the task is to create a new `.vspec.md` from underspecified input and `diagnose input` cannot run, ask for either CLI availability or enough missing screen details before producing a confident spec.

## Before Creating A Spec

When starting from a requirements note, screen idea, meeting note, API note, or other Markdown input that is not yet `.vspec.md`, run:

```bash
markvspec diagnose input <markdown-file>
```

Read the JSON report yourself. Do not paste the raw report back to the user. Use it to summarize missing information, confirmation questions, warnings, and the next edits needed before or during authoring.

The report uses the current `ai-input-diagnostics/v1` schema. Pay attention to:

- `readinessLevel`
- `readinessScore`
- `missingInformation`
- `questions`
- `findings`
- `axes`

Treat these as readiness, missing information, confirmation questions, warnings/errors, and evidence for whether the input is specific enough for AI-assisted screen specification work.

Use `readinessLevel` to decide how far to proceed:

- `ready`: proceed with authoring, while still carrying any minor findings into the edit plan.
- `needs-clarification`: proceed only when the missing points are not blocking the screen structure; otherwise ask targeted questions first. If drafting is useful, keep unresolved items in `## Open Questions`.
- `high-risk`: do not produce a confident final spec. Ask targeted confirmation questions first, or create only an explicitly marked draft with unresolved items in `## Open Questions`.

If substantial screen states, layout structure, actions, API behavior, validation rules, permissions, errors, or partial update targets are missing, do not silently fill gaps as facts.

When the user already provides a `.vspec.md` file to edit, do not run `diagnose input` by default. Use `diagnose input` only when you are also converting or reinterpreting a separate requirements note, screen idea, meeting note, API note, or other non-`.vspec.md` source.

## Creating Or Editing `.vspec.md`

Follow the project DSL conventions. Prefer these section names when applicable:

- `## States`
- `## Layout`
- `## Elements`
- `## Events`
- `## Actions`
- `## Rules`
- `## Preview Scenarios`
- `## Notes`
- `## Open Questions`

Use stable semantic IDs:

- `SCR-*` for screens
- `L-*` for layout groups
- `E-*` for elements
- `A-*` for actions
- `R-*` for rules
- `V-*` for validation contracts
- `PRT-*` for partial documents

When editing an existing `.vspec.md`, preserve the local authoring style unless it conflicts with the DSL:

- Keep the existing heading levels, section order, ID naming style, and bullet shape.
- Keep existing Layout structure such as `### L-*` groups and `#### Items` subsections.
- Add or change only the screen parts required by the request.
- Prefer extending existing States, Layout, Elements, Actions, Rules, Notes, and Open Questions sections over creating duplicate sections.

When creating a new `.vspec.md`, choose the output path in this order:

1. Use the path explicitly requested by the user.
2. If the user names a target directory or existing project convention, follow it.
3. If converting a nearby requirements file and no convention is visible, place the new `.vspec.md` next to that source file.
4. If the repository has an obvious examples or specs directory and the task is an example/spec addition, follow that local convention.
5. If none of the above is safe, ask before creating the file.

Element guidance:

- Use `Heading` with `level: 1..6`; do not invent `H1` through `H6` element types.
- Use `Paragraph` for prose.
- Use `Text` for short labels, values, and compact text.
- Use `variant` for priority: `primary`, `secondary`, `tertiary`.
- Use `tone` for semantic intent: `neutral`, `info`, `success`, `warning`, `danger`.
- Avoid low-level styling properties such as `size`, raw colors, CSS classes, `width`, or `height`.

Action guidance:

- Do not write a `Triggered` block. Connect user-triggered actions from Elements with `action: A-*`; use `action event:` for non-default events such as `change`, `blur`, `submit`, or `close`.
- Use `## Events` for lifecycle triggers such as `page.load`.
- Start an Action with `From` and one or more `Process <marker>: <name>` steps.
- Put result branches directly under the Process as `case: <name>`.
- Put `Effects` under a `case:` branch, or omit `case:`/`Effects` only for a deterministic immediate Process such as a direct `navigate:`.
- Put `stop` or `continue` directly under the `case:` branch, after `Effects`.
- Do not write Action-level `Effects`, Action-level `Cases`, legacy `cases:` blocks, `update:`, or `HttpRequest` process types.
- Use `request:` with `method`, `path`, and `params` for HTTP contracts. Use `server:`, `sync:`, or `receive:` when those better describe the step.

For server interactions, partial updates, Preview Scenarios, and complete examples, read `references/dsl-authoring-reference.md` and the closest file under `references/examples/` before drafting. Keep these patterns semantic: use `request:`, process-local `case:`, and `display:` effects instead of raw `hx-*` attributes or legacy update syntax.

## After Editing A Spec

After creating or editing `.vspec.md`, validate it:

```bash
markvspec validate <file-or-glob> --fail-on-warnings
```

Use `--fail-on-warnings` for AI-agent work so warnings are treated as failures. Fix diagnostics when they reflect actual DSL, reference, or authoring issues. If a warning is intentionally left unresolved, explain why and keep the remaining risk visible.

Classify validation results before fixing:

- Fix syntax, schema, duplicate ID, broken reference, invalid section structure, and unsupported DSL diagnostics directly when the intended correction is clear.
- For diagnostics caused by missing product information, do not invent facts; ask a targeted question or record the uncertainty in `## Open Questions`.
- For intentional warnings that remain, report the warning, the reason it remains, and the user-visible risk.
- Re-run validation after fixes when the CLI is available.

For a lighter manual check, `markvspec validate <file-or-glob>` is available, but the standard AI-agent workflow should use `--fail-on-warnings`.

## Reporting Back

Summarize:

- what spec files changed;
- what gaps or confirmation questions came from `diagnose input`, if used;
- what `validate` command ran;
- whether validation passed, failed, or passed with intentionally accepted warnings.
