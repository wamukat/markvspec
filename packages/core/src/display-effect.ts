import { isInputElementType } from "./element-validator.js";
import {
  elementIdPattern,
  formGroupIdPattern,
  idNamePattern,
  isLocalId,
  isPresentationPanelId
} from "./ids.js";
import { propertyFirstString } from "./property-accessor.js";
import type { MarkVSpecElement, MarkVSpecParseResult } from "./types.js";

export type DisplayMessageSourceKind = "validation" | "business-rule";

export interface DisplayMessageReference {
  readonly sourceId: string;
  readonly sourceKind: DisplayMessageSourceKind;
  readonly messagePath: "messages";
}

export interface ResolvedDisplayMessageReference extends DisplayMessageReference {
  readonly sourceName: string;
  readonly marker: string;
  readonly textSummary: string[];
}

export type DisplayTargetKind =
  | "none"
  | "targetless-overlay"
  | "presentation-panel"
  | "field-error"
  | "form-group"
  | "layout"
  | "element"
  | "missing-local"
  | "external";

export interface DisplayTargetResolution {
  readonly kind: DisplayTargetKind;
  readonly target?: string;
  readonly fieldErrorElementId?: string;
  readonly fieldErrorElement?: MarkVSpecElement;
}

const displayMessageReferenceRegex = new RegExp(String.raw`^((?:V|R)-${idNamePattern})\.messages$`, "u");
const fieldErrorTargetRegex = new RegExp(String.raw`^(${elementIdPattern})\.error$`, "u");
const formGroupIdRegex = new RegExp(String.raw`^${formGroupIdPattern}$`, "u");

export function parseDisplayMessageReference(value: string): DisplayMessageReference | undefined {
  const match = displayMessageReferenceRegex.exec(value);
  const sourceId = match?.[1];
  if (!sourceId) {
    return undefined;
  }
  return {
    sourceId,
    sourceKind: sourceId.startsWith("V-") ? "validation" : "business-rule",
    messagePath: "messages"
  };
}

export function resolveDisplayMessageReference(
  value: string,
  result: Pick<MarkVSpecParseResult, "validations" | "rules">
): ResolvedDisplayMessageReference | undefined {
  const reference = parseDisplayMessageReference(value);
  if (!reference) {
    return undefined;
  }

  const validation = reference.sourceKind === "validation"
    ? result.validations.find((candidate) => candidate.id === reference.sourceId)
    : undefined;
  const rule = reference.sourceKind === "business-rule"
    ? result.rules.find((candidate) => candidate.id === reference.sourceId)
    : undefined;

  return {
    ...reference,
    sourceName: validation?.name ?? rule?.name ?? reference.sourceId,
    marker: displayMessageMarker(reference, validation, rule),
    textSummary: displayMessageTextSummary(reference, validation, rule)
  };
}

export function displayMessageMarker(
  reference: DisplayMessageReference,
  validation: MarkVSpecParseResult["validations"][number] | undefined,
  rule: MarkVSpecParseResult["rules"][number] | undefined
): string {
  const marker = reference.sourceKind === "validation"
    ? propertyFirstString(validation, "marker")
    : propertyFirstString(rule, "marker");
  return typeof marker === "string" && marker ? marker : reference.sourceId;
}

export function displayMessageTextSummary(
  reference: DisplayMessageReference,
  validation: MarkVSpecParseResult["validations"][number] | undefined,
  rule: MarkVSpecParseResult["rules"][number] | undefined
): string[] {
  if (reference.sourceKind === "validation") {
    return stringValues(validation?.properties["message"]);
  }
  return stringValues(rule?.properties["messages"] ?? rule?.properties["message"]);
}

export function displayMessageExplanationKind(
  reference: DisplayMessageReference | undefined,
  displayTarget: string | undefined,
  validation: MarkVSpecParseResult["validations"][number] | undefined,
  rule: MarkVSpecParseResult["rules"][number] | undefined
): string {
  if (reference?.sourceKind === "validation" && validation) {
    const run = propertyFirstString(validation, "run") || "client";
    const scope = propertyFirstString(validation, "scope") || (propertyFirstString(validation, "target")?.startsWith("F-") ? "cross-field" : "field");
    return `${run} ${scope} validation error`;
  }
  if (reference?.sourceKind === "business-rule" && rule) {
    return "business rule message";
  }
  return displayTarget?.endsWith(".error") ? "field error display" : "display update";
}

export function resolveDisplayTarget(
  display: { target?: string; element?: string } | undefined,
  context: {
    readonly layoutIds: ReadonlySet<string>;
    readonly elementIds: ReadonlySet<string>;
    readonly elementsById: ReadonlyMap<string, MarkVSpecElement>;
  }
): DisplayTargetResolution {
  if (!display?.target) {
    return isTargetlessOverlayDisplay(display, context.elementsById)
      ? { kind: "targetless-overlay" }
      : { kind: "none" };
  }

  const target = display.target;
  if (isPresentationPanelId(target)) {
    return { kind: "presentation-panel", target };
  }

  const fieldErrorElementId = parseFieldErrorTarget(target);
  if (fieldErrorElementId) {
    return {
      kind: "field-error",
      target,
      fieldErrorElementId,
      fieldErrorElement: context.elementsById.get(fieldErrorElementId)
    };
  }

  if (formGroupIdRegex.test(target)) {
    return { kind: "form-group", target };
  }

  if (context.layoutIds.has(target)) {
    return { kind: "layout", target };
  }

  if (context.elementIds.has(target)) {
    return { kind: "element", target };
  }

  return isLocalId(target)
    ? { kind: "missing-local", target }
    : { kind: "external", target };
}

export function isTargetlessOverlayDisplay(
  display: { target?: string; element?: string } | undefined,
  elementsById: ReadonlyMap<string, MarkVSpecElement>
): boolean {
  if (!display?.element || display.target) {
    return false;
  }
  return ["Dialog", "Toast"].includes(elementsById.get(display.element)?.type ?? "");
}

export function parseFieldErrorTarget(target: string): string | undefined {
  return fieldErrorTargetRegex.exec(target)?.[1];
}

export function isInvalidFieldErrorElement(element: MarkVSpecElement | undefined): boolean {
  return Boolean(element && !isInputElementType(element.type));
}

function stringValues(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
}
