# Reference Vocabulary Audit

`npm run audit:docs-reference-vocabulary` checks Reference pages against the
grammar definition.

The audit reads `docs/{en,ja}/reference/**/*.md`. It does not read generated
`docs-site/src/content/docs/` files.

## Scope

The audit intentionally starts with Reference pages only.

It checks:

- MarkVSpec-like fenced code blocks in Reference pages.
- Section headings inside those code blocks.
- Generated Reference tables that list structured item keys.
- Vocabulary diagnostics from the parser, including extension items and unknown
  structured items that normal validation may report as `info`.

It does not scan arbitrary prose. Prose contains examples, comparisons, and
natural language; treating every inline code span as a grammar claim would create
noise. If a prose area needs stricter checking, first move the vocabulary into a
fenced code block or a generated Reference table.

## Source Of Truth

The audit uses `packages/core/dist/grammar-definition.js`, generated from
`packages/core/src/grammar-definition.ts`. It does not parse the rendered BNF
Markdown.

`npm run check:generated-docs` remains responsible for proving that generated
Reference blocks are up to date. `audit:docs-reference-vocabulary` is a second
guard for hand-written Reference examples and generated table vocabulary.

## Release Check

`npm run check:release` includes `npm run audit:docs-reference-vocabulary`.
