import {
  preferredLayoutGroupForViewport,
  stateScreenActionsForModel,
  stateScreenElementsForModel,
  systemEventActionsForState,
  type FocusScope,
  type MarkVSpecParseResult,
  type MessageKey,
  type StateScreenReadModel
} from "@markvspec/core";
import { viewportPrintStyle } from "@markvspec/document-renderer";
import type { StateViewSpecTableRenderer } from "./state-view-spec-tables.js";

export interface StateViewsFormatters {
  label(key: MessageKey): string;
  text(value: string | undefined): string;
  escapeHtml(value: string): string;
  renderSectionNumber(sectionNumber: string): string;
  renderStateLabel(value: string, extraClass?: string): string;
  renderTrigger(trigger: string | undefined): string;
}

export interface StateViewsProseProvider {
  sectionProseForKind(kind: string): MarkVSpecParseResult["sectionProse"];
}

export interface StateViewsSpecFragmentRenderers {
  renderModelSamplesForState(stateName: string | undefined): string;
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
    <h2>${context.format.label("stateViews")}</h2>
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
      ${specFragments.renderModelSamplesForState(model.stateName)}
      ${renderStateScreenSubheading(context, format.label("wireframe"))}
      <section class="wireframe-section">${annotatedWireframeHtml}</section>
      ${renderDisplayExplanationsBox(context, model)}
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

function renderDisplayExplanationsBox(
  context: StateViewsRenderContext,
  model: StateScreenReadModel
): string {
  if (model.displayExplanations.length === 0) {
    return "";
  }
  const { format } = context;
  const items = model.displayExplanations.map((explanation) => {
    const source = `${renderDisplayExplanationMarker(format, explanation)} ${format.text(explanation.sourceName || explanation.sourceId)}`;
    const targetList = explanation.targetRefs.map((target) => `<li>${format.text(target)}</li>`).join("");
    const triggerList = explanation.triggeredBy.map((trigger) => `<li>${format.text(trigger)}</li>`).join("");
    const summary = explanation.textSummary.length > 0
      ? `<dt>${format.label("message")}</dt><dd><ul>${explanation.textSummary.map((line) => `<li>${format.text(line)}</li>`).join("")}</ul></dd>`
      : "";
    return `<div class="display-explanation-item">
      <h6>${source}</h6>
      <dl>
        <dt>${format.label("displaySource")}</dt><dd>${format.text(explanation.sourceId)}</dd>
        <dt>${format.label("displayedAt")}</dt><dd><ul>${targetList}</ul></dd>
        <dt>${format.label("triggeredBy")}</dt><dd><ul>${triggerList}</ul></dd>
        <dt>${format.label("kind")}</dt><dd>${format.text(explanation.kind)}</dd>
        ${summary}
      </dl>
    </div>`;
  }).join("");
  return `<aside class="display-explanations-box">
    <h6 class="state-screen-detail-heading">${format.label("displayedMessages")}</h6>
    ${items}
  </aside>`;
}

function renderDisplayExplanationMarker(
  format: StateViewsFormatters,
  explanation: StateScreenReadModel["displayExplanations"][number]
): string {
  const markerCategory = explanation.markerSource === "element" ? "element" : "message";
  return `<code class="mm-id mm-marker mm-marker-${markerCategory}" data-mm-marker-category="${markerCategory}" data-mm-display-source="${format.escapeHtml(explanation.sourceId)}">${format.escapeHtml(explanation.markerId)}</code>`;
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
