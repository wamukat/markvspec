import { effectiveHistoryFields, messagesForLocale, renderMarkVSpecHtml } from "@markvspec/core";
import type { MarkVSpecParseResult, MarkVSpecState, RendererMessages } from "@markvspec/core";

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
    [".wireframe-print-section, .action-detail, .note-block, .process-card, .model-sample-block", "break-inside: avoid; page-break-inside: avoid"],
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
  const viewports = layoutViewports(result);

  return renderDesignDocumentSections([
    renderDocumentOverviewSection(result, messages),
    renderHistorySection(result, messages),
    renderStateViewsSection(result, viewports, messages)
  ]);
}

function renderDocumentOverviewSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  const screen = result.screen;
  const heading = screen.type === "template" ? messages.template : screen.type === "partial" ? messages.partial : messages.screen;
  const facts = [
    [messages.id, screen.id ?? ""],
    [messages.route, screen.route ?? ""],
    [messages.owner, screen.owner ?? ""],
    [messages.viewport, screen.viewport ?? ""],
    [messages.status, screen.status ?? ""]
  ].filter(([, value]) => value.trim().length > 0);
  if (!screen.description && facts.length === 0) {
    return "";
  }

  const description = screen.description
    ? `<div class="screen-description">${renderMarkdownLines(screen.description.split(/\r?\n/u))}</div>`
    : "";
  const table = facts.length > 0
    ? renderTable([messages.field, messages.value], facts.map(([key, value]) => [escapeHtml(key), escapeHtml(value)]))
    : "";
  return `<section class="doc-section screen-spec-section"><h2>${escapeHtml(heading)}</h2>${description}${table}</section>`;
}

function renderStateViewsSection(result: MarkVSpecParseResult, viewports: string[], messages: RendererMessages): string {
  const states = displayStates(result);
  const viewportSections = viewports.length === 0
    ? renderStateViewportSection(result, states, undefined, false, messages)
    : viewports.map((viewport, index) => renderStateViewportSection(result, states, viewport, index === 0, messages)).join("");
  return `<section class="doc-section state-views-section">
  <h2>${escapeHtml(messages.stateViews)}</h2>
  ${viewportSections}
</section>`;
}

function renderStateViewportSection(
  result: MarkVSpecParseResult,
  states: Array<MarkVSpecState | undefined>,
  viewport: string | undefined,
  isDefault: boolean,
  messages: RendererMessages
): string {
  const viewportAttr = viewport ? ` data-viewport="${escapeHtml(viewport)}"` : "";
  const defaultBadge = isDefault ? ` <span class="state-badge">${escapeHtml(messages.default)}</span>` : "";
  const viewportLabel = viewport ? `${messages.viewport} ${viewport}` : `${messages.default} ${messages.view}`;
  return `<section class="state-viewport-section"${viewportAttr}>
  <h3>${escapeHtml(viewportLabel)}${defaultBadge}</h3>
  ${states.map((state) => renderStateScreenSection(result, state, viewport, messages)).join("")}
</section>`;
}

function renderStateScreenSection(
  result: MarkVSpecParseResult,
  state: MarkVSpecState | undefined,
  viewport: string | undefined,
  messages: RendererMessages
): string {
  const viewportAttrs = viewport ? ` data-viewport="${escapeHtml(viewport)}" style="${viewportPrintStyle(viewport)}"` : "";
  const stateAttrs = state ? ` data-state="${escapeHtml(state.name)}"` : "";
  const stateHeading = state
    ? `${messages.state}: ${state.name}${state.initial ? ` ${messages.initial}` : ""}`
    : `${messages.default} ${messages.view}`;
  const wireframe = renderMarkVSpecHtml(result, {
    includeStyles: true,
    markerVisibility: { layout: true, element: true, action: true },
    messages,
    state: state?.name,
    viewport
  });

  return `<section class="doc-section state-screen-section"${stateAttrs}${viewportAttrs}>
  <section class="wireframe-print-section">
    <h4 class="state-screen-heading">${escapeHtml(stateHeading)}</h4>
    ${renderModelSamplesForState(result, state?.name, messages)}
    <h5 class="state-screen-subheading">${escapeHtml(messages.wireframe)}</h5>
    <section class="wireframe-section">${wireframe}</section>
  </section>
</section>`;
}

function renderModelSamplesForState(result: MarkVSpecParseResult, stateName: string | undefined, messages: RendererMessages): string {
  if (!stateName) {
    return "";
  }

  const samples = result.modelSamples.filter((sample) => sample.state === stateName);
  if (samples.length === 0) {
    return "";
  }

  return `<section class="model-sample-group">
    <h5 class="state-screen-subheading">${escapeHtml(messages.modelSamples)}</h5>
    ${samples.map((sample) => renderModelSample(sample, messages)).join("")}
  </section>`;
}

function displayStates(result: MarkVSpecParseResult): Array<MarkVSpecState | undefined> {
  if (result.states.length === 0) {
    return [undefined];
  }

  const initialState = result.states.find((state) => state.initial);
  const firstState = initialState ?? result.states[0];
  return [
    firstState,
    ...result.states.filter((state) => state.name !== firstState?.name)
  ];
}

function layoutViewports(result: MarkVSpecParseResult): string[] {
  const viewports = [...new Set(result.layoutGroups.map((layout) => layout.viewport))];
  if (result.screen.viewport && viewports.includes(result.screen.viewport)) {
    return [
      result.screen.viewport,
      ...viewports.filter((viewport) => viewport !== result.screen.viewport)
    ];
  }

  return viewports;
}

function renderModelSample(sample: MarkVSpecParseResult["modelSamples"][number], messages: RendererMessages): string {
  return `<section class="model-sample-block"><h6 class="model-sample-path-heading state-screen-detail-heading"><code>${escapeHtml(sample.path)}</code></h6>${renderModelSampleTable(sample, messages)}</section>`;
}

function renderModelSampleTable(sample: MarkVSpecParseResult["modelSamples"][number], messages: RendererMessages): string {
  if (sample.columns.length === 0) {
    return `<p class="spec-empty">${escapeHtml(messages.noSampleFieldsDefined)}</p>`;
  }

  if (sample.rows.length === 0) {
    const headerOnlyTable = `<div class="spec-table-wrap"><table class="spec-table"><thead><tr>${sample.columns.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody></tbody></table></div>`;
    return `${headerOnlyTable}<p class="spec-empty">${escapeHtml(messages.emptyArray)}</p>`;
  }

  return renderTable(sample.columns, sample.rows.map((row) => sample.columns.map((header) => escapeHtml(row.values[header] ?? ""))));
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
    renderMarkdownLines(entry.bodyLines)
  ]);
  return `<section class="doc-section history-section"><h2>${escapeHtml(messages.history)}</h2>${renderTable(headers, rows)}</section>`;
}

export function renderTable(headers: string[], rows: Array<Array<string | undefined>>, emptyLabel = "None."): string {
  if (rows.length === 0) {
    return `<p class="spec-empty">${escapeHtml(emptyLabel)}</p>`;
  }

  return `<div class="spec-table-wrap"><table class="spec-table"><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${renderTableCellHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

export function renderTableWithCells(headers: string[], rows: TableCell[][], emptyLabel = "None."): string {
  if (rows.length === 0) {
    return `<p class="spec-empty">${escapeHtml(emptyLabel)}</p>`;
  }

  return `<div class="spec-table-wrap"><table class="spec-table"><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map(renderTableCell).join("")}</tr>`).join("")}</tbody></table></div>`;
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

function renderMarkdownLines(lines: string[]): string {
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length === 0) {
      return;
    }
    blocks.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = (): void => {
    if (listItems.length === 0) {
      return;
    }
    blocks.push(`<ul class="spec-list">${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
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
  return blocks.join("");
}

function renderInlineMarkdown(value: string): string {
  return escapeHtml(value).replace(/`([^`]+)`/gu, '<span class="mm-inline-token">$1</span>');
}

export function escapeHtml(value: string): string {
  return value.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;").replace(/"/gu, "&quot;");
}
