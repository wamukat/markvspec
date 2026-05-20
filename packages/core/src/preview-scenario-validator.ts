import { createMarkVSpecDiagnostic } from "./diagnostic-messages.js";
import type {
  MarkVSpecDiagnostic,
  MarkVSpecElement,
  MarkVSpecLayoutGroup,
  MarkVSpecParseResult,
  MarkVSpecViewContextDefinition,
  SourceLocation
} from "./types.js";

export interface PreviewScenarioValidationSupport {
  extractRoutePlaceholders(route: string): Set<string>;
  firstPropertyLine(owner: { propertyLocations: Record<string, SourceLocation[]> }, key: string): number | undefined;
  isExternalTransitionTarget(value: string): boolean;
}

export interface ViewContextPreviewScenarioValidationInput {
  result: MarkVSpecParseResult;
  viewContextNames: Set<string>;
  viewContextSampleNames: Set<string>;
  stateNames: Set<string>;
  elementsById: Map<string, MarkVSpecElement>;
  diagnostics: MarkVSpecDiagnostic[];
  support: PreviewScenarioValidationSupport;
}

export function validateViewContextsAndPreviewScenarios(input: ViewContextPreviewScenarioValidationInput): void {
  const {
    result,
    viewContextNames,
    viewContextSampleNames,
    stateNames,
    elementsById,
    diagnostics,
    support
  } = input;
  const viewContextByName = new Map(result.viewContexts.map((context) => [context.name, context]));

  for (const sample of result.viewContextSamples) {
    for (const [name, value] of Object.entries(sample.values)) {
      const definition = viewContextByName.get(name);
      if (!definition) {
        diagnostics.push({
          severity: "error",
          message: `View Context Sample ${sample.name} references missing view context ${name}.`,
          line: sample.valueLocations[name]?.[0]?.line ?? sample.location.line
        });
        continue;
      }

      if (!definition.values.some((candidate) => candidate.value === value)) {
        diagnostics.push({
          severity: "error",
          message: `View Context Sample ${sample.name} sets ${name} to unsupported value ${value}.`,
          line: sample.valueLocations[name]?.[0]?.line ?? sample.location.line
        });
      }
    }
  }

  if (result.previewScenarios.length > 0) {
    const scenarioNames = new Set(result.previewScenarios.map((scenario) => scenario.name));
    for (const scenario of result.previewScenarios) {
      const scenarioNameIsStateName = stateNames.has(scenario.name);
      const isBaselineStateSample = scenarioNameIsStateName && !scenario.state;
      if (isBaselineStateSample) {
        validateBaselinePreviewScenario(scenario, diagnostics, support);
      } else if (!scenario.state) {
        diagnostics.push(createMarkVSpecDiagnostic(
          "error",
          "previewScenario.missingState",
          { scenario: scenario.name },
          scenario.location.line
        ));
      } else if (!stateNames.has(scenario.state)) {
        diagnostics.push({
          severity: "error",
          message: `Preview Scenario ${scenario.name} references missing state ${scenario.state}.`,
          line: support.firstPropertyLine(scenario, "state") ?? scenario.location.line
        });
      } else if (scenarioNameIsStateName && scenario.state === scenario.name) {
        diagnostics.push({
          severity: "warning",
          message: `Preview Scenario ${scenario.name} matches a state name and repeats state: ${scenario.state}. Omit state: to define baseline state samples.`,
          line: support.firstPropertyLine(scenario, "state") ?? scenario.location.line
        });
      } else if (scenarioNameIsStateName && scenario.state !== scenario.name) {
        diagnostics.push({
          severity: "error",
          message: `Preview Scenario ${scenario.name} matches a state name but references state ${scenario.state}. Use a different scenario name or omit state: for baseline state samples.`,
          line: support.firstPropertyLine(scenario, "state") ?? scenario.location.line
        });
      }

      if (scenario.view && !viewContextSampleNames.has(scenario.view)) {
        diagnostics.push({
          severity: "error",
          message: `Preview Scenario ${scenario.name} references missing view context sample ${scenario.view}.`,
          line: support.firstPropertyLine(scenario, "view") ?? scenario.location.line
        });
      }

      if (scenario.before) {
        if (scenario.before === scenario.name) {
          diagnostics.push({
            severity: "error",
            message: `Preview Scenario ${scenario.name} before target cannot reference itself.`,
            line: support.firstPropertyLine(scenario, "before") ?? scenario.location.line
          });
        } else if (!stateNames.has(scenario.before) && !scenarioNames.has(scenario.before)) {
          diagnostics.push({
            severity: "error",
            message: `Preview Scenario ${scenario.name} references missing before target ${scenario.before}.`,
            line: support.firstPropertyLine(scenario, "before") ?? scenario.location.line
          });
        }
      }

      validatePreviewScenarioCases(scenario, result, diagnostics, support);
      validatePreviewScenarioSamples(scenario, elementsById, diagnostics);
      validatePreviewScenarioRouteSamples(scenario, result.screen.route, diagnostics, support);
    }
  }

  validateDataSourceSampleRows(result, diagnostics, support);
  validateConditionNamespaces(result, viewContextNames, stateNames, diagnostics);
  validateViewContextActionEffects(result, viewContextByName, diagnostics);
}

function validateBaselinePreviewScenario(
  scenario: MarkVSpecParseResult["previewScenarios"][number],
  diagnostics: MarkVSpecDiagnostic[],
  support: PreviewScenarioValidationSupport
): void {
  const disallowedProperties = Object.keys(scenario.properties).filter((key) => key !== "samples" && key !== "route");
  for (const key of disallowedProperties) {
    diagnostics.push({
      severity: "error",
      message: `Preview Scenario ${scenario.name} is a baseline state sample and cannot define ${key}. Use samples or route only, or add state: with a distinct scenario name for an additional preview variant.`,
      line: support.firstPropertyLine(scenario, key) ?? scenario.location.line
    });
  }

  if (scenario.cases.length > 0) {
    diagnostics.push({
      severity: "error",
      message: `Preview Scenario ${scenario.name} is a baseline state sample and cannot define cases. Use samples or route only, or add state: with a distinct scenario name for an additional preview variant.`,
      line: scenario.cases[0]?.location.line ?? scenario.location.line
    });
  }
}

function validatePreviewScenarioCases(
  scenario: MarkVSpecParseResult["previewScenarios"][number],
  result: MarkVSpecParseResult,
  diagnostics: MarkVSpecDiagnostic[],
  support: PreviewScenarioValidationSupport
): void {
  for (const caseRef of scenario.cases) {
    const action = result.actions.find((candidate) => candidate.id === caseRef.actionId);
    if (!action) {
      diagnostics.push({
        severity: "error",
        message: `Preview Scenario ${scenario.name} references missing action ${caseRef.actionId}.`,
        line: caseRef.location.line
      });
      continue;
    }
    const step = action.processSteps.find((candidate) => candidate.marker === caseRef.processMarker);
    if (!step) {
      diagnostics.push({
        severity: "error",
        message: `Preview Scenario ${scenario.name} references missing process marker ${caseRef.processMarker} on action ${caseRef.actionId}.`,
        line: caseRef.location.line
      });
      continue;
    }
    const outcome = step.outcomes.find((candidate) => candidate.result === caseRef.caseName);
    if (!outcome) {
      diagnostics.push({
        severity: "error",
        message: `Preview Scenario ${scenario.name} references missing case ${caseRef.raw}.`,
        line: caseRef.location.line
      });
      continue;
    }
    if (scenario.state && outcome.to && !support.isExternalTransitionTarget(outcome.to) && outcome.to !== scenario.state) {
      diagnostics.push({
        severity: "warning",
        message: `Preview Scenario ${scenario.name} state ${scenario.state} does not match case ${caseRef.raw} state effect ${outcome.to}.`,
        line: caseRef.location.line
      });
    }
  }
}

function validatePreviewScenarioSamples(
  scenario: MarkVSpecParseResult["previewScenarios"][number],
  elementsById: Map<string, MarkVSpecElement>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const sample of scenario.samples) {
    const element = elementsById.get(sample.elementId);
    if (!element) {
      diagnostics.push(createMarkVSpecDiagnostic(
        "error",
        "previewScenario.samplesMissingElement",
        { scenario: scenario.name, elementId: sample.elementId },
        sample.location.line
      ));
      continue;
    }
    if (sample.rows && element.type !== "Table" && element.type !== "List") {
      diagnostics.push({
        severity: "warning",
        message: `Preview Scenario ${scenario.name} rows sample target ${sample.elementId} must be a Table or List element.`,
        line: sample.rows.location.line
      });
    }
    if (sample.value !== undefined && (element.type === "Table" || element.type === "List")) {
      diagnostics.push({
        severity: "warning",
        message: `Preview Scenario ${scenario.name} scalar sample target ${sample.elementId} should not be a Table or List element. Use rows instead.`,
        line: sample.location.line
      });
    }
  }
}

function validatePreviewScenarioRouteSamples(
  scenario: MarkVSpecParseResult["previewScenarios"][number],
  screenRoute: string | undefined,
  diagnostics: MarkVSpecDiagnostic[],
  support: PreviewScenarioValidationSupport
): void {
  if (scenario.route.length === 0) {
    return;
  }
  if (!screenRoute) {
    diagnostics.push({
      severity: "warning",
      message: `Preview Scenario ${scenario.name} defines route samples, but screen route is not defined.`,
      line: scenario.route[0]?.location.line ?? scenario.location.line
    });
    return;
  }

  const declared = support.extractRoutePlaceholders(screenRoute);
  for (const routeSample of scenario.route) {
    if (routeSample.key !== "hash" && !declared.has(routeSample.key)) {
      diagnostics.push({
        severity: "warning",
        message: `Preview Scenario ${scenario.name} route sample ${routeSample.key} does not match any :param in screen route.`,
        line: routeSample.location.line
      });
    }
  }
}

function validateDataSourceSampleRows(
  result: MarkVSpecParseResult,
  diagnostics: MarkVSpecDiagnostic[],
  support: PreviewScenarioValidationSupport
): void {
  const scenarioRowElementIds = new Set(
    result.previewScenarios.flatMap((scenario) => scenario.samples.filter((sample) => sample.rows).map((sample) => sample.elementId))
  );
  for (const element of result.elements) {
    if (element.type !== "Table" && element.type !== "List") {
      continue;
    }
    if (element.properties["source"] !== "data") {
      continue;
    }
    if (element.sampleRows || scenarioRowElementIds.has(element.id)) {
      continue;
    }
    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} source data should define sample rows or Preview Scenario rows.`,
      line: support.firstPropertyLine(element, "source") ?? element.location.line
    });
  }
}

function validateConditionNamespaces(
  result: MarkVSpecParseResult,
  viewContextNames: Set<string>,
  stateNames: Set<string>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const check = (condition: string, line: number): void => {
    for (const reference of condition.matchAll(/\$\{(state|view)\.([^}]+)\}/gu)) {
      const [, namespace, name] = reference;
      const trimmed = name.trim();
      if (namespace === "state" && !stateNames.has(trimmed)) {
        diagnostics.push({
          severity: "error",
          message: `Condition references missing state ${trimmed}.`,
          line
        });
      }
      if (namespace === "view" && !viewContextNames.has(trimmed)) {
        diagnostics.push({
          severity: "error",
          message: `Condition references missing view context ${trimmed}.`,
          line
        });
      }
    }
  };

  for (const element of result.elements) {
    for (const [key, conditions] of [
      ["visible when", element.visibleWhen],
      ["hidden when", element.hiddenWhen],
      ["disabled when", element.disabledWhen],
      ["open when", element.openWhen]
    ] as const) {
      conditions.forEach((condition, index) => check(condition, element.propertyLocations[key]?.[index]?.line ?? element.location.line));
    }
    for (const item of element.tabs) {
      item.activeWhen.forEach((condition, index) => check(condition, item.propertyLocations["active when"]?.[index]?.line ?? item.location.line));
    }
    for (const item of element.accordionItems) {
      item.openWhen.forEach((condition, index) => check(condition, item.propertyLocations["open when"]?.[index]?.line ?? item.location.line));
    }
    for (const item of element.actionMenuItems) {
      item.disabledWhen.forEach((condition, index) => check(condition, item.propertyLocations["disabled when"]?.[index]?.line ?? item.location.line));
    }
  }
  for (const layout of [...result.layoutGroups, ...result.slotContents.flatMap((slot) => slot.layoutGroups)]) {
    for (const key of ["visible when", "hidden when", "disabled when", "enabled when", "selected when", "active when"]) {
      layoutPropertyValues(layout, key).forEach((value, index) => check(value, layout.propertyLocations[key]?.[index]?.line ?? layout.location.line));
    }
  }
}

function layoutPropertyValues(group: MarkVSpecLayoutGroup, key: string): string[] {
  const values = group.items
    .filter((item) => item.type === "property" && item.scope === "metadata" && item.key === key)
    .map((item) => item.type === "property" ? item.value : "");
  if (values.length > 0) {
    return values;
  }
  const value = group.properties[key];
  return typeof value === "string" ? [value] : [];
}

function validateViewContextActionEffects(
  result: MarkVSpecParseResult,
  viewContextByName: Map<string, MarkVSpecViewContextDefinition>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const check = (sideEffect: string, line: number | undefined): void => {
    const match = /^view:\s*\$\{view\.([^}]+)\}\s*=\s*(.+)$/u.exec(sideEffect.trim());
    if (!match) {
      return;
    }

    const [, name, rawValue] = match;
    const value = rawValue.trim();
    const definition = viewContextByName.get(name.trim());
    if (!definition) {
      diagnostics.push({
        severity: "error",
        message: `View effect references missing view context ${name.trim()}.`,
        line
      });
      return;
    }

    if (!definition.values.some((candidate) => candidate.value === value)) {
      diagnostics.push({
        severity: "error",
        message: `View effect sets ${name.trim()} to unsupported value ${value}.`,
        line
      });
    }
  };

  for (const action of result.actions) {
    for (const outcome of action.outcomes) {
      outcome.sideEffects.forEach((sideEffect, index) => {
        check(sideEffect, outcome.propertyLocations["view"]?.[index]?.line ?? outcome.location?.line);
      });
    }
    for (const step of action.processSteps) {
      step.sideEffects.forEach((sideEffect, index) => {
        check(sideEffect, step.propertyLocations["view"]?.[index]?.line ?? step.location.line);
      });
      for (const outcome of step.outcomes) {
        outcome.sideEffects.forEach((sideEffect, index) => {
          check(sideEffect, outcome.propertyLocations["view"]?.[index]?.line ?? outcome.location?.line);
        });
      }
    }
  }
}
