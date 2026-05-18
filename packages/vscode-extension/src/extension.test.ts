import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { performance } from "node:perf_hooks";
import { join, resolve } from "node:path";
import test from "node:test";
import * as vscode from "vscode";
import { composeMarkVSpecTemplate, computeMarkVSpecRenderInvalidation, loadMarkVSpecProject, messagesForLocale, parseMarkVSpec, renderDiagnosticMessageForLocale, renderMarkVSpecHtml } from "@markvspec/core";
import {
  pdfBrowserArgs,
  pdfBrowserCandidates,
  resolvePdfBrowserCommands
} from "@markvspec/exporter";
import {
  createMarkVSpecCodeActions,
  createMarkVSpecDocumentSymbols,
  buildDocumentScope,
  buildPreviewUpdatePlan,
  canOpenPreviewReference,
  defaultExportHtmlBaseName,
  extractRenderKeyFragments,
  formatPreviewUpdateTelemetry,
  formatMarkVSpecStructure,
  isCurrentPreviewGenerationState,
  normalizePreviewPatchResultState,
  PREVIEW_AUTO_UPDATE_DEFAULT,
  PREVIEW_WEBVIEW_UPDATE_TIMEOUT_MS,
  loadScreenDocumentResult,
  PREVIEW_UPDATE_DEBOUNCE_MS,
  renderDesignDocumentHtml,
  renderPreviewErrorHtml,
  renderPreviewFragmentUpdates,
  renderPreviewHtml,
  renderPreviewLoadingHtml,
  renderProjectDesignDocumentHtml,
  renderProjectPreviewHtml,
  scheduleCoalescedPreviewUpdate,
  renderStandaloneHtml,
  shouldSkipActiveEditorPreviewUpdate,
  shouldUseIncrementalPreviewUpdate,
  renderStandaloneProjectHtml
} from "./extension.js";
import { renderInlineMarkdown } from "./markdown-renderer.js";
import { buildStateScreenReadModels } from "@markvspec/core";

const extensionRoot = resolve(".");

function markerBadge(value: string, category: "layout" | "element" | "action" | "form-group", linked = category === "action", anchorValue = value): string {
  const badge = `<code class="mm-id mm-marker mm-marker-${category}" data-mm-marker-category="${category}">${escapeRegExp(value)}</code>`;
  if (!linked) {
    return badge;
  }
  const href = `#action-detail-${escapeRegExp(encodeURIComponent(anchorValue))}`;
  return category === "action"
    ? `(?:<a class="mm-marker-link" href="${href}">${badge}</a>|<a class="mm-ref-chip mm-ref-chip-action" href="${href}"[^>]*>${badge})`
    : `<a class="mm-marker-link" href="${href}">${badge}</a>`;
}

function actionBadge(marker: string, actionId: string, linked = true): string {
  return markerBadge(marker, "action", linked, actionId);
}

function detailElementRef(marker: string, elementId: string): string {
  return `(?:<span class="mm-ref-chip mm-ref-chip-element"[^>]*>)?${markerBadge(marker, "element")} ${detailIdRef(elementId)}(?:</span>)?`;
}

function detailLayoutRef(marker: string, layoutName: string): string {
  return `(?:<span class="mm-ref-chip mm-ref-chip-layout"[^>]*>)?${markerBadge(marker, "layout")} ${escapeRegExp(layoutName)}(?:</span>)?`;
}

function detailLayoutRefById(marker: string, layoutId: string): string {
  return `<span class="mm-ref-chip mm-ref-chip-layout"[^>]*data-mm-ref-id="${escapeRegExp(layoutId)}"[^>]*>${markerBadge(marker, "layout")} [^<]+</span>`;
}

function detailActionRef(marker: string, actionId: string, actionName: string): string {
  return `(?:<a class="mm-ref-chip mm-ref-chip-action" href="#action-detail-${escapeRegExp(encodeURIComponent(actionId))}"[^>]*>)?${actionBadge(marker, actionId)} ${escapeRegExp(actionName)}(?:</a>)?`;
}

function refActionChip(marker: string, actionId: string, actionName: string): string {
  return `<a class="mm-ref-chip mm-ref-chip-action" href="#action-detail-${escapeRegExp(encodeURIComponent(actionId))}"[^>]*><code class="mm-id mm-marker mm-marker-action" data-mm-marker-category="action">${escapeRegExp(marker)}</code> ${escapeRegExp(actionName)}</a>`;
}

function refMessageChip(marker: string, id: string, label: string): string {
  return `<span class="mm-ref-chip mm-ref-chip-message"[^>]*><code class="mm-id mm-marker mm-marker-message" data-mm-marker-category="message" data-mm-display-source="${escapeRegExp(id)}">${escapeRegExp(marker)}</code> ${escapeRegExp(label)}</span>`;
}

function refFormGroupChip(marker: string, id: string, label: string): string {
  return `<a class="mm-ref-chip mm-ref-chip-form-group" href="#form-groups"[^>]*data-mm-ref-id="${escapeRegExp(id)}"[^>]*>${markerBadge(marker, "form-group")} ${escapeRegExp(label)}</a>`;
}

function detailIdRef(id: string): string {
  return `<span class="mm-detail-ref-id">${escapeRegExp(id)}</span>`;
}

function documentRef(id: string): string {
  return `<code class="mm-document-ref-id">${escapeRegExp(id)}</code>`;
}

function largeRealtimePreviewSource(title042: string): string {
  const ids = Array.from({ length: 90 }, (_, index) => `E-${String(index + 1).padStart(3, "0")}`);
  const elements = ids.map((id, index) => {
    const title = id === "E-042" ? title042 : `Title ${String(index + 1).padStart(3, "0")}`;
    return `### ${id} Text\n\n- value: ${title}`;
  });

  return `---
id: SCR-REALTIME-LARGE
type: screen
title: Realtime Large
---

# SCR-REALTIME-LARGE Realtime Large

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

${ids.map((id) => `- ${id}`).join("\n")}

## Elements

${elements.join("\n\n")}
`;
}

function semanticChip(value: string, tone: "neutral" | "info" | "success" | "warning" | "danger" | "type"): string {
  const toneClass = tone === "type" ? "mm-chip-type" : `mm-chip-tone-${tone}`;
  return `<span class="mm-chip ${toneClass}">${escapeRegExp(value)}</span>`;
}

function repeatedBadge(label = "Repeated"): string {
  return `<span class="mm-chip mm-repeated-badge">${escapeRegExp(label)}</span>`;
}

function unplacedBadge(label = "not placed in current layout"): string {
  return `<span class="mm-chip mm-unplaced-badge" title="${escapeRegExp(label)}"><span class="mm-unplaced-icon" aria-hidden="true"></span>${escapeRegExp(label)}</span>`;
}

function docLabel(value: string, kind: "state" | "trigger" | "result", extraClass = ""): string {
  const classes = ["mm-doc-label", `mm-doc-label-${kind}`, extraClass].filter(Boolean).join(" ");
  return `<code class="${escapeRegExp(classes)}">${escapeRegExp(value)}</code>`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sourceCodePattern(value: string): string {
  return inlineTokenPattern(value);
}

function plainCodePattern(value: string): string {
  return `<code>${escapeRegExp(value)}</code>`;
}

function sourceTypeChipPattern(value: string): string {
  return `<span class="mm-chip mm-source-chip mm-source-chip-${escapeRegExp(value)}">${escapeRegExp(value)}</span>`;
}

function defaultAlwaysPattern(value = "always"): string {
  return `<span class="spec-default-always">${escapeRegExp(value)}</span>`;
}

function inlineTokenPattern(value: string): string {
  return `<span class="mm-inline-token">${escapeRegExp(value)}</span>`;
}

function specSectionPattern(title: string, rows: string[]): string {
  return `<div class="spec-section"><strong>${escapeRegExp(title)}</strong><ul class="spec-list">${rows.map((row) => `<li>${row}</li>`).join("")}</ul></div>`;
}

function stateSection(html: string, state: string): string {
  const startMatch = new RegExp(`<section class="doc-section state-screen-section"(?=[^>]*\\bdata-state="${escapeRegExp(state)}")[^>]*>`).exec(html);
  const start = startMatch?.index ?? -1;
  assert.notEqual(start, -1, `missing state section ${state}`);
  const next = html.indexOf(`<section class="doc-section state-screen-section"`, start + (startMatch?.[0].length ?? 0));
  return next === -1 ? html.slice(start) : html.slice(start, next);
}

function viewportStateSection(html: string, state: string, viewport: string): string {
  const startMatch = new RegExp(`<section class="doc-section state-screen-section"(?=[^>]*\\bdata-state="${escapeRegExp(state)}")(?=[^>]*\\bdata-viewport="${escapeRegExp(viewport)}")[^>]*>`).exec(html);
  const start = startMatch?.index ?? -1;
  assert.notEqual(start, -1, `missing state section ${viewport}:${state}`);
  const next = html.indexOf(`<section class="doc-section state-screen-section"`, start + (startMatch?.[0].length ?? 0));
  return next === -1 ? html.slice(start) : html.slice(start, next);
}

function stateViewTitleSection(html: string, title: string): string {
  const startMatch = new RegExp(`<section class="doc-section state-screen-section"(?=[^>]*\\bdata-state-view-title="${escapeRegExp(title)}")[^>]*>`).exec(html);
  const start = startMatch?.index ?? -1;
  assert.notEqual(start, -1, `missing state view title section ${title}`);
  const next = html.indexOf(`<section class="doc-section state-screen-section"`, start + (startMatch?.[0].length ?? 0));
  return next === -1 ? html.slice(start) : html.slice(start, next);
}

function viewportStateViewTitleSection(html: string, title: string, viewport: string): string {
  const startMatch = new RegExp(`<section class="doc-section state-screen-section"(?=[^>]*\\bdata-state-view-title="${escapeRegExp(title)}")(?=[^>]*\\bdata-viewport="${escapeRegExp(viewport)}")[^>]*>`).exec(html);
  const start = startMatch?.index ?? -1;
  assert.notEqual(start, -1, `missing state view title section ${viewport}:${title}`);
  const next = html.indexOf(`<section class="doc-section state-screen-section"`, start + (startMatch?.[0].length ?? 0));
  return next === -1 ? html.slice(start) : html.slice(start, next);
}

function stateWireframeSection(section: string): string {
  const startMarker = `<section class="wireframe-section">`;
  const start = section.indexOf(startMarker);
  assert.notEqual(start, -1, "missing wireframe section");
  const nextH3 = section.indexOf("<h3>", start + startMarker.length);
  const nextH5 = section.indexOf('<h5 class="state-screen-subheading"', start + startMarker.length);
  const candidates = [nextH3, nextH5].filter((index) => index !== -1);
  const nextHeading = candidates.length > 0 ? Math.min(...candidates) : -1;
  return nextHeading === -1 ? section.slice(start) : section.slice(start, nextHeading);
}

function stateSectionContaining(html: string, state: string, text: string): string {
  const sectionPattern = new RegExp(`<section class="doc-section state-screen-section"(?=[^>]*\\bdata-state="${escapeRegExp(state)}")[^>]*>[\\s\\S]*?(?=<section class="doc-section state-screen-section"|$)`, "gu");
  const sections = [...html.matchAll(sectionPattern)].map((match) => match[0]);
  const section = sections.find((candidate) => candidate.includes(text));
  assert(section, `missing state section ${state} containing ${text}`);
  return section;
}

function assertInOrder(source: string, labels: string[]): void {
  let offset = -1;
  for (const label of labels) {
    const next = source.indexOf(label, offset + 1);
    assert.notEqual(next, -1, `missing ${label}`);
    assert(next > offset, `${label} should appear after previous label`);
    offset = next;
  }
}

function assertPatternsInOrder(source: string, patterns: RegExp[]): void {
  let offset = -1;
  for (const pattern of patterns) {
    const match = pattern.exec(source.slice(offset + 1));
    assert(match, `missing ${pattern}`);
    offset += match.index + 1;
  }
}

function numberedHeadingPattern(level: 2 | 3 | 4, label: string, attributes = ""): RegExp {
  const headingAttributes = attributes || "[^>]*";
  return new RegExp(`<h${level}${headingAttributes}>\\s*<span class="section-number">[\\d.]+\\.</span>\\s*${escapeRegExp(label)}`);
}

function docSectionByHeading(html: string, label: string, nextLabel?: string): string {
  const startPattern = new RegExp(`<section class="doc-section"[^>]*>\\s*<h2[^>]*>\\s*(?:<span class="section-number">[\\d.]+\\.</span>\\s*)?${escapeRegExp(label)}(?:<\\/h2>|[\\s<])`);
  const startMatch = startPattern.exec(html);
  assert(startMatch, `missing section ${label}`);
  const start = startMatch.index;
  if (!nextLabel) {
    const next = html.indexOf(`<section class="doc-section"`, start + startMatch[0].length);
    return next === -1 ? html.slice(start) : html.slice(start, next);
  }
  const nextPattern = new RegExp(`<section class="doc-section"[^>]*>\\s*<h2[^>]*>\\s*(?:<span class="section-number">[\\d.]+\\.</span>\\s*)?${escapeRegExp(nextLabel)}(?:<\\/h2>|[\\s<])`);
  const nextMatch = nextPattern.exec(html.slice(start + startMatch[0].length));
  return nextMatch ? html.slice(start, start + startMatch[0].length + nextMatch.index) : html.slice(start);
}

function expandSnippetBody(body: string[]): string {
  return body.join("\n")
    .replace(/\$\{\d+\|([^|}]*)\|\}/g, (_match, choices: string) => choices.split(",")[0] ?? "")
    .replace(/\$\{\d+:([^}]*)\}/g, "$1")
    .replace(/\$\{\d+\}/g, "")
    .replace(/\$\d+/g, "");
}

function createTextDocument(source: string, filePath = "/workspace/example.vspec.md") {
  const lines = source.split(/\r?\n/);
  return {
    getText: () => source,
    lineAt: (line: number) => ({ text: lines[line] ?? "" }),
    lineCount: lines.length,
    uri: { scheme: "file", fsPath: filePath },
    languageId: "markvspec",
    fileName: filePath
  };
}

function createDiagnostic(source: string, lineText: string, message: string): vscode.Diagnostic {
  const line = source.split(/\r?\n/).findIndex((candidate) => candidate === lineText);
  assert.notEqual(line, -1, lineText);
  const diagnostic = new vscode.Diagnostic(
    new vscode.Range(line, 0, line, lineText.length),
    message,
    vscode.DiagnosticSeverity.Warning
  );
  diagnostic.source = "MarkVSpec";
  return diagnostic;
}

test("renders generated design document sections without launching VS Code", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  result.screen.locale = "en";
  const preview = renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false });
  const html = renderDesignDocumentHtml(result, preview);

  assert.match(html, /<section class="doc-section screen-spec-section">/);
  assertPatternsInOrder(html, [
    /<h2 id="screen">Screen<\/h2>/,
    /<nav class="toc-inline"/,
    numberedHeadingPattern(2, "States"),
    numberedHeadingPattern(2, "State Flow"),
    numberedHeadingPattern(2, "State Views"),
    numberedHeadingPattern(3, "Viewport mobile<span class=\"state-badge\">Default</span>"),
    new RegExp(`<h4 class="state-screen-heading">\\s*<span class="section-number">3\\.1\\.1\\.</span>\\s*State: ${docLabel("idle", "state", "state-label")}<span class="state-badge">initial</span></h4>`),
    numberedHeadingPattern(2, "Action Details"),
    numberedHeadingPattern(2, "Validations"),
    numberedHeadingPattern(2, "Business Rules"),
    numberedHeadingPattern(2, "Error Codes"),
    numberedHeadingPattern(2, "Screen Transitions"),
    numberedHeadingPattern(2, "State Transitions"),
    numberedHeadingPattern(2, "Diagnostics")
  ]);
  assert.doesNotMatch(html, /<h2>Free-form Sections<\/h2>/);
  assert.doesNotMatch(html, /<h2>Free-form Sections<\/h2>\s*<p class="spec-empty">None\.<\/p>/);
  assert.doesNotMatch(html, /<section class="doc-section note-section">/);
  assert.match(html, /<div class="screen-id"><code>SCR-LOGIN<\/code><\/div>/);
  assert.match(html, /<div class="screen-title">Login<\/div>/);
  assert.match(html, /<h3>Basic Info<\/h3>/);
  assert.match(html, /<dt>Route<\/dt><dd>\/login<\/dd>/);
  assert.doesNotMatch(html, /<dt>Viewport<\/dt>/);
  assert.doesNotMatch(html, /<dt>Version<\/dt>/);
  assert.doesNotMatch(html, /<dt>Date<\/dt>/);
  assert.doesNotMatch(html, /<dt>Author<\/dt>/);
  const statesSection = docSectionByHeading(html, "States", "State Flow");
  const statesTable = statesSection.match(/<div class="spec-table-wrap"><table class="spec-table">[\s\S]*?<\/table><\/div>/)?.[0] ?? "";
  assert.match(statesTable, new RegExp(`<td>${docLabel("idle", "state")}</td><td>yes</td>`));
  assert.match(statesTable, new RegExp(`<td>${docLabel("authenticating", "state")}</td><td>-</td>`));
  assert.doesNotMatch(statesTable, /<td>no<\/td>/);
  assert.match(html, /<section class="doc-section state-views-section" data-section-number="3">/);
  assert.match(html, numberedHeadingPattern(2, "State Views"));
  assert.match(html, /<section class="state-viewport-section"(?=[^>]*\bdata-section-number="3\.1")(?=[^>]*\bdata-viewport="mobile")[^>]*>\s*<h3>\s*<span class="section-number">3\.1\.<\/span>\s*Viewport mobile<span class="state-badge">Default<\/span><\/h3>/);
  assert.match(html, /<section class="doc-section state-screen-section" data-section-number="3\.1\.1" data-state-view-title="idle" data-state="idle" data-viewport="mobile" style="--markvspec-viewport-width:390px;--markvspec-print-scale:1">/);
  assert.match(html, new RegExp(`<h4 class="state-screen-heading">\\s*<span class="section-number">3\\.1\\.1\\.</span>\\s*State: ${docLabel("idle", "state", "state-label")}<span class="state-badge">initial</span></h4>`));
  assert.match(html, /<section class="doc-section state-screen-section" data-section-number="3\.2\.1" data-state-view-title="idle" data-state="idle" data-viewport="desktop" style="--markvspec-viewport-width:960px;--markvspec-print-scale:1">/);
  assert.match(html, /<section class="state-viewport-section"(?=[^>]*\bdata-section-number="3\.2")(?=[^>]*\bdata-viewport="desktop")[^>]*>\s*<h3>\s*<span class="section-number">3\.2\.<\/span>\s*Viewport desktop<\/h3>/);
  assert.match(html, /<h5 class="state-screen-subheading">Wireframe<\/h5>/);
  assert.match(html, /<h5 class="state-screen-subheading">Elements<\/h5>/);
  assert.match(html, /<h5 class="state-screen-subheading">Actions<\/h5>/);
  assert.match(html, /data-state-view-title="idle \/ idle-validation-error" data-state="idle" data-viewport="mobile"/);
  assert.doesNotMatch(html, /<h5 class="state-screen-subheading">Element Changes<\/h5>/);
  assert.doesNotMatch(html, /<h5 class="state-screen-subheading">Available Actions<\/h5>/);
  assert.doesNotMatch(html, /<h2>Elements<\/h2>/);
  assert.doesNotMatch(html, /<h2>State Wireframes<\/h2>/);
  assert.doesNotMatch(html, /<h2>Input \/ Validation<\/h2>/);
  assert.doesNotMatch(html, /<h2>Visibility \/ Availability<\/h2>/);
  assert.doesNotMatch(html, /<h2>Partial Updates<\/h2>/);
  assert.doesNotMatch(html, /<article class="partial-update-group">|partial-update-meta/);
  assert.doesNotMatch(html, /<th>Case<\/th><th>Target<\/th><th>Fragment \/ Content<\/th><th>Outcome<\/th>/);
  assert.doesNotMatch(html, /<th>Action<\/th><th>Trigger<\/th><th>Case<\/th>/);
  assert.match(html, numberedHeadingPattern(2, "Action Details"));
  assert.match(html, numberedHeadingPattern(2, "State Flow"));
  assert.match(html, numberedHeadingPattern(2, "Screen Transitions"));
  assert.match(html, numberedHeadingPattern(2, "Validations"));
  assert.doesNotMatch(html, /<h2>Revision History/);
  assert.doesNotMatch(html, /<h2>Field Definitions/);
  assert.doesNotMatch(html, /<h2>Messages <span class="note-line">/);
  assert.doesNotMatch(html, /<h2>Permissions <span class="note-line">/);
  assert.doesNotMatch(html, /<h2>PDF \/ Export Notes<\/h2>|MarkVSpec: Export PDF/);
  assert.match(html, /<nav class="toc-inline" aria-label="Contents">\s*<div class="toc-title">Contents<\/div>\s*<ol class="toc-list" data-toc-list aria-busy="true" aria-live="polite"><li class="toc-status is-loading" data-toc-status>Building contents\.\.\.<\/li><\/ol>\s*<\/nav>/);
  assert.match(html, /<div class="spec-table-wrap"><table class="spec-table">/);
  assert.match(html, /<section class="doc-section state-flow-section" data-section-number="2">/);
  assert.match(html, /<h6 class="state-screen-detail-heading">Element Summary<\/h6>/);
  assert.match(html, /<div class="element-detail-group"><h6 class="state-screen-detail-heading">Input Form Spec<\/h6>/);
  assert.match(html, new RegExp(`<td>${detailElementRef("3", "E-EmailInput")}</td><td>Input</td><td>no</td><td>${sourceCodePattern("${data.email}")}</td><td>${sourceTypeChipPattern("fixed")}</td><td>-</td><td>${defaultAlwaysPattern()}</td>`));
  assert.match(html, new RegExp(`<td>${detailElementRef("6", "E-RememberMe")}</td><td>Checkbox</td><td>no</td><td>${sourceCodePattern("${data.rememberMe}")}</td><td>${sourceTypeChipPattern("fixed")}</td><td>-</td><td>${defaultAlwaysPattern()}</td>`));
  assert.match(html, /Enter both email and password\./);
  assert.match(html, new RegExp(`email: ${detailElementRef("3", "E-EmailInput")}\\.value`));
  assert.match(html, new RegExp(`rememberMe: ${detailElementRef("6", "E-RememberMe")}\\.value`));
  assert.match(html, new RegExp(`<td>${detailLayoutRefById("L2", "L-LoginForm")}</td><td>stack</td><td>${specSectionPattern("Setting", ["gap: md"])}[\\s\\S]*?</td><td><ul class="spec-list"><li>disabled: authenticating</li></ul></td>`));
  assert.doesNotMatch(html, new RegExp(`<li>${detailIdRef("P-EmailField")}</li>`));
  assert.match(html, /element[\s\S]*E-ValidationMessage/);
  assert.match(html, new RegExp(`set state ${docLabel("idle", "state")}[\\s\\S]*element[\\s\\S]*E-AuthErrorBanner`));
  const actionDetailsSection = docSectionByHeading(html, "Action Details", "Validations");
  const submitActionDetail = actionDetailsSection.match(/<article class="action-detail">\s*<h3 id="action-detail-A-SubmitLogin">[\s\S]*?<\/article>/)?.[0] ?? "";
  const responseActionDetail = actionDetailsSection.match(/<article class="action-detail">\s*<h3 id="action-detail-A-HandleLoginResponse">[\s\S]*?<\/article>/)?.[0] ?? "";
  assert.match(actionDetailsSection, new RegExp(`<h3 id="action-detail-A-SubmitLogin">${actionBadge("A1", "A-SubmitLogin", false)} Submit login</h3>`));
  assert.doesNotMatch(actionDetailsSection, /<dt>Transitions<\/dt>/);
  assert.doesNotMatch(actionDetailsSection, /<dt>Kind<\/dt>/);
  assert.match(actionDetailsSection, new RegExp(`<dt>Trigger</dt>[\\s\\S]*<dt>Process</dt>[\\s\\S]*<dt>State Changes</dt>`));
  assert.match(responseActionDetail, /<dt>Navigation<\/dt>/);
  assert.doesNotMatch(submitActionDetail, /<dt>Request<\/dt>|<dt>Parameters<\/dt>/);
  assert.match(submitActionDetail, /<dt>Process<\/dt><dd>[\s\S]*Submit login[\s\S]*element[\s\S]*E-RequestErrorBanner/);
  assert.match(responseActionDetail, /<dt>Process<\/dt><dd>[\s\S]*Handle response[\s\S]*element[\s\S]*E-AuthErrorBanner/);
  assert.match(submitActionDetail, /<dt>Overview<\/dt><dd><div class="entity-overview">[\s\S]*Validate required fields and submit the current form values/);
  assert.match(submitActionDetail, /<dt>Notes<\/dt><dd><div class="entity-notes">[\s\S]*The [\s\S]*sent[\s\S]* case means only that the browser submitted the request/);
  assert.match(submitActionDetail, new RegExp(`<dt>From</dt><dd>${docLabel("idle", "state")}</dd>`));
  assert.match(actionDetailsSection, new RegExp(`<dt>Trigger</dt><dd>${detailElementRef("7", "E-SignInButton")}\\.click</dd>`));
  assert.doesNotMatch(actionDetailsSection, /<dt>When<\/dt>|<dt>Availability<\/dt>|condition-expression/);
  assert.match(actionDetailsSection, new RegExp(`email: ${detailElementRef("3", "E-EmailInput")}\\.value`));
  assert.match(actionDetailsSection, new RegExp(`rememberMe: ${detailElementRef("6", "E-RememberMe")}\\.value`));
  assert.match(actionDetailsSection, /element[\s\S]*E-AuthErrorBanner/);
  assert.doesNotMatch(actionDetailsSection, /id="action-detail-A-AuthResponse"/);
  assert.match(submitActionDetail, /description: required field missing/);
  assert.match(submitActionDetail, /description: all required fields are valid/);
  assert.match(submitActionDetail, new RegExp(`<strong>${docLabel("sent", "result")}</strong>[\\s\\S]*effect set state ${docLabel("authenticating", "state")}`));
  assert.match(submitActionDetail, new RegExp(`<strong>${docLabel("send-failed", "result")}</strong>[\\s\\S]*effect set state ${docLabel("idle", "state")}`));
  assert.match(responseActionDetail, new RegExp(`<strong>${docLabel("success", "result")}</strong>[\\s\\S]*response 200 authenticated[\\s\\S]*effect navigate to ${documentRef("SCR-HOME")}`));
  assert.match(responseActionDetail, new RegExp(`<strong>${docLabel("failure", "result")}</strong>[\\s\\S]*response 401 invalid credentials[\\s\\S]*effect set state ${docLabel("idle", "state")}`));
  assert.match(html, /stateDiagram-v2\n  direction TB/);
  assert.doesNotMatch(html, /Handle login response \/ success \/ navigate/);
  assert.match(html, /Handle login response \/ failure/);
  assert.match(html, new RegExp(`${actionBadge("A1", "A-SubmitLogin")}[\\s\\S]*Submit login[\\s\\S]*${docLabel("idle", "state")}[\\s\\S]*${docLabel("sent", "result")}[\\s\\S]*${docLabel("authenticating", "state")}`));
  assert.match(html, new RegExp(`<td>${docLabel("A-SubmitLogin.P2.response", "trigger")}</td><td>${refActionChip("A2", "A-HandleLoginResponse", "Handle login response")}<ul class="spec-list"><li>Case: ${docLabel("success", "result")}</li></ul></td><td>${docLabel("authenticating", "state")}</td><td>screen ${documentRef("SCR-HOME")}</td><td>-</td>`));
  assert.match(html, new RegExp(`<td>${detailElementRef("8", "E-ForgotPasswordLink")}\\.click</td><td>${refActionChip("A3", "A-ForgotPassword", "Open password reset")}</td><td>${docLabel("idle", "state")}</td><td>screen ${documentRef("SCR-PASSWORD-RESET")}</td><td>-</td>`));
  assert.match(html, /data-state-view-title="authenticating" data-state="authenticating" data-viewport="mobile"/);
  const waitAuthSection = viewportStateSection(html, "authenticating", "mobile");
  assert.match(waitAuthSection, /<h6 class="state-screen-detail-heading">Element Summary<\/h6>/);
  assert.match(waitAuthSection, /<th>Marker\/ID<\/th><th>Type<\/th><th>Triggered Actions<\/th><th>Description<\/th>/);
  assert.match(waitAuthSection, new RegExp(`<td>${detailElementRef("11", "E-AuthSpinner")}</td><td>Spinner</td><td>-</td><td>-</td>`));
  assert.match(waitAuthSection, /<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>/);
  assert.match(waitAuthSection, new RegExp(`<td>${detailElementRef("11", "E-AuthSpinner")}</td><td>label</td><td>Signing in\\.\\.\\.</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td><td>${specSectionPattern("Visible", ["visible: authenticating"])}</td>`));
  assert.match(waitAuthSection, new RegExp(`<td>${refActionChip("A2", "A-HandleLoginResponse", "Handle login response")}</td>`));
  const waitAuthWireframe = stateWireframeSection(waitAuthSection);
  assert.match(waitAuthWireframe, />L7<\/code>/);
  assert.match(waitAuthWireframe, />11<\/code>/);
  assert.match(waitAuthWireframe, /data-mm-id="L-Page"/);
  assert.match(waitAuthWireframe, />L2<\/code>/);
  assert.match(waitAuthWireframe, />3<\/code>/);
  const validationErrorSection = stateViewTitleSection(html, "idle / idle-validation-error");
  const validationWireframe = stateWireframeSection(validationErrorSection);
  assert.match(validationWireframe, />4<\/code>/);
  assert.match(validationWireframe, />A1<\/code>/);
  assert.match(validationWireframe, /data-mm-id="L-Page"/);
  assert.match(validationWireframe.split('<aside class="system-events-box">')[0], />3<\/code>/);
  assert.match(html, /data-state-view-title="idle \/ idle-auth-error" data-state="idle" data-viewport="mobile"/);
  const authErrorSection = stateViewTitleSection(html, "idle / idle-auth-error");
  assert.match(authErrorSection, /The email address or password is incorrect\./);
  assert.match(authErrorSection, /data-mm-id="E-AuthErrorBanner"/);
  const authErrorWireframe = stateWireframeSection(authErrorSection);
  assert.match(authErrorWireframe, />9<\/code>/);
  assert.match(authErrorWireframe, />A1<\/code>/);
  const authErrorSystemEvents = authErrorSection.match(/<aside class="system-events-box">[\s\S]*?<\/aside>/)?.[0] ?? "";
  assert.doesNotMatch(authErrorSystemEvents, />A1<\/code>/);
  assert.match(authErrorWireframe, /data-mm-id="L-Page"/);
  assert.doesNotMatch(authErrorWireframe, />A3<\/code>/);
  const idleSection = viewportStateSection(html, "idle", "mobile");
  assert.doesNotMatch(idleSection, /The email address or password is incorrect\./);
  assert.doesNotMatch(idleSection, /data-mm-id="E-AuthErrorBanner"/);
  const desktopIdleSection = viewportStateSection(html, "idle", "desktop");
  assert.doesNotMatch(desktopIdleSection, /<h5 class="state-screen-subheading">Layout Changes<\/h5>/);
  assert.match(desktopIdleSection, /<h5 class="state-screen-subheading">Layouts<\/h5>/);
  assert.match(desktopIdleSection, new RegExp(`<td>${detailLayoutRefById("L8", "L-DesktopActions")}</td><td>row</td>`));
  const desktopAuthErrorSection = viewportStateViewTitleSection(html, "idle / idle-auth-error", "desktop");
  const desktopAuthErrorWireframe = stateWireframeSection(desktopAuthErrorSection);
  assert.match(desktopAuthErrorSection, /<h5 class="state-screen-subheading">Layouts<\/h5>/);
  assert.match(desktopAuthErrorSection, /<h5 class="state-screen-subheading">Elements<\/h5>/);
  assert.match(desktopAuthErrorSection, /data-repeated-layout-only-message/);
  assert.match(desktopAuthErrorSection, new RegExp(`<td>${detailLayoutRefById("L3", "L-MessageArea")} ${repeatedBadge()}</td>`));
  assert.match(desktopAuthErrorSection, new RegExp(`<td>${detailElementRef("9", "E-AuthErrorBanner")} ${repeatedBadge()}</td>`));
  assert.match(desktopAuthErrorWireframe, />L3<\/code>/);
  assert.match(desktopAuthErrorWireframe, />9<\/code>/);
  const desktopWaitAuthSection = viewportStateSection(html, "authenticating", "desktop");
  assert.match(desktopWaitAuthSection, /mm-repeated-badge/);
});

test("renders non-initial states as dashes in localized state summaries", () => {
  const source = `---
id: SCR-JA-STATES
type: screen
title: Japanese States
locale: ja
---

# SCR-JA-STATES Japanese States

## States

- idle*
  - 初期状態
- loaded
  - 読み込み済み
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const statesSection = docSectionByHeading(html, "状態", "状態フロー");
  const statesTable = statesSection.match(/<div class="spec-table-wrap"><table class="spec-table">[\s\S]*?<\/table><\/div>/)?.[0] ?? "";

  assert.match(statesTable, new RegExp(`<td>${docLabel("idle", "state")}</td><td>はい</td>`));
  assert.match(statesTable, new RegExp(`<td>${docLabel("loaded", "state")}</td><td>-</td>`));
  assert.doesNotMatch(statesTable, /<td>いいえ<\/td>/);
});

test("localizes Action/Process diagnostics in preview diagnostics with the VS Code diagnostic formatter", () => {
  const source = `---
id: SCR-DIAG-I18N-PREVIEW
type: screen
title: Diagnostic i18n Preview
locale: ja
---

# SCR-DIAG-I18N-PREVIEW Diagnostic i18n Preview

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Submit

## Elements

### E-Submit Button

- label: Submit
- action: A-Invalid

## Actions

### A-Invalid Invalid

- Triggered
  - E-Submit.click
- From
  - idle
- Process P1: Validate and update
  - receive:
    - validation: V-Form.result
  - state: idle
`;
  const result = parseMarkVSpec(source);
  const diagnostic = result.diagnostics.find((candidate) => candidate.code === "action.process.mixesResultClassificationAndImmediateEffects");
  assert(diagnostic);

  const localizedMessage = renderDiagnosticMessageForLocale(diagnostic, result.screen.locale);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));

  assert.match(html, new RegExp(escapeRegExp(localizedMessage)));
  assert.doesNotMatch(html, /mixes result classification with direct immediate effects/);
  assert.equal(localizedMessage, "Action A-Invalid の Process step P1 Validate and update で、result 分類と直接の immediate effect が混在しています。分類された result には case Effects を使ってください。");
});

test("keeps presentation panels out of generated layout specs", () => {
  const source = `---
id: SCR-PRESENTATION
type: screen
title: Presentation Panel
locale: en
---

# SCR-PRESENTATION Presentation Panel

## States

- idle*

## Layout: mobile

### L-Page Page

- stack
- marker: L1

#### Items

- P-Fields

### P-Fields Fields

- row
- gap: sm

#### Items

- E-Email
- E-Password

## Elements

### E-Email TextInput

- label: Email

### E-Password TextInput

- label: Password
`;
  const result = parseMarkVSpec(source);
  const preview = renderMarkVSpecHtml(result, { includeStyles: false });
  const html = renderDesignDocumentHtml(result, preview);
  const layoutsFragment = html.match(/<div class="layout-spec-fragment"[\s\S]*?<\/div>\s*<\/section>/)?.[0] ?? "";

  assert.match(html, /data-mm-id="P-Fields"/);
  assert.match(html, /mm-layout-presentation/);
  assert.doesNotMatch(html, />P-Fields<\/code>/);
  assert.match(layoutsFragment, /L-Page/);
  assert.doesNotMatch(layoutsFragment, /P-Fields/);
});

test("renders design document labels with external renderer messages", () => {
  const result = parseMarkVSpec(`---
id: SCR-MESSAGES
type: screen
title: Messages
locale: ja
---

# SCR-MESSAGES Messages

## States

- empty*
- loaded

## Elements

### E-Name Input

- label: 名前
- required
- visible when: loaded
`);
  result.screen.locale = "ja";
  const messages = {
    ...messagesForLocale("ja"),
    inputFormSpec: "入力値",
    noVisibleElements: "表示対象なし",
    requiredYes: "必須",
    wireframe: "画面プレビュー"
  };

  const preview = renderMarkVSpecHtml(result, {
    includeStyles: false,
    messages,
    state: "empty"
  });
  const html = renderDesignDocumentHtml(result, preview, { messages });

  assert.match(html, /<h5 class="state-screen-subheading">画面プレビュー<\/h5>/);
  assert.match(html, /class="mm-wireframe mm-wireframe-empty"/);
  assert.match(html, /表示対象なし/);
  assert.match(html, /<div class="element-detail-group"(?: data-mm-repeated-empty="true")?><h6 class="state-screen-detail-heading">入力値<\/h6>/);
  assert.match(html, /<td>必須<\/td>/);
  assert.doesNotMatch(html, /<h4>フォーム要素<\/h4>/);
  assert.doesNotMatch(html, /data-repeated-layout-only-message/);
});

test("loads renderer messages from a workspace message file for preview documents", () => {
  const dir = mkdtempSync(join(tmpdir(), "markvspec-vscode-messages-"));
  try {
    const sourcePath = join(dir, "screen.vspec.md");
    writeFileSync(join(dir, "markvspec.messages.ja.yml"), `locale: ja
messages:
  inputFormSpec: 入力値
  wireframe: 画面プレビュー
`);
    const document = createTextDocument(`---
id: SCR-MESSAGES-FILE
type: screen
title: Messages File
locale: ja
---

# SCR-MESSAGES-FILE Messages File

## Elements

### E-Name Input

- label: 名前

## Layouts

### L-Root Root

#### Items

- E-Name
`, sourcePath) as vscode.TextDocument;

    const loaded = loadScreenDocumentResult(document);
    const html = renderDesignDocumentHtml(loaded.result, "");

    assert.match(html, /<h5 class="state-screen-subheading">画面プレビュー<\/h5>/);
    assert.match(html, /<div class="element-detail-group"><h6 class="state-screen-detail-heading">入力値<\/h6>/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("explains markers in initial state wireframes", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const preview = renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false });
  const html = renderDesignDocumentHtml(result, preview);
  const idleSection = stateSection(html, "idle");
  const wireframeSection = idleSection.match(/<h5 class="state-screen-subheading">Wireframe<\/h5>[\s\S]*?<h5 class="state-screen-subheading">Elements<\/h5>/)?.[0] ?? "";

  assert.match(wireframeSection, /<h5 class="state-screen-subheading">Wireframe<\/h5>/);
  assert.match(wireframeSection, />1<\/code>/);
  assert.match(wireframeSection, />3<\/code>/);
  assert.match(wireframeSection, />7<\/code>/);
  assert.match(wireframeSection, />A1<\/code>/);
});

test("orders state previews from the initial state and renders current state specs", () => {
  const source = `---
id: SCR-STATE-VIEWS
type: screen
title: State Views
locale: en
default-state: loaded
---

# SCR-STATE-VIEWS State Views

## States

- initializing*
- loading
- loaded
- load-error
- ready
- ready-auto

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Initializing
- E-Loading
- E-Loaded
- E-LoadError
- E-Ready
- E-ReadyAuto

## Elements

### 1:E-Initializing Text

- sample: Initializing
- visible when: initializing

### 2:E-Loading Text

- sample: Loading
- visible when: loading

### 3:E-Loaded Text

- sample: Loaded
- visible when: loaded

### 4:E-LoadError Alert

- sample: Failed
- tone: danger
- visible when: load-error

### 5:E-Ready Text

- sample: Ready
- visible when: ready

### 6:E-ReadyAuto Text

- sample: Ready Auto
- visible when: ready-auto

## Actions

### A1:A-StartLoad Start load

- Triggered
  - screen.load
- From
  - initializing
- Process P1: Immediate
  - Effects
    - state: loading

### A2:A-HandleLoadResponse Handle load response

- Triggered
  - A-StartLoad.P1.response
- From
  - loading
- Process P1: Immediate
  - case: success
    - response: 200
    - state: loaded
  - case: failure
    - response: 500
    - state: load-error

### A3:A-ResolveReady Resolve ready

- Triggered
  - A-HandleLoadResponse.P1.response
- From
  - loading
  - initializing
- Process P1: Immediate
  - Effects
    - state: ready

### A4:A-ResolveReadyAuto Resolve ready automatically

- Triggered
  - A-HandleLoadResponse.P1.response
- From
  - loading
  - initializing
- Process P1: Immediate
  - Effects
    - state: ready-auto
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false }));

  const sectionMatches = [...html.matchAll(/<section class="doc-section state-screen-section"[^>]*\bdata-state="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(sectionMatches.slice(0, 5), ["initializing", "loading", "loaded", "load-error", "ready"]);
  assert.match(html, new RegExp(`<h4 class="state-screen-heading">\\s*<span class="section-number">3\\.1\\.1\\.</span>\\s*State: ${docLabel("initializing", "state", "state-label")}<span class="state-badge">initial</span></h4>`));

  const initializingSection = stateSection(html, "initializing");
  assert.match(initializingSection, /<aside class="system-events-box">\s*<h6 class="state-screen-detail-heading">System Events<\/h6>/);
  assert.match(initializingSection, new RegExp(`<ul>[\\s\\S]*<li>${actionBadge("A1", "A-StartLoad")} Start load<span class="system-event-trigger">（Trigger: ${docLabel("screen.load", "trigger")}）</span></li>`));
  assert.match(initializingSection, new RegExp(`<li>${actionBadge("A3", "A-ResolveReady")} Resolve ready<span class="system-event-trigger">（Trigger: ${docLabel("A-HandleLoadResponse.P1.response", "trigger")}）</span></li>`));
  assert.doesNotMatch(initializingSection.match(/<aside class="system-events-box">[\s\S]*?<\/aside>/)?.[0] ?? "", /From:/);

  const loadingSection = stateSection(html, "loading");
  assert.match(loadingSection, /<aside class="system-events-box">\s*<h6 class="state-screen-detail-heading">System Events<\/h6>/);
  assert.match(loadingSection, new RegExp(`<li>${actionBadge("A2", "A-HandleLoadResponse")} Handle load response<span class="system-event-trigger">（Trigger: ${docLabel("A-StartLoad.P1.response", "trigger")}）</span></li>`));
  assert.match(loadingSection, new RegExp(`<li>${actionBadge("A3", "A-ResolveReady")} ${repeatedBadge()} Resolve ready<span class="system-event-trigger">（Trigger: ${docLabel("A-HandleLoadResponse.P1.response", "trigger")}）</span></li>`));
  assert.doesNotMatch(loadingSection.match(/<aside class="system-events-box">[\s\S]*?<\/aside>/)?.[0] ?? "", /From:/);
  assert.match(loadingSection, new RegExp(`<td>${detailElementRef("2", "E-Loading")}</td><td>Text</td>`));
  assert.doesNotMatch(loadingSection, new RegExp(`<td>${detailElementRef("1", "E-Initializing")}</td><td>Text</td>`));

  const loadedSection = stateSection(html, "loaded");
  assert.doesNotMatch(loadedSection, /system-events-box/);
  assert.match(loadedSection, new RegExp(`<td>${detailElementRef("3", "E-Loaded")}</td><td>Text</td>`));
  assert.doesNotMatch(loadedSection, new RegExp(`<td>${detailElementRef("2", "E-Loading")}</td><td>Text</td>`));

  const loadErrorSection = stateSection(html, "load-error");
  assert.match(loadErrorSection, new RegExp(`<td>${detailElementRef("4", "E-LoadError")}</td><td>Alert</td>`));
  assert.doesNotMatch(loadErrorSection, new RegExp(`<td>${detailElementRef("2", "E-Loading")}</td><td>Text</td>`));

  const readySection = stateSection(html, "ready");
  assert.match(readySection, new RegExp(`<td>${detailElementRef("5", "E-Ready")}</td><td>Text</td>`));
  assert.doesNotMatch(readySection, new RegExp(`<td>${detailElementRef("2", "E-Loading")}</td><td>Text</td>`));

  const readyAutoSection = stateSection(html, "ready-auto");
  assert.match(readyAutoSection, new RegExp(`<td>${detailElementRef("6", "E-ReadyAuto")}</td><td>Text</td>`));
  assert.doesNotMatch(readyAutoSection, new RegExp(`<td>${detailElementRef("1", "E-Initializing")}</td><td>Text</td>`));
});

test("builds state screen read models for each current state", () => {
  const source = `---
id: SCR-STATE-READ-MODEL
type: screen
title: State Read Model
locale: en
---

# SCR-STATE-READ-MODEL State Read Model

## States

- idle*
- loaded

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Idle
- E-Loaded
- E-Flag

## Elements

### 1:E-Idle Text

- sample: Idle
- visible when: idle

### 2:E-Loaded Text

- sample: Loaded
- visible when: loaded

### 3:E-Flag Text

- sample: Loaded flag
- visible when: \${model.loaded}

## Actions

### A1:A-Load Load

- Triggered
  - screen.load
- From
  - idle
- Process P1: Immediate
  - case: success
    - model: \${model.loaded} = true
    - state: loaded
`;
  const result = parseMarkVSpec(source);
  const models = buildStateScreenReadModels(result, result, "mobile", undefined, {
    label: (key) => key === "default" ? "Default viewport" : "Viewport"
  });

  assert.equal(models.length, 2);
  assert.equal(models[0]?.stateName, "idle");
  assert.equal(models[0]?.title, "Default viewport Viewport mobile");
  assert.equal("wireframeHtml" in (models[0] ?? {}), false);
  assert.equal("rawWireframeHtml" in (models[0] ?? {}), false);
  assert.deepEqual(models[0]?.modelValues, {});
  assert(models[0]?.renderedIds.elementIds.has("E-Idle"));
  assert(!models[0]?.renderedIds.elementIds.has("E-Flag"));

  assert.equal(models[1]?.stateName, "loaded");
  assert.equal("wireframeHtml" in (models[1] ?? {}), false);
  assert.equal("rawWireframeHtml" in (models[1] ?? {}), false);
  assert.equal(models[1]?.modelValues["model.loaded"], true);
  assert(models[1]?.renderedIds.elementIds.has("E-Loaded"));
  assert(models[1]?.renderedIds.elementIds.has("E-Flag"));
});

test("renders later state views as current visible specs", () => {
  const source = `---
id: SCR-CHANGED-DIFF
type: screen
title: Changed Diff
locale: en
---

# SCR-CHANGED-DIFF Changed Diff

## States

- idle*
- loaded

## Layout: mobile

### L1:L-Page Page

- stack
- disabled when: loaded

#### Items

- L-IdleOnly
- L-LoadedOnly
- E-Submit

### L2:L-IdleOnly Idle Only

- stack
- visible when: idle

#### Items

- E-IdleOnly

### L3:L-LoadedOnly Loaded Only

- stack
- visible when: loaded

#### Items

- E-LoadedOnly

## Elements

### E-Submit Button

- label: Submit
- disabled when: loaded
- action: A-Submit

### E-IdleOnly Text

- value: Idle only

### E-LoadedOnly Text

- value: Loaded only

## Actions

### A1:A-Submit Submit

- Triggered
  - E-Submit.click
- From
  - idle
  - loaded
- Process: HttpRequest
  - POST /submit
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const loadedSection = stateSection(html, "loaded");
  assert.doesNotMatch(loadedSection, /Layout Changes|Element Changes|Available Actions/);
  assert.match(loadedSection, /<h5 class="state-screen-subheading">Layouts<\/h5>/);
  assert.match(loadedSection, /<h5 class="state-screen-subheading">Elements<\/h5>/);
  assert.match(loadedSection, /<h5 class="state-screen-subheading">Actions<\/h5>/);
  assert.match(loadedSection, new RegExp(`<td>${detailLayoutRefById("L1", "L-Page")} ${repeatedBadge()}</td><td>stack</td>`));
  assert.doesNotMatch(loadedSection, new RegExp(`<td>${markerBadge("L2", "layout")}</td><td>${detailIdRef("L-IdleOnly")}`));
  assert.match(loadedSection, new RegExp(`<td>${detailLayoutRefById("L3", "L-LoadedOnly")}</td><td>stack</td>`));
  assert.match(loadedSection, new RegExp(`<td>${detailElementRef("E-Submit", "E-Submit")} ${repeatedBadge()}</td><td>Button</td>`));
  assert.doesNotMatch(loadedSection, new RegExp(`<td>${markerBadge("E-IdleOnly", "element")}</td><td>${detailIdRef("E-IdleOnly")}`));
  assert.match(loadedSection, new RegExp(`<td>${detailElementRef("E-LoadedOnly", "E-LoadedOnly")}</td><td>Text</td>`));
  assert.match(loadedSection, new RegExp(`<td>${refActionChip("A1", "A-Submit", "Submit")} ${repeatedBadge()}</td>`));
});

test("omits legacy state change sections while keeping current changed specs", () => {
  const source = `---
id: SCR-CHANGED-ONLY-SPECS
type: screen
title: Changed Only Specs
locale: en
---

# SCR-CHANGED-ONLY-SPECS Changed Only Specs

## States

- idle*
- loaded

## Layout: mobile

### L1:L-Page Page

- stack
- disabled when: loaded

#### Items

- E-Submit

## Elements

### E-Submit Button

- label: Submit
- disabled when: loaded
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const loadedSection = stateSection(html, "loaded");

  assert.doesNotMatch(loadedSection, /<h5 class="state-screen-subheading">Layout Changes<\/h5>/);
  assert.doesNotMatch(loadedSection, /<h5 class="state-screen-subheading">Element Changes<\/h5>/);
  assert.doesNotMatch(loadedSection, /<h6 class="state-screen-detail-heading">Element Difference Summary<\/h6>/);
  assert.doesNotMatch(loadedSection, /<p class="spec-empty">None<\/p>/);
  assert.match(loadedSection, />L1<\/code>/);
  assert.match(loadedSection, />E-Submit<\/code>/);
});

test("renders state action availability as current actions without removed actions", () => {
  const source = `---
id: SCR-ACTION-AVAILABILITY
type: screen
title: Action Availability
locale: en
---

# SCR-ACTION-AVAILABILITY Action Availability

## States

- idle*
- loaded

## Layout: mobile

### L1:L-Page Page

- stack

## Actions

### A1:A-Shared Shared action

- Triggered
  - screen.load
- From
  - idle
  - loaded
- Process: Immediate
  - Effects
    - state: loaded

### A2:A-Removed Removed action

- Triggered
  - screen.load
- From
  - idle
- Process: Immediate
  - Effects
    - state: idle

### A3:A-New New action

- Triggered
  - screen.load
- From
  - loaded
- Process: Immediate
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const loadedSection = stateSection(html, "loaded");
  const availableActions = loadedSection.match(/<h5 class="state-screen-subheading">Actions<\/h5>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(availableActions, /<th>Action<\/th><th>Trigger<\/th>/);
  assert.doesNotMatch(availableActions, /<th>Kind<\/th>/);
  assert.doesNotMatch(availableActions, /<th>Marker<\/th>/);
  assert.doesNotMatch(availableActions, /<th>Name<\/th>/);
  assert.doesNotMatch(availableActions, /<th>Overview<\/th>/);
  assert.match(availableActions, new RegExp(`<td>${refActionChip("A1", "A-Shared", "Shared action")} ${repeatedBadge()}</td>`));
  assert.match(availableActions, new RegExp(`<td>${refActionChip("A3", "A-New", "New action")}</td>`));
  assert.doesNotMatch(availableActions, /Removed action/);
});

test("splits State Views layout properties into settings conditions items and notes", () => {
  const source = `---
id: SCR-LAYOUT-SPEC-COLUMNS
type: screen
title: Layout Spec Columns
locale: en
---

# SCR-LAYOUT-SPEC-COLUMNS Layout Spec Columns

## States

- idle*

## Layout: mobile

### L1:L-Page Page

- row
- align: center
- justify: between
- overlay: modal
- gap: sm
- visible when: idle
- hidden when: archived
- disabled when: saving
- selected when: current
- active when: editing

Layout note.

#### Items

- "Email": E-Email
- L-Child
- slot: content

### L2:L-Child Child

- stack

## Elements

### E-Email Input

- label: Email
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const idleSection = stateSection(html, "idle");
  const layouts = idleSection.match(/<h5 class="state-screen-subheading">Layouts<\/h5>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(layouts, /<th>Marker\/ID<\/th><th>Kind<\/th><th>Setting\/Items<\/th><th>Condition<\/th><th>Notes<\/th>/);
  assert.doesNotMatch(layouts, /<th>Settings<\/th>|<th>Conditions<\/th>|<th>Items<\/th>/);
  assert.doesNotMatch(layouts, /<th>Properties<\/th>/);
  assert.match(layouts, /<td><div class="spec-section"><strong>Setting<\/strong><ul class="spec-list"><li>align: center<\/li><li>justify: between<\/li><li>overlay: modal<\/li><li>gap: sm<\/li><\/ul><\/div><div class="spec-section"><strong>Items<\/strong>/);
  assert.match(layouts, /<td><ul class="spec-list"><li>visible: idle<\/li><li>hidden: archived<\/li><li>disabled: saving<\/li><li>selected: current<\/li><li>active: editing<\/li><\/ul><\/td>/);
  assert.match(layouts, new RegExp(`<strong>Items</strong><ul class="spec-list"><li>Email: ${detailIdRef("E-Email")}</li><li>${detailIdRef("L-Child")}</li><li>slot: content</li></ul>`));
  assert.match(layouts, /<td><div class="entity-notes"><p class="note-paragraph">Layout note\.<\/p><\/div><\/td>/);
  assert.match(layouts, new RegExp(`<td>${detailLayoutRefById("L2", "L-Child")}</td><td>stack</td><td>-</td><td>${defaultAlwaysPattern()}</td><td>-</td>`));
});

test("localizes unspecified State Views layout conditions as always", () => {
  const source = `---
id: SCR-JA-LAYOUT-CONDITIONS
type: screen
title: レイアウト条件
locale: ja
---

# SCR-JA-LAYOUT-CONDITIONS レイアウト条件

## States

- idle*

## Layout: mobile

### L1:L-Page Page

- stack

#### Items

- E-Title

## Elements

### E-Title Text

- value: Title
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const idleSection = stateSection(html, "idle");
  const layouts = idleSection.match(/<h5 class="state-screen-subheading">レイアウト<\/h5>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(layouts, /<th>番号\/ID<\/th><th>種別<\/th><th>設定\/項目<\/th><th>条件<\/th><th>備考<\/th>/);
  assert.match(layouts, new RegExp(`<td>${detailLayoutRefById("L1", "L-Page")}</td><td>stack</td><td><div class="spec-section"><strong>項目</strong><ul class="spec-list"><li>${detailIdRef("E-Title")}</li></ul></div></td><td>${defaultAlwaysPattern("常に")}</td><td>-</td>`));
});

test("renders State Views layout Marker/ID chips from the current viewport layout row", () => {
  const source = `---
id: SCR-LAYOUT-REF-VIEWPORT
type: screen
title: Layout Ref Viewport
---

# SCR-LAYOUT-REF-VIEWPORT Layout Ref Viewport

## States

- idle*

## Layout: mobile

### MOB:L-MessageArea Mobile message area

- stack

#### Items

- E-Message

## Layout: desktop

### DESK:L-MessageArea Desktop message area

- row

#### Items

- E-Message

## Elements

### E-Message Text

- value: Message
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const mobileLayouts = viewportStateSection(html, "idle", "mobile").match(/<h5 class="state-screen-subheading">Layouts<\/h5>[\s\S]*?<\/table>/)?.[0] ?? "";
  const desktopLayouts = viewportStateSection(html, "idle", "desktop").match(/<h5 class="state-screen-subheading">Layouts<\/h5>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(mobileLayouts, /data-mm-ref-id="L-MessageArea"[^>]*title="L-MessageArea Mobile message area"[\s\S]*>MOB<\/code> Mobile message area/);
  assert.doesNotMatch(mobileLayouts, /DESK<\/code> Desktop message area/);
  assert.match(desktopLayouts, /data-mm-ref-id="L-MessageArea"[^>]*title="L-MessageArea Desktop message area"[\s\S]*>DESK<\/code> Desktop message area/);
  assert.doesNotMatch(desktopLayouts, /MOB<\/code> Mobile message area/);
});

test("does not reintroduce legacy diff badge class names", () => {
  const source = `---
id: SCR-REPEATED-BADGE-CLASS
type: screen
title: Repeated Badge Class
locale: en
---

# SCR-REPEATED-BADGE-CLASS Repeated Badge Class

## States

- idle*
- loaded

## Layout: mobile

### L1:L-Page Page

- stack

#### Items

- E-Submit

## Elements

### E-Submit Button

- label: Submit

## Actions

### A1:A-Submit Submit

- Triggered
  - E-Submit.click
- From
  - idle
  - loaded
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const loadedSection = stateSection(html, "loaded");
  const availableActions = loadedSection.match(/<h5 class="state-screen-subheading">Actions<\/h5>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(availableActions, /mm-repeated-badge/);
  assert.doesNotMatch(html, /mm-diff-badge/);
});

test("shows State Views action overview only when author overview exists", () => {
  const source = `---
id: SCR-ACTION-OVERVIEW-COLUMN
type: screen
title: Action Overview Column
locale: en
---

# SCR-ACTION-OVERVIEW-COLUMN Action Overview Column

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Primary
- E-Secondary

## Elements

### E-Primary Button

- label: Primary

### E-Secondary Button

- label: Secondary

## Actions

### A1:A-Primary Primary

Author overview only.

- Triggered
  - E-Primary.click
- From
  - idle
- Process: Immediate
  - Effects
    - state: idle

### A2:A-Secondary Secondary

- Triggered
  - E-Secondary.click
- From
  - idle
- Process: Immediate
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const idleSection = stateSection(html, "idle");
  const actionsTable = idleSection.match(/<h5 class="state-screen-subheading">Actions<\/h5>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(actionsTable, /<th>Action<\/th><th>Trigger<\/th><th>Overview<\/th>/);
  assert.doesNotMatch(actionsTable, /<th>Kind<\/th>/);
  assert.match(actionsTable, /Author overview only\./);
  assert.doesNotMatch(actionsTable, /set state/);
});

test("uses explicit From states for State Views action relevance", () => {
  const sourcePath = resolve(extensionRoot, "../../examples/04-real-world-screens/search-list.vspec.md");
  const source = readFileSync(sourcePath, "utf8");
  const loaded = loadScreenDocumentResult(createTextDocument(source, sourcePath) as vscode.TextDocument);
  const html = renderDesignDocumentHtml(loaded.result, "", loaded.focus ? { focus: loaded.focus } : undefined);
  const fetchingSection = viewportStateSection(html, "fetching", "desktop");
  const fetchingActions = fetchingSection.match(/<h5 class="state-screen-subheading">Actions<\/h5>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(fetchingActions, new RegExp(`<td>${refActionChip("A2", "A-HandleSearchUsersResponse", "Handle search users response")}</td>`));
  assert.doesNotMatch(fetchingActions, /Search users/);
  assert.doesNotMatch(fetchingActions, new RegExp(`<tr><td>${refActionChip("A1", "A-SearchUsers", "Search users")}</td>`));
  assert.match(stateWireframeSection(fetchingSection), />5<\/code>/);
});

test("renders localized state change headings without difference wording", () => {
  const source = `---
id: SCR-STATE-CHANGE-LABELS
type: screen
title: State Change Labels
locale: ja
---

# SCR-STATE-CHANGE-LABELS State Change Labels

## States

- idle*
- loaded

## Layout: mobile

### L1:L-Page Page

- stack

#### Items

- L-Loaded

### L2:L-Loaded Loaded

- stack
- visible when: loaded

#### Items

- E-Loaded

## Elements

### E-Loaded Text

- value: Loaded

## Actions

### A1:A-Loaded Loaded action

- Triggered
  - screen.load
- From
  - loaded
- Process: Immediate
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const loadedSection = stateSection(html, "loaded");

  assert.match(loadedSection, /<h5 class="state-screen-subheading">レイアウト<\/h5>/);
  assert.match(loadedSection, /<h5 class="state-screen-subheading">画面要素<\/h5>/);
  assert.match(loadedSection, /<h5 class="state-screen-subheading">アクション<\/h5>/);
  assert.doesNotMatch(loadedSection, /変化|差分|利用可能なアクション/);
});

test("builds document scopes for spec and wireframe targets", () => {
  const template = parseMarkVSpec(`---
id: TPL-SCOPE
type: template
title: Scope Shell
locale: en
---

# TPL-SCOPE Scope Shell

## Layout: mobile

### L-Shell Shell

- stack

#### Items

- E-Nav
- slot: content

## Slots

### content Main content

- required

## Elements

### E-Nav Link

- label: Navigation

## Actions

### A-TemplateLoad Template load

- Triggered
  - screen.load
`);
  const screen = parseMarkVSpec(`---
id: SCR-SCOPE
type: screen
title: Scope Screen
template:
  id: TPL-SCOPE
  src: ../templates/scope.vspec.md
locale: en
---

# SCR-SCOPE Scope Screen

## Slot: content

### L-Content Content

- stack

#### Items

- E-Name

## Elements

Screen element prose.

### E-Name TextInput

- label: Name

### E-Other Text

- value: Other

## Form Groups

### F-Profile Profile form

- fields: E-Name

## Actions

### A-Save Save

- Triggered
  - E-Name.change
`);
  const composed = composeMarkVSpecTemplate(template, screen);
  const scope = buildDocumentScope(composed, {
    layoutIds: new Set(["L-Content"]),
    elementIds: new Set(["E-Name"]),
    actionIds: new Set(["A-Save"])
  });

  assert(!scope.specItemIds.layoutIds.has("L-Shell"));
  assert(scope.specItemIds.layoutIds.has("L-Content"));
  assert(!scope.specItemIds.elementIds.has("E-Nav"));
  assert(scope.specItemIds.elementIds.has("E-Name"));
  assert(scope.specItemIds.formGroupIds.has("F-Profile"));
  assert(scope.specResult.sectionProse.some((sectionProse) => sectionProse.kind === "Elements"));

  assert(scope.wireframeItemIds.layoutIds.has("L-Shell"));
  assert(scope.wireframeItemIds.layoutIds.has("L-Content"));
  assert(!scope.wireframeItemIds.elementIds.has("E-Nav"));
  assert(scope.wireframeItemIds.elementIds.has("E-Name"));
  assert(!scope.wireframeItemIds.elementIds.has("E-Other"));
  assert.equal(scope.composition.layouts.find((entry) => entry.id === "L-Shell")?.origin.kind, "template");
  assert.equal(scope.composition.layouts.find((entry) => entry.id === "L-Content")?.origin.kind, "slot");
  assert.equal(scope.composition.elements.find((entry) => entry.id === "E-Name")?.origin.kind, "screen");
});

test("does not render viewport filter controls in the preview shell", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const html = renderPreviewHtml(
    result,
    {
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: unknown) => uri
    } as never,
    { layout: true, element: true, action: true },
    undefined,
    "examples/04-real-world-screens/login-basic.vspec.md"
  );
  const toolbar = html.match(/<header class="toolbar">[\s\S]*?<\/header>/)?.[0] ?? "";

  assert.doesNotMatch(toolbar, /examples\/screens\/login\.vspec\.md/);
  assert.doesNotMatch(toolbar, /\/login/);
  assert.doesNotMatch(toolbar, /Login<\/div>/);
  assert.match(html, /Content-Security-Policy" content="default-src 'none'; img-src vscode-resource:; style-src vscode-resource: 'unsafe-inline'; script-src 'nonce-[^']+' vscode-resource:;"/);
  assert.doesNotMatch(html, /img-src [^"]*https:/);
  assert.match(html, /securityLevel: "strict"/);
  assert.match(html, /output\.innerHTML = rendered\.svg;/);
  assert.doesNotMatch(html, /viewport-actions/);
  assert.doesNotMatch(html, /data-viewport-filter/);
  assert.match(html, /<div class="control-group marker-actions" role="group" aria-label="Marker visibility">/);
  assert.match(html, /\.toolbar\{align-items:center;background:#fff;border-bottom:1px solid #d1d5db;display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-end;padding:9px 58px 9px 14px;position:sticky;top:0;z-index:20\}/);
  assert.match(html, /\.toc-toggle\{align-items:center;background:#fff;border:1px solid #d1d5db;border-radius:6px;box-shadow:0 4px 14px rgba\(15,23,42,\.12\);color:#111827;cursor:pointer;display:inline-flex;height:32px;justify-content:center;padding:0;position:fixed;right:14px;top:10px;width:34px;z-index:21\}/);
  assert.match(html, /<button type="button" data-marker-toggle="layout" aria-pressed="true" title="Toggle markers: Layout">Layout<\/button>/);
  assert.match(html, /<button type="button" data-marker-toggle="element" aria-pressed="true" title="Toggle markers: Element">Element<\/button>/);
  assert.match(html, /<button type="button" data-marker-toggle="action" aria-pressed="true" title="Toggle markers: Action">Action<\/button>/);
  assert.match(html, /<body class="hide-repeated-content">/);
  assert.match(html, /<input type="checkbox" data-repeated-toggle role="switch" aria-label="Show repeated content" >/);
  assert.match(html, /runPreviewInitializer\("initRepeatedContentToggle", \(\) => initRepeatedContentToggle\(\)\);/);
  assert.match(html, /body\.hide-repeated-content \.spec-table tr:has\(\.mm-repeated-badge\)\{display:none\}/);
  assert.match(html, /body\.hide-repeated-content \.mm-marker-repeated\{display:none\}/);
  assert.match(html, /data-mm-repeated-empty="true"/);
  assert.doesNotMatch(html, /function updateRepeatedContentVisibility\(showRepeated\)/);
  assert.doesNotMatch(html, /function updateRepeatedTables\(showRepeated\)/);
  assert.match(html, /body\.hide-repeated-content \.repeated-layout-only-message\[data-mm-show-repeated-hidden="true"\]\{display:block\}/);
  assert.match(html, /@media print\{[\s\S]*body\.hide-repeated-content \.spec-table tr:has\(\.mm-repeated-badge\)\{display:table-row\}/);
  assert.match(html, /@media print\{[\s\S]*body\.hide-repeated-content \.mm-marker-repeated\{display:inline-flex\}/);
  assert.match(html, /@media print\{[\s\S]*\.repeated-layout-only-message\{display:none!important\}/);
  assert.match(html, /<input type="checkbox" data-auto-update role="switch" aria-label="Toggle auto preview update" checked>/);
  assert.match(html, /<span>Auto update<\/span>/);
  assert.match(html, /<button type="button" data-refresh-preview title="Refresh preview" disabled>Refresh<\/button>/);
  assert.match(html, /function markvspecAcquireVscodeApi\(\)/);
  assert.match(html, /window\.__markvspecVscodeApi = acquireVsCodeApi\(\);/);
  assert.match(html, /Unable to acquire VS Code API for MarkVSpec preview\./);
  assert.match(html, /return \{ postMessage\(\) \{\} \};/);
  assert.match(html, /const vscode = markvspecAcquireVscodeApi\(\);/);
  assert.match(html, /command: "refreshPreview"/);
  assert.match(html, /command: "setAutoUpdate"/);
  assert.match(html, /message\.command !== "replaceFragments"/);
  assert.match(html, /command: "renderReady"/);
  assert.match(html, /message\.command === "renderReadyResult"/);
  assert.doesNotMatch(html, /message\.command === "replaceFullHtml"/);
  assert.doesNotMatch(html, /command: "fullHtmlUpdateResult"/);
  assert.doesNotMatch(html, /document\.write\(/);
  assert.match(html, /const updateId = message\.updateId \|\| requestId;/);
  assert.match(html, /const generationId = message\.generationId;/);
  assert.match(html, /command: "fragmentUpdateResult"/);
  const fragmentUpdateResultScript = html.match(/command: "fragmentUpdateResult"[\s\S]*?webviewPatchMs: result\.webviewPatchMs\s*\n\s*\}\);/)?.[0] ?? "";
  assert.match(fragmentUpdateResultScript, /reason: result\.reason/);
  assert.match(fragmentUpdateResultScript, /success: result\.success/);
  assert.match(fragmentUpdateResultScript, /webviewPatchMs: result\.webviewPatchMs/);
  assert.match(html, /generationId,/);
  assert.match(html, /const patchStarted = performance\.now\(\);/);
  assert.match(html, /webviewPatchMs: Math\.round\(measuredMs \?\? \(performance\.now\(\) - patchStarted\)\)/);
  assert.match(html, /const preCommitPatchMs = performance\.now\(\) - patchStarted;\s*const commit = await requestRenderCommit\(generationId, updateId\);/);
  assert.match(html, /const domPatchStarted = performance\.now\(\);/);
  assert.match(html, /const scrollYBeforePatch = window\.scrollY;/);
  assert.match(html, /window\.scrollTo\(0, scrollYBeforePatch\);/);
  assert.match(html, /preCommitPatchMs \+ \(performance\.now\(\) - domPatchStarted\)/);
  assert.match(html, /return patchResult\(false, "target-count-mismatch:" \+ fragment\.renderKey\);/);
  assert.match(html, /return patchResult\(false, "replacement-root-mismatch:" \+ fragment\.renderKey\);/);
  assert.match(html, /return patchResult\(false, "render-commit-rejected", preCommitPatchMs\);/);
  assert.match(html, /return patchResult\(true, "applied", preCommitPatchMs \+ \(performance\.now\(\) - domPatchStarted\)\);/);
  assert.doesNotMatch(html, /updateRepeatedContentVisibility\(currentRepeatedContentVisible\(\)\);/);
  assert.match(html, /requestRenderCommit\(generationId, updateId\)/);
  assert.match(html, /document\.querySelectorAll\('\[data-mm-render-key="' \+ cssAttributeEscape\(fragment\.renderKey\) \+ '"\]'\)/);
  assert.match(html, /const significantNodes = Array\.from\(template\.content\.childNodes\)/);
  assert.match(html, /significantNodes\.length !== 1/);
  assert.match(html, /replacement\.getAttribute\("data-mm-render-key"\) !== fragment\.renderKey/);
  assert.match(html, /item\.target\.replaceWith\(item\.replacement\);/);
  assert.match(html, /function restorePreviewPosition\(\)/);
  assert.match(html, /const markvspecPreviewPositionKey = "examples\/04-real-world-screens\/login-basic\.vspec\.md";/);
  assert.match(html, /activeSectionId/);
  assert.match(html, /scrollY/);
  assert.match(html, /positionsBySource\[markvspecPreviewPositionKey\] = \{\s*activeSectionId,\s*scrollY: window\.scrollY\s*\};/);
  assert.match(html, /function previewPositionState\(\)/);
  assert.match(html, /return positionsBySource\[markvspecPreviewPositionKey\] \|\| \{\};/);
  assert.match(html, /if \(Number\.isFinite\(state\.scrollY\)\) \{\s*window\.scrollTo\(0, state\.scrollY\);\s*return;\s*\}\s*if \(state\.activeSectionId\)/);
  assert.match(html, /window\.scrollTo\(0, 0\);\s*\}\s*finally \{\s*previewPositionRestorePending = false;/);
  assert.doesNotMatch(toolbar, /Hide Layout<\/button>/);
  assert.doesNotMatch(html, /function applyViewportFilter/);
  assert.doesNotMatch(html, /section\.hidden = viewport !== "__all__" && sectionViewport !== viewport;/);
  assert.match(html, /<nav class="toc" aria-label="Contents">/);
  assert.match(html, /<button class="toc-toggle" type="button" aria-label="Toggle contents" aria-expanded="true" title="Toggle contents" data-toc-toggle>/);
  assert.match(html, /<ol class="toc-list" data-toc-list aria-busy="true" aria-live="polite"><li class="toc-status is-loading" data-toc-status>Building contents\.\.\.<\/li><\/ol>/);
  assert.match(html, /"contentsLoading":"Building contents\.\.\."/);
  assert.match(html, /"contentsEmpty":"No sections\."/);
  assert.match(html, /"contentsError":"Unable to build contents\."/);
  assert.match(html, /function setTableOfContentsStatus\(list, status\)/);
  assert.match(html, /setTableOfContentsStatus\(list, "empty"\)/);
  assert.match(html, /setTableOfContentsStatus\(list, "error"\)/);
  assert.match(html, /function reportPreviewClientError\(phase, error, detail\)/);
  assert.match(html, /window\.addEventListener\("error"/);
  assert.match(html, /window\.addEventListener\("unhandledrejection"/);
  assert.match(html, /function runPreviewInitializer\(name, initializer\)/);
  assert.match(html, /runPreviewInitializer\("initTableOfContents", \(\) => initTableOfContents\(\)\);/);
  assert.match(html, /runPreviewInitializer\("initActiveTableOfContents", \(\) => initActiveTableOfContents\(\)\);/);
  assert.match(html, /runPreviewInitializer\("initTableOfContentsToggle", \(\) => initTableOfContentsToggle\(\)\);/);
  assert.match(html, /function headingText\(heading\)/);
  assert.match(html, /function viewportTocText\(section, heading\)/);
  assert.match(html, /const viewport = section\.getAttribute\("data-viewport"\);/);
  assert.match(html, /return parts\.join\(" "\) \|\| \(viewport \? "Viewport " \+ viewport : "Viewport"\);/);
  assert.match(html, /function stateHeadingText\(section, heading\)/);
  assert.match(html, /const stateViewTitle = section\.getAttribute\("data-state-view-title"\);/);
  assert.match(html, /if \(stateViewTitle\) \{\s*return stateViewTitle;\s*\}/);
  assert.match(html, /const sections = Array\.from\(document\.querySelectorAll\("\.document > \.doc-section"\)\);/);
  assert.match(html, /function representativeSectionHeading\(section\)/);
  assert.match(html, /section\.classList\.contains\("screen-spec-section"\)/);
  assert.match(html, /section\.classList\.contains\("state-views-section"\)/);
  assert.match(html, /section\.classList\.contains\("state-screen-section"\)/);
  assert.doesNotMatch(html, /document\.querySelectorAll\(".document .doc-section > h2"\)/);
  assert.match(html, /function setTableOfContentsCollapsed\(collapsed, persist\)/);
  assert.match(html, /document\.body\.classList\.toggle\("toc-collapsed", collapsed\);/);
  assert.match(html, /savePreviewState\(\{ \.\.\.previewState\(\), tocCollapsed: collapsed \}\);/);
  assert.match(html, /appendStateTableOfContentsItem\(list, viewportGroups, section, heading\);/);
  assert.match(html, /return parts\.join\(" "\) \|\| "Section";/);
  assert.match(html, /function updateTableOfContentsVisibility\(\)/);
  assert.match(html, /function initActiveTableOfContents\(\)/);
  assert.match(html, /function initStickyOffsetTracking\(\)/);
  assert.match(html, /function updateStickyOffset\(\)/);
  assert.match(html, /function updateActiveTableOfContents\(\)/);
  assert.match(html, /new ResizeObserver\(\(\) => \{/);
  assert.match(html, /const anchorY = updateStickyOffset\(\) \+ 16;/);
  assert.match(html, /document\.querySelectorAll\("\.document \.doc-section, \.document \.state-viewport-section"\)/);
  assert.match(html, /viewportItem\.dataset\.tocTarget = viewportSection\.id;/);
  assert.match(html, /stateSection\.getAttribute\("data-state-view-title"\) \|\| stateSection\.getAttribute\("data-state"\)/);
  assert.doesNotMatch(html, /rootMargin: "-72px 0px -70% 0px"/);
  assert.doesNotMatch(html, /const anchorY = 88;/);
  assert.match(html, /item\.classList\.toggle\("is-active", !item\.hidden && item\.getAttribute\("data-toc-target"\) === activeId\);/);
  assert.doesNotMatch(html, /data-print-preview/);
  assert.doesNotMatch(html, /printPreview/);
  assert.match(html, /\.document\{margin:0 auto;max-width:1180px;padding:20px 24px 40px\}/);
  assert.match(html, /\.state-viewport-section\{margin:18px 0 24px;scroll-margin-top:var\(--markvspec-sticky-offset\)\}/);
  assert.match(html, /\.toc\{background:#fff;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 8px 24px rgba\(15,23,42,\.12\);display:none;max-height:calc\(100vh - 92px\);overflow:auto;padding:10px;position:fixed;right:16px;top:76px;width:220px;z-index:1\}/);
  assert.match(html, /\.toc-inline\{background:#fff;border:1px solid #d1d5db;border-radius:8px;display:block;margin:0 0 28px;padding:12px\}/);
  assert.match(html, /\.toc-sublist\{display:grid;gap:2px;list-style:none;margin:2px 0 3px 12px;padding:0\}/);
  assert.match(html, /\.toc-list li\.is-active > a\{background:#dbeafe;color:#1e3a8a;font-weight:650\}/);
  assert.match(html, /\.toc-toggle\{align-items:center;background:#fff;border:1px solid #d1d5db;border-radius:6px;box-shadow:0 4px 14px rgba\(15,23,42,\.12\);color:#111827;cursor:pointer;display:inline-flex;height:32px;justify-content:center;padding:0;position:fixed;right:14px;top:10px;width:34px;z-index:21\}/);
  assert.match(html, /body\.toc-collapsed \.toc,body\.toc-collapsed \.toc-inline\{display:none!important\}/);
  assert.match(html, /\.segmented button\[aria-pressed="true"\]\{background:#e0f2fe;border-color:#38bdf8;color:#075985;font-weight:700\}/);
  assert.doesNotMatch(html, /background:#1f2937|background:#111827|background:#000/);
  assert.match(html, /:root\{--markvspec-sticky-offset:72px;--markvspec-heading-state-views:18px;--markvspec-heading-viewport:15px;--markvspec-heading-state:14px;--markvspec-heading-detail:12px;--markvspec-heading-badge:11px;--markvspec-screen-overview-border:1px;--markvspec-screen-overview-padding:12px;--markvspec-screen-content-inset:calc\(var\(--markvspec-screen-overview-border\) \+ var\(--markvspec-screen-overview-padding\)\)\}/);
  assert.match(html, /\.doc-section h2\{align-items:center;border-bottom:1px solid #d1d5db;display:flex;flex-wrap:wrap;font-size:var\(--markvspec-heading-state-views\);gap:8px;margin:0 0 12px;padding-bottom:6px\}/);
  assert.match(html, /\.doc-section h3\{font-size:var\(--markvspec-heading-viewport\);margin:22px 0 8px\}/);
  assert.match(html, /\.state-screen-heading\{align-items:center;display:flex;flex-wrap:wrap;font-size:var\(--markvspec-heading-state\);gap:8px;margin:18px 0 10px\}/);
  assert.match(html, /\.state-screen-detail-heading\{color:#475569;font-size:12px;font-weight:700\}/);
  assert.match(html, /\.system-events-box\{background:#f8fafc;border:1px dashed #94a3b8;border-radius:6px;margin:10px 0 0;padding:7px 12px 8px\}/);
  assert.match(html, /\.system-events-box h4,\.system-events-box \.state-screen-detail-heading\{font-size:12px;margin:0 0 6px\}/);
  assert.doesNotMatch(html, /\.state-screen-heading\{[^}]*font-size:15px/);
  assert.match(html, /\.doc-section\{break-inside:avoid;margin:0 0 28px;page-break-inside:avoid;scroll-margin-top:var\(--markvspec-sticky-offset\)\}/);
  assert.match(html, /\.document h2\[id\],\.document h3\[id\],\.document h4\[id\]\{scroll-margin-top:var\(--markvspec-sticky-offset\)\}/);
  assert.doesNotMatch(html, /html\{scroll-padding-top:var\(--markvspec-sticky-offset\)\}/);
  assert.match(html, /\.spec-table code:not\(\.mm-id\):not\(\.mm-doc-label\):not\(\.mm-document-ref-id\)\{background:#f3f4f6;border-radius:3px;padding:1px 3px\}/);
  assert.match(html, /\.doc-section>\.entity-overview\+\.spec-table-wrap,\.doc-section>\.entity-overview\+\.spec-empty,\.doc-section>\.entity-overview\+\.form-group-spec-fragment,\.element-spec-fragment>\.entity-overview\+\.spec-table-wrap,\.action-spec-fragment>\.entity-overview\+\.spec-table-wrap\{margin-top:12px\}/);
  assert.match(html, /\.doc-section>\.spec-table-wrap\+\.entity-notes,\.doc-section>\.spec-empty\+\.entity-notes,\.doc-section>\.form-group-spec-fragment\+\.entity-notes,\.element-spec-fragment>\.spec-table-wrap\+\.entity-notes,\.action-spec-fragment>\.spec-table-wrap\+\.entity-notes\{margin-top:12px\}/);
  assert.doesNotMatch(html, /\.spec-table td \.entity-overview\{margin-top:12px\}/);
  assert.doesNotMatch(html, /\.spec-table td \.entity-notes\{margin-top:12px\}/);
  assert.match(html, /\.screen-overview\{border:var\(--markvspec-screen-overview-border\) solid #d1d5db;border-radius:6px;margin:0 0 12px;padding:var\(--markvspec-screen-overview-padding\)\}/);
  assert.match(html, /\.screen-overview-main\{min-width:0\}/);
  assert.match(html, /\.screen-description\{color:#374151;font-size:13px;line-height:1\.6;overflow-wrap:anywhere\}/);
  assert.doesNotMatch(html, /\.screen-description\{[^}]*max-width:72ch/);
  assert.match(html, /\.screen-overview-badges\{align-items:center;display:flex;float:right;flex-wrap:wrap;gap:6px;justify-content:flex-end;margin:0 0 6px 12px\}/);
  assert.match(html, /\.screen-meta-block\{margin:12px var\(--markvspec-screen-content-inset\) 0\}/);
  assert.match(html, /\.screen-id code,\.mm-document-ref-id\{align-items:center;background:#fff;border:1px solid #111827;border-left:3px solid #111827;border-radius:4px;color:#111827;display:inline-flex;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono",monospace;font-size:11px;font-variant-numeric:tabular-nums;font-weight:700;justify-content:center;letter-spacing:0;line-height:1\.2;min-height:18px;padding:1px 6px;vertical-align:baseline;white-space:nowrap;width:max-content\}/);
  assert.doesNotMatch(html, /\.spec-table code\.mm-marker-element\{/);
  assert.doesNotMatch(html, /\.spec-table code\.mm-marker-action\{/);
  assert.match(html, /\*\{scrollbar-color:#9ca3af #f3f4f6;scrollbar-width:thin\}/);
  assert.match(html, /\*::-webkit-scrollbar\{height:10px;width:10px\}/);
  assert.match(html, /\*::-webkit-scrollbar-thumb\{background:#9ca3af;border:2px solid #f3f4f6;border-radius:999px\}/);
  assert.match(html, /@media \(min-width:760px\)\{\s*\.content\{padding-right:252px\}\s*body\.toc-collapsed \.content\{padding-right:0\}\s*\.toc\{display:block\}/);
  assert.match(html, /\.toc-inline\{display:none\}/);
  assert.match(html, /\.state-screen-section \+ \.state-screen-section\{border-top:2px solid #e5e7eb;padding-top:18px\}/);
  assert.match(html, /\.mm-doc-label\{background:#fff;border:1px solid #111827;border-radius:999px;color:#111827;display:inline-flex;font-family:inherit;font-size:12px;font-weight:600;line-height:1\.3;padding:1px 8px;vertical-align:baseline;white-space:nowrap\}/);
  assert.match(html, /\.state-label\{font-size:14px\}/);
  assert.doesNotMatch(html, /\.state-label,\.mm-doc-label-state\{font-size:14px\}/);
  assert.match(html, /\.mm-detail-ref-id\{background:#fff;border:1px solid #cbd5e1;border-radius:4px;color:#1f2937;display:inline-flex;font-family:inherit;font-size:12px;font-weight:600;line-height:1\.3;padding:1px 6px;vertical-align:baseline;white-space:nowrap\}/);
  assert.match(html, /\.state-flow-diagram\{position:relative\}/);
  assert.match(html, /\.state-flow-table-link\{align-items:center;background:#fff;border:1px solid #cbd5e1;border-radius:5px;box-shadow:0 2px 8px rgba\(15,23,42,\.12\);color:#334155;display:inline-flex;height:28px;justify-content:center;left:8px;position:absolute;text-decoration:none;top:8px;width:28px;z-index:2\}/);
  assert.match(html, /\.state-flow-table-link-icon\{background:linear-gradient\(currentColor,currentColor\) 0 33%\/100% 1px no-repeat,/);
  assert.match(html, /\.state-flow-table-link-label\{display:none\}/);
  assert.match(html, /\.state-flow-diagram,\.state-flow-diagram \.mermaid-block,\.state-flow-diagram \.mermaid-placeholder,\.state-flow-diagram \.mermaid-render\{min-height:260px\}/);
  assert.match(html, /\.state-badge\{background:#dbeafe;border:1px solid #60a5fa;border-radius:999px;color:#1e3a8a;font-size:var\(--markvspec-heading-badge\);font-weight:600;padding:1px 6px\}/);
  assert.match(html, /\.mermaid-block\{position:relative\}/);
  assert.match(html, /\.mermaid-source\{background:#f9fafb;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box;display:none;/);
  assert.match(html, /\.mermaid-source code\{background:transparent;border:0;border-radius:0;color:inherit;font:inherit;padding:0\}/);
  assert.match(html, /\.mermaid-block\.is-source-visible \.mermaid-source\{display:block\}/);
  assert.match(html, /\.mermaid-placeholder\{align-items:center;background:#fff;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box;color:#6b7280;display:flex;/);
  assert.match(html, /\.mermaid-render\{background:#fff;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box;overflow:auto;padding:12px\}/);
  assert.match(html, /\.mermaid-source-toggle\{background:#fff;border:1px solid #cbd5e1;border-radius:5px;color:#334155;cursor:pointer;/);
  assert.match(html, /@media \(max-width:640px\)\{/);
  assert.match(html, /\.toolbar-controls\{justify-content:flex-start;width:100%\}/);
  assert.match(html, /\.spec-table tbody tr:nth-child\(even\)\{background:#fcfcfd\}/);
  assert.match(html, /\.state-transition-context-heading\{color:#374151;font-size:13px;font-weight:700;margin:12px 0 6px\}/);
  assert.match(html, /\.state-transition-axis-cell\{min-width:112px;padding:6px 8px!important;position:relative\}/);
  assert.match(html, /\.state-transition-axis-cell::before\{background:linear-gradient\(to top right,transparent calc\(50% - \.5px\),#cbd5e1 calc\(50% - \.5px\),#cbd5e1 calc\(50% \+ \.5px\),transparent calc\(50% \+ \.5px\)\);content:"";inset:0;position:absolute\}/);
  assert.match(html, /\.state-transition-axis-labels\{align-items:center;display:flex;gap:16px;inset:0;justify-content:space-between;padding:6px 8px;position:absolute\}/);
  assert.match(html, /\.wireframe-section\{max-width:100%;overflow-x:auto;overflow-y:visible;padding-bottom:4px\}/);
  assert.match(html, /\.wireframe-section \.mm-wireframe\{max-width:none;padding:0;position:relative\}/);
  assert.match(html, /\.state-screen-section\[data-viewport\] \.wireframe-section \.mm-wireframe:not\(\.mm-wireframe-empty\)\{max-width:none;min-width:var\(--markvspec-viewport-width, 100%\);width:var\(--markvspec-viewport-width, 100%\)\}/);
  assert.match(html, /\.wireframe-section \.mm-layout-overlay-screen,\.state-wireframe \.mm-layout-overlay-screen\{position:absolute\}/);
  assert.match(html, /\.spec-default-always\{color:#94a3b8;font-weight:500\}/);
  assert.match(html, /data-viewport="mobile" style="--markvspec-viewport-width:390px;--markvspec-print-scale:1"/);
  assert.match(html, /data-viewport="desktop" style="--markvspec-viewport-width:960px;--markvspec-print-scale:1"/);
  assert.match(html, /@media print\{/);
  assert.match(html, /@page\{margin:14mm;size:A4 landscape\}/);
  assert.doesNotMatch(html, /@page markvspec-landscape/);
  assert.match(html, /:root\{--markvspec-sticky-offset:0px;--markvspec-heading-state-views:15pt;--markvspec-heading-viewport:12\.5pt;--markvspec-heading-state:11\.5pt;--markvspec-heading-detail:10pt;--markvspec-heading-badge:8\.5pt\}/);
  assert.match(html, /\*\{-webkit-print-color-adjust:exact;print-color-adjust:exact\}/);
  assert.match(html, /\.toc-toggle\{display:none\}/);
  assert.match(html, /\.toc\{display:none\}/);
  assert.match(html, /\.toc-inline\{box-shadow:none;break-inside:avoid;display:block;margin-bottom:18pt;page-break-inside:avoid\}/);
  assert.match(html, /\.toc-list li\.is-active > a\{background:transparent;color:#374151;font-weight:400\}/);
  assert.match(html, /body\.toc-collapsed \.toc-inline\{display:block!important\}/);
  assert.match(html, /\.toc-inline li\[hidden\]\{display:list-item!important\}/);
  assert.match(html, /\.document\{margin:0;max-width:none;padding:0\}/);
  assert.match(html, /\.state-screen-section \+ \.state-screen-section\{border-top:0;padding-top:0\}/);
  assert.doesNotMatch(html, /page:markvspec-landscape/);
  assert.doesNotMatch(html, /max-width:269mm/);
  assert.match(html, /\.wireframe-print-section\{box-sizing:border-box;max-width:100%;width:100%\}/);
  assert.match(html, /@media print\{[\s\S]*html,body,main,\.content,\.preview,\.document,\.spec-table-wrap,\.wireframe-section,\.mermaid-render,\.mermaid-source,\.note-content,\.entity-notes pre,\.entity-overview pre\{overflow:visible!important;scrollbar-width:none!important;-ms-overflow-style:none!important\}/);
  assert.match(html, /@media print\{[\s\S]*html::-webkit-scrollbar,body::-webkit-scrollbar,main::-webkit-scrollbar,\.content::-webkit-scrollbar,\.preview::-webkit-scrollbar,\.document::-webkit-scrollbar,\.spec-table-wrap::-webkit-scrollbar,\.wireframe-section::-webkit-scrollbar,\.mermaid-render::-webkit-scrollbar,\.mermaid-source::-webkit-scrollbar,\.note-content::-webkit-scrollbar,\.entity-notes pre::-webkit-scrollbar,\.entity-overview pre::-webkit-scrollbar\{display:none!important;height:0!important;width:0!important\}/);
  assert.doesNotMatch(html, /@media print\{[\s\S]*\.state-flow-table-link\{display:none\}/);
  assert.doesNotMatch(html, /@media print\{[\s\S]*\.state-flow-table-link\{[^}]*position:static/);
  assert.doesNotMatch(html, /@media print\{[\s\S]*\.state-flow-table-link\{[^}]*left:auto/);
  assert.doesNotMatch(html, /@media print\{[\s\S]*\.state-flow-table-link\{[^}]*width:auto/);
  assert.doesNotMatch(html, /@media print\{[\s\S]*\.state-flow-table-link-icon\{display:none\}/);
  assert.doesNotMatch(html, /@media print\{[\s\S]*\.state-flow-table-link-label\{display:inline\}/);
  assert.match(html, /\.wireframe-section\{overflow:visible\}/);
  assert.match(html, /\.wireframe-section \.mm-wireframe\{border:1px solid #d1d5db;box-shadow:none;box-sizing:border-box;max-width:100%!important;outline:0;overflow:visible;padding:10pt;position:relative;width:100%!important\}/);
  assert.match(html, /\.state-screen-section\[data-viewport\] \.wireframe-section \.mm-wireframe:not\(\.mm-wireframe-empty\)\{max-width:none!important;min-width:0!important;width:var\(--markvspec-viewport-width, 100%\)!important;zoom:var\(--markvspec-print-scale, 1\)\}/);
  assert.match(html, /\.wireframe-section \.mm-element-wrap-table\{align-self:stretch!important;box-sizing:border-box!important;display:block!important;max-width:100%!important;min-width:0!important;width:100%!important\}/);
  assert.match(html, /\.wireframe-section \.mm-element-table\{max-width:100%!important;min-width:0!important;table-layout:fixed!important;width:100%!important\}/);
  assert.match(html, /<style>\s*@media print \{\s*\.wireframe-section \.mm-wireframe\{border:1px solid #d1d5db!important;box-shadow:none!important;box-sizing:border-box!important;max-width:100%!important;min-width:0!important;outline:0!important;width:100%!important\}/);
  assert.match(html, /\.state-screen-section\[data-viewport\] \.wireframe-section \.mm-wireframe:not\(\.mm-wireframe-empty\)\{max-width:none!important;width:var\(--markvspec-viewport-width, 100%\)!important;zoom:var\(--markvspec-print-scale, 1\)!important\}/);
  assert.match(html, /\.wireframe-section \.mm-element-table th,\.wireframe-section \.mm-element-table td\{box-sizing:border-box;overflow-wrap:anywhere;word-break:break-word\}/);
  assert.doesNotMatch(html, /\.state-screen-section\[hidden\]\{display:block!important\}/);
  assert.match(html, /\.toc-inline\{break-after:page;break-inside:avoid;page-break-after:always;page-break-inside:avoid\}/);
  assert.match(html, /\.history-section\{break-before:page;page-break-before:always\}/);
  assert.doesNotMatch(html, /\.state-screen-section\{break-before:page;page-break-before:always\}/);
  assert.doesNotMatch(html, /\.layout-spec-fragment, \.element-spec-fragment, \.action-spec-fragment\{break-before:page;page-break-before:always\}/);
  assert.match(html, /\.wireframe-print-section, \.action-detail, \.note-block, \.process-card\{break-inside:avoid;page-break-inside:avoid\}/);
  assert.match(html, /\.spec-table tr\{break-inside:avoid;page-break-inside:avoid\}/);
  assert.doesNotMatch(html, /\.spec-table-wrap, \.spec-table\{break-inside:avoid;page-break-inside:avoid\}/);
  assert.doesNotMatch(html, /\.state-screen-section \+ \.state-screen-section\{break-before:page;page-break-before:always\}/);
  assert.match(html, /\.spec-table thead\{display:table-header-group\}/);
  assert.match(html, /\.spec-table code:not\(\.mm-id\):not\(\.mm-doc-label\):not\(\.mm-document-ref-id\)\{background:transparent;padding:0\}/);
  assert.match(html, /\.spec-table\{font-size:8\.5pt;table-layout:auto;width:100%\}/);
  assert.match(html, /\.spec-table th,\.spec-table td\{overflow-wrap:break-word;padding:4pt 5pt;word-break:normal\}/);
  assert.match(html, /\.spec-table col\.spec-table-col-marker-id\{width:20%\}/);
  assert.match(html, /\.spec-table col\.spec-table-col-id\{width:16%\}/);
  assert.match(html, /\.spec-table \.mm-ref-chip, \.spec-table \.mm-chip, \.spec-table \.mm-detail-ref-id, \.spec-table \.mm-id\{box-sizing:border-box;max-width:100%;min-width:0;overflow-wrap:break-word;white-space:normal;word-break:normal\}/);
  assert.match(html, /\.spec-table \.mm-ref-chip \.mm-id\{flex:0 0 auto;overflow-wrap:normal;white-space:nowrap;width:auto\}/);
  assert.match(html, /\.spec-table td > \.mm-ref-chip, \.spec-table td > \.mm-chip\{display:flex;margin:0 0 2pt;width:fit-content\}/);
  assert.match(html, /\.mm-marker-element\{background:rgba\(255,255,255,\.72\)!important;border-color:#f59e0b!important;box-shadow:0 1px 2px rgba\(15,23,42,\.12\)!important;color:#92400e!important\}/);
  assert.doesNotMatch(html, /\.state-flow-section\{break-before:page;page-break-before:always\}/);
  assert.match(html, /\.mermaid-render svg\{display:block;height:auto!important;margin:0 auto;max-height:180mm;max-width:100%;width:auto!important\}/);
});

test("applies scalar preview scenario display effects without partial references", () => {
  const result = parseMarkVSpec(`---
id: SCR-SCENARIO-DISPLAY
type: screen
title: Scenario Display
---

# SCR-SCENARIO-DISPLAY Scenario Display

## States

- idle*
- failed

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Message

## Elements

### E-Message Text

- label: Waiting

## Actions

### A-Submit Submit

- Triggered
  - screen.load
- From
  - idle
- Process P1: Submit request
  - result:
    - request result
  - case: failure
    - Effects
      - state: failed
      - display:
        - target: E-Message
        - content: Request failed message

## Preview Scenarios

### idle

- state: idle

### failed-message

- state: failed
- cases:
  - A-Submit.P1.failure
`);
  const html = renderPreviewHtml(
    result,
    {
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: unknown) => uri
    } as never,
    { layout: true, element: true, action: true },
    undefined,
    "scenario-display.vspec.md"
  );

  assert.match(html, /data-mm-display-preview="true"/);
  assert.match(html, /Request failed message/);
});

test("renders targetless dialog display effects as modal overlays", () => {
  const result = parseMarkVSpec(`---
id: SCR-DIALOG-SCENARIO
type: screen
title: Dialog Scenario
---

# SCR-DIALOG-SCENARIO Dialog Scenario

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-OpenDialogButton

## Elements

### E-OpenDialogButton Button

- label: Open dialog
- action: A-OpenDialog

### E-ConfirmDialog Dialog

- title: Discard changes?
- message: Unsaved changes will be lost.
- actions: E-CancelDialogButton, E-ConfirmDialogButton

### E-CancelDialogButton Button

- label: Cancel
- variant: secondary
- action: A-CancelDialog

### E-ConfirmDialogButton Button

- label: Discard
- variant: primary
- tone: danger
- action: A-ConfirmDialog

## Actions

### A-OpenDialog Open dialog

- Triggered
  - E-OpenDialogButton.click
- From
  - idle
- Process P1: Apply immediate effect
  - case: done
    - Effects
      - display:
        - element: E-ConfirmDialog
    - stop

### A-CancelDialog Cancel dialog

- Triggered
  - E-CancelDialogButton.click
- From
  - idle
- Process P1: Apply immediate effect
  - state: idle

### A-ConfirmDialog Confirm dialog

- Triggered
  - E-ConfirmDialogButton.click
- From
  - idle
- Process P1: Apply immediate effect
  - state: idle

## Preview Scenarios

### dialog-open

- state: idle
- cases:
  - A-OpenDialog.P1.done
`);
  const html = renderPreviewHtml(
    result,
    {
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: unknown) => uri
    } as never,
    { layout: true, element: true, action: true },
    undefined,
    "dialog-scenario.vspec.md"
  );

  assert.equal(result.diagnostics.length, 0);
  const idleSection = stateSection(html, "idle");
  const dialogSection = stateSectionContaining(html, "idle", `data-mm-display-modal="E-ConfirmDialog"`);
  const dialogWireframe = stateWireframeSection(dialogSection);
  assert.doesNotMatch(idleSection, /action-detail-A-CancelDialog/);
  assert.doesNotMatch(idleSection, /action-detail-A-ConfirmDialog/);
  assert.match(html, /class="mm-modal-overlay" data-mm-display-modal="E-ConfirmDialog"/);
  assert.match(dialogWireframe, /<section class="mm-element mm-element-dialog" data-mm-id="E-ConfirmDialog" role="dialog" aria-modal="true" aria-label="Discard changes\?">/);
  assert.match(dialogWireframe, /data-mm-marker-category="element">E-ConfirmDialog<\/code>/);
  assert.match(dialogWireframe, /<button class="mm-element mm-element-button mm-variant-primary mm-tone-danger" data-mm-id="E-ConfirmDialogButton">Discard<\/button>[\s\S]*data-mm-marker-category="element">E-ConfirmDialogButton<\/code>/);
  assert.match(dialogWireframe, /href="#action-detail-A-ConfirmDialog"[\s\S]*data-mm-marker-category="action">A-ConfirmDialog<\/code>/);
  assert.match(dialogSection, /action-detail-A-CancelDialog/);
  assert.match(dialogSection, /action-detail-A-ConfirmDialog/);
});

test("renders targetless toast display effects as non-modal overlay stacks", () => {
  const result = parseMarkVSpec(`---
id: SCR-TOAST-SCENARIO
type: screen
title: Toast Scenario
---

# SCR-TOAST-SCENARIO Toast Scenario

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-SaveButton

## Elements

### E-SaveButton Button

- label: Save
- action: A-SaveSettings

### E-SavedToast Toast

- message: Settings saved.
- tone: success
- placement: top-right
- duration: short

### E-SyncToast Toast

- message: Sync queued.
- tone: info
- placement: top-right
- duration: medium

## Actions

### A-SaveSettings Save settings

- Triggered
  - E-SaveButton.click
- From
  - idle
- Process P1: Save settings
  - case: success
    - Effects
      - display:
        - element: E-SavedToast
    - stop

### A-QueueSync Queue sync

- Triggered
  - E-SaveButton.click
- From
  - idle
- Process P1: Queue sync
  - case: done
    - Effects
      - display:
        - element: E-SyncToast
    - stop

## Preview Scenarios

### idle-saved-toast

- state: idle
- cases:
  - A-SaveSettings.P1.success
  - A-QueueSync.P1.done
`);
  const html = renderPreviewHtml(
    result,
    {
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: unknown) => uri
    } as never,
    { layout: true, element: true, action: true },
    undefined,
    "toast-scenario.vspec.md"
  );

  assert.equal(result.diagnostics.length, 0);
  const toastSection = stateSectionContaining(html, "idle", `data-mm-display-toast="E-SavedToast"`);
  const toastWireframe = stateWireframeSection(toastSection);
  assert.match(toastWireframe, /class="mm-toast-region mm-toast-region-top-right" data-mm-display-toast-region="top-right"/);
  assert.match(toastWireframe, /data-mm-display-toast="E-SavedToast"[\s\S]*<div class="mm-element mm-element-toast mm-tone-success" data-mm-id="E-SavedToast" role="status" data-mm-toast-placement="top-right" data-mm-toast-duration="short">/);
  assert.match(toastWireframe, /data-mm-display-toast="E-SyncToast"[\s\S]*<div class="mm-element mm-element-toast mm-tone-info" data-mm-id="E-SyncToast" role="status" data-mm-toast-placement="top-right" data-mm-toast-duration="medium">/);
  assert.doesNotMatch(toastWireframe, /mm-modal-overlay/);
  assert.doesNotMatch(toastWireframe, /aria-modal="true"/);
});

test("marks unplaced layouts in state view specs without rendering them in wireframes", () => {
  const result = parseMarkVSpec(`---
id: SCR-UNPLACED-LAYOUT
type: screen
title: Unplaced Layout
---

# SCR-UNPLACED-LAYOUT Unplaced Layout

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title

### L-DeferredPanel Deferred panel

- stack

#### Items

- E-DeferredText

## Elements

### E-Title Heading

- level: 1
- label: Page

### E-DeferredText Text

- sample: Deferred panel content
`);
  const html = renderDesignDocumentHtml(result, "");
  const idleSection = stateSection(html, "idle");
  const layoutRows = idleSection.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
  const pageRow = layoutRows.find((row) => row.includes(`>L-Page<`)) ?? "";
  const deferredRow = layoutRows.find((row) => row.includes(`>L-DeferredPanel<`)) ?? "";

  assert.match(deferredRow, new RegExp(`${detailLayoutRefById("L-DeferredPanel", "L-DeferredPanel")}[\\s\\S]*${unplacedBadge()}`));
  assert.doesNotMatch(pageRow, /mm-unplaced-badge/);
  assert.doesNotMatch(idleSection, /data-mm-id="L-DeferredPanel"/);
});

test("does not mark display-inserted layouts as unplaced in preview scenario specs", () => {
  const result = parseMarkVSpec(`---
id: SCR-SCENARIO-UNPLACED-LAYOUT
type: screen
title: Scenario Unplaced Layout
---

# SCR-SCENARIO-UNPLACED-LAYOUT Scenario Unplaced Layout

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title

### L-DeferredPanel Deferred panel

- stack

#### Items

- E-DeferredText

## Elements

### E-Title Heading

- level: 1
- label: Page

### E-DeferredText Text

- sample: Deferred panel content

### E-ShowButton Button

- label: Show
- action: A-ShowDeferred

## Actions

### A-ShowDeferred Show deferred

- Triggered
  - E-ShowButton.click
- From
  - idle
- Process P1: Show deferred
  - case: shown
    - Effects
      - display:
        - target: L-Page
        - element: L-DeferredPanel

## Preview Scenarios

### deferred-visible

- state: idle
- cases:
  - A-ShowDeferred.P1.shown
`);
  const html = renderDesignDocumentHtml(result, "");
  const baseSection = stateViewTitleSection(html, "idle");
  const scenarioSection = stateViewTitleSection(html, "idle / deferred-visible");
  const baseRows = baseSection.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
  const scenarioRows = scenarioSection.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
  const baseDeferredRow = baseRows.find((row) => row.includes(`data-mm-ref-id="L-DeferredPanel"`)) ?? "";
  const scenarioDeferredRow = scenarioRows.find((row) => row.includes(`data-mm-ref-id="L-DeferredPanel"`)) ?? "";

  assert.match(baseDeferredRow, new RegExp(`${detailLayoutRefById("L-DeferredPanel", "L-DeferredPanel")}[\\s\\S]*${unplacedBadge()}`));
  assert.match(scenarioSection, /data-mm-id="L-DeferredPanel"/);
  assert.match(scenarioDeferredRow, new RegExp(`${detailLayoutRefById("L-DeferredPanel", "L-DeferredPanel")}`));
  assert.doesNotMatch(scenarioDeferredRow, /mm-unplaced-badge/);
});

test("does not mark template slot content layouts as unplaced when rendered in state wireframes", () => {
  const sourcePath = resolve(extensionRoot, "../../examples/05-reuse/profile-page-with-template.vspec.md");
  const source = readFileSync(sourcePath, "utf8");
  const loaded = loadScreenDocumentResult(createTextDocument(source, sourcePath) as vscode.TextDocument);
  const html = renderDesignDocumentHtml(loaded.result, "", loaded.focus ? { focus: loaded.focus, messages: loaded.messages } : { messages: loaded.messages });
  const idleSection = stateViewTitleSection(html, "idle");
  const rows = idleSection.match(/<tr>[\s\S]*?<\/tr>/g) ?? [];
  const profileContentRow = rows.find((row) => row.includes(`>L-ProfileContent<`)) ?? "";
  const profileSummaryHostRow = rows.find((row) => row.includes(`>L-ProfileSummaryHost<`)) ?? "";

  assert.match(idleSection, /data-mm-id="L-ProfileContent"/);
  assert.match(idleSection, /data-mm-id="L-ProfileSummaryHost"/);
  assert.doesNotMatch(profileContentRow, /mm-unplaced-badge/);
  assert.doesNotMatch(profileSummaryHostRow, /mm-unplaced-badge/);
});

test("renders preview toolbar labels with external renderer messages", () => {
  const result = parseMarkVSpec(`---
id: SCR-TOOLBAR-MESSAGES
type: screen
title: Toolbar Messages
---

# SCR-TOOLBAR-MESSAGES Toolbar Messages

## Elements

### E-Title Text

- value: Title
`);
  const messages = {
    ...messagesForLocale("en"),
    action: "Command",
    element: "Widget",
    hideContents: "Close index",
    layout: "Frame",
    markerVisibility: "Marker controls",
    markers: "Flags",
    preview: "Live view",
    previewUpdate: "Live view update",
    refresh: "Reload",
    refreshPreview: "Reload preview",
    autoUpdate: "Auto reload",
    autoUpdatePreview: "Toggle live reload",
    mermaidHideSource: "Close Mermaid source",
    mermaidRenderFailed: "Mermaid failed",
    mermaidRendering: "Drawing Mermaid",
    mermaidShowSource: "Open Mermaid source",
    showContents: "Open index",
    toggleContents: "Toggle index",
    toggleMarker: "Toggle flag"
  };
  const html = renderPreviewHtml(
    { result, messages },
    {
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: unknown) => uri
    } as never,
    { layout: true, element: true, action: true },
    undefined,
    "toolbar.vspec.md"
  );

  assert.match(html, /aria-label="Marker controls"/);
  assert.match(html, /<span class="control-label">Flags<\/span>/);
  assert.match(html, /title="Toggle flag: Frame">Frame<\/button>/);
  assert.match(html, /title="Toggle flag: Widget">Widget<\/button>/);
  assert.match(html, /title="Toggle flag: Command">Command<\/button>/);
  assert.match(html, /aria-label="Live view update"/);
  assert.match(html, /<span class="control-label">Live view<\/span>/);
  assert.match(html, /data-auto-update role="switch" aria-label="Toggle live reload" checked>/);
  assert.match(html, /<span>Auto reload<\/span>/);
  assert.match(html, /data-refresh-preview title="Reload preview" disabled>Reload<\/button>/);
  assert.match(html, /aria-label="Toggle index"/);
  assert.match(html, /"showContents":"Open index"/);
  assert.match(html, /"hideContents":"Close index"/);
  assert.match(html, /"mermaidShowSource":"Open Mermaid source"/);
  assert.match(html, /"mermaidHideSource":"Close Mermaid source"/);
  assert.match(html, /"mermaidRendering":"Drawing Mermaid"/);
  assert.match(html, /"mermaidRenderFailed":"Mermaid failed"/);
});

test("enables manual preview refresh only when auto update is off", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const webview = {
    cspSource: "vscode-resource:",
    asWebviewUri: (uri: unknown) => uri
  } as never;

  const autoHtml = renderPreviewHtml(result, webview, { layout: true, element: true, action: true }, undefined, "login.vspec.md", true);
  const manualHtml = renderPreviewHtml(result, webview, { layout: true, element: true, action: true }, undefined, "login.vspec.md", false);

  assert.match(autoHtml, /data-auto-update role="switch" aria-label="Toggle auto preview update" checked>/);
  assert.match(autoHtml, /data-refresh-preview title="Refresh preview" disabled>Refresh<\/button>/);
  assert.match(manualHtml, /data-auto-update role="switch" aria-label="Toggle auto preview update" >/);
  assert.match(manualHtml, /data-refresh-preview title="Refresh preview" >Refresh<\/button>/);
  assert.match(autoHtml, /vscode\.postMessage\(\{ command: "setAutoUpdate", enabled: Boolean\(autoUpdate\.checked\) \}\);/);
});

test("renders top-level screen prose in the preview header", () => {
  const source = `---
id: SCR-USER-EDIT
type: screen
title: ユーザー編集
---

# SCR-USER-EDIT ユーザー編集

管理者がユーザ情報を編集するための画面。

<!-- preview hidden comment -->

## States

- idle*
`;
  const result = parseMarkVSpec(source);
  const html = renderPreviewHtml(
    result,
    {
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: unknown) => uri
    } as never,
    { layout: true, element: true, action: true },
    undefined,
    "user-edit.vspec.md"
  );

  assert.equal(result.screen.description, "管理者がユーザ情報を編集するための画面。");
  assert.match(html, /<div class="screen-title">ユーザー編集<\/div>/);
  assert.match(html, /<div class="screen-description"><p class="note-paragraph">管理者がユーザ情報を編集するための画面。<\/p><\/div>/);
  assert.doesNotMatch(html, /preview hidden comment/);
  assert.match(html, /<div class="screen-overview">\s*<div class="screen-overview-badges">[\s\S]*?<\/div>\s*<div class="screen-overview-main">/);
});

test("extracts preview render key fragments for partial updates", () => {
  const source = `---
id: SCR-FRAGMENT
type: screen
title: Fragment
---

# SCR-FRAGMENT Fragment

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title

## Elements

### E-Title Text

- value: Title
`;
  const result = parseMarkVSpec(source);
  const html = renderPreviewHtml(
    result,
    {
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: unknown) => uri
    } as never,
    { layout: true, element: true, action: true },
    undefined,
    "fragment.vspec.md"
  );
  const fragments = renderPreviewFragmentUpdates(result, {
    wireframeRenderKeys: ["element:E-Title"],
    previewDocumentRenderKeys: ["elements:list"]
  });
  const fullPreviewFragments = extractRenderKeyFragments(html, "element:E-Title");
  const fullElementSpecFragments = extractRenderKeyFragments(html, "elements:list");

  assert.equal(fragments.length, 2);
  assert.equal(fragments[0]?.renderKey, "element:E-Title");
  assert(fragments[0]?.html.length > 0);
  assert.deepEqual(fragments[0]?.html, fullPreviewFragments);
  assert(fragments[0]?.html.every((fragment) => fragment.includes('data-mm-render-key="element:E-Title"')));
  assert.equal(fragments[1]?.renderKey, "elements:list");
  assert(fragments[1]?.html.length > 0);
  assert.deepEqual(fragments[1]?.html, fullElementSpecFragments);
  assert(fragments[1]?.html.every((fragment) => fragment.includes('data-mm-render-key="elements:list"')));
  assert(fragments[1]?.html.some((fragment) => fragment.includes("Element Summary")));
  assert.deepEqual(extractRenderKeyFragments("<main></main>", "element:E-Title"), []);

  const unsupportedDocumentFragments = renderPreviewFragmentUpdates(result, {
    wireframeRenderKeys: [],
    previewDocumentRenderKeys: ["elements:list", "diagnostics:list"]
  });
  assert.equal(unsupportedDocumentFragments.length, 1);
  assert.equal(unsupportedDocumentFragments[0]?.renderKey, "elements:list");
  assert.deepEqual(
    buildPreviewUpdatePlan({
      hasPreviousSource: true,
      invalidation: {
        requiresFullRender: false,
        wireframeRenderKeys: [],
        previewDocumentRenderKeys: ["elements:list", "diagnostics:list"]
      },
      fragmentGroupCount: unsupportedDocumentFragments.length
    }),
    {
      kind: "fallback-full",
      reason: "fragment-generation-mismatch",
      expectedFragmentGroups: 2,
      actualFragmentGroups: 1
    }
  );
});

test("verifies typing-style preview updates choose partial or full render", () => {
  const previousSource = `---
id: SCR-TYPING-SMOKE
type: screen
title: Typing Smoke
---

# SCR-TYPING-SMOKE Typing Smoke

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title

## Elements

### E-Title Text

- value: Title
`;
  const typedSource = previousSource.replace("- value: Title", "- value: Title while typing");
  const partialInvalidation = computeMarkVSpecRenderInvalidation(previousSource, typedSource);
  const partialFragments = renderPreviewFragmentUpdates(parseMarkVSpec(typedSource), partialInvalidation);

  assert.equal(partialInvalidation.requiresFullRender, false);
  assert.deepEqual(partialInvalidation.wireframeRenderKeys, ["element:E-Title"]);
  assert.deepEqual(partialInvalidation.previewDocumentRenderKeys, ["elements:list"]);
  assert.deepEqual(
    buildPreviewUpdatePlan({
      hasPreviousSource: true,
      invalidation: partialInvalidation,
      fragmentGroupCount: partialFragments.length
    }),
    {
      kind: "fragment",
      expectedFragmentGroups: 2
    }
  );
  assert.equal(partialFragments.length, 2);
  assert(partialFragments.some((fragment) => fragment.renderKey === "element:E-Title" && fragment.html.join("").includes("Title while typing")));

  const structuralSource = previousSource.replace(
    "- E-Title\n\n## Elements",
    "- E-Title\n- E-Subtitle\n\n## Elements"
  ) + "\n### E-Subtitle Text\n\n- value: Added while typing\n";
  const fullInvalidation = computeMarkVSpecRenderInvalidation(previousSource, structuralSource);

  assert.equal(fullInvalidation.requiresFullRender, true);
  assert.deepEqual(
    buildPreviewUpdatePlan({
      hasPreviousSource: true,
      invalidation: fullInvalidation,
      fragmentGroupCount: 0
    }),
    {
      kind: "full",
      reason: "requires-full-render"
    }
  );
});

test("measures realtime preview feasibility on a larger typing update", () => {
  const previousSource = largeRealtimePreviewSource("Title 042");
  const typedSource = previousSource.replace("- value: Title 042", "- value: Title 042 while typing");

  // Measures the practical update pipeline: invalidation, parse, fragment render, and plan selection.
  const start = performance.now();
  const invalidation = computeMarkVSpecRenderInvalidation(previousSource, typedSource);
  const parsed = parseMarkVSpec(typedSource);
  const fragments = renderPreviewFragmentUpdates(parsed, invalidation);
  const plan = buildPreviewUpdatePlan({
    hasPreviousSource: true,
    invalidation,
    fragmentGroupCount: fragments.length
  });
  const elapsedMs = performance.now() - start;

  assert.equal(parsed.diagnostics.length, 0);
  assert.equal(invalidation.requiresFullRender, false);
  assert.deepEqual(invalidation.wireframeRenderKeys, ["element:E-042"]);
  assert.deepEqual(invalidation.previewDocumentRenderKeys, ["elements:list"]);
  assert.deepEqual(plan, {
    kind: "fragment",
    expectedFragmentGroups: 2
  });
  assert.equal(fragments.length, 2);
  assert(fragments.some((fragment) => fragment.renderKey === "element:E-042" && fragment.html.join("").includes("Title 042 while typing")));
  assert(elapsedMs < 5000, `large realtime preview update pipeline should not regress catastrophically; elapsed=${elapsedMs.toFixed(1)}ms`);
});

test("keeps multi-state partial fragments aligned with current state markers", () => {
  const source = `---
id: SCR-FRAGMENT-MULTI-STATE
type: screen
title: Fragment Multi State
---

# SCR-FRAGMENT-MULTI-STATE Fragment Multi State

## States

- idle*
- error

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title

## Elements

### E-Title Input

- placeholder: Updated
`;
  const result = parseMarkVSpec(source);
  const html = renderPreviewHtml(
    result,
    {
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: unknown) => uri
    } as never,
    { layout: true, element: true, action: true },
    undefined,
    "fragment-multi-state.vspec.md"
  );
  const fragments = renderPreviewFragmentUpdates(result, {
    wireframeRenderKeys: ["element:E-Title"],
    previewDocumentRenderKeys: []
  });
  const fullPreviewFragments = extractRenderKeyFragments(html, "element:E-Title");

  assert.equal(fragments.length, 1);
  assert.equal(fragments[0]?.renderKey, "element:E-Title");
  assert.deepEqual(fragments[0]?.html, fullPreviewFragments);
  assert.equal(fullPreviewFragments.length, 2);
  assert.match(fullPreviewFragments[0] ?? "", /mm-marker-element/);
  assert.match(fullPreviewFragments[1] ?? "", /mm-marker-element/);
  assert.match(fullPreviewFragments[1] ?? "", /data-mm-id="E-Title"/);
});

test("extracts leaf layout preview fragments for partial updates", () => {
  const source = `---
id: SCR-FRAGMENT-LAYOUT
type: screen
title: Fragment Layout
---

# SCR-FRAGMENT-LAYOUT Fragment Layout

## States

- idle*

## Layout: mobile

### L-Page Page

- grid
- gap: lg

#### Items

- E-Title

## Elements

### E-Title Text

- value: Title
`;
  const result = parseMarkVSpec(source);
  const html = renderPreviewHtml(
    result,
    {
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: unknown) => uri
    } as never,
    { layout: true, element: true, action: true },
    undefined,
    "fragment-layout.vspec.md"
  );
  const fragments = renderPreviewFragmentUpdates(result, {
    wireframeRenderKeys: ["layout:mobile:L-Page"],
    previewDocumentRenderKeys: ["layouts:list"]
  });

  assert.equal(fragments.length, 2);
  assert.deepEqual(fragments[0], {
    renderKey: "layout:mobile:L-Page",
    html: extractRenderKeyFragments(html, "layout:mobile:L-Page")
  });
  assert.deepEqual(fragments[1], {
    renderKey: "layouts:list",
    html: extractRenderKeyFragments(html, "layouts:list")
  });
  assert.match(fragments[0]?.html[0] ?? "", /mm-layout-grid/);
  assert.match(fragments[1]?.html[0] ?? "", /grid/);
});

test("builds preview update plans for full, fragment, and fallback paths", () => {
  assert.deepEqual(buildPreviewUpdatePlan({ hasPreviousSource: false }), {
    kind: "full",
    reason: "no-previous-source"
  });

  assert.deepEqual(buildPreviewUpdatePlan({ hasPreviousSource: true, sourceUnchanged: true }), {
    kind: "noop",
    reason: "unchanged-source"
  });

  assert.deepEqual(
    buildPreviewUpdatePlan({
      hasPreviousSource: true,
      invalidation: {
        requiresFullRender: true,
        wireframeRenderKeys: [],
        previewDocumentRenderKeys: []
      }
    }),
    {
      kind: "full",
      reason: "requires-full-render"
    }
  );

  assert.deepEqual(
    buildPreviewUpdatePlan({
      hasPreviousSource: true,
      invalidation: {
        requiresFullRender: false,
        wireframeRenderKeys: ["element:E-Title"],
        previewDocumentRenderKeys: ["elements:list"]
      },
      fragmentGroupCount: 2
    }),
    {
      kind: "fragment",
      expectedFragmentGroups: 2
    }
  );

  assert.deepEqual(
    buildPreviewUpdatePlan({
      hasPreviousSource: true,
      invalidation: {
        requiresFullRender: false,
        wireframeRenderKeys: [],
        previewDocumentRenderKeys: []
      },
      fragmentGroupCount: 0
    }),
    {
      kind: "noop",
      reason: "no-render-keys"
    }
  );

  assert.deepEqual(
    buildPreviewUpdatePlan({
      hasPreviousSource: true,
      invalidation: {
        requiresFullRender: false,
        wireframeRenderKeys: ["element:E-Title"],
        previewDocumentRenderKeys: ["elements:list"]
      },
      fragmentGroupCount: 1
    }),
    {
      kind: "fallback-full",
      reason: "fragment-generation-mismatch",
      expectedFragmentGroups: 2,
      actualFragmentGroups: 1
    }
  );
});

test("skips active editor preview updates when focus returns to the same document", () => {
  assert.equal(
    shouldSkipActiveEditorPreviewUpdate("file:///workspace/screen.vspec.md", "file:///workspace/screen.vspec.md"),
    true
  );
  assert.equal(
    shouldSkipActiveEditorPreviewUpdate("file:///workspace/screen.vspec.md", "file:///workspace/other.vspec.md"),
    false
  );
  assert.equal(shouldSkipActiveEditorPreviewUpdate(undefined, "file:///workspace/screen.vspec.md"), false);
  assert.equal(shouldUseIncrementalPreviewUpdate(true, false), true);
  assert.equal(shouldUseIncrementalPreviewUpdate(true, undefined), true);
  assert.equal(shouldUseIncrementalPreviewUpdate(true, true), false);
  assert.equal(shouldUseIncrementalPreviewUpdate(false, false), false);
});

test("coalesces preview updates and detects stale generations", () => {
  assert.equal(PREVIEW_AUTO_UPDATE_DEFAULT, true);
  assert.equal(PREVIEW_UPDATE_DEBOUNCE_MS, 150);
  assert.equal(PREVIEW_WEBVIEW_UPDATE_TIMEOUT_MS, 3000);

  const callbacks = new Map<number, () => void>();
  const cleared: number[] = [];
  const runs: string[] = [];
  let nextTimer = 1;
  let currentGenerationId = 0;
  let timer: number | undefined;

  const schedule = (documentUri: string) => {
    currentGenerationId += 1;
    const generationId = currentGenerationId;
    timer = scheduleCoalescedPreviewUpdate({
      timer,
      clearTimeout: (handle) => {
        cleared.push(handle);
        callbacks.delete(handle);
      },
      setTimeout: (callback, delayMs) => {
        assert.equal(delayMs, PREVIEW_UPDATE_DEBOUNCE_MS);
        const handle = nextTimer;
        nextTimer += 1;
        callbacks.set(handle, callback);
        return handle;
      },
      delayMs: PREVIEW_UPDATE_DEBOUNCE_MS,
      document: { uri: documentUri },
      documentUri,
      shouldRun: (scheduledDocumentUri) => isCurrentPreviewGenerationState({
        hasPreviewPanel: true,
        currentGenerationId,
        currentDocumentUri: documentUri
      }, generationId, scheduledDocumentUri),
      run: (document) => runs.push(document.uri),
      clearTimer: () => {
        timer = undefined;
      }
    });
  };

  schedule("file:///first.vspec.md");
  schedule("file:///second.vspec.md");
  assert.deepEqual(cleared, [1]);
  assert.equal(callbacks.has(1), false);
  callbacks.get(2)?.();
  assert.deepEqual(runs, ["file:///second.vspec.md"]);
  assert.equal(timer, undefined);

  schedule("file:///stale.vspec.md");
  currentGenerationId += 1;
  callbacks.get(3)?.();
  assert.deepEqual(runs, ["file:///second.vspec.md"]);

  const current = {
    hasPreviewPanel: true,
    currentGenerationId: 4,
    currentDocumentUri: "file:///second.vspec.md"
  };
  assert.equal(isCurrentPreviewGenerationState(current, 4, "file:///second.vspec.md"), true);
  assert.equal(isCurrentPreviewGenerationState(current, 3, "file:///second.vspec.md"), false);
  assert.equal(isCurrentPreviewGenerationState(current, 4, "file:///other.vspec.md"), false);
  assert.equal(isCurrentPreviewGenerationState({ ...current, hasPreviewPanel: false }, 4, "file:///second.vspec.md"), false);
});

test("keeps only the latest typing generation in coalesced realtime preview updates", () => {
  const callbacks = new Map<number, () => void>();
  const cleared: number[] = [];
  const runs: string[] = [];
  let nextTimer = 1;
  let currentGenerationId = 0;
  let timer: number | undefined;
  const documentUri = "file:///typing.vspec.md";

  const scheduleTypingUpdate = (sourceVersion: string) => {
    currentGenerationId += 1;
    const generationId = currentGenerationId;
    timer = scheduleCoalescedPreviewUpdate({
      timer,
      clearTimeout: (handle) => {
        cleared.push(handle);
        callbacks.delete(handle);
      },
      setTimeout: (callback, delayMs) => {
        assert.equal(delayMs, PREVIEW_UPDATE_DEBOUNCE_MS);
        const handle = nextTimer;
        nextTimer += 1;
        callbacks.set(handle, callback);
        return handle;
      },
      delayMs: PREVIEW_UPDATE_DEBOUNCE_MS,
      document: { uri: documentUri, sourceVersion },
      documentUri,
      shouldRun: (scheduledDocumentUri) => isCurrentPreviewGenerationState({
        hasPreviewPanel: true,
        currentGenerationId,
        currentDocumentUri: documentUri
      }, generationId, scheduledDocumentUri),
      run: (document) => runs.push(document.sourceVersion),
      clearTimer: () => {
        timer = undefined;
      }
    });
  };

  scheduleTypingUpdate("T");
  scheduleTypingUpdate("Ti");
  scheduleTypingUpdate("Tit");
  scheduleTypingUpdate("Title");
  assert.deepEqual(cleared, [1, 2, 3]);
  assert.deepEqual([...callbacks.keys()], [4]);
  callbacks.get(1)?.();
  callbacks.get(2)?.();
  callbacks.get(3)?.();
  assert.deepEqual(runs, []);
  callbacks.get(4)?.();
  assert.deepEqual(runs, ["Title"]);
  assert.equal(timer, undefined);

  scheduleTypingUpdate("Title stale");
  currentGenerationId += 1;
  callbacks.get(5)?.();
  assert.deepEqual(runs, ["Title"]);
});

test("formats realtime preview update telemetry", () => {
  assert.equal(
    formatPreviewUpdateTelemetry({
      sourceLabel: "login.vspec.md",
      generationId: 12,
      phase: "fragment-patch",
      planKind: "fragment",
      fragmentGroups: 2,
      expectedFragmentGroups: 2,
      patchSuccess: true,
      patchReason: "applied",
      elapsedMs: 24,
      parseMs: 4,
      invalidationMs: 2,
      fragmentRenderMs: 8,
      patchMs: 10,
      webviewPatchMs: 7
    }),
    "[preview-update] login.vspec.md generation=12 phase=fragment-patch plan=fragment fragments=2 expectedFragments=2 patchSuccess=true patchReason=applied elapsedMs=24 parseMs=4 invalidationMs=2 fragmentRenderMs=8 patchMs=10 webviewPatchMs=7"
  );

  assert.equal(
    formatPreviewUpdateTelemetry({
      sourceLabel: "login.vspec.md",
      generationId: 13,
      phase: "fallback-full",
      planKind: "fallback-full",
      fragmentGroups: 1,
      expectedFragmentGroups: 2,
      reason: "fragment-generation-mismatch",
      elapsedMs: 12
    }),
    "[preview-update] login.vspec.md generation=13 phase=fallback-full plan=fallback-full fragments=1 expectedFragments=2 reason=fragment-generation-mismatch elapsedMs=12"
  );

  assert.equal(
    formatPreviewUpdateTelemetry({
      sourceLabel: "login.vspec.md",
      generationId: 14,
      phase: "noop",
      planKind: "noop",
      reason: "unchanged-source",
      elapsedMs: 1
    }),
    "[preview-update] login.vspec.md generation=14 phase=noop plan=noop reason=unchanged-source elapsedMs=1"
  );

  assert.equal(
    formatPreviewUpdateTelemetry({
      sourceLabel: "login.vspec.md",
      generationId: 15,
      phase: "noop",
      planKind: "noop",
      fragmentGroups: 0,
      reason: "no-render-keys",
      elapsedMs: 2
    }),
    "[preview-update] login.vspec.md generation=15 phase=noop plan=noop fragments=0 reason=no-render-keys elapsedMs=2"
  );
});

test("normalizes structured preview patch results", () => {
  const current = {
    hasPreviewPanel: true,
    currentGenerationId: 5,
    currentDocumentUri: "file:///login.vspec.md"
  };

  assert.deepEqual(
    normalizePreviewPatchResultState(current, { generationId: 5, success: true }, "file:///login.vspec.md"),
    { success: true, reason: "applied" }
  );
  assert.deepEqual(
    normalizePreviewPatchResultState(current, { generationId: 5, success: true, webviewPatchMs: 6 }, "file:///login.vspec.md"),
    { success: true, reason: "applied", webviewPatchMs: 6 }
  );
  assert.deepEqual(
    normalizePreviewPatchResultState(current, { generationId: 5, success: false, reason: "target-count-mismatch:element:E-Title" }, "file:///login.vspec.md"),
    { success: false, reason: "target-count-mismatch:element:E-Title" }
  );
  assert.deepEqual(
    normalizePreviewPatchResultState(current, { generationId: 5, success: false }, "file:///login.vspec.md"),
    { success: false, reason: "webview-rejected" }
  );
  assert.deepEqual(
    normalizePreviewPatchResultState(current, { generationId: 4, success: true, reason: "applied" }, "file:///login.vspec.md"),
    { success: false, reason: "stale-generation-result" }
  );
  assert.deepEqual(
    normalizePreviewPatchResultState(current, { generationId: 5, success: true, reason: "applied" }, "file:///other.vspec.md"),
    { success: false, reason: "stale-generation-result" }
  );
  assert.deepEqual(
    normalizePreviewPatchResultState(current, { success: true }, "file:///login.vspec.md"),
    { success: false, reason: "missing-generation" }
  );
  assert.deepEqual(
    normalizePreviewPatchResultState({ ...current, hasPreviewPanel: false }, { generationId: 5, success: true }, "file:///login.vspec.md"),
    { success: false, reason: "stale-generation-result" }
  );
});

test("renders lightweight preview loading and error shells", () => {
  const webview = {
    cspSource: "vscode-resource:",
    asWebviewUri: (uri: unknown) => uri
  } as never;
  const loadingHtml = renderPreviewLoadingHtml(webview, "examples/04-real-world-screens/login-basic.vspec.md");
  const errorHtml = renderPreviewErrorHtml(webview, "examples/04-real-world-screens/login-basic.vspec.md", "Cannot read partial");

  assert.match(loadingHtml, /<title>Generating preview<\/title>/);
  assert.match(loadingHtml, /プレビューを生成中\.\.\./);
  assert.match(loadingHtml, /Preview is being generated\.\.\./);
  assert.match(loadingHtml, /class="status-spinner"/);
  assert.match(loadingHtml, /examples\/04-real-world-screens\/login-basic\.vspec\.md/);
  assert.doesNotMatch(loadingHtml, /acquireVsCodeApi/);
  assert.match(errorHtml, /<title>Preview error<\/title>/);
  assert.match(errorHtml, /プレビューを生成できませんでした/);
  assert.match(errorHtml, /Cannot read partial/);
  assert.doesNotMatch(errorHtml, /class="status-spinner"/);
});

test("keeps marker controls without viewport filter controls for a single viewport", () => {
  const source = `---
id: SCR-SINGLE
type: screen
title: Single Viewport
route: /single
---

# SCR-SINGLE Single Viewport

## States

- idle*

## Layout: mobile

### L-Root Root

- stack

#### Items
`;
  const result = parseMarkVSpec(source);
  const html = renderPreviewHtml(
    result,
    {
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: unknown) => uri
    } as never,
    { layout: true, element: true, action: true },
    undefined,
    "single.vspec.md"
  );
  const toolbar = html.match(/<header class="toolbar">[\s\S]*?<\/header>/)?.[0] ?? "";

  assert.doesNotMatch(toolbar, /data-viewport-filter/);
  assert.doesNotMatch(toolbar, />All<\/button>/);
  assert.doesNotMatch(toolbar, />mobile<\/button>/);
  assert.match(toolbar, /data-marker-toggle="layout"/);
});

test("keeps action-level availability out of localized action details", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const preview = renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false });
  const html = renderDesignDocumentHtml(result, preview);
  const actionDetailsSection = docSectionByHeading(html, "Action Details", "Validations");

  assert.doesNotMatch(actionDetailsSection, /<dt>When<\/dt>|<dt>有効条件<\/dt>|condition-expression/);
  assert.doesNotMatch(actionDetailsSection, /enabled: all:/);
});

test("uses element overview as summary description after description and purpose", () => {
  const source = `---
id: SCR-ELEMENT-OVERVIEW
type: screen
title: Element Overview
---

# SCR-ELEMENT-OVERVIEW Element Overview

## States

- idle*

## Layout: mobile

### L-Root Root

- stack

#### Items

- E-Primary
- E-Purpose
- E-Overview

## Elements

### E-Primary Button

Element overview should not override description.

- description: Primary description

### E-Purpose Button

Element overview should not override purpose.

- purpose: Purpose description

### E-Overview Button

Overview first paragraph.

Second paragraph is detail-only.

- label: Overview
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const elementSummary = html.match(/<h6 class="state-screen-detail-heading">Element Summary<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(elementSummary, /Primary description/);
  assert.match(elementSummary, /Purpose description/);
  assert.match(elementSummary, /Overview first paragraph\./);
  assert.doesNotMatch(elementSummary, /Second paragraph is detail-only\./);
});

test("renders route params in element summary and action details", () => {
  const source = `---
id: SCR-LIST
type: screen
title: List
---

# SCR-LIST List

## States

- idle*

## Layout: mobile

### L-List List

- stack

#### Items

- E-お知らせリンク
- E-NoticeId

## Elements

### E-お知らせリンク Link

- sample: Notice
- href: SCR-NOTICE-DETAIL
- params:
  - noticeId: \${model.notice.noticeId}

### E-NoticeId Text

- sample: N-001
- src: \${route.noticeId}

## Actions

### A-OpenNotice Open notice

- Triggered
  - E-お知らせリンク.click
- From
  - idle
- Process: Immediate
  - case: success
    - navigate: SCR-NOTICE-DETAIL
    - params:
      - noticeId: \${model.notice.noticeId}
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const elementSummary = html.match(/<h6 class="state-screen-detail-heading">Element Summary<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";
  const actionableDetails = html.match(/<div class="element-detail-group"><h4>Actionable<\/h4>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.doesNotMatch(elementSummary, /<th>Route Parameters<\/th>/);
  assert.doesNotMatch(actionableDetails, /<th>Route Parameters<\/th>/);
  assert.match(html, new RegExp(`noticeId: ${sourceCodePattern("${model.notice.noticeId}")}`));
  assert.match(html, new RegExp(sourceCodePattern("${route.noticeId}")));
  assert.match(html, new RegExp(`Route Parameters <ul><li>noticeId: ${sourceCodePattern("${model.notice.noticeId}")}</li></ul>`));
});

test("omits model update summary and hides model mutation side effects from action details", () => {
  const source = `---
id: SCR-MODEL-UPDATES
type: screen
title: Legacy Model Mutations
locale: ja
---

# SCR-MODEL-UPDATES Legacy Model Mutations

## States

- loading*
- idle
- error

## Actions

### A1:A-LoadNotice お知らせ取得

- Triggered
  - screen.load
- From
  - loading
- Process: ServerCall
  - NoticeQueryService.findNotice()
    - noticeId: \${route.noticeId}
  - case: success
    - response: 200 お知らせ本文
    - model: \${model.notice} = NoticeDetailResult
    - model: \${model.notice.noticeId} = \${route.noticeId}
    - state: idle
  - case: failure
    - response: 404
    - state: error

### A2:A-RefreshMeta メタ情報更新

- Triggered
  - manual.refresh
- From
  - idle
- Process: RefreshMeta
  - case: success
    - model: \${model.noticeMeta} = NoticeMetaResult
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const actionDetailsSection = docSectionByHeading(html, "アクション詳細", "フォームグループ");

  assert.doesNotMatch(html, /<h2>モデル更新処理<\/h2>|<h2>Model Updates<\/h2>|model-update-list|model-update-group|model-update-meta/);
  assert.match(actionDetailsSection, new RegExp(`NoticeQueryService\\.findNotice\\(\\)<ul class="spec-list spec-nested-list"><li>noticeId: ${sourceCodePattern("${route.noticeId}")}</li></ul>`));
  assert.doesNotMatch(actionDetailsSection, new RegExp(`model: ${sourceCodePattern("${model.notice}")} = NoticeDetailResult`));
  assert.doesNotMatch(actionDetailsSection, new RegExp(`model: ${sourceCodePattern("${model.notice.noticeId}")} = ${sourceCodePattern("${route.noticeId}")}`));
  assert.doesNotMatch(actionDetailsSection, new RegExp(`model: ${sourceCodePattern("${model.noticeMeta}")} = NoticeMetaResult`));
  assert.match(actionDetailsSection, new RegExp(`<strong>${docLabel("success", "result")}<\\/strong>`));
  assert.match(actionDetailsSection, new RegExp(`(?:effect set state|効果 状態更新) ${docLabel("idle", "state")}`));
});

test("groups partial update side effects under nested lists", () => {
  const source = `---
id: SCR-SIDE-EFFECTS
type: screen
title: Side Effects
locale: ja
---

# SCR-SIDE-EFFECTS Side Effects

## States

- idle*

## Layout: desktop

### T1:L-UserTable User table

- stack
- Items
  - E-ユーザー表

## Elements

### 1:E-ユーザー表 Table

- columns:
  - 氏名
- rows:
  - 佐藤 拓真

### 2:E-検索ボタン Button

- sample: 検索

## Actions

### A1:A-SearchUsers ユーザー検索

- Triggered
  - E-検索ボタン.click
- From
  - idle
- Process: PartialRequest
  - request: POST /users/search
  - update
    - target: L-UserTable
    - content: 更新後のユーザー一覧
    - mode: replace
    - side effect: レスポンスのユーザー一覧を \${model.users.items} に格納する
    - side effect: レスポンスのページ番号を \${model.page} に格納する
    - side effect: \${model.error} を空にする
- Process: Immediate
  - case: success
    - response: 200 ユーザー一覧
    - state: idle
    - update:
      - target: L-UserTable
      - content: 検索結果を表示する
      - side effect: \${model.audit} < value & retry
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const actionDetailsSection = docSectionByHeading(html, "アクション詳細");

  assert.doesNotMatch(html, /<h2>部分更新<\/h2>/);
  assert.match(actionDetailsSection, /<dt>部分更新<\/dt><dd>[\s\S]*<th>ケース<\/th><th>対象<\/th><th>差し替え内容<\/th>/);
  assert.doesNotMatch(actionDetailsSection, /<dt>部分更新<\/dt><dd>[\s\S]*<th>結果<\/th>/);
  assert.match(actionDetailsSection, new RegExp(`<dt>部分更新</dt><dd>[\\s\\S]*<ul class="spec-list spec-effect-list"><li>内容 更新後のユーザー一覧</li><li>モード replace</li><li><span class="spec-list-label">副作用</span><ul class="spec-list spec-nested-list"><li>レスポンスのユーザー一覧を ${sourceCodePattern("${model.users.items}")} に格納する</li><li>レスポンスのページ番号を ${sourceCodePattern("${model.page}")} に格納する</li><li>${sourceCodePattern("${model.error}")} を空にする</li></ul></li></ul>`));
  assert.doesNotMatch(actionDetailsSection, /side effect レスポンス/);
  assert.match(actionDetailsSection, new RegExp(`<div class="process-card-header"><span class="process-card-title">PartialRequest</span></div>[\\s\\S]*<ul class="spec-list spec-effect-list"><li>リクエスト: POST /users/search</li><li>更新 ${detailLayoutRef("T1", "User table")}</li><li>モード replace</li><li>内容 更新後のユーザー一覧</li><li><span class="spec-list-label">副作用</span><ul class="spec-list spec-nested-list"><li>レスポンスのユーザー一覧を ${sourceCodePattern("${model.users.items}")} に格納する</li><li>レスポンスのページ番号を ${sourceCodePattern("${model.page}")} に格納する</li><li>${sourceCodePattern("${model.error}")} を空にする</li></ul></li></ul>`));
  assert.match(actionDetailsSection, new RegExp(`<li>更新 <ul class="spec-list spec-effect-list"><li>${detailLayoutRef("T1", "User table")}</li><li>内容 検索結果を表示する</li><li><span class="spec-list-label">副作用</span><ul class="spec-list spec-nested-list"><li>${sourceCodePattern("${model.audit}")} &lt; value &amp; retry</li></ul></li></ul></li>`));
});

test("omits model sample blocks from state wireframe sections", () => {
  const source = `---
id: SCR-MODEL-SAMPLES
type: screen
title: Model Samples
locale: ja
---

# SCR-MODEL-SAMPLES Model Samples

## States

- loaded*
- empty
- missing
- undefined

## Model Samples

### loaded

#### \${model.noticeList.items}

| noticeId | title | read |
|---|---|---|
| N-001 | メンテナンスのお知らせ | false |
| N-002 | 利用規約改定のお知らせ | true |

#### \${model.noticeList.meta}

| total |
|---|
| 2 |

### empty

#### \${model.noticeList.items}

| noticeId | title | read |
|---|---|---|

### undefined

#### \${model.notice}
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const loadedSection = stateSection(html, "loaded");
  const emptySection = stateSection(html, "empty");
  const missingSection = stateSection(html, "missing");
  const undefinedSection = stateSection(html, "undefined");

  assert.doesNotMatch(html, /<h2>モデルサンプル<\/h2>/);
  for (const section of [loadedSection, emptySection, missingSection, undefinedSection]) {
    assert.doesNotMatch(section, /model-sample-group|model-sample-block|<h5 class="state-screen-subheading">モデルサンプル<\/h5>/);
    assert.match(section, /<h5 class="state-screen-subheading">ワイヤーフレーム<\/h5>/);
  }
});

test("renders preview scenario samples in generated state views", () => {
  const source = `---
id: SCR-SCENARIO-SAMPLES
type: screen
title: Scenario Samples
---

# SCR-SCENARIO-SAMPLES Scenario Samples

## States

- loaded*

## Layout

### L-Main Stack

#### Items

- E-Title
- E-Users
- E-EmptyUsers

## Elements

### E-Title Text

- source: data
- sample: Fallback title

### E-Users Table

- source: data
- Columns:
  - Name: \${model.users.name}
  - Role: \${model.users.role}
- sample rows:
  - row:
    - name: Alice
    - role: Admin

### E-EmptyUsers Table

- source: data
- Columns:
  - name: Name
- sample rows: []

## Preview Scenarios

### loaded

- samples:
  - E-Title: Baseline scenario title
  - E-Users:
    - rows:
      - row:
        - name: Bob
        - role: Viewer

### loaded-users

- state: loaded
- samples:
  - E-Users:
    - rows:
      - row:
        - name: Carol
        - role: Owner
  - E-EmptyUsers:
    - rows: []
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const baseSection = stateViewTitleSection(html, "loaded");
  const scenarioSection = stateViewTitleSection(html, "loaded / loaded-users");
  const baseWireframe = stateWireframeSection(baseSection);
  const scenarioWireframe = stateWireframeSection(scenarioSection);

  assert.match(baseWireframe, /Baseline scenario title/);
  assert.match(baseWireframe, /<td>Bob<\/td><td>Viewer<\/td>/);
  assert.match(baseSection, /<h6 class="state-screen-detail-heading">Scenario Samples<\/h6>/);
  assert.match(baseSection, /E-Title[\s\S]*Baseline scenario title/);
  assert.doesNotMatch(html, /data-state-view-title="loaded \/ loaded"/);
  assert.match(scenarioWireframe, /Baseline scenario title/);
  assert.match(scenarioWireframe, /<td>Carol<\/td><td>Owner<\/td>/);
  assert.doesNotMatch(scenarioWireframe, /Fallback title|<td>Alice<\/td><td>Admin<\/td>|<td>Bob<\/td><td>Viewer<\/td>/);
  assert.match(scenarioWireframe, /<td class="mm-table-empty" colspan="1">\(no data\)<\/td>/);
  assert.match(scenarioSection, /<h6 class="state-screen-detail-heading">Scenario Samples<\/h6>/);
  assert.match(scenarioSection, /E-Title[\s\S]*Baseline scenario title/);
  assert.match(scenarioSection, /E-Users[\s\S]*<code>rows: 1 rows<\/code>/);
  assert.match(scenarioSection, /<section class="scenario-sample-rows-block" id="sample-rows-default-loaded.20.2F.20loaded-users-E-Users">/);
  assert.match(scenarioSection, /<h6 class="scenario-sample-rows-heading">Sample Rows: [\s\S]*E-Users/);
  assert.match(scenarioSection, /<table class="spec-table scenario-sample-rows-table">/);
  assert.match(scenarioSection, /<th>Name<\/th><th>Role<\/th>/);
  assert.match(scenarioSection, /<td>Carol<\/td><td>Owner<\/td>/);
  assert(scenarioSection.indexOf('<section class="scenario-sample-rows-block"') > scenarioSection.indexOf("</table></div>"));
  assert.match(scenarioSection, /E-EmptyUsers[\s\S]*<code>rows: \[\]<\/code>/);
  assert.match(scenarioSection, /<section class="scenario-sample-rows-block" id="sample-rows-default-loaded.20.2F.20loaded-users-E-EmptyUsers">/);
  assert.equal(scenarioSection.match(/<section class="scenario-sample-rows-block"/g)?.length, 2);
});

test("localizes preview scenario sample table labels in generated state views", () => {
  const source = `---
id: SCR-SCENARIO-SAMPLES-JA
type: screen
title: シナリオサンプル
locale: ja
---

# SCR-SCENARIO-SAMPLES-JA シナリオサンプル

## States

- loaded*

## Layout

### L-Main Stack

#### Items

- E-Title
- E-Users

## Elements

### E-Title Text

- source: data
- sample: 通常タイトル

### E-Users Table

- source: data
- Columns:
  - name: 名前
- sample rows:
  - row:
    - name: 通常

## Preview Scenarios

### loaded-special

- state: loaded
- samples:
  - E-Title: 特別タイトル
  - E-Users:
    - rows:
      - row:
        - name: 一郎
      - row:
        - name: 二郎
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const scenarioSection = stateViewTitleSection(html, "loaded / loaded-special");

  assert.match(scenarioSection, /<h6 class="state-screen-detail-heading">シナリオサンプル<\/h6>/);
  assert.match(scenarioSection, /<th>画面要素<\/th><th>サンプル<\/th>/);
  assert.match(scenarioSection, /<code>rows: 2 行<\/code>/);
  assert.match(scenarioSection, /<h6 class="scenario-sample-rows-heading">サンプル 行数:/);
  assert.match(scenarioSection, /<table class="spec-table scenario-sample-rows-table">/);
  assert.match(scenarioSection, /<th>名前<\/th>/);
  assert.match(scenarioSection, /<td>一郎<\/td>/);
  assert.match(scenarioSection, /<td>二郎<\/td>/);
  assert.doesNotMatch(scenarioSection, /<h6 class="state-screen-detail-heading">Scenario Samples<\/h6>|<th>Sample<\/th>/);
  assert.doesNotMatch(scenarioSection, /2 rows/);
});

test("omits model sample state group and sample set prose from state views", () => {
  const source = `---
id: SCR-MODEL-SAMPLE-PROSE
type: screen
title: Model Sample Prose
---

# SCR-MODEL-SAMPLE-PROSE Model Sample Prose

## States

- loaded*

## Model Samples

Model Samples section overview.

### loaded

Loaded group overview.

#### \${model.users.items}

Users sample overview.

| id | name |
| --- | ---- |
| u1 | Alice |

Users sample notes.

#### State Notes

Loaded group notes.

### Section Notes

Model Samples section notes.
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const loadedSection = stateSection(html, "loaded");

  assert.doesNotMatch(loadedSection, /model-sample-block|Model Samples section overview|Loaded group overview|Users sample overview|Users sample notes|Loaded group notes|Model Samples section notes/);
});

test("omits composed model sample prose from state views", () => {
  const templateSource = `---
id: TPL-MODEL-SAMPLES
type: template
title: Model Samples Template
---

# TPL-MODEL-SAMPLES Model Samples Template

## States

- loaded*

## Model Samples

Template section overview.

### loaded

Template group overview.

#### \${model.template.items}

Template set overview.

| id |
| --- |
| t1 |

Template set notes.

#### State Notes

Template group notes.

### Section Notes

Template section notes.
`;
  const screenSource = `---
id: SCR-MODEL-SAMPLES
type: screen
title: Model Samples Screen
---

# SCR-MODEL-SAMPLES Model Samples Screen

## States

- loaded*

## Model Samples

Screen section overview.

### loaded

Screen group overview.

#### \${model.screen.items}

Screen set overview.

| id |
| --- |
| s1 |

Screen set notes.

#### State Notes

Screen group notes.

### Section Notes

Screen section notes.
`;
  const composed = composeMarkVSpecTemplate(parseMarkVSpec(templateSource), parseMarkVSpec(screenSource));
  const html = renderDesignDocumentHtml(composed, renderMarkVSpecHtml(composed, { includeStyles: false }));
  const loadedSection = stateSection(html, "loaded");

  assert.doesNotMatch(loadedSection, /Template section overview|Screen section overview|Template group overview|Screen group overview|\$\{model\.template\.items\}|\$\{model\.screen\.items\}|Template set overview|Screen set overview|Template group notes|Screen group notes|Template section notes|Screen section notes/);
});

test("renders validation rules in client and server scope groups", () => {
  const source = `---
id: SCR-VALIDATIONS
type: screen
title: Validations
locale: ja
---

# SCR-VALIDATIONS Validations

## States

- idle*
- loaded
- roles-loaded
- load-error

## Elements

### 1:E-パスワード入力 Input

- value: \${model.password}

### 2:E-PasswordConfirmInput Input

- value: \${model.passwordConfirm}

## Actions

### A1:A-SaveUser 保存

- Triggered
  - E-パスワード入力.submit

## Validations

### V-EmailRequired メール必須

- target: E-パスワード入力
- rules:
  - required:
    - E-パスワード入力
- scope: field
- run: client
- condition: E-パスワード入力.value is empty
- message: メールアドレスを入力してください。

### V-PasswordConfirmation パスワード確認

- target: E-パスワード入力
- target: E-PasswordConfirmInput
- rules:
  - same-as:
    - E-パスワード入力
    - E-PasswordConfirmInput
- scope: cross-field
- run: client
- condition: E-パスワード入力.value equals E-PasswordConfirmInput.value
- message: パスワードと確認用パスワードが一致していること。

### V-EmailUnique メール重複

- target: E-パスワード入力
- rules:
  - unique:
    - E-パスワード入力
- scope: single
- run: server
- condition: server response ERR-EMAIL-TAKEN
- message: このメールアドレスは使用できません。
- error code: ERR-EMAIL-TAKEN

### V-AccountConsistency アカウント整合性

- target: E-パスワード入力
- target: E-PasswordConfirmInput
- rules:
  - consistent:
    - E-パスワード入力
    - E-PasswordConfirmInput
- scope: composite
- run: server-response
- condition: server response ERR-ACCOUNT-CONSISTENCY
- message: アカウント情報を確認してください。
- error code: ERR-ACCOUNT-CONSISTENCY
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const section = docSectionByHeading(html, "Validations", "業務ルール");
  const clientField = section.match(/<h3>クライアント単項目検証<\/h3>[\s\S]*?<\/table>/)?.[0] ?? "";
  const clientCrossField = section.match(/<h3>クライアント複合項目検証<\/h3>[\s\S]*?<\/table>/)?.[0] ?? "";
  const serverField = section.match(/<h3>サーバ単項目検証<\/h3>[\s\S]*?<\/table>/)?.[0] ?? "";
  const serverCrossField = section.match(/<h3>サーバ複合項目検証<\/h3>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(section, /<h3>クライアント単項目検証<\/h3>/);
  assert.match(section, /<h3>クライアント複合項目検証<\/h3>/);
  assert.match(section, /<h3>サーバ単項目検証<\/h3>/);
  assert.match(section, /<h3>サーバ複合項目検証<\/h3>/);
  assert.match(clientField, /<th>番号\/ID<\/th><th>対象<\/th><th>ルール<\/th><th>条件<\/th><th>メッセージ<\/th><th>エラーコード<\/th>/);
  assert.doesNotMatch(section, /<th>結果<\/th>/);
  assert.doesNotMatch(section, /<th>範囲<\/th>|<th>実行<\/th>/);
  assert.match(clientField, new RegExp(`<td>${refMessageChip("V-EmailRequired", "V-EmailRequired", "メール必須")}</td>`));
  assert.match(clientField, /非推奨 condition:/);
  assert.doesNotMatch(clientField, /V-PasswordConfirmation|V-EmailUnique|V-AccountConsistency/);
  assert.match(clientCrossField, /<th>番号\/ID<\/th><th>対象<\/th><th>入力<\/th><th>チェック<\/th><th>条件<\/th><th>メッセージ<\/th><th>エラーコード<\/th>/);
  assert.match(clientCrossField, new RegExp(`<td>${refMessageChip("V-PasswordConfirmation", "V-PasswordConfirmation", "パスワード確認")}</td>`));
  assert.match(clientCrossField, new RegExp(`<li>${markerBadge("1", "element")}<\\/li><li>${markerBadge("2", "element")}<\\/li>`));
  assert.match(clientCrossField, /same-as/);
  assert.match(clientCrossField, new RegExp(`${markerBadge("1", "element")}\\.value equals ${markerBadge("2", "element")}\\.value`));
  assert.doesNotMatch(clientCrossField, /V-PasswordConfirmation\.result/);
  assert.doesNotMatch(clientCrossField, /V-EmailRequired|V-EmailUnique|V-AccountConsistency/);
  assert.match(serverField, new RegExp(`<td>${refMessageChip("V-EmailUnique", "V-EmailUnique", "メール重複")}</td>`));
  assert.match(serverField, /ERR-EMAIL-TAKEN/);
  assert.doesNotMatch(serverField, /V-EmailRequired|V-PasswordConfirmation|V-AccountConsistency/);
  assert.match(serverCrossField, new RegExp(`<td>${refMessageChip("V-AccountConsistency", "V-AccountConsistency", "アカウント整合性")}</td>`));
  assert.match(serverCrossField, /ERR-ACCOUNT-CONSISTENCY/);
  assert.doesNotMatch(serverCrossField, /V-EmailRequired|V-PasswordConfirmation|V-EmailUnique/);
});

test("renders empty validation rules section with none label", () => {
  const source = `---
id: SCR-NO-VALIDATIONS
type: screen
title: No Validations
locale: ja
---

# SCR-NO-VALIDATIONS No Validations

## States

- idle*
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const section = docSectionByHeading(html, "Validations", "業務ルール");

  assert.match(section, /<p class="spec-empty">なし。<\/p>/);
});

test("renders Form Groups once as a common section and links validation targets", () => {
  const source = `---
id: SCR-FORMGROUP-PREVIEW
type: screen
title: FormGroup Preview
locale: ja
---

# SCR-FORMGROUP-PREVIEW FormGroup Preview

## States

- idle*
- editing

## Layout: mobile

### L-LoginForm Login form layout

- stack

#### Items

- E-EmailInput
- E-PasswordInput

## Layout: desktop

### L-LoginForm Login form layout

- stack

#### Items

- E-EmailInput
- E-PasswordInput
- E-DesktopOnlyInput

## Elements

### E-EmailInput Input

- value: \${model.email}

### E-PasswordInput Input

- value: \${model.password}

### E-DesktopOnlyInput Input

- value: \${model.desktopOnly}

## Form Groups

フォームグループ概要です。

### F1:F-LoginForm Login form

- fields:
  - E-EmailInput
  - E-PasswordInput
- submit: A-SubmitLogin

### F-DesktopOnlyForm Desktop-only form

- fields:
  - E-DesktopOnlyInput

### Section Notes

フォームグループ補足です。

## Actions

### A-SubmitLogin Submit login

- Triggered
  - E-PasswordInput.submit

## Validations

### V-LoginForm Login form validation

- target: F-LoginForm
- rules:
  - required:
    - E-EmailInput
    - E-PasswordInput
- scope: composite
- run: client
- message: Email and password are required.
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const idleSection = stateSection(html, "idle");
  const formGroups = docSectionByHeading(html, "フォームグループ", "Validations");
  const validations = docSectionByHeading(html, "Validations", "業務ルール");
  const fragments = renderPreviewFragmentUpdates(result, { wireframeRenderKeys: [], previewDocumentRenderKeys: ["form-groups:list"] });

  assertPatternsInOrder(html, [
    numberedHeadingPattern(2, "アクション詳細"),
    numberedHeadingPattern(2, "フォームグループ", ' id="form-groups"'),
    numberedHeadingPattern(2, "Validations"),
    numberedHeadingPattern(2, "業務ルール")
  ]);
  assert.match(idleSection, /mm-marker-form-group" data-mm-marker-category="form-group">F1<\/code>/);
  assert.doesNotMatch(idleSection, /form-groups:list/);
  assert.match(formGroups, numberedHeadingPattern(2, "フォームグループ", ' id="form-groups"'));
  assert.match(formGroups, /<div class="entity-overview"><p class="note-paragraph">フォームグループ概要です。<\/p><\/div>\s*<div class="form-group-spec-fragment"/);
  assert.match(formGroups, /<th>番号\/ID<\/th><th>項目<\/th><th>送信<\/th>/);
  assert.match(formGroups, new RegExp(`<td>${refFormGroupChip("F1", "F-LoginForm", "Login form")}</td>`));
  assert.match(formGroups, new RegExp(`<li>${detailElementRef("E-EmailInput", "E-EmailInput")}</li><li>${detailElementRef("E-PasswordInput", "E-PasswordInput")}</li>`));
  assert.match(formGroups, new RegExp(`<td>${refActionChip("A-SubmitLogin", "A-SubmitLogin", "Submit login")}</td>`));
  assert.match(formGroups, new RegExp(`<td>${refFormGroupChip("F-DesktopOnlyForm", "F-DesktopOnlyForm", "Desktop-only form")}</td>`));
  assert.match(formGroups, new RegExp(`<li>${detailElementRef("E-DesktopOnlyInput", "E-DesktopOnlyInput")}</li>`));
  assert.doesNotMatch(formGroups, /<th>レイアウト<\/th>/);
  assert.match(formGroups, /<\/div>\s*<div class="entity-notes"><p class="note-paragraph">フォームグループ補足です。<\/p><\/div>/);
  assert.match(validations, new RegExp(`<td>${refFormGroupChip("F1", "F-LoginForm", "Login form")}</td>`));
  assert.doesNotMatch(html, /id="form-group-F-LoginForm"/);
  assert.equal([...html.matchAll(/<h2 id="form-groups">\s*<span class="section-number">[\d.]+\.<\/span>\s*フォームグループ<\/h2>/g)].length, 1);
  assert.equal([...html.matchAll(/id="form-groups"/g)].length, 1);
  assert.equal(fragments.length, 1);
  assert.equal(fragments[0]?.renderKey, "form-groups:list");
  assert.equal(fragments[0]?.html.length, 1);
  assert.match(fragments[0]?.html[0] ?? "", /F-DesktopOnlyForm/);
});

test("renders state transitions as a from-to matrix", () => {
  const source = `---
id: SCR-TRANSITION-MATRIX
type: screen
title: Transition Matrix
---

# SCR-TRANSITION-MATRIX Transition Matrix

## States

States section overview for the matrix.

- idle*
  - Ready for submit.
- submitting
  - Waiting for response.
- error

States section notes for the matrix.

## Elements

### 1:E-SubmitButton Button

- label: Submit

## Actions

### A1:A-Submit Submit

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process: Immediate
  - Effects
    - state: submitting

### A2:A-SubmitResponse Submit response

- Triggered
  - A-Submit.P1.response
- From
  - submitting
- Process P1: Immediate
  - case: failure
    - response: 500
    - state: error
  - case: success
    - response: 200
    - navigate: SCR-DONE
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const section = docSectionByHeading(html, "State Transitions", "Diagnostics");
  const stateFlowSection = html.match(/<section class="doc-section state-flow-section"[^>]*>[\s\S]*?(?=<section class="doc-section state-views-section")/)?.[0] ?? "";

  assert.match(stateFlowSection, /<div class="state-flow-diagram">\s*<a class="state-flow-table-link" href="#state-transition-table" aria-label="See State Transitions for details\." title="See State Transitions for details\."><span class="state-flow-table-link-icon" aria-hidden="true"><\/span><span class="state-flow-table-link-label">See State Transitions for details\.<\/span><\/a>\s*<pre class="mermaid-source" data-mermaid-source>[\s\S]*<div class="mermaid-placeholder" data-mermaid-placeholder>Rendering Mermaid diagram\.\.\.<\/div>/);
  assert.match(section, /<div class="entity-overview"><p class="note-paragraph">States section overview for the matrix\.<\/p><\/div>\s*<div class="spec-table-wrap"><table class="spec-table state-transition-matrix">/);
  assert.doesNotMatch(section, /State Descriptions/);
  assert.doesNotMatch(section, /<th>State<\/th><th>Description<\/th>/);
  assert.doesNotMatch(section, /Ready for submit\./);
  assert.doesNotMatch(section, /Waiting for response\./);
  assert.match(section, new RegExp(`<th class="state-transition-axis-cell" scope="col" aria-label="Rows are From states; columns are To states\\."><span class="state-transition-axis-labels" aria-hidden="true"><span class="from">From</span><span class="to">To</span></span></th><th>${docLabel("idle", "state")}</th><th>${docLabel("submitting", "state")}</th><th>${docLabel("error", "state")}</th>`));
  assert.match(section, new RegExp(`<tr><th scope="row">${docLabel("idle", "state")}</th><td>-</td><td>${refActionChip("A1", "A-Submit", "Submit")}</td><td>-</td></tr>`));
  assert.match(section, new RegExp(`<tr><th scope="row">${docLabel("submitting", "state")}</th><td>-</td><td>-</td><td>${refActionChip("A2", "A-SubmitResponse", "Submit response")}<div class="mm-ref-chip-note">failure</div></td></tr>`));
  assert.match(section, /<h3 class="state-transition-context-heading">State Notes<\/h3>\s*<div class="entity-notes"><p class="note-paragraph">States section notes for the matrix\.<\/p><\/div>/);
  assert.doesNotMatch(section, /\(\*\)/);
  assert.doesNotMatch(stateFlowSection, /\[\*\] --&gt;/);
  assert.doesNotMatch(section, /E-SubmitButton\.click \/ /);
  assert.doesNotMatch(section, /SCR-DONE/);
  assert.doesNotMatch(html, /<h2>Action Transitions<\/h2>/);
});

test("renders lifecycle origin chains for response-triggered state transitions", () => {
  const source = readFileSync(resolve("../../examples/02-states/scenario-samples.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const loadAction = result.actions.find((action) => action.id === "A-LoadAccount");
  const responseAction = result.actions.find((action) => action.id === "A-HandleAccountResponse");
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const stateFlow = html.match(/<section class="doc-section state-flow-section"[^>]*>[\s\S]*?(?=<section class="doc-section state-views-section")/)?.[0] ?? "";
  const stateTransitions = docSectionByHeading(html, "State Transitions", "Diagnostics");
  const actionDetails = docSectionByHeading(html, "Action Details", "Form Groups");

  assert.match(stateFlow, /<h2><span class="section-number">\d+\.<\/span> State Flow<\/h2>/);
  assert.deepEqual(loadAction?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["before-load", "sent", "initializing"]
  ]);
  assert.deepEqual(responseAction?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["initializing", "has-subscriptions", "loaded"],
    ["initializing", "empty", "loaded"],
    ["initializing", "failure", "initialize-error"]
  ]);
  assert.doesNotMatch(stateFlow, /\[\*\] --&gt;/);
  assert.match(stateTransitions, new RegExp(`<th>${docLabel("before-load", "state")}</th><th>${docLabel("initializing", "state")}</th><th>${docLabel("loaded", "state")}</th><th>${docLabel("initialize-error", "state")}</th>`));
  assert.match(stateTransitions, new RegExp(`<tr><th scope="row">${docLabel("before-load", "state")}</th><td>-</td><td>${refActionChip("A1", "A-LoadAccount", "Load account")}<div class="mm-ref-chip-note">page\\.load</div><div class="mm-ref-chip-note">sent</div></td><td>-</td><td>-</td></tr>`));
  assert.doesNotMatch(stateTransitions, /\(\*\)/);
  assert.doesNotMatch(html, /id="state-view-before-load"/);
  assert.match(stateTransitions, /page\.load -&gt; A-LoadAccount -&gt; A-LoadAccount\.P1\.response -&gt; A-HandleAccountResponse\.P1\.has-subscriptions/);
  assert.match(stateTransitions, /page\.load -&gt; A-LoadAccount -&gt; A-LoadAccount\.P1\.response -&gt; A-HandleAccountResponse\.P1\.empty/);
  assert.match(stateTransitions, /page\.load -&gt; A-LoadAccount -&gt; A-LoadAccount\.P1\.response -&gt; A-HandleAccountResponse\.P1\.failure/);
  assert.doesNotMatch(stateTransitions, /initializing[\s\S]{0,120}loaded[\s\S]{0,120}page\.load<div/);
  assert.match(actionDetails, /Triggered by: page\.load -&gt; A-LoadAccount -&gt; A-LoadAccount\.P1\.response -&gt; A-HandleAccountResponse\.P1\.has-subscriptions/);
});

test("aggregates multiple page.load lifecycle entry actions", () => {
  const result = parseMarkVSpec(`---
id: SCR-MULTI-PAGE-LOAD
type: screen
title: Multi Page Load
---

# SCR-MULTI-PAGE-LOAD Multi Page Load

## States

- before-load+
- initializing*
- loaded

## Events

- page.load: A-LoadAccount
- page.load: A-PrimeTelemetry

## Actions

### A1:A-LoadAccount Load account

- From
  - before-load
- Process P1: Send request
  - request:
    - method: GET
    - path: /account
  - case: sent
    - response: account request sent
    - Effects
      - state: initializing

### A2:A-PrimeTelemetry Prime telemetry

- From
  - before-load
- Process: Immediate
  - Effects
    - state: initializing
    - display: E-TelemetryStatus = ready

### A3:A-HandleAccountResponse Handle account response

- From
  - initializing
- Process P1: Apply response
  - receive:
    - response: A-LoadAccount.P1.response
  - case: success
    - response: 200
    - Effects
      - state: loaded
`);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const stateFlow = html.match(/<section class="doc-section state-flow-section"[^>]*>[\s\S]*?(?=<section class="doc-section state-views-section")/)?.[0] ?? "";
  const stateTransitions = docSectionByHeading(html, "State Transitions", "Diagnostics");

  assert.deepEqual(result.actions.find((action) => action.id === "A-LoadAccount")?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["before-load", "sent", "initializing"]
  ]);
  assert.deepEqual(result.actions.find((action) => action.id === "A-PrimeTelemetry")?.transitions.map((transition) => [transition.from, transition.result, transition.to]), [
    ["before-load", undefined, "initializing"]
  ]);
  assert.doesNotMatch(stateFlow, /\[\*\] --&gt;/);
  assert.match(stateTransitions, new RegExp(`<tr><th scope="row">${docLabel("before-load", "state")}</th><td>-</td><td><ul class="spec-list"><li>${refActionChip("A1", "A-LoadAccount", "Load account")}<div class="mm-ref-chip-note">page\\.load</div><div class="mm-ref-chip-note">sent</div></li><li>${refActionChip("A2", "A-PrimeTelemetry", "Prime telemetry")}<div class="mm-ref-chip-note">page\\.load</div></li></ul></td><td>-</td></tr>`));
  assert.equal([...stateTransitions.matchAll(/<div class="mm-ref-chip-note">page\.load<\/div>/g)].length, 2);
});

test("renders screen transitions as a compact navigation index", () => {
  const source = `---
id: SCR-SCREEN-TRANSITIONS
type: screen
title: Screen Transitions
---

# SCR-SCREEN-TRANSITIONS Screen Transitions

## States

- idle*
- submitting

## Elements

### 1:E-ForgotPasswordLink Link

- sample: Forgot password

### 2:E-SubmitButton Button

- label: Submit

## Actions

### A1:A-ForgotPassword Open password reset

- Triggered
  - E-ForgotPasswordLink.click
- From
  - idle
- Process: Immediate
  - Effects
    - navigate: SCR-PASSWORD-RESET

### A2:A-Submit Submit login

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process P1: Immediate
  - Effects
    - state: submitting

### A3:A-SubmitResponse Handle response

- Triggered
  - A-Submit.P1.response
- From
  - submitting
- Process P1: Immediate
  - case: success
    - state: submitting
- Process P2: Immediate
  - case: success
    - response: 200
    - navigate: SCR-HOME
    - params:
      - userId: \${model.auth.userId}
  - case: failure
    - response: 401
    - state: idle

### A4:A-OpenDocs Open docs

- Triggered
  - E-ForgotPasswordLink.click
- From
  - idle
- Process: Immediate
  - Effects
    - navigate: https://example.com/help

### A5:A-OpenSettings Open settings

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process: Immediate
  - Effects
    - navigate: /settings
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const section = docSectionByHeading(html, "Screen Transitions", "State Transitions");

  assert.match(section, /<th>Trigger<\/th><th>Action<\/th><th>From<\/th><th>To<\/th><th>Params<\/th>/);
  assert.doesNotMatch(section, /<th>Name<\/th>|<th>Result<\/th>|<th>Case<\/th>|<th>Target Type<\/th>|<th>Target<\/th>/);
  assert.match(section, new RegExp(`<td>${detailElementRef("1", "E-ForgotPasswordLink")}\\.click</td><td>${refActionChip("A1", "A-ForgotPassword", "Open password reset")}</td><td>${docLabel("idle", "state")}</td><td>screen ${documentRef("SCR-PASSWORD-RESET")}</td><td>-</td>`));
  assert.match(section, new RegExp(`<td>${docLabel("A-Submit.P1.response", "trigger")}</td><td>${refActionChip("A3", "A-SubmitResponse", "Handle response")}<ul class="spec-list"><li>Case: ${docLabel("success", "result")}</li></ul></td><td>${docLabel("submitting", "state")}</td><td>screen ${documentRef("SCR-HOME")}</td><td><ul><li>userId: ${sourceCodePattern("${model.auth.userId}")}</li></ul></td>`));
  assert.match(section, new RegExp(`<td>${detailElementRef("1", "E-ForgotPasswordLink")}\\.click</td><td>${refActionChip("A4", "A-OpenDocs", "Open docs")}</td><td>${docLabel("idle", "state")}</td><td>URL https://example\\.com/help</td><td>-</td>`));
  assert.match(section, new RegExp(`<td>${detailElementRef("2", "E-SubmitButton")}\\.click</td><td>${refActionChip("A5", "A-OpenSettings", "Open settings")}</td><td>${docLabel("idle", "state")}</td><td>route /settings</td><td>-</td>`));
  assert.doesNotMatch(section, new RegExp(`${actionBadge("A2", "A-Submit")} ${detailIdRef("A-Submit")} Submit login`));
  assert.doesNotMatch(section, /failure/);
});

test("aggregates duplicate state-flow edges in Mermaid source", () => {
  const source = `---
id: SCR-STATE-FLOW-AGGREGATE
type: screen
title: State Flow Aggregate
---

# SCR-STATE-FLOW-AGGREGATE State Flow Aggregate

## States

- idle*
- loading
- error

## Actions

### A1:A-StartLoad Start load

- From
  - idle
- Process: Immediate
  - Effects
    - state: loading

### A2:A-PollResponse Poll response

- From
  - loading
- Process: Immediate
  - case: success
    - state: idle
  - case: failure
    - state: error
  - case: done
    - navigate: SCR-DONE

### A3:A-RefreshResponse Refresh response

- From
  - loading
- Process: Immediate
  - case: success
    - state: idle
  - case: failure
    - state: error
  - case: done
    - navigate: SCR-DONE

### A4:A-DuplicateFailure Duplicate; failure

- From
  - loading
- Process: Immediate
  - Effects
    - state: error
    - state: error

### A5:A-Cancel Cancel

- From
  - idle
- Process: Immediate
  - Effects
    - navigate: SCR-DONE

### A6:A-KeepLoading Keep loading

- From
  - loading
- Process: Immediate
  - Effects
    - state: loading
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const mermaidSource = html.match(/<pre class="mermaid-source" data-mermaid-source><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/)?.[1] ?? "";

  assert.equal([...mermaidSource.matchAll(/S0 --&gt; \[\*\]:/g)].length, 0);
  assert.equal([...mermaidSource.matchAll(/S1 --&gt; S0:/g)].length, 1);
  assert.equal([...mermaidSource.matchAll(/S1 --&gt; S2:/g)].length, 1);
  assert.doesNotMatch(mermaidSource, /--&gt; \[\*\]/);
  assert.match(mermaidSource, /S1 --&gt; S0: A2 Poll response \/ success, A3 Refresh response \/ success/);
  assert.match(mermaidSource, /S1 --&gt; S2: A2 Poll response \/ failure, A3 Refresh response \/ failure, A4 Duplicate, failure/);
  assert.doesNotMatch(mermaidSource, /S1 --&gt; S1:/);
  assert.doesNotMatch(mermaidSource, /S\d+ --&gt; [^\n]*;/);
  assert.equal([...mermaidSource.matchAll(/A4 Duplicate, failure/g)].length, 1);
});

test("renders input form spec without validation columns", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/search-list.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const formControls = html.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Input Form Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(formControls, /<th>Marker\/ID<\/th><th>Type<\/th><th>Required<\/th><th>Value<\/th><th>Source<\/th><th>Spec<\/th><th>Condition<\/th>/);
  assert.doesNotMatch(formControls, /<th>Enabled When<\/th>/);
  assert.match(formControls, /<colgroup><col class="spec-table-col spec-table-col-marker-id"><col class="spec-table-col spec-table-col-default"><col class="spec-table-col spec-table-col-default"><col class="spec-table-col spec-table-col-default"><col class="spec-table-col spec-table-col-default"><col class="spec-table-col spec-table-col-default"><col class="spec-table-col spec-table-col-default"><\/colgroup>/);
  assert.doesNotMatch(formControls, /<th>Validation<\/th>/);
  assert.doesNotMatch(formControls, /<th>Error<\/th>/);
  assert.doesNotMatch(formControls, /<th>Label<\/th>/);
  assert.doesNotMatch(formControls, /<th>Sample<\/th>/);
  assert.doesNotMatch(formControls, /<th>Options<\/th>/);
  assert.match(formControls, new RegExp(`<td>${detailElementRef("3", "E-StatusFilter")}</td><td>Select</td>`));
  assert.doesNotMatch(formControls, />Administrator<\/td>/);
});

test("renders Marker/ID reference chips in State Views summary and spec tables", () => {
  const examples = [
    "examples/04-real-world-screens/login-basic.vspec.md",
    "examples/03-actions/event-triggers.vspec.md"
  ];

  for (const example of examples) {
    const source = readFileSync(resolve(`../../${example}`), "utf8");
    const result = parseMarkVSpec(source);
    const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
    const firstWireframe = html.match(/<section class="wireframe-section">[\s\S]*?<\/section>/)?.[0] ?? "";

    assert.doesNotMatch(html, /<th>Marker<\/th><th>ID<\/th>|<th>番号<\/th><th>ID<\/th>/, example);
    assert.match(html, /<th>Marker\/ID<\/th>|<th>番号\/ID<\/th>/, example);
    assert.match(html, /<colgroup><col class="spec-table-col spec-table-col-marker-id">/, example);
    assert.match(html, /<h6 class="state-screen-detail-heading">(?:Element Summary|画面要素サマリー)<\/h6>[\s\S]*?<span class="mm-ref-chip mm-ref-chip-element"/, example);
    assert.match(html, /<h5 class="state-screen-subheading">(?:Layouts|レイアウト)<\/h5>[\s\S]*?<span class="mm-ref-chip mm-ref-chip-layout"/, example);
    assert.match(html, /<h5 class="state-screen-subheading">(?:Actions|アクション)<\/h5>[\s\S]*?<a class="mm-ref-chip mm-ref-chip-action" href="#action-detail-/, example);
    assert.doesNotMatch(firstWireframe, /mm-ref-chip/, example);
  }
});

test("combines visible and enabled conditions in spec table condition cells", () => {
  const source = `---
id: SCR-CONDITION-COLUMNS
type: screen
title: Condition Columns
locale: en
---

# SCR-CONDITION-COLUMNS Condition Columns

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-NameInput
- E-SaveButton

## Elements

### 1:E-NameInput Input

- value: \${model.name}
- visible when: idle
- disabled when: \${model.saving}

### 2:E-SaveButton Button

- label: Save
- visible when: idle
- disabled when: \${model.saving}
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const inputForm = html.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Input Form Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";
  const displayContent = html.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(inputForm, /<th>Marker\/ID<\/th><th>Type<\/th><th>Required<\/th><th>Value<\/th><th>Source<\/th><th>Spec<\/th><th>Condition<\/th>/);
  assert.doesNotMatch(inputForm, /<th>Enabled When<\/th>/);
  assert.match(inputForm, new RegExp(`<td>${detailElementRef("1", "E-NameInput")}</td><td>Input</td><td>no</td><td>${sourceCodePattern("${model.name}")}</td><td>${sourceTypeChipPattern("fixed")}</td><td>-</td><td>${specSectionPattern("Visible", ["visible: idle"])}${specSectionPattern("Enabled", [`not ${sourceCodePattern("${model.saving}")}`])}</td>`));
  assert.match(displayContent, /<th>Marker\/ID<\/th><th>Location<\/th><th>Content<\/th><th>Format<\/th><th>Source<\/th><th>Condition<\/th>/);
  assert.doesNotMatch(displayContent, /<th>Enabled When<\/th>/);
  assert.match(displayContent, new RegExp(`<td>${detailElementRef("2", "E-SaveButton")}</td><td>label</td><td>Save</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td><td>${specSectionPattern("Visible", ["visible: idle"])}${specSectionPattern("Enabled", [`not ${sourceCodePattern("${model.saving}")}`])}</td>`));
});

test("keeps validation required distinct from input required in single-field validation preview", () => {
  const source = readFileSync(resolve("../../examples/03-actions/single-field-validation.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const formControls = html.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Input Form Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";
  const validationsSection = docSectionByHeading(html, "Validations");
  const clientFieldValidations = validationsSection.match(/<h3>Client Field Validations<\/h3>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(formControls, /<th>Required<\/th>/);
  assert.doesNotMatch(formControls, /<th>Input Required<\/th>/);
  assert.match(formControls, new RegExp(`<td>${detailElementRef("3", "E-UsernameInput")}</td><td>Input</td><td>no</td>`));
  assert.match(formControls, new RegExp(`<td>${detailElementRef("4", "E-EmailInput")}</td><td>Input</td><td>no</td>`));
  assert.match(clientFieldValidations, new RegExp(`<td rowspan="3">${refMessageChip("V1", "V-UsernameRules", "Username rules")}<\\/td><td rowspan="3">${markerBadge("3", "element")}<\\/td>`));
  assert.match(clientFieldValidations, /<td>required<\/td>[\s\S]*<td>length: element <span class="mm-muted">\(min length: 3, max length: 40\)<\/span><\/td>[\s\S]*<td>pattern<\/td>/);
  assert.match(clientFieldValidations, /Username is required\.[\s\S]*Username must be 3 to 40 lowercase letters, numbers, or hyphens\.[\s\S]*Username can contain lowercase letters, numbers, and hyphens\./);
  assert.match(clientFieldValidations, new RegExp(`<td rowspan="2">${refMessageChip("V2", "V-EmailRules", "Email rules")}<\\/td><td rowspan="2">${markerBadge("4", "element")}<\\/td>`));
  assert.match(clientFieldValidations, /<td>required<\/td>[\s\S]*<td>email<\/td>/);
  assert.match(clientFieldValidations, new RegExp(`<td>range: element <span class="mm-muted">\\(min: 13, max: 120, step: 1\\)<\\/span><\\/td><td>${markerBadge("5", "element")}\\.value is present<\\/td><td>Age must be between 13 and 120\\.<\\/td>`));
  assert.doesNotMatch(clientFieldValidations, /<th>Result<\/th>|<th>Condition<\/th>/);
});

test("keeps field validation rule messages attached to their constraint rows", () => {
  const source = `---
id: SCR-FIELD-VALIDATION-MESSAGES
type: screen
title: Field Validation Messages
locale: en
---

# SCR-FIELD-VALIDATION-MESSAGES Field Validation Messages

## States

- idle*

## Elements

### 1:E-EmailInput Input

- label: Email

## Field Validations

### V-EmailRules Email rules

- target: E-EmailInput
- constraints:
  - required
  - email:
    - message: Enter a valid email address.
  - pattern:
    - message: Use a company address.
    - message: Aliases are not allowed.
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const validationsSection = docSectionByHeading(html, "Validations");
  const clientFieldValidations = validationsSection.match(/<h3>Client Field Validations<\/h3>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(clientFieldValidations, /<td>required<\/td><td>-<\/td><td>-<\/td><td>-<\/td>/);
  assert.match(clientFieldValidations, /<td>email<\/td><td>-<\/td><td>Enter a valid email address\.<\/td><td>-<\/td>/);
  assert.match(clientFieldValidations, /<td>pattern<\/td><td>-<\/td><td><ul class="spec-list"><li>Use a company address\.<\/li><li>Aliases are not allowed\.<\/li><\/ul><\/td><td>-<\/td>/);
});

test("expands length element validation shortcuts from accepted input metadata aliases", () => {
  const source = `---
id: SCR-LENGTH-ALIAS
type: screen
title: Length Alias
locale: en
---

# SCR-LENGTH-ALIAS Length Alias

## States

- idle*

## Elements

### 1:E-CodeInput Input

- label: Code
- input rule:
  - min-length: 3
  - maxlength: 40

## Field Validations

### V-CodeRules Code rules

- target: E-CodeInput
- constraints:
  - length: element
    - message: Code length is constrained by the input metadata.
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const validationsSection = docSectionByHeading(html, "Validations");
  const clientFieldValidations = validationsSection.match(/<h3>Client Field Validations<\/h3>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.equal(result.diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length, 0);
  assert.match(clientFieldValidations, /<td>length: element <span class="mm-muted">\(min length: 3, max length: 40\)<\/span><\/td>/);
});

test("keeps required metadata in the input required column for input form specs", () => {
  const source = `---
id: SCR-REQUIRED-SPEC
type: screen
title: Required Spec
locale: ja
---

# SCR-REQUIRED-SPEC Required Spec

## States

- idle*
- editing

## Layout: mobile

### L-Mobile Mobile

- stack

#### Items

- E-Name
- E-Email
- E-Code
- E-Optional

## Elements

### E-Name Input*

- label: 氏名
- value: \${model.name}
- input rule:
  - required
  - max: 100

### E-Email Input

- label: メール
- value: \${model.email}
- input rule:
  - required: true
  - pattern: email

### E-Code Input

- label: 招待コード
- value: \${model.code}
- visible when: editing
- input rule:
  - required when: \${model.inviteRequired}
  - pattern: [A-Z0-9]+

### E-Optional Input

- label: 任意コード
- value: \${model.optionalCode}
- input rule:
  - required: false
  - min: 2

## Actions

### A-Edit 編集

- Triggered
  - E-Name.change
- From
  - idle
- Process: Immediate
  - Effects
    - state: editing

## Validations

### V-OptionalRequired Optional code required

- target: E-Optional
- rules:
  - required:
    - E-Optional
- scope: field
- run: client
- message: Optional code is required by validation.
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const formControls = html.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">入力フォーム仕様<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";
  const editingSection = stateSection(html, "editing");
  const editingFormControls = editingSection.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">入力フォーム仕様<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(formControls, new RegExp(`<td>${detailElementRef("E-Name", "E-Name")}</td><td>Input</td><td>はい</td><td>${sourceCodePattern("${model.name}")}</td><td>${sourceTypeChipPattern("fixed")}</td><td>${specSectionPattern("制約", ["max: 100"])}</td>`));
  assert.match(formControls, new RegExp(`<td>${detailElementRef("E-Email", "E-Email")}</td><td>Input</td><td>はい</td><td>${sourceCodePattern("${model.email}")}</td><td>${sourceTypeChipPattern("fixed")}</td><td>${specSectionPattern("制約", ["pattern: email"])}</td>`));
  assert.match(formControls, new RegExp(`<td>${detailElementRef("E-Optional", "E-Optional")}</td><td>Input</td><td>いいえ</td><td>${sourceCodePattern("${model.optionalCode}")}</td><td>${sourceTypeChipPattern("fixed")}</td><td>${specSectionPattern("制約", ["min: 2"])}</td>`));
  assert.doesNotMatch(formControls, /<th>仕様<\/th>[\s\S]*required/);
  assert.match(editingFormControls, new RegExp(`<td>${detailElementRef("E-Code", "E-Code")}</td><td>Input</td><td>条件: ${sourceCodePattern("${model.inviteRequired}")}</td><td>${sourceCodePattern("${model.code}")}</td><td>${sourceTypeChipPattern("fixed")}</td><td>${specSectionPattern("制約", ["pattern: [\\s\\S]*"])}</td>`));
  assert.doesNotMatch(editingFormControls, /<th>仕様<\/th>[\s\S]*required/);
});

test("renders actionable display values and conditions in compact columns", () => {
  const source = `---
id: SCR-ACTIONABLES
type: screen
title: Actionables
locale: ja
---

# SCR-ACTIONABLES Actionables

## States

- idle*

## Layout: mobile

### L-Mobile Mobile

- stack

#### Items

- E-Title
- E-Create

## Layout: desktop

### L-Desktop Desktop

- stack

#### Items

- E-Title
- E-Create
- E-Export

## Elements

### E-Title Text

- value: prefix \${model.action.title} & \${model.action.kind} <x>

### 1:E-Create Button

- label: 新規作成
- text: 作成する
- src: \${model.action.createLabel}
- value: create
- format: button label
- action: A-Create
- visible when: empty
- hidden when: \${model.notice.read}
- disabled when: \${model.saving}

### 2:E-Export Link

- label: CSV出力
- text: エクスポートする
- action: A-Export

## Actions

### A1:A-Create 新規作成

- Triggered
  - E-Create.click
- From
  - idle

### A2:A-Export CSV出力

- Triggered
  - E-Export.click
- From
  - idle
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const elementSummary = html.match(/<h6 class="state-screen-detail-heading">画面要素サマリー<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";
  const displayContent = html.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">表示内容仕様<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";
  const desktopSection = viewportStateSection(html, "idle", "desktop");
  const desktopDisplayContent = desktopSection.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">表示内容仕様<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(elementSummary, /<th>番号\/ID<\/th><th>種別<\/th><th>関連アクション<\/th><th>説明<\/th>/);
  assert.match(elementSummary, new RegExp(`<td>${detailElementRef("1", "E-Create")}</td><td>Button</td><td><ul class="spec-list"><li>${refActionChip("A1", "A-Create", "新規作成")}</li></ul></td><td>-</td>`));
  assert.match(displayContent, /<th>番号\/ID<\/th><th>表示箇所<\/th><th>表示内容<\/th><th>表示形式<\/th><th>取得元<\/th><th>条件<\/th>/);
  assert.doesNotMatch(displayContent, /<th>有効条件<\/th>/);
  assert.match(displayContent, new RegExp(`<td>${detailElementRef("E-Title", "E-Title")}</td><td>value</td><td>prefix ${sourceCodePattern("${model.action.title}")} &amp; ${sourceCodePattern("${model.action.kind}")} &lt;x&gt;</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td><td>${defaultAlwaysPattern("常に")}</td>`));
  const displayCondition = `${specSectionPattern("表示", ["表示: empty", `非表示: ${sourceCodePattern("${model.notice.read}")}`])}${specSectionPattern("有効", [`not ${sourceCodePattern("${model.saving}")}`])}`;
  assert.match(displayContent, new RegExp(`<td rowspan="4">${detailElementRef("1", "E-Create")}</td><td>label</td><td>新規作成</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td><td>${displayCondition}</td>`));
  assert.match(displayContent, new RegExp(`<tr><td>text</td><td>作成する</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td><td>${displayCondition}</td>`));
  assert.match(displayContent, new RegExp(`<tr><td>src</td><td>${sourceCodePattern("${model.action.createLabel}")}</td><td>button label</td><td>${sourceTypeChipPattern("fixed")}</td><td>${displayCondition}</td>`));
  assert.match(displayContent, new RegExp(`<tr><td>value</td><td>create</td><td>button label</td><td>${sourceTypeChipPattern("fixed")}</td><td>${displayCondition}</td>`));
  assert.doesNotMatch(html, /<div class="element-detail-group"><h6 class="state-screen-detail-heading">操作要素<\/h6>/);
  for (const oldHeader of ["表示名", "表示名参照元", "サンプル", "値", "無効条件"]) {
    assert.doesNotMatch(desktopSection, new RegExp(`<th>${oldHeader}</th>`));
  }
  assert.doesNotMatch(desktopSection, /表示内容仕様差分/);
  assert.match(desktopDisplayContent, new RegExp(`<td rowspan="2">${detailElementRef("2", "E-Export")}</td><td>label</td><td>CSV出力</td>`));
  assert.match(desktopDisplayContent, /<tr><td>text<\/td><td>エクスポートする<\/td>/);
});

test("does not infer model flags from any condition groups in state wireframes", () => {
  const source = `---
id: SCR-ANY-MODEL
type: screen
title: Any Model
---

# SCR-ANY-MODEL Any Model

## States

- loading*
- idle

## Layout: mobile

### L-Root Root

- stack

#### Items

- E-Loading
- E-ReadyA
- E-ReadyB

## Elements

### E-Loading Text

- value: Loading
- visible when: not \${model.a.loaded}

### E-ReadyA Text

- value: A ready
- visible when: \${model.a.loaded}

### E-ReadyB Text

- value: B ready
- visible when: \${model.b.loaded}

## Actions

### A-Resolve Resolve

- Triggered
  - screen.load
- From
  - loading
- Process: Immediate
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, "");
  const idleSection = stateSection(html, "idle");

  assert.match(idleSection, /data-mm-id="E-Loading"/);
  assert.doesNotMatch(idleSection, /data-mm-id="E-ReadyA"/);
  assert.doesNotMatch(idleSection, /data-mm-id="E-ReadyB"/);
});

test("infers opaque model flags from process updates in state wireframes", () => {
  const source = `---
id: SCR-OPAQUE-MODEL
type: screen
title: Opaque Model
---

# SCR-OPAQUE-MODEL Opaque Model

## States

- loading*
- ready

## Layout: mobile

### L-Root Root

- stack

#### Items

- E-Loading
- E-Ready

## Elements

### E-Loading Text

- value: Loading
- visible when: not \${model.profile.loaded}

### E-Ready Text

- value: Ready
- visible when: \${model.profile.loaded}

## Actions

### A-Resolve Resolve

- Triggered
  - screen.load
- From
  - loading
- Process: Immediate
  - case: success
    - model: \${model.profile.loaded} = true
    - state: ready
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, "");
  const readySection = stateSection(html, "ready");

  assert.doesNotMatch(readySection, /data-mm-id="E-Loading"/);
  assert.match(readySection, /data-mm-id="E-Ready"/);
});

test("renders standalone HTML without VS Code webview APIs", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const mermaidScript = "window.mermaid = { initialize() {}, render() {} }; const preserveReplacementTokens = \"$& $1\";";
  const html = renderStandaloneHtml(result, mermaidScript, "examples/04-real-world-screens/login-basic.vspec.md");
  const toolbar = html.match(/<header class="toolbar">[\s\S]*?<\/header>/)?.[0] ?? "";

  assert.match(html, /<!doctype html>/);
  assert.match(html, /\.mm-inline-token\{color:#0f766e;font-family:inherit;font-weight:650;padding:0 1px\}/);
  assert.doesNotMatch(html, /\.mm-inline-token\{[^}]*border-bottom/);
  assert.doesNotMatch(toolbar, /examples\/screens\/login\.vspec\.md/);
  assert.match(html, /window\.mermaid = \{ initialize\(\) \{\}, render\(\) \{\} \};/);
  assert(html.includes(mermaidScript));
  assert.doesNotMatch(html, /function applyViewportFilter/);
  assert.match(html, /initTableOfContents\(\);/);
  assert.match(html, /function mermaidCacheKey\(source\)/);
  assert.match(html, /return "mmd:" \+ source\.length \+ ":" \+ \(hash >>> 0\)\.toString\(36\);/);
  assert.match(html, /function prepareMermaidBlock\(block, cacheKey\)/);
  assert.match(html, /wrapper\.className = "mermaid-block";/);
  assert.match(html, /const existingPlaceholder = block\.nextElementSibling && block\.nextElementSibling\.matches\("\[data-mermaid-placeholder\]"\)/);
  assert.match(html, /placeholder\.className = "mermaid-placeholder";/);
  assert.match(html, /toggle\.className = "mermaid-source-toggle";/);
  assert.match(html, /toggle\.textContent = markvspecMessages\.mermaidShowSource;/);
  assert.match(html, /toggle\.setAttribute\("aria-label", markvspecMessages\.mermaidShowSource\);/);
  assert.match(html, /wrapper\.classList\.toggle\("is-source-visible", visible\);/);
  assert.match(html, /toggle\.textContent = visible \? markvspecMessages\.mermaidHideSource : markvspecMessages\.mermaidShowSource;/);
  assert.match(html, /toggle\.setAttribute\("aria-label", visible \? markvspecMessages\.mermaidHideSource : markvspecMessages\.mermaidShowSource\);/);
  assert.match(html, /toggle\.setAttribute\("aria-pressed", String\(visible\)\);/);
  assert.match(html, /applyCachedMermaidSize\(wrapper, cacheKey\);/);
  assert.match(html, /applyCachedMermaidSize\(placeholder, cacheKey\);/);
  assert.match(html, /applyCachedMermaidSize\(output, item\.cacheKey\);/);
  assert.match(html, /rememberMermaidSize\(item\.cacheKey, item\.wrapper\);/);
  assert.match(html, /window\.__markvspecMermaidSizeCache = new Map\(\);/);
  assert.match(html, /element\.style\.minHeight = cached\.height \+ "px";/);
  assert.doesNotMatch(html, /Content-Security-Policy/);
  assert.doesNotMatch(html, /acquireVsCodeApi/);
  assert.doesNotMatch(html, /vscode\.postMessage/);
  assert.doesNotMatch(html, /vscode-resource:/);
});

test("renders standalone HTML without Mermaid when the asset is unavailable", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/login-basic.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const html = renderStandaloneHtml(result, undefined, "login.vspec.md");

  assert.match(html, /<pre class="mermaid-source" data-mermaid-source>/);
  assert.doesNotMatch(html, /window\.mermaid =/);
  assert.doesNotMatch(html, /acquireVsCodeApi/);
});

test("focuses composed template design documents on screen slot content", () => {
  const template = parseMarkVSpec(readFileSync(resolve("../../examples/05-reuse/template-shell.vspec.md"), "utf8"));
  const screen = parseMarkVSpec(`---
id: SCR-HOME
type: screen
title: Home
---

# SCR-HOME Home

## States

- idle*

## Slot: content

### L-HomeContent Home content

- stack

#### Items

- E-WelcomeHeading

## Elements

### 1:E-WelcomeHeading Heading

- level: 1
- label: Welcome

## Actions

### A1:A-LoadProfile Load profile

- Triggered
  - screen.load
- From
  - idle
- Process: PartialRequest
  - request: GET /profile-card
  - partial: PRT-PROFILE-CARD
  - case: sent
    - model: ${"${model.profile.loaded}"} = true
    - state: idle
`);
  const composed = composeMarkVSpecTemplate(template, screen);
  const html = renderDesignDocumentHtml(composed, "", {
    focus: {
      layoutIds: new Set(["L-HomeContent"]),
      elementIds: new Set(["E-WelcomeHeading"]),
      actionIds: new Set(["A-LoadProfile"])
    }
  });

  assert.match(html, /<div class="mm-layout-placeholder">Sidebar<\/div>/);
  assert.match(html, /<div class="mm-layout-placeholder">Top bar<\/div>/);
  assert.match(html, /data-mm-id="E-WelcomeHeading"/);
  assert.doesNotMatch(html, /data-mm-id="E-Brand"/);
  assert.match(html, /PartialRequest/);
  assert.match(html, /GET \/profile-card/);
  assert.match(html, /partial: PRT-PROFILE-CARD/);
  assert.doesNotMatch(html, new RegExp(`model: ${sourceCodePattern("${model.profile.loaded}")} = true`));
  assert.doesNotMatch(html, /partial-update-meta|partial-update-group/);
});

test("renders template slot gallery examples", () => {
  const basicPath = resolve(extensionRoot, "../../examples/05-reuse/basic-slot-page.vspec.md");
  const responsivePath = resolve(extensionRoot, "../../examples/05-reuse/responsive-slot-page.vspec.md");
  const defaultPath = resolve(extensionRoot, "../../examples/05-reuse/default-slot-page.vspec.md");
  const basicLoaded = loadScreenDocumentResult(createTextDocument(readFileSync(basicPath, "utf8"), basicPath) as vscode.TextDocument);
  const responsiveLoaded = loadScreenDocumentResult(createTextDocument(readFileSync(responsivePath, "utf8"), responsivePath) as vscode.TextDocument);
  const defaultLoaded = loadScreenDocumentResult(createTextDocument(readFileSync(defaultPath, "utf8"), defaultPath) as vscode.TextDocument);
  const basicHtml = renderDesignDocumentHtml(basicLoaded.result, "", basicLoaded.focus ? { focus: basicLoaded.focus, messages: basicLoaded.messages } : { messages: basicLoaded.messages });
  const responsiveHtml = renderDesignDocumentHtml(responsiveLoaded.result, "", responsiveLoaded.focus ? { focus: responsiveLoaded.focus, messages: responsiveLoaded.messages } : { messages: responsiveLoaded.messages });
  const defaultHtml = renderDesignDocumentHtml(defaultLoaded.result, "", defaultLoaded.focus ? { focus: defaultLoaded.focus, messages: defaultLoaded.messages } : { messages: defaultLoaded.messages });
  const mobileSection = viewportStateSection(responsiveHtml, "idle", "mobile");
  const desktopSection = viewportStateSection(responsiveHtml, "idle", "desktop");

  assert.match(basicHtml, /Account overview/);
  assert.match(basicHtml, /This content is provided by the screen/);
  assert.match(mobileSection, /Mobile overview/);
  assert.doesNotMatch(mobileSection, /Desktop overview/);
  assert.match(desktopSection, /Desktop overview/);
  assert.doesNotMatch(desktopSection, /Mobile overview/);
  assert.match(defaultHtml, /Default: E-EmptySlotMessage/);
  assert.match(defaultHtml, /No content has been assigned to this template slot/);
});

test("renders template shell language select with matching option value", () => {
  const templatePath = resolve(extensionRoot, "../../examples/05-reuse/template-shell.vspec.md");
  const result = parseMarkVSpec(readFileSync(templatePath, "utf8"));
  const html = renderDesignDocumentHtml(result, "");

  assert.deepEqual(result.diagnostics, []);
  assert.match(html, /<select class="mm-element mm-element-select" data-mm-id="E-LanguageSelect">/);
  assert.match(html, /<option value="English" selected>English<\/option>/);
  assert.match(html, /Input Form Spec[\s\S]*E-LanguageSelect[\s\S]*English/);
  assert.doesNotMatch(html, /<option value="en" selected>en<\/option>/);
});

test("only opens preview references inside a trusted workspace", () => {
  assert.equal(canOpenPreviewReference("/workspace/specs/home.vspec.md", "/workspace", true), true);
  assert.equal(canOpenPreviewReference("/workspace2/specs/home.vspec.md", "/workspace", true), false);
  assert.equal(canOpenPreviewReference("/etc/passwd", "/workspace", true), false);
  assert.equal(canOpenPreviewReference("/workspace/specs/home.vspec.md", "/workspace", false), false);
  assert.equal(canOpenPreviewReference("/workspace/specs/home.vspec.md", undefined, true), false);
  assert.equal(canOpenPreviewReference("/workspace/link.vspec.md", "/workspace", true, (path) =>
    path === "/workspace/link.vspec.md" ? "/outside/target.vspec.md" : path
  ), false);
});

test("embeds partial default previews in loaded screen documents with current state markers", () => {
  const root = mkdtempSync(join(tmpdir(), "markvspec-partial-preview-"));
  try {
    const screenPath = join(root, "screens", "home.vspec.md");
    const partialPath = join(root, "partials", "profile.vspec.md");
    mkdirSync(join(root, "screens"), { recursive: true });
    mkdirSync(join(root, "partials"), { recursive: true });
    writeFileSync(partialPath, `---
id: PRT-PROFILE
type: partial
title: Profile Partial
default-state: loaded
---

# PRT-PROFILE Profile Partial

## States

- loaded*

## Layout: mobile

### L-Profile Profile

- stack

#### Items

- E-ProfileName

## Elements

### 1:E-ProfileName Paragraph

- value: Taylor Stone
`);
    const source = `---
id: SCR-HOME
type: screen
title: Home
references:
  partials:
    PRT-PROFILE: ../partials/profile.vspec.md
---

# SCR-HOME Home

## States

- idle*

## Layout: mobile

### L-Home Home

- stack

#### Items

- L-ProfileHost

### L-ProfileHost Profile host

- stack
- partial:
  - id: PRT-PROFILE

#### Items
`;
    const document = createTextDocument(source, screenPath) as vscode.TextDocument;
    const loaded = loadScreenDocumentResult(document);
    const html = renderPreviewHtml(
      loaded,
      {
        cspSource: "vscode-resource:",
        asWebviewUri: (uri: unknown) => uri
      } as never,
      { layout: true, element: true, action: true },
      undefined,
      "screens/home.vspec.md"
    );
    const idleSection = stateSection(html, "idle");

    assert.match(idleSection, /data-mm-partial-preview="true"/);
    assert.match(idleSection, /data-mm-partial-id="PRT-PROFILE"/);
    assert.match(html, /\.mm-partial-preview \.mm-wireframe\{max-width:100%!important;min-width:0!important;padding:0!important;width:100%!important\}/);
    assert.match(idleSection, /<a href="file:\/\/[^"]+profile\.vspec\.md" class="mm-reference-link mm-partial-preview-link" data-mm-open-reference="PRT-PROFILE"/);
    assert.match(idleSection, /data-mm-id="L-ProfileHost" data-mm-render-key="layout:mobile:L-ProfileHost">[\s\S]*?<div class="mm-partial-preview"/);
    assert.match(idleSection, /Taylor Stone/);
    const elementSummary = idleSection.match(/<h6 class="state-screen-detail-heading">Element Summary<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";
    assert.doesNotMatch(elementSummary, /<td>partial<\/td>/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("renders display.partial updates inside the target host", () => {
  const root = mkdtempSync(join(tmpdir(), "markvspec-display-partial-"));
  try {
    const screenPath = join(root, "screens", "home.vspec.md");
    const partialPath = join(root, "partials", "profile-summary.vspec.md");
    mkdirSync(join(root, "screens"), { recursive: true });
    mkdirSync(join(root, "partials"), { recursive: true });
    writeFileSync(partialPath, `---
id: PRT-PROFILE-SUMMARY
type: partial
title: Profile Summary Partial
default-state: loaded
---

# PRT-PROFILE-SUMMARY Profile Summary Partial

## States

- loaded*

## Layout: mobile

### L-ProfileSummary Profile summary

- stack

#### Items

- E-ProfileName

## Elements

### E-ProfileName Text

- value: Taylor Stone
`);
    const source = `---
id: SCR-HOME
type: screen
title: Home
references:
  partials:
    PRT-PROFILE-SUMMARY: ../partials/profile-summary.vspec.md
---

# SCR-HOME Home

## States

- idle*

## Layout: mobile

### L-Home Home

- stack

#### Items

- L-ProfileSummaryHost

### L-ProfileSummaryHost Profile summary host

- stack
- partial:
  - id: PRT-PROFILE-SUMMARY
  - states:
    - idle: loaded

## Actions

### A-RefreshProfile Refresh profile

- Triggered
  - screen.load
- From
  - idle
- Process P1: Handle profile summary response
  - case: success
    - description: 200 profile summary partial
    - Effects
      - display:
        - target: L-ProfileSummaryHost
        - partial: PRT-PROFILE-SUMMARY

## Preview Scenarios

### profile-loaded

- state: idle
- cases:
  - A-RefreshProfile.P1.success
`;
    const document = createTextDocument(source, screenPath) as vscode.TextDocument;
    const loaded = loadScreenDocumentResult(document);
    const html = renderPreviewHtml(
      loaded,
      {
        cspSource: "vscode-resource:",
        asWebviewUri: (uri: unknown) => uri
      } as never,
      { layout: true, element: true, action: true },
      undefined,
      "screens/home.vspec.md"
    );
    const scenarioSection = stateViewTitleSection(html, "idle / profile-loaded");
    const actionDetailsSection = docSectionByHeading(html, "Action Details");

    assert.deepEqual(loaded.result.diagnostics, []);
    assert.match(actionDetailsSection, /display[\s\S]*Profile summary host[\s\S]*<code class="mm-document-ref-id">PRT-PROFILE-SUMMARY<\/code>/);
    assert.match(scenarioSection, /data-mm-id="L-ProfileSummaryHost" data-mm-render-key="layout:mobile:L-ProfileSummaryHost">[\s\S]*?<div class="mm-partial-preview"/);
    assert.match(scenarioSection, /data-mm-partial-id="PRT-PROFILE-SUMMARY"/);
    assert.match(scenarioSection, /Taylor Stone/);
    assert.match(scenarioSection, /Display updates[\s\S]*Profile summary host[\s\S]*Partial[\s\S]*PRT-PROFILE-SUMMARY/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("keeps template markers out of focused composed screen previews", () => {
  const template = parseMarkVSpec(readFileSync(resolve("../../examples/05-reuse/template-shell.vspec.md"), "utf8"));
  const screen = parseMarkVSpec(`---
id: SCR-NOTICES
type: screen
title: Notices
---

# SCR-NOTICES Notices

## States

- idle*

## Slot: content

### L-NoticePage Notice page

- stack

#### Items

- L-FilterBar

### L-FilterBar Filter bar

- row

#### Items

- E-ReadStatusFilter

## Elements

### 1:E-ReadStatusFilter Select

- label: Read status
- initial value: All
- options:
  - All
  - Unread
`);
  const composed = composeMarkVSpecTemplate(template, screen);
  const html = renderDesignDocumentHtml(composed, "", {
    focus: {
      layoutIds: new Set(screen.slotContents.flatMap((slot) => slot.layoutGroups.map((layout) => layout.id))),
      elementIds: new Set(screen.elements.map((element) => element.id)),
      actionIds: new Set(screen.actions.map((action) => action.id))
    }
  });
  const idleSection = stateSection(html, "idle");

  assert.match(idleSection, /data-mm-id="L-TopBar" data-mm-render-key="layout:desktop:L-TopBar"><div class="mm-layout-placeholder">Top bar<\/div>/);
  assert.match(idleSection, /data-mm-id="L-NoticePage"/);
  assert.match(idleSection, /data-mm-id="L-FilterBar"/);
  assert.match(idleSection, /data-mm-id="E-ReadStatusFilter"/);
  assert.doesNotMatch(idleSection, /data-mm-id="E-Brand"/);
  assert.doesNotMatch(idleSection, /data-mm-id="E-LogoutButton"/);
});

test("loads template and partial previews from Front Matter references", () => {
  const root = mkdtempSync(join(tmpdir(), "markvspec-references-"));
  try {
    const screenPath = join(root, "screens", "home.vspec.md");
    const templatePath = join(root, "templates", "shell.vspec.md");
    const partialPath = join(root, "partials", "profile.vspec.md");
    mkdirSync(join(root, "screens"), { recursive: true });
    mkdirSync(join(root, "templates"), { recursive: true });
    mkdirSync(join(root, "partials"), { recursive: true });
    writeFileSync(templatePath, `---
id: TPL-SHELL
type: template
title: Shell
---

# TPL-SHELL Shell

## States

- idle*

## Layout: mobile

### L-Shell Shell

- stack

#### Items

- slot: content

## Slots

### content Main Content
`);
    writeFileSync(partialPath, `---
id: PRT-PROFILE
type: partial
title: Profile Partial
default-state: loaded
---

# PRT-PROFILE Profile Partial

## States

- loaded*

## Layout: mobile

### L-Profile Profile

- stack

#### Items

- E-ProfileName

## Elements

### 1:E-ProfileName Paragraph

- value: 山田 太郎
`);
    const source = `---
id: SCR-HOME
type: screen
title: Home
template:
  id: TPL-SHELL
  src: ../templates/shell.vspec.md
locale: ja
default-state: idle
references:
  partials:
    PRT-PROFILE: ../partials/profile.vspec.md
---

# SCR-HOME Home

## States

- idle*

## Slot: content

### L-Content Content

- stack

#### Items

- L-ProfileHost

### L-ProfileHost Profile Host

- stack
- partial:
  - id: PRT-PROFILE

#### Items
`;
    const loaded = loadScreenDocumentResult(createTextDocument(source, screenPath) as vscode.TextDocument);
    const html = renderDesignDocumentHtml(loaded.result, "", loaded.focus ? { focus: loaded.focus } : undefined);

    assert.equal(loaded.result.screen.id, "SCR-HOME");
    assert.equal(loaded.result.diagnostics.length, 0);
    assert.match(html, /data-mm-id="L-ProfileHost"/);
    assert.match(html, /data-mm-partial-id="PRT-PROFILE"/);
    assert.match(html, /山田 太郎/);
    const idleSection = stateSection(html, "idle");
    const layoutSection = idleSection.match(/<h5 class="state-screen-subheading">レイアウト<\/h5>[\s\S]*?(?=<h5 class="state-screen-subheading"|<div class="element-detail-group"|<section class="doc-section")/)?.[0] ?? "";
    assert.match(layoutSection, /data-mm-ref-id="L-Content"/);
    assert.doesNotMatch(layoutSection, /なし。/);
    assert.doesNotMatch(layoutSection, /data-mm-ref-id="L-Shell"/);
    assert.doesNotMatch(layoutSection, /data-mm-ref-id="L-Profile"/);
    assert.doesNotMatch(html, /<h2>スロット<\/h2>/);
    assert.doesNotMatch(html, /<h3>差し込み内容<\/h3>/);
    assert.match(html, /<h3>参照設計書<\/h3>/);
    const screenSection = html.match(/<section class="doc-section screen-spec-section">[\s\S]*?<\/section>/)?.[0] ?? "";
    assert.doesNotMatch(screenSection, /<dt>Locale<\/dt>/);
    assert.doesNotMatch(screenSection, /<dt>Default State<\/dt>/);
    assert.match(html, /<h3>参照設計書<\/h3>\s*<div class="spec-table-wrap"><table class="spec-table"><colgroup><col class="spec-table-col spec-table-col-default"><col class="spec-table-col spec-table-col-id"><col class="spec-table-col spec-table-col-default"><col class="spec-table-col spec-table-col-default"><\/colgroup><thead><tr><th>種別<\/th><th>ID<\/th><th>タイトル<\/th><th>ステータス<\/th><\/tr><\/thead>/);
    assert.doesNotMatch(html, /<th>パス<\/th>/);
    assert.doesNotMatch(html, /screen-reference-list|content:"-&gt;"/);
    assert.match(html, new RegExp(`<tr><td>テンプレート</td><td><a href="file://[^"]+" class="mm-reference-link" data-mm-open-reference="TPL-SHELL" data-mm-reference-path="${escapeRegExp(templatePath)}">${documentRef("TPL-SHELL")}</a></td><td><span class="screen-reference-title">Shell</span></td><td><span class="screen-reference-status">読み込み済み</span></td></tr>`));
    assert.match(html, new RegExp(`<tr><td>Partial参照</td><td><a href="file://[^"]+" class="mm-reference-link" data-mm-open-reference="PRT-PROFILE" data-mm-reference-path="${escapeRegExp(partialPath)}">${documentRef("PRT-PROFILE")}</a></td><td><span class="screen-reference-title">Profile Partial</span></td><td><span class="screen-reference-status">読み込み済み</span></td></tr>`));
    assert.doesNotMatch(html, /screen-reference-path/);

    const directTemplateSource = `---
id: SCR-DIRECT-TEMPLATE
type: screen
title: Direct Template
template:
  id: TPL-SHELL
  src: ../templates/shell.vspec.md
---

# SCR-DIRECT-TEMPLATE Direct Template

## States

- idle*
`;
    const directTemplate = loadScreenDocumentResult(createTextDocument(directTemplateSource, screenPath) as vscode.TextDocument);
    const directTemplateHtml = renderDesignDocumentHtml(directTemplate.result, "", directTemplate.focus ? { focus: directTemplate.focus } : undefined);
    assert.match(directTemplateHtml, new RegExp(`<tr><td>Template</td><td><a href="file://[^"]+" class="mm-reference-link" data-mm-open-reference="TPL-SHELL" data-mm-reference-path="${escapeRegExp(templatePath)}">${documentRef("TPL-SHELL")}</a></td>`));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("loads nested partial previews and reports invalid nested references", () => {
  const root = mkdtempSync(join(tmpdir(), "markvspec-nested-partials-"));
  try {
    const screenPath = join(root, "screens", "home.vspec.md");
    const parentPath = join(root, "partials", "parent.vspec.md");
    const childPath = join(root, "partials", "child.vspec.md");
    const circularPath = join(root, "partials", "circular.vspec.md");
    mkdirSync(join(root, "screens"), { recursive: true });
    mkdirSync(join(root, "partials"), { recursive: true });
    writeFileSync(childPath, `---
id: PRT-CHILD
type: partial
title: Child Partial
---

# PRT-CHILD Child Partial

## States

- loaded*

## Layout: mobile

### L-Child Child

- stack

#### Items

- E-ChildText

## Elements

### E-ChildText Text

- value: Nested child content
`);
    writeFileSync(parentPath, `---
id: PRT-PARENT
type: partial
title: Parent Partial
references:
  partials:
    PRT-CHILD: child.vspec.md
    PRT-MISSING: missing.vspec.md
    PRT-CIRCULAR: circular.vspec.md
---

# PRT-PARENT Parent Partial

## States

- loaded*

## Layout: mobile

### L-Parent Parent

- stack

#### Items

- L-ChildHost
- L-MissingHost
- L-CircularHost

### L-ChildHost Child Host

- stack
- partial:
  - id: PRT-CHILD

#### Items

### L-MissingHost Missing Host

- stack
- partial:
  - id: PRT-MISSING

#### Items

### L-CircularHost Circular Host

- stack
- partial:
  - id: PRT-CIRCULAR

#### Items
`);
    writeFileSync(circularPath, `---
id: PRT-CIRCULAR
type: partial
title: Circular Partial
references:
  partials:
    PRT-PARENT: parent.vspec.md
---

# PRT-CIRCULAR Circular Partial

## States

- loaded*

## Layout: mobile

### L-Circular Circular

- stack
- partial:
  - id: PRT-PARENT

#### Items
`);
    const source = `---
id: SCR-NESTED
type: screen
title: Nested
references:
  partials:
    PRT-PARENT: ../partials/parent.vspec.md
---

# SCR-NESTED Nested

## States

- idle*

## Layout: mobile

### L-Host Host

- stack
- partial:
  - id: PRT-PARENT

#### Items
`;
    const loaded = loadScreenDocumentResult(createTextDocument(source, screenPath) as vscode.TextDocument);
    const html = renderDesignDocumentHtml(loaded.result, "", loaded.focus ? { focus: loaded.focus } : undefined);
    const messages = loaded.result.diagnostics.map((diagnostic) => diagnostic.message);

    assert.match(html, /data-mm-partial-id="PRT-PARENT"/);
    assert.match(html, /data-mm-partial-id="PRT-CHILD"/);
    assert.match(html, /Nested child content/);
    assert.match(html, /Missing partial: PRT-MISSING/);
    assert(messages.includes("Partial reference PRT-MISSING file not found: missing.vspec.md."));
    assert(messages.includes("Circular partial reference detected: PRT-PARENT -> PRT-CIRCULAR -> PRT-PARENT."));
    assert.match(html, /Circular partial reference: PRT-PARENT -&gt; PRT-CIRCULAR -&gt; PRT-PARENT/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("embeds nested partial previews after viewport fallback", () => {
  const root = mkdtempSync(join(tmpdir(), "markvspec-nested-partial-viewport-fallback-"));
  try {
    const screenPath = join(root, "screens", "points.vspec.md");
    const parentPath = join(root, "partials", "points-content.vspec.md");
    const childPath = join(root, "partials", "points-panel.vspec.md");
    mkdirSync(join(root, "screens"), { recursive: true });
    mkdirSync(join(root, "partials"), { recursive: true });
    writeFileSync(childPath, `---
id: PRT-POINTS-PANEL
type: partial
title: Points Panel
default-state: idle
---

# PRT-POINTS-PANEL Points Panel

## States

- idle*

## Layout: mobile

### L-Panel Points Panel

- stack

#### Items

- E-PanelContent

## Elements

### E-PanelContent Text

- value: Nested panel rendered through viewport fallback
`);
    writeFileSync(parentPath, `---
id: PRT-POINTS-CONTENT
type: partial
title: Points Content
default-state: panel-loaded
references:
  partials:
    PRT-POINTS-PANEL: ./points-panel.vspec.md
---

# PRT-POINTS-CONTENT Points Content

## States

- panel-loaded*

## Layout: mobile

### L-Content Points Content

- stack

#### Items

- L-PanelHost

### L-PanelHost Points Panel Host

- stack
- partial:
  - id: PRT-POINTS-PANEL
  - states:
    - panel-loaded: idle

#### Items
`);
    const source = `---
id: SCR-POINTS
type: screen
title: Points
references:
  partials:
    PRT-POINTS-CONTENT: ../partials/points-content.vspec.md
---

# SCR-POINTS Points

## States

- loaded*

## Layout: mobile

### L-MobileHost Mobile Host

- stack
- partial:
  - id: PRT-POINTS-CONTENT
  - states:
    - loaded: panel-loaded

#### Items

## Layout: desktop

### L-DesktopHost Desktop Host

- stack
- partial:
  - id: PRT-POINTS-CONTENT
  - states:
    - loaded: panel-loaded

#### Items
`;
    const loaded = loadScreenDocumentResult(createTextDocument(source, screenPath) as vscode.TextDocument);
    const html = renderPreviewHtml(
      loaded,
      {
        cspSource: "vscode-resource:",
        asWebviewUri: (uri: unknown) => uri
      } as never,
      { layout: true, element: true, action: true },
      undefined,
      "screens/points.vspec.md"
    );
    const desktopSection = viewportStateSection(html, "loaded", "desktop");

    assert.match(desktopSection, /data-mm-id="L-DesktopHost"/);
    assert.match(desktopSection, /data-mm-id="L-PanelHost"/);
    assert.match(desktopSection, /data-mm-partial-id="PRT-POINTS-PANEL"/);
    assert.match(desktopSection, /Nested panel rendered through viewport fallback/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("loads partial preview dependencies for self PartialRequest without circular diagnostics", () => {
  const root = mkdtempSync(join(tmpdir(), "markvspec-self-partial-request-"));
  try {
    const screenPath = join(root, "screens", "points.vspec.md");
    const partialPath = join(root, "partials", "points-content.vspec.md");
    mkdirSync(join(root, "screens"), { recursive: true });
    mkdirSync(join(root, "partials"), { recursive: true });
    writeFileSync(partialPath, `---
id: PRT-POINTS-CONTENT
type: partial
title: Points Content
---

# PRT-POINTS-CONTENT Points Content

## States

- loaded*

## Layout: mobile

### L-PointsContent Points Content

- stack

#### Items

- E-Refresh

## Elements

### E-Refresh Button

- label: Refresh

## Actions

### A-Refresh Refresh

- Triggered
  - E-Refresh.click
- From
  - loaded
- Process: PartialRequest
  - request: GET /points/content
  - partial: PRT-POINTS-CONTENT
  - update:
    - target: L-PointsContent
    - mode: replace
`);
    const source = `---
id: SCR-POINTS
type: screen
title: Points
references:
  partials:
    PRT-POINTS-CONTENT: ../partials/points-content.vspec.md
---

# SCR-POINTS Points

## States

- idle*

## Layout: mobile

### L-PointsHost Points Host

- stack
- partial:
  - id: PRT-POINTS-CONTENT

#### Items
`;
    const loaded = loadScreenDocumentResult(createTextDocument(source, screenPath) as vscode.TextDocument);
    const html = renderDesignDocumentHtml(loaded.result, "", loaded.focus ? { focus: loaded.focus } : undefined);
    const messages = loaded.result.diagnostics.map((diagnostic) => diagnostic.message);

    assert.match(html, /data-mm-partial-id="PRT-POINTS-CONTENT"/);
    assert.match(html, /Refresh/);
    assert(!messages.some((message) => message.includes("Circular partial reference detected")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reports invalid Front Matter document references", () => {
  const root = mkdtempSync(join(tmpdir(), "markvspec-bad-references-"));
  try {
    const screenPath = join(root, "screens", "home.vspec.md");
    const partialPath = join(root, "partials", "wrong.vspec.md");
    const nonTemplatePath = join(root, "templates", "not-template.vspec.md");
    mkdirSync(join(root, "screens"), { recursive: true });
    mkdirSync(join(root, "partials"), { recursive: true });
    mkdirSync(join(root, "templates"), { recursive: true });
    writeFileSync(partialPath, `---
id: PRT-WRONG
type: partial
title: Wrong Partial
---

# PRT-WRONG Wrong Partial

## States

- idle*
`);
    writeFileSync(nonTemplatePath, `---
id: TPL-NOT-TEMPLATE
type: partial
title: Not Template
---

# TPL-NOT-TEMPLATE Not Template

## States

- idle*
`);
    const source = `---
id: SCR-HOME
type: screen
title: Home
references:
  partials:
    PRT-MISSING: ../partials/missing.vspec.md
    PRT-PROFILE: ../partials/wrong.vspec.md
---

# SCR-HOME Home

## States

- idle*

## Layout: mobile

### L-ProfileHost Profile Host

- stack
- partial:
  - id: PRT-PROFILE

#### Items

### L-MissingHost Missing Host

- stack
- partial:
  - id: PRT-MISSING

#### Items
`;
    const loaded = loadScreenDocumentResult(createTextDocument(source, screenPath) as vscode.TextDocument);
    const messages = loaded.result.diagnostics.map((diagnostic) => diagnostic.message);

    assert(messages.includes("Partial reference PRT-MISSING file not found: ../partials/missing.vspec.md."));
    assert(messages.includes("Partial reference PRT-PROFILE points to file with partial ID PRT-WRONG."));
    const html = renderDesignDocumentHtml(loaded.result, "");
    assert.match(html, new RegExp(`<td><a href="file://[^"]+" class="mm-reference-link" data-mm-open-reference="PRT-MISSING"[^>]*>${documentRef("PRT-MISSING")}</a></td><td><span class="spec-muted">None\\.</span></td><td><span class="screen-reference-status">missing</span></td>`));
    assert.match(html, new RegExp(`<td><a href="file://[^"]+" class="mm-reference-link" data-mm-open-reference="PRT-PROFILE"[^>]*>${documentRef("PRT-PROFILE")}</a></td><td><span class="screen-reference-title">Wrong Partial</span></td><td><span class="screen-reference-status">id mismatch</span></td>`));

    const wrongTypeSource = `---
id: SCR-WRONG-TEMPLATE
type: screen
title: Wrong Template
template:
  id: TPL-NOT-TEMPLATE
  src: ../templates/not-template.vspec.md
---

# SCR-WRONG-TEMPLATE Wrong Template

## States

- idle*
`;
    const wrongTypeLoaded = loadScreenDocumentResult(createTextDocument(wrongTypeSource, screenPath) as vscode.TextDocument);
    assert(wrongTypeLoaded.result.diagnostics.map((diagnostic) => diagnostic.message).includes("Template path ../templates/not-template.vspec.md points to a non-template document."));
    const wrongTypeHtml = renderDesignDocumentHtml(wrongTypeLoaded.result, "");
    assert.match(wrongTypeHtml, new RegExp(`<td><a href="file://[^"]+" class="mm-reference-link" data-mm-open-reference="TPL-NOT-TEMPLATE"[^>]*>${documentRef("TPL-NOT-TEMPLATE")}</a></td><td><span class="screen-reference-title">Not Template</span></td><td><span class="screen-reference-status">wrong type</span></td>`));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("reuses loaded screen documents for the same document version", () => {
  const source = `---
id: SCR-CACHE
type: screen
title: Cache
---

# SCR-CACHE Cache
`;
  const documentV1 = {
    ...createTextDocument(source, "/workspace/cache.vspec.md"),
    version: 1
  } as vscode.TextDocument;
  const documentV2 = {
    ...createTextDocument(source, "/workspace/cache.vspec.md"),
    version: 2
  } as vscode.TextDocument;

  const first = loadScreenDocumentResult(documentV1);
  const second = loadScreenDocumentResult(documentV1);
  const third = loadScreenDocumentResult(documentV2);

  assert.equal(first, second);
  assert.notEqual(first, third);
});

test("renders partial documents with partial render model values", () => {
  const partial = parseMarkVSpec(`---
id: PRT-NOTICES
type: partial
title: Notices Partial
default-state: loaded
---

# PRT-NOTICES Notices Partial

## States

- loading
- loaded*
- empty
- load-error

## Layout: mobile

### L-NoticeCard Notice card

- stack
- visible when: loaded

#### Items

- E-NoticeLink
- E-NoticePublishedAt

### L-Empty Empty

- stack
- visible when: empty

#### Items

- E-NoticeEmptyText

### L-Error Error

- stack
- visible when: load-error

#### Items

- E-NoticeErrorBanner

## Elements

### 1:E-NoticeLink Link

- source: data
- src: ${"${model.notice.title}"}
- label: ${"${model.notice.title}"}
- href: /notices/${"${model.notice.noticeId}"}
- sample: Maintenance window

### 2:E-NoticePublishedAt Text

- source: data
- src: ${"${model.notice.publishedAt}"}
- value: ${"${model.notice.publishedAt}"}

### 3:E-NoticeEmptyText Paragraph

- text: No notices.
- visible when: empty

### 4:E-NoticeErrorBanner Banner

- tone: danger
- text: Notices could not be loaded.
- visible when: load-error

## Model Samples

### loaded

#### ${"${model.noticeList.items}"}

| noticeId | title | publishedAt |
| --- | --- | --- |
| N-001 | Maintenance window | 2026-05-01 |
| N-002 | Terms update | 2026-05-02 |
| N-003 | Feature release | 2026-05-03 |
`);
  const html = renderDesignDocumentHtml(partial, "");
  const loadedSection = stateSection(html, "loaded");
  const emptySection = stateSection(html, "empty");
  const errorSection = stateSection(html, "load-error");

  assert.match(html, /<h2 id="screen">Partial<\/h2>/);
  assert.match(loadedSection, /data-mm-id="L-NoticeCard"/);
  assert.equal([...loadedSection.matchAll(/<a class="mm-element mm-element-link" data-mm-id="E-NoticeLink"/g)].length, 1);
  assert.match(loadedSection, /data-mm-id="E-NoticeLink"/);
  assert.match(loadedSection, /Maintenance window/);
  assert.doesNotMatch(loadedSection, /2026-05-01/);
  assert.match(loadedSection, /notice\.title/);
  assert.match(loadedSection, /notice\.publishedAt/);
  assert.doesNotMatch(loadedSection, /<div class="element-detail-group"><h4>State Display Differences<\/h4>/);
  assert.doesNotMatch(loadedSection, /Display Content Spec Differences/);
  assert.match(loadedSection, /<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>/);
  assert.match(loadedSection, /<th>Content<\/th>/);
  assert.doesNotMatch(loadedSection, /<th>Display Content<\/th>/);
  assert.match(loadedSection, /<th>Source<\/th>/);
  assert.match(loadedSection, /<th>Format<\/th>/);
  assert.match(loadedSection, /E-NoticePublishedAt/);
  assert.doesNotMatch(loadedSection, /E-Notice1Link/);
  assert.doesNotMatch(loadedSection, /model\.noticeList\.items\.0\.title/);
  assert.doesNotMatch(emptySection, /data-mm-id="E-NoticeLink"/);
  assert.match(emptySection, /data-mm-id="E-NoticeEmptyText"/);
  assert.doesNotMatch(errorSection, /data-mm-id="E-NoticeLink"/);
  assert.match(errorSection, /data-mm-id="E-NoticeErrorBanner"/);
  assert.doesNotMatch(html, /PRT-NOTIC<code/);
});

test("renders scenario sample values in display content spec", () => {
  const source = readFileSync(resolve("../../examples/02-states/scenario-samples.vspec.md"), "utf8");
  const html = renderDesignDocumentHtml(parseMarkVSpec(source), "");
  const loadedSection = stateSection(html, "loaded");
  const displayContent = loadedSection.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(displayContent, /<colgroup><col class="spec-table-col spec-table-col-marker-id">/);
  assert.match(displayContent, new RegExp(`<td>${detailElementRef("2", "E-MemberName")}</td><td>sample</td><td>Baseline Member</td><td>-</td><td>${sourceTypeChipPattern("data")}</td>`));
  assert.match(displayContent, new RegExp(`<td>${detailElementRef("3", "E-PlanName")}</td><td>sample</td><td>Baseline Plan</td><td>-</td><td>${sourceTypeChipPattern("data")}</td>`));
  assert.match(displayContent, new RegExp(`<td>${detailElementRef("4", "E-SeatCount")}</td><td>sample</td><td>1 seat</td><td>-</td><td>${sourceTypeChipPattern("data")}</td>`));
  assert.match(displayContent, new RegExp(`<td rowspan="2">${detailElementRef("6", "E-SubscriptionTable")}</td><td>table rows</td><td>Sample rows: <a class="mm-ref-chip mm-ref-chip-element" href="#sample-rows-desktop-loaded-E-SubscriptionTable"[^>]*data-mm-ref-id="E-SubscriptionTable"[\\s\\S]*?</a></td><td>-</td><td>${sourceTypeChipPattern("data")}</td>`));
  assert.match(displayContent, new RegExp(`<tr><td>columns</td><td>${specSectionPattern("Columns", ["Product \\(field: product\\)", "Seats \\(field: seats\\)", "Renewal \\(field: renewal\\)"])}</td><td>-</td><td>${sourceTypeChipPattern("data")}</td>`));
  assert.doesNotMatch(displayContent, /<td>column<\/td>/);
  assert.doesNotMatch(displayContent, /column source/);
  assert.doesNotMatch(loadedSection, /<h6 class="state-screen-detail-heading">Other<\/h6>/);
});

test("renders property-level display value metadata in display content spec", () => {
  const result = parseMarkVSpec(`---
id: SCR-DISPLAY-METADATA
type: screen
title: Display Metadata
---

# SCR-DISPLAY-METADATA Display Metadata

## States

- loaded*

## Elements

### E-PublishedAt Text

- value: 2026/05/01
  - kind: data
  - source: notice published date
  - format: date yyyy/MM/dd
- label: Published
  - kind: i18n

### E-AvatarPreview Image

- src: /assets/avatar.png
  - kind: asset
  - source: asset catalog: member-avatar
- alt: Current member avatar
  - kind: i18n

### E-NoticeLink Link

- href: /notices/123
  - kind: route
  - source: notice detail route

### E-RoleSelect Select

- options:
  - Viewer
    - kind: i18n
    - format: title case
  - Administrator
    - kind: i18n
    - source: copy.roles.admin
  - System role
    - kind: data
    - source: ${"${data.role}"}
`);
  const html = renderDesignDocumentHtml(result, "");
  const displayContent = html.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(displayContent, new RegExp(`<td rowspan="2">${detailElementRef("E-PublishedAt", "E-PublishedAt")}</td><td>label</td><td>Published</td><td>-</td><td>${sourceTypeChipPattern("i18n")}</td>`));
  assert.match(displayContent, new RegExp(`<tr><td>value</td><td>${specSectionPattern("Value", ["2026/05/01"])}${specSectionPattern("Source", ["notice published date"])}</td><td>date yyyy/MM/dd</td><td>${sourceTypeChipPattern("data")}</td>`));
  assert.match(displayContent, new RegExp(`<td rowspan="2">${detailElementRef("E-AvatarPreview", "E-AvatarPreview")}</td><td>src</td><td>${specSectionPattern("Value", ["/assets/avatar\\.png"])}${specSectionPattern("Source", ["asset catalog: member-avatar"])}</td><td>-</td><td>${sourceTypeChipPattern("asset")}</td>`));
  assert.match(displayContent, new RegExp(`<tr><td>alt</td><td>Current member avatar</td><td>-</td><td>${sourceTypeChipPattern("i18n")}</td>`));
  assert.match(displayContent, new RegExp(`<td>${detailElementRef("E-NoticeLink", "E-NoticeLink")}</td><td>href</td><td>${specSectionPattern("Value", ["/notices/123"])}${specSectionPattern("Source", ["notice detail route"])}</td><td>-</td><td>${sourceTypeChipPattern("route")}</td>`));
  assert.match(displayContent, new RegExp(`<td>${detailElementRef("E-RoleSelect", "E-RoleSelect")}</td><td>options</td><td>${specSectionPattern("Options", ["Viewer \\(i18n; format: title case\\)", "Administrator \\(i18n; copy\\.roles\\.admin\\)", `System role \\(data; ${sourceCodePattern("${data.role}")}\\)`])}</td><td>mixed</td><td>${plainCodePattern("mixed")}</td>`));
  assert.doesNotMatch(displayContent, /option label/);
});

test("does not link element sample row references without rendered row blocks", () => {
  const source = readFileSync(resolve("../../examples/02-states/async-loading.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  assert.deepEqual(result.diagnostics, []);
  const html = renderDesignDocumentHtml(result, "");
  const loadedSection = stateSection(html, "loaded");
  const displayContent = loadedSection.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(displayContent, /<td>table rows<\/td><td>Sample rows: <span class="mm-ref-chip mm-ref-chip-element" data-mm-ref-id="E-ItemsTable"/);
  assert.doesNotMatch(displayContent, /href="#sample-rows-[^"]*E-ItemsTable"/);
  assert.doesNotMatch(loadedSection, /id="sample-rows-[^"]*E-ItemsTable"/);
});

test("renders the source-kind metadata example with property-level source chips", () => {
  const source = readFileSync(resolve("../../examples/02-states/source-kind-metadata.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  assert.deepEqual(result.diagnostics, []);
  const html = renderDesignDocumentHtml(result, "");
  const loadedSection = stateSection(html, "loaded");
  const displayContent = loadedSection.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  for (const kind of ["fixed", "i18n", "data", "route", "element", "asset", "external", "computed"]) {
    assert.match(displayContent, new RegExp(sourceTypeChipPattern(kind)), kind);
  }
  assert.match(displayContent, /asset catalog: member-avatar/);
  assert.match(displayContent, /external status page URL/);
  assert.match(displayContent, /currency USD/);
  assert.match(displayContent, /date yyyy\/MM\/dd/);
  assert.match(displayContent, new RegExp(`<td rowspan="3">${detailElementRef("9", "E-LineItems")}</td><td>table rows</td><td>Sample rows: <a class="mm-ref-chip mm-ref-chip-element" href="#sample-rows-desktop-loaded-E-LineItems"[^>]*data-mm-ref-id="E-LineItems"[\\s\\S]*?</a></td><td>-</td><td>${sourceTypeChipPattern("data")}</td>`));
  assert.match(displayContent, new RegExp(`<tr><td>columns</td><td>${specSectionPattern("Columns", ["Item \\(field: item\\)", "Amount \\(field: amount\\)"])}</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td>`));
  assert.match(displayContent, new RegExp(`<tr><td>label</td><td>Line items</td><td>-</td><td>${sourceTypeChipPattern("i18n")}</td>`));
  assert.match(loadedSection, /<section class="scenario-sample-rows-block" id="sample-rows-desktop-loaded-E-LineItems">/);
  assert.match(displayContent, new RegExp(`<td rowspan="2">${detailElementRef("10", "E-RoleSelect")}</td><td>label</td><td>Role</td><td>-</td><td>${sourceTypeChipPattern("i18n")}</td>`));
  assert.match(displayContent, new RegExp(`<tr><td>options</td><td>${specSectionPattern("Options", ["Member \\(i18n\\)", "Administrator \\(i18n\\)"])}</td><td>-</td><td>${sourceTypeChipPattern("i18n")}</td>`));
  assert.doesNotMatch(displayContent, /option label/);
  assert.doesNotMatch(displayContent, /<td>table rows<\/td><td>see wireframe<\/td>/);
  assert.doesNotMatch(loadedSection, /<h6 class="state-screen-detail-heading">Other<\/h6>/);
});

test("aggregates rich profile selection options in display content spec", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/profile-edit-rich.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  assert.deepEqual(result.diagnostics, []);
  const html = renderDesignDocumentHtml(result, "");
  const idleSection = stateSection(html, "idle");
  const displayContent = idleSection.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(displayContent, new RegExp(`<tr><td>options</td><td>${specSectionPattern("Options", ["Accessibility", "Analytics", "Automation", "Customer support"])}</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td>`));
  assert.match(displayContent, new RegExp(`<tr><td>options</td><td>${specSectionPattern("Options", ["Email", "In-app", "SMS"])}</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td>`));
  assert.match(displayContent, new RegExp(`<tr><td>options</td><td>${specSectionPattern("Options", ["Private", "Team", "Public"])}</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td>`));
  assert.doesNotMatch(displayContent, /option label/);
});

test("renders Tabs element summary, wireframe, and display content spec", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/tabs-settings.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  assert.deepEqual(result.diagnostics, []);
  const html = renderDesignDocumentHtml(result, "");
  const idleSection = stateSection(html, "idle");
  const elementSummary = idleSection.match(/<h6 class="state-screen-detail-heading">Element Summary<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";
  const displayContent = idleSection.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(idleSection, /<div class="mm-element mm-element-tabs" data-mm-id="E-SettingsTabs">/);
  assert.match(idleSection, /<span class="mm-tab-item mm-tab-item-active" aria-selected="true" data-mm-tab-panel="L-ProfilePanel" data-mm-tab-action="A-SelectProfileTab">Profile<\/span>/);
  assert.match(idleSection, /<span class="mm-tab-item" data-mm-tab-panel="L-BillingPanel" data-mm-tab-action="A-SelectBillingTab">Billing<\/span>/);
  assert.match(idleSection, /<div class="mm-tabs-panel-note">panel: L-ProfilePanel<\/div>/);
  assert.match(elementSummary, new RegExp(`<td>${detailElementRef("2", "E-SettingsTabs")}</td><td>Tabs</td><td><ul class="spec-list"><li>${refActionChip("A-SelectProfileTab", "A-SelectProfileTab", "Select profile tab")}</li><li>${refActionChip("A-SelectBillingTab", "A-SelectBillingTab", "Select billing tab")}</li></ul></td><td>active tab: Profile</td>`));
  assert.match(displayContent, new RegExp(`<td>${detailElementRef("2", "E-SettingsTabs")}</td><td>tabs</td><td>${specSectionPattern("Tabs", ["Profile \\(panel: L-ProfilePanel; action: A-SelectProfileTab\\)", "Billing \\(panel: L-BillingPanel; action: A-SelectBillingTab\\)"])}</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td>`));
});

test("renders Popover and Tooltip element summary, wireframe, and display content spec", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/anchored-help.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  assert.deepEqual(result.diagnostics, []);
  const html = renderDesignDocumentHtml(result, "");
  const helpOpenSection = stateSection(html, "help-open");
  const elementSummary = helpOpenSection.match(/<h6 class="state-screen-detail-heading">Element Summary<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";
  const displayContent = helpOpenSection.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(helpOpenSection, /<div class="mm-element mm-element-tooltip" data-mm-id="E-PasswordHint" data-mm-anchor="E-PasswordInput" data-mm-placement="top">/);
  assert.match(helpOpenSection, /<span class="mm-tooltip-bubble">Use at least 12 characters\.<\/span>/);
  assert.match(helpOpenSection, /<div class="mm-element mm-element-popover" data-mm-id="E-PasswordHelp" data-mm-anchor="E-PasswordHelpButton" data-mm-placement="bottom-start">/);
  assert.match(helpOpenSection, /<div class="mm-popover-panel">Password must be at least 12 characters and include a number\.<\/div>/);
  assert.match(elementSummary, /<td>Tooltip<\/td>/);
  assert.match(elementSummary, /anchor: E-PasswordInput/);
  assert.match(elementSummary, /<td>Popover<\/td>/);
  assert.match(elementSummary, /anchor: E-PasswordHelpButton/);
  assert.match(displayContent, new RegExp(`<td>overlay</td><td>${specSectionPattern("Overlay", ["anchor: E-PasswordInput", "placement: top", "text: Use at least 12 characters\\."])}</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td>`));
  assert.match(displayContent, new RegExp(`<td>overlay</td><td>${specSectionPattern("Overlay", ["anchor: E-PasswordHelpButton", "placement: bottom-start", "text: Password must be at least 12 characters and include a number\\.", "visible when: help-open"])}</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td>`));
});

test("renders Accordion and Disclosure element summary, wireframe, and display content spec", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/accordion-disclosure.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  assert.deepEqual(result.diagnostics, []);
  const html = renderDesignDocumentHtml(result, "");
  const idleSection = stateSection(html, "idle");
  const elementSummary = idleSection.match(/<h6 class="state-screen-detail-heading">Element Summary<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";
  const displayContent = idleSection.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(idleSection, /<div class="mm-element mm-element-accordion" data-mm-id="E-AdvancedFilters">/);
  assert.match(idleSection, /<div class="mm-accordion-item mm-accordion-item-open" data-mm-accordion-panel="L-AdvancedFilterPanel" data-mm-accordion-action="A-ToggleAdvancedFilters">/);
  assert.match(idleSection, /<div class="mm-element mm-element-disclosure mm-disclosure-open" data-mm-id="E-ShippingDetails" data-mm-disclosure-panel="L-ShippingDetailsPanel">/);
  assert.match(elementSummary, /<td>Accordion<\/td>/);
  assert.match(elementSummary, /open item: Advanced filters/);
  assert.match(elementSummary, /<td>Disclosure<\/td>/);
  assert.match(elementSummary, /open: true/);
  assert.match(elementSummary, new RegExp(refActionChip("A-ToggleAdvancedFilters", "A-ToggleAdvancedFilters", "Toggle advanced filters")));
  assert.match(elementSummary, new RegExp(refActionChip("A-ToggleShippingDetails", "A-ToggleShippingDetails", "Toggle shipping details")));
  assert.match(displayContent, new RegExp(`<td>accordion</td><td>${specSectionPattern("Accordion", ["Advanced filters \\(panel: L-AdvancedFilterPanel; action: A-ToggleAdvancedFilters\\)", "Saved filters \\(panel: L-SavedFiltersPanel\\)"])}</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td>`));
  assert.match(displayContent, new RegExp(`<td>disclosure</td><td>${specSectionPattern("Disclosure", ["label: Shipping details", "open: true", "panel: L-ShippingDetailsPanel", "action: A-ToggleShippingDetails"])}</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td>`));
});

test("renders ActionMenu element summary, wireframe, and display content spec", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/action-menu.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  assert.deepEqual(result.diagnostics, []);
  const html = renderDesignDocumentHtml(result, "");
  const idleSection = stateSection(html, "idle");
  const elementSummary = idleSection.match(/<h6 class="state-screen-detail-heading">Element Summary<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";
  const displayContent = idleSection.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(idleSection, /<div class="mm-element mm-element-actionmenu mm-action-menu-open" data-mm-id="E-RowActions" data-mm-placement="bottom-end">/);
  assert.match(idleSection, /<div class="mm-action-menu-item" data-mm-action-menu-action="A-EditAccount">/);
  assert.match(idleSection, /<div class="mm-action-menu-item mm-action-menu-item-disabled mm-action-menu-item-danger" data-mm-action-menu-action="A-DisableAccount">/);
  assert.match(elementSummary, /<td>ActionMenu<\/td>/);
  assert.match(elementSummary, /open: true/);
  assert.match(elementSummary, new RegExp(refActionChip("A-EditAccount", "A-EditAccount", "Edit account")));
  assert.match(elementSummary, new RegExp(refActionChip("A-DisableAccount", "A-DisableAccount", "Disable account")));
  assert.match(displayContent, new RegExp(`<td>action menu</td><td>${specSectionPattern("Action Menu", ["Edit \\(action: A-EditAccount\\)", "Disable \\(action: A-DisableAccount; tone: danger; disabled when: selected-row-locked\\)"])}</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td>`));
});

test("splits input form values and source metadata into separate columns", () => {
  const result = parseMarkVSpec(`---
id: SCR-INPUT-SOURCE
type: screen
title: Input Source
---

# SCR-INPUT-SOURCE Input Source

## States

- loaded*

## Layout

### L-Page Page

- stack

#### Items

- E-EmailInput
- E-RoleSelect

## Elements

### E-EmailInput Input

- value: morgan@example.com
  - kind: data
- type: email

### E-RoleSelect Select

- value: member
  - kind: data
  - source: \${data.member.role}
- options:
  - Member
  - Administrator

## Preview Scenarios

### loaded-override

- state: loaded
- samples:
  - E-EmailInput: taylor@example.com
  - E-RoleSelect: administrator
`);
  const html = renderDesignDocumentHtml(result, "");
  const baselineForm = stateSection(html, "loaded").match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Input Form Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";
  const scenarioForm = stateViewTitleSection(html, "loaded / loaded-override").match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Input Form Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(baselineForm, /<th>Marker\/ID<\/th><th>Type<\/th><th>Required<\/th><th>Value<\/th><th>Source<\/th><th>Spec<\/th><th>Condition<\/th>/);
  assert.match(baselineForm, new RegExp(`<td>${detailElementRef("E-EmailInput", "E-EmailInput")}</td><td>Input</td><td>no</td><td>morgan@example\\.com</td><td>${sourceTypeChipPattern("data")}</td><td>${specSectionPattern("Input", ["type: email"])}</td><td>${defaultAlwaysPattern()}</td>`));
  assert.match(baselineForm, new RegExp(`<td>${detailElementRef("E-RoleSelect", "E-RoleSelect")}</td><td>Select</td><td>no</td><td>member</td><td>${sourceTypeChipPattern("data")}<br>${sourceCodePattern("${data.member.role}")}</td>`));
  assert.match(scenarioForm, new RegExp(`<td>${detailElementRef("E-EmailInput", "E-EmailInput")}</td><td>Input</td><td>no</td><td>taylor@example\\.com</td><td>${sourceTypeChipPattern("data")}</td>`));
  assert.match(scenarioForm, new RegExp(`<td>${detailElementRef("E-RoleSelect", "E-RoleSelect")}</td><td>Select</td><td>no</td><td>administrator</td><td>${sourceTypeChipPattern("data")}<br>${sourceCodePattern("${data.member.role}")}</td>`));
  assert.doesNotMatch(scenarioForm, /<td>[^<]*(?:Source|Kind|Metadata)[\s\S]*?<\/td><td><span class="mm-chip mm-source-chip/);
});

test("renders List items in display content spec without treating the list as input", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/profile-edit-rich.vspec.md"), "utf8");
  const html = renderDesignDocumentHtml(parseMarkVSpec(source), "");
  const idleSection = stateSection(html, "idle");
  const inputForm = idleSection.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Input Form Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";
  const displayContent = idleSection.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.doesNotMatch(inputForm, /E-AuditList/);
  assert.match(displayContent, new RegExp(`<td>${detailElementRef("17", "E-AuditList")}</td><td>items</td><td>${specSectionPattern("Items", ["Created by Morgan Lee", "Reviewed by Admin", "Last edited today"])}</td>`));
});

test("renders Table column source expressions as inline tokens in display content spec", () => {
  const result = parseMarkVSpec(`---
id: SCR-TABLE-COLUMN-SOURCE
type: screen
title: Table Column Source
---

# SCR-TABLE-COLUMN-SOURCE Table Column Source

## States

- loaded*

## Elements

### E-Users Table

- source: data
- Columns:
  - Email: \${model.users.email}
- sample rows:
  - row:
    - email: taylor@example.com
`);
  const html = renderDesignDocumentHtml(result, "");
  const displayContent = html.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(displayContent, new RegExp(`<td>columns</td><td>${specSectionPattern("Columns", [`Email \\(field: ${sourceCodePattern("${model.users.email}")}\\)`])}</td><td>-</td><td>${sourceTypeChipPattern("data")}</td>`));
  assert.doesNotMatch(displayContent, /<li>email<\/li>/);
});

test("renders display.element scenario effects as display updates", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/login-basic.vspec.md"), "utf8");
  const html = renderDesignDocumentHtml(parseMarkVSpec(source), "");
  const scenarioSection = stateViewTitleSection(html, "idle / idle-request-error");
  const displayUpdates = scenarioSection.match(/<aside class="display-explanations-box display-updates-box">[\s\S]*?<\/aside>/)?.[0] ?? "";

  assert.match(displayUpdates, /<h6 class="state-screen-detail-heading">Display updates<\/h6>/);
  assert.match(displayUpdates, /<th>Triggered by<\/th><th>Update<\/th>/);
  assert.match(displayUpdates, new RegExp(`${refActionChip("A1", "A-SubmitLogin", "Submit login")}[\\s\\S]*P2\\.send-failed`));
  assert.match(displayUpdates, new RegExp(`${detailLayoutRef("L3", "Message area")}[\\s\\S]*receives[\\s\\S]*${detailElementRef("10", "E-RequestErrorBanner")}`));
  assert.doesNotMatch(displayUpdates, /The login request could not be sent\./);
  assert.doesNotMatch(scenarioSection, /<h6 class="state-screen-detail-heading">Displayed messages<\/h6>/);
});

test("renders targetless dialog display.element effects as display updates", () => {
  const source = readFileSync(resolve("../../examples/03-actions/event-triggers.vspec.md"), "utf8");
  const html = renderDesignDocumentHtml(parseMarkVSpec(source), "");
  const scenarioSection = stateViewTitleSection(html, "idle / idle-confirm-discard");
  const displayUpdates = scenarioSection.match(/<aside class="display-explanations-box display-updates-box">[\s\S]*?<\/aside>/)?.[0] ?? "";

  assert.match(displayUpdates, /<h6 class="state-screen-detail-heading">Display updates<\/h6>/);
  assert.match(displayUpdates, new RegExp(`${refActionChip("A5", "A-RequestDiscardDialog", "Request discard dialog")}[\\s\\S]*P1\\.done`));
  assert.match(displayUpdates, new RegExp(`overlay[\\s\\S]*receives[\\s\\S]*${detailElementRef("14", "E-ConfirmDialog")}`));
  assert.doesNotMatch(displayUpdates, /Discard changes\\?/);
  assert.doesNotMatch(scenarioSection, /<h6 class="state-screen-detail-heading">Displayed messages<\/h6>/);
});

test("builds browser command candidates and arguments for PDF export", () => {
  const previousLocalAppData = process.env["LOCALAPPDATA"];
  const previousProgramFiles = process.env["PROGRAMFILES"];
  assert(pdfBrowserCandidates("darwin").some((candidate) => candidate.command.includes("Google Chrome.app")));
  assert(pdfBrowserCandidates("linux").some((candidate) => candidate.command === "google-chrome"));
  try {
    process.env["LOCALAPPDATA"] = "C:\\Users\\me\\AppData\\Local";
    process.env["PROGRAMFILES"] = "C:\\Program Files";
    assert(pdfBrowserCandidates("win32").some((candidate) => candidate.command.endsWith(join("Google", "Chrome", "Application", "chrome.exe"))));
    assert(pdfBrowserCandidates("win32").some((candidate) => candidate.command.endsWith(join("BraveSoftware", "Brave-Browser", "Application", "brave.exe"))));
    assert(pdfBrowserCandidates("win32").some((candidate) => candidate.command.endsWith(join("Chromium", "Application", "chrome.exe"))));
    assert(pdfBrowserCandidates("win32").every((candidate) => candidate.command.endsWith(".exe")));
  } finally {
    if (previousLocalAppData === undefined) {
      delete process.env["LOCALAPPDATA"];
    } else {
      process.env["LOCALAPPDATA"] = previousLocalAppData;
    }
    if (previousProgramFiles === undefined) {
      delete process.env["PROGRAMFILES"];
    } else {
      process.env["PROGRAMFILES"] = previousProgramFiles;
    }
  }
  assert.deepEqual(pdfBrowserArgs("/tmp/markvspec.html", "/tmp/markvspec.pdf"), [
    "--headless=new",
    "--disable-gpu",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=5000",
    "--no-pdf-header-footer",
    "--print-to-pdf=/tmp/markvspec.pdf",
    "file:///tmp/markvspec.html"
  ]);
});

test("keeps path browser candidates available for PDF fallback attempts", () => {
  assert.deepEqual(resolvePdfBrowserCommands("linux").map((candidate) => candidate.command), [
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
    "microsoft-edge",
    "brave-browser"
  ]);
});

test("renders project preview sections and transition Mermaid", () => {
  const projectSource = `---
id: PRJ-ADMIN
type: project
title: Admin Console
screens:
  - id: SCR-USERS
    path: screens/users.vspec.md
  - id: SCR-USER-DETAIL
    path: screens/user-detail.vspec.md
---

# PRJ-ADMIN Admin Console
`;
  const usersSource = `---
id: SCR-USERS
type: screen
title: Users
route: /users
---

# SCR-USERS Users

## States

- idle*

## Elements

### E-OpenDetail Link

- label: Detail

## Actions

### A7:A-OpenDetail Open detail

- Triggered
  - E-OpenDetail.click
- From
  - idle
- Process: Immediate
  - case: success
    - navigate: SCR-USER-DETAIL
    - params:
      - id: user.id
`;
  const detailSource = `---
id: SCR-USER-DETAIL
type: screen
title: User Detail
route: /users/:id
---

# SCR-USER-DETAIL User Detail

## States

- idle*
`;
  const files = new Map([
    ["/workspace/screens/users.vspec.md", usersSource],
    ["/workspace/screens/user-detail.vspec.md", detailSource]
  ]);
  const project = loadMarkVSpecProject(projectSource, {
    projectPath: "/workspace/vspec.project.md",
    readFile: (path) => files.get(path)
  });
  const documentHtml = renderProjectDesignDocumentHtml(project);
  const localizedProjectHtml = renderProjectDesignDocumentHtml(project, {
    ...messagesForLocale("en"),
    diagnostics: "診断",
    field: "項目",
    loaded: "読込済",
    none: "なし",
    project: "プロジェクト",
    projectTransitions: "遷移",
    value: "値"
  });
  const noTransitionProject = loadMarkVSpecProject(projectSource, {
    projectPath: "/workspace/vspec.project.md",
    readFile: (path) => path.endsWith("users.vspec.md") ? usersSource.replace(/## Actions[\s\S]*/u, "") : files.get(path)
  });
  const noTransitionHtml = renderProjectDesignDocumentHtml(noTransitionProject, {
    ...messagesForLocale("en"),
    none: "なし",
    projectTransitions: "遷移"
  });
  const previewHtml = renderProjectPreviewHtml(
    project,
    {
      cspSource: "vscode-resource:",
      asWebviewUri: (uri: unknown) => uri
    } as never,
    undefined,
    "vspec.project.md"
  );
  const standaloneHtml = renderStandaloneProjectHtml(project, "window.mermaid = { initialize() {}, render() {} };", "vspec.project.md");

  assert.match(documentHtml, /<h2>Project<\/h2>/);
  assert.match(documentHtml, /<td>PRJ-ADMIN<\/td>/);
  assert.match(documentHtml, /<h2>Screens<\/h2>/);
  assert.doesNotMatch(documentHtml, /<th>Status<\/th>/);
  assert.doesNotMatch(documentHtml, /<th>Owner<\/th>/);
  assert.match(documentHtml, new RegExp(`<td>${documentRef("SCR-USERS")}</td><td>Users</td><td>/users</td>`));
  assert.match(documentHtml, /<h2>Project Transition Diagram<\/h2>/);
  assert.match(documentHtml, /flowchart LR/);
  assert.match(documentHtml, /SCR_USERS --&gt;\|&quot;A7 Open detail \/ success&quot;\| SCR_USER_DETAIL/);
  assert.match(documentHtml, /<h2>Project Transitions<\/h2>/);
  assert.match(documentHtml, new RegExp(`<td>A7 Open detail</td><td><code>idle</code></td><td>success</td><td>screen</td><td>${documentRef("SCR-USER-DETAIL")}</td>`));
  assert.match(documentHtml, /<h2>Diagnostics<\/h2>/);
  assert.match(documentHtml, /<p class="spec-empty">None\.<\/p>/);
  assert.match(localizedProjectHtml, /<h2>プロジェクト<\/h2>/);
  assert.match(localizedProjectHtml, /<th>項目<\/th><th>値<\/th>/);
  assert.match(localizedProjectHtml, /<h2>診断<\/h2>/);
  assert.match(localizedProjectHtml, /<p class="spec-empty">なし<\/p>/);
  assert.doesNotMatch(localizedProjectHtml, /<th>Field<\/th><th>Value<\/th>/);
  assert.doesNotMatch(localizedProjectHtml, /<td>loaded<\/td>/);
  assert.doesNotMatch(localizedProjectHtml, /<p class="spec-empty">None\.<\/p>/);
  assert.match(noTransitionHtml, /<h2>遷移<\/h2>\s*<p class="spec-empty">なし<\/p>/);
  assert.match(previewHtml, /<title>Admin Console<\/title>/);
  assert.match(previewHtml, /Content-Security-Policy" content="default-src 'none'; img-src vscode-resource:; style-src vscode-resource: 'unsafe-inline'; script-src 'nonce-[^']+' vscode-resource:;"/);
  assert.doesNotMatch(previewHtml, /img-src [^"]*https:/);
  assert.match(previewHtml, /<span class="meta-item">vspec\.project\.md<\/span>/);
  assert.match(previewHtml, /runPreviewInitializer\("renderMermaidDiagrams", \(\) => renderMermaidDiagrams\(\)\);/);
  assert.match(previewHtml, /securityLevel: "strict"/);
  assert.match(previewHtml, /function mermaidCacheKey\(source\)/);
  assert.match(previewHtml, /return "mmd:" \+ source\.length \+ ":" \+ \(hash >>> 0\)\.toString\(36\);/);
  assert.match(previewHtml, /function prepareMermaidBlock\(block, cacheKey\)/);
  assert.match(previewHtml, /toggle\.className = "mermaid-source-toggle";/);
  assert.match(previewHtml, /toggle\.setAttribute\("aria-label", markvspecMessages\.mermaidShowSource\);/);
  assert.match(previewHtml, /applyCachedMermaidSize\(wrapper, cacheKey\);/);
  assert.match(previewHtml, /applyCachedMermaidSize\(placeholder, cacheKey\);/);
  assert.match(previewHtml, /rememberMermaidSize\(item\.cacheKey, item\.wrapper\);/);
  assert.match(previewHtml, /\.mermaid-source code\{background:transparent;border:0;border-radius:0;color:inherit;font:inherit;padding:0\}/);
  assert.match(previewHtml, /function markvspecAcquireVscodeApi\(\)/);
  assert.match(previewHtml, /window\.__markvspecVscodeApi = acquireVsCodeApi\(\);/);
  assert.match(previewHtml, /Unable to acquire VS Code API for MarkVSpec preview\./);
  assert.match(previewHtml, /return \{ postMessage\(\) \{\} \};/);
  assert.match(previewHtml, /const vscode = markvspecAcquireVscodeApi\(\);/);
  assert.match(previewHtml, /<nav class="toc" aria-label="Contents">/);
  assert.match(previewHtml, /<button class="toc-toggle" type="button" aria-label="Toggle contents" aria-expanded="true" title="Toggle contents" data-toc-toggle>/);
  assert.match(previewHtml, /function reportPreviewClientError\(phase, error, detail\)/);
  assert.match(previewHtml, /window\.addEventListener\("error"/);
  assert.match(previewHtml, /window\.addEventListener\("unhandledrejection"/);
  assert.match(previewHtml, /runPreviewInitializer\("initTableOfContents", \(\) => initTableOfContents\(\)\);/);
  assert.match(previewHtml, /runPreviewInitializer\("initActiveTableOfContents", \(\) => initActiveTableOfContents\(\)\);/);
  assert.match(previewHtml, /runPreviewInitializer\("initTableOfContentsToggle", \(\) => initTableOfContentsToggle\(\)\);/);
  assert.match(previewHtml, /function headingText\(heading\)/);
  assert.match(previewHtml, /const sections = Array\.from\(document\.querySelectorAll\("\.document \.doc-section, \.document \.state-viewport-section"\)\)/);
  assert.match(previewHtml, /function representativeSectionHeading\(section\)/);
  assert.doesNotMatch(previewHtml, /document\.querySelectorAll\(".document .doc-section > h2"\)/);
  assert.match(previewHtml, /function updateActiveTableOfContents\(\)/);
  assert.match(previewHtml, /const markvspecPreviewPositionKey = "vspec\.project\.md";/);
  assert.match(previewHtml, /positionsBySource\[markvspecPreviewPositionKey\] = \{\s*activeSectionId,\s*scrollY: window\.scrollY\s*\};/);
  assert.match(previewHtml, /function previewPositionState\(\)/);
  assert.match(previewHtml, /window\.scrollTo\(0, 0\);\s*\}\s*finally \{\s*previewPositionRestorePending = false;/);
  assert.match(previewHtml, /function updateStickyOffset\(\)/);
  assert.match(previewHtml, /const anchorY = updateStickyOffset\(\) \+ 16;/);
  assert.doesNotMatch(previewHtml, /rootMargin: "-72px 0px -70% 0px"/);
  assert.match(previewHtml, /\.toolbar\{align-items:center;background:#fff;border-bottom:1px solid #d1d5db;display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;padding:10px 58px 10px 14px;position:sticky;top:0;z-index:20\}/);
  assert.match(previewHtml, /\.toc-toggle\{align-items:center;background:#fff;border:1px solid #d1d5db;border-radius:6px;box-shadow:0 4px 14px rgba\(15,23,42,\.12\);color:#111827;cursor:pointer;display:inline-flex;height:32px;justify-content:center;padding:0;position:fixed;right:14px;top:10px;width:34px;z-index:21\}/);
  assert.match(previewHtml, /:root\{--markvspec-sticky-offset:72px;--markvspec-heading-state-views:18px;--markvspec-heading-viewport:15px;--markvspec-heading-state:14px;--markvspec-heading-detail:12px;--markvspec-heading-badge:11px\}/);
  assert.match(previewHtml, /\.document\{margin:0 auto;max-width:1180px;padding:20px 24px 40px\}/);
  assert.match(previewHtml, /\.document h2\[id\],\.document h3\[id\],\.document h4\[id\]\{scroll-margin-top:var\(--markvspec-sticky-offset\)\}/);
  assert.match(previewHtml, /\.state-viewport-section\{margin:18px 0 24px;scroll-margin-top:var\(--markvspec-sticky-offset\)\}/);
  assert.match(previewHtml, /\.state-viewport-section>h3\{align-items:center;display:flex;flex-wrap:wrap;font-size:var\(--markvspec-heading-viewport\);gap:8px;margin:22px 0 8px\}/);
  assert.match(previewHtml, /\.state-screen-heading\{align-items:center;display:flex;flex-wrap:wrap;font-size:var\(--markvspec-heading-state\);gap:8px;margin:18px 0 10px\}/);
  assert.match(previewHtml, /\.state-screen-subheading\{color:#334155;font-size:var\(--markvspec-heading-detail\);font-weight:700\}/);
  assert.match(previewHtml, /\.state-screen-detail-heading\{color:#475569;font-size:12px;font-weight:700;margin:14px 0 8px\}/);
  assert.match(previewHtml, /\.system-events-box\{background:#f8fafc;border:1px dashed #94a3b8;border-radius:6px;margin:10px 0 0;padding:7px 12px 8px\}/);
  assert.match(previewHtml, /\.system-events-box h4,\.system-events-box \.state-screen-detail-heading\{font-size:12px;margin:0 0 6px\}/);
  assert.doesNotMatch(previewHtml, /html\{scroll-padding-top:var\(--markvspec-sticky-offset\)\}/);
  assert.match(previewHtml, /\.wireframe-section\{max-width:100%;overflow-x:auto;overflow-y:visible;padding-bottom:4px\}/);
  assert.match(previewHtml, /\.state-screen-section\[data-viewport\] \.wireframe-section \.mm-wireframe:not\(\.mm-wireframe-empty\)\{max-width:none;min-width:var\(--markvspec-viewport-width, 100%\);width:var\(--markvspec-viewport-width, 100%\)\}/);
  assert.match(previewHtml, /\.toc\{background:#fff;border:1px solid #d1d5db;border-radius:8px;box-shadow:0 8px 24px rgba\(15,23,42,\.12\);display:none;max-height:calc\(100vh - 92px\);overflow:auto;padding:10px;position:fixed;right:16px;top:76px;width:220px;z-index:1\}/);
  assert.match(previewHtml, /body\.toc-collapsed \.toc\{display:none!important\}/);
  assert.match(previewHtml, /\.segmented button\[aria-pressed="true"\]\{background:#e0f2fe;border-color:#38bdf8;color:#075985;font-weight:700\}/);
  assert.doesNotMatch(previewHtml, /background:#1f2937|background:#111827|background:#000/);
  assert.match(previewHtml, /\*\{scrollbar-color:#9ca3af #f3f4f6;scrollbar-width:thin\}/);
  assert.match(previewHtml, /\*::-webkit-scrollbar\{height:10px;width:10px\}/);
  assert.match(previewHtml, /\*::-webkit-scrollbar-thumb\{background:#9ca3af;border:2px solid #f3f4f6;border-radius:999px\}/);
  assert.match(previewHtml, /@media \(min-width:760px\)\{\s*\.content\{padding-right:252px\}\s*body\.toc-collapsed \.content\{padding-right:0\}\s*\.toc\{display:block\}/);
  assert.match(previewHtml, /@media \(max-width:640px\)\{/);
  assert.match(previewHtml, /@page\{margin:14mm;size:A4 landscape\}/);
  assert.match(previewHtml, /:root\{--markvspec-sticky-offset:0px;--markvspec-heading-state-views:15pt;--markvspec-heading-viewport:12\.5pt;--markvspec-heading-state:11\.5pt;--markvspec-heading-detail:10pt;--markvspec-heading-badge:8\.5pt\}/);
  assert.match(previewHtml, /\.toc-inline\{break-after:page;break-inside:avoid;page-break-after:always;page-break-inside:avoid\}/);
  assert.match(previewHtml, /\.history-section\{break-before:page;page-break-before:always\}/);
  assert.doesNotMatch(previewHtml, /\.state-screen-section\{break-before:page;page-break-before:always\}/);
  assert.doesNotMatch(previewHtml, /\.layout-spec-fragment, \.element-spec-fragment, \.action-spec-fragment\{break-before:page;page-break-before:always\}/);
  assert.match(previewHtml, /\.wireframe-print-section, \.action-detail, \.note-block, \.process-card\{break-inside:avoid;page-break-inside:avoid\}/);
  assert.match(previewHtml, /\.spec-table tr\{break-inside:avoid;page-break-inside:avoid\}/);
  assert.doesNotMatch(previewHtml, /\.spec-table-wrap, \.spec-table\{break-inside:avoid;page-break-inside:avoid\}/);
  assert.doesNotMatch(previewHtml, /@page markvspec-landscape/);
  assert.doesNotMatch(previewHtml, /page:markvspec-landscape/);
  assert.doesNotMatch(previewHtml, /max-width:269mm/);
  assert.match(previewHtml, /\.wireframe-print-section\{box-sizing:border-box;max-width:100%;width:100%\}/);
  assert.match(previewHtml, /@media print\{[\s\S]*html,body,main,\.content,\.preview,\.document,\.spec-table-wrap,\.wireframe-section,\.mermaid-render,\.mermaid-source,\.note-content,\.entity-notes pre,\.entity-overview pre\{overflow:visible!important;scrollbar-width:none!important;-ms-overflow-style:none!important\}/);
  assert.match(previewHtml, /@media print\{[\s\S]*html::-webkit-scrollbar,body::-webkit-scrollbar,main::-webkit-scrollbar,\.content::-webkit-scrollbar,\.preview::-webkit-scrollbar,\.document::-webkit-scrollbar,\.spec-table-wrap::-webkit-scrollbar,\.wireframe-section::-webkit-scrollbar,\.mermaid-render::-webkit-scrollbar,\.mermaid-source::-webkit-scrollbar,\.note-content::-webkit-scrollbar,\.entity-notes pre::-webkit-scrollbar,\.entity-overview pre::-webkit-scrollbar\{display:none!important;height:0!important;width:0!important\}/);
  assert.doesNotMatch(previewHtml, /\.state-screen-section\[data-viewport\] \.wireframe-section \.mm-wireframe:not\(\.mm-wireframe-empty\)\{max-width:none!important;min-width:0!important;width:var\(--markvspec-viewport-width, 100%\)!important\}/);
  assert.match(previewHtml, /\.state-screen-section\[data-viewport\] \.wireframe-section \.mm-wireframe:not\(\.mm-wireframe-empty\)\{max-width:none!important;min-width:0!important;width:var\(--markvspec-viewport-width, 100%\)!important;zoom:var\(--markvspec-print-scale, 1\)\}/);
  assert.match(previewHtml, /\.wireframe-section \.mm-element-table\{max-width:100%!important;min-width:0!important;table-layout:fixed!important;width:100%!important\}/);
  assert.match(previewHtml, /\.spec-table\{font-size:8\.5pt;table-layout:auto;width:100%\}/);
  assert.match(previewHtml, /\*\{-webkit-print-color-adjust:exact;print-color-adjust:exact\}/);
  assert.doesNotMatch(previewHtml, /data-print-preview/);
  assert.match(standaloneHtml, /window\.mermaid = \{ initialize\(\) \{\}, render\(\) \{\} \};/);
  assert.doesNotMatch(standaloneHtml, /Content-Security-Policy/);
  assert.doesNotMatch(standaloneHtml, /acquireVsCodeApi/);
  assert.doesNotMatch(standaloneHtml, /vscode-resource:/);
  assert.doesNotMatch(standaloneHtml, /vscode\.postMessage/);
  assert.doesNotMatch(standaloneHtml, /event\.preventDefault/);
});

test("derives static HTML export names for screens and projects", () => {
  assert.equal(defaultExportHtmlBaseName("/workspace/login.vspec.md"), "login");
  assert.equal(defaultExportHtmlBaseName("/workspace/admin.vspec.project.md"), "admin.project");
  assert.equal(defaultExportHtmlBaseName("/workspace/vspec.project.md"), "vspec.project");
});

test("renders HttpRequest details inside each process step", () => {
  const source = `---
id: SCR-MULTI-REQUEST
type: screen
title: Multi Request
---

# SCR-MULTI-REQUEST Multi Request

## States

- idle*

## Elements

### E-NextPageButton Button

- label: Next

## Actions

### A3:A-NextPage Next page

- Triggered
  - E-NextPageButton.click
- From
  - idle
- Process: HttpRequest
  - GET /users?filter=<active>
    - page: \${model.requestedPage}
  - case: success
    - response: HTTP 200 users
    - model: \${model.requestedPage} = \${model.nextPage}
    - state: loaded
    - stop
- Process: HttpRequest
  - GET /roles
    - requestedPage: \${model.requestedPage}
  - case: success
    - response: HTTP 200 roles
    - state: roles-loaded
    - continue
  - case: failure
    - response: HTTP error
    - state: load-error
`;
  const result = parseMarkVSpec(source);
  const preview = renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false });
  const html = renderDesignDocumentHtml(result, preview);
  const actionDetail = html.match(/<article class="action-detail">\s*<h3 id="action-detail-A-NextPage">[\s\S]*?<\/article>/)?.[0] ?? "";

  assert.doesNotMatch(actionDetail, /<dt>Request<\/dt>|<dt>Parameters<\/dt>/);
  assert.doesNotMatch(actionDetail, /<dt>Overview<\/dt>/);
  assert.match(actionDetail, new RegExp(`<dt>Process</dt><dd><div class="process-flow" role="list">[\\s\\S]*<span class="process-card-title">HttpRequest</span>[\\s\\S]*<li>request: GET /users\\?filter=&lt;active&gt;<ul class="spec-list spec-nested-list"><li>Parameters<ul class="spec-list spec-nested-list"><li>page: ${sourceCodePattern("${model.requestedPage}")}</li></ul></li></ul></li><li>Case<ul class="spec-list spec-nested-list">[\\s\\S]*<strong>${docLabel("success", "result")}</strong>[\\s\\S]*response HTTP 200 users[\\s\\S]*effect set state ${docLabel("loaded", "state")}[\\s\\S]*stop process`));
  assert.match(actionDetail, new RegExp(`<span class="process-card-title">HttpRequest</span>[\\s\\S]*<li>request: GET /roles<ul class="spec-list spec-nested-list"><li>Parameters<ul class="spec-list spec-nested-list"><li>requestedPage: ${sourceCodePattern("${model.requestedPage}")}</li></ul></li></ul></li><li>Case<ul class="spec-list spec-nested-list">[\\s\\S]*<strong>${docLabel("success", "result")}</strong>[\\s\\S]*response HTTP 200 roles[\\s\\S]*effect set state ${docLabel("roles-loaded", "state")}[\\s\\S]*<strong>${docLabel("failure", "result")}</strong>[\\s\\S]*response HTTP error`));
  assert.doesNotMatch(actionDetail, /flow (?:stop|continue)/);
  assert.doesNotMatch(actionDetail, /<dt>Case success<\/dt>|<dt>Case failure<\/dt>|<dt>Responses<\/dt>/);
  assert.doesNotMatch(actionDetail, /<active>/);
});

test("renders process control at the end of process cases", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/profile-edit-rich.vspec.md"), "utf8");
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const actionDetail = html.match(/<article class="action-detail">\s*<h3 id="action-detail-A-RequestDiscardDialog">[\s\S]*?<\/article>/)?.[0] ?? "";

  assert.match(actionDetail, new RegExp(`<strong>${docLabel("done", "result")}</strong>[\\s\\S]*<li>display <ul class="spec-list spec-effect-list"><li>modal overlay</li><li>element ${detailElementRef("20", "E-DiscardDialog")}</li></ul></li><li>stop process</li>`));
  assert.doesNotMatch(actionDetail, /<strong><code class="mm-doc-label mm-doc-label-result">done<\/code><\/strong>[\s\S]*<li>stop process<\/li><li>display /);
});

test("renders direct immediate process effects in action details", () => {
  const source = `---
id: SCR-DIRECT-PROCESS
type: screen
title: Direct Process
---

# SCR-DIRECT-PROCESS Direct Process

## States

- idle*
- loaded

## Elements

### E-ContinueButton Button

- label: Continue

## Actions

### A1:A-Continue Continue

- Triggered
  - E-ContinueButton.click
- From
  - idle
- Process P1: Apply immediate effect
  - navigate: SCR-NEXT
- Process P2: Set loaded
  - state: loaded
- Process P3: Label only
`;
  const result = parseMarkVSpec(source);
  const preview = renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false });
  const html = renderDesignDocumentHtml(result, preview);
  const actionDetail = html.match(/<article class="action-detail">\s*<h3 id="action-detail-A-Continue">[\s\S]*?<\/article>/)?.[0] ?? "";

  assert.match(actionDetail, new RegExp(`<div class="process-card process-step-card" role="listitem">[\\s\\S]*<span class="process-card-title">${docLabel("P1", "result")} Apply immediate effect</span>[\\s\\S]*<li>effect navigate to ${documentRef("SCR-NEXT")}</li>`));
  assert.match(actionDetail, new RegExp(`<span class="process-card-title">${docLabel("P2", "result")} Set loaded</span>[\\s\\S]*<li>effect set state ${docLabel("loaded", "state")}</li>`));
  assert.match(actionDetail, new RegExp(`<span class="process-card-title">${docLabel("P3", "result")} Label only</span>\\s*</div>\\s*</div>`));
  assert.doesNotMatch(actionDetail, /<strong>success<\/strong>/);
});

test("localizes generated Japanese action detail process labels without translating author text", () => {
  const source = `---
id: SCR-JA-ACTION-LABELS
type: screen
title: Japanese Action Labels
locale: ja
---

# SCR-JA-ACTION-LABELS Japanese Action Labels

## States

- idle*
- loaded

## Layout: desktop

### L-Page Page

- stack

#### Items

- L-MessageArea
- E-RunButton

### L-MessageArea Message area

- stack

## Elements

### E-RunButton Button

- label: Run

### E-Message Text

- sample: Loaded

### E-SavedToast Toast

- message: Saved

## Actions

### A-Run Run

- Triggered
  - E-RunButton.click
- From
  - idle
- Process: ServerCall
  - group: initial-load
  - when: E-RunButton is enabled
  - skip when: E-RunButton is hidden
  - case: success
    - description: keep this English author text
    - response: 200 loaded
    - display:
      - target: L-MessageArea
      - element: E-Message
    - continue
- Process: Resolve
  - group: initial-load
  - case: ready
    - response: all done
    - state: loaded
    - stop
- Process: Immediate
  - navigate: SCR-NEXT
- Process: Immediate
  - display:
    - element: E-SavedToast
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const actionDetail = html.match(/<article class="action-detail">\s*<h3 id="action-detail-A-Run">[\s\S]*?<\/article>/)?.[0] ?? "";

  assert.match(actionDetail, /並列グループ: initial-load/);
  assert.match(actionDetail, /実行条件/);
  assert.match(actionDetail, /スキップ条件/);
  assert.match(actionDetail, /説明: keep this English author text/);
  assert.match(actionDetail, /レスポンス 200 loaded/);
  assert.match(actionDetail, /表示 [\s\S]*要素 [\s\S]*E-Message/);
  assert.match(actionDetail, /処理を継続/);
  assert.match(actionDetail, /<strong><code class="mm-doc-label mm-doc-label-result">success<\/code><\/strong>[\s\S]*<li>表示 [\s\S]*E-Message[\s\S]*<\/li><li>処理を継続<\/li>/);
  assert.match(actionDetail, /効果 状態更新/);
  assert.match(actionDetail, /処理を停止/);
  assert.match(actionDetail, /<strong><code class="mm-doc-label mm-doc-label-result">ready<\/code><\/strong>[\s\S]*<li>効果 状態更新[\s\S]*<\/li><li>処理を停止<\/li>/);
  assert.match(actionDetail, /効果 画面遷移/);
  assert.match(actionDetail, /表示 [\s\S]*トースト表示領域[\s\S]*要素 [\s\S]*E-SavedToast/);
  assert.doesNotMatch(actionDetail, /effect set state|stop process|continue process|navigate to|Parallel group:|skip when|modal overlay/);
});

test("renders nested process detail params without flattened dot keys", () => {
  const source = `---
id: SCR-NESTED-PROCESS-DETAILS
type: screen
title: Nested Process Details
---

# SCR-NESTED-PROCESS-DETAILS Nested Process Details

## States

- idle*

## Elements

### 1:E-EmailInput Input

### 2:E-PlanSelect Select

### 3:E-SubmitButton Button

- label: Submit

## Actions

### A-Submit Submit

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process: SubmitSubscription
  - request:
    - method: POST
    - path: /subscriptions
    - params:
      - email: E-EmailInput.value
      - plan: E-PlanSelect.value
  - server:
    - SubscriptionService.prepare()
    - params:
      - email: E-EmailInput.value
  - sync:
    - SubscriptionService.create()
    - params:
      - email: E-EmailInput.value
      - plan: E-PlanSelect.value
  - result:
    - subscription request
- Process: ServerCall
  - server:
    - SubscriptionService.persist()
    - params:
      - email: E-EmailInput.value
  - response:
    - HTTP 200 persisted subscription
    - params:
      - subscriptionId: response.id
  - validation:
    - V-SubscriptionForm.result
    - params:
      - email: E-EmailInput.value
`;
  const result = parseMarkVSpec(source);
  const preview = renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false });
  const html = renderDesignDocumentHtml(result, preview);
  const actionDetail = html.match(/<article class="action-detail">\s*<h3 id="action-detail-A-Submit">[\s\S]*?<\/article>/)?.[0] ?? "";

  assert.match(actionDetail, new RegExp(`<li>request<ul class="spec-list spec-nested-list">[\\s\\S]*<li>method: POST</li>[\\s\\S]*<li>path: /subscriptions</li>[\\s\\S]*<li>Parameters<ul class="spec-list spec-nested-list"><li>email: ${detailElementRef("1", "E-EmailInput")}\\.value</li><li>plan: ${detailElementRef("2", "E-PlanSelect")}\\.value</li></ul></li>[\\s\\S]*</ul></li>`));
  assert.match(actionDetail, new RegExp(`<li>server: SubscriptionService\\.prepare\\(\\)<ul class="spec-list spec-nested-list"><li>Parameters<ul class="spec-list spec-nested-list"><li>email: ${detailElementRef("1", "E-EmailInput")}\\.value</li></ul></li></ul></li>`));
  assert.match(actionDetail, new RegExp(`<li>sync: SubscriptionService\\.create\\(\\)<ul class="spec-list spec-nested-list"><li>Parameters<ul class="spec-list spec-nested-list"><li>email: ${detailElementRef("1", "E-EmailInput")}\\.value</li><li>plan: ${detailElementRef("2", "E-PlanSelect")}\\.value</li></ul></li></ul></li>`));
  assert.match(actionDetail, new RegExp(`<span class="process-card-title">ServerCall</span>[\\s\\S]*<li>server: SubscriptionService\\.persist\\(\\)<ul class="spec-list spec-nested-list"><li>Parameters<ul class="spec-list spec-nested-list"><li>email: ${detailElementRef("1", "E-EmailInput")}\\.value</li></ul></li></ul></li>`));
  assert.match(actionDetail, /<li>response: HTTP 200 persisted subscription<ul class="spec-list spec-nested-list"><li>Parameters<ul class="spec-list spec-nested-list"><li>subscriptionId: response\.id<\/li><\/ul><\/li><\/ul><\/li>/);
  assert.match(actionDetail, new RegExp(`<li>Validation: ${refMessageChip("V-SubscriptionForm", "V-SubscriptionForm", "V-SubscriptionForm")}\\.result<ul class="spec-list spec-nested-list"><li>Parameters<ul class="spec-list spec-nested-list"><li>email: ${detailElementRef("1", "E-EmailInput")}\\.value</li></ul></li></ul></li>`));
  assert.doesNotMatch(actionDetail, /request\.params|server\.params|sync\.params|response\.params|validation\.params/);
});

test("renders parallel process groups and resolve steps", () => {
  const source = `---
id: SCR-PARALLEL-PROCESS
type: screen
title: Parallel Process
---

# SCR-PARALLEL-PROCESS Parallel Process

## States

- loading*
- idle
- load-error

## Actions

### A-InitialLoad Initial load

- Triggered
  - screen.load
- From
  - loading
- Process: ServerCall
  - group: initial-load
  - MemberQueryService.findSelfProfile()
  - case: success
    - response: 200 member profile
    - continue
- Process: ServerCall
  - group: initial-load
  - PointQueryService.findSelfPoints()
  - case: success
    - response: 200 points
    - continue
- Process: Resolve
  - group: initial-load
  - case: ready
    - response: profile and points loaded
    - state: idle
    - stop
  - case: failed
    - response: one or more calls failed
    - state: load-error
    - stop
`;
  const result = parseMarkVSpec(source);
  const preview = renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false });
  const html = renderDesignDocumentHtml(result, preview);
  const actionDetail = html.match(/<article class="action-detail">\s*<h3 id="action-detail-A-InitialLoad">[\s\S]*?<\/article>/)?.[0] ?? "";

  assert.match(actionDetail, /<div class="process-card process-parallel-group-card" role="listitem" data-process-group="initial-load">[\s\S]*<span class="process-card-title">Parallel group: initial-load<\/span>/);
  assert.match(actionDetail, /<span class="process-card-title">ServerCall<\/span>[\s\S]*<li>MemberQueryService\.findSelfProfile\(\)<\/li>[\s\S]*continue process/);
  assert.match(actionDetail, /<span class="process-card-title">ServerCall<\/span>[\s\S]*<li>PointQueryService\.findSelfPoints\(\)<\/li>[\s\S]*continue process/);
  assert.match(actionDetail, new RegExp(`<div class="process-flow-connector" aria-hidden="true"></div><div class="process-card process-step-card process-resolve-card" role="listitem" data-resolve-group="initial-load">[\\s\\S]*<span class="process-card-title">Resolve initial-load</span><span class="process-card-meta">group initial-load</span>[\\s\\S]*<li>Case<ul class="spec-list spec-nested-list">[\\s\\S]*<strong>${docLabel("ready", "result")}</strong>[\\s\\S]*effect set state ${docLabel("idle", "state")}[\\s\\S]*stop process`));
  assert.doesNotMatch(actionDetail, /flow (?:stop|continue)/);
});

test("renders entity-level supplemental notes in generated design documents", () => {
  const source = `---
id: SCR-ENTITY-NOTES
type: screen
title: Entity Notes
---

# SCR-ENTITY-NOTES Entity Notes

## States

- idle*

## Layout: mobile

### main:L-Page Page

- stack

このレイアウトは初期リリースでは固定配置にする。

#### Items

- E-NextPageButton

## Elements

### E-NextPageButton Button

- label: Next

このボタンは二重クリック対策を実装側で行う。

## Actions

### A3:A-NextPage Next page

次ページへ移動するための一覧取得を開始する。

- Triggered
  - E-NextPageButton.click
- From
  - idle
- Process: HttpRequest
  - GET /users
- Process: Immediate
  - Effects
    - state: loading

備考をこういうところに書きたいよね。
`;
  const result = parseMarkVSpec(source);
  const preview = renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false });
  const html = renderDesignDocumentHtml(result, preview);
  const actionDetail = html.match(/<article class="action-detail">\s*<h3 id="action-detail-A-NextPage">[\s\S]*?<\/article>/)?.[0] ?? "";
  const idleSection = stateSection(html, "idle");

  assert.match(actionDetail, /<dt>Overview<\/dt><dd><div class="entity-overview"><p class="note-paragraph">次ページへ移動するための一覧取得を開始する。<\/p><\/div><\/dd>/);
  assert.match(actionDetail, /<dt>Notes<\/dt><dd><div class="entity-notes"><p class="note-paragraph">備考をこういうところに書きたいよね。<\/p><\/div><\/dd>/);
  assert.match(idleSection, /<td><div class="entity-overview"><p class="note-paragraph">次ページへ移動するための一覧取得を開始する。<\/p><\/div><\/td>/);
  assert.match(html, /<td><div class="entity-notes"><p class="note-paragraph">このレイアウトは初期リリースでは固定配置にする。<\/p><\/div><\/td>/);
  assert.match(html, /<td><div class="entity-notes"><p class="note-paragraph">このボタンは二重クリック対策を実装側で行う。<\/p><\/div><\/td>/);
});

test("renders structured section and supplemental entity prose in generated design documents", () => {
  const source = `---
id: SCR-STRUCTURED-PROSE
type: screen
title: Structured Prose
locale: en
---

# SCR-STRUCTURED-PROSE Structured Prose

## States

States section overview.

- idle*
  - Ready to edit.

### Section Notes

States section notes.

## Elements

Elements section overview.

### E-EmailInput Input

- value: \${model.email}

### Section Notes

Elements section notes.

## Actions

Actions section overview.

### A-Submit Submit

Action overview.

- Triggered
  - E-EmailInput.submit
- From
  - idle
- Process: Immediate
  - Effects
    - state: idle

Action notes.

### Section Notes

Actions section notes.

## Form Groups

Form Groups section overview.

### F-LoginForm Login form

Login form overview.

- fields:
  - E-EmailInput

Login form notes.

### Section Notes

Form Groups section notes.

## Validations

Validations section overview.

### V-EmailRequired Email required

Validation overview.

- target: F-LoginForm
- rules:
  - required:
    - E-EmailInput
- condition: E-EmailInput.value is empty
- message: Email is required.

Validation notes.

### Section Notes

Validations section notes.

## Business Rules

Business Rules section overview.

### R1:R-EmailRequired Email required

Rule overview.

- Email is required before submit.

Rule notes.

### Section Notes

Business Rules section notes.

## Error Codes

Error Codes section overview.

### ER1:ERR-EMAIL-REQUIRED Email required

Error overview.

- business rule: R-EmailRequired
- target: E-EmailInput
- message: Email is required.

Error notes.

### Section Notes

Error Codes section notes.
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const states = docSectionByHeading(html, "States", "State Flow");
  const stateTransitions = docSectionByHeading(html, "State Transitions", "Diagnostics");
  const formGroups = docSectionByHeading(html, "Form Groups", "Validations");
  const validations = docSectionByHeading(html, "Validations", "Business Rules");
  const rules = docSectionByHeading(html, "Business Rules", "Error Codes");
  const errorCodes = docSectionByHeading(html, "Error Codes");
  const idleSection = stateSection(html, "idle");

  assert.match(states, /States section overview\.[\s\S]*Ready to edit\./);
  assert.match(stateTransitions, /<h3 class="state-transition-context-heading">State Notes<\/h3>[\s\S]*States section notes\./);
  assert.match(idleSection, /<h5 class="state-screen-subheading">Elements<\/h5>[\s\S]*Elements section overview\.[\s\S]*E-EmailInput[\s\S]*Elements section notes\./);
  assert.match(idleSection, /<h5 class="state-screen-subheading">Actions<\/h5>[\s\S]*Actions section overview\.[\s\S]*Action overview\.[\s\S]*Actions section notes\./);
  assert.match(formGroups, /Form Groups section overview\.[\s\S]*<th>Overview<\/th>[\s\S]*Login form overview\.[\s\S]*Login form notes\.[\s\S]*Form Groups section notes\./);
  assert.match(validations, /Validations section overview\.[\s\S]*<th>Overview<\/th>[\s\S]*Validation overview\.[\s\S]*Validation notes\.[\s\S]*Validations section notes\./);
  assert.match(rules, /Business Rules section overview\.[\s\S]*<th>Overview<\/th>[\s\S]*Rule overview\.[\s\S]*Email is required before submit\.[\s\S]*Rule notes\.[\s\S]*Business Rules section notes\./);
  assert.match(errorCodes, /Error Codes section overview\.[\s\S]*<th>Overview<\/th>[\s\S]*Error overview\.[\s\S]*Error notes\.[\s\S]*Error Codes section notes\./);
  assert.match(errorCodes, /<th>Marker\/ID<\/th><th>Name<\/th>/);
  assert.match(errorCodes, /<span class="mm-ref-chip mm-ref-chip-error-code"[^>]*data-mm-ref-id="ERR-EMAIL-REQUIRED"[^>]*><code class="mm-id mm-marker mm-marker-error-code" data-mm-marker-category="error-code">ER1<\/code> Email required<\/span>/);
  assert.match(errorCodes, /<span class="mm-ref-chip mm-ref-chip-message"[^>]*data-mm-ref-id="R-EmailRequired"[^>]*><code class="mm-id mm-marker mm-marker-message" data-mm-marker-category="message" data-mm-display-source="R-EmailRequired">R1<\/code> Email required<\/span>/);
  assert.match(errorCodes, /<span class="mm-ref-chip mm-ref-chip-element"[^>]*data-mm-ref-id="E-EmailInput"[^>]*><code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">E-EmailInput<\/code> <span class="mm-detail-ref-id">E-EmailInput<\/span><\/span>/);
});

test("renders business rule text as safe markdown inside the rule table", () => {
  const source = `---
id: SCR-BUSINESS-RULE-MARKDOWN
type: screen
title: Business Rule Markdown
---

# SCR-BUSINESS-RULE-MARKDOWN Business Rule Markdown

## States

- idle*

## Business Rules

### R-BalanceVisibility Display rule

- \`\${model.pointInfo}\` が null の場合は残高サマリーを非表示にする。
- \`\${model.errorMessage}\` が **null でない** 場合は load-error 状態として扱う。
- <script>alert("xss")</script> は表示文字列として扱う。
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));
  const rules = docSectionByHeading(html, "Business Rules");

  assert.match(rules, /<ul class="spec-list">[\s\S]*<li><span class="mm-inline-token">\$\{model\.pointInfo\}<\/span> が null の場合/);
  assert.match(rules, /<li><span class="mm-inline-token">\$\{model\.errorMessage\}<\/span> が <strong>null でない<\/strong> 場合/);
  assert.match(rules, /&lt;script&gt;alert\(&quot;xss&quot;\)&lt;\/script&gt; は表示文字列として扱う。/);
  assert.doesNotMatch(rules, /<script>alert/);
});

test("keeps template-only structured section prose out of composed screen documents", () => {
  const templateSource = `---
id: TPL-PROSE
type: template
title: Template Prose
---

# TPL-PROSE Template Prose

## States

- idle*

## Layout: mobile

### L-TemplateForm Template form layout

- stack

#### Items

- E-TemplateInput

## Elements

### E-TemplateInput Input

- value: \${model.template}

## Form Groups

Template-only Form Groups overview.

### F-TemplateForm Template form

- fields:
  - E-TemplateInput
`;
  const screenSource = `---
id: SCR-PROSE
type: screen
title: Screen Prose
---

# SCR-PROSE Screen Prose

## States

- idle*

## Layout: mobile

### L-ScreenForm Screen form layout

- stack

#### Items

- E-ScreenInput

## Elements

### E-ScreenInput Input

- value: \${model.screen}

## Form Groups

Screen Form Groups overview.

### F-ScreenForm Screen form

- fields:
  - E-ScreenInput
`;
  const composed = composeMarkVSpecTemplate(parseMarkVSpec(templateSource), parseMarkVSpec(screenSource));
  const html = renderDesignDocumentHtml(composed, renderMarkVSpecHtml(composed, { includeStyles: false }));

  assert.doesNotMatch(html, /Template-only Form Groups overview\./);
  assert.doesNotMatch(html, /F-TemplateForm/);
  assert.match(html, /Screen Form Groups overview\./);
  assert.match(html, /F-ScreenForm/);
});

test("links action badges to action detail anchors by internal action IDs", () => {
  const source = `---
id: SCR-ACTION-ANCHORS
type: screen
title: Action Anchors
---

# SCR-ACTION-ANCHORS Action Anchors

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-SubmitButton

## Elements

### E-SubmitButton Button

- label: Submit

## Actions

### 送信:A-日本語操作 日本語操作

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process: Immediate
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false }));
  const anchor = "action-detail-A-%E6%97%A5%E6%9C%AC%E8%AA%9E%E6%93%8D%E4%BD%9C";

  assert.match(html, new RegExp(`<span class="mm-annotation-row">${markerBadge("E-SubmitButton", "element")}${actionBadge("送信", "A-日本語操作")}</span>`));
  assert.match(html, new RegExp(`<td>${refActionChip("送信", "A-日本語操作", "日本語操作")}</td>`));
  assert.match(html, new RegExp(`<h3 id="${anchor}">${actionBadge("送信", "A-日本語操作", false)} 日本語操作</h3>`));
});

test("keeps element-bound lifecycle actions out of system event boxes", () => {
  const source = `---
id: SCR-ELEMENT-BOUND-LIFECYCLE
type: screen
title: Element Bound Lifecycle
locale: en
---

# SCR-ELEMENT-BOUND-LIFECYCLE Element Bound Lifecycle

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-RefreshButton

## Elements

### E-RefreshButton Button

- label: Refresh
- action: A-Refresh

## Actions

### A1:A-Refresh Refresh

- Triggered
  - screen.load
- From
  - idle
- Process: Immediate
  - Effects
    - state: idle
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false }));
  const idleSection = stateSection(html, "idle");

  assert.match(idleSection, new RegExp(`<span class="mm-annotation-row">${markerBadge("E-RefreshButton", "element")}${actionBadge("A1", "A-Refresh")}</span>`));
  assert.doesNotMatch(idleSection, /system-events-box/);
});

test("does not synthesize action overview summaries", () => {
  const source = `---
id: SCR-DEDUP-EFFECTS
type: screen
title: Dedup Effects
locale: en
---

# SCR-DEDUP-EFFECTS Dedup Effects

## States

- idle*
- empty
- load-error
- loading

## Actions

### A1:A-SearchNotices Search notices

- Triggered
  - screen.load
- From
  - idle
  - empty
  - load-error
- Process: Immediate
  - Effects
    - state: loading
    - navigate: SCR-RESULTS
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false }));
  const actionDetail = html.match(/<article class="action-detail">\s*<h3 id="action-detail-A-SearchNotices">[\s\S]*?<\/article>/)?.[0] ?? "";
  const idleSection = stateSection(html, "idle");
  const emptySection = stateSection(html, "empty");
  const loadingEffect = `set state ${docLabel("loading", "state")}`;

  assert.doesNotMatch(actionDetail, /<dt>Overview<\/dt>/);
  assert.doesNotMatch(idleSection, new RegExp(`Effect ${loadingEffect}, navigate to ${documentRef("SCR-RESULTS")}`));
  assert.doesNotMatch(emptySection, new RegExp(`Effect ${loadingEffect}, navigate to ${documentRef("SCR-RESULTS")}`));
});

test("keeps action result details out of summary tables while preserving result-aware differences", () => {
  const source = `---
id: SCR-ACTION-RESULT-SUMMARY
type: screen
title: Action Result Summary
locale: en
---

# SCR-ACTION-RESULT-SUMMARY Action Result Summary

## States

- idle*
- error

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-SubmitButton
- E-OutcomeOnlyButton
- L-Message

### L-Message Message

- stack

#### Items

- E-ErrorText

## Elements

### E-SubmitButton Button

- label: Submit
- action: A-Submit

### E-OutcomeOnlyButton Button

- label: Outcome only
- action: A-OutcomeOnly

### E-ErrorText Text

- value: Invalid
- visible when: error

## Actions

### A-Submit Submit

- Triggered
  - E-SubmitButton.click
- From
  - idle
  - error
- Process: HttpRequest
  - POST /submit
- Process: Immediate
  - case: failure
    - from: idle
    - response: 400 invalid
    - state: error
    - update:
      - target: L-Message
      - content: Invalid

### A-OutcomeOnly Outcome only

- Triggered
  - E-OutcomeOnlyButton.click
- Process: Immediate
  - case: failure
    - response: 422 invalid
    - state: error
    - update:
      - target: L-Message
      - content: Outcome only invalid
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false }));
  const idleSection = stateSection(html, "idle");
  const errorSection = stateSection(html, "error");
  const idleActionsTable = idleSection.match(/<h5 class="state-screen-subheading">Actions<\/h5>\s*([\s\S]*?<\/table>)/)?.[1] ?? "";
  const errorActionsTable = errorSection.match(/<h5 class="state-screen-subheading">Actions<\/h5>\s*([\s\S]*?<\/table>)/)?.[1] ?? "";

  assert.match(idleActionsTable, /<th>Action<\/th><th>Trigger<\/th>/);
  assert.doesNotMatch(idleActionsTable, /<th>Kind<\/th>/);
  assert.doesNotMatch(idleActionsTable, /<th>Marker<\/th>/);
  assert.doesNotMatch(idleActionsTable, /<th>Name<\/th>/);
  assert.doesNotMatch(idleActionsTable, /<th>Overview<\/th>/);
  assert.doesNotMatch(idleSection, /<th>Result<\/th>/);
  assert.match(idleActionsTable, new RegExp(`<td>${refActionChip("A-OutcomeOnly", "A-OutcomeOnly", "Outcome only")}</td>`));
  assert.doesNotMatch(idleActionsTable, /From /);
  assert.doesNotMatch(idleActionsTable, /failure:/);
  assert.doesNotMatch(idleActionsTable, /422 invalid/);
  assert.match(errorSection, /<h5 class="state-screen-subheading">Actions<\/h5>/);
  assert.match(errorActionsTable, new RegExp(`<td>${refActionChip("A-Submit", "A-Submit", "Submit")} ${repeatedBadge()}</td>`));
  assert.doesNotMatch(errorActionsTable, /<th>Result<\/th>/);
  assert.doesNotMatch(errorActionsTable, /From /);
  assert.match(html, numberedHeadingPattern(2, "Action Details"));
  assert.match(html, new RegExp(`${docLabel("failure", "result")}[\\s\\S]*400 invalid[\\s\\S]*set state ${docLabel("error", "state")}`));
  assert.doesNotMatch(html, /<h2>Partial Updates<\/h2>/);
  assert.match(html, /content Invalid/);
});

test("orders action detail transitions by state definition order", () => {
  const source = `---
id: SCR-ACTION-TRANSITION-ORDER
type: screen
title: Action Transition Order
locale: en
---

# SCR-ACTION-TRANSITION-ORDER Action Transition Order

## States

- idle*
- loading
- error

## Elements

### E-SubmitButton Button

- label: Submit
- action: A-Submit

## Actions

### A-Submit Submit

- Triggered
  - E-SubmitButton.click
- Process: Immediate
  - case: retry
    - from: error
    - state: loading
  - case: sent
    - from: idle
    - state: loading
  - case: failed
    - from: idle
    - state: error
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false }));
  const actionDetail = html.match(/<article class="action-detail">[\s\S]*?<h3 id="action-detail-A-Submit">[\s\S]*?<\/article>/)?.[0] ?? "";
  const stateChanges = actionDetail.match(/<dt>State Changes<\/dt><dd><ul class="spec-list">([\s\S]*?)<\/ul><\/dd>/)?.[1] ?? "";
  const idleSent = stateChanges.indexOf(`From: ${docLabel("idle", "state")}; Case: ${docLabel("sent", "result")}; To: ${docLabel("loading", "state")}`);
  const idleFailed = stateChanges.indexOf(`From: ${docLabel("idle", "state")}; Case: ${docLabel("failed", "result")}; To: ${docLabel("error", "state")}`);
  const errorRetry = stateChanges.indexOf(`From: ${docLabel("error", "state")}; Case: ${docLabel("retry", "result")}; To: ${docLabel("loading", "state")}`);

  assert(idleSent >= 0);
  assert(idleFailed > idleSent);
  assert(errorRetry > idleFailed);
  assert.doesNotMatch(actionDetail, /<dt>Transitions<\/dt>| -> /);
});

test("separates action detail state changes from navigation targets", () => {
  const source = `---
id: SCR-ACTION-DETAIL-NAVIGATION
type: screen
title: Action Detail Navigation
locale: en
---

# SCR-ACTION-DETAIL-NAVIGATION Action Detail Navigation

## States

- idle*
- loading
- error

## Elements

### E-SubmitButton Button

- label: Submit

## Actions

### A-Submit Submit

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process P1: Immediate
  - Effects
    - state: loading
- Process P2: Immediate
  - case: success
    - navigate: SCR-DONE
    - params:
      - userId: \${model.userId}
  - case: failure
    - state: error

### A-ExternalHelp External help

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process: Immediate
  - Effects
    - navigate: https://example.com/help

### A-Settings Settings

- Triggered
  - E-SubmitButton.click
- From
  - idle
- Process: Immediate
  - Effects
    - navigate: /settings
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false }));
  const submitDetail = html.match(/<article class="action-detail">\s*<h3 id="action-detail-A-Submit">[\s\S]*?<\/article>/)?.[0] ?? "";
  const helpDetail = html.match(/<article class="action-detail">\s*<h3 id="action-detail-A-ExternalHelp">[\s\S]*?<\/article>/)?.[0] ?? "";
  const settingsDetail = html.match(/<article class="action-detail">\s*<h3 id="action-detail-A-Settings">[\s\S]*?<\/article>/)?.[0] ?? "";

  assert.doesNotMatch(submitDetail, /<dt>Transitions<\/dt>|idle -&gt; SCR-DONE| -> /);
  assert.match(submitDetail, new RegExp(`<dt>State Changes</dt><dd><ul class="spec-list">[\\s\\S]*From: ${docLabel("idle", "state")}; To: ${docLabel("loading", "state")}[\\s\\S]*From: ${docLabel("idle", "state")}; Case: ${docLabel("failure", "result")}; To: ${docLabel("error", "state")}`));
  assert.match(submitDetail, new RegExp(`<dt>Navigation</dt><dd><ul class="spec-list">[\\s\\S]*From: ${docLabel("idle", "state")}; Case: ${docLabel("success", "result")}; To: ${documentRef("SCR-DONE")}; Params: <ul><li>userId: ${sourceCodePattern("${model.userId}")}</li></ul>`));
  assert.doesNotMatch(helpDetail, /<dt>State Changes<\/dt>/);
  assert.match(helpDetail, /<dt>Navigation<\/dt><dd><ul class="spec-list"><li>From: <code class="mm-doc-label mm-doc-label-state">idle<\/code>; To: https:\/\/example\.com\/help<\/li><\/ul><\/dd>/);
  assert.doesNotMatch(settingsDetail, /<dt>State Changes<\/dt>/);
  assert.match(settingsDetail, /<dt>Navigation<\/dt><dd><ul class="spec-list"><li>From: <code class="mm-doc-label mm-doc-label-state">idle<\/code>; To: \/settings<\/li><\/ul><\/dd>/);
});

test("groups element details by behavior in the generated design document", () => {
  const source = `---
id: SCR-ELEMENT-GROUPS
type: screen
title: Element Groups
---

# SCR-ELEMENT-GROUPS Element Groups

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-ロール選択
- E-StartDate
- E-EndDate
- E-StartTime
- E-Headcount
- E-Notes
- E-アバターアップロード
- E-証憑ファイル
- E-エラーバナー
- E-状態バッジ
- E-Title
- E-CustomWidget

## Elements

### E-ロール選択 Select

- value: \${model.role}
- initial value: "Viewer"
- options:
  - Viewer: \${copy.roles.viewer}
  - Administrator: \${copy.roles.administrator}

### E-StartDate DatePicker

- value: \${model.startDate}
- min: 2020-01-01
- max: 2030-12-31
- disabled when: \${model.readonly}

### E-EndDate DateInput*

- value: \${model.endDate}
- initial value: 2026-05-02
- min: 2020-01-01
- max: 2030-12-31

### E-StartTime TimeInput

- value: \${model.startTime}
- initial value: 09:30
- min: 09:00
- max: 18:00

### E-Headcount NumberInput*

- value: \${model.headcount}
- initial value: 2
- min: 1
- max: 20
- step: 1

### E-Notes Textarea

- value: \${model.notes}
- placeholder: Internal notes
- rows: 4

### E-アバターアップロード FileUpload

- accept: image/png,image/jpeg

### E-証憑ファイル FileInput

- accept: application/pdf
- multiple

### E-エラーバナー Banner

- text: Invalid login
- tone: danger

### E-状態バッジ Badge

- text: Active
- tone: success

### E-Title Heading

- label: Login
- label src: \${copy.login.title}
- level: 1

### E-CustomWidget Widget

- label: Custom block
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false }));
  const elementSummary = html.match(/<h6 class="state-screen-detail-heading">Element Summary<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";

  assert.match(html, /<div class="element-detail-group"><h6 class="state-screen-detail-heading">Input Form Spec<\/h6>/);
  assert.match(elementSummary, new RegExp(`<td>${detailElementRef("E-状態バッジ", "E-状態バッジ")}</td><td>Badge</td>`));
  assert.doesNotMatch(elementSummary, /<span class="mm-chip mm-chip-type">Badge<\/span>/);
  assert.match(html, new RegExp(`<td>${detailElementRef("E-ロール選択", "E-ロール選択")}</td><td>Select</td><td>no</td><td>Viewer</td><td>${sourceTypeChipPattern("fixed")}</td><td>${specSectionPattern("Input", [`Options: Viewer \\(${sourceCodePattern("${copy.roles.viewer}")}\\), Administrator \\(${sourceCodePattern("${copy.roles.administrator}")}\\)`])}</td><td>${defaultAlwaysPattern()}</td>`));
  assert.match(html, new RegExp(`<td>${detailElementRef("E-StartDate", "E-StartDate")}</td><td>DatePicker</td><td>no</td><td>${sourceCodePattern("${model.startDate}")}</td><td>${sourceTypeChipPattern("fixed")}</td><td>${specSectionPattern("Constraints", ["min: 2020-01-01", "max: 2030-12-31"])}</td><td>${specSectionPattern("Enabled", [`not ${sourceCodePattern("${model.readonly}")}`])}</td>`));
  assert.match(html, new RegExp(`<td>${detailElementRef("E-EndDate", "E-EndDate")}</td><td>DateInput</td><td>yes</td><td>2026-05-02</td><td>${sourceTypeChipPattern("fixed")}</td><td>${specSectionPattern("Constraints", ["min: 2020-01-01", "max: 2030-12-31"])}</td><td>${defaultAlwaysPattern()}</td>`));
  assert.match(html, new RegExp(`<td>${detailElementRef("E-StartTime", "E-StartTime")}</td><td>TimeInput</td><td>no</td><td>09:30</td><td>${sourceTypeChipPattern("fixed")}</td><td>${specSectionPattern("Constraints", ["min: 09:00", "max: 18:00"])}</td>`));
  assert.match(html, new RegExp(`<td>${detailElementRef("E-Headcount", "E-Headcount")}</td><td>NumberInput</td><td>yes</td><td>2</td><td>${sourceTypeChipPattern("fixed")}</td><td>${specSectionPattern("Constraints", ["min: 1", "max: 20", "step: 1"])}</td>`));
  assert.match(html, new RegExp(`<td>${detailElementRef("E-Notes", "E-Notes")}</td><td>Textarea</td><td>no</td><td>${sourceCodePattern("${model.notes}")}</td><td>${sourceTypeChipPattern("fixed")}</td>`));
  assert.match(html, new RegExp(`<td>${detailElementRef("E-アバターアップロード", "E-アバターアップロード")}</td><td>FileUpload</td><td>no</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td><td>${specSectionPattern("Constraints", ["accept: image/png,image/jpeg"])}</td><td>${defaultAlwaysPattern()}</td>`));
  assert.match(html, new RegExp(`<td>${detailElementRef("E-証憑ファイル", "E-証憑ファイル")}</td><td>FileInput</td><td>no</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td><td>${specSectionPattern("Constraints", ["accept: application/pdf", "multiple"])}</td><td>${defaultAlwaysPattern()}</td>`));
  const displayContent = html.match(/<div class="element-detail-group"><h6 class="state-screen-detail-heading">Display Content Spec<\/h6>[\s\S]*?<\/table>/)?.[0] ?? "";
  assert.match(displayContent, /<th>Marker\/ID<\/th><th>Location<\/th><th>Content<\/th><th>Format<\/th><th>Source<\/th><th>Condition<\/th>/);
  assert.doesNotMatch(displayContent, /<th>Enabled When<\/th>/);
  assert.doesNotMatch(displayContent, /<th>Display Location<\/th>|<th>Display Content<\/th>|<th>Display Condition<\/th>/);
  assert.match(displayContent, new RegExp(`<td>${detailElementRef("E-ロール選択", "E-ロール選択")}</td><td>options</td><td>${specSectionPattern("Options", [`Viewer \\(${sourceCodePattern("${copy.roles.viewer}")}\\)`, `Administrator \\(${sourceCodePattern("${copy.roles.administrator}")}\\)`])}</td><td>-</td><td>${plainCodePattern("mixed")}</td><td>${defaultAlwaysPattern()}</td>`));
  assert.doesNotMatch(displayContent, /option label/);
  assert.match(displayContent, new RegExp(`<td>${detailElementRef("E-エラーバナー", "E-エラーバナー")}</td><td>text</td><td>Invalid login</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td><td>${defaultAlwaysPattern()}</td>`));
  assert.match(displayContent, new RegExp(`<td>${detailElementRef("E-状態バッジ", "E-状態バッジ")}</td><td>text</td><td>${semanticChip("Active", "success")}</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td><td>${defaultAlwaysPattern()}</td>`));
  assert.match(displayContent, new RegExp(`<td rowspan="2">${detailElementRef("E-Title", "E-Title")}</td><td>label</td><td>Login</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td><td>${defaultAlwaysPattern()}</td>`));
  assert.match(displayContent, new RegExp(`<tr><td>label src</td><td>${sourceCodePattern("${copy.login.title}")}</td><td>-</td><td>${sourceTypeChipPattern("fixed")}</td><td>${defaultAlwaysPattern()}</td>`));
  assert.doesNotMatch(html, /<div class="element-detail-group"><h4>Status Display<\/h4>/);
  assert.doesNotMatch(html, /<div class="element-detail-group"><h4>Content<\/h4>/);
  assert.doesNotMatch(displayContent, /<th>Level<\/th>/);
});

test("renders unreserved free-form sections in the design document", () => {
  const source = `---
id: SCR-FREEFORM
type: screen
title: Freeform
---

# SCR-FREEFORM Freeform

## States

- idle*

## Review Memo

- Confirm copy with legal.

## Decision Log

- Should the error message be inline or global?

## Implementation Notes

Use \`server-side rendering\` for the first release.

## Review Memo

| Topic | Description |
|---|---|
| Release | Initial draft |

## Implementation Data

| Name | Value |
|---|---|
| email | Required |

## Copy Notes

- MSG-001: Confirm copy.

## Access Notes

| Role | Available |
|---|---|
| Member | yes |
`;
  const result = parseMarkVSpec(source);
  const preview = renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false });
  const html = renderDesignDocumentHtml(result, preview);

  assert.match(html, numberedHeadingPattern(2, "Review Memo <span class=\"note-line\">line 13</span>"));
  assert.match(html, /<section class="doc-section note-section" data-section-number="9">/);
  assert.match(html, /Confirm copy with legal\./);
  assert.match(html, numberedHeadingPattern(2, "Decision Log <span class=\"note-line\">line 17</span>"));
  assert.match(html, /Should the error message be inline or global\?/);
  assert.match(html, numberedHeadingPattern(2, "Implementation Notes <span class=\"note-line\">line 21</span>"));
  assert.match(html, /Use <span class="mm-inline-token">server-side rendering<\/span> for the first release\./);
  assert.doesNotMatch(html, /Use <code>server-side rendering<\/code> for the first release\./);
  assert.match(html, numberedHeadingPattern(2, "Review Memo <span class=\"note-line\">line 25</span>"));
  assert.match(html, /<th>Topic<\/th><th>Description<\/th>/);
  assert.match(html, /<td>Release<\/td><td>Initial draft<\/td>/);
  assert.match(html, numberedHeadingPattern(2, "Implementation Data <span class=\"note-line\">line 31</span>"));
  assert.match(html, /<th>Name<\/th><th>Value<\/th>/);
  assert.match(html, /<td>email<\/td><td>Required<\/td>/);
  assert.match(html, numberedHeadingPattern(2, "Copy Notes <span class=\"note-line\">line 37</span>"));
  assert.match(html, /<li>MSG-001: Confirm copy\.<\/li>/);
  assert.match(html, numberedHeadingPattern(2, "Access Notes <span class=\"note-line\">line 41</span>"));
  assert.match(html, /<th>Role<\/th><th>Available<\/th>/);
});

test("renders markdown notation in supplemental prose", () => {
  const source = `---
id: SCR-MARKDOWN-PROSE
type: screen
title: Markdown Prose
---

# SCR-MARKDOWN-PROSE Markdown Prose

## States

- idle*

## Actions

### A-Submit Submit

Use **strong** text, *emphasis*, [help](./my_file_name.md), and \`token\`.

- first item
  - nested item
1. ordered item

> quoted note

---

#### Supplement

- Triggered
  - form.submit
- From
  - idle
- Process: Immediate
  - Effects
    - state: idle

![Diagram](./diagram.png)

<script>alert("x")</script>
`;
  const result = parseMarkVSpec(source);
  const preview = renderMarkVSpecHtml(result, { includeConditionalContent: true, includeStyles: false });
  const html = renderDesignDocumentHtml(result, preview);
  const actionDetail = html.match(/<article class="action-detail">\s*<h3 id="action-detail-A-Submit">[\s\S]*?<\/article>/)?.[0] ?? "";

  assert.match(actionDetail, /Use <strong>strong<\/strong> text, <em>emphasis<\/em>, <a href="\.\/my_file_name\.md">help<\/a>, and <span class="mm-inline-token">token<\/span>\./);
  assert.doesNotMatch(actionDetail, /href="[^"]*<em>/);
  assert.match(actionDetail, /<ul class="spec-list"><li>first item <ul class="spec-list"><li>nested item<\/li><\/ul><\/li><\/ul>/);
  assert.match(actionDetail, /<ol class="spec-list"><li>ordered item<\/li><\/ol>/);
  assert.match(actionDetail, /<blockquote class="note-blockquote"><p class="note-paragraph">quoted note<\/p><\/blockquote>/);
  assert.match(actionDetail, /<hr class="note-break">/);
  assert.match(actionDetail, /<h6 class="note-heading">Supplement<\/h6>/);
  assert.match(actionDetail, /<img src="\.\/diagram\.png" alt="Diagram">/);
  assert.match(actionDetail, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(actionDetail, /<script>alert/);
});

test("renders MarkVSpec entity references in markdown prose as reference chips", () => {
  const source = `---
id: SCR-ENTITY-REFS
type: screen
title: Entity refs
---

See #{SCR-ENTITY-REFS}, #{L-Form}, #{E-NameInput}, #{A-Submit}, #{F-LoginForm}, #{V-NameValidation}, #{R-Eligibility}, and #{ERR-NAME-REQUIRED}.

## States

- idle*

## Layout: desktop

### L-Form Form

- stack

#### Items

- E-NameInput

## Elements

### E-NameInput Input

- marker: E1
- label: Name

## Actions

### A-Submit Submit

Refer to #{R-Eligibility}; keep \`#{E-NameInput}\`, \`\`#{A-Submit}\`\`, and \`\`literal \` #{ERR-IN-CODE}\`\` literal.

\`\`\`markdown
#{R-Eligibility}
\`\`\`

- Triggered
  - E-NameInput.change
- From
  - idle
- Process: Immediate
  - Effects
    - state: idle

## Business Rules

### R-Eligibility Eligibility

- marker: R1

## Form Groups

### F-LoginForm Login form

- marker: F1
- fields:
  - E-NameInput

## Validations

### V-NameValidation Name validation

- marker: V1
- target: E-NameInput
- message: Name is required.

## Error Codes

### ERR-NAME-REQUIRED Name required

- marker: ER1
- target: E-NameInput
- message: Name is required.
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, "");
  const actionDetail = html.match(/<article class="action-detail">\s*<h3 id="action-detail-A-Submit">[\s\S]*?<\/article>/)?.[0] ?? "";

  assert.match(html, /<a class="mm-ref-chip mm-ref-chip-document" href="#screen"[^>]*data-mm-ref-id="SCR-ENTITY-REFS"[^>]*>/);
  assert.match(html, /<a class="mm-ref-chip mm-ref-chip-layout" href="#state-views"[^>]*data-mm-ref-id="L-Form"[^>]*>/);
  assert.match(html, /<a class="mm-ref-chip mm-ref-chip-element" href="#state-views"[^>]*data-mm-ref-id="E-NameInput"[^>]*>[\s\S]*>E1<\/code> <span class="mm-detail-ref-id">E-NameInput<\/span><\/a>/);
  assert.match(html, /<a class="mm-ref-chip mm-ref-chip-action" href="#action-detail-A-Submit"[^>]*data-mm-ref-id="A-Submit"[^>]*>/);
  assert.match(html, /<a class="mm-ref-chip mm-ref-chip-form-group" href="#form-groups"[^>]*data-mm-ref-id="F-LoginForm"[^>]*>/);
  assert.match(html, /<a class="mm-ref-chip mm-ref-chip-message" href="#validation-rules"[^>]*data-mm-ref-id="V-NameValidation"[^>]*>/);
  assert.match(html, /<a class="mm-ref-chip mm-ref-chip-message" href="#business-rules"[^>]*data-mm-ref-id="R-Eligibility"[^>]*>[\s\S]*>R1<\/code> Eligibility<\/a>/);
  assert.match(html, /<a class="mm-ref-chip mm-ref-chip-error-code" href="#error-codes"[^>]*data-mm-ref-id="ERR-NAME-REQUIRED"[^>]*>/);
  assert.match(actionDetail, /Refer to <a class="mm-ref-chip mm-ref-chip-message" href="#business-rules"[^>]*data-mm-ref-id="R-Eligibility"/);
  assert.match(actionDetail, /<span class="mm-inline-token">#\{E-NameInput\}<\/span>/);
  assert.match(actionDetail, /<span class="mm-inline-token">#\{A-Submit\}<\/span>/);
  assert.match(actionDetail, /<span class="mm-inline-token">literal ` #\{ERR-IN-CODE\}<\/span>/);
  assert.match(actionDetail, /<pre><code class="language-markdown">#\{R-Eligibility\}<\/code><\/pre>/);
});

test("blocks external markdown images while preserving external links", () => {
  const html = renderInlineMarkdown("![remote](https://example.com/a.png) [help](https://example.com/docs)");

  assert.doesNotMatch(html, /<img/);
  assert.match(html, /<a href="https:\/\/example\.com\/docs">help<\/a>/);
  assert.equal(renderInlineMarkdown("![webview](vscode-resource:/secret.png)"), "");
});

test("renders structured history entries in the generated design document", () => {
  const source = `---
id: SCR-HISTORY
type: screen
title: History
version: 9.9
---

# SCR-HISTORY History

## States

- idle*

## History Fields

- ticket
  label: Ticket
  required: false
  type: string

## History

History section overview.

### ver 1.0

- date: 2026-05-13
- author: Alice
- ticket: MM-1

Initial release.

- Added the login form.

### ver 0.9

- date: 2026-05-01
- author: Bob

Backfilled historical note.

### Section Notes

History section notes.
`;
  const result = parseMarkVSpec(source);
  const html = renderDesignDocumentHtml(result, renderMarkVSpecHtml(result, { includeStyles: false }));

  assert.deepEqual(result.diagnostics, []);
  assert.match(html, /<h3>Basic Info<\/h3>/);
  assert.match(html, /<dt>Version<\/dt><dd>ver 0\.9<\/dd>/);
  assert.match(html, /<dt>Date<\/dt><dd>2026-05-01<\/dd>/);
  assert.match(html, /<dt>Author<\/dt><dd>Bob<\/dd>/);
  assert.doesNotMatch(html, /<dt>Version<\/dt><dd>9\.9<\/dd>/);
  assert.match(html, /<h2>History<\/h2>/);
  assert.match(html, /<div class="entity-overview"><p class="note-paragraph">History section overview\.<\/p><\/div>[\s\S]*<table/);
  assert.match(html, /<th>Version<\/th><th>Date<\/th><th>Author<\/th><th>Reviewer<\/th><th>Reason<\/th><th>Ticket<\/th><th>Changes<\/th>/);
  assert.match(html, /<td>ver 1\.0<\/td><td>2026-05-13<\/td><td>Alice<\/td><td>-<\/td><td>-<\/td><td>MM-1<\/td>/);
  assert.match(html, /<p class="note-paragraph">Initial release\.<\/p>/);
  assert.match(html, /<li>Added the login form\.<\/li>/);
  assert.match(html, /<\/table>[\s\S]*<div class="entity-notes"><p class="note-paragraph">History section notes\.<\/p><\/div>/);
  assert.doesNotMatch(html, /<td>Section Notes<\/td>/);
});

test("creates document symbols for MarkVSpec structure", () => {
  const source = readFileSync(resolve("../../examples/04-real-world-screens/login-basic.vspec.md"), "utf8");
  const symbols = createMarkVSpecDocumentSymbols(createTextDocument(source) as never);
  const screen = symbols[0];

  assert.equal(screen.name, "SCR-LOGIN Login");
  assert.equal(screen.detail, "Screen");
  assert.equal(screen.selectionRange.start.line, 8);
  assert.deepEqual(screen.children.map((child) => child.name), [
    "States",
    "Layout: mobile",
    "Layout: desktop",
    "Elements",
    "Form Groups",
    "Actions",
    "Preview Scenarios",
    "Cross-field Validations",
    "Business Rules"
  ]);

  const states = screen.children.find((child) => child.name === "States");
  assert.deepEqual(states?.children.map((child) => `${child.name}:${child.detail}`), [
    "idle:initial state",
    "authenticating:state"
  ]);

  const mobileLayout = screen.children.find((child) => child.name === "Layout: mobile");
  assert(mobileLayout);
  assert(mobileLayout.children.some((child) => child.name === "L1:L-Page Login page" && child.detail === "mobile"));
  assert(mobileLayout.children.some((child) => child.name === "L7:L-AuthProgress Auth progress" && child.detail === "mobile"));

  const desktopLayout = screen.children.find((child) => child.name === "Layout: desktop");
  assert(desktopLayout);
  assert(desktopLayout.children.some((child) => child.name === "L8:L-DesktopActions Desktop actions" && child.detail === "desktop"));

  const elements = screen.children.find((child) => child.name === "Elements");
  assert(elements);
  assert(elements.children.some((child) => child.name === "1:E-PageTitle" && child.detail === "Heading"));
  assert(elements.children.some((child) => child.name === "3:E-EmailInput" && child.detail === "Input"));

  const formGroups = screen.children.find((child) => child.name === "Form Groups");
  assert(formGroups);

  const actions = screen.children.find((child) => child.name === "Actions");
  assert(actions);
  assert.deepEqual(actions.children.map((child) => child.name), [
    "A1:A-SubmitLogin Submit login",
    "A2:A-HandleLoginResponse Handle login response",
    "A3:A-ForgotPassword Open password reset"
  ]);

  const rules = screen.children.find((child) => child.name === "Business Rules");
  assert(rules);
  assert.deepEqual(rules.children.map((child) => child.name), [
    "R1:R-AUTH-001"
  ]);
});

test("creates document symbols for Japanese IDs and names", () => {
  const source = `---
id: SCR-JA
type: screen
title: 日本語画面
---

# SCR-JA 日本語画面

## States

- 初期*

## Layout: mobile

### 1:L-日本語フォーム 日本語フォーム

- stack

#### Items

- E-ページヘッダ

## Elements

### 2:E-ページヘッダ 見出し

- value: ようこそ

## Actions

### A1:A-日本語操作 日本語操作

- Triggered
  - E-ページヘッダ.click

## Validations

### V-日本語検証 日本語検証

- target: E-ページヘッダ
- condition: E-ページヘッダ が表示されていること
- message: 日本語検証メッセージ

## Model Samples

### 初期

#### \${model.お知らせ.items}

| title |
| --- |
| お知らせ |

## Business Rules

### R1:R-日本語業務ルール 業務ルール

- 日本語の業務ルールを書けること。

## Error Codes

### ER1:ERR-日本語 日本語エラー

- business rule: R-日本語業務ルール
- target: E-ページヘッダ
- message: 日本語エラー
- display: inline
`;
  const screen = createMarkVSpecDocumentSymbols(createTextDocument(source) as never)[0];
  const states = screen.children.find((child) => child.name === "States");
  const layout = screen.children.find((child) => child.name === "Layout: mobile");
  const elements = screen.children.find((child) => child.name === "Elements");
  const actions = screen.children.find((child) => child.name === "Actions");
  const validations = screen.children.find((child) => child.name === "Validations");
  const businessRules = screen.children.find((child) => child.name === "Business Rules");
  const errorCodes = screen.children.find((child) => child.name === "Error Codes");

  assert.equal(screen.name, "SCR-JA 日本語画面");
  assert.equal(states?.children[0]?.name, "初期");
  assert.equal(layout?.children[0]?.name, "1:L-日本語フォーム 日本語フォーム");
  assert.equal(elements?.children[0]?.name, "2:E-ページヘッダ");
  assert.equal(elements?.children[0]?.detail, "見出し");
  assert.equal(actions?.children[0]?.name, "A1:A-日本語操作 日本語操作");
  assert.equal(validations?.children[0]?.name, "V-日本語検証 日本語検証");
  const modelSamples = screen.children.find((child) => child.name === "Model Samples");
  assert.equal(modelSamples?.detail, "Section");
  assert.deepEqual(modelSamples?.children, []);
  assert.equal(businessRules?.children[0]?.name, "R1:R-日本語業務ルール 業務ルール");
  assert.equal(errorCodes?.children[0]?.name, "ER1:ERR-日本語 日本語エラー");
});

test("creates a quick fix for missing action triggers", () => {
  const source = `---
id: SCR-QUICKFIX
type: screen
title: Quick Fix
---

# SCR-QUICKFIX Quick Fix

## States

- idle*

## Actions

### A-Submit Submit

- From
  - idle
`;
  const document = createTextDocument(source) as never;
  const diagnostic = createDiagnostic(
    source,
    "### A-Submit Submit",
    "Action A-Submit has no trigger. Add Element action:, a ## Events entry with page.load or partial.render, or receive A-ActionId.P-marker.response."
  );
  const actions = createMarkVSpecCodeActions(document, [diagnostic]);
  const edits = actions[0]?.edit as unknown as { edits: Array<{ kind: string; newText?: string; position?: { line: number; character: number }; uri?: unknown }> };

  assert.equal(actions.length, 1);
  assert.equal(actions[0]?.title, "Add page.load event for A-Submit");
  assert.equal(actions[0]?.isPreferred, undefined);
  assert.equal(edits.edits.length, 1);
  assert.equal(edits.edits[0]?.kind, "insert");
  assert.deepEqual(edits.edits[0]?.uri, (document as { uri: unknown }).uri);
  assert.equal(edits.edits[0]?.position?.line, 19);
  assert.equal(edits.edits[0]?.position?.character, 0);
  assert.equal(edits.edits[0]?.newText, "\n## Events\n\n- page.load: A-Submit\n");
});

test("does not create a missing trigger quick fix when the diagnostic range is stale", () => {
  const source = `---
id: SCR-STALE
type: screen
title: Stale
---

# SCR-STALE Stale

## Actions

Not an action heading
`;
  const diagnostic = createDiagnostic(
    source,
    "Not an action heading",
    "Action A-Submit has no trigger. Add Element action:, a ## Events entry with page.load or partial.render, or receive A-ActionId.P-marker.response."
  );

  assert.deepEqual(createMarkVSpecCodeActions(createTextDocument(source) as never, [diagnostic]), []);
});

test("creates a quick fix for bare Layout sections when a default viewport is known", () => {
  const source = `---
id: SCR-LAYOUT-FIX
type: screen
title: Layout Fix
---

# SCR-LAYOUT-FIX Layout Fix

## Layout: mobile

### L-Existing Existing

- stack

## Layout
`;
  const document = createTextDocument(source) as never;
  const diagnostic = createDiagnostic(
    source,
    "## Layout",
    "Layout section must specify a viewport, for example ## Layout: mobile."
  );
  const actions = createMarkVSpecCodeActions(document, [diagnostic]);
  const edits = actions[0]?.edit as unknown as { edits: Array<{ kind: string; newText?: string; range?: vscode.Range }> };

  assert.equal(actions.length, 1);
  assert.equal(actions[0]?.title, "Change to ## Layout: mobile");
  assert.equal(edits.edits[0]?.kind, "replace");
  assert.equal(edits.edits[0]?.newText, "## Layout: mobile");
  assert.deepEqual(edits.edits[0]?.range?.start, { line: 14, character: 0 });
  assert.deepEqual(edits.edits[0]?.range?.end, { line: 14, character: 9 });
});

test("does not create a Layout viewport quick fix without a known default viewport", () => {
  const source = `---
id: SCR-LAYOUT-NO-FIX
type: screen
title: Layout No Fix
---

# SCR-LAYOUT-NO-FIX Layout No Fix

## Layout
`;
  const diagnostic = createDiagnostic(
    source,
    "## Layout",
    "Layout section must specify a viewport, for example ## Layout: mobile."
  );

  assert.deepEqual(createMarkVSpecCodeActions(createTextDocument(source) as never, [diagnostic]), []);
});

test("creates a quick fix to move direct layout child references under Items", () => {
  const source = `---
id: SCR-ITEM-FIX
type: screen
title: Item Fix
---

# SCR-ITEM-FIX Item Fix

## Layout: mobile

### L-Page Page

- stack
- E-Title
- gap: md

## Elements

### E-Title Heading

- value: Title
`;
  const document = createTextDocument(source) as never;
  const diagnostic = createDiagnostic(
    source,
    "- E-Title",
    "Layout L-Page uses a direct child reference; place E-Title under #### Items."
  );
  const actions = createMarkVSpecCodeActions(document, [diagnostic]);
  const edits = actions[0]?.edit as unknown as { edits: Array<{ kind: string; newText?: string; range?: vscode.Range; position?: { line: number; character: number }; uri?: unknown }> };

  assert.equal(actions.length, 1);
  assert.equal(actions[0]?.title, "Move E-Title under #### Items");
  assert.equal(edits.edits[0]?.kind, "delete");
  assert.deepEqual(edits.edits[0]?.range?.start, { line: 13, character: 0 });
  assert.deepEqual(edits.edits[0]?.range?.end, { line: 14, character: 0 });
  assert.equal(edits.edits[1]?.kind, "insert");
  assert.deepEqual(edits.edits[1]?.uri, (document as { uri: unknown }).uri);
  assert.equal(edits.edits[1]?.position?.line, 16);
  assert.equal(edits.edits[1]?.position?.character, 0);
  assert.equal(edits.edits[1]?.newText, "\n#### Items\n\n- E-Title\n");
});

test("moves direct layout child references before existing Items without merging lines", () => {
  const source = `---
id: SCR-ITEM-FIX-EXISTING
type: screen
title: Item Fix Existing
---

# SCR-ITEM-FIX-EXISTING Item Fix Existing

## Layout: mobile

### L-Page Page

- stack
- E-Moved

#### Items
- E-Existing

## Elements

### E-Moved Heading

- value: Moved

### E-Existing Heading

- value: Existing
`;
  const document = createTextDocument(source) as never;
  const diagnostic = createDiagnostic(
    source,
    "- E-Moved",
    "Layout L-Page uses a direct child reference; place E-Moved under #### Items."
  );
  const actions = createMarkVSpecCodeActions(document, [diagnostic]);
  const edits = actions[0]?.edit as unknown as { edits: Array<{ kind: string; newText?: string; range?: vscode.Range; position?: { line: number; character: number }; uri?: unknown }> };

  assert.equal(actions.length, 1);
  assert.equal(edits.edits[1]?.kind, "insert");
  assert.equal(edits.edits[1]?.position?.line, 16);
  assert.equal(edits.edits[1]?.position?.character, 0);
  assert.equal(edits.edits[1]?.newText, "- E-Moved\n");
});

test("removes direct layout child references at end of file", () => {
  const source = `---
id: SCR-ITEM-FIX-EOF
type: screen
title: Item Fix EOF
---

# SCR-ITEM-FIX-EOF Item Fix EOF

## Layout: mobile

### L-Page Page

- stack
- E-Title`;
  const document = createTextDocument(source) as never;
  const diagnostic = createDiagnostic(
    source,
    "- E-Title",
    "Layout L-Page uses a direct child reference; place E-Title under #### Items."
  );
  const actions = createMarkVSpecCodeActions(document, [diagnostic]);
  const edits = actions[0]?.edit as unknown as { edits: Array<{ kind: string; newText?: string; range?: vscode.Range; position?: { line: number; character: number } }> };

  assert.equal(actions.length, 1);
  assert.equal(edits.edits[0]?.kind, "delete");
  assert.deepEqual(edits.edits[0]?.range?.start, { line: 13, character: 0 });
  assert.deepEqual(edits.edits[0]?.range?.end, { line: 13, character: 9 });
  assert.equal(edits.edits[1]?.kind, "insert");
  assert.equal(edits.edits[1]?.position?.line, 14);
  assert.equal(edits.edits[1]?.position?.character, 0);
  assert.equal(edits.edits[1]?.newText, "\n#### Items\n\n- E-Title\n");
});

test("formats recognized MarkVSpec sections conservatively", () => {
  const spaces = "   ";
  const source = `---
id: SCR-FORMAT
type: screen
title: Format
---

# SCR-FORMAT Format

## States


- idle*${spaces}


## Layout: mobile
### L-Page Page${spaces}

- stack${spaces}

#### Items
- E-Title${spaces}

## Elements
### E-Title Heading${spaces}
- value: Title${spaces}

## Actions
### A-Submit Submit
- Triggered
  - E-Title.click
- From
  - idle${spaces}
`;

  assert.equal(formatMarkVSpecStructure(source), `---
id: SCR-FORMAT
type: screen
title: Format
---

# SCR-FORMAT Format

## States

- idle*

## Layout: mobile

### L-Page Page

- stack

#### Items

- E-Title

## Elements

### E-Title Heading

- value: Title

## Actions

### A-Submit Submit

- Triggered
  - E-Title.click

- From
  - idle
`);
});

test("preserves unknown sections while formatting recognized sections", () => {
  const spaces = "   ";
  const source = `---
id: SCR-FORMAT-UNKNOWN
type: screen
title: Format Unknown
---

# SCR-FORMAT-UNKNOWN Format Unknown

## States


- idle*${spaces}

## Draft Notes

This prose keeps trailing spaces.${spaces}


| A | B |
|---|---|
| 1 | 2 |

## Elements
### E-Title Heading${spaces}
- value: Title${spaces}
`;

  assert.equal(formatMarkVSpecStructure(source), `---
id: SCR-FORMAT-UNKNOWN
type: screen
title: Format Unknown
---

# SCR-FORMAT-UNKNOWN Format Unknown

## States

- idle*

## Draft Notes

This prose keeps trailing spaces.${spaces}


| A | B |
|---|---|
| 1 | 2 |

## Elements

### E-Title Heading

- value: Title
`);
});

test("declares MarkVSpec syntax highlighting contributions", () => {
  const packageJsonPath = resolve(extensionRoot, "package.json");
  const grammarPath = resolve(extensionRoot, "syntaxes/markvspec.tmLanguage.json");
  const languageConfigurationPath = resolve(extensionRoot, "language-configuration/markvspec.configuration.json");
  const snippetsPath = resolve(extensionRoot, "snippets/markvspec.code-snippets");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    capabilities?: {
      untrustedWorkspaces?: { supported?: string; description?: string };
    };
    contributes?: {
      commands?: Array<{ command?: string; title?: string; category?: string; icon?: string }>;
      grammars?: Array<{ language?: string; scopeName?: string; path?: string }>;
      languages?: Array<{ id?: string; configuration?: string; extensions?: string[] }>;
      menus?: Record<string, Array<{ command?: string; when?: string; group?: string }>>;
      snippets?: Array<{ language?: string; path?: string }>;
    };
  };
  const grammar = JSON.parse(readFileSync(grammarPath, "utf8")) as {
    scopeName?: string;
    repository?: Record<string, {
      patterns?: Array<{
        match?: string;
        name?: string;
      }>;
    }>;
  };
  const languageConfiguration = JSON.parse(readFileSync(languageConfigurationPath, "utf8")) as {
    wordPattern?: string;
  };
  const snippets = JSON.parse(readFileSync(snippetsPath, "utf8")) as Record<string, {
    body?: string[];
    description?: string;
    prefix?: string;
  }>;

  assert(existsSync(languageConfigurationPath));
  assert(existsSync(snippetsPath));
  assert.deepEqual(packageJson.contributes?.grammars?.[0], {
    language: "markvspec",
    scopeName: "source.markvspec",
    path: "./syntaxes/markvspec.tmLanguage.json"
  });
  assert.equal(packageJson.contributes?.languages?.[0]?.configuration, "./language-configuration/markvspec.configuration.json");
  assert(packageJson.contributes?.languages?.[0]?.extensions?.includes(".vspec.md"));
  assert(packageJson.contributes?.languages?.[0]?.extensions?.includes(".vspec.project.md"));
  assert.equal(packageJson.capabilities?.untrustedWorkspaces?.supported, "limited");
  assert.match(packageJson.capabilities?.untrustedWorkspaces?.description ?? "", /opening referenced local files from the webview is blocked/);
  assert((packageJson as { activationEvents?: string[] }).activationEvents?.includes("onLanguage:markvspec"));
  assert((packageJson as { activationEvents?: string[] }).activationEvents?.includes("onCommand:markvspec.openPreview"));
  assert((packageJson as { activationEvents?: string[] }).activationEvents?.includes("onCommand:markvspec.formatStructure"));
  assert((packageJson as { activationEvents?: string[] }).activationEvents?.includes("onCommand:markvspec.exportHtml"));
  assert((packageJson as { activationEvents?: string[] }).activationEvents?.includes("onCommand:markvspec.exportPdf"));
  assert((packageJson as { activationEvents?: string[] }).activationEvents?.includes("onCommand:markvspec.refreshPreview"));
  assert.deepEqual(packageJson.contributes?.commands?.[0], {
    command: "markvspec.openPreview",
    title: "Open Preview",
    category: "MarkVSpec",
    icon: "$(open-preview)"
  });
  assert.deepEqual(packageJson.contributes?.commands?.[1], {
    command: "markvspec.formatStructure",
    title: "Format Structure",
    category: "MarkVSpec",
    icon: "$(symbol-structure)"
  });
  assert.deepEqual(packageJson.contributes?.commands?.[2], {
    command: "markvspec.exportHtml",
    title: "Export Static HTML",
    category: "MarkVSpec",
    icon: "$(file-code)"
  });
  assert.deepEqual(packageJson.contributes?.commands?.[3], {
    command: "markvspec.exportPdf",
    title: "Export PDF",
    category: "MarkVSpec",
    icon: "$(file-pdf)"
  });
  assert.deepEqual(packageJson.contributes?.commands?.[4], {
    command: "markvspec.refreshPreview",
    title: "Refresh Preview",
    category: "MarkVSpec",
    icon: "$(refresh)"
  });
  assert.deepEqual(packageJson.contributes?.menus?.["editor/title"]?.[0], {
    command: "markvspec.openPreview",
    when: "resourceFilename =~ /(^|\\.)vspec(\\.project)?\\.md$/",
    group: "navigation"
  });
  assert.deepEqual(packageJson.contributes?.menus?.["editor/title"]?.[1], {
    command: "markvspec.exportHtml",
    when: "resourceFilename =~ /(^|\\.)vspec(\\.project)?\\.md$/",
    group: "navigation@2"
  });
  assert.deepEqual(packageJson.contributes?.menus?.["editor/title"]?.[2], {
    command: "markvspec.exportPdf",
    when: "resourceFilename =~ /(^|\\.)vspec(\\.project)?\\.md$/",
    group: "navigation@3"
  });
  assert.deepEqual(packageJson.contributes?.menus?.["explorer/context"]?.[0], {
    command: "markvspec.openPreview",
    when: "resourceFilename =~ /(^|\\.)vspec(\\.project)?\\.md$/",
    group: "navigation"
  });
  assert.deepEqual(packageJson.contributes?.menus?.["explorer/context"]?.[1], {
    command: "markvspec.exportHtml",
    when: "resourceFilename =~ /(^|\\.)vspec(\\.project)?\\.md$/",
    group: "navigation@2"
  });
  assert.deepEqual(packageJson.contributes?.menus?.["explorer/context"]?.[2], {
    command: "markvspec.exportPdf",
    when: "resourceFilename =~ /(^|\\.)vspec(\\.project)?\\.md$/",
    group: "navigation@3"
  });
  assert.deepEqual(packageJson.contributes?.snippets?.[0], {
    language: "markvspec",
    path: "./snippets/markvspec.code-snippets"
  });
  assert.equal(grammar.scopeName, "source.markvspec");
  assert(grammar.repository?.["front-matter"]);
  assert(grammar.repository?.["headings"]);
  assert(grammar.repository?.["action-groups"]);
  assert(grammar.repository?.["references"]);
  assert(grammar.repository?.["properties"]?.patterns?.some((pattern) => pattern.name === "meta.property.marker.markvspec"));
  assert(!grammar.repository?.["references"]?.patterns?.some((pattern) => pattern.name === "constant.other.marker.markvspec"));

  const grammarSource = readFileSync(grammarPath, "utf8");
  for (const token of ["SCR|TPL|PRT", "L|P|E|F|A|V|R", "L|P", "E-", "F-", "A-", "V-", "R-", "Slot", "Events", "Process", "View Context", "View Context Samples", "Preview Scenarios", "Form Groups", "Business Rules", "Error Codes", "History Fields", "History", "HttpRequest", "PartialRequest", "ServerCall", "Resolve", "params", "group", "stop|continue"]) {
    assert.match(grammarSource, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  const headingPatterns = grammar.repository?.["headings"]?.patterns ?? [];
  const sectionHeadingPatterns = headingPatterns
    .filter((pattern) => pattern.name === "markup.heading.section.markvspec")
    .map((pattern) => new RegExp(pattern.match ?? "$.", "u"));
  assert(sectionHeadingPatterns.some((pattern) => pattern.test("## Layout")));
  assert(sectionHeadingPatterns.some((pattern) => pattern.test("## Layout: mobile")));
  assert(sectionHeadingPatterns.some((pattern) => pattern.test("## Form Groups")));
  assert(sectionHeadingPatterns.some((pattern) => pattern.test("## View Context")));
  assert(sectionHeadingPatterns.some((pattern) => pattern.test("## Preview Scenarios")));
  assert(headingPatterns.some((pattern) => pattern.name === "markup.heading.object.markvspec" && new RegExp(pattern.match ?? "$.", "u").test("### P-Fields Fields")));
  assert(headingPatterns.some((pattern) => pattern.name === "markup.heading.object.markvspec" && new RegExp(pattern.match ?? "$.", "u").test("### F-LoginForm Login form")));
  assert(headingPatterns.some((pattern) => pattern.name === "markup.heading.object.markvspec" && new RegExp(pattern.match ?? "$.", "u").test("### V-LoginForm Login form validation")));
  assert(headingPatterns.some((pattern) => pattern.name === "markup.heading.object.markvspec" && new RegExp(pattern.match ?? "$.", "u").test("### loaded")));
  assert(headingPatterns.some((pattern) => pattern.name === "markup.heading.subsection.markvspec" && new RegExp(pattern.match ?? "$.", "u").test("#### \${model.noticeList.items}")));

  assert(languageConfiguration.wordPattern);
  assert(!languageConfiguration.wordPattern.includes("\\p"));
  const wordPattern = new RegExp(languageConfiguration.wordPattern);
  for (const token of ["SCR-DASHBOARD", "L-メッセージ表示", "E-メールアドレス入力", "A-SubmitLogin", "R-RequiredFields", "E-ページヘッダ"]) {
    assert.equal(wordPattern.exec(token)?.[0], token);
  }

  for (const snippetName of [
    "MarkVSpec Screen",
    "MarkVSpec States",
    "MarkVSpec Partial",
    "MarkVSpec Responsive Layouts",
    "MarkVSpec Layout Group",
    "MarkVSpec Input Element",
    "MarkVSpec Button Element",
    "MarkVSpec Select Element",
    "MarkVSpec Action"
  ]) {
    assert(snippets[snippetName]?.prefix);
    assert(snippets[snippetName]?.description);
    assert(snippets[snippetName]?.body?.length);
  }
  assert(snippets["MarkVSpec Screen"].body?.includes("## States"));
  assert(snippets["MarkVSpec Partial"].body?.includes("type: partial"));
  assert(snippets["MarkVSpec Partial"].body?.includes("- partial.render: ${11:A-BuildPartial}"));
  assert(snippets["MarkVSpec Screen"].body?.includes("## Layout: ${4:mobile}"));
  assert(snippets["MarkVSpec Responsive Layouts"].body?.includes("## Layout: desktop"));
  assert(snippets["MarkVSpec Layout Group"].body?.includes("#### Items"));
  assert(snippets["MarkVSpec Input Element"].body?.includes("### ${1:1}:${2:E-Input} Input"));
  assert(!snippets["MarkVSpec Input Element"].body?.includes("Input*"));
  assert(snippets["MarkVSpec Button Element"].body?.includes("- variant: ${4|primary,secondary,tertiary|}"));
  assert(snippets["MarkVSpec Button Element"].body?.includes("- tone: ${5|neutral,info,success,warning,danger|}"));
  assert(snippets["MarkVSpec Select Element"].body?.includes("- options:"));
  assert(snippets["MarkVSpec Select Element"].body?.includes("  - ${4:Active}"));
  assert(!snippets["MarkVSpec Action"].body?.includes("- Triggered"));
  assert(snippets["MarkVSpec Action"].body?.includes("- Process ${5:P1}: ${6:Submit request}"));
  assert(snippets["MarkVSpec Action"].body?.includes("  - case: ${11:sent}"));
  assert(!snippets["MarkVSpec Action"].body?.includes("- Effects"));
  assert(!snippets["MarkVSpec Action"].body?.includes("- Cases"));

  const expandedScreenSnippet = expandSnippetBody(snippets["MarkVSpec Screen"].body ?? []);
  assert.deepEqual(parseMarkVSpec(expandedScreenSnippet).diagnostics, []);

  const expandedPartialSnippet = expandSnippetBody(snippets["MarkVSpec Partial"].body ?? []);
  assert.deepEqual(parseMarkVSpec(expandedPartialSnippet).diagnostics, []);

  const expandedSelectSnippet = expandSnippetBody(snippets["MarkVSpec Select Element"].body ?? []);
  const selectSource = `---
id: SCR-SNIPPET
type: screen
title: Snippet
---

# SCR-SNIPPET Snippet

## States

- idle*

## Layout: mobile

### L1:L-Page Page

- stack

#### Items

- E-Select

## Elements

${expandedSelectSnippet}
`;
  const selectResult = parseMarkVSpec(selectSource);
  assert.deepEqual(selectResult.diagnostics, []);
  assert.deepEqual(selectResult.elements[0]?.selectOptions.map((option) => option.label), ["Active", "Inactive"]);
});
