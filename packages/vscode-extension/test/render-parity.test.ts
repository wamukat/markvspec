import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import test from "node:test";
import { parseMarkVSpec, renderMarkVSpecHtml } from "@markvspec/core";
import { renderStaticDesignDocumentHtml } from "@markvspec/document-renderer";
import { renderDesignDocumentHtml } from "../src/extension.js";

interface TableSnapshot {
  readonly index: number;
  readonly heading: string;
  readonly headers: string[];
  readonly rows: string[][];
  readonly refs: RefSnapshot[];
}

interface RefSnapshot {
  readonly cell: string;
  readonly category: string;
  readonly refId: string;
  readonly marker: string;
  readonly detailIds: string[];
  readonly text: string;
}

const extensionRoot = resolve(".");
const examplesRoot = resolve(extensionRoot, "../../examples");

test("keeps static/export design document spec table semantics aligned with VS Code across examples", () => {
  const mismatches: string[] = [];

  for (const sourcePath of exampleFiles(examplesRoot)) {
    const source = readFileSync(sourcePath, "utf8");
    const result = parseMarkVSpec(source);
    const previewHtml = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
    const staticHtml = renderStaticDesignDocumentHtml(result);
    const previewTables = comparableSpecTables(extractSpecTableSnapshots(previewHtml));
    const staticTables = comparableSpecTables(extractSpecTableSnapshots(staticHtml));
    const sourceLabel = relative(extensionRoot, sourcePath);

    auditReferenceDisplay(mismatches, sourceLabel, "vscode", previewTables);
    auditReferenceDisplay(mismatches, sourceLabel, "static", staticTables);
  }

  assert.deepEqual(mismatches, []);
});

function exampleFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? exampleFiles(path)
        : entry.isFile() && entry.name.endsWith(".vspec.md") && !basename(entry.name).includes(".partial.")
          ? [path]
          : [];
    })
    .sort();
}

function comparableSpecTables(tables: TableSnapshot[]): TableSnapshot[] {
  return tables.filter((table) => {
    if (table.headers.length === 0) {
      return false;
    }
    if (table.headers.length === 2 && table.headers[0] === "Field" && table.headers[1] === "Value") {
      return false;
    }
    if (table.headers.join("|") === "Kind|ID|Title|Status") {
      return false;
    }
    return true;
  });
}

function auditReferenceDisplay(mismatches: string[], sourceLabel: string, renderer: "static" | "vscode", tables: TableSnapshot[]): void {
  for (const table of tables) {
    const markerColumn = table.headers[0] ?? "";
    if (markerColumn.includes("Marker/ID") || markerColumn.includes("番号/ID")) {
      for (const ref of table.refs.filter((candidate) => candidate.cell === candidate.text)) {
        if (ref.category === "element" && !ref.detailIds.includes(ref.refId)) {
          mismatches.push(`${sourceLabel} ${renderer} ${table.heading}: element Marker/ID ref ${ref.refId} renders without detail id: ${JSON.stringify(ref)}`);
        }
      }
    }

    if (table.heading === "Layouts" || table.heading === "レイアウト") {
      for (const ref of table.refs) {
        if (table.rows.some((row) => row.slice(2, 3).includes(ref.cell))) {
          mismatches.push(`${sourceLabel} ${renderer} Layouts: Setting/Items should render internal child references as detail ids, not ref chips: ${JSON.stringify(ref)}`);
        }
      }
    }
  }
}

function extractSpecTableSnapshots(html: string): TableSnapshot[] {
  const tables: TableSnapshot[] = [];
  const tablePattern = /<table class="spec-table">[\s\S]*?<\/table>/gu;
  for (const match of html.matchAll(tablePattern)) {
    const tableHtml = match[0];
    const tableIndex = match.index ?? 0;
    tables.push({
      index: tables.length,
      heading: nearestHeading(html.slice(0, tableIndex)),
      headers: [...tableHtml.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gu)].map((header) => normalizeText(header[1] ?? "")),
      rows: extractTableRows(tableHtml),
      refs: extractRefs(tableHtml)
    });
  }
  return tables;
}

function nearestHeading(htmlBeforeTable: string): string {
  const headings = [...htmlBeforeTable.matchAll(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gu)];
  const heading = headings.at(-1)?.[1] ?? "";
  return normalizeHeading(heading);
}

function extractTableRows(tableHtml: string): string[][] {
  return [...tableHtml.matchAll(/<tbody>([\s\S]*?)<\/tbody>/gu)]
    .flatMap((body) => [...(body[1] ?? "").matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gu)])
    .map((row) => [...(row[1] ?? "").matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gu)].map((cell) => normalizeText(cell[1] ?? "")));
}

function extractRefs(tableHtml: string): RefSnapshot[] {
  return [...tableHtml.matchAll(/<(?:a|span)\b(?=[^>]*\bdata-mm-ref-id="([^"]+)")[^>]*class="([^"]*\bmm-ref-chip-[^"]*)"[^>]*>[\s\S]*?<\/(?:a|span)>/gu)]
    .map((match) => {
      const refHtml = match[0];
      const refId = match[1] ?? "";
      const classNames = match[2] ?? "";
      const category = /\bmm-ref-chip-([A-Za-z0-9_-]+)/u.exec(classNames)?.[1] ?? "";
      return {
        cell: containingCellText(tableHtml, match.index ?? 0),
        category,
        refId,
        marker: normalizeText(/<code\b[^>]*\bclass="[^"]*\bmm-marker\b[^"]*"[^>]*>([\s\S]*?)<\/code>/u.exec(refHtml)?.[1] ?? ""),
        detailIds: [...refHtml.matchAll(/<span class="mm-detail-ref-id">([\s\S]*?)<\/span>/gu)].map((detail) => normalizeText(detail[1] ?? "")),
        text: normalizeText(refHtml)
      };
    });
}

function containingCellText(tableHtml: string, refIndex: number): string {
  const cellStart = tableHtml.lastIndexOf("<td", refIndex);
  if (cellStart === -1) {
    return "";
  }
  const cellEnd = tableHtml.indexOf("</td>", refIndex);
  if (cellEnd === -1) {
    return "";
  }
  return normalizeText(tableHtml.slice(cellStart, cellEnd + "</td>".length));
}

function normalizeHeading(value: string): string {
  return normalizeText(value)
    .replace(/^\d+(?:\.\d+)*\.\s*/u, "")
    .replace(/^State:\s*/u, "State: ");
}

function normalizeText(value: string): string {
  return decodeBasicEntities(
    value
      .replace(/<svg\b[\s\S]*?<\/svg>/gu, "")
      .replace(/<[^>]+>/gu, " ")
      .replace(/\s+/gu, " ")
      .trim()
  );
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/gu, " ")
    .replace(/&amp;/gu, "&")
    .replace(/&lt;/gu, "<")
    .replace(/&gt;/gu, ">")
    .replace(/&quot;/gu, "\"")
    .replace(/&#39;/gu, "'");
}
