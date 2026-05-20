import { createMarkVSpecDiagnostic } from "./diagnostic-messages.js";
import { idNamePattern, isLocalId } from "./ids.js";
import {
  buildMarkVSpecProcessStepReadModel,
  processExecutionDetailRoots,
  processStepDataReferenceDetails,
  processStepDetail as processStepDetailFromReadModel
} from "./action-process-read-model.js";
import type {
  MarkVSpecActionOutcome,
  MarkVSpecDiagnostic,
  MarkVSpecProcessStep,
  SourceLocation
} from "./types.js";

const validationResultReferenceRegex = new RegExp(String.raw`^(V-${idNamePattern})\.result$`, "u");

export interface ActionProcessValidationSupport {
  firstPropertyLocation(owner: { propertyLocations?: Record<string, SourceLocation[]> }, key: string): SourceLocation | undefined;
  requestParamSourceId(source: string): string | undefined;
  splitReferenceList(value: string): string[];
}

export function validateProcessGranularity(
  actionId: string,
  step: MarkVSpecProcessStep,
  diagnostics: MarkVSpecDiagnostic[],
  support: ActionProcessValidationSupport
): void {
  const executionDetails = processExecutionDetails(step);
  if (executionDetails.length > 1) {
    diagnostics.push(createMarkVSpecDiagnostic(
      "warning",
      "action.process.multipleExecutionDetails",
      { actionId, stepLabel: processStepLabel(step), details: executionDetails.map((detail) => detail.name).join(", ") },
      executionDetails[1]?.location.line ?? step.location.line
    ));
  }

  const directEffectLocation = firstDirectProcessEffectLocation(step, support);
  const hasClassification = step.outcomes.length > 0 || step.receives.length > 0 || step.results.length > 0;
  if (directEffectLocation && executionDetails.length > 0) {
    diagnostics.push(createMarkVSpecDiagnostic(
      "warning",
      "action.process.mixesExecutionDetailAndImmediateEffects",
      { actionId, stepLabel: processStepLabel(step) },
      directEffectLocation.line
    ));
  } else if (directEffectLocation && hasClassification) {
    diagnostics.push(createMarkVSpecDiagnostic(
      "warning",
      "action.process.mixesResultClassificationAndImmediateEffects",
      { actionId, stepLabel: processStepLabel(step) },
      directEffectLocation.line
    ));
  }
}

export function validateUnsupportedProcessLevelPartial(actionId: string, step: MarkVSpecProcessStep, diagnostics: MarkVSpecDiagnostic[]): void {
  for (const detail of step.details.filter((candidate) => candidate.key === "partial")) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${actionId} process step ${processStepLabel(step)} has unsupported process-level partial ${detail.value}. Put returned partial content under Effects display.partial on the response case.`,
      line: detail.location.line
    });
  }
}

export function validateProcessBusinessRulePlacement(actionId: string, step: MarkVSpecProcessStep, diagnostics: MarkVSpecDiagnostic[]): void {
  for (const detail of step.receives) {
    if (isBusinessRuleDetailKey(detail.key)) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${actionId} process step ${processStepLabel(step)} receive entry ${detail.key}: ${detail.value} is not allowed. Put business rule: under case: business-rule-violation.`,
        line: detail.location.line
      });
    }
  }

  for (const detail of step.results) {
    if (isBusinessRuleDetailKey(detail.key)) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${actionId} process step ${processStepLabel(step)} result entry ${detail.key}: ${detail.value} is not allowed. Put business rule: under case: business-rule-violation.`,
        line: detail.location.line
      });
    }
  }
}

export function validateProcessCaseFlowPlacement(
  actionId: string,
  step: MarkVSpecProcessStep,
  outcome: MarkVSpecActionOutcome,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (outcome.flowDirectives.length === 0) {
    return;
  }

  for (const directive of outcome.flowDirectives) {
    if (directive.underEffects) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${actionId} process step ${step.name} case ${outcome.result} has ${directive.value} under Effects. Put ${directive.value} directly under the case as the final entry.`,
        line: directive.location.line
      });
    }
  }

  const flowValues = new Set(outcome.flowDirectives.map((directive) => directive.value));
  if (flowValues.size > 1) {
    diagnostics.push({
      severity: "warning",
      message: `Action ${actionId} process step ${step.name} case ${outcome.result} has both stop and continue. Use only one flow directive.`,
      line: outcome.flowDirectives[1]?.location.line ?? outcome.flowDirectives[0]?.location.line ?? outcome.location?.line ?? step.location.line
    });
  }

  for (const directive of outcome.flowDirectives) {
    const laterEntry = processCaseEntryLocations(outcome, directive)
      .filter((location) => location.line > directive.location.line)
      .sort((left, right) => left.line - right.line)[0];
    if (laterEntry) {
      diagnostics.push({
        severity: "warning",
        message: `Action ${actionId} process step ${step.name} case ${outcome.result} has entries after ${directive.value}. Put ${directive.value} as the final entry in the case.`,
        line: laterEntry.line
      });
    }
  }
}

export function validateSuspiciousProcessCaseResponse(
  actionId: string,
  step: MarkVSpecProcessStep,
  outcome: MarkVSpecActionOutcome,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (!outcome.response || step.receives.some((detail) => detail.key === "response")) {
    return;
  }

  diagnostics.push(createMarkVSpecDiagnostic(
    "warning",
    "action.process.caseResponseWithoutReceive",
    { actionId, stepLabel: processStepLabel(step), result: outcome.result },
    outcome.response.location.line
  ));
}

export function validateProcessStepReferences(
  actionId: string,
  step: MarkVSpecProcessStep,
  validationIds: Set<string>,
  errorCodeIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[],
  support: ActionProcessValidationSupport
): void {
  const processReadModel = buildMarkVSpecProcessStepReadModel(step);
  for (const detail of processReadModel.execution.validations) {
    for (const validationId of support.splitReferenceList(detail.value)) {
      const resultReference = parseValidationResultReference(validationId);
      const referencedValidationId = resultReference ?? validationId;
      if (!validationIds.has(referencedValidationId)) {
        diagnostics.push({
          severity: "error",
          message: `Action ${actionId} process step ${step.name} references missing validation ${referencedValidationId}.`,
          line: detail.location.line
        });
      } else if (validationId.startsWith("V-") && !resultReference) {
        diagnostics.push({
          severity: "warning",
          message: `Action ${actionId} process step ${step.name} should reference ${validationId}.result when consuming validation results.`,
          line: detail.location.line
        });
      }
    }
  }

  for (const detail of processReadModel.execution.errorCodes) {
    for (const errorCode of support.splitReferenceList(detail.value)) {
      if (!errorCodeIds.has(errorCode)) {
        diagnostics.push({
          severity: "error",
          message: `Action ${actionId} process step ${step.name} references missing error code ${errorCode}.`,
          line: detail.location.line
        });
      }
    }
  }
}

export function validateProcessDataReferences(
  actionId: string,
  step: MarkVSpecProcessStep,
  actionIds: Set<string>,
  processMarkersByAction: Map<string, Set<string>>,
  layoutIds: Set<string>,
  elementIds: Set<string>,
  diagnostics: MarkVSpecDiagnostic[],
  support: ActionProcessValidationSupport
): void {
  for (const detail of processStepDataReferenceDetails(step)) {
    const sourceId = support.requestParamSourceId(detail.value);
    if (sourceId && isLocalId(sourceId) && !layoutIds.has(sourceId) && !elementIds.has(sourceId) && !actionIds.has(sourceId)) {
      diagnostics.push({
        severity: "error",
        message: `Action ${actionId} process step ${processStepLabel(step)} ${detail.key} references missing source ${sourceId}.`,
        line: detail.location.line
      });
      continue;
    }

    const processOutput = parseProcessOutputReference(detail.value);
    if (processOutput) {
      if (!actionIds.has(processOutput.actionId)) {
        diagnostics.push({
          severity: "error",
          message: `Action ${actionId} process step ${processStepLabel(step)} references missing action ${processOutput.actionId}.`,
          line: detail.location.line
        });
      } else if (!processMarkersByAction.get(processOutput.actionId)?.has(processOutput.marker)) {
        diagnostics.push({
          severity: "error",
          message: `Action ${actionId} process step ${processStepLabel(step)} references missing process marker ${processOutput.marker}.`,
          line: detail.location.line
        });
      }
    }
  }
}

export function processStepLabel(step: MarkVSpecProcessStep): string {
  return step.marker ? `${step.marker} ${step.name}` : step.name;
}

export function parseProcessOutputReference(value: string): { actionId: string; marker: string; kind: "result" | "response" } | undefined {
  const match = /^(A-[\p{L}\p{N}-]+)\.(P[A-Za-z0-9_-]*)\.(result|response)$/u.exec(value.trim());
  if (!match) {
    return undefined;
  }
  return {
    actionId: match[1],
    marker: match[2],
    kind: match[3] as "result" | "response"
  };
}

function isBusinessRuleDetailKey(key: string): boolean {
  return key === "business rule" || key === "business rules";
}

function processCaseEntryLocations(outcome: MarkVSpecActionOutcome, currentDirective: { location: SourceLocation }): SourceLocation[] {
  const locations: SourceLocation[] = [];
  for (const [key, entries] of Object.entries(outcome.propertyLocations)) {
    if (key !== "flow") {
      locations.push(...entries);
    }
  }
  locations.push(...outcome.flowDirectives
    .filter((directive) => directive.location !== currentDirective.location)
    .map((directive) => directive.location));
  if (outcome.display) {
    locations.push(outcome.display.location);
    for (const entries of Object.values(outcome.display.propertyLocations)) {
      locations.push(...entries);
    }
  }
  for (const routeParam of outcome.routeParams) {
    locations.push(routeParam.location);
  }
  return locations;
}

function processExecutionDetails(step: MarkVSpecProcessStep): { name: string; location: SourceLocation }[] {
  return processExecutionDetailRoots(step);
}

function firstDirectProcessEffectLocation(
  step: MarkVSpecProcessStep,
  support: ActionProcessValidationSupport
): SourceLocation | undefined {
  return [
    support.firstPropertyLocation(step, "state"),
    support.firstPropertyLocation(step, "navigate"),
    support.firstPropertyLocation(step, "model"),
    support.firstPropertyLocation(step, "view"),
    support.firstPropertyLocation(step, "target"),
    support.firstPropertyLocation(step, "mode"),
    support.firstPropertyLocation(step, "fragment"),
    support.firstPropertyLocation(step, "content"),
    step.display?.location
  ]
    .filter((location): location is SourceLocation => Boolean(location))
    .sort((a, b) => a.line - b.line)[0];
}

function parseValidationResultReference(value: string): string | undefined {
  const match = validationResultReferenceRegex.exec(value.trim());
  return match?.[1];
}
