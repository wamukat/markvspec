---
name: markvspec-vscode-debug-port
description: "Project-specific workflow for debugging the MarkVSpec VS Code extension and preview webview through a VS Code/Electron remote debugging port. Use when the user asks to inspect a live MarkVSpec preview, Mermaid rendering, table of contents, webview DOM/CSS, focus-triggered rerenders, or any issue they expose through a local CDP port such as 9223."
---

# MarkVSpec VS Code Debug Port

Use this skill when debugging a live MarkVSpec VS Code Extension Development Host
or preview webview through Chrome DevTools Protocol (CDP).

## Defaults

- Project root: `/Users/takuma/workspace/MarkVSpec`
- Extension path: `packages/vscode-extension`
- User-provided debug port commonly used in this project: `9223`
- Project smoke helper default port: `9336`
- Smoke helper: `scripts/markvspec-vscode-devhost-smoke.sh`

If the user says a port is already open, do not launch another VS Code window
unless connection fails and they ask you to start one.

## Start Or Connect

1. If the user already started VS Code with a debug port, verify CDP first:

```bash
curl -s http://127.0.0.1:9223/json/version
curl -s http://127.0.0.1:9223/json/list
```

2. If no debug host is running and the task needs one, prefer the project helper:

```bash
MARKVSPEC_VSCODE_DEBUG_PORT=9223 npm run smoke:vscode-devhost -- examples/01-basics/login-basic.vspec.md
```

This script uses a temporary VS Code profile and extension directory, starts the
Extension Development Host, passes `--remote-debugging-port`, and opens a target
MarkVSpec file. The VS Code CLI may warn that `remote-debugging-port` is not a
known option; the important check is whether `http://127.0.0.1:<port>/json/list`
responds.

3. If launching manually, use an isolated profile:

```bash
code \
  --new-window \
  --skip-welcome \
  --disable-workspace-trust \
  --user-data-dir "$(mktemp -d /tmp/markvspec-vscode-user.XXXXXX)" \
  --extensions-dir "$(mktemp -d /tmp/markvspec-vscode-ext.XXXXXX)" \
  --remote-debugging-port=9223 \
  --extensionDevelopmentPath="$(pwd)/packages/vscode-extension" \
  "$(pwd)"
```

## Target Selection

Use `/json/list` to find targets. Useful targets usually have one of:

- title containing `MarkVSpec`
- URL containing `vscode-webview`
- URL containing `extensionHost`
- page type `page`

For preview bugs, prefer the webview target over the workbench target. If the
preview target is not present, ask the user to open `MarkVSpec: Open Preview` or
click the preview tab, then re-read `/json/list`.

## CDP Inspection Pattern

Use CDP for facts, not guesses:

1. Capture targets from `/json/list`.
2. Attach to the preview webview target.
3. Inspect DOM and CSS around the reported element.
4. Evaluate relevant state:
   - `document.readyState`
   - `document.querySelectorAll("[data-mermaid-source], .mermaid-block, .mermaid-render, .mermaid-placeholder").length`
   - `document.querySelector(".toc-list")?.textContent`
   - `getComputedStyle(element)` for visual bugs
   - `performance.getEntriesByType("resource")` for missing scripts/assets
5. Check console/runtime errors from the page.
6. Reproduce the user action if needed, then compare DOM before/after.

Keep a short log of:

- target id/title/url used
- user action reproduced
- DOM/CSS facts observed
- console errors
- suspected source file/function

## Webview-Specific Checks

For Mermaid issues:

- Check whether the source `<pre data-mermaid-source>` exists.
- Check whether `.mermaid-placeholder` is present before rendering.
- Check whether `.mermaid-render svg` appears after rendering.
- Check whether `.mermaid-block.is-source-visible` is toggled unexpectedly.
- Check whether `media/mermaid.min.js` loaded successfully.

For table of contents issues:

- Check `.toc-list` contents.
- Check headings with `document.querySelectorAll(".document h2[id], .document h3[id]")`.
- Check console errors before `initTableOfContents` or initializer wrappers.

For unexpected rerenders:

- Watch preview output logs for `[preview-update]`.
- Compare `data-mm-render-key` elements before/after the action.
- Check whether active editor changes are triggering full render or fragment patch.
- Note `generation`, `phase`, `patchReason`, and `webviewPatchMs`.

For style flashes or incorrect labels:

- Inspect the final class list and computed style of the element.
- Capture whether the class changes after Mermaid initialization or fragment patch.
- Search source for the class or renderer helper before editing.

## Output Logs

Use the MarkVSpec output channel text the user provides, and supplement with local
logs only when needed. Smoke helper prints the temporary VS Code logs directory
after the window closes. Do not kill the smoke host unless the user asks; close
the Extension Development Host normally when possible.

## Fix Workflow

1. Reproduce or verify the live state through CDP when possible.
2. Map the observed DOM/CSS/event behavior to source in
   `packages/vscode-extension/src/extension.ts` or related core renderer files.
3. Make the smallest code change.
4. Run targeted tests:

```bash
npm test -w markvspec-vscode-extension
```

5. If core parsing/rendering behavior changed, also run:

```bash
npm test -w @markvspec/core
```

6. Re-check the live preview through the debug port when the issue is visual,
timing-related, or specific to VS Code webviews.
