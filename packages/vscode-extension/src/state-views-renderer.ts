import {
  preferredLayoutGroupForViewport,
  stateScreenActionsForModel,
  stateScreenElementsForModel,
  systemEventActionsForState,
  tableColumnSampleKeys,
  type FocusScope,
  type MarkVSpecParseResult,
  type MessageKey,
  type StateScreenReadModel
} from "@markvspec/core";
import { viewportPrintStyle } from "@markvspec/document-renderer";
import type { EntityReference } from "./entity-reference-presenter.js";
import type { StateViewSpecTableRenderer } from "./state-view-spec-tables.js";

export interface StateViewsFormatters {
  label(key: MessageKey): string;
  text(value: string | undefined): string;
  escapeHtml(value: string): string;
  renderSectionNumber(sectionNumber: string): string;
  renderStateLabel(value: string, extraClass?: string): string;
  renderTrigger(trigger: string | undefined): string;
  renderEntityRef(input: StateViewEntityRef): string;
}

export interface StateViewsProseProvider {
  sectionProseForKind(kind: string): MarkVSpecParseResult["sectionProse"];
}

export type StateViewEntityRef = EntityReference;

export interface StateViewsSpecFragmentRenderers {
  renderLayoutSpecFragment(heading: string, content: string, headingLevel: 3 | 5, emptyWhenRepeatedHidden: boolean): string;
  renderElementSpecFragment(
    heading: string,
    content: string,
    sectionProse: MarkVSpecParseResult["sectionProse"],
    headingLevel: 3 | 5,
    emptyWhenRepeatedHidden: boolean
  ): string;
  renderActionSpecFragment(
    heading: string,
    content: string,
    sectionProse: MarkVSpecParseResult["sectionProse"],
    headingLevel: 3 | 5,
    emptyWhenRepeatedHidden: boolean
  ): string;
}

export interface StateViewsRenderContext {
  readonly format: StateViewsFormatters;
  readonly prose: StateViewsProseProvider;
  readonly specFragments: StateViewsSpecFragmentRenderers;
  readonly specTables: StateViewSpecTableRenderer;
}

export function renderStateViewsSection(context: StateViewsRenderContext, content: string): string {
  if (!content) {
    return "";
  }
  return `<section class="doc-section state-views-section">
    <h2 id="state-views">${context.format.label("stateViews")}</h2>
    ${content}
  </section>`;
}

export function renderStateViewportSection(
  context: StateViewsRenderContext,
  viewport: string | undefined,
  isDefault: boolean,
  content: string,
  sectionNumber?: string
): string {
  const { format } = context;
  const viewportAttr = viewport ? ` data-viewport="${format.escapeHtml(viewport)}"` : "";
  const numberAttr = sectionNumber ? ` data-section-number="${format.escapeHtml(sectionNumber)}"` : "";
  const viewportLabel = viewport ? `${format.label("viewport")} ${format.text(viewport)}` : format.label("viewport");
  const defaultBadge = isDefault ? `<span class="state-badge">${format.label("default")}</span>` : "";
  return `<section class="state-viewport-section"${viewportAttr}${numberAttr}>
    <h3>${sectionNumber ? `${format.renderSectionNumber(sectionNumber)} ` : ""}${viewportLabel}${defaultBadge}</h3>
    ${content}
  </section>`;
}

export function renderStateScreenReadModel(
  result: MarkVSpecParseResult,
  context: StateViewsRenderContext,
  model: StateScreenReadModel,
  wireframeHtml: string,
  sectionNumber?: string
): string {
  return renderStateScreenSpec(
    result,
    context,
    model,
    wireframeHtml,
    sectionNumber
  );
}

function renderStateScreenSpec(
  result: MarkVSpecParseResult,
  context: StateViewsRenderContext,
  model: StateScreenReadModel,
  wireframeHtml: string,
  sectionNumber?: string
): string {
  const elements = stateScreenElementsForModel(result, model);
  const actions = stateScreenActionsForModel(result, model);
  const { format, prose, specFragments, specTables } = context;
  const stateLabel = model.stateName ? `${format.renderStateLabel(model.stateName, "state-label")}${model.initial ? `<span class="state-badge">${format.label("initial")}</span>` : ""}` : format.text(model.title);
  const scenarioBadge = model.stateName && model.scenario
    ? `<span class="state-badge">${format.text(model.title)}</span>`
    : "";
  const heading = model.stateName ? `${format.label("state")}: ${stateLabel}${scenarioBadge}` : stateLabel;
  const numberedHeading = sectionNumber ? `${format.renderSectionNumber(sectionNumber)} ${heading}` : heading;
  const messageHtml = model.message ? `<p class="spec-empty">${format.text(model.message)}</p>` : "";
  const layoutsTableHtml = specTables.renderLayoutsTable(model, model.repeatedLayoutIds);
  const layoutsHtml = layoutsTableHtml
    ? specFragments.renderLayoutSpecFragment(format.label("layouts"), layoutsTableHtml, 5, model.repeatedContent.layoutSpecEmptyWhenRepeatedHidden)
    : "";
  const elementSpecContent = specTables.renderElementsTable(elements, model.renderedIds.layoutIds, model.viewport, model.stateName, model.repeatedElementIds, model);
  const actionSpecContent = specTables.renderActionsTable(actions, model.stateName, model.stateNames, model.repeatedActionIds, model.repeatedContent.actionSpecEmptyWhenRepeatedHidden);
  const elementSpecHtml = elementSpecContent ? specFragments.renderElementSpecFragment(format.label("elements"), elementSpecContent, prose.sectionProseForKind("Elements"), 5, model.repeatedContent.elementSummaryEmptyWhenRepeatedHidden) : "";
  const actionSpecHtml = actionSpecContent ? specFragments.renderActionSpecFragment(format.label("actions"), actionSpecContent, prose.sectionProseForKind("Actions"), 5, model.repeatedContent.actionSpecEmptyWhenRepeatedHidden) : "";
  const annotatedWireframeHtml = markRepeatedWireframeMarkers(result, wireframeHtml, model.repeatedLayoutIds, model.repeatedElementIds, model.repeatedActionIds);
  const repeatedLayoutOnlyMessage = model.repeatedContent.hasSuppressedRepeatedContent && !model.repeatedContent.hasVisibleStateSpecWhenRepeatedHidden
    ? `<p class="spec-empty repeated-layout-only-message" data-repeated-layout-only-message data-mm-show-repeated-hidden="true">${format.label("displayLayoutOnlyChanged")}</p>`
    : "";
  const viewportAttrs = model.viewport ? `data-viewport="${format.escapeHtml(model.viewport)}" style="${viewportPrintStyle(model.viewport)}"` : "";
  const sectionNumberAttr = sectionNumber ? ` data-section-number="${format.escapeHtml(sectionNumber)}"` : "";
  const stateViewTitleAttr = ` data-state-view-title="${format.escapeHtml(model.stateViewTitle)}"`;
  return `<section class="doc-section state-screen-section"${sectionNumberAttr}${stateViewTitleAttr} ${model.stateName ? `data-state="${format.escapeHtml(model.stateName)}"` : ""} ${viewportAttrs}>
    <section class="wireframe-print-section">
      <h4 class="state-screen-heading">${numberedHeading}</h4>
      ${messageHtml}
      ${renderStateScreenSubheading(context, format.label("wireframe"))}
      <section class="wireframe-section">${annotatedWireframeHtml}</section>
      ${renderScenarioSamplesBox(result, context, model)}
      ${renderDisplayExplanationsBox(result, context, model)}
      ${renderSystemEventsBox(result, context, model.renderedIds.elementIds, model.stateName, model.initial, model.focus, model.repeatedActionIds, model.repeatedContent.systemEventsEmptyWhenRepeatedHidden)}
    </section>
    ${repeatedLayoutOnlyMessage}
    ${layoutsHtml}
    ${elementSpecHtml}
    ${actionSpecHtml}
  </section>`;
}

function renderStateScreenSubheading(context: StateViewsRenderContext, heading: string): string {
  return `<h5 class="state-screen-subheading">${context.format.escapeHtml(heading)}</h5>`;
}

function renderScenarioSamplesBox(
  result: MarkVSpecParseResult,
  context: StateViewsRenderContext,
  model: StateScreenReadModel
): string {
  if (model.scenarioSamples.length === 0) {
    return "";
  }
  const { format } = context;
  const elementById = new Map(result.elements.map((element) => [element.id, element]));
  const rows = model.scenarioSamples.map((sample) => {
    const element = elementById.get(sample.elementId);
    return `<tr><td>${renderScenarioSampleElementRef(context, sample.elementId, element)}</td><td>${renderScenarioSampleSummary(context, sample)}</td></tr>`;
  }).join("");
  const rowBlocks = model.scenarioSamples
    .map((sample) => renderScenarioSampleRowsBlock(context, sample, elementById.get(sample.elementId)))
    .filter(Boolean)
    .join("");
  return `<aside class="scenario-samples-box">
    <h6 class="state-screen-detail-heading">${format.label("scenarioSamples")}</h6>
    <div class="spec-table-wrap"><table class="spec-table scenario-samples-table"><thead><tr><th>${format.label("elements")}</th><th>${format.label("sample")}</th></tr></thead><tbody>${rows}</tbody></table></div>
    ${rowBlocks}
  </aside>`;
}

function renderScenarioSampleElementRef(
  context: StateViewsRenderContext,
  elementId: string,
  element?: MarkVSpecParseResult["elements"][number]
): string {
  const { format } = context;
  if (!element) {
    return format.text(elementId);
  }
  return format.renderEntityRef({
    id: element.id,
    category: "element",
    marker: typeof element.properties["marker"] === "string" ? element.properties["marker"] : element.id,
    label: typeof element.properties["label"] === "string" ? element.properties["label"] : element.id
  });
}

function renderScenarioSampleSummary(
  context: StateViewsRenderContext,
  sample: StateScreenReadModel["scenarioSamples"][number]
): string {
  const { format } = context;
  if (sample.rows) {
    if (sample.rows.explicitEmpty && sample.rows.rows.length === 0) {
      return `<code>rows: []</code>`;
    }
    const count = sample.rows.rows.length;
    return `<code>rows: ${count} ${format.label("scenarioSampleRowsUnit")}</code>`;
  }
  return format.text(sample.value ?? "");
}

function renderScenarioSampleRowsBlock(
  context: StateViewsRenderContext,
  sample: StateScreenReadModel["scenarioSamples"][number],
  element: MarkVSpecParseResult["elements"][number] | undefined
): string {
  const { format } = context;
  if (!sample.rows || sample.rows.rows.length === 0) {
    return "";
  }
  const rowsTable = renderScenarioSampleRowsTable(context, sample.rows.rows, element);
  if (!rowsTable) {
    return "";
  }
  return `<section class="scenario-sample-rows-block">
    <h6 class="scenario-sample-rows-heading">${format.label("sample")} ${format.label("rows")}: ${renderScenarioSampleElementRef(context, sample.elementId, element)}</h6>
    ${rowsTable}
  </section>`;
}

function renderScenarioSampleRowsTable(
  context: StateViewsRenderContext,
  rows: NonNullable<StateScreenReadModel["scenarioSamples"][number]["rows"]>["rows"],
  element: MarkVSpecParseResult["elements"][number] | undefined
): string {
  const { format } = context;
  const columns = scenarioSampleColumns(rows, element);
  if (columns.length === 0) {
    return "";
  }
  const header = columns.map((column) => `<th>${format.escapeHtml(column.label)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${columns.map((column) => `<td>${format.text(scenarioSampleCellValue(row.fields, column.keys))}</td>`).join("")}</tr>`)
    .join("");
  return `<div class="scenario-sample-rows-wrap"><table class="spec-table scenario-sample-rows-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function scenarioSampleColumns(
  rows: NonNullable<StateScreenReadModel["scenarioSamples"][number]["rows"]>["rows"],
  element: MarkVSpecParseResult["elements"][number] | undefined
): Array<{ keys: string[]; label: string }> {
  const seen = new Set<string>();
  const columns: Array<{ keys: string[]; label: string }> = [];
  for (const column of element?.tableColumns ?? []) {
    const keys = tableColumnSampleKeys(column);
    const primaryKey = keys[0];
    if (!primaryKey || seen.has(primaryKey)) {
      continue;
    }
    for (const key of keys) {
      seen.add(key);
    }
    columns.push({ keys, label: column.label });
  }
  for (const row of rows) {
    for (const key of Object.keys(row.fields)) {
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      columns.push({ keys: [key], label: key });
    }
  }
  return columns;
}

function scenarioSampleCellValue(fields: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    if (fields[key] !== undefined) {
      return fields[key] ?? "";
    }
  }
  return "";
}

function renderDisplayExplanationsBox(
  result: MarkVSpecParseResult,
  context: StateViewsRenderContext,
  model: StateScreenReadModel
): string {
  if (model.displayExplanations.length === 0) {
    return "";
  }
  return renderDisplayUpdatesBox(result, context, model, model.displayExplanations);
}

function renderDisplayUpdatesBox(
  result: MarkVSpecParseResult,
  context: StateViewsRenderContext,
  model: StateScreenReadModel,
  explanations: StateScreenReadModel["displayExplanations"]
): string {
  if (explanations.length === 0) {
    return "";
  }
  const { format } = context;
  const rows = explanations.map((explanation) => {
    const triggeredBy = explanation.triggeredBy.map((trigger) => renderDisplayUpdateTrigger(result, format, trigger)).join("");
    const targets = explanation.targetRefs.length > 0 ? explanation.targetRefs : ["(overlay)"];
    const updateLines = targets.map((target) => `<div class="display-update-line">${renderDisplayUpdateTarget(result, context, model, target)}<span class="display-update-arrow">${format.label("displayReceives")}</span>${renderDisplayUpdateContent(result, context, model, explanation)}</div>`).join("");
    return `<tr><td>${triggeredBy}</td><td>${updateLines}</td></tr>`;
  }).join("");
  return `<aside class="display-explanations-box display-updates-box">
    <h6 class="state-screen-detail-heading">${format.label("displayUpdates")}</h6>
    <div class="spec-table-wrap"><table class="spec-table display-updates-table"><thead><tr><th>${format.label("triggeredBy")}</th><th>${format.label("update")}</th></tr></thead><tbody>${rows}</tbody></table></div>
  </aside>`;
}

function renderDisplayUpdateTrigger(
  result: MarkVSpecParseResult,
  format: StateViewsFormatters,
  trigger: string
): string {
  const parsed = /^(.+?)\.([^.]+)\.([^.]+)$/u.exec(trigger);
  if (!parsed) {
    return `<div class="display-update-trigger">${format.text(trigger)}</div>`;
  }
  const [, actionId, processMarker, caseName] = parsed;
  const action = result.actions.find((candidate) => candidate.id === actionId);
  const actionRef = action
    ? format.renderEntityRef({
      id: action.id,
      category: "action",
      marker: actionMarker(action),
      label: action.name || action.id,
      href: `#action-detail-${format.escapeHtml(encodeURIComponent(action.id))}`
    })
    : format.text(actionId);
  return `<div class="display-update-trigger">
    <div>${actionRef}</div>
    <div class="display-update-note">${format.text(`${processMarker}.${caseName}`)}</div>
  </div>`;
}

function renderDisplayUpdateTarget(
  result: MarkVSpecParseResult,
  context: StateViewsRenderContext,
  model: Pick<StateScreenReadModel, "viewport">,
  target: string
): string {
  const { format } = context;
  if (target === "(overlay)") {
    return `<span class="display-update-ref display-update-overlay">${format.text(format.label("processOverlay"))}</span>`;
  }
  const baseTarget = target.endsWith(".error") ? target.slice(0, -".error".length) : target;
  const suffix = target.endsWith(".error") ? ".error" : "";
  return `${renderDisplayUpdateEntityRef(result, format, model, baseTarget)}${suffix ? `<span class="display-update-suffix">${format.text(suffix)}</span>` : ""}`;
}

function renderDisplayUpdateContent(
  result: MarkVSpecParseResult,
  context: StateViewsRenderContext,
  model: StateScreenReadModel,
  explanation: StateScreenReadModel["displayExplanations"][number]
): string {
  const reference = renderDisplayUpdateEntityRef(result, context.format, model, explanation.sourceId, explanation.sourceName);
  if (explanation.contentKind === "partial") {
    return `${context.format.label("partial")} ${reference}`;
  }
  return explanation.contentKind === "message"
    ? `${reference}<span class="display-update-suffix">${context.format.text(".messages")}</span>`
    : reference;
}

function renderDisplayUpdateEntityRef(
  result: MarkVSpecParseResult,
  format: StateViewsFormatters,
  model: Pick<StateScreenReadModel, "viewport">,
  id: string,
  fallbackName?: string
): string {
  if (id.startsWith("L-")) {
    const layout = preferredLayoutGroupForViewport(result, id, model.viewport);
    const marker = stringPropertyValue(layout?.properties["marker"]) || id;
    const name = layout?.name || fallbackName || id;
    return format.renderEntityRef({ id, category: "layout", marker, label: name });
  }
  if (id.startsWith("E-")) {
    const element = result.elements.find((candidate) => candidate.id === id);
    const marker = stringPropertyValue(element?.properties["marker"]) || id;
    const name = fallbackName || element?.id || id;
    return format.renderEntityRef({ id, category: "element", marker, label: name });
  }
  if (id.startsWith("V-")) {
    const validation = result.validations.find((candidate) => candidate.id === id);
    const marker = stringPropertyValue(validation?.properties["marker"]) || id;
    const name = fallbackName || validation?.name || id;
    return format.renderEntityRef({ id, category: "message", marker, label: name, displaySource: id });
  }
  if (id.startsWith("R-")) {
    const rule = result.rules.find((candidate) => candidate.id === id);
    const marker = stringPropertyValue(rule?.properties["marker"]) || id;
    const name = fallbackName || rule?.name || id;
    return format.renderEntityRef({ id, category: "message", marker, label: name, displaySource: id });
  }
  if (id.startsWith("PRT-")) {
    return `<span class="display-update-ref">${format.text(fallbackName || id)}</span>`;
  }
  return `<span class="display-update-ref">${format.text(fallbackName || id)}</span>`;
}

function actionMarker(action: MarkVSpecParseResult["actions"][number]): string {
  return stringPropertyValue(action.properties["marker"]) || action.id;
}

function stringPropertyValue(value: string | string[] | true | undefined): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function repeatedHiddenEmptyAttr(emptyWhenRepeatedHidden: boolean): string {
  return emptyWhenRepeatedHidden ? ` data-mm-repeated-empty="true"` : "";
}

function renderSystemEventsBox(
  result: MarkVSpecParseResult,
  context: StateViewsRenderContext,
  renderedElementIds: ReadonlySet<string>,
  stateName: string | undefined,
  initial: boolean,
  focus?: FocusScope,
  repeatedActionIds?: ReadonlySet<string>,
  emptyWhenRepeatedHidden = false
): string {
  const actions = systemEventActionsForState(result, renderedElementIds, stateName, initial, focus);

  if (actions.length === 0) {
    return "";
  }

  return `<aside class="system-events-box"${repeatedHiddenEmptyAttr(emptyWhenRepeatedHidden)}>
    <h6 class="state-screen-detail-heading">${context.format.label("systemEvents")}</h6>
    <ul>${actions.map((action) => renderSystemEventItem(context, action, Boolean(repeatedActionIds?.has(action.id)))).join("")}</ul>
  </aside>`;
}

function renderSystemEventItem(
  context: StateViewsRenderContext,
  action: MarkVSpecParseResult["actions"][number],
  repeated = false
): string {
  const trigger = action.triggeredBy
    ? `<span class="system-event-trigger">（${context.format.label("trigger")}: ${context.format.renderTrigger(action.triggeredBy)}）</span>`
    : "";
  return `<li>${context.specTables.renderRepeatedMarkerCell(action.id, repeated)} ${context.format.text(action.name)}${trigger}</li>`;
}

function markRepeatedWireframeMarkers(
  result: MarkVSpecParseResult,
  html: string,
  repeatedLayoutIds?: ReadonlySet<string>,
  repeatedElementIds?: ReadonlySet<string>,
  repeatedActionIds?: ReadonlySet<string>
): string {
  if (!repeatedLayoutIds?.size && !repeatedElementIds?.size && !repeatedActionIds?.size) {
    return html;
  }

  const repeatedLayoutMarkers = markersForLayouts(result, [...(repeatedLayoutIds ?? [])]);
  const repeatedElementMarkers = markersForElements(result, [...(repeatedElementIds ?? [])]);
  const repeatedActionMarkers = markersForActions(result, [...(repeatedActionIds ?? [])]);

  return html.replace(/<code class="mm-id mm-marker mm-marker-(layout|element|action)" data-mm-marker-category="\1">([\s\S]*?)<\/code>/g, (match, category: "layout" | "element" | "action", value: string) => {
    const marker = unescapeHtml(value.replace(/<[^>]*>/g, ""));
    const repeatedMarkers = category === "layout" ? repeatedLayoutMarkers : category === "element" ? repeatedElementMarkers : repeatedActionMarkers;
    if (!repeatedMarkers.has(marker)) {
      return match;
    }

    return match
      .replace("mm-id mm-marker", "mm-id mm-marker mm-marker-repeated")
      .replace(`data-mm-marker-category="${category}"`, `data-mm-marker-category="${category}" data-mm-repeated-marker="true"`);
  });
}

function markersForLayouts(result: MarkVSpecParseResult, ids: string[]): Set<string> {
  return new Set(ids.map((id) => preferredLayoutGroupForViewport(result, id)?.properties["marker"] || id));
}

function markersForElements(result: MarkVSpecParseResult, ids: string[]): Set<string> {
  const elementById = new Map(result.elements.map((element) => [element.id, element]));
  return new Set(ids.map((id) => stringProperty(elementById.get(id)?.properties["marker"]) || id));
}

function markersForActions(result: MarkVSpecParseResult, ids: string[]): Set<string> {
  const actionById = new Map(result.actions.map((action) => [action.id, action]));
  return new Set(ids.map((id) => actionById.get(id)?.properties["marker"] || id));
}

function stringProperty(value: string | true | undefined): string {
  return typeof value === "string" ? escapeHtml(value) : "";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function unescapeHtml(value: string): string {
  return value
    .replaceAll("&quot;", "\"")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}
