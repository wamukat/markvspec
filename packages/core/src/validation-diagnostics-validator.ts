import {
  elementIdPattern,
  formGroupIdPattern,
  isLocalId,
  isPresentationPanelId
} from "./ids.js";
import { createMarkVSpecDiagnostic } from "./diagnostic-messages.js";
import { presentationPanelTargetDiagnostic } from "./display-effect-validator.js";
import { businessRuleViolationCaseName } from "./validation-domain.js";
import type {
  MarkVSpecActionOutcome,
  MarkVSpecDiagnostic,
  MarkVSpecElement,
  MarkVSpecParseResult,
  MarkVSpecProcessStep,
  SourceLocation
} from "./types.js";

const elementIdRegex = new RegExp(String.raw`^${elementIdPattern}$`, "u");
const formGroupIdRegex = new RegExp(String.raw`^${formGroupIdPattern}$`, "u");

export interface ValidationTargetDiagnosticContext {
  layoutIds: Set<string>;
  elementIds: Set<string>;
  formGroupIds: Set<string>;
}

export interface ValidationRuleDiagnosticContext {
  elementIds: Set<string>;
  elementsById: ReadonlyMap<string, MarkVSpecElement>;
  formGroupIds: Set<string>;
}

export interface BusinessRuleOutcomeDiagnosticSupport {
  firstPropertyLine(owner: { propertyLocations: Record<string, SourceLocation[]> }, key: string): number | undefined;
  processStepLabel(step: MarkVSpecProcessStep): string;
}

export function validateValidationTargets(
  validation: MarkVSpecParseResult["validations"][number],
  context: ValidationTargetDiagnosticContext,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (validationPropertyValues(validation, "target").length === 0) {
    diagnostics.push({
      severity: "error",
      message: `Validation ${validation.id} must specify target.`,
      line: validation.location.line
    });
  }

  validationPropertyValues(validation, "target").forEach((target, index) => {
    const line = validation.propertyLocations["target"]?.[index]?.line ?? validation.location.line;
    if (isPresentationPanelId(target)) {
      diagnostics.push(presentationPanelTargetDiagnostic(`Validation ${validation.id}`, target, line));
    } else if (formGroupIdRegex.test(target)) {
      if (!context.formGroupIds.has(target)) {
        diagnostics.push({
          severity: "error",
          message: `Validation ${validation.id} targets missing form group ${target}.`,
          line
        });
      }
    } else if (context.layoutIds.has(target) && validationIsComposite(validation)) {
      diagnostics.push({
        severity: "warning",
        message: `Validation ${validation.id} targets layout ${target} for composite validation. Use a FormGroup target such as F-${target.replace(/^L-/u, "")} instead.`,
        line
      });
    } else if (isLocalId(target) && !context.layoutIds.has(target) && !context.elementIds.has(target)) {
      const targetKind = target.startsWith("E-") ? "element" : target.startsWith("L-") ? "layout" : "layout or element";
      diagnostics.push({
        severity: "error",
        message: `Validation ${validation.id} targets missing ${targetKind} ${target}.`,
        line
      });
    }
  });
}

export function validateValidationTrigger(
  validation: MarkVSpecParseResult["validations"][number],
  diagnostics: MarkVSpecDiagnostic[]
): void {
  validationPropertyValues(validation, "trigger").forEach((trigger, index) => {
    const line = validation.propertyLocations["trigger"]?.[index]?.line ?? validation.location.line;
    diagnostics.push({
      severity: "warning",
      message: `Validation ${validation.id} trigger is not canonical. Actions should consume ${validation.id}.result instead of defining validation triggers.`,
      line
    });
  });
}

export function validateValidationRules(
  validation: MarkVSpecParseResult["validations"][number],
  context: ValidationRuleDiagnosticContext,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (validation.rules.length === 0 && validationPropertyValues(validation, "condition").length === 0 && validationPropertyValues(validation, "check").length === 0) {
    diagnostics.push({
      severity: "warning",
      message: `Validation ${validation.id} has no rules. Define rules or migrate legacy condition-only validation.`,
      line: validation.location.line
    });
    return;
  }

  for (const rule of validation.rules) {
    for (const target of rule.targets) {
      if (elementIdRegex.test(target) && !context.elementIds.has(target)) {
        diagnostics.push(createMarkVSpecDiagnostic(
          "error",
          "validation.ruleMissingElement",
          { validationId: validation.id, ruleName: rule.name, elementId: target },
          rule.location.line
        ));
      } else if (formGroupIdRegex.test(target) && !context.formGroupIds.has(target)) {
        diagnostics.push({
          severity: "error",
          message: `Validation ${validation.id} rule ${rule.name} references missing form group ${target}.`,
          line: rule.location.line
        });
      }
    }
    validateElementBackedConstraint(validation, rule, context, diagnostics);
  }
}

export function validateValidationErrorCodes(
  validation: MarkVSpecParseResult["validations"][number],
  errorCodeIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const key of ["error code", "error codes"]) {
    validationPropertyValues(validation, key).forEach((value, index) => {
      for (const errorCode of splitReferenceList(value)) {
        if (!errorCodeIds.has(errorCode)) {
          diagnostics.push({
            severity: "error",
            message: `Validation ${validation.id} references missing error code ${errorCode}.`,
            line: validation.propertyLocations[key]?.[index]?.line ?? validation.location.line
          });
        }
      }
    });
  }
}

export function validateValidationScopeAndRun(
  validation: MarkVSpecParseResult["validations"][number],
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const scopes = new Set(["single", "field", "composite", "cross-field"]);
  validationPropertyValues(validation, "scope").forEach((scope, index) => {
    const line = validation.propertyLocations["scope"]?.[index]?.line ?? validation.location.line;
    if (line !== validation.location.line) {
      diagnostics.push({
        severity: "warning",
        message: `Validation ${validation.id} must not define scope; use Field Validations or Cross-field Validations section instead.`,
        line
      });
    }
    if (!scopes.has(scope)) {
      diagnostics.push({
        severity: "warning",
        message: `Validation ${validation.id} scope ${scope} is not recognized. Use single, field, composite, or cross-field.`,
        line
      });
    }
  });

  validationPropertyValues(validation, "run").forEach((run, index) => {
    if (run !== "client") {
      diagnostics.push({
        severity: "warning",
        message: `Validation ${validation.id} run ${run} is not supported. Use client.`,
        line: validation.propertyLocations["run"]?.[index]?.line ?? validation.location.line
      });
    }
  });
}

export function validateBusinessRuleOutcomeCaseName(
  actionId: string,
  step: MarkVSpecProcessStep | undefined,
  outcome: MarkVSpecActionOutcome,
  diagnostics: MarkVSpecDiagnostic[],
  support: BusinessRuleOutcomeDiagnosticSupport
): void {
  if (outcome.businessRules.length === 0 || outcome.result === businessRuleViolationCaseName) {
    return;
  }

  const context = step ? `process step ${support.processStepLabel(step)} case ${outcome.result}` : `case ${outcome.result}`;
  diagnostics.push({
    severity: "warning",
    message: `Action ${actionId} ${context} declares business rule ${outcome.businessRules.join(", ")}. Use case: ${businessRuleViolationCaseName} for business rule violations.`,
    line: support.firstPropertyLine(outcome, "business rule") ?? support.firstPropertyLine(outcome, "business rules") ?? outcome.location?.line ?? step?.location.line
  });
}

export function validationPropertyValues(owner: { properties: Record<string, string | string[]> }, key: string): string[] {
  const value = owner.properties[key];
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
}

export function splitReferenceList(value: string): string[] {
  return value.split(/[,、]/u).map((item) => item.trim()).filter(Boolean);
}

function validationIsComposite(validation: MarkVSpecParseResult["validations"][number]): boolean {
  const scopes = validationPropertyValues(validation, "scope").map((scope) => scope.toLowerCase());
  if (scopes.some((scope) => scope === "composite" || scope === "cross-field")) {
    return true;
  }
  return validationPropertyValues(validation, "target").length > 1;
}

function validateElementBackedConstraint(
  validation: MarkVSpecParseResult["validations"][number],
  rule: MarkVSpecParseResult["validations"][number]["rules"][number],
  context: ValidationRuleDiagnosticContext,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const normalizedName = rule.name.toLowerCase();
  if (normalizedName !== "length" && normalizedName !== "range") {
    return;
  }
  if (!rule.targets.some((target) => target.toLowerCase() === "element")) {
    return;
  }

  const targetElementIds = validationPropertyValues(validation, "target").filter((target) => elementIdRegex.test(target));
  if (targetElementIds.length !== 1) {
    return;
  }

  const element = context.elementsById.get(targetElementIds[0] ?? "");
  if (!element) {
    return;
  }

  const hasNeededMetadata = normalizedName === "length"
    ? elementHasAnyInputMetadata(element, ["min length", "max length", "min-length", "max-length", "minlength", "maxlength"])
    : elementHasAnyInputMetadata(element, ["min", "max"]);
  if (!hasNeededMetadata) {
    diagnostics.push({
      severity: "warning",
      message: `Validation ${validation.id} uses ${rule.name}: element, but target ${element.id} does not define matching ${rule.name} input metadata.`,
      line: rule.location.line
    });
  }
}

function elementHasAnyInputMetadata(element: MarkVSpecElement, keys: string[]): boolean {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));
  for (const key of Object.keys(element.properties)) {
    if (normalizedKeys.has(key.toLowerCase())) {
      return true;
    }
  }
  return element.inputRules.some((rule) => normalizedKeys.has(rule.key.toLowerCase()));
}
