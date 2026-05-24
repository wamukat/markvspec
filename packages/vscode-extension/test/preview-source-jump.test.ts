import assert from "node:assert/strict";
import test from "node:test";
import * as vscode from "vscode";
import { revealPreviewSourceLocation } from "../src/extension.js";
import { previewSourceJumpTargetFromMessage } from "../src/preview-source-jump.js";
import { renderPreviewClientScript } from "../src/preview-client-script.js";

const clientMessages = {
  action: "Action",
  element: "Element",
  hideContents: "Hide contents",
  layout: "Layout",
  contentsEmpty: "No sections.",
  contentsError: "Unable to build contents.",
  contentsLoading: "Building contents...",
  mermaidHideSource: "Hide source",
  mermaidRenderFailed: "Unable to render diagram.",
  mermaidRendering: "Rendering diagram...",
  mermaidShowSource: "Show source",
  showRepeatedContent: "Show repeated content",
  showContents: "Show contents",
  sourceJumpHint: "Double-click or press Enter to jump to source",
  sourceJumpUnavailable: "Source location unavailable"
};

interface VscodeMock {
  readonly openedDocuments: Map<string, unknown>;
  readonly shownDocuments: Array<{ readonly document: unknown; readonly column: number; readonly editor: { selection?: unknown } }>;
  readonly revealedRanges: Array<{ readonly range: { readonly start: { readonly line: number; readonly character: number }; readonly end: { readonly line: number; readonly character: number } }; readonly revealType: number }>;
  readonly warningMessages: string[];
  reset(): void;
}

test("parses preview-to-source jump messages into source line targets", () => {
  assert.deepEqual(
    previewSourceJumpTargetFromMessage({
      command: "jumpToSource",
      sourceAnchor: "element:E-Title",
      sourceKind: "element",
      sourceId: "E-Title",
      startLine: "12",
      endLine: "10"
    }),
    {
      sourceAnchor: "element:E-Title",
      sourceKind: "element",
      sourceId: "E-Title",
      startLine: 12,
      endLine: 12
    }
  );

  assert.equal(previewSourceJumpTargetFromMessage({ command: "jumpToSource", sourceAnchor: "", startLine: 12 }), undefined);
  assert.equal(previewSourceJumpTargetFromMessage({ command: "jumpToSource", sourceAnchor: "action:A-Submit", startLine: 0 }), undefined);
  assert.equal(previewSourceJumpTargetFromMessage({ command: "openReference", sourceAnchor: "element:E-Title", startLine: 12 }), undefined);
});

test("renders webview preview-to-source jump affordance without standalone VS Code messaging", () => {
  const webviewScript = renderPreviewClientScript({
    target: "webview",
    messages: clientMessages,
    defaultPositionKey: "sample.vspec.md",
    mermaidRenderIdPrefix: "mmd-",
    updateTimeoutMs: 1000
  });
  assert.match(webviewScript, /initPreviewSourceJump/);
  assert.match(webviewScript, /command: "jumpToSource"/);
  assert.match(webviewScript, /message\.command !== "highlightSourceAnchor"/);
  assert.match(webviewScript, /applyPreviewSourceHighlight/);
  assert.match(webviewScript, /command: "sourceSyncReady"/);
  assert.match(webviewScript, /sourceJumpHint/);
  assert.match(webviewScript, /data-mm-source-anchor/);
  assert.match(webviewScript, /let previewSourceJumpEventsInitialized = false;/);
  assert.match(webviewScript, /item\.target\.replaceWith\(item\.replacement\);[\s\S]*initPreviewSourceJump\(\);/);

  const standaloneScript = renderPreviewClientScript({
    target: "standalone",
    messages: clientMessages,
    defaultPositionKey: "sample.vspec.md",
    mermaidRenderIdPrefix: "mmd-",
    updateTimeoutMs: 1000
  });
  assert.match(standaloneScript, /initPreviewSourceJump/);
  assert.doesNotMatch(standaloneScript, /command: "jumpToSource"/);
  assert.doesNotMatch(standaloneScript, /highlightSourceAnchor/);
  assert.doesNotMatch(standaloneScript, /sourceSyncReady/);
  assert.doesNotMatch(standaloneScript, /vscode\.postMessage/);
  assert.doesNotMatch(standaloneScript, /event\.preventDefault/);
});

test("reveals and selects source locations from preview jump messages", async () => {
  const mock = (vscode as unknown as { __vscodeMock: VscodeMock }).__vscodeMock;
  mock.reset();

  const path = "/tmp/source-jump.vspec.md";
  const document = {
    lineCount: 4,
    lineAt(line: number) {
      return { text: ["---", "# SCR Source", "## Elements", "### E-Title Heading"][line] ?? "" };
    }
  };
  mock.openedDocuments.set(path, document);

  await revealPreviewSourceLocation(vscode.Uri.file(path), {
    command: "jumpToSource",
    sourceAnchor: "element:E-Title",
    sourceKind: "element",
    sourceId: "E-Title",
    startLine: "4",
    endLine: "4"
  });

  assert.equal(mock.shownDocuments.length, 1);
  assert.equal(mock.shownDocuments[0].document, document);
  assert.equal(mock.shownDocuments[0].column, vscode.ViewColumn.One);
  const selection = mock.shownDocuments[0].editor.selection as { readonly start: { readonly line: number; readonly character: number }; readonly end: { readonly line: number; readonly character: number } };
  assert.deepEqual(
    {
      start: { line: selection.start.line, character: selection.start.character },
      end: { line: selection.end.line, character: selection.end.character }
    },
    {
    start: { line: 3, character: 0 },
    end: { line: 3, character: 19 }
    }
  );
  const revealedRange = mock.revealedRanges[0].range;
  assert.deepEqual(
    {
      range: {
        start: { line: revealedRange.start.line, character: revealedRange.start.character },
        end: { line: revealedRange.end.line, character: revealedRange.end.character }
      },
      revealType: mock.revealedRanges[0].revealType
    },
    {
      range: {
        start: { line: 3, character: 0 },
        end: { line: 3, character: 19 }
      },
      revealType: vscode.TextEditorRevealType.InCenterIfOutsideViewport
    }
  );

  await revealPreviewSourceLocation(vscode.Uri.file(path), {
    command: "jumpToSource",
    sourceAnchor: "element:E-Title",
    startLine: "0"
  });
  assert.deepEqual(mock.warningMessages, ["MarkVSpec source location is unavailable for this preview item."]);
});
