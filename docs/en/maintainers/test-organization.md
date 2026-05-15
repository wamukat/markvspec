# Test Organization

## VS Code Extension

- `packages/vscode-extension/src/extension.test.ts`
  - Covers cross-cutting extension behavior such as the preview shell, document rendering, project preview, export, code actions, and formatting.
- `packages/vscode-extension/src/state-views.test.ts`
  - Covers State Views-specific regressions such as viewport/state current-spec rendering, repeated markers, and layout signatures.

Some early State Views tests still live in `extension.test.ts`.
New State Views behavior and repeated-content changes should be added to `state-views.test.ts`; when existing tests are touched, move them gradually.
Prefer extracting the relevant state/viewport section, row, fragment, or read model instead of asserting against the full HTML with broad regular expressions.

## Core

`packages/core/src/index.test.ts` should be split in this order:

1. Parser / action parser / Markdown section AST.
2. Renderer / layout resolution / State Views signatures.
3. Validator / diagnostics / route and model path checks.
4. Project loader / project parser / composition / graph.

When adding a new feature, create the dedicated test file for the relevant responsibility first instead of appending more tests to `index.test.ts`.
