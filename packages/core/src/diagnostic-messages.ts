import type { MarkVSpecDiagnostic, MarkVSpecDiagnosticSeverity } from "./types.js";

export type MarkVSpecDiagnosticCode =
  | "frontMatter.missingYaml"
  | "frontMatter.missingRequired"
  | "section.recommendedOrder"
  | "layout.unsupportedItemsEntry"
  | "element.unknownType"
  | "element.unsupportedProperty"
  | "element.unsupportedLegacyBind"
  | "action.missingTrigger"
  | "action.invalidTrigger"
  | "action.process.multipleExecutionDetails"
  | "action.process.mixesExecutionDetailAndImmediateEffects"
  | "action.process.mixesResultClassificationAndImmediateEffects"
  | "action.parallelProcess.caseShouldNotSetStateOrNavigate"
  | "action.process.caseResponseWithoutReceive"
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
    "layout.unsupportedItemsEntry": (params) =>
      `Layout ${param(params, "layoutId")} has unsupported Items entry: ${param(params, "entry")}.`,
    "element.unknownType": (params) =>
      `Unknown element type: ${param(params, "type")}.`,
    "element.unsupportedProperty": (params) =>
      `Element ${param(params, "elementId")} of type ${param(params, "type")} uses unsupported property ${param(params, "property")}.`,
    "element.unsupportedLegacyBind": (params) =>
      `Element ${param(params, "elementId")} uses unsupported legacy bind property. Use value/source for value origin, initial value for initial display, and E-*.value in request params instead.`,
    "action.missingTrigger": (params) =>
      `Action ${param(params, "actionId")} has no trigger. Add a Triggered block with E-*.event, A-ActionId.P-marker.response, screen.load, or partial.render.`,
    "action.invalidTrigger": (params) =>
      `Action ${param(params, "actionId")} has invalid trigger ${param(params, "trigger")}. Expected E-*.event, A-ActionId.P-marker.response, screen.load, or partial.render.`,
    "action.process.multipleExecutionDetails": (params) =>
      `Action ${param(params, "actionId")} process step ${param(params, "stepLabel")} contains multiple execution detail blocks (${param(params, "details")}). Split them into separate Process steps.`,
    "action.process.mixesExecutionDetailAndImmediateEffects": (params) =>
      `Action ${param(params, "actionId")} process step ${param(params, "stepLabel")} mixes an execution detail with direct immediate effects. Move effects under a case or split the Process.`,
    "action.process.mixesResultClassificationAndImmediateEffects": (params) =>
      `Action ${param(params, "actionId")} process step ${param(params, "stepLabel")} mixes result classification with direct immediate effects. Use case Effects for classified results.`,
    "action.parallelProcess.caseShouldNotSetStateOrNavigate": (params) =>
      `Action ${param(params, "actionId")} parallel process step ${param(params, "stepName")} case ${param(params, "result")} should not set state or navigate. Use a Resolve step for final transitions.`,
    "action.process.caseResponseWithoutReceive": (params) =>
      `Action ${param(params, "actionId")} process step ${param(params, "stepLabel")} case ${param(params, "result")} uses response without receiving a response. Use description for validation, branching, sent, send-failed, or other non-response case explanations.`,
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
    "layout.unsupportedItemsEntry": (params) =>
      `Layout ${param(params, "layoutId")} の Items entry ${param(params, "entry")} はサポートされていません。Items には L-* または E-* を指定してください。`,
    "element.unknownType": (params) =>
      `Element type ${param(params, "type")} は未定義です。Button/Input/Text/Table などのサポート済み type を使ってください。`,
    "element.unsupportedProperty": (params) =>
      `Element ${param(params, "elementId")} (${param(params, "type")}) の property ${param(params, "property")} はサポートされていません。低レベルな style や未定義 property は削除し、対応する canonical property を使ってください。`,
    "element.unsupportedLegacyBind": (params) =>
      `Element ${param(params, "elementId")} はサポート対象外の旧 bind property を使用しています。入力値の由来は value/source、初期表示は initial value、送信値参照は E-*.value を使ってください。`,
    "action.missingTrigger": (params) =>
      `Action ${param(params, "actionId")} に trigger がありません。Triggered block に E-*.event、A-ActionId.P-marker.response、screen.load、partial.render のいずれかを追加してください。`,
    "action.invalidTrigger": (params) =>
      `Action ${param(params, "actionId")} の trigger ${param(params, "trigger")} は不正です。E-*.event、A-ActionId.P-marker.response、screen.load、partial.render のいずれかにしてください。`,
    "action.process.multipleExecutionDetails": (params) =>
      `Action ${param(params, "actionId")} の Process step ${param(params, "stepLabel")} に複数の実行 detail (${param(params, "details")}) があります。別々の Process step に分けてください。`,
    "action.process.mixesExecutionDetailAndImmediateEffects": (params) =>
      `Action ${param(params, "actionId")} の Process step ${param(params, "stepLabel")} で、実行 detail と直接の immediate effect が混在しています。effect は case 配下へ移すか、Process を分けてください。`,
    "action.process.mixesResultClassificationAndImmediateEffects": (params) =>
      `Action ${param(params, "actionId")} の Process step ${param(params, "stepLabel")} で、result 分類と直接の immediate effect が混在しています。分類された result には case Effects を使ってください。`,
    "action.parallelProcess.caseShouldNotSetStateOrNavigate": (params) =>
      `Action ${param(params, "actionId")} の parallel Process step ${param(params, "stepName")} case ${param(params, "result")} では state や navigate を設定しないでください。最終遷移は Resolve step に任せてください。`,
    "action.process.caseResponseWithoutReceive": (params) =>
      `Action ${param(params, "actionId")} の Process step ${param(params, "stepLabel")} case ${param(params, "result")} は response を受信していないのに response を使っています。validation、branching、sent、send-failed など response 以外の説明には description を使ってください。`,
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
