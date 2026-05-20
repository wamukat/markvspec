import * as vscode from "vscode";
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildProjectTransitionGraph,
  composeMarkVSpecTemplate,
  computeMarkVSpecRenderInvalidation,
  effectiveHistoryFields,
  latestHistoryBasicInfo,
  loadMarkVSpecProject,
  parseDisplayMessageReference,
  parseMarkVSpec,
  allResolvedLayoutGroups,
  renderDiagnosticMessageForLocale,
  renderMarkVSpecHtml,
  renderProjectTransitionMermaid,
  resolveMarkVSpecEntityReference,
  resolveRendererMessages,
  resolveProjectPath,
  isProjectReferenceAllowed,
  isMarkVSpecSourceType,
  layoutDisplaySettings,
  anchoredOverlayReference,
  controlledPanelReferences,
  displayLabelForElement,
  displaySummaryForElement,
  isElementDisplaySampleValue
} from "@markvspec/core";
import type {
  DisplayContentSpecSampleRowsRef,
  MarkVSpecProjectLoadResult,
  MessageKey,
  RendererMessages
} from "@markvspec/core";
import { messagesForLocale, resolveLocale } from "@markvspec/core";
import {
  joinProseLineGroups,
  renderEntityNotes as renderEntityNotesBase,
  renderEntityOverview as renderEntityOverviewBase,
  renderMarkdownSectionContent as renderMarkdownSectionContentBase,
  trimNoteLines
} from "./markdown-renderer.js";
import type { MarkdownRenderOptions } from "./markdown-renderer.js";
import {
  code,
  escapeHtml,
  rawStringProperty,
  renderTable,
  renderTableWithCells,
  text
} from "./design-document-renderer.js";
import type { TableCell } from "./design-document-renderer.js";
import {
  scenarioRouteValues
} from "@markvspec/core";
import type { FocusScope, StateScreenReadModel } from "@markvspec/core";
import type { StateViewsRenderContext } from "./state-views-renderer.js";
import { createStateViewSpecTableRenderer } from "./state-view-spec-tables.js";
import type { DocumentScope } from "./document-scope.js";
import {
  embedPartialPreviews,
  enrichPartialReferenceInfo,
  loadPartialPreviewsForScreen,
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
import { registerMarkVSpecExtension } from "./extension-registration.js";
import { MarkVSpecDiagnosticsController } from "./diagnostics.js";
import { createMarkVSpecCodeActions } from "./quick-fixes.js";
import { renderPreviewPrintWireframeOverrideStyle } from "./preview-styles.js";
import { renderPreviewIcon } from "./preview-icons.js";
import {
  renderPreviewClientScript,
  renderPreviewMermaidScriptTag,
  type PreviewHtmlTarget
} from "./preview-client-script.js";
import {
  createElementSpecSummaryRenderer,
  renderElementTypeSummary,
  renderElementValueSummary,
  renderSpecSections
} from "./element-spec-summary-renderer.js";
import { renderProjectPreviewStyles, renderScreenPreviewStyles } from "./preview-document-styles.js";
import { createMarkVSpecDocumentSymbolsProvider } from "./document-symbol-provider.js";
import {
  demoteHtmlHeadings,
  prependHtmlInsideFirstTag
} from "./preview-html-postprocess.js";
import {
  buildDocumentScope as buildDocumentScopeBase,
  createPreviewDesignDocumentRenderer,
  type DesignDocumentOptions
} from "./preview-design-document-renderer.js";
import { createValidationRuleSpecRenderer } from "./validation-rule-spec-renderer.js";
import {
  PreviewUpdateController,
  type PreviewPatchResult
} from "./preview-update-controller.js";
import {
  actionDetailAnchor,
  businessRulesAnchor,
  errorCodesAnchor,
  formGroupsAnchor,
  isDocumentRefId,
  isInternalId,
  markerBadgeForId,
  referenceChipForId,
  referenceForDetailId,
  renderDetailRefId,
  renderDocumentRefId,
  renderEntityRefChip,
  screenAnchor,
  validationRulesAnchor
} from "./entity-reference-presenter.js";
export {
  defaultExportHtmlBaseName,
  renderPreviewErrorHtml,
  renderPreviewLoadingHtml
} from "./preview-shell.js";
export { createMarkVSpecCodeActions } from "./quick-fixes.js";
export { createMarkVSpecDocumentSymbols } from "./document-symbol-provider.js";
export {
  isCurrentPreviewGenerationState,
  normalizePreviewPatchResultState,
  scheduleCoalescedPreviewUpdate
} from "./preview-update-controller.js";

type MarkerCategory = "layout" | "element" | "action";
interface ScreenDocumentResult {
  result: ReturnType<typeof parseMarkVSpec>;
  focus?: FocusScope;
  messages?: RendererMessages;
}

interface ScreenPreviewHtmlOptions {
  target: PreviewHtmlTarget;
  visibleMarkers: { layout: boolean; element: boolean; action: boolean };
  sourceLabel?: string;
  autoUpdate: boolean;
  interactiveControls: boolean;
  showRepeatedContent: boolean;
  nonce?: string;
  cspSource?: string;
  mermaidScriptUri?: string;
  mermaidScript?: string;
}

interface ProjectPreviewHtmlOptions {
  target: PreviewHtmlTarget;
  sourceLabel?: string;
  autoUpdate: boolean;
  interactiveControls: boolean;
  nonce?: string;
  cspSource?: string;
  mermaidScriptUri?: string;
  mermaidScript?: string;
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
export const PREVIEW_UPDATE_DEBOUNCE_MS = 150;
export const PREVIEW_AUTO_UPDATE_DEFAULT = true;
export const PREVIEW_WEBVIEW_UPDATE_TIMEOUT_MS = 3000;
const DIAGNOSTIC_UPDATE_DEBOUNCE_MS = 250;

let previewPanel: vscode.WebviewPanel | undefined;
let previewDocumentUri: vscode.Uri | undefined;
let extensionRootUri: vscode.Uri | undefined;
let markerVisibility = {
  layout: true,
  element: true,
  action: true
};
let previewShowRepeatedContent = false;
let previewAutoUpdate = PREVIEW_AUTO_UPDATE_DEFAULT;
let diagnosticsController: MarkVSpecDiagnosticsController | undefined;
let outputChannel: vscode.OutputChannel | undefined;
const previewUpdateController = new PreviewUpdateController({
  clearTimeout,
  debounceMs: PREVIEW_UPDATE_DEBOUNCE_MS,
  setTimeout,
  timeoutMs: PREVIEW_WEBVIEW_UPDATE_TIMEOUT_MS
});

export function activate(context: vscode.ExtensionContext): void {
  const activationStart = Date.now();
  extensionRootUri = context.extensionUri;
  outputChannel = vscode.window.createOutputChannel("MarkVSpec");
  diagnosticsController = new MarkVSpecDiagnosticsController({
    collection: vscode.languages.createDiagnosticCollection("markvspec"),
    debounceMs: DIAGNOSTIC_UPDATE_DEBOUNCE_MS,
    isMarkVSpecDocument,
    loadResult: (document) => isMarkVSpecProjectDocument(document)
      ? loadProjectFromDocument(document)
      : loadScreenDocumentResult(document).result,
    documentLabel: previewDocumentLabel,
    logDuration
  });
  const createCodeActionsProvider = (): vscode.CodeActionProvider => ({
    provideCodeActions(
      document: vscode.TextDocument,
      _range: vscode.Range | vscode.Selection,
      codeActionContext: vscode.CodeActionContext
    ) {
      return createMarkVSpecCodeActions(document, codeActionContext.diagnostics);
    }
  });
  const formatStructure = async () => {
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
  };
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
  const openPreview = async (resource?: vscode.Uri) => {
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
        previewUpdateController.invalidateGeneration();
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
          previewUpdateController.resolveFragmentUpdateResult(
            message.requestId,
            message,
            previewDocumentUri?.toString() ?? "",
            currentPreviewUpdateState()
          );
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
  };

  const onDidChangeTextDocument = (event: vscode.TextDocumentChangeEvent) => {
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
  };

  const onDidChangeActiveTextEditor = (editor: vscode.TextEditor | undefined) => {
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
  };

  const onDidSaveTextDocument = (document: vscode.TextDocument) => {
    invalidateDocumentCaches(document);
    updateDiagnostics(document);
  };
  const onMessageFileChange = () => {
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
  const refreshPreview = async () => {
    if (!previewPanel || !previewDocumentUri) {
      void vscode.window.showWarningMessage("Open a MarkVSpec preview before refreshing.");
      return;
    }
    const document = await vscode.workspace.openTextDocument(previewDocumentUri);
    cancelScheduledPreviewUpdate();
    updatePreview(document, reservePreviewGeneration(), { force: true });
    scheduleDiagnostics(document);
  };
  const onDidCloseTextDocument = (document: vscode.TextDocument) => {
    invalidateDocumentCaches(document);
    clearScheduledDiagnostics(document);
    diagnosticsController?.delete(document);
  };

  const activeDocument = vscode.window.activeTextEditor?.document;
  if (activeDocument) {
    updateDiagnostics(activeDocument);
  }

  registerMarkVSpecExtension({
    context,
    diagnosticsCollection: diagnosticsController.collection,
    outputChannel,
    createDocumentSymbolsProvider: createMarkVSpecDocumentSymbolsProvider,
    createCodeActionsProvider,
    formatStructure,
    openPreview,
    refreshPreview,
    onDidChangeTextDocument,
    onDidChangeActiveTextEditor,
    onDidOpenTextDocument: updateDiagnostics,
    onDidSaveTextDocument,
    onDidCloseTextDocument,
    onMessageFileChange,
    exportCommandDisposables: [exportCommands.exportHtml, exportCommands.exportPdf]
  });
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
  previewPanel?.dispose();
  diagnosticsController?.dispose();
}

function schedulePreviewUpdate(document: vscode.TextDocument): void {
  const documentUri = document.uri.toString();
  previewUpdateController.schedule({
    document,
    documentUri,
    shouldRun: (scheduledDocumentUri, generationId) => isCurrentPreviewGeneration(generationId, scheduledDocumentUri),
    run: (scheduledDocument, generationId) => updatePreview(scheduledDocument, generationId)
  });
}

function cancelScheduledPreviewUpdate(): void {
  previewUpdateController.cancelScheduledUpdate();
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
  return previewUpdateController.reserveGeneration();
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
  return previewUpdateController.isCurrentGeneration({
    hasPreviewPanel: Boolean(previewPanel),
    currentDocumentUri: previewDocumentUri?.toString()
  }, generationId, documentUri);
}

function currentPreviewUpdateState(): { hasPreviewPanel: boolean; currentDocumentUri: string | undefined } {
  return {
    hasPreviewPanel: Boolean(previewPanel),
    currentDocumentUri: previewDocumentUri?.toString()
  };
}

function yieldToWebview(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function updateDiagnostics(document: vscode.TextDocument): void {
  diagnosticsController?.update(document);
}

function scheduleDiagnostics(document: vscode.TextDocument): void {
  diagnosticsController?.schedule(document);
}

function clearScheduledDiagnostics(document: vscode.TextDocument): void {
  diagnosticsController?.clear(document);
}

function isMarkVSpecDocument(document: vscode.TextDocument): boolean {
  return document.uri.scheme === "file" && (document.languageId === "markvspec" || document.fileName.endsWith(".vspec.md") || isMarkVSpecProjectDocument(document));
}

function isMarkVSpecProjectDocument(document: vscode.TextDocument): boolean {
  return document.uri.scheme === "file" && document.fileName.endsWith(".vspec.project.md");
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
    title === "Slots" ||
    /^Slot(?::\s*.+)?$/u.test(title) ||
    /^Layout(?::\s*.+)?$/u.test(title);
}

function escapeRegExpForPattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function focusScopeForScreen(result: ReturnType<typeof parseMarkVSpec>): FocusScope | undefined {
  const focus = {
    layoutIds: new Set([
      ...result.layoutGroups.map((layout) => layout.id),
      ...result.slotContents.flatMap((slot) => slot.layoutGroups.map((layout) => layout.id))
    ]),
    elementIds: new Set(result.elements.map((element) => element.id)),
    actionIds: new Set(result.actions.map((action) => action.id))
  };
  return focus.layoutIds.size > 0 || focus.elementIds.size > 0 || focus.actionIds.size > 0
    ? focus
    : undefined;
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
    return extractRenderKeyFragments(renderFormGroupsSpec(scope.specResult, scope.sourceResult), renderKey);
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
  return previewUpdateController.postFragmentUpdate(panel.webview, fragments, generationId);
}

function resolvePendingFragmentUpdates(success: boolean): void {
  previewUpdateController.resolvePendingFragmentUpdates(success);
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
  return renderScreenPreviewHtml(screen, {
    target: "webview",
    visibleMarkers,
    sourceLabel,
    autoUpdate,
    interactiveControls,
    showRepeatedContent,
    nonce: createNonce(),
    cspSource: webview.cspSource,
    mermaidScriptUri: extensionUri ? String(mermaidScriptWebviewUri(webview, extensionUri)) : undefined
  });
}

function renderScreenPreviewHtml(
  screen: ReturnType<typeof parseMarkVSpec> | ScreenDocumentResult,
  options: ScreenPreviewHtmlOptions
): string {
  const { result, focus } = normalizeScreenDocumentResult(screen);
  const messages = "messages" in screen && screen.messages ? screen.messages : rendererMessagesForResult(result);
  rendererMessagesByResult.set(result, messages);
  const document = renderDesignDocumentHtml(result, "", { focus, messages });
  const title = result.screen.title ?? result.screen.id ?? "Untitled MarkVSpec Screen";
  const resolvedLocale = resolveLocale(result.screen.locale);
  const clientMessages = previewClientMessages(messages);
  const nonce = options.nonce ?? createNonce();
  const scriptNonce = options.target === "webview" ? ` nonce="${nonce}"` : "";
  const cspMeta = options.target === "webview" && options.cspSource
    ? `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${options.cspSource}; style-src ${options.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${options.cspSource};">`
    : "";
  const mermaidScriptTag = renderPreviewMermaidScriptTag(options, scriptNonce);

  return `<!doctype html>
<html lang="${escapeHtml(resolvedLocale)}">
  <head>
    <meta charset="utf-8">
    ${cspMeta}
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
${renderScreenPreviewStyles()}
    </style>
  </head>
  <body class="${previewBodyClasses(options.visibleMarkers, options.showRepeatedContent)}">
    <header class="toolbar">
      <div class="toolbar-controls">
        <div class="control-group marker-actions" role="group" aria-label="${escapeHtml(messages.markerVisibility)}">
          <span class="control-label">${escapeHtml(messages.markers)}</span>
          <span class="segmented">
          ${renderMarkerToggle("layout", messages.layout, options.visibleMarkers.layout, messages)}
          ${renderMarkerToggle("element", messages.element, options.visibleMarkers.element, messages)}
          ${renderMarkerToggle("action", messages.action, options.visibleMarkers.action, messages)}
          </span>
        </div>
        <div class="control-group repeated-actions" role="group" aria-label="${escapeHtml(messages.showRepeatedContent)}">
          <label class="switch-control" title="${escapeHtml(messages.showRepeatedContent)}">
            <input type="checkbox" data-repeated-toggle role="switch" aria-label="${escapeHtml(messages.showRepeatedContent)}" ${options.showRepeatedContent ? "checked" : ""}>
            <span>${escapeHtml(messages.showRepeatedContent)}</span>
          </label>
        </div>
        ${options.interactiveControls ? renderPreviewUpdateControls(messages, options.autoUpdate) : ""}
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
      ${mermaidScriptTag}
    <script${scriptNonce}>
      ${renderPreviewClientScript({
        target: options.target,
        messages: clientMessages,
        sourceLabel: options.sourceLabel,
        defaultPositionKey: "__markvspec-preview__",
        mermaidRenderIdPrefix: "markvspec-mermaid-",
        updateTimeoutMs: PREVIEW_WEBVIEW_UPDATE_TIMEOUT_MS
      })}
    </script>
  </body>
</html>`;
}


export function renderStandaloneHtml(
  screen: ReturnType<typeof parseMarkVSpec> | ScreenDocumentResult,
  mermaidScript: string | undefined,
  sourceLabel?: string
): string {
  return renderScreenPreviewHtml(screen, {
    target: "standalone",
    visibleMarkers: { layout: true, element: true, action: true },
    sourceLabel,
    autoUpdate: true,
    interactiveControls: false,
    showRepeatedContent: false,
    mermaidScript
  });
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
  return renderProjectPreviewHtmlDocument(project, {
    target: "webview",
    sourceLabel,
    autoUpdate,
    interactiveControls,
    nonce: createNonce(),
    cspSource: webview.cspSource,
    mermaidScriptUri: extensionUri ? String(mermaidScriptWebviewUri(webview, extensionUri)) : undefined
  });
}

function renderProjectPreviewHtmlDocument(
  project: MarkVSpecProjectLoadResult,
  options: ProjectPreviewHtmlOptions
): string {
  const messages = projectRendererMessagesForResult(project);
  const resolvedLocale = resolveLocale(project.project.project.frontMatter["locale"]);
  const nonce = options.nonce ?? createNonce();
  const title = project.project.project.title ?? project.project.project.id ?? "Untitled MarkVSpec Project";
  const clientMessages = previewClientMessages(messages);
  const metaItems = [options.sourceLabel].filter((item): item is string => Boolean(item)).map((item) => `<span class="meta-item">${escapeHtml(item)}</span>`);
  const document = renderProjectDesignDocumentHtml(project, messages);
  const scriptNonce = options.target === "webview" ? ` nonce="${nonce}"` : "";
  const cspMeta = options.target === "webview" && options.cspSource
    ? `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${options.cspSource}; style-src ${options.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${options.cspSource};">`
    : "";
  const mermaidScriptTag = renderPreviewMermaidScriptTag(options, scriptNonce);

  return `<!doctype html>
<html lang="${escapeHtml(resolvedLocale)}">
  <head>
    <meta charset="utf-8">
    ${cspMeta}
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
      ${options.interactiveControls ? `<div class="toolbar-controls">
        ${renderPreviewUpdateControls(messages, options.autoUpdate)}
      </div>` : ""}
    </header>
    <button class="toc-toggle" type="button" aria-label="${escapeHtml(messages.toggleContents)}" aria-expanded="true" title="${escapeHtml(messages.toggleContents)}" data-toc-toggle>
      <span class="toc-toggle-bars" aria-hidden="true"></span>
    </button>
    <main class="content">${document}</main>
    ${renderPreviewPrintWireframeOverrideStyle()}
    <nav class="toc" aria-label="${escapeHtml(messages.contents)}">
      <div class="toc-title">${escapeHtml(messages.contents)}</div>
      ${renderTableOfContentsList(messages)}
    </nav>
    ${mermaidScriptTag}
    <script${scriptNonce}>
      ${renderPreviewClientScript({
        target: options.target,
        messages: clientMessages,
        sourceLabel: options.sourceLabel,
        defaultPositionKey: "__markvspec-project-preview__",
        mermaidRenderIdPrefix: "markvspec-project-mermaid-",
        updateTimeoutMs: PREVIEW_WEBVIEW_UPDATE_TIMEOUT_MS
      })}
    </script>
  </body>
</html>`;
}

export function renderStandaloneProjectHtml(
  project: MarkVSpecProjectLoadResult,
  mermaidScript: string | undefined,
  sourceLabel?: string
): string {
  return renderProjectPreviewHtmlDocument(project, {
    target: "standalone",
    sourceLabel,
    autoUpdate: true,
    interactiveControls: false,
    mermaidScript
  });
}

export function renderProjectDesignDocumentHtml(project: MarkVSpecProjectLoadResult, messages: RendererMessages = projectRendererMessagesForResult(project)): string {
  return previewDesignDocumentRenderer.renderProjectDesignDocumentHtml(project, messages);
}

function projectRendererMessagesForResult(project: MarkVSpecProjectLoadResult): RendererMessages {
  return projectRendererMessagesByResult.get(project) ?? messagesForLocale(undefined);
}

function readMermaidScript(extensionUri: vscode.Uri | undefined): string | undefined {
  return extensionUri ? readMermaidScriptFromExtension(extensionUri) : undefined;
}

function renderMarkerToggle(category: "layout" | "element" | "action", labelText: string, pressed: boolean, messages: RendererMessages): string {
  return `<button type="button" data-marker-toggle="${category}" aria-pressed="${pressed ? "true" : "false"}" title="${escapeHtml(`${messages.toggleMarker}: ${labelText}`)}">${escapeHtml(labelText)}</button>`;
}

function markdownRenderOptions(result: ReturnType<typeof parseMarkVSpec>): MarkdownRenderOptions {
  return {
    renderEntityReference: (id) => resolveMarkVSpecEntityReference(result, id)
      ? referenceChipForId(result, id, true, true) || renderDetailRefId(id)
      : undefined
  };
}

function renderMarkdownSectionContent(result: ReturnType<typeof parseMarkVSpec>, lines: string[]): string {
  return renderMarkdownSectionContentBase(lines, markdownRenderOptions(result));
}

function renderEntityNotes(result: ReturnType<typeof parseMarkVSpec>, lines: string[] | undefined): string {
  return renderEntityNotesBase(lines, markdownRenderOptions(result));
}

function renderEntityOverview(result: ReturnType<typeof parseMarkVSpec>, lines: string[] | undefined): string {
  return renderEntityOverviewBase(lines, markdownRenderOptions(result));
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

const validationRuleSpecRenderer = createValidationRuleSpecRenderer({
  businessRulesAnchor,
  errorCodesAnchor,
  label,
  markerIdHeader,
  referenceForDetailId,
  referenceForId,
  renderDetailParamSource,
  renderEntityNotes,
  renderEntityOverview,
  renderLocalizedTable,
  renderLocalizedTableWithCells,
  renderMarkdownSectionContent,
  renderParamSource,
  renderSectionNotes,
  renderSectionOverview,
  sectionProseForKind,
  validationRulesAnchor
});
const {
  renderValidationRulesSpec,
  renderRulesSpec,
  renderErrorCodesSpec
} = validationRuleSpecRenderer;

const previewDesignDocumentRenderer = createPreviewDesignDocumentRenderer({
  rendererMessagesForResult,
  projectRendererMessagesForResult,
  setRendererMessages: (result, messages) => rendererMessagesByResult.set(result, messages),
  renderSectionNumber,
  renderScreenSpec,
  renderHistorySpec,
  renderInlineTableOfContents,
  renderStatesSpec,
  renderStateFlowSpec,
  renderViewContextsSpec,
  renderViewContextSamplesSpec,
  renderActionDetailsSpec,
  renderFormGroupsSpec,
  renderValidationRulesSpec,
  renderRulesSpec,
  renderErrorCodesSpec,
  renderNotesSpec,
  renderScreenTransitionsSpec,
  renderActionTransitionsSpec,
  renderDiagnosticsSpec,
  stateViewsRenderContext,
  renderWireframeFor
});

export function renderDesignDocumentHtml(result: ReturnType<typeof parseMarkVSpec>, _preview: string, options: DesignDocumentOptions = {}): string {
  return previewDesignDocumentRenderer.renderDesignDocumentHtml(result, options);
}

function renderSectionNumber(sectionNumber: string): string {
  return `<span class="section-number">${escapeHtml(sectionNumber)}.</span>`;
}

export function buildDocumentScope(result: ReturnType<typeof parseMarkVSpec>, focus?: FocusScope): DocumentScope {
  return buildDocumentScopeBase(result, focus);
}

function renderInlineTableOfContents(result: ReturnType<typeof parseMarkVSpec>): string {
  const messages = rendererMessagesForResult(result);
  return `<nav class="toc-inline" aria-label="${text(label(result, "contents"))}">
    <div class="toc-title">${text(label(result, "contents"))}</div>
    ${renderTableOfContentsList(messages)}
  </nav>`;
}

function renderViewportStateScreensSpec(scope: DocumentScope, sectionNumber?: string): string {
  return previewDesignDocumentRenderer.renderViewportStateScreensSpec(scope, sectionNumber);
}

function stateViewsRenderContext(
  result: ReturnType<typeof parseMarkVSpec>,
  markdownResult: ReturnType<typeof parseMarkVSpec> = result
): StateViewsRenderContext {
  const elementSpec = createElementSpecSummaryRenderer({
    label: (key) => label(result, key),
    renderEntityNotes: (notes) => renderEntityNotes(markdownResult, notes),
    renderExpressionTokens,
    renderParamSource: (source) => renderParamSource(result, source),
    renderSourceSummary,
    renderValueWithOptionalSource
  });
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
      marker: layoutDisplaySettings(layout).marker || layout.id,
      label: layout.name || layout.id
    }),
    renderIcon: renderPreviewIcon,
    renderEntityNotes: (notes) => renderEntityNotes(markdownResult, notes),
    renderElementTypeSummary,
    renderElementActionReferences: (element) => renderElementActionReferences(result, element),
    renderElementDescription: elementSpec.renderElementDescription,
    renderRequiredSpec: elementSpec.renderRequiredSpec,
    renderFormControlValue: elementSpec.renderFormControlValue,
    renderFormControlSource: elementSpec.renderFormControlSource,
    renderInputSpec: elementSpec.renderInputSpec,
    renderElementConditionSummary: (element) => renderElementConditionSummary(result, element),
    renderContentElementState: (element) => renderContentElementState(result, element),
    renderDisplayContentValue,
    renderSourceSummary,
    renderElementLabelSummary: elementSpec.renderElementLabelSummary,
    renderElementValueSummary,
    renderConditionList: (groups) => renderConditionList(result, groups),
    renderActionOverview: (action) => renderActionOverview(markdownResult, action),
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
      renderOverview: (lines) => renderEntityOverview(markdownResult, [...lines]),
      renderNotes: (lines) => renderEntityNotes(markdownResult, [...lines])
    },
    specFragments: {
      renderLayoutSpecFragment: (heading, content, headingLevel, emptyWhenRepeatedHidden) =>
        renderLayoutSpecFragment(result, heading, content, headingLevel, emptyWhenRepeatedHidden),
      renderElementSpecFragment: (heading, content, sectionProse, headingLevel, emptyWhenRepeatedHidden) =>
        renderElementSpecFragment(markdownResult, heading, content, sectionProse, headingLevel, emptyWhenRepeatedHidden),
      renderActionSpecFragment: (heading, content, sectionProse, headingLevel, emptyWhenRepeatedHidden) =>
        renderActionSpecFragment(markdownResult, heading, content, sectionProse, headingLevel, emptyWhenRepeatedHidden)
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
  displayEffects?: StateScreenReadModel["displayEffects"],
  scenarioSamples?: StateScreenReadModel["scenarioSamples"],
  scenarioRoute?: StateScreenReadModel["scenarioRoute"]
): string {
  const html = renderMarkVSpecHtml(result, {
    includeConditionalContent: false,
    viewport,
    state,
    modelValues,
    viewValues,
    routeValues: scenarioRouteValues(scenarioRoute),
    sampleOverrides: sampleOverridesFromScenarioSamples(scenarioSamples),
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

function sampleOverridesFromScenarioSamples(
  samples: StateScreenReadModel["scenarioSamples"] | undefined
): NonNullable<Parameters<typeof renderMarkVSpecHtml>[1]>["sampleOverrides"] {
  if (!samples || samples.length === 0) {
    return undefined;
  }
  return Object.fromEntries(samples.map((sample) => [sample.elementId, sample]));
}

function renderStateScreenSubheading(heading: string): string {
  return `<h5 class="state-screen-subheading">${escapeHtml(heading)}</h5>`;
}

function repeatedHiddenEmptyAttr(emptyWhenRepeatedHidden: boolean): string {
  return emptyWhenRepeatedHidden ? ` data-mm-repeated-empty="true"` : "";
}

function demoteStateScreenDetailHeadings(content: string): string {
  return demoteHtmlHeadings(content, 4, 6, "state-screen-detail-heading");
}

function renderFormGroupsSpec(result: ReturnType<typeof parseMarkVSpec>, markdownResult: ReturnType<typeof parseMarkVSpec> = result): string {
  const content = renderFormGroupsSpecFragment(result, result.formGroups, markdownResult);
  const sectionProse = sectionProseForKind(result, "FormGroups");
  if (!content && sectionProse.length === 0) {
    return "";
  }

  return `<section class="doc-section">
    <h2 id="${formGroupsAnchor()}">${label(result, "formGroups")}</h2>
    ${renderSectionOverview(markdownResult, sectionProse)}
    ${content || `<p class="spec-empty">${label(result, "none")}</p>`}
    ${renderSectionNotes(markdownResult, sectionProse)}
  </section>`;
}

function renderViewContextsSpec(result: ReturnType<typeof parseMarkVSpec>, markdownResult: ReturnType<typeof parseMarkVSpec> = result): string {
  const content = renderViewContextsSpecFragment(result, markdownResult);
  const sectionProse = sectionProseForKind(result, "ViewContext");
  if (!content && sectionProse.length === 0) {
    return "";
  }

  return `<section class="doc-section view-context-section">
    <h2>${label(result, "viewContexts")}</h2>
    ${renderSectionOverview(markdownResult, sectionProse)}
    ${content || `<p class="spec-empty">${label(result, "none")}</p>`}
    ${renderSectionNotes(markdownResult, sectionProse)}
  </section>`;
}

function renderViewContextsSpecFragment(result: ReturnType<typeof parseMarkVSpec>, markdownResult: ReturnType<typeof parseMarkVSpec> = result): string {
  if (result.viewContexts.length === 0) {
    return "";
  }
  const showOverview = result.viewContexts.some((context) => (context.overview?.length ?? 0) > 0);
  const showNotes = result.viewContexts.some((context) => (context.notes?.length ?? 0) > 0);

  return renderLocalizedTable(result,
    [
      label(result, "name"),
      ...(showOverview ? [label(result, "overview")] : []),
      label(result, "type"),
      label(result, "value"),
      label(result, "defaultValue"),
      label(result, "properties"),
      ...(showNotes ? [label(result, "notes")] : [])
    ],
    result.viewContexts.map((context) => [
      code(context.name),
      ...(showOverview ? [renderEntityOverview(markdownResult, context.overview)] : []),
      context.type ? code(context.type) : "",
      renderViewContextValues(context.values, label(result, "default")),
      context.defaultValue ? code(context.defaultValue) : "",
      renderViewContextProperties(context.properties),
      ...(showNotes ? [renderEntityNotes(markdownResult, context.notes)] : [])
    ])
  );
}

function renderViewContextSamplesSpec(result: ReturnType<typeof parseMarkVSpec>, markdownResult: ReturnType<typeof parseMarkVSpec> = result): string {
  const content = renderViewContextSamplesSpecFragment(result, markdownResult);
  const sectionProse = sectionProseForKind(result, "ViewContextSamples");
  if (!content && sectionProse.length === 0) {
    return "";
  }

  return `<section class="doc-section view-context-samples-section">
    <h2>${label(result, "viewContextSamples")}</h2>
    ${renderSectionOverview(markdownResult, sectionProse)}
    ${content || `<p class="spec-empty">${label(result, "none")}</p>`}
    ${renderSectionNotes(markdownResult, sectionProse)}
  </section>`;
}

function renderViewContextSamplesSpecFragment(result: ReturnType<typeof parseMarkVSpec>, markdownResult: ReturnType<typeof parseMarkVSpec> = result): string {
  if (result.viewContextSamples.length === 0) {
    return "";
  }
  const showOverview = result.viewContextSamples.some((sample) => (sample.overview?.length ?? 0) > 0);
  const showNotes = result.viewContextSamples.some((sample) => (sample.notes?.length ?? 0) > 0);

  return renderLocalizedTable(result,
    [
      label(result, "sample"),
      ...(showOverview ? [label(result, "overview")] : []),
      label(result, "value"),
      ...(showNotes ? [label(result, "notes")] : [])
    ],
    result.viewContextSamples.map((sample) => [
      code(sample.name),
      ...(showOverview ? [renderEntityOverview(markdownResult, sample.overview)] : []),
      renderViewContextSampleValues(sample.values),
      ...(showNotes ? [renderEntityNotes(markdownResult, sample.notes)] : [])
    ])
  );
}

function renderViewContextValues(values: ReturnType<typeof parseMarkVSpec>["viewContexts"][number]["values"], defaultLabel: string): string {
  if (values.length === 0) {
    return "";
  }
  return `<ul class="spec-list">${values.map((value) => `<li>${code(value.value)}${value.isDefault ? ` <span class="state-badge">${text(defaultLabel)}</span>` : ""}</li>`).join("")}</ul>`;
}

function renderViewContextProperties(properties: Record<string, string | true>): string {
  const entries = Object.entries(properties).filter(([key]) => key !== "type");
  if (entries.length === 0) {
    return "";
  }
  return `<ul class="spec-list">${entries.map(([key, value]) => `<li>${code(key)}${value === true ? "" : `: ${text(value)}`}</li>`).join("")}</ul>`;
}

function renderViewContextSampleValues(values: Record<string, string>): string {
  const entries = Object.entries(values);
  if (entries.length === 0) {
    return "";
  }
  return `<ul class="spec-list">${entries.map(([name, value]) => `<li>${code(`\${view.${name}}`)}: ${text(value)}</li>`).join("")}</ul>`;
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
    ${renderSectionOverview(result, sectionProse)}
    ${body}
    ${renderSectionNotes(result, sectionProse)}
  </div>`;
}

function renderActionSpecFragment(
  result: ReturnType<typeof parseMarkVSpec>,
  heading: string,
  content: string,
  sectionProse: ReturnType<typeof parseMarkVSpec>["sectionProse"] = [],
  headingLevel: 3 | 5 = 3,
  emptyWhenRepeatedHidden = false
): string {
  const headingTag = headingLevel === 5 ? renderStateScreenSubheading(heading) : `<h3>${escapeHtml(heading)}</h3>`;
  return `<div class="action-spec-fragment"${repeatedHiddenEmptyAttr(emptyWhenRepeatedHidden)}>
    ${headingTag}
    ${renderSectionOverview(result, sectionProse)}
    ${content}
    ${renderSectionNotes(result, sectionProse)}
  </div>`;
}

function renderFormGroupsSpecFragment(
  result: ReturnType<typeof parseMarkVSpec>,
  formGroups: ReturnType<typeof parseMarkVSpec>["formGroups"],
  markdownResult: ReturnType<typeof parseMarkVSpec> = result
): string {
  if (formGroups.length === 0) {
    return "";
  }
  const showOverview = formGroups.some((formGroup) => (formGroup.overview?.length ?? 0) > 0);
  const showNotes = formGroups.some((formGroup) => (formGroup.notes?.length ?? 0) > 0);

  return `<div class="form-group-spec-fragment" data-mm-render-key="form-groups:list">
    ${renderLocalizedTable(result,
      [
        markerIdHeader(result),
        ...(showOverview ? [label(result, "overview")] : []),
        label(result, "fields"),
        label(result, "submit"),
        ...(showNotes ? [label(result, "notes")] : [])
      ],
      formGroups.map((formGroup) => [
        referenceForDetailId(result, formGroup.id),
        ...(showOverview ? [renderEntityOverview(markdownResult, formGroup.overview)] : []),
        formGroup.fields.length > 0 ? `<ul class="spec-list">${formGroup.fields.map((field) => `<li>${referenceForDetailId(result, field.elementId)}</li>`).join("")}</ul>` : "",
        formGroup.submit ? referenceForDetailId(result, formGroup.submit.actionId) : "",
        ...(showNotes ? [renderEntityNotes(markdownResult, formGroup.notes)] : [])
      ])
    )}
  </div>`;
}

function markerIdHeader(result: ReturnType<typeof parseMarkVSpec>): string {
  return `${label(result, "marker")}/${label(result, "id")}`;
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
  const latestHistory = latestHistoryBasicInfo(result.historyEntries);
  const facts = ([
    [label(result, "route"), screen.route ?? ""],
    [label(result, "version"), latestHistory?.version ?? ""],
    [label(result, "date"), latestHistory?.date ?? ""],
    [label(result, "author"), latestHistory?.author ?? ""]
  ] satisfies Array<[string, string]>).filter(([, value]) => value.trim().length > 0);
  const references = renderScreenReferences(result);
  const otherMetadata = renderScreenOtherMetadata(result);

  return `<section class="doc-section screen-spec-section">
    <h2 id="${screenAnchor()}">${heading}</h2>
    <div class="screen-overview">
      <div class="screen-overview-badges">
        ${renderSemanticChip(screen.type ?? "screen", undefined, "type")}
      </div>
      <div class="screen-overview-main">
        ${screen.id ? `<div class="screen-id">${code(screen.id)}</div>` : ""}
        ${title ? `<div class="screen-title">${text(title)}</div>` : ""}
        ${screen.description ? `<div class="screen-description">${renderMarkdownSectionContent(result, screen.description.split(/\r?\n/u))}</div>` : ""}
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

function renderDefaultAlways(result: ReturnType<typeof parseMarkVSpec>): string {
  return `<span class="spec-default-always">${text(label(result, "always"))}</span>`;
}

function renderDisplayContentValue(element: ParsedElement, value: string, sections?: Array<{ title: string; rows: string[] }>, sampleRowsRef?: DisplayContentSpecSampleRowsRef): string {
  if (sampleRowsRef) {
    return `${text(value)}: ${renderSampleRowsRef(element, sampleRowsRef)}`;
  }
  if (sections && sections.length > 0) {
    return renderSpecSections(sections.map((section) => ({
      title: section.title,
      rows: section.rows.map((row) => renderExpressionTokens(row))
    })));
  }
  if (hasOpaqueExpression(value)) {
    return renderExpressionTokens(value);
  }
  const summary = displaySummaryForElement(element);
  return isElementDisplaySampleValue(element, value)
    ? renderSemanticChip(value, summary.tone)
    : text(value);
}

function renderSampleRowsRef(element: ParsedElement, sampleRowsRef: DisplayContentSpecSampleRowsRef): string {
  const summary = displaySummaryForElement(element);
  const ref = renderEntityRefChip({
    id: sampleRowsRef.elementId,
    category: "element",
    marker: summary.marker || sampleRowsRef.elementId,
    label: element.id,
    href: sampleRowsRef.anchorId ? `#${sampleRowsRef.anchorId}` : undefined
  });
  return prependHtmlInsideFirstTag(ref, renderPreviewIcon("table"));
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
  return ["Banner", "Badge", "Spinner", "Dialog", "Popover", "Tooltip"].includes(type);
}

function isContentElement(type: string): boolean {
  return ["Heading", "Paragraph", "Text", "Image", "Icon", "List", "Table", "Accordion", "Disclosure", "ActionMenu"].includes(type);
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

function renderActionDetailsSpec(result: ReturnType<typeof parseMarkVSpec>, markdownResult: ReturnType<typeof parseMarkVSpec> = result): string {
  const cards = result.actions.map((action) => renderActionDetail(result, action, markdownResult)).join("");
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

function renderActionTransitionsSpec(result: ReturnType<typeof parseMarkVSpec>, markdownResult: ReturnType<typeof parseMarkVSpec> = result): string {
  const sectionProse = sectionProseForKind(result, "States");
  const stateNames = orderedTransitionStateNames(result);
  const matrixStateNames = stateNames;
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

  const rows = matrixStateNames.map((from) => [
    renderStateLabel(from),
    ...matrixStateNames.map((to) => renderTransitionMatrixCell(cellEvents.get(transitionMatrixKey(from, to))))
  ]);

  return `<section class="doc-section" id="state-transition-table">
    <h2>${label(result, "actionTransitions")}</h2>
    ${renderSectionOverview(markdownResult, sectionProse)}
    ${renderTransitionMatrixTable(result, matrixStateNames, rows)}
    ${renderStateTransitionNotes(result, sectionProse, markdownResult)}
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
  sectionProse: ReturnType<typeof parseMarkVSpec>["sectionProse"],
  markdownResult: ReturnType<typeof parseMarkVSpec> = result
): string {
  const notes = renderSectionNotes(markdownResult, sectionProse);
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
  const notes = [
    isDocumentLifecycleTrigger(action.triggeredBy) ? text(action.triggeredBy) : "",
    resultName ? text(resultName) : "",
    renderTransitionOriginChainText(result, action, resultName)
  ].filter(Boolean);
  return `${actionReference}${notes.map((note) => `<div class="mm-ref-chip-note">${note}</div>`).join("")}`;
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

  for (const name of nodeNames) {
    lines.push(`  state "${mermaidLabel(name)}" as ${aliases.get(name)}`);
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
  const lifecycleLabel = isDocumentLifecycleTrigger(action.triggeredBy) ? `${action.triggeredBy} / ${actionLabel}` : actionLabel;
  const resultLabel = resultName ? `${lifecycleLabel} / ${resultName}` : lifecycleLabel;
  return isTerminalTransitionTarget(target) ? `${resultLabel} / navigate` : resultLabel;
}

function isTerminalTransitionTarget(target: string): boolean {
  return target.startsWith("SCR-") || target.startsWith("/") || /^https?:\/\//.test(target);
}

function mermaidLabel(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"").replaceAll("\n", " ").replaceAll(";", ",");
}

function renderStatesSpec(result: ReturnType<typeof parseMarkVSpec>, markdownResult: ReturnType<typeof parseMarkVSpec> = result): string {
  const sectionProse = sectionProseForKind(result, "States");
  return `<section class="doc-section">
    <h2>${label(result, "states")}</h2>
    ${renderSectionOverview(markdownResult, sectionProse)}
    ${renderLocalizedTable(result,
      [label(result, "state"), label(result, "initial"), label(result, "description")],
      result.states.map((state) => [renderStateLabel(state.name), state.initial ? text(label(result, "requiredYes")) : "-", text(state.message)])
    )}
  </section>`;
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
    renderMarkdownSectionContent(result, entry.bodyLines)
  ]);

  return `<section class="doc-section history-section">
    <h2>${label(result, "history")}</h2>
    ${renderEntityOverview(result, joinProseLineGroups(sectionProse.map((candidate) => candidate.overview)))}
    ${result.historyEntries.length > 0 ? renderLocalizedTable(result, headers, rows) : `<p class="spec-empty">${label(result, "none")}</p>`}
    ${renderEntityNotes(result, joinProseLineGroups(sectionProse.map((candidate) => candidate.notes)))}
  </section>`;
}

function sectionProseForKind(result: ReturnType<typeof parseMarkVSpec>, kind: string): ReturnType<typeof parseMarkVSpec>["sectionProse"] {
  return result.sectionProse.filter((candidate) => candidate.kind === kind);
}

function renderSectionOverview(result: ReturnType<typeof parseMarkVSpec>, sectionProse: ReturnType<typeof parseMarkVSpec>["sectionProse"]): string {
  return renderEntityOverview(result, joinProseLineGroups(sectionProse.map((candidate) => candidate.overview)));
}

function renderSectionNotes(result: ReturnType<typeof parseMarkVSpec>, sectionProse: ReturnType<typeof parseMarkVSpec>["sectionProse"]): string {
  return renderEntityNotes(result, joinProseLineGroups(sectionProse.map((candidate) => candidate.notes)));
}

function renderNotesSpec(result: ReturnType<typeof parseMarkVSpec>): string {
  if (result.notes.length > 0) {
    return result.notes.map((note) => renderNoteSection(result, note)).join("");
  }

  return "";
}

function renderNoteSection(result: ReturnType<typeof parseMarkVSpec>, note: ReturnType<typeof parseMarkVSpec>["notes"][number]): string {
  const content = renderMarkdownSectionContent(result, trimNoteLines(note.lines));
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
        renderDiagnosticSeverity(diagnostic.severity),
        diagnostic.line ? String(diagnostic.line) : "",
        text(renderDiagnosticMessageForLocale(diagnostic, result.screen.locale))
      ])
    )}
  </section>`;
}

function renderDiagnosticSeverity(severity: string): string {
  if (severity === "error") {
    return `<span class="mm-diagnostic-severity mm-diagnostic-severity-error">${renderPreviewIcon("circle-x")}${text(severity)}</span>`;
  }
  if (severity === "warning") {
    return `<span class="mm-diagnostic-severity mm-diagnostic-severity-warning">${renderPreviewIcon("triangle-alert")}${text(severity)}</span>`;
  }
  if (severity === "info") {
    return `<span class="mm-diagnostic-severity mm-diagnostic-severity-info">${renderPreviewIcon("info")}${text(severity)}</span>`;
  }
  return text(severity);
}

function renderConditionList(result: ReturnType<typeof parseMarkVSpec>, groups: Array<[string, string[]]>): string {
  const items = groups.flatMap(([label, conditions]) => conditions.map((condition) => `<li>${escapeHtml(conditionLabel(result, label))}: ${renderCondition(result, condition)}</li>`));
  return items.length > 0 ? `<ul class="spec-list">${items.join("")}</ul>` : "";
}

function specSectionTitle(value: string): string {
  return /^[a-z]/u.test(value) ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
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

function renderActionRequest(action: { request?: { method: string; path: string } }): string {
  return action.request ? `${escapeHtml(action.request.method)} ${escapeHtml(action.request.path)}` : "";
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
        : id.startsWith("ERR-") || id.startsWith("F-") || id.startsWith("V-") || id.startsWith("R-")
          ? referenceChipForId(result, id) || renderDetailRefId(id)
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
  action: ReturnType<typeof parseMarkVSpec>["actions"][number],
  markdownResult: ReturnType<typeof parseMarkVSpec> = result
): string {
  const rows = [
    [label(result, "overview"), renderActionOverview(markdownResult, action)],
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
    [label(result, "notes"), renderEntityNotes(markdownResult, action.notes)]
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
    <div class="process-card-header"><span class="process-card-title-group">${renderPreviewIcon("split")}<span class="process-card-title">${escapeHtml(label(result, "processParallelGroup"))}: ${text(groupName)}</span></span></div>
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
    <div class="process-card-header"><span class="process-card-title-group">${renderProcessStepIcon(step)}<span class="process-card-title">${renderProcessStepLabel(step)}</span></span>${resolveGroup}</div>
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

type ProcessIconName = "circle-x" | "cog" | "merge" | "panels-top-left" | "refresh-cw" | "satellite-dish" | "square-check-big" | "unplug" | "waypoints";

function renderProcessStepIcon(
  step: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]
): string {
  const icon = processStepIconName(step);
  return icon ? renderPreviewIcon(icon) : "";
}

function processStepIconName(
  step: ReturnType<typeof parseMarkVSpec>["actions"][number]["processSteps"][number]
): ProcessIconName | undefined {
  if (step.resolveGroup) {
    return "merge";
  }

  if (step.details.some((detail) => processDetailRoot(detail.key) === "request")) {
    return "unplug";
  }
  if (step.details.some((detail) => processDetailRoot(detail.key) === "server")) {
    return "cog";
  }
  if (step.details.some((detail) => processDetailRoot(detail.key) === "validation")) {
    return "square-check-big";
  }
  if (step.receives.length > 0 || step.details.some((detail) => detail.key === "receive" || detail.key === "response")) {
    return "satellite-dish";
  }
  if (step.display || step.target || step.mode || step.fragment || step.content) {
    return "panels-top-left";
  }
  if (step.to) {
    return isTerminalTransitionTarget(step.to) ? "waypoints" : "refresh-cw";
  }
  return undefined;
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

  const requestDetail = step.details.find((detail) => processDetailRoot(detail.key) === "request");
  if (requestDetail) {
    return renderNestedProcessDetails(result, normalizeHttpRequestDetails(step.details, requestDetail), detailedReferences);
  }

  if (step.details.some((detail) => processDetailRoot(detail.key) === "server")) {
    return renderServerCallDetails(result, step, detailedReferences, renderDetail);
  }

  return renderNestedProcessDetails(result, step.details, detailedReferences);
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
  const callDetail = step.details.find((detail) => detail.key === "call" || processDetailRoot(detail.key) === "server");
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

function processDetailRoot(key: string): string {
  const root = key.split(".")[0]?.trim() ?? "";
  return root === "call" ? "server" : root;
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
    const originChain = renderTransitionOriginChainText(result, action, transition.result);
    const details = [
      `${label(result, "from")}: ${renderStateLabel(transition.from)}`,
      transition.result ? `${label(result, "case")}: ${renderResultLabel(transition.result)}` : "",
      `${label(result, "to")}: ${kind === "navigation" ? renderNavigationTarget(transition.to) : renderStateLabel(transition.to)}`,
      originChain ? `${label(result, "triggeredBy")}: ${originChain}` : "",
      params ? `${label(result, "params")}: ${params}` : ""
    ].filter(Boolean);
    return `<li>${details.join("; ")}</li>`;
  }).join("")}</ul>`;
}

function renderTransitionOriginChainText(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number],
  resultName: string | undefined
): string {
  const chain = transitionOriginChain(result, action, resultName);
  if (chain.length === 0) {
    return "";
  }
  return chain.map((part) => escapeHtml(part)).join(" -&gt; ");
}

function transitionOriginChain(
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number],
  resultName: string | undefined
): string[] {
  const trigger = action.triggeredBy;
  const responseTrigger = trigger ? /^(A-[\p{L}\p{N}-]+)\.(P[A-Za-z0-9_-]+)\.response$/u.exec(trigger) : undefined;
  if (!responseTrigger) {
    return [];
  }

  const sourceAction = result.actions.find((candidate) => candidate.id === responseTrigger[1]);
  if (!isDocumentLifecycleTrigger(sourceAction?.triggeredBy)) {
    return [];
  }

  const caseReference = transitionCaseReference(action, resultName);
  return [
    sourceAction.triggeredBy,
    sourceAction.id,
    trigger,
    caseReference
  ].filter((part): part is string => Boolean(part));
}

function transitionCaseReference(
  action: ReturnType<typeof parseMarkVSpec>["actions"][number],
  resultName: string | undefined
): string {
  if (!resultName) {
    return action.id;
  }

  for (const step of action.processSteps) {
    if (step.outcomes.some((outcome) => outcome.result === resultName)) {
      return `${action.id}.${step.marker ?? step.name}.${resultName}`;
    }
  }
  return `${action.id}.${resultName}`;
}

function isDocumentLifecycleTrigger(trigger: string | undefined): trigger is string {
  return trigger === "page.load" || trigger === "partial.render" || trigger === "screen.load";
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
  result: ReturnType<typeof parseMarkVSpec>,
  action: ReturnType<typeof parseMarkVSpec>["actions"][number]
): string {
  return renderEntityOverview(result, action.overview);
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
    display.partial ? `${escapeHtml(label(result, "partial"))} ${referenceForDetailId(result, display.partial)}` : "",
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
  const reference = parseDisplayMessageReference(message);
  if (!reference) {
    return text(message);
  }
  return `${referenceForDetailId(result, reference.sourceId)}<span class="mm-detail-ref-suffix">.messages</span>`;
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

function renderNavigationTarget(target: string): string {
  return isDocumentRefId(target) ? renderDocumentRefId(target) : text(target);
}

function firstStringProperty(value: string | string[] | true | undefined): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  return Array.isArray(value) ? value.find((item) => item.length > 0) : undefined;
}

function renderElementDisplayName(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  if (element.type === "Badge") {
    return renderElementContentDisplay(element) || referenceForId(result, element.id, "element");
  }

  const domainLabel = displayLabelForElement(element);
  return (domainLabel ? text(domainLabel) : "")
    || renderElementContentSummary(element)
    || referenceForId(result, element.id, "element");
}

function renderElementContentDisplay(element: ReturnType<typeof parseMarkVSpec>["elements"][number]): string {
  const content = renderElementContentSummary(element);
  if (element.type !== "Badge" || !content) {
    return content;
  }

  return renderSemanticChip(content, displaySummaryForElement(element).tone);
}

function renderElementSampleSummary(element: ReturnType<typeof parseMarkVSpec>["elements"][number]): string {
  const { dataSample: sample, tone } = displaySummaryForElement(element);
  if (element.type === "Badge" && sample) {
    return renderSemanticChip(sample, tone);
  }

  return sample ?? "";
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
  const summary = displaySummaryForElement(element);
  const labelValue = summary.label ?? "";
  const sample = summary.dataSample ?? "";
  const textValue = summary.text ?? "";
  const value = summary.value ?? "";
  const format = summary.format ?? "";
  const rows = [
    labelValue ? `${label(result, "label")}: ${renderValueWithOptionalSource(labelValue, summary.labelSource)}` : "",
    textValue ? `${label(result, "textValue")}: ${renderElementFixedTextDisplayValue(element, textValue)}` : "",
    sample ? `${label(result, "sample")}: ${renderElementSampleDisplayValue(element, sample)}` : "",
    !sample && summary.src ? `${label(result, "src")}: ${renderSourceSummary(summary.src)}` : "",
    value ? `${label(result, "value")}: ${hasOpaqueExpression(value) ? renderExpressionTokens(value) : text(value)}` : "",
    format ? `${label(result, "format")}: ${text(format)}` : "",
    element.type === "Accordion" ? renderAccordionSummary(result, element) : "",
    element.type === "Disclosure" ? renderDisclosureSummary(result, element) : "",
    element.type === "ActionMenu" ? renderActionMenuSummary(result, element) : "",
    element.type === "Popover" || element.type === "Tooltip" ? renderAnchoredOverlaySummary(result, element) : ""
  ].filter(Boolean);

  if (rows.length === 0) {
    return "";
  }

  return rows.length === 1 ? rows[0] ?? "" : `<ul class="spec-list">${rows.map((row) => `<li>${row}</li>`).join("")}</ul>`;
}

function renderElementSampleDisplayValue(element: ReturnType<typeof parseMarkVSpec>["elements"][number], sample: string): string {
  const summary = displaySummaryForElement(element);
  const renderedSample = element.type === "Badge"
    ? renderSemanticChip(sample, summary.tone)
    : text(sample);
  const source = renderSourceSummary(summary.src);
  return source ? `${renderedSample} (${source})` : renderedSample;
}

function renderElementFixedTextDisplayValue(element: ReturnType<typeof parseMarkVSpec>["elements"][number], value: string): string {
  return element.type === "Badge"
    ? renderSemanticChip(value, displaySummaryForElement(element).tone)
    : text(value);
}

function renderAnchoredOverlaySummary(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  const overlay = anchoredOverlayReference(element);
  const anchor = overlay?.anchorId ?? "";
  const placement = overlay?.placement ?? "";
  return [
    anchor ? `anchor: ${referenceForId(result, anchor, "element")}` : "",
    placement ? `placement: ${text(placement)}` : ""
  ].filter(Boolean).join("<br>");
}

function renderLayoutReferenceForId(result: ReturnType<typeof parseMarkVSpec>, id: string): string {
  const layout = [
    ...result.layoutGroups,
    ...result.slotContents.flatMap((slot) => slot.layoutGroups)
  ].find((group) => group.id === id);
  if (!layout) {
    return renderDetailRefId(id);
  }
  return renderEntityRefChip({
    id: layout.id,
    category: "layout",
    marker: layoutDisplaySettings(layout).marker || layout.id,
    label: layout.name || layout.id
  });
}

function renderAccordionSummary(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  const open = displaySummaryForElement(element).open ?? "";
  const references = controlledPanelReferences(element).filter((reference) => reference.kind === "accordion");
  const rows = [
    open ? `open: ${text(open)}` : "",
    ...element.accordionItems.map((item, index) => {
      const reference = references[index];
      const details = [
        reference?.panelId ? `panel: ${renderLayoutReferenceForId(result, reference.panelId)}` : "",
        reference?.actionId ? `action: ${referenceForId(result, reference.actionId, "action")}` : ""
      ].filter(Boolean);
      return details.length > 0 ? `${text(item.label)} (${details.join("; ")})` : text(item.label);
    })
  ].filter(Boolean);
  return rows.length > 0 ? renderSpecSections([{ title: "Accordion", rows }]) : "";
}

function renderDisclosureSummary(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  const summary = displaySummaryForElement(element);
  const reference = controlledPanelReferences(element)[0];
  const rows = [
    summary.open ? `open: ${text(summary.open)}` : "",
    reference?.panelId ? `panel: ${renderLayoutReferenceForId(result, reference.panelId)}` : "",
    summary.actionId ? `action: ${referenceForId(result, summary.actionId, "action")}` : ""
  ].filter(Boolean);
  return rows.length > 0 ? renderSpecSections([{ title: "Disclosure", rows }]) : "";
}

function renderActionMenuSummary(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  const summary = displaySummaryForElement(element);
  const rows = [
    summary.open ? `open: ${text(summary.open)}` : "",
    summary.placement ? `placement: ${text(summary.placement)}` : "",
    ...element.actionMenuItems.map((item) => {
      const details = [
        item.action ? `action: ${referenceForId(result, item.action, "action")}` : "",
        item.tone ? `tone: ${text(item.tone)}` : "",
        ...item.disabledWhen.map((condition) => `disabled when: ${renderCondition(result, condition)}`)
      ].filter(Boolean);
      return details.length > 0 ? `${text(item.label)} (${details.join("; ")})` : text(item.label);
    })
  ].filter(Boolean);
  return rows.length > 0 ? renderSpecSections([{ title: "Action Menu", rows }]) : "";
}

function renderContentElementState(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  return renderConditionList(result, [
    ["visible", element.visibleWhen],
    ["hidden", element.hiddenWhen]
  ]) || renderDefaultAlways(result);
}

function renderElementConditionSummary(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  const visibleRows = [
    ...element.visibleWhen.map((condition) => `${escapeHtml(conditionLabel(result, "visible"))}: ${renderCondition(result, condition)}`),
    ...element.hiddenWhen.map((condition) => `${escapeHtml(conditionLabel(result, "hidden"))}: ${renderCondition(result, condition)}`)
  ];
  const enabledRows = element.disabledWhen.map((condition) => `${text(label(result, "conditionNot"))} ${renderCondition(result, condition)}`);
  return renderSpecSections([
    { title: specSectionTitle(conditionLabel(result, "visible")), rows: visibleRows },
    { title: specSectionTitle(conditionLabel(result, "enabled")), rows: enabledRows }
  ]) || renderDefaultAlways(result);
}

function renderActionableElementState(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  return renderConditionList(result, [
    ["visible", element.visibleWhen],
    ["hidden", element.hiddenWhen],
    ["disabled", element.disabledWhen]
  ]) || renderDefaultAlways(result);
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
  const tone = displaySummaryForElement(element).tone;
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

function renderElementContentSummary(element: ReturnType<typeof parseMarkVSpec>["elements"][number]): string {
  return displaySummaryForElement(element).contentSummary ?? "";
}

function renderSourceSummary(value: string | true | undefined): string {
  const source = rawStringProperty(value);
  if (!source) {
    return "";
  }

  if (isMarkVSpecSourceType(source)) {
    return `<span class="mm-chip mm-source-chip mm-source-chip-${source}">${renderSourceKindIcon(source)}${text(source)}</span>`;
  }

  return hasOpaqueExpression(source) ? renderExpressionTokens(source) : code(source);
}


function renderSourceKindIcon(source: string): string {
  if (source === "data") {
    return renderPreviewIcon("database");
  }
  if (source === "route") {
    return renderPreviewIcon("route");
  }
  if (source === "i18n") {
    return renderPreviewIcon("languages");
  }
  return "";
}

function renderValidationList(element: ReturnType<typeof parseMarkVSpec>["elements"][number]): string {
  return element.validations.length > 0
    ? `<ul class="spec-list">${element.validations.map((validation) => `<li>${text(validation)}</li>`).join("")}</ul>`
    : "";
}

function renderElementActionReferences(
  result: ReturnType<typeof parseMarkVSpec>,
  element: ReturnType<typeof parseMarkVSpec>["elements"][number]
): string {
  const actionIds = [
    displaySummaryForElement(element).actionId,
    ...controlledPanelReferences(element).map((reference) => reference.actionId),
    ...element.actionMenuItems.map((item) => item.action),
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
  const summary = displaySummaryForElement(element);
  const notes = [
    summary.level ? `level: ${summary.level}` : "",
    summary.src ? `src: ${summary.src}` : "",
    summary.format ? `format: ${summary.format}` : "",
    summary.items ? `items: ${summary.items}` : "",
    element.type === "Tabs" && summary.active ? `active tab: ${summary.active}` : "",
    element.type === "Accordion" && summary.open ? `open item: ${summary.open}` : "",
    element.type === "Accordion" && element.accordionItems.length > 0 ? `items: ${element.accordionItems.map((item) => item.label).join(", ")}` : "",
    element.type === "Disclosure" && summary.open ? `open: ${summary.open}` : "",
    element.type === "Disclosure" && summary.panelId ? `panel: ${summary.panelId}` : "",
    element.type === "ActionMenu" && summary.open ? `open: ${summary.open}` : "",
    element.type === "ActionMenu" && element.actionMenuItems.length > 0 ? `items: ${element.actionMenuItems.map((item) => item.label).join(", ")}` : "",
    element.tableColumns.length > 0 ? `columns: ${element.tableColumns.map((column) => column.label).join(", ")}` : "",
    element.tableRows.length > 0 ? `sample rows: ${element.tableRows.length}` : ""
  ].filter(Boolean);

  return notes.length > 0 ? `<ul class="spec-list">${notes.map((note) => `<li>${text(note)}</li>`).join("")}</ul>` : "";
}

function renderKeyValueTable(rows: Array<[string, string | undefined]>, headers = ["Field", "Value"]): string {
  return renderTable(headers, rows.map(([key, value]) => [text(key), text(value)]));
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
