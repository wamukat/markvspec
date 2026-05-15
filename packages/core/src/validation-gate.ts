import type {
  MarkVSpecDiagnostic,
  MarkVSpecValidationGateOptions,
  MarkVSpecValidationGateResult
} from "./types.js";

export function evaluateMarkVSpecDiagnostics(
  diagnostics: readonly MarkVSpecDiagnostic[],
  options: MarkVSpecValidationGateOptions = {}
): MarkVSpecValidationGateResult {
  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const warningCount = diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length;
  const passed = errorCount === 0 && (!options.failOnWarnings || warningCount === 0);

  return {
    diagnostics: [...diagnostics],
    errorCount,
    warningCount,
    passed,
    exitCode: passed ? 0 : 1
  };
}
