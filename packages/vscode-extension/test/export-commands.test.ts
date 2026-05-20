import assert from "node:assert/strict";
import test from "node:test";
import * as vscode from "vscode";
import type { PdfBrowserCommand } from "@markvspec/exporter";
import { registerMarkVSpecExportCommands } from "../src/export-commands.js";

type VscodeMock = {
  commands: Map<string, (resource?: vscode.Uri) => Promise<void>>;
  informationMessages: string[];
  warningMessages: string[];
  writtenFiles: Array<{ uri: vscode.Uri; content: Uint8Array }>;
  createdDirectories: vscode.Uri[];
  saveDialogCalls: Array<{ defaultUri?: vscode.Uri; filters?: Record<string, string[]>; saveLabel?: string }>;
  activeTextEditor?: { document: vscode.TextDocument };
  saveDialogResult?: vscode.Uri;
  openedDocuments: Map<string, vscode.TextDocument>;
  reset(): void;
};

const vscodeMock = (vscode as unknown as { __vscodeMock: VscodeMock }).__vscodeMock;

test("export HTML command writes rendered HTML to the selected file", async () => {
  vscodeMock.reset();
  const sourceDocument = textDocument("/workspace/screen.vspec.md");
  const targetUri = vscode.Uri.file("/workspace/screen.html");
  vscodeMock.activeTextEditor = { document: sourceDocument };
  vscodeMock.saveDialogResult = targetUri;

  registerExports({
    renderHtml: (document, mermaidScript) => {
      assert.equal(document, sourceDocument);
      assert.equal(mermaidScript, "mermaid script");
      return "<html>screen</html>";
    }
  });

  await command("markvspec.exportHtml")();

  assert.equal(vscodeMock.saveDialogCalls[0]?.defaultUri?.fsPath, "/workspace/screen.html");
  assert.deepEqual(vscodeMock.saveDialogCalls[0]?.filters, { HTML: ["html", "htm"] });
  assert.equal(vscodeMock.saveDialogCalls[0]?.saveLabel, "Export");
  assert.equal(vscodeMock.writtenFiles.length, 1);
  assert.equal(vscodeMock.writtenFiles[0]?.uri, targetUri);
  assert.equal(Buffer.from(vscodeMock.writtenFiles[0]?.content ?? []).toString("utf8"), "<html>screen</html>");
  assert.deepEqual(vscodeMock.informationMessages, ["Exported MarkVSpec HTML to /workspace/screen.html."]);
});

test("export HTML command opens the provided resource before rendering", async () => {
  vscodeMock.reset();
  const sourceUri = vscode.Uri.file("/workspace/from-resource.vspec.md");
  const sourceDocument = textDocument(sourceUri.fsPath);
  const targetUri = vscode.Uri.file("/workspace/from-resource.html");
  vscodeMock.openedDocuments.set(sourceUri.fsPath, sourceDocument);
  vscodeMock.saveDialogResult = targetUri;

  registerExports({
    renderHtml: (document) => {
      assert.equal(document, sourceDocument);
      return "<html>resource</html>";
    }
  });

  await command("markvspec.exportHtml")(sourceUri);

  assert.equal(Buffer.from(vscodeMock.writtenFiles[0]?.content ?? []).toString("utf8"), "<html>resource</html>");
});

test("export PDF command warns without a compatible browser", async () => {
  vscodeMock.reset();
  const sourceDocument = textDocument("/workspace/screen.vspec.md");
  vscodeMock.activeTextEditor = { document: sourceDocument };
  vscodeMock.saveDialogResult = vscode.Uri.file("/workspace/screen.pdf");

  registerExports({
    resolvePdfBrowserCommands: () => []
  });

  await command("markvspec.exportPdf")();

  assert.equal(vscodeMock.saveDialogCalls[0]?.defaultUri?.fsPath, "/workspace/screen.pdf");
  assert.deepEqual(vscodeMock.saveDialogCalls[0]?.filters, { PDF: ["pdf"] });
  assert.equal(vscodeMock.saveDialogCalls[0]?.saveLabel, "Export");
  assert.equal(vscodeMock.writtenFiles.length, 0);
  assert.deepEqual(vscodeMock.warningMessages, [
    "MarkVSpec PDF export requires Google Chrome, Microsoft Edge, Brave, or Chromium. Use Export Static HTML and print from a browser."
  ]);
});

test("export PDF command writes source HTML and calls the PDF exporter", async () => {
  vscodeMock.reset();
  const sourceDocument = textDocument("/workspace/screen.vspec.md");
  const targetUri = vscode.Uri.file("/workspace/screen.pdf");
  const browser: PdfBrowserCommand = { command: "/Applications/Chromium.app", args: [] };
  const exportCalls: Array<{ htmlPath: string; outputPath: string; browsers: PdfBrowserCommand[] }> = [];
  vscodeMock.activeTextEditor = { document: sourceDocument };
  vscodeMock.saveDialogResult = targetUri;

  registerExports({
    renderPdfSourceHtml: (document, mermaidScript) => {
      assert.equal(document, sourceDocument);
      assert.equal(mermaidScript, "mermaid script");
      return "<html>pdf source</html>";
    },
    resolvePdfBrowserCommands: () => [browser],
    exportPdfFromHtmlWithFallback: async (htmlPath, outputPath, browsers) => {
      exportCalls.push({ htmlPath, outputPath, browsers });
    }
  });

  await command("markvspec.exportPdf")();

  assert.deepEqual(vscodeMock.createdDirectories.map((uri) => uri.fsPath), ["/tmp/markvspec-global"]);
  assert.equal(vscodeMock.writtenFiles.length, 1);
  assert.equal(vscodeMock.writtenFiles[0]?.uri.fsPath, "/tmp/markvspec-global/screen.pdf-source.html");
  assert.equal(Buffer.from(vscodeMock.writtenFiles[0]?.content ?? []).toString("utf8"), "<html>pdf source</html>");
  assert.deepEqual(exportCalls, [{
    htmlPath: "/tmp/markvspec-global/screen.pdf-source.html",
    outputPath: "/workspace/screen.pdf",
    browsers: [browser]
  }]);
  assert.deepEqual(vscodeMock.informationMessages, ["Exported MarkVSpec PDF to /workspace/screen.pdf."]);
});

test("export PDF command reports exporter failures", async () => {
  vscodeMock.reset();
  vscodeMock.activeTextEditor = { document: textDocument("/workspace/screen.vspec.md") };
  vscodeMock.saveDialogResult = vscode.Uri.file("/workspace/screen.pdf");

  registerExports({
    resolvePdfBrowserCommands: () => [{ command: "/Applications/Chromium.app", args: [] }],
    exportPdfFromHtmlWithFallback: async () => {
      throw new Error("print failed");
    }
  });

  await command("markvspec.exportPdf")();

  assert.deepEqual(vscodeMock.warningMessages, [
    "MarkVSpec could not export PDF. print failed. Use Export Static HTML and print from a browser."
  ]);
});

function registerExports(overrides: Partial<Parameters<typeof registerMarkVSpecExportCommands>[0]> = {}): void {
  registerMarkVSpecExportCommands({
    context: {
      globalStorageUri: vscode.Uri.file("/tmp/markvspec-global")
    } as vscode.ExtensionContext,
    isMarkVSpecDocument: () => true,
    renderHtml: () => "<html></html>",
    renderPdfSourceHtml: () => "<html>pdf</html>",
    readMermaidScript: () => "mermaid script",
    logDuration: () => undefined,
    resolvePdfBrowserCommands: () => [{ command: "/Applications/Chromium.app", args: [] }],
    exportPdfFromHtmlWithFallback: async () => undefined,
    ...overrides
  });
}

function command(name: string): (resource?: vscode.Uri) => Promise<void> {
  const callback = vscodeMock.commands.get(name);
  assert.ok(callback, `${name} should be registered`);
  return callback;
}

function textDocument(path: string): vscode.TextDocument {
  return {
    uri: vscode.Uri.file(path)
  } as vscode.TextDocument;
}
