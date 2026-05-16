import { existsSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  allResolvedLayoutGroups,
  isProjectReferenceAllowed,
  renderMarkVSpecHtml,
  renderMarkVSpecHtmlFragment,
  resolveProjectPath
} from "@markvspec/core";
import type {
  MarkVSpecParseResult,
  RendererMessages
} from "@markvspec/core";
import { escapeHtml } from "./design-document-renderer.js";
import {
  defaultDisplayState,
  modelValuesForState
} from "@markvspec/core";

export interface DocumentReferenceInfo {
  path?: string;
  displayPath?: string;
  title?: string;
  status?: string;
}

interface PartialPreviewLoadOptions {
  sourcePath: string;
  result: MarkVSpecParseResult;
  referenceInfo: Map<string, DocumentReferenceInfo> | undefined;
  workspaceRoot: string | undefined;
  parseFile: (path: string) => MarkVSpecParseResult | undefined;
  resolveRealPath: (path: string) => string | undefined;
}

type MarkVSpecDisplayEffect = NonNullable<MarkVSpecParseResult["actions"][number]["processSteps"][number]["outcomes"][number]["display"]>;

interface EmbedPartialPreviewOptions {
  result: MarkVSpecParseResult;
  html: string;
  viewport: string | undefined;
  screenState: string | undefined;
  displayEffects?: MarkVSpecDisplayEffect[];
  messagesForResult: (result: MarkVSpecParseResult) => RendererMessages;
  markerLink?: (id: string, category: "layout" | "element" | "action") => string | undefined;
}

interface PartialTarget {
  targetId: string;
  partialId: string;
  stateByScreenState: Map<string, string>;
  defaultState?: string;
  content?: string;
  elementId?: string;
  line?: number;
}

interface PartialTargetOptions {
  resolveViewportFallback?: boolean;
}

const partialPreviewsByResult = new WeakMap<MarkVSpecParseResult, Map<string, MarkVSpecParseResult>>();
const partialPreviewPathsByResult = new WeakMap<MarkVSpecParseResult, Map<string, string>>();
const PARTIAL_PREVIEW_MAX_DEPTH = 10;

export function registerPartialPreviews(
  result: MarkVSpecParseResult,
  partials: Map<string, MarkVSpecParseResult>,
  paths: Map<string, string>
): void {
  partialPreviewsByResult.set(result, partials);
  partialPreviewPathsByResult.set(result, paths);
}

export function partialPreviewsForResult(result: MarkVSpecParseResult): Map<string, MarkVSpecParseResult> | undefined {
  return partialPreviewsByResult.get(result);
}

export function partialPreviewPathsForResult(result: MarkVSpecParseResult): Map<string, string> | undefined {
  return partialPreviewPathsByResult.get(result);
}

export function propagatePartialPreviews(source: MarkVSpecParseResult, target: MarkVSpecParseResult): void {
  const partials = partialPreviewsForResult(source);
  const paths = partialPreviewPathsForResult(source);
  if (partials) {
    partialPreviewsByResult.set(target, partials);
  }
  if (paths) {
    partialPreviewPathsByResult.set(target, paths);
  }
}

export function enrichPartialReferenceInfo(
  references: Map<string, DocumentReferenceInfo>,
  partials: Map<string, MarkVSpecParseResult>
): void {
  for (const [partialId, partial] of partials) {
    updateDocumentReferenceInfo(references, partialId, {
      title: partial.screen.title,
      status: "loaded"
    });
  }
}

export function loadPartialPreviewsForScreen(
  options: PartialPreviewLoadOptions
): { partials: Map<string, MarkVSpecParseResult>; paths: Map<string, string> } {
  const partials = new Map<string, MarkVSpecParseResult>();
  const paths = new Map<string, string>();
  loadPartialPreviewDependencies(
    options.sourcePath,
    options.result,
    options.result,
    options.referenceInfo,
    partials,
    paths,
    options.workspaceRoot,
    options.parseFile,
    options.resolveRealPath,
    [],
    0
  );
  validatePartialPreviewStates(options.result, partials);
  for (const [partialId, partial] of partials) {
    validatePartialPreviewStates(partial, partials, options.result, partialId);
  }
  return { partials, paths };
}

export function embedPartialPreviews(options: EmbedPartialPreviewOptions): string {
  const partials = partialPreviewsByResult.get(options.result);
  const displayEffects = options.displayEffects ?? [];
  if ((!partials || partials.size === 0) && displayEffects.length === 0) {
    return options.html;
  }
  const paths = partialPreviewPathsByResult.get(options.result);
  return embedPartialPreviewsForResult(
    options.result,
    options.html,
    options.viewport,
    options.screenState,
    partials ?? new Map(),
    paths,
    options.messagesForResult,
    options.markerLink,
    displayEffects,
    [],
    0
  );
}

export function updateDocumentReferenceInfo(
  references: Map<string, DocumentReferenceInfo> | undefined,
  referenceId: string,
  patch: Partial<DocumentReferenceInfo>
): void {
  if (!references) {
    return;
  }
  const current = references.get(referenceId) ?? {};
  references.set(referenceId, { ...current, ...patch });
}

function loadPartialPreviewDependencies(
  sourcePath: string,
  result: MarkVSpecParseResult,
  diagnosticsTarget: MarkVSpecParseResult,
  referenceInfo: Map<string, DocumentReferenceInfo> | undefined,
  partials: Map<string, MarkVSpecParseResult>,
  paths: Map<string, string>,
  workspaceRoot: string | undefined,
  parseFile: (path: string) => MarkVSpecParseResult | undefined,
  resolveRealPath: (path: string) => string | undefined,
  stack: string[],
  depth: number
): void {
  const partialIds = partialIdsReferencedBy(result);
  for (const partialId of partialIds) {
    if (stack.includes(partialId)) {
      diagnosticsTarget.diagnostics.push({
        severity: "error",
        message: `Circular partial reference detected: ${[...stack, partialId].join(" -> ")}.`,
        line: 1
      });
      continue;
    }
    if (depth >= PARTIAL_PREVIEW_MAX_DEPTH) {
      diagnosticsTarget.diagnostics.push({
        severity: "error",
        message: `Partial nesting exceeds maximum depth ${PARTIAL_PREVIEW_MAX_DEPTH} at ${partialId}.`,
        line: 1
      });
      continue;
    }
    if (partials.has(partialId)) {
      continue;
    }
    const partial = loadPartialPreviewById(sourcePath, result, diagnosticsTarget, partialId, referenceInfo, workspaceRoot, parseFile, resolveRealPath);
    if (partial) {
      partials.set(partialId, partial.result);
      paths.set(partialId, partial.path);
      loadPartialPreviewDependencies(partial.path, partial.result, diagnosticsTarget, referenceInfo, partials, paths, workspaceRoot, parseFile, resolveRealPath, [...stack, partialId], depth + 1);
    }
  }
}

function partialIdsReferencedBy(result: MarkVSpecParseResult): Set<string> {
  const ids = new Set<string>();
  for (const group of allResolvedLayoutGroups(result)) {
    const partialId = group.partial?.id;
    if (partialId && isPartialId(partialId)) {
      ids.add(partialId);
    }
  }
  for (const action of result.actions) {
    for (const step of action.processSteps) {
      for (const detail of step.details) {
        if (detail.key === "partial" && isPartialId(detail.value)) {
          if (isSelfPartialRequest(result, step.name, detail.value)) {
            continue;
          }
          ids.add(detail.value);
        }
      }
      for (const outcome of step.outcomes) {
        if (outcome.content && isPartialId(outcome.content)) {
          ids.add(outcome.content);
        }
        for (const detail of outcome.display?.contentSource ?? []) {
          if (detail.key === "partial" && isPartialId(detail.value)) {
            ids.add(detail.value);
          }
        }
      }
    }
    for (const outcome of action.outcomes) {
      if (outcome.content && isPartialId(outcome.content)) {
        ids.add(outcome.content);
      }
      for (const detail of outcome.display?.contentSource ?? []) {
        if (detail.key === "partial" && isPartialId(detail.value)) {
          ids.add(detail.value);
        }
      }
    }
  }
  return ids;
}

function loadPartialPreviewById(
  screenPath: string,
  result: MarkVSpecParseResult,
  diagnosticsTarget: MarkVSpecParseResult,
  partialId: string,
  referenceInfo: Map<string, DocumentReferenceInfo> | undefined,
  workspaceRoot: string | undefined,
  parseFile: (path: string) => MarkVSpecParseResult | undefined,
  resolveRealPath: (path: string) => string | undefined
): { result: MarkVSpecParseResult; path: string } | undefined {
  const referencedPath = result.screen.references.partials[partialId];
  if (referencedPath) {
    const resolvedPath = resolveProjectPath(screenPath, referencedPath);
    updateDocumentReferenceInfo(referenceInfo, partialId, {
      path: resolvedPath,
      displayPath: referencedPath
    });
    if (!isProjectReferenceAllowed(resolvedPath, workspaceRoot, resolveRealPath)) {
      updateDocumentReferenceInfo(referenceInfo, partialId, { status: "outside workspace" });
      diagnosticsTarget.diagnostics.push({
        severity: "error",
        message: `Partial reference ${partialId} is outside the workspace: ${referencedPath}.`,
        line: 1
      });
      return undefined;
    }

    const partial = parseFile(resolvedPath);
    if (!partial) {
      updateDocumentReferenceInfo(referenceInfo, partialId, { status: "missing" });
      diagnosticsTarget.diagnostics.push({
        severity: "error",
        message: `Partial reference ${partialId} file not found: ${referencedPath}.`,
        line: 1
      });
      return undefined;
    }

    if (partial.screen.id !== partialId) {
      updateDocumentReferenceInfo(referenceInfo, partialId, {
        title: partial.screen.title,
        status: "id mismatch"
      });
      diagnosticsTarget.diagnostics.push({
        severity: "error",
        message: `Partial reference ${partialId} points to file with partial ID ${partial.screen.id ?? "missing"}.`,
        line: 1
      });
      return undefined;
    }
    if (partial.screen.type !== "partial") {
      updateDocumentReferenceInfo(referenceInfo, partialId, {
        title: partial.screen.title,
        status: "wrong type"
      });
      diagnosticsTarget.diagnostics.push({
        severity: "error",
        message: `Partial reference ${partialId} points to a non-partial document.`,
        line: 1
      });
      return undefined;
    }
    return { result: partial, path: resolvedPath };
  }

  const candidates = [
    resolveProjectPath(screenPath, `../partials/${partialId.toLowerCase().replace(/^prt-/u, "").replaceAll("-", "-")}.vspec.md`),
    ...partialFileCandidates(resolveProjectPath(screenPath, "../partials")),
    ...partialFileCandidates(resolveProjectPath(screenPath, "partials"))
  ];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate) || !isProjectReferenceAllowed(candidate, workspaceRoot, resolveRealPath) || !existsSync(candidate)) {
      continue;
    }
    seen.add(candidate);
    const partial = parseFile(candidate);
    if (!partial) {
      continue;
    }
    if (partial.screen.id === partialId && partial.screen.type === "partial") {
      return { result: partial, path: candidate };
    }
  }
  return undefined;
}

function partialFileCandidates(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }
  try {
    return readdirSync(directory)
      .filter((name) => name.endsWith(".vspec.md"))
      .map((name) => `${directory.replace(/\/$/u, "")}/${name}`);
  } catch {
    return [];
  }
}

function isPartialId(value: string): boolean {
  return /^PRT-[\p{L}\p{N}-]+$/u.test(value);
}

function isSelfPartialRequest(result: MarkVSpecParseResult, stepName: string, partialId: string): boolean {
  return result.screen.type === "partial" && result.screen.id === partialId && isPartialRequestStep(stepName);
}

function isPartialRequestStep(name: string): boolean {
  const normalized = name.trim().replace(/\s+/g, " ").toLowerCase();
  return normalized === "partial request" || normalized === "partialrequest";
}

function embedPartialPreviewsForResult(
  result: MarkVSpecParseResult,
  html: string,
  viewport: string | undefined,
  screenState: string | undefined,
  partials: Map<string, MarkVSpecParseResult>,
  paths: Map<string, string> | undefined,
  messagesForResult: (result: MarkVSpecParseResult) => RendererMessages,
  markerLink: ((id: string, category: "layout" | "element" | "action") => string | undefined) | undefined,
  displayEffects: MarkVSpecDisplayEffect[],
  stack: string[],
  depth: number
): string {
  let output = html;
  const modalDisplays = displayEffects.filter((display) => !display.target && display.element && elementType(result, display.element) === "Dialog");
  for (const target of [
    ...partialTargets(result, viewport, { resolveViewportFallback: true }),
    ...partialTargetsFromDisplayEffects(displayEffects)
  ]) {
    const { targetId, partialId } = target;
    if (target.elementId) {
      const renderKey = target.elementId.startsWith("L-")
        ? `layout:${viewport ?? ""}:${target.elementId}`
        : `element:${target.elementId}`;
      const fragment = renderMarkVSpecHtmlFragment(result, renderKey, {
        includeConditionalContent: false,
        viewport,
        state: screenState,
        messages: messagesForResult(result),
        markerVisibility: { layout: true, element: true, action: true },
        markerLink,
        includeStyles: false
      });
      if (fragment) {
        output = replaceTargetContents(output, targetId, fragment.html, undefined, undefined);
      }
      continue;
    }
    if (target.content && !partialId) {
      output = replaceTargetContents(output, targetId, `<div class="mm-display-override">${escapeHtml(target.content)}</div>`, undefined, undefined);
      continue;
    }
    if (!partialId) {
      continue;
    }
    if (stack.includes(partialId)) {
      output = replaceTargetContents(output, targetId, renderPartialPreviewPlaceholder(`Circular partial reference: ${[...stack, partialId].join(" -> ")}`), partialId, paths?.get(partialId));
      continue;
    }
    if (depth >= PARTIAL_PREVIEW_MAX_DEPTH) {
      output = replaceTargetContents(output, targetId, renderPartialPreviewPlaceholder(`Partial nesting exceeds maximum depth ${PARTIAL_PREVIEW_MAX_DEPTH}: ${partialId}`), partialId, paths?.get(partialId));
      continue;
    }
    const partial = partials.get(partialId);
    if (!partial) {
      output = replaceTargetContents(output, targetId, renderPartialPreviewPlaceholder(`Missing partial: ${partialId}`), partialId, paths?.get(partialId));
      continue;
    }
    const partialState = partialStateForTarget(target, partial, screenState);
    const partialHtml = embedPartialPreviewsForResult(partial, renderMarkVSpecHtml(partial, {
      includeConditionalContent: false,
      viewport,
      state: partialState,
      modelValues: modelValuesForState(partial, partialState),
      messages: messagesForResult(partial),
      markerVisibility: { layout: false, element: false, action: false },
      markerLink,
      includeStyles: false
    }), viewport, partialState, partials, paths, messagesForResult, markerLink, [], [...stack, partialId], depth + 1);
    output = replaceTargetContents(output, targetId, namespacePartialPreviewRenderKeys(partialHtml, targetId, partialId), partialId, paths?.get(partialId));
  }
  for (const display of modalDisplays) {
    const elementId = display.element;
    if (!elementId) {
      continue;
    }
    const renderKey = `element:${elementId}`;
    const fragment = renderMarkVSpecHtmlFragment(result, renderKey, {
      includeConditionalContent: false,
      viewport,
      state: screenState,
      messages: messagesForResult(result),
      markerVisibility: { layout: true, element: true, action: true },
      markerLink,
      includeStyles: false
    });
    if (fragment) {
      output = appendModalOverlay(output, fragment.html, elementId);
    }
  }
  return output;
}

function appendModalOverlay(html: string, dialogHtml: string, dialogId: string): string {
  const overlay = `<div class="mm-modal-overlay" data-mm-display-modal="${escapeHtml(dialogId)}"><div class="mm-modal-content">${dialogHtml}</div></div>`;
  return html.replace(/<\/div>\s*$/u, `${overlay}</div>`);
}

function elementType(result: MarkVSpecParseResult, elementId: string): string | undefined {
  return result.elements.find((element) => element.id === elementId)?.type;
}

function renderPartialPreviewPlaceholder(message: string): string {
  return `<div class="mm-layout-placeholder">${escapeHtml(message)}</div>`;
}

function namespacePartialPreviewRenderKeys(html: string, targetId: string, partialId: string): string {
  const prefix = `partial-content:${targetId}:${partialId}:`;
  return html
    .replace(/data-mm-render-key="([^"]+)"/gu, (_match, renderKey: string) => `data-mm-render-key="${escapeHtml(prefix)}${renderKey}"`)
    .replace(/<!--mm-render-key:([^>]+)-->/gu, (_match, renderKey: string) => `<!--mm-render-key:${prefix}${renderKey}-->`);
}

function partialTargets(result: MarkVSpecParseResult, viewport?: string, options: PartialTargetOptions = {}): PartialTarget[] {
  const targets: PartialTarget[] = [];
  const seen = new Set<string>();
  for (const group of layoutGroupsForPartialTargets(result, viewport, options)) {
    if (!options.resolveViewportFallback && viewport && group.viewport && group.viewport !== viewport) {
      continue;
    }
    const partialId = group.partial?.id;
    if (!partialId || !isPartialId(partialId)) {
      continue;
    }
    const target = partialTargetFromLayout(group);
    const key = `${target.targetId}:${target.partialId}`;
    if (!seen.has(key)) {
      seen.add(key);
      targets.push(target);
    }
  }
  for (const action of result.actions) {
    for (const step of action.processSteps) {
      for (const outcome of step.outcomes) {
        if (outcome.target && outcome.content && isPartialId(outcome.content)) {
          const key = `${outcome.target}:${outcome.content}`;
          if (!seen.has(key)) {
            seen.add(key);
            targets.push({
              targetId: outcome.target,
              partialId: outcome.content,
              stateByScreenState: new Map(),
              line: firstPropertyLine(outcome, "content") ?? outcome.location?.line
            });
          }
        }
      }
    }
    for (const outcome of action.outcomes) {
      if (outcome.target && outcome.content && isPartialId(outcome.content)) {
        const key = `${outcome.target}:${outcome.content}`;
        if (!seen.has(key)) {
          seen.add(key);
          targets.push({
            targetId: outcome.target,
            partialId: outcome.content,
            stateByScreenState: new Map(),
            line: firstPropertyLine(outcome, "content") ?? outcome.location?.line
          });
        }
      }
    }
  }
  return targets;
}

function partialTargetsFromDisplayEffects(displayEffects: MarkVSpecDisplayEffect[]): PartialTarget[] {
  return displayEffects
    .filter((display): display is MarkVSpecDisplayEffect & { target: string } => Boolean(display.target))
    .map((display) => {
      const partialId = display.contentSource.find((detail) => detail.key === "partial")?.value;
      const partialState = display.contentSource.find((detail) => detail.key === "state")?.value;
      return {
        targetId: display.target,
        partialId: partialId && isPartialId(partialId) ? partialId : "",
        stateByScreenState: new Map(),
        defaultState: partialState,
        content: partialId ? undefined : display.content,
        elementId: display.element,
        line: firstPropertyLine(display, "target") ?? display.location.line
      };
    });
}

function layoutGroupsForPartialTargets(
  result: MarkVSpecParseResult,
  viewport: string | undefined,
  options: PartialTargetOptions
): MarkVSpecParseResult["layoutGroups"] {
  const groups = allResolvedLayoutGroups(result);
  if (!options.resolveViewportFallback) {
    return groups;
  }

  const activeViewport = resolvePreviewViewport(result, viewport);
  return activeViewport === undefined
    ? groups
    : groups.filter((group) => group.viewport === activeViewport || !group.viewport);
}

function resolvePreviewViewport(result: MarkVSpecParseResult, requestedViewport: string | undefined): string | undefined {
  const viewports = [...new Set(result.layoutGroups.map((group) => group.viewport))];
  if (requestedViewport && viewports.includes(requestedViewport)) {
    return requestedViewport;
  }
  if (result.screen.viewport && viewports.includes(result.screen.viewport)) {
    return result.screen.viewport;
  }
  return viewports[0];
}

function partialTargetFromLayout(group: MarkVSpecParseResult["layoutGroups"][number]): PartialTarget {
  const stateByScreenState = new Map(Object.entries(group.partial?.states ?? {}));

  return {
    targetId: group.id,
    partialId: group.partial?.id ?? "",
    stateByScreenState,
    line: firstPropertyLine(group, "partial states") ?? firstPropertyLine(group, "partial") ?? group.location.line
  };
}

function validatePartialPreviewStates(
  result: MarkVSpecParseResult,
  partials: Map<string, MarkVSpecParseResult>,
  diagnosticsTarget: MarkVSpecParseResult = result,
  contextPartialId?: string
): void {
  for (const target of partialTargets(result)) {
    const partial = partials.get(target.partialId);
    if (!partial) {
      continue;
    }
    const partialStateNames = new Set(partial.states.map((state) => state.name));
    const states = [
      target.defaultState,
      ...target.stateByScreenState.values()
    ].filter((state): state is string => Boolean(state));
    for (const state of states) {
      if (!partialStateNames.has(state)) {
        diagnosticsTarget.diagnostics.push({
          severity: "warning",
          message: `${contextPartialId ? `Partial ${contextPartialId} ` : ""}Layout ${target.targetId} references missing partial state ${state} in ${target.partialId}.`,
          line: target.line
        });
      }
    }
  }
}

function partialStateForTarget(
  target: PartialTarget,
  partial: MarkVSpecParseResult,
  screenState: string | undefined
): string | undefined {
  const stateNames = new Set(partial.states.map((state) => state.name));
  if (screenState) {
    const mapped = target.stateByScreenState.get(screenState);
    if (mapped && stateNames.has(mapped)) {
      return mapped;
    }
  }
  const mappedDefault = target.defaultState && stateNames.has(target.defaultState)
    ? target.defaultState
    : undefined;
  return mappedDefault
    ?? defaultDisplayState(partial)?.name
    ?? partial.states.find((state) => state.initial)?.name
    ?? partial.states[0]?.name;
}

function firstPropertyLine(
  owner: { propertyLocations: Record<string, Array<{ line: number }>> },
  key: string
): number | undefined {
  return owner.propertyLocations[key]?.[0]?.line;
}

function replaceTargetContents(html: string, targetId: string, content: string, partialId: string | undefined, partialPath: string | undefined): string {
  if (targetId.startsWith("E-")) {
    return replaceElementContents(html, targetId, content, partialId, partialPath);
  }
  return replaceLayoutContents(html, targetId, content, partialId, partialPath);
}

function replaceLayoutContents(html: string, layoutId: string, content: string, partialId: string | undefined, partialPath: string | undefined): string {
  const marker = `data-mm-id="${escapeHtml(layoutId)}"`;
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) {
    return html;
  }
  const openStart = html.lastIndexOf("<section", markerIndex);
  if (openStart === -1) {
    return html;
  }
  const openEnd = html.indexOf(">", markerIndex);
  if (openEnd === -1) {
    return html;
  }
  const closeStart = findMatchingSectionClose(html, openStart);
  if (closeStart === -1) {
    return html;
  }
  const layoutMarker = extractLeadingLayoutMarker(html.slice(openEnd + 1, closeStart));
  const embedded = partialId
    ? `<div class="mm-partial-preview" data-mm-partial-preview="true" data-mm-partial-id="${escapeHtml(partialId)}">${renderPartialPreviewBadge(partialId, partialPath)}${content}</div>`
    : `<div class="mm-partial-preview mm-display-preview" data-mm-display-preview="true">${content}</div>`;
  return `${html.slice(0, openEnd + 1)}${layoutMarker}${embedded}${html.slice(closeStart)}`;
}

function replaceElementContents(html: string, elementId: string, content: string, partialId: string | undefined, partialPath: string | undefined): string {
  const marker = `data-mm-id="${escapeHtml(elementId)}"`;
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) {
    return html;
  }
  const wrapperStart = html.lastIndexOf('<div class="mm-element-wrap', markerIndex);
  if (wrapperStart === -1) {
    return html;
  }
  const wrapperOpenEnd = html.indexOf(">", wrapperStart);
  if (wrapperOpenEnd === -1 || wrapperOpenEnd > markerIndex) {
    return html;
  }
  const wrapperCloseStart = findMatchingTagClose(html, wrapperStart, "div");
  if (wrapperCloseStart === -1 || wrapperCloseStart < markerIndex) {
    return html;
  }
  const wrapperCloseEnd = html.indexOf(">", wrapperCloseStart);
  if (wrapperCloseEnd === -1) {
    return html;
  }
  const renderKeyStart = html.lastIndexOf(`<!--mm-render-key:element:${escapeHtml(elementId)}-->`, wrapperStart);
  const replaceStart = renderKeyStart !== -1 && html.slice(renderKeyStart, wrapperStart).trim() === ""
    ? renderKeyStart
    : wrapperStart;
  const targetMarker = `<span class="mm-display-target-marker" data-mm-id="${escapeHtml(elementId)}"></span>`;
  const embedded = partialId
    ? `<div class="mm-element-wrap mm-partial-preview" data-mm-partial-preview="true" data-mm-partial-id="${escapeHtml(partialId)}">${targetMarker}${renderPartialPreviewBadge(partialId, partialPath)}${content}</div>`
    : `<div class="mm-element-wrap mm-partial-preview mm-display-preview" data-mm-display-preview="true">${targetMarker}${content}</div>`;
  return `${html.slice(0, replaceStart)}${embedded}${html.slice(wrapperCloseEnd + 1)}`;
}

function renderPartialPreviewBadge(partialId: string, partialPath: string | undefined): string {
  const badge = `<span class="mm-partial-preview-badge">partial: ${escapeHtml(partialId)}</span>`;
  if (!partialPath) {
    return badge;
  }

  return `<a href="${escapeHtml(referenceHref(partialPath))}" class="mm-reference-link mm-partial-preview-link" data-mm-open-reference="${escapeHtml(partialId)}" data-mm-reference-path="${escapeHtml(partialPath)}" title="Open ${escapeHtml(partialId)}: ${escapeHtml(partialPath)}">${badge}</a>`;
}

function referenceHref(path: string): string {
  return pathToFileURL(path).href;
}

function extractLeadingLayoutMarker(content: string): string {
  const match = content.match(/^(\s*(?:<a class="mm-marker-link" href="[^"]*">)?<code class="mm-id mm-marker mm-marker-layout" data-mm-marker-category="layout">[\s\S]*?<\/code>(?:<\/a>)?)/u);
  return match?.[1] ?? "";
}

function findMatchingSectionClose(html: string, sectionStart: number): number {
  return findMatchingTagClose(html, sectionStart, "section");
}

function findMatchingTagClose(html: string, tagStart: number, tagName: string): number {
  const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const tagPattern = new RegExp(`</?${escapedTagName}\\b[^>]*>`, "gu");
  tagPattern.lastIndex = tagStart;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(html)) !== null) {
    if (match[0].startsWith("</")) {
      depth -= 1;
      if (depth === 0) {
        return match.index;
      }
      continue;
    }
    if (!match[0].endsWith("/>")) {
      depth += 1;
    }
  }
  return -1;
}
