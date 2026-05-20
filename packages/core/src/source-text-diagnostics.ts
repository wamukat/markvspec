import { createMarkVSpecDiagnostic } from "./diagnostic-messages.js";
import type { MarkVSpecDiagnostic, SourceLocation } from "./types.js";

export interface UnrepresentedSourceTextInput {
  text: string;
  location: SourceLocation;
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
