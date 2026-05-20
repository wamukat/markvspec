import {
  isInvalidFieldErrorElement,
  resolveDisplayTarget
} from "./display-effect.js";
import type {
  MarkVSpecActionOutcome,
  MarkVSpecDiagnostic,
  MarkVSpecElement,
  SourceLocation
} from "./types.js";

type DisplayEffect = NonNullable<MarkVSpecActionOutcome["display"]>;

export interface DisplayEffectTargetValidationSupport {
  firstPropertyLine(owner: { propertyLocations: Record<string, SourceLocation[]> }, key: string): number | undefined;
  checkLayoutTargetViewportCoverage(
    layoutId: string,
    layoutIdsByViewport: Map<string, Set<string>>,
    diagnostics: MarkVSpecDiagnostic[],
    line: number,
    context: string
  ): void;
}

export interface DisplayEffectTargetValidationInput {
  actionId: string;
  context: string;
  display: DisplayEffect;
  layoutIds: Set<string>;
  elementIds: Set<string>;
  elementsById: Map<string, MarkVSpecElement>;
  layoutIdsByViewport: Map<string, Set<string>>;
  diagnostics: MarkVSpecDiagnostic[];
  support: DisplayEffectTargetValidationSupport;
}

export function validateDisplayEffectTarget(input: DisplayEffectTargetValidationInput): void {
  const {
    actionId,
    context,
    display,
    layoutIds,
    elementIds,
    elementsById,
    layoutIdsByViewport,
    diagnostics,
    support
  } = input;
  const targetResolution = resolveDisplayTarget(display, { layoutIds, elementIds, elementsById });
  const target = display.target;
  const targetLine = support.firstPropertyLine(display, "target") ?? display.location.line;

  if (targetResolution.kind === "none") {
    diagnostics.push({
      severity: "error",
      message: `Action ${actionId} ${context} display effect must define target.`,
      line: display.location.line
    });
  } else if (targetResolution.kind === "presentation-panel" && target) {
    diagnostics.push(presentationPanelTargetDiagnostic(`Action ${actionId} ${context} display effect`, target, targetLine));
  } else if (targetResolution.kind === "field-error") {
    const elementId = targetResolution.fieldErrorElementId;
    const element = targetResolution.fieldErrorElement;
    if (!elementId || !element) {
      diagnostics.push({
        severity: "error",
        message: `Action ${actionId} ${context} display effect targets missing field error element ${elementId ?? target}.`,
        line: targetLine
      });
    } else if (isInvalidFieldErrorElement(element)) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${actionId} ${context} display effect targets ${target}, but ${elementId} is ${element.type}. Field error targets should use input elements.`,
        line: targetLine
      });
    }
  } else if (targetResolution.kind === "form-group" && target) {
    diagnostics.push(formGroupUpdateTargetDiagnostic(`Action ${actionId} ${context} display effect`, target, targetLine));
  } else if (targetResolution.kind === "missing-local" && target) {
    diagnostics.push({
      severity: "error",
      message: `Action ${actionId} ${context} display effect targets missing layout or element ${target}.`,
      line: targetLine
    });
  } else if (targetResolution.kind === "layout" && target) {
    support.checkLayoutTargetViewportCoverage(
      target,
      layoutIdsByViewport,
      diagnostics,
      targetLine,
      `Action ${actionId} ${context} display effect targets layout`
    );
  }
}

export function presentationPanelTargetDiagnostic(context: string, target: string, line: number | undefined): MarkVSpecDiagnostic {
  return {
    severity: "error",
    message: `${context} cannot target presentation panel ${target}. Use an L-* Layout when a targetable layout is needed.`,
    line
  };
}

export function formGroupUpdateTargetDiagnostic(context: string, target: string, line: number | undefined): MarkVSpecDiagnostic {
  return {
    severity: "error",
    message: `${context} cannot target FormGroup ${target}. Use an L-* layout target for updates.`,
    line
  };
}
