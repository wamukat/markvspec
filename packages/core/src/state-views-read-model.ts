import { actionAppliesToState } from "./action-applicability.js";
import {
  isSystemEventAction,
  processLifecycleTriggerSource
} from "./action-envelope-read-model.js";
import { buildDisplayContentSpecRows } from "./display-content-spec.js";
import type { DisplayContentSpecRow } from "./display-content-spec.js";
import { activeControlledPanelReferences, controlledPanelReferences, isFormControlElement } from "./element-domain.js";
import {
  layoutConditionValues,
  layoutHasVisibilityConditions
} from "./layout-domain.js";
import { resolveLayoutGroupsForViewport } from "./layout-resolution.js";
import {
  createStateScreenScenarioContext,
  normalizeRouteHashValue,
  orderedStatePreviewDisplays,
  scenarioSourceStateId,
  screenRouteSamplesFor
} from "./state-screen-scenario-model.js";
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

export interface ControlledPanelPlacement {
  readonly layoutId: string;
  readonly elementId: string;
  readonly active: boolean;
}

type ParsedElement = MarkVSpecParseResult["elements"][number];
type ParsedLayout = MarkVSpecParseResult["layoutGroups"][number];
type ParsedSlotContent = MarkVSpecParseResult["slotContents"][number];
type ParsedDisplayEffect = NonNullable<MarkVSpecParseResult["actions"][number]["processSteps"][number]["outcomes"][number]["display"]>;
type ParsedPreviewScenario = MarkVSpecParseResult["previewScenarios"][number];

export type StateScreenViewKind = "state" | "baseline" | "scenario";

export type StateScreenScenarioMode = "overlap" | "state-override";

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
  readonly viewKind: StateScreenViewKind;
  readonly sourceStateId?: string;
  readonly displayStateId?: string;
  readonly scenarioMode?: StateScreenScenarioMode;
  readonly initial: boolean;
  readonly message?: string;
  readonly focus?: FocusScope;
  readonly modelValues: Record<string, boolean>;
  readonly viewValues: Record<string, boolean | number | string>;
  /** Effective scenario data for rendering after baseline inheritance has been applied. */
  readonly scenarioRoute: ParsedPreviewScenario["route"];
  readonly scenarioSamples: ParsedPreviewScenario["samples"];
  /** Scenario data explicitly authored on this view, shown as display data rather than a diff. */
  readonly scenarioExplicitRoute: ParsedPreviewScenario["route"];
  readonly scenarioExplicitSamples: ParsedPreviewScenario["samples"];
  readonly scenarioOverview: string[];
  readonly scenarioNotes: string[];
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
    const models = markRepeatedStateScreenItemsForViewport(
      wireframeResult,
      result,
      buildStateScreenReadModels(result, wireframeResult, undefined, focus, options)
    );
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

  return orderedViewports.map((viewport) => {
    const models = markRepeatedStateScreenItemsForViewport(
      wireframeResult,
      result,
      buildStateScreenReadModels(result, wireframeResult, viewport, focus, options)
    );
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
  const screenRouteSamples = screenRouteSamplesFor(wireframeResult);
  const displayStateName = primaryDisplayState(result)?.name;
  const displayModelValues = modelValuesForState(wireframeResult, displayStateName);
  const displayViewValues = viewValuesForScenario(wireframeResult, undefined);
  if (result.states.length === 0) {
    const ids = stateScreenRenderedIdsFromReadModel(wireframeResult, viewport, "", displayModelValues, displayViewValues, scenarioRouteValues(screenRouteSamples) ?? {});
    const actionIds = relevantActionIdsForState(wireframeResult, "", ids.elementIds);
    return [{
      stateName: undefined,
      viewport,
      title: viewport ? `${label("viewport")} ${viewport}` : label("default"),
      stateViewTitle: viewport ? `${label("viewport")} ${viewport}` : label("default"),
      scenario: false,
      viewKind: "state",
      sourceStateId: undefined,
      displayStateId: undefined,
      scenarioMode: undefined,
      initial: false,
      message: undefined,
      focus,
      modelValues: displayModelValues,
      viewValues: displayViewValues,
      scenarioRoute: screenRouteSamples,
      scenarioSamples: [],
      scenarioExplicitRoute: [],
      scenarioExplicitSamples: [],
      scenarioOverview: [],
      scenarioNotes: [],
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
        viewKind: "state",
        sourceStateId: undefined,
        displayStateId: undefined,
        scenarioMode: undefined,
        initial: false,
        message: undefined,
        focus,
        modelValues: displayModelValues,
        viewValues: displayViewValues,
        scenarioRoute: screenRouteSamples,
        scenarioSamples: [],
        scenarioExplicitRoute: [],
        scenarioExplicitSamples: [],
        scenarioOverview: [],
        scenarioNotes: [],
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
  const scenarioContext = createStateScreenScenarioContext({
    result,
    wireframeResult,
    viewport,
    screenRouteSamples,
    displayStateName,
    displayModelValues,
    displayViewValues,
    support: {
      modelValuesForState,
      relevantActionIdsForState,
      scenarioRouteValues,
      stateScreenRenderedIdsFromReadModel,
      viewValuesForScenario
    }
  });

  const displays = orderedStatePreviewDisplays(result, orderedDisplayStates(result));

  return displays
    .map((display, index) => {
      const current = display.scenario
        ? scenarioContext.renderScenario(display.state.name, display.scenario.model, display.scenario.view, display.scenario.route, display.scenario.samples, display.scenario.cases)
        : scenarioContext.renderState(display.state.name);
      const title = display.scenario
        ? display.scenario.name
        : index === 0 && viewport ? `${label("default")} ${label("viewport")} ${viewport}` : display.state.name;
      const stateViewTitle = display.scenario
        ? `${display.state.name} / ${display.scenario.name}`
        : display.state.name;
      const scenario = Boolean(display.scenario);
      const viewKind: StateScreenViewKind = display.scenario
        ? "scenario"
        : scenarioContext.baselineScenarioSamplesByState.has(display.state.name) || scenarioContext.baselineScenarioRouteByState.has(display.state.name) ? "baseline" : "state";
      const sourceStateId = display.scenario
        ? scenarioSourceStateId(wireframeResult, display.scenario, display.state.name)
        : display.state.name;
      const displayStateId = display.state.name;
      const scenarioMode: StateScreenScenarioMode | undefined = display.scenario
        ? sourceStateId === displayStateId ? "overlap" : "state-override"
        : undefined;
      return {
        stateName: display.state.name,
        viewport,
        title,
        stateViewTitle,
        scenario,
        viewKind,
        sourceStateId,
        displayStateId,
        scenarioMode,
        initial: display.state.initial,
        message: display.state.message,
        focus,
        modelValues: current.modelValues,
        viewValues: current.viewValues,
        scenarioRoute: current.scenarioRoute,
        scenarioSamples: current.scenarioSamples,
        scenarioExplicitRoute: current.scenarioExplicitRoute,
        scenarioExplicitSamples: current.scenarioExplicitSamples,
        scenarioOverview: display.scenario
          ? display.scenario.overview ?? []
          : scenarioContext.proseForState(display.state.name)?.overview ?? [],
        scenarioNotes: display.scenario
          ? display.scenario.notes ?? []
          : scenarioContext.proseForState(display.state.name)?.notes ?? [],
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
          viewKind,
          sourceStateId,
          displayStateId,
          scenarioMode,
          initial: display.state.initial,
          message: display.state.message,
          focus,
          modelValues: current.modelValues,
          viewValues: current.viewValues,
          scenarioRoute: current.scenarioRoute,
          scenarioSamples: current.scenarioSamples,
          scenarioExplicitRoute: current.scenarioExplicitRoute,
          scenarioExplicitSamples: current.scenarioExplicitSamples,
          scenarioOverview: display.scenario
            ? display.scenario.overview ?? []
            : scenarioContext.proseForState(display.state.name)?.overview ?? [],
          scenarioNotes: display.scenario
            ? display.scenario.notes ?? []
            : scenarioContext.proseForState(display.state.name)?.notes ?? [],
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

function createStateScreenSeenRegistry(): StateScreenSeenRegistry {
  return {
    current: new Set<string>()
  };
}

function markRepeatedStateScreenItemsForViewport(
  keyResult: MarkVSpecParseResult,
  specResult: MarkVSpecParseResult,
  models: StateScreenReadModel[]
): StateScreenReadModel[] {
  const stateBaseModels = stateScreenBaseModelsByState(models);
  let previousModel: StateScreenReadModel | undefined;

  return models.map((model) => {
    const baseModel = model.viewKind === "scenario" && model.scenarioMode === "overlap"
      ? stateBaseModels.get(model.sourceStateId ?? "")
      : previousModel;
    const displayModel = baseModel
      ? markRepeatedStateScreenItemsAgainstBase(keyResult, specResult, model, baseModel)
      : {
          ...model,
          repeatedContent: repeatedContentState(specResult, model)
        };

    if ((model.viewKind === "state" || model.viewKind === "baseline") && model.stateName) {
      stateBaseModels.set(model.stateName, model);
    }
    previousModel = model;
    return displayModel;
  });
}

function stateScreenBaseModelsByState(models: StateScreenReadModel[]): Map<string, StateScreenReadModel> {
  const stateBaseModels = new Map<string, StateScreenReadModel>();
  for (const model of models) {
    if ((model.viewKind === "state" || model.viewKind === "baseline") && model.stateName) {
      stateBaseModels.set(model.stateName, model);
    }
  }
  return stateBaseModels;
}

function markRepeatedStateScreenItemsAgainstBase(
  keyResult: MarkVSpecParseResult,
  specResult: MarkVSpecParseResult,
  model: StateScreenReadModel,
  baseModel: StateScreenReadModel
): StateScreenReadModel {
  const seen = createStateScreenSeenRegistry();
  rememberStateScreenKeys(keyResult, baseModel, seen);
  return markRepeatedCurrentStateScreenItems(keyResult, specResult, model, seen);
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
    if (!model.scenarioExplicitSamples.some((sample) => sample.elementId === elementId && scenarioSampleAffectsStructure(sample)) && seen.current.has(stateScreenCurrentKey(keyResult, model, "element", elementId))) {
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

function scenarioSampleAffectsStructure(sample: ParsedPreviewScenario["samples"][number]): boolean {
  return Boolean(sample.rows);
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
  const controlledPanelLayoutIds = new Set(stateScreenControlledPanelPlacementsForModel(result, model).map((placement) => placement.layoutId));
  return new Set(resolveLayoutGroupsForViewport(result, {
    viewport: model.viewport,
    focusLayoutIds: model.focus?.layoutIds
  })
    .filter((layout) => layout.id.startsWith("L-") && !placedLayoutIds.has(layout.id) && !defaultLayoutIds.has(layout.id) && !controlledPanelLayoutIds.has(layout.id))
    .map((layout) => layout.id));
}

export function stateScreenControlledPanelPlacementsForModel(result: MarkVSpecParseResult, model: StateScreenReadModel): ControlledPanelPlacement[] {
  const activeViewport = stateScreenActiveViewport(result, model.viewport);
  const layoutGroups = activeViewport ? resolveLayoutGroupsForViewport(result, {
    viewport: activeViewport,
    focusLayoutIds: model.focus?.layoutIds
  }) : [];
  const layoutById = new Map(layoutGroups.map((group) => [group.id, group]));
  const stateNames = new Set(result.states.map((state) => state.name));
  const options = {
    modelValues: model.modelValues,
    viewValues: model.viewValues,
    routeValues: scenarioRouteValues(model.scenarioRoute) ?? {}
  };
  const placements = new Map<string, ControlledPanelPlacement>();

  const addPlacement = (layoutId: string | undefined, elementId: string, active: boolean) => {
    if (!layoutId || !layoutById.has(layoutId)) {
      return;
    }
    const key = `${layoutId}\u0000${elementId}`;
    const existing = placements.get(key);
    placements.set(key, {
      layoutId,
      elementId,
      active: Boolean(existing?.active || active)
    });
  };

  for (const element of result.elements) {
    if (!model.renderedIds.elementIds.has(element.id)) {
      continue;
    }
    if (model.focus && !model.focus.elementIds.has(element.id)) {
      continue;
    }

    const activePanelIds = new Set(activeControlledPanelReferences(element, {
      isConditionActive: (condition) => isStateScreenActiveCondition(condition, model.stateName, stateNames, options)
    }).flatMap((reference) => reference.panelId ? [reference.panelId] : []));
    for (const reference of controlledPanelReferences(element)) {
      addPlacement(reference.panelId, element.id, Boolean(reference.panelId && activePanelIds.has(reference.panelId)));
    }
  }

  return [...placements.values()];
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
  const formControls = elements.filter(isFormControlElement);
  const displayContentRows = buildDisplayContentSpecRows(elements, {
    scenarioSamples: model?.scenarioSamples,
    routeValues: scenarioRouteValues(model?.scenarioRoute),
    sampleRowsAnchorId: model ? (elementId) => sampleRowsAnchorId(model, elementId) : undefined
  });
  const categorizedIds = new Set([
    ...formControls.map((element) => element.id),
    ...displayContentRows.map((row) => row.element.id)
  ]);
  const other = elements.filter((element) => !categorizedIds.has(element.id));
  return { formControls, displayContentRows, other };
}

export function scenarioRouteValues(routeSamples: readonly ParsedPreviewScenario["route"][number][] | undefined): Record<string, string> | undefined {
  if (!routeSamples || routeSamples.length === 0) {
    return undefined;
  }
  return Object.fromEntries(routeSamples.map((sample) => [
    sample.key,
    sample.key === "hash" ? normalizeRouteHashValue(sample.value) ?? "" : sample.value
  ]));
}

export function sampleRowsAnchorId(model: Pick<StateScreenReadModel, "stateViewTitle" | "viewport">, elementId: string): string {
  const viewport = model.viewport ?? "default";
  return `sample-rows-${anchorToken(viewport)}-${anchorToken(model.stateViewTitle)}-${anchorToken(elementId)}`;
}

function anchorToken(value: string): string {
  return encodeURIComponent(value)
    .replace(/%/gu, ".")
    .replace(/[^A-Za-z0-9_.-]/gu, "-");
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
  return result.states.find((state) => state.initial) ?? result.states.find((state) => !state.preInitial);
}

function orderedDisplayStates(result: MarkVSpecParseResult): MarkVSpecParseResult["states"] {
  const firstState = primaryDisplayState(result);
  if (!firstState) {
    return [];
  }

  return [
    firstState,
    ...result.states.filter((state) => state.name !== firstState.name && !state.preInitial)
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

    const processResponseTrigger = processLifecycleTriggerSource(action);
    const sourceActionId = processResponseTrigger?.event === "response" ? processResponseTrigger.actionId : undefined;
    const sourceProcessMarker = processResponseTrigger?.event === "response" ? processResponseTrigger.processMarker : undefined;
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
  viewValues: Record<string, boolean | number | string> = defaultViewValues(result),
  routeValues: Record<string, string> = {}
): RenderedIds {
  const elementIds = new Set<string>();
  const layoutIds = new Set<string>();
  const stateNames = new Set(result.states.map((state) => state.name));
  const options = { modelValues, viewValues, routeValues };
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
    for (const panelId of stateScreenControlledPanelIdsForElement(element, stateName, stateNames, options)) {
      const panelLayout = layoutById.get(panelId);
      if (panelLayout) {
        visitLayout(panelLayout, layoutById, activeViewport ?? "", new Set());
      }
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

function stateScreenControlledPanelIdsForElement(
  element: ParsedElement,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: StateScreenConditionOptions
): string[] {
  return activeControlledPanelReferences(element, {
    isConditionActive: (condition) => isStateScreenActiveCondition(condition, activeState, stateNames, options)
  }).flatMap((reference) => reference.panelId ? [reference.panelId] : []);
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
    isSystemEventAction(action) &&
    !actionHasVisibleElementMarker(result, action, renderedElementIds) &&
    actionAppliesToState(action, stateName, { initial, unscoped: "initial" })
  );
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
  return layoutHasVisibilityConditions(group);
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
  const visibleWhen = layoutConditionValues(group, "visible when");
  if (visibleWhen.length > 0 && !visibleWhen.some((condition) => isStateScreenShownForCondition(condition, activeState, stateNames, options))) {
    return false;
  }
  const hiddenWhen = layoutConditionValues(group, "hidden when");
  if (hiddenWhen.some((condition) => isStateScreenActiveCondition(condition, activeState, stateNames, options))) {
    return false;
  }
  return true;
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
  routeValues: Record<string, string>;
}

function isStateScreenNamespacedCondition(condition: string): boolean {
  return /^(not\s+)?\$\{(?:model|view|state|route)\.[^}]+\}(?:\s*=\s*[^=].*)?$/u.test(condition.trim());
}

function isStateScreenActiveNamespacedCondition(condition: string, activeState: string | undefined, options: StateScreenConditionOptions): boolean {
  const normalized = condition.trim();
  const negated = normalized.startsWith("not ");
  const expression = negated ? normalized.slice(4).trim() : normalized;
  const equality = /^(\$\{(?:model|view|state|route)\.[^}]+\})\s*=\s*(.+)$/u.exec(expression);
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
  } else if (body.startsWith("route.")) {
    const routeKey = body.slice("route.".length);
    value = options.routeValues[key] ?? options.routeValues[body] ?? options.routeValues[routeKey];
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
