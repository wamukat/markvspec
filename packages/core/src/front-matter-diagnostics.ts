import type { MarkdownDocument } from "./markdown-document.js";
import type { MarkVSpecDiagnostic, SourceLocation } from "./types.js";

export function addUnknownFrontMatterDiagnostics(
  document: MarkdownDocument,
  knownKeys: ReadonlySet<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const [key, value] of Object.entries(document.frontMatterData)) {
    if (knownKeys.has(key)) {
      continue;
    }
    const location = frontMatterKeyLocation(document, key);
    if (isScalarValue(value)) {
      diagnostics.push({
        severity: "info",
        code: "frontMatter.representedExtension",
        message: `Extension item in Front Matter: ${key}: ${String(value)}. This is not a standard MarkVSpec key, but it is preserved in Front Matter metadata.`,
        line: location.line
      });
      continue;
    }
    diagnostics.push({
      severity: "warning",
      code: "frontMatter.unsupportedExtension",
      message: `Unsupported Front Matter extension field ${key}. Unknown Front Matter fields must use scalar values to be preserved.`,
      line: location.line
    });
  }
}

function frontMatterKeyLocation(document: MarkdownDocument, key: string): SourceLocation {
  for (let index = 1; index < document.bodyStartIndex - 1; index += 1) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*):\s*/u.exec(document.lines[index] ?? "");
    if (match?.[1] === key) {
      return { line: index + 1 };
    }
  }
  return { line: 1 };
}

function isScalarValue(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
