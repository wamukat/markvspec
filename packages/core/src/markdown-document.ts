import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import { parseDocument } from "yaml";
import type { Root } from "mdast";
import type { MarkVSpecDiagnostic, MarkVSpecDocumentReferences } from "./types.js";
import { filterLinesWithoutStandaloneHtmlComments } from "./markdown-html-comments.js";

export interface MarkdownHeading {
  depth: number;
  text: string;
  line: number;
}

export interface MarkdownDocument {
  lines: string[];
  tree: Root;
  frontMatter: Record<string, string>;
  frontMatterData: Record<string, unknown>;
  references: MarkVSpecDocumentReferences;
  bodyStartIndex: number;
  headings: MarkdownHeading[];
}

export function parseMarkdownDocument(source: string, diagnostics: MarkVSpecDiagnostic[]): MarkdownDocument {
  const lines = source.split(/\r?\n/);
  const tree = unified().use(remarkParse).use(remarkFrontmatter, ["yaml"]).parse(source) as Root;
  const { raw, bodyStartIndex } = extractYamlFrontMatter(lines, diagnostics);
  const frontMatterData = parseYamlFrontMatter(raw, diagnostics);
  return {
    lines,
    tree,
    frontMatter: flattenFrontMatterScalars(frontMatterData),
    frontMatterData,
    references: parseDocumentReferences(frontMatterData, diagnostics),
    bodyStartIndex,
    headings: extractHeadings(tree)
  };
}

export function firstHeading(document: MarkdownDocument, depth: number): MarkdownHeading | undefined {
  return document.headings.find((heading) => heading.depth === depth && heading.line > document.bodyStartIndex);
}

export function headingsAtDepth(document: MarkdownDocument, depth: number): MarkdownHeading[] {
  return document.headings.filter((heading) => heading.depth === depth && heading.line > document.bodyStartIndex);
}

export function topLevelProseLines(document: MarkdownDocument): string[] {
  const heading = firstHeading(document, 1);
  const startIndex = heading ? heading.line : document.bodyStartIndex;
  const firstSectionLine = document.headings.find((item) => item.depth === 2 && item.line > startIndex)?.line ?? document.lines.length + 1;
  const commentBlocks = topLevelStandaloneHtmlCommentBlocks(document, startIndex, firstSectionLine);
  let lines = document.lines
    .slice(startIndex, firstSectionLine - 1)
    .map((text, index) => ({ text, line: startIndex + index + 1 }));

  lines = filterLinesWithoutStandaloneHtmlComments(lines, commentBlocks).filter((line) => !/^#\s+/u.test(line.text));
  while (lines.length > 0 && lines[0]?.text.trim() === "") {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1]?.text.trim() === "") {
    lines.pop();
  }
  return lines.map((line) => line.text);
}

function topLevelStandaloneHtmlCommentBlocks(
  document: MarkdownDocument,
  startIndex: number,
  firstSectionLine: number
): Array<{ type: string; text: string; range: { start: { line: number }; end: { line: number } } }> {
  const commentBlocks: Array<{ type: string; text: string; range: { start: { line: number }; end: { line: number } } }> = [];
  for (const node of document.tree.children) {
    const startLine = node.position?.start.line;
    const endLine = node.position?.end.line;
    if (startLine === undefined || endLine === undefined || startLine <= startIndex || startLine >= firstSectionLine) {
      continue;
    }
    commentBlocks.push({
      type: node.type,
      text: "value" in node && typeof node.value === "string" ? node.value : "",
      range: { start: { line: startLine }, end: { line: endLine } }
    });
  }
  return commentBlocks;
}

function extractYamlFrontMatter(
  lines: string[],
  diagnostics: MarkVSpecDiagnostic[]
): { raw: string; bodyStartIndex: number } {
  if (lines[0] !== "---") {
    diagnostics.push({
      severity: "warning",
      message: "Missing YAML Front Matter.",
      line: 1
    });
    return { raw: "", bodyStartIndex: 0 };
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && line === "---");
  if (closingIndex === -1) {
    diagnostics.push({
      severity: "error",
      message: "Unclosed YAML Front Matter.",
      line: 1
    });
    return { raw: "", bodyStartIndex: lines.length };
  }

  return {
    raw: lines.slice(1, closingIndex).join("\n"),
    bodyStartIndex: closingIndex + 1
  };
}

function parseYamlFrontMatter(raw: string, diagnostics: MarkVSpecDiagnostic[]): Record<string, unknown> {
  if (!raw.trim()) {
    return {};
  }

  const document = parseDocument(raw, { uniqueKeys: false });
  if (document.errors.length > 0) {
    for (const error of document.errors) {
      diagnostics.push({
        severity: "error",
        message: `Invalid YAML Front Matter: ${error.message}`,
        line: yamlErrorSourceLine(error)
      });
    }
    return {};
  }

  const data = document.toJS() as unknown;
  return isRecord(data) ? data : {};
}

function yamlErrorSourceLine(error: { linePos?: Array<{ line: number }> }): number {
  const yamlLine = error.linePos?.[0]?.line;
  return yamlLine === undefined ? 1 : yamlLine + 1;
}

function flattenFrontMatterScalars(data: Record<string, unknown>): Record<string, string> {
  const frontMatter: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (isScalarValue(value)) {
      frontMatter[key] = String(value);
    }
  }
  return frontMatter;
}

function parseDocumentReferences(data: Record<string, unknown>, diagnostics: MarkVSpecDiagnostic[]): MarkVSpecDocumentReferences {
  const references = createEmptyDocumentReferences();
  const source = data["references"];
  if (!isRecord(source)) {
    return references;
  }

  if (source["templates"] !== undefined) {
    diagnostics.push({
      severity: "error",
      message: "references.templates has been removed. Use template.id and template.src.",
      line: 1
    });
  }
  references.partials = parseReferenceGroup(source["partials"]);
  return references;
}

function parseReferenceGroup(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  const references: Record<string, string> = {};
  for (const [key, target] of Object.entries(value)) {
    if (isScalarValue(target)) {
      references[key] = String(target);
    }
  }
  return references;
}

function createEmptyDocumentReferences(): MarkVSpecDocumentReferences {
  return {
    templates: {},
    partials: {}
  };
}

function extractHeadings(tree: Root): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  for (const node of tree.children) {
    if (node.type !== "heading" || !node.position?.start.line) {
      continue;
    }
    headings.push({
      depth: node.depth,
      text: inlineText(node.children as unknown as Array<Record<string, unknown>>),
      line: node.position.start.line
    });
  }
  return headings;
}

function inlineText(nodes: Array<Record<string, unknown>> | undefined): string {
  return (nodes ?? []).map((node) => {
    if ("value" in node && typeof node.value === "string") {
      return node.value;
    }
    if ("children" in node) {
      return inlineText(node.children as Array<Record<string, unknown>>);
    }
    return "";
  }).join("");
}

function isScalarValue(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
