import * as vscode from "vscode";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildProjectTransitionGraph,
  composeMarkVSpecTemplate,
  computeMarkVSpecRenderInvalidation,
  effectiveHistoryFields,
  loadMarkVSpecProject,
  parseMarkVSpec,
  parseMarkVSpecProject,
  allResolvedLayoutGroups,
  preferredLayoutGroupForViewport,
  renderDiagnosticMessageForLocale,
  renderMarkVSpecHtml,
  renderProjectTransitionMermaid,
  resolveRendererMessages,
  resolveProjectPath,
  isProjectReferenceAllowed
} from "@markvspec/core";
import {
  renderDesignDocumentSections
} from "@markvspec/document-renderer";
import type {
  MarkVSpecProjectLoadResult,
  MessageKey,
  RendererMessages
} from "@markvspec/core";
import { messagesForLocale, resolveLocale } from "@markvspec/core";
import {
  firstEntityProseParagraph,
  joinProseLineGroups,
  renderEntityNotes,
  renderEntityOverview,
  renderMarkdownSectionContent,
  trimNoteLines
} from "./markdown-renderer.js";
import {
  code,
  escapeHtml,
  rawStringProperty,
  renderTable,
  renderTableWithCells,
  rowspanPrefixCells,
  stringProperty,
  text
} from "./design-document-renderer.js";
import type { TableCell } from "./design-document-renderer.js";
import {
  buildStateScreenReadModels,
  buildViewportStateScreenReadModels
} from "@markvspec/core";
import type { FocusScope, StateScreenReadModel } from "@markvspec/core";
import {
  renderStateScreenReadModel,
  renderStateViewsSection,
  renderStateViewportSection
} from "./state-views-renderer.js";
import type { StateViewsRenderContext } from "./state-views-renderer.js";
import { createStateViewSpecTableRenderer } from "./state-view-spec-tables.js";
import { createDocumentScope } from "./document-scope.js";
import type { DocumentScope } from "./document-scope.js";
import {
  embedPartialPreviews,
  enrichPartialReferenceInfo,
  loadPartialPreviewsForScreen,
  partialPreviewPathsForResult,
  partialPreviewsForResult,
  propagatePartialPreviews,
  registerPartialPreviews,
  updateDocumentReferenceInfo
} from "./partial-preview.js";
import type { DocumentReferenceInfo } from "./partial-preview.js";
import {
  defaultExportHtmlBaseName,
  mermaidScriptWebviewUri,
  previewBodyClasses,
  previewClientMessages,
  readMermaidScriptFromExtension,
  renderPreviewErrorHtml,
  renderPreviewLoadingHtml,
  renderPreviewUpdateControls,
  renderTableOfContentsList
} from "./preview-shell.js";
import { registerMarkVSpecExportCommands } from "./export-commands.js";
import { renderPreviewPrintWireframeOverrideStyle } from "./preview-styles.js";
import { renderProjectPreviewStyles, renderScreenPreviewStyles } from "./preview-document-styles.js";
export {
  defaultExportHtmlBaseName,
  renderPreviewErrorHtml,
  renderPreviewLoadingHtml
} from "./preview-shell.js";

type MarkerCategory = "layout" | "element" | "action";

interface ScreenDocumentResult {
  result: ReturnType<typeof parseMarkVSpec>;
  focus?: FocusScope;
  messages?: RendererMessages;
}

type ParsedElement = ReturnType<typeof parseMarkVSpec>["elements"][number];

const rendererMessagesByResult = new WeakMap<ReturnType<typeof parseMarkVSpec>, RendererMessages>();
const projectRendererMessagesByResult = new WeakMap<MarkVSpecProjectLoadResult, RendererMessages>();
const documentReferencePathsByResult = new WeakMap<
  ReturnType<typeof parseMarkVSpec>,
  { templates: Map<string, DocumentReferenceInfo>; partials: Map<string, DocumentReferenceInfo> }
>();
const screenDocumentResultCache = new Map<string, ScreenDocumentResult>();
const projectDocumentResultCache = new Map<string, MarkVSpecProjectLoadResult>();
const projectFileContentCache = new Map<string, { fingerprint: string; source: string }>();
const parsedProjectFileCache = new Map<string, { fingerprint: string; result: ReturnType<typeof parseMarkVSpec> }>();
const previewSourceByUri = new Map<string, string>();
const pendingFragmentUpdates = new Map<string, (result: PreviewPatchResult) => void>();
export const PREVIEW_UPDATE_DEBOUNCE_MS = 150;
export const PREVIEW_AUTO_UPDATE_DEFAULT = true;
export const PREVIEW_WEBVIEW_UPDATE_TIMEOUT_MS = 3000;
const DIAGNOSTIC_UPDATE_DEBOUNCE_MS = 250;

let previewPanel: vscode.WebviewPanel | undefined;
let previewDocumentUri: vscode.Uri | undefined;
let previewGenerationId = 0;
let previewUpdateTimer: ReturnType<typeof setTimeout> | undefined;
const diagnosticsUpdateTimers = new Map<string, ReturnType<typeof setTimeout>>();
let extensionRootUri: vscode.Uri | undefined;
let markerVisibility = {
  layout: true,
  element: true,
  action: true
};
let previewShowRepeatedContent = false;
let previewAutoUpdate = PREVIEW_AUTO_UPDATE_DEFAULT;
let diagnosticsCollection: vscode.DiagnosticCollection | undefined;
let outputChannel: vscode.OutputChannel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  const activationStart = Date.now();
  extensionRootUri = context.extensionUri;
  outputChannel = vscode.window.createOutputChannel("MarkVSpec");
  diagnosticsCollection = vscode.languages.createDiagnosticCollection("markvspec");
  const documentSymbols = vscode.languages.registerDocumentSymbolProvider(
    { language: "markvspec", scheme: "file" },
    {
      provideDocumentSymbols(document) {
        return createMarkVSpecDocumentSymbols(document);
      }
    }
  );
  const codeActions = vscode.languages.registerCodeActionsProvider(
    { language: "markvspec", scheme: "file" },
    {
      provideCodeActions(document, range, context) {
        return createMarkVSpecCodeActions(document, context.diagnostics);
      }
    },
    {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
    }
  );
  const formatStructure = vscode.commands.registerCommand("markvspec.formatStructure", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !isMarkVSpecDocument(editor.document)) {
      void vscode.window.showWarningMessage("Open a MarkVSpec document before formatting structure.");
      return;
    }

    const formatted = formatMarkVSpecStructure(editor.document.getText());
    if (formatted === editor.document.getText()) {
      return;
    }

    const fullRange = new vscode.Range(
      0,
      0,
      Math.max(editor.document.lineCount - 1, 0),
      editor.document.lineAt(Math.max(editor.document.lineCount - 1, 0)).text.length
    );
    await editor.edit((editBuilder) => {
      editBuilder.replace(fullRange, formatted);
    });
  });
  const exportCommands = registerMarkVSpecExportCommands({
    context,
    isMarkVSpecDocument,
    renderHtml: (document, mermaidScript) => isMarkVSpecProjectDocument(document)
      ? renderStandaloneProjectHtml(loadProjectFromDocument(document), mermaidScript, previewDocumentLabel(document))
      : renderStandaloneHtml(loadScreenDocumentResult(document), mermaidScript, previewDocumentLabel(document)),
    renderPdfSourceHtml: renderStandaloneDocumentHtml,
    readMermaidScript: () => readMermaidScript(extensionRootUri),
    logDuration
  });
  const openPreview = vscode.commands.registerCommand("markvspec.openPreview", async (resource?: vscode.Uri) => {
    const document = resource
      ? await vscode.workspace.openTextDocument(resource)
      : vscode.window.activeTextEditor?.document;
    if (!document || !isMarkVSpecDocument(document)) {
      void vscode.window.showWarningMessage("Open a MarkVSpec document before opening preview.");
      return;
    }

    previewDocumentUri = document.uri;

    if (previewPanel) {
      previewPanel.reveal(vscode.ViewColumn.Beside);
    } else {
      previewPanel = vscode.window.createWebviewPanel(
        "markvspecPreview",
        "MarkVSpec Preview",
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          enableFindWidget: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            context.extensionUri,
            vscode.Uri.joinPath(context.extensionUri, "..", "..", "node_modules")
          ]
        }
      );

      previewPanel.onDidDispose(() => {
        previewPanel = undefined;
        previewDocumentUri = undefined;
        previewSourceByUri.clear();
        resolvePendingFragmentUpdates(false);
        previewGenerationId += 1;
        markerVisibility = {
          layout: true,
          element: true,
          action: true
        };
        previewShowRepeatedContent = false;
      }, undefined, context.subscriptions);

      previewPanel.webview.onDidReceiveMessage((message: {
        category?: MarkerCategory;
        command?: string;
        enabled?: boolean;
        generationId?: number;
        detail?: unknown;
        message?: string;
        path?: string;
        phase?: string;
        reason?: string;
        requestId?: string;
        stack?: string;
        success?: boolean;
        updateId?: string;
        webviewPatchMs?: number;
      }) => {
        if (message.command === "previewClientError") {
          logPreviewClientError(message, previewDocumentUri?.toString());
          return;
        }

        if (message.command === "fragmentUpdateResult" && message.requestId) {
          const resolve = pendingFragmentUpdates.get(message.requestId);
          if (resolve) {
            pendingFragmentUpdates.delete(message.requestId);
            resolve(normalizePreviewPatchResult(message, previewDocumentUri?.toString() ?? ""));
          }
          return;
        }

        if (message.command === "renderReady" && message.updateId && typeof message.generationId === "number" && previewDocumentUri) {
          void previewPanel?.webview.postMessage({
            command: "renderReadyResult",
            updateId: message.updateId,
            generationId: message.generationId,
            commit: isCurrentPreviewGeneration(message.generationId, previewDocumentUri.toString())
          });
          return;
        }

        if (message.command === "toggleMarker" && message.category && previewDocumentUri) {
          markerVisibility = {
            ...markerVisibility,
            [message.category]: !markerVisibility[message.category]
          };
          return;
        }

        if (message.command === "toggleRepeatedContent" && typeof message.enabled === "boolean" && previewDocumentUri) {
          previewShowRepeatedContent = message.enabled;
          return;
        }

        if (message.command === "setAutoUpdate" && typeof message.enabled === "boolean" && previewDocumentUri) {
          previewAutoUpdate = message.enabled;
          if (previewAutoUpdate) {
            cancelScheduledPreviewUpdate();
            void vscode.workspace.openTextDocument(previewDocumentUri).then((document) => {
              updatePreview(document, reservePreviewGeneration(), { force: true });
              scheduleDiagnostics(document);
            });
          } else {
            cancelScheduledPreviewUpdate();
          }
          return;
        }

        if (message.command === "refreshPreview" && previewDocumentUri) {
          cancelScheduledPreviewUpdate();
          void vscode.workspace.openTextDocument(previewDocumentUri).then((document) => {
            updatePreview(document, reservePreviewGeneration(), { force: true });
            scheduleDiagnostics(document);
          });
          return;
        }

        if (message.command === "openReference" && typeof message.path === "string" && previewDocumentUri) {
          const workspaceRoot = workspaceRootForUri(previewDocumentUri);
          if (!canOpenPreviewReference(message.path, workspaceRoot, isWorkspaceTrusted(), resolveFsRealPath)) {
            void vscode.window.showWarningMessage("MarkVSpec blocked a reference outside the trusted workspace.");
            return;
          }
          void vscode.workspace.openTextDocument(vscode.Uri.file(message.path)).then((document) => vscode.window.showTextDocument(document, vscode.ViewColumn.One));
        }
      }, undefined, context.subscriptions);
    }

    cancelScheduledPreviewUpdate();
    updatePreview(document, reservePreviewGeneration(), { force: true });
    scheduleDiagnostics(document);
  });

  const liveUpdate = vscode.workspace.onDidChangeTextDocument((event) => {
    invalidateDocumentCaches(event.document);

    if (!previewPanel || !previewDocumentUri) {
      scheduleDiagnostics(event.document);
      return;
    }

    if (event.document.uri.toString() === previewDocumentUri.toString()) {
      if (previewAutoUpdate) {
        schedulePreviewUpdate(event.document);
      } else {
        cancelScheduledPreviewUpdate();
      }
      scheduleDiagnostics(event.document);
      return;
    }

    scheduleDiagnostics(event.document);
  });

  const activeEditorUpdate = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (!previewPanel || !editor || !isMarkVSpecDocument(editor.document)) {
      return;
    }

    if (shouldSkipActiveEditorPreviewUpdate(previewDocumentUri?.toString(), editor.document.uri.toString())) {
      scheduleDiagnostics(editor.document);
      return;
    }

    previewDocumentUri = editor.document.uri;
    cancelScheduledPreviewUpdate();
    updatePreview(editor.document, reservePreviewGeneration(), { force: true });
    scheduleDiagnostics(editor.document);
  });

  const openUpdate = vscode.workspace.onDidOpenTextDocument(updateDiagnostics);
  const saveUpdate = vscode.workspace.onDidSaveTextDocument((document) => {
    invalidateDocumentCaches(document);
    updateDiagnostics(document);
  });
  const messageFileUpdate = vscode.workspace.createFileSystemWatcher("**/*.{yml,yaml,json}");
  const refreshForMessageFileChange = () => {
    invalidateDocumentCaches();
    if (!previewPanel || !previewDocumentUri) {
      return;
    }
    if (!previewAutoUpdate) {
      cancelScheduledPreviewUpdate();
      return;
    }
    void vscode.workspace.openTextDocument(previewDocumentUri).then((document) => {
      updatePreview(document, reservePreviewGeneration(), { force: true });
      scheduleDiagnostics(document);
    });
  };
  messageFileUpdate.onDidCreate(refreshForMessageFileChange, undefined, context.subscriptions);
  messageFileUpdate.onDidChange(refreshForMessageFileChange, undefined, context.subscriptions);
  messageFileUpdate.onDidDelete(refreshForMessageFileChange, undefined, context.subscriptions);
  const refreshPreview = vscode.commands.registerCommand("markvspec.refreshPreview", async () => {
    if (!previewPanel || !previewDocumentUri) {
      void vscode.window.showWarningMessage("Open a MarkVSpec preview before refreshing.");
      return;
    }
    const document = await vscode.workspace.openTextDocument(previewDocumentUri);
    cancelScheduledPreviewUpdate();
    updatePreview(document, reservePreviewGeneration(), { force: true });
    scheduleDiagnostics(document);
  });
  const closeUpdate = vscode.workspace.onDidCloseTextDocument((document) => {
    invalidateDocumentCaches(document);
    clearScheduledDiagnostics(document);
    diagnosticsCollection?.delete(document.uri);
  });

  const activeDocument = vscode.window.activeTextEditor?.document;
  if (activeDocument) {
    updateDiagnostics(activeDocument);
  }

  context.subscriptions.push(formatStructure, exportCommands.exportHtml, exportCommands.exportPdf, codeActions, documentSymbols, openPreview, refreshPreview, liveUpdate, activeEditorUpdate, openUpdate, saveUpdate, closeUpdate, messageFileUpdate, diagnosticsCollection, outputChannel);
  logDuration("activate", activationStart);
}

function logPreviewClientError(
  message: { phase?: string; message?: string; stack?: string; detail?: unknown },
  documentUri?: string
): void {
  const phase = typeof message.phase === "string" && message.phase.length > 0 ? message.phase : "unknown";
  const summary = typeof message.message === "string" && message.message.length > 0 ? message.message : "(no message)";
  outputChannel?.appendLine(`[preview-client-error] ${documentUri ?? "(unknown document)"} phase=${phase} message=${summary}`);
  if (typeof message.stack === "string" && message.stack.length > 0) {
    outputChannel?.appendLine(message.stack);
  }
  if (message.detail !== undefined) {
    outputChannel?.appendLine(`detail=${formatPreviewClientErrorDetail(message.detail)}`);
  }
}

function formatPreviewClientErrorDetail(detail: unknown): string {
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

export function deactivate(): void {
  cancelScheduledPreviewUpdate();
  clearAllScheduledDiagnostics();
  previewPanel?.dispose();
  diagnosticsCollection?.dispose();
}

function schedulePreviewUpdate(document: vscode.TextDocument): void {
  const documentUri = document.uri.toString();
  const generationId = reservePreviewGeneration();
  previewUpdateTimer = scheduleCoalescedPreviewUpdate({
    timer: previewUpdateTimer,
    clearTimeout,
    setTimeout,
    delayMs: PREVIEW_UPDATE_DEBOUNCE_MS,
    document,
    documentUri,
    shouldRun: (scheduledDocumentUri) => isCurrentPreviewGeneration(generationId, scheduledDocumentUri),
    run: (scheduledDocument) => updatePreview(scheduledDocument, generationId),
    clearTimer: () => {
      previewUpdateTimer = undefined;
    }
  });
}

function cancelScheduledPreviewUpdate(): void {
  if (!previewUpdateTimer) {
    return;
  }
  clearTimeout(previewUpdateTimer);
  previewUpdateTimer = undefined;
}

export function shouldSkipActiveEditorPreviewUpdate(currentPreviewUri: string | undefined, activeEditorUri: string): boolean {
  return currentPreviewUri === activeEditorUri;
}

export function isPathInsideWorkspace(
  path: string,
  workspaceRoot: string | undefined,
  realpath?: (path: string) => string | undefined
): boolean {
  if (!workspaceRoot) {
    return false;
  }
  return isProjectReferenceAllowed(path, workspaceRoot, realpath);
}

export function canOpenPreviewReference(
  path: string,
  workspaceRoot: string | undefined,
  isTrusted = true,
  realpath?: (path: string) => string | undefined
): boolean {
  return isTrusted && isPathInsideWorkspace(path, workspaceRoot, realpath);
}

export function shouldUseIncrementalPreviewUpdate(hasPreviousSource: boolean, force: boolean | undefined): boolean {
  return hasPreviousSource && !force;
}

type PreviewUpdateOptions = {
  force?: boolean;
};

function updatePreview(document: vscode.TextDocument, generationId = reservePreviewGeneration(), options: PreviewUpdateOptions = {}): void {
  void updatePreviewAsync(document, generationId, options);
}

function reservePreviewGeneration(): number {
  previewGenerationId += 1;
  return previewGenerationId;
}

export function scheduleCoalescedPreviewUpdate<TDocument, TTimer>(input: {
  timer: TTimer | undefined;
  clearTimeout: (timer: TTimer) => void;
  setTimeout: (callback: () => void, delayMs: number) => TTimer;
  delayMs: number;
  document: TDocument;
  documentUri: string;
  shouldRun: (documentUri: string) => boolean;
  run: (document: TDocument) => void;
  clearTimer: () => void;
}): TTimer {
  if (input.timer !== undefined) {
    input.clearTimeout(input.timer);
  }

  return input.setTimeout(() => {
    input.clearTimer();
    if (!input.shouldRun(input.documentUri)) {
      return;
    }
    input.run(input.document);
  }, input.delayMs);
}

async function updatePreviewAsync(document: vscode.TextDocument, generationId: number, options: PreviewUpdateOptions = {}): Promise<void> {
  if (!previewPanel) {
    return;
  }

  const panel = previewPanel;
  const expectedDocumentUri = document.uri.toString();
  const sourceLabel = previewDocumentLabel(document);

  const started = Date.now();
  try {
    if (isMarkVSpecProjectDocument(document)) {
      const loadingHtml = renderPreviewLoadingHtml(panel.webview, sourceLabel);
      if (!(await commitPreviewHtml(panel, loadingHtml, generationId, expectedDocumentUri)).success) {
        return;
      }
      await yieldToWebview();
      if (!isCurrentPreviewGeneration(generationId, expectedDocumentUri)) {
        return;
      }
      const project = loadProjectFromDocument(document);
      if (!isCurrentPreviewGeneration(generationId, expectedDocumentUri)) {
        return;
      }
      panel.title = project.project.project.title ? `MarkVSpec: ${project.project.project.title}` : "MarkVSpec Project";
      const projectHtml = renderProjectPreviewHtml(project, panel.webview, extensionRootUri, sourceLabel, previewAutoUpdate);
      if (!(await commitPreviewHtml(panel, projectHtml, generationId, expectedDocumentUri)).success) {
        return;
      }
      logDuration(`updatePreview project ${sourceLabel}`, started);
      return;
    }

    const previousSource = previewSourceByUri.get(expectedDocumentUri);
    const currentSource = document.getText();
    if (!options.force && previousSource === currentSource) {
      logPreviewUpdateTelemetry({
        sourceLabel,
        generationId,
        phase: "noop",
        planKind: "noop",
        elapsedMs: Date.now() - started,
        reason: "unchanged-source"
      });
      return;
    }
    let fullRenderReason = previousSource === undefined ? "no-previous-source" : options.force ? "force-update" : "unspecified";
    const parseStarted = Date.now();
    const screen = loadScreenDocumentResult(document);
    const parseMs = Date.now() - parseStarted;
    if (!isCurrentPreviewGeneration(generationId, expectedDocumentUri)) {
      return;
    }
    panel.title = screen.result.screen.title ? `MarkVSpec: ${screen.result.screen.title}` : "MarkVSpec Preview";
    if (previousSource !== undefined && shouldUseIncrementalPreviewUpdate(true, options.force)) {
      const invalidationStarted = Date.now();
      const invalidation = computeMarkVSpecRenderInvalidation(previousSource, currentSource);
      const invalidationMs = Date.now() - invalidationStarted;
      logRenderInvalidationResult(sourceLabel, invalidation);
      const fragmentRenderStarted = Date.now();
      const fragments = invalidation.requiresFullRender ? [] : renderPreviewFragmentUpdates(screen, invalidation);
      const fragmentRenderMs = Date.now() - fragmentRenderStarted;
      const plan = buildPreviewUpdatePlan({
        hasPreviousSource: true,
        invalidation,
        fragmentGroupCount: fragments.length
      });
      logPreviewUpdateTelemetry({
        sourceLabel,
        generationId,
        phase: plan.kind === "noop" ? "noop" : "plan",
        planKind: plan.kind,
        fragmentGroups: fragments.length,
        expectedFragmentGroups: "expectedFragmentGroups" in plan ? plan.expectedFragmentGroups : undefined,
        elapsedMs: Date.now() - started,
        parseMs,
        invalidationMs,
        fragmentRenderMs,
        reason: "reason" in plan ? plan.reason : undefined
      });
      if (plan.kind === "noop") {
        previewSourceByUri.set(expectedDocumentUri, currentSource);
        logDuration(`updatePreview noop ${sourceLabel}`, started);
        return;
      }
      if (plan.kind === "fragment") {
        const patchStarted = Date.now();
        const patchResult = await postPreviewFragmentUpdate(panel, fragments, generationId);
        const patchMs = Date.now() - patchStarted;
        logPreviewUpdateTelemetry({
          sourceLabel,
          generationId,
          phase: "fragment-patch",
          planKind: plan.kind,
          fragmentGroups: fragments.length,
          expectedFragmentGroups: plan.expectedFragmentGroups,
          patchSuccess: patchResult.success,
          patchReason: patchResult.reason,
          elapsedMs: Date.now() - started,
          parseMs,
          invalidationMs,
          fragmentRenderMs,
          patchMs,
          webviewPatchMs: patchResult.webviewPatchMs
        });
        if (!isCurrentPreviewGeneration(generationId, expectedDocumentUri)) {
          return;
        }
        if (patchResult.success) {
          previewSourceByUri.set(expectedDocumentUri, currentSource);
          logDuration(`updatePreview fragments ${sourceLabel}`, started);
          return;
        }
        fullRenderReason = `fragment-patch-failed:${patchResult.reason}`;
        outputChannel?.appendLine(`[render-invalidation] ${sourceLabel} fragment patch failed reason=${patchResult.reason}; full render required`);
      } else if (plan.kind === "fallback-full") {
        fullRenderReason = plan.reason;
        logPreviewUpdateTelemetry({
          sourceLabel,
          generationId,
          phase: "fallback-full",
          planKind: plan.kind,
          fragmentGroups: plan.actualFragmentGroups,
          expectedFragmentGroups: plan.expectedFragmentGroups,
          elapsedMs: Date.now() - started,
          parseMs,
          invalidationMs,
          fragmentRenderMs,
          reason: plan.reason
        });
        outputChannel?.appendLine(
          `[render-invalidation] ${sourceLabel} fragment generation mismatch expected=${plan.expectedFragmentGroups} actual=${plan.actualFragmentGroups}; full render required`
        );
      } else {
        fullRenderReason = plan.reason;
      }
    }

    const fullRenderStarted = Date.now();
    const fullHtml = renderPreviewHtml(screen, panel.webview, markerVisibility, extensionRootUri, sourceLabel, previewAutoUpdate, true, previewShowRepeatedContent);
    const fullRenderMs = Date.now() - fullRenderStarted;
    const fullPatchStarted = Date.now();
    const fullPatchResult = await commitPreviewHtml(panel, fullHtml, generationId, expectedDocumentUri);
    logPreviewUpdateTelemetry({
      sourceLabel,
      generationId,
      phase: "full-render",
      planKind: previousSource === undefined ? "full" : undefined,
      patchSuccess: fullPatchResult.success,
      patchReason: fullPatchResult.reason,
      elapsedMs: Date.now() - started,
      parseMs,
      patchMs: Date.now() - fullPatchStarted,
      webviewPatchMs: fullPatchResult.webviewPatchMs,
      fullRenderMs,
      reason: fullRenderReason
    });
    if (!fullPatchResult.success) {
      return;
    }
    previewSourceByUri.set(expectedDocumentUri, currentSource);
    logDuration(`updatePreview screen ${sourceLabel}`, started);
  } catch (error) {
    if (!isCurrentPreviewGeneration(generationId, expectedDocumentUri)) {
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    panel.title = "MarkVSpec Preview";
    const errorHtml = renderPreviewErrorHtml(panel.webview, sourceLabel, message);
    if (!(await commitPreviewHtml(panel, errorHtml, generationId, expectedDocumentUri)).success) {
      return;
    }
    logDuration(`updatePreview error ${sourceLabel}`, started);
  }
}

async function commitPreviewHtml(
  panel: vscode.WebviewPanel,
  html: string,
  generationId: number,
  documentUri: string
): Promise<PreviewPatchResult> {
  if (!isCurrentPreviewGeneration(generationId, documentUri)) {
    return { success: false, reason: "stale-generation-before-post" };
  }
  panel.webview.html = html;
  return { success: true, reason: "direct-webview-html" };
}

function isCurrentPreviewGeneration(generationId: number, documentUri: string): boolean {
  return isCurrentPreviewGenerationState({
    hasPreviewPanel: Boolean(previewPanel),
    currentGenerationId: previewGenerationId,
    currentDocumentUri: previewDocumentUri?.toString()
  }, generationId, documentUri);
}

export function isCurrentPreviewGenerationState(
  state: { hasPreviewPanel: boolean; currentGenerationId: number; currentDocumentUri: string | undefined },
  generationId: number,
  documentUri: string
): boolean {
  return state.hasPreviewPanel && state.currentGenerationId === generationId && state.currentDocumentUri === documentUri;
}

function yieldToWebview(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function updateDiagnostics(document: vscode.TextDocument): void {
  if (!diagnosticsCollection) {
    return;
  }

  if (!isMarkVSpecDocument(document)) {
    diagnosticsCollection.delete(document.uri);
    return;
  }

  const started = Date.now();
  const result = isMarkVSpecProjectDocument(document)
    ? loadProjectFromDocument(document)
    : loadScreenDocumentResult(document).result;
  const locale = diagnosticLocaleForResult(result);
  const diagnostics = result.diagnostics.map((diagnostic) => {
    const line = Math.max((diagnostic.line ?? 1) - 1, 0);
    const textLine = document.lineAt(Math.min(line, Math.max(document.lineCount - 1, 0)));
    const range = new vscode.Range(line, 0, line, textLine.text.length);
    const severity = diagnostic.severity === "error"
      ? vscode.DiagnosticSeverity.Error
      : vscode.DiagnosticSeverity.Warning;
    const vscodeDiagnostic = new vscode.Diagnostic(range, renderDiagnosticMessageForLocale(diagnostic, locale), severity);
    vscodeDiagnostic.source = "MarkVSpec";
    return vscodeDiagnostic;
  });

  diagnosticsCollection.set(document.uri, diagnostics);
  logDuration(`updateDiagnostics ${previewDocumentLabel(document)}`, started);
}

function diagnosticLocaleForResult(result: ReturnType<typeof parseMarkVSpec> | MarkVSpecProjectLoadResult): string | undefined {
  return "screen" in result ? result.screen.locale : result.project.project.frontMatter["locale"];
}

function scheduleDiagnostics(document: vscode.TextDocument): void {
  clearScheduledDiagnostics(document);
  const documentUri = document.uri.toString();
  const timer = setTimeout(() => {
    diagnosticsUpdateTimers.delete(documentUri);
    updateDiagnostics(document);
  }, DIAGNOSTIC_UPDATE_DEBOUNCE_MS);
  diagnosticsUpdateTimers.set(documentUri, timer);
}

function clearScheduledDiagnostics(document: vscode.TextDocument): void {
  const documentUri = document.uri.toString();
  const timer = diagnosticsUpdateTimers.get(documentUri);
  if (!timer) {
    return;
  }
  clearTimeout(timer);
  diagnosticsUpdateTimers.delete(documentUri);
}

function clearAllScheduledDiagnostics(): void {
  diagnosticsUpdateTimers.forEach((timer) => clearTimeout(timer));
  diagnosticsUpdateTimers.clear();
}

function isMarkVSpecDocument(document: vscode.TextDocument): boolean {
  return document.uri.scheme === "file" && (document.languageId === "markvspec" || document.fileName.endsWith(".vspec.md") || isMarkVSpecProjectDocument(document));
}

function isMarkVSpecProjectDocument(document: vscode.TextDocument): boolean {
  return document.uri.scheme === "file" && document.fileName.endsWith(".vspec.project.md");
}

export function createMarkVSpecDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
  if (isMarkVSpecProjectDocument(document)) {
    return createMarkVSpecProjectDocumentSymbols(document);
  }

  const result = parseMarkVSpec(document.getText());
  const sections = collectSectionHeadings(document);
  const screenLine = result.screen.location?.line ?? findFirstHeadingLine(document, /^#\s+/u) ?? 1;
  const screenName = result.screen.id && result.screen.title
    ? `${result.screen.id} ${result.screen.title}`
    : result.screen.title ?? result.screen.id ?? "Untitled Screen";
  const screenSymbol = createDocumentSymbol(
    document,
    screenName,
    "Screen",
    vscode.SymbolKind.Module,
    screenLine,
    document.lineCount
  );

  for (const section of sections) {
    const sectionSymbol = createDocumentSymbol(
      document,
      section.title,
      "Section",
      vscode.SymbolKind.Namespace,
      section.line,
      section.endLine
    );
    sectionSymbol.children.push(...symbolsForSection(document, result, section));
    screenSymbol.children.push(sectionSymbol);
  }

  return [screenSymbol];
}

function createMarkVSpecProjectDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
  const result = parseMarkVSpecProject(document.getText());
  const projectLine = result.project.location?.line ?? findFirstHeadingLine(document, /^#\s+/u) ?? 1;
  const projectName = result.project.id && result.project.title
    ? `${result.project.id} ${result.project.title}`
    : result.project.title ?? result.project.id ?? "Untitled Project";
  const projectSymbol = createDocumentSymbol(
    document,
    projectName,
    "Project",
    vscode.SymbolKind.Module,
    projectLine,
    document.lineCount
  );

  for (const template of result.templates) {
    const label = [
      template.id,
      template.title,
      template.path ? `(${template.path})` : ""
    ].filter(Boolean).join(" ");
    projectSymbol.children.push(createDocumentSymbol(
      document,
      label || "Untitled Template",
      "Template",
      vscode.SymbolKind.Class,
      template.location.line,
      template.location.line
    ));
  }

  for (const screen of result.screens) {
    const label = [
      screen.id,
      screen.title,
      screen.path ? `(${screen.path})` : ""
    ].filter(Boolean).join(" ");
    projectSymbol.children.push(createDocumentSymbol(
      document,
      label || "Untitled Screen",
      "Screen",
      vscode.SymbolKind.Interface,
      screen.location.line,
      screen.location.line
    ));
  }

  return [projectSymbol];
}

export function createMarkVSpecCodeActions(
  document: vscode.TextDocument,
  diagnostics: readonly vscode.Diagnostic[]
): vscode.CodeAction[] {
  if (isMarkVSpecProjectDocument(document)) {
    return [];
  }

  const actions: vscode.CodeAction[] = [];

  for (const diagnostic of diagnostics) {
    if (diagnostic.source !== "MarkVSpec") {
      continue;
    }

    const missingTrigger = /^Action (A-[\p{L}\p{N}-]+) has no trigger\./u.exec(diagnostic.message);
    if (missingTrigger) {
      const action = createMissingTriggerAction(document, diagnostic, missingTrigger[1]);
      if (action) {
        actions.push(action);
      }
      continue;
    }

    if (diagnostic.message === "Layout section must specify a viewport, for example ## Layout: mobile.") {
      const action = createLayoutViewportAction(document, diagnostic);
      if (action) {
        actions.push(action);
      }
      continue;
    }

    const directChild = /^Layout (L-[\p{L}\p{N}-]+) uses a direct child reference; place (L-[\p{L}\p{N}-]+|E-[\p{L}\p{N}-]+) under #### Items\.$/u.exec(diagnostic.message);
    if (directChild) {
      const action = createMoveDirectLayoutItemAction(document, diagnostic, directChild[1], directChild[2]);
      if (action) {
        actions.push(action);
      }
    }
  }

  return actions;
}

export function formatMarkVSpecStructure(source: string): string {
  const hasTrailingNewline = /\r?\n$/.test(source);
  const lines = source.split(/\r?\n/);
  if (hasTrailingNewline) {
    lines.pop();
  }

  const chunks: Array<{ format: boolean; lines: string[] }> = [];
  let current: { format: boolean; lines: string[] } = { format: false, lines: [] };

  for (const line of lines) {
    const sectionKind = semanticSectionKind(line);
    if (sectionKind !== undefined) {
      if (current.lines.length > 0) {
        chunks.push(current);
      }
      current = { format: sectionKind, lines: [line] };
      continue;
    }

    if (/^##\s+/u.test(line) && !isSemanticSectionHeading(line)) {
      if (current.lines.length > 0) {
        chunks.push(current);
      }
      current = { format: false, lines: [line] };
      continue;
    }

    current.lines.push(line);
  }

  if (current.lines.length > 0) {
    chunks.push(current);
  }

  const formatted = joinFormattedChunks(chunks.map((chunk) => chunk.format ? formatSemanticSectionLines(chunk.lines) : chunk.lines.join("\n")));

  return hasTrailingNewline ? `${formatted}\n` : formatted;
}

function formatSemanticSectionLines(lines: string[]): string {
  const output: string[] = [];
  let pendingBlank = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim() === "") {
      pendingBlank = true;
      continue;
    }

    const previousLine = output[output.length - 1];
    const needsLeadingBlank = output.length > 0 && (
      /^#{2,4}\s+/u.test(line) ||
      /^-\s+(?:Triggered|From|Effects|Otherwise)\s*$/u.test(line) ||
      /^-\s+Process(?:\s+[A-Za-z][A-Za-z0-9_-]*)?\s*:/u.test(line) ||
      (previousLine !== undefined && /^#{2,4}\s+/u.test(previousLine))
    );
    if (needsLeadingBlank && output[output.length - 1] !== "") {
      output.push("");
    } else if (pendingBlank && output.length > 0 && output[output.length - 1] !== "") {
      output.push("");
    }

    output.push(line);
    pendingBlank = false;
  }

  while (output.length > 1 && output[output.length - 1] === "") {
    output.pop();
  }

  return output.join("\n");
}

function joinFormattedChunks(chunks: string[]): string {
  return chunks.reduce((joined, chunk) => {
    if (!joined) {
      return chunk;
    }

    if (joined.endsWith("\n") || chunk.startsWith("\n")) {
      return `${joined}\n${chunk}`;
    }

    return `${joined}\n\n${chunk}`;
  }, "");
}

function semanticSectionKind(line: string): boolean | undefined {
  if (!/^##\s+/u.test(line)) {
    return undefined;
  }

  return isSemanticSectionHeading(line);
}

function isSemanticSectionHeading(line: string): boolean {
  const title = /^##\s+(.+?)\s*$/u.exec(line)?.[1];
  if (!title) {
    return false;
  }

  return title === "States" ||
    title === "Elements" ||
    title === "Actions" ||
    title === "Validations" ||
    title === "Field Validations" ||
    title === "Cross-field Validations" ||
    title === "Business Rules" ||
    title === "Error Codes" ||
    title === "Model Samples" ||
    title === "Slots" ||
    /^Slot(?::\s*.+)?$/u.test(title) ||
    /^Layout(?::\s*.+)?$/u.test(title);
}

function createMissingTriggerAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic, actionId: string): vscode.CodeAction | undefined {
  const line = diagnostic.range.start.line;
  const heading = new RegExp(String.raw`^###\s+(?:\S+?:)?${escapeRegExpForPattern(actionId)}\s+`, "u");
  if (!heading.test(document.lineAt(line).text)) {
    return undefined;
  }

  const action = new vscode.CodeAction(`Add Triggered block to ${actionId}`, vscode.CodeActionKind.QuickFix);
  action.diagnostics = [diagnostic];
  action.isPreferred = true;
  const edit = new vscode.WorkspaceEdit();
  const insertLine = diagnostic.range.start.line + 1;
  edit.insert(document.uri, new vscode.Position(insertLine, 0), "\n- Triggered\n  - E-Element.click");
  action.edit = edit;
  return action;
}

function createLayoutViewportAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction | undefined {
  const viewport = parseFrontMatterViewport(document.getText());
  if (!viewport) {
    return undefined;
  }

  const line = diagnostic.range.start.line;
  if (document.lineAt(line).text.trim() !== "## Layout") {
    return undefined;
  }

  const action = new vscode.CodeAction(`Change to ## Layout: ${viewport}`, vscode.CodeActionKind.QuickFix);
  action.diagnostics = [diagnostic];
  action.isPreferred = true;
  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, new vscode.Range(line, 0, line, document.lineAt(line).text.length), `## Layout: ${viewport}`);
  action.edit = edit;
  return action;
}

function createMoveDirectLayoutItemAction(
  document: vscode.TextDocument,
  diagnostic: vscode.Diagnostic,
  layoutId: string,
  itemId: string
): vscode.CodeAction | undefined {
  const sourceLine = diagnostic.range.start.line;
  if (document.lineAt(sourceLine).text.trim() !== `- ${itemId}`) {
    return undefined;
  }

  const bounds = findParentLayoutBounds(document, sourceLine, layoutId);
  if (!bounds) {
    return undefined;
  }

  const action = new vscode.CodeAction(`Move ${itemId} under #### Items`, vscode.CodeActionKind.QuickFix);
  action.diagnostics = [diagnostic];
  const edit = new vscode.WorkspaceEdit();
  edit.delete(document.uri, lineRange(document, sourceLine));

  const itemsLine = findItemsSubsectionLine(document, bounds.headingLine, bounds.endLine);
  if (itemsLine !== undefined) {
    edit.insert(document.uri, new vscode.Position(itemsLine + 1, 0), `- ${itemId}\n`);
  } else {
    edit.insert(document.uri, new vscode.Position(bounds.endLine, 0), `\n#### Items\n\n- ${itemId}\n`);
  }

  action.edit = edit;
  return action;
}

interface SectionHeading {
  title: string;
  line: number;
  endLine: number;
}

function collectSectionHeadings(document: vscode.TextDocument): SectionHeading[] {
  const headings: SectionHeading[] = [];

  for (let index = 0; index < document.lineCount; index += 1) {
    const match = /^##\s+(.+?)\s*$/.exec(document.lineAt(index).text);
    if (!match) {
      continue;
    }

    if (match[1].startsWith("#")) {
      continue;
    }

    headings.push({
      title: match[1],
      line: index + 1,
      endLine: document.lineCount
    });
  }

  for (let index = 0; index < headings.length; index += 1) {
    headings[index].endLine = index + 1 < headings.length ? headings[index + 1].line - 1 : document.lineCount;
  }

  return headings;
}

function symbolsForSection(
  document: vscode.TextDocument,
  result: ReturnType<typeof parseMarkVSpec>,
  section: SectionHeading
): vscode.DocumentSymbol[] {
  if (section.title === "States") {
    return result.states
      .filter((state) => isLineInSection(state.location.line, section))
      .map((state) => createDocumentSymbol(document, state.name, state.initial ? "initial state" : "state", vscode.SymbolKind.EnumMember, state.location.line, state.location.line));
  }

  if (section.title.startsWith("Layout:")) {
    return result.layoutGroups
      .filter((group) => isLineInSection(group.location.line, section))
      .map((group) => createDocumentSymbol(document, layoutSymbolName(group), group.viewport, vscode.SymbolKind.Struct, group.location.line, nextSiblingLineEnd(document, group.location.line, section.endLine)));
  }

  if (section.title.startsWith("Slot:")) {
    return result.slotContents
      .filter((slot) => isLineInSection(slot.location.line, section))
      .flatMap((slot) => slot.layoutGroups.map((group) => createDocumentSymbol(document, layoutSymbolName(group), `Slot ${slot.name}`, vscode.SymbolKind.Struct, group.location.line, nextSiblingLineEnd(document, group.location.line, section.endLine))));
  }

  if (section.title === "Slots") {
    return result.slotDefinitions
      .filter((slot) => isLineInSection(slot.location.line, section))
      .map((slot) => createDocumentSymbol(document, slot.title ? `${slot.name} ${slot.title}` : slot.name, "Slot", vscode.SymbolKind.Interface, slot.location.line, nextSiblingLineEnd(document, slot.location.line, section.endLine)));
  }

  if (section.title === "Elements") {
    return result.elements
      .filter((element) => isLineInSection(element.location.line, section))
      .map((element) => createDocumentSymbol(document, `${formatMarkerPrefix(element.properties["marker"])}${element.id}`, element.type, vscode.SymbolKind.Field, element.location.line, nextSiblingLineEnd(document, element.location.line, section.endLine)));
  }

  if (section.title === "Actions") {
    return result.actions
      .filter((action) => isLineInSection(action.location.line, section))
      .map((action) => createDocumentSymbol(document, `${formatMarkerPrefix(action.properties["marker"])}${action.id} ${action.name}`, "Action", vscode.SymbolKind.Event, action.location.line, nextSiblingLineEnd(document, action.location.line, section.endLine)));
  }

  if (section.title === "Validations" || section.title === "Field Validations" || section.title === "Cross-field Validations") {
    return result.validations
      .filter((validation) => isLineInSection(validation.location.line, section))
      .map((validation) => createDocumentSymbol(document, `${validation.id}${validation.name ? ` ${validation.name}` : ""}`, "Validation", vscode.SymbolKind.Operator, validation.location.line, nextSiblingLineEnd(document, validation.location.line, section.endLine)));
  }

  if (section.title === "Model Samples") {
    return result.modelSamples
      .filter((sample) => isLineInSection(sample.location.line, section))
      .map((sample) => createDocumentSymbol(document, sample.path, sample.state, vscode.SymbolKind.Array, sample.location.line, nextSiblingLineEnd(document, sample.location.line, section.endLine)));
  }

  if (section.title === "Business Rules") {
    return result.rules
      .filter((rule) => isLineInSection(rule.location.line, section))
      .map((rule) => createDocumentSymbol(document, `${rule.id}${rule.name ? ` ${rule.name}` : ""}`, "Rule", vscode.SymbolKind.Key, rule.location.line, nextSiblingLineEnd(document, rule.location.line, section.endLine)));
  }

  if (section.title === "Error Codes") {
    return result.errorCodes
      .filter((errorCode) => isLineInSection(errorCode.location.line, section))
      .map((errorCode) => createDocumentSymbol(document, `${errorCode.id}${errorCode.name ? ` ${errorCode.name}` : ""}`, "Error Code", vscode.SymbolKind.Constant, errorCode.location.line, nextSiblingLineEnd(document, errorCode.location.line, section.endLine)));
  }

  return [];
}

function createDocumentSymbol(
  document: vscode.TextDocument,
  name: string,
  detail: string,
  kind: vscode.SymbolKind,
  startLine: number,
  endLine: number
): vscode.DocumentSymbol {
  const startIndex = clampLine(document, startLine) - 1;
  const endIndex = clampLine(document, endLine) - 1;
  const startText = document.lineAt(startIndex).text;
  const endText = document.lineAt(endIndex).text;
  return new vscode.DocumentSymbol(
    name,
    detail,
    kind,
    new vscode.Range(startIndex, 0, endIndex, endText.length),
    new vscode.Range(startIndex, 0, startIndex, startText.length)
  );
}

function layoutSymbolName(group: ReturnType<typeof parseMarkVSpec>["layoutGroups"][number]): string {
  return `${formatMarkerPrefix(group.properties["marker"])}${group.id}${group.name ? ` ${group.name}` : ""}`;
}

function isLineInSection(line: number, section: SectionHeading): boolean {
  return line > section.line && line <= section.endLine;
}

function nextSiblingLineEnd(document: vscode.TextDocument, startLine: number, sectionEndLine: number): number {
  for (let line = startLine + 1; line <= sectionEndLine; line += 1) {
    if (/^###\s+/u.test(document.lineAt(line - 1).text)) {
      return line - 1;
    }
  }

  return sectionEndLine;
}

function findFirstHeadingLine(document: vscode.TextDocument, pattern: RegExp): number | undefined {
  for (let index = 0; index < document.lineCount; index += 1) {
    if (pattern.test(document.lineAt(index).text)) {
      return index + 1;
    }
  }

  return undefined;
}

function clampLine(document: vscode.TextDocument, line: number): number {
  return Math.min(Math.max(line, 1), Math.max(document.lineCount, 1));
}

function formatMarkerPrefix(marker: string | true | undefined): string {
  return typeof marker === "string" && marker ? `${marker}:` : "";
}

function parseFrontMatterViewport(source: string): string | undefined {
  const lines = source.split(/\r?\n/);
  if (lines[0] !== "---") {
    return undefined;
  }

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === "---") {
      return undefined;
    }

    const match = /^viewport:\s*(.+?)\s*$/.exec(line);
    if (match) {
      return unquoteYamlScalar(match[1].trim());
    }
  }

  return undefined;
}

function unquoteYamlScalar(value: string): string {
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function escapeRegExpForPattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findParentLayoutBounds(
  document: vscode.TextDocument,
  sourceLine: number,
  layoutId: string
): { headingLine: number; endLine: number } | undefined {
  for (let line = sourceLine; line >= 0; line -= 1) {
    const text = document.lineAt(line).text;
    if (/^##\s+/u.test(text)) {
      return undefined;
    }

    const match = /^###\s+(?:(\S+?):)?(L-[\p{L}\p{N}-]+)\s+/u.exec(text);
    if (match) {
      if (match[2] !== layoutId) {
        return undefined;
      }

      return {
        headingLine: line,
        endLine: findBlockEndLine(document, line)
      };
    }
  }

  return undefined;
}

function findBlockEndLine(document: vscode.TextDocument, headingLine: number): number {
  for (let line = headingLine + 1; line < document.lineCount; line += 1) {
    if (/^#{2,3}\s+/u.test(document.lineAt(line).text)) {
      return line;
    }
  }

  return document.lineCount;
}

function findItemsSubsectionLine(document: vscode.TextDocument, startLine: number, endLine: number): number | undefined {
  for (let line = startLine + 1; line < endLine; line += 1) {
    if (document.lineAt(line).text.trim() === "#### Items") {
      return line;
    }
  }

  return undefined;
}

function lineRange(document: vscode.TextDocument, line: number): vscode.Range {
  if (line + 1 < document.lineCount) {
    return new vscode.Range(line, 0, line + 1, 0);
  }

  return new vscode.Range(line, 0, line, document.lineAt(line).text.length);
}

function previewDocumentLabel(document: vscode.TextDocument): string {
  const relativePath = vscode.workspace.asRelativePath(document.uri, false);
  return relativePath === document.uri.fsPath ? basename(document.uri.fsPath) : relativePath;
}

function renderStandaloneDocumentHtml(document: vscode.TextDocument, mermaidScript: string | undefined): string {
  return isMarkVSpecProjectDocument(document)
    ? renderStandaloneProjectHtml(loadProjectFromDocument(document), mermaidScript, previewDocumentLabel(document))
    : renderStandaloneHtml(loadScreenDocumentResult(document), mermaidScript, previewDocumentLabel(document));
}

function loadProjectFromDocument(document: vscode.TextDocument): MarkVSpecProjectLoadResult {
  const cached = getCachedProjectDocumentResult(document);
  if (cached) {
    return cached;
  }

  const result = loadMarkVSpecProject(document.getText(), {
    projectPath: document.uri.fsPath,
    workspaceRoot: workspaceRootForDocument(document),
    realpath: resolveFsRealPath,
    readFile: readProjectFile
  });
  const messages = resolveProjectRendererMessagesForDocument(document, result);
  projectRendererMessagesByResult.set(result, messages);
  setCachedProjectDocumentResult(document, result);
  return result;
}

export function loadScreenDocumentResult(document: vscode.TextDocument): ScreenDocumentResult {
  const cached = getCachedScreenDocumentResult(document);
  if (cached) {
    return cached;
  }

  const screen = parseMarkVSpec(document.getText());
  const workspaceRoot = workspaceRootForDocument(document);
  const documentReferencePaths = resolveDocumentReferencePaths(document.uri.fsPath, screen);
  documentReferencePathsByResult.set(screen, documentReferencePaths);
  const partialPreviewLoad = loadPartialPreviewsForScreen({
    sourcePath: document.uri.fsPath,
    result: screen,
    referenceInfo: documentReferencePaths.partials,
    workspaceRoot,
    parseFile: parseProjectMarkVSpecFile,
    resolveRealPath: resolveFsRealPath
  });
  const { partials, paths: partialPaths } = partialPreviewLoad;
  const templateRef = screen.screen.template;
  const templatePathReference = templateRef && screen.screen.templateSrc
    ? {
        path: resolveProjectPath(document.uri.fsPath, screen.screen.templateSrc),
        displayPath: screen.screen.templateSrc,
        expectedId: templateRef
      }
    : undefined;
  if (!templateRef || !templatePathReference) {
    if (templateRef) {
      updateDocumentReferenceInfo(documentReferencePaths.templates, templateRef, { status: "missing" });
    }
    if (partials.size > 0) {
      enrichPartialReferenceInfo(documentReferencePaths.partials, partials);
      registerPartialPreviews(screen, partials, partialPaths);
    }
    const loaded = screenDocumentResult(document, screen);
    setCachedScreenDocumentResult(document, loaded);
    return loaded;
  }

  if (!isProjectReferenceAllowed(templatePathReference.path, workspaceRoot, resolveFsRealPath)) {
    updateDocumentReferenceInfo(documentReferencePaths.templates, templateRef, { status: "outside workspace" });
    screen.diagnostics.push({
      severity: "error",
      message: `Template file is outside the workspace: ${templatePathReference.displayPath}.`,
      line: 1
    });
    const loaded = screenDocumentResult(document, screen);
    setCachedScreenDocumentResult(document, loaded);
    return loaded;
  }

  const template = parseProjectMarkVSpecFile(templatePathReference.path);
  if (!template) {
    updateDocumentReferenceInfo(documentReferencePaths.templates, templateRef, { status: "missing" });
    screen.diagnostics.push({
      severity: "error",
      message: `Template file not found: ${templatePathReference.displayPath}.`,
      line: 1
    });
    const loaded = screenDocumentResult(document, screen);
    setCachedScreenDocumentResult(document, loaded);
    return loaded;
  }

  screen.diagnostics.push(...template.diagnostics);
  if (templatePathReference.expectedId && template.screen.id !== templatePathReference.expectedId) {
    updateDocumentReferenceInfo(documentReferencePaths.templates, templateRef, {
      title: template.screen.title,
      status: "id mismatch"
    });
    screen.diagnostics.push({
      severity: "error",
      message: `Template reference ${templatePathReference.expectedId} points to file with template ID ${template.screen.id ?? "missing"}.`,
      line: 1
    });
    const loaded = screenDocumentResult(document, screen);
    setCachedScreenDocumentResult(document, loaded);
    return loaded;
  }
  if (template.screen.type !== "template") {
    updateDocumentReferenceInfo(documentReferencePaths.templates, templateRef, {
      title: template.screen.title,
      status: "wrong type"
    });
    screen.diagnostics.push({
      severity: "error",
      message: `Template path ${templatePathReference.displayPath} points to a non-template document.`,
      line: 1
    });
    const loaded = screenDocumentResult(document, screen);
    setCachedScreenDocumentResult(document, loaded);
    return loaded;
  }

  const composed = composeMarkVSpecTemplate(template, screen);
  updateDocumentReferenceInfo(documentReferencePaths.templates, templateRef, {
    title: template.screen.title,
    status: "loaded"
  });
  enrichPartialReferenceInfo(documentReferencePaths.partials, partials);
  documentReferencePathsByResult.set(composed, documentReferencePaths);
  if (partials.size > 0) {
    registerPartialPreviews(composed, partials, partialPaths);
  }
  const loaded = {
    result: composed,
    focus: focusScopeForScreen(screen),
    messages: resolveRendererMessagesForDocument(document, composed)
  };
  rendererMessagesByResult.set(composed, loaded.messages);
  setCachedScreenDocumentResult(document, loaded);
  return loaded;
}

function screenDocumentResult(document: vscode.TextDocument, result: ReturnType<typeof parseMarkVSpec>, focus?: FocusScope): ScreenDocumentResult {
  const messages = resolveRendererMessagesForDocument(document, result);
  rendererMessagesByResult.set(result, messages);
  return { result, focus, messages };
}

function workspaceRootForDocument(document: vscode.TextDocument): string | undefined {
  return typeof vscode.workspace.getWorkspaceFolder === "function"
    ? vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath
    : undefined;
}

function workspaceRootForUri(uri: vscode.Uri): string | undefined {
  return typeof vscode.workspace.getWorkspaceFolder === "function"
    ? vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath
    : undefined;
}

function isWorkspaceTrusted(): boolean {
  return typeof vscode.workspace.isTrusted === "boolean" ? vscode.workspace.isTrusted : true;
}

function resolveFsRealPath(path: string): string | undefined {
  try {
    return realpathSync.native(path);
  } catch {
    return undefined;
  }
}

function resolveRendererMessagesForDocument(document: vscode.TextDocument, result: ReturnType<typeof parseMarkVSpec>): RendererMessages {
  const resolved = resolveRendererMessages({
    locale: result.screen.locale,
    sourcePath: document.uri.fsPath,
    frontMatterPath: result.screen.frontMatter["messages"],
    workspaceRoot: workspaceRootForDocument(document)
  });
  result.diagnostics.push(...resolved.diagnostics.map((diagnostic) => ({
    severity: diagnostic.severity,
    message: diagnostic.message,
    line: 1
  })));
  return resolved.messages;
}

function resolveProjectRendererMessagesForDocument(document: vscode.TextDocument, result: MarkVSpecProjectLoadResult): RendererMessages {
  const resolved = resolveRendererMessages({
    locale: result.project.project.frontMatter["locale"],
    sourcePath: document.uri.fsPath,
    frontMatterPath: result.project.project.frontMatter["messages"],
    workspaceRoot: workspaceRootForDocument(document)
  });
  result.diagnostics.push(...resolved.diagnostics.map((diagnostic) => ({
    severity: diagnostic.severity,
    message: diagnostic.message,
    line: 1
  })));
  return resolved.messages;
}

function resolveDocumentReferencePaths(
  screenPath: string,
  result: ReturnType<typeof parseMarkVSpec>
): { templates: Map<string, DocumentReferenceInfo>; partials: Map<string, DocumentReferenceInfo> } {
  const templates = new Map<string, DocumentReferenceInfo>();
  if (result.screen.template && result.screen.templateSrc) {
    templates.set(result.screen.template, {
      path: resolveProjectPath(screenPath, result.screen.templateSrc),
      displayPath: result.screen.templateSrc
    });
  }
  return {
    templates,
    partials: new Map(Object.entries(result.screen.references.partials).map(([referenceId, path]) => [referenceId, {
      path: resolveProjectPath(screenPath, path),
      displayPath: path
    } satisfies DocumentReferenceInfo]))
  };
}

function focusScopeForScreen(result: ReturnType<typeof parseMarkVSpec>): FocusScope {
  return {
    layoutIds: new Set([
      ...result.layoutGroups.map((layout) => layout.id),
      ...result.slotContents.flatMap((slot) => slot.layoutGroups.map((layout) => layout.id))
    ]),
    elementIds: new Set(result.elements.map((element) => element.id)),
    actionIds: new Set(result.actions.map((action) => action.id))
  };
}

function readProjectFile(path: string): string | undefined {
  return readProjectFileWithFingerprint(path)?.source;
}

function readProjectFileWithFingerprint(path: string): { source: string; fingerprint: string } | undefined {
  const normalizedPath = path.replace(/\\/gu, "/");
  const openDocument = vscode.workspace.textDocuments?.find((document) => document.uri.scheme === "file" && document.uri.fsPath.replace(/\\/gu, "/") === normalizedPath);
  if (openDocument) {
    return {
      source: openDocument.getText(),
      fingerprint: `open:${openDocument.uri.toString()}:${openDocument.version}`
    };
  }

  if (!existsSync(path)) {
    return undefined;
  }

  const stat = statSync(path);
  const fingerprint = `file:${stat.mtimeMs}:${stat.size}`;
  const cached = projectFileContentCache.get(normalizedPath);
  if (cached?.fingerprint === fingerprint) {
    return cached;
  }

  const source = readFileSync(path, "utf8");
  const entry = { source, fingerprint };
  projectFileContentCache.set(normalizedPath, entry);
  return entry;
}

function parseProjectMarkVSpecFile(path: string): ReturnType<typeof parseMarkVSpec> | undefined {
  const normalizedPath = path.replace(/\\/gu, "/");
  const file = readProjectFileWithFingerprint(path);
  if (!file) {
    return undefined;
  }

  const cached = parsedProjectFileCache.get(normalizedPath);
  if (cached?.fingerprint === file.fingerprint) {
    return cached.result;
  }

  const result = parseMarkVSpec(file.source);
  parsedProjectFileCache.set(normalizedPath, { fingerprint: file.fingerprint, result });
  return result;
}

function documentCacheKey(document: vscode.TextDocument): string | undefined {
  return typeof document.version === "number" ? `${document.uri.toString()}@${document.version}` : undefined;
}

function getCachedScreenDocumentResult(document: vscode.TextDocument): ScreenDocumentResult | undefined {
  const key = documentCacheKey(document);
  return key ? screenDocumentResultCache.get(key) : undefined;
}

function setCachedScreenDocumentResult(document: vscode.TextDocument, result: ScreenDocumentResult): void {
  const key = documentCacheKey(document);
  if (key) {
    screenDocumentResultCache.set(key, result);
  }
}

function getCachedProjectDocumentResult(document: vscode.TextDocument): MarkVSpecProjectLoadResult | undefined {
  const key = documentCacheKey(document);
  return key ? projectDocumentResultCache.get(key) : undefined;
}

function setCachedProjectDocumentResult(document: vscode.TextDocument, result: MarkVSpecProjectLoadResult): void {
  const key = documentCacheKey(document);
  if (key) {
    projectDocumentResultCache.set(key, result);
  }
}

function invalidateDocumentCaches(document?: vscode.TextDocument): void {
  screenDocumentResultCache.clear();
  projectDocumentResultCache.clear();

  if (!document) {
    projectFileContentCache.clear();
    parsedProjectFileCache.clear();
    return;
  }

  const normalizedPath = document.uri.fsPath.replace(/\\/gu, "/");
  projectFileContentCache.delete(normalizedPath);
  parsedProjectFileCache.delete(normalizedPath);
}

function logDuration(label: string, started: number): void {
  outputChannel?.appendLine(`[perf] ${label}: ${Date.now() - started}ms`);
}

function logRenderInvalidation(sourceLabel: string, previousSource: string, currentSource: string): void {
  const invalidation = computeMarkVSpecRenderInvalidation(previousSource, currentSource);
  logRenderInvalidationResult(sourceLabel, invalidation);
}

function logRenderInvalidationResult(sourceLabel: string, invalidation: ReturnType<typeof computeMarkVSpecRenderInvalidation>): void {
  outputChannel?.appendLine(
    [
      `[render-invalidation] ${sourceLabel}`,
      `sections=${formatLogList(invalidation.changedSectionIds)}`,
      `renderKeys=${formatLogList(invalidation.impactedRenderKeys)}`,
      `wireframeKeys=${formatLogList(invalidation.wireframeRenderKeys)}`,
      `documentKeys=${formatLogList(invalidation.previewDocumentRenderKeys)}`,
      `diagnosticsKeys=${formatLogList(invalidation.diagnosticsRenderKeys)}`,
      `diagnosticsMayChange=${invalidation.diagnosticsMayChange}`,
      `fullRender=${invalidation.requiresFullRender}`
    ].join(" ")
  );
}

interface PreviewFragmentUpdate {
  renderKey: string;
  html: string[];
}

export interface PreviewPatchResult {
  success: boolean;
  reason: string;
  webviewPatchMs?: number;
}

export interface PreviewUpdateTelemetry {
  sourceLabel: string;
  generationId: number;
  phase: "plan" | "fragment-patch" | "full-render" | "fallback-full" | "noop";
  planKind?: PreviewUpdatePlan["kind"];
  fragmentGroups?: number;
  expectedFragmentGroups?: number;
  patchSuccess?: boolean;
  patchReason?: string;
  elapsedMs?: number;
  parseMs?: number;
  invalidationMs?: number;
  fragmentRenderMs?: number;
  patchMs?: number;
  webviewPatchMs?: number;
  fullRenderMs?: number;
  reason?: string;
}

type PreviewDesignFragmentRenderer = (context: {
  result: ReturnType<typeof parseMarkVSpec>;
  focus: FocusScope | undefined;
  renderKey: string;
}) => string[];

const previewDesignFragmentRenderers = new Map<string, PreviewDesignFragmentRenderer>([
  ["elements:list", ({ result, focus, renderKey }) => {
    const scope = buildDocumentScope(result, focus);
    return extractRenderKeyFragments(renderViewportStateScreensSpec(scope), renderKey);
  }],
  ["form-groups:list", ({ result, focus, renderKey }) => {
    const scope = buildDocumentScope(result, focus);
    return extractRenderKeyFragments(renderFormGroupsSpec(scope.specResult), renderKey);
  }],
  ["layouts:list", ({ result, focus, renderKey }) => {
    const scope = buildDocumentScope(result, focus);
    return extractRenderKeyFragments(renderViewportStateScreensSpec(scope), renderKey);
  }]
]);

type RenderInvalidationSummary = Pick<
  ReturnType<typeof computeMarkVSpecRenderInvalidation>,
  "requiresFullRender" | "wireframeRenderKeys" | "previewDocumentRenderKeys"
>;

export type PreviewUpdatePlan =
  | { kind: "full"; reason: "no-previous-source" | "requires-full-render" }
  | { kind: "noop"; reason: "unchanged-source" | "no-render-keys" }
  | { kind: "fragment"; expectedFragmentGroups: number }
  | { kind: "fallback-full"; reason: "fragment-generation-mismatch"; expectedFragmentGroups: number; actualFragmentGroups: number };

export function buildPreviewUpdatePlan(input: {
  hasPreviousSource: boolean;
  invalidation?: RenderInvalidationSummary;
  fragmentGroupCount?: number;
  sourceUnchanged?: boolean;
}): PreviewUpdatePlan {
  if (input.sourceUnchanged && input.hasPreviousSource) {
    return { kind: "noop", reason: "unchanged-source" };
  }
  if (!input.hasPreviousSource || !input.invalidation) {
    return { kind: "full", reason: "no-previous-source" };
  }
  if (input.invalidation.requiresFullRender) {
    return { kind: "full", reason: "requires-full-render" };
  }

  const expectedFragmentGroups = input.invalidation.wireframeRenderKeys.length + input.invalidation.previewDocumentRenderKeys.length;
  const actualFragmentGroups = input.fragmentGroupCount ?? 0;
  if (expectedFragmentGroups === 0 && actualFragmentGroups === 0) {
    return { kind: "noop", reason: "no-render-keys" };
  }
  if (actualFragmentGroups > 0 && actualFragmentGroups === expectedFragmentGroups) {
    return { kind: "fragment", expectedFragmentGroups };
  }

  return {
    kind: "fallback-full",
    reason: "fragment-generation-mismatch",
    expectedFragmentGroups,
    actualFragmentGroups
  };
}

export function formatPreviewUpdateTelemetry(input: PreviewUpdateTelemetry): string {
  const parts = [
    `[preview-update] ${input.sourceLabel}`,
    `generation=${input.generationId}`,
    `phase=${input.phase}`
  ];
  if (input.planKind) {
    parts.push(`plan=${input.planKind}`);
  }
  if (input.fragmentGroups !== undefined) {
    parts.push(`fragments=${input.fragmentGroups}`);
  }
  if (input.expectedFragmentGroups !== undefined) {
    parts.push(`expectedFragments=${input.expectedFragmentGroups}`);
  }
  if (input.patchSuccess !== undefined) {
    parts.push(`patchSuccess=${input.patchSuccess}`);
  }
  if (input.patchReason) {
    parts.push(`patchReason=${input.patchReason}`);
  }
  if (input.reason) {
    parts.push(`reason=${input.reason}`);
  }
  for (const [key, value] of [
    ["elapsedMs", input.elapsedMs],
    ["parseMs", input.parseMs],
    ["invalidationMs", input.invalidationMs],
    ["fragmentRenderMs", input.fragmentRenderMs],
    ["patchMs", input.patchMs],
    ["webviewPatchMs", input.webviewPatchMs],
    ["fullRenderMs", input.fullRenderMs]
  ] as const) {
    if (value !== undefined) {
      parts.push(`${key}=${value}`);
    }
  }
  return parts.join(" ");
}

function logPreviewUpdateTelemetry(input: PreviewUpdateTelemetry): void {
  outputChannel?.appendLine(formatPreviewUpdateTelemetry(input));
}

export function renderPreviewFragmentUpdates(
  screen: ReturnType<typeof parseMarkVSpec> | ScreenDocumentResult,
  invalidation: Pick<ReturnType<typeof computeMarkVSpecRenderInvalidation>, "wireframeRenderKeys" | "previewDocumentRenderKeys">
): PreviewFragmentUpdate[] {
  const { result, focus } = normalizeScreenDocumentResult(screen);
  const scope = buildDocumentScope(result, focus);
  const wireframeHtml = renderViewportStateScreensSpec(scope);
  const wireframeFragments = invalidation.wireframeRenderKeys
    .map((renderKey) => ({
      renderKey,
      html: extractRenderKeyFragments(wireframeHtml, renderKey)
    }))
    .filter((fragment) => fragment.html.length > 0);
  const documentFragments = invalidation.previewDocumentRenderKeys
    .map((renderKey) => ({
      renderKey,
      html: renderPreviewDesignKeyFragments(result, focus, renderKey)
    }))
    .filter((fragment) => fragment.html.length > 0);
  return [...wireframeFragments, ...documentFragments];
}

function renderPreviewDesignKeyFragments(
  result: ReturnType<typeof parseMarkVSpec>,
  focus: FocusScope | undefined,
  renderKey: string
): string[] {
  return previewDesignFragmentRenderers.get(renderKey)?.({ result, focus, renderKey }) ?? [];
}

export function extractRenderKeyFragments(html: string, renderKey: string): string[] {
  const fragments: string[] = [];
  const attribute = `data-mm-render-key="${escapeHtml(renderKey)}"`;
  let searchFrom = 0;

  while (searchFrom < html.length) {
    const attributeIndex = html.indexOf(attribute, searchFrom);
    if (attributeIndex === -1) {
      break;
    }

    const start = html.lastIndexOf("<", attributeIndex);
    if (start === -1 || html.startsWith("<!--", start)) {
      searchFrom = attributeIndex + attribute.length;
      continue;
    }

    const tagMatch = /^<([a-z][a-z0-9-]*)\b/iu.exec(html.slice(start));
    if (!tagMatch) {
      searchFrom = attributeIndex + attribute.length;
      continue;
    }

    const end = findElementHtmlEnd(html, start, tagMatch[1].toLowerCase());
    if (end === -1) {
      searchFrom = attributeIndex + attribute.length;
      continue;
    }

    fragments.push(html.slice(start, end));
    searchFrom = end;
  }

  return fragments;
}

function findElementHtmlEnd(html: string, start: number, tagName: string): number {
  const tagPattern = new RegExp(`<\\/?${escapeRegExpForPattern(tagName)}\\b[^>]*>`, "giu");
  tagPattern.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(html)) !== null) {
    const token = match[0];
    const isClosing = token.startsWith("</");
    const isSelfClosing = /\/>\s*$/u.test(token);
    if (isClosing) {
      depth -= 1;
      if (depth === 0) {
        return tagPattern.lastIndex;
      }
      continue;
    }

    if (!isSelfClosing) {
      depth += 1;
    }
  }

  return -1;
}

async function postPreviewFragmentUpdate(panel: vscode.WebviewPanel, fragments: PreviewFragmentUpdate[], generationId: number): Promise<PreviewPatchResult> {
  const updateId = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const result = new Promise<PreviewPatchResult>((resolve) => {
    const timer = setTimeout(() => {
      pendingFragmentUpdates.delete(updateId);
      resolve({ success: false, reason: "webview-timeout" });
    }, PREVIEW_WEBVIEW_UPDATE_TIMEOUT_MS);
    pendingFragmentUpdates.set(updateId, (patchResult) => {
      clearTimeout(timer);
      resolve(patchResult);
    });
  });

  let posted = false;
  try {
    posted = await panel.webview.postMessage({
      command: "replaceFragments",
      generationId,
      requestId: updateId,
      updateId,
      fragments
    });
  } catch {
    posted = false;
  }
  if (!posted) {
    const resolve = pendingFragmentUpdates.get(updateId);
    pendingFragmentUpdates.delete(updateId);
    resolve?.({ success: false, reason: "post-message-failed" });
  }

  return result;
}

function resolvePendingFragmentUpdates(success: boolean): void {
  for (const resolve of pendingFragmentUpdates.values()) {
    resolve({ success, reason: success ? "disposed-success" : "disposed" });
  }
  pendingFragmentUpdates.clear();
}

function normalizePreviewPatchResult(message: { generationId?: number; success?: boolean; reason?: string; webviewPatchMs?: number }, documentUri: string): PreviewPatchResult {
  return normalizePreviewPatchResultState(
    {
      hasPreviewPanel: Boolean(previewPanel),
      currentGenerationId: previewGenerationId,
      currentDocumentUri: previewDocumentUri?.toString()
    },
    message,
    documentUri
  );
}

export function normalizePreviewPatchResultState(
  state: { hasPreviewPanel: boolean; currentGenerationId: number; currentDocumentUri: string | undefined },
  message: { generationId?: number; success?: boolean; reason?: string; webviewPatchMs?: number },
  documentUri: string
): PreviewPatchResult {
  if (typeof message.generationId !== "number") {
    return { success: false, reason: message.reason ?? "missing-generation" };
  }
  if (!isCurrentPreviewGenerationState(state, message.generationId, documentUri)) {
    return { success: false, reason: "stale-generation-result" };
  }
  const normalized: PreviewPatchResult = {
    success: Boolean(message.success),
    reason: message.reason ?? (message.success ? "applied" : "webview-rejected")
  };
  if (typeof message.webviewPatchMs === "number" && Number.isFinite(message.webviewPatchMs)) {
    normalized.webviewPatchMs = message.webviewPatchMs;
  }
  return normalized;
}

function formatLogList(values: string[]): string {
  return values.length > 0 ? values.join(",") : "-";
}

export function renderPreviewHtml(
  screen: ReturnType<typeof parseMarkVSpec> | ScreenDocumentResult,
  webview: vscode.Webview,
  visibleMarkers: { layout: boolean; element: boolean; action: boolean },
  extensionUri: vscode.Uri | undefined,
  sourceLabel?: string,
  autoUpdate = PREVIEW_AUTO_UPDATE_DEFAULT,
  interactiveControls = true,
  showRepeatedContent = false
): string {
  const { result, focus } = normalizeScreenDocumentResult(screen);
  const messages = "messages" in screen && screen.messages ? screen.messages : rendererMessagesForResult(result);
  rendererMessagesByResult.set(result, messages);
  const nonce = createNonce();
  const mermaidScriptUri = extensionUri ? mermaidScriptWebviewUri(webview, extensionUri) : undefined;
  const document = renderDesignDocumentHtml(result, "", { focus, messages });
  const title = result.screen.title ?? result.screen.id ?? "Untitled MarkVSpec Screen";
  const resolvedLocale = resolveLocale(result.screen.locale);
  const clientMessages = previewClientMessages(messages);
  const cspSource = webview.cspSource;

  return `<!doctype html>
<html lang="${escapeHtml(resolvedLocale)}">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
${renderScreenPreviewStyles()}
    </style>
  </head>
  <body class="${previewBodyClasses(visibleMarkers, showRepeatedContent)}">
    <header class="toolbar">
      <div class="toolbar-controls">
        <div class="control-group marker-actions" role="group" aria-label="${escapeHtml(messages.markerVisibility)}">
          <span class="control-label">${escapeHtml(messages.markers)}</span>
          <span class="segmented">
          ${renderMarkerToggle("layout", messages.layout, visibleMarkers.layout, messages)}
          ${renderMarkerToggle("element", messages.element, visibleMarkers.element, messages)}
          ${renderMarkerToggle("action", messages.action, visibleMarkers.action, messages)}
          </span>
        </div>
        <div class="control-group repeated-actions" role="group" aria-label="${escapeHtml(messages.showRepeatedContent)}">
          <label class="switch-control" title="${escapeHtml(messages.showRepeatedContent)}">
            <input type="checkbox" data-repeated-toggle role="switch" aria-label="${escapeHtml(messages.showRepeatedContent)}" ${showRepeatedContent ? "checked" : ""}>
            <span>${escapeHtml(messages.showRepeatedContent)}</span>
          </label>
        </div>
        ${interactiveControls ? renderPreviewUpdateControls(messages, autoUpdate) : ""}
      </div>
    </header>
    <button class="toc-toggle" type="button" aria-label="${escapeHtml(messages.toggleContents)}" aria-expanded="true" title="${escapeHtml(messages.toggleContents)}" data-toc-toggle>
      <span class="toc-toggle-bars" aria-hidden="true"></span>
    </button>
    <main class="content">
      <section class="preview">${document}</section>
    </main>
    ${renderPreviewPrintWireframeOverrideStyle({ includePartialPreviewClamp: true })}
    <nav class="toc" aria-label="${escapeHtml(messages.contents)}">
      <div class="toc-title">${escapeHtml(messages.contents)}</div>
      ${renderTableOfContentsList(messages)}
    </nav>
      ${mermaidScriptUri ? `<script nonce="${nonce}" src="${mermaidScriptUri}"></script>` : ""}
    <script nonce="${nonce}">
      function markvspecAcquireVscodeApi() {
        if (window.__markvspecVscodeApi) {
          return window.__markvspecVscodeApi;
        }
        try {
          window.__markvspecVscodeApi = acquireVsCodeApi();
          return window.__markvspecVscodeApi;
        } catch (error) {
          console.warn("Unable to acquire VS Code API for MarkVSpec preview.", error);
          return { postMessage() {} };
        }
      }
      const vscode = markvspecAcquireVscodeApi();
      function serializePreviewClientError(error) {
        if (error instanceof Error) {
          return {
            message: error.message,
            stack: error.stack || ""
          };
        }
        return {
          message: String(error),
          stack: ""
        };
      }
      function reportPreviewClientError(phase, error, detail) {
        const serialized = serializePreviewClientError(error);
        try {
          const previewApi = window.__markvspecVscodeApi;
          if (previewApi && typeof previewApi.postMessage === "function") {
            previewApi.postMessage({
              command: "previewClientError",
              phase,
              message: serialized.message,
              stack: serialized.stack,
              detail
            });
            return;
          }
          console.error("MarkVSpec preview error.", phase, error, detail);
        } catch (postError) {
          console.error("Unable to report MarkVSpec preview error.", postError, phase, error);
        }
      }
      window.addEventListener("error", (event) => {
        reportPreviewClientError("window.error", event.error || event.message, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });
      window.addEventListener("unhandledrejection", (event) => {
        reportPreviewClientError("window.unhandledrejection", event.reason);
      });
      function runPreviewInitializer(name, initializer) {
        try {
          const result = initializer();
          if (result && typeof result.then === "function") {
            result.catch((error) => reportPreviewClientError(name, error));
          }
          return result;
        } catch (error) {
          reportPreviewClientError(name, error);
          return undefined;
        }
      }
      const markvspecMessages = ${scriptJson(clientMessages)};
      const markvspecPreviewPositionKey = ${scriptJson(sourceLabel ?? "__markvspec-preview__")};
      let previewPositionRestorePending = true;
      const pendingRenderCommits = new Map();
      runPreviewInitializer("renderMermaidDiagrams", () => renderMermaidDiagrams());
      runPreviewInitializer("initTableOfContents", () => initTableOfContents());
      runPreviewInitializer("initActiveTableOfContents", () => initActiveTableOfContents());
      runPreviewInitializer("initTableOfContentsToggle", () => initTableOfContentsToggle());
      runPreviewInitializer("initRepeatedContentToggle", () => initRepeatedContentToggle());
      runPreviewInitializer("initPreviewRefreshControls", () => initPreviewRefreshControls());
      runPreviewInitializer("initPreviewFragmentUpdates", () => initPreviewFragmentUpdates());
      runPreviewInitializer("initPreviewPositionTracking", () => initPreviewPositionTracking());
      runPreviewInitializer("restorePreviewPosition", () => restorePreviewPosition());

      async function renderMermaidDiagrams() {
        const blocks = Array.from(document.querySelectorAll("[data-mermaid-source]"));
        const prepared = blocks.map((block) => {
          const source = block.textContent || "";
          const cacheKey = mermaidCacheKey(source);
          return {
            ...prepareMermaidBlock(block, cacheKey),
            cacheKey,
            source
          };
        });
        if (!window.mermaid) {
          prepared.forEach((item) => {
            item.placeholder.textContent = markvspecMessages.mermaidRenderFailed;
          });
          return;
        }

        try {
          window.mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            theme: "default"
          });
        } catch (error) {
          prepared.forEach((item) => {
            item.placeholder.textContent = markvspecMessages.mermaidRenderFailed;
          });
          reportPreviewClientError("renderMermaidDiagrams.initialize", error);
          return;
        }

        for (let index = 0; index < prepared.length; index += 1) {
          const item = prepared[index];
          const output = document.createElement("div");
          output.className = "mermaid-render";
          applyCachedMermaidSize(output, item.cacheKey);
          try {
            const rendered = await window.mermaid.render("markvspec-mermaid-" + index, item.source);
            output.innerHTML = rendered.svg;
            item.placeholder.replaceWith(output);
            rememberMermaidSize(item.cacheKey, item.wrapper);
          } catch (error) {
            item.placeholder.textContent = markvspecMessages.mermaidRenderFailed;
            reportPreviewClientError("renderMermaidDiagrams", error, { index });
          }
        }
      }

      function prepareMermaidBlock(block, cacheKey) {
        const wrapper = document.createElement("div");
        wrapper.className = "mermaid-block";
        applyCachedMermaidSize(wrapper, cacheKey);
        const existingPlaceholder = block.nextElementSibling && block.nextElementSibling.matches("[data-mermaid-placeholder]")
          ? block.nextElementSibling
          : undefined;
        const placeholder = existingPlaceholder || document.createElement("div");
        placeholder.className = "mermaid-placeholder";
        placeholder.textContent = placeholder.textContent || markvspecMessages.mermaidRendering;
        applyCachedMermaidSize(placeholder, cacheKey);
        const toggle = document.createElement("button");
        toggle.className = "mermaid-source-toggle";
        toggle.type = "button";
        toggle.textContent = markvspecMessages.mermaidShowSource;
        toggle.setAttribute("aria-label", markvspecMessages.mermaidShowSource);
        toggle.setAttribute("aria-pressed", "false");
        toggle.addEventListener("click", () => {
          const visible = !wrapper.classList.contains("is-source-visible");
          wrapper.classList.toggle("is-source-visible", visible);
          toggle.textContent = visible ? markvspecMessages.mermaidHideSource : markvspecMessages.mermaidShowSource;
          toggle.setAttribute("aria-label", visible ? markvspecMessages.mermaidHideSource : markvspecMessages.mermaidShowSource);
          toggle.setAttribute("aria-pressed", String(visible));
        });
        block.before(wrapper);
        wrapper.appendChild(block);
        wrapper.appendChild(toggle);
        wrapper.appendChild(placeholder);
        return { wrapper, placeholder };
      }

      function mermaidSizeCache() {
        if (!(window.__markvspecMermaidSizeCache instanceof Map)) {
          window.__markvspecMermaidSizeCache = new Map();
        }
        return window.__markvspecMermaidSizeCache;
      }

      function mermaidCacheKey(source) {
        let hash = 2166136261;
        for (let index = 0; index < source.length; index += 1) {
          hash ^= source.charCodeAt(index);
          hash = Math.imul(hash, 16777619);
        }
        return "mmd:" + source.length + ":" + (hash >>> 0).toString(36);
      }

      function applyCachedMermaidSize(element, cacheKey) {
        const cached = mermaidSizeCache().get(cacheKey);
        if (!cached || typeof cached.height !== "number" || !Number.isFinite(cached.height) || cached.height <= 0) {
          return;
        }
        element.style.minHeight = cached.height + "px";
      }

      function rememberMermaidSize(cacheKey, element) {
        requestAnimationFrame(() => {
          const rect = element.getBoundingClientRect();
          const height = Math.ceil(rect.height);
          if (!Number.isFinite(height) || height <= 0 || height > 10000) {
            return;
          }
          mermaidSizeCache().set(cacheKey, { height });
          element.style.minHeight = height + "px";
        });
      }

      document.querySelectorAll("[data-marker-toggle]").forEach((toggle) => {
        toggle.addEventListener("click", () => {
          const category = toggle.getAttribute("data-marker-toggle");
          if (!category) {
            return;
          }

          const nextPressed = toggle.getAttribute("aria-pressed") !== "true";
          toggle.setAttribute("aria-pressed", String(nextPressed));
          document.body.classList.toggle("hide-marker-" + category, !nextPressed);
          vscode.postMessage({
            command: "toggleMarker",
            category
          });
        });
      });

      function initRepeatedContentToggle() {
        const toggle = document.querySelector("[data-repeated-toggle]");
        if (!toggle) {
          return;
        }
        toggle.addEventListener("change", () => {
          const enabled = Boolean(toggle.checked);
          document.body.classList.toggle("hide-repeated-content", !enabled);
          vscode.postMessage({
            command: "toggleRepeatedContent",
            enabled
          });
        });
      }

      document.querySelectorAll("[data-mm-reference-path]").forEach((link) => {
        link.addEventListener("click", (event) => {
          const path = link.getAttribute("data-mm-reference-path");
          if (!path) {
            return;
          }

          event.preventDefault();
          vscode.postMessage({
            command: "openReference",
            path
          });
        });
      });

      function initPreviewFragmentUpdates() {
        window.addEventListener("message", async (event) => {
          const message = event.data || {};
          if (message.command === "renderReadyResult") {
            const resolve = pendingRenderCommits.get(message.updateId);
            if (resolve) {
              pendingRenderCommits.delete(message.updateId);
              resolve(Boolean(message.commit));
            }
            return;
          }

          if (message.command !== "replaceFragments") {
            return;
          }

          const requestId = message.requestId || "";
          const updateId = message.updateId || requestId;
          const generationId = message.generationId;
          const result = await applyFragmentUpdate(message.fragments, generationId, updateId);
          vscode.postMessage({
            command: "fragmentUpdateResult",
            generationId,
            reason: result.reason,
            requestId,
            success: result.success,
            updateId,
            webviewPatchMs: result.webviewPatchMs
          });
        });
      }

      async function applyFragmentUpdate(fragments, generationId, updateId) {
        const patchStarted = performance.now();
        const patchResult = (success, reason, measuredMs) => ({
          success,
          reason,
          webviewPatchMs: Math.round(measuredMs ?? (performance.now() - patchStarted))
        });
        if (!Array.isArray(fragments)) {
          return patchResult(false, "invalid-fragments");
        }
        if (typeof generationId !== "number" || typeof updateId !== "string" || updateId.length === 0) {
          return patchResult(false, "invalid-update-id");
        }

        const replacements = [];
        for (const fragment of fragments) {
          if (!fragment || typeof fragment.renderKey !== "string" || !Array.isArray(fragment.html)) {
            return patchResult(false, "invalid-fragment");
          }
          const targets = Array.from(document.querySelectorAll('[data-mm-render-key="' + cssAttributeEscape(fragment.renderKey) + '"]'));
          if (targets.length === 0 || targets.length !== fragment.html.length) {
            return patchResult(false, "target-count-mismatch:" + fragment.renderKey);
          }

          for (let index = 0; index < targets.length; index += 1) {
            const template = document.createElement("template");
            template.innerHTML = String(fragment.html[index]).trim();
            const replacement = template.content.firstElementChild;
            const significantNodes = Array.from(template.content.childNodes).filter((node) => !(node.nodeType === Node.TEXT_NODE && !node.textContent.trim()));
            if (!replacement || significantNodes.length !== 1 || significantNodes[0] !== replacement || replacement.getAttribute("data-mm-render-key") !== fragment.renderKey) {
              return patchResult(false, "replacement-root-mismatch:" + fragment.renderKey);
            }
            replacements.push({ target: targets[index], replacement });
          }
        }

        const preCommitPatchMs = performance.now() - patchStarted;
        const commit = await requestRenderCommit(generationId, updateId);
        if (!commit) {
          return patchResult(false, "render-commit-rejected", preCommitPatchMs);
        }

        const domPatchStarted = performance.now();
        const scrollYBeforePatch = window.scrollY;
        for (const item of replacements) {
          item.target.replaceWith(item.replacement);
        }
        initTableOfContents();
        updateTableOfContentsVisibility();
        updateStickyOffset();
        window.scrollTo(0, scrollYBeforePatch);
        updateActiveTableOfContents();
        savePreviewPosition(currentActiveSectionId());
        return patchResult(true, "applied", preCommitPatchMs + (performance.now() - domPatchStarted));
      }

      function requestRenderCommit(generationId, updateId) {
        return new Promise((resolve) => {
          const timer = setTimeout(() => {
            pendingRenderCommits.delete(updateId);
            resolve(false);
          }, ${PREVIEW_WEBVIEW_UPDATE_TIMEOUT_MS});
          pendingRenderCommits.set(updateId, (commit) => {
            clearTimeout(timer);
            resolve(commit);
          });
          vscode.postMessage({
            command: "renderReady",
            generationId,
            updateId
          });
        });
      }

      function cssAttributeEscape(value) {
        if (window.CSS && typeof window.CSS.escape === "function") {
          return window.CSS.escape(value);
        }
        return String(value).replace(/\\\\/g, "\\\\\\\\").replace(/"/g, '\\\\"');
      }

      function initPreviewRefreshControls() {
        const refresh = document.querySelector("[data-refresh-preview]");
        const autoUpdate = document.querySelector("[data-auto-update]");
        const syncRefreshState = () => {
          if (refresh && autoUpdate) {
            refresh.disabled = Boolean(autoUpdate.checked);
          }
        };
        if (autoUpdate) {
          autoUpdate.addEventListener("change", () => {
            syncRefreshState();
            vscode.postMessage({ command: "setAutoUpdate", enabled: Boolean(autoUpdate.checked) });
          });
        }
        if (refresh) {
          refresh.addEventListener("click", () => {
            if (refresh.disabled) {
              return;
            }
            savePreviewPosition(currentActiveSectionId());
            vscode.postMessage({ command: "refreshPreview" });
          });
        }
        syncRefreshState();

      }

      function initTableOfContents() {
        const lists = Array.from(document.querySelectorAll("[data-toc-list]"));
        if (lists.length === 0) {
          return;
        }

        try {
          lists.forEach((list) => setTableOfContentsStatus(list, "loading"));
          const sections = Array.from(document.querySelectorAll(".document > .doc-section"));
          lists.forEach((list) => {
            list.innerHTML = "";
            appendTableOfContentsItems(list, sections);
            if (list.querySelector("[data-toc-target]")) {
              clearTableOfContentsStatus(list);
            } else {
              setTableOfContentsStatus(list, "empty");
            }
          });
          updateTableOfContentsVisibility();
        } catch (error) {
          lists.forEach((list) => setTableOfContentsStatus(list, "error"));
          throw error;
        }
      }

      function clearTableOfContentsStatus(list) {
        list.removeAttribute("aria-busy");
        list.removeAttribute("aria-live");
      }

      function setTableOfContentsStatus(list, status) {
        const messages = {
          loading: markvspecMessages.contentsLoading,
          empty: markvspecMessages.contentsEmpty,
          error: markvspecMessages.contentsError
        };
        list.innerHTML = "";
        list.setAttribute("aria-busy", status === "loading" ? "true" : "false");
        list.setAttribute("aria-live", "polite");
        const item = document.createElement("li");
        item.className = "toc-status is-" + status;
        item.dataset.tocStatus = status;
        item.textContent = messages[status] || status;
        list.appendChild(item);
      }

      function appendTableOfContentsItems(list, sections) {
        const viewportGroups = new Map();
        sections.forEach((section, index) => {
          const heading = representativeSectionHeading(section);
          if (!heading) {
            return;
          }

          ensureSectionId(section, index);
          if (section.classList.contains("state-views-section")) {
            appendStateViewsTableOfContentsItem(list, section);
            return;
          }
          if (section.classList.contains("state-screen-section")) {
            appendStateTableOfContentsItem(list, viewportGroups, section, heading);
            return;
          }

          const item = document.createElement("li");
          item.dataset.tocTarget = section.id;
          const link = document.createElement("a");
          link.href = "#" + section.id;
          link.textContent = headingText(heading);
          item.appendChild(link);
          list.appendChild(item);
        });
      }

      function representativeSectionHeading(section) {
        if (section.classList.contains("screen-spec-section")) {
          return undefined;
        }
        const directHeading = Array.from(section.children).find((child) => child.tagName === "H2");
        if (directHeading) {
          return directHeading;
        }
        if (section.classList.contains("state-screen-section")) {
          return section.querySelector(".state-screen-heading");
        }
        return undefined;
      }

      function appendStateTableOfContentsItem(list, viewportGroups, section, heading) {
        const viewport = section.getAttribute("data-viewport") || "__default__";
        let group = viewportGroups.get(viewport);
        if (!group) {
          const groupItem = document.createElement("li");
          groupItem.className = "toc-state-group";
          const groupLink = document.createElement("a");
          groupLink.href = "#" + section.id;
          groupLink.textContent = viewportGroupText(section, heading);
          const sublist = document.createElement("ol");
          sublist.className = "toc-sublist";
          groupItem.appendChild(groupLink);
          groupItem.appendChild(sublist);
          list.appendChild(groupItem);
          group = { item: groupItem, sublist };
          viewportGroups.set(viewport, group);
        }

        const item = document.createElement("li");
        item.dataset.tocTarget = section.id;
        const link = document.createElement("a");
        link.href = "#" + section.id;
        link.textContent = stateHeadingText(section, heading);
        item.appendChild(link);
        group.sublist.appendChild(item);
      }

      function appendStateViewsTableOfContentsItem(list, section) {
        const heading = representativeSectionHeading(section);
        if (!heading) {
          return;
        }

        const item = document.createElement("li");
        item.dataset.tocTarget = section.id;
        const link = document.createElement("a");
        link.href = "#" + section.id;
        link.textContent = headingText(heading);
        const viewportList = document.createElement("ol");
        viewportList.className = "toc-sublist";
        item.appendChild(link);
        item.appendChild(viewportList);
        list.appendChild(item);

        const viewports = Array.from(section.querySelectorAll(":scope > .state-viewport-section"));
        viewports.forEach((viewportSection, viewportIndex) => {
          ensureSectionId(viewportSection, "state-viewport-" + viewportIndex);
          const viewportHeading = Array.from(viewportSection.children).find((child) => child.tagName === "H3");
          const viewportItem = document.createElement("li");
          viewportItem.className = "toc-state-group";
          viewportItem.dataset.tocTarget = viewportSection.id;
          const viewportLink = document.createElement("a");
          viewportLink.href = "#" + viewportSection.id;
          viewportLink.textContent = viewportHeading ? viewportTocText(viewportSection, viewportHeading) : viewportSection.getAttribute("data-viewport") || "Viewport";
          const stateList = document.createElement("ol");
          stateList.className = "toc-sublist";
          viewportItem.appendChild(viewportLink);
          viewportItem.appendChild(stateList);
          viewportList.appendChild(viewportItem);

          Array.from(viewportSection.querySelectorAll(":scope > .state-screen-section")).forEach((stateSection, stateIndex) => {
            ensureSectionId(stateSection, "state-screen-" + viewportIndex + "-" + stateIndex);
            const stateHeading = stateSection.querySelector(".state-screen-heading");
            const stateItem = document.createElement("li");
            stateItem.dataset.tocTarget = stateSection.id;
            const stateLink = document.createElement("a");
            stateLink.href = "#" + stateSection.id;
            stateLink.textContent = numberedTocText(stateSection, stateSection.getAttribute("data-state-view-title") || stateSection.getAttribute("data-state") || (stateHeading ? stateHeadingText(stateSection, stateHeading) : "State"));
            stateItem.appendChild(stateLink);
            stateList.appendChild(stateItem);
          });
        });
      }

      function ensureSectionId(section, index) {
        if (!section.id) {
          section.id = "markvspec-section-" + index;
        }
      }

      function headingText(heading) {
        const parts = Array.from(heading.childNodes)
          .map((node) => node.textContent || "")
          .map((value) => value.trim())
          .filter(Boolean);
        return parts.join(" ") || "Section";
      }

      function viewportHeadingText(heading) {
        const parts = Array.from(heading.childNodes)
          .filter((node) => !(node.nodeType === Node.ELEMENT_NODE && (node.classList.contains("state-label") || node.classList.contains("state-badge"))))
          .map((node) => node.textContent || "")
          .map((value) => value.trim())
          .filter(Boolean);
        return parts.join(" ");
      }

      function viewportGroupText(section, heading) {
        const viewport = section.getAttribute("data-viewport");
        if (!viewport) {
          return viewportHeadingText(heading) || "Default";
        }
        const headingViewport = viewportHeadingText(heading);
        return headingViewport && headingViewport.includes(viewport) ? headingViewport : "Viewport " + viewport;
      }

      function viewportTocText(section, heading) {
        const viewport = section.getAttribute("data-viewport");
        const parts = Array.from(heading.childNodes)
          .filter((node) => !(node.nodeType === Node.ELEMENT_NODE && node.classList.contains("state-badge")))
          .map((node) => node.textContent || "")
          .map((value) => value.trim())
          .filter(Boolean);
        return parts.join(" ") || (viewport ? "Viewport " + viewport : "Viewport");
      }

      function stateHeadingText(section, heading) {
        const stateViewTitle = section.getAttribute("data-state-view-title");
        if (stateViewTitle) {
          return stateViewTitle;
        }
        const parts = Array.from(heading.querySelectorAll(".state-label"))
          .map((node) => node.textContent || "")
          .map((value) => value.trim())
          .filter(Boolean);
        return parts.join(" ") || headingText(heading);
      }

      function numberedTocText(section, label) {
        const sectionNumber = section.getAttribute("data-section-number");
        return sectionNumber ? sectionNumber + ". " + label : label;
      }

      function updateTableOfContentsVisibility() {
        document.querySelectorAll("[data-toc-target]").forEach((item) => {
          const target = item.getAttribute("data-toc-target");
          const section = target ? document.getElementById(target) : undefined;
          item.hidden = Boolean(section && section.hidden);
        });
        document.querySelectorAll(".toc-state-group").forEach((group) => {
          const stateItems = Array.from(group.querySelectorAll("[data-toc-target]"));
          group.hidden = stateItems.length > 0 && stateItems.every((item) => item.hidden);
        });
        updateActiveTableOfContents();
      }

      function initActiveTableOfContents() {
        initStickyOffsetTracking();
        updateActiveTableOfContents();
        window.addEventListener("scroll", updateActiveTableOfContents, { passive: true });
        window.addEventListener("resize", updateActiveTableOfContents);
      }

      function initStickyOffsetTracking() {
        updateStickyOffset();
        const toolbar = document.querySelector(".toolbar");
        if (toolbar && typeof ResizeObserver === "function") {
          const observer = new ResizeObserver(() => {
            updateStickyOffset();
            updateActiveTableOfContents();
          });
          observer.observe(toolbar);
        }
      }

      function updateStickyOffset() {
        const toolbar = document.querySelector(".toolbar");
        const visible = toolbar && getComputedStyle(toolbar).display !== "none";
        const offset = visible ? Math.ceil(toolbar.getBoundingClientRect().height + 12) : 0;
        document.documentElement.style.setProperty("--markvspec-sticky-offset", offset + "px");
        return offset;
      }

      function updateActiveTableOfContents() {
        const items = Array.from(document.querySelectorAll("[data-toc-target]"));
        if (items.length === 0) {
          return;
        }

        const activeSection = findActiveSection();
        const activeId = activeSection?.id || "";
        items.forEach((item) => {
          item.classList.toggle("is-active", !item.hidden && item.getAttribute("data-toc-target") === activeId);
        });
        savePreviewPosition(activeId);
      }

      function findActiveSection() {
        const sections = Array.from(document.querySelectorAll(".document .doc-section, .document .state-viewport-section"))
          .filter((section) => !section.hidden && section.offsetParent !== null);
        const anchorY = updateStickyOffset() + 16;
        return sections.reduce((best, section) => {
          const rect = section.getBoundingClientRect();
          if (rect.bottom < anchorY) {
            return best;
          }
          if (!best) {
            return section;
          }
          const bestRect = best.getBoundingClientRect();
          const bestDistance = Math.abs(bestRect.top - anchorY);
          const distance = Math.abs(rect.top - anchorY);
          return distance < bestDistance ? section : best;
        }, undefined);
      }

      function currentActiveSectionId() {
        return findActiveSection()?.id || "";
      }

      function initPreviewPositionTracking() {
        window.addEventListener("scroll", () => {
          savePreviewPosition(currentActiveSectionId());
        }, { passive: true });
      }

      function savePreviewPosition(activeSectionId) {
        if (previewPositionRestorePending) {
          return;
        }
        const state = previewState();
        const positionsBySource = {
          ...(state.positionsBySource && typeof state.positionsBySource === "object" ? state.positionsBySource : {})
        };
        positionsBySource[markvspecPreviewPositionKey] = {
          activeSectionId,
          scrollY: window.scrollY
        };
        savePreviewState({
          ...state,
          positionsBySource
        });
      }

      function restorePreviewPosition() {
        const state = previewPositionState();
        requestAnimationFrame(() => {
          try {
            if (Number.isFinite(state.scrollY)) {
              window.scrollTo(0, state.scrollY);
              return;
            }
            if (state.activeSectionId) {
              const section = document.getElementById(state.activeSectionId);
              if (section) {
                section.scrollIntoView({ block: "start" });
                return;
              }
            }
            window.scrollTo(0, 0);
          } finally {
            previewPositionRestorePending = false;
            updateActiveTableOfContents();
          }
        });
      }

      function initTableOfContentsToggle() {
        const toggle = document.querySelector("[data-toc-toggle]");
        if (!toggle) {
          return;
        }

        const state = previewState();
        setTableOfContentsCollapsed(Boolean(state.tocCollapsed), false);
        toggle.addEventListener("click", () => {
          setTableOfContentsCollapsed(!document.body.classList.contains("toc-collapsed"), true);
        });
      }

      function setTableOfContentsCollapsed(collapsed, persist) {
        const toggle = document.querySelector("[data-toc-toggle]");
        document.body.classList.toggle("toc-collapsed", collapsed);
        if (toggle) {
          toggle.setAttribute("aria-expanded", String(!collapsed));
          toggle.setAttribute("title", collapsed ? markvspecMessages.showContents : markvspecMessages.hideContents);
        }
        if (persist) {
          savePreviewState({ ...previewState(), tocCollapsed: collapsed });
        }
      }

      function previewState() {
        if (typeof vscode !== "undefined" && typeof vscode.getState === "function") {
          return vscode.getState() || {};
        }
        return {};
      }

      function previewPositionState() {
        const state = previewState();
        const positionsBySource = state.positionsBySource;
        if (positionsBySource && typeof positionsBySource === "object") {
          return positionsBySource[markvspecPreviewPositionKey] || {};
        }
        return {};
      }

      function savePreviewState(state) {
        if (typeof vscode !== "undefined" && typeof vscode.setState === "function") {
          vscode.setState(state);
        }
      }

      function markerLabel(category) {
        if (category === "layout") return markvspecMessages.layout;
        if (category === "element") return markvspecMessages.element;
        return markvspecMessages.action;
      }
    </script>
  </body>
</html>`;
}

export function renderStandaloneHtml(
  screen: ReturnType<typeof parseMarkVSpec> | ScreenDocumentResult,
  mermaidScript: string | undefined,
  sourceLabel?: string
): string {
  const html = renderPreviewHtml(
    screen,
    {
      cspSource: "'self'",
      asWebviewUri: (uri: vscode.Uri) => uri
    } as vscode.Webview,
    { layout: true, element: true, action: true },
    undefined,
    sourceLabel,
    true,
    false
  );

  const inlineMermaid = mermaidScript ? `    <script>\n${mermaidScript}\n    </script>\n` : "";
  return html
    .replace(/^\s*<meta http-equiv="Content-Security-Policy"[^>]+>\n/mu, "")
    .replace(/      function markvspecAcquireVscodeApi\(\) \{[\s\S]*?      const vscode = markvspecAcquireVscodeApi\(\);\n/, "")
    .replace(/          vscode\.postMessage\(\{\n            command: "toggleMarker",\n            category\n          \}\);\n/mu, "")
    .replace("          event.preventDefault();\n", "")
    .replace(/          vscode\.postMessage\(\{\n            command: "openReference",\n            path\n          \}\);\n/mu, "")
    .replace(/\s+vscode\.postMessage\([\s\S]*?\);\n/gu, "")
    .replace("    <script nonce=", () => `${inlineMermaid}    <script nonce=`);
}

function normalizeScreenDocumentResult(screen: ReturnType<typeof parseMarkVSpec> | ScreenDocumentResult): ScreenDocumentResult {
  return "result" in screen ? screen : { result: screen };
}

export function renderProjectPreviewHtml(
  project: MarkVSpecProjectLoadResult,
  webview: vscode.Webview,
  extensionUri: vscode.Uri | undefined,
  sourceLabel?: string,
  autoUpdate = PREVIEW_AUTO_UPDATE_DEFAULT,
  interactiveControls = true
): string {
  const messages = projectRendererMessagesForResult(project);
  const resolvedLocale = resolveLocale(project.project.project.frontMatter["locale"]);
  const nonce = createNonce();
  const mermaidScriptUri = extensionUri ? mermaidScriptWebviewUri(webview, extensionUri) : undefined;
  const title = project.project.project.title ?? project.project.project.id ?? "Untitled MarkVSpec Project";
  const clientMessages = previewClientMessages(messages);
  const metaItems = [
    sourceLabel,
    project.project.project.status
  ].filter((item): item is string => Boolean(item)).map((item) => `<span class="meta-item">${escapeHtml(item)}</span>`);
  const document = renderProjectDesignDocumentHtml(project, messages);
  const cspSource = webview.cspSource;

  return `<!doctype html>
<html lang="${escapeHtml(resolvedLocale)}">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
${renderProjectPreviewStyles()}
    </style>
  </head>
  <body>
    <header class="toolbar">
      <div>
        <div class="title">${escapeHtml(title)}</div>
        <div class="meta">${metaItems.join("")}</div>
      </div>
      ${interactiveControls ? `<div class="toolbar-controls">
        ${renderPreviewUpdateControls(messages, autoUpdate)}
      </div>` : ""}
    </header>
    <button class="toc-toggle" type="button" aria-label="${escapeHtml(messages.toggleContents)}" aria-expanded="true" title="${escapeHtml(messages.toggleContents)}" data-toc-toggle>
      <span class="toc-toggle-bars" aria-hidden="true"></span>
    </button>
    <main class="content">${document}</main>
    ${renderPreviewPrintWireframeOverrideStyle()}
    <nav class="toc" aria-label="${escapeHtml(pLabel(messages, "contents"))}">
      <div class="toc-title">${escapeHtml(pLabel(messages, "contents"))}</div>
      ${renderTableOfContentsList(messages)}
    </nav>
    ${mermaidScriptUri ? `<script nonce="${nonce}" src="${mermaidScriptUri}"></script>` : ""}
    <script nonce="${nonce}">
      ${interactiveControls ? `function markvspecAcquireVscodeApi() {
        if (window.__markvspecVscodeApi) {
          return window.__markvspecVscodeApi;
        }
        try {
          window.__markvspecVscodeApi = acquireVsCodeApi();
          return window.__markvspecVscodeApi;
        } catch (error) {
          console.warn("Unable to acquire VS Code API for MarkVSpec preview.", error);
          return { postMessage() {} };
        }
      }
      const vscode = markvspecAcquireVscodeApi();` : ""}
      function serializePreviewClientError(error) {
        if (error instanceof Error) {
          return {
            message: error.message,
            stack: error.stack || ""
          };
        }
        return {
          message: String(error),
          stack: ""
        };
      }
      function reportPreviewClientError(phase, error, detail) {
        const serialized = serializePreviewClientError(error);
        try {
          const previewApi = window.__markvspecVscodeApi;
          if (previewApi && typeof previewApi.postMessage === "function") {
            previewApi.postMessage({
              command: "previewClientError",
              phase,
              message: serialized.message,
              stack: serialized.stack,
              detail
            });
            return;
          }
          console.error("MarkVSpec preview error.", phase, error, detail);
        } catch (postError) {
          console.error("Unable to report MarkVSpec preview error.", postError, phase, error);
        }
      }
      window.addEventListener("error", (event) => {
        reportPreviewClientError("window.error", event.error || event.message, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });
      window.addEventListener("unhandledrejection", (event) => {
        reportPreviewClientError("window.unhandledrejection", event.reason);
      });
      function runPreviewInitializer(name, initializer) {
        try {
          const result = initializer();
          if (result && typeof result.then === "function") {
            result.catch((error) => reportPreviewClientError(name, error));
          }
          return result;
        } catch (error) {
          reportPreviewClientError(name, error);
          return undefined;
        }
      }
      const markvspecMessages = ${scriptJson(clientMessages)};
      const markvspecPreviewPositionKey = ${scriptJson(sourceLabel ?? "__markvspec-project-preview__")};
      let previewPositionRestorePending = true;
      runPreviewInitializer("renderMermaidDiagrams", () => renderMermaidDiagrams());
      runPreviewInitializer("initTableOfContents", () => initTableOfContents());
      runPreviewInitializer("initActiveTableOfContents", () => initActiveTableOfContents());
      runPreviewInitializer("initTableOfContentsToggle", () => initTableOfContentsToggle());
      runPreviewInitializer("initPreviewRefreshControls", () => initPreviewRefreshControls());
      runPreviewInitializer("initPreviewPositionTracking", () => initPreviewPositionTracking());
      runPreviewInitializer("restorePreviewPosition", () => restorePreviewPosition());

      async function renderMermaidDiagrams() {
        const blocks = Array.from(document.querySelectorAll("[data-mermaid-source]"));
        const prepared = blocks.map((block) => {
          const source = block.textContent || "";
          const cacheKey = mermaidCacheKey(source);
          return {
            ...prepareMermaidBlock(block, cacheKey),
            cacheKey,
            source
          };
        });
        if (!window.mermaid) {
          prepared.forEach((item) => {
            item.placeholder.textContent = markvspecMessages.mermaidRenderFailed;
          });
          return;
        }

        try {
          window.mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            theme: "default"
          });
        } catch (error) {
          prepared.forEach((item) => {
            item.placeholder.textContent = markvspecMessages.mermaidRenderFailed;
          });
          reportPreviewClientError("renderMermaidDiagrams.initialize", error);
          return;
        }

        for (let index = 0; index < prepared.length; index += 1) {
          const item = prepared[index];
          const output = document.createElement("div");
          output.className = "mermaid-render";
          applyCachedMermaidSize(output, item.cacheKey);
          try {
            const rendered = await window.mermaid.render("markvspec-project-mermaid-" + index, item.source);
            output.innerHTML = rendered.svg;
            item.placeholder.replaceWith(output);
            rememberMermaidSize(item.cacheKey, item.wrapper);
          } catch (error) {
            item.placeholder.textContent = markvspecMessages.mermaidRenderFailed;
            reportPreviewClientError("renderMermaidDiagrams", error, { index });
          }
        }
      }

      function prepareMermaidBlock(block, cacheKey) {
        const wrapper = document.createElement("div");
        wrapper.className = "mermaid-block";
        applyCachedMermaidSize(wrapper, cacheKey);
        const existingPlaceholder = block.nextElementSibling && block.nextElementSibling.matches("[data-mermaid-placeholder]")
          ? block.nextElementSibling
          : undefined;
        const placeholder = existingPlaceholder || document.createElement("div");
        placeholder.className = "mermaid-placeholder";
        placeholder.textContent = placeholder.textContent || markvspecMessages.mermaidRendering;
        applyCachedMermaidSize(placeholder, cacheKey);
        const toggle = document.createElement("button");
        toggle.className = "mermaid-source-toggle";
        toggle.type = "button";
        toggle.textContent = markvspecMessages.mermaidShowSource;
        toggle.setAttribute("aria-label", markvspecMessages.mermaidShowSource);
        toggle.setAttribute("aria-pressed", "false");
        toggle.addEventListener("click", () => {
          const visible = !wrapper.classList.contains("is-source-visible");
          wrapper.classList.toggle("is-source-visible", visible);
          toggle.textContent = visible ? markvspecMessages.mermaidHideSource : markvspecMessages.mermaidShowSource;
          toggle.setAttribute("aria-label", visible ? markvspecMessages.mermaidHideSource : markvspecMessages.mermaidShowSource);
          toggle.setAttribute("aria-pressed", String(visible));
        });
        block.before(wrapper);
        wrapper.appendChild(block);
        wrapper.appendChild(toggle);
        wrapper.appendChild(placeholder);
        return { wrapper, placeholder };
      }

      function mermaidSizeCache() {
        if (!(window.__markvspecMermaidSizeCache instanceof Map)) {
          window.__markvspecMermaidSizeCache = new Map();
        }
        return window.__markvspecMermaidSizeCache;
      }

      function mermaidCacheKey(source) {
        let hash = 2166136261;
        for (let index = 0; index < source.length; index += 1) {
          hash ^= source.charCodeAt(index);
          hash = Math.imul(hash, 16777619);
        }
        return "mmd:" + source.length + ":" + (hash >>> 0).toString(36);
      }

      function applyCachedMermaidSize(element, cacheKey) {
        const cached = mermaidSizeCache().get(cacheKey);
        if (!cached || typeof cached.height !== "number" || !Number.isFinite(cached.height) || cached.height <= 0) {
          return;
        }
        element.style.minHeight = cached.height + "px";
      }

      function rememberMermaidSize(cacheKey, element) {
        requestAnimationFrame(() => {
          const rect = element.getBoundingClientRect();
          const height = Math.ceil(rect.height);
          if (!Number.isFinite(height) || height <= 0 || height > 10000) {
            return;
          }
          mermaidSizeCache().set(cacheKey, { height });
          element.style.minHeight = height + "px";
        });
      }

      function initTableOfContents() {
        const list = document.querySelector("[data-toc-list]");
        if (!list) {
          return;
        }

        try {
          setTableOfContentsStatus(list, "loading");
          const sections = Array.from(document.querySelectorAll(".document .doc-section"));
          list.innerHTML = "";
          sections.forEach((section, index) => {
            const heading = representativeSectionHeading(section);
            if (!heading) {
              return;
            }

            const id = section.id || "markvspec-project-section-" + index;
            section.id = id;
            const item = document.createElement("li");
            item.dataset.tocTarget = id;
            const link = document.createElement("a");
            link.href = "#" + id;
            link.textContent = headingText(heading);
            item.appendChild(link);
            list.appendChild(item);
          });
          if (list.querySelector("[data-toc-target]")) {
            clearTableOfContentsStatus(list);
          } else {
            setTableOfContentsStatus(list, "empty");
          }
        } catch (error) {
          setTableOfContentsStatus(list, "error");
          throw error;
        }
      }

      function clearTableOfContentsStatus(list) {
        list.removeAttribute("aria-busy");
        list.removeAttribute("aria-live");
      }

      function setTableOfContentsStatus(list, status) {
        const messages = {
          loading: markvspecMessages.contentsLoading,
          empty: markvspecMessages.contentsEmpty,
          error: markvspecMessages.contentsError
        };
        list.innerHTML = "";
        list.setAttribute("aria-busy", status === "loading" ? "true" : "false");
        list.setAttribute("aria-live", "polite");
        const item = document.createElement("li");
        item.className = "toc-status is-" + status;
        item.dataset.tocStatus = status;
        item.textContent = messages[status] || status;
        list.appendChild(item);
      }

      function representativeSectionHeading(section) {
        if (section.classList.contains("screen-spec-section")) {
          return undefined;
        }
        const directHeading = Array.from(section.children).find((child) => child.tagName === "H2");
        if (directHeading) {
          return directHeading;
        }
        if (section.classList.contains("state-screen-section")) {
          return section.querySelector(".state-screen-heading");
        }
        return undefined;
      }

      function headingText(heading) {
        const parts = Array.from(heading.childNodes)
          .map((node) => node.textContent || "")
          .map((value) => value.trim())
          .filter(Boolean);
        return parts.join(" ") || "Section";
      }

      function initActiveTableOfContents() {
        initStickyOffsetTracking();
        updateActiveTableOfContents();
        window.addEventListener("scroll", updateActiveTableOfContents, { passive: true });
        window.addEventListener("resize", updateActiveTableOfContents);
      }

      function initStickyOffsetTracking() {
        updateStickyOffset();
        const toolbar = document.querySelector(".toolbar");
        if (toolbar && typeof ResizeObserver === "function") {
          const observer = new ResizeObserver(() => {
            updateStickyOffset();
            updateActiveTableOfContents();
          });
          observer.observe(toolbar);
        }
      }

      function updateStickyOffset() {
        const toolbar = document.querySelector(".toolbar");
        const visible = toolbar && getComputedStyle(toolbar).display !== "none";
        const offset = visible ? Math.ceil(toolbar.getBoundingClientRect().height + 12) : 0;
        document.documentElement.style.setProperty("--markvspec-sticky-offset", offset + "px");
        return offset;
      }

      function updateActiveTableOfContents() {
        const items = Array.from(document.querySelectorAll("[data-toc-target]"));
        if (items.length === 0) {
          return;
        }

        const activeSection = findActiveSection();
        const activeId = activeSection?.id || "";
        items.forEach((item) => {
          item.classList.toggle("is-active", !item.hidden && item.getAttribute("data-toc-target") === activeId);
        });
        savePreviewPosition(activeId);
      }

      function findActiveSection() {
        const sections = Array.from(document.querySelectorAll(".document .doc-section, .document .state-viewport-section"))
          .filter((section) => !section.hidden && section.offsetParent !== null);
        const anchorY = updateStickyOffset() + 16;
        return sections.reduce((best, section) => {
          const rect = section.getBoundingClientRect();
          if (rect.bottom < anchorY) {
            return best;
          }
          if (!best) {
            return section;
          }
          const bestRect = best.getBoundingClientRect();
          const bestDistance = Math.abs(bestRect.top - anchorY);
          const distance = Math.abs(rect.top - anchorY);
          return distance < bestDistance ? section : best;
        }, undefined);
      }

      function currentActiveSectionId() {
        return findActiveSection()?.id || "";
      }

      function initPreviewRefreshControls() {
        const refresh = document.querySelector("[data-refresh-preview]");
        const autoUpdate = document.querySelector("[data-auto-update]");
        const syncRefreshState = () => {
          if (refresh && autoUpdate) {
            refresh.disabled = Boolean(autoUpdate.checked);
          }
        };
        if (autoUpdate) {
          autoUpdate.addEventListener("change", () => {
            syncRefreshState();
            vscode.postMessage({ command: "setAutoUpdate", enabled: Boolean(autoUpdate.checked) });
          });
        }
        if (refresh) {
          refresh.addEventListener("click", () => {
            if (refresh.disabled) {
              return;
            }
            savePreviewPosition(currentActiveSectionId());
            vscode.postMessage({ command: "refreshPreview" });
          });
        }
        syncRefreshState();

      }

      function initPreviewPositionTracking() {
        window.addEventListener("scroll", () => {
          savePreviewPosition(currentActiveSectionId());
        }, { passive: true });
      }

      function savePreviewPosition(activeSectionId) {
        if (previewPositionRestorePending) {
          return;
        }
        const state = previewState();
        const positionsBySource = {
          ...(state.positionsBySource && typeof state.positionsBySource === "object" ? state.positionsBySource : {})
        };
        positionsBySource[markvspecPreviewPositionKey] = {
          activeSectionId,
          scrollY: window.scrollY
        };
        savePreviewState({
          ...state,
          positionsBySource
        });
      }

      function restorePreviewPosition() {
        const state = previewPositionState();
        requestAnimationFrame(() => {
          try {
            if (Number.isFinite(state.scrollY)) {
              window.scrollTo(0, state.scrollY);
              return;
            }
            if (state.activeSectionId) {
              const section = document.getElementById(state.activeSectionId);
              if (section) {
                section.scrollIntoView({ block: "start" });
                return;
              }
            }
            window.scrollTo(0, 0);
          } finally {
            previewPositionRestorePending = false;
            updateActiveTableOfContents();
          }
        });
      }

      function initTableOfContentsToggle() {
        const toggle = document.querySelector("[data-toc-toggle]");
        if (!toggle) {
          return;
        }

        const state = previewState();
        setTableOfContentsCollapsed(Boolean(state.tocCollapsed), false);
        toggle.addEventListener("click", () => {
          setTableOfContentsCollapsed(!document.body.classList.contains("toc-collapsed"), true);
        });
      }

      function setTableOfContentsCollapsed(collapsed, persist) {
        const toggle = document.querySelector("[data-toc-toggle]");
        document.body.classList.toggle("toc-collapsed", collapsed);
        if (toggle) {
          toggle.setAttribute("aria-expanded", String(!collapsed));
          toggle.setAttribute("title", collapsed ? markvspecMessages.showContents : markvspecMessages.hideContents);
        }
        if (persist) {
          savePreviewState({ ...previewState(), tocCollapsed: collapsed });
        }
      }

      function previewState() {
        if (typeof vscode !== "undefined" && typeof vscode.getState === "function") {
          return vscode.getState() || {};
        }
        return {};
      }

      function previewPositionState() {
        const state = previewState();
        const positionsBySource = state.positionsBySource;
        if (positionsBySource && typeof positionsBySource === "object") {
          return positionsBySource[markvspecPreviewPositionKey] || {};
        }
        return {};
      }

      function savePreviewState(state) {
        if (typeof vscode !== "undefined" && typeof vscode.setState === "function") {
          vscode.setState(state);
        }
      }

    </script>
  </body>
</html>`;
}

export function renderStandaloneProjectHtml(
  project: MarkVSpecProjectLoadResult,
  mermaidScript: string | undefined,
  sourceLabel?: string
): string {
  const html = renderProjectPreviewHtml(
    project,
    {
      cspSource: "'self'",
      asWebviewUri: (uri: vscode.Uri) => uri
    } as vscode.Webview,
    undefined,
    sourceLabel,
    true,
    false
  );
  const inlineMermaid = mermaidScript ? `    <script>\n${mermaidScript}\n    </script>\n` : "";
  return html
    .replace(/^\s*<meta http-equiv="Content-Security-Policy"[^>]+>\n/mu, "")
    .replace(/\s+vscode\.postMessage\([\s\S]*?\);\n/gu, "")
    .replace("    <script nonce=", () => `${inlineMermaid}    <script nonce=`);
}

export function renderProjectDesignDocumentHtml(project: MarkVSpecProjectLoadResult, messages: RendererMessages = projectRendererMessagesForResult(project)): string {
  const graph = buildProjectTransitionGraph(project);
  const diagram = renderProjectTransitionMermaid(graph);
  return `<article class="document">
    ${renderProjectSpec(project, messages)}
    ${renderProjectTemplatesSpec(project, messages)}
    ${renderProjectScreensSpec(project, messages)}
    <section class="doc-section">
      <h2>${escapeHtml(pLabel(messages, "projectTransitionDiagram"))}</h2>
      <pre class="mermaid-source" data-mermaid-source><code class="language-mermaid">${escapeHtml(diagram)}</code></pre>
    </section>
    ${renderProjectTransitionsSpec(project, messages)}
    ${renderProjectDiagnosticsSpec(project, messages)}
  </article>`;
}

function projectRendererMessagesForResult(project: MarkVSpecProjectLoadResult): RendererMessages {
  return projectRendererMessagesByResult.get(project) ?? messagesForLocale(undefined);
}

function pLabel(messages: RendererMessages, key: MessageKey): string {
  return messages[key];
}

function renderProjectSpec(project: MarkVSpecProjectLoadResult, messages: RendererMessages): string {
  const summary = project.project.project;
  return `<section class="doc-section">
    <h2>${escapeHtml(pLabel(messages, "project"))}</h2>
    ${renderProjectKeyValueTable(messages, [
      [pLabel(messages, "id"), summary.id],
      [pLabel(messages, "title"), summary.title],
      [pLabel(messages, "status"), summary.status]
    ])}
  </section>`;
}

function renderProjectTemplatesSpec(project: MarkVSpecProjectLoadResult, messages: RendererMessages): string {
  if (project.templates.length === 0) {
    return "";
  }

  return `<section class="doc-section">
    <h2>${escapeHtml(pLabel(messages, "templates"))}</h2>
    ${renderProjectTable(messages,
      [pLabel(messages, "template"), pLabel(messages, "title"), pLabel(messages, "path"), pLabel(messages, "status")],
      project.templates.map((template) => [
        template.index.id ? renderDocumentRefId(template.index.id) : "",
        text(template.result?.screen.title ?? template.index.title),
        text(template.resolvedPath ?? template.index.path),
        text(template.result ? pLabel(messages, "loaded") : pLabel(messages, "missing"))
      ])
    )}
  </section>`;
}

function renderProjectScreensSpec(project: MarkVSpecProjectLoadResult, messages: RendererMessages): string {
  return `<section class="doc-section">
    <h2>${escapeHtml(pLabel(messages, "screens"))}</h2>
    ${renderProjectTable(messages,
      [pLabel(messages, "screen"), pLabel(messages, "title"), pLabel(messages, "route"), pLabel(messages, "owner"), pLabel(messages, "path"), pLabel(messages, "status")],
      project.screens.map((screen) => [
        screen.index.id ? renderDocumentRefId(screen.index.id) : "",
        text(screen.result?.screen.title ?? screen.index.title),
        text(screen.result?.screen.route),
        text(screen.result?.screen.owner ?? screen.index.owner),
        text(screen.resolvedPath ?? screen.index.path),
        text(screen.result ? pLabel(messages, "loaded") : pLabel(messages, "missing"))
      ])
    )}
  </section>`;
}

function renderProjectTransitionsSpec(project: MarkVSpecProjectLoadResult, messages: RendererMessages): string {
  const graph = buildProjectTransitionGraph(project);
  return `<section class="doc-section">
    <h2>${escapeHtml(pLabel(messages, "projectTransitions"))}</h2>
    ${renderProjectTable(messages,
      [pLabel(messages, "src"), pLabel(messages, "action"), pLabel(messages, "from"), pLabel(messages, "result"), pLabel(messages, "targetType"), pLabel(messages, "target")],
      graph.edges.map((edge) => [
        renderDocumentRefId(edge.sourceScreenId),
        text([edge.actionMarker, edge.actionName].filter(Boolean).join(" ")),
        code(edge.fromState),
        text(edge.result || "-"),
        text(edge.targetType),
        renderNavigationTarget(edge.target)
      ])
    )}
  </section>`;
}

function renderProjectDiagnosticsSpec(project: MarkVSpecProjectLoadResult, messages: RendererMessages): string {
  return `<section class="doc-section">
    <h2>${escapeHtml(pLabel(messages, "diagnostics"))}</h2>
    ${renderProjectTable(messages,
      [pLabel(messages, "severity"), pLabel(messages, "line"), pLabel(messages, "message")],
      project.diagnostics.map((diagnostic) => [
        diagnostic.severity,
        diagnostic.line ? String(diagnostic.line) : "",
        text(renderDiagnosticMessageForLocale(diagnostic, project.project.project.frontMatter["locale"]))
      ])
    )}
  </section>`;
}

function readMermaidScript(extensionUri: vscode.Uri | undefined): string | undefined {
  return extensionUri ? readMermaidScriptFromExtension(extensionUri) : undefined;
}

function renderMarkerToggle(category: "layout" | "element" | "action", labelText: string, pressed: boolean, messages: RendererMessages): string {
  return `<button type="button" data-marker-toggle="${category}" aria-pressed="${pressed ? "true" : "false"}" title="${escapeHtml(`${messages.toggleMarker}: ${labelText}`)}">${escapeHtml(labelText)}</button>`;
}

interface DesignDocumentOptions {
  focus?: FocusScope;
  messages?: RendererMessages;
}

function label(result: ReturnType<typeof parseMarkVSpec>, key: MessageKey): string {
  return rendererMessagesForResult(result)[key];
}

function rendererMessagesForResult(result: ReturnType<typeof parseMarkVSpec>): RendererMessages {
  return rendererMessagesByResult.get(result) ?? messagesForLocale(result.screen.locale);
}

function conditionLabel(result: ReturnType<typeof parseMarkVSpec>, key: string): string {
  if (key === "visible") {
    return label(result, "conditionVisibleShort");
  }
  if (key === "hidden") {
    return label(result, "conditionHiddenShort");
  }
  if (key === "disabled") {
    return label(result, "conditionDisabledShort");
  }
  if (key === "enabled") {
    return label(result, "conditionEnabledShort");
  }
  if (key === "selected") {
    return "selected";
  }
  if (key === "active") {
    return "active";
  }
  if (key === "when") {
    return label(result, "conditionWhenShort");
  }
  return key;
}

export function renderDesignDocumentHtml(result: ReturnType<typeof parseMarkVSpec>, _preview: string, options: DesignDocumentOptions = {}): string {
  const scope = buildDocumentScope(result, options.focus);
  const detailsResult = scope.specResult;
  const messages = options.messages ?? rendererMessagesForResult(result);
  rendererMessagesByResult.set(result, messages);
  rendererMessagesByResult.set(detailsResult, messages);
  let sectionNumber = 1;
  const numberedSection = (render: (number: string) => string): string => {
    const number = String(sectionNumber);
    const html = render(number);
    if (!html.trim()) {
      return "";
    }
    sectionNumber += 1;
    return html;
  };
  const numberedSections = (html: string): string => {
    if (!html.trim()) {
      return "";
    }
    let localNumber = sectionNumber;
    const numberedHtml = html.replace(/<section class="doc-section([^"]*)"([^>]*)>\s*<h2([^>]*)>/gu, (_match, classes: string, attributes: string, headingAttributes: string) => {
      const number = String(localNumber);
      localNumber += 1;
      return `<section class="doc-section${classes}" data-section-number="${escapeHtml(number)}"${attributes}>\n    <h2${headingAttributes}>${renderSectionNumber(number)} `;
    });
    sectionNumber = localNumber;
    return numberedHtml;
  };

  return renderDesignDocumentSections([
    renderScreenSpec(result),
    renderHistorySpec(result),
    renderInlineTableOfContents(result),
    numberedSection((number) => withSectionNumber(renderStatesSpec(detailsResult), number)),
    numberedSection((number) => withSectionNumber(renderStateFlowSpec(detailsResult), number)),
    numberedSection((number) => withSectionNumber(renderViewportStateScreensSpec(scope, number), number)),
    numberedSection((number) => withSectionNumber(renderActionDetailsSpec(detailsResult), number)),
    numberedSection((number) => withSectionNumber(renderFormGroupsSpec(detailsResult), number)),
    numberedSection((number) => withSectionNumber(renderValidationRulesSpec(detailsResult), number)),
    numberedSection((number) => withSectionNumber(renderRulesSpec(detailsResult), number)),
    numberedSection((number) => withSectionNumber(renderErrorCodesSpec(detailsResult), number)),
    numberedSections(renderNotesSpec(result)),
    numberedSection((number) => withSectionNumber(renderScreenTransitionsSpec(detailsResult), number)),
    numberedSection((number) => withSectionNumber(renderActionTransitionsSpec(detailsResult), number)),
    numberedSection((number) => withSectionNumber(renderDiagnosticsSpec(result), number))
  ]);
}

function withSectionNumber(html: string, sectionNumber: string): string {
  if (!html.trim()) {
    return "";
  }
  return html
    .replace(/<section class="doc-section([^"]*)"/u, (_match, classes: string) => `<section class="doc-section${classes}" data-section-number="${escapeHtml(sectionNumber)}"`)
    .replace(/<h2([^>]*)>/u, (_match, attributes: string) => `<h2${attributes}>${renderSectionNumber(sectionNumber)} `);
}

function renderSectionNumber(sectionNumber: string): string {
  return `<span class="section-number">${escapeHtml(sectionNumber)}.</span>`;
}

export function buildDocumentScope(result: ReturnType<typeof parseMarkVSpec>, focus?: FocusScope): DocumentScope {
  const partials = partialPreviewsForResult(result);
  const partialPaths = partialPreviewPathsForResult(result);
  const scope = createDocumentScope(result, {
    focus,
    partialPreviews: partials,
    partialPaths
  });
  // Partial previews are keyed by parse result object; focused wireframe results need the same lookup context.
  propagatePartialPreviews(result, scope.wireframeResult);
  return scope;
}

function renderInlineTableOfContents(result: ReturnType<typeof parseMarkVSpec>): string {
  const messages = rendererMessagesForResult(result);
  return `<nav class="toc-inline" aria-label="${text(label(result, "contents"))}">
    <div class="toc-title">${text(label(result, "contents"))}</div>
    ${renderTableOfContentsList(messages)}
  </nav>`;
}

function renderViewportStateScreensSpec(scope: DocumentScope, sectionNumber?: string): string {
  const { specResult: detailsResult, wireframeResult, focus } = scope;
  const renderContext = stateViewsRenderContext(detailsResult);
  const viewportSections = buildViewportStateScreenReadModels(detailsResult, wireframeResult, focus, stateScreenReadModelOptions(detailsResult))
    .map((viewportModel, index) => {
      const viewportNumber = sectionNumber ? `${sectionNumber}.${index + 1}` : undefined;
      return renderStateViewportSection(
        renderContext,
        viewportModel.viewport,
        viewportModel.isDefault,
        viewportModel.models.map((model, stateIndex) => renderStateScreenReadModel(
          detailsResult,
          renderContext,
          model,
          renderStateScreenWireframe(wireframeResult, model, stateIndex),
          viewportNumber ? `${viewportNumber}.${stateIndex + 1}` : undefined
        )).join(""),
        viewportNumber
      );
    })
    .join("");
  return renderStateViewsSection(renderContext, viewportSections);
}

function renderStateScreensSpec(
  result: ReturnType<typeof parseMarkVSpec>,
  wireframeResult: ReturnType<typeof parseMarkVSpec>,
  viewport: string | undefined,
  focus?: FocusScope,
  viewportNumber?: string
): string {
  const renderContext = stateViewsRenderContext(result);
  return buildStateScreenReadModels(result, wireframeResult, viewport, focus, stateScreenReadModelOptions(result))
    .map((model, index) => renderStateScreenReadModel(
      result,
      renderContext,
      model,
      renderStateScreenWireframe(wireframeResult, model, index),
      viewportNumber ? `${viewportNumber}.${index + 1}` : undefined
    ))
    .join("");
}

function stateScreenReadModelOptions(result: ReturnType<typeof parseMarkVSpec>) {
  return {
    label: (key: "default" | "viewport") => label(result, key)
  };
}

function renderStateScreenWireframe(
  wireframeResult: ReturnType<typeof parseMarkVSpec>,
  model: StateScreenReadModel,
  index: number
): string {
  return renderWireframeFor(wireframeResult, model.viewport, model.stateName, index === 0, model.focus, model.modelValues, model.viewValues, model.displayEffects);
}

function stateViewsRenderContext(result: ReturnType<typeof parseMarkVSpec>): StateViewsRenderContext {
  const specTables = createStateViewSpecTableRenderer(result, {
    label: (key) => label(result, key),
    conditionLabel: (key) => conditionLabel(result, key),
    text,
    renderLocalizedTable: (headers, rows) => renderLocalizedTable(result, headers, rows),
    renderLocalizedTableWithCells: (headers, rows) => renderLocalizedTableWithCells(result, headers, rows),
    markerBadgeForId: (id, linkAction) => markerBadgeForId(result, id, linkAction),
    renderDetailRefId,
    renderEntityRef: (id, linkAction) => referenceChipForId(result, id, linkAction) || renderDetailRefId(id),
    renderLayoutRef: (layout) => renderEntityRefChip({
      id: layout.id,
      category: "layout",
      marker: firstStringProperty(layout.properties["marker"]) || layout.id,
      label: layout.name || layout.id
    }),
    renderEntityNotes,
    renderElementTypeSummary,
    renderElementActionReferences: (element) => renderElementActionReferences(result, element),
    renderElementDescription,
    renderRequiredSpec: (element) => renderRequiredSpec(result, element),
    renderFormControlInitialValueSource: (element) => renderFormControlInitialValueSource(result, element),
    renderInputSpec: (element) => renderInputSpec(result, element),
    renderContentElementState: (element) => renderContentElementState(result, element),
    renderEnabledConditionList: (element) => renderEnabledConditionList(result, element),
    renderDisplayContentValue,
    renderSourceSummary,
    renderElementLabelSummary,
    renderElementValueSummary,
    renderConditionList: (groups) => renderConditionList(result, groups),
    actionKind: (action) => actionKind(result, action),
    renderActionOverview: (action) => renderActionOverview(result, action),
    renderTrigger: (trigger) => renderTrigger(result, trigger)
  });

  return {
    format: {
      label: (key) => label(result, key),
      text,
      escapeHtml,
      renderSectionNumber,
      renderStateLabel,
      renderTrigger: (trigger) => renderTrigger(result, trigger),
      renderEntityRef: renderEntityRefChip
    },
    prose: {
      sectionProseForKind: (kind) => sectionProseForKind(result, kind),
    },
    specFragments: {
      renderModelSamplesForState: (stateName) => renderModelSamplesForState(result, stateName),
      renderLayoutSpecFragment: (heading, content, headingLevel, emptyWhenRepeatedHidden) =>
        renderLayoutSpecFragment(result, heading, content, headingLevel, emptyWhenRepeatedHidden),
      renderElementSpecFragment: (heading, content, sectionProse, headingLevel, emptyWhenRepeatedHidden) =>
        renderElementSpecFragment(result, heading, content, sectionProse, headingLevel, emptyWhenRepeatedHidden),
      renderActionSpecFragment
    },
    specTables
  };
}

function renderWireframeFor(
  result: ReturnType<typeof parseMarkVSpec>,
  viewport: string | undefined,
  state: string | undefined,
  includeStyles: boolean,
  focus?: FocusScope,
  modelValues?: Record<string, boolean | number | string>,
  viewValues?: Record<string, boolean | number | string>,
  displayEffects?: StateScreenReadModel["displayEffects"]
): string {
  const html = renderMarkVSpecHtml(result, {
    includeConditionalContent: false,
    viewport,
    state,
    modelValues,
    viewValues,
    messages: rendererMessagesForResult(result),
    markerVisibility: {
      layout: true,
      element: true,
      action: true
    },
    markerFilter: (id, category) => category !== "layout" || !focus || focus.layoutIds.has(id),
    markerLink: (id, category) => category === "action" ? `#${actionDetailAnchor(id)}` : undefined,
    includeStyles
  });
  return embedPartialPreviews({
    result,
    html,
    viewport,
    screenState: state,
    displayEffects,
    messagesForResult: rendererMessagesForResult,
    markerLink: (id, category) => category === "action" ? `#${actionDetailAnchor(id)}` : undefined
  });
}

function renderStateScreenSubheading(heading: string): string {
  return `<h5 class="state-screen-subheading">${escapeHtml(heading)}</h5>`;
}

function repeatedHiddenEmptyAttr(emptyWhenRepeatedHidden: boolean): string {
  return emptyWhenRepeatedHidden ? ` data-mm-repeated-empty="true"` : "";
}

function demoteStateScreenDetailHeadings(content: string): string {
  return content
    .replace(/<h4\b([^>]*)>/gu, (_match, attrs: string) => {
      const classAttribute = /\sclass=(["'])(.*?)\1/u.exec(attrs);
      if (!classAttribute) {
        return `<h6 class="state-screen-detail-heading"${attrs}>`;
      }
      const [, quote, classValue] = classAttribute;
      const classes = classValue.split(/\s+/u).filter(Boolean);
      if (!classes.includes("state-screen-detail-heading")) {
        classes.push("state-screen-detail-heading");
      }
      const updatedAttrs = attrs.replace(classAttribute[0], ` class=${quote}${classes.join(" ")}${quote}`);
      return `<h6${updatedAttrs}>`;
    })
    .replace(/<\/h4>/gu, "</h6>");
}

function renderFormGroupsSpec(result: ReturnType<typeof parseMarkVSpec>): string {
  const content = renderFormGroupsSpecFragment(result, result.formGroups);
  const sectionProse = sectionProseForKind(result, "FormGroups");
  if (!content && sectionProse.length === 0) {
    return "";
  }

  return `<section class="doc-section">
    <h2 id="${formGroupsAnchor()}">${label(result, "formGroups")}</h2>
    ${renderSectionOverview(sectionProse)}
    ${content || `<p class="spec-empty">${label(result, "none")}</p>`}
    ${renderSectionNotes(sectionProse)}
  </section>`;
}

function renderElementSpecFragment(
  result: ReturnType<typeof parseMarkVSpec>,
  heading: string,
  content: string,
  sectionProse: ReturnType<typeof parseMarkVSpec>["sectionProse"] = [],
  headingLevel: 3 | 5 = 3,
  emptyWhenRepeatedHidden = false
): string {
  const headingTag = headingLevel === 5 ? renderStateScreenSubheading(heading) : `<h3>${escapeHtml(heading)}</h3>`;
  const body = headingLevel === 5 ? demoteStateScreenDetailHeadings(content) : content;
  return `<div class="element-spec-fragment" data-mm-render-key="elements:list"${repeatedHiddenEmptyAttr(emptyWhenRepeatedHidden)}>
    ${headingTag}
    ${renderSectionOverview(sectionProse)}
    ${body}
    ${renderSectionNotes(sectionProse)}
  </div>`;
}

function renderActionSpecFragment(
  heading: string,
  content: string,
  sectionProse: ReturnType<typeof parseMarkVSpec>["sectionProse"] = [],
  headingLevel: 3 | 5 = 3,
  emptyWhenRepeatedHidden = false
): string {
  const headingTag = headingLevel === 5 ? renderStateScreenSubheading(heading) : `<h3>${escapeHtml(heading)}</h3>`;
  return `<div class="action-spec-fragment"${repeatedHiddenEmptyAttr(emptyWhenRepeatedHidden)}>
    ${headingTag}
    ${renderSectionOverview(sectionProse)}
    ${content}
    ${renderSectionNotes(sectionProse)}
  </div>`;
}

function renderFormGroupsSpecFragment(
  result: ReturnType<typeof parseMarkVSpec>,
  formGroups: ReturnType<typeof parseMarkVSpec>["formGroups"]
): string {
  if (formGroups.length === 0) {
    return "";
  }
  const showOverview = formGroups.some((formGroup) => (formGroup.overview?.length ?? 0) > 0);
  const showNotes = formGroups.some((formGroup) => (formGroup.notes?.length ?? 0) > 0);

  return `<div class="form-group-spec-fragment" data-mm-render-key="form-groups:list">
    ${renderLocalizedTable(result,
      [
        label(result, "id"),
        label(result, "name"),
        ...(showOverview ? [label(result, "overview")] : []),
        label(result, "fields"),
        label(result, "submit"),
        ...(showNotes ? [label(result, "notes")] : [])
      ],
      formGroups.map((formGroup) => [
        renderDetailRefId(formGroup.id),
        text(formGroup.name),
        ...(showOverview ? [renderEntityOverview(formGroup.overview)] : []),
        formGroup.fields.length > 0 ? `<ul class="spec-list">${formGroup.fields.map((field) => `<li>${referenceForDetailId(result, field.elementId)}</li>`).join("")}</ul>` : "",
        formGroup.submit ? referenceForDetailId(result, formGroup.submit.actionId) : "",
        ...(showNotes ? [renderEntityNotes(formGroup.notes)] : [])
      ])
    )}
  </div>`;
}

function renderLayoutSpecFragment(
  result: ReturnType<typeof parseMarkVSpec>,
  heading: string,
  content: string,
  headingLevel: 3 | 5 = 3,
  emptyWhenRepeatedHidden = false
): string {
  const headingTag = headingLevel === 5 ? renderStateScreenSubheading(heading) : `<h3>${escapeHtml(heading)}</h3>`;
  return `<div class="layout-spec-fragment" data-mm-render-key="layouts:list"${repeatedHiddenEmptyAttr(emptyWhenRepeatedHidden)}>
    ${headingTag}
    ${content}
  </div>`;
}

function renderScreenSpec(result: ReturnType<typeof parseMarkVSpec>): string {
  const screen = result.screen;
  const heading = screen.type === "template" ? label(result, "template") : screen.type === "partial" ? label(result, "partial") : label(result, "screen");
  const title = screen.title || screen.heading || screen.id || "";
  const facts = ([
    [label(result, "route"), screen.route ?? ""],
    [label(result, "owner"), screen.owner ?? ""],
    [label(result, "viewport"), screen.viewport ?? ""]
  ] satisfies Array<[string, string]>).filter(([, value]) => value.trim().length > 0);
  const references = renderScreenReferences(result);
  const otherMetadata = renderScreenOtherMetadata(result);

  return `<section class="doc-section screen-spec-section">
    <h2>${heading}</h2>
    <div class="screen-overview">
      <div class="screen-overview-badges">
        ${renderSemanticChip(screen.type ?? "screen", undefined, "type")}
        ${screen.status ? renderSemanticChip(screen.status, screen.status) : ""}
      </div>
      <div class="screen-overview-main">
        ${screen.id ? `<div class="screen-id">${code(screen.id)}</div>` : ""}
        ${title ? `<div class="screen-title">${text(title)}</div>` : ""}
        ${screen.description ? `<div class="screen-description">${renderMarkdownSectionContent(screen.description.split(/\r?\n/u))}</div>` : ""}
      </div>
    </div>
    ${facts.length > 0 ? `<section class="screen-meta-block"><h3>${label(result, "basicInfo")}</h3>${renderDefinitionList(facts)}</section>` : ""}
    ${references}
    ${otherMetadata}
  </section>`;
}

function renderScreenReferences(result: ReturnType<typeof parseMarkVSpec>): string {
  const screen = result.screen;
  const referenceInfo = documentReferencePathsByResult.get(result);
  const templateRows = screen.template
    ? [[screen.template, referenceInfo?.templates.get(screen.template) ?? fallbackDocumentReferenceInfo(screen.templateSrc ?? "")] as [string, DocumentReferenceInfo]]
    : [];
  const partialRows = Object.entries(screen.references.partials)
    .map(([partialId, path]) => [partialId, referenceInfo?.partials.get(partialId) ?? fallbackDocumentReferenceInfo(path)] as [string, DocumentReferenceInfo]);

  if (templateRows.length === 0 && partialRows.length === 0) {
    return "";
  }

  const rows = [
    ...referenceRows(result, label(result, "templateReference"), templateRows),
    ...referenceRows(result, label(result, "partialReferences"), partialRows)
  ];

  return `<section class="screen-meta-block screen-references">
    <h3>${label(result, "references")}</h3>
    ${renderLocalizedTable(result, [label(result, "kind"), label(result, "id"), label(result, "title"), label(result, "status")], rows)}
  </section>`;
}

function referenceRows(
  result: ReturnType<typeof parseMarkVSpec>,
  kind: string,
  references: Array<[string, DocumentReferenceInfo]>
): string[][] {
  return references.map(([referenceId, info]) => renderReferenceRow(result, kind, referenceId, info));
}

function fallbackDocumentReferenceInfo(path: string | undefined): DocumentReferenceInfo {
  return path ? { path, displayPath: path } : {};
}

function renderReferenceRow(
  result: ReturnType<typeof parseMarkVSpec>,
  kind: string,
  referenceId: string,
  info: DocumentReferenceInfo
): string[] {
  const title = info.title ? `<span class="screen-reference-title">${text(info.title)}</span>` : `<span class="spec-muted">${label(result, "none")}</span>`;
  const status = info.status ? `<span class="screen-reference-status">${text(referenceStatusLabel(result, info.status))}</span>` : `<span class="spec-muted">${label(result, "none")}</span>`;
  return [text(kind), renderDocumentReference(referenceId, info.path), title, status];
}

function referenceStatusLabel(result: ReturnType<typeof parseMarkVSpec>, status: string): string {
  switch (status) {
    case "id mismatch":
      return label(result, "statusIdMismatch");
    case "loaded":
      return label(result, "loaded");
    case "missing":
      return label(result, "missing");
    case "wrong type":
      return label(result, "statusWrongType");
    default:
      return status;
  }
}

function renderDocumentReference(referenceId: string, path: string | undefined): string {
  if (!path) {
    return renderDocumentRefId(referenceId);
  }

  return `<a href="${escapeHtml(referenceHref(path))}" class="mm-reference-link" data-mm-open-reference="${escapeHtml(referenceId)}" data-mm-reference-path="${escapeHtml(path)}">${renderDocumentRefId(referenceId)}</a>`;
}

function renderScreenOtherMetadata(result: ReturnType<typeof parseMarkVSpec>): string {
  const standardKeys = new Set([
    "id",
    "type",
    "title",
    "template",
    "locale",
    "route",
    "owner",
    "viewport",
    "status",
    "default-state",
    "default state"
  ]);
  const rows = Object.entries(result.screen.frontMatter)
    .filter(([key, value]) => !standardKeys.has(key) && value.trim().length > 0);
  if (rows.length === 0) {
    return "";
  }

  return `<section class="screen-meta-block">
    <h3>${label(result, "otherMetadata")}</h3>
    ${renderDefinitionList(rows)}
  </section>`;
}

function renderDefinitionList(rows: Array<[string, string]>): string {
  return `<dl class="screen-definition-list">${rows.map(([key, value]) => `<div><dt>${text(key)}</dt><dd>${text(value)}</dd></div>`).join("")}</dl>`;
}

function referenceHref(path: string): string {
  return pathToFileURL(path).href;
}

function renderEnabledConditionList(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ParsedElement
): string {
  if (element.disabledWhen.length === 0) {
    return text(label(result, "always"));
  }
  return `<ul class="spec-list">${element.disabledWhen.map((condition) => `<li>${escapeHtml(conditionLabel(result, "enabled"))}: ${label(result, "conditionNot")} ${renderCondition(result, condition)}</li>`).join("")}</ul>`;
}

function renderDisplayContentValue(element: ParsedElement, value: string): string {
  if (hasOpaqueExpression(value)) {
    return renderExpressionTokens(value);
  }
  return element.type === "Badge" && value === rawStringProperty(element.properties["sample"])
    ? renderSemanticChip(value, rawStringProperty(element.properties["tone"]))
    : text(value);
}

function renderActionableElementsTable(
  result: ReturnType<typeof parseMarkVSpec>,
  elements: ParsedElement[]
): string {
  return renderLocalizedTable(result,
    [label(result, "marker"), label(result, "type"), `${label(result, "view")} / ${label(result, "value")}`, label(result, "triggeredActions"), label(result, "state")],
    elements.map((element) => [
      markerBadgeForId(result, element.id),
      text(element.type),
      renderActionableDisplayValue(result, element),
      renderElementActionReferences(result, element),
      renderActionableElementState(result, element)
    ])
  );
}

function renderFeedbackElementsTable(
  result: ReturnType<typeof parseMarkVSpec>,
  elements: ParsedElement[]
): string {
  return renderLocalizedTable(result,
    [label(result, "marker"), label(result, "type"), `${label(result, "view")} / ${label(result, "value")}`, label(result, "tone"), label(result, "state")],
    elements.map((element) => [
      markerBadgeForId(result, element.id),
      renderElementTypeSummary(element),
      renderElementDisplayValue(result, element),
      renderToneSummary(element),
      renderContentElementState(result, element)
    ])
  );
}

function renderContentElementsTable(
  result: ReturnType<typeof parseMarkVSpec>,
  elements: ParsedElement[]
): string {
  return renderLocalizedTable(result,
    [label(result, "marker"), label(result, "type"), `${label(result, "view")} / ${label(result, "value")}`, label(result, "state"), label(result, "notes")],
    elements.map((element) => [
      markerBadgeForId(result, element.id),
      text(element.type),
      renderElementDisplayValue(result, element),
      renderContentElementState(result, element),
      renderContentElementNotes(element)
    ])
  );
}

function isActionableElement(type: string): boolean {
  return ["Button", "Link"].includes(type);
}

function isFeedbackElement(type: string): boolean {
  return ["Banner", "Badge", "Spinner", "Dialog"].includes(type);
}

function isContentElement(type: string): boolean {
  return ["Heading", "Paragraph", "Text", "Image", "Icon", "List", "Table"].includes(type);
}

function preferredLayoutById(
  result: ReturnType<typeof parseMarkVSpec>,
  layoutId: string,
  viewport?: string
): ReturnType<typeof parseMarkVSpec>["layoutGroups"][number] | undefined {
  return preferredLayoutGroupForViewport(result, layoutId, viewport);
}

function renderActionPartialUpdates(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number]
): string {
  const rows = partialUpdateRowsForAction(result, action, true);
  return rows.length > 0
    ? renderLocalizedTable(result, [label(result, "case"), label(result, "target"), label(result, "fragmentContent")], rows)
    : "";
}

function partialUpdateRowsForAction(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number],
  detailedReferences = false
): string[][] {
  const rows: string[][] = [];

  if (hasUpdateEffect(action)) {
    rows.push(partialUpdateRow(result, "", action, detailedReferences));
  }

  for (const step of action.processSteps) {
    if (hasUpdateEffect(step)) {
      rows.push(partialUpdateRow(result, `process: ${step.name}`, step, detailedReferences));
    }

    for (const outcome of step.outcomes) {
      if (hasUpdateEffect(outcome)) {
        rows.push(partialUpdateRow(result, `process: ${step.name} / ${outcome.result}`, outcome, detailedReferences));
      }
    }
  }

  for (const outcome of action.outcomes) {
    if (hasUpdateEffect(outcome)) {
      rows.push(partialUpdateRow(result, outcome.result, outcome, detailedReferences));
    }
  }

  return rows;
}

function partialUpdateRow(
  result: ReturnType<typeof parseMarkVSpec>,
  caseName: string,
  update: PartialUpdateEffect,
  detailedReferences = false
): string[] {
  return [
    text(caseName),
    detailedReferences ? referenceForDetailId(result, update.target) : referenceForId(result, update.target, "target"),
    renderPartialUpdateContent(result, update)
  ];
}

interface PartialUpdateEffect {
  request?: { method: string; path: string };
  target?: string;
  mode?: string;
  fragment?: string;
  content?: string;
  sideEffects?: string[];
}

function hasUpdateEffect(effect: PartialUpdateEffect): boolean {
  return Boolean(effect.target || effect.mode || effect.fragment || effect.content);
}

function renderPartialUpdateContent(result: ReturnType<typeof parseMarkVSpec>, update: PartialUpdateEffect): string {
  const items = [
    update.fragment ? `${escapeHtml(label(result, "processFragment"))} ${text(update.fragment)}` : "",
    update.content ? `${escapeHtml(label(result, "processContent"))} ${text(update.content)}` : "",
    update.mode ? `${escapeHtml(label(result, "processMode"))} ${text(update.mode)}` : ""
  ].filter(Boolean);

  return renderDetailList(result, items, update.sideEffects ?? []);
}

function renderModelSamplesForState(result: ReturnType<typeof parseMarkVSpec>, stateName: string | undefined): string {
  if (!stateName) {
    return "";
  }

  const samples = result.modelSamples.filter((sample) => sample.state === stateName);
  if (samples.length === 0) {
    return "";
  }
  const groups = result.modelSampleGroups.filter((candidate) => candidate.state === stateName);
  const sectionProse = result.sectionProse.filter((candidate) => candidate.kind === "ModelSamples");
  return `<section class="model-sample-group">
    ${renderStateScreenSubheading(label(result, "modelSamples"))}
    ${renderEntityOverview(joinProseLineGroups(sectionProse.map((candidate) => candidate.overview)))}
    ${renderEntityOverview(joinProseLineGroups(groups.map((candidate) => candidate.overview ?? [])))}
    ${samples.map((sample) => renderModelSampleSpec(result, sample)).join("")}
    ${renderEntityNotes(joinProseLineGroups(groups.map((candidate) => candidate.notes ?? [])))}
    ${renderEntityNotes(joinProseLineGroups(sectionProse.map((candidate) => candidate.notes)))}
  </section>`;
}

function renderModelSampleSpec(
  result: ReturnType<typeof parseMarkVSpec>,
  sample: ReturnType<typeof parseMarkVSpec>["modelSamples"][number]
): string {
  return `<article class="model-sample-block">
    <h6 class="model-sample-path-heading state-screen-detail-heading">${renderInlineToken(sample.path)}</h6>
    ${renderEntityOverview(sample.overview)}
    ${renderModelSampleTable(result, sample)}
    ${renderEntityNotes(sample.notes)}
  </article>`;
}

function renderModelSampleTable(
  result: ReturnType<typeof parseMarkVSpec>,
  sample: ReturnType<typeof parseMarkVSpec>["modelSamples"][number]
): string {
  if (sample.columns.length === 0) {
    return `<p class="spec-empty">${label(result, "noSampleFieldsDefined")}</p>`;
  }

  const rows = sample.rows.map((row) => sample.columns.map((column) => text(row.values[column] ?? "")));
  if (rows.length === 0) {
    const headerOnlyTable = `<div class="spec-table-wrap"><table class="spec-table"><thead><tr>${sample.columns.map((column) => `<th>${text(column)}</th>`).join("")}</tr></thead><tbody></tbody></table></div>`;
    return `${headerOnlyTable}<p class="spec-empty">${label(result, "emptyArray")}</p>`;
  }

  return renderLocalizedTable(result, sample.columns, rows);
}

function renderActionDetailsSpec(result: ReturnType<typeof parseMarkVSpec>): string {
  const cards = result.actions.map((action) => renderActionDetail(result, action)).join("");
  return `<section class="doc-section">
    <h2>${label(result, "actionDetails")}</h2>
    ${cards ? `<div class="action-detail-list">${cards}</div>` : `<p class="spec-empty">${label(result, "none")}</p>`}
  </section>`;
}

function renderStateFlowSpec(result: ReturnType<typeof parseMarkVSpec>): string {
  const diagram = renderMermaidStateDiagram(result);
  const tableReference = label(result, "stateTransitionTableReference");
  return `<section class="doc-section state-flow-section">
    <h2>${label(result, "stateFlow")}</h2>
    <div class="state-flow-diagram">
      <a class="state-flow-table-link" href="#state-transition-table" aria-label="${text(tableReference)}" title="${text(tableReference)}"><span class="state-flow-table-link-icon" aria-hidden="true"></span><span class="state-flow-table-link-label">${text(tableReference)}</span></a>
      <pre class="mermaid-source" data-mermaid-source><code class="language-mermaid">${escapeHtml(diagram)}</code></pre>
      <div class="mermaid-placeholder" data-mermaid-placeholder>${label(result, "mermaidRendering")}</div>
    </div>
  </section>`;
}

function renderActionTransitionsSpec(result: ReturnType<typeof parseMarkVSpec>): string {
  const sectionProse = sectionProseForKind(result, "States");
  const stateNames = orderedTransitionStateNames(result);
  const cellEvents = new Map<string, string[]>();

  for (const action of result.actions) {
    for (const transition of action.transitions) {
      if (isTerminalTransitionTarget(transition.to)) {
        continue;
      }

      const key = transitionMatrixKey(transition.from, transition.to);
      const events = cellEvents.get(key) ?? [];
      events.push(renderTransitionMatrixEvent(result, action, transition.result));
      cellEvents.set(key, events);
    }
  }

  const rows = stateNames.map((from) => [
    renderStateLabel(from),
    ...stateNames.map((to) => renderTransitionMatrixCell(cellEvents.get(transitionMatrixKey(from, to))))
  ]);

  return `<section class="doc-section" id="state-transition-table">
    <h2>${label(result, "actionTransitions")}</h2>
    ${renderSectionOverview(sectionProse)}
    ${renderTransitionMatrixTable(result, stateNames, rows)}
    ${renderStateTransitionNotes(result, sectionProse)}
  </section>`;
}

function renderTransitionMatrixTable(
  result: ReturnType<typeof parseMarkVSpec>,
  stateNames: string[],
  rows: Array<Array<string | undefined>>
): string {
  if (rows.length === 0) {
    return `<p class="spec-empty">${label(result, "none")}</p>`;
  }

  const headers = [
    `<th class="state-transition-axis-cell" scope="col" aria-label="${text(label(result, "stateTransitionAxisDescription"))}"><span class="state-transition-axis-labels" aria-hidden="true"><span class="from">${label(result, "from")}</span><span class="to">${label(result, "to")}</span></span></th>`,
    ...stateNames.map((state) => `<th>${renderStateLabel(state)}</th>`)
  ].join("");
  return `<div class="spec-table-wrap"><table class="spec-table state-transition-matrix"><thead><tr>${headers}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${renderTableMatrixCell(cell)}</th>` : `<td>${renderTableMatrixCell(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function renderStateTransitionNotes(
  result: ReturnType<typeof parseMarkVSpec>,
  sectionProse: ReturnType<typeof parseMarkVSpec>["sectionProse"]
): string {
  const notes = renderSectionNotes(sectionProse);
  return notes ? `<h3 class="state-transition-context-heading">${label(result, "stateTransitionNotes")}</h3>${notes}` : "";
}

function renderTableMatrixCell(cell: string | undefined): string {
  return cell && cell.trim().length > 0 ? cell : "-";
}

function orderedTransitionStateNames(result: ReturnType<typeof parseMarkVSpec>): string[] {
  const states = result.states.map((state) => state.name);
  const known = new Set(states);
  for (const action of result.actions) {
    for (const transition of action.transitions) {
      if (!known.has(transition.from)) {
        states.push(transition.from);
        known.add(transition.from);
      }
      if (!isTerminalTransitionTarget(transition.to) && !known.has(transition.to)) {
        states.push(transition.to);
        known.add(transition.to);
      }
    }
  }
  return states;
}

function transitionMatrixKey(from: string, to: string): string {
  return `${from}\u001f${to}`;
}

function renderTransitionMatrixCell(events: string[] | undefined): string {
  if (!events || events.length === 0) {
    return "";
  }
  return events.length === 1 ? events[0] ?? "" : `<ul class="spec-list">${events.map((event) => `<li>${event}</li>`).join("")}</ul>`;
}

function renderTransitionMatrixEvent(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number],
  resultName: string | undefined
): string {
  const actionReference = referenceForDetailId(result, action.id);
  const resultSuffix = resultName ? `<div class="mm-ref-chip-note">${text(resultName)}</div>` : "";
  return `${actionReference}${resultSuffix}`;
}

function renderScreenTransitionsSpec(result: ReturnType<typeof parseMarkVSpec>): string {
  const rows = result.actions.flatMap((action) => action.transitions
    .filter((transition) => isTerminalTransitionTarget(transition.to))
    .map((transition) => [
      renderTrigger(result, action.triggeredBy),
      renderScreenTransitionAction(result, action, transition.result),
      renderStateLabel(transition.from),
      renderScreenTransitionTarget(result, transition.to),
      renderScreenTransitionParams(result, action, transition)
    ]));

  return `<section class="doc-section">
    <h2>${label(result, "screenTransitions")}</h2>
    ${renderLocalizedTable(result, [label(result, "trigger"), label(result, "action"), label(result, "from"), label(result, "to"), label(result, "params")], rows)}
  </section>`;
}

function renderScreenTransitionAction(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number],
  resultName: string | undefined
): string {
  const actionRef = referenceForDetailId(result, action.id);
  if (!resultName) {
    return actionRef;
  }
  return `${actionRef}<ul class="spec-list"><li>${label(result, "case")}: ${renderResultLabel(resultName)}</li></ul>`;
}

function renderScreenTransitionTarget(result: ReturnType<typeof parseMarkVSpec>, target: string): string {
  const kind = screenTransitionTargetKind(result, target);
  return `${text(kind)} ${renderNavigationTarget(target)}`;
}

function screenTransitionTargetKind(result: ReturnType<typeof parseMarkVSpec>, target: string): string {
  if (target.startsWith("SCR-")) {
    return label(result, "screen").toLowerCase();
  }

  if (target.startsWith("/")) {
    return label(result, "route").toLowerCase();
  }

  return label(result, "url");
}

function renderScreenTransitionParams(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number],
  transition: ReturnType<typeof parseMarkVSpec>["actions"][number]["transitions"][number]
): string {
  const outcome = transition.result ? findActionOutcomeForTransition(action, transition) : undefined;
  return renderRouteParams(result, outcome?.routeParams ?? action.routeParams, true);
}

function findActionOutcomeForTransition(
  action: ReturnType<typeof parseMarkVSpec>["actions"][number],
  transition: ReturnType<typeof parseMarkVSpec>["actions"][number]["transitions"][number]
): ReturnType<typeof parseMarkVSpec>["actions"][number]["outcomes"][number] | ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]["outcomes"][number] | undefined {
  return [
    ...action.outcomes,
    ...action.processSteps.flatMap((step) => step.outcomes)
  ].find((outcome) => isOutcomeForTransition(outcome, transition));
}

function isOutcomeForTransition(
  outcome: ReturnType<typeof parseMarkVSpec>["actions"][number]["outcomes"][number] | ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]["outcomes"][number],
  transition: ReturnType<typeof parseMarkVSpec>["actions"][number]["transitions"][number]
): boolean {
  if (outcome.result !== transition.result || outcome.to !== transition.to) {
    return false;
  }

  const transitionLines = [
    ...(outcome.propertyLocations.state ?? []),
    ...(outcome.propertyLocations.navigate ?? [])
  ].map((location) => location.line);
  return transitionLines.length === 0 || transitionLines.includes(transition.location.line);
}

function renderMermaidStateDiagram(result: ReturnType<typeof parseMarkVSpec>): string {
  const nodeNames = collectStateFlowNodes(result);
  const aliases = new Map(nodeNames.map((name, index) => [name, `S${index}`]));
  const lines = ["stateDiagram-v2", "  direction TB"];
  const initialState = result.states.find((state) => state.initial)?.name ?? result.states[0]?.name;

  for (const name of nodeNames) {
    lines.push(`  state "${mermaidLabel(name)}" as ${aliases.get(name)}`);
  }

  if (initialState && aliases.has(initialState)) {
    lines.push(`  [*] --> ${aliases.get(initialState)}`);
  }

  const edgeGroups = new Map<string, { from: string; to: string; labels: string[]; seenLabels: Set<string> }>();
  for (const action of result.actions) {
    for (const transition of action.transitions) {
      const from = aliases.get(transition.from);
      if (!from) {
        continue;
      }
      if (transition.from === transition.to) {
        continue;
      }
      if (isTerminalTransitionTarget(transition.to)) {
        continue;
      }

      const to = aliases.get(transition.to);
      if (!to) {
        continue;
      }

      const key = `${from}\u0000${to}`;
      const group = edgeGroups.get(key) ?? { from, to, labels: [], seenLabels: new Set<string>() };
      const transitionLabel = actionTransitionLabel(action, transition.result, transition.to);
      if (!group.seenLabels.has(transitionLabel)) {
        group.labels.push(transitionLabel);
        group.seenLabels.add(transitionLabel);
      }
      edgeGroups.set(key, group);
    }
  }

  for (const group of edgeGroups.values()) {
    lines.push(`  ${group.from} --> ${group.to}: ${mermaidLabel(group.labels.join(", "))}`);
  }

  return lines.join("\n");
}

function collectStateFlowNodes(result: ReturnType<typeof parseMarkVSpec>): string[] {
  const names = new Set(result.states.map((state) => state.name));
  for (const action of result.actions) {
    for (const transition of action.transitions) {
      names.add(transition.from);
      if (!isTerminalTransitionTarget(transition.to)) {
        names.add(transition.to);
      }
    }
  }

  return [...names];
}

function actionTransitionLabel(
  action: ReturnType<typeof parseMarkVSpec>["actions"][number],
  resultName: string | undefined,
  target: string
): string {
  const actionLabel = [action.properties["marker"], action.name].filter(Boolean).join(" ");
  const resultLabel = resultName ? `${actionLabel} / ${resultName}` : actionLabel;
  return isTerminalTransitionTarget(target) ? `${resultLabel} / navigate` : resultLabel;
}

function isTerminalTransitionTarget(target: string): boolean {
  return target.startsWith("SCR-") || target.startsWith("/") || /^https?:\/\//.test(target);
}

function mermaidLabel(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"").replaceAll("\n", " ").replaceAll(";", ",");
}

function renderStatesSpec(result: ReturnType<typeof parseMarkVSpec>): string {
  const sectionProse = sectionProseForKind(result, "States");
  return `<section class="doc-section">
    <h2>${label(result, "states")}</h2>
    ${renderSectionOverview(sectionProse)}
    ${renderLocalizedTable(result,
      [label(result, "state"), label(result, "initial"), label(result, "description")],
      result.states.map((state) => [renderStateLabel(state.name), state.initial ? text(label(result, "requiredYes")) : text(label(result, "requiredNo")), text(state.message)])
    )}
  </section>`;
}

function renderValidationRulesSpec(result: ReturnType<typeof parseMarkVSpec>): string {
  const sectionProse = sectionProseForKind(result, "Validations");
  const validationSectionProse = [
    ...sectionProse,
    ...sectionProseForKind(result, "FieldValidations"),
    ...sectionProseForKind(result, "CrossFieldValidations")
  ];
  const groups: Array<{
    key: "clientFieldValidations" | "clientCrossFieldValidations" | "serverFieldValidations" | "serverCrossFieldValidations";
    rules: ReturnType<typeof parseMarkVSpec>["validations"];
  }> = [
    { key: "clientFieldValidations", rules: [] },
    { key: "clientCrossFieldValidations", rules: [] },
    { key: "serverFieldValidations", rules: [] },
    { key: "serverCrossFieldValidations", rules: [] }
  ];

  for (const validation of result.validations) {
    const groupIndex = validationRunKind(validation) === "server"
      ? validationScopeKind(validation) === "cross-field" ? 3 : 2
      : validationScopeKind(validation) === "cross-field" ? 1 : 0;
    groups[groupIndex]?.rules.push(validation);
  }
  const content = groups
    .map((group) => group.rules.length > 0
      ? renderValidationRuleGroup(result, label(result, group.key), group.key.includes("CrossField") ? "cross-field" : "field", group.rules)
      : "")
    .filter(Boolean)
    .join("");

  return `<section class="doc-section">
    <h2>${label(result, "validationRules")}</h2>
    ${renderSectionOverview(validationSectionProse)}
    ${content || `<p class="spec-empty">${label(result, "none")}</p>`}
    ${renderSectionNotes(validationSectionProse)}
  </section>`;
}

function renderValidationRuleGroup(
  result: ReturnType<typeof parseMarkVSpec>,
  heading: string,
  scope: "field" | "cross-field",
  validations: ReturnType<typeof parseMarkVSpec>["validations"]
): string {
  const showOverview = validations.some((validation) => (validation.overview?.length ?? 0) > 0);
  const showNotes = validations.some((validation) => (validation.notes?.length ?? 0) > 0);
  const headers = scope === "field"
    ? [
      label(result, "id"),
      label(result, "name"),
      ...(showOverview ? [label(result, "overview")] : []),
      label(result, "target"),
      label(result, "rule"),
      label(result, "when"),
      label(result, "message"),
      label(result, "errorCode"),
      ...(showNotes ? [label(result, "notes")] : [])
    ]
    : [
      label(result, "id"),
      label(result, "name"),
      ...(showOverview ? [label(result, "overview")] : []),
      label(result, "target"),
      label(result, "inputs"),
      label(result, "check"),
      label(result, "when"),
      label(result, "message"),
      label(result, "errorCode"),
      ...(showNotes ? [label(result, "notes")] : [])
    ];
  const rows = scope === "field"
    ? renderFieldValidationRows(result, validations, showOverview, showNotes)
    : renderCrossFieldValidationRows(result, validations, showOverview, showNotes);
  return [
    `<h3>${heading}</h3>`,
    renderLocalizedTableWithCells(result, headers, rows)
  ].join("");
}

function renderFieldValidationRows(
  result: ReturnType<typeof parseMarkVSpec>,
  validations: ReturnType<typeof parseMarkVSpec>["validations"],
  showOverview: boolean,
  showNotes: boolean
): TableCell[][] {
  return validations.flatMap((validation) => {
    const rules = validation.rules.length > 0 ? validation.rules : [undefined];
    const hasRuleMessages = validationHasRuleProperty(validation, "message");
    const hasRuleErrorCodes = validationHasRuleProperty(validation, "error code");
    const messageValues = hasRuleMessages ? undefined : validationPropertyValues(validation, "message");
    const errorCodeValues = hasRuleErrorCodes ? undefined : [
      ...validationPropertyValues(validation, "error code"),
      ...validationPropertyValues(validation, "error codes")
    ];

    return rules.map((rule, index) => [
      ...rowspanPrefixCells(index === 0 ? rules.length : 0, [
        renderDetailRefId(validation.id),
        text(validation.name),
        ...(showOverview ? [renderEntityOverview(validation.overview)] : []),
        renderValidationProperty(result, validation, "target")
      ]),
      rule ? renderValidationRuleEntry(result, validation, rule) : text("-"),
      renderValidationRuleProperty(result, rule, validation, "when", index)
        || renderLegacyValidationCondition(result, validation),
      renderValidationRuleProperty(result, rule, validation, "message", index, messageValues, !hasRuleMessages),
      renderValidationRuleProperty(result, rule, validation, "error code", index, errorCodeValues, !hasRuleErrorCodes),
      ...rowspanPrefixCells(index === 0 ? rules.length : 0, [
        ...(showNotes ? [renderEntityNotes(validation.notes)] : [])
      ])
    ]);
  });
}

function renderCrossFieldValidationRows(
  result: ReturnType<typeof parseMarkVSpec>,
  validations: ReturnType<typeof parseMarkVSpec>["validations"],
  showOverview: boolean,
  showNotes: boolean
): TableCell[][] {
  return validations.map((validation) => [
    renderDetailRefId(validation.id),
    text(validation.name),
    ...(showOverview ? [renderEntityOverview(validation.overview)] : []),
    renderValidationProperty(result, validation, "target"),
    renderValidationProperty(result, validation, "input") || renderValidationProperty(result, validation, "inputs"),
    renderValidationProperty(result, validation, "check") || renderValidationRules(result, validation),
    renderValidationProperty(result, validation, "when") || renderLegacyValidationCondition(result, validation),
    renderValidationProperty(result, validation, "message"),
    renderValidationProperty(result, validation, "error code") || renderValidationProperty(result, validation, "error codes"),
    ...(showNotes ? [renderEntityNotes(validation.notes)] : [])
  ]);
}

function renderValidationResultReference(validation: ReturnType<typeof parseMarkVSpec>["validations"][number]): string {
  return `${renderInlineToken(`${validation.id}.result`)} <span class="mm-muted">valid / invalid</span>`;
}

function renderValidationRules(
  result: ReturnType<typeof parseMarkVSpec>,
  validation: ReturnType<typeof parseMarkVSpec>["validations"][number]
): string {
  if (validation.rules.length === 0) {
    return "";
  }
  return `<ul class="spec-list">${validation.rules.map((rule) => {
    const targets = validationRuleTargets(rule).length > 0
      ? `: ${validationRuleTargets(rule).map((target) => referenceForId(result, target, "target")).join(", ")}`
      : "";
    return `<li>${text(rule.name)}${targets}</li>`;
  }).join("")}</ul>`;
}

function renderValidationRuleEntry(
  result: ReturnType<typeof parseMarkVSpec>,
  validation: ReturnType<typeof parseMarkVSpec>["validations"][number],
  rule: ReturnType<typeof parseMarkVSpec>["validations"][number]["rules"][number]
): string {
  const targets = validationRuleTargets(rule);
  const ruleText = targets.length > 0
    ? `${text(rule.name)}: ${targets.map((target) => referenceForId(result, target, "target")).join(", ")}`
    : text(rule.name);
  const elementMetadata = renderValidationElementShortcutMetadata(result, validation, rule);
  return elementMetadata ? `${ruleText} <span class="mm-muted">(${elementMetadata})</span>` : ruleText;
}

function validationRuleTargets(rule: ReturnType<typeof parseMarkVSpec>["validations"][number]["rules"][number]): string[] {
  return rule.targets.filter((target) => validationRuleChildProperty(target) === undefined);
}

function renderValidationRuleProperty(
  result: ReturnType<typeof parseMarkVSpec>,
  rule: ReturnType<typeof parseMarkVSpec>["validations"][number]["rules"][number] | undefined,
  validation: ReturnType<typeof parseMarkVSpec>["validations"][number],
  key: "when" | "message" | "error code",
  index: number,
  fallbackValues?: string[],
  useValidationFallback = true
): string {
  const ruleValues = rule ? validationRulePropertyValues(validation, rule, key) : [];
  if (ruleValues.length > 0) {
    return renderValidationValues(result, ruleValues);
  }

  if (fallbackValues && fallbackValues.length > 0) {
    return renderValidationValues(result, fallbackValues.length === validation.rules.length ? [fallbackValues[index] ?? ""] : fallbackValues);
  }

  if (key === "error code" && useValidationFallback) {
    const values = [
      ...validationPropertyValues(validation, "error code"),
      ...validationPropertyValues(validation, "error codes")
    ];
    return renderValidationValues(result, values);
  }
  return useValidationFallback ? renderValidationProperty(result, validation, key) : "";
}

function validationRulePropertyValues(
  validation: ReturnType<typeof parseMarkVSpec>["validations"][number],
  rule: ReturnType<typeof parseMarkVSpec>["validations"][number]["rules"][number],
  key: string
): string[] {
  const normalizedKey = key.toLowerCase();
  const valuesByLocation = validationPropertyValuesForRule(validation, rule, normalizedKey);
  if (valuesByLocation.length > 0) {
    return valuesByLocation;
  }
  return rule.targets.flatMap((target) => {
    const property = validationRuleChildProperty(target);
    return property?.key === normalizedKey ? [property.value] : [];
  });
}

function validationHasRuleProperty(
  validation: ReturnType<typeof parseMarkVSpec>["validations"][number],
  key: string
): boolean {
  return validation.rules.some((rule) => validationRulePropertyValues(validation, rule, key).length > 0);
}

function validationPropertyValuesForRule(
  validation: ReturnType<typeof parseMarkVSpec>["validations"][number],
  rule: ReturnType<typeof parseMarkVSpec>["validations"][number]["rules"][number],
  key: string
): string[] {
  const values = validationPropertyValues(validation, key);
  const locations = validation.propertyLocations[key] ?? [];
  if (values.length === 0 || locations.length === 0) {
    return [];
  }

  const sortedRules = [...validation.rules].sort((a, b) => a.location.line - b.location.line);
  const ruleIndex = sortedRules.indexOf(rule);
  const nextRuleLine = sortedRules[ruleIndex + 1]?.location.line ?? Number.POSITIVE_INFINITY;
  return values.filter((_, index) => {
    const location = locations[index];
    return location !== undefined && location.line > rule.location.line && location.line < nextRuleLine;
  });
}

function renderValidationElementShortcutMetadata(
  result: ReturnType<typeof parseMarkVSpec>,
  validation: ReturnType<typeof parseMarkVSpec>["validations"][number],
  rule: ReturnType<typeof parseMarkVSpec>["validations"][number]["rules"][number]
): string {
  const normalizedName = rule.name.toLowerCase();
  const targets = validationRuleTargets(rule).map((target) => target.toLowerCase());
  if ((normalizedName !== "length" && normalizedName !== "range") || !targets.includes("element")) {
    return "";
  }

  const targetElement = validationPropertyValues(validation, "target")
    .map((target) => result.elements.find((element) => element.id === target))
    .find((element): element is NonNullable<typeof element> => Boolean(element));
  if (!targetElement) {
    return "";
  }

  const metadataKeys = normalizedName === "length"
    ? [
      { label: "min length", keys: ["min length", "min-length", "minlength"] },
      { label: "max length", keys: ["max length", "max-length", "maxlength"] }
    ]
    : [
      { label: "min", keys: ["min"] },
      { label: "max", keys: ["max"] },
      { label: "step", keys: ["step"] }
    ];
  const rows = metadataKeys.flatMap(({ label: metadataLabel, keys }) => {
    const value = elementInputMetadataValue(targetElement, keys);
    return value ? [`${text(metadataLabel)}: ${renderParamSource(result, value)}`] : [];
  });
  return rows.join(", ");
}

function elementInputMetadataValue(
  element: ReturnType<typeof parseMarkVSpec>["elements"][number],
  keys: string[]
): string {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const [propertyKey, property] of Object.entries(element.properties)) {
    if (!normalizedKeys.has(propertyKey.toLowerCase())) {
      continue;
    }
    const propertyValue = rawStringProperty(property);
    if (propertyValue) {
      return propertyValue;
    }
  }
  const inputRule = element.inputRules.find((rule) => normalizedKeys.has(rule.key.toLowerCase()));
  return inputRule?.value ?? "";
}

function validationRuleChildProperty(value: string): { key: string; value: string } | undefined {
  const match = value.match(/^([^:]+):\s*(.*)$/u);
  if (!match) {
    return undefined;
  }
  const key = match[1]?.trim().toLowerCase() ?? "";
  if (key !== "when" && key !== "message" && key !== "messages" && key !== "error code" && key !== "error codes") {
    return undefined;
  }
  return { key: key === "messages" ? "message" : key === "error codes" ? "error code" : key, value: match[2]?.trim() ?? "" };
}

function validationRunKind(validation: ReturnType<typeof parseMarkVSpec>["validations"][number]): "client" | "server" {
  const run = firstValidationProperty(validation, "run").toLowerCase();
  return run === "server" || run === "server-response" ? "server" : "client";
}

function validationScopeKind(validation: ReturnType<typeof parseMarkVSpec>["validations"][number]): "field" | "cross-field" {
  const scope = firstValidationProperty(validation, "scope").toLowerCase();
  if (scope === "cross-field" || scope === "composite") {
    return "cross-field";
  }
  if (scope === "field" || scope === "single") {
    return "field";
  }
  const target = validation.properties["target"];
  return Array.isArray(target) && target.length > 1 ? "cross-field" : "field";
}

function firstValidationProperty(validation: ReturnType<typeof parseMarkVSpec>["validations"][number], key: string): string {
  const value = validation.properties[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function validationPropertyValues(validation: ReturnType<typeof parseMarkVSpec>["validations"][number], key: string): string[] {
  const value = validation.properties[key];
  return Array.isArray(value) ? value : value ? [value] : [];
}

function renderValidationProperty(
  result: ReturnType<typeof parseMarkVSpec>,
  validation: ReturnType<typeof parseMarkVSpec>["validations"][number],
  key: string
): string {
  const values = validationPropertyValues(validation, key);
  return renderValidationValues(result, values);
}

function renderValidationValues(
  result: ReturnType<typeof parseMarkVSpec>,
  values: string[]
): string {
  const presentValues = values.filter(Boolean);
  if (presentValues.length === 0) {
    return "";
  }

  return presentValues.length === 1
    ? renderParamSource(result, presentValues[0] ?? "")
    : `<ul class="spec-list">${presentValues.map((item) => `<li>${renderParamSource(result, item)}</li>`).join("")}</ul>`;
}

function renderLegacyValidationCondition(
  result: ReturnType<typeof parseMarkVSpec>,
  validation: ReturnType<typeof parseMarkVSpec>["validations"][number]
): string {
  const values = validationPropertyValues(validation, "condition");
  if (values.length === 0) {
    return "";
  }
  return `${text(label(result, "legacyCondition"))}: ${renderValidationValues(result, values)}`;
}

function renderRulesSpec(result: ReturnType<typeof parseMarkVSpec>): string {
  const sectionProse = sectionProseForKind(result, "BusinessRules");
  const showOverview = result.rules.some((rule) => (rule.overview?.length ?? 0) > 0);
  const showNotes = result.rules.some((rule) => (rule.notes?.length ?? 0) > 0);
  const showMessages = result.rules.some((rule) => businessRulePropertyValues(rule, "messages").length > 0 || businessRulePropertyValues(rule, "message").length > 0);
  return `<section class="doc-section">
    <h2>${label(result, "businessRules")}</h2>
    ${renderSectionOverview(sectionProse)}
    ${renderLocalizedTable(result,
      [
        label(result, "id"),
        label(result, "name"),
        ...(showOverview ? [label(result, "overview")] : []),
        label(result, "ruleText"),
        ...(showMessages ? [label(result, "message")] : []),
        ...(showNotes ? [label(result, "notes")] : [])
      ],
      result.rules.map((rule) => [
        renderDetailRefId(rule.id),
        text(rule.name),
        ...(showOverview ? [renderEntityOverview(rule.overview)] : []),
        renderRuleText(rule),
        ...(showMessages ? [renderBusinessRuleProperty(result, rule, "messages") || renderBusinessRuleProperty(result, rule, "message")] : []),
        ...(showNotes ? [renderEntityNotes(rule.notes)] : [])
      ])
    )}
    ${renderSectionNotes(sectionProse)}
  </section>`;
}

function renderRuleText(rule: ReturnType<typeof parseMarkVSpec>["rules"][number]): string {
  const descriptions = businessRulePropertyValues(rule, "description");
  if (descriptions.length > 0) {
    return renderMarkdownSectionContent(descriptions.length === 1 ? [descriptions[0] ?? ""] : descriptions.map((description) => `- ${description}`));
  }

  const bodyLines = trimNoteLines(rule.bodyLines ?? []);
  if (bodyLines.length > 0) {
    return renderMarkdownSectionContent(bodyLines);
  }

  return rule.bullets.length > 0
    ? renderMarkdownSectionContent(rule.bullets.map((bullet) => `- ${bullet.text}`))
    : "";
}

function renderBusinessRuleProperty(
  result: ReturnType<typeof parseMarkVSpec>,
  rule: ReturnType<typeof parseMarkVSpec>["rules"][number],
  key: string
): string {
  const values = businessRulePropertyValues(rule, key);
  if (values.length === 0) {
    return "";
  }
  return values.length === 1
    ? renderParamSource(result, values[0] ?? "")
    : `<ul class="spec-list">${values.map((item) => `<li>${renderParamSource(result, item)}</li>`).join("")}</ul>`;
}

function businessRulePropertyValues(
  rule: ReturnType<typeof parseMarkVSpec>["rules"][number],
  key: string
): string[] {
  const value = rule.properties[key];
  return Array.isArray(value) ? value : value ? [value] : [];
}

function renderErrorCodesSpec(result: ReturnType<typeof parseMarkVSpec>): string {
  const sectionProse = sectionProseForKind(result, "ErrorCodes");
  const showOverview = result.errorCodes.some((errorCode) => (errorCode.overview?.length ?? 0) > 0);
  const showNotes = result.errorCodes.some((errorCode) => (errorCode.notes?.length ?? 0) > 0);
  return `<section class="doc-section">
    <h2>${label(result, "errorCodes")}</h2>
    ${renderSectionOverview(sectionProse)}
    ${renderLocalizedTable(result,
      [
        label(result, "id"),
        label(result, "name"),
        ...(showOverview ? [label(result, "overview")] : []),
        label(result, "businessRule"),
        label(result, "target"),
        label(result, "message"),
        label(result, "display"),
        ...(showNotes ? [label(result, "notes")] : [])
      ],
      result.errorCodes.map((errorCode) => [
        renderDetailRefId(errorCode.id),
        text(errorCode.name),
        ...(showOverview ? [renderEntityOverview(errorCode.overview)] : []),
        renderErrorCodeProperty(result, errorCode, "business rule"),
        renderErrorCodeProperty(result, errorCode, "target"),
        renderErrorCodeProperty(result, errorCode, "message"),
        renderErrorCodeProperty(result, errorCode, "display"),
        ...(showNotes ? [renderEntityNotes(errorCode.notes)] : [])
      ])
    )}
    ${renderSectionNotes(sectionProse)}
  </section>`;
}

function renderErrorCodeProperty(
  result: ReturnType<typeof parseMarkVSpec>,
  errorCode: ReturnType<typeof parseMarkVSpec>["errorCodes"][number],
  key: string
): string {
  const value = errorCode.properties[key];
  const values = Array.isArray(value) ? value : value ? [value] : [];
  if (values.length === 0) {
    return "";
  }

  return values.length === 1
    ? renderParamSource(result, values[0] ?? "")
    : `<ul class="spec-list">${values.map((item) => `<li>${renderParamSource(result, item)}</li>`).join("")}</ul>`;
}

function renderHistorySpec(result: ReturnType<typeof parseMarkVSpec>): string {
  const sectionProse = result.sectionProse.filter((candidate) => candidate.kind === "History");
  if (result.historyEntries.length === 0 && sectionProse.length === 0) {
    return "";
  }

  const fields = effectiveHistoryFields(result.historyFields);
  const headers = ["Version", ...fields.map((field) => field.label), "Changes"];
  const rows = result.historyEntries.map((entry) => [
    text(entry.version),
    ...fields.map((field) => text(entry.fields[field.key] ?? "")),
    renderMarkdownSectionContent(entry.bodyLines)
  ]);

  return `<section class="doc-section history-section">
    <h2>${label(result, "history")}</h2>
    ${renderEntityOverview(joinProseLineGroups(sectionProse.map((candidate) => candidate.overview)))}
    ${result.historyEntries.length > 0 ? renderLocalizedTable(result, headers, rows) : `<p class="spec-empty">${label(result, "none")}</p>`}
    ${renderEntityNotes(joinProseLineGroups(sectionProse.map((candidate) => candidate.notes)))}
  </section>`;
}

function sectionProseForKind(result: ReturnType<typeof parseMarkVSpec>, kind: string): ReturnType<typeof parseMarkVSpec>["sectionProse"] {
  return result.sectionProse.filter((candidate) => candidate.kind === kind);
}

function renderSectionOverview(sectionProse: ReturnType<typeof parseMarkVSpec>["sectionProse"]): string {
  return renderEntityOverview(joinProseLineGroups(sectionProse.map((candidate) => candidate.overview)));
}

function renderSectionNotes(sectionProse: ReturnType<typeof parseMarkVSpec>["sectionProse"]): string {
  return renderEntityNotes(joinProseLineGroups(sectionProse.map((candidate) => candidate.notes)));
}

function renderNotesSpec(result: ReturnType<typeof parseMarkVSpec>): string {
  if (result.notes.length > 0) {
    return result.notes.map((note) => renderNoteSection(result, note)).join("");
  }

  return "";
}

function renderNoteSection(result: ReturnType<typeof parseMarkVSpec>, note: ReturnType<typeof parseMarkVSpec>["notes"][number]): string {
  const content = renderMarkdownSectionContent(trimNoteLines(note.lines));
  return `<section class="doc-section note-section">
    <h2>${text(note.title)} <span class="note-line">line ${note.line}</span></h2>
    ${content || `<p class="spec-empty">${label(result, "none")}</p>`}
  </section>`;
}

function renderDiagnosticsSpec(result: ReturnType<typeof parseMarkVSpec>): string {
  return `<section class="doc-section">
    <h2>${label(result, "diagnostics")}</h2>
    ${renderLocalizedTable(result,
      [label(result, "severity"), label(result, "line"), label(result, "message")],
      result.diagnostics.map((diagnostic) => [
        diagnostic.severity,
        diagnostic.line ? String(diagnostic.line) : "",
        text(renderDiagnosticMessageForLocale(diagnostic, result.screen.locale))
      ])
    )}
  </section>`;
}

function renderConditionList(result: ReturnType<typeof parseMarkVSpec>, groups: Array<[string, string[]]>): string {
  const items = groups.flatMap(([label, conditions]) => conditions.map((condition) => `<li>${escapeHtml(conditionLabel(result, label))}: ${renderCondition(result, condition)}</li>`));
  return items.length > 0 ? `<ul class="spec-list">${items.join("")}</ul>` : "";
}

function renderCondition(result: ReturnType<typeof parseMarkVSpec>, condition: string): string {
  return renderSourceWithReferences(result, condition, false);
}

function renderDetailCondition(result: ReturnType<typeof parseMarkVSpec>, condition: string): string {
  return renderSourceWithReferences(result, condition, true);
}

function renderTrigger(result: ReturnType<typeof parseMarkVSpec>, trigger: string | undefined): string {
  if (!trigger) {
    return "";
  }

  const match = /^((?:E|A)-[\p{L}\p{N}-]+)\.([A-Za-z][A-Za-z0-9_-]*)$/u.exec(trigger);
  if (!match) {
    return renderTriggerLabel(trigger);
  }

  const reference = referenceForId(result, match[1], match[1].startsWith("A-") ? "action" : "element");
  return `${reference || code(match[1])}.${escapeHtml(match[2])}`;
}

function renderActionDetailTrigger(result: ReturnType<typeof parseMarkVSpec>, trigger: string | undefined): string {
  if (!trigger) {
    return "";
  }

  const match = /^((?:E|A)-[\p{L}\p{N}-]+)\.([A-Za-z][A-Za-z0-9_-]*)$/u.exec(trigger);
  if (!match) {
    return renderTriggerLabel(trigger);
  }

  return `${referenceForDetailId(result, match[1])}.${escapeHtml(match[2])}`;
}

function renderDocLabel(value: string, kind: "state" | "trigger" | "result", extraClass = ""): string {
  const classes = ["mm-doc-label", `mm-doc-label-${kind}`, extraClass].filter(Boolean).join(" ");
  return `<code class="${classes}">${escapeHtml(value)}</code>`;
}

function renderStateLabel(value: string, extraClass = ""): string {
  return renderDocLabel(value, "state", extraClass);
}

function renderTriggerLabel(value: string): string {
  return renderDocLabel(value, "trigger");
}

function renderResultLabel(value: string | undefined): string {
  return value ? renderDocLabel(value, "result") : text("-");
}

function renderTransitionTarget(result: ReturnType<typeof parseMarkVSpec>, target: string): string {
  const marker = markerBadgeForId(result, target);
  if (marker) {
    return marker;
  }

  return isTerminalTransitionTarget(target) ? renderNavigationTarget(target) : isInternalId(target) ? code(target) : text(target);
}

function renderStateTransitionTarget(result: ReturnType<typeof parseMarkVSpec>, target: string): string {
  if (isTerminalTransitionTarget(target)) {
    return renderNavigationTarget(target);
  }
  const marker = markerBadgeForId(result, target);
  return marker || renderStateLabel(target);
}

function actionKind(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number]
): string {
  if (action.outcomes.length > 0 || action.transitions.some((transition) => transition.result)) {
    return "outcome";
  }

  if (hasHttpRequestStep(action) && (action.target || action.mode || action.fragment)) {
    return "partial update";
  }

  if (hasHttpRequestStep(action)) {
    return "request";
  }

  if (renderActionDestination(result, action)) {
    return "navigation";
  }

  if (action.target || action.mode || action.fragment) {
    return "update";
  }

  return "";
}

function renderActionRequest(action: { request?: { method: string; path: string } }): string {
  return action.request ? `${escapeHtml(action.request.method)} ${escapeHtml(action.request.path)}` : "";
}

function hasHttpRequestStep(action: Pick<ReturnType<typeof parseMarkVSpec>["actions"][number], "processSteps">): boolean {
  return action.processSteps.some((step) => normalizeProcessStepName(step.name) === "httprequest");
}

function renderRouteParams(
  result: ReturnType<typeof parseMarkVSpec>,
  params: ReturnType<typeof parseMarkVSpec>["actions"][number]["routeParams"],
  detailedReferences = false
): string {
  return renderParams(result, params, detailedReferences);
}

function renderParams(
  result: ReturnType<typeof parseMarkVSpec>,
  params: Array<{ name: string; source: string }>,
  detailedReferences = false
): string {
  if (params.length === 0) {
    return "";
  }

  return `<ul>${params.map((param) => `<li>${escapeHtml(param.name)}: ${detailedReferences ? renderDetailParamSource(result, param.source) : renderParamSource(result, param.source)}</li>`).join("")}</ul>`;
}

function renderParamSource(result: ReturnType<typeof parseMarkVSpec>, source: string): string {
  return renderSourceWithReferences(result, source, false);
}

function renderDetailParamSource(result: ReturnType<typeof parseMarkVSpec>, source: string): string {
  return renderSourceWithReferences(result, source, true);
}

function renderSourceWithReferences(result: ReturnType<typeof parseMarkVSpec>, source: string, detailedReferences: boolean): string {
  return source.split(/(\$\{[^}]+\})/gu).map((part) => {
    if (!part) {
      return "";
    }
    if (isOpaqueExpressionSource(part)) {
      return renderInlineToken(part);
    }
    return escapeHtml(part).replace(/(^|[^\p{L}\p{N}-])((?:ERR|L|E|F|A|R|V)-[\p{L}\p{N}-]+)/gu, (_match, prefix: string, id: string) => {
      const reference = detailedReferences
        ? referenceForDetailId(result, id)
        : id.startsWith("F-")
          ? result.formGroups.some((candidate) => candidate.id === id) ? renderFormGroupReferenceId(id) : renderDetailRefId(id)
          : markerBadgeForId(result, id) || renderDetailRefId(id);
      return `${prefix}${reference}`;
    });
  }).join("");
}

function renderExpressionTokens(source: string): string {
  return source.split(/(\$\{[^}]+\})/gu).map((part) => isOpaqueExpressionSource(part) ? renderInlineToken(part) : text(part)).join("");
}

function renderInlineToken(value: string): string {
  return `<span class="mm-inline-token">${escapeHtml(value)}</span>`;
}

function renderResponses(responses: ReturnType<typeof parseMarkVSpec>["actions"][number]["responses"]): string {
  if (responses.length === 0) {
    return "";
  }

  return `<ul>${responses.map((response) => `<li>${renderResultLabel(response.result)}: ${text(response.definition)}</li>`).join("")}</ul>`;
}

function renderActionDetail(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number]
): string {
  const rows = [
    [label(result, "overview"), renderActionOverview(result, action)],
    [label(result, "kind"), text(actionKind(result, action))],
    [label(result, "trigger"), renderActionDetailTrigger(result, action.triggeredBy)],
    [label(result, "from"), renderFromStates(action.fromStates)],
    [label(result, "process"), renderProcessSteps(result, action, true)],
    [label(result, "responses"), renderResponses(action.responses)],
    ...renderActionCaseRows(result, action),
    [label(result, "partialUpdates"), renderActionPartialUpdates(result, action)],
    [label(result, "update"), renderUpdateEffect(result, action, true)],
    [label(result, "stateChanges"), renderActionStateChangeList(result, action)],
    [label(result, "navigation"), renderActionNavigationList(result, action)],
    [label(result, "routeParameters"), renderRouteParams(result, action.routeParams, true)],
    [label(result, "notes"), renderEntityNotes(action.notes)]
  ].filter(([, value]) => value);

  return `<article class="action-detail">
    <h3 id="${actionDetailAnchor(action.id)}">${markerBadgeForId(result, action.id, false) || renderDetailRefId(action.id)} ${text(action.name)}</h3>
    <dl>${rows.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${value}</dd>`).join("")}</dl>
  </article>`;
}

function renderProcessSteps(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number],
  detailedReferences = false
): string {
  const steps = action.processSteps;
  if (steps.length === 0) {
    return "";
  }

  const renderedParallelGroups = new Set<string>();
  const items = steps.map((step) => {
    if (!step.parallelGroup) {
      return renderProcessStepCard(result, step, detailedReferences);
    }
    if (renderedParallelGroups.has(step.parallelGroup)) {
      return "";
    }
    renderedParallelGroups.add(step.parallelGroup);
    const groupSteps = steps.filter((candidate) => candidate.parallelGroup === step.parallelGroup);
    return renderParallelProcessGroupCard(result, step.parallelGroup, groupSteps, detailedReferences);
  }).filter(Boolean);

  return `<div class="process-flow" role="list">${items.map((item, index) => `${item}${index < items.length - 1 ? '<div class="process-flow-connector" aria-hidden="true"></div>' : ""}`).join("")}</div>`;
}

function renderParallelProcessGroupCard(
  result: ReturnType<typeof parseMarkVSpec>,
  groupName: string,
  steps: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"],
  detailedReferences: boolean
): string {
  return `<div class="process-card process-parallel-group-card" role="listitem" data-process-group="${escapeHtml(groupName)}">
    <div class="process-card-header"><span class="process-card-title">${escapeHtml(label(result, "processParallelGroup"))}: ${text(groupName)}</span></div>
    <div class="process-parallel-children">${steps.map((step) => renderProcessStepCard(result, step, detailedReferences, "child")).join("")}</div>
  </div>`;
}

function renderProcessStepCard(
  result: ReturnType<typeof parseMarkVSpec>,
  step: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number],
  detailedReferences: boolean,
  variant: "root" | "child" = "root"
): string {
  const detailList = renderProcessStepDetailList(result, step, detailedReferences);
  const classes = [
    "process-card",
    "process-step-card",
    variant === "child" ? "process-step-card-child" : "",
    step.resolveGroup ? "process-resolve-card" : ""
  ].filter(Boolean).join(" ");
  const resolveGroup = step.resolveGroup ? `<span class="process-card-meta">${escapeHtml(label(result, "processGroup"))} ${text(step.resolveGroup)}</span>` : "";
  return `<div class="${classes}" role="${variant === "root" ? "listitem" : "group"}"${step.resolveGroup ? ` data-resolve-group="${escapeHtml(step.resolveGroup)}"` : ""}>
    <div class="process-card-header"><span class="process-card-title">${renderProcessStepLabel(step)}</span>${resolveGroup}</div>
    ${detailList}
  </div>`;
}

function renderProcessStepDetailList(
  result: ReturnType<typeof parseMarkVSpec>,
  step: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number],
  detailedReferences: boolean
): string {
  const details = [
    ...step.when.map((condition) => `${escapeHtml(label(result, "processWhen"))} ${detailedReferences ? renderDetailCondition(result, condition) : renderCondition(result, condition)}`),
    ...step.skipWhen.map((condition) => `${escapeHtml(label(result, "processSkipWhen"))} ${detailedReferences ? renderDetailCondition(result, condition) : renderCondition(result, condition)}`),
    renderProcessDataDetails(result, "receive", step.receives, detailedReferences),
    ...renderProcessStepDetails(result, step, detailedReferences),
    renderProcessDataDetails(result, "result", step.results, detailedReferences),
    step.to ? `${escapeHtml(label(result, "processEffect"))} ${renderTransitionEffect(result, step.to)}` : "",
    step.display ? `${escapeHtml(label(result, "processDisplay"))} ${renderDisplayEffect(result, step.display, detailedReferences)}` : "",
    step.target ? `${escapeHtml(label(result, "processUpdate"))} ${detailedReferences ? referenceForDetailId(result, step.target) : referenceForId(result, step.target, "target")}` : "",
    step.mode ? `${escapeHtml(label(result, "processMode"))} ${text(step.mode)}` : "",
    step.fragment ? `${escapeHtml(label(result, "processFragment"))} ${text(step.fragment)}` : "",
    step.content ? `${escapeHtml(label(result, "processContent"))} ${text(step.content)}` : ""
  ].filter(Boolean);
  const stepCases = renderProcessStepCases(result, step);
  return renderDetailList(result, [...details, stepCases], step.sideEffects);
}

function renderProcessStepLabel(
  step: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]
): string {
  const name = step.marker ? `${renderResultLabel(step.marker)} ${text(step.name)}` : text(step.name);
  return step.resolveGroup ? `${name} ${text(step.resolveGroup)}` : name;
}

function renderProcessDataDetails(
  result: ReturnType<typeof parseMarkVSpec>,
  labelText: string,
  details: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]["details"],
  detailedReferences: boolean
): string {
  if (details.length === 0) {
    return "";
  }

  const items = details.map((detail) => `<li>${renderProcessStepDetail(result, detail, detailedReferences)}</li>`).join("");
  return `${escapeHtml(processDataLabel(result, labelText))}<ul class="spec-list spec-nested-list">${items}</ul>`;
}

function processDataLabel(result: ReturnType<typeof parseMarkVSpec>, labelText: string): string {
  if (labelText === "receive") {
    return label(result, "processReceive");
  }
  if (labelText === "result") {
    return label(result, "result");
  }
  return labelText;
}

function renderProcessStepDetails(
  result: ReturnType<typeof parseMarkVSpec>,
  step: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number],
  detailedReferences: boolean
): string[] {
  const renderDetail = (detail: typeof step.details[number]) => renderProcessStepDetail(result, detail, detailedReferences);
  const normalizedName = normalizeProcessStepName(step.name);

  if (normalizedName !== "httprequest") {
    if (normalizedName === "servercall") {
      return renderServerCallDetails(result, step, detailedReferences, renderDetail);
    }
    return renderNestedProcessDetails(result, step.details, detailedReferences);
  }

  const requestDetail = step.details.find((detail) => detail.key === "request");
  if (!requestDetail) {
    return renderNestedProcessDetails(result, step.details, detailedReferences);
  }

  return renderNestedProcessDetails(result, normalizeHttpRequestDetails(step.details, requestDetail), detailedReferences);
}

function renderProcessStepDetail(
  result: ReturnType<typeof parseMarkVSpec>,
  detail: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]["details"][number],
  detailedReferences: boolean
): string {
  const key = renderProcessDetailKey(result, detail.key, detailedReferences);
  const value = detailedReferences ? renderDetailParamSource(result, detail.value) : renderParamSource(result, detail.value);
  return `${key}: ${value}`;
}

function renderServerCallDetails(
  result: ReturnType<typeof parseMarkVSpec>,
  step: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number],
  detailedReferences: boolean,
  renderDetail: (detail: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]["details"][number]) => string
): string[] {
  const callDetail = step.details.find((detail) => detail.key === "call");
  if (!callDetail) {
    return renderNestedProcessDetails(result, step.details, detailedReferences);
  }

  const parameters = step.details.filter((detail) => detail !== callDetail);
  const call = detailedReferences ? renderDetailParamSource(result, callDetail.value) : renderParamSource(result, callDetail.value);
  const nestedParams = parameters.length > 0
    ? `<ul class="spec-list spec-nested-list">${renderNestedProcessDetails(result, parameters, detailedReferences).map((detail) => `<li>${detail}</li>`).join("")}</ul>`
    : "";
  return [`${call}${nestedParams}`];
}

function normalizeHttpRequestDetails(
  details: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]["details"],
  requestDetail: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]["details"][number]
): ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]["details"] {
  return details.map((detail) => {
    if (detail === requestDetail || detail.key.includes(".")) {
      return detail;
    }
    return { ...detail, key: `request.params.${detail.key}` };
  });
}

interface ProcessDetailNode {
  key: string;
  detail?: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]["details"][number];
  children: ProcessDetailNode[];
}

function renderNestedProcessDetails(
  result: ReturnType<typeof parseMarkVSpec>,
  details: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]["details"],
  detailedReferences: boolean
): string[] {
  const nodes: ProcessDetailNode[] = [];
  for (const detail of details) {
    addProcessDetailNode(nodes, detail.key.split(".").filter(Boolean), detail);
  }
  return nodes.map((node) => renderProcessDetailNode(result, node, detailedReferences));
}

function addProcessDetailNode(
  nodes: ProcessDetailNode[],
  path: string[],
  detail: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]["details"][number]
): void {
  if (path.length === 0) {
    return;
  }

  const [key, ...children] = path;
  let node = nodes.find((candidate) => candidate.key === key);
  if (!node) {
    node = { key, children: [] };
    nodes.push(node);
  }

  if (children.length === 0) {
    node.detail = detail;
    return;
  }

  addProcessDetailNode(node.children, children, detail);
}

function renderProcessDetailNode(
  result: ReturnType<typeof parseMarkVSpec>,
  node: ProcessDetailNode,
  detailedReferences: boolean
): string {
  const key = renderProcessDetailKey(result, node.key, detailedReferences);
  const label = node.detail
    ? `${key}: ${detailedReferences ? renderDetailParamSource(result, node.detail.value) : renderParamSource(result, node.detail.value)}`
    : key;
  const children = node.children.length > 0
    ? `<ul class="spec-list spec-nested-list">${node.children.map((child) => `<li>${renderProcessDetailNode(result, child, detailedReferences)}</li>`).join("")}</ul>`
    : "";
  return `${label}${children}`;
}

function renderProcessDetailKey(result: ReturnType<typeof parseMarkVSpec>, key: string, detailedReferences: boolean): string {
  const localized = processDetailKeyLabel(result, key);
  if (localized) {
    return escapeHtml(localized);
  }
  return detailedReferences ? renderDetailParamSource(result, key) : renderParamSource(result, key);
}

function processDetailKeyLabel(result: ReturnType<typeof parseMarkVSpec>, key: string): string | undefined {
  switch (key) {
    case "request":
      return label(result, "processRequest");
    case "params":
      return label(result, "parameters");
    case "result":
      return label(result, "result");
    case "server":
      return label(result, "processServer");
    case "validation":
      return label(result, "validation");
    case "receive":
      return label(result, "processReceive");
    case "response":
      return label(result, "processResponse");
    case "call":
      return label(result, "run");
    case "group":
      return label(result, "processGroup");
    default:
      return undefined;
  }
}

function renderProcessStepCases(
  result: ReturnType<typeof parseMarkVSpec>,
  step: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]
): string {
  if (step.outcomes.length === 0) {
    return "";
  }

  return `${label(result, "case")}<ul class="spec-list spec-nested-list">${step.outcomes.map((outcome) => {
    const update = renderUpdateEffect(result, outcome, true);
    const details = [
      outcome.description ? `${escapeHtml(label(result, "processDescription"))}: ${text(outcome.description)}` : "",
      outcome.response ? `${escapeHtml(label(result, "processResponse"))} ${text(outcome.response.definition)}` : "",
      outcome.request ? `${escapeHtml(label(result, "processRequest"))} ${renderActionRequest(outcome)}` : "",
      outcome.businessRules.length ? `${escapeHtml(label(result, "businessRule"))} ${renderDetailReferences(result, outcome.businessRules)}` : "",
      outcome.errorCodes.length ? `${escapeHtml(label(result, "errorCodes"))} ${renderDetailReferences(result, outcome.errorCodes)}` : "",
      outcome.routeParams.length ? `${label(result, "routeParameters")} ${renderRouteParams(result, outcome.routeParams, true)}` : "",
      renderOutcomeTransition(result, outcome),
      outcome.display ? `${escapeHtml(label(result, "processDisplay"))} ${renderDisplayEffect(result, outcome.display, true)}` : "",
      update ? `${escapeHtml(label(result, "processUpdate"))} ${update}` : "",
      outcome.flow === "stop" ? escapeHtml(label(result, "processStop")) : "",
      outcome.flow === "continue" ? escapeHtml(label(result, "processContinue")) : ""
    ].filter(Boolean);
    return `<li><strong>${renderResultLabel(outcome.result)}</strong>${details.length > 0 ? `<ul>${details.map((detail) => `<li>${detail}</li>`).join("")}</ul>` : ""}</li>`;
  }).join("")}</ul>`;
}

function renderOutcomeTransition(
  result: ReturnType<typeof parseMarkVSpec>,
  outcome: ReturnType<typeof parseMarkVSpec>["actions"][number]["outcomes"][number]
): string {
  return outcome.to ? `${escapeHtml(label(result, "processEffect"))} ${renderTransitionEffect(result, outcome.to)}` : "";
}

function renderActionStateChangeList(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number]
): string {
  return renderActionTransitionDetails(result, action, action.transitions.filter((transition) => !isTerminalTransitionTarget(transition.to)), "state");
}

function renderActionNavigationList(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number]
): string {
  return renderActionTransitionDetails(result, action, action.transitions.filter((transition) => isTerminalTransitionTarget(transition.to)), "navigation");
}

function renderActionTransitionDetails(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number],
  transitions: ReturnType<typeof parseMarkVSpec>["actions"][number]["transitions"],
  kind: "state" | "navigation"
): string {
  if (transitions.length === 0) {
    return "";
  }

  return `<ul class="spec-list">${sortActionTransitionsByState(result, transitions).map((transition) => {
    const outcome = transition.result ? findActionOutcomeForTransition(action, transition) : undefined;
    const params = kind === "navigation" ? renderActionNavigationParams(result, action, outcome) : "";
    const details = [
      `${label(result, "from")}: ${renderStateLabel(transition.from)}`,
      transition.result ? `${label(result, "case")}: ${renderResultLabel(transition.result)}` : "",
      `${label(result, "to")}: ${kind === "navigation" ? renderNavigationTarget(transition.to) : renderStateLabel(transition.to)}`,
      params ? `${label(result, "params")}: ${params}` : ""
    ].filter(Boolean);
    return `<li>${details.join("; ")}</li>`;
  }).join("")}</ul>`;
}

function renderActionNavigationParams(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number],
  outcome: ReturnType<typeof parseMarkVSpec>["actions"][number]["outcomes"][number] | ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]["outcomes"][number] | undefined
): string {
  return renderRouteParams(result, [...action.routeParams, ...(outcome?.routeParams ?? [])], true);
}

function sortActionTransitionsByState(
  result: ReturnType<typeof parseMarkVSpec>,
  transitions: ReturnType<typeof parseMarkVSpec>["actions"][number]["transitions"]
): typeof transitions {
  const stateOrder = new Map(result.states.map((state, index) => [state.name, index]));
  const unknownStateRank = result.states.length;
  return transitions
    .map((transition, index) => ({ transition, index }))
    .sort((left, right) => {
      const leftRank = stateOrder.get(left.transition.from) ?? unknownStateRank;
      const rightRank = stateOrder.get(right.transition.from) ?? unknownStateRank;
      return leftRank - rightRank || left.index - right.index;
    })
    .map((entry) => entry.transition);
}

function renderActionCaseRows(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number]
): string[][] {
  return action.outcomes
    .map((outcome) => {
      const response = outcome.response ?? action.responses.find((candidate) => candidate.result === outcome.result);
      const update = outcome ? renderUpdateEffect(result, outcome, true) : "";
      const details = [
        outcome.description ? `${escapeHtml(label(result, "processDescription"))}: ${text(outcome.description)}` : "",
        response ? `${escapeHtml(label(result, "processResponse"))} ${text(response.definition)}` : "",
        outcome?.request ? `${escapeHtml(label(result, "processRequest"))} ${renderActionRequest(outcome)}` : "",
        outcome?.businessRules.length ? `${escapeHtml(label(result, "businessRule"))} ${renderDetailReferences(result, outcome.businessRules)}` : "",
        outcome?.errorCodes.length ? `${escapeHtml(label(result, "errorCodes"))} ${renderDetailReferences(result, outcome.errorCodes)}` : "",
        outcome?.routeParams.length ? `${label(result, "routeParameters")} ${renderRouteParams(result, outcome.routeParams, true)}` : "",
        outcome.to ? `${escapeHtml(label(result, "processEffect"))} ${renderTransitionEffect(result, outcome.to)}` : "",
        outcome.display ? `${escapeHtml(label(result, "processDisplay"))} ${renderDisplayEffect(result, outcome.display, true)}` : "",
        update ? `${escapeHtml(label(result, "processUpdate"))} ${update}` : ""
      ].filter(Boolean);
      return [`${label(result, "case")} ${outcome.result}`, details.length > 0 ? `<ul>${details.map((detail) => `<li>${detail}</li>`).join("")}</ul>` : ""];
    });
}

function renderDetailReferences(result: ReturnType<typeof parseMarkVSpec>, ids: string[]): string {
  return ids.length === 1
    ? referenceForDetailId(result, ids[0] ?? "")
    : `<ul class="spec-list spec-nested-list">${ids.map((id) => `<li>${referenceForDetailId(result, id)}</li>`).join("")}</ul>`;
}

function renderActionOverview(
  _result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number]
): string {
  return renderEntityOverview(action.overview);
}

function renderFromStates(states: string[]): string {
  return states.length > 0 ? states.map((state) => renderStateLabel(state)).join(", ") : "";
}

function processStepDetail(
  step: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number],
  key: string
): string {
  return step.details.find((detail) => detail.key === key)?.value ?? "";
}

function normalizeProcessStepName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]+/g, "");
}

function renderTransitionEffect(result: ReturnType<typeof parseMarkVSpec>, target: string): string {
  if (target.startsWith("SCR-") || target.startsWith("/") || /^https?:\/\//.test(target)) {
    return `${escapeHtml(label(result, "processNavigateTo"))} ${renderNavigationTarget(target)}`;
  }

  return `${escapeHtml(label(result, "processSetState"))} ${renderStateTransitionTarget(result, target)}`;
}

function renderOutcomeEffect(
  result: ReturnType<typeof parseMarkVSpec>,
  transitionTarget: string,
  outcome: ReturnType<typeof parseMarkVSpec>["actions"][number]["outcomes"][number]
): string {
  const update = renderUpdateEffect(result, outcome);
  if (update) {
    return `update ${update}`;
  }

  if (outcome.request) {
    return renderActionRequest(outcome);
  }

  return renderTransitionEffect(result, transitionTarget);
}

function renderUpdateEffect(
  result: ReturnType<typeof parseMarkVSpec>,
  action: Pick<ReturnType<typeof parseMarkVSpec>["actions"][number], "target" | "mode" | "fragment" | "sideEffects"> & { content?: string },
  detailedReferences = false
): string {
  const parts = [
    detailedReferences ? referenceForDetailId(result, action.target) : referenceForId(result, action.target, "target"),
    action.content ? `${escapeHtml(label(result, "processContent"))} ${text(action.content)}` : "",
    action.mode ? `${escapeHtml(label(result, "processMode"))} ${text(action.mode)}` : "",
    action.fragment ? `${escapeHtml(label(result, "processFragment"))} ${text(action.fragment)}` : ""
  ].filter(Boolean);

  return renderDetailList(result, parts, action.sideEffects);
}

function renderDisplayEffect(
  result: ReturnType<typeof parseMarkVSpec>,
  display: NonNullable<ReturnType<typeof parseMarkVSpec>["actions"][number]["outcomes"][number]["display"]>,
  detailedReferences = false
): string {
  const target = display.target
    ? referenceForDisplayTarget(result, display.target, detailedReferences)
    : escapeHtml(targetlessDisplayTargetLabel(result, display.element));
  const contentSource = display.contentSource.length > 0
    ? `<ul class="spec-list spec-nested-list">${display.contentSource.map((detail) => `<li>${renderProcessStepDetail(result, detail, detailedReferences)}</li>`).join("")}</ul>`
    : "";
 const parts = [
    target,
    display.element ? `${escapeHtml(label(result, "processElement"))} ${referenceForDetailId(result, display.element)}` : "",
    display.message ? `${escapeHtml(label(result, "processMessage"))} ${renderDisplayMessageReference(result, display.message)}` : "",
    display.content ? `${escapeHtml(label(result, "processContent"))} ${text(display.content)}` : "",
    contentSource ? `${escapeHtml(label(result, "processContent"))} ${contentSource}` : ""
  ].filter(Boolean);

  return renderDetailList(result, parts, []);
}

function referenceForDisplayTarget(
  result: ReturnType<typeof parseMarkVSpec>,
  target: string,
  detailedReferences: boolean
): string {
  const suffix = target.endsWith(".error") ? ".error" : "";
  const id = suffix ? target.slice(0, -suffix.length) : target;
  const reference = detailedReferences ? referenceForDetailId(result, id) : referenceForId(result, id, "target");
  return suffix ? `${reference}<span class="mm-detail-ref-suffix">${escapeHtml(suffix)}</span>` : reference;
}

function renderDisplayMessageReference(result: ReturnType<typeof parseMarkVSpec>, message: string): string {
  const match = /^((?:V|R)-[\p{L}\p{N}-]+)\.messages$/u.exec(message);
  const sourceId = match?.[1];
  if (!sourceId) {
    return text(message);
  }
  return `${referenceForDetailId(result, sourceId)}<span class="mm-detail-ref-suffix">.messages</span>`;
}

function targetlessDisplayTargetLabel(result: ReturnType<typeof parseMarkVSpec>, elementId?: string): string {
  const elementType = result.elements.find((element) => element.id === elementId)?.type.toLowerCase();
  if (elementType === "dialog") {
    return label(result, "processModalOverlay");
  }
  if (elementType === "toast") {
    return label(result, "processToastOverlay");
  }
  return label(result, "processOverlay");
}

function renderDetailList(result: ReturnType<typeof parseMarkVSpec>, items: string[], sideEffects: string[]): string {
  const canonicalSideEffects = sideEffects.filter((sideEffect) => !isModelMutationSideEffect(sideEffect));
  const listItems = [
    ...items.filter(Boolean).map((item) => `<li>${item}</li>`),
    canonicalSideEffects.length > 0
      ? `<li><span class="spec-list-label">${escapeHtml(label(result, "sideEffects"))}</span><ul class="spec-list spec-nested-list">${canonicalSideEffects.map((sideEffect) => `<li>${renderDetailParamSource(result, sideEffect)}</li>`).join("")}</ul></li>`
      : ""
  ].filter(Boolean);

  return listItems.length > 0 ? `<ul class="spec-list spec-effect-list">${listItems.join("")}</ul>` : "";
}

function isModelMutationSideEffect(sideEffect: string): boolean {
  return /^model:\s*\$\{model\.[^}]+\}\s*=/u.test(sideEffect.trim());
}

function renderActionDestination(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number]
): string {
  const screenTransition = action.transitions.find((transition) => transition.to.startsWith("SCR-") || transition.to.startsWith("/") || /^https?:\/\//.test(transition.to));
  if (screenTransition) {
    return renderNavigationTarget(screenTransition.to);
  }

  const triggerElementId = action.trigger?.elementId;
  const triggerElement = triggerElementId ? result.elements.find((element) => element.id === triggerElementId) : undefined;
  const href = triggerElement?.properties["href"];
  return typeof href === "string" ? text(href) : "";
}

function referenceForId(
  result: ReturnType<typeof parseMarkVSpec>,
  id: string | undefined,
  category: "action" | "element" | "target"
): string {
  if (!id) {
    return "";
  }

  return referenceChipForId(result, id) || (category === "target" && isDocumentRefId(id) ? renderDocumentRefId(id) : category === "target" && !isInternalId(id) ? text(id) : isInternalId(id) ? renderDetailRefId(id) : text(id));
}

function referenceForDetailId(result: ReturnType<typeof parseMarkVSpec>, id: string | undefined): string {
  if (!id) {
    return "";
  }

  if (id.startsWith("L-")) {
    return referenceChipForId(result, id) || renderDetailRefId(id);
  }

  if (id.startsWith("E-")) {
    return referenceChipForId(result, id) || renderDetailRefId(id);
  }

  if (id.startsWith("A-")) {
    return referenceChipForId(result, id) || renderDetailRefId(id);
  }

  if (id.startsWith("F-")) {
    const formGroup = result.formGroups.find((candidate) => candidate.id === id);
    const reference = formGroup ? renderFormGroupReferenceId(id) : renderDetailRefId(id);
    return formGroup?.name ? `${reference} ${text(formGroup.name)}` : reference;
  }

  return referenceChipForId(result, id) || (isDocumentRefId(id) ? renderDocumentRefId(id) : isInternalId(id) ? renderDetailRefId(id) : text(id));
}

function renderDetailRefId(id: string): string {
  return `<span class="mm-detail-ref-id">${escapeHtml(id)}</span>`;
}

function renderFormGroupReferenceId(id: string): string {
  return `<a class="mm-detail-ref-link" href="#${formGroupsAnchor()}">${renderDetailRefId(id)}</a>`;
}

function formGroupsAnchor(): string {
  return "form-groups";
}

function renderNavigationTarget(target: string): string {
  return isDocumentRefId(target) ? renderDocumentRefId(target) : text(target);
}

function renderDocumentRefId(id: string): string {
  return `<code class="mm-document-ref-id">${escapeHtml(id)}</code>`;
}

function isDocumentRefId(value: string): boolean {
  return /^(?:SCR|TPL|PRT)-[\p{L}\p{N}-]+$/u.test(value);
}

function findMarker(result: ReturnType<typeof parseMarkVSpec>, id: string): string | undefined {
  const layout = preferredLayoutById(result, id);
  if (layout) {
    return layout.properties["marker"];
  }

  const element = result.elements.find((candidate) => candidate.id === id);
  if (element) {
    const marker = element.properties["marker"];
    return typeof marker === "string" ? marker : undefined;
  }

  const action = result.actions.find((candidate) => candidate.id === id);
  if (action) {
    return action.properties["marker"];
  }

  return undefined;
}

interface EntityRefChipInput {
  readonly id: string;
  readonly category: "action" | "layout" | "element" | "message";
  readonly marker?: string;
  readonly label?: string;
  readonly href?: string;
  readonly displaySource?: string;
}

function renderEntityRefChip(input: EntityRefChipInput): string {
  const marker = input.marker?.trim() || input.id;
  const markerAttributes = [
    `class="mm-id mm-marker mm-marker-${input.category}"`,
    `data-mm-marker-category="${escapeHtml(input.category)}"`,
    input.displaySource ? `data-mm-display-source="${escapeHtml(input.displaySource)}"` : ""
  ].filter(Boolean).join(" ");
  const markerHtml = `<code ${markerAttributes}>${escapeHtml(marker)}</code>`;
  const labelHtml = input.category === "element"
    ? ` ${renderDetailRefId(input.id)}`
    : input.label
      ? ` ${text(input.label)}`
      : "";
  const classes = `mm-ref-chip mm-ref-chip-${input.category}`;
  const title = input.label ? ` title="${escapeHtml(`${input.id} ${input.label}`)}"` : ` title="${escapeHtml(input.id)}"`;
  const refIdAttribute = ` data-mm-ref-id="${escapeHtml(input.id)}"`;
  const body = `${markerHtml}${labelHtml}`;
  return input.href
    ? `<a class="${classes}" href="${escapeHtml(input.href)}"${refIdAttribute}${title}>${body}</a>`
    : `<span class="${classes}"${refIdAttribute}${title}>${body}</span>`;
}

function markerBadgeForId(result: ReturnType<typeof parseMarkVSpec>, id: string | undefined, linkAction = true): string {
  if (!id || !isInternalId(id)) {
    return "";
  }

  const category = markerCategoryForId(id);
  if (!category) {
    return "";
  }

  const marker = findMarker(result, id) || id;
  const badge = `<code class="mm-id mm-marker mm-marker-${category}" data-mm-marker-category="${category}">${escapeHtml(marker)}</code>`;
  if (category === "action" && linkAction) {
    return `<a class="mm-marker-link" href="#${actionDetailAnchor(id)}">${badge}</a>`;
  }
  return badge;
}

function referenceChipForId(result: ReturnType<typeof parseMarkVSpec>, id: string, linkAction = true): string {
  if (id.startsWith("A-")) {
    const action = result.actions.find((candidate) => candidate.id === id);
    return renderEntityRefChip({
      id,
      category: "action",
      marker: findMarker(result, id) || id,
      label: action?.name || id,
      href: linkAction ? `#${actionDetailAnchor(id)}` : undefined
    });
  }

  if (id.startsWith("L-")) {
    const layout = preferredLayoutById(result, id);
    return renderEntityRefChip({
      id,
      category: "layout",
      marker: findMarker(result, id) || id,
      label: layout?.name || id
    });
  }

  if (id.startsWith("E-")) {
    return renderEntityRefChip({
      id,
      category: "element",
      marker: findMarker(result, id) || id,
      label: id
    });
  }

  if (id.startsWith("V-") || id.startsWith("R-")) {
    const validation = result.validations.find((candidate) => candidate.id === id);
    const rule = result.rules.find((candidate) => candidate.id === id);
    return renderEntityRefChip({
      id,
      category: "message",
      marker: firstStringProperty(validation?.properties["marker"]) || firstStringProperty(rule?.properties["marker"]) || id,
      label: validation?.name || rule?.name || id,
      displaySource: id
    });
  }

  return "";
}

function firstStringProperty(value: string | string[] | true | undefined): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  return Array.isArray(value) ? value.find((item) => item.length > 0) : undefined;
}

function actionDetailAnchor(actionId: string): string {
  return `action-detail-${encodeURIComponent(actionId)}`;
}

function markerCategoryForId(id: string): "layout" | "element" | "action" | undefined {
  if (id.startsWith("L-")) {
    return "layout";
  }

  if (id.startsWith("E-")) {
    return "element";
  }

  if (id.startsWith("A-")) {
    return "action";
  }

  return undefined;
}

function isInternalId(value: string): boolean {
  return /^(?:ERR|L|E|F|A|R|V)-[\p{L}\p{N}-]+$/u.test(value);
}

function renderElementLabelSummary(properties: Record<string, string | true>): string {
  const labelValue = stringProperty(properties["label"]);
  const labelSource = renderSourceSummary(properties["label src"]);
  return [labelValue, labelSource].filter(Boolean).join("<br>");
}

function renderElementDescription(element: ReturnType<typeof parseMarkVSpec>["elements"][number]): string {
  const description = stringProperty(element.properties["description"])
    || stringProperty(element.properties["purpose"])
    || firstEntityProseParagraph(element.overview)
    || "";
  const notes = renderEntityNotes(element.notes);
  return [description ? text(description) : "", notes].filter(Boolean).join("<br>");
}

function renderElementTypeSummary(element: ReturnType<typeof parseMarkVSpec>["elements"][number]): string {
  return text(element.type);
}

function renderElementDisplayName(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  if (element.type === "Badge") {
    return renderElementContentDisplay(element) || referenceForId(result, element.id, "element");
  }

  return renderElementLabelSummary(element.properties)
    || renderElementContentSummary(element)
    || referenceForId(result, element.id, "element");
}

function renderElementContentDisplay(element: ReturnType<typeof parseMarkVSpec>["elements"][number]): string {
  const content = renderElementContentSummary(element);
  if (element.type !== "Badge" || !content) {
    return content;
  }

  return renderSemanticChip(content, stringProperty(element.properties["tone"]));
}

function renderElementSampleSummary(element: ReturnType<typeof parseMarkVSpec>["elements"][number]): string {
  const sample = stringProperty(element.properties["sample"]);
  if (element.type === "Badge" && sample) {
    return renderSemanticChip(sample, stringProperty(element.properties["tone"]));
  }

  return sample;
}

function renderFormControlValueSource(result: ReturnType<typeof parseMarkVSpec>, element: ReturnType<typeof parseMarkVSpec>["elements"][number]): string {
  const labelValue = stringProperty(element.properties["label"]);
  const labelSource = element.properties["label src"];
  const sample = stringProperty(element.properties["sample"]);
  const value = stringProperty(element.properties["value"]);
  const rows = [
    labelValue ? renderValueWithOptionalSource(labelValue, labelSource) : "",
    !labelValue && sample ? renderValueWithOptionalSource(sample, element.properties["src"]) : "",
    shouldShowFormControlValueSource(element, labelValue, sample, value) ? renderSourceSummary(value) || text(value) : "",
    renderSelectOptionSummary(result, element)
  ].filter(Boolean);

  if (rows.length === 0) {
    return "";
  }

  return rows.length === 1 ? rows[0] ?? "" : `<ul class="spec-list">${rows.map((row) => `<li>${row}</li>`).join("")}</ul>`;
}

function renderFormControlInitialValueSource(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  const initialValue = rawStringProperty(element.properties["initial value"]);
  const value = rawStringProperty(element.properties["value"]);
  return renderSpecSections([
    {
      title: label(result, "initial"),
      rows: initialValue ? [renderExpressionTokens(initialValue)] : []
    },
    {
      title: label(result, "displaySource"),
      rows: value ? [renderSourceSummary(value) || text(value)] : []
    }
  ]);
}

function renderInputSpec(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  const inputRows = [
    ...["type", "mode"].map((key) => {
      const value = rawStringProperty(element.properties[key]);
      return value ? `${text(key)}: ${renderParamSource(result, value)}` : "";
    }),
    element.selectOptions.length > 0
      ? `${text(label(result, "options"))}: ${element.selectOptions.map((option) => renderValueWithOptionalSource(option.label, option.source)).join(", ")}`
      : ""
  ].filter(Boolean);
  const constraintRows = [
    ...element.inputRules
      .filter((rule) => !isRequiredInputRule(rule))
      .map((rule) => rule.value ? `${text(rule.key)}: ${renderParamSource(result, rule.value)}` : text(rule.key)),
    ...["min", "max", "step", "min length", "max length", "accept", "multiple"].map((key) => {
      const property = element.properties[key];
      const value = rawStringProperty(property);
      if (value) {
        return `${text(key)}: ${renderParamSource(result, value)}`;
      }
      return property === true ? text(key) : "";
    }),
    element.properties["readonly"] === true || stringProperty(element.properties["readonly"]) ? text(label(result, "readonly")).toLowerCase() : ""
  ].filter(Boolean);
  const format = rawStringProperty(element.properties["format"]);
  return renderSpecSections([
    { title: label(result, "input"), rows: inputRows },
    { title: label(result, "constraints"), rows: constraintRows },
    { title: label(result, "format"), rows: format ? [renderParamSource(result, format)] : [] }
  ]);
}

function renderSpecSections(sections: Array<{ title: string; rows: string[] }>): string {
  const visibleSections = sections.filter((section) => section.rows.length > 0);
  if (visibleSections.length === 0) {
    return "";
  }
  return visibleSections.map((section) => (
    `<div class="spec-section"><strong>${text(section.title)}</strong><ul class="spec-list">${section.rows.map((row) => `<li>${row}</li>`).join("")}</ul></div>`
  )).join("");
}

function renderRequiredSpec(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  const requiredWhenRows = element.inputRules.flatMap((rule) => {
    if (!isRequiredWhenInputRule(rule)) {
      return [];
    }
    const condition = requiredWhenValue(rule);
    return condition ? [`${label(result, "conditionWhenShort")}: ${renderParamSource(result, condition)}`] : [];
  });
  const rows = [
    isRequiredProperty(element.properties["required"]) || element.inputRules.some(isRequiredBooleanInputRule) ? text(label(result, "requiredYes")) : requiredWhenRows.length === 0 ? text(label(result, "requiredNo")) : "",
    ...requiredWhenRows
  ].filter(Boolean);

  return rows.length === 1 ? rows[0] ?? "" : rows.length > 1 ? `<ul class="spec-list">${rows.map((row) => `<li>${row}</li>`).join("")}</ul>` : "";
}

function isRequiredProperty(value: string | true | undefined): boolean {
  return value === true || rawStringProperty(value)?.toLowerCase() === "true";
}

function isRequiredInputRule(rule: ReturnType<typeof parseMarkVSpec>["elements"][number]["inputRules"][number]): boolean {
  return rule.key.trim().toLowerCase() === "required" || isRequiredWhenInputRule(rule);
}

function isRequiredBooleanInputRule(rule: ReturnType<typeof parseMarkVSpec>["elements"][number]["inputRules"][number]): boolean {
  return rule.key.trim().toLowerCase() === "required" && (!rule.value || rule.value.trim().toLowerCase() === "true");
}

function isRequiredWhenInputRule(rule: ReturnType<typeof parseMarkVSpec>["elements"][number]["inputRules"][number]): boolean {
  return rule.key.trim().toLowerCase() === "required when" || rule.key.trim().toLowerCase().startsWith("required when ");
}

function requiredWhenValue(rule: ReturnType<typeof parseMarkVSpec>["elements"][number]["inputRules"][number]): string {
  const key = rule.key.trim();
  if (key.toLowerCase() === "required when") {
    return rule.value.trim();
  }
  return key.slice("required when".length).trim();
}

function renderActionableDisplayValue(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  return renderElementDisplayValue(result, element);
}

function renderElementDisplayValue(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  const labelValue = rawStringProperty(element.properties["label"]);
  const sample = rawStringProperty(element.properties["sample"]);
  const value = rawStringProperty(element.properties["value"]);
  const format = rawStringProperty(element.properties["format"]);
  const rows = [
    labelValue ? `${label(result, "label")}: ${renderValueWithOptionalSource(labelValue, element.properties["label src"])}` : "",
    sample ? `${label(result, "sample")}: ${renderElementSampleDisplayValue(element, sample)}` : "",
    !sample && element.properties["src"] ? `${label(result, "src")}: ${renderSourceSummary(element.properties["src"])}` : "",
    value ? `${label(result, "value")}: ${hasOpaqueExpression(value) ? renderExpressionTokens(value) : text(value)}` : "",
    format ? `${label(result, "format")}: ${text(format)}` : ""
  ].filter(Boolean);

  if (rows.length === 0) {
    return "";
  }

  return rows.length === 1 ? rows[0] ?? "" : `<ul class="spec-list">${rows.map((row) => `<li>${row}</li>`).join("")}</ul>`;
}

function renderElementSampleDisplayValue(element: ReturnType<typeof parseMarkVSpec>["elements"][number], sample: string): string {
  const renderedSample = element.type === "Badge"
    ? renderSemanticChip(sample, rawStringProperty(element.properties["tone"]))
    : text(sample);
  const source = renderSourceSummary(element.properties["src"]);
  return source ? `${renderedSample} (${source})` : renderedSample;
}

function renderContentElementState(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  return renderConditionList(result, [
    ["visible", element.visibleWhen],
    ["hidden", element.hiddenWhen]
  ]) || text(label(result, "always"));
}

function renderActionableElementState(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  return renderConditionList(result, [
    ["visible", element.visibleWhen],
    ["hidden", element.hiddenWhen],
    ["disabled", element.disabledWhen]
  ]);
}

function shouldShowFormControlValueSource(
  element: ReturnType<typeof parseMarkVSpec>["elements"][number],
  labelValue: string,
  sample: string,
  value: string
): boolean {
  if (!value) {
    return false;
  }
  return !labelValue || !sample || isOpaqueExpressionSource(value);
}

function isOpaqueExpressionSource(value: string): boolean {
  return /^\$\{[^}]+\}$/u.test(value.trim());
}

function hasOpaqueExpression(value: string): boolean {
  return /\$\{[^}]+\}/u.test(value);
}

function opaqueExpressionBody(value: string): string | undefined {
  const trimmed = value.trim();
  return isOpaqueExpressionSource(trimmed) ? trimmed.slice(2, -1).trim() : undefined;
}

function renderValueWithOptionalSource(value: string, source: string | true | undefined): string {
  const renderedSource = renderSourceSummary(source);
  return renderedSource ? `${text(value)} (${renderedSource})` : text(value);
}

function renderToneSummary(element: ReturnType<typeof parseMarkVSpec>["elements"][number]): string {
  const tone = stringProperty(element.properties["tone"]);
  return tone ? renderSemanticChip(tone, tone) : "";
}

function renderSemanticChip(value: string, tone: string | undefined, role: "type" | "tone" = "tone"): string {
  const classes = ["mm-chip"];
  if (role === "type") {
    classes.push("mm-chip-type");
  } else {
    classes.push(`mm-chip-tone-${semanticChipTone(tone)}`);
  }

  return `<span class="${classes.join(" ")}">${text(value)}</span>`;
}

function semanticChipTone(tone: string | undefined): "neutral" | "info" | "success" | "warning" | "danger" {
  if (tone === "info" || tone === "success" || tone === "warning" || tone === "danger") {
    return tone;
  }
  return "neutral";
}

function renderElementValueSummary(properties: Record<string, string | true>): string {
  const value = stringProperty(properties["value"]);
  const initialValue = stringProperty(properties["initial value"]);
  if (value && initialValue) {
    return `${value} {${initialValue}}`;
  }
  return value || initialValue;
}

function renderElementContentSummary(element: ReturnType<typeof parseMarkVSpec>["elements"][number]): string {
  return stringProperty(element.properties["sample"])
    || stringProperty(element.properties["label"])
    || stringProperty(element.properties["value"])
    || stringProperty(element.properties["content"])
    || stringProperty(element.properties["text"])
    || stringProperty(element.properties["alt"])
    || stringProperty(element.properties["name"])
    || stringProperty(element.properties["title"]);
}

function renderSourceSummary(value: string | true | undefined): string {
  const source = rawStringProperty(value);
  if (!source) {
    return "";
  }

  return hasOpaqueExpression(source) ? renderExpressionTokens(source) : code(source);
}

function renderValidationList(element: ReturnType<typeof parseMarkVSpec>["elements"][number]): string {
  return element.validations.length > 0
    ? `<ul class="spec-list">${element.validations.map((validation) => `<li>${text(validation)}</li>`).join("")}</ul>`
    : "";
}

function renderSelectOptionSummary(result: ReturnType<typeof parseMarkVSpec>, element: ReturnType<typeof parseMarkVSpec>["elements"][number]): string {
  return element.selectOptions.length > 0
    ? `${text(label(result, "options"))}: ${element.selectOptions.map((option) => renderValueWithOptionalSource(option.label, option.source)).join(", ")}`
    : "";
}

function renderElementActionReferences(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  const actionIds = [
    rawStringProperty(element.properties["action"]),
    ...result.actions
      .filter((action) => action.trigger?.elementId === element.id)
      .map((action) => action.id)
  ].filter(Boolean);
  const uniqueActionIds = [...new Set(actionIds)];
  return uniqueActionIds.length > 0
    ? `<ul class="spec-list">${uniqueActionIds.map((actionId) => `<li>${referenceForId(result, actionId, "action")}</li>`).join("")}</ul>`
    : "";
}

function renderContentElementNotes(element: ReturnType<typeof parseMarkVSpec>["elements"][number]): string {
  const notes = [
    stringProperty(element.properties["level"]) ? `level: ${stringProperty(element.properties["level"])}` : "",
    stringProperty(element.properties["src"]) ? `src: ${stringProperty(element.properties["src"])}` : "",
    stringProperty(element.properties["format"]) ? `format: ${stringProperty(element.properties["format"])}` : "",
    stringProperty(element.properties["items"]) ? `items: ${stringProperty(element.properties["items"])}` : "",
    element.tableColumns.length > 0 ? `columns: ${element.tableColumns.map((column) => column.label).join(", ")}` : "",
    element.tableRows.length > 0 ? `sample rows: ${element.tableRows.length}` : ""
  ].filter(Boolean);

  return notes.length > 0 ? `<ul class="spec-list">${notes.map((note) => `<li>${text(note)}</li>`).join("")}</ul>` : "";
}

function renderKeyValueTable(rows: Array<[string, string | undefined]>, headers = ["Field", "Value"]): string {
  return renderTable(headers, rows.map(([key, value]) => [text(key), text(value)]));
}

function renderProjectKeyValueTable(messages: RendererMessages, rows: Array<[string, string | undefined]>): string {
  return renderTable([pLabel(messages, "field"), pLabel(messages, "value")], rows.map(([key, value]) => [text(key), text(value)]), pLabel(messages, "none"));
}

function renderProjectTable(messages: RendererMessages, headers: string[], rows: Array<Array<string | undefined>>): string {
  return renderTable(headers, rows, pLabel(messages, "none"));
}

function renderLocalizedTable(
  result: ReturnType<typeof parseMarkVSpec>,
  headers: string[],
  rows: Array<Array<string | undefined>>
): string {
  return renderTable(headers, rows, label(result, "none"));
}

function renderLocalizedTableWithCells(
  result: ReturnType<typeof parseMarkVSpec>,
  headers: string[],
  rows: TableCell[][]
): string {
  return renderTableWithCells(headers, rows, label(result, "none"));
}

function createNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let value = "";
  for (let index = 0; index < 32; index += 1) {
    value += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return value;
}

function scriptJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
