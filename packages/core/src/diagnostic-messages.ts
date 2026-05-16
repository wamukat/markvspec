import type { MarkVSpecDiagnostic, MarkVSpecDiagnosticSeverity } from "./types.js";

export type MarkVSpecDiagnosticCode =
  | "action.process.multipleExecutionDetails"
  | "action.process.mixesExecutionDetailAndImmediateEffects"
  | "action.process.mixesResultClassificationAndImmediateEffects"
  | "action.parallelProcess.caseShouldNotSetStateOrNavigate"
  | "action.process.caseResponseWithoutReceive";

type DiagnosticParams = Record<string, string | number | boolean>;
type DiagnosticTemplate = (params: DiagnosticParams) => string;
type DiagnosticLocale = "en" | "ja";

const diagnosticMessageTemplates: Record<DiagnosticLocale, Record<MarkVSpecDiagnosticCode, DiagnosticTemplate>> = {
  en: {
    "action.process.multipleExecutionDetails": (params) =>
      `Action ${param(params, "actionId")} process step ${param(params, "stepLabel")} contains multiple execution detail blocks (${param(params, "details")}). Split them into separate Process steps.`,
    "action.process.mixesExecutionDetailAndImmediateEffects": (params) =>
      `Action ${param(params, "actionId")} process step ${param(params, "stepLabel")} mixes an execution detail with direct immediate effects. Move effects under a case or split the Process.`,
    "action.process.mixesResultClassificationAndImmediateEffects": (params) =>
      `Action ${param(params, "actionId")} process step ${param(params, "stepLabel")} mixes result classification with direct immediate effects. Use case Effects for classified results.`,
    "action.parallelProcess.caseShouldNotSetStateOrNavigate": (params) =>
      `Action ${param(params, "actionId")} parallel process step ${param(params, "stepName")} case ${param(params, "result")} should not set state or navigate. Use a Resolve step for final transitions.`,
    "action.process.caseResponseWithoutReceive": (params) =>
      `Action ${param(params, "actionId")} process step ${param(params, "stepLabel")} case ${param(params, "result")} uses response without receiving a response. Use description for validation, branching, sent, send-failed, or other non-response case explanations.`
  },
  ja: {
    "action.process.multipleExecutionDetails": (params) =>
      `Action ${param(params, "actionId")} の Process step ${param(params, "stepLabel")} に複数の実行 detail (${param(params, "details")}) があります。別々の Process step に分けてください。`,
    "action.process.mixesExecutionDetailAndImmediateEffects": (params) =>
      `Action ${param(params, "actionId")} の Process step ${param(params, "stepLabel")} で、実行 detail と直接の immediate effect が混在しています。effect は case 配下へ移すか、Process を分けてください。`,
    "action.process.mixesResultClassificationAndImmediateEffects": (params) =>
      `Action ${param(params, "actionId")} の Process step ${param(params, "stepLabel")} で、result 分類と直接の immediate effect が混在しています。分類された result には case Effects を使ってください。`,
    "action.parallelProcess.caseShouldNotSetStateOrNavigate": (params) =>
      `Action ${param(params, "actionId")} の parallel Process step ${param(params, "stepName")} case ${param(params, "result")} では state や navigate を設定しないでください。最終遷移は Resolve step に任せてください。`,
    "action.process.caseResponseWithoutReceive": (params) =>
      `Action ${param(params, "actionId")} の Process step ${param(params, "stepLabel")} case ${param(params, "result")} は response を受信していないのに response を使っています。validation、branching、sent、send-failed など response 以外の説明には description を使ってください。`
  }
};

export function createMarkVSpecDiagnostic(
  severity: MarkVSpecDiagnosticSeverity,
  code: MarkVSpecDiagnosticCode,
  params: DiagnosticParams,
  line?: number
): MarkVSpecDiagnostic {
  return {
    severity,
    code,
    params,
    message: renderDiagnosticMessage(code, params, "en"),
    line
  };
}

export function renderDiagnosticMessageForLocale(diagnostic: MarkVSpecDiagnostic, locale: string | undefined): string {
  if (!isMarkVSpecDiagnosticCode(diagnostic.code)) {
    return diagnostic.message;
  }
  return renderDiagnosticMessage(diagnostic.code, diagnostic.params ?? {}, locale);
}

export function supportedDiagnosticMessageCodes(): MarkVSpecDiagnosticCode[] {
  return Object.keys(diagnosticMessageTemplates.en) as MarkVSpecDiagnosticCode[];
}

function renderDiagnosticMessage(code: MarkVSpecDiagnosticCode, params: DiagnosticParams, locale: string | undefined): string {
  return diagnosticMessageTemplates[diagnosticLocale(locale)][code](params);
}

function diagnosticLocale(locale: string | undefined): DiagnosticLocale {
  return locale === "ja" ? "ja" : "en";
}

function isMarkVSpecDiagnosticCode(code: string | undefined): code is MarkVSpecDiagnosticCode {
  return Boolean(code && code in diagnosticMessageTemplates.en);
}

function param(params: DiagnosticParams, key: string): string {
  const value = params[key];
  return value === undefined ? "" : String(value);
}
