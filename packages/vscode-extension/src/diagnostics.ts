import * as vscode from "vscode";
import {
  renderDiagnosticMessageForLocale,
  type MarkVSpecDiagnosticSeverity,
  type MarkVSpecProjectLoadResult,
  type parseMarkVSpec
} from "@markvspec/core";

type ScreenParseResult = ReturnType<typeof parseMarkVSpec>;

export interface MarkVSpecDiagnosticsControllerOptions {
  collection: vscode.DiagnosticCollection;
  debounceMs: number;
  isMarkVSpecDocument(document: vscode.TextDocument): boolean;
  loadResult(document: vscode.TextDocument): ScreenParseResult | MarkVSpecProjectLoadResult;
  documentLabel(document: vscode.TextDocument): string;
  logDuration(operation: string, started: number): void;
}

export class MarkVSpecDiagnosticsController {
  readonly collection: vscode.DiagnosticCollection;
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly options: MarkVSpecDiagnosticsControllerOptions) {
    this.collection = options.collection;
  }

  update(document: vscode.TextDocument): void {
    if (!this.options.isMarkVSpecDocument(document)) {
      this.collection.delete(document.uri);
      return;
    }

    const started = Date.now();
    const result = this.options.loadResult(document);
    const locale = diagnosticLocaleForResult(result);
    const diagnostics = result.diagnostics.map((diagnostic) => {
      const line = Math.max((diagnostic.line ?? 1) - 1, 0);
      const textLine = document.lineAt(Math.min(line, Math.max(document.lineCount - 1, 0)));
      const range = new vscode.Range(line, 0, line, textLine.text.length);
      const severity = vscodeDiagnosticSeverityForMarkVSpec(diagnostic.severity);
      const vscodeDiagnostic = new vscode.Diagnostic(range, renderDiagnosticMessageForLocale(diagnostic, locale), severity);
      vscodeDiagnostic.source = "MarkVSpec";
      return vscodeDiagnostic;
    });

    this.collection.set(document.uri, diagnostics);
    this.options.logDuration(`updateDiagnostics ${this.options.documentLabel(document)}`, started);
  }

  schedule(document: vscode.TextDocument): void {
    this.clear(document);
    const documentUri = document.uri.toString();
    const timer = setTimeout(() => {
      this.timers.delete(documentUri);
      this.update(document);
    }, this.options.debounceMs);
    this.timers.set(documentUri, timer);
  }

  clear(document: vscode.TextDocument): void {
    const documentUri = document.uri.toString();
    const timer = this.timers.get(documentUri);
    if (!timer) {
      return;
    }
    clearTimeout(timer);
    this.timers.delete(documentUri);
  }

  clearAll(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }

  delete(document: vscode.TextDocument): void {
    this.collection.delete(document.uri);
  }

  dispose(): void {
    this.clearAll();
    this.collection.dispose();
  }
}

export function vscodeDiagnosticSeverityForMarkVSpec(severity: MarkVSpecDiagnosticSeverity): vscode.DiagnosticSeverity {
  switch (severity) {
    case "error":
      return vscode.DiagnosticSeverity.Error;
    case "warning":
      return vscode.DiagnosticSeverity.Warning;
    case "info":
      return vscode.DiagnosticSeverity.Information;
  }
}

function diagnosticLocaleForResult(result: ScreenParseResult | MarkVSpecProjectLoadResult): string | undefined {
  return "screen" in result ? result.screen.locale : result.project.project.frontMatter["locale"];
}
