import type { MarkVSpecDiagnostic, MarkVSpecDiagnosticSeverity } from "./types.js";

export type MarkVSpecDiagnosticCode =
  | "frontMatter.missingYaml"
  | "frontMatter.missingRequired"
  | "section.recommendedOrder"
  | "layout.missingViewport"
  | "layout.groupIgnoredWithoutViewport"
  | "layout.unsupportedItemsEntry"
  | "element.unknownType"
  | "action.missingTrigger"
  | "action.invalidTrigger"
  | "action.process.multipleExecutionDetails"
  | "action.process.mixesExecutionDetailAndImmediateEffects"
  | "action.process.mixesResultClassificationAndImmediateEffects"
  | "action.parallelProcess.caseShouldNotSetStateOrNavigate"
  | "action.process.caseResponseWithoutReceive"
  | "unrepresented-source-text"
  | "partial.referenceMissing"
  | "validation.ruleMissingElement"
  | "previewScenario.missingState"
  | "previewScenario.samplesMissingElement";

type DiagnosticParams = Record<string, string | number | boolean>;
type DiagnosticTemplate = (params: DiagnosticParams) => string;
type DiagnosticLocale = "en" | "ja";

const diagnosticMessageTemplates: Record<DiagnosticLocale, Record<MarkVSpecDiagnosticCode, DiagnosticTemplate>> = {
  en: {
    "frontMatter.missingYaml": () =>
      "Missing YAML Front Matter.",
    "frontMatter.missingRequired": (params) =>
      `Missing required Front Matter field: ${param(params, "field")}.`,
    "section.recommendedOrder": (params) =>
      `Section ## ${param(params, "section")} appears after a later section. Recommended order is ${param(params, "order")}.`,
    "layout.missingViewport": () =>
      "Layout section must specify a viewport, for example ## Layout: mobile.",
    "layout.groupIgnoredWithoutViewport": () =>
      "Layout group is ignored because its Layout section has no viewport.",
    "layout.unsupportedItemsEntry": (params) =>
      `Layout ${param(params, "layoutId")} has unsupported Items entry: ${param(params, "entry")}.`,
    "element.unknownType": (params) =>
      `Unknown element type: ${param(params, "type")}.`,
    "action.missingTrigger": (params) =>
      `Action ${param(params, "actionId")} has no trigger. Add Element action:, a ## Events entry with page.load or partial.render, or receive A-ActionId.P-marker.response.`,
    "action.invalidTrigger": (params) =>
      `Action ${param(params, "actionId")} has invalid trigger ${param(params, "trigger")}. Expected Element action:, ## Events page.load or partial.render, or A-ActionId.P-marker.response.`,
    "action.process.multipleExecutionDetails": (params) =>
      `Action ${param(params, "actionId")} process step ${param(params, "stepLabel")} contains multiple execution detail blocks (${param(params, "details")}). Split them into separate Process steps.`,
    "action.process.mixesExecutionDetailAndImmediateEffects": (params) =>
      `Action ${param(params, "actionId")} process step ${param(params, "stepLabel")} mixes an execution detail with direct immediate effects. Move effects under a case or split the Process.`,
    "action.process.mixesResultClassificationAndImmediateEffects": (params) =>
      `Action ${param(params, "actionId")} process step ${param(params, "stepLabel")} mixes result classification with direct immediate effects. Put effects under the classified case.`,
    "action.parallelProcess.caseShouldNotSetStateOrNavigate": (params) =>
      `Action ${param(params, "actionId")} parallel process step ${param(params, "stepName")} case ${param(params, "result")} should not set state or navigate. Use a Resolve step for final transitions.`,
    "action.process.caseResponseWithoutReceive": (params) =>
      `Action ${param(params, "actionId")} process step ${param(params, "stepLabel")} case ${param(params, "result")} uses response without receiving a response. Use description for validation, branching, sent, send-failed, or other non-response case explanations.`,
    "unrepresented-source-text": (params) =>
      `This source line is not represented in MarkVSpec output: ${param(params, "text")}. Move it to Notes/overview or a supported property, or add DSL support for this kind of text.`,
    "partial.referenceMissing": (params) =>
      `Partial reference ${param(params, "partialId")} is not defined in Front Matter references.partials.`,
    "validation.ruleMissingElement": (params) =>
      `Validation ${param(params, "validationId")} rule ${param(params, "ruleName")} references missing element ${param(params, "elementId")}.`,
    "previewScenario.missingState": (params) =>
      `Preview Scenario ${param(params, "scenario")} must specify state.`,
    "previewScenario.samplesMissingElement": (params) =>
      `Preview Scenario ${param(params, "scenario")} samples references missing element ${param(params, "elementId")}.`
  },
  ja: {
    "frontMatter.missingYaml": () =>
      "YAML Front Matter がありません。ファイル先頭に --- で囲んだ id/type/title を追加してください。",
    "frontMatter.missingRequired": (params) =>
      `必須 Front Matter field ${param(params, "field")} がありません。YAML Front Matter に ${param(params, "field")}: ... を追加してください。`,
    "section.recommendedOrder": (params) =>
      `Section ## ${param(params, "section")} が推奨順より後にあります。推奨順は ${param(params, "order")} です。`,
    "layout.missingViewport": () =>
      "Layout section に viewport がありません。## Layout: mobile のように viewport を指定してください。",
    "layout.groupIgnoredWithoutViewport": () =>
      "Layout section に viewport がないため、この Layout group は無視されます。親 section を ## Layout: mobile のように直してください。",
    "layout.unsupportedItemsEntry": (params) =>
      `Layout ${param(params, "layoutId")} の Items entry ${param(params, "entry")} はサポートされていません。Items には L-* または E-* を指定してください。`,
    "element.unknownType": (params) =>
      `Element type ${param(params, "type")} は未定義です。Button/Input/Text/Table などのサポート済み type を使ってください。`,
    "action.missingTrigger": (params) =>
      `Action ${param(params, "actionId")} に trigger がありません。Element action:、## Events の page.load / partial.render、または receive A-ActionId.P-marker.response を追加してください。`,
    "action.invalidTrigger": (params) =>
      `Action ${param(params, "actionId")} の trigger ${param(params, "trigger")} は不正です。Element action:、## Events の page.load / partial.render、または A-ActionId.P-marker.response のいずれかにしてください。`,
    "action.process.multipleExecutionDetails": (params) =>
      `Action ${param(params, "actionId")} の Process step ${param(params, "stepLabel")} に複数の実行 detail (${param(params, "details")}) があります。別々の Process step に分けてください。`,
    "action.process.mixesExecutionDetailAndImmediateEffects": (params) =>
      `Action ${param(params, "actionId")} の Process step ${param(params, "stepLabel")} で、実行 detail と直接の immediate effect が混在しています。effect は case 配下へ移すか、Process を分けてください。`,
    "action.process.mixesResultClassificationAndImmediateEffects": (params) =>
      `Action ${param(params, "actionId")} の Process step ${param(params, "stepLabel")} で、result 分類と直接の immediate effect が混在しています。effect は分類された case 配下へ移してください。`,
    "action.parallelProcess.caseShouldNotSetStateOrNavigate": (params) =>
      `Action ${param(params, "actionId")} の parallel Process step ${param(params, "stepName")} case ${param(params, "result")} では state や navigate を設定しないでください。最終遷移は Resolve step に任せてください。`,
    "action.process.caseResponseWithoutReceive": (params) =>
      `Action ${param(params, "actionId")} の Process step ${param(params, "stepLabel")} case ${param(params, "result")} は response を受信していないのに response を使っています。validation、branching、sent、send-failed など response 以外の説明には description を使ってください。`,
    "unrepresented-source-text": (params) =>
      `この source line は MarkVSpec の出力に表現されていません: ${param(params, "text")}。Notes/overview またはサポート済み property に移すか、この種類の text に対する DSL support を追加してください。`,
    "partial.referenceMissing": (params) =>
      `Partial reference ${param(params, "partialId")} が Front Matter references.partials に定義されていません。references.partials に ${param(params, "partialId")}: <path> を追加してください。`,
    "validation.ruleMissingElement": (params) =>
      `Validation ${param(params, "validationId")} の rule ${param(params, "ruleName")} が存在しない element ${param(params, "elementId")} を参照しています。target を既存の E-* に直してください。`,
    "previewScenario.missingState": (params) =>
      `Preview Scenario ${param(params, "scenario")} に state がありません。- state: <state-name> を追加してください。`,
    "previewScenario.samplesMissingElement": (params) =>
      `Preview Scenario ${param(params, "scenario")} の samples が存在しない element ${param(params, "elementId")} を参照しています。samples の対象を既存の E-* に直してください。`
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
