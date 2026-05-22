# Online Live Editor Direction

This note defines where the Online Live Editor fits in MarkVSpec. It covers the
MVP through the first production-readiness decision. It is not an immediate
replacement for the VS Code extension or CLI export.

## Purpose

The Online Live Editor should let people try MarkVSpec syntax while seeing
preview and diagnostics update immediately. Initially it is an entry point for
learning, evaluation, editing examples, and sharing short screen specs, not the
primary environment for maintaining production design documents.

## Initial Users

- People reading docs-site examples who want to try MarkVSpec
- Evaluators who want to feel the syntax and preview before installing VS Code
- Developers who want to paste a short `.vspec.md` and inspect diagnostics or a wireframe
- Team members explaining MarkVSpec authoring conventions

Long-term screen spec authoring, multi-file projects, and template / partial
workflows remain centered on the VS Code extension and CLI for now.

## MVP Scope

In scope:

- Editing one `.vspec.md` source
- Immediate parse / validate / render updates
- Diagnostics display
- Loading source from docs-site examples
- Preview display
- Source reset
- Source copy or download
- Fallback to existing generated HTML previews

Out of scope:

- Authentication
- Server-side persistence
- Collaborative editing
- Multi-file editing from a project index
- Template / partial editing UI
- GitHub integration
- Persistent share URLs
- VS Code extension parity for file watching, workspace boundaries, or external message file lookup

Examples that use template / partial documents may be shown in read-only preview,
but editable MVP work starts with one screen source.

## VS Code Extension Boundary

The VS Code extension remains the main path for sustained work inside a real
project. It owns workspace file references, template / partial composition,
project preview, diagnostics, and export workflows that depend on local files.

The Online Live Editor is the lightweight browser-only entry point. Because it
has no workspace, it must not depend on filesystem lookup or project-wide file
loading. Its API surface should be limited to browser-safe parser, renderer, and
diagnostics capabilities.

## Docs-Site Entry

The initial entry should live inside docs-site as an experimental route.
Read-only dynamic preview may be introduced as an example display improvement,
but the editable editor should not be wired directly into production example
navigation at first. It should start behind an explicit experimental route,
feature flag, or non-public route.

Promotion to a production entry requires:

- Existing generated HTML preview fallback when source fetch, parse, or render fails
- Core docs remain readable with JavaScript disabled
- Bundle size and first render time do not harm docs-site browsing
- Diagnostics and preview behavior do not contradict the VS Code extension
- Representative examples are verified in a real browser runtime

## Persistence And Sharing

The MVP does not include server persistence. Consider options in this order:

1. Local only: edit in the browser, then copy or download the source.
2. URL encoded snapshot: store only short source text in the URL fragment.
3. Gist / GitHub handoff: let the user explicitly send the source to external storage.
4. Server persistence: consider only after authentication, visibility, deletion, and audit needs are clear.

Initial implementation adopts option 1. Later options need separate tickets.

## Browser-Safe Core API

#1381 confirmed that a browser bundle can be produced from `packages/core/dist/browser.js`.
The minified bundle is 412.9 KiB, gzip is 112.8 KiB, and the browser bundle has
0 Node built-in inputs.

The formal Online Live Editor API is `@markvspec/core/browser`. The browser
entry exposes `parseMarkVSpec`, `validateMarkVSpec`,
`evaluateMarkVSpecDiagnostics`, `renderDiagnosticMessageForLocale`,
`renderMarkVSpecHtml`, the HTML fragment renderers,
`renderMarkVSpecHtmlWithInvalidation`, and built-in locale message resolution.

The root entry still includes Node-only renderer message file loading, so it is
not treated as browser-safe. Renderer message overrides that require filesystem
lookup, project loading, and workspace references must stay out of the browser
entry; browser callers should use built-in locale messages or explicitly
supplied messages.

`npm run check:core-browser` bundles `@markvspec/core/browser` for a browser
target and verifies that no Node built-in inputs are included and that the gzip
size stays within budget. This check is included in the release check.

Dynamic preview on docs-site also requires publishing `.vspec.md` source files
as public assets or providing an equivalent source endpoint.

## Follow-Up Tickets

- #1383: defined `@markvspec/core/browser` as a public subpath and fixed the
  browser-safe API contract versus Node-only API boundary.
- #1384: add read-only dynamic preview to docs-site examples and verify source
  fetch plus generated HTML fallback.
- #1385: build the editable Online Live Editor PoC behind an experimental,
  feature-flagged, or non-public route.
