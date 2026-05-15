import * as vscode from "vscode";
import { dirname, join } from "node:path";
import type { PdfBrowserCommand } from "@markvspec/exporter";
import { defaultExportHtmlBaseName } from "./preview-shell.js";

export interface RegisterMarkVSpecExportCommandsOptions {
  context: vscode.ExtensionContext;
  isMarkVSpecDocument(document: vscode.TextDocument): boolean;
  renderHtml(document: vscode.TextDocument, mermaidScript: string | undefined): string;
  renderPdfSourceHtml(document: vscode.TextDocument, mermaidScript: string | undefined): string;
  readMermaidScript(): string | undefined;
  logDuration(operation: string, started: number): void;
  resolvePdfBrowserCommands?: (platform: NodeJS.Platform) => PdfBrowserCommand[];
  exportPdfFromHtmlWithFallback?: (htmlPath: string, outputPath: string, browsers: PdfBrowserCommand[]) => Promise<void>;
}

export interface MarkVSpecExportCommands {
  exportHtml: vscode.Disposable;
  exportPdf: vscode.Disposable;
}

export function registerMarkVSpecExportCommands(options: RegisterMarkVSpecExportCommandsOptions): MarkVSpecExportCommands {
  const exportHtml = vscode.commands.registerCommand("markvspec.exportHtml", async (resource?: vscode.Uri) => {
    const started = Date.now();
    const document = await exportDocumentForResource(resource);
    if (!document || !options.isMarkVSpecDocument(document)) {
      void vscode.window.showWarningMessage("Open a MarkVSpec document before exporting HTML.");
      return;
    }

    const defaultUri = vscode.Uri.file(join(dirname(document.uri.fsPath), `${defaultExportHtmlBaseName(document.uri.fsPath)}.html`));
    const targetUri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: {
        HTML: ["html", "htm"]
      },
      saveLabel: "Export"
    });
    if (!targetUri) {
      return;
    }

    const html = options.renderHtml(document, options.readMermaidScript());
    await vscode.workspace.fs.writeFile(targetUri, Buffer.from(html, "utf8"));
    options.logDuration("exportHtml", started);
    void vscode.window.showInformationMessage(`Exported MarkVSpec HTML to ${targetUri.fsPath}.`);
  });

  const exportPdf = vscode.commands.registerCommand("markvspec.exportPdf", async (resource?: vscode.Uri) => {
    const started = Date.now();
    const document = await exportDocumentForResource(resource);
    if (!document || !options.isMarkVSpecDocument(document)) {
      void vscode.window.showWarningMessage("Open a MarkVSpec document before exporting PDF.");
      return;
    }

    const defaultUri = vscode.Uri.file(join(dirname(document.uri.fsPath), `${defaultExportHtmlBaseName(document.uri.fsPath)}.pdf`));
    const targetUri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: {
        PDF: ["pdf"]
      },
      saveLabel: "Export"
    });
    if (!targetUri) {
      return;
    }

    const pdfExport = await resolvePdfExportDependencies(options);
    const browsers = pdfExport.resolvePdfBrowserCommands(process.platform);
    if (browsers.length === 0) {
      void vscode.window.showWarningMessage("MarkVSpec PDF export requires Google Chrome, Microsoft Edge, Brave, or Chromium. Use Export Static HTML and print from a browser.");
      return;
    }

    const html = options.renderPdfSourceHtml(document, options.readMermaidScript());
    const htmlUri = vscode.Uri.joinPath(
      options.context.globalStorageUri,
      `${defaultExportHtmlBaseName(document.uri.fsPath)}.pdf-source.html`
    );
    await vscode.workspace.fs.createDirectory(options.context.globalStorageUri);
    await vscode.workspace.fs.writeFile(htmlUri, Buffer.from(html, "utf8"));
    try {
      await pdfExport.exportPdfFromHtmlWithFallback(htmlUri.fsPath, targetUri.fsPath, browsers);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void vscode.window.showWarningMessage(`MarkVSpec could not export PDF. ${message}. Use Export Static HTML and print from a browser.`);
      return;
    }

    options.logDuration("exportPdf", started);
    void vscode.window.showInformationMessage(`Exported MarkVSpec PDF to ${targetUri.fsPath}.`);
  });

  return { exportHtml, exportPdf };
}

async function exportDocumentForResource(resource: vscode.Uri | undefined): Promise<vscode.TextDocument | undefined> {
  return resource
    ? vscode.workspace.openTextDocument(resource)
    : vscode.window.activeTextEditor?.document;
}

async function resolvePdfExportDependencies(options: RegisterMarkVSpecExportCommandsOptions): Promise<{
  resolvePdfBrowserCommands(platform: NodeJS.Platform): PdfBrowserCommand[];
  exportPdfFromHtmlWithFallback(htmlPath: string, outputPath: string, browsers: PdfBrowserCommand[]): Promise<void>;
}> {
  if (options.resolvePdfBrowserCommands && options.exportPdfFromHtmlWithFallback) {
    return {
      resolvePdfBrowserCommands: options.resolvePdfBrowserCommands,
      exportPdfFromHtmlWithFallback: options.exportPdfFromHtmlWithFallback
    };
  }

  const { exportPdfFromHtmlWithFallback, resolvePdfBrowserCommands } = await import("@markvspec/exporter");
  return {
    resolvePdfBrowserCommands: options.resolvePdfBrowserCommands ?? resolvePdfBrowserCommands,
    exportPdfFromHtmlWithFallback: options.exportPdfFromHtmlWithFallback ?? exportPdfFromHtmlWithFallback
  };
}
