import { actionAppliesToState } from "./action-applicability.js";
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

export type DisplayContentSpecRow = {
  element: ParsedElement;
  location: string;
  value: string;
  source?: string | true;
  format?: string;
};

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
  readonly initial: boolean;
  readonly message?: string;
  readonly focus?: FocusScope;
  readonly modelValues: Record<string, boolean>;
  readonly renderedIds: RenderedIds;
  readonly actionIds: Set<string>;
  readonly stateNames: Set<string>;
  readonly repeatedLayoutIds?: Set<string>;
  readonly repeatedElementIds?: Set<string>;
  readonly repeatedActionIds?: Set<string>;
  readonly repeatedContent: StateScreenRepeatedContent;
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
  if (result.states.length === 0) {
    const ids = stateScreenRenderedIdsFromReadModel(wireframeResult, viewport, "", displayModelValues);
    const actionIds = relevantActionIdsForState(wireframeResult, "", ids.elementIds);
    return [{
      stateName: undefined,
      viewport,
      title: viewport ? `${label("viewport")} ${viewport}` : label("default"),
      initial: false,
      message: undefined,
      focus,
      modelValues: displayModelValues,
      renderedIds: ids,
      actionIds,
      stateNames: new Set(),
      repeatedContent: repeatedContentState(result, {
        stateName: undefined,
        viewport,
        title: viewport ? `${label("viewport")} ${viewport}` : label("default"),
        initial: false,
        message: undefined,
        focus,
        modelValues: displayModelValues,
        renderedIds: ids,
        actionIds,
        stateNames: new Set(),
        repeatedContent: emptyRepeatedContent()
      })
    }];
  }

  const stateNames = new Set(result.states.map((state) => state.name));
  const stateRenderings = new Map<string, { ids: RenderedIds; actionIds: Set<string>; modelValues: Record<string, boolean> }>();
  if (displayStateName) {
    const displayIds = stateScreenRenderedIdsFromReadModel(wireframeResult, viewport, displayStateName, displayModelValues);
    stateRenderings.set(displayStateName, {
      ids: displayIds,
      actionIds: relevantActionIdsForState(wireframeResult, displayStateName, displayIds.elementIds),
      modelValues: displayModelValues
    });
  }
  const renderState = (stateName: string) => {
    const existing = stateRenderings.get(stateName);
    if (existing) {
      return existing;
    }
    const stateModelValues = modelValuesForState(wireframeResult, stateName);
    const ids = stateScreenRenderedIdsFromReadModel(wireframeResult, viewport, stateName, stateModelValues);
    const actionIds = relevantActionIdsForState(wireframeResult, stateName, ids.elementIds);
    const rendered = { ids, actionIds, modelValues: stateModelValues };
    stateRenderings.set(stateName, rendered);
    return rendered;
  };

  return orderedDisplayStates(result)
    .map((state, index) => {
      const current = renderState(state.name);
      return {
        stateName: state.name,
        viewport,
        title: index === 0 && viewport ? `${label("default")} ${label("viewport")} ${viewport}` : state.name,
        initial: state.initial,
        message: state.message,
        focus,
        modelValues: current.modelValues,
        renderedIds: current.ids,
        actionIds: current.actionIds,
        stateNames,
        repeatedContent: repeatedContentState(result, {
          stateName: state.name,
          viewport,
          title: index === 0 && viewport ? `${label("default")} ${label("viewport")} ${viewport}` : state.name,
          initial: state.initial,
          message: state.message,
          focus,
          modelValues: current.modelValues,
          renderedIds: current.ids,
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

function markRepeatedCurrentStateScreenItems(
  keyResult: MarkVSpecParseResult,
  specResult: MarkVSpecParseResult,
  model: StateScreenReadModel,
  seen: StateScreenSeenRegistry
): StateScreenReadModel {
  const repeatedLayoutIds = new Set<string>();
  const repeatedElementIds = new Set<string>();
  const repeatedActionIds = new Set<string>();
  for (const layoutId of model.renderedIds.layoutIds) {
    if (seen.current.has(stateScreenCurrentKey(keyResult, model, "layout", layoutId))) {
      repeatedLayoutIds.add(layoutId);
    }
  }
  for (const elementId of model.renderedIds.elementIds) {
    if (seen.current.has(stateScreenCurrentKey(keyResult, model, "element", elementId))) {
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
  const elementGroups = stateScreenElementGroups(elements);
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
  return resolveLayoutGroupsForViewport(result, {
    layoutIds: model.renderedIds.layoutIds,
    viewport: model.viewport,
    focusLayoutIds: model.focus?.layoutIds
  }).filter((layout) => {
    if (seen.has(layout.id)) {
      return false;
    }
    seen.add(layout.id);
    return true;
  });
}

export function stateScreenElementsForModel(result: MarkVSpecParseResult, model: StateScreenReadModel): ParsedElement[] {
  return result.elements.filter((element) => model.renderedIds.elementIds.has(element.id) && (!model.focus || model.focus.elementIds.has(element.id)));
}

export function stateScreenActionsForModel(result: MarkVSpecParseResult, model: StateScreenReadModel): MarkVSpecParseResult["actions"] {
  return result.actions.filter((action) => model.actionIds.has(action.id) && (!model.focus || model.focus.actionIds.has(action.id)));
}

export function stateScreenElementGroups(elements: ParsedElement[]): {
  formControls: ParsedElement[];
  displayContentRows: DisplayContentSpecRow[];
  other: ParsedElement[];
} {
  const formControls = elements.filter((element) => isFormControlElement(element.type));
  const displayContentRows = displayContentSpecRows(elements);
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
    for (const layoutId of model.renderedIds.layoutIds) {
      seen.current.add(stateScreenCurrentKey(result, model, "layout", layoutId));
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

function displayContentSpecRows(elements: ParsedElement[]): DisplayContentSpecRow[] {
  return elements.flatMap((element) => {
    const properties = element.properties;
    const rows: DisplayContentSpecRow[] = [];
    pushDisplayPropertyRow(rows, element, "label", properties["label"], properties["label src"]);
    pushDisplayPropertyRow(rows, element, "placeholder", properties["placeholder"], properties["placeholder src"]);
    pushDisplayPropertyRow(rows, element, "help", properties["help"], properties["help src"]);
    pushDisplayPropertyRow(rows, element, "message", properties["message"], properties["message src"]);
    pushDisplayPropertyRow(rows, element, "error text", properties["error text"]);
    pushDisplayPropertyRow(rows, element, "sample", properties["sample"], properties["src"], rawStringProperty(properties["format"]));
    pushDisplayPropertyRow(rows, element, "value", displayValueProperty(element), displayValueSource(element), rawStringProperty(properties["format"]));
    pushDisplayPropertyRow(rows, element, "content", properties["content"]);
    pushDisplayPropertyRow(rows, element, "text", properties["text"]);
    pushDisplayPropertyRow(rows, element, "title", properties["title"]);
    pushDisplayPropertyRow(rows, element, "alt", properties["alt"]);
    pushDisplayPropertyRow(rows, element, "name", properties["name"]);
    for (const option of element.selectOptions) {
      rows.push({
        element,
        location: "option label",
        value: option.label,
        source: option.source
      });
    }
    return rows;
  });
}

function pushDisplayPropertyRow(
  rows: DisplayContentSpecRow[],
  element: ParsedElement,
  location: string,
  value: string | true | undefined,
  source?: string | true,
  format?: string
): void {
  const stringValue = rawStringProperty(value);
  if (!stringValue) {
    return;
  }
  rows.push({ element, location, value: stringValue, source, format });
}

function displayValueProperty(element: ParsedElement): string | undefined {
  const value = rawStringProperty(element.properties["value"]);
  if (!value || isFormControlElement(element.type)) {
    return undefined;
  }
  return value;
}

function displayValueSource(element: ParsedElement): string | true | undefined {
  const value = rawStringProperty(element.properties["value"]);
  if (!value || !isOpaqueExpressionSource(value)) {
    return undefined;
  }
  return value;
}

function isFormControlElement(type: string): boolean {
  return ["Input", "Textarea", "Select", "MultiSelect", "Checkbox", "CheckboxGroup", "Switch", "RadioGroup", "DatePicker", "DateInput", "TimeInput", "NumberInput", "FileUpload", "FileInput"].includes(type);
}

function isOpaqueExpressionSource(value: string): boolean {
  return /^\$\{[^}]+\}$/.test(value);
}

function rawStringProperty(value: string | true | undefined): string {
  return typeof value === "string" ? value : "";
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
  if (result.screen.viewport && viewports.includes(result.screen.viewport)) {
    return result.screen.viewport;
  }

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

    const sourceActionId = action.triggeredBy?.match(/^(A-[\p{L}\p{N}-]+)\.response$/u)?.[1];
    const sourceAction = sourceActionId ? actionsById.get(sourceActionId) : undefined;
    if (sourceAction) {
      Object.assign(values, literalTrueModelValues(sourceAction));
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
  for (const step of action.processSteps) {
    for (const detail of step.details) {
      const modelKey = positiveModelCondition(detail.key);
      if (modelKey && detail.value.trim().toLowerCase() === "true") {
        values[modelKey] = true;
        values["${" + modelKey + "}"] = true;
      }
    }
  }

  return values;
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
  modelValues: Record<string, boolean>
): RenderedIds {
  const elementIds = new Set<string>();
  const layoutIds = new Set<string>();
  const stateNames = new Set(result.states.map((state) => state.name));
  const options = { modelValues };
  const activeViewport = stateScreenActiveViewport(result, viewport);
  const layoutGroups = activeViewport ? result.layoutGroups.filter((group) => group.viewport === activeViewport) : [];
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
    if (action.fromStates.length > 0) {
      if (actionAppliesToState(action, state, { unscoped: "never" })) {
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
  if (result.screen.viewport && viewports.includes(result.screen.viewport)) {
    return result.screen.viewport;
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
  return uncontainedGroups.length > 0 ? uncontainedGroups : layoutGroups.slice(0, 1);
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

function isStateScreenElementVisible(
  element: ParsedElement,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: { modelValues: Record<string, boolean> }
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
  options: { modelValues: Record<string, boolean> }
): boolean {
  const visibleWhen = group.properties["visible when"];
  if (visibleWhen && !isStateScreenShownForCondition(visibleWhen, activeState, stateNames, options)) {
    return false;
  }
  const hiddenWhen = group.properties["hidden when"];
  if (hiddenWhen && isStateScreenActiveCondition(hiddenWhen, activeState, stateNames, options)) {
    return false;
  }
  return true;
}

function isStateScreenShownForCondition(
  condition: string | undefined,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: { modelValues: Record<string, boolean> }
): boolean {
  if (!condition) {
    return true;
  }
  if (isStateScreenModelCondition(condition)) {
    return isStateScreenActiveModelCondition(condition, options);
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
  options: { modelValues: Record<string, boolean> }
): boolean {
  if (!condition) {
    return false;
  }
  if (isStateScreenModelCondition(condition)) {
    return isStateScreenActiveModelCondition(condition, options);
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

function isStateScreenModelCondition(condition: string): boolean {
  return /^(not\s+)?\$\{[^}]+\}$/u.test(condition.trim());
}

function isStateScreenActiveModelCondition(condition: string, options: { modelValues: Record<string, boolean> }): boolean {
  const normalized = condition.trim();
  const negated = normalized.startsWith("not ");
  const key = negated ? normalized.slice(4).trim() : normalized;
  const body = key.startsWith("${") && key.endsWith("}") ? key.slice(2, -1).trim() : key;
  const value = options.modelValues[key] ?? options.modelValues[body];
  const active = value === undefined ? false : Boolean(value);
  return negated ? !active : active;
}
