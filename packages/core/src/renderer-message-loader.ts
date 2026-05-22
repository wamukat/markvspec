import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { parseDocument } from "yaml";
import {
  messagesForLocale,
  resolveLocale,
  supportedRendererMessageKeys,
  type MarkVSpecLocale,
  type RendererMessageDiagnostic,
  type RendererMessageKey,
  type RendererMessages,
  type ResolvedRendererMessages,
  type ResolveRendererMessagesOptions
} from "./renderer-messages.js";

const supportedMessageKeys = new Set<string>(supportedRendererMessageKeys());
const ignoredDeprecatedMessageKeys = new Set([
  "pdfExportNotes",
  "printNoteBrowser",
  "printNoteMermaid",
  "printNoteTables"
]);

export function resolveRendererMessages(options: ResolveRendererMessagesOptions = {}): ResolvedRendererMessages {
  const locale = resolveLocale(options.locale);
  const diagnostics: RendererMessageDiagnostic[] = [];
  const readFile = options.readFile ?? readTextFile;
  const fileExists = options.fileExists ?? existsSync;
  const candidate = resolveMessageFileCandidate(options, locale, fileExists, diagnostics);
  const loaded = candidate ? loadRendererMessageFile(candidate, locale, readFile, diagnostics) : undefined;

  return {
    locale,
    messages: {
      ...messagesForLocale(locale),
      ...(loaded?.messages ?? {})
    },
    sourcePath: loaded?.sourcePath,
    diagnostics
  };
}

function resolveMessageFileCandidate(
  options: ResolveRendererMessagesOptions,
  locale: MarkVSpecLocale,
  fileExists: (path: string) => boolean,
  diagnostics: RendererMessageDiagnostic[]
): string | undefined {
  if (options.explicitPath) {
    const candidate = resolvePath(process.cwd(), options.explicitPath);
    if (!isInsideWorkspace(candidate, options.workspaceRoot)) {
      diagnostics.push({
        severity: "warning",
        message: `Renderer message file is outside the workspace: ${candidate}.`,
        sourcePath: candidate
      });
      return undefined;
    }
    return candidate;
  }

  const sourceDir = options.sourcePath ? dirname(resolve(options.sourcePath)) : process.cwd();
  if (options.frontMatterPath) {
    const candidate = resolvePath(sourceDir, options.frontMatterPath);
    if (!isInsideWorkspace(candidate, options.workspaceRoot)) {
      diagnostics.push({
        severity: "warning",
        message: `Renderer message file is outside the workspace: ${candidate}.`,
        sourcePath: candidate
      });
      return undefined;
    }
    return candidate;
  }

  return findDefaultMessagesFile(sourceDir, locale, options, fileExists);
}

function findDefaultMessagesFile(
  sourceDir: string,
  locale: MarkVSpecLocale,
  options: ResolveRendererMessagesOptions,
  fileExists: (path: string) => boolean
): string | undefined {
  const boundary = resolveSearchBoundary(sourceDir, options);
  let current = sourceDir;
  while (true) {
    for (const fileName of defaultMessageFileNames(locale)) {
      const candidate = join(current, fileName);
      if (isInsideWorkspace(candidate, options.workspaceRoot) && fileExists(candidate)) {
        return candidate;
      }
    }

    if (current === boundary) {
      return undefined;
    }
    const parent = dirname(current);
    if (parent === current || !isPathWithin(current, boundary)) {
      return undefined;
    }
    current = parent;
  }
}

function resolveSearchBoundary(sourceDir: string, options: ResolveRendererMessagesOptions): string {
  if (options.workspaceRoot) {
    return resolve(options.workspaceRoot);
  }
  if (options.searchBoundaryPath) {
    return resolve(options.searchBoundaryPath);
  }
  const cwd = process.cwd();
  return isPathWithin(sourceDir, cwd) ? cwd : sourceDir;
}

function defaultMessageFileNames(locale: MarkVSpecLocale): string[] {
  return [
    `markvspec.messages.${locale}.yml`,
    `markvspec.messages.${locale}.yaml`,
    `markvspec.messages.${locale}.json`,
    "markvspec.messages.yml",
    "markvspec.messages.yaml",
    "markvspec.messages.json"
  ];
}

function loadRendererMessageFile(
  path: string,
  locale: MarkVSpecLocale,
  readFile: (path: string) => string | undefined,
  diagnostics: RendererMessageDiagnostic[]
): { messages: Partial<RendererMessages>; sourcePath?: string } {
  const raw = readFile(path);
  if (raw === undefined) {
    diagnostics.push({
      severity: "warning",
      message: `Renderer message file could not be read: ${path}.`,
      sourcePath: path
    });
    return { messages: {} };
  }

  const data = parseRendererMessageFile(raw, path, diagnostics);
  if (!isRecord(data)) {
    return { messages: {} };
  }

  const fileLocale = typeof data["locale"] === "string" ? resolveLocale(data["locale"]) : undefined;
  if (fileLocale && fileLocale !== locale) {
    diagnostics.push({
      severity: "warning",
      message: `Renderer message file locale ${fileLocale} does not match document locale ${locale}.`,
      sourcePath: path
    });
  }

  const messages = data["messages"];
  if (!isRecord(messages)) {
    diagnostics.push({
      severity: "warning",
      message: "Renderer message file must contain a messages object.",
      sourcePath: path
    });
    return { messages: {} };
  }

  const override: Partial<RendererMessages> = {};
  for (const [key, value] of Object.entries(messages)) {
    if (!supportedMessageKeys.has(key)) {
      if (ignoredDeprecatedMessageKeys.has(key)) {
        continue;
      }
      diagnostics.push({
        severity: "warning",
        message: `Unknown renderer message key: ${key}.`,
        sourcePath: path,
        key
      });
      continue;
    }
    if (typeof value !== "string") {
      diagnostics.push({
        severity: "warning",
        message: `Renderer message key ${key} must be a string.`,
        sourcePath: path,
        key
      });
      continue;
    }
    override[key as RendererMessageKey] = value;
  }

  return { messages: override, sourcePath: path };
}

function parseRendererMessageFile(raw: string, path: string, diagnostics: RendererMessageDiagnostic[]): unknown {
  if (path.endsWith(".json")) {
    try {
      return JSON.parse(raw) as unknown;
    } catch (error) {
      diagnostics.push({
        severity: "warning",
        message: `Invalid renderer message JSON: ${error instanceof Error ? error.message : String(error)}`,
        sourcePath: path
      });
      return undefined;
    }
  }

  const document = parseDocument(raw, { uniqueKeys: false });
  if (document.errors.length > 0) {
    diagnostics.push(...document.errors.map((error) => ({
      severity: "warning" as const,
      message: `Invalid renderer message YAML: ${error.message}`,
      sourcePath: path
    })));
    return undefined;
  }
  return document.toJS() as unknown;
}

function readTextFile(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolvePath(baseDir: string, path: string): string {
  return isAbsolute(path) ? path : resolve(baseDir, path);
}

function isInsideWorkspace(path: string, workspaceRoot: string | undefined): boolean {
  return workspaceRoot ? isPathWithin(path, workspaceRoot) : true;
}

function isPathWithin(path: string, root: string): boolean {
  const absolutePath = resolve(path);
  const absoluteRoot = resolve(root);
  const relativePath = relative(absoluteRoot, absolutePath);
  return relativePath === "" || Boolean(relativePath && !relativePath.startsWith("..") && !isAbsolute(relativePath));
}
