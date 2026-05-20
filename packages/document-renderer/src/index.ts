import { effectiveHistoryFields, latestHistoryBasicInfo, messagesForLocale, propertyString as corePropertyString, resolveMarkVSpecEntityReference } from "@markvspec/core";
import type { MarkVSpecParseResult, RendererMessages } from "@markvspec/core";
import {
  renderStateViewsSection as renderStaticStateViewsSection,
  type StaticStateViewRenderingSupport
} from "./static-state-view-renderer.js";

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

export function renderStaticDesignDocumentHtml(result: MarkVSpecParseResult, options: RenderStaticDesignDocumentOptions = {}): string {
  const messages = options.messages ?? messagesForLocale(result.screen.locale);

  return renderDesignDocumentSections([
    renderDocumentOverviewSection(result, messages),
    renderHistorySection(result, messages),
    renderStaticStateFlowSection(result, messages),
    renderStaticActionTransitionsSection(result, messages),
    renderStaticActionDetailsSection(result, messages),
    renderStaticViewContextsSection(result, messages),
    renderStaticViewContextSamplesSection(result, messages),
    renderStaticStateViewsSection(result, messages, staticStateViewRenderingSupport)
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

function renderStaticEntityOverview(result: MarkVSpecParseResult, lines: readonly string[]): string {
  return lines.length > 0 ? `<div class="entity-overview">${renderMarkdownLines([...lines], result)}</div>` : "";
}

function renderStaticEntityNotes(result: MarkVSpecParseResult, lines: readonly string[]): string {
  return lines.length > 0 ? `<div class="entity-notes">${renderMarkdownLines([...lines], result)}</div>` : "";
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
  <h2>${escapeHtml(messages.viewContexts)}</h2>
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
  <h2>${escapeHtml(messages.viewContextSamples)}</h2>
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
  return `<section class="doc-section state-flow-section"><h2>${escapeHtml(messages.stateFlow)}</h2><pre class="mermaid-source" data-mermaid-source><code class="language-mermaid">${escapeHtml(diagram)}</code></pre></section>`;
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
  return `<section class="doc-section" id="state-transition-table"><h2>${escapeHtml(messages.actionTransitions)}</h2>${renderTable([messages.from, messages.to, messages.case, messages.triggeredBy], rows)}</section>`;
}

function renderStaticActionDetailsSection(result: MarkVSpecParseResult, messages: RendererMessages): string {
  if (result.actions.length === 0) {
    return "";
  }
  const cards = result.actions.map((action) => renderStaticActionDetail(result, messages, action)).join("");
  return `<section class="doc-section"><h2>${escapeHtml(messages.actionDetails)}</h2><div class="action-detail-list">${cards}</div></section>`;
}

function renderStaticActionDetail(
  result: MarkVSpecParseResult,
  messages: RendererMessages,
  action: MarkVSpecParseResult["actions"][number]
): string {
  const rows = [
    [messages.trigger, action.triggeredBy ? escapeHtml(action.triggeredBy) : ""],
    [messages.from, action.fromStates.map(renderStaticStateLabel).join(", ")],
    [messages.process, renderStaticProcessSteps(result, messages, action)]
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
      <div class="process-card-header"><span class="process-card-title-group">${renderPreviewIcon("split")}<span class="process-card-title">${escapeHtml(messages.processParallelGroup)}: ${escapeHtml(step.parallelGroup)}</span></span></div>
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
  const normalizedName = normalizeStaticProcessStepName(step.name);
  if (normalizedName === "servercall") {
    const call = step.details.find((detail) => detail.key === "call");
    const parameters = step.details.filter((detail) => detail !== call);
    if (call) {
      const nestedParams = parameters.length > 0
        ? `<ul class="spec-list spec-nested-list"><li>${escapeHtml(messages.parameters)}<ul class="spec-list spec-nested-list">${parameters.map((detail) => `<li>${renderStaticProcessStepDetail(detail)}</li>`).join("")}</ul></li></ul>`
        : "";
      return [`${escapeHtml(call.value)}${nestedParams}`];
    }
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
  return icon ? renderPreviewIcon(icon) : "";
}

function staticProcessStepIconName(step: MarkVSpecParseResult["actions"][number]["processSteps"][number]): StaticProcessIconName | undefined {
  if (step.resolveGroup) {
    return "merge";
  }
  const normalizedName = normalizeStaticProcessStepName(step.name);
  if (/error|fail/u.test(normalizedName)) {
    return "circle-x";
  }
  if (normalizedName === "httprequest" || normalizedName === "partialrequest" || step.details.some((detail) => detail.key === "request")) {
    return "unplug";
  }
  if (normalizedName === "servercall" || step.details.some((detail) => detail.key === "server" || detail.key === "call")) {
    return "cog";
  }
  if (/validation|validate/u.test(normalizedName) || step.details.some((detail) => detail.key === "validation")) {
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

function normalizeStaticProcessStepName(name: string): string {
  return name.toLowerCase().replace(/[\s_-]+/gu, "");
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
