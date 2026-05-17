import { isLocalId, isPresentationPanelId, opaqueExpressionBody } from "./ids.js";
import { sourcePathKey } from "./model-paths.js";
import { messagesForLocale } from "./renderer-messages.js";
import { actionAppliesToState } from "./action-applicability.js";
import { sourceTypeForElement } from "./source-types.js";
import type {
  MarkVSpecAction,
  MarkVSpecElement,
  MarkVSpecLayoutGroup,
  MarkVSpecLayoutItem,
  MarkVSpecParseResult,
  MarkVSpecRenderOptions
} from "./types.js";

export function renderMarkVSpecHtml(result: MarkVSpecParseResult, options: MarkVSpecRenderOptions = {}): string {
  const includeStyles = options.includeStyles ?? true;
  const activeState = options.state ?? resolveDefaultState(result);
  const activeViewport = resolveViewport(result, options.viewport);
  const layoutGroups = activeViewport ? result.layoutGroups.filter((group) => group.viewport === activeViewport) : [];
  const layoutById = new Map(layoutGroups.map((group) => [group.id, group]));
  const slotContentsByName = mapSlotContentsByName(result.slotContents);
  const elementById = new Map(result.elements.map((element) => [element.id, element]));
  const stateNames = new Set(result.states.map((state) => state.name));
  const actionMarkersByElementId = mapActionMarkersByElementId(result.actions, result.elements, activeState);
  const containedLayoutIds = new Set<string>();
  const context = {
    ...renderContextForState(result, activeState),
    sampleOverrides: options.sampleOverrides ?? {},
    elementById,
    actionMarkersByElementId
  };
  const renderOptions = {
    ...options,
    viewValues: options.viewValues ?? defaultViewValues(result)
  };

  for (const group of layoutGroups) {
    for (const item of group.items) {
      if (item.type === "contains" && layoutById.has(item.targetId)) {
        containedLayoutIds.add(item.targetId);
      }
    }
  }

  const rootGroups = rootLayoutGroups(layoutGroups, layoutById, containedLayoutIds);
  const renderedBody = rootGroups.length > 0
    ? rootGroups.map((group) => renderLayoutGroup(group, result, layoutById, slotContentsByName, elementById, actionMarkersByElementId, activeState, stateNames, renderOptions, new Set(), context)).join("")
    : result.elements.map((element) => renderElement(element, actionMarkersByElementId, activeState, stateNames, renderOptions, false, context)).join("");
  const isEmpty = renderedBody.trim().length === 0;
  const body = isEmpty ? renderEmptyWireframePlaceholder(result, options) : renderedBody;

  const screenId = result.screen.id ?? "";
  const classes = ["mm-wireframe", isEmpty ? "mm-wireframe-empty" : ""].filter(Boolean).join(" ");
  return `${includeStyles ? renderDefaultStyles() : ""}<div class="${classes}" data-screen="${escapeHtml(screenId)}" data-mm-render-key="${escapeHtml(`screen:${screenId || "unknown"}`)}">${body}</div>`;
}

function renderEmptyWireframePlaceholder(result: MarkVSpecParseResult, options: MarkVSpecRenderOptions): string {
  const message = options.messages?.noVisibleElements ?? messagesForLocale(result.screen.locale).noVisibleElements;
  return `<div class="mm-empty-wireframe" role="note">${escapeHtml(message)}</div>`;
}

export interface MarkVSpecHtmlFragment {
  renderKey: string;
  html: string;
}

export function renderMarkVSpecHtmlFragment(result: MarkVSpecParseResult, renderKey: string, options: MarkVSpecRenderOptions = {}): MarkVSpecHtmlFragment | undefined {
  const elementMatch = /^element:(.+)$/u.exec(renderKey);
  const activeState = options.state ?? resolveDefaultState(result);
  const stateNames = new Set(result.states.map((state) => state.name));
  const actionMarkersByElementId = mapActionMarkersByElementId(result.actions, result.elements, activeState);
  const elementById = new Map(result.elements.map((element) => [element.id, element]));
  if (elementMatch) {
    const elementId = elementMatch[1];
    const element = result.elements.find((candidate) => candidate.id === elementId);
    if (!element) {
      return undefined;
    }

    return {
      renderKey,
      html: renderElement(element, actionMarkersByElementId, activeState, stateNames, { ...options, viewValues: options.viewValues ?? defaultViewValues(result) }, false, {
        ...renderContextForState(result, activeState),
        sampleOverrides: options.sampleOverrides ?? {},
        elementById,
        actionMarkersByElementId
      })
    };
  }

  const layoutMatch = /^layout:([^:]*):(.+)$/u.exec(renderKey);
  if (layoutMatch) {
    const [, viewport, layoutId] = layoutMatch;
    const layoutGroups = result.layoutGroups.filter((group) => group.viewport === viewport);
    const layout = layoutGroups.find((candidate) => candidate.id === layoutId);
    if (!layout) {
      return undefined;
    }

    return {
      renderKey,
      html: renderLayoutGroup(
        layout,
        result,
        new Map(layoutGroups.map((group) => [group.id, group])),
        mapSlotContentsByName(result.slotContents),
        elementById,
        actionMarkersByElementId,
        activeState,
        stateNames,
        { ...options, viewValues: options.viewValues ?? defaultViewValues(result) },
        new Set(),
        {
          ...renderContextForState(result, activeState),
          sampleOverrides: options.sampleOverrides ?? {},
          elementById,
          actionMarkersByElementId
        },
        false,
        undefined,
        layoutDepthFor(layoutId, layoutGroups)
      )
    };
  }

  const slotContentMatch = /^slot-content:([^:]+):([^:]+):(.+)$/u.exec(renderKey);
  if (slotContentMatch) {
    const [, slotName, slotViewport, layoutId] = slotContentMatch;
    const activeViewport = resolveViewport(result, options.viewport);
    const layoutGroups = activeViewport ? result.layoutGroups.filter((group) => group.viewport === activeViewport) : [];
    const slotContentsByName = mapSlotContentsByName(result.slotContents);
    const slotContent = resolveSlotContent(slotContentsByName, slotName, slotViewport === "default" ? "" : slotViewport);
    const layout = slotContent?.layoutGroups.find((candidate) => candidate.id === layoutId);
    if (!slotContent || !layout) {
      return undefined;
    }

    const insertionContexts = slotInsertionContextsFor(slotName, layoutGroups, activeState, stateNames, options);
    if (insertionContexts.length !== 1) {
      return undefined;
    }
    const [insertionContext] = insertionContexts;
    const depth = insertionContext.depth + layoutDepthFor(layoutId, slotContent.layoutGroups);

    return {
      renderKey,
      html: renderLayoutGroup(
        layout,
        result,
        new Map(slotContent.layoutGroups.map((group) => [group.id, group])),
        slotContentsByName,
        elementById,
        actionMarkersByElementId,
        activeState,
        stateNames,
        { ...options, viewValues: options.viewValues ?? defaultViewValues(result) },
        new Set(),
        {
          ...renderContextForState(result, activeState),
          sampleOverrides: options.sampleOverrides ?? {},
          elementById,
          actionMarkersByElementId,
          slotViewport: slotViewport === "default" ? activeViewport : slotViewport
        },
        insertionContext.parentDisabled,
        renderKey,
        depth
      )
    };
  }

  return undefined;
}

export function renderMarkVSpecHtmlFragments(result: MarkVSpecParseResult, renderKeys: string[], options: MarkVSpecRenderOptions = {}): MarkVSpecHtmlFragment[] {
  return renderKeys
    .map((renderKey) => renderMarkVSpecHtmlFragment(result, renderKey, options))
    .filter((fragment): fragment is MarkVSpecHtmlFragment => fragment !== undefined);
}

function resolveDefaultState(result: MarkVSpecParseResult): string | undefined {
  if (result.screen.defaultState && result.states.some((state) => state.name === result.screen.defaultState)) {
    return result.screen.defaultState;
  }

  return result.states.find((state) => state.initial)?.name ?? result.states[0]?.name;
}

interface ActionMarkerReference {
  id: string;
  marker: string;
}

interface RenderContext {
  sampleOverrides: Record<string, MarkVSpecParseResult["previewScenarios"][number]["samples"][number]>;
  elementById?: Map<string, MarkVSpecElement>;
  actionMarkersByElementId?: Map<string, ActionMarkerReference[]>;
  suppressMarkers?: boolean;
  slotName?: string;
  slotRenderViewport?: string;
  slotViewport?: string;
}

type WireframeSpacingKind = "margin" | "padding" | "gap";

type SlotContent = MarkVSpecParseResult["slotContents"][number];
type SlotContentsByName = Map<string, SlotContent[]>;

function mapSlotContentsByName(slotContents: SlotContent[]): SlotContentsByName {
  const byName: SlotContentsByName = new Map();
  for (const slot of slotContents) {
    const slots = byName.get(slot.name) ?? [];
    slots.push(slot);
    byName.set(slot.name, slots);
  }
  return byName;
}

function resolveSlotContent(slotContentsByName: SlotContentsByName, name: string, viewport: string): SlotContent | undefined {
  const slots = slotContentsByName.get(name) ?? [];
  return slots.find((slot) => slot.viewport === viewport)
    ?? slots.find((slot) => !slot.viewport);
}

function resolveViewport(result: MarkVSpecParseResult, requestedViewport: string | undefined): string | undefined {
  const viewports = layoutViewports(result);
  if (requestedViewport && viewports.includes(requestedViewport)) {
    return requestedViewport;
  }

  if (result.screen.viewport && viewports.includes(result.screen.viewport)) {
    return result.screen.viewport;
  }

  return viewports[0];
}

function layoutViewports(result: MarkVSpecParseResult): string[] {
  return [...new Set(result.layoutGroups.map((group) => group.viewport))];
}

function rootLayoutGroups(
  layoutGroups: MarkVSpecLayoutGroup[],
  _layoutById: Map<string, MarkVSpecLayoutGroup>,
  containedLayoutIds: ReadonlySet<string>
): MarkVSpecLayoutGroup[] {
  const uncontainedGroups = layoutGroups.filter((group) => !containedLayoutIds.has(group.id));
  const rootGroups = uncontainedGroups.filter((group, index) => index === 0 || isRootLayoutAlternative(group));
  return rootGroups.length > 0 ? rootGroups : layoutGroups.slice(0, 1);
}

function isRootLayoutAlternative(group: MarkVSpecLayoutGroup): boolean {
  return Boolean(group.properties["visible when"] || group.properties["hidden when"]);
}

function renderLayoutGroup(
  group: MarkVSpecLayoutGroup,
  result: MarkVSpecParseResult,
  layoutById: Map<string, MarkVSpecLayoutGroup>,
  slotContentsByName: SlotContentsByName,
  elementById: Map<string, MarkVSpecElement>,
  actionMarkersByElementId: Map<string, ActionMarkerReference[]>,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: MarkVSpecRenderOptions,
  visited: Set<string>,
  context: RenderContext,
  parentDisabled = false,
  renderKeyOverride?: string,
  depth = 0
): string {
  if (!options.includeConditionalContent && !isLayoutVisible(group, activeState, stateNames, options)) {
    return "";
  }

  return renderLayoutGroupOnce(group, result, layoutById, slotContentsByName, elementById, actionMarkersByElementId, activeState, stateNames, options, visited, context, parentDisabled, renderKeyOverride, depth);
}

function renderLayoutGroupOnce(
  group: MarkVSpecLayoutGroup,
  result: MarkVSpecParseResult,
  layoutById: Map<string, MarkVSpecLayoutGroup>,
  slotContentsByName: SlotContentsByName,
  elementById: Map<string, MarkVSpecElement>,
  actionMarkersByElementId: Map<string, ActionMarkerReference[]>,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: MarkVSpecRenderOptions,
  visited: Set<string>,
  context: RenderContext,
  parentDisabled = false,
  renderKeyOverride?: string,
  depth = 0
): string {

  if (visited.has(group.id)) {
    return `<div class="mm-render-warning" data-mm-id="${escapeHtml(group.id)}">Layout cycle skipped: ${escapeHtml(group.id)}</div>`;
  }

  const nextVisited = new Set(visited);
  nextVisited.add(group.id);
  const kind = group.kind ?? "stack";
  const presentationPanel = isPresentationPanelId(group.id);
  const classes = [
    "mm-layout",
    presentationPanel ? "mm-layout-presentation" : "",
    cssClass("mm-layout", kind),
    group.properties["align"] ? cssClass("mm-align", group.properties["align"]) : "",
    group.properties["justify"] ? cssClass("mm-justify", group.properties["justify"]) : "",
    group.properties["gap"] ? cssClass("mm-gap", group.properties["gap"]) : "",
    group.properties["variant"] ? cssClass("mm-variant", group.properties["variant"]) : "",
    group.properties["overlay"] ? "mm-layout-overlay" : "",
    group.properties["overlay"] ? cssClass("mm-layout-overlay", group.properties["overlay"]) : "",
    isLayoutDisabled(group, activeState, stateNames, options) ? "mm-layout-disabled" : "",
    isLayoutSelected(group, activeState, stateNames, options) ? "mm-layout-selected" : "",
    isLayoutActive(group, activeState, stateNames, options) ? "mm-layout-active" : "",
    layoutDepthClass(depth)
  ].filter(Boolean).join(" ");
  const depthStyle = layoutDepthStyle(depth);
  const styleAttribute = depthStyle ? ` style="${escapeHtml(depthStyle)}"` : "";
  const childDisabled = parentDisabled || isLayoutDisabled(group, activeState, stateNames, options);

  const children = renderLayoutGroupChildren(
    group,
    layoutById,
    slotContentsByName,
    elementById,
    actionMarkersByElementId,
    kind,
    activeState,
    stateNames,
    options,
    nextVisited,
    childDisabled,
    context,
    result,
    depth
  );
  const placeholder = children ? "" : `<div class="mm-layout-placeholder">${escapeHtml(group.name || group.id)}</div>`;
  const marker = context.suppressMarkers || group.documentRole === "template" || presentationPanel ? "" : renderMarker(group.id, group.properties["marker"], "layout", options);
  const renderKey = renderKeyOverride ?? layoutRenderKey(group, context);

  return `<!--mm-render-key:${escapeHtml(renderKey)}--><section class="${classes}"${styleAttribute} data-mm-id="${escapeHtml(group.id)}" data-mm-render-key="${escapeHtml(renderKey)}">${marker}${children || placeholder}</section>`;
}

function renderLayoutGroupChildren(
  group: MarkVSpecLayoutGroup,
  layoutById: Map<string, MarkVSpecLayoutGroup>,
  slotContentsByName: SlotContentsByName,
  elementById: Map<string, MarkVSpecElement>,
  actionMarkersByElementId: Map<string, ActionMarkerReference[]>,
  kind: string,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: MarkVSpecRenderOptions,
  visited: Set<string>,
  childDisabled: boolean,
  context: RenderContext,
  result: MarkVSpecParseResult,
  depth: number
): string {
  const renderOnce = () => group.items.map((item) => {
    if (item.type === "contains") {
      const childLayout = layoutById.get(item.targetId);
      if (childLayout) {
        return renderLayoutGroup(childLayout, result, layoutById, slotContentsByName, elementById, actionMarkersByElementId, activeState, stateNames, options, visited, context, childDisabled, undefined, depth + 1);
      }

      const element = elementById.get(item.targetId);
      return element ? renderElement(element, actionMarkersByElementId, activeState, stateNames, options, childDisabled, context) : "";
    }

    if (item.type === "field") {
      const element = elementById.get(item.elementId);
      if (!element) {
        return "";
      }

      return renderField(item, element, actionMarkersByElementId, kind, activeState, stateNames, options, childDisabled, context);
    }

    if (item.type === "slot") {
      return renderSlot(item.name, group.viewport || context.slotViewport || "", result, slotContentsByName, elementById, actionMarkersByElementId, activeState, stateNames, options, childDisabled, context, depth + 1);
    }

    return "";
  }).join("");

  return renderOnce();
}

function emptyRenderContext(): RenderContext {
  return { sampleOverrides: {} };
}

function layoutDepthFor(layoutId: string, layoutGroups: MarkVSpecLayoutGroup[]): number {
  const layoutById = new Map(layoutGroups.map((group) => [group.id, group]));
  const containedLayoutIds = new Set<string>();
  for (const group of layoutGroups) {
    for (const item of group.items) {
      if (item.type === "contains" && layoutById.has(item.targetId)) {
        containedLayoutIds.add(item.targetId);
      }
    }
  }

  const rootGroups = rootLayoutGroups(layoutGroups, layoutById, containedLayoutIds);
  const depths = new Map<string, number>();
  const visit = (group: MarkVSpecLayoutGroup, depth: number, path: Set<string>) => {
    const existingDepth = depths.get(group.id);
    if (existingDepth !== undefined && existingDepth <= depth) {
      return;
    }
    depths.set(group.id, depth);
    if (path.has(group.id)) {
      return;
    }

    const nextPath = new Set(path);
    nextPath.add(group.id);
    for (const item of group.items) {
      if (item.type !== "contains") {
        continue;
      }
      const child = layoutById.get(item.targetId);
      if (child) {
        visit(child, depth + 1, nextPath);
      }
    }
  };

  for (const group of rootGroups) {
    visit(group, 0, new Set());
  }

  return depths.get(layoutId) ?? 0;
}

function slotInsertionContextsFor(
  slotName: string,
  layoutGroups: MarkVSpecLayoutGroup[],
  activeState: string | undefined,
  stateNames: Set<string>,
  options: MarkVSpecRenderOptions
): Array<{ depth: number; parentDisabled: boolean }> {
  const layoutById = new Map(layoutGroups.map((group) => [group.id, group]));
  const containedLayoutIds = new Set<string>();
  for (const group of layoutGroups) {
    for (const item of group.items) {
      if (item.type === "contains" && layoutById.has(item.targetId)) {
        containedLayoutIds.add(item.targetId);
      }
    }
  }

  const rootGroups = rootLayoutGroups(layoutGroups, layoutById, containedLayoutIds);
  const contexts: Array<{ depth: number; parentDisabled: boolean }> = [];
  const visit = (group: MarkVSpecLayoutGroup, depth: number, parentDisabled: boolean, path: Set<string>) => {
    if (!options.includeConditionalContent && !isLayoutVisible(group, activeState, stateNames, options)) {
      return;
    }
    if (path.has(group.id)) {
      return;
    }

    const childDisabled = parentDisabled || isLayoutDisabled(group, activeState, stateNames, options);
    for (const item of group.items) {
      if (item.type === "slot" && item.name === slotName) {
        contexts.push({ depth: depth + 1, parentDisabled: childDisabled });
      }

      if (item.type === "contains") {
        const child = layoutById.get(item.targetId);
        if (child) {
          const nextPath = new Set(path);
          nextPath.add(group.id);
          visit(child, depth + 1, childDisabled, nextPath);
        }
      }
    }
  };

  for (const group of rootGroups) {
    visit(group, 0, false, new Set());
  }

  return contexts;
}

function layoutDepthClass(depth: number): string {
  if (depth <= 0) {
    return "";
  }
  return depth >= 3 ? "mm-layout-depth-deep" : `mm-layout-depth-${Math.max(0, depth)}`;
}

function scaleWireframeSpacing(value: number, depth: number, kind: WireframeSpacingKind): number {
  const normalizedDepth = Math.max(0, depth);
  const scales: Record<WireframeSpacingKind, number[]> = {
    margin: [1, 0.6, 0.4, 0.25],
    padding: [1, 0.85, 0.7, 0.6],
    gap: [1, 0.75, 0.6, 0.5]
  };
  const scale = scales[kind][Math.min(normalizedDepth, 3)] ?? 1;
  const minimum = value > 0 ? 1 : 0;
  return Math.max(minimum, Math.round(value * scale));
}

function layoutDepthStyle(depth: number): string {
  if (depth <= 0) {
    return "";
  }

  return [
    `--mm-layout-margin-block:${scaleWireframeSpacing(10, depth, "margin")}px`,
    `--mm-layout-padding:${scaleWireframeSpacing(14, depth, "padding")}px`,
    `--mm-gap-xs:${scaleWireframeSpacing(4, depth, "gap")}px`,
    `--mm-gap-sm:${scaleWireframeSpacing(8, depth, "gap")}px`,
    `--mm-gap-md:${scaleWireframeSpacing(12, depth, "gap")}px`,
    `--mm-gap-lg:${scaleWireframeSpacing(16, depth, "gap")}px`,
    `--mm-gap-xl:${scaleWireframeSpacing(24, depth, "gap")}px`
  ].join(";");
}

function renderContextForState(_result: MarkVSpecParseResult, _activeState: string | undefined): RenderContext {
  return emptyRenderContext();
}

function renderElement(
  element: MarkVSpecElement,
  actionMarkersByElementId: Map<string, ActionMarkerReference[]>,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: MarkVSpecRenderOptions,
  forceDisabled = false,
  context: RenderContext = emptyRenderContext()
): string {
  if (!options.includeConditionalContent && !isElementVisible(element, activeState, stateNames, options)) {
    return "";
  }

  const classes = [
    "mm-element",
    cssClass("mm-element", element.type.toLowerCase()),
    typeof element.properties["variant"] === "string" ? cssClass("mm-variant", element.properties["variant"]) : "",
    typeof element.properties["tone"] === "string" ? cssClass("mm-tone", element.properties["tone"]) : "",
    elementWidthPreset(element) ? cssClass("mm-width", elementWidthPreset(element) ?? "") : "",
    elementSizePreset(element) ? cssClass("mm-size", elementSizePreset(element) ?? "") : ""
  ].filter(Boolean).join(" ");

  const sourceValue = sourceTypeForElement(element) === "element" ? elementValueFromElementSource(element, context, new Set()) : undefined;
  const formattedSourceValue = sourceValue === undefined ? "" : formatModelValue(sourceValue, stringProperty(element, "format"));
  const sampleOverride = context.sampleOverrides[element.id];
  const sample = sampleOverride?.value ?? (formattedSourceValue || stringProperty(element, "sample"));
  const value = stringProperty(element, "value");
  const label = stringProperty(element, "label");
  const staticLabel = label || sample || value;
  const displayValue = sample || label || value;
  const displayLabel = label || sample || value;
  const disabled = forceDisabled || isElementDisabled(element, activeState, stateNames, options);
  const disabledAttribute = disabled ? " disabled" : "";
  const ariaDisabled = disabled ? ` aria-disabled="true"` : "";
  const marker = context.suppressMarkers || element.documentRole === "template" ? "" : renderMarker(element.id, stringProperty(element, "marker"), "element", options);
  const actionMarkers = context.suppressMarkers
    ? ""
    : (actionMarkersByElementId.get(element.id) ?? [])
      .map((actionMarker) => renderMarker(actionMarker.id, actionMarker.marker, "action", options))
      .join("");
  const markers = `${marker}${actionMarkers}`;

  if (element.type === "Heading") {
    const level = normalizeHeadingLevel(stringProperty(element, "level"));
    return renderAnnotatedElement(markers, element.type, `<h${level} class="${classes}" data-mm-id="${escapeHtml(element.id)}">${escapeHtml(staticLabel)}</h${level}>`);
  }

  if (element.type === "Paragraph") {
    return renderAnnotatedElement(markers, element.type, `<p class="${classes}" data-mm-id="${escapeHtml(element.id)}">${escapeHtml(displayValue)}</p>`);
  }

  if (element.type === "Text") {
    return renderAnnotatedElement(markers, element.type, `<span class="${classes}" data-mm-id="${escapeHtml(element.id)}">${escapeHtml(displayValue)}</span>`);
  }

  if (element.type === "Input") {
    const type = stringProperty(element, "type") || "text";
    const placeholder = stringProperty(element, "placeholder");
    const inputValue = stringProperty(element, "initial value") || sample || inputLiteralValue(value);
    return renderAnnotatedElement(markers, element.type, `<input class="${classes}" data-mm-id="${escapeHtml(element.id)}" type="${escapeHtml(type)}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(inputValue)}"${disabledAttribute}>`, elementWidthWrapperStyle(element));
  }

  if (element.type === "Textarea") {
    const placeholder = stringProperty(element, "placeholder");
    const inputValue = stringProperty(element, "initial value") || sample || inputLiteralValue(value);
    const rows = normalizePositiveInteger(stringProperty(element, "rows"), 3);
    return renderAnnotatedElement(markers, element.type, `<textarea class="${classes}" data-mm-id="${escapeHtml(element.id)}" rows="${rows}" placeholder="${escapeHtml(placeholder)}"${disabledAttribute}>${escapeHtml(inputValue)}</textarea>`, elementWidthWrapperStyle(element));
  }

  if (element.type === "DatePicker" || element.type === "DateInput" || element.type === "TimeInput" || element.type === "NumberInput") {
    const placeholder = stringProperty(element, "placeholder");
    const inputValue = stringProperty(element, "initial value") || sample || inputLiteralValue(value);
    const min = stringProperty(element, "min");
    const max = stringProperty(element, "max");
    const step = stringProperty(element, "step");
    const type = element.type === "TimeInput" ? "time" : element.type === "NumberInput" ? "number" : "date";
    const minAttribute = min ? ` min="${escapeHtml(min)}"` : "";
    const maxAttribute = max ? ` max="${escapeHtml(max)}"` : "";
    const stepAttribute = step ? ` step="${escapeHtml(step)}"` : "";
    return renderAnnotatedElement(markers, element.type, `<input class="${classes}" data-mm-id="${escapeHtml(element.id)}" type="${type}" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(inputValue)}"${minAttribute}${maxAttribute}${stepAttribute}${disabledAttribute}>`, elementWidthWrapperStyle(element));
  }

  if (element.type === "FileUpload" || element.type === "FileInput") {
    const accept = stringProperty(element, "accept");
    const acceptAttribute = accept ? ` accept="${escapeHtml(accept)}"` : "";
    const multipleAttribute = element.properties["multiple"] === true ? " multiple" : "";
    const helper = sample ? `<span class="mm-file-upload-helper">${escapeHtml(sample)}</span>` : "";
    return renderAnnotatedElement(markers, element.type, `<label class="${classes}" data-mm-id="${escapeHtml(element.id)}"${ariaDisabled}><input type="file"${acceptAttribute}${multipleAttribute}${disabledAttribute}>${escapeHtml(displayLabel || "Select file")}${helper}</label>`, elementWidthWrapperStyle(element));
  }

  if (element.type === "Select") {
    const selectedValue = stringProperty(element, "initial value") || inputLiteralValue(value);
    const options = element.selectOptions.map((option) => ({ value: option.label, label: option.label }));
    const optionHtml = options.length > 0
      ? options.map((option) => renderSelectOption(option, selectedValue)).join("")
      : renderSelectOption({ value: selectedValue, label: selectedValue || "Select" }, selectedValue);
    return renderAnnotatedElement(markers, element.type, `<select class="${classes}" data-mm-id="${escapeHtml(element.id)}"${disabledAttribute}>${optionHtml}</select>`, elementWidthWrapperStyle(element));
  }

  if (element.type === "MultiSelect") {
    const selectedValues = selectedValueSet(stringProperty(element, "initial value") || inputLiteralValue(value));
    const options = element.selectOptions.map((option) => ({ value: option.label, label: option.label }));
    const optionHtml = options.length > 0
      ? options.map((option) => renderMultiSelectOption(option, selectedValues)).join("")
      : renderMultiSelectOption({ value: displayLabel || "Option", label: displayLabel || "Option" }, selectedValues);
    return renderAnnotatedElement(markers, element.type, `<select class="${classes}" data-mm-id="${escapeHtml(element.id)}" multiple size="${Math.min(Math.max(options.length, 2), 5)}"${disabledAttribute}>${optionHtml}</select>`, elementWidthWrapperStyle(element));
  }

  if (element.type === "Checkbox") {
    const checked = element.properties["checked"] === true || isTruthyInitialValue(stringProperty(element, "initial value")) ? " checked" : "";
    const inputValue = value ? ` value="${escapeHtml(value)}"` : "";
    return renderAnnotatedElement(markers, element.type, `<label class="${classes}" data-mm-id="${escapeHtml(element.id)}"${ariaDisabled}><input type="checkbox"${inputValue}${checked}${disabledAttribute}>${escapeHtml(displayLabel || element.id)}</label>`);
  }

  if (element.type === "Switch") {
    const checked = element.properties["checked"] === true || isTruthyInitialValue(stringProperty(element, "initial value")) ? " checked" : "";
    return renderAnnotatedElement(markers, element.type, `<label class="${classes}" data-mm-id="${escapeHtml(element.id)}"${ariaDisabled}><input type="checkbox" role="switch"${checked}${disabledAttribute}><span class="mm-switch-track"><span class="mm-switch-thumb"></span></span>${escapeHtml(displayLabel || element.id)}</label>`);
  }

  if (element.type === "RadioGroup" || element.type === "CheckboxGroup") {
    const selectedValue = stringProperty(element, "initial value") || inputLiteralValue(value);
    const selectedValues = selectedValueSet(selectedValue);
    const name = stringProperty(element, "name") || element.id;
    const options = element.selectOptions.length > 0 ? element.selectOptions.map((option) => option.label) : [selectedValue || displayLabel || "Option"];
    const inputType = element.type === "CheckboxGroup" ? "checkbox" : "radio";
    const optionHtml = options
      .map((option) => {
        const checked = element.type === "CheckboxGroup"
          ? selectedValues.has(option) ? " checked" : ""
          : option === selectedValue ? " checked" : "";
        return `<label class="mm-choice-group-option"><input type="${inputType}" name="${escapeHtml(name)}"${checked}${disabledAttribute}>${escapeHtml(option)}</label>`;
      })
      .join("");
    const legend = displayLabel ? `<legend>${escapeHtml(displayLabel)}</legend>` : "";
    return renderAnnotatedElement(markers, element.type, `<fieldset class="${classes}" data-mm-id="${escapeHtml(element.id)}"${ariaDisabled}>${legend}${optionHtml}</fieldset>`);
  }

  if (element.type === "Button") {
    return renderAnnotatedElement(markers, element.type, `<button class="${classes}" data-mm-id="${escapeHtml(element.id)}"${disabledAttribute}>${escapeHtml(displayLabel || element.id)}</button>`);
  }

  if (element.type === "Link") {
    const href = stringProperty(element, "href") || "#";
    return renderAnnotatedElement(markers, element.type, `<a class="${classes}" data-mm-id="${escapeHtml(element.id)}" href="${escapeHtml(href)}"${ariaDisabled}>${escapeHtml(displayLabel || href)}</a>`);
  }

  if (element.type === "Banner") {
    return renderAnnotatedElement(markers, element.type, `<div class="${classes}" data-mm-id="${escapeHtml(element.id)}" role="status">${escapeHtml(displayValue)}</div>`);
  }

  if (element.type === "Toast") {
    const message = stringProperty(element, "message") || displayValue || element.id;
    const placement = stringProperty(element, "placement") || "top-right";
    const duration = stringProperty(element, "duration") || "medium";
    const actionLabel = stringProperty(element, "action") ? `<span class="mm-toast-action">${escapeHtml(stringProperty(element, "label") || "Action")}</span>` : "";
    return renderAnnotatedElement(markers, element.type, `<div class="${classes}" data-mm-id="${escapeHtml(element.id)}" role="status" data-mm-toast-placement="${escapeHtml(placement)}" data-mm-toast-duration="${escapeHtml(duration)}"><span class="mm-toast-message">${escapeHtml(message)}</span>${actionLabel}</div>`);
  }

  if (element.type === "Badge") {
    return renderAnnotatedElement(markers, element.type, `<span class="${classes}" data-mm-id="${escapeHtml(element.id)}">${escapeHtml(displayValue)}</span>`);
  }

  if (element.type === "List") {
    const items = listItemsForElement(element, context);
    const itemHtml = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    return renderAnnotatedElement(markers, element.type, `<ul class="${classes}" data-mm-id="${escapeHtml(element.id)}">${itemHtml}</ul>`);
  }

  if (element.type === "Table") {
    const columns = element.tableColumns;
    const rowSet = tableRowsForElement(element, columns, context);
    const rows = rowSet.rows;
    const columnWidth = columns.length > 0 ? `${100 / columns.length}%` : "";
    const colgroupHtml = columns.length > 0
      ? `<colgroup>${columns.map(() => `<col style="width:${columnWidth}">`).join("")}</colgroup>`
      : "";
    const headerHtml = columns.length > 0
      ? `<thead><tr>${columns.map((column) => `<th>${renderTableColumnHeader(column)}</th>`).join("")}</tr></thead>`
      : "";
    const bodyHtml = rows.length > 0
      ? rows.map((row) => `<tr>${renderTableCells(columns, row.cells)}</tr>`).join("")
      : rowSet.explicitEmpty
        ? `<tr><td class="mm-table-empty" colspan="${Math.max(columns.length, 1)}">(no data)</td></tr>`
        : "";
    return renderAnnotatedElement(
      markers,
      element.type,
      `<table class="${classes}" data-mm-id="${escapeHtml(element.id)}"><caption>${escapeHtml(displayLabel || element.id)}</caption>${colgroupHtml}${headerHtml}<tbody>${bodyHtml}</tbody></table>`,
      "display:block;max-width:100%;min-width:0;width:100%"
    );
  }

  if (element.type === "Dialog") {
    const title = stringProperty(element, "title") || displayLabel || element.id;
    const content = stringProperty(element, "message") || stringProperty(element, "content") || displayValue;
    const actions = renderDialogActionButtons(element, actionMarkersByElementId, activeState, stateNames, options, context);
    const actionHtml = actions ? `<div class="mm-dialog-actions">${actions}</div>` : "";
    return renderAnnotatedElement(markers, element.type, `<section class="${classes}" data-mm-id="${escapeHtml(element.id)}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}"><div class="mm-dialog-title">${escapeHtml(title)}</div><div class="mm-dialog-body">${escapeHtml(content)}</div>${actionHtml}</section>`);
  }

  if (element.type === "Image") {
    const src = stringProperty(element, "src");
    const alt = stringProperty(element, "alt") || displayLabel || element.id;
    return renderAnnotatedElement(markers, element.type, `<figure class="${classes}" data-mm-id="${escapeHtml(element.id)}"><div class="mm-image-placeholder">${escapeHtml(alt)}</div>${src ? `<figcaption>${escapeHtml(src)}</figcaption>` : ""}</figure>`);
  }

  if (element.type === "Icon") {
    const name = stringProperty(element, "name") || displayValue || element.id;
    return renderAnnotatedElement(markers, element.type, `<span class="${classes}" data-mm-id="${escapeHtml(element.id)}" aria-label="${escapeHtml(displayLabel || name)}"><span class="mm-icon-symbol">${escapeHtml(name)}</span></span>`);
  }

  if (element.type === "Spinner") {
    const spinnerLabel = displayLabel || "Loading";
    return renderAnnotatedElement(markers, element.type, `<span class="${classes}" data-mm-id="${escapeHtml(element.id)}" role="status" aria-label="${escapeHtml(spinnerLabel)}"><span class="mm-spinner-symbol" aria-hidden="true"></span><span class="mm-spinner-label">${escapeHtml(spinnerLabel)}</span></span>`);
  }

  if (element.type === "Divider") {
    const dividerLabel = displayLabel || sample;
    const labelHtml = dividerLabel ? `<span class="mm-divider-label">${escapeHtml(dividerLabel)}</span>` : "";
    return renderAnnotatedElement(markers, element.type, `<div class="${classes}" data-mm-id="${escapeHtml(element.id)}" role="separator">${labelHtml}</div>`);
  }

  return renderAnnotatedElement(markers, element.type, `<div class="${classes}" data-mm-id="${escapeHtml(element.id)}">${escapeHtml(displayLabel || element.type)}</div>`);
}

function renderDialogActionButtons(
  element: MarkVSpecElement,
  actionMarkersByElementId: Map<string, ActionMarkerReference[]>,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: MarkVSpecRenderOptions,
  context: RenderContext
): string {
  const buttonIds = parseDelimitedList(stringProperty(element, "actions"), ",");
  if (buttonIds.length === 0 || !context.elementById) {
    return "";
  }

  return buttonIds
    .map((buttonId) => context.elementById?.get(buttonId))
    .filter((button): button is MarkVSpecElement => button?.type === "Button")
    .map((button) => renderElement(
      button,
      context.actionMarkersByElementId ?? actionMarkersByElementId,
      activeState,
      stateNames,
      options,
      false,
      {
        ...context,
        suppressMarkers: context.suppressMarkers
      }
    ))
    .join("");
}

function renderField(
  item: Extract<MarkVSpecLayoutItem, { type: "field" }>,
  element: MarkVSpecElement,
  actionMarkersByElementId: Map<string, ActionMarkerReference[]>,
  layoutKind: string,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: MarkVSpecRenderOptions,
  forceDisabled: boolean,
  context: RenderContext
): string {
  const fieldKind = layoutKind === "grid" ? "grid" : layoutKind === "stack" ? "stack" : "row";
  return `<div class="mm-field ${cssClass("mm-field", fieldKind)}"><label class="mm-field-label">${escapeHtml(item.label)}</label>${renderElement(element, actionMarkersByElementId, activeState, stateNames, options, forceDisabled, context)}</div>`;
}

function elementWidthPreset(element: MarkVSpecElement): string | undefined {
  if (!["Input", "Textarea", "Select", "MultiSelect", "DatePicker", "DateInput", "TimeInput", "NumberInput", "FileUpload", "FileInput"].includes(element.type)) {
    return undefined;
  }
  const width = stringProperty(element, "width");
  return ["short", "medium", "long", "full"].includes(width) ? width : undefined;
}

function elementSizePreset(element: MarkVSpecElement): string | undefined {
  if (element.type !== "Button") {
    return undefined;
  }
  const size = stringProperty(element, "size");
  return ["small", "medium", "large"].includes(size) ? size : undefined;
}

function elementWidthWrapperStyle(element: MarkVSpecElement): string | undefined {
  const width = elementWidthPreset(element);
  if (!width) {
    return undefined;
  }
  const widthValue = width === "short" ? "120px" : width === "medium" ? "220px" : width === "long" ? "360px" : "100%";
  return `width:min(${widthValue},100%)`;
}

function renderSlot(
  name: string,
  viewport: string,
  result: MarkVSpecParseResult,
  slotContentsByName: SlotContentsByName,
  elementById: Map<string, MarkVSpecElement>,
  actionMarkersByElementId: Map<string, ActionMarkerReference[]>,
  activeState: string | undefined,
  stateNames: Set<string>,
  options: MarkVSpecRenderOptions,
  parentDisabled: boolean,
  context: RenderContext,
  depth: number
): string {
  const slotContent = resolveSlotContent(slotContentsByName, name, viewport);
  if (!slotContent || slotContent.layoutGroups.length === 0) {
    const renderKey = `slot:${name}`;
    return `<!--mm-render-key:${escapeHtml(renderKey)}--><div class="mm-slot-placeholder" data-mm-slot="${escapeHtml(name)}" data-mm-render-key="${escapeHtml(renderKey)}">Slot: ${escapeHtml(name)}</div>`;
  }

  const layoutById = new Map(slotContent.layoutGroups.map((group) => [group.id, group]));
  const containedLayoutIds = new Set<string>();
  for (const group of slotContent.layoutGroups) {
    for (const item of group.items) {
      if (item.type === "contains" && layoutById.has(item.targetId)) {
        containedLayoutIds.add(item.targetId);
      }
    }
  }

  const rootGroups = slotContent.layoutGroups.filter((group) => !containedLayoutIds.has(group.id));
  const slotContext = {
    ...context,
    slotName: name,
    slotRenderViewport: slotContent.viewport ?? "default",
    slotViewport: viewport
  };
  return rootGroups
    .map((group) => renderLayoutGroup(
      group,
      result,
      layoutById,
      slotContentsByName,
      elementById,
      actionMarkersByElementId,
      activeState,
      stateNames,
      options,
      new Set(),
      slotContext,
      parentDisabled,
      layoutRenderKey(group, slotContext),
      depth
    ))
    .join("");
}

function layoutRenderKey(group: MarkVSpecLayoutGroup, context: RenderContext): string {
  return context.slotName
    ? `slot-content:${context.slotName}:${context.slotRenderViewport ?? context.slotViewport ?? "default"}:${group.id}`
    : `layout:${group.viewport}:${group.id}`;
}

function isElementVisible(element: MarkVSpecElement, activeState: string | undefined, stateNames: Set<string>, options: MarkVSpecRenderOptions): boolean {
  if (element.visibleWhen.length > 0 && !element.visibleWhen.some((condition) => isShownForCondition(condition, activeState, stateNames, options))) {
    return false;
  }

  if (element.hiddenWhen.some((condition) => isActiveCondition(condition, activeState, stateNames, options))) {
    return false;
  }

  return true;
}

function isLayoutVisible(group: MarkVSpecLayoutGroup, activeState: string | undefined, stateNames: Set<string>, options: MarkVSpecRenderOptions): boolean {
  const visibleWhen = group.properties["visible when"];
  if (visibleWhen && !isShownForCondition(visibleWhen, activeState, stateNames, options)) {
    return false;
  }

  const hiddenWhen = group.properties["hidden when"];
  if (hiddenWhen && isActiveCondition(hiddenWhen, activeState, stateNames, options)) {
    return false;
  }

  return true;
}

function isElementDisabled(element: MarkVSpecElement, activeState: string | undefined, stateNames: Set<string>, options: MarkVSpecRenderOptions): boolean {
  return element.disabledWhen.some((condition) => isActiveCondition(condition, activeState, stateNames, options));
}

function isLayoutDisabled(group: MarkVSpecLayoutGroup, activeState: string | undefined, stateNames: Set<string>, options: MarkVSpecRenderOptions): boolean {
  const disabledWhen = group.properties["disabled when"];
  return Boolean(disabledWhen && isActiveCondition(disabledWhen, activeState, stateNames, options));
}

function isLayoutSelected(group: MarkVSpecLayoutGroup, activeState: string | undefined, stateNames: Set<string>, options: MarkVSpecRenderOptions): boolean {
  const selectedWhen = group.properties["selected when"];
  return Boolean(selectedWhen && isActiveCondition(selectedWhen, activeState, stateNames, options));
}

function isLayoutActive(group: MarkVSpecLayoutGroup, activeState: string | undefined, stateNames: Set<string>, options: MarkVSpecRenderOptions): boolean {
  const activeWhen = group.properties["active when"];
  return Boolean(activeWhen && isActiveCondition(activeWhen, activeState, stateNames, options));
}

function isShownForCondition(condition: string | undefined, activeState: string | undefined, stateNames: Set<string>, options: MarkVSpecRenderOptions): boolean {
  if (!condition) {
    return true;
  }

  if (isNamespacedCondition(condition)) {
    return isActiveNamespacedCondition(condition, activeState, options);
  }

  if (!isStateScopedCondition(condition, stateNames)) {
    return true;
  }

  return isActiveStateCondition(condition, activeState, stateNames);
}

function isActiveCondition(condition: string | undefined, activeState: string | undefined, stateNames: Set<string>, options: MarkVSpecRenderOptions): boolean {
  if (!condition) {
    return false;
  }

  if (isNamespacedCondition(condition)) {
    return isActiveNamespacedCondition(condition, activeState, options);
  }

  return isActiveStateCondition(condition, activeState, stateNames);
}

function isActiveStateCondition(condition: string | undefined, activeState: string | undefined, stateNames: Set<string>): boolean {
  if (!condition) {
    return false;
  }

  const normalized = condition.trim();
  if (!activeState) {
    return false;
  }

  return normalized === activeState || normalized === `state is ${activeState}`;
}

function isStateScopedCondition(condition: string, stateNames: Set<string>): boolean {
  const normalized = condition.trim();
  return normalized.startsWith("state is ") || stateNames.has(normalized);
}

function isNamespacedCondition(condition: string): boolean {
  return /^(not\s+)?\$\{(?:model|view|state)\.[^}]+\}(?:\s*=\s*[^=].*)?$/u.test(condition.trim());
}

function isActiveNamespacedCondition(condition: string, activeState: string | undefined, options: MarkVSpecRenderOptions): boolean {
  const normalized = condition.trim();
  const negated = normalized.startsWith("not ");
  const expression = negated ? normalized.slice(4).trim() : normalized;
  const equality = /^(\$\{(?:model|view|state)\.[^}]+\})\s*=\s*(.+)$/u.exec(expression);
  const key = equality?.[1] ?? expression;
  const expected = equality?.[2]?.trim();
  const body = opaqueExpressionBody(key) ?? key;
  let value: boolean | number | string | undefined;
  if (body.startsWith("model.")) {
    value = options.modelValues?.[key] ?? options.modelValues?.[body];
  } else if (body.startsWith("view.")) {
    const viewKey = body.slice("view.".length);
    value = options.viewValues?.[key] ?? options.viewValues?.[body] ?? options.viewValues?.[viewKey];
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
  const sample = result.viewContextSamples.find((candidate) => candidate.name === "default");
  const values: Record<string, boolean | number | string> = {};
  for (const definition of result.viewContexts) {
    const rawValue = sample?.values[definition.name] ?? definition.defaultValue ?? definition.values[0]?.value;
    if (rawValue === undefined) {
      continue;
    }
    const value = coerceViewValue(rawValue, definition.type);
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

function coerceViewValue(value: string, type: string | undefined): boolean | string {
  if (type === "boolean") {
    return value === "true";
  }
  return value;
}

function stringProperty(element: MarkVSpecElement, key: string): string {
  const value = element.properties[key];
  return typeof value === "string" ? value : "";
}

function elementValueFromElementSource(
  element: MarkVSpecElement,
  context: RenderContext,
  visited: Set<string>
): string | undefined {
  if (visited.has(element.id)) {
    return undefined;
  }
  visited.add(element.id);

  const targetId = elementValueReferenceId(stringProperty(element, "value"));
  const target = targetId ? context.elementById?.get(targetId) : undefined;
  if (!target) {
    return undefined;
  }

  if (sourceTypeForElement(target) === "element") {
    const nested = elementValueFromElementSource(target, context, visited);
    if (nested !== undefined) {
      return nested;
    }
  }

  return stringProperty(target, "initial value")
    ?? stringProperty(target, "sample")
    ?? inputLiteralValue(stringProperty(target, "value"))
    ?? undefined;
}

function elementValueReferenceId(value: string): string | undefined {
  const match = /^(E-[\p{L}\p{N}-]+)\.value$/u.exec(value);
  return match?.[1];
}

function formatModelValue(value: string, format: string): string {
  if (format.trim() === "date yyyy/MM/dd") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (match) {
      return `${match[1]}/${match[2]}/${match[3]}`;
    }
  }
  const mapping = parseFormatMapping(format);
  return mapping.get(value) ?? value;
}

function parseFormatMapping(format: string): Map<string, string> {
  const mapping = new Map<string, string>();
  for (const part of format.split(",")) {
    const [from, to] = part.split("->").map((value) => value?.trim());
    if (from && to) {
      mapping.set(from, to);
    }
  }
  return mapping;
}

function inputLiteralValue(value: string): string {
  return /^model\.[^\s]+$/.test(value) ? "" : value;
}

function isTruthyInitialValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return Boolean(normalized && normalized !== "false" && normalized !== "0" && normalized !== "no" && normalized !== "off");
}

function parseDelimitedList(value: string, delimiter: string): string[] {
  if (!value.trim()) {
    return [];
  }

  return value
    .split(delimiter)
    .map((part) => part.trim())
    .filter(Boolean);
}

function renderSelectOption(option: { value: string; label: string }, selectedValue: string): string {
  const selected = option.value === selectedValue ? " selected" : "";
  return `<option value="${escapeHtml(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
}

function renderMultiSelectOption(option: { value: string; label: string }, selectedValues: Set<string>): string {
  const selected = selectedValues.has(option.value) ? " selected" : "";
  return `<option value="${escapeHtml(option.value)}"${selected}>${escapeHtml(option.label)}</option>`;
}

function selectedValueSet(value: string): Set<string> {
  return new Set(parseDelimitedList(value, ","));
}

function normalizePositiveInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function renderTableCells(
  columns: MarkVSpecElement["tableColumns"],
  cells: MarkVSpecElement["tableRows"][number]["cells"]
): string {
  if (columns.length === 0) {
    return cells.map((cell) => `<td>${escapeHtml(cell.value)}</td>`).join("");
  }

  return columns
    .map((column) => {
      const columnKeys = tableColumnSampleKeys(column);
      const cell = cells.find((candidate) => candidate.column === column.label || columnKeys.includes(candidate.column));
      return `<td>${escapeHtml(cell?.value ?? "")}</td>`;
    })
    .join("");
}

function listItemsForElement(element: MarkVSpecElement, context: RenderContext): string[] {
  const overrideRows = context.sampleOverrides[element.id]?.rows;
  const rows = overrideRows ?? element.sampleRows;
  if (rows) {
    if (rows.explicitEmpty && rows.rows.length === 0) {
      return ["(no data)"];
    }
    return rows.rows.map((row) => Object.values(row.fields).filter(Boolean).join(" / ")).filter(Boolean);
  }
  return parseDelimitedList(stringProperty(element, "items"), ",");
}

function renderTableColumnHeader(column: MarkVSpecElement["tableColumns"][number]): string {
  const sortLabel = column.sort === "asc" ? " &#8593;" : column.sort === "desc" ? " &#8595;" : column.sortable ? " &#8597;" : "";
  return `${escapeHtml(column.label)}${sortLabel}`;
}

interface RenderedTableRows {
  rows: MarkVSpecElement["tableRows"];
  explicitEmpty: boolean;
}

function tableRowsForElement(
  element: MarkVSpecElement,
  columns: MarkVSpecElement["tableColumns"],
  context: RenderContext
): RenderedTableRows {
  const overrideRows = context.sampleOverrides[element.id]?.rows;
  if (overrideRows) {
    return {
      rows: sampleRowsToTableRows(overrideRows.rows, columns),
      explicitEmpty: overrideRows.explicitEmpty
    };
  }

  if (element.sampleRows) {
    return {
      rows: sampleRowsToTableRows(element.sampleRows.rows, columns),
      explicitEmpty: element.sampleRows.explicitEmpty
    };
  }

  return { rows: element.tableRows, explicitEmpty: false };
}

function sampleRowsToTableRows(
  rows: NonNullable<MarkVSpecElement["sampleRows"]>["rows"],
  columns: MarkVSpecElement["tableColumns"]
): MarkVSpecElement["tableRows"] {
  return rows.map((row) => ({
    location: row.location,
    raw: row.raw,
    cells: columns.length > 0
      ? columns.map((column) => {
          const key = tableColumnSampleKeys(column).find((candidate) => row.fields[candidate] !== undefined) ?? column.label;
          return {
            column: key,
            value: row.fields[key] ?? row.fields[column.label] ?? "",
            location: row.fieldLocations[key]?.[0] ?? row.location,
            raw: `${key}: ${row.fields[key] ?? ""}`
          };
        })
      : Object.entries(row.fields).map(([key, value]) => ({
          column: key,
          value,
          location: row.fieldLocations[key]?.[0] ?? row.location,
          raw: `${key}: ${value}`
        }))
  }));
}

function tableColumnSampleKeys(column: MarkVSpecElement["tableColumns"][number]): string[] {
  const sourceKey = column.source ? sourcePathKey(column.source) : undefined;
  const sourceLeaf = sourceKey?.split(".").filter(Boolean).slice(-1)[0];
  const rawSourceLeaf = column.source?.replace(/^\$\{/u, "").replace(/\}$/u, "").split(".").filter(Boolean).slice(-1)[0];
  return [column.key, sourceKey, sourceLeaf, rawSourceLeaf, column.label].filter((value): value is string => Boolean(value));
}

function normalizeHeadingLevel(value: string): 1 | 2 | 3 | 4 | 5 | 6 {
  const level = Number.parseInt(value, 10);
  if (level >= 1 && level <= 6) {
    return level as 1 | 2 | 3 | 4 | 5 | 6;
  }

  return 2;
}

function mapActionMarkersByElementId(actions: MarkVSpecAction[], elements: MarkVSpecElement[], activeState: string | undefined): Map<string, ActionMarkerReference[]> {
  const markersByElementId = new Map<string, ActionMarkerReference[]>();
  const actionById = new Map(actions.map((action) => [action.id, action]));

  for (const action of actions) {
    if (action.documentRole === "template" || !actionMarkerAppliesToState(action, activeState)) {
      continue;
    }
    const marker = { id: action.id, marker: action.properties["marker"] || action.id };
    const elementIds = new Set<string>();
    if (action.trigger) {
      elementIds.add(action.trigger.elementId);
    }

    const actionElement = action.properties["element"];
    if (actionElement && isLocalId(actionElement)) {
      elementIds.add(actionElement);
    }

    for (const elementId of elementIds) {
      const existing = markersByElementId.get(elementId) ?? [];
      existing.push(marker);
      markersByElementId.set(elementId, existing);
    }
  }

  for (const element of elements) {
    const actionId = stringProperty(element, "action");
    const action = actionById.get(actionId);
    if (!action || action.documentRole === "template" || !actionMarkerAppliesToState(action, activeState)) {
      continue;
    }

    const marker = { id: action.id, marker: action.properties["marker"] || action.id };
    const existing = markersByElementId.get(element.id) ?? [];
    if (!existing.some((existingMarker) => existingMarker.id === marker.id)) {
      existing.push(marker);
    }
    markersByElementId.set(element.id, existing);
  }

  return markersByElementId;
}

function actionMarkerAppliesToState(action: MarkVSpecAction, activeState: string | undefined): boolean {
  return actionAppliesToState(action, activeState, { unscoped: "always" });
}

function renderMarker(
  id: string,
  marker: string | undefined,
  category: "layout" | "element" | "action",
  options: MarkVSpecRenderOptions
): string {
  if (!isMarkerVisible(category, options)) {
    return "";
  }
  if (options.markerFilter && !options.markerFilter(id, category)) {
    return "";
  }

  const value = marker?.trim() || id;
  const badge = `<code class="mm-id mm-marker mm-marker-${category}" data-mm-marker-category="${category}">${escapeHtml(value)}</code>`;
  const href = options.markerLink?.(id, category);
  return href ? `<a class="mm-marker-link" href="${escapeHtml(href)}">${badge}</a>` : badge;
}

function renderAnnotatedElement(markers: string, elementType: string, elementHtml: string, wrapperStyle?: string): string {
  const classes = [
    "mm-element-wrap",
    cssClass("mm-element-wrap", elementType),
    markers ? "mm-element-wrap-annotated" : ""
  ].filter(Boolean).join(" ");
  const styleAttribute = wrapperStyle ? ` style="${escapeHtml(wrapperStyle)}"` : "";
  const elementId = /\sdata-mm-id="([^"]+)"/u.exec(elementHtml)?.[1];
  const renderKey = elementId ? `<!--mm-render-key:element:${elementId}-->` : "";
  const renderKeyAttribute = elementId ? ` data-mm-render-key="${escapeHtml(`element:${elementId}`)}"` : "";
  return `${renderKey}<div class="${classes}"${styleAttribute}${renderKeyAttribute}>${elementHtml}<span class="mm-annotation-row">${markers}</span></div>`;
}

function isMarkerVisible(category: "layout" | "element" | "action", options: MarkVSpecRenderOptions): boolean {
  return options.markerVisibility?.[category] ?? options.showIds ?? false;
}

function cssClass(prefix: string, value: string): string {
  const token = value.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  return `${prefix}-${token || "unknown"}`;
}

function renderDefaultStyles(): string {
  return `<style>
.mm-wireframe{box-sizing:border-box;color:#1f2937;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.4;max-width:760px;padding:24px;position:relative}
.mm-wireframe *{box-sizing:border-box}
.mm-wireframe-empty{max-width:100%;min-width:0;width:100%}
.mm-empty-wireframe{align-items:center;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:6px;color:#64748b;display:flex;font-size:13px;font-weight:600;justify-content:center;min-height:96px;padding:18px;text-align:center;width:100%}
.mm-layout{border:1px solid #d1d5db;border-radius:6px;margin:var(--mm-layout-margin-block,10px) 0;max-width:100%;overflow-wrap:anywhere;padding:var(--mm-layout-padding,14px);position:relative}
.mm-layout-presentation{border:0;margin:0;padding:0}
.mm-layout-depth-1{border-color:#cbd5e1;border-style:dashed}
.mm-layout-depth-2{border-color:#d7dde7;border-style:dotted}
.mm-layout-depth-deep{background:rgba(248,250,252,.55);border-color:#e2e8f0;border-style:dotted}
.mm-layout-stack{display:flex;flex-direction:column}
.mm-layout-row{align-items:center;display:flex;flex-direction:row;flex-wrap:wrap}
.mm-layout-grid{display:grid;grid-template-columns:minmax(0,max-content) minmax(0,1fr)}
.mm-layout-inline{align-items:center;display:inline-flex}
.mm-layout-disabled{opacity:.72}
.mm-layout-selected{border-color:#2563eb}
.mm-layout-active{box-shadow:inset 0 0 0 1px #2563eb}
.mm-layout-overlay{align-items:center;background:rgba(249,250,251,.82);border-color:#d1d5db;border-style:dashed;display:flex;justify-content:center;margin:0;z-index:4}
.mm-layout-overlay-area{inset:0;position:absolute}
.mm-layout-overlay-screen{inset:0;position:fixed;z-index:10}
.mm-layout-placeholder{align-items:center;background:#f9fafb;border:1px dashed #cbd5e1;border-radius:4px;color:#64748b;display:flex;font-size:12px;font-weight:600;justify-content:center;min-height:44px;padding:8px;text-align:center;width:100%}
.mm-align-center{align-items:center}
.mm-align-end{align-items:flex-end}
.mm-align-start{align-items:flex-start}
.mm-align-stretch{align-items:stretch}
.mm-justify-center{justify-content:center}
.mm-justify-end{justify-content:flex-end}
.mm-justify-between{justify-content:space-between}
.mm-justify-around{justify-content:space-around}
.mm-gap-xs{gap:var(--mm-gap-xs,4px)}.mm-gap-sm{gap:var(--mm-gap-sm,8px)}.mm-gap-md{gap:var(--mm-gap-md,12px)}.mm-gap-lg{gap:var(--mm-gap-lg,16px)}.mm-gap-xl{gap:var(--mm-gap-xl,24px)}
.mm-field{gap:8px;width:100%}
.mm-field-row{align-items:center;display:flex;flex-direction:row;flex-wrap:wrap}
.mm-layout-row > .mm-field-row{flex:0 1 auto;max-width:100%;width:auto}
.mm-field-stack{align-items:flex-start;display:flex;flex-direction:column}
.mm-field-grid{display:contents}
.mm-field-label{color:#374151;min-width:0}
.mm-field-row .mm-field-label{flex:0 1 120px}
.mm-field-error{color:#b91c1c;font-size:12px;font-weight:600;line-height:1.35;margin-top:4px;max-width:min(320px,100%)}
.mm-field-error-message{white-space:normal}
.mm-display-message{color:#b91c1c;font-size:12px;font-weight:600;line-height:1.35}
.mm-slot-placeholder{align-items:center;background:#f8fafc;border:1px dashed #94a3b8;border-radius:6px;color:#475569;display:flex;font-size:12px;font-weight:600;justify-content:center;margin:3px 0;min-height:88px;padding:14px;text-align:center;width:100%}
.mm-element{border:1px solid #d1d5db;border-radius:4px;margin:3px 0;min-height:28px;padding:6px 8px}
.mm-element-heading,.mm-element-paragraph,.mm-element-text{border:0;padding:0}
.mm-element-input,.mm-element-textarea,.mm-element-select,.mm-element-multiselect,.mm-element-datepicker,.mm-element-dateinput,.mm-element-timeinput,.mm-element-numberinput{background:white;min-width:0;width:min(220px,100%)}
.mm-element-link{align-items:center;display:inline-flex;line-height:1.2}
.mm-element-textarea{font:inherit;min-height:72px;resize:vertical}
.mm-width-short,.mm-width-medium,.mm-width-long,.mm-width-full{max-width:100%;width:100%}
.mm-element-fileupload,.mm-element-fileinput{align-items:center;background:#fff;display:inline-flex;gap:8px}
.mm-element-fileupload input,.mm-element-fileinput input{max-width:180px}
.mm-file-upload-helper{color:#6b7280;font-size:12px}
.mm-element-checkbox,.mm-element-switch{align-items:center;display:inline-flex;gap:6px}
.mm-element-radiogroup,.mm-element-checkboxgroup{background:#fff;display:inline-flex;flex-wrap:wrap;gap:8px}
.mm-element-radiogroup legend,.mm-element-checkboxgroup legend{color:#374151;font-size:12px;font-weight:600;padding:0 4px}
.mm-choice-group-option{align-items:center;display:inline-flex;gap:6px}
.mm-switch-track{align-items:center;background:#d1d5db;border-radius:999px;display:inline-flex;height:18px;padding:2px;width:34px}
.mm-switch-thumb{background:#fff;border-radius:50%;box-shadow:0 1px 2px rgba(15,23,42,.28);display:block;height:14px;width:14px}
.mm-element-switch input:checked + .mm-switch-track{background:#2563eb}.mm-element-switch input:checked + .mm-switch-track .mm-switch-thumb{transform:translateX(16px)}
.mm-layout > .mm-marker-layout{left:-1px;position:absolute;top:-9px;z-index:2}
.mm-element-wrap{display:block;max-width:100%;min-width:0;position:relative;width:max-content}
.mm-element-wrap-table{display:block;max-width:100%;min-width:0;width:100%}
.mm-annotation-row{align-items:center;display:inline-flex;flex-wrap:wrap;gap:2px;left:0;line-height:1;max-width:calc(100% + 12px);pointer-events:none;position:absolute;top:0;transform:translate(-35%,-35%);width:max-content;z-index:3}
.mm-annotation-row .mm-id{margin-right:0;pointer-events:none}
.mm-marker-link{display:inline-flex;pointer-events:auto;text-decoration:none}
.mm-marker-link .mm-id{pointer-events:none}
.mm-element-wrap-button .mm-annotation-row,.mm-element-wrap-link .mm-annotation-row,.mm-element-wrap-text .mm-annotation-row,.mm-element-wrap-badge .mm-annotation-row{left:auto;right:0;top:50%;transform:translate(calc(100% + 4px),-50%)}
.mm-layout-row > .mm-element-wrap-annotated > .mm-annotation-row,.mm-layout-grid > .mm-element-wrap-annotated > .mm-annotation-row,.mm-layout-inline > .mm-element-wrap-annotated > .mm-annotation-row,.mm-field-row > .mm-element-wrap-annotated > .mm-annotation-row{left:50%;right:auto;top:0;transform:translate(-50%,-55%)}
.mm-element-list{padding-left:24px}
.mm-element-table{border-collapse:collapse;width:100%}
.mm-element-wrap-table .mm-element-table{table-layout:fixed;width:100%}
.mm-element-table caption{text-align:left}
.mm-element-table th,.mm-element-table td{border:1px solid #d1d5db;padding:4px 6px;text-align:left}
.mm-element-table .mm-table-empty{color:#6b7280;font-style:italic;text-align:center}
.mm-element-dialog{background:#fff;border:2px solid #9ca3af;border-radius:6px;max-width:360px;padding:12px}
.mm-dialog-title{font-weight:600;margin-bottom:8px}
.mm-dialog-body{color:#374151}
.mm-dialog-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:12px}
.mm-dialog-actions .mm-element-wrap{width:auto}
.mm-modal-overlay{align-items:center;background:rgba(15,23,42,.28);display:flex;inset:0;justify-content:center;min-height:220px;padding:24px;position:absolute;z-index:8}
.mm-modal-content{max-width:min(420px,100%);width:max-content}
.mm-element-toast{align-items:center;background:#fff;border-left-width:4px;box-shadow:0 8px 22px rgba(15,23,42,.16);display:flex;gap:10px;max-width:min(320px,100%);min-width:180px}
.mm-toast-message{min-width:0}
.mm-toast-action{border-left:1px solid currentColor;font-weight:700;margin-left:auto;padding-left:10px;white-space:nowrap}
.mm-toast-region{display:flex;gap:8px;max-width:calc(100% - 32px);pointer-events:none;position:absolute;z-index:7}
.mm-toast-region .mm-element-wrap{pointer-events:auto;width:auto}
.mm-toast-region-top-right{align-items:flex-end;flex-direction:column;right:16px;top:16px}
.mm-toast-region-top-left{align-items:flex-start;flex-direction:column;left:16px;top:16px}
.mm-toast-region-bottom-right{align-items:flex-end;bottom:16px;flex-direction:column-reverse;right:16px}
.mm-toast-region-bottom-left{align-items:flex-start;bottom:16px;flex-direction:column-reverse;left:16px}
.mm-toast-region-top{align-items:center;flex-direction:column;left:50%;top:16px;transform:translateX(-50%)}
.mm-toast-region-bottom{align-items:center;bottom:16px;flex-direction:column-reverse;left:50%;transform:translateX(-50%)}
.mm-element-image{background:#f9fafb;border-style:dashed;display:inline-block;min-width:180px;padding:8px;text-align:center}
.mm-image-placeholder{align-items:center;display:flex;justify-content:center;min-height:80px}
.mm-element-image figcaption{color:#6b7280;font-size:12px;margin-top:4px}
.mm-element-icon{align-items:center;display:inline-flex;gap:6px}
.mm-icon-symbol{border:1px solid #9ca3af;border-radius:50%;display:inline-flex;height:24px;min-width:24px;align-items:center;justify-content:center;padding:0 4px}
.mm-element-spinner{align-items:center;background:#f9fafb;display:inline-flex;gap:8px}
.mm-spinner-symbol{animation:mm-spin 0.9s linear infinite;border:2px solid #d1d5db;border-top-color:#2563eb;border-radius:50%;display:inline-block;height:16px;width:16px}
.mm-spinner-label{color:#374151}
.mm-element-divider{align-items:center;border:0;border-top:1px solid #cbd5e1;display:flex;margin:12px 0;min-height:1px;padding:0;width:100%}
.mm-divider-label{background:#f8fafc;color:#6b7280;font-size:12px;margin-left:12px;margin-top:-1px;padding:0 6px;transform:translateY(-50%)}
@keyframes mm-spin{to{transform:rotate(360deg)}}
.mm-element-button{align-items:center;background:#f3f4f6;border-color:#9ca3af;box-shadow:inset 0 -1px 0 rgba(17,24,39,.18);color:#111827;cursor:default;display:inline-flex;font-weight:600;justify-content:center;line-height:1.2;min-height:34px;padding:8px 14px;text-align:center}
.mm-element-button.mm-size-small{font-size:12px;min-height:28px;padding:5px 10px}.mm-element-button.mm-size-medium{min-height:34px;padding:8px 14px}.mm-element-button.mm-size-large{font-size:15px;min-height:42px;padding:11px 18px}
.mm-layout-stack > .mm-element-wrap{align-self:stretch;width:auto}
.mm-layout-stack.mm-variant-navigation:not(.mm-gap-xs):not(.mm-gap-sm):not(.mm-gap-md):not(.mm-gap-lg):not(.mm-gap-xl){gap:var(--mm-gap-sm,8px)}
.mm-layout-stack > .mm-element-button,.mm-layout-stack > .mm-element-link,.mm-layout-stack > .mm-element-wrap-button,.mm-layout-stack > .mm-element-wrap-link{align-self:flex-start;max-width:100%;white-space:normal;width:max-content}
.mm-layout-stack > .mm-element-wrap-heading,.mm-layout-stack > .mm-element-wrap-paragraph,.mm-layout-stack > .mm-element-wrap-text,.mm-layout-stack > .mm-element-wrap-checkbox{align-self:flex-start;max-width:100%;width:max-content}
.mm-layout-stack > .mm-element-wrap-button > .mm-element-button,.mm-layout-stack > .mm-element-wrap-link > .mm-element-link{max-width:100%;white-space:normal;width:max-content}
.mm-element[disabled],.mm-element[aria-disabled="true"]{cursor:not-allowed;opacity:.58}
.mm-element-button.mm-variant-primary{background:#2563eb;border-color:#1d4ed8;color:#fff}
.mm-variant-primary{background:#dbeafe;border-color:#60a5fa}
.mm-layout.mm-variant-card{background:#fff;border-color:#cbd5e1;box-shadow:0 1px 2px rgba(15,23,42,.08)}
.mm-tone-danger{background:#fee2e2;border-color:#f87171;color:#991b1b}
.mm-tone-success{background:#dcfce7;border-color:#4ade80;color:#166534}
.mm-tone-warning{background:#fef3c7;border-color:#fbbf24;color:#92400e}
.mm-tone-info{background:#e0f2fe;border-color:#38bdf8;color:#075985}
.mm-id{align-items:center;align-self:flex-start;border:1px solid transparent;display:inline-flex;flex:0 0 auto;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:9px;font-variant-numeric:tabular-nums;font-weight:700;justify-content:center;letter-spacing:0;line-height:1;margin-right:6px;min-height:16px;min-width:16px;padding:1px 4px;width:max-content}
.mm-marker-layout{background:#ecfeff;border-color:#67e8f9;border-left:3px solid #0891b2;border-radius:4px;color:#155e75}
.mm-marker-element{background:rgba(255,255,255,.72);border-color:#f59e0b;border-radius:999px;color:#92400e;box-shadow:0 1px 2px rgba(15,23,42,.12)}
.mm-marker-action{background:rgba(255,255,255,.78);border-color:#22c55e;border-radius:4px;color:#166534;box-shadow:0 1px 2px rgba(15,23,42,.12)}
.mm-marker-message{background:#fef2f2;border-color:#fca5a5;border-radius:4px;color:#991b1b;box-shadow:0 1px 2px rgba(15,23,42,.12);margin-right:4px}
.mm-render-warning{background:#fef3c7;border:1px dashed #f59e0b;border-radius:4px;color:#92400e;padding:6px 8px}
</style>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
