#!/usr/bin/env node
import {
  exportMarkVSpecDocumentList,
  exportMarkVSpecHtmlFiles,
  exportMarkVSpecPdfFiles,
  validateMarkVSpecFiles
} from "@markvspec/exporter";
import { diagnoseAiDesignInputDocument, evaluateMarkVSpecDiagnostics, renderDiagnosticMessageForLocale } from "@markvspec/core";
import { gunzipSync } from "node:zlib";
import { dirname, isAbsolute, join, normalize, relative, resolve } from "node:path";
import { mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

interface ParsedArgs {
  command?: string;
  subcommand?: string;
  patterns: string[];
  outDir?: string;
  failOnWarnings: boolean;
  messagesPath?: string;
  installPath?: string;
}

interface MainDependencies {
  downloadArchive?: (url: string) => Promise<Buffer>;
}

const MARKVSPEC_REPOSITORY_ARCHIVE_BASE = "https://github.com/wamukat/markvspec/archive/refs/tags";
const AUTHORING_SKILL_PATH = "skills/markvspec-authoring";
const AUTHORING_SKILL_NAME = "markvspec-authoring";
const AUTHORING_SKILL_REFERENCE_SOURCES = [
  { archivePath: "docs/en/user/dsl.md", installPath: "references/dsl.en.md" },
  { archivePath: "docs/ja/user/dsl.md", installPath: "references/dsl.ja.md" }
] as const;

export async function main(argv = process.argv.slice(2), dependencies: MainDependencies = {}): Promise<number> {
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

    if (args.command === "skill" && args.subcommand === "install") {
      return await runSkillInstall(args, dependencies);
    }

    printUsage();
    return 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

async function runSkillInstall(args: ParsedArgs, dependencies: MainDependencies): Promise<number> {
  if (!args.installPath) {
    throw new Error("Missing required --path <dir>.");
  }
  if (args.patterns.length > 0) {
    throw new Error(`Unexpected skill install argument: ${args.patterns[0]}`);
  }
  const version = readCliPackageVersion();
  const tag = `v${version}`;
  const url = `${MARKVSPEC_REPOSITORY_ARCHIVE_BASE}/${tag}.tar.gz`;
  const downloadArchive = dependencies.downloadArchive ?? downloadArchiveFromUrl;
  let archive: Buffer;
  try {
    archive = await downloadArchive(url);
  } catch (error) {
    throw new Error(`Failed to download ${AUTHORING_SKILL_NAME} from tag ${tag} (${url}): ${error instanceof Error ? error.message : String(error)}`);
  }

  const targetDir = join(args.installPath, AUTHORING_SKILL_NAME);
  try {
    installSkillFromTaggedArchive(archive, targetDir);
  } catch (error) {
    throw new Error(`Failed to install ${AUTHORING_SKILL_NAME} from tag ${tag} (${url}): ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log(`Installed ${AUTHORING_SKILL_NAME} from ${tag} to ${targetDir}.`);
  console.log("");
  console.log("Add this to AGENTS.md:");
  console.log("");
  console.log(authoringSkillAgentsSnippet());
  return 0;
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
    subcommand: command === "export" || command === "diagnose" || command === "skill" ? maybeSubcommand : undefined,
    patterns: [],
    failOnWarnings: false
  };
  const values = command === "export" || command === "diagnose" || command === "skill" ? rest : [maybeSubcommand, ...rest].filter((value): value is string => Boolean(value));

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === "--out" || value === "-o") {
      args.outDir = values[index + 1];
      index += 1;
    } else if (value === "--messages") {
      args.messagesPath = values[index + 1];
      index += 1;
    } else if (value === "--path") {
      args.installPath = values[index + 1];
      index += 1;
    } else if (value === "--fail-on-warnings") {
      args.failOnWarnings = true;
    } else {
      args.patterns.push(value);
    }
  }

  return args;
}

async function downloadArchiveFromUrl(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function readCliPackageVersion(): string {
  const packageJsonPath = fileURLToPath(new URL("../package.json", import.meta.url));
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: unknown };
  if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
    throw new Error(`Cannot read CLI package version from ${packageJsonPath}.`);
  }
  return packageJson.version;
}

function installSkillFromTaggedArchive(archive: Buffer, targetDir: string): void {
  const entries = readTarGzEntries(archive);
  const skillEntries = entries
    .map((entry) => ({ entry, skillRelativePath: skillRelativePathFromArchiveEntry(entry.name) }))
    .filter((item): item is { entry: TarEntry; skillRelativePath: string } => item.skillRelativePath !== undefined);

  if (skillEntries.length === 0) {
    throw new Error(`Archive does not contain ${AUTHORING_SKILL_PATH}/.`);
  }

  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });
  for (const { entry, skillRelativePath } of skillEntries) {
    if (!skillRelativePath) {
      continue;
    }
    const safePath = safeJoin(targetDir, skillRelativePath);
    if (entry.type === "directory") {
      mkdirSync(safePath, { recursive: true });
    } else {
      mkdirSync(dirname(safePath), { recursive: true });
      writeFileSync(safePath, entry.content);
    }
  }

  installSkillReferencesFromTaggedArchive(entries, targetDir);
}

interface TarEntry {
  name: string;
  type: "file" | "directory";
  content: Buffer;
}

function readTarGzEntries(archive: Buffer): TarEntry[] {
  const tar = gunzipSync(archive);
  const entries: TarEntry[] = [];
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      break;
    }
    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const fullName = prefix ? `${prefix}/${name}` : name;
    const size = parseInt(readTarString(header, 124, 12).trim() || "0", 8);
    const typeflag = readTarString(header, 156, 1);
    const contentStart = offset + 512;
    const contentEnd = contentStart + size;
    if (typeflag === "5") {
      entries.push({ name: fullName, type: "directory", content: Buffer.alloc(0) });
    } else if (typeflag === "" || typeflag === "0") {
      entries.push({ name: fullName, type: "file", content: Buffer.from(tar.subarray(contentStart, contentEnd)) });
    }
    offset = contentStart + Math.ceil(size / 512) * 512;
  }
  return entries;
}

function readTarString(header: Buffer, offset: number, length: number): string {
  const slice = header.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return slice.subarray(0, end === -1 ? slice.length : end).toString("utf8");
}

function skillRelativePathFromArchiveEntry(entryName: string): string | undefined {
  const parts = entryName.split("/").filter(Boolean);
  const skillPathParts = AUTHORING_SKILL_PATH.split("/");
  if (parts.length < skillPathParts.length + 1) {
    return undefined;
  }
  const pathAfterRoot = parts.slice(1);
  if (!skillPathParts.every((part, index) => pathAfterRoot[index] === part)) {
    return undefined;
  }
  return pathAfterRoot.slice(skillPathParts.length).join("/");
}

function installSkillReferencesFromTaggedArchive(entries: TarEntry[], targetDir: string): void {
  for (const reference of AUTHORING_SKILL_REFERENCE_SOURCES) {
    const sourceEntry = entries.find((entry) => archiveRelativePathFromEntry(entry.name) === reference.archivePath);
    if (!sourceEntry || sourceEntry.type !== "file") {
      throw new Error(`Archive does not contain required authoring skill reference: ${reference.archivePath}.`);
    }
    const safePath = safeJoin(targetDir, reference.installPath);
    mkdirSync(dirname(safePath), { recursive: true });
    writeFileSync(safePath, sourceEntry.content);
  }
}

function archiveRelativePathFromEntry(entryName: string): string | undefined {
  const parts = entryName.split("/").filter(Boolean);
  if (parts.length < 2) {
    return undefined;
  }
  return parts.slice(1).join("/");
}

function safeJoin(rootDir: string, relativePath: string): string {
  if (isAbsolute(relativePath)) {
    throw new Error(`Unsafe archive path: ${relativePath}`);
  }
  const normalizedPath = normalize(relativePath);
  if (normalizedPath === "." || normalizedPath.startsWith("..")) {
    throw new Error(`Unsafe archive path: ${relativePath}`);
  }
  const targetPath = join(rootDir, normalizedPath);
  if (relative(resolve(rootDir), resolve(targetPath)).startsWith("..")) {
    throw new Error(`Unsafe archive path: ${relativePath}`);
  }
  return targetPath;
}

function authoringSkillAgentsSnippet(): string {
  return `## MarkVSpec Authoring

When creating or editing \`.vspec.md\` files, use the \`${AUTHORING_SKILL_NAME}\` skill.

Before turning a requirements note or screen idea Markdown file into \`.vspec.md\`, run:

\`\`\`bash
markvspec diagnose input <markdown-file>
\`\`\`

Read the JSON report yourself. Summarize missing information, confirmation questions, and the recommended fixes or next edits instead of pasting the raw report back to the user.

After creating or editing a \`.vspec.md\` file, run:

\`\`\`bash
markvspec validate <file-or-glob> --fail-on-warnings
\`\`\`

Keep MarkVSpec semantic. Do not write raw CSS classes, raw colors, dimensions, or htmx attributes into the screen specification. Model htmx-style behavior with Actions, Process/HttpRequest, Cases, and display/update effects.`;
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
  markvspec skill install --path <dir>
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
