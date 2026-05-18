import { buildViewportStateScreenReadModels, effectiveHistoryFields, isMarkVSpecSourceType, latestHistoryBasicInfo, messagesForLocale, renderMarkVSpecHtml, resolveMarkVSpecEntityReference, stateScreenElementGroups, stateScreenElementsForModel, tableColumnSampleKeys } from "@markvspec/core";
import type { DisplayContentSpecRow, MarkVSpecParseResult, RendererMessages, StateScreenReadModel } from "@markvspec/core";

export type MarkVSpecDocumentViewport = "mobile" | "tablet" | "desktop" | string;

const desktopViewports = new Set(["desktop", "lg", "large", "wide"]);

export interface RenderStaticDesignDocumentOptions {
  messages?: RendererMessages;
}

export function viewportCanvasWidth(viewport: string): string {
  const normalized = viewport.toLowerCase();
  if (["mobile", "phone", "sm", "small"].includes(normalized) || normalized.includes("mobile") || normalized.includes("phone") || normalized.includes("sp")) {
    return "390px";
  }
  if (["tablet", "md", "medium"].includes(normalized) || normalized.includes("tablet") || normalized.includes("md")) {
    return "768px";
  }
  if (desktopViewports.has(normalized)) {
    return "960px";
  }
  return "760px";
}

export function viewportPrintScale(viewport: string): string {
  const width = Number.parseInt(viewportCanvasWidth(viewport), 10);
  if (!Number.isFinite(width) || width <= 0) {
    return "1";
  }
  return Math.min(1, 1016 / width).toFixed(4).replace(/0+$/u, "").replace(/\.$/u, "");
}

export function viewportPrintStyle(viewport: string | undefined): string {
  return viewport ? `--markvspec-viewport-width:${viewportCanvasWidth(viewport)};--markvspec-print-scale:${viewportPrintScale(viewport)}` : "";
}

export const printWireframeSelector = ".state-screen-section[data-viewport] .wireframe-section .mm-wireframe:not(.mm-wireframe-empty)";

export function baseWireframeViewportCss(options: { spaced?: boolean } = {}): string {
  if (options.spaced) {
    return ".state-screen-section[data-viewport] .wireframe-section .mm-wireframe:not(.mm-wireframe-empty) { max-width: none; min-width: var(--markvspec-viewport-width, 100%); width: var(--markvspec-viewport-width, 100%); }";
  }
  return ".state-screen-section[data-viewport] .wireframe-section .mm-wireframe:not(.mm-wireframe-empty){max-width:none;min-width:var(--markvspec-viewport-width, 100%);width:var(--markvspec-viewport-width, 100%)}";
}

export function wireframePrintSectionCss(options: { spaced?: boolean } = {}): string {
  const selector = ".wireframe-print-section";
  const body = "box-sizing: border-box; max-width: 100%; width: 100%";
  if (options.spaced) {
    return `${selector} { ${body}; }`;
  }
  return `${selector}{${body.replaceAll(": ", ":").replaceAll("; ", ";")}}`;
}

export function printWireframeViewportCss(options: { importantZoom?: boolean; includeMinWidth?: boolean; spaced?: boolean } = {}): string {
  const zoomImportant = options.importantZoom ? " !important" : "";
  const minWidth = options.includeMinWidth ? "min-width: 0 !important; " : "";
  if (options.spaced) {
    return `${printWireframeSelector} { max-width: none !important; ${minWidth}width: var(--markvspec-viewport-width, 100%) !important; zoom: var(--markvspec-print-scale, 1)${zoomImportant}; }`;
  }
  return `${printWireframeSelector}{max-width:none!important;${options.includeMinWidth ? "min-width:0!important;" : ""}width:var(--markvspec-viewport-width, 100%)!important;zoom:var(--markvspec-print-scale, 1)${options.importantZoom ? "!important" : ""}}`;
}

export function standardPrintPolicyCss(options: { spaced?: boolean } = {}): string {
  const rules = [
    [".toc-inline", "break-after: page; break-inside: avoid; page-break-after: always; page-break-inside: avoid"],
    [".history-section", "break-before: page; page-break-before: always"],
    [".wireframe-print-section, .action-detail, .note-block, .process-card", "break-inside: avoid; page-break-inside: avoid"],
    [".doc-section h2, .doc-section h3, .doc-section h4, .doc-section h5, .state-wireframe h3", "break-after: avoid; page-break-after: avoid"],
    [".spec-table tr", "break-inside: avoid; page-break-inside: avoid"]
  ];

  if (options.spaced) {
    return rules.map(([selector, body]) => `${selector} { ${body}; }`).join("\n        ");
  }

  return rules
    .map(([selector, body]) => `${selector}{${body.replaceAll(": ", ":").replaceAll("; ", ";")}}`)
    .join("");
}

export function printSpecTableChipCss(options: { spaced?: boolean } = {}): string {
  const rules = [
    [".spec-table col.spec-table-col-marker-id", "width: 20%"],
    [".spec-table col.spec-table-col-id", "width: 16%"],
    [".spec-table .mm-ref-chip, .spec-table .mm-chip, .spec-table .mm-detail-ref-id, .spec-table .mm-id", "box-sizing: border-box; max-width: 100%; min-width: 0; overflow-wrap: break-word; white-space: normal; word-break: normal"],
    [".spec-table .mm-ref-chip", "align-items: flex-start; flex-wrap: wrap"],
    [".spec-table .mm-ref-chip .mm-id", "flex: 0 0 auto; overflow-wrap: normal; white-space: nowrap; width: auto"],
    [".spec-table td > .mm-ref-chip, .spec-table td > .mm-chip", "display: flex; margin: 0 0 2pt; width: fit-content"]
  ];

  if (options.spaced) {
    return rules.map(([selector, body]) => `${selector} { ${body}; }`).join("\n        ");
  }

  return rules
    .map(([selector, body]) => `${selector}{${body.replaceAll(": ", ":").replaceAll("; ", ";")}}`)
    .join("");
}

export function printScrollbarSuppressCss(options: { spaced?: boolean } = {}): string {
  const selectors = [
    "html",
    "body",
    "main",
    ".content",
    ".preview",
    ".document",
    ".spec-table-wrap",
    ".wireframe-section",
    ".mermaid-render",
    ".mermaid-source",
    ".note-content",
    ".entity-notes pre",
    ".entity-overview pre"
  ];
  const scrollbarSelector = selectors.map((selector) => `${selector}::-webkit-scrollbar`).join(options.spaced ? ",\n        " : ",");
  const overflowBody = options.spaced
    ? "overflow: visible !important; scrollbar-width: none !important; -ms-overflow-style: none !important"
    : "overflow:visible!important;scrollbar-width:none!important;-ms-overflow-style:none!important";
  const scrollbarBody = options.spaced
    ? "display: none !important; height: 0 !important; width: 0 !important"
    : "display:none!important;height:0!important;width:0!important";

  if (options.spaced) {
    return `${selectors.join(",\n        ")} { ${overflowBody}; }\n        ${scrollbarSelector} { ${scrollbarBody}; }`;
  }

  return `${selectors.join(",")}{${overflowBody}}${scrollbarSelector}{${scrollbarBody}}`;
}

export function renderDesignDocumentSections(sections: readonly string[]): string {
  return `<article class="document">
    ${sections.filter((section) => section.trim().length > 0).join("\n    ")}
  </article>`;
}

export type TableCell = string | undefined | null | {
  html: string | undefined;
  rowspan?: number;
};

export function renderStaticDesignDocumentHtml(result: MarkVSpecParseResult, options: RenderStaticDesignDocumentOptions = {}): string {
  const messages = options.messages ?? messagesForLocale(result.screen.locale);

  return renderDesignDocumentSections([
    renderDocumentOverviewSection(result, messages),
    renderHistorySection(result, messages),
    renderStaticActionTransitionsSection(result, messages),
    renderStateViewsSection(result, messages)
  ]);
}

function renderDocumentOverviewSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const screen = result.screen;
  const heading = screen.type === "template" ? messages.template : screen.type === "partial" ? messages.partial : messages.screen;
  const latestHistory = latestHistoryBasicInfo(result.historyEntries);
  const facts = [
    [messages.id, screen.id ?? ""],
    [messages.route, screen.route ?? ""],
    [messages.version, latestHistory?.version ?? ""],
    [messages.date, latestHistory?.date ?? ""],
    [messages.author, latestHistory?.author ?? ""]
  ].filter(([, value]) => value.trim().length > 0);
  if (!screen.description && facts.length === 0) {
    return "";
  }

  const description = screen.description
    ? `<div class="screen-description">${renderMarkdownLines(screen.description.split(/\r?\n/u), result)}</div>`
    : "";
  const table = facts.length > 0
    ? renderTable([messages.field, messages.value], facts.map(([key, value]) => [escapeHtml(key), escapeHtml(value)]))
    : "";
  return `<section class="doc-section screen-spec-section"><h2 id="screen">${escapeHtml(heading)}</h2>${description}${table}</section>`;
}

function renderStateViewsSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const viewportSections = buildViewportStateScreenReadModels(result, result, undefined, {
    label: (key) => key === "default" ? messages.default : messages.viewport
  }).map((viewportModel) =>
    renderStateViewportSection(
      result,
      viewportModel.models,
      viewportModel.viewport,
      viewportModel.isDefault,
      messages
    )
  ).join("");
  return `<section class="doc-section state-views-section">
  <h2 id="state-views">${escapeHtml(messages.stateViews)}</h2>
  ${viewportSections}
</section>`;
}

function renderStaticActionTransitionsSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const rows = result.actions.flatMap((action) => action.transitions
    .filter((transition) => !isStaticTerminalTransitionTarget(transition.to))
    .map((transition) => [
      renderStaticStateLabel(transition.from),
      renderStaticStateLabel(transition.to),
      transition.result ? renderStaticResultLabel(transition.result) : "",
      renderStaticActionTransitionSource(result, action, transition.result)
    ]));
  if (rows.length === 0) {
    return "";
  }
  return `<section class="doc-section" id="state-transition-table"><h2>${escapeHtml(messages.actionTransitions)}</h2>${renderTable([messages.from, messages.to, messages.case, messages.triggeredBy], rows)}</section>`;
}

function renderStaticActionTransitionSource(
  result: MarkVSpecParseResult,
  action: MarkVSpecParseResult["actions"][number],
  resultName: string | undefined
): string {
  const actionReference = renderStaticActionReference(result, action);
  const chain = staticTransitionOriginChain(result, action, resultName);
  if (chain.length === 0) {
    return actionReference;
  }
  return `${actionReference}<div class="mm-ref-chip-note">${chain.map(escapeHtml).join(" -&gt; ")}</div>`;
}

function staticTransitionOriginChain(
  result: MarkVSpecParseResult,
  action: MarkVSpecParseResult["actions"][number],
  resultName: string | undefined
): string[] {
  const trigger = action.triggeredBy;
  const responseTrigger = trigger ? /^(A-[\p{L}\p{N}-]+)\.(P[A-Za-z0-9_-]+)\.response$/u.exec(trigger) : undefined;
  if (!responseTrigger) {
    return [];
  }
  const sourceAction = result.actions.find((candidate) => candidate.id === responseTrigger[1]);
  if (!isStaticDocumentLifecycleTrigger(sourceAction?.triggeredBy)) {
    return [];
  }
  return [
    sourceAction.triggeredBy,
    sourceAction.id,
    trigger,
    staticTransitionCaseReference(action, resultName)
  ].filter((part): part is string => Boolean(part));
}

function staticTransitionCaseReference(
  action: MarkVSpecParseResult["actions"][number],
  resultName: string | undefined
): string {
  if (!resultName) {
    return action.id;
  }
  for (const step of action.processSteps) {
    if (step.outcomes.some((outcome) => outcome.result === resultName)) {
      return `${action.id}.${step.marker ?? step.name}.${resultName}`;
    }
  }
  return `${action.id}.${resultName}`;
}

function renderStaticActionReference(
  result: MarkVSpecParseResult,
  action: MarkVSpecParseResult["actions"][number]
): string {
  const reference = resolveMarkVSpecEntityReference(result, action.id);
  return reference ? renderStaticEntityReference(reference) : code(action.id);
}

function renderStaticStateLabel(value: string): string {
  return `<code class="mm-doc-label mm-doc-label-state">${escapeHtml(value)}</code>`;
}

function renderStaticResultLabel(value: string): string {
  return `<code class="mm-doc-label mm-doc-label-result">${escapeHtml(value)}</code>`;
}

function isStaticDocumentLifecycleTrigger(trigger: string | undefined): trigger is string {
  return trigger === "page.load" || trigger === "partial.render" || trigger === "screen.load";
}

function isStaticTerminalTransitionTarget(target: string): boolean {
  return target.startsWith("SCR-") || target.startsWith("/") || /^https?:\/\//u.test(target);
}

function renderStateViewportSection(
  result: MarkVSpecParseResult,
  models: StateScreenReadModel[],
  viewport: string | undefined,
  isDefault: boolean,
  messages: RendererMessages
): string {
  const viewportAttr = viewport ? ` data-viewport="${escapeHtml(viewport)}"` : "";
  const defaultBadge = isDefault ? ` <span class="state-badge">${escapeHtml(messages.default)}</span>` : "";
  const viewportLabel = viewport ? `${messages.viewport} ${viewport}` : `${messages.default} ${messages.view}`;
  return `<section class="state-viewport-section"${viewportAttr}>
  <h3>${escapeHtml(viewportLabel)}${defaultBadge}</h3>
  ${models.map((model, index) => renderStateScreenSection(result, model, messages, index === 0)).join("")}
</section>`;
}

function renderStateScreenSection(
  result: MarkVSpecParseResult,
  model: StateScreenReadModel,
  messages: RendererMessages,
  includeStyles: boolean
): string {
  const viewportAttrs = model.viewport ? ` data-viewport="${escapeHtml(model.viewport)}" style="${viewportPrintStyle(model.viewport)}"` : "";
  const stateAttrs = model.stateName ? ` data-state="${escapeHtml(model.stateName)}"` : "";
  const stateViewTitleAttr = ` data-state-view-title="${escapeHtml(model.stateViewTitle)}"`;
  const initialBadge = model.initial ? ` ${escapeHtml(messages.initial)}` : "";
  const scenarioBadge = model.stateName && model.scenario ? ` <span class="state-badge">${escapeHtml(model.title)}</span>` : "";
  const stateHeading = model.stateName
    ? `${escapeHtml(messages.state)}: ${escapeHtml(model.stateName)}${initialBadge}${scenarioBadge}`
    : `${escapeHtml(messages.default)} ${escapeHtml(messages.view)}`;
  const wireframe = renderMarkVSpecHtml(result, {
    includeStyles,
    markerVisibility: { layout: true, element: true, action: true },
    messages,
    modelValues: model.modelValues,
    sampleOverrides: sampleOverridesFromScenarioSamples(model.scenarioSamples),
    state: model.stateName,
    viewport: model.viewport,
    viewValues: model.viewValues
  });

  return `<section class="doc-section state-screen-section"${stateViewTitleAttr}${stateAttrs}${viewportAttrs}>
  <section class="wireframe-print-section">
    <h4 class="state-screen-heading">${stateHeading}</h4>
    <h5 class="state-screen-subheading">${escapeHtml(messages.wireframe)}</h5>
    <section class="wireframe-section">${wireframe}</section>
    ${renderScenarioSamplesBox(result, model, messages)}
    ${renderDisplayContentSpecBox(result, model, messages)}
  </section>
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

function renderScenarioSamplesBox(
  result: MarkVSpecParseResult,
  model: StateScreenReadModel,
  messages: RendererMessages
): string {
  if (model.scenarioSamples.length === 0) {
    return "";
  }

  const elementById = new Map(result.elements.map((element) => [element.id, element]));
  const rows = model.scenarioSamples.map((sample) => {
    return [renderScenarioSampleElementRef(result, sample.elementId), renderScenarioSampleSummary(sample, messages)];
  });
  const rowBlocks = model.scenarioSamples
    .map((sample) => renderScenarioSampleRowsBlock(result, sample, elementById.get(sample.elementId), messages))
    .filter(Boolean)
    .join("");
  return `<aside class="scenario-samples-box">
    <h6 class="state-screen-detail-heading">${escapeHtml(messages.scenarioSamples)}</h6>
    ${renderTable([messages.elements, messages.sample], rows)}
    ${rowBlocks}
  </aside>`;
}

function renderScenarioSampleElementRef(result: MarkVSpecParseResult, elementId: string): string {
  const reference = resolveMarkVSpecEntityReference(result, elementId);
  return reference ? renderStaticEntityReference(reference) : escapeHtml(elementId);
}

function renderScenarioSampleSummary(
  sample: StateScreenReadModel["scenarioSamples"][number],
  messages: RendererMessages
): string {
  if (sample.rows) {
    if (sample.rows.explicitEmpty && sample.rows.rows.length === 0) {
      return "<code>rows: []</code>";
    }
    const count = sample.rows.rows.length;
    return `<code>rows: ${count} ${escapeHtml(messages.scenarioSampleRowsUnit)}</code>`;
  }
  return escapeHtml(sample.value ?? "");
}

function renderScenarioSampleRowsBlock(
  result: MarkVSpecParseResult,
  sample: StateScreenReadModel["scenarioSamples"][number],
  element: MarkVSpecParseResult["elements"][number] | undefined,
  messages: RendererMessages
): string {
  if (!sample.rows || sample.rows.rows.length === 0) {
    return "";
  }
  const rowsTable = renderScenarioSampleRowsTable(sample.rows.rows, element);
  if (!rowsTable) {
    return "";
  }
  return `<section class="scenario-sample-rows-block">
    <h6 class="scenario-sample-rows-heading">${escapeHtml(messages.sample)} ${escapeHtml(messages.rows)}: ${renderScenarioSampleElementRef(result, sample.elementId)}</h6>
    ${rowsTable}
  </section>`;
}

function renderScenarioSampleRowsTable(
  rows: NonNullable<StateScreenReadModel["scenarioSamples"][number]["rows"]>["rows"],
  element: MarkVSpecParseResult["elements"][number] | undefined
): string {
  const columns = scenarioSampleColumns(rows, element);
  if (columns.length === 0) {
    return "";
  }
  const header = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(scenarioSampleCellValue(row.fields, column.keys))}</td>`).join("")}</tr>`)
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

function renderDisplayContentSpecBox(
  result: MarkVSpecParseResult,
  model: StateScreenReadModel,
  messages: RendererMessages
): string {
  const elements = stateScreenElementsForModel(result, model);
  const { displayContentRows } = stateScreenElementGroups(elements, result, model.stateName);
  if (displayContentRows.length === 0) {
    return "";
  }

  return `<div class="element-detail-group">
    <h6 class="state-screen-detail-heading">${escapeHtml(messages.displayContentSpec)}</h6>
    ${renderDisplayContentSpecTable(result, displayContentRows, messages)}
  </div>`;
}

function renderDisplayContentSpecTable(
  result: MarkVSpecParseResult,
  rows: DisplayContentSpecRow[],
  messages: RendererMessages
): string {
  const spans = consecutiveRowspans(rows, (row) => row.element.id);
  const markerIdHeader = `${messages.marker}/${messages.id}`;
  return renderTableWithCells(
    [markerIdHeader, messages.displayLocation, messages.displayValue, messages.format, messages.displaySource, messages.displayCondition, messages.enabledWhen],
    rows.map((row, index) => [
      ...rowspanPrefixCells(spans[index] ?? 0, [
        renderScenarioSampleElementRef(result, row.element.id)
      ]),
      escapeHtml(row.location),
      renderDisplayContentValue(row.element, row.value, row.contentSections),
      row.format ? escapeHtml(row.format) : "",
      renderSourceSummary(row.source),
      renderDisplayCondition(row.element, messages),
      renderEnabledCondition(row.element, messages)
    ])
  );
}

function renderDisplayContentValue(
  element: MarkVSpecParseResult["elements"][number],
  value: string,
  sections?: DisplayContentSpecRow["contentSections"]
): string {
  if (sections && sections.length > 0) {
    return renderSpecSections(sections.map((section) => ({
      title: section.title,
      rows: section.rows.map((row) => renderExpressionTokens(row))
    })));
  }
  if (hasOpaqueExpression(value)) {
    return renderExpressionTokens(value);
  }
  const dataSample = element.properties["source"] === "data" ? rawStringProperty(element.properties["sample"]) : "";
  return element.type === "Badge" && (value === dataSample || value === rawStringProperty(element.properties["text"]))
    ? renderSemanticChip(value, rawStringProperty(element.properties["tone"]))
    : escapeHtml(value);
}

function renderSourceSummary(value: string | true | undefined): string {
  const source = rawStringProperty(value);
  if (!source) {
    return "";
  }
  if (isMarkVSpecSourceType(source)) {
    return `<span class="mm-chip mm-source-chip mm-source-chip-${escapeHtml(source)}">${escapeHtml(source)}</span>`;
  }
  return hasOpaqueExpression(source) ? renderExpressionTokens(source) : code(source);
}

function renderDisplayCondition(
  element: MarkVSpecParseResult["elements"][number],
  messages: RendererMessages
): string {
  const rows = [
    ...element.visibleWhen.map((condition) => `${messages.conditionVisibleShort}: ${renderCondition(condition)}`),
    ...element.hiddenWhen.map((condition) => `${messages.conditionHiddenShort}: ${renderCondition(condition)}`)
  ];
  return rows.length > 0 ? renderSpecSections([{ title: messages.condition, rows }]) : renderDefaultAlways(messages);
}

function renderEnabledCondition(
  element: MarkVSpecParseResult["elements"][number],
  messages: RendererMessages
): string {
  if (element.disabledWhen.length === 0) {
    return renderDefaultAlways(messages);
  }
  return renderSpecSections([{
    title: messages.conditionEnabledShort,
    rows: element.disabledWhen.map((condition) => `${messages.conditionNot} ${renderCondition(condition)}`)
  }]);
}

function renderDefaultAlways(messages: RendererMessages): string {
  return `<span class="spec-default-always">${escapeHtml(messages.always)}</span>`;
}

function renderSpecSections(sections: Array<{ title: string; rows: string[] }>): string {
  const visibleSections = sections.filter((section) => section.rows.length > 0);
  if (visibleSections.length === 0) {
    return "";
  }
  return visibleSections.map((section) => (
    `<div class="spec-section"><strong>${escapeHtml(section.title)}</strong><ul class="spec-list">${section.rows.map((row) => `<li>${row}</li>`).join("")}</ul></div>`
  )).join("");
}

function renderExpressionTokens(source: string): string {
  return source.split(/(\$\{[^}]+\})/gu).map((part) => isOpaqueExpressionSource(part) ? `<span class="mm-inline-token">${escapeHtml(part)}</span>` : escapeHtml(part)).join("");
}

function renderCondition(condition: string): string {
  return renderExpressionTokens(condition);
}

function isOpaqueExpressionSource(value: string): boolean {
  return /^\$\{[^}]+\}$/u.test(value.trim());
}

function hasOpaqueExpression(value: string): boolean {
  return /\$\{[^}]+\}/u.test(value);
}

function renderSemanticChip(value: string, tone: string | undefined): string {
  return `<span class="mm-chip mm-chip-tone-${semanticChipTone(tone)}">${escapeHtml(value)}</span>`;
}

function semanticChipTone(tone: string | undefined): "neutral" | "info" | "success" | "warning" | "danger" {
  if (tone === "info" || tone === "success" || tone === "warning" || tone === "danger") {
    return tone;
  }
  return "neutral";
}

function renderHistorySection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  if (result.historyEntries.length === 0) {
    return "";
  }

  const fields = effectiveHistoryFields(result.historyFields);
  const headers = ["Version", ...fields.map((field) => field.label), "Changes"];
  const rows = result.historyEntries.map((entry) => [
    escapeHtml(entry.version),
    ...fields.map((field) => escapeHtml(entry.fields[field.key] ?? "")),
    renderMarkdownLines(entry.bodyLines, result)
  ]);
  return `<section class="doc-section history-section"><h2>${escapeHtml(messages.history)}</h2>${renderTable(headers, rows)}</section>`;
}

export function renderTable(headers: string[], rows: Array<Array<string | undefined>>, emptyLabel = "None."): string {
  if (rows.length === 0) {
    return `<p class="spec-empty">${escapeHtml(emptyLabel)}</p>`;
  }

  return `<div class="spec-table-wrap"><table class="spec-table">${renderSpecTableColgroup(headers)}<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${renderTableCellHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

export function renderTableWithCells(headers: string[], rows: TableCell[][], emptyLabel = "None."): string {
  if (rows.length === 0) {
    return `<p class="spec-empty">${escapeHtml(emptyLabel)}</p>`;
  }

  return `<div class="spec-table-wrap"><table class="spec-table">${renderSpecTableColgroup(headers)}<thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map(renderTableCell).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function renderSpecTableColgroup(headers: readonly string[]): string {
  const kinds = headers.map(specTableColumnKind);
  if (!kinds.some((kind) => kind !== "default")) {
    return "";
  }
  return `<colgroup>${kinds.map((kind) => `<col class="spec-table-col spec-table-col-${kind}">`).join("")}</colgroup>`;
}

function specTableColumnKind(header: string): "default" | "id" | "marker-id" {
  const normalized = header.trim().toLowerCase().replace(/\s+/gu, "");
  if (normalized === "marker/id" || normalized === "番号/id") {
    return "marker-id";
  }
  if (normalized === "id") {
    return "id";
  }
  return "default";
}

function renderTableCell(cell: TableCell): string {
  if (cell === null) {
    return "";
  }
  if (typeof cell === "object") {
    const rowspan = cell.rowspan && cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : "";
    return `<td${rowspan}>${renderTableCellHtml(cell.html)}</td>`;
  }
  return `<td>${renderTableCellHtml(cell)}</td>`;
}

function renderTableCellHtml(cell: string | undefined): string {
  return cell === undefined || cell.trim().length === 0 ? "-" : cell;
}

export function consecutiveRowspans<T>(rows: T[], keyFor: (row: T, index: number) => string): number[] {
  const spans = new Array<number>(rows.length).fill(0);
  let index = 0;
  while (index < rows.length) {
    const key = keyFor(rows[index], index);
    let end = index + 1;
    while (end < rows.length && keyFor(rows[end], end) === key) {
      end += 1;
    }
    spans[index] = end - index;
    index = end;
  }
  return spans;
}

export function rowspanPrefixCells(rowspan: number, htmlCells: string[]): TableCell[] {
  if (rowspan === 0) {
    return htmlCells.map(() => null);
  }
  return htmlCells.map((html) => ({ html, rowspan }));
}

export function code(value: string | undefined): string {
  return value ? `<code>${escapeHtml(value)}</code>` : "";
}

export function stringProperty(value: string | true | undefined): string {
  return typeof value === "string" ? escapeHtml(value) : "";
}

export function rawStringProperty(value: string | true | undefined): string {
  return typeof value === "string" ? value : "";
}

export function text(value: string | undefined): string {
  return value ? escapeHtml(value) : "";
}

function renderMarkdownLines(lines: string[], result: MarkVSpecParseResult): string {
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let codeLines: string[] | undefined;

  const flushParagraph = (): void => {
    if (paragraph.length === 0) {
      return;
    }
    blocks.push(`<p>${renderInlineMarkdown(paragraph.join(" "), result)}</p>`);
    paragraph = [];
  };
  const flushList = (): void => {
    if (listItems.length === 0) {
      return;
    }
    blocks.push(`<ul class="spec-list">${listItems.map((item) => `<li>${renderInlineMarkdown(item, result)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^```/u.test(trimmed)) {
      flushParagraph();
      flushList();
      if (codeLines) {
        blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = undefined;
      } else {
        codeLines = [];
      }
      continue;
    }
    if (codeLines) {
      codeLines.push(line);
      continue;
    }
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
    if (bullet) {
      flushParagraph();
      listItems.push(bullet[1]);
      continue;
    }
    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  if (codeLines) {
    blocks.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  }
  return blocks.join("");
}

function renderInlineMarkdown(value: string, result: MarkVSpecParseResult): string {
  const { tokenized, codeSpans } = tokenizeCodeSpans(value);
  let rendered = escapeHtml(tokenized).replace(/#\{((?:SCR|ERR|L|E|F|A|V|R)-[\p{L}\p{N}-]+)\}/gu, (match, id: string) => {
    const reference = resolveMarkVSpecEntityReference(result, id);
    return reference ? renderStaticEntityReference(reference) : match;
  });
  for (let index = 0; index < codeSpans.length; index += 1) {
    rendered = rendered.replace(new RegExp(`\\u0000CODE${index}\\u0000`, "gu"), codeSpans[index]);
  }
  return rendered;
}

function tokenizeCodeSpans(value: string): { tokenized: string; codeSpans: string[] } {
  const codeSpans: string[] = [];
  let tokenized = "";
  let cursor = 0;
  let index = 0;

  while (index < value.length) {
    if (value[index] !== "`") {
      index += 1;
      continue;
    }

    const openerStart = index;
    const delimiterLength = countBacktickRun(value, openerStart);
    const closerStart = findMatchingBacktickRun(value, openerStart + delimiterLength, delimiterLength);
    if (closerStart === -1) {
      index += delimiterLength;
      continue;
    }

    tokenized += value.slice(cursor, openerStart);
    const token = `\u0000CODE${codeSpans.length}\u0000`;
    codeSpans.push(`<span class="mm-inline-token">${escapeHtml(value.slice(openerStart + delimiterLength, closerStart))}</span>`);
    tokenized += token;
    index = closerStart + delimiterLength;
    cursor = index;
  }

  tokenized += value.slice(cursor);
  return { tokenized, codeSpans };
}

function countBacktickRun(value: string, start: number): number {
  let index = start;
  while (index < value.length && value[index] === "`") {
    index += 1;
  }
  return index - start;
}

function findMatchingBacktickRun(value: string, start: number, delimiterLength: number): number {
  let index = start;
  while (index < value.length) {
    if (value[index] !== "`") {
      index += 1;
      continue;
    }
    const runLength = countBacktickRun(value, index);
    if (runLength === delimiterLength) {
      return index;
    }
    index += runLength;
  }
  return -1;
}

function renderStaticEntityReference(reference: NonNullable<ReturnType<typeof resolveMarkVSpecEntityReference>>): string {
  const category = reference.kind === "business-rule" || reference.kind === "validation"
    ? "message"
    : reference.kind;
  const marker = reference.marker ?? reference.id;
  const label = reference.label && reference.label !== reference.id ? ` ${escapeHtml(reference.label)}` : "";
  const href = staticEntityReferenceHref(reference);
  return `<a class="mm-ref-chip mm-ref-chip-${escapeHtml(category)}" href="${escapeHtml(href)}" data-mm-ref-id="${escapeHtml(reference.id)}"><code class="mm-id mm-marker mm-marker-${escapeHtml(category)}" data-mm-marker-category="${escapeHtml(category)}">${escapeHtml(marker)}</code>${label}</a>`;
}

function staticEntityReferenceHref(reference: NonNullable<ReturnType<typeof resolveMarkVSpecEntityReference>>): string {
  if (reference.kind === "screen") {
    return "#screen";
  }
  return "#state-views";
}

export function escapeHtml(value: string): string {
  return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");
}
