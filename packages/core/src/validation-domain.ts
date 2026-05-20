import { propertyFirstString, propertyList, propertyMarker } from "./property-accessor.js";
import type { MarkVSpecParseResult, MarkVSpecRule, MarkVSpecValidationRule, MarkVSpecValidationRuleEntry } from "./types.js";

export type ValidationRunKind = "client";
export type ValidationScopeKind = "field" | "cross-field";

export interface ValidationRuleProperty {
  key: "when" | "message" | "error code";
  value: string;
}

export interface ValidationDisplayMessageSource {
  sourceId: string;
  messagePath: "messages";
  marker: string;
  messages: readonly string[];
}

export interface BusinessRuleViolation {
  caseName: "business-rule-violation";
  result?: string;
  marker: string;
  messages: readonly string[];
}

export const businessRuleViolationCaseName = "business-rule-violation";

export function validationDomainFor(validation: MarkVSpecValidationRule): ValidationDomain {
  return new ValidationDomain(validation);
}

export function businessRuleDomainFor(rule: MarkVSpecRule): BusinessRuleDomain {
  return new BusinessRuleDomain(rule);
}

export function validationRun(validation: MarkVSpecValidationRule): ValidationRunKind {
  return "client";
}

export function validationScope(validation: MarkVSpecValidationRule): ValidationScopeKind {
  const scope = propertyFirstString(validation, "scope")?.toLowerCase();
  if (scope === "cross-field" || scope === "composite") {
    return "cross-field";
  }
  if (scope === "field" || scope === "single") {
    return "field";
  }
  const targets = validationTargets(validation);
  return targets.length > 1 || targets[0]?.startsWith("F-") ? "cross-field" : "field";
}

export function validationTargets(validation: MarkVSpecValidationRule): string[] {
  return propertyList(validation, "target");
}

export function validationMessages(validation: MarkVSpecValidationRule): string[] {
  return propertyValues(validation, "message");
}

export function validationErrorCodes(validation: MarkVSpecValidationRule): string[] {
  return [
    ...propertyValues(validation, "error code"),
    ...propertyValues(validation, "error codes")
  ];
}

export function validationMarker(validation: MarkVSpecValidationRule): string {
  return propertyMarker(validation, validation.id) ?? validation.id;
}

export function validationDisplayMessageSource(validation: MarkVSpecValidationRule): ValidationDisplayMessageSource {
  return {
    sourceId: validation.id,
    messagePath: "messages",
    marker: validationMarker(validation),
    messages: validationMessages(validation)
  };
}

export function validationRuleTargets(rule: MarkVSpecValidationRuleEntry): string[] {
  return rule.targets.filter((target) => validationRuleChildProperty(target) === undefined);
}

export function validationRulePropertyValues(
  validation: MarkVSpecValidationRule,
  rule: MarkVSpecValidationRuleEntry,
  key: "when" | "message" | "error code"
): string[] {
  const valuesByLocation = validationPropertyValuesForRule(validation, rule, key);
  if (valuesByLocation.length > 0) {
    return valuesByLocation;
  }
  return rule.targets.flatMap((target) => {
    const property = validationRuleChildProperty(target);
    return property?.key === key ? [property.value] : [];
  });
}

export function validationHasRuleProperty(validation: MarkVSpecValidationRule, key: "when" | "message" | "error code"): boolean {
  return validation.rules.some((rule) => validationRulePropertyValues(validation, rule, key).length > 0);
}

export function validationRuleChildProperty(value: string): ValidationRuleProperty | undefined {
  const match = value.match(/^([^:]+):\s*(.*)$/u);
  if (!match) {
    return undefined;
  }
  const rawKey = match[1]?.trim().toLowerCase() ?? "";
  const key = rawKey === "messages" ? "message" : rawKey === "error codes" ? "error code" : rawKey;
  if (key !== "when" && key !== "message" && key !== "error code") {
    return undefined;
  }
  return { key, value: match[2]?.trim() ?? "" };
}

export function businessRuleMarker(rule: MarkVSpecRule): string {
  return propertyMarker(rule, rule.id) ?? rule.id;
}

export function businessRuleMessages(rule: MarkVSpecRule): string[] {
  const messages = propertyValues(rule, "messages");
  return messages.length > 0 ? messages : propertyValues(rule, "message");
}

export function businessRuleResult(rule: MarkVSpecRule): string | undefined {
  return propertyFirstString(rule, "result");
}

export function businessRuleViolation(rule: MarkVSpecRule): BusinessRuleViolation {
  return {
    caseName: businessRuleViolationCaseName,
    result: businessRuleResult(rule),
    marker: businessRuleMarker(rule),
    messages: businessRuleMessages(rule)
  };
}

function validationPropertyValuesForRule(
  validation: MarkVSpecValidationRule,
  rule: MarkVSpecValidationRuleEntry,
  key: "when" | "message" | "error code"
): string[] {
  const values = key === "error code" ? validationErrorCodes(validation) : propertyValues(validation, key);
  const locations = [
    ...(validation.propertyLocations[key] ?? []),
    ...(key === "error code" ? validation.propertyLocations["error codes"] ?? [] : [])
  ];
  if (values.length === 0 || locations.length === 0) {
    return [];
  }

  const sortedRules = [...validation.rules].sort((a, b) => a.location.line - b.location.line);
  const ruleIndex = sortedRules.indexOf(rule);
  const nextRuleLine = sortedRules[ruleIndex + 1]?.location.line ?? Number.POSITIVE_INFINITY;
  return values.filter((_, index) => {
    const location = locations[index];
    return location !== undefined && location.line > rule.location.line && location.line < nextRuleLine;
  });
}

function propertyValues(owner: { readonly properties: Record<string, string | string[] | true | undefined> } | undefined, key: string): string[] {
  const value = owner?.properties[key];
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  return typeof value === "string" && value ? [value] : [];
}

export class ValidationDomain {
  constructor(readonly validation: MarkVSpecValidationRule) {}

  run(): ValidationRunKind {
    return validationRun(this.validation);
  }

  scope(): ValidationScopeKind {
    return validationScope(this.validation);
  }

  targets(): string[] {
    return validationTargets(this.validation);
  }

  marker(): string {
    return validationMarker(this.validation);
  }

  messages(): string[] {
    return validationMessages(this.validation);
  }

  errorCodes(): string[] {
    return validationErrorCodes(this.validation);
  }

  displayMessageSource(): ValidationDisplayMessageSource {
    return validationDisplayMessageSource(this.validation);
  }

  ruleTargets(rule: MarkVSpecValidationRuleEntry): string[] {
    return validationRuleTargets(rule);
  }

  rulePropertyValues(rule: MarkVSpecValidationRuleEntry, key: "when" | "message" | "error code"): string[] {
    return validationRulePropertyValues(this.validation, rule, key);
  }
}

export class BusinessRuleDomain {
  constructor(readonly rule: MarkVSpecRule) {}

  marker(): string {
    return businessRuleMarker(this.rule);
  }

  messages(): string[] {
    return businessRuleMessages(this.rule);
  }

  result(): string | undefined {
    return businessRuleResult(this.rule);
  }

  violation(): BusinessRuleViolation {
    return businessRuleViolation(this.rule);
  }
}

export type ValidationDomainContext = Pick<MarkVSpecParseResult, "validations" | "rules">;
