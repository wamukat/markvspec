import { buildViewportStateScreenReadModels, layoutConditionValues, layoutDisplaySettings, renderMarkVSpecHtml, resolveMarkVSpecEntityReference, sampleRowsAnchorId, scenarioRouteValues, stateScreenControlledPanelPlacementsForModel, stateScreenLayoutsForModel, stateScreenUnplacedLayoutIdsForModel, tableColumnSampleKeys } from "@markvspec/core";
import type { ControlledPanelPlacement, MarkVSpecParseResult, RendererMessages, StateScreenReadModel } from "@markvspec/core";
import {
  renderDisplayContentSpecBox,
  renderInputFormSpecBox,
  type StaticElementSpecRenderingSupport
} from "./static-element-spec.js";

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
  const rows = layouts.map((layout) => [
    renderStaticLayoutReference(result, layout, unplacedLayoutIds.has(layout.id), controlledPlacementsByLayoutId.get(layout.id) ?? [], messages, support),
    support.escapeHtml(layout.kind || ""),
    renderStaticLayoutSettingItems(result, layout, messages, support),
    renderStaticLayoutConditions(layout, messages, Boolean(controlledPlacementsByLayoutId.get(layout.id)?.length), support),
    renderStaticLayoutNotes(result, layout, support)
  ]);

  return `<section class="layout-spec-fragment">
    <h5 class="state-screen-subheading">${support.escapeHtml(messages.layouts)}</h5>
    ${support.renderTable([`${messages.marker}/${messages.id}`, messages.kind, messages.settingItems, messages.condition, messages.notes], rows, messages.none)}
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
  const unplacedLabel = unplaced ? `<span class="mm-chip mm-unplaced-badge">${renderPreviewIcon("eye-off")}${support.escapeHtml(messages.notPlacedInCurrentLayout)}</span>` : "";
  return [ref + controlledVia, unplacedLabel].filter(Boolean).join(" ");
}

function renderStaticControlledPanelViaReference(reference: NonNullable<ReturnType<typeof resolveMarkVSpecEntityReference>>, support: StaticStateViewRenderingSupport): string {
  if (reference.kind !== "element") {
    return renderStaticEntityReference(reference, support);
  }
  const marker = reference.marker ?? reference.id;
  const href = staticEntityReferenceHref(reference);
  return `<a class="mm-ref-chip mm-ref-chip-element" href="${support.escapeHtml(href)}" data-mm-ref-id="${support.escapeHtml(reference.id)}"><code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">${support.escapeHtml(marker)}</code> <span class="mm-detail-ref-id">${support.escapeHtml(reference.id)}</span></a>`;
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

type PreviewIconName = "circle-x" | "cog" | "database" | "eye-off" | "languages" | "merge" | "panels-top-left" | "refresh-cw" | "route" | "satellite-dish" | "split" | "square-check-big" | "table" | "unplug" | "waypoints";

function renderPreviewIcon(name: PreviewIconName): string {
  const paths: Record<PreviewIconName, string> = {
    "circle-x": '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    cog: '<path d="M11 10.27 7 3.34"/><path d="m11 13.73-4 6.93"/><path d="M12 22v-2"/><path d="M12 2v2"/><path d="M14 12h8"/><path d="m17 20.66-1-1.73"/><path d="m17 3.34-1 1.73"/><path d="M2 12h2"/><path d="m20.66 17-1.73-1"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m3.34 7 1.73 1"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="8"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>',
    "eye-off": '<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61C3.88 8.46 2 12 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>',
    languages: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
    merge: '<path d="m8 6 4-4 4 4"/><path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22"/><path d="m20 22-5-5"/>',
    "panels-top-left": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
    "refresh-cw": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    route: '<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M6 16V8a3 3 0 0 1 3-3h6"/><path d="M18 8v8a3 3 0 0 1-3 3H9"/>',
    "satellite-dish": '<path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/>',
    split: '<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/>',
    "square-check-big": '<path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344"/><path d="m9 11 3 3L22 4"/>',
    table: '<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
    unplug: '<path d="m19 5 3-3"/><path d="m2 22 3-3"/><path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"/>',
    waypoints: '<path d="m10.586 5.414-5.172 5.172"/><path d="m18.586 13.414-5.172 5.172"/><path d="M6 12h12"/><circle cx="12" cy="20" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="20" cy="12" r="2"/><circle cx="4" cy="12" r="2"/>'
  };
  return `<svg class="mm-icon mm-icon-${name}" aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
}

function staticElementSpecRenderingSupport(support: StaticStateViewRenderingSupport): StaticElementSpecRenderingSupport {
  return {
    code: support.code,
    consecutiveRowspans: support.consecutiveRowspans,
    escapeHtml: support.escapeHtml,
    renderCondition: (condition) => renderCondition(condition, support),
    renderElementConditionSummary: (element, messages) => renderElementConditionSummary(element, messages, support),
    renderExpressionTokens: (source) => renderExpressionTokens(source, support),
    renderPreviewIcon,
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

function renderStaticEntityReference(reference: NonNullable<ReturnType<typeof resolveMarkVSpecEntityReference>>, support: StaticStateViewRenderingSupport): string {
  const category = reference.kind === "business-rule" || reference.kind === "validation"
    ? "message"
    : reference.kind;
  const marker = reference.marker ?? reference.id;
  const label = reference.label && reference.label !== reference.id ? ` ${support.escapeHtml(reference.label)}` : "";
  const href = staticEntityReferenceHref(reference);
  return `<a class="mm-ref-chip mm-ref-chip-${support.escapeHtml(category)}" href="${support.escapeHtml(href)}" data-mm-ref-id="${support.escapeHtml(reference.id)}"><code class="mm-id mm-marker mm-marker-${support.escapeHtml(category)}" data-mm-marker-category="${support.escapeHtml(category)}">${support.escapeHtml(marker)}</code>${label}</a>`;
}

function staticEntityReferenceHref(reference: NonNullable<ReturnType<typeof resolveMarkVSpecEntityReference>>): string {
  if (reference.kind === "screen") {
    return "#screen";
  }
  return "#state-views";
}
