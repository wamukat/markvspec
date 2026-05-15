# MarkVSpec VS Code Extension

MarkVSpec provides live preview, diagnostics, and syntax highlighting for
`.vspec.md` screen specification files.

## Get Started

Open a `.vspec.md` file, then open the preview from one of these entry points:

- Run `MarkVSpec: Open Preview` from the Command Palette.
- Click the preview icon in the editor title.
- Right-click the file in Explorer and select `Open Preview`.

The preview updates as the document changes. Parser diagnostics are also
published to VS Code Problems for `.vspec.md` files. The preview toolbar
shows the rendered file path so the current target is visible when switching
between MarkVSpec files.

Use `MarkVSpec: Export Static HTML` to write a standalone HTML file for the
active MarkVSpec document. Use `MarkVSpec: Export PDF` when you need a PDF.

For current preview/export limitations, including PDF export requirements, see
[Known limitations](https://github.com/wamukat/MarkVSpec/blob/main/docs/en/user/limitations.md).

## Bundled Examples

The active `examples/` directory is a learning path:

- `examples/01-basics/hello-screen.vspec.md` is the smallest useful document.
- `examples/01-basics/login-basic.vspec.md` covers form layout and auth states.
- `examples/02-states/async-loading.vspec.md` covers request send and response states.
- `examples/02-states/model-samples.vspec.md` covers list-first Model Samples and supplemental empty table syntax.
- `examples/02-states/responsive-profile.vspec.md` covers mobile and desktop layouts.
- `examples/03-actions/event-triggers.vspec.md` covers non-click events and lifecycle triggers.
- `examples/03-actions/form-submit-flow.vspec.md` covers validation, model update, server call, and navigation.
- `examples/03-actions/parallel-initial-load.vspec.md` covers parallel server calls and `Resolve`.
- `examples/04-real-world-screens/notice-detail.vspec.md` covers Display Content Spec fields.
- `examples/04-real-world-screens/profile-edit-rich.vspec.md` covers extended form, media, list, and dialog element types.
- `examples/04-real-world-screens/search-list.vspec.md` covers search, filters, pagination, and Model Samples.
- `examples/05-reuse/template-shell.vspec.md` covers template slots.
- `examples/05-reuse/profile-page-with-template.vspec.md` covers template composition, route params, and partial refresh.
- `examples/05-reuse/profile-summary.partial.vspec.md` covers partial routes and partial-local states.
- `examples/06-structured-sections/history-and-errors.vspec.md` covers Error Codes, History Fields, and History.

The active examples use short heading markers such as `L1`, `1`, and `A1` for
preview readability; MarkVSpec references still use stable IDs such as
`L-LoginPage`, `E-PageTitle`, and `A-SubmitLogin`.

## Local Development

From the repository root:

```sh
npm install
npm run build
```

Then open this repository in VS Code, select `Run MarkVSpec Extension`, press
`F5`, and open the preview from the editor title, Explorer context menu, or
`MarkVSpec: Open Preview` in the extension development host.

To install a locally built VSIX:

```sh
npm run package:vsix -w packages/vscode-extension
code --install-extension dist/markvspec-<version>.vsix
```

## Realtime Preview Smoke Check

Use this quick check after changing preview update behavior:

1. Open `examples/01-basics/login-basic.vspec.md`.
2. Run `MarkVSpec: Open Preview`.
3. Open the `MarkVSpec` output channel.
4. Toggle Layout, Element, and Action markers and confirm marker labels remain
   readable in the wireframe and generated document.
5. Edit an existing Element display value, such as a `value:` or `placeholder:`
   line, without saving.
6. Confirm the preview updates after the debounce window and the output contains
   `phase=fragment-patch`, `patchSuccess=true`, and `patchReason=applied`.
7. Add or remove an Element or Layout item.
8. Confirm the preview still updates and the output contains `phase=full-render`
   with a full render reason.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm run package:vsix -w packages/vscode-extension
```
