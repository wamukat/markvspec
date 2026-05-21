import { createMarkVSpecDiagnostic } from "./diagnostic-messages.js";
import type { MarkVSpecDiagnostic, SourceLocation } from "./types.js";

export interface UnrepresentedSourceTextInput {
  text: string;
  location: SourceLocation;
}

export interface UnsupportedStructuredItemInput {
  context: string;
  text: string;
  location: SourceLocation;
  allowed?: string;
}

export function createUnrepresentedSourceTextDiagnostic(
  input: UnrepresentedSourceTextInput
): MarkVSpecDiagnostic {
  return createMarkVSpecDiagnostic(
    "warning",
    "unrepresented-source-text",
    { text: input.text },
    input.location.line
  );
}

export function createUnsupportedStructuredItemDiagnostic(
  input: UnsupportedStructuredItemInput
): MarkVSpecDiagnostic {
  return {
    severity: "warning",
    message: `Unknown structured item in ${input.context}: ${input.text}. This item is not represented in MarkVSpec output.${input.allowed ? ` Use ${input.allowed}.` : ""}`,
    line: input.location.line
  };
}
