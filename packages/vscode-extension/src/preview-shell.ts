import * as vscode from "vscode";
import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import type { RendererMessages } from "@markvspec/core";
import { escapeHtml } from "./design-document-renderer.js";

export function defaultExportHtmlBaseName(filePath: string): string {
  const fileName = basename(filePath);
  if (fileName === "vspec.project.md") {
    return "vspec.project";
  }

  if (fileName.endsWith(".vspec.project.md")) {
    return `${fileName.slice(0, -".vspec.project.md".length)}.project`;
  }

  if (fileName.endsWith(".vspec.md")) {
    return fileName.slice(0, -".vspec.md".length);
  }

  return fileName.replace(/\.md$/u, "");
}

export function renderPreviewLoadingHtml(webview: vscode.Webview, sourceLabel?: string): string {
  return renderPreviewStatusHtml(webview, {
    title: "Generating preview",
    heading: "プレビューを生成中...",
    message: "Preview is being generated...",
    sourceLabel,
    kind: "loading"
  });
}

export function renderPreviewErrorHtml(webview: vscode.Webview, sourceLabel: string | undefined, message: string): string {
  return renderPreviewStatusHtml(webview, {
    title: "Preview error",
    heading: "プレビューを生成できませんでした",
    message,
    sourceLabel,
    kind: "error"
  });
}

export function renderPreviewStatusHtml(
  webview: vscode.Webview,
  status: {
    title: string;
    heading: string;
    sourceLabel?: string;
    message: string;
    kind: "loading" | "error";
  }
): string {
  const nonce = createNonce();
  const cspSource = webview.cspSource;
  const statusClass = status.kind === "loading" ? "status-card status-card-loading" : "status-card status-card-error";
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(status.title)}</title>
    <style>
      body{align-items:center;background:#fff;color:#111827;display:flex;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;justify-content:center;margin:0;min-height:100vh;padding:24px}
      .status-card{align-items:center;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.08);display:grid;gap:10px;justify-items:center;max-width:420px;padding:28px;text-align:center;width:100%}
      .status-spinner{animation:mm-preview-spin .9s linear infinite;border:3px solid #d1d5db;border-radius:50%;border-top-color:#2563eb;height:28px;width:28px}
      .status-title{font-size:16px;font-weight:650;line-height:1.4}
      .status-message{color:#4b5563;font-size:13px;line-height:1.5;margin:0}
      .status-source{background:#f9fafb;border:1px solid #e5e7eb;border-radius:999px;color:#374151;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:11px;max-width:100%;overflow:hidden;padding:3px 8px;text-overflow:ellipsis;white-space:nowrap}
      .status-card-error{border-color:#fecaca}
      .status-card-error .status-title{color:#991b1b}
      @keyframes mm-preview-spin{to{transform:rotate(360deg)}}
    </style>
  </head>
  <body>
    <main class="${statusClass}" role="status" aria-live="polite">
      ${status.kind === "loading" ? `<span class="status-spinner" aria-hidden="true"></span>` : ""}
      <div class="status-title">${escapeHtml(status.heading)}</div>
      <p class="status-message">${escapeHtml(status.message)}</p>
      ${status.sourceLabel ? `<div class="status-source">${escapeHtml(status.sourceLabel)}</div>` : ""}
    </main>
  </body>
</html>`;
}

export function renderPreviewUpdateControls(messages: RendererMessages, autoUpdate: boolean): string {
  return `<div class="control-group preview-actions" role="group" aria-label="${escapeHtml(messages.previewUpdate)}">
          <span class="control-label">${escapeHtml(messages.preview)}</span>
          <label class="switch-control" title="${escapeHtml(messages.autoUpdatePreview)}">
            <input type="checkbox" data-auto-update role="switch" aria-label="${escapeHtml(messages.autoUpdatePreview)}" ${autoUpdate ? "checked" : ""}>
            <span>${escapeHtml(messages.autoUpdate)}</span>
          </label>
          <span class="segmented">
            <button type="button" data-refresh-preview title="${escapeHtml(messages.refreshPreview)}" ${autoUpdate ? "disabled" : ""}>${escapeHtml(messages.refresh)}</button>
          </span>
        </div>`;
}

export function previewClientMessages(
  messages: RendererMessages
): Record<
  | "action"
  | "element"
  | "hideContents"
  | "layout"
  | "contentsEmpty"
  | "contentsError"
  | "contentsLoading"
  | "mermaidHideSource"
  | "mermaidRenderFailed"
  | "mermaidRendering"
  | "mermaidShowSource"
  | "showRepeatedContent"
  | "showContents"
  | "sourceJumpHint"
  | "sourceJumpUnavailable",
  string
> {
  return {
    action: messages.action,
    element: messages.element,
    hideContents: messages.hideContents,
    layout: messages.layout,
    contentsEmpty: messages.contentsEmpty,
    contentsError: messages.contentsError,
    contentsLoading: messages.contentsLoading,
    mermaidHideSource: messages.mermaidHideSource,
    mermaidRenderFailed: messages.mermaidRenderFailed,
    mermaidRendering: messages.mermaidRendering,
    mermaidShowSource: messages.mermaidShowSource,
    showRepeatedContent: messages.showRepeatedContent,
    showContents: messages.showContents,
    sourceJumpHint: messages.sourceJumpHint,
    sourceJumpUnavailable: messages.sourceJumpUnavailable
  };
}

export function mermaidScriptWebviewUri(webview: vscode.Webview, extensionUri: vscode.Uri): vscode.Uri | undefined {
  const candidates = [
    vscode.Uri.joinPath(extensionUri, "media", "mermaid.min.js"),
    vscode.Uri.joinPath(extensionUri, "node_modules", "mermaid", "dist", "mermaid.min.js"),
    vscode.Uri.joinPath(extensionUri, "..", "..", "node_modules", "mermaid", "dist", "mermaid.min.js")
  ];
  const script = candidates.find((candidate) => existsSync(candidate.fsPath));
  return script ? webview.asWebviewUri(script) : undefined;
}

export function readMermaidScriptFromExtension(extensionUri: vscode.Uri): string | undefined {
  const candidates = [
    vscode.Uri.joinPath(extensionUri, "media", "mermaid.min.js"),
    vscode.Uri.joinPath(extensionUri, "node_modules", "mermaid", "dist", "mermaid.min.js"),
    vscode.Uri.joinPath(extensionUri, "..", "..", "node_modules", "mermaid", "dist", "mermaid.min.js")
  ];
  const script = candidates.find((candidate) => existsSync(candidate.fsPath));
  return script ? readFileSync(script.fsPath, "utf8") : undefined;
}

export function previewBodyClasses(visibleMarkers: { layout: boolean; element: boolean; action: boolean }, showRepeatedContent: boolean): string {
  return [
    markerVisibilityClasses(visibleMarkers),
    showRepeatedContent ? "" : "hide-repeated-content"
  ].filter(Boolean).join(" ");
}

export function renderTableOfContentsList(messages: Pick<RendererMessages, "contentsLoading">): string {
  return `<ol class="toc-list" data-toc-list aria-busy="true" aria-live="polite"><li class="toc-status is-loading" data-toc-status>${escapeHtml(messages.contentsLoading)}</li></ol>`;
}

function markerVisibilityClasses(visibleMarkers: { layout: boolean; element: boolean; action: boolean }): string {
  return [
    visibleMarkers.layout ? "" : "hide-marker-layout",
    visibleMarkers.element ? "" : "hide-marker-element",
    visibleMarkers.action ? "" : "hide-marker-action"
  ].filter(Boolean).join(" ");
}

function createNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i += 1) {
    nonce += chars[Math.floor(Math.random() * chars.length)];
  }
  return nonce;
}
