# MarkVSpec Renderer Message Dictionary

## Purpose

The renderer message dictionary lets a project override fixed MarkVSpec UI text in preview, HTML export, PDF export, and generated design documents.
It is separate from business-screen labels and messages authored in a `.vspec.md` file.
Business screen specs may mark text with `source: i18n` when the wording is translation-backed, but they should not contain implementation message keys; renderer messages describe MarkVSpec-generated headings, table names, column names, condition labels, empty states, and other chrome.

## Quick Start

Place `markvspec.messages.en.yml`, `markvspec.messages.ja.yml`, or `markvspec.messages.yml` next to the target file or in a parent directory.

```yaml
locale: en
messages:
  formControls: Form Controls
  conditionHiddenShort: Hidden
  noVisibleElements: No visible elements
  wireframe: Wireframe
```

For HTML / PDF export, pass an explicit dictionary with `--messages <path>`:

```bash
npx @markvspec/cli@latest export html examples/04-real-world-screens/login-basic.vspec.md --out dist --messages markvspec.messages.en.yml
npx @markvspec/cli@latest export pdf examples/04-real-world-screens/login-basic.vspec.md --out dist --messages markvspec.messages.en.yml
```

From a repository checkout, run `npm run build -w @markvspec/cli` first and then use `node packages/cli/dist/index.js export ...`.

When `--messages` is omitted, MarkVSpec resolves messages in this order: Front Matter `messages`, default files, then the built-in dictionary.
Invalid dictionary files and unknown keys are reported as warnings; known keys fall back to the built-in dictionary and export continues.

## Scope

Included:

- Generated design document section headings.
- Preview and generated-document table names, column names, and fixed labels.
- Condition labels such as `visible`, `hidden`, and `disabled`.
- Generated helper text such as `None.`, scenario sample empty-row messages, and `No visible elements`.

Excluded:

- Business-screen button labels, field labels, and message text.
- Business-screen i18n dictionaries or implementation message keys.
- DSL keywords themselves.
- VS Code command names, notifications, and editor-only errors.

## File Format

YAML is the standard format; JSON is accepted by the same loader.

Recommended file names:

- `markvspec.messages.yml`
- `markvspec.messages.en.yml`
- `markvspec.messages.ja.yml`

Shape:

```yaml
locale: en
messages:
  formControls: Form Controls
  conditionHiddenShort: Hidden
  noVisibleElements: No visible elements
  wireframe: Wireframe
```

`locale` is optional. If omitted, the target document Front Matter locale or the default locale is used.

## Resolution Order

1. CLI explicit `--messages <path>`.
2. Front Matter `messages: <path>`.
3. Workspace / project defaults:
   - From the target file directory upward, search `markvspec.messages.<locale>.yml` / `.yaml` / `.json`.
   - If no locale file exists, search `markvspec.messages.yml` / `.yaml` / `.json`.
4. Built-in dictionary.

More specific dictionaries override less specific dictionaries by key.

Search boundaries:

- VS Code preview stops at the workspace root.
- CLI / export with a project index stops at the project file directory.
- CLI / export with a single `.vspec.md` input stops at the current working directory. If the input is outside the current working directory, only the input file directory is checked.

## Path Resolution

- CLI explicit paths are resolved relative to the current working directory.
- Front Matter `messages` paths are resolved relative to the MarkVSpec file.
- Default search starts from the MarkVSpec file directory and walks upward.
- VS Code preview refuses explicit or Front Matter paths outside the workspace and returns a warning diagnostic.
- CLI / export accepts explicit absolute paths. Front Matter and default search remain anchored to the input file.

## Fallback Rules

- Missing external keys fall back to the built-in dictionary.
- Keys that do not exist in the built-in dictionary are reported as unknown-key warnings and ignored.
- Non-string values are reported as invalid-value warnings and ignored.
- Missing, unreadable, or invalid YAML / JSON dictionary files produce warning diagnostics and rendering continues with the built-in dictionary.

## Locale

The MarkVSpec locale selects the built-in dictionary.

- `locale: ja` uses built-in Japanese messages.
- `locale: en` or omitted locale uses built-in English messages.
- If an external dictionary declares a locale that differs from the resolved document locale, MarkVSpec reports a warning diagnostic but still applies the explicit overrides.
- Locale-specific default files such as `markvspec.messages.<locale>.yml` take precedence.

## Shared API

The shared loader lives in core. The VS Code extension, document renderer, exporter, and CLI should use the same API.

Expected API shape:

```ts
resolveRendererMessages({
  locale,
  sourcePath,
  explicitPath,
  frontMatterPath,
  readFile,
  fileExists,
  workspaceRoot
})
```

The result includes:

- Resolved `messages`.
- Resolved `locale`.
- External file path used, when any.
- Diagnostics / warnings.

## Export Reproducibility

HTML export writes the external message file path as a metadata comment when one is used.

```html
<!-- MarkVSpec messages: /path/to/markvspec.messages.en.yml -->
```

PDF export goes through HTML, so it preserves the same metadata comment.
CLI warnings are reported through the same diagnostics path used by validation.
