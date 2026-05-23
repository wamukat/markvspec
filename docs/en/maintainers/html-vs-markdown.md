# HTML vs Markdown Authoring

## Decision

MarkVSpec keeps Markdown DSL as the canonical authoring source.
HTML should be treated as a render target, preview format, import/export format,
or implementation artifact, not as the primary design-document language.

## Context

HTML is attractive because it already has a tree structure, common editor
support, and direct browser rendering. It is also close to some implementation
targets, including Thymeleaf and htmx.

MarkVSpec, however, is trying to make screen design documents readable and
reviewable by humans before implementation. The source document needs to express
screen intent, state, actions, transitions, validation, and partial updates
without requiring authors to think in DOM detail.

## Rationale

Use Markdown DSL as canonical source because:

- It keeps the document readable in ordinary Markdown viewers and code review.
- It separates design intent from implementation details such as DOM shape,
  CSS classes, Thymeleaf attributes, and htmx attributes.
- It gives stable IDs, markers, states, actions, and rules first-class places in
  the document instead of hiding them in attributes.
- It lets generated views choose the best representation for each purpose:
  wireframe HTML, printable spec HTML, Mermaid diagrams, diagnostics, static HTML
  export, and PDF export.

Do not use HTML as canonical source because:

- HTML makes visual structure easy, but workflow semantics become custom
  attributes scattered across DOM nodes.
- Large forms and action flows become harder to read than the current heading
  and bullet structure.
- It encourages implementation coupling too early, especially for Thymeleaf and
  htmx details that should remain semantic in the design document.
- It makes non-visual sections such as rules, open questions, response cases,
  and state transitions feel bolted on.

## Where HTML Fits

HTML is still useful in MarkVSpec:

- Live preview and printable design document rendering.
- Static HTML export for sharing generated specs.
- PDF export through an installed Chrome/Chromium-compatible browser.
- Implementation mapping from MarkVSpec actions and layouts to framework
  details, such as Thymeleaf fragments and htmx attributes, outside the
  MarkVSpec source document.

## Guideline

When the question is "Can this be represented as HTML?", the answer is usually
yes. The better MarkVSpec question is "Can a human quickly read and change this as
a design document?" Markdown DSL is the better primary source for
that goal.
