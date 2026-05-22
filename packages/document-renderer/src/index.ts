import { effectiveHistoryFields, latestHistoryBasicInfo, messagesForLocale, propertyString as corePropertyString, resolveMarkVSpecEntityReference } from "@markvspec/core/browser";
import type { MarkVSpecParseResult, RendererMessages } from "@markvspec/core/browser";
import {
  renderStateViewsSection as renderStaticStateViewsSection,
  type StaticStateViewRenderingSupport
} from "./static-state-view-renderer.js";
import {
  renderStaticEntityReference,
  renderStaticElementDetailReference,
  renderStaticPreviewIcon
} from "./static-entity-reference-presenter.js";

export type MarkVSpecDocumentViewport = "mobile" | "tablet" | "desktop" | string;

const desktopViewports = new Set(["desktop", "lg", "large", "wide"]);

export interface RenderStaticDesignDocumentOptions {
  messages?: RendererMessages;
  documentResult?: MarkVSpecParseResult;
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

interface StaticDocumentSection {
  id: string;
  label: string;
  html: string;
}

export type TableCell = string | undefined | null | {
  html: string | undefined;
  rowspan?: number;
};

const staticStateViewRenderingSupport: StaticStateViewRenderingSupport = {
  code,
  consecutiveRowspans,
  escapeHtml,
  renderMarkdownLines,
  renderStaticEntityNotes,
  renderStaticEntityOverview,
  renderTable,
  renderTableWithCells,
  rowspanPrefixCells,
  viewportPrintStyle
};
const staticEntityReferencePresenterSupport = { escapeHtml };

export function renderStaticDesignDocumentHtml(result: MarkVSpecParseResult, options: RenderStaticDesignDocumentOptions = {}): string {
  const documentResult = options.documentResult ?? result;
  const messages = options.messages ?? messagesForLocale(documentResult.screen.locale);
  const sections: StaticDocumentSection[] = [
    { id: "screen", label: documentOverviewLabel(documentResult, messages), html: renderDocumentOverviewSection(documentResult, messages) },
    { id: "history", label: messages.history, html: renderHistorySection(documentResult, messages) },
    { id: "states", label: messages.states, html: renderStaticStatesSection(documentResult, messages) },
    { id: "state-flow", label: messages.stateFlow, html: renderStaticStateFlowSection(documentResult, messages) },
    { id: "view-contexts", label: messages.viewContexts, html: renderStaticViewContextsSection(documentResult, messages) },
    { id: "view-context-samples", label: messages.viewContextSamples, html: renderStaticViewContextSamplesSection(documentResult, messages) },
    { id: "state-views", label: messages.stateViews, html: renderStaticStateViewsSection(result, messages, staticStateViewRenderingSupport) },
    { id: "action-details", label: messages.actionDetails, html: renderStaticActionDetailsSection(documentResult, messages) },
    { id: "form-groups", label: messages.formGroups, html: renderStaticFormGroupsSection(documentResult, messages) },
    { id: "validations", label: messages.validation, html: renderStaticValidationsSection(documentResult, messages) },
    { id: "business-rules", label: messages.businessRules, html: renderStaticBusinessRulesSection(documentResult, messages) },
    { id: "error-codes", label: messages.errorCodes, html: renderStaticErrorCodesSection(documentResult, messages) },
    { id: "notes", label: messages.notes, html: renderStaticNotesSection(documentResult, messages) },
    { id: "state-transition-table", label: messages.actionTransitions, html: renderStaticActionTransitionsSection(documentResult, messages) }
  ];
  const screenSections = sections.slice(0, 2);
  const detailSections = sections.slice(2);

  return renderDesignDocumentSections([
    ...screenSections.map((section) => section.html),
    renderStaticTableOfContents(sections, messages),
    ...detailSections.map((section) => section.html)
  ]);
}

function documentOverviewLabel(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const type = result.screen.type;
  return type === "template" ? messages.template : type === "partial" ? messages.partial : messages.screen;
}

function renderStaticTableOfContents(sections: readonly StaticDocumentSection[], messages: RendererMessages): string {
  const items = sections
    .filter((section) => section.html.trim().length > 0)
    .map((section) => `<li><a href="#${escapeHtml(section.id)}">${escapeHtml(section.label)}</a></li>`);
  if (items.length === 0) {
    return "";
  }
  return `<nav class="toc-inline" aria-label="${escapeHtml(messages.contents)}">
      <div class="toc-title">${escapeHtml(messages.contents)}</div>
      <ol class="toc-list">${items.join("")}</ol>
    </nav>`;
}

function renderDocumentOverviewSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const screen = result.screen;
  const heading = documentOverviewLabel(result, messages);
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

function renderStaticEntityOverview(result: MarkVSpecParseResult, lines: readonly string[]): string {
  return lines.length > 0 ? `<div class="entity-overview">${renderMarkdownLines([...lines], result)}</div>` : "";
}

function renderStaticEntityNotes(result: MarkVSpecParseResult, lines: readonly string[]): string {
  return lines.length > 0 ? `<div class="entity-notes">${renderMarkdownLines([...lines], result)}</div>` : "";
}

function renderSectionProse(result: MarkVSpecParseResult, kind: string): { overview: string; notes: string } {
  const sectionProse = result.sectionProse.filter((candidate) => candidate.kind === kind);
  return {
    overview: renderStaticEntityOverview(result, sectionProse.flatMap((candidate) => candidate.overview)),
    notes: renderStaticEntityNotes(result, sectionProse.flatMap((candidate) => candidate.notes))
  };
}

function renderStaticStatesSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const prose = renderSectionProse(result, "States");
  if (result.states.length === 0 && !prose.overview && !prose.notes) {
    return "";
  }
  const table = result.states.length > 0
    ? renderTable(
      [messages.state, messages.initial, messages.description],
      result.states.map((state) => [
        renderStaticStateLabel(state.name),
        state.initial ? escapeHtml(messages.requiredYes) : "-",
        escapeHtml(state.message ?? "")
      ]),
      messages.none
    )
    : `<p class="spec-empty">${escapeHtml(messages.none)}</p>`;
  return `<section class="doc-section states-section"><h2 id="states">${escapeHtml(messages.states)}</h2>${prose.overview}${table}${prose.notes}</section>`;
}

function renderStaticFormGroupsSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const prose = renderSectionProse(result, "FormGroups");
  if (result.formGroups.length === 0 && !prose.overview && !prose.notes) {
    return "";
  }
  const showOverview = result.formGroups.some((group) => (group.overview?.length ?? 0) > 0);
  const showNotes = result.formGroups.some((group) => (group.notes?.length ?? 0) > 0);
  const table = result.formGroups.length > 0
    ? renderTable(
      [
        `${messages.marker}/${messages.id}`,
        ...(showOverview ? [messages.overview] : []),
        messages.fields,
        messages.submit,
        messages.properties,
        ...(showNotes ? [messages.notes] : [])
      ],
      result.formGroups.map((group) => [
        renderStaticEntityReferenceById(result, group.id),
        ...(showOverview ? [renderStaticEntityOverview(result, group.overview ?? [])] : []),
        renderStaticDetailReferenceList(result, group.fields.map((field) => field.elementId)),
        group.submit ? renderStaticEntityReferenceById(result, group.submit.actionId) : "",
        renderStaticPropertiesAndBullets(result, group.properties, group.bullets),
        ...(showNotes ? [renderStaticEntityNotes(result, group.notes ?? [])] : [])
      ]),
      messages.none
    )
    : `<p class="spec-empty">${escapeHtml(messages.none)}</p>`;
  return `<section class="doc-section form-groups-section"><h2 id="form-groups">${escapeHtml(messages.formGroups)}</h2>${prose.overview}${table}${prose.notes}</section>`;
}

function renderStaticValidationsSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const prose = renderSectionProse(result, "Validations");
  if (result.validations.length === 0 && !prose.overview && !prose.notes) {
    return "";
  }
  const showOverview = result.validations.some((validation) => (validation.overview?.length ?? 0) > 0);
  const showNotes = result.validations.some((validation) => (validation.notes?.length ?? 0) > 0);
  const table = result.validations.length > 0
    ? renderTable(
      [
        `${messages.marker}/${messages.id}`,
        ...(showOverview ? [messages.overview] : []),
        messages.rules,
        messages.properties,
        ...(showNotes ? [messages.notes] : [])
      ],
      result.validations.map((validation) => [
        renderStaticEntityReferenceById(result, validation.id),
        ...(showOverview ? [renderStaticEntityOverview(result, validation.overview ?? [])] : []),
        renderStaticValidationRules(result, validation.rules),
        renderStaticPropertiesAndBullets(result, validation.properties, validation.bullets),
        ...(showNotes ? [renderStaticEntityNotes(result, validation.notes ?? [])] : [])
      ]),
      messages.none
    )
    : `<p class="spec-empty">${escapeHtml(messages.none)}</p>`;
  return `<section class="doc-section validation-section"><h2 id="validations">${escapeHtml(messages.validation)}</h2>${prose.overview}${table}${prose.notes}</section>`;
}

function renderStaticBusinessRulesSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const prose = renderSectionProse(result, "BusinessRules");
  if (result.rules.length === 0 && !prose.overview && !prose.notes) {
    return "";
  }
  const showOverview = result.rules.some((rule) => (rule.overview?.length ?? 0) > 0);
  const showNotes = result.rules.some((rule) => (rule.notes?.length ?? 0) > 0);
  const table = result.rules.length > 0
    ? renderTable(
      [
        `${messages.marker}/${messages.id}`,
        ...(showOverview ? [messages.overview] : []),
        messages.rules,
        messages.properties,
        ...(showNotes ? [messages.notes] : [])
      ],
      result.rules.map((rule) => [
        renderStaticEntityReferenceById(result, rule.id),
        ...(showOverview ? [renderStaticEntityOverview(result, rule.overview ?? [])] : []),
        renderStaticRuleBody(result, rule),
        renderStaticProperties(rule.properties),
        ...(showNotes ? [renderStaticEntityNotes(result, rule.notes ?? [])] : [])
      ]),
      messages.none
    )
    : `<p class="spec-empty">${escapeHtml(messages.none)}</p>`;
  return `<section class="doc-section business-rules-section"><h2 id="business-rules">${escapeHtml(messages.businessRules)}</h2>${prose.overview}${table}${prose.notes}</section>`;
}

function renderStaticErrorCodesSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const prose = renderSectionProse(result, "ErrorCodes");
  if (result.errorCodes.length === 0 && !prose.overview && !prose.notes) {
    return "";
  }
  const showOverview = result.errorCodes.some((errorCode) => (errorCode.overview?.length ?? 0) > 0);
  const showNotes = result.errorCodes.some((errorCode) => (errorCode.notes?.length ?? 0) > 0);
  const table = result.errorCodes.length > 0
    ? renderTable(
      [
        `${messages.marker}/${messages.id}`,
        ...(showOverview ? [messages.overview] : []),
        messages.properties,
        ...(showNotes ? [messages.notes] : [])
      ],
      result.errorCodes.map((errorCode) => [
        renderStaticEntityReferenceById(result, errorCode.id),
        ...(showOverview ? [renderStaticEntityOverview(result, errorCode.overview ?? [])] : []),
        renderStaticPropertiesAndBullets(result, errorCode.properties, errorCode.bullets),
        ...(showNotes ? [renderStaticEntityNotes(result, errorCode.notes ?? [])] : [])
      ]),
      messages.none
    )
    : `<p class="spec-empty">${escapeHtml(messages.none)}</p>`;
  return `<section class="doc-section error-codes-section"><h2 id="error-codes">${escapeHtml(messages.errorCodes)}</h2>${prose.overview}${table}${prose.notes}</section>`;
}

function renderStaticNotesSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  if (result.notes.length === 0) {
    return "";
  }
  return `<section class="doc-section notes-section"><h2 id="notes">${escapeHtml(messages.notes)}</h2>${result.notes.map((note) => `<section class="note-block"><h3>${escapeHtml(note.title)}</h3>${renderStaticEntityNotes(result, note.lines)}</section>`).join("")}</section>`;
}

function renderStaticReferenceList(result: MarkVSpecParseResult, ids: string[]): string {
  return ids.length > 0 ? `<ul class="spec-list">${ids.map((id) => `<li>${renderStaticEntityReferenceById(result, id)}</li>`).join("")}</ul>` : "";
}

function renderStaticDetailReferenceList(result: MarkVSpecParseResult, ids: string[]): string {
  return ids.length > 0 ? `<ul class="spec-list">${ids.map((id) => `<li>${renderStaticDetailReferenceById(result, id)}</li>`).join("")}</ul>` : "";
}

function renderStaticEntityReferenceById(result: MarkVSpecParseResult, id: string): string {
  const reference = resolveMarkVSpecEntityReference(result, id);
  return reference ? renderStaticEntityReference(reference, staticEntityReferencePresenterSupport) : code(id);
}

function renderStaticDetailReferenceById(result: MarkVSpecParseResult, id: string): string {
  const reference = resolveMarkVSpecEntityReference(result, id);
  return reference?.kind === "element" ? renderStaticElementDetailReference(reference, staticEntityReferencePresenterSupport) : renderStaticEntityReferenceById(result, id);
}

function renderStaticProperties(properties: Record<string, string | string[] | true>): string {
  const entries = Object.entries(properties).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return "";
  }
  return `<ul class="spec-list">${entries.map(([key, value]) => `<li>${code(key)}${value === true ? "" : `: ${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}`}</li>`).join("")}</ul>`;
}

function renderStaticPropertiesAndBullets(
  result: MarkVSpecParseResult,
  properties: Record<string, string | string[] | true>,
  bullets: readonly { text: string }[]
): string {
  const items = [
    ...Object.entries(properties)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${code(key)}${value === true ? "" : `: ${escapeHtml(Array.isArray(value) ? value.join(", ") : value)}`}`),
    ...bullets.map((bullet) => renderInlineMarkdown(bullet.text, result))
  ];
  return items.length > 0 ? `<ul class="spec-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>` : "";
}

function renderStaticValidationRules(result: MarkVSpecParseResult, rules: MarkVSpecParseResult["validations"][number]["rules"]): string {
  if (rules.length === 0) {
    return "";
  }
  return `<ul class="spec-list">${rules.map((rule) => `<li>${code(rule.name)}${rule.targets.length > 0 ? `: ${rule.targets.map((target) => renderStaticEntityReferenceById(result, target)).join(", ")}` : ""}</li>`).join("")}</ul>`;
}

function renderStaticRuleBody(result: MarkVSpecParseResult, rule: MarkVSpecParseResult["rules"][number]): string {
  const lines = [
    ...(rule.bodyLines ?? []),
    ...rule.bullets.map((bullet) => `- ${bullet.text}`)
  ];
  return renderMarkdownLines(lines, result);
}

function renderStaticViewContextsSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const sectionProse = result.sectionProse.filter((candidate) => candidate.kind === "ViewContext");
  if (result.viewContexts.length === 0 && sectionProse.length === 0) {
    return "";
  }
  const showOverview = result.viewContexts.some((context) => (context.overview?.length ?? 0) > 0);
  const showNotes = result.viewContexts.some((context) => (context.notes?.length ?? 0) > 0);
  const table = result.viewContexts.length > 0
    ? renderTable(
      [
        messages.name,
        ...(showOverview ? [messages.overview] : []),
        messages.type,
        messages.value,
        messages.defaultValue,
        messages.properties,
        ...(showNotes ? [messages.notes] : [])
      ],
      result.viewContexts.map((context) => [
        renderStaticCode(context.name),
        ...(showOverview ? [renderStaticEntityOverview(result, context.overview ?? [])] : []),
        context.type ? renderStaticCode(context.type) : "",
        renderStaticViewContextValues(context.values, messages.default),
        context.defaultValue ? renderStaticCode(context.defaultValue) : "",
        renderStaticViewContextProperties(context.properties),
        ...(showNotes ? [renderStaticEntityNotes(result, context.notes ?? [])] : [])
      ]),
      messages.none
    )
    : `<p class="spec-empty">${escapeHtml(messages.none)}</p>`;
  return `<section class="doc-section view-context-section">
  <h2 id="view-contexts">${escapeHtml(messages.viewContexts)}</h2>
  ${renderStaticEntityOverview(result, sectionProse.flatMap((candidate) => candidate.overview))}
  ${table}
  ${renderStaticEntityNotes(result, sectionProse.flatMap((candidate) => candidate.notes))}
</section>`;
}

function renderStaticViewContextSamplesSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const sectionProse = result.sectionProse.filter((candidate) => candidate.kind === "ViewContextSamples");
  if (result.viewContextSamples.length === 0 && sectionProse.length === 0) {
    return "";
  }
  const showOverview = result.viewContextSamples.some((sample) => (sample.overview?.length ?? 0) > 0);
  const showNotes = result.viewContextSamples.some((sample) => (sample.notes?.length ?? 0) > 0);
  const table = result.viewContextSamples.length > 0
    ? renderTable(
      [
        messages.sample,
        ...(showOverview ? [messages.overview] : []),
        messages.value,
        ...(showNotes ? [messages.notes] : [])
      ],
      result.viewContextSamples.map((sample) => [
        renderStaticCode(sample.name),
        ...(showOverview ? [renderStaticEntityOverview(result, sample.overview ?? [])] : []),
        renderStaticViewContextSampleValues(sample.values),
        ...(showNotes ? [renderStaticEntityNotes(result, sample.notes ?? [])] : [])
      ]),
      messages.none
    )
    : `<p class="spec-empty">${escapeHtml(messages.none)}</p>`;
  return `<section class="doc-section view-context-samples-section">
  <h2 id="view-context-samples">${escapeHtml(messages.viewContextSamples)}</h2>
  ${renderStaticEntityOverview(result, sectionProse.flatMap((candidate) => candidate.overview))}
  ${table}
  ${renderStaticEntityNotes(result, sectionProse.flatMap((candidate) => candidate.notes))}
</section>`;
}

function renderStaticViewContextValues(values: MarkVSpecParseResult["viewContexts"][number]["values"], defaultLabel: string): string {
  if (values.length === 0) {
    return "";
  }
  return `<ul class="spec-list">${values.map((value) => `<li>${renderStaticCode(value.value)}${value.isDefault ? ` <span class="state-badge">${escapeHtml(defaultLabel)}</span>` : ""}</li>`).join("")}</ul>`;
}

function renderStaticViewContextProperties(properties: Record<string, string | true>): string {
  const entries = Object.entries(properties).filter(([key]) => key !== "type");
  if (entries.length === 0) {
    return "";
  }
  return `<ul class="spec-list">${entries.map(([key, value]) => `<li>${renderStaticCode(key)}${value === true ? "" : `: ${escapeHtml(value)}`}</li>`).join("")}</ul>`;
}

function renderStaticViewContextSampleValues(values: Record<string, string>): string {
  const entries = Object.entries(values);
  if (entries.length === 0) {
    return "";
  }
  return `<ul class="spec-list">${entries.map(([name, value]) => `<li>${renderStaticCode(`\${view.${name}}`)}: ${escapeHtml(value)}</li>`).join("")}</ul>`;
}

function renderStaticCode(value: string): string {
  return `<code>${escapeHtml(value)}</code>`;
}

function renderStaticStateFlowSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const diagram = renderStaticMermaidStateDiagram(result);
  if (!diagram) {
    return "";
  }
  return `<section class="doc-section state-flow-section"><h2 id="state-flow">${escapeHtml(messages.stateFlow)}</h2>${renderStaticStateMessagesBox(result, messages)}<pre class="mermaid-source" data-mermaid-source><code class="language-mermaid">${escapeHtml(diagram)}</code></pre></section>`;
}

function renderStaticActionTransitionsSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const rows = [
    ...result.actions.flatMap((action) => action.transitions
    .filter((transition) => !isStaticTerminalTransitionTarget(transition.to))
    .map((transition) => [
      renderStaticStateLabel(transition.from),
      renderStaticStateLabel(transition.to),
      transition.result ? renderStaticResultLabel(transition.result) : "",
      renderStaticActionTransitionSource(result, action, transition.result)
    ]))
  ];
  if (rows.length === 0) {
    return "";
  }
  return `<section class="doc-section" id="state-transition-table"><h2>${escapeHtml(messages.actionTransitions)}</h2>${renderStaticStateMessagesBox(result, messages)}${renderTable([messages.from, messages.to, messages.case, messages.triggeredBy], rows)}</section>`;
}

function renderStaticStateMessagesBox(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const rows = result.states
    .filter((state) => state.message)
    .map((state) => [renderStaticStateLabel(state.name), escapeHtml(state.message ?? "")]);
  if (rows.length === 0) {
    return "";
  }
  return `<section class="state-messages-section"><h3>${escapeHtml(messages.state)} ${escapeHtml(messages.message)}</h3>${renderTable([messages.state, messages.message], rows)}</section>`;
}

function renderStaticActionDetailsSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const prose = renderSectionProse(result, "Actions");
  if (result.actions.length === 0 && !prose.overview && !prose.notes) {
    return "";
  }
  const cards = result.actions.map((action) => renderStaticActionDetail(result, messages, action)).join("");
  return `<section class="doc-section"><h2 id="action-details">${escapeHtml(messages.actionDetails)}</h2>${prose.overview}<div class="action-detail-list">${cards}</div>${prose.notes}</section>`;
}

function renderStaticActionDetail(
  result: MarkVSpecParseResult,
  messages: RendererMessages,
  action: MarkVSpecParseResult["actions"][number]
): string {
  const rows = [
    [messages.overview, renderStaticEntityOverview(result, action.overview ?? [])],
    [messages.trigger, action.triggeredBy ? escapeHtml(action.triggeredBy) : ""],
    [messages.from, action.fromStates.map(renderStaticStateLabel).join(", ")],
    [messages.process, renderStaticProcessSteps(result, messages, action)],
    [messages.notes, renderStaticEntityNotes(result, action.notes ?? [])]
  ].filter(([, value]) => value);
  return `<article class="action-detail"><h3>${escapeHtml(action.id)} ${escapeHtml(action.name)}</h3><dl>${rows.map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${value}</dd>`).join("")}</dl></article>`;
}

function renderStaticProcessSteps(
  result: MarkVSpecParseResult,
  messages: RendererMessages,
  action: MarkVSpecParseResult["actions"][number]
): string {
  const steps = action.processSteps;
  if (steps.length === 0) {
    return "";
  }

  const renderedParallelGroups = new Set<string>();
  const items = steps.map((step) => {
    if (!step.parallelGroup) {
      return renderStaticProcessStepCard(result, messages, step);
    }
    if (renderedParallelGroups.has(step.parallelGroup)) {
      return "";
    }
    renderedParallelGroups.add(step.parallelGroup);
    const groupSteps = steps.filter((candidate) => candidate.parallelGroup === step.parallelGroup);
    return `<div class="process-card process-parallel-group-card" role="listitem" data-process-group="${escapeHtml(step.parallelGroup)}">
      <div class="process-card-header"><span class="process-card-title-group">${renderStaticPreviewIcon("split")}<span class="process-card-title">${escapeHtml(messages.processParallelGroup)}: ${escapeHtml(step.parallelGroup)}</span></span></div>
      <div class="process-parallel-children">${groupSteps.map((groupStep) => renderStaticProcessStepCard(result, messages, groupStep, "child")).join("")}</div>
    </div>`;
  }).filter(Boolean);

  return `<div class="process-flow" role="list">${items.map((item, index) => `${item}${index < items.length - 1 ? '<div class="process-flow-connector" aria-hidden="true"></div>' : ""}`).join("")}</div>`;
}

function renderStaticProcessStepCard(
  result: MarkVSpecParseResult,
  messages: RendererMessages,
  step: MarkVSpecParseResult["actions"][number]["processSteps"][number],
  variant: "root" | "child" = "root"
): string {
  const classes = [
    "process-card",
    "process-step-card",
    variant === "child" ? "process-step-card-child" : "",
    step.resolveGroup ? "process-resolve-card" : ""
  ].filter(Boolean).join(" ");
  const resolveGroup = step.resolveGroup ? `<span class="process-card-meta">${escapeHtml(messages.processGroup)} ${escapeHtml(step.resolveGroup)}</span>` : "";
  const detailList = renderStaticProcessStepDetailList(result, messages, step);
  return `<div class="${classes}" role="${variant === "root" ? "listitem" : "group"}"${step.resolveGroup ? ` data-resolve-group="${escapeHtml(step.resolveGroup)}"` : ""}>
    <div class="process-card-header"><span class="process-card-title-group">${renderStaticProcessStepIcon(step)}<span class="process-card-title">${renderStaticProcessStepLabel(step)}</span></span>${resolveGroup}</div>
    ${detailList}
  </div>`;
}

function renderStaticProcessStepLabel(step: MarkVSpecParseResult["actions"][number]["processSteps"][number]): string {
  const name = step.marker ? `${renderStaticResultLabel(step.marker)} ${escapeHtml(step.name)}` : escapeHtml(step.name);
  return step.resolveGroup ? `${name} ${escapeHtml(step.resolveGroup)}` : name;
}

function renderStaticProcessStepDetailList(
  result: MarkVSpecParseResult,
  messages: RendererMessages,
  step: MarkVSpecParseResult["actions"][number]["processSteps"][number]
): string {
  const items = [
    renderStaticProcessDataDetails(messages.processReceive, step.receives),
    ...renderStaticProcessStepDetails(messages, step),
    renderStaticProcessDataDetails(messages.result, step.results),
    step.to ? `${escapeHtml(messages.processEffect)} ${renderStaticTransitionEffect(step.to)}` : "",
    step.display ? `${escapeHtml(messages.processDisplay)} ${renderStaticDisplayEffect(messages, step.display)}` : "",
    step.target ? `${escapeHtml(messages.processUpdate)} ${escapeHtml(step.target)}` : "",
    step.mode ? `${escapeHtml(messages.processMode)} ${escapeHtml(step.mode)}` : "",
    step.fragment ? `${escapeHtml(messages.processFragment)} ${escapeHtml(step.fragment)}` : "",
    step.content ? `${escapeHtml(messages.processContent)} ${escapeHtml(step.content)}` : "",
    renderStaticProcessStepCases(messages, step)
  ].filter(Boolean);
  return items.length > 0 ? `<ul class="spec-list spec-effect-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>` : "";
}

function renderStaticProcessDataDetails(
  labelText: string,
  details: MarkVSpecParseResult["actions"][number]["processSteps"][number]["details"]
): string {
  if (details.length === 0) {
    return "";
  }
  return `${escapeHtml(labelText)}<ul class="spec-list spec-nested-list">${details.map((detail) => `<li>${renderStaticProcessStepDetail(detail)}</li>`).join("")}</ul>`;
}

function renderStaticProcessStepDetails(
  messages: RendererMessages,
  step: MarkVSpecParseResult["actions"][number]["processSteps"][number]
): string[] {
  const call = step.details.find((detail) => detail.key === "call" || staticProcessDetailRoot(detail.key) === "server");
  if (call) {
    const parameters = step.details.filter((detail) => detail !== call);
    const nestedParams = parameters.length > 0
      ? `<ul class="spec-list spec-nested-list"><li>${escapeHtml(messages.parameters)}<ul class="spec-list spec-nested-list">${parameters.map((detail) => `<li>${renderStaticProcessStepDetail(detail)}</li>`).join("")}</ul></li></ul>`
      : "";
    return [`${escapeHtml(call.value)}${nestedParams}`];
  }
  return step.details.map(renderStaticProcessStepDetail);
}

function renderStaticProcessStepDetail(detail: MarkVSpecParseResult["actions"][number]["processSteps"][number]["details"][number]): string {
  return `${escapeHtml(detail.key)}: ${escapeHtml(detail.value)}`;
}

function renderStaticProcessStepCases(
  messages: RendererMessages,
  step: MarkVSpecParseResult["actions"][number]["processSteps"][number]
): string {
  if (step.outcomes.length === 0) {
    return "";
  }
  return `${escapeHtml(messages.case)}<ul class="spec-list spec-nested-list">${step.outcomes.map((outcome) => {
    const details = [
      outcome.description ? `${escapeHtml(messages.processDescription)}: ${escapeHtml(outcome.description)}` : "",
      outcome.response ? `${escapeHtml(messages.processResponse)} ${escapeHtml(outcome.response.definition)}` : "",
      outcome.to ? `${escapeHtml(messages.processEffect)} ${renderStaticTransitionEffect(outcome.to)}` : "",
      outcome.display ? `${escapeHtml(messages.processDisplay)} ${renderStaticDisplayEffect(messages, outcome.display)}` : "",
      outcome.flow === "stop" ? escapeHtml(messages.processStop) : "",
      outcome.flow === "continue" ? escapeHtml(messages.processContinue) : ""
    ].filter(Boolean);
    return `<li><strong>${renderStaticResultLabel(outcome.result)}</strong>${details.length > 0 ? `<ul>${details.map((detail) => `<li>${detail}</li>`).join("")}</ul>` : ""}</li>`;
  }).join("")}</ul>`;
}

function renderStaticTransitionEffect(target: string): string {
  return isStaticTerminalTransitionTarget(target)
    ? `navigate to ${escapeHtml(target)}`
    : `set state ${renderStaticStateLabel(target)}`;
}

function renderStaticDisplayEffect(
  messages: RendererMessages,
  display: NonNullable<MarkVSpecParseResult["actions"][number]["outcomes"][number]["display"]>
): string {
  const parts = [
    display.target ? escapeHtml(display.target) : "",
    display.element ? `${escapeHtml(messages.processElement)} ${escapeHtml(display.element)}` : "",
    display.message ? `${escapeHtml(messages.processMessage)} ${escapeHtml(display.message)}` : "",
    display.partial ? `${escapeHtml(messages.partial)} ${escapeHtml(display.partial)}` : "",
    display.content ? `${escapeHtml(messages.processContent)} ${escapeHtml(display.content)}` : ""
  ].filter(Boolean);
  return parts.length > 0 ? `<ul class="spec-list spec-nested-list">${parts.map((part) => `<li>${part}</li>`).join("")}</ul>` : "-";
}

type StaticProcessIconName = "circle-x" | "cog" | "merge" | "panels-top-left" | "refresh-cw" | "satellite-dish" | "square-check-big" | "unplug" | "waypoints";

function renderStaticProcessStepIcon(step: MarkVSpecParseResult["actions"][number]["processSteps"][number]): string {
  const icon = staticProcessStepIconName(step);
  return icon ? renderStaticPreviewIcon(icon) : "";
}

function staticProcessStepIconName(step: MarkVSpecParseResult["actions"][number]["processSteps"][number]): StaticProcessIconName | undefined {
  if (step.resolveGroup) {
    return "merge";
  }
  if (step.details.some((detail) => staticProcessDetailRoot(detail.key) === "request")) {
    return "unplug";
  }
  if (step.details.some((detail) => staticProcessDetailRoot(detail.key) === "server")) {
    return "cog";
  }
  if (step.details.some((detail) => staticProcessDetailRoot(detail.key) === "validation")) {
    return "square-check-big";
  }
  if (step.receives.length > 0 || step.details.some((detail) => detail.key === "receive" || detail.key === "response")) {
    return "satellite-dish";
  }
  if (step.display || step.target || step.mode || step.fragment || step.content) {
    return "panels-top-left";
  }
  if (step.to) {
    return isStaticTerminalTransitionTarget(step.to) ? "waypoints" : "refresh-cw";
  }
  return undefined;
}

function staticProcessDetailRoot(key: string): string {
  const root = key.split(".")[0]?.trim() ?? "";
  return root === "call" ? "server" : root;
}

function renderStaticMermaidStateDiagram(result: MarkVSpecParseResult): string {
  const nodeNames = collectStaticStateFlowNodes(result);
  const aliases = new Map(nodeNames.map((name, index) => [name, `S${index}`]));
  if (nodeNames.length === 0) {
    return "";
  }

  const lines = ["stateDiagram-v2", "  direction TB"];
  for (const name of nodeNames) {
    lines.push(`  state "${staticMermaidLabel(name)}" as ${aliases.get(name)}`);
  }

  const edgeGroups = new Map<string, { from: string; to: string; labels: string[]; seenLabels: Set<string> }>();
  for (const action of result.actions) {
    for (const transition of action.transitions) {
      const from = aliases.get(transition.from);
      const to = aliases.get(transition.to);
      if (!from || !to || transition.from === transition.to || isStaticTerminalTransitionTarget(transition.to)) {
        continue;
      }

      const key = `${from}\u0000${to}`;
      const group = edgeGroups.get(key) ?? { from, to, labels: [], seenLabels: new Set<string>() };
      const transitionLabel = staticActionTransitionLabel(action, transition.result, transition.to);
      if (!group.seenLabels.has(transitionLabel)) {
        group.labels.push(transitionLabel);
        group.seenLabels.add(transitionLabel);
      }
      edgeGroups.set(key, group);
    }
  }

  for (const group of edgeGroups.values()) {
    lines.push(`  ${group.from} --> ${group.to}: ${staticMermaidLabel(group.labels.join(", "))}`);
  }
  return lines.join("\n");
}

function collectStaticStateFlowNodes(result: MarkVSpecParseResult): string[] {
  const names = new Set(result.states.map((state) => state.name));
  for (const action of result.actions) {
    for (const transition of action.transitions) {
      names.add(transition.from);
      if (!isStaticTerminalTransitionTarget(transition.to)) {
        names.add(transition.to);
      }
    }
  }
  return [...names];
}

function staticActionTransitionLabel(
  action: MarkVSpecParseResult["actions"][number],
  resultName: string | undefined,
  target: string
): string {
  const actionLabel = [corePropertyString(action, "marker"), action.name].filter(Boolean).join(" ");
  const lifecycleLabel = isStaticDocumentLifecycleTrigger(action.triggeredBy) ? `${action.triggeredBy} / ${actionLabel}` : actionLabel;
  const resultLabel = resultName ? `${lifecycleLabel} / ${resultName}` : lifecycleLabel;
  return isStaticTerminalTransitionTarget(target) ? `${resultLabel} / navigate` : resultLabel;
}

function staticMermaidLabel(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"").replaceAll("\n", " ").replaceAll(";", ",");
}

function renderStaticActionTransitionSource(
  result: MarkVSpecParseResult,
  action: MarkVSpecParseResult["actions"][number],
  resultName: string | undefined
): string {
  const actionReference = renderStaticActionReference(result, action);
  const notes = [
    isStaticDocumentLifecycleTrigger(action.triggeredBy) ? action.triggeredBy : "",
    ...staticTransitionOriginChain(result, action, resultName)
  ].filter(Boolean);
  if (notes.length === 0) {
    return actionReference;
  }
  return `${actionReference}<div class="mm-ref-chip-note">${notes.map(escapeHtml).join(" -&gt; ")}</div>`;
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
  return reference ? renderStaticEntityReference(reference, staticEntityReferencePresenterSupport) : code(action.id);
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
  return `<section class="doc-section history-section"><h2 id="history">${escapeHtml(messages.history)}</h2>${renderTable(headers, rows)}</section>`;
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
  return escapeHtml(rawStringProperty(value));
}

export function rawStringProperty(value: string | true | undefined): string {
  return corePropertyString({ properties: { value } }, "value") ?? "";
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
    return reference ? renderStaticEntityReference(reference, staticEntityReferencePresenterSupport) : match;
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

export function escapeHtml(value: string): string {
  return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");
}
