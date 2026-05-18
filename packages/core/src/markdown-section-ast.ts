import type { BlockContent, Blockquote, Content, Heading, List, ListItem, Paragraph, RootContent } from "mdast";
import type { MarkdownDocument } from "./markdown-document.js";

export interface SourcePosition {
  line: number;
  column: number;
  offset?: number;
}

export interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}

export type SectionKind =
  | "States"
  | "Layout"
  | "Slot"
  | "Slots"
  | "Elements"
  | "FormGroups"
  | "Events"
  | "Actions"
  | "ModelSamples"
  | "ViewContext"
  | "ViewContextSamples"
  | "PreviewScenarios"
  | "Validations"
  | "FieldValidations"
  | "CrossFieldValidations"
  | "BusinessRules"
  | "ErrorCodes"
  | "HistoryFields"
  | "History"
  | "Unknown";

export interface HeadingAst {
  depth: number;
  text: string;
  range: SourceRange;
}

export interface SectionAst {
  id: string;
  kind: SectionKind;
  title: string;
  heading: HeadingAst;
  range: SourceRange;
  blocks: BlockAst[];
  rawNodeIds: string[];
  viewport?: string;
  slotName?: string;
}

export type BlockAst =
  | HeadingBlockAst
  | ListBlockAst
  | ListItemBlockAst
  | ParagraphBlockAst
  | BlockquoteBlockAst
  | TableBlockAst
  | CodeBlockAst
  | ThematicBreakBlockAst
  | HtmlBlockAst
  | UnknownBlockAst;

interface BaseBlockAst {
  type: BlockAst["type"];
  range?: SourceRange;
  text?: string;
  children: BlockAst[];
  sourceNodeType: string;
  sourceNodeId: string;
  sourceLines?: string[];
}

export interface HeadingBlockAst extends BaseBlockAst {
  type: "heading";
  depth: number;
  text: string;
}

export interface ListBlockAst extends BaseBlockAst {
  type: "list";
  ordered: boolean;
  children: ListItemBlockAst[];
}

export interface ListItemBlockAst extends BaseBlockAst {
  type: "listItem";
  text: string;
}

export interface ParagraphBlockAst extends BaseBlockAst {
  type: "paragraph";
  text: string;
}

export interface BlockquoteBlockAst extends BaseBlockAst {
  type: "blockquote";
}

export interface TableBlockAst extends BaseBlockAst {
  type: "table";
  rows: string[][];
  rowSources: Array<{
    cells: string[];
    raw: string;
    range?: SourceRange;
  }>;
}

export interface CodeBlockAst extends BaseBlockAst {
  type: "code";
  text: string;
  lang?: string;
}

export interface ThematicBreakBlockAst extends BaseBlockAst {
  type: "thematicBreak";
}

export interface HtmlBlockAst extends BaseBlockAst {
  type: "html";
  text: string;
}

export interface UnknownBlockAst extends BaseBlockAst {
  type: "unknown";
}

export function collectSectionAst(document: MarkdownDocument): SectionAst[] {
  const sections: SectionAst[] = [];
  const children = document.tree.children;
  const seenSectionIds = new Map<string, number>();

  for (let index = 0; index < children.length; index += 1) {
    const node = children[index];
    if (!isSectionHeading(node, document.bodyStartIndex)) {
      continue;
    }

    const title = inlineText(node.children as Content[]);
    const sectionNodes: RootContent[] = [];
    let nextIndex = index + 1;
    while (nextIndex < children.length && !isSectionHeading(children[nextIndex], document.bodyStartIndex)) {
      sectionNodes.push(children[nextIndex]);
      nextIndex += 1;
    }

    const headingRange = sourceRange(node);
    const blocks = sectionNodes.map((child) => toBlockAst(child, document));
    const range = rangeFromNodes(node, sectionNodes) ?? headingRange;
    const metadata = sectionMetadata(title);
    const baseId = sectionBaseId(metadata.kind, title, metadata.viewport, metadata.slotName, headingRange);
    const id = uniqueSectionId(baseId, seenSectionIds);

    sections.push({
      id,
      kind: metadata.kind,
      title,
      heading: {
        depth: node.depth,
        text: title,
        range: headingRange
      },
      range,
      blocks,
      rawNodeIds: sectionNodes.map((child) => sourceNodeId(child)),
      ...(metadata.viewport !== undefined ? { viewport: metadata.viewport } : {}),
      ...(metadata.slotName !== undefined ? { slotName: metadata.slotName } : {})
    });
  }

  return sections;
}

function isSectionHeading(node: RootContent, bodyStartIndex: number): node is Heading {
  const startLine = node.position?.start.line;
  return node.type === "heading" && node.depth === 2 && startLine !== undefined && startLine > bodyStartIndex;
}

function sectionMetadata(title: string): { kind: SectionKind; viewport?: string; slotName?: string } {
  const layout = /^Layout:\s*(.*?)\s*$/.exec(title);
  if (layout) {
    return { kind: "Layout", viewport: layout[1].trim() };
  }

  const slot = /^Slot:\s*([^:]*?)(?:\s*:\s*(.*?))?\s*$/.exec(title);
  if (slot) {
    const slotName = slot[1].trim();
    const viewport = slot[2]?.trim();
    return {
      kind: "Slot",
      slotName,
      ...(viewport ? { viewport } : {})
    };
  }

  switch (title) {
    case "States":
      return { kind: "States" };
    case "Layout":
      return { kind: "Layout" };
    case "Slots":
      return { kind: "Slots" };
    case "Elements":
      return { kind: "Elements" };
    case "Form Groups":
      return { kind: "FormGroups" };
    case "Events":
      return { kind: "Events" };
    case "Actions":
      return { kind: "Actions" };
    case "Model Samples":
      return { kind: "ModelSamples" };
    case "View Context":
      return { kind: "ViewContext" };
    case "View Context Samples":
      return { kind: "ViewContextSamples" };
    case "Preview Scenarios":
      return { kind: "PreviewScenarios" };
    case "Validations":
      return { kind: "Validations" };
    case "Field Validations":
      return { kind: "FieldValidations" };
    case "Cross-field Validations":
      return { kind: "CrossFieldValidations" };
    case "Business Rules":
      return { kind: "BusinessRules" };
    case "Error Codes":
      return { kind: "ErrorCodes" };
    case "History Fields":
    case "履歴フィールド":
      return { kind: "HistoryFields" };
    case "History":
      return { kind: "History" };
    default:
      return { kind: "Unknown" };
  }
}

function sectionBaseId(kind: SectionKind, title: string, viewport: string | undefined, slotName: string | undefined, range: SourceRange): string {
  if (kind === "Layout" && viewport) {
    return `section:Layout:${normalizeIdPart(viewport)}`;
  }
  if (kind === "Slot" && slotName) {
    return `section:Slot:${normalizeIdPart(slotName)}${viewport ? `:${normalizeIdPart(viewport)}` : ""}`;
  }
  if (kind !== "Unknown") {
    return `section:${kind}`;
  }
  return `section:${range.start.line}:${normalizeIdPart(title)}`;
}

function uniqueSectionId(baseId: string, seenIds: Map<string, number>): string {
  const count = seenIds.get(baseId) ?? 0;
  seenIds.set(baseId, count + 1);
  return count === 0 ? baseId : `${baseId}:${count + 1}`;
}

function normalizeIdPart(value: string): string {
  return value.trim().replace(/\s+/g, "-");
}

function toBlockAst(node: RootContent | Content, document: MarkdownDocument): BlockAst {
  if (node.type === "heading") {
    return {
      type: "heading",
      depth: node.depth,
      text: inlineText(node.children as Content[]),
      children: [],
      sourceNodeType: node.type,
      sourceNodeId: sourceNodeId(node),
      ...(sourceLinesIfPresent(node, document) ? { sourceLines: sourceLinesIfPresent(node, document) } : {}),
      ...(sourceRangeIfPresent(node) ? { range: sourceRangeIfPresent(node) } : {})
    };
  }

  if (node.type === "paragraph") {
    const text = inlineText(node.children as Content[]);
    const tableRows = parseMarkdownTableRows(text);
    if (tableRows) {
      return {
        type: "table",
        text,
        rows: tableRows,
        rowSources: tableRowSources(text, node),
        children: [],
        sourceNodeType: node.type,
        sourceNodeId: sourceNodeId(node),
        ...(sourceLinesIfPresent(node, document) ? { sourceLines: sourceLinesIfPresent(node, document) } : {}),
        ...(sourceRangeIfPresent(node) ? { range: sourceRangeIfPresent(node) } : {})
      };
    }
    return paragraphBlock(node, document);
  }

  if (node.type === "list") {
    return listBlock(node, document);
  }

  if (node.type === "listItem") {
    return listItemBlock(node, document);
  }

  if (node.type === "blockquote") {
    return blockquoteBlock(node, document);
  }

  if (node.type === "code") {
    return {
      type: "code",
      text: node.value,
      children: [],
      sourceNodeType: node.type,
      sourceNodeId: sourceNodeId(node),
      ...(node.lang ? { lang: node.lang } : {}),
      ...(sourceLinesIfPresent(node, document) ? { sourceLines: sourceLinesIfPresent(node, document) } : {}),
      ...(sourceRangeIfPresent(node) ? { range: sourceRangeIfPresent(node) } : {})
    };
  }

  if (node.type === "thematicBreak") {
    return {
      type: "thematicBreak",
      children: [],
      sourceNodeType: node.type,
      sourceNodeId: sourceNodeId(node),
      ...(sourceLinesIfPresent(node, document) ? { sourceLines: sourceLinesIfPresent(node, document) } : {}),
      ...(sourceRangeIfPresent(node) ? { range: sourceRangeIfPresent(node) } : {})
    };
  }

  if (node.type === "html") {
    return {
      type: "html",
      text: node.value,
      children: [],
      sourceNodeType: node.type,
      sourceNodeId: sourceNodeId(node),
      ...(sourceLinesIfPresent(node, document) ? { sourceLines: sourceLinesIfPresent(node, document) } : {}),
      ...(sourceRangeIfPresent(node) ? { range: sourceRangeIfPresent(node) } : {})
    };
  }

  if (node.type === "table") {
    return {
      type: "table",
      rows: tableRowsFromMdastTable(node),
      rowSources: [],
      children: childrenOf(node).map((child) => toBlockAst(child, document)),
      sourceNodeType: node.type,
      sourceNodeId: sourceNodeId(node),
      ...(sourceLinesIfPresent(node, document) ? { sourceLines: sourceLinesIfPresent(node, document) } : {}),
      ...(sourceRangeIfPresent(node) ? { range: sourceRangeIfPresent(node) } : {})
    };
  }

  return {
    type: "unknown",
    text: textOf(node),
    children: childrenOf(node).map((child) => toBlockAst(child, document)),
    sourceNodeType: node.type,
    sourceNodeId: sourceNodeId(node),
    ...(sourceLinesIfPresent(node, document) ? { sourceLines: sourceLinesIfPresent(node, document) } : {}),
    ...(sourceRangeIfPresent(node) ? { range: sourceRangeIfPresent(node) } : {})
  };
}

export function sectionBodyLines(document: MarkdownDocument, sections: SectionAst[], section: SectionAst): Array<{ text: string; line: number }> {
  const index = sections.indexOf(section);
  const startLine = section.heading.range.start.line + 1;
  const nextSectionLine = sections[index + 1]?.heading.range.start.line ?? document.lines.length + 1;
  return document.lines.slice(startLine - 1, nextSectionLine - 1).map((text, offset) => ({
    text,
    line: startLine + offset
  }));
}

function paragraphBlock(node: Paragraph, document: MarkdownDocument): ParagraphBlockAst {
  return {
    type: "paragraph",
    text: inlineText(node.children as Content[]),
    children: [],
    sourceNodeType: node.type,
    sourceNodeId: sourceNodeId(node),
    ...(sourceLinesIfPresent(node, document) ? { sourceLines: sourceLinesIfPresent(node, document) } : {}),
    ...(sourceRangeIfPresent(node) ? { range: sourceRangeIfPresent(node) } : {})
  };
}

function parseMarkdownTableRows(text: string): string[][] | undefined {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2 || !isMarkdownTableSeparator(lines[1])) {
    return undefined;
  }

  const rows = lines.filter((_, index) => index !== 1).map((line) => parseMarkdownTableCells(line));
  if (rows.length === 0 || rows.some((row) => row.length === 0)) {
    return undefined;
  }
  return rows;
}

function tableRowSources(text: string, node: RootContent | Content): Array<{ cells: string[]; raw: string; range?: SourceRange }> {
  const startLine = node.position?.start.line;
  return text.split(/\r?\n/).map((raw, index) => ({
    cells: parseMarkdownTableCells(raw),
    raw: raw.trim(),
    ...(startLine !== undefined ? { range: { start: { line: startLine + index, column: 1 }, end: { line: startLine + index, column: raw.length + 1 } } } : {})
  })).filter((row, index) => index !== 1 && row.cells.length > 0);
}

function parseMarkdownTableCells(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) {
    return [];
  }
  const withoutEdges = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return withoutEdges.split("|").map((cell) => cell.trim());
}

function isMarkdownTableSeparator(line: string): boolean {
  const cells = parseMarkdownTableCells(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function tableRowsFromMdastTable(node: RootContent | Content): string[][] {
  return childrenOf(node).map((row) => childrenOf(row).map((cell) => textOf(cell)));
}

function listBlock(node: List, document: MarkdownDocument): ListBlockAst {
  return {
    type: "list",
    ordered: Boolean(node.ordered),
    children: node.children.map((child) => listItemBlock(child, document)),
    sourceNodeType: node.type,
    sourceNodeId: sourceNodeId(node),
    ...(sourceLinesIfPresent(node, document) ? { sourceLines: sourceLinesIfPresent(node, document) } : {}),
    ...(sourceRangeIfPresent(node) ? { range: sourceRangeIfPresent(node) } : {})
  };
}

function listItemBlock(node: ListItem, document: MarkdownDocument): ListItemBlockAst {
  const children = node.children.map((child) => toBlockAst(child as BlockContent, document));
  return {
    type: "listItem",
    text: children.map((child) => child.text ?? "").filter(Boolean).join(" "),
    children,
    sourceNodeType: node.type,
    sourceNodeId: sourceNodeId(node),
    ...(sourceLinesIfPresent(node, document) ? { sourceLines: sourceLinesIfPresent(node, document) } : {}),
    ...(sourceRangeIfPresent(node) ? { range: sourceRangeIfPresent(node) } : {})
  };
}

function blockquoteBlock(node: Blockquote, document: MarkdownDocument): BlockquoteBlockAst {
  return {
    type: "blockquote",
    children: node.children.map((child) => toBlockAst(child as BlockContent, document)),
    sourceNodeType: node.type,
    sourceNodeId: sourceNodeId(node),
    ...(sourceLinesIfPresent(node, document) ? { sourceLines: sourceLinesIfPresent(node, document) } : {}),
    ...(sourceRangeIfPresent(node) ? { range: sourceRangeIfPresent(node) } : {})
  };
}

function rangeFromNodes(heading: RootContent, nodes: RootContent[]): SourceRange | undefined {
  const start = heading.position?.start;
  const last = [...nodes].reverse().find((node) => node.position?.end)?.position?.end ?? heading.position?.end;
  if (!start || !last) {
    return undefined;
  }
  return {
    start: sourcePosition(start),
    end: sourcePosition(last)
  };
}

function sourceRange(node: RootContent | Content): SourceRange {
  const range = sourceRangeIfPresent(node);
  if (!range) {
    return {
      start: { line: 1, column: 1 },
      end: { line: 1, column: 1 }
    };
  }
  return range;
}

function sourceRangeIfPresent(node: RootContent | Content): SourceRange | undefined {
  if (!node.position?.start || !node.position.end) {
    return undefined;
  }
  return {
    start: sourcePosition(node.position.start),
    end: sourcePosition(node.position.end)
  };
}

function sourceLinesIfPresent(node: RootContent | Content, document: MarkdownDocument): string[] | undefined {
  const startLine = node.position?.start.line;
  const endLine = node.position?.end.line;
  if (startLine === undefined || endLine === undefined) {
    return undefined;
  }
  return document.lines.slice(startLine - 1, endLine);
}

function sourcePosition(point: { line: number; column: number; offset?: number }): SourcePosition {
  return {
    line: point.line,
    column: point.column,
    ...(point.offset !== undefined ? { offset: point.offset } : {})
  };
}

function sourceNodeId(node: RootContent | Content): string {
  const position = node.position?.start;
  if (!position) {
    return `node:unknown:${node.type}`;
  }
  return `node:${position.line}:${position.column}:${node.type}`;
}

function inlineText(nodes: Content[] | undefined): string {
  return (nodes ?? []).map((node) => textOf(node)).join("");
}

function textOf(node: RootContent | Content): string {
  if ("value" in node && typeof node.value === "string") {
    return node.value;
  }
  return inlineText(childrenOf(node));
}

function childrenOf(node: RootContent | Content): Content[] {
  if ("children" in node && Array.isArray(node.children)) {
    return node.children as Content[];
  }
  return [];
}
