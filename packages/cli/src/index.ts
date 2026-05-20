#!/usr/bin/env node
import {
  exportMarkVSpecDocumentList,
  exportMarkVSpecHtmlFiles,
  exportMarkVSpecPdfFiles,
  validateMarkVSpecFiles
} from "@markvspec/exporter";
import { diagnoseAiDesignInputDocument, evaluateMarkVSpecDiagnostics, renderDiagnosticMessageForLocale } from "@markvspec/core";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

interface ParsedArgs {
  command?: string;
  subcommand?: string;
  patterns: string[];
  outDir?: string;
  failOnWarnings: boolean;
  messagesPath?: string;
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv);
  try {
    if (args.command === "validate") {
      return runValidate(args);
    }

    if (args.command === "export" && args.subcommand === "html") {
      return runExportHtml(args);
    }

    if (args.command === "export" && args.subcommand === "document-list") {
      return runExportDocumentList(args);
    }

    if (args.command === "export" && args.subcommand === "pdf") {
      return await runExportPdf(args);
    }

    if (args.command === "diagnose" && args.subcommand === "input") {
      return runDiagnoseInput(args);
    }

    printUsage();
    return 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function runDiagnoseInput(args: ParsedArgs): number {
  if (args.patterns.length === 0) {
    throw new Error("Missing input document path.");
  }
  const reports = args.patterns.map((sourcePath) => diagnoseAiDesignInputDocument(readFileSync(sourcePath, "utf8"), { sourcePath }));
  console.log(JSON.stringify(reports.length === 1 ? reports[0] : { reports }, null, 2));
  return reports.some((report) => report.readinessLevel === "high-risk") ? 1 : 0;
}

function runValidate(args: ParsedArgs): number {
  const result = validateMarkVSpecFiles(args.patterns, { failOnWarnings: args.failOnWarnings });
  printDiagnostics(result.files);
  console.log(`Validated ${result.files.length} file(s): ${result.errorCount} error(s), ${result.warningCount} warning(s).`);
  return result.exitCode;
}

function runExportHtml(args: ParsedArgs): number {
  const outDir = requireOutDir(args);
  const results = exportMarkVSpecHtmlFiles(args.patterns, outDir, { messagesPath: args.messagesPath });
  printDiagnostics(results);
  for (const result of results) {
    console.log(`${result.sourcePath} -> ${result.outputPath}`);
    if (result.messageSourcePath) {
      console.log(`messages: ${result.messageSourcePath}`);
    }
  }
  console.log(`Exported ${results.length} HTML file(s).`);
  return evaluateMarkVSpecDiagnostics(results.flatMap((result) => result.diagnostics)).exitCode;
}

function runExportDocumentList(args: ParsedArgs): number {
  const outDir = requireOutDir(args);
  if (args.patterns.length === 0) {
    throw new Error("Missing project index path.");
  }
  if (args.patterns.length > 1) {
    throw new Error("export document-list accepts exactly one project index path.");
  }
  const result = exportMarkVSpecDocumentList(args.patterns[0]!, outDir);
  printDiagnostics([result]);
  console.log(`${result.sourcePath} -> ${result.outputPath}`);
  console.log("Exported 1 document list file.");
  return evaluateMarkVSpecDiagnostics(result.diagnostics).exitCode;
}

async function runExportPdf(args: ParsedArgs): Promise<number> {
  const outDir = requireOutDir(args);
  const results = await exportMarkVSpecPdfFiles(args.patterns, outDir, { messagesPath: args.messagesPath });
  printDiagnostics(results);
  for (const result of results) {
    console.log(`${result.sourcePath} -> ${result.outputPath}`);
    if (result.messageSourcePath) {
      console.log(`messages: ${result.messageSourcePath}`);
    }
  }
  console.log(`Exported ${results.length} PDF file(s).`);
  return evaluateMarkVSpecDiagnostics(results.flatMap((result) => result.diagnostics)).exitCode;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, maybeSubcommand, ...rest] = argv;
  const args: ParsedArgs = {
    command,
    subcommand: command === "export" || command === "diagnose" ? maybeSubcommand : undefined,
    patterns: [],
    failOnWarnings: false
  };
  const values = command === "export" || command === "diagnose" ? rest : [maybeSubcommand, ...rest].filter((value): value is string => Boolean(value));

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--out" || value === "-o") {
      args.outDir = values[index + 1];
      index += 1;
    } else if (value === "--messages") {
      args.messagesPath = values[index + 1];
      index += 1;
    } else if (value === "--fail-on-warnings") {
      args.failOnWarnings = true;
    } else {
      args.patterns.push(value);
    }
  }

  return args;
}

function requireOutDir(args: ParsedArgs): string {
  if (!args.outDir) {
    throw new Error("Missing required --out <dir>.");
  }
  return args.outDir;
}

function printDiagnostics(files: ReturnType<typeof validateMarkVSpecFiles>["files"]): void {
  for (const file of files) {
    for (const diagnostic of file.diagnostics) {
      const location = diagnostic.line ? `${file.sourcePath}:${diagnostic.line}` : file.sourcePath;
      console.log(`${location} ${diagnostic.severity}: ${renderDiagnosticMessageForLocale(diagnostic, file.locale)}`);
    }
  }
}

function printUsage(): void {
  console.error(`Usage:
  markvspec validate <file-or-glob> [--fail-on-warnings]
  markvspec diagnose input <markdown-file>
  markvspec export document-list <project-file> --out <dir>
  markvspec export html <file-or-glob> --out <dir> [--messages <path>]
  markvspec export pdf <file-or-glob> --out <dir> [--messages <path>]`);
}

function isCliEntryPoint(): boolean {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
  } catch {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  }
}

if (isCliEntryPoint()) {
  process.exitCode = await main();
}
