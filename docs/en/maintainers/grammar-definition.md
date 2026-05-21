# Grammar Definition Maintenance

`packages/core/src/grammar-definition.ts` is the source of truth for recognized
sections and structured item keys. Parser behavior, diagnostics, generated
grammar docs, and generated reference tables must stay aligned with that file.

## When You Change The Grammar Definition

1. Update `packages/core/src/grammar-definition.ts`.
2. Update parser, validator, renderer, examples, and tests that consume the
   changed section or structured item.
3. Run `npm run docs:grammar` and `npm run docs:reference`.
4. Review the generated blocks in both root docs and docs-site docs.
5. Run the checks below before release or handoff.

```bash
npm run check:generated-docs
npm test
npm run audit:examples
npm run check:docs-site
```

`docs:grammar` regenerates the full grammar reference pages. `docs:reference`
regenerates only the managed reference tables between
`markvspec-generated:*:start` and `markvspec-generated:*:end` markers.

Do not hand-edit generated grammar pages or generated reference blocks. If a
generated table is wrong, fix the grammar definition or the generator script,
then regenerate.

## Release Gate

`npm run check:release` includes:

- `npm run check:generated-docs`
- `npm test`
- `npm run audit:examples`
- `npm run check:docs-site`
- print regression and README release checks

This keeps grammar docs, reference docs, parser contract tests, examples, and
the docs site in one release gate.
