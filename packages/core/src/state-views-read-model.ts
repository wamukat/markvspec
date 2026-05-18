import { actionAppliesToState } from "./action-applicability.js";
import { buildDisplayContentSpecRows, isFormControlElement } from "./display-content-spec.js";
import type { DisplayContentSpecRow } from "./display-content-spec.js";
import {
  displayMessageExplanationKind,
  displayMessageMarker,
  displayMessageTextSummary,
  parseDisplayMessageReference
} from "./display-effect.js";
import { resolveLayoutGroupsForViewport } from "./layout-resolution.js";
import { stateViewLayoutSignature } from "./state-view-signatures.js";
import type { MarkVSpecParseResult } from "./types.js";

export interface FocusScope {
  layoutIds: Set<string>;
  elementIds: Set<string>;
  actionIds: Set<string>;
}

export interface RenderedIds {
  layoutIds: Set<string>;
  elementIds: Set<string>;
}

type ParsedElement = MarkVSpecParseResult["elements"][number];
type ParsedLayout = MarkVSpecParseResult["layoutGroups"][number];
type ParsedSlotContent = MarkVSpecParseResult["slotContents"][number];
type ParsedDisplayEffect = NonNullable<MarkVSpecParseResult["actions"][number]["processSteps"][number]["outcomes"][number]["display"]>;
type ParsedPreviewScenario = MarkVSpecParseResult["previewScenarios"][number];

export interface StateScreenRepeatedContent {
  readonly layoutSpecEmptyWhenRepeatedHidden: boolean;
  readonly elementSummaryEmptyWhenRepeatedHidden: boolean;
  readonly inputFormSpecEmptyWhenRepeatedHidden: boolean;
  readonly displayContentSpecEmptyWhenRepeatedHidden: boolean;
  readonly otherElementsEmptyWhenRepeatedHidden: boolean;
  readonly actionSpecEmptyWhenRepeatedHidden: boolean;
  readonly systemEventsEmptyWhenRepeatedHidden: boolean;
  readonly hasSuppressedRepeatedContent: boolean;
  readonly hasVisibleStateSpecWhenRepeatedHidden: boolean;
}

export interface StateScreenReadModel {
  readonly stateName?: string;
  readonly viewport?: string;
  readonly title: string;
  readonly stateViewTitle: string;
  readonly scenario: boolean;
  readonly initial: boolean;
  readonly message?: string;
  readonly focus?: FocusScope;
  readonly modelValues: Record<string, boolean>;
  readonly viewValues: Record<string, boolean | number | string>;
  readonly scenarioSamples: ParsedPreviewScenario["samples"];
  readonly renderedIds: RenderedIds;
  readonly displayEffects: ParsedDisplayEffect[];
  readonly displayExplanations: StateScreenDisplayExplanation[];
  readonly actionIds: Set<string>;
  readonly stateNames: Set<string>;
  readonly repeatedLayoutIds?: Set<string>;
  readonly repeatedElementIds?: Set<string>;
  readonly repeatedActionIds?: Set<string>;
  readonly repeatedContent: StateScreenRepeatedContent;
}

export interface StateScreenDisplayExplanation {
  readonly markerId: string;
  readonly markerSource: "validation" | "business-rule" | "element" | "partial";
  readonly sourceId: string;
  readonly sourceName?: string;
  readonly targetRefs: string[];
  readonly contentKind: "message" | "element" | "partial";
  readonly messageRef?: string;
  readonly elementRef?: string;
  readonly partialRef?: string;
  readonly textSummary: string[];
  readonly triggeredBy: string[];
  readonly kind: string;
}

export interface StateViewportReadModel {
  readonly viewport?: string;
  readonly isDefault: boolean;
  readonly models: StateScreenReadModel[];
}

export interface StateScreenReadModelOptions {
  label?: (key: "default" | "viewport") => string;
}

interface StateScreenSeenRegistry {
  current: Set<string>;
}

function defaultLabel(key: "default" | "viewport"): string {
  return key;
}

export function buildViewportStateScreenReadModels(
  result: MarkVSpecParseResult,
  wireframeResult: MarkVSpecParseResult,
  focus?: FocusScope,
  options: StateScreenReadModelOptions = {}
): StateViewportReadModel[] {
  const viewports = layoutViewports(wireframeResult);
  if (viewports.length === 0) {
    const seenStateScreenKeys = createStateScreenSeenRegistry();
    const models = buildStateScreenReadModels(result, wireframeResult, undefined, focus, options).map((model) => {
      const displayModel = markRepeatedCurrentStateScreenItems(wireframeResult, result, model, seenStateScreenKeys);
      rememberStateScreenKeys(wireframeResult, displayModel, seenStateScreenKeys);
      return displayModel;
    });
    return [{
      viewport: undefined,
      isDefault: false,
      models
    }];
  }

  const baselineViewport = resolveDocumentViewport(wireframeResult, viewports);
  const orderedViewports = [
    baselineViewport,
    ...viewports.filter((viewport) => viewport !== baselineViewport)
  ];
  const seenStateScreenKeys = createStateScreenSeenRegistry();

  return orderedViewports.map((viewport) => {
    const models = buildStateScreenReadModels(result, wireframeResult, viewport, focus, options).map((model) => {
      const displayModel = markRepeatedCurrentStateScreenItems(wireframeResult, result, model, seenStateScreenKeys);
      rememberStateScreenKeys(wireframeResult, displayModel, seenStateScreenKeys);
      return displayModel;
    });
    return {
      viewport,
      isDefault: viewport === baselineViewport,
      models
    };
  });
}

export function buildStateScreenReadModels(
  result: MarkVSpecParseResult,
  wireframeResult: MarkVSpecParseResult,
  viewport: string | undefined,
  focus?: FocusScope,
  options: StateScreenReadModelOptions = {}
): StateScreenReadModel[] {
  const label = options.label ?? defaultLabel;
  const displayStateName = primaryDisplayState(result)?.name;
  const displayModelValues = modelValuesForState(wireframeResult, displayStateName);
  const displayViewValues = viewValuesForScenario(wireframeResult, undefined);
  if (result.states.length === 0) {
    const ids = stateScreenRenderedIdsFromReadModel(wireframeResult, viewport, "", displayModelValues, displayViewValues);
    const actionIds = relevantActionIdsForState(wireframeResult, "", ids.elementIds);
    return [{
      stateName: undefined,
      viewport,
      title: viewport ? `${label("viewport")} ${viewport}` : label("default"),
      stateViewTitle: viewport ? `${label("viewport")} ${viewport}` : label("default"),
      scenario: false,
      initial: false,
      message: undefined,
      focus,
      modelValues: displayModelValues,
      viewValues: displayViewValues,
      scenarioSamples: [],
      renderedIds: ids,
      displayEffects: [],
      displayExplanations: [],
      actionIds,
      stateNames: new Set(),
      repeatedContent: repeatedContentState(result, {
        stateName: undefined,
        viewport,
        title: viewport ? `${label("viewport")} ${viewport}` : label("default"),
        stateViewTitle: viewport ? `${label("viewport")} ${viewport}` : label("default"),
        scenario: false,
        initial: false,
        message: undefined,
        focus,
        modelValues: displayModelValues,
        viewValues: displayViewValues,
        scenarioSamples: [],
        renderedIds: ids,
        displayEffects: [],
        displayExplanations: [],
        actionIds,
        stateNames: new Set(),
        repeatedContent: emptyRepeatedContent()
      })
    }];
  }

  const stateNames = new Set(result.states.map((state) => state.name));
  const baselineScenarioSamplesByState = baselinePreviewScenarioSamplesByState(result);
  const stateRenderings = new Map<string, { ids: RenderedIds; actionIds: Set<string>; modelValues: Record<string, boolean>; viewValues: Record<string, boolean | number | string>; scenarioSamples: ParsedPreviewScenario["samples"]; displayEffects: ParsedDisplayEffect[]; displayExplanations: StateScreenDisplayExplanation[] }>();
  if (displayStateName) {
    const displayScenarioSamples = baselineScenarioSamplesByState.get(displayStateName) ?? [];
    const displayIds = stateScreenRenderedIdsFromReadModel(wireframeResult, viewport, displayStateName, displayModelValues, displayViewValues);
    stateRenderings.set(displayStateName, {
      ids: displayIds,
      actionIds: relevantActionIdsForState(wireframeResult, displayStateName, displayIds.elementIds),
      modelValues: displayModelValues,
      viewValues: displayViewValues,
      scenarioSamples: displayScenarioSamples,
      displayEffects: [],
      displayExplanations: []
    });
  }
  const renderState = (stateName: string) => {
    const existing = stateRenderings.get(stateName);
    if (existing) {
      return existing;
    }
    const stateModelValues = modelValuesForState(wireframeResult, stateName);
    const stateViewValues = viewValuesForScenario(wireframeResult, undefined);
    const scenarioSamples = baselineScenarioSamplesByState.get(stateName) ?? [];
    const ids = stateScreenRenderedIdsFromReadModel(wireframeResult, viewport, stateName, stateModelValues, stateViewValues);
    const actionIds = relevantActionIdsForState(wireframeResult, stateName, ids.elementIds);
    const rendered = { ids, actionIds, modelValues: stateModelValues, viewValues: stateViewValues, scenarioSamples, displayEffects: [], displayExplanations: [] };
    stateRenderings.set(stateName, rendered);
    return rendered;
  };
  const renderScenario = (
    scenarioResult: MarkVSpecParseResult,
    scenarioViewport: string | undefined,
    stateName: string,
    modelName: string | undefined,
    viewName: string | undefined,
    samples: ParsedPreviewScenario["samples"],
    cases: MarkVSpecParseResult["previewScenarios"][number]["cases"]
  ) => {
    const modelValues = modelValuesForState(scenarioResult, modelName ?? stateName);
    const viewValues = viewValuesForScenario(scenarioResult, viewName);
    const scenarioSamples = mergeScenarioSamples(baselineScenarioSamplesByState.get(stateName) ?? [], samples);
    const ids = stateScreenRenderedIdsFromReadModel(scenarioResult, scenarioViewport, stateName, modelValues, viewValues);
    const displayEffects = displayEffectsForScenarioCases(scenarioResult, cases);
    const displayExplanations = displayExplanationsForScenarioCases(scenarioResult, cases);
    addDisplayEffectTargetsToRenderedIds(ids, displayEffects, scenarioResult, viewport);
    return {
      ids,
      actionIds: relevantActionIdsForState(scenarioResult, stateName, ids.elementIds),
      modelValues,
      viewValues,
      scenarioSamples,
      displayEffects,
      displayExplanations
    };
  };

  const displays = orderedStatePreviewDisplays(result);

  return displays
    .map((display, index) => {
      const current = display.scenario
        ? renderScenario(wireframeResult, viewport, display.state.name, display.scenario.model, display.scenario.view, display.scenario.samples, display.scenario.cases)
        : renderState(display.state.name);
      const title = display.scenario
        ? display.scenario.name
        : index === 0 && viewport ? `${label("default")} ${label("viewport")} ${viewport}` : display.state.name;
      const stateViewTitle = display.scenario
        ? `${display.state.name} / ${display.scenario.name}`
        : display.state.name;
      const scenario = Boolean(display.scenario);
      return {
        stateName: display.state.name,
        viewport,
        title,
        stateViewTitle,
        scenario,
        initial: display.state.initial,
        message: display.state.message,
        focus,
        modelValues: current.modelValues,
        viewValues: current.viewValues,
        scenarioSamples: current.scenarioSamples,
        renderedIds: current.ids,
        displayEffects: current.displayEffects,
        displayExplanations: current.displayExplanations,
        actionIds: current.actionIds,
        stateNames,
        repeatedContent: repeatedContentState(result, {
          stateName: display.state.name,
          viewport,
          title,
          stateViewTitle,
          scenario,
          initial: display.state.initial,
          message: display.state.message,
          focus,
          modelValues: current.modelValues,
          viewValues: current.viewValues,
          scenarioSamples: current.scenarioSamples,
          renderedIds: current.ids,
          displayEffects: current.displayEffects,
          displayExplanations: current.displayExplanations,
          actionIds: current.actionIds,
          stateNames,
          repeatedContent: emptyRepeatedContent()
        })
      } satisfies StateScreenReadModel;
    });
}

function orderedStatePreviewDisplays(
  result: MarkVSpecParseResult
): Array<{ state: MarkVSpecParseResult["states"][number]; scenario?: ParsedPreviewScenario }> {
  const displays: Array<{ state: MarkVSpecParseResult["states"][number]; scenario?: ParsedPreviewScenario }> =
    orderedDisplayStates(result).map((state) => ({ state }));
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
  cases: MarkVSpecParseResult["previewScenarios"][number]["cases"]
): ParsedDisplayEffect[] {
  return cases.flatMap((caseRef) => {
    const action = result.actions.find((candidate) => candidate.id === caseRef.actionId);
    const step = action?.processSteps.find((candidate) => candidate.marker === caseRef.processMarker);
    const outcome = step?.outcomes.find((candidate) => candidate.result === caseRef.caseName);
    return outcome?.display ? [outcome.display] : [];
  });
}

function displayExplanationsForScenarioCases(
  result: MarkVSpecParseResult,
  cases: MarkVSpecParseResult["previewScenarios"][number]["cases"]
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

function createStateScreenSeenRegistry(): StateScreenSeenRegistry {
  return {
    current: new Set<string>()
  };
}

function markRepeatedCurrentStateScreenItems(
  keyResult: MarkVSpecParseResult,
  specResult: MarkVSpecParseResult,
  model: StateScreenReadModel,
  seen: StateScreenSeenRegistry
): StateScreenReadModel {
  const repeatedLayoutIds = new Set<string>();
  const repeatedElementIds = new Set<string>();
  const repeatedActionIds = new Set<string>();
  for (const layout of stateScreenLayoutsForModel(keyResult, model)) {
    if (seen.current.has(stateScreenCurrentKey(keyResult, model, "layout", layout.id))) {
      repeatedLayoutIds.add(layout.id);
    }
  }
  for (const elementId of model.renderedIds.elementIds) {
    if (!model.scenarioSamples.some((sample) => sample.elementId === elementId) && seen.current.has(stateScreenCurrentKey(keyResult, model, "element", elementId))) {
      repeatedElementIds.add(elementId);
    }
  }
  for (const actionId of model.actionIds) {
    if (seen.current.has(stateScreenCurrentKey(keyResult, model, "action", actionId))) {
      repeatedActionIds.add(actionId);
    }
  }

  return {
    ...model,
    repeatedLayoutIds: repeatedLayoutIds.size > 0 ? repeatedLayoutIds : undefined,
    repeatedElementIds: repeatedElementIds.size > 0 ? repeatedElementIds : undefined,
    repeatedActionIds: repeatedActionIds.size > 0 ? repeatedActionIds : undefined,
    repeatedContent: repeatedContentState(
      specResult,
      model,
      repeatedLayoutIds.size > 0 ? repeatedLayoutIds : undefined,
      repeatedElementIds.size > 0 ? repeatedElementIds : undefined,
      repeatedActionIds.size > 0 ? repeatedActionIds : undefined
    )
  };
}

function emptyRepeatedContent(): StateScreenRepeatedContent {
  return {
    layoutSpecEmptyWhenRepeatedHidden: false,
    elementSummaryEmptyWhenRepeatedHidden: false,
    inputFormSpecEmptyWhenRepeatedHidden: false,
    displayContentSpecEmptyWhenRepeatedHidden: false,
    otherElementsEmptyWhenRepeatedHidden: false,
    actionSpecEmptyWhenRepeatedHidden: false,
    systemEventsEmptyWhenRepeatedHidden: false,
    hasSuppressedRepeatedContent: false,
    hasVisibleStateSpecWhenRepeatedHidden: false
  };
}

function repeatedContentState(
  result: MarkVSpecParseResult,
  model: StateScreenReadModel,
  repeatedLayoutIds: ReadonlySet<string> | undefined = model.repeatedLayoutIds,
  repeatedElementIds: ReadonlySet<string> | undefined = model.repeatedElementIds,
  repeatedActionIds: ReadonlySet<string> | undefined = model.repeatedActionIds
): StateScreenRepeatedContent {
  const layouts = stateScreenLayoutsForModel(result, model);
  const elements = stateScreenElementsForModel(result, model);
  const elementGroups = stateScreenElementGroups(elements, result, model.stateName, model);
  const actions = stateScreenActionsForModel(result, model);
  const systemEvents = systemEventActionsForState(result, model.renderedIds.elementIds, model.stateName, model.initial, model.focus);
  const layoutSpecEmptyWhenRepeatedHidden = everyIdRepeated(layouts, repeatedLayoutIds, (layout) => layout.id);
  const elementSummaryEmptyWhenRepeatedHidden = everyIdRepeated(elements, repeatedElementIds, (element) => element.id);
  const inputFormSpecEmptyWhenRepeatedHidden = everyIdRepeated(elementGroups.formControls, repeatedElementIds, (element) => element.id);
  const displayContentSpecEmptyWhenRepeatedHidden = everyIdRepeated(elementGroups.displayContentRows, repeatedElementIds, (row) => row.element.id);
  const otherElementsEmptyWhenRepeatedHidden = everyIdRepeated(elementGroups.other, repeatedElementIds, (element) => element.id);
  const actionSpecEmptyWhenRepeatedHidden = everyIdRepeated(actions, repeatedActionIds, (action) => action.id);
  const systemEventsEmptyWhenRepeatedHidden = everyIdRepeated(systemEvents, repeatedActionIds, (action) => action.id);
  const hasSuppressedRepeatedContent = hasRepeatedId(layouts, repeatedLayoutIds, (layout) => layout.id) ||
    hasRepeatedId(elements, repeatedElementIds, (element) => element.id) ||
    hasRepeatedId(actions, repeatedActionIds, (action) => action.id) ||
    hasRepeatedId(systemEvents, repeatedActionIds, (action) => action.id);
  const hasVisibleStateSpecWhenRepeatedHidden = hasNonRepeatedId(layouts, repeatedLayoutIds, (layout) => layout.id) ||
    hasNonRepeatedId(elements, repeatedElementIds, (element) => element.id) ||
    hasNonRepeatedId(actions, repeatedActionIds, (action) => action.id) ||
    hasNonRepeatedId(systemEvents, repeatedActionIds, (action) => action.id);

  return {
    layoutSpecEmptyWhenRepeatedHidden,
    elementSummaryEmptyWhenRepeatedHidden,
    inputFormSpecEmptyWhenRepeatedHidden,
    displayContentSpecEmptyWhenRepeatedHidden,
    otherElementsEmptyWhenRepeatedHidden,
    actionSpecEmptyWhenRepeatedHidden,
    systemEventsEmptyWhenRepeatedHidden,
    hasSuppressedRepeatedContent,
    hasVisibleStateSpecWhenRepeatedHidden
  };
}

export function stateScreenLayoutsForModel(result: MarkVSpecParseResult, model: StateScreenReadModel): ParsedLayout[] {
  const seen = new Set<string>();
  const unplacedLayoutIds = stateScreenUnplacedLayoutIdsForModel(result, model);
  const visibleLayouts = resolveLayoutGroupsForViewport(result, {
    layoutIds: model.renderedIds.layoutIds,
    viewport: model.viewport,
    focusLayoutIds: model.focus?.layoutIds
  });
  const unplacedLayouts = resolveLayoutGroupsForViewport(result, {
    viewport: model.viewport,
    focusLayoutIds: model.focus?.layoutIds
  }).filter((layout) => unplacedLayoutIds.has(layout.id));
  return [...visibleLayouts, ...unplacedLayouts].filter((layout) => {
    if (seen.has(layout.id)) {
      return false;
    }
    seen.add(layout.id);
    return true;
  });
}

export function stateScreenUnplacedLayoutIdsForModel(result: MarkVSpecParseResult, model: StateScreenReadModel): Set<string> {
  const placedLayoutIds = stateScreenPlacedLayoutIdsForModel(result, model);
  const defaultLayoutIds = slotDefaultLayoutIds(result);
  return new Set(resolveLayoutGroupsForViewport(result, {
    viewport: model.viewport,
    focusLayoutIds: model.focus?.layoutIds
  })
    .filter((layout) => layout.id.startsWith("L-") && !placedLayoutIds.has(layout.id) && !defaultLayoutIds.has(layout.id))
    .map((layout) => layout.id));
}

function stateScreenPlacedLayoutIdsForModel(result: MarkVSpecParseResult, model: StateScreenReadModel): Set<string> {
  const activeViewport = stateScreenActiveViewport(result, model.viewport);
  const defaultLayoutIds = slotDefaultLayoutIds(result);
  const layoutGroups = activeViewport ? resolveLayoutGroupsForViewport(result, {
    viewport: activeViewport,
    focusLayoutIds: model.focus?.layoutIds
  }).filter((group) => !defaultLayoutIds.has(group.id)) : [];
  const layoutById = new Map(layoutGroups.map((group) => [group.id, group]));
  const slotContentsByName = stateScreenSlotContentsByName(result.slotContents);
  const placedLayoutIds = new Set<string>(model.renderedIds.layoutIds);

  const visitLayout = (group: ParsedLayout, currentLayoutById: Map<string, ParsedLayout>, currentViewport: string, visited: Set<string>) => {
    if (visited.has(group.id)) {
      return;
    }
    const nextVisited = new Set(visited);
    nextVisited.add(group.id);
    if (group.id.startsWith("L-")) {
      placedLayoutIds.add(group.id);
    }
    for (const item of group.items) {
      if (item.type === "contains") {
        const childLayout = currentLayoutById.get(item.targetId);
        if (childLayout) {
          visitLayout(childLayout, currentLayoutById, currentViewport, nextVisited);
        }
      } else if (item.type === "slot") {
        const slotContent = resolveStateScreenSlotContent(slotContentsByName, item.name, group.viewport || currentViewport);
        if (!slotContent) {
          continue;
        }
        const slotLayoutById = new Map(slotContent.layoutGroups.map((slotGroup) => [slotGroup.id, slotGroup]));
        for (const rootGroup of stateScreenRootLayouts(slotContent.layoutGroups, slotLayoutById)) {
          visitLayout(rootGroup, slotLayoutById, slotContent.viewport || group.viewport || currentViewport, new Set());
        }
      }
    }
  };

  for (const rootGroup of stateScreenRootLayouts(layoutGroups, layoutById)) {
    visitLayout(rootGroup, layoutById, activeViewport ?? "", new Set());
  }
  for (const display of model.displayEffects) {
    if (display.element?.startsWith("L-")) {
      const layout = layoutById.get(display.element);
      if (layout) {
        visitLayout(layout, layoutById, activeViewport ?? "", new Set());
      }
    }
  }

  return placedLayoutIds;
}

export function stateScreenElementsForModel(result: MarkVSpecParseResult, model: StateScreenReadModel): ParsedElement[] {
  return result.elements.filter((element) => model.renderedIds.elementIds.has(element.id) && (!model.focus || model.focus.elementIds.has(element.id)));
}

export function stateScreenActionsForModel(result: MarkVSpecParseResult, model: StateScreenReadModel): MarkVSpecParseResult["actions"] {
  return result.actions.filter((action) => model.actionIds.has(action.id) && (!model.focus || model.focus.actionIds.has(action.id)));
}

export function stateScreenElementGroups(
  elements: ParsedElement[],
  result?: MarkVSpecParseResult,
  stateName?: string,
  model?: StateScreenReadModel
): {
  formControls: ParsedElement[];
  displayContentRows: DisplayContentSpecRow[];
  other: ParsedElement[];
} {
  const formControls = elements.filter((element) => isFormControlElement(element.type));
  const displayContentRows = buildDisplayContentSpecRows(elements, { scenarioSamples: model?.scenarioSamples });
  const categorizedIds = new Set([
    ...formControls.map((element) => element.id),
    ...displayContentRows.map((row) => row.element.id)
  ]);
  const other = elements.filter((element) => !categorizedIds.has(element.id));
  return { formControls, displayContentRows, other };
}

function everyIdRepeated<T>(
  items: T[],
  repeatedIds: ReadonlySet<string> | undefined,
  idForItem: (item: T) => string
): boolean {
  return items.length > 0 && Boolean(repeatedIds && items.every((item) => repeatedIds.has(idForItem(item))));
}

function hasNonRepeatedId<T>(
  items: T[],
  repeatedIds: ReadonlySet<string> | undefined,
  idForItem: (item: T) => string
): boolean {
  return items.some((item) => !repeatedIds?.has(idForItem(item)));
}

function hasRepeatedId<T>(
  items: T[],
  repeatedIds: ReadonlySet<string> | undefined,
  idForItem: (item: T) => string
): boolean {
  return Boolean(repeatedIds && items.some((item) => repeatedIds.has(idForItem(item))));
}

function rememberStateScreenKeys(
  result: MarkVSpecParseResult,
  model: StateScreenReadModel,
  seen: StateScreenSeenRegistry,
  options: { layouts?: boolean; elements?: boolean; actions?: boolean } = {}
): void {
  const includeLayouts = options.layouts ?? true;
  const includeElements = options.elements ?? true;
  const includeActions = options.actions ?? true;
  if (includeLayouts) {
    for (const layout of stateScreenLayoutsForModel(result, model)) {
      seen.current.add(stateScreenCurrentKey(result, model, "layout", layout.id));
    }
  }
  if (includeElements) {
    for (const elementId of model.renderedIds.elementIds) {
      seen.current.add(stateScreenCurrentKey(result, model, "element", elementId));
    }
  }
  if (includeActions) {
    for (const actionId of model.actionIds) {
      seen.current.add(stateScreenCurrentKey(result, model, "action", actionId));
    }
  }
}

function stateScreenCurrentKey(
  result: MarkVSpecParseResult,
  model: StateScreenReadModel,
  kind: "layout" | "element" | "action",
  id: string
): string {
  const signature = kind === "element"
    ? elementDefinitionSignature(result, id) ?? ""
    : kind === "layout"
      ? stateViewLayoutSignature(result, id, model.viewport) ?? ""
      : actionDefinitionSignature(result, id) ?? "";
  return `${kind}\u0000${id}\u0000${signature}`;
}

function elementDefinitionSignature(result: MarkVSpecParseResult, id: string): string | undefined {
  const element = result.elements.find((candidate) => candidate.id === id);
  if (!element) {
    return undefined;
  }

  return JSON.stringify({
    type: element.type,
    properties: signatureProperties(element.properties),
    routeParams: element.routeParams,
    selectOptions: element.selectOptions,
    tableColumns: element.tableColumns,
    tableRows: element.tableRows,
    visibleWhen: element.visibleWhen,
    hiddenWhen: element.hiddenWhen,
    disabledWhen: element.disabledWhen,
    validations: element.validations,
    inputRules: element.inputRules,
    overview: element.overview ?? [],
    notes: element.notes ?? []
  });
}

function signatureProperties(properties: Record<string, string | true>): Record<string, string | true> {
  return Object.fromEntries(
    Object.entries(properties)
      .filter(([key]) => key !== "marker")
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

function actionDefinitionSignature(result: MarkVSpecParseResult, id: string): string | undefined {
  const action = result.actions.find((candidate) => candidate.id === id);
  if (!action) {
    return undefined;
  }

  return JSON.stringify({
    name: action.name,
    fromStates: action.fromStates,
    triggeredBy: action.triggeredBy,
    trigger: action.trigger,
    transitions: action.transitions.map((transition) => ({
      from: transition.from,
      to: transition.to,
      result: transition.result
    })),
    target: action.target,
    mode: action.mode,
    fragment: action.fragment,
    sideEffects: action.sideEffects,
    outcomes: action.outcomes.map((outcome) => ({
      result: outcome.result,
      flow: outcome.flow,
      from: outcome.from,
      to: outcome.to,
      description: outcome.description,
      response: outcome.response ? {
        result: outcome.response.result,
        definition: outcome.response.definition
      } : undefined,
      request: outcome.request,
      target: outcome.target,
      mode: outcome.mode,
      fragment: outcome.fragment,
      content: outcome.content,
      sideEffects: outcome.sideEffects,
      errorCodes: outcome.errorCodes,
      routeParams: outcome.routeParams
    })),
    processSteps: action.processSteps.map((step) => ({
      name: step.name,
      indent: step.indent,
      parallelGroup: step.parallelGroup,
      resolveGroup: step.resolveGroup,
      when: step.when,
      skipWhen: step.skipWhen,
      details: step.details.map((detail) => ({ key: detail.key, value: detail.value })),
      outcomes: step.outcomes.map((outcome) => ({
        result: outcome.result,
        flow: outcome.flow,
        from: outcome.from,
        to: outcome.to,
        description: outcome.description,
        response: outcome.response ? {
          result: outcome.response.result,
          definition: outcome.response.definition
        } : undefined,
        request: outcome.request,
        target: outcome.target,
        mode: outcome.mode,
        fragment: outcome.fragment,
        content: outcome.content,
        sideEffects: outcome.sideEffects,
        errorCodes: outcome.errorCodes,
        routeParams: outcome.routeParams
      })),
      target: step.target,
      mode: step.mode,
      fragment: step.fragment,
      content: step.content,
      sideEffects: step.sideEffects
    })),
    routeParams: action.routeParams,
    responses: action.responses.map((response) => ({
      result: response.result,
      definition: response.definition
    })),
    properties: Object.fromEntries(Object.entries(action.properties).sort(([left], [right]) => left.localeCompare(right))),
    overview: action.overview ?? [],
    notes: action.notes ?? []
  });
}

function primaryDisplayState(result: MarkVSpecParseResult): MarkVSpecParseResult["states"][number] | undefined {
  return result.states.find((state) => state.initial) ?? result.states[0];
}

function orderedDisplayStates(result: MarkVSpecParseResult): MarkVSpecParseResult["states"] {
  const firstState = primaryDisplayState(result);
  if (!firstState) {
    return [];
  }

  return [
    firstState,
    ...result.states.filter((state) => state.name !== firstState.name)
  ];
}

export function defaultDisplayState(result: MarkVSpecParseResult): MarkVSpecParseResult["states"][number] | undefined {
  const name = result.screen.defaultState;
  return name ? result.states.find((state) => state.name === name) : undefined;
}

function layoutViewports(result: MarkVSpecParseResult): string[] {
  return [...new Set(result.layoutGroups.map((layout) => layout.viewport))];
}

function resolveDocumentViewport(result: MarkVSpecParseResult, viewports: string[]): string {
  return viewports[0] ?? "";
}

export function modelValuesForState(result: MarkVSpecParseResult, state: string | undefined): Record<string, boolean> {
  if (!state) {
    return {};
  }

  const values: Record<string, boolean> = {};
  const actionsById = new Map(result.actions.map((action) => [action.id, action]));
  for (const action of result.actions) {
    const reachingTransitions = action.transitions.filter((transition) => transition.to === state);
    if (reachingTransitions.length === 0) {
      continue;
    }

    Object.assign(values, literalTrueModelValues(action));

    const processResponseTrigger = action.triggeredBy?.match(/^(A-[\p{L}\p{N}-]+)\.(P[A-Za-z0-9_-]+)\.response$/u);
    const sourceActionId = processResponseTrigger?.[1];
    const sourceProcessMarker = processResponseTrigger?.[2];
    const sourceAction = sourceActionId ? actionsById.get(sourceActionId) : undefined;
    const sourceProcess = sourceProcessMarker ? sourceAction?.processSteps.find((step) => step.marker === sourceProcessMarker) : undefined;
    if (sourceProcess) {
      Object.assign(values, literalTrueModelValuesFromStep(sourceProcess));
    }

    if (
      result.screen.type === "partial" &&
      action.triggeredBy === "partial.render" &&
      reachingTransitions.some((transition) => !transition.result || transition.result === "success")
    ) {
      Object.assign(values, literalTrueModelValues(action));
    }
  }

  return values;
}

function literalTrueModelValues(action: MarkVSpecParseResult["actions"][number]): Record<string, boolean> {
  const values: Record<string, boolean> = {};
  for (const sideEffect of action.sideEffects) {
    assignLiteralTrueModelValue(values, literalTrueModelSideEffect(sideEffect));
  }
  for (const step of action.processSteps) {
    Object.assign(values, literalTrueModelValuesFromStep(step));
  }
  for (const outcome of action.outcomes) {
    for (const sideEffect of outcome.sideEffects) {
      assignLiteralTrueModelValue(values, literalTrueModelSideEffect(sideEffect));
    }
  }

  return values;
}

function literalTrueModelValuesFromStep(step: MarkVSpecParseResult["actions"][number]["processSteps"][number]): Record<string, boolean> {
  const values: Record<string, boolean> = {};
  for (const detail of step.details) {
    const modelKey = positiveModelCondition(detail.key);
    assignLiteralTrueModelValue(values, detail.value.trim().toLowerCase() === "true" ? modelKey : undefined);
  }
  for (const sideEffect of step.sideEffects) {
    assignLiteralTrueModelValue(values, literalTrueModelSideEffect(sideEffect));
  }
  for (const outcome of step.outcomes) {
    for (const sideEffect of outcome.sideEffects) {
      assignLiteralTrueModelValue(values, literalTrueModelSideEffect(sideEffect));
    }
  }
  return values;
}

function assignLiteralTrueModelValue(values: Record<string, boolean>, modelKey: string | undefined): void {
  if (!modelKey) {
    return;
  }
  values[modelKey] = true;
  values["${" + modelKey + "}"] = true;
}

function literalTrueModelSideEffect(sideEffect: string): string | undefined {
  const match = /^model:\s*(\$\{model\.[^}]+\})\s*=\s*true\s*$/iu.exec(sideEffect.trim());
  return match ? positiveModelCondition(match[1]) : undefined;
}

function positiveModelCondition(condition: string): string | undefined {
  const normalized = condition.trim();
  const key = normalized.startsWith("${") && normalized.endsWith("}") ? normalized.slice(2, -1).trim() : normalized;
  return /^model\.[A-Za-z0-9_.-]+$/.test(key) ? key : undefined;
}

function stateScreenRenderedIdsFromReadModel(
  result: MarkVSpecParseResult,
  viewport: string | undefined,
  stateName: string | undefined,
  modelValues: Record<string, boolean>,
  viewValues: Record<string, boolean | number | string> = defaultViewValues(result)
): RenderedIds {
  const elementIds = new Set<string>();
  const layoutIds = new Set<string>();
  const stateNames = new Set(result.states.map((state) => state.name));
  const options = { modelValues, viewValues };
  const activeViewport = stateScreenActiveViewport(result, viewport);
  const defaultLayoutIds = slotDefaultLayoutIds(result);
  const layoutGroups = activeViewport ? result.layoutGroups.filter((group) => group.viewport === activeViewport && !defaultLayoutIds.has(group.id)) : [];
  const layoutById = new Map(layoutGroups.map((group) => [group.id, group]));
  const elementById = new Map(result.elements.map((element) => [element.id, element]));
  const slotContentsByName = stateScreenSlotContentsByName(result.slotContents);

  const visitElement = (elementId: string) => {
    const element = elementById.get(elementId);
    if (!element || !isStateScreenElementVisible(element, stateName, stateNames, options)) {
      return;
    }
    if (element.id.startsWith("E-")) {
      elementIds.add(element.id);
    }
  };

  const visitLayout = (
    group: ParsedLayout,
    currentLayoutById: Map<string, ParsedLayout>,
    currentViewport: string,
    visited: Set<string>
  ) => {
    if (!isStateScreenLayoutVisible(group, stateName, stateNames, options)) {
      return;
    }
    if (visited.has(group.id)) {
      return;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(group.id);
    if (group.id.startsWith("L-")) {
      layoutIds.add(group.id);
    }

    for (const item of group.items) {
      if (item.type === "contains") {
        const childLayout = currentLayoutById.get(item.targetId);
        if (childLayout) {
          visitLayout(childLayout, currentLayoutById, currentViewport, nextVisited);
        } else {
          visitElement(item.targetId);
        }
      } else if (item.type === "field") {
        visitElement(item.elementId);
      } else if (item.type === "slot") {
        const slotContent = resolveStateScreenSlotContent(slotContentsByName, item.name, group.viewport || currentViewport);
        if (!slotContent) {
          continue;
        }
        const slotLayoutById = new Map(slotContent.layoutGroups.map((slotGroup) => [slotGroup.id, slotGroup]));
        for (const rootGroup of stateScreenRootLayouts(slotContent.layoutGroups, slotLayoutById)) {
          visitLayout(rootGroup, slotLayoutById, slotContent.viewport || group.viewport || currentViewport, new Set());
        }
      }
    }
  };

  if (layoutGroups.length > 0) {
    for (const rootGroup of stateScreenRootLayouts(layoutGroups, layoutById)) {
      visitLayout(rootGroup, layoutById, activeViewport ?? "", new Set());
    }
  } else {
    for (const element of result.elements) {
      visitElement(element.id);
    }
  }

  return {
    elementIds,
    layoutIds
  };
}

function relevantActionIdsForState(result: MarkVSpecParseResult, state: string, visibleElementIds: ReadonlySet<string>): Set<string> {
  const ids = new Set<string>();
  for (const action of result.actions) {
    if (action.trigger) {
      const stateMatches = action.fromStates.length === 0 || actionAppliesToState(action, state, { unscoped: "never" });
      if (stateMatches && actionHasVisibleElementMarker(result, action, visibleElementIds)) {
        ids.add(action.id);
      }
      continue;
    }

    if (actionAppliesToState(action, state, { unscoped: "never" }) || actionHasVisibleElementMarker(result, action, visibleElementIds)) {
      ids.add(action.id);
    }
  }
  return ids;
}

export function systemEventActionsForState(
  result: MarkVSpecParseResult,
  renderedElementIds: ReadonlySet<string>,
  stateName: string | undefined,
  initial: boolean,
  focus?: FocusScope
): MarkVSpecParseResult["actions"] {
  return result.actions.filter((action) =>
    (!focus || focus.actionIds.has(action.id)) &&
    isSystemEventTrigger(action.triggeredBy) &&
    !actionHasVisibleElementMarker(result, action, renderedElementIds) &&
    actionAppliesToState(action, stateName, { initial, unscoped: "initial" })
  );
}

function isSystemEventTrigger(triggeredBy: string | undefined): boolean {
  if (triggeredBy === "page.load" || triggeredBy === "screen.load" || triggeredBy === "partial.render") {
    return true;
  }

  return /^A-[\p{L}\p{N}-]+\.P[A-Za-z0-9_-]+\.response$/u.test(triggeredBy ?? "");
}

function actionHasVisibleElementMarker(
  result: MarkVSpecParseResult,
  action: MarkVSpecParseResult["actions"][number],
  renderedElementIds: ReadonlySet<string>
): boolean {
  if (action.trigger && renderedElementIds.has(action.trigger.elementId)) {
    return true;
  }

  const actionElement = action.properties["element"];
  if (actionElement && renderedElementIds.has(actionElement)) {
    return true;
  }

  return result.elements.some((element) =>
    renderedElementIds.has(element.id) &&
    element.properties["action"] === action.id
  );
}

function stateScreenActiveViewport(result: MarkVSpecParseResult, requestedViewport: string | undefined): string | undefined {
  const viewports = layoutViewports(result);
  if (requestedViewport && viewports.includes(requestedViewport)) {
    return requestedViewport;
  }
  return viewports[0];
}

function stateScreenRootLayouts(layoutGroups: ParsedLayout[], layoutById: Map<string, ParsedLayout>): ParsedLayout[] {
  const containedLayoutIds = new Set<string>();
  for (const group of layoutGroups) {
    for (const item of group.items) {
      if (item.type === "contains" && layoutById.has(item.targetId)) {
        containedLayoutIds.add(item.targetId);
      }
    }
  }

  const uncontainedGroups = layoutGroups.filter((group) => !containedLayoutIds.has(group.id));
  const rootGroups = uncontainedGroups.filter((group, index) => index === 0 || isStateScreenRootAlternative(group));
  return rootGroups.length > 0 ? rootGroups : layoutGroups.slice(0, 1);
}

function isStateScreenRootAlternative(group: ParsedLayout): boolean {
  return Boolean(group.properties["visible when"] || group.properties["hidden when"]);
}

function stateScreenSlotContentsByName(slotContents: ParsedSlotContent[]): Map<string, ParsedSlotContent[]> {
  const byName = new Map<string, ParsedSlotContent[]>();
  for (const slot of slotContents) {
    const slots = byName.get(slot.name) ?? [];
    slots.push(slot);
    byName.set(slot.name, slots);
  }
  return byName;
}

function resolveStateScreenSlotContent(slotContentsByName: Map<string, ParsedSlotContent[]>, name: string, viewport: string): ParsedSlotContent | undefined {
  const slots = slotContentsByName.get(name) ?? [];
  return slots.find((slot) => slot.viewport === viewport)
    ?? slots.find((slot) => !slot.viewport);
}

function slotDefaultLayoutIds(result: MarkVSpecParseResult): Set<string> {
  return new Set(result.slotDefinitions
    .map((slot) => typeof slot.properties["default"] === "string" ? slot.properties["default"].trim() : "")
    .filter((defaultId) => defaultId.startsWith("L-")));
}

function isStateScreenElementVisible(
  element: ParsedElement,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: StateScreenConditionOptions
): boolean {
  if (element.visibleWhen.length > 0 && !element.visibleWhen.some((condition) => isStateScreenShownForCondition(condition, activeState, stateNames, options))) {
    return false;
  }
  if (element.hiddenWhen.some((condition) => isStateScreenActiveCondition(condition, activeState, stateNames, options))) {
    return false;
  }
  return true;
}

function isStateScreenLayoutVisible(
  group: ParsedLayout,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: StateScreenConditionOptions
): boolean {
  const visibleWhen = layoutPropertyValues(group, "visible when");
  if (visibleWhen.length > 0 && !visibleWhen.some((condition) => isStateScreenShownForCondition(condition, activeState, stateNames, options))) {
    return false;
  }
  const hiddenWhen = layoutPropertyValues(group, "hidden when");
  if (hiddenWhen.some((condition) => isStateScreenActiveCondition(condition, activeState, stateNames, options))) {
    return false;
  }
  return true;
}

function layoutPropertyValues(group: ParsedLayout, key: string): string[] {
  const values = group.items
    .filter((item) => item.type === "property" && item.scope === "metadata" && item.key === key)
    .map((item) => item.type === "property" ? item.value : "");
  if (values.length > 0) {
    return values;
  }
  const value = group.properties[key];
  return typeof value === "string" ? [value] : [];
}

function isStateScreenShownForCondition(
  condition: string | undefined,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: StateScreenConditionOptions
): boolean {
  if (!condition) {
    return true;
  }
  if (isStateScreenNamespacedCondition(condition)) {
    return isStateScreenActiveNamespacedCondition(condition, activeState, options);
  }
  if (!isStateScreenStateScopedCondition(condition, stateNames)) {
    return true;
  }
  return isStateScreenActiveStateCondition(condition, activeState);
}

function isStateScreenActiveCondition(
  condition: string | undefined,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: StateScreenConditionOptions
): boolean {
  if (!condition) {
    return false;
  }
  if (isStateScreenNamespacedCondition(condition)) {
    return isStateScreenActiveNamespacedCondition(condition, activeState, options);
  }
  return isStateScreenActiveStateCondition(condition, activeState);
}

function isStateScreenActiveStateCondition(condition: string | undefined, activeState: string | undefined): boolean {
  if (!condition || !activeState) {
    return false;
  }
  const normalized = condition.trim();
  return normalized === activeState || normalized === `state is ${activeState}`;
}

function isStateScreenStateScopedCondition(condition: string, stateNames: Set<string>): boolean {
  const normalized = condition.trim();
  return normalized.startsWith("state is ") || stateNames.has(normalized);
}

interface StateScreenConditionOptions {
  modelValues: Record<string, boolean>;
  viewValues: Record<string, boolean | number | string>;
}

function isStateScreenNamespacedCondition(condition: string): boolean {
  return /^(not\s+)?\$\{(?:model|view|state)\.[^}]+\}(?:\s*=\s*[^=].*)?$/u.test(condition.trim());
}

function isStateScreenActiveNamespacedCondition(condition: string, activeState: string | undefined, options: StateScreenConditionOptions): boolean {
  const normalized = condition.trim();
  const negated = normalized.startsWith("not ");
  const expression = negated ? normalized.slice(4).trim() : normalized;
  const equality = /^(\$\{(?:model|view|state)\.[^}]+\})\s*=\s*(.+)$/u.exec(expression);
  const key = equality?.[1] ?? expression;
  const expected = equality?.[2]?.trim();
  const body = key.startsWith("${") && key.endsWith("}") ? key.slice(2, -1).trim() : key;
  let value: boolean | number | string | undefined;
  if (body.startsWith("model.")) {
    value = options.modelValues[key] ?? options.modelValues[body];
  } else if (body.startsWith("view.")) {
    const viewKey = body.slice("view.".length);
    value = options.viewValues[key] ?? options.viewValues[body] ?? options.viewValues[viewKey];
  } else if (body.startsWith("state.")) {
    const stateName = body.slice("state.".length);
    value = activeState === stateName;
  }
  const active = expected === undefined
    ? (value === undefined ? false : Boolean(value))
    : String(value) === expected;
  return negated ? !active : active;
}

function defaultViewValues(result: MarkVSpecParseResult): Record<string, boolean | number | string> {
  return viewValuesForScenario(result, undefined);
}

function viewValuesForScenario(result: MarkVSpecParseResult, sampleName: string | undefined): Record<string, boolean | number | string> {
  const sample = sampleName
    ? result.viewContextSamples.find((candidate) => candidate.name === sampleName)
    : result.viewContextSamples.find((candidate) => candidate.name === "default");
  const values: Record<string, boolean | number | string> = {};
  for (const definition of result.viewContexts) {
    const rawValue = sample?.values[definition.name] ?? definition.defaultValue ?? definition.values[0]?.value;
    if (rawValue === undefined) {
      continue;
    }
    const value = definition.type === "boolean" ? rawValue === "true" : rawValue;
    values[definition.name] = value;
    values[`view.${definition.name}`] = value;
    values["${view." + definition.name + "}"] = value;
  }
  if (sample) {
    for (const [name, rawValue] of Object.entries(sample.values)) {
      if (values[name] !== undefined) {
        continue;
      }
      values[name] = rawValue;
      values[`view.${name}`] = rawValue;
      values["${view." + name + "}"] = rawValue;
    }
  }
  return values;
}
