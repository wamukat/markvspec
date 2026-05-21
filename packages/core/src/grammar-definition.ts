import type { MarkVSpecDiagnosticSeverity } from "./types.js";

export type GrammarItemClassification = "canonical" | "represented-extension" | "non-canonical" | "unsupported";

export interface GrammarStructuredItemDefinition {
  key: string;
  classification: GrammarItemClassification;
  represented: boolean;
  diagnosticSeverity?: MarkVSpecDiagnosticSeverity;
  description: {
    en: string;
    ja: string;
  };
}

export interface GrammarSectionDefinition {
  kind: GrammarSectionKind;
  title: string;
  order: number;
  heading: {
    pattern: string;
    en: string;
    ja: string;
  };
}

export type GrammarSectionKind =
  | "States"
  | "Layout"
  | "Slot"
  | "Slots"
  | "Elements"
  | "FormGroups"
  | "Events"
  | "Actions"
  | "ViewContext"
  | "ViewContextSamples"
  | "PreviewScenarios"
  | "Validations"
  | "FieldValidations"
  | "CrossFieldValidations"
  | "BusinessRules"
  | "ErrorCodes"
  | "HistoryFields"
  | "History";

export const grammarSectionDefinitions = [
  section("States", "States", 1, "\"States\""),
  section("Layout", "Layout", 2, "\"Layout\" | \"Layout:\" viewport"),
  section("Slot", "Slot", 2, "\"Slot:\" slot_name [\":\" viewport]"),
  section("Slots", "Slots", 3, "\"Slots\""),
  section("Elements", "Elements", 4, "\"Elements\""),
  section("FormGroups", "Form Groups", 5, "\"Form Groups\""),
  section("Events", "Events", 6, "\"Events\""),
  section("Actions", "Actions", 7, "\"Actions\""),
  section("ViewContext", "View Context", 8, "\"View Context\""),
  section("ViewContextSamples", "View Context Samples", 9, "\"View Context Samples\""),
  section("PreviewScenarios", "Preview Scenarios", 10, "\"Preview Scenarios\""),
  section("FieldValidations", "Field Validations", 11, "\"Field Validations\""),
  section("CrossFieldValidations", "Cross-field Validations", 12, "\"Cross-field Validations\""),
  section("Validations", "Validations", 13, "\"Validations\""),
  section("BusinessRules", "Business Rules", 14, "\"Business Rules\""),
  section("ErrorCodes", "Error Codes", 15, "\"Error Codes\""),
  section("HistoryFields", "History Fields", 16, "\"History Fields\""),
  section("History", "History", 17, "\"History\"")
] as const satisfies readonly GrammarSectionDefinition[];

export const grammarSectionOrderText = "States, Layout:<viewport>/Slot:<name>, Slots, Elements, Form Groups, Events, Actions, View Context, View Context Samples, Preview Scenarios, Field Validations, Cross-field Validations, Validations, Business Rules, Error Codes, History Fields, History";

export const actionTopLevelItemDefinitions = [
  item("From", "canonical", true, "Action source states.", "Action の遷移元 state。"),
  item("Process Pn:", "canonical", true, "Marked process step.", "marker 付き process step。"),
  item("Otherwise", "canonical", true, "Fallback outcome.", "fallback outcome。"),
  item("Triggered", "non-canonical", false, "Legacy trigger wrapper. Use Element action or Events.", "legacy trigger wrapper。Element の action または Events を使います。")
] as const satisfies readonly GrammarStructuredItemDefinition[];

export const actionProcessDetailItemDefinitions = [
  item("request", "canonical", true, "HTTP request block.", "HTTP request block。"),
  item("receive", "canonical", true, "External result block.", "外部 result block。"),
  item("sync", "canonical", true, "Synchronous service or calculation detail.", "同期 service / calculation detail。"),
  item("server", "canonical", true, "Server-side service call detail. HTTP method/path belongs under request.", "server-side service call detail。HTTP method/path は request 配下に置きます。"),
  item("response", "canonical", true, "Response classification detail.", "response classification detail。"),
  item("validation", "canonical", true, "Validation process detail.", "validation process detail。"),
  item("when", "canonical", true, "Process guard.", "process guard。"),
  item("skip when", "canonical", true, "Skip guard.", "skip guard。"),
  item("parallel", "canonical", true, "Parallel process group.", "parallel process group。"),
  item("resolve", "canonical", true, "Resolve process group.", "resolve process group。"),
  item("case", "canonical", true, "Process result branch.", "process result branch。"),
  item("state", "canonical", true, "Immediate state transition effect.", "immediate state transition effect。"),
  item("navigate", "canonical", true, "Immediate navigation effect.", "immediate navigation effect。"),
  item("display", "canonical", true, "Display effect block.", "display effect block。"),
  item("update", "canonical", true, "Partial update effect block.", "partial update effect block。"),
  item("model", "canonical", true, "Structured model side effect.", "structured model side effect。"),
  item("view", "canonical", true, "Structured view side effect.", "structured view side effect。"),
  item("stop", "canonical", true, "Process case flow directive.", "process case flow directive。"),
  item("continue", "canonical", true, "Process case flow directive.", "process case flow directive。"),
  item("Effects", "non-canonical", false, "Legacy effect wrapper.", "legacy effect wrapper。"),
  item("input", "non-canonical", false, "Old process wrapper label.", "古い process wrapper label。"),
  item("inputs", "non-canonical", false, "Old process wrapper label.", "古い process wrapper label。"),
  item("condition", "non-canonical", false, "Old process wrapper label.", "古い process wrapper label。"),
  item("conditions", "non-canonical", false, "Old process wrapper label.", "古い process wrapper label。"),
  item("cases", "non-canonical", false, "Old process wrapper label.", "古い process wrapper label。")
] as const satisfies readonly GrammarStructuredItemDefinition[];

export const processDetailBlockKeys = new Set(["request", "server", "sync", "response", "validation"]);
export const processSyntaxOnlyBlockKeys = new Set(["content", "display", "input", "params", "receive", "result", "update"]);
export const nonCanonicalProcessBlockKeys = new Set(
  actionProcessDetailItemDefinitions
    .filter((definition) => definition.classification === "non-canonical")
    .map((definition) => normalizeGrammarKey(definition.key))
);

export const commonElementPropertyKeys = [
  "marker",
  "label",
  "label src",
  "placeholder src",
  "description",
  "help",
  "help src",
  "hint",
  "message",
  "message src",
  "sample",
  "source",
  "purpose",
  "text",
  "value",
  "src",
  "format",
  "initial value",
  "required",
  "readonly",
  "optional",
  "visible when",
  "hidden when",
  "disabled when",
  "variant",
  "tone",
  "validation",
  "input rule",
  "error text",
  "action",
  "action event"
] as const;

export const layoutGroupMetadataPropertyKeys = [
  "active when",
  "align",
  "columns",
  "description",
  "disabled when",
  "enabled when",
  "gap",
  "hidden when",
  "justify",
  "marker",
  "overlay",
  "partial",
  "purpose",
  "selected when",
  "variant",
  "visible when",
] as const;

export const slotDefinitionPropertyKeys = ["required", "default", "purpose", "description"] as const;

export function normalizeGrammarKey(value: string): string {
  return value.trim().replace(/:$/, "").trim().toLowerCase();
}

export function grammarSectionForTitle(title: string): { kind: GrammarSectionKind; viewport?: string; slotName?: string } | undefined {
  const layout = /^Layout:\s*(.*?)\s*$/u.exec(title);
  if (layout) {
    return { kind: "Layout", viewport: layout[1].trim() };
  }

  const slot = /^Slot:\s*([^:]*?)(?:\s*:\s*(.*?))?\s*$/u.exec(title);
  if (slot) {
    const slotName = slot[1].trim();
    const viewport = slot[2]?.trim();
    return {
      kind: "Slot",
      slotName,
      ...(viewport ? { viewport } : {})
    };
  }

  const definition = grammarSectionDefinitions.find((candidate) => candidate.title === title);
  if (!definition && title === "履歴フィールド") {
    return { kind: "HistoryFields" };
  }
  return definition ? { kind: definition.kind } : undefined;
}

export function grammarSectionOrderRank(kind: string): number {
  return grammarSectionDefinitions.find((definition) => definition.kind === kind)?.order ?? 0;
}

export function grammarStructuredItem(
  definitions: readonly GrammarStructuredItemDefinition[],
  key: string
): GrammarStructuredItemDefinition | undefined {
  const normalized = normalizeGrammarKey(key);
  return definitions.find((definition) => normalizeGrammarKey(definition.key) === normalized);
}

function section(kind: GrammarSectionKind, title: string, order: number, pattern: string): GrammarSectionDefinition {
  return {
    kind,
    title,
    order,
    heading: {
      pattern,
      en: pattern,
      ja: pattern
    }
  };
}

function item(
  key: string,
  classification: GrammarItemClassification,
  represented: boolean,
  en: string,
  ja: string
): GrammarStructuredItemDefinition {
  return {
    key,
    classification,
    represented,
    diagnosticSeverity: classification === "canonical" ? undefined : classification === "represented-extension" ? "info" : "warning",
    description: { en, ja }
  };
}
