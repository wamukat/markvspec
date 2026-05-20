---
title: "Concepts"
---

This section explains the product ideas behind MarkVSpec.

MarkVSpec is a Markdown-first format for screen specifications. It is designed
for product work where a screen should be easy to read, review, version, preview,
and edit with AI assistance.

## Text-first, Not Visual-first

Modern UI design tools usually start from a canvas. MarkVSpec starts from text.
That choice makes the source suitable for:

- pull request reviews and line diffs
- Git history and local-first workflows
- AI edits that can preserve structure
- lightweight authoring in VS Code
- low-fidelity preview and export from the same source

The preview matters because Markdown is readable, but it is not a visual design
surface. The VS Code preview gives immediate feedback while the Markdown remains
the canonical source.

## Screen-first Authoring

One `.vspec.md` file describes one screen. Componentization can happen in the
implementation, but the primary authoring model stays screen-oriented so product,
design, and engineering reviewers can discuss behavior in one place.

Screen-first does not mean components cannot be reused. At the specification
stage, first collect the screen, states, main actions, and server interaction in
one file. Whether implementation later splits it into components, partials, or
templates is an implementation design decision.

## What MarkVSpec Is Not

MarkVSpec is not:

- a pixel-perfect design tool
- a replacement for CSS, HTML, or framework components
- a place to define API schemas or database schemas
- a wrapper for copying implementation attributes into a document

MarkVSpec covers information that belongs in a screen specification: what is on
the screen, which states exist, and what happens when the user acts.

## Semantic UI Specs

MarkVSpec describes intent instead of raw CSS or framework attributes.

- `variant` describes priority, such as `primary` or `secondary`.
- `tone` describes semantic intent, such as `warning` or `danger`.
- `Process Pn:` and `request` / `receive` describe what an action does.
- `case:` and `display` describe state changes and partial updates.

This keeps the document useful across implementation stacks while still being
structured enough for validation and rendering.

## AI-friendly And Git-friendly

MarkVSpec source is plain text. That makes it practical for both AI assistance
and Git review:

- Reviewers can read line-level diffs in pull requests.
- AI tools can use Markdown headings and IDs to edit a bounded section.
- The source stays canonical instead of a generated preview or export.
- A local folder and VS Code are enough for authoring and preview.

AI-friendly does not mean prose-only. If everything is vague prose, preview and
validation become weak. Keep both human-readable explanation and tool-readable
structured body.

## Read Next

- [Start](../start/)
- [Guide: Document Structure](/markvspec/en/guide/document-structure/)
- [Guide: Markdown Model](/markvspec/en/guide/markdown-model/)
- [Guide: Actions](/markvspec/en/guide/actions/)
- [Reference](../reference/)
- [Examples](/markvspec/en/examples/)
