import {
  displayMessageExplanationKind,
  displayMessageMarker,
  displayMessageTextSummary,
  parseDisplayMessageReference
} from "./display-effect.js";
import { resolveLayoutGroupsForViewport } from "./layout-resolution.js";
import type {
  RenderedIds,
  StateScreenDisplayExplanation
} from "./state-views-read-model.js";
import type { MarkVSpecParseResult } from "./types.js";

type ParsedElement = MarkVSpecParseResult["elements"][number];
type ParsedLayout = MarkVSpecParseResult["layoutGroups"][number];
type ParsedDisplayEffect = NonNullable<MarkVSpecParseResult["actions"][number]["processSteps"][number]["outcomes"][number]["display"]>;
type ParsedPreviewScenario = MarkVSpecParseResult["previewScenarios"][number];

export interface StateScreenScenarioRendering {
  ids: RenderedIds;
  actionIds: Set<string>;
  modelValues: Record<string, boolean>;
  viewValues: Record<string, boolean | number | string>;
  scenarioRoute: ParsedPreviewScenario["route"];
  scenarioSamples: ParsedPreviewScenario["samples"];
  scenarioExplicitRoute: ParsedPreviewScenario["route"];
  scenarioExplicitSamples: ParsedPreviewScenario["samples"];
  displayEffects: ParsedDisplayEffect[];
  displayExplanations: StateScreenDisplayExplanation[];
}

export interface StateScreenScenarioContext {
  readonly baselineScenarioSamplesByState: Map<string, ParsedPreviewScenario["samples"]>;
  readonly baselineScenarioRouteByState: Map<string, ParsedPreviewScenario["route"]>;
  renderState(stateName: string): StateScreenScenarioRendering;
  renderScenario(
    stateName: string,
    modelName: string | undefined,
    viewName: string | undefined,
    route: ParsedPreviewScenario["route"],
    samples: ParsedPreviewScenario["samples"],
    cases: ParsedPreviewScenario["cases"]
  ): StateScreenScenarioRendering;
  proseForState(stateName: string): Pick<ParsedPreviewScenario, "notes" | "overview"> | undefined;
}

export interface StateScreenScenarioSupport {
  modelValuesForState(result: MarkVSpecParseResult, stateName: string | undefined): Record<string, boolean>;
  viewValuesForScenario(result: MarkVSpecParseResult, viewName: string | undefined): Record<string, boolean | number | string>;
  stateScreenRenderedIdsFromReadModel(
    result: MarkVSpecParseResult,
    viewport: string | undefined,
    stateName: string,
    modelValues: Record<string, boolean>,
    viewValues: Record<string, boolean | number | string>,
    routeValues: Record<string, string>
  ): RenderedIds;
  relevantActionIdsForState(result: MarkVSpecParseResult, stateName: string, elementIds: Set<string>): Set<string>;
  scenarioRouteValues(routeSamples: readonly ParsedPreviewScenario["route"][number][] | undefined): Record<string, string> | undefined;
}

export function createStateScreenScenarioContext(options: {
  result: MarkVSpecParseResult;
  wireframeResult: MarkVSpecParseResult;
  viewport: string | undefined;
  screenRouteSamples: ParsedPreviewScenario["route"];
  displayStateName: string | undefined;
  displayModelValues: Record<string, boolean>;
  displayViewValues: Record<string, boolean | number | string>;
  support: StateScreenScenarioSupport;
}): StateScreenScenarioContext {
  const {
    result,
    wireframeResult,
    viewport,
    screenRouteSamples,
    displayStateName,
    displayModelValues,
    displayViewValues,
    support
  } = options;
  const baselineScenarioSamplesByState = baselinePreviewScenarioSamplesByState(result);
  const baselineScenarioRouteByState = baselinePreviewScenarioRouteByState(result);
  const baselineScenarioProseByState = baselinePreviewScenarioProseByState(result);
  const stateRenderings = new Map<string, StateScreenScenarioRendering>();

  if (displayStateName) {
    const displayScenarioSamples = baselineScenarioSamplesByState.get(displayStateName) ?? [];
    const displayScenarioRoute = mergeScenarioRoute(screenRouteSamples, baselineScenarioRouteByState.get(displayStateName) ?? []);
    const displayIds = support.stateScreenRenderedIdsFromReadModel(
      wireframeResult,
      viewport,
      displayStateName,
      displayModelValues,
      displayViewValues,
      support.scenarioRouteValues(displayScenarioRoute) ?? {}
    );
    stateRenderings.set(displayStateName, {
      ids: displayIds,
      actionIds: support.relevantActionIdsForState(wireframeResult, displayStateName, displayIds.elementIds),
      modelValues: displayModelValues,
      viewValues: displayViewValues,
      scenarioRoute: displayScenarioRoute,
      scenarioSamples: displayScenarioSamples,
      scenarioExplicitRoute: baselineScenarioRouteByState.get(displayStateName) ?? [],
      scenarioExplicitSamples: displayScenarioSamples,
      displayEffects: [],
      displayExplanations: []
    });
  }

  const renderState = (stateName: string): StateScreenScenarioRendering => {
    const existing = stateRenderings.get(stateName);
    if (existing) {
      return existing;
    }
    const stateModelValues = support.modelValuesForState(wireframeResult, stateName);
    const stateViewValues = support.viewValuesForScenario(wireframeResult, undefined);
    const scenarioSamples = baselineScenarioSamplesByState.get(stateName) ?? [];
    const baselineRoute = baselineScenarioRouteByState.get(stateName) ?? [];
    const scenarioRoute = mergeScenarioRoute(screenRouteSamples, baselineRoute);
    const ids = support.stateScreenRenderedIdsFromReadModel(
      wireframeResult,
      viewport,
      stateName,
      stateModelValues,
      stateViewValues,
      support.scenarioRouteValues(scenarioRoute) ?? {}
    );
    const actionIds = support.relevantActionIdsForState(wireframeResult, stateName, ids.elementIds);
    const rendered = {
      ids,
      actionIds,
      modelValues: stateModelValues,
      viewValues: stateViewValues,
      scenarioRoute,
      scenarioSamples,
      scenarioExplicitRoute: baselineRoute,
      scenarioExplicitSamples: scenarioSamples,
      displayEffects: [],
      displayExplanations: []
    };
    stateRenderings.set(stateName, rendered);
    return rendered;
  };

  const renderScenario = (
    stateName: string,
    modelName: string | undefined,
    viewName: string | undefined,
    route: ParsedPreviewScenario["route"],
    samples: ParsedPreviewScenario["samples"],
    cases: ParsedPreviewScenario["cases"]
  ): StateScreenScenarioRendering => {
    const modelValues = support.modelValuesForState(wireframeResult, modelName ?? stateName);
    const viewValues = support.viewValuesForScenario(wireframeResult, viewName);
    const baselineRoute = mergeScenarioRoute(screenRouteSamples, baselineScenarioRouteByState.get(stateName) ?? []);
    const baselineSamples = baselineScenarioSamplesByState.get(stateName) ?? [];
    const scenarioRoute = mergeScenarioRoute(baselineRoute, route);
    const scenarioSamples = mergeScenarioSamples(baselineSamples, samples);
    const ids = support.stateScreenRenderedIdsFromReadModel(
      wireframeResult,
      viewport,
      stateName,
      modelValues,
      viewValues,
      support.scenarioRouteValues(scenarioRoute) ?? {}
    );
    const displayEffects = displayEffectsForScenarioCases(wireframeResult, cases);
    const displayExplanations = displayExplanationsForScenarioCases(wireframeResult, cases);
    addDisplayEffectTargetsToRenderedIds(ids, displayEffects, wireframeResult, viewport);
    return {
      ids,
      actionIds: support.relevantActionIdsForState(wireframeResult, stateName, ids.elementIds),
      modelValues,
      viewValues,
      scenarioRoute,
      scenarioSamples,
      scenarioExplicitRoute: route,
      scenarioExplicitSamples: samples,
      displayEffects,
      displayExplanations
    };
  };

  return {
    baselineScenarioSamplesByState,
    baselineScenarioRouteByState,
    renderState,
    renderScenario,
    proseForState: (stateName) => baselineScenarioProseByState.get(stateName)
  };
}

export function orderedStatePreviewDisplays(
  result: MarkVSpecParseResult,
  orderedStates: MarkVSpecParseResult["states"]
): Array<{ state: MarkVSpecParseResult["states"][number]; scenario?: ParsedPreviewScenario }> {
  const displays: Array<{ state: MarkVSpecParseResult["states"][number]; scenario?: ParsedPreviewScenario }> =
    orderedStates.map((state) => ({ state }));
  const stateNames = new Set(result.states.map((state) => state.name));
  const stateByName = new Map(result.states.map((state) => [state.name, state]));
  const scenarios = result.previewScenarios.filter((scenario): scenario is ParsedPreviewScenario & { state: string } =>
    Boolean(scenario.state && stateNames.has(scenario.state))
  );
  const scenarioByName = new Map(scenarios.map((scenario) => [scenario.name, scenario]));
  const placed = new Set<string>();
  const placing = new Set<string>();

  const insertAfterBaseState = (scenario: ParsedPreviewScenario & { state: string }) => {
    const baseIndex = lastIndexWhere(displays, (display) => display.state.name === scenario.state);
    const insertIndex = baseIndex >= 0 ? baseIndex + 1 : displays.length;
    const state = stateByName.get(scenario.state);
    if (!state) {
      return;
    }
    displays.splice(insertIndex, 0, {
      state,
      scenario
    });
    placed.add(scenario.name);
  };

  const placeScenario = (scenario: ParsedPreviewScenario & { state: string }) => {
    if (placed.has(scenario.name)) {
      return;
    }
    if (placing.has(scenario.name)) {
      return;
    }
    placing.add(scenario.name);

    if (scenario.before) {
      const targetScenario = scenarioByName.get(scenario.before);
      if (targetScenario) {
        placeScenario(targetScenario);
      }
      const targetIndex = displays.findIndex((display) =>
        display.state.name === scenario.before || display.scenario?.name === scenario.before
      );
      if (targetIndex >= 0) {
        const state = stateByName.get(scenario.state);
        if (!state) {
          placing.delete(scenario.name);
          return;
        }
        displays.splice(targetIndex, 0, {
          state,
          scenario
        });
        placed.add(scenario.name);
        placing.delete(scenario.name);
        return;
      }
    }

    insertAfterBaseState(scenario);
    placing.delete(scenario.name);
  };

  for (const scenario of scenarios) {
    placeScenario(scenario);
  }

  return displays;
}

function baselinePreviewScenarioSamplesByState(result: MarkVSpecParseResult): Map<string, ParsedPreviewScenario["samples"]> {
  const stateNames = new Set(result.states.map((state) => state.name));
  const samplesByState = new Map<string, ParsedPreviewScenario["samples"]>();
  for (const scenario of result.previewScenarios) {
    if (!scenario.state && stateNames.has(scenario.name)) {
      samplesByState.set(scenario.name, mergeScenarioSamples(samplesByState.get(scenario.name) ?? [], scenario.samples));
    }
  }
  return samplesByState;
}

function baselinePreviewScenarioRouteByState(result: MarkVSpecParseResult): Map<string, ParsedPreviewScenario["route"]> {
  const stateNames = new Set(result.states.map((state) => state.name));
  const routeByState = new Map<string, ParsedPreviewScenario["route"]>();
  for (const scenario of result.previewScenarios) {
    if (!scenario.state && stateNames.has(scenario.name)) {
      routeByState.set(scenario.name, mergeScenarioRoute(routeByState.get(scenario.name) ?? [], scenario.route));
    }
  }
  return routeByState;
}

function baselinePreviewScenarioProseByState(result: MarkVSpecParseResult): Map<string, Pick<ParsedPreviewScenario, "notes" | "overview">> {
  const stateNames = new Set(result.states.map((state) => state.name));
  const proseByState = new Map<string, Pick<ParsedPreviewScenario, "notes" | "overview">>();
  for (const scenario of result.previewScenarios) {
    if (!scenario.state && stateNames.has(scenario.name)) {
      const existing = proseByState.get(scenario.name);
      proseByState.set(scenario.name, {
        overview: [...(existing?.overview ?? []), ...(scenario.overview ?? [])],
        notes: [...(existing?.notes ?? []), ...(scenario.notes ?? [])]
      });
    }
  }
  return proseByState;
}

function mergeScenarioRoute(
  baseline: ParsedPreviewScenario["route"],
  override: ParsedPreviewScenario["route"]
): ParsedPreviewScenario["route"] {
  const byKey = new Map<string, ParsedPreviewScenario["route"][number]>();
  for (const sample of baseline) {
    byKey.set(sample.key, normalizeScenarioRouteSample(sample));
  }
  for (const sample of override) {
    byKey.set(sample.key, normalizeScenarioRouteSample(sample));
  }
  return [...byKey.values()];
}

function normalizeScenarioRouteSample(sample: ParsedPreviewScenario["route"][number]): ParsedPreviewScenario["route"][number] {
  if (sample.key !== "hash") {
    return sample;
  }
  return {
    ...sample,
    value: normalizeRouteHashValue(sample.value) ?? ""
  };
}

export function screenRouteSamplesFor(result: MarkVSpecParseResult): ParsedPreviewScenario["route"] {
  const hash = routeHashFromScreenRoute(result.screen.route);
  return hash === undefined ? [] : [{
    key: "hash",
    value: hash,
    location: result.screen.location ?? { line: 1 }
  }];
}

function routeHashFromScreenRoute(route: string | undefined): string | undefined {
  if (!route) {
    return undefined;
  }
  const hashIndex = route.indexOf("#");
  if (hashIndex === -1) {
    return undefined;
  }
  return normalizeRouteHashValue(route.slice(hashIndex + 1));
}

export function normalizeRouteHashValue(value: string): string | undefined {
  const normalized = value.trim().replace(/^#/u, "");
  return normalized.length > 0 ? normalized : undefined;
}

function mergeScenarioSamples(
  baseline: ParsedPreviewScenario["samples"],
  override: ParsedPreviewScenario["samples"]
): ParsedPreviewScenario["samples"] {
  const byElementId = new Map<string, ParsedPreviewScenario["samples"][number]>();
  for (const sample of baseline) {
    byElementId.set(sample.elementId, sample);
  }
  for (const sample of override) {
    byElementId.set(sample.elementId, sample);
  }
  return [...byElementId.values()];
}

function lastIndexWhere<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) {
      return index;
    }
  }
  return -1;
}

function displayEffectsForScenarioCases(
  result: MarkVSpecParseResult,
  cases: ParsedPreviewScenario["cases"]
): ParsedDisplayEffect[] {
  return cases.flatMap((caseRef) => {
    const action = result.actions.find((candidate) => candidate.id === caseRef.actionId);
    const step = action?.processSteps.find((candidate) => candidate.marker === caseRef.processMarker);
    const outcome = step?.outcomes.find((candidate) => candidate.result === caseRef.caseName);
    return outcome?.display ? [outcome.display] : [];
  });
}

export function scenarioSourceStateId(
  result: MarkVSpecParseResult,
  scenario: ParsedPreviewScenario,
  displayStateId: string
): string {
  const candidates = new Set<string>();
  for (const caseRef of scenario.cases) {
    const action = result.actions.find((candidate) => candidate.id === caseRef.actionId);
    const step = action?.processSteps.find((candidate) => candidate.marker === caseRef.processMarker);
    const outcome = step?.outcomes.find((candidate) => candidate.result === caseRef.caseName);
    if (outcome?.from) {
      candidates.add(outcome.from);
    }
    for (const fromState of action?.fromStates ?? []) {
      candidates.add(fromState);
    }
  }
  const concreteCandidates = [...candidates].filter((candidate) => candidate && candidate !== "*");
  if (concreteCandidates.length === 1) {
    return concreteCandidates[0];
  }
  if (concreteCandidates.includes(displayStateId)) {
    return displayStateId;
  }
  return concreteCandidates[0] ?? scenario.state ?? displayStateId;
}

function displayExplanationsForScenarioCases(
  result: MarkVSpecParseResult,
  cases: ParsedPreviewScenario["cases"]
): StateScreenDisplayExplanation[] {
  const explanations = new Map<string, StateScreenDisplayExplanation>();
  const validationsById = new Map(result.validations.map((validation) => [validation.id, validation]));
  const rulesById = new Map(result.rules.map((rule) => [rule.id, rule]));
  const elementsById = new Map(result.elements.map((element) => [element.id, element]));
  const layoutsById = new Map(result.layoutGroups.map((layout) => [layout.id, layout]));

  for (const caseRef of cases) {
    const action = result.actions.find((candidate) => candidate.id === caseRef.actionId);
    const step = action?.processSteps.find((candidate) => candidate.marker === caseRef.processMarker);
    const outcome = step?.outcomes.find((candidate) => candidate.result === caseRef.caseName);
    const display = outcome?.display;
    if (!action || !step || !display || (!display.message && !display.element && !display.partial)) {
      continue;
    }

    const targetRef = display.target ?? "(overlay)";
    const triggeredBy = `${action.id}.${step.marker ?? step.name}.${caseRef.caseName}`;
    const messageReference = display.message ? parseDisplayMessageReference(display.message) : undefined;
    const sourceId = messageReference?.sourceId ?? display.element ?? display.partial ?? "";
    if (!sourceId) {
      continue;
    }

    const validation = messageReference?.sourceKind === "validation" ? validationsById.get(sourceId) : undefined;
    const rule = messageReference?.sourceKind === "business-rule" ? rulesById.get(sourceId) : undefined;
    const element = sourceId.startsWith("E-") ? elementsById.get(sourceId) : undefined;
    const layout = sourceId.startsWith("L-") ? layoutsById.get(sourceId) : undefined;
    const markerId = messageReference ? displayMessageMarker(messageReference, validation, rule) : sourceId;
    const contentKind = display.message ? "message" : display.partial ? "partial" : "element";
    const key = `${sourceId}:${contentKind}`;
    const existing = explanations.get(key);
    const textSummary = display.message
      ? messageReference ? displayMessageTextSummary(messageReference, validation, rule) : []
      : [];
    const nextTargetRefs = appendUnique(existing?.targetRefs ?? [], targetRef);
    const nextTriggeredBy = appendUnique(existing?.triggeredBy ?? [], triggeredBy);
    explanations.set(key, {
      markerId,
      markerSource: messageReference?.sourceKind === "validation" ? "validation" : messageReference?.sourceKind === "business-rule" ? "business-rule" : sourceId.startsWith("PRT-") ? "partial" : "element",
      sourceId,
      sourceName: validation?.name ?? rule?.name ?? elementDisplayName(element) ?? layoutDisplayName(layout) ?? sourceId,
      targetRefs: nextTargetRefs,
      contentKind,
      messageRef: display.message,
      elementRef: display.element,
      partialRef: display.partial,
      textSummary: existing?.textSummary.length ? existing.textSummary : textSummary,
      triggeredBy: nextTriggeredBy,
      kind: displayMessageExplanationKind(messageReference, display.target, validation, rule)
    });
  }

  return [...explanations.values()];
}

function elementDisplayName(element: ParsedElement | undefined): string | undefined {
  const label = element?.properties["label"];
  return typeof label === "string" && label
    ? label
    : element?.id;
}

function layoutDisplayName(layout: ParsedLayout | undefined): string | undefined {
  return layout?.name || layout?.id;
}

function appendUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value];
}

function addDisplayEffectTargetsToRenderedIds(
  ids: RenderedIds,
  displayEffects: ParsedDisplayEffect[],
  result: MarkVSpecParseResult,
  viewport: string | undefined
): void {
  const layoutById = new Map(resolveLayoutGroupsForViewport(result, { viewport }).map((group) => [group.id, group]));
  const elementById = new Map(result.elements.map((element) => [element.id, element]));
  for (const display of displayEffects) {
    if (!display.element) {
      continue;
    }

    if (display.element.startsWith("L-")) {
      addLayoutAndChildrenToRenderedIds(ids, display.element, layoutById, new Set());
    } else if (display.element.startsWith("E-")) {
      ids.elementIds.add(display.element);
      addDialogActionButtonsToRenderedIds(ids, elementById.get(display.element));
    }
  }
}

function addDialogActionButtonsToRenderedIds(ids: RenderedIds, element: ParsedElement | undefined): void {
  if (element?.type !== "Dialog") {
    return;
  }

  for (const buttonId of parseDelimitedIds(String(element.properties["actions"] ?? ""))) {
    ids.elementIds.add(buttonId);
  }
}

function parseDelimitedIds(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function addLayoutAndChildrenToRenderedIds(
  ids: RenderedIds,
  layoutId: string,
  layoutById: Map<string, ParsedLayout>,
  visited: Set<string>
): void {
  if (visited.has(layoutId)) {
    return;
  }
  visited.add(layoutId);
  const layout = layoutById.get(layoutId);
  ids.layoutIds.add(layoutId);
  if (!layout) {
    return;
  }

  for (const item of layout.items) {
    if (item.type === "contains") {
      if (layoutById.has(item.targetId)) {
        addLayoutAndChildrenToRenderedIds(ids, item.targetId, layoutById, visited);
      } else if (item.targetId.startsWith("E-")) {
        ids.elementIds.add(item.targetId);
      }
    } else if (item.type === "field") {
      ids.elementIds.add(item.elementId);
    }
  }
}
