# Release Checklist

This document defines the verification gate for the MarkVSpec `0.6.2` release.
The release target is a VS Code Marketplace package plus npm packages under the
`@markvspec` scope, including the CLI package `@markvspec/cli`.

## Release Scope

- Parse one `.vspec.md` screen file.
- Validate IDs, references, duplicate markers, layout viewport coverage, and
  action structure.
- Render a low-fidelity wireframe and generated design document.
- Render State Views and Mermaid state-flow diagrams.
- Provide VS Code live preview, syntax highlighting, diagnostics, and marker
  toggles.
- Support responsive layout sections through `## Layout: <viewport>`.
- Package the VS Code extension as a VSIX for Marketplace publishing and local
  installation.
- Package and publish the CLI as the npm package `@markvspec/cli`.
- Export the active MarkVSpec design document to standalone static HTML.
- Export the active MarkVSpec design document to PDF through an installed
  Chrome/Chromium-compatible browser.

## Phase 4 Representative Examples

Use these examples for pre-release visual checks in VS Code preview, standalone
HTML export, and PDF export:

- `examples/01-basics/hello-screen.vspec.md`: minimum metadata and one-screen basics.
- `examples/04-real-world-screens/login-basic.vspec.md`: form layout, Form Groups, validation feedback scenarios, and authentication progress.
- `examples/02-states/scenario-samples.vspec.md`: Element samples, scenario sample overrides, and explicit empty rows.
- `examples/02-states/responsive-profile.vspec.md`: mobile / desktop responsive layout and state-specific rendering.
- `examples/03-actions/event-triggers.vspec.md`: non-click element events and lifecycle triggers.
- `examples/03-actions/form-submit-flow.vspec.md`: action flow with validation, server call, display effects, and navigation.
- `examples/03-actions/parallel-initial-load.vspec.md`: parallel server call and Resolve action flow.
- `examples/03-actions/single-field-validation.vspec.md`: focused single-field validation behavior.
- `examples/03-actions/toast-feedback.vspec.md`: non-modal Toast display and background feedback.
- `examples/04-real-world-screens/notice-detail.vspec.md`: Display Content Spec wording, data sources, format, value, and params.
- `examples/04-real-world-screens/profile-edit-rich.vspec.md`: extended form, media, list, and dialog element types.
- `examples/04-real-world-screens/search-list.vspec.md`: practical search, filters, pagination, and table sample rows.
- `examples/05-reuse/template-shell.vspec.md`: template shell, slots, and reusable structure.
- `examples/05-reuse/profile-page-with-template.vspec.md`: template composition, route params, partial host metadata, and `display.partial` refresh.
- `examples/05-reuse/profile-summary.partial.vspec.md`: partial route and partial-local states.
- `examples/06-structured-sections/history-and-errors.vspec.md`: Error Codes, History Fields, and History.

## Pre-Acceptance Quality Gate

Before accepting a normal implementation ticket, run the checks that match the
change, in this order:

1. Worktree sanity: run `git status --short` and confirm there are no unexpected
   changes.
2. Whitespace check: run `git diff --check`.
3. Unit / integration tests: run `npm test`.
4. Example preview audit: run `npm run audit:examples`.
5. Generated grammar/reference docs: run `npm run check:generated-docs`.
6. Docs site: run `npm run check:docs-site`.
7. Examples HTML export: run `npm run build -w @markvspec/cli`, then
   `node packages/cli/dist/index.js export html "examples/**/*.vspec.md" --out .work/release-html`
   and open representative HTML files in a browser.
8. For print or PDF-affecting changes, run `npm run check:print-regression`.
   If PDF export is unavailable, record that HTML artifacts were generated and
   PDF was skipped because no compatible browser was available.
9. For README, DSL, example, or release metadata changes, also run
   `npm run check:readme-release`.

`npm run check:release` is the aggregate gate for the release environment. This
repository does not add `npm run verify` at this point because `check:release`
already groups the automatable release checks, while HTML visual inspection,
optional PDF skips, and Kanbalone review steps cannot be safely completed by a
single npm script.

For large changes, concurrent-agent work, or acceptance-lane review, verify in a
separate worktree instead of the main workspace:

```bash
git worktree add .work/release-check <branch-or-sha>
cd .work/release-check
npm install
git diff --check
npm test
npm run check:generated-docs
npm run audit:examples
npm run check:docs-site
npm run check:print-regression
```

When using a worktree, record the target commit / branch, commands run, generated
HTML/PDF artifact paths, and visually inspected representative examples in the
Kanbalone comment.

Kanbalone tickets require independent sub-agent review after implementation.
Under the current ticket workflow, reviewed work moves to the `acceptance` lane
with `isResolved: false`; the user verifies the result before resolving it.

## Release Checklist

- [ ] `npm install` completes from a clean checkout.
- [ ] `git diff --check` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `npm run check:generated-docs` passes.
- [ ] `npm run audit:examples` passes.
- [ ] `npm run check:docs-site` passes.
- [ ] `node packages/cli/dist/index.js export html "examples/**/*.vspec.md" --out .work/release-html`
  exports examples HTML, and representative examples have been opened in a browser.
- [ ] `npm run check:print-regression` passes, or PDF export is explicitly skipped
  because no compatible browser is available.
- [ ] `npm run check:readme-release` passes.
- [ ] `npm run check:release` passes in the release environment.
- [ ] GitHub Actions used by `release.yml` and `pages.yml` target Node.js 24
  action runtimes, or the release notes record why no update is needed.
- [ ] Root, core, document-renderer, exporter, CLI, and VS Code extension package
  versions match the intended release version.
- [ ] VS Code Marketplace extension ID is confirmed as `wamukat.markvspec`.
  If any previous ID has already been published, the release owner has a
  deprecation, unpublish, or migration plan before publishing this package.
- [ ] Package metadata and the VSIX packaging script produce a
  `dist/markvspec-0.6.2.vsix` artifact for this release.
- [ ] `npm run package:vsix -w packages/vscode-extension` creates the expected
  `dist/markvspec-<version>.vsix` artifact.
- [ ] `npm run smoke:vscode-vsix` installs the generated VSIX into a clean
  VS Code profile, activates the packaged extension, verifies command
  registration, opens preview, and confirms diagnostics are published.
- [ ] `@markvspec/cli` package metadata, `bin.markvspec`, `files`, repository,
  homepage, bugs, and `publishConfig.access=public` are suitable for publishing.
- [ ] `npm pack --dry-run -w @markvspec/cli` limits published content to
  `dist/**` and package metadata.
- [ ] CLI package content does not include `.work`, test fixtures, unnecessary
  source files, or old `MarkMock` / `markmock` names.
- [ ] The packed CLI passes smoke tests for `markvspec validate`,
  `markvspec export html`, and `markvspec export pdf` against representative
  examples.
- [ ] Git tag name and package version are consistent before tagging.
- [ ] The npm registry `@markvspec` scope, 2FA, `access public`, and npm token or
  login state are ready.
- [ ] The generated VSIX installs into VS Code.
- [ ] `examples/04-real-world-screens/login-basic.vspec.md` opens as a MarkVSpec document.
- [ ] Preview opens from the editor title action.
- [ ] Preview opens from the Explorer context menu.
- [ ] Preview updates when switching between MarkVSpec files.
- [ ] Diagnostics appear in VS Code Problems for malformed MarkVSpec input.
- [ ] The login sample renders all viewport/state design-document sections.
- [ ] State Flow renders as a Mermaid diagram.
- [ ] `MarkVSpec: Export Static HTML` writes a standalone HTML file that opens
  outside the VS Code webview.
- [ ] `MarkVSpec: Export PDF` writes a PDF when a compatible browser is
  installed.
- [ ] README and docs links are current in both English and Japanese.
- [ ] The README preview screenshot
  `docs/assets/start/vscode-preview-clean.png` is an actual VS Code preview
  capture, and the README copy describes it as VS Code preview.
- [ ] After npm publish, `npx @markvspec/cli@latest validate ...` and
  `npx @markvspec/cli@latest export html ...` work with the published package.
- [ ] Kanbalone ticket process is followed: implementation, verification,
  independent review, Kanbalone review/verification summary comment, then move to
  `acceptance` with `isResolved: false` for user verification.

## Manual CLI npm Package Smoke Steps

### npm Workspace Package Dependency Policy

Registry-published MarkVSpec packages use the same exact version for internal
package dependencies. For the `0.6.2` release, publish packages in this order:

1. `@markvspec/core`
2. `@markvspec/document-renderer`
3. `@markvspec/exporter`
4. `@markvspec/cli`

Use exact ranges such as `"@markvspec/core": "0.6.2"` in published package
manifests. Do not use `file:` dependencies in npm-published packages; they only
work in the repository workspace. Do not use `workspace:*` for this release,
because the packed tarball must already contain registry-installable dependency
ranges without a publish-time manifest rewrite. Do not add a publish manifest
conversion step unless the release process grows a dedicated, tested manifest
generation script.

The VS Code extension is packaged as a bundled VSIX from this repository and is
not published as an npm library. Its local `file:` workspace dependencies are
kept separate from the npm package dependency policy.

1. Run `npm run build -w @markvspec/cli`.
2. Run `npm pack --dry-run -w @markvspec/cli` and inspect the package contents.
3. Create a tarball in a temporary directory with
   `npm pack -w @markvspec/cli --pack-destination <dir>`.
4. Run `tar -tf <dir>/markvspec-cli-<version>.tgz` and confirm it does not
   include `.work`, test fixtures, unnecessary source files, or old `MarkMock` /
   `markmock` names.
5. Install the tarball into a separate temporary directory and invoke it from
   the repository root as `<tmp>/node_modules/.bin/markvspec`.
6. Run `<tmp>/node_modules/.bin/markvspec validate examples/04-real-world-screens/login-basic.vspec.md`.
7. Run `<tmp>/node_modules/.bin/markvspec export html examples/04-real-world-screens/login-basic.vspec.md --out <dir>`.
8. In an environment with a compatible PDF browser, run
   `<tmp>/node_modules/.bin/markvspec export pdf examples/04-real-world-screens/login-basic.vspec.md --out <dir>`.
9. Run `npm publish -w @markvspec/cli --access public` only after the matching
   VSIX smoke test and version checks are complete.
10. After publishing, run
    `npx @markvspec/cli@latest validate examples/04-real-world-screens/login-basic.vspec.md`
    to confirm the registry package works.

## Manual VS Code Smoke Steps

1. Build and package the extension.
2. Run `npm run smoke:vscode-vsix` to verify the packaged VSIX in a clean
   profile and extensions directory.
3. Install the generated VSIX into VS Code.
4. Open this repository in VS Code.
5. Open `examples/04-real-world-screens/login-basic.vspec.md`.
6. Open preview from the editor title action.
7. Confirm the toolbar shows the source file path.
8. Toggle Layout, Element, and Action markers.
9. Switch viewport filters between `All`, `mobile`, and `desktop`.
10. Open another `.vspec.md` example and confirm the preview target changes.
11. Temporarily introduce a broken reference and confirm VS Code Problems
    reports a MarkVSpec diagnostic.
12. Run `MarkVSpec: Export Static HTML`, open the generated file in a browser,
    and confirm the design document and State Flow are readable.
13. Run `MarkVSpec: Export PDF` and confirm the PDF includes all viewport/state
    sections and a readable State Flow.

The automated VSIX smoke writes logs under `.work/vscode-vsix-smoke/`. It uses
the generated `dist/markvspec-<version>.vsix`; set `MARKVSPEC_VSIX_PATH` to test
a different artifact.

## Updating The README Preview Screenshot

The README screenshot must come from the actual VS Code screen, not from a
hand-drawn mock. Keep `hello.vspec.md` Markdown source on the left and the
MarkVSpec preview on the right. Save it as
`docs/assets/start/vscode-preview-clean.png` so Start, Guide, and README share
the same real capture.

After capturing it, inspect the image and confirm that the source, preview
toolbar, and wireframe are immediately visible, and that README copy describes
it as VS Code preview.

For a direct Extension Development Host smoke run, build the extension first and
then use:

```bash
npm run build -w packages/vscode-extension
npm run smoke:vscode-devhost
```

This starts VS Code with an isolated profile, an empty extensions directory,
`--skip-welcome`, and `--disable-workspace-trust`. After the smoke run, close the
Extension Development Host window normally. Avoid `pkill` / `kill`; VS Code logs
that as `crashed with code 15`, which is easy to confuse with a real extension
host crash.

## Known Limitations

- PDF export requires an installed Chrome, Edge, Brave, or Chromium browser.
  When none is available, export static HTML and print from a browser.
- MarkVSpec is single-screen-first. Cross-file screen indexes and project-wide
  transition graphs are supported through project index documents.
- Componentization is intentionally out of scope for the authoring format.
  Implementation components may be derived later.
- The renderer is low-fidelity by design and is not a design-system renderer.
- PDF quality depends on the installed browser's print engine, especially for
  very large wireframes or state-flow diagrams.
- Mermaid rendering in preview and static HTML export depends on the bundled
  Mermaid asset. If rendering fails, the design document keeps readable Mermaid
  source as fallback.
- Formatter, snippets, document symbols, and quick fixes are included in the VS
  Code extension.
