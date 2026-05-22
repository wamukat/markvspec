import { buildViewportStateScreenReadModels, layoutConditionValues, layoutDisplaySettings, renderMarkVSpecHtml, resolveMarkVSpecEntityReference, sampleRowsAnchorId, scenarioRouteValues, stateScreenControlledPanelPlacementsForModel, stateScreenLayoutsForModel, stateScreenUnplacedLayoutIdsForModel, tableColumnSampleKeys } from "@markvspec/core/browser";
import type { ControlledPanelPlacement, MarkVSpecParseResult, RendererMessages, StateScreenReadModel } from "@markvspec/core/browser";
import {
  renderDisplayContentSpecBox,
  renderInputFormSpecBox,
  type StaticElementSpecRenderingSupport
} from "./static-element-spec.js";
import {
  renderStaticElementDetailReference,
  renderStaticEntityReference,
  renderStaticPreviewIcon
} from "./static-entity-reference-presenter.js";

type TableCell = string | undefined | null | {
  html: string | undefined;
  rowspan?: number;
};

export interface StaticStateViewRenderingSupport {
  code(value: string | undefined): string;
  consecutiveRowspans<T>(rows: T[], keyFor: (row: T, index: number) => string): number[];
  escapeHtml(value: string): string;
  renderMarkdownLines(lines: string[], result: MarkVSpecParseResult): string;
  renderStaticEntityNotes(result: MarkVSpecParseResult, lines: readonly string[]): string;
  renderStaticEntityOverview(result: MarkVSpecParseResult, lines: readonly string[]): string;
  renderTable(headers: string[], rows: Array<Array<string | undefined>>, emptyLabel?: string): string;
  renderTableWithCells(headers: string[], rows: TableCell[][], emptyLabel?: string): string;
  rowspanPrefixCells(rowspan: number, htmlCells: string[]): TableCell[];
  viewportPrintStyle(viewport: string | undefined): string;
}

export function renderStateViewsSection(
  result: MarkVSpecParseResult,
  messages: RendererMessages,
  support: StaticStateViewRenderingSupport
): string {
  const sectionProse = result.sectionProse.filter((candidate) => candidate.kind === "PreviewScenarios");
  const overview = support.renderStaticEntityOverview(result, sectionProse.flatMap((candidate) => candidate.overview));
  const notes = support.renderStaticEntityNotes(result, sectionProse.flatMap((candidate) => candidate.notes));
  const viewportSections = buildViewportStateScreenReadModels(result, result, undefined, {
    label: (key) => key === "default" ? messages.default : messages.viewport
  }).map((viewportModel) =>
    renderStateViewportSection(
      result,
      viewportModel.models,
      viewportModel.viewport,
      viewportModel.isDefault,
      messages,
      support
    )
  ).join("");

  return `<section class="doc-section state-views-section">
    <h2 id="state-views">${support.escapeHtml(messages.stateViews)}</h2>
    ${overview}
    ${viewportSections}
    ${notes}
  </section>`;
}

function renderStateViewportSection(
  result: MarkVSpecParseResult,
  models: StateScreenReadModel[],
  viewport: string | undefined,
  isDefault: boolean,
  messages: RendererMessages,
  support: StaticStateViewRenderingSupport
): string {
  const viewportAttr = viewport ? ` data-viewport="${support.escapeHtml(viewport)}"` : "";
  const defaultBadge = isDefault ? ` <span class="state-badge">${support.escapeHtml(messages.default)}</span>` : "";
  const viewportLabel = viewport ? `${messages.viewport} ${viewport}` : `${messages.default} ${messages.view}`;
  return `<section class="state-viewport-section"${viewportAttr}>
  <h3>${support.escapeHtml(viewportLabel)}${defaultBadge}</h3>
  ${models.map((model, index) => renderStateScreenSection(result, model, messages, index === 0, support)).join("")}
</section>`;
}

function renderStateScreenSection(
  result: MarkVSpecParseResult,
  model: StateScreenReadModel,
  messages: RendererMessages,
  includeStyles: boolean,
  support: StaticStateViewRenderingSupport
): string {
  const viewportAttrs = model.viewport ? ` data-viewport="${support.escapeHtml(model.viewport)}" style="${support.viewportPrintStyle(model.viewport)}"` : "";
  const stateAttrs = model.stateName ? ` data-state="${support.escapeHtml(model.stateName)}"` : "";
  const stateViewTitleAttr = ` data-state-view-title="${support.escapeHtml(model.stateViewTitle)}"`;
  const initialBadge = model.initial ? ` ${support.escapeHtml(messages.initial)}` : "";
  const scenarioBadge = model.stateName && model.scenario ? ` <span class="state-badge">${support.escapeHtml(model.title)}</span>` : "";
  const stateHeading = model.stateName
    ? `${support.escapeHtml(messages.state)}: ${support.escapeHtml(model.stateName)}${initialBadge}${scenarioBadge}`
    : `${support.escapeHtml(messages.default)} ${support.escapeHtml(messages.view)}`;
  const scenarioOverview = support.renderStaticEntityOverview(result, model.scenarioOverview);
  const scenarioNotes = support.renderStaticEntityNotes(result, model.scenarioNotes);
  const stateMessage = model.message ? `<p class="spec-empty state-message">${support.escapeHtml(model.message)}</p>` : "";
  const wireframe = renderMarkVSpecHtml(result, {
    includeStyles,
    markerVisibility: { layout: true, element: true, action: true },
    messages,
    modelValues: model.modelValues,
    routeValues: scenarioRouteValues(model.scenarioRoute),
    sampleOverrides: sampleOverridesFromScenarioSamples(model.scenarioSamples),
    state: model.stateName,
    viewport: model.viewport,
    viewValues: model.viewValues
  });
  const elementSpecSupport = staticElementSpecRenderingSupport(support);

  return `<section class="doc-section state-screen-section"${stateViewTitleAttr}${stateAttrs}${viewportAttrs}>
  <section class="wireframe-print-section">
    <h4 class="state-screen-heading">${stateHeading}</h4>
    ${stateMessage}
    ${scenarioOverview}
    <h5 class="state-screen-subheading">${support.escapeHtml(messages.wireframe)}</h5>
    <section class="wireframe-section">${wireframe}</section>
    ${renderScenarioSamplesBox(result, model, messages, support)}
    ${renderInputFormSpecBox(result, model, messages, elementSpecSupport)}
    ${renderDisplayContentSpecBox(result, model, messages, elementSpecSupport)}
  </section>
  ${renderStaticLayoutsSpecBox(result, model, messages, support)}
  ${scenarioNotes}
</section>`;
}

function sampleOverridesFromScenarioSamples(
  samples: StateScreenReadModel["scenarioSamples"]
): NonNullable<Parameters<typeof renderMarkVSpecHtml>[1]>["sampleOverrides"] | undefined {
  if (samples.length === 0) {
    return undefined;
  }
  return Object.fromEntries(samples.map((sample) => [sample.elementId, sample]));
}

function renderStaticLayoutsSpecBox(
  result: MarkVSpecParseResult,
  model: StateScreenReadModel,
  messages: RendererMessages,
  support: StaticStateViewRenderingSupport
): string {
  const layouts = stateScreenLayoutsForModel(result, model);
  if (layouts.length === 0) {
    return "";
  }
  const unplacedLayoutIds = stateScreenUnplacedLayoutIdsForModel(result, model);
  const controlledPlacementsByLayoutId = new Map<string, ControlledPanelPlacement[]>();
  for (const placement of stateScreenControlledPanelPlacementsForModel(result, model)) {
    if (!placement.active) {
      continue;
    }
    controlledPlacementsByLayoutId.set(placement.layoutId, [...controlledPlacementsByLayoutId.get(placement.layoutId) ?? [], placement]);
  }
  const showOverview = layouts.some((layout) => (layout.overview?.length ?? 0) > 0);
  const rows = layouts.map((layout) => [
    renderStaticLayoutReference(result, layout, unplacedLayoutIds.has(layout.id), controlledPlacementsByLayoutId.get(layout.id) ?? [], messages, support),
    support.escapeHtml(layout.kind || ""),
    ...(showOverview ? [support.renderStaticEntityOverview(result, layout.overview ?? [])] : []),
    renderStaticLayoutSettingItems(result, layout, messages, support),
    renderStaticLayoutConditions(layout, messages, Boolean(controlledPlacementsByLayoutId.get(layout.id)?.length), support),
    renderStaticLayoutNotes(result, layout, support)
  ]);
  const sectionProse = result.sectionProse.filter((candidate) => candidate.kind === "Layout" && candidate.viewport === model.viewport);
  const sectionOverview = support.renderStaticEntityOverview(result, sectionProse.flatMap((candidate) => candidate.overview));
  const sectionNotes = support.renderStaticEntityNotes(result, sectionProse.flatMap((candidate) => candidate.notes));
  const headers = [
    `${messages.marker}/${messages.id}`,
    messages.kind,
    ...(showOverview ? [messages.overview] : []),
    messages.settingItems,
    messages.condition,
    messages.notes
  ];

  return `<section class="layout-spec-fragment">
    <h5 class="state-screen-subheading">${support.escapeHtml(messages.layouts)}</h5>
    ${sectionOverview}
    ${support.renderTable(headers, rows, messages.none)}
    ${sectionNotes}
  </section>`;
}

type StaticParsedLayout = MarkVSpecParseResult["layoutGroups"][number];

function renderStaticLayoutReference(
  result: MarkVSpecParseResult,
  layout: StaticParsedLayout,
  unplaced: boolean,
  controlledPlacements: ControlledPanelPlacement[],
  messages: RendererMessages,
  support: StaticStateViewRenderingSupport
): string {
  const reference = resolveMarkVSpecEntityReference(result, layout.id);
  const ref = reference ? renderStaticEntityReference(reference, support) : support.code(layout.id);
  const controlledVia = controlledPlacements.length > 0
    ? `<div class="mm-controlled-panel-via">(via: ${controlledPlacements.map((placement) => {
      const elementReference = resolveMarkVSpecEntityReference(result, placement.elementId);
      return elementReference ? renderStaticControlledPanelViaReference(elementReference, support) : support.code(placement.elementId);
    }).join(" ")})</div>`
    : "";
  const unplacedLabel = unplaced ? `<span class="mm-chip mm-unplaced-badge">${renderStaticPreviewIcon("eye-off")}${support.escapeHtml(messages.notPlacedInCurrentLayout)}</span>` : "";
  return [ref + controlledVia, unplacedLabel].filter(Boolean).join(" ");
}

function renderStaticControlledPanelViaReference(reference: NonNullable<ReturnType<typeof resolveMarkVSpecEntityReference>>, support: StaticStateViewRenderingSupport): string {
  if (reference.kind !== "element") {
    return renderStaticEntityReference(reference, support);
  }
  return renderStaticElementDetailReference(reference, support);
}

function renderStaticLayoutSettingItems(result: MarkVSpecParseResult, layout: StaticParsedLayout, messages: RendererMessages, support: StaticStateViewRenderingSupport): string {
  return renderStaticSpecSections([
    [messages.setting, staticLayoutSettingItems(layout, messages, support)],
    [messages.items, staticLayoutItemRows(result, layout, support)]
  ], support);
}

function staticLayoutSettingItems(layout: StaticParsedLayout, messages: RendererMessages, support: StaticStateViewRenderingSupport): string[] {
  const settings = layoutDisplaySettings(layout);
  const entries = [
    ["align", settings.align],
    ["justify", settings.justify],
    ["overlay", settings.overlay],
    ["gap", settings.gap]
  ].filter(([, value]) => value) as Array<[string, string | true]>;
  return entries.map(([key, value]) => `${support.escapeHtml(key)}: ${support.escapeHtml(value === true ? messages.requiredYes : value)}`);
}

function staticLayoutItemRows(result: MarkVSpecParseResult, layout: StaticParsedLayout, support: StaticStateViewRenderingSupport): string[] {
  return layout.items.flatMap((item) => {
    if (item.type === "contains") {
      if (isStaticPresentationPanelId(item.targetId)) {
        return [];
      }
      return [renderStaticEntityReferenceById(result, item.targetId, support)];
    }
    if (item.type === "field") {
      return [`${support.escapeHtml(item.label)}: ${renderStaticEntityReferenceById(result, item.elementId, support)}`];
    }
    if (item.type === "slot") {
      return [`slot: ${support.escapeHtml(item.name)}`];
    }
    return [];
  });
}

function renderStaticEntityReferenceById(result: MarkVSpecParseResult, id: string, support: StaticStateViewRenderingSupport): string {
  const reference = resolveMarkVSpecEntityReference(result, id);
  return reference ? renderStaticEntityReference(reference, support) : support.code(id);
}

function renderStaticLayoutConditions(layout: StaticParsedLayout, messages: RendererMessages, controlledPanel: boolean, support: StaticStateViewRenderingSupport): string {
  const conditions = [
    [messages.conditionVisibleShort, layoutConditionValues(layout, "visible when").join(", ")],
    [messages.conditionHiddenShort, layoutConditionValues(layout, "hidden when").join(", ")],
    [messages.conditionDisabledShort, layoutConditionValues(layout, "disabled when").join(", ")],
    [messages.conditionEnabledShort, layoutConditionValues(layout, "enabled when").join(", ")],
    ["selected", layoutConditionValues(layout, "selected when").join(", ")],
    ["active", layoutConditionValues(layout, "active when").join(", ")]
  ].filter(([, value]) => value);
  return conditions.length > 0
    ? renderStaticSpecList(conditions.map(([key, value]) => `${support.escapeHtml(key)}: ${support.escapeHtml(value)}`))
    : controlledPanel
      ? `<span class="mm-chip mm-controlled-panel-condition">${support.escapeHtml(messages.controlledContent)}</span>`
      : `<span class="spec-default-always">${support.escapeHtml(messages.always)}</span>`;
}

function renderStaticLayoutNotes(result: MarkVSpecParseResult, layout: StaticParsedLayout, support: StaticStateViewRenderingSupport): string {
  return layout.notes && layout.notes.length > 0 ? support.renderMarkdownLines(layout.notes, result) : "";
}

function isStaticPresentationPanelId(id: string): boolean {
  return /^P-[\p{L}\p{N}-]+$/u.test(id);
}

function renderScenarioSamplesBox(
  result: MarkVSpecParseResult,
  model: StateScreenReadModel,
  messages: RendererMessages,
  support: StaticStateViewRenderingSupport
): string {
  if (model.scenarioExplicitSamples.length === 0 && model.scenarioExplicitRoute.length === 0) {
    return "";
  }

  const elementById = new Map(result.elements.map((element) => [element.id, element]));
  const rows = model.scenarioExplicitSamples.map((sample) => {
    return [renderScenarioSampleElementRef(result, sample.elementId, support), renderScenarioSampleSummary(sample, messages, support)];
  });
  const rowBlocks = model.scenarioExplicitSamples
    .map((sample) => renderScenarioSampleRowsBlock(result, model, sample, elementById.get(sample.elementId), messages, support))
    .filter(Boolean)
    .join("");
  const samplesTable = rows.length > 0
    ? support.renderTable([messages.elements, messages.sample], rows)
    : "";
  return `<aside class="scenario-samples-box">
    <h6 class="state-screen-detail-heading">${support.escapeHtml(messages.scenarioSamples)}</h6>
    ${renderScenarioRouteTable(model, messages, support)}
    ${samplesTable}
    ${rowBlocks}
  </aside>`;
}

function renderScenarioRouteTable(
  model: StateScreenReadModel,
  messages: RendererMessages,
  support: StaticStateViewRenderingSupport
): string {
  if (model.scenarioExplicitRoute.length === 0) {
    return "";
  }
  const rows = model.scenarioExplicitRoute.map((sample) => [support.escapeHtml(sample.key), support.escapeHtml(sample.value)]);
  return `<div class="spec-section"><strong>${support.escapeHtml(messages.routeParameters)}</strong>${support.renderTable([messages.name, messages.value], rows)}</div>`;
}

function renderScenarioSampleElementRef(result: MarkVSpecParseResult, elementId: string, support: StaticStateViewRenderingSupport): string {
  const reference = resolveMarkVSpecEntityReference(result, elementId);
  return reference ? renderStaticEntityReference(reference, support) : support.escapeHtml(elementId);
}

function renderScenarioSampleSummary(
  sample: StateScreenReadModel["scenarioSamples"][number],
  messages: RendererMessages,
  support: StaticStateViewRenderingSupport
): string {
  if (sample.rows) {
    if (sample.rows.explicitEmpty && sample.rows.rows.length === 0) {
      return "<code>rows: []</code>";
    }
    const count = sample.rows.rows.length;
    return `<code>rows: ${count} ${support.escapeHtml(messages.scenarioSampleRowsUnit)}</code>`;
  }
  return support.escapeHtml(sample.value ?? "");
}

function renderScenarioSampleRowsBlock(
  result: MarkVSpecParseResult,
  model: StateScreenReadModel,
  sample: StateScreenReadModel["scenarioSamples"][number],
  element: MarkVSpecParseResult["elements"][number] | undefined,
  messages: RendererMessages,
  support: StaticStateViewRenderingSupport
): string {
  if (!sample.rows) {
    return "";
  }
  const rowsTable = renderScenarioSampleRowsTable(sample.rows.rows, element, support);
  if (!rowsTable) {
    return "";
  }
  return `<section class="scenario-sample-rows-block" id="${support.escapeHtml(sampleRowsAnchorId(model, sample.elementId))}">
    <h6 class="scenario-sample-rows-heading">${support.escapeHtml(messages.sample)} ${support.escapeHtml(messages.rows)}: ${renderScenarioSampleElementRef(result, sample.elementId, support)}</h6>
    ${rowsTable}
  </section>`;
}

function renderScenarioSampleRowsTable(
  rows: NonNullable<StateScreenReadModel["scenarioSamples"][number]["rows"]>["rows"],
  element: MarkVSpecParseResult["elements"][number] | undefined,
  support: StaticStateViewRenderingSupport
): string {
  const columns = scenarioSampleColumns(rows, element);
  if (columns.length === 0) {
    return "";
  }
  const header = columns.map((column) => `<th>${support.escapeHtml(column.label)}</th>`).join("");
  const body = rows.length > 0
    ? rows
      .map((row) => `<tr>${columns.map((column) => `<td>${support.escapeHtml(scenarioSampleCellValue(row.fields, column.keys))}</td>`).join("")}</tr>`)
      .join("")
    : `<tr><td class="mm-table-empty" colspan="${Math.max(columns.length, 1)}">(no data)</td></tr>`;
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
  if (columns.length === 0 && rows.length === 0 && element?.type === "List") {
    columns.push({ keys: ["value", "item", "label"], label: "Value" });
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

function staticElementSpecRenderingSupport(support: StaticStateViewRenderingSupport): StaticElementSpecRenderingSupport {
  return {
    code: support.code,
    consecutiveRowspans: support.consecutiveRowspans,
    escapeHtml: support.escapeHtml,
    renderCondition: (condition) => renderCondition(condition, support),
    renderElementConditionSummary: (element, messages) => renderElementConditionSummary(element, messages, support),
    renderExpressionTokens: (source) => renderExpressionTokens(source, support),
    renderPreviewIcon: renderStaticPreviewIcon,
    renderScenarioSampleElementRef: (result, elementId) => renderScenarioSampleElementRef(result, elementId, support),
    renderSemanticChip: (value, tone) => renderSemanticChip(value, tone, support),
    renderSpecSections: (sections) => renderSpecSections(sections, support),
    renderStaticSpecList,
    renderStaticSpecSections: (sections) => renderStaticSpecSections(sections, support),
    renderTable: support.renderTable,
    renderTableWithCells: support.renderTableWithCells,
    rowspanPrefixCells: support.rowspanPrefixCells
  };
}

function renderElementConditionSummary(
  element: MarkVSpecParseResult["elements"][number],
  messages: RendererMessages,
  support: StaticStateViewRenderingSupport
): string {
  const visibleRows = [
    ...element.visibleWhen.map((condition) => `${messages.conditionVisibleShort}: ${renderCondition(condition, support)}`),
    ...element.hiddenWhen.map((condition) => `${messages.conditionHiddenShort}: ${renderCondition(condition, support)}`)
  ];
  const enabledRows = element.disabledWhen.map((condition) => `${messages.conditionNot} ${renderCondition(condition, support)}`);
  return renderSpecSections([{
    title: specSectionTitle(messages.conditionVisibleShort),
    rows: visibleRows
  }, {
    title: specSectionTitle(messages.conditionEnabledShort),
    rows: enabledRows
  }], support) || renderDefaultAlways(messages, support);
}

function renderDefaultAlways(messages: RendererMessages, support: StaticStateViewRenderingSupport): string {
  return `<span class="spec-default-always">${support.escapeHtml(messages.always)}</span>`;
}

function specSectionTitle(value: string): string {
  return /^[a-z]/u.test(value) ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function renderStaticSpecSections(sections: Array<[string, string[]]>, support: StaticStateViewRenderingSupport): string {
  return sections
    .filter(([, items]) => items.length > 0)
    .map(([title, items]) => `<div class="spec-section"><strong>${support.escapeHtml(title)}</strong>${renderStaticSpecList(items)}</div>`)
    .join("");
}

function renderStaticSpecList(items: string[]): string {
  return items.length > 0
    ? `<ul class="spec-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "";
}

function renderSpecSections(sections: Array<{ title: string; rows: string[] }>, support: StaticStateViewRenderingSupport): string {
  const visibleSections = sections.filter((section) => section.rows.length > 0);
  if (visibleSections.length === 0) {
    return "";
  }
  return visibleSections.map((section) => (
    `<div class="spec-section"><strong>${support.escapeHtml(section.title)}</strong><ul class="spec-list">${section.rows.map((row) => `<li>${row}</li>`).join("")}</ul></div>`
  )).join("");
}

function renderExpressionTokens(source: string, support: StaticStateViewRenderingSupport): string {
  return source.split(/(\$\{[^}]+\})/gu).map((part) => isOpaqueExpressionSource(part) ? `<span class="mm-inline-token">${support.escapeHtml(part)}</span>` : support.escapeHtml(part)).join("");
}

function renderCondition(condition: string, support: StaticStateViewRenderingSupport): string {
  return renderExpressionTokens(condition, support);
}

function isOpaqueExpressionSource(value: string): boolean {
  return /^\$\{[^}]+\}$/u.test(value.trim());
}

function renderSemanticChip(value: string, tone: string | undefined, support: StaticStateViewRenderingSupport): string {
  return `<span class="mm-chip mm-chip-tone-${semanticChipTone(tone)}">${support.escapeHtml(value)}</span>`;
}

function semanticChipTone(tone: string | undefined): "neutral" | "info" | "success" | "warning" | "danger" {
  if (tone === "info" || tone === "success" || tone === "warning" || tone === "danger") {
    return tone;
  }
  return "neutral";
}
