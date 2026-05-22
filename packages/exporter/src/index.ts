import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  composeMarkVSpecTemplate,
  evaluateMarkVSpecDiagnostics,
  loadMarkVSpecProject,
  parseMarkVSpec,
  renderDiagnosticMessageForLocale,
  resolveRendererMessages,
  resolveProjectPath
} from "@markvspec/core";
import {
  baseWireframeViewportCss,
  printSpecTableChipCss,
  printWireframeViewportCss,
  printScrollbarSuppressCss,
  renderStaticDesignDocumentHtml,
  standardPrintPolicyCss,
  wireframePrintSectionCss
} from "@markvspec/document-renderer";
import type { MarkVSpecDiagnostic, MarkVSpecParseResult, MarkVSpecValidationGateOptions, RendererMessages, ResolvedRendererMessages } from "@markvspec/core";
import type { MarkVSpecProjectScreen } from "@markvspec/core";

const require = createRequire(import.meta.url);
let cachedMermaidScript: string | undefined;
let hasReadMermaidScript = false;

export interface MarkVSpecExportFileResult {
  sourcePath: string;
  outputPath: string;
  diagnostics: MarkVSpecDiagnostic[];
  messageSourcePath?: string;
  locale?: string;
}

export interface MarkVSpecExportOptions {
  messagesPath?: string;
}

export interface MarkVSpecValidateFileResult {
  sourcePath: string;
  diagnostics: MarkVSpecDiagnostic[];
  locale?: string;
}

export interface MarkVSpecValidateResult {
  files: MarkVSpecValidateFileResult[];
  errorCount: number;
  warningCount: number;
  passed: boolean;
  exitCode: 0 | 1;
}

export interface MarkVSpecDocumentListExportResult {
  sourcePath: string;
  outputPath: string;
  diagnostics: MarkVSpecDiagnostic[];
  locale?: string;
}

interface MarkVSpecDocumentListRow {
  kind: "Screen" | "Template" | "Partial";
  id: string;
  title: string;
  summary: string;
  route: string;
  lastUpdated: string;
  file: string;
  diagnostics: MarkVSpecDiagnostic[];
}

export interface PdfBrowserCommand {
  command: string;
  args: string[];
}

export function validateMarkVSpecFiles(
  patterns: readonly string[],
  options: MarkVSpecValidationGateOptions = {}
): MarkVSpecValidateResult {
  const input = resolveMarkVSpecFileInputs(patterns);
  const files = input.files.map((sourcePath) => {
    const result = diagnosticsForFile(sourcePath);
    return {
      sourcePath,
      diagnostics: result.diagnostics,
      locale: result.locale
    };
  });
  const diagnostics = [...input.diagnostics.map((entry) => entry.diagnostic), ...files.flatMap((file) => file.diagnostics)];
  const gate = evaluateMarkVSpecDiagnostics(diagnostics, options);
  return {
    files: [
      ...input.diagnostics.map((entry) => ({ sourcePath: entry.sourcePath, diagnostics: [entry.diagnostic] })),
      ...files
    ],
    errorCount: gate.errorCount,
    warningCount: gate.warningCount,
    passed: gate.passed,
    exitCode: gate.exitCode
  };
}

export function exportMarkVSpecHtmlFiles(patterns: readonly string[], outDir: string, options: MarkVSpecExportOptions = {}): MarkVSpecExportFileResult[] {
  const files = requireMarkVSpecFiles(patterns);
  const outputPaths = outputPathsBySource(files, outDir, ".html");
  mkdirSync(outDir, { recursive: true });
  return files.map((sourcePath) => {
    const outputPath = outputPaths.get(sourcePath) ?? join(outDir, `${defaultExportHtmlBaseName(sourcePath)}.html`);
    const { html, diagnostics, messageSourcePath, locale } = renderStandaloneHtmlForFile(sourcePath, options);
    writeFileSync(outputPath, html, "utf8");
    return { sourcePath, outputPath, diagnostics, messageSourcePath, locale };
  });
}

export async function exportMarkVSpecPdfFiles(
  patterns: readonly string[],
  outDir: string,
  options: MarkVSpecExportOptions & { tempDir?: string; browsers?: PdfBrowserCommand[] } = {}
): Promise<MarkVSpecExportFileResult[]> {
  const files = requireMarkVSpecFiles(patterns);
  const outputPaths = outputPathsBySource(files, outDir, ".pdf");
  const browsers = options.browsers ?? resolvePdfBrowserCommands(process.platform);
  if (browsers.length === 0) {
    throw new Error("No Chrome-compatible browser was found for PDF export.");
  }

  mkdirSync(outDir, { recursive: true });
  const tempDir = options.tempDir ?? outDir;
  mkdirSync(tempDir, { recursive: true });
  const results: MarkVSpecExportFileResult[] = [];

  for (const sourcePath of files) {
    const baseName = defaultExportHtmlBaseName(sourcePath);
    const htmlPath = join(tempDir, `${baseName}.pdf-source.html`);
    const outputPath = outputPaths.get(sourcePath) ?? join(outDir, `${baseName}.pdf`);
    const { html, diagnostics, messageSourcePath, locale } = renderStandaloneHtmlForFile(sourcePath, options);
    writeFileSync(htmlPath, html, "utf8");
    await exportPdfFromHtmlWithFallback(htmlPath, outputPath, browsers);
    results.push({ sourcePath, outputPath, diagnostics, messageSourcePath, locale });
  }

  return results;
}

export function exportMarkVSpecDocumentList(projectPath: string, outDir: string): MarkVSpecDocumentListExportResult {
  const source = readFileSync(projectPath, "utf8");
  const project = loadMarkVSpecProject(source, {
    projectPath,
    readFile: readTextFile
  });
  const outputPath = join(outDir, "document-list.md");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outputPath, renderDocumentListMarkdown(projectPath, project), "utf8");
  return {
    sourcePath: projectPath,
    outputPath,
    diagnostics: project.diagnostics,
    locale: project.project.project.frontMatter["locale"]
  };
}

export function renderStandaloneHtmlForFile(sourcePath: string, options: MarkVSpecExportOptions = {}): { html: string; diagnostics: MarkVSpecDiagnostic[]; messageSourcePath?: string; locale?: string } {
  const source = readFileSync(sourcePath, "utf8");
  if (isMarkVSpecProjectPath(sourcePath)) {
    const project = loadMarkVSpecProject(source, {
      projectPath: sourcePath,
      readFile: readTextFile
    });
    const frontMatterMessages = resolveFrontMatterMessagesPath(sourcePath, project.project.project.frontMatter["messages"]);
    const resolvedMessages = resolveExportRendererMessages({
      sourcePath,
      locale: project.project.project.frontMatter["locale"],
      frontMatterPath: frontMatterMessages.path,
      explicitPath: options.messagesPath,
      searchBoundaryPath: dirname(sourcePath)
    });
    const diagnostics = [
      ...project.diagnostics,
      ...frontMatterMessages.diagnostics,
      ...markVSpecDiagnosticsForRendererMessages(resolvedMessages)
    ];
    const title = project.project.project.title ?? project.project.project.id ?? basename(sourcePath);
    const content = [
      `<h1>${escapeHtml(title)}</h1>`,
      project.screens
        .map((screen) => screen.result
          ? `<section class="mm-export-section"><h2>${escapeHtml(screen.result.screen.title ?? screen.result.screen.id ?? screen.index.id ?? resolvedMessages.messages.screen)}</h2>${renderStaticDesignDocumentHtml(screen.result, { messages: resolvedMessages.messages, documentResult: screen.sourceResult })}</section>`
          : "")
        .join(""),
      renderDiagnostics(diagnostics, resolvedMessages.messages, resolvedMessages.locale)
    ].join("\n");
    return {
      html: standaloneHtml(title, content, {
        locale: resolvedMessages.locale,
        messageSourcePath: resolvedMessages.sourcePath
      }),
      diagnostics,
      messageSourcePath: resolvedMessages.sourcePath,
      locale: resolvedMessages.locale
    };
  }

  const loaded = loadScreenResultForFile(source, sourcePath);
  const result = loaded.result;
  const documentResult = loaded.documentResult;
  const frontMatterMessages = resolveFrontMatterMessagesPath(sourcePath, documentResult.screen.frontMatter["messages"]);
  const resolvedMessages = resolveExportRendererMessages({
    sourcePath,
    locale: result.screen.locale,
    frontMatterPath: frontMatterMessages.path,
    explicitPath: options.messagesPath
  });
  const diagnostics = [
    ...result.diagnostics,
    ...frontMatterMessages.diagnostics,
    ...markVSpecDiagnosticsForRendererMessages(resolvedMessages)
  ];
  const title = result.screen.title ?? result.screen.id ?? basename(sourcePath);
  const content = [
    `<h1>${escapeHtml(title)}</h1>`,
    renderStaticDesignDocumentHtml(result, { messages: resolvedMessages.messages, documentResult }),
    renderDiagnostics(diagnostics, resolvedMessages.messages, resolvedMessages.locale)
  ].join("\n");
  return {
    html: standaloneHtml(title, content, {
      locale: resolvedMessages.locale,
      messageSourcePath: resolvedMessages.sourcePath
    }),
    diagnostics,
    messageSourcePath: resolvedMessages.sourcePath,
    locale: resolvedMessages.locale
  };
}

export function expandMarkVSpecFiles(patterns: readonly string[]): string[] {
  const matches = new Set<string>();
  for (const pattern of patterns.length > 0 ? patterns : ["."]) {
    for (const file of expandPattern(pattern)) {
      if (isMarkVSpecFilePath(file)) {
        matches.add(resolve(file));
      }
    }
  }

  return [...matches].sort();
}

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

export function resolvePdfBrowserCommand(platform: NodeJS.Platform): PdfBrowserCommand | undefined {
  return resolvePdfBrowserCommands(platform)[0];
}

export function resolvePdfBrowserCommands(platform: NodeJS.Platform): PdfBrowserCommand[] {
  return pdfBrowserCandidates(platform).filter((candidate) => isPathCommand(candidate.command) ? existsSync(candidate.command) : true);
}

export function pdfBrowserCandidates(platform: NodeJS.Platform): PdfBrowserCommand[] {
  if (platform === "darwin") {
    return [
      { command: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", args: [] },
      { command: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", args: [] },
      { command: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser", args: [] },
      { command: "/Applications/Chromium.app/Contents/MacOS/Chromium", args: [] }
    ];
  }

  if (platform === "win32") {
    const localAppData = process.env["LOCALAPPDATA"];
    const programFiles = process.env["PROGRAMFILES"];
    const programFilesX86 = process.env["PROGRAMFILES(X86)"];
    const candidates: Array<PdfBrowserCommand | undefined> = [
      localAppData ? { command: join(localAppData, "Google", "Chrome", "Application", "chrome.exe"), args: [] } : undefined,
      programFiles ? { command: join(programFiles, "Google", "Chrome", "Application", "chrome.exe"), args: [] } : undefined,
      programFilesX86 ? { command: join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"), args: [] } : undefined,
      programFiles ? { command: join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"), args: [] } : undefined,
      programFilesX86 ? { command: join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"), args: [] } : undefined,
      localAppData ? { command: join(localAppData, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"), args: [] } : undefined,
      programFiles ? { command: join(programFiles, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"), args: [] } : undefined,
      programFilesX86 ? { command: join(programFilesX86, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"), args: [] } : undefined,
      localAppData ? { command: join(localAppData, "Chromium", "Application", "chrome.exe"), args: [] } : undefined,
      programFiles ? { command: join(programFiles, "Chromium", "Application", "chrome.exe"), args: [] } : undefined,
      programFilesX86 ? { command: join(programFilesX86, "Chromium", "Application", "chrome.exe"), args: [] } : undefined
    ];
    return candidates.filter((candidate): candidate is PdfBrowserCommand => Boolean(candidate));
  }

  if (platform === "linux" || platform === "freebsd" || platform === "openbsd") {
    return [
      { command: "google-chrome", args: [] },
      { command: "google-chrome-stable", args: [] },
      { command: "chromium", args: [] },
      { command: "chromium-browser", args: [] },
      { command: "microsoft-edge", args: [] },
      { command: "brave-browser", args: [] }
    ];
  }

  return [];
}

export function pdfBrowserArgs(htmlPath: string, pdfPath: string): string[] {
  return [
    "--headless=new",
    "--disable-gpu",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=5000",
    "--no-pdf-header-footer",
    `--print-to-pdf=${pdfPath}`,
    pathToFileURL(htmlPath).toString()
  ];
}

export async function exportPdfFromHtmlWithFallback(htmlPath: string, pdfPath: string, browsers: PdfBrowserCommand[]): Promise<void> {
  const failures: string[] = [];
  for (const browser of browsers) {
    try {
      await exportPdfFromHtml(htmlPath, pdfPath, browser);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${browser.command}: ${message}`);
    }
  }

  throw new Error(failures.join("; "));
}

function diagnosticsForFile(sourcePath: string): { diagnostics: MarkVSpecDiagnostic[]; locale?: string } {
  const source = readFileSync(sourcePath, "utf8");
  if (isMarkVSpecProjectPath(sourcePath)) {
    const result = loadMarkVSpecProject(source, {
      projectPath: sourcePath,
      readFile: readTextFile
    });
    return { diagnostics: result.diagnostics, locale: result.project.project.frontMatter["locale"] };
  }

  const { result } = loadScreenResultForFile(source, sourcePath);
  return { diagnostics: result.diagnostics, locale: result.screen.locale };
}

function renderDocumentListMarkdown(projectPath: string, project: ReturnType<typeof loadMarkVSpecProject>): string {
  const rows = documentListRows(projectPath, project);
  const lines = [
    "# Document List",
    "",
    "| No. | Kind | ID | Title | Summary | Route | Last Updated | File | Diagnostics |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((row, index) => [
      String(index + 1),
      row.kind,
      markdownTableCell(row.id),
      markdownTableCell(row.title),
      markdownTableCell(row.summary),
      markdownTableCell(row.route),
      markdownTableCell(row.lastUpdated),
      markdownTableCell(row.file),
      diagnosticsSummary(row.diagnostics)
    ].join(" | "))
      .map((line) => `| ${line} |`)
  ];
  return `${lines.join("\n")}\n`;
}

function documentListRows(projectPath: string, project: ReturnType<typeof loadMarkVSpecProject>): MarkVSpecDocumentListRow[] {
  const rows: MarkVSpecDocumentListRow[] = [];
  const seenPartialPaths = new Set<string>();

  for (const screen of project.screens) {
    rows.push(documentListRow(
      "Screen",
      projectPath,
      screen.resolvedPath,
      screen.sourceResult ?? screen.result,
      screen.index.id,
      documentDiagnostics(screen.sourceResult ?? screen.result, projectEntryDiagnostics(project.diagnostics, "screen", screen.index))
    ));
  }
  for (const template of project.templates) {
    rows.push(documentListRow(
      "Template",
      projectPath,
      template.resolvedPath,
      template.result,
      template.index.id,
      documentDiagnostics(template.result, projectEntryDiagnostics(project.diagnostics, "template", template.index))
    ));
  }

  const collectPartials = (result: MarkVSpecParseResult | undefined, sourcePath: string | undefined): void => {
    if (!result || !sourcePath) {
      return;
    }
    // Document lists intentionally traverse declared references.partials only;
    // display.partial-only IDs are diagnostics/reporting concerns, not discovery.
    for (const [partialId, partialPath] of Object.entries(result.screen.references.partials)) {
      const resolvedPartialPath = resolveProjectPath(sourcePath, partialPath);
      if (seenPartialPaths.has(resolvedPartialPath)) {
        continue;
      }
      seenPartialPaths.add(resolvedPartialPath);
      const partialSource = readTextFile(resolvedPartialPath);
      if (partialSource === undefined) {
        rows.push(documentListRow("Partial", projectPath, resolvedPartialPath, undefined, partialId, uniqueDiagnostics([{
          severity: "error",
          message: `Partial reference ${partialId} file not found: ${partialPath}.`
        }, ...partialReferenceDiagnostics(project.diagnostics, partialId)])));
        continue;
      }
      const partialResult = parseMarkVSpec(partialSource);
      rows.push(documentListRow(
        "Partial",
        projectPath,
        resolvedPartialPath,
        partialResult,
        partialId,
        documentDiagnostics(partialResult, partialReferenceDiagnostics(project.diagnostics, partialId))
      ));
      collectPartials(partialResult, resolvedPartialPath);
    }
  };

  for (const screen of project.screens) {
    collectPartials(screen.sourceResult ?? screen.result, screen.resolvedPath);
  }
  for (const template of project.templates) {
    collectPartials(template.result, template.resolvedPath);
  }

  return rows;
}

function documentDiagnostics(result: MarkVSpecParseResult | undefined, extraDiagnostics: MarkVSpecDiagnostic[]): MarkVSpecDiagnostic[] {
  return uniqueDiagnostics([...(result?.diagnostics ?? []), ...extraDiagnostics]);
}

function projectEntryDiagnostics(diagnostics: readonly MarkVSpecDiagnostic[], kind: "screen" | "template", entry: MarkVSpecProjectScreen): MarkVSpecDiagnostic[] {
  const label = entry.id ?? "entry";
  return diagnostics.filter((diagnostic) => diagnostic.message.startsWith(`Project ${kind} ${label} `));
}

function partialReferenceDiagnostics(diagnostics: readonly MarkVSpecDiagnostic[], partialId: string): MarkVSpecDiagnostic[] {
  return diagnostics.filter((diagnostic) => diagnostic.message.startsWith(`Partial reference ${partialId} `));
}

function uniqueDiagnostics(diagnostics: readonly MarkVSpecDiagnostic[]): MarkVSpecDiagnostic[] {
  const seen = new Set<string>();
  const unique: MarkVSpecDiagnostic[] = [];
  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.severity}\0${diagnostic.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(diagnostic);
  }
  return unique;
}

function documentListRow(
  kind: "Screen" | "Template" | "Partial",
  projectPath: string,
  sourcePath: string | undefined,
  result: MarkVSpecParseResult | undefined,
  fallbackId: string | undefined,
  diagnostics: MarkVSpecDiagnostic[] = result?.diagnostics ?? []
): MarkVSpecDocumentListRow {
  return {
    kind,
    id: valueOrDash(result?.screen.id ?? fallbackId),
    title: valueOrDash(result?.screen.title),
    summary: valueOrDash(plainText(result?.screen.description)),
    route: valueOrDash(result?.screen.route),
    lastUpdated: valueOrDash(latestHistoryDate(result)),
    file: sourcePath ? normalizePath(relative(dirname(projectPath), sourcePath)) : "-",
    diagnostics
  };
}

function latestHistoryDate(result: MarkVSpecParseResult | undefined): string | undefined {
  const dates = (result?.historyEntries ?? [])
    .map((entry) => entry.fields.date?.trim())
    .filter((date): date is string => Boolean(date));
  return dates.sort((left, right) => compareHistoryDate(right, left))[0];
}

function compareHistoryDate(left: string, right: string): number {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
    return leftTime - rightTime;
  }
  return left.localeCompare(right);
}

function diagnosticsSummary(diagnostics: readonly MarkVSpecDiagnostic[]): string {
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length;
  return `${errors} errors / ${warnings} warnings`;
}

function valueOrDash(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "-";
}

function plainText(value: string | undefined): string | undefined {
  return value
    ?.replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .replace(/[`*_~]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function markdownTableCell(value: string): string {
  return value.replace(/\\/gu, "\\\\").replace(/\|/gu, "\\|").replace(/\r?\n/gu, " ");
}

function loadScreenResultForFile(source: string, sourcePath: string): { result: MarkVSpecParseResult; documentResult: MarkVSpecParseResult } {
  const screen = parseMarkVSpec(source);
  const templateRef = screen.screen.template;
  const templateSrc = screen.screen.templateSrc;
  if (!templateRef && !templateSrc) {
    return { result: screen, documentResult: screen };
  }

  const templateReference = resolveTemplatePath(sourcePath, templateRef, templateSrc);
  if (!templateReference) {
    screen.diagnostics.push({
      severity: "error",
      message: `Template reference ${templateRef ?? templateSrc} could not be resolved for ${basename(sourcePath)}.`
    });
    return { result: screen, documentResult: screen };
  }

  const templateSource = readTextFile(templateReference.path);
  if (templateSource === undefined) {
    screen.diagnostics.push({
      severity: "error",
      message: `Template file ${templateReference.path} could not be read.`
    });
    return { result: screen, documentResult: screen };
  }

  const template = parseMarkVSpec(templateSource);
  screen.diagnostics.push(...template.diagnostics);
  if (templateReference.expectedId && template.screen.id !== templateReference.expectedId) {
    screen.diagnostics.push({
      severity: "error",
      message: `Template reference ${templateReference.expectedId} points to file with template ID ${template.screen.id ?? "missing"}.`
    });
    return { result: screen, documentResult: screen };
  }
  if (template.screen.type !== "template") {
    screen.diagnostics.push({
      severity: "error",
      message: `Template reference ${templateRef} points to a ${template.screen.type} document.`
    });
    return { result: screen, documentResult: screen };
  }

  return { result: composeMarkVSpecTemplate(template, screen), documentResult: screen };
}

function resolveMarkVSpecFileInputs(patterns: readonly string[]): { files: string[]; diagnostics: Array<{ sourcePath: string; diagnostic: MarkVSpecDiagnostic }> } {
  const files = expandMarkVSpecFiles(patterns);
  const diagnostics: Array<{ sourcePath: string; diagnostic: MarkVSpecDiagnostic }> = [];
  const effectivePatterns = patterns.length > 0 ? patterns : ["."];

  for (const pattern of effectivePatterns) {
    if (!hasGlob(pattern) && !existsSync(pattern)) {
      diagnostics.push({
        sourcePath: pattern,
        diagnostic: {
          severity: "error",
          message: `Input path does not exist: ${pattern}.`
        }
      });
    }
  }

  if (files.length === 0 && diagnostics.length === 0) {
    diagnostics.push({
      sourcePath: effectivePatterns.join(", "),
      diagnostic: {
        severity: "error",
        message: "No MarkVSpec files matched the input."
      }
    });
  }

  return { files, diagnostics };
}

function requireMarkVSpecFiles(patterns: readonly string[]): string[] {
  const input = resolveMarkVSpecFileInputs(patterns);
  if (input.diagnostics.length > 0) {
    throw new Error(input.diagnostics.map((entry) => entry.diagnostic.message).join("\n"));
  }
  return input.files;
}

function outputPathsBySource(files: readonly string[], outDir: string, extension: ".html" | ".pdf"): Map<string, string> {
  const paths = new Map<string, string>();
  const seen = new Map<string, string>();
  for (const sourcePath of files) {
    const outputPath = join(outDir, `${defaultExportHtmlBaseName(sourcePath)}${extension}`);
    const existingSource = seen.get(outputPath);
    if (existingSource) {
      throw new Error(`Export output collision: ${existingSource} and ${sourcePath} both map to ${outputPath}.`);
    }
    seen.set(outputPath, sourcePath);
    paths.set(sourcePath, outputPath);
  }
  return paths;
}

function resolveTemplatePath(
  sourcePath: string,
  templateRef: string | undefined,
  templateSrc: string | undefined
): { path: string; expectedId?: string } | undefined {
  if (templateSrc) {
    return { path: resolveProjectPath(sourcePath, templateSrc), expectedId: templateRef };
  }

  return undefined;
}

function exportPdfFromHtml(htmlPath: string, pdfPath: string, browser: PdfBrowserCommand): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    execFile(browser.command, [...browser.args, ...pdfBrowserArgs(htmlPath, pdfPath)], (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolvePromise();
    });
  });
}

function expandPattern(pattern: string): string[] {
  if (!hasGlob(pattern)) {
    if (!existsSync(pattern)) {
      return [];
    }
    const stat = statSync(pattern);
    return stat.isDirectory() ? walkFiles(pattern) : [pattern];
  }

  const baseDirectory = globBaseDirectory(pattern);
  const regex = globRegex(pattern);
  return walkFiles(baseDirectory).filter((file) => regex.test(normalizePath(file)));
}

function walkFiles(root: string): string[] {
  if (!existsSync(root)) {
    return [];
  }

  const stat = statSync(root);
  if (!stat.isDirectory()) {
    return [root];
  }

  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") {
      continue;
    }
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

function globBaseDirectory(pattern: string): string {
  const normalized = normalizePath(pattern);
  const segments = normalized.split("/");
  const baseSegments: string[] = [];
  for (const segment of segments) {
    if (/[*?[]/u.test(segment)) {
      break;
    }
    baseSegments.push(segment);
  }
  return baseSegments.length > 0 ? baseSegments.join("/") : ".";
}

function globRegex(pattern: string): RegExp {
  const normalized = normalizePath(pattern);
  let source = "";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") {
      source += "[^/]*";
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += escapeRegex(char);
    }
  }
  return new RegExp(`^${source}$`, "u");
}

function standaloneHtml(
  title: string,
  content: string,
  options: { locale?: string; messageSourcePath?: string } = {}
): string {
  const messageMetadata = options.messageSourcePath
    ? `\n    <!-- MarkVSpec messages: ${escapeHtml(options.messageSourcePath).replace(/--/gu, "- -")} -->`
    : "";
  const needsMermaid = content.includes("data-mermaid-source");
  const mermaidScript = needsMermaid ? readMermaidScript() : undefined;
  const mermaidStyles = mermaidScript ? `\n      ${standaloneMermaidCss()}` : "";
  const mermaidRuntime = mermaidScript ? `\n    <script>\n${mermaidScript}\n    </script>\n    <script>\n${standaloneMermaidRuntime()}\n    </script>` : "";
  return `<!doctype html>
<html lang="${escapeHtml(options.locale ?? "en")}">
  <head>
    <meta charset="utf-8">
    ${messageMetadata.trim()}
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      :root { --markvspec-heading-state-views: 20px; --markvspec-heading-viewport: 17px; --markvspec-heading-state: 15px; --markvspec-heading-detail: 13px; --markvspec-heading-badge: 11px; }
      body { margin: 0; background: #f8fafc; color: #111827; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { max-width: 1120px; margin: 0 auto; padding: 32px 20px 56px; }
      h1 { font-size: 28px; margin: 0 0 24px; }
      h2 { font-size: var(--markvspec-heading-state-views); margin: 28px 0 12px; }
      .mm-export-section { margin-top: 28px; }
      .toc-inline { background: #fff; border: 1px solid #d1d5db; border-radius: 8px; margin: 0 0 28px; padding: 12px; }
      .toc-title { color: #374151; font-size: 12px; font-weight: 700; margin: 0 0 8px; }
      .toc-list { display: grid; gap: 2px; list-style: none; margin: 0; padding: 0; }
      .toc-list a { border-radius: 4px; color: #374151; display: block; font-size: 12px; line-height: 1.3; overflow: hidden; padding: 4px 6px; text-decoration: none; text-overflow: ellipsis; white-space: nowrap; }
      .toc-list a:hover { background: #f3f4f6; color: #111827; }
      .doc-section { break-inside: avoid; margin: 0 0 28px; page-break-inside: avoid; }
      .doc-section h2 { align-items: center; border-bottom: 1px solid #d1d5db; display: flex; flex-wrap: wrap; font-size: var(--markvspec-heading-state-views); gap: 8px; margin: 0 0 12px; padding-bottom: 6px; }
      .doc-section h3 { font-size: var(--markvspec-heading-viewport); margin: 22px 0 8px; }
      .doc-section h5 { font-size: var(--markvspec-heading-detail); margin: 16px 0 8px; }
      .doc-section h6 { font-size: 12px; margin: 14px 0 8px; }
      .state-screen-section { margin: 28px 0; }
      .state-viewport-section { margin: 18px 0 24px; }
      .state-viewport-section > h3 { align-items: center; display: flex; flex-wrap: wrap; font-size: var(--markvspec-heading-viewport); gap: 8px; margin: 22px 0 8px; }
      .state-screen-heading { align-items: center; display: flex; flex-wrap: wrap; font-size: var(--markvspec-heading-state); gap: 8px; margin: 0 0 12px; }
      .state-screen-subheading { color: #334155; font-size: var(--markvspec-heading-detail); font-weight: 700; margin: 0 0 12px; }
      .state-screen-detail-heading { color: #475569; font-size: 12px; font-weight: 700; margin: 0 0 8px; }
      .state-screen-section h2, .state-screen-section h3, .state-screen-section h4, .state-screen-section h5, .state-screen-section h6 { margin: 0 0 12px; }
      .screen-description { color: #374151; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }
      .screen-description .note-paragraph { margin: 0; }
      .screen-description .note-paragraph + .note-paragraph { margin-top: 6px; }
      .state-badge { background: #dbeafe; border: 1px solid #60a5fa; border-radius: 999px; color: #1e3a8a; font-size: var(--markvspec-heading-badge); font-weight: 600; padding: 1px 6px; }
      .spec-empty { color: #6b7280; font-size: 12px; font-weight: 400; }
      .spec-table-wrap { max-width: 100%; overflow: auto; }
      .spec-table { border-collapse: collapse; font-size: 12px; width: 100%; }
      .spec-table th, .spec-table td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; vertical-align: top; }
      .spec-table th { background: #f9fafb; font-weight: 600; white-space: nowrap; }
      .spec-table tbody tr:nth-child(even) { background: #fcfcfd; }
      .spec-table code:not(.mm-id):not(.mm-doc-label):not(.mm-document-ref-id) { background: #f3f4f6; border-radius: 3px; padding: 1px 3px; }
      .scenario-sample-rows-block { margin-top: 10px; }
      .scenario-sample-rows-heading { align-items: center; display: flex; flex-wrap: wrap; gap: 5px; }
      .scenario-sample-rows-wrap { max-width: 100%; overflow: auto; }
      .scenario-sample-rows-table { font-size: 11px; min-width: max-content; width: auto; }
      .scenario-sample-rows-table th, .scenario-sample-rows-table td { padding: 4px 6px; }
      .wireframe-section { max-width: 100%; overflow-x: auto; overflow-y: visible; padding-bottom: 4px; scrollbar-color: #9ca3af #f3f4f6; scrollbar-width: thin; }
      .wireframe-section::-webkit-scrollbar { height: 10px; width: 10px; }
      .wireframe-section::-webkit-scrollbar-track { background: #f3f4f6; }
      .wireframe-section::-webkit-scrollbar-thumb { background: #9ca3af; border: 2px solid #f3f4f6; border-radius: 999px; }
      .wireframe-section .mm-wireframe { max-width: none; padding: 0; position: relative; }
      ${baseWireframeViewportCss({ spaced: true })}
      .mm-inline-token { color: #0f766e; font-family: inherit; font-weight: 650; padding: 0 1px; }
      .mm-chip { align-items: center; border: 1px solid #d1d5db; border-radius: 999px; display: inline-flex; font-size: 11px; font-weight: 650; line-height: 1.2; max-width: 100%; padding: 2px 7px; vertical-align: middle; white-space: normal; }
      .mm-icon { display: inline-block; flex: 0 0 auto; height: 13px; margin-right: 4px; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2; fill: none; width: 13px; }
      .mm-source-chip { border-radius: 7px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; }
      .mm-source-chip .mm-icon { height: 12px; width: 12px; }
      .mm-source-chip-fixed { background: #f8fafc; border-color: #cbd5e1; color: #475569; }
      .mm-source-chip-i18n { background: #eef2ff; border-color: #a5b4fc; color: #3730a3; }
      .mm-source-chip-data { background: #eff6ff; border-color: #60a5fa; color: #1d4ed8; }
      .mm-source-chip-route { background: #f0fdfa; border-color: #5eead4; color: #0f766e; }
      .mm-source-chip-element { background: #fffbeb; border-color: #fcd34d; color: #b45309; }
      .mm-source-chip-asset { background: #ecfeff; border-color: #67e8f9; color: #155e75; }
      .mm-source-chip-external { background: #fff7ed; border-color: #fdba74; color: #c2410c; }
      .mm-source-chip-computed { background: #f5f3ff; border-color: #c4b5fd; color: #6d28d9; }
      .mm-ref-chip { align-items: center; background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; color: #1f2937; display: inline-flex; font-size: 12px; font-weight: 600; gap: 5px; line-height: 1.35; max-width: 100%; padding: 2px 6px; text-decoration: none; vertical-align: baseline; }
      .mm-id { align-items: center; align-self: flex-start; border: 1px solid transparent; display: inline-flex; flex: 0 0 auto; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 9px; font-variant-numeric: tabular-nums; font-weight: 700; justify-content: center; letter-spacing: 0; line-height: 1; margin-right: 6px; min-height: 16px; min-width: 16px; padding: 1px 4px; width: max-content; }
      .mm-marker-layout { background: #ecfeff; border-color: #67e8f9; border-left: 3px solid #0891b2; border-radius: 4px; color: #155e75; }
      .mm-marker-form-group { background: #f0fdf4; border-color: #86efac; border-left: 3px solid #16a34a; border-radius: 4px; color: #166534; }
      .mm-marker-element { background: rgba(255,255,255,.72); border-color: #f59e0b; border-radius: 999px; color: #92400e; box-shadow: 0 1px 2px rgba(15,23,42,.12); }
      .mm-marker-action { background: rgba(255,255,255,.78); border-color: #22c55e; border-radius: 4px; color: #166534; box-shadow: 0 1px 2px rgba(15,23,42,.12); }
      .mm-marker-link { display: inline-flex; pointer-events: auto; text-decoration: none; }
      .action-detail-list { display: grid; gap: 12px; }
      .action-detail { border: 1px solid #d1d5db; border-radius: 6px; padding: 12px; }
      .action-detail h3 { font-size: 14px; margin: 0 0 8px; }
      .action-detail dl { display: grid; grid-template-columns: 120px minmax(0,1fr); gap: 6px 10px; margin: 0; }
      .action-detail dt { color: #4b5563; font-size: 12px; font-weight: 600; }
      .action-detail dd { font-size: 12px; margin: 0; }
      .action-detail ul { margin: 0; padding-left: 16px; }
      .process-flow { display: grid; gap: 8px; }
      .process-card { background: #fff; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box; padding: 8px; }
      .process-card-header { align-items: center; display: flex; flex-wrap: wrap; gap: 6px; justify-content: space-between; margin-bottom: 6px; }
      .process-card-title-group { align-items: center; display: inline-flex; flex: 1 1 auto; flex-wrap: wrap; gap: 5px; min-width: 0; }
      .process-card-title { font-weight: 650; min-width: 0; }
      .process-card-meta { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 999px; color: #475569; font-size: 11px; font-weight: 600; line-height: 1.2; padding: 2px 7px; }
      .process-flow-connector { align-items: center; color: #64748b; display: flex; font-size: 13px; font-weight: 700; justify-content: center; line-height: 1; margin: -2px 0; }
      .process-flow-connector::before { content: "↓"; }
      .process-parallel-group-card { background: #f8fafc; border-style: dashed; }
      .process-parallel-children { display: grid; gap: 8px; }
      ${mermaidStyles}
      .mm-export-diagnostics { margin-top: 24px; padding: 16px; border: 1px solid #d1d5db; background: #fff; }
      .mm-export-diagnostics table { width: 100%; border-collapse: collapse; }
      .mm-export-diagnostics th, .mm-export-diagnostics td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; }
      .mm-diagnostic-severity { align-items: center; display: inline-flex; font-weight: 650; gap: 2px; }
      .mm-diagnostic-severity-error { color: #b91c1c; }
      .mm-diagnostic-severity-warning { color: #b45309; }
      .mm-diagnostic-severity-info { color: #1d4ed8; }
      @media print {
        @page { margin: 14mm; size: A4 landscape; }
        :root { --markvspec-heading-state-views: 15pt; --markvspec-heading-viewport: 12.5pt; --markvspec-heading-state: 11.5pt; --markvspec-heading-detail: 10pt; --markvspec-heading-badge: 8.5pt; }
        ${standardPrintPolicyCss({ spaced: true })}
        ${printScrollbarSuppressCss({ spaced: true })}
        .wireframe-section { overflow: visible; }
        ${wireframePrintSectionCss({ spaced: true })}
        .wireframe-section .mm-wireframe { border: 1px solid #d1d5db; box-shadow: none; box-sizing: border-box; max-width: 100% !important; min-width: 0 !important; outline: 0; width: 100% !important; }
        ${printWireframeViewportCss({ spaced: true })}
        .wireframe-section .mm-element-wrap-table { align-self: stretch !important; box-sizing: border-box !important; display: block !important; max-width: 100% !important; min-width: 0 !important; width: 100% !important; }
        .wireframe-section .mm-element-table { max-width: 100% !important; min-width: 0 !important; table-layout: fixed !important; width: 100% !important; }
        .wireframe-section .mm-element-table th,
        .wireframe-section .mm-element-table td { box-sizing: border-box; overflow-wrap: anywhere; word-break: break-word; }
        .spec-table-wrap { overflow: visible; }
        .spec-table { font-size: 8.5pt; table-layout: auto; width: 100%; }
        .spec-table thead { display: table-header-group; }
        .spec-table th,
        .spec-table td { box-sizing: border-box; overflow-wrap: break-word; padding: 4pt 5pt; word-break: normal; }
        .spec-table th { white-space: normal; }
        .scenario-sample-rows-block { break-inside: auto; page-break-inside: auto; }
        .scenario-sample-rows-wrap { max-width: 100%; overflow: visible; }
        .scenario-sample-rows-table { font-size: 7pt; min-width: 0; table-layout: fixed; width: 100%; }
        .scenario-sample-rows-table th, .scenario-sample-rows-table td { overflow-wrap: anywhere; word-break: break-word; }
        ${printSpecTableChipCss({ spaced: true })}
      }
    </style>
  </head>
  <body>
    <main>
      ${content}
    </main>${mermaidRuntime}
    <style>
      @media print {
        .wireframe-section .mm-wireframe { border: 1px solid #d1d5db !important; box-shadow: none !important; box-sizing: border-box !important; max-width: 100% !important; min-width: 0 !important; outline: 0 !important; width: 100% !important; }
        .wireframe-section .mm-wireframe { max-width: 100% !important; width: 100% !important; }
        ${printWireframeViewportCss({ importantZoom: true, spaced: true })}
        .wireframe-section .mm-element-wrap-table { align-self: stretch !important; box-sizing: border-box !important; display: block !important; max-width: 100% !important; min-width: 0 !important; width: 100% !important; }
        .wireframe-section .mm-element-table { max-width: 100% !important; min-width: 0 !important; table-layout: fixed !important; width: 100% !important; }
        .wireframe-section .mm-element-table th,
        .wireframe-section .mm-element-table td { box-sizing: border-box !important; overflow-wrap: anywhere !important; word-break: break-word !important; }
      }
    </style>
  </body>
</html>`;
}

function readMermaidScript(): string | undefined {
  if (hasReadMermaidScript) {
    return cachedMermaidScript;
  }
  hasReadMermaidScript = true;
  try {
    cachedMermaidScript = readFileSync(require.resolve("mermaid/dist/mermaid.min.js"), "utf8");
  } catch {
    cachedMermaidScript = undefined;
  }
  return cachedMermaidScript;
}

function standaloneMermaidCss(): string {
  return `.mermaid-block { position: relative; }
      .mermaid-source { background: #f9fafb; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box; display: none; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size: 12px; line-height: 1.5; margin: 0; overflow: auto; padding: 34px 12px 12px; white-space: pre; }
      .mermaid-source code { background: transparent; border: 0; border-radius: 0; color: inherit; font: inherit; padding: 0; }
      .mermaid-block.is-source-visible .mermaid-source { display: block; }
      .mermaid-block.is-source-visible .mermaid-placeholder, .mermaid-block.is-source-visible .mermaid-render { display: none; }
      .mermaid-placeholder { align-items: center; background: #fff; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box; color: #6b7280; display: flex; font-size: 12px; justify-content: center; min-height: 160px; padding: 34px 12px 12px; }
      .mermaid-render { background: #fff; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box; overflow: auto; padding: 12px; }
      .mermaid-render svg { height: auto; max-width: 100%; }
      .mermaid-source-toggle { background: #fff; border: 1px solid #cbd5e1; border-radius: 5px; color: #334155; cursor: pointer; font-size: 11px; font-weight: 650; line-height: 1; padding: 5px 8px; position: absolute; right: 8px; top: 8px; z-index: 1; }
      .mermaid-source-toggle:hover { background: #f8fafc; color: #111827; }
      .mermaid-source-toggle:focus-visible { outline: 2px solid #60a5fa; outline-offset: 2px; }
      .state-flow-section .mermaid-block, .state-flow-section .mermaid-placeholder, .state-flow-section .mermaid-render { min-height: 260px; }`;
}

function standaloneMermaidRuntime(): string {
  return `(() => {
      const messages = {
        showSource: "Show source",
        hideSource: "Hide source",
        rendering: "Rendering Mermaid diagram...",
        renderFailed: "Unable to render Mermaid diagram."
      };

      function prepareBlock(block) {
        const wrapper = document.createElement("div");
        wrapper.className = "mermaid-block";
        block.parentNode.insertBefore(wrapper, block);
        wrapper.appendChild(block);

        const placeholder = document.createElement("div");
        placeholder.className = "mermaid-placeholder";
        placeholder.textContent = messages.rendering;
        wrapper.appendChild(placeholder);

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "mermaid-source-toggle";
        toggle.textContent = messages.showSource;
        toggle.setAttribute("aria-label", messages.showSource);
        toggle.addEventListener("click", () => {
          const isSourceVisible = wrapper.classList.toggle("is-source-visible");
          toggle.textContent = isSourceVisible ? messages.hideSource : messages.showSource;
          toggle.setAttribute("aria-label", isSourceVisible ? messages.hideSource : messages.showSource);
        });
        wrapper.appendChild(toggle);

        return { source: block.textContent || "", placeholder, toggle, wrapper };
      }

      function showSource(item) {
        item.wrapper.classList.add("is-source-visible");
        item.toggle.textContent = messages.hideSource;
        item.toggle.setAttribute("aria-label", messages.hideSource);
      }

      async function renderMermaidDiagrams() {
        const blocks = Array.from(document.querySelectorAll("[data-mermaid-source]"))
          .filter((block) => !block.closest(".mermaid-block"));
        if (blocks.length === 0) {
          return;
        }

        const items = blocks.map(prepareBlock);
        if (!window.mermaid) {
          for (const item of items) {
            item.placeholder.textContent = messages.renderFailed;
            showSource(item);
          }
          return;
        }

        try {
          window.mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "default" });
        } catch {
          for (const item of items) {
            item.placeholder.textContent = messages.renderFailed;
            showSource(item);
          }
          return;
        }

        for (let index = 0; index < items.length; index += 1) {
          const item = items[index];
          const output = document.createElement("div");
          output.className = "mermaid-render";
          try {
            const rendered = await window.mermaid.render("markvspec-static-mermaid-" + index, item.source);
            output.innerHTML = rendered.svg;
            item.placeholder.replaceWith(output);
          } catch {
            item.placeholder.textContent = messages.renderFailed;
            showSource(item);
          }
        }
      }

      window.markVSpecRenderMermaidDiagrams = renderMermaidDiagrams;

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderMermaidDiagrams, { once: true });
      } else {
        void renderMermaidDiagrams();
      }
    })();`;
}

function renderDiagnostics(diagnostics: readonly MarkVSpecDiagnostic[], messages: RendererMessages, locale: string | undefined): string {
  if (diagnostics.length === 0) {
    return "";
  }

  const rows = diagnostics.map((diagnostic) => `<tr><td>${renderDiagnosticSeverity(diagnostic.severity)}</td><td>${diagnostic.line ?? ""}</td><td>${escapeHtml(renderDiagnosticMessageForLocale(diagnostic, locale))}</td></tr>`).join("");
  return `<section class="mm-export-diagnostics"><h2>${escapeHtml(messages.diagnostics)}</h2><table><thead><tr><th>${escapeHtml(messages.severity)}</th><th>${escapeHtml(messages.line)}</th><th>${escapeHtml(messages.message)}</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

type ExportIconName = "circle-x" | "info" | "triangle-alert";

function renderExportIcon(name: ExportIconName): string {
  const paths: Record<ExportIconName, string> = {
    "circle-x": '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    "triangle-alert": '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>'
  };
  return `<svg class="mm-icon mm-icon-${name}" aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
}

function renderDiagnosticSeverity(severity: string): string {
  if (severity === "error") {
    return `<span class="mm-diagnostic-severity mm-diagnostic-severity-error">${renderExportIcon("circle-x")}${escapeHtml(severity)}</span>`;
  }
  if (severity === "warning") {
    return `<span class="mm-diagnostic-severity mm-diagnostic-severity-warning">${renderExportIcon("triangle-alert")}${escapeHtml(severity)}</span>`;
  }
  if (severity === "info") {
    return `<span class="mm-diagnostic-severity mm-diagnostic-severity-info">${renderExportIcon("info")}${escapeHtml(severity)}</span>`;
  }
  return escapeHtml(severity);
}

function resolveExportRendererMessages(options: {
  sourcePath: string;
  locale?: string;
  explicitPath?: string;
  frontMatterPath?: string;
  searchBoundaryPath?: string;
}): ResolvedRendererMessages {
  return resolveRendererMessages({
    ...options,
    readFile: readTextFile
  });
}

function markVSpecDiagnosticsForRendererMessages(resolvedMessages: ResolvedRendererMessages): MarkVSpecDiagnostic[] {
  return resolvedMessages.diagnostics.map((diagnostic) => ({
    severity: diagnostic.severity,
    message: diagnostic.sourcePath ? `${diagnostic.message} (${diagnostic.sourcePath})` : diagnostic.message,
    line: 1
  }));
}

function resolveFrontMatterMessagesPath(sourcePath: string, frontMatterPath: string | undefined): { path?: string; diagnostics: MarkVSpecDiagnostic[] } {
  if (!frontMatterPath) {
    return { diagnostics: [] };
  }
  if (isAbsolute(frontMatterPath)) {
    return {
      diagnostics: [{
        severity: "warning",
        message: `Renderer message file in front matter must be relative to the MarkVSpec file: ${frontMatterPath}.`,
        line: 1
      }]
    };
  }

  const sourceDir = dirname(resolve(sourcePath));
  const resolvedPath = resolve(sourceDir, frontMatterPath);
  if (!isPathWithin(resolvedPath, sourceDir)) {
    return {
      diagnostics: [{
        severity: "warning",
        message: `Renderer message file in front matter is outside the MarkVSpec file directory: ${frontMatterPath}.`,
        line: 1
      }]
    };
  }

  return { path: frontMatterPath, diagnostics: [] };
}

function readTextFile(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

function isMarkVSpecFilePath(path: string): boolean {
  return path.endsWith(".vspec.md") || path.endsWith(".vspec.project.md");
}

function isMarkVSpecProjectPath(path: string): boolean {
  return path.endsWith(".vspec.project.md") || basename(path) === "vspec.project.md";
}

function hasGlob(value: string): boolean {
  return /[*?[]/u.test(value);
}

function normalizePath(path: string): string {
  return path.replace(/\\/gu, "/");
}

function isPathWithin(path: string, root: string): boolean {
  const absolutePath = resolve(path);
  const absoluteRoot = resolve(root);
  const relativePath = relative(absoluteRoot, absolutePath);
  return relativePath === "" || Boolean(relativePath && !relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function isPathCommand(command: string): boolean {
  return command.includes("/") || command.includes("\\");
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/gu, "\\$&");
}

function escapeHtml(value: string): string {
  return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");
}
