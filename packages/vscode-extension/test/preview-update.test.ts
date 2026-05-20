import assert from "node:assert/strict";
import test from "node:test";
import { parseMarkVSpec } from "@markvspec/core";
import {
  buildPreviewUpdatePlan,
  formatPreviewUpdateTelemetry,
  isCurrentPreviewGenerationState,
  normalizePreviewPatchResultState,
  PREVIEW_AUTO_UPDATE_DEFAULT,
  PREVIEW_UPDATE_DEBOUNCE_MS,
  PREVIEW_WEBVIEW_UPDATE_TIMEOUT_MS,
  renderPreviewErrorHtml,
  renderPreviewHtml,
  renderPreviewLoadingHtml,
  scheduleCoalescedPreviewUpdate,
  shouldSkipActiveEditorPreviewUpdate,
  shouldUseIncrementalPreviewUpdate
} from "../src/extension.js";

test("builds preview update plans for full, fragment, and fallback paths", () => {
  assert.deepEqual(buildPreviewUpdatePlan({ hasPreviousSource: false }), {
    kind: "full",
    reason: "no-previous-source"
  });

  assert.deepEqual(buildPreviewUpdatePlan({ hasPreviousSource: true, sourceUnchanged: true }), {
    kind: "noop",
    reason: "unchanged-source"
  });

  assert.deepEqual(
    buildPreviewUpdatePlan({
      hasPreviousSource: true,
      invalidation: {
        requiresFullRender: true,
        wireframeRenderKeys: [],
        previewDocumentRenderKeys: []
      }
    }),
    {
      kind: "full",
      reason: "requires-full-render"
    }
  );

  assert.deepEqual(
    buildPreviewUpdatePlan({
      hasPreviousSource: true,
      invalidation: {
        requiresFullRender: false,
        wireframeRenderKeys: ["element:E-Title"],
        previewDocumentRenderKeys: ["elements:list"]
      },
      fragmentGroupCount: 2
    }),
    {
      kind: "fragment",
      expectedFragmentGroups: 2
    }
  );

  assert.deepEqual(
    buildPreviewUpdatePlan({
      hasPreviousSource: true,
      invalidation: {
        requiresFullRender: false,
        wireframeRenderKeys: [],
        previewDocumentRenderKeys: []
      },
      fragmentGroupCount: 0
    }),
    {
      kind: "noop",
      reason: "no-render-keys"
    }
  );

  assert.deepEqual(
    buildPreviewUpdatePlan({
      hasPreviousSource: true,
      invalidation: {
        requiresFullRender: false,
        wireframeRenderKeys: ["element:E-Title"],
        previewDocumentRenderKeys: ["elements:list"]
      },
      fragmentGroupCount: 1
    }),
    {
      kind: "fallback-full",
      reason: "fragment-generation-mismatch",
      expectedFragmentGroups: 2,
      actualFragmentGroups: 1
    }
  );
});

test("skips active editor preview updates when focus returns to the same document", () => {
  assert.equal(
    shouldSkipActiveEditorPreviewUpdate("file:///workspace/screen.vspec.md", "file:///workspace/screen.vspec.md"),
    true
  );
  assert.equal(
    shouldSkipActiveEditorPreviewUpdate("file:///workspace/screen.vspec.md", "file:///workspace/other.vspec.md"),
    false
  );
  assert.equal(shouldSkipActiveEditorPreviewUpdate(undefined, "file:///workspace/screen.vspec.md"), false);
  assert.equal(shouldUseIncrementalPreviewUpdate(true, false), true);
  assert.equal(shouldUseIncrementalPreviewUpdate(true, undefined), true);
  assert.equal(shouldUseIncrementalPreviewUpdate(true, true), false);
  assert.equal(shouldUseIncrementalPreviewUpdate(false, false), false);
});

test("coalesces preview updates and detects stale generations", () => {
  assert.equal(PREVIEW_AUTO_UPDATE_DEFAULT, true);
  assert.equal(PREVIEW_UPDATE_DEBOUNCE_MS, 150);
  assert.equal(PREVIEW_WEBVIEW_UPDATE_TIMEOUT_MS, 3000);

  const callbacks = new Map<number, () => void>();
  const cleared: number[] = [];
  const runs: string[] = [];
  let nextTimer = 1;
  let currentGenerationId = 0;
  let timer: number | undefined;

  const schedule = (documentUri: string) => {
    currentGenerationId += 1;
    const generationId = currentGenerationId;
    timer = scheduleCoalescedPreviewUpdate({
      timer,
      clearTimeout: (handle) => {
        cleared.push(handle);
        callbacks.delete(handle);
      },
      setTimeout: (callback, delayMs) => {
        assert.equal(delayMs, PREVIEW_UPDATE_DEBOUNCE_MS);
        const handle = nextTimer;
        nextTimer += 1;
        callbacks.set(handle, callback);
        return handle;
      },
      delayMs: PREVIEW_UPDATE_DEBOUNCE_MS,
      document: { uri: documentUri },
      documentUri,
      shouldRun: (scheduledDocumentUri) => isCurrentPreviewGenerationState({
        hasPreviewPanel: true,
        currentGenerationId,
        currentDocumentUri: documentUri
      }, generationId, scheduledDocumentUri),
      run: (document) => runs.push(document.uri),
      clearTimer: () => {
        timer = undefined;
      }
    });
  };

  schedule("file:///first.vspec.md");
  schedule("file:///second.vspec.md");
  assert.deepEqual(cleared, [1]);
  assert.equal(callbacks.has(1), false);
  callbacks.get(2)?.();
  assert.deepEqual(runs, ["file:///second.vspec.md"]);
  assert.equal(timer, undefined);

  schedule("file:///stale.vspec.md");
  currentGenerationId += 1;
  callbacks.get(3)?.();
  assert.deepEqual(runs, ["file:///second.vspec.md"]);

  const current = {
    hasPreviewPanel: true,
    currentGenerationId: 4,
    currentDocumentUri: "file:///second.vspec.md"
  };
  assert.equal(isCurrentPreviewGenerationState(current, 4, "file:///second.vspec.md"), true);
  assert.equal(isCurrentPreviewGenerationState(current, 3, "file:///second.vspec.md"), false);
  assert.equal(isCurrentPreviewGenerationState(current, 4, "file:///other.vspec.md"), false);
  assert.equal(isCurrentPreviewGenerationState({ ...current, hasPreviewPanel: false }, 4, "file:///second.vspec.md"), false);
});

test("keeps only the latest typing generation in coalesced realtime preview updates", () => {
  const callbacks = new Map<number, () => void>();
  const cleared: number[] = [];
  const runs: string[] = [];
  let nextTimer = 1;
  let currentGenerationId = 0;
  let timer: number | undefined;
  const documentUri = "file:///typing.vspec.md";

  const scheduleTypingUpdate = (sourceVersion: string) => {
    currentGenerationId += 1;
    const generationId = currentGenerationId;
    timer = scheduleCoalescedPreviewUpdate({
      timer,
      clearTimeout: (handle) => {
        cleared.push(handle);
        callbacks.delete(handle);
      },
      setTimeout: (callback, delayMs) => {
        assert.equal(delayMs, PREVIEW_UPDATE_DEBOUNCE_MS);
        const handle = nextTimer;
        nextTimer += 1;
        callbacks.set(handle, callback);
        return handle;
      },
      delayMs: PREVIEW_UPDATE_DEBOUNCE_MS,
      document: { uri: documentUri, sourceVersion },
      documentUri,
      shouldRun: (scheduledDocumentUri) => isCurrentPreviewGenerationState({
        hasPreviewPanel: true,
        currentGenerationId,
        currentDocumentUri: documentUri
      }, generationId, scheduledDocumentUri),
      run: (document) => runs.push(document.sourceVersion),
      clearTimer: () => {
        timer = undefined;
      }
    });
  };

  scheduleTypingUpdate("T");
  scheduleTypingUpdate("Ti");
  scheduleTypingUpdate("Tit");
  scheduleTypingUpdate("Title");
  assert.deepEqual(cleared, [1, 2, 3]);
  assert.deepEqual([...callbacks.keys()], [4]);
  callbacks.get(1)?.();
  callbacks.get(2)?.();
  callbacks.get(3)?.();
  assert.deepEqual(runs, []);
  callbacks.get(4)?.();
  assert.deepEqual(runs, ["Title"]);
  assert.equal(timer, undefined);

  scheduleTypingUpdate("Title stale");
  currentGenerationId += 1;
  callbacks.get(5)?.();
  assert.deepEqual(runs, ["Title"]);
});

test("formats realtime preview update telemetry", () => {
  assert.equal(
    formatPreviewUpdateTelemetry({
      sourceLabel: "login.vspec.md",
      generationId: 12,
      phase: "fragment-patch",
      planKind: "fragment",
      fragmentGroups: 2,
      expectedFragmentGroups: 2,
      patchSuccess: true,
      patchReason: "applied",
      elapsedMs: 24,
      parseMs: 4,
      invalidationMs: 2,
      fragmentRenderMs: 8,
      patchMs: 10,
      webviewPatchMs: 7
    }),
    "[preview-update] login.vspec.md generation=12 phase=fragment-patch plan=fragment fragments=2 expectedFragments=2 patchSuccess=true patchReason=applied elapsedMs=24 parseMs=4 invalidationMs=2 fragmentRenderMs=8 patchMs=10 webviewPatchMs=7"
  );

  assert.equal(
    formatPreviewUpdateTelemetry({
      sourceLabel: "login.vspec.md",
      generationId: 13,
      phase: "fallback-full",
      planKind: "fallback-full",
      fragmentGroups: 1,
      expectedFragmentGroups: 2,
      reason: "fragment-generation-mismatch",
      elapsedMs: 12
    }),
    "[preview-update] login.vspec.md generation=13 phase=fallback-full plan=fallback-full fragments=1 expectedFragments=2 reason=fragment-generation-mismatch elapsedMs=12"
  );

  assert.equal(
    formatPreviewUpdateTelemetry({
      sourceLabel: "login.vspec.md",
      generationId: 14,
      phase: "noop",
      planKind: "noop",
      reason: "unchanged-source",
      elapsedMs: 1
    }),
    "[preview-update] login.vspec.md generation=14 phase=noop plan=noop reason=unchanged-source elapsedMs=1"
  );

  assert.equal(
    formatPreviewUpdateTelemetry({
      sourceLabel: "login.vspec.md",
      generationId: 15,
      phase: "noop",
      planKind: "noop",
      fragmentGroups: 0,
      reason: "no-render-keys",
      elapsedMs: 2
    }),
    "[preview-update] login.vspec.md generation=15 phase=noop plan=noop fragments=0 reason=no-render-keys elapsedMs=2"
  );
});

test("normalizes structured preview patch results", () => {
  const current = {
    hasPreviewPanel: true,
    currentGenerationId: 5,
    currentDocumentUri: "file:///login.vspec.md"
  };

  assert.deepEqual(
    normalizePreviewPatchResultState(current, { generationId: 5, success: true }, "file:///login.vspec.md"),
    { success: true, reason: "applied" }
  );
  assert.deepEqual(
    normalizePreviewPatchResultState(current, { generationId: 5, success: true, webviewPatchMs: 6 }, "file:///login.vspec.md"),
    { success: true, reason: "applied", webviewPatchMs: 6 }
  );
  assert.deepEqual(
    normalizePreviewPatchResultState(current, { generationId: 5, success: false, reason: "target-count-mismatch:element:E-Title" }, "file:///login.vspec.md"),
    { success: false, reason: "target-count-mismatch:element:E-Title" }
  );
  assert.deepEqual(
    normalizePreviewPatchResultState(current, { generationId: 5, success: false }, "file:///login.vspec.md"),
    { success: false, reason: "webview-rejected" }
  );
  assert.deepEqual(
    normalizePreviewPatchResultState(current, { generationId: 4, success: true, reason: "applied" }, "file:///login.vspec.md"),
    { success: false, reason: "stale-generation-result" }
  );
  assert.deepEqual(
    normalizePreviewPatchResultState(current, { generationId: 5, success: true, reason: "applied" }, "file:///other.vspec.md"),
    { success: false, reason: "stale-generation-result" }
  );
  assert.deepEqual(
    normalizePreviewPatchResultState(current, { success: true }, "file:///login.vspec.md"),
    { success: false, reason: "missing-generation" }
  );
  assert.deepEqual(
    normalizePreviewPatchResultState({ ...current, hasPreviewPanel: false }, { generationId: 5, success: true }, "file:///login.vspec.md"),
    { success: false, reason: "stale-generation-result" }
  );
});

test("renders lightweight preview loading and error shells", () => {
  const webview = {
    cspSource: "vscode-resource:",
    asWebviewUri: (uri: unknown) => uri
  } as never;
  const loadingHtml = renderPreviewLoadingHtml(webview, "examples/04-real-world-screens/login-basic.vspec.md");
  const errorHtml = renderPreviewErrorHtml(webview, "examples/04-real-world-screens/login-basic.vspec.md", "Cannot read partial");

  assert.match(loadingHtml, /<title>Generating preview<\/title>/);
  assert.match(loadingHtml, /プレビューを生成中\.\.\./);
  assert.match(loadingHtml, /Preview is being generated\.\.\./);
  assert.match(loadingHtml, /class="status-spinner"/);
  assert.match(loadingHtml, /examples\/04-real-world-screens\/login-basic\.vspec\.md/);
  assert.doesNotMatch(loadingHtml, /acquireVsCodeApi/);
  assert.match(errorHtml, /<title>Preview error<\/title>/);
  assert.match(errorHtml, /プレビューを生成できませんでした/);
  assert.match(errorHtml, /Cannot read partial/);
  assert.doesNotMatch(errorHtml, /class="status-spinner"/);
});

test("keeps marker controls without viewport filter controls for a single viewport", () => {
  const source = `---
id: SCR-SINGLE
type: screen
title: Single Viewport
route: /single
---

# SCR-SINGLE Single Viewport

## States

- idle*

## Layout: mobile

### L-Root Root

- stack

#### Items
`;
  const result = parseMarkVSpec(source);
  const html = renderPreviewHtml(
    result,
    {
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: unknown) => uri
    } as never,
    { layout: true, element: true, action: true },
    undefined,
    "single.vspec.md"
  );
  const toolbar = html.match(/<header class="toolbar">[\s\S]*?<\/header>/)?.[0] ?? "";

  assert.doesNotMatch(toolbar, /data-viewport-filter/);
  assert.doesNotMatch(toolbar, />All<\/button>/);
  assert.doesNotMatch(toolbar, />mobile<\/button>/);
  assert.match(toolbar, /data-marker-toggle="layout"/);
});
