import { validateMarkVSpec } from "./validator.js";
import { parseMarkVSpecProject } from "./project-parser.js";
import { loadMarkVSpecProject, resolveProjectPath } from "./project-loader.js";
import { firstHeading, parseMarkdownDocument, topLevelProseLines } from "./markdown-document.js";
import { parseActionSectionSemantics, parseElementSectionSemantics, parseLayoutSectionSemantics, parseSmallSectionSemantics } from "./markdown-section-semantic.js";
import { renderMarkVSpecHtml, renderMarkVSpecHtmlFragments } from "./renderer.js";
import { computeMarkVSpecRenderInvalidation } from "./render-invalidation.js";
import { AI_INPUT_SUPPORTED_DOCUMENT_KINDS, diagnoseAiDesignInputDocument } from "./ai-input-diagnostics.js";
import { messagesForLocale, resolveLocale, resolveRendererMessages, supportedRendererMessageKeys } from "./renderer-messages.js";
import { createMarkVSpecDiagnostic } from "./diagnostic-messages.js";
import type {
  MarkVSpecDiagnostic,
  MarkVSpecDocumentReferences,
  MarkVSpecElement,
  MarkVSpecParseResult,
  MarkVSpecRenderOptions,
  MarkVSpecScreenSummary
} from "./types.js";

export { actionAppliesToState } from "./action-applicability.js";
export type { ActionApplicabilityOptions, UnscopedActionApplicability } from "./action-applicability.js";
export type {
  MarkVSpecAction,
  MarkVSpecActionOutcome,
  MarkVSpecDiagnostic,
  MarkVSpecDiagnosticSeverity,
  MarkVSpecValidationGateOptions,
  MarkVSpecValidationGateResult,
  MarkVSpecDocumentReferences,
  MarkVSpecElement,
  MarkVSpecErrorCode,
  MarkVSpecFormGroup,
  MarkVSpecHistoryEntry,
  MarkVSpecHistoryFieldSchema,
  MarkVSpecHistoryFieldType,
  MarkVSpecInputRule,
  MarkVSpecLoadedProjectScreen,
  MarkVSpecLayoutGroup,
  MarkVSpecLayoutItem,
  MarkVSpecModelSampleGroup,
  MarkVSpecModelSampleRow,
  MarkVSpecModelSampleSet,
  MarkVSpecNoteSection,
  MarkVSpecParseResult,
  MarkVSpecProjectLoadResult,
  MarkVSpecProcessStep,
  MarkVSpecProjectParseResult,
  MarkVSpecProjectScreen,
  MarkVSpecProjectSummary,
  MarkVSpecProjectTransitionEdge,
  MarkVSpecProjectTransitionGraph,
  MarkVSpecProjectTransitionNode,
  MarkVSpecRenderOptions,
  MarkVSpecResponse,
  MarkVSpecRouteParam,
  MarkVSpecRule,
  MarkVSpecSampleRow,
  MarkVSpecSampleRows,
  MarkVSpecScreenSummary,
  MarkVSpecSectionProse,
  MarkVSpecSlotContent,
  MarkVSpecSlotDefinition,
  MarkVSpecState,
  MarkVSpecTableCell,
  MarkVSpecTableColumn,
  MarkVSpecTableRow,
  MarkVSpecTransition,
  MarkVSpecValidationRule,
  MarkVSpecViewContextDefinition,
  MarkVSpecViewContextSample,
  MarkVSpecPreviewScenario,
  MarkVSpecPreviewScenarioSample,
  SourceLocation
} from "./types.js";
export type {
  AiInputDiagnosticAxis,
  AiInputDiagnosticFinding,
  AiInputDiagnosticQuestion,
  AiInputDiagnosticReport,
  AiInputDiagnosticSeverity,
  AiInputDocumentKind,
  AiInputReadinessLevel
} from "./ai-input-diagnostics.js";
export type {
  MarkVSpecLocale,
  MessageKey,
  RendererMessageDiagnostic,
  RendererMessageKey,
  RendererMessages,
  ResolvedRendererMessages,
  ResolveRendererMessagesOptions
} from "./renderer-messages.js";

export { validateMarkVSpec } from "./validator.js";
export { evaluateMarkVSpecDiagnostics } from "./validation-gate.js";
export { AI_INPUT_SUPPORTED_DOCUMENT_KINDS, diagnoseAiDesignInputDocument };
export { messagesForLocale, resolveLocale, resolveRendererMessages, supportedRendererMessageKeys };
export { createMarkVSpecDiagnostic, renderDiagnosticMessageForLocale, supportedDiagnosticMessageCodes } from "./diagnostic-messages.js";
export { effectiveHistoryFields, latestHistoryBasicInfo, standardHistoryFields } from "./history.js";
export { isMarkVSpecSourceType, markVSpecSourceTypes, sourceTypeForElement } from "./source-types.js";
export { tableColumnSampleKeys } from "./table-columns.js";
export { renderMarkVSpecHtml };
export { renderMarkVSpecHtmlFragment, renderMarkVSpecHtmlFragments } from "./renderer.js";
export { computeMarkVSpecRenderInvalidation };
export { parseMarkVSpecProject } from "./project-parser.js";
export { affectedProjectScreenPathsForDocumentChange, composeMarkVSpecTemplate, isProjectReferenceAllowed, loadMarkVSpecProject, resolveProjectPath } from "./project-loader.js";
export { buildProjectTransitionGraph, renderProjectTransitionMermaid } from "./project-graph.js";
export { allResolvedLayoutGroups, preferredLayoutGroupForViewport, resolveLayoutGroupsForViewport } from "./layout-resolution.js";
export type { MarkVSpecLayoutResolutionOptions } from "./layout-resolution.js";
export {
  stateViewLayoutSignature,
  STATE_VIEW_AFFECTING_LAYOUT_PROPERTY_KEYS
} from "./state-view-signatures.js";
export {
  buildStateScreenReadModels,
  buildViewportStateScreenReadModels,
  defaultDisplayState,
  modelValuesForState,
  stateScreenActionsForModel,
  stateScreenElementGroups,
  stateScreenElementsForModel,
  stateScreenLayoutsForModel,
  stateScreenUnplacedLayoutIdsForModel,
  systemEventActionsForState
} from "./state-views-read-model.js";
export {
  displayMessageExplanationKind,
  displayMessageMarker,
  displayMessageTextSummary,
  isInvalidFieldErrorElement,
  isTargetlessOverlayDisplay,
  parseDisplayMessageReference,
  parseFieldErrorTarget,
  resolveDisplayMessageReference,
  resolveDisplayTarget
} from "./display-effect.js";
export {
  findMarkdownEntityReferences,
  findMarkdownEntityReferencesInLines,
  resolveMarkVSpecEntityReference
} from "./entity-reference.js";
export type {
  DisplayContentSpecRow
} from "./display-content-spec.js";
export type {
  DisplayMessageReference,
  DisplayMessageSourceKind,
  DisplayTargetKind,
  DisplayTargetResolution,
  ResolvedDisplayMessageReference
} from "./display-effect.js";
export type {
  MarkVSpecEntityReference,
  MarkVSpecEntityReferenceKind
} from "./entity-reference.js";
export type {
  FocusScope,
  RenderedIds,
  StateScreenReadModel,
  StateScreenReadModelOptions,
  StateScreenRepeatedContent,
  StateViewportReadModel
} from "./state-views-read-model.js";
export {
  buildMarkVSpecDocumentComposition,
  documentCompositionItemIds,
  resolveDocumentCompositionLayoutsForViewport
} from "./document-composition.js";
export type {
  BuildMarkVSpecDocumentCompositionOptions,
  MarkVSpecDocumentComposition,
  MarkVSpecDocumentCompositionItem,
  MarkVSpecDocumentCompositionItemIds,
  MarkVSpecDocumentCompositionItemKind,
  MarkVSpecDocumentCompositionLayoutOptions,
  MarkVSpecDocumentCompositionOrigin,
  MarkVSpecDocumentCompositionOriginKind
} from "./document-composition.js";

export function parseMarkVSpec(source: string): MarkVSpecParseResult {
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const screen = parseScreen(document.lines, document.bodyStartIndex, document.frontMatter, document.frontMatterData, document.references, firstHeading(document, 1), diagnostics);
  const topLevelDescription = topLevelProseLines(document).join("\n").trim();
  if (topLevelDescription) {
    screen.description = topLevelDescription;
  }

  const result: MarkVSpecParseResult = {
    screen,
    states: [],
    layoutGroups: [],
    slotDefinitions: [],
    slotContents: [],
    elements: [],
    formGroups: [],
    events: [],
    actions: [],
    validations: [],
    rules: [],
    errorCodes: [],
    historyFields: [],
    historyEntries: [],
    modelSampleGroups: [],
    modelSamples: [],
    viewContexts: [],
    viewContextSamples: [],
    previewScenarios: [],
    sectionProse: [],
    notes: [],
    diagnostics
  };

  applyLayoutSectionSemantics(result, parseLayoutSectionSemantics(document));
  applyElementSectionSemantics(result, parseElementSectionSemantics(document));
  applyActionSectionSemantics(result, parseActionSectionSemantics(document));
  applySmallSectionSemantics(result, parseSmallSectionSemantics(document));
  applyCanonicalActionTriggers(result);
  validateMarkVSpec(result);
  return result;
}

export function renderMarkVSpecHtmlWithInvalidation(
  previousSource: string,
  currentSource: string,
  options: MarkVSpecRenderOptions = {}
): { html: string; invalidation: ReturnType<typeof computeMarkVSpecRenderInvalidation>; fragments: ReturnType<typeof renderMarkVSpecHtmlFragments> } {
  const result = parseMarkVSpec(currentSource);
  const invalidation = computeMarkVSpecRenderInvalidation(previousSource, currentSource);
  return {
    html: renderMarkVSpecHtml(result, options),
    invalidation,
    fragments: invalidation.requiresFullRender ? [] : renderMarkVSpecHtmlFragments(result, invalidation.wireframeRenderKeys, options)
  };
}

function applyActionSectionSemantics(
  result: MarkVSpecParseResult,
  semantics: ReturnType<typeof parseActionSectionSemantics>
): void {
  result.actions = semantics.actions;
  result.sectionProse.push(...semantics.sectionProse);
  mergeDiagnostics(result.diagnostics, semantics.diagnostics);
}

function applyElementSectionSemantics(
  result: MarkVSpecParseResult,
  semantics: ReturnType<typeof parseElementSectionSemantics>
): void {
  result.elements = semantics.elements;
  result.sectionProse.push(...semantics.sectionProse);
  mergeDiagnostics(result.diagnostics, semantics.diagnostics);
}

function applyLayoutSectionSemantics(
  result: MarkVSpecParseResult,
  semantics: ReturnType<typeof parseLayoutSectionSemantics>
): void {
  result.layoutGroups = semantics.layoutGroups;
  result.slotContents = semantics.slotContents;
  result.slotDefinitions = semantics.slotDefinitions;
  result.sectionProse.push(...semantics.sectionProse);
  mergeDiagnostics(result.diagnostics, semantics.diagnostics);
}

function applySmallSectionSemantics(
  result: MarkVSpecParseResult,
  semantics: ReturnType<typeof parseSmallSectionSemantics>
): void {
  result.states = semantics.states;
  result.modelSamples = semantics.modelSamples;
  result.viewContexts = semantics.viewContexts;
  result.viewContextSamples = semantics.viewContextSamples;
  result.previewScenarios = semantics.previewScenarios;
  result.formGroups = semantics.formGroups;
  result.events = semantics.events;
  result.validations = semantics.validations;
  result.rules = semantics.rules;
  result.errorCodes = semantics.errorCodes;
  result.historyFields = semantics.historyFields;
  result.historyEntries = semantics.historyEntries;
  result.modelSampleGroups = semantics.modelSampleGroups;
  result.sectionProse.push(...semantics.sectionProse);
  result.notes = semantics.notes;
  mergeDiagnostics(result.diagnostics, semantics.diagnostics);
}

function applyCanonicalActionTriggers(result: MarkVSpecParseResult): void {
  const actionsById = new Map(result.actions.map((action) => [action.id, action]));

  for (const element of result.elements) {
    const actionId = element.properties["action"];
    if (typeof actionId !== "string") {
      continue;
    }
    const action = actionsById.get(actionId);
    if (!action || action.triggeredBy) {
      continue;
    }
    const actionEvent = elementActionEvent(element);
    action.triggeredBy = `${element.id}.${actionEvent}`;
    action.triggeredByLocation = element.propertyLocations["action"]?.[0] ?? element.location;
    action.trigger = {
      elementId: element.id,
      event: actionEvent
    };
  }

  for (const event of result.events) {
    const action = actionsById.get(event.actionId);
    if (!action || action.triggeredBy || !["page.load", "partial.render"].includes(event.event)) {
      continue;
    }
    action.triggeredBy = event.event;
    action.triggeredByLocation = event.location;
  }

  for (const action of result.actions) {
    if (action.triggeredBy) {
      continue;
    }
    const receivedResponse = action.processSteps
      .flatMap((step) => step.receives)
      .find((receive) => /^A-[\p{L}\p{N}-]+\.P[A-Za-z0-9_-]+\.response$/u.test(receive.value));
    if (!receivedResponse) {
      continue;
    }
    action.triggeredBy = receivedResponse.value;
    action.triggeredByLocation = receivedResponse.location;
  }
}

function elementActionEvent(element: MarkVSpecElement): string {
  const explicitEvent = element.properties["action event"];
  if (typeof explicitEvent === "string" && explicitEvent.trim().length > 0) {
    return explicitEvent.trim();
  }
  if (element.type === "custom:Form") {
    return "submit";
  }
  return "click";
}

function mergeDiagnostics(target: MarkVSpecDiagnostic[], diagnostics: MarkVSpecDiagnostic[]): void {
  const seen = new Set(target.map((diagnostic) => diagnosticKey(diagnostic)));
  for (const diagnostic of diagnostics) {
    const key = diagnosticKey(diagnostic);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    target.push(diagnostic);
  }
}

function diagnosticKey(diagnostic: MarkVSpecDiagnostic): string {
  return `${diagnostic.severity}:${diagnostic.line ?? ""}:${diagnostic.message}`;
}

function parseScreen(
  lines: string[],
  bodyStartIndex: number,
  frontMatter: Record<string, string>,
  frontMatterData: Record<string, unknown>,
  references: MarkVSpecDocumentReferences,
  heading: { text: string; line: number } | undefined,
  diagnostics: MarkVSpecDiagnostic[]
): MarkVSpecScreenSummary {
  const template = parseTemplateFrontMatter(frontMatterData["template"], diagnostics);
  const screen: MarkVSpecScreenSummary = {
    id: frontMatter["id"],
    type: frontMatter["type"] === "template" || frontMatter["type"] === "partial" ? frontMatter["type"] : "screen",
    title: frontMatter["title"],
    description: frontMatter["description"],
    route: frontMatter["route"],
    template: template?.id,
    templateSrc: template?.src,
    locale: frontMatter["locale"],
    defaultState: frontMatter["default-state"] ?? frontMatter["default state"],
    frontMatter,
    references
  };

  if (heading) {
    const match = /^(\S+)\s+(.+)$/.exec(heading.text);

    if (match) {
      const [, headingId, headingTitle] = match;
      screen.heading = lines[heading.line - 1];
      screen.location = { line: heading.line };

      if (screen.id && headingId !== screen.id) {
        diagnostics.push({
          severity: "warning",
          message: `Heading document ID ${headingId} differs from Front Matter ID ${screen.id}.`,
          line: heading.line
        });
      }

      if (screen.title && headingTitle !== screen.title) {
        diagnostics.push({
          severity: "warning",
          message: `Heading title ${headingTitle} differs from Front Matter title ${screen.title}.`,
          line: heading.line
        });
      }
    }
  }

  for (const key of ["id", "type", "title"]) {
    if (!frontMatter[key]) {
      diagnostics.push(createMarkVSpecDiagnostic("error", "frontMatter.missingRequired", { field: key }, 1));
    }
  }

  if (
    frontMatter["type"] &&
    frontMatter["type"] !== "screen" &&
    frontMatter["type"] !== "template" &&
    frontMatter["type"] !== "partial"
  ) {
    diagnostics.push({
      severity: "error",
      message: "Front Matter field type must be screen, template, or partial.",
      line: 1
    });
  }

  for (const key of ["owner", "status", "viewport"]) {
    if (frontMatter[key]) {
      diagnostics.push({
        severity: "warning",
        message: `Front Matter field ${key} is no longer canonical and is ignored.`,
        line: 1
      });
    }
  }

  return screen;
}

function parseTemplateFrontMatter(value: unknown, diagnostics: MarkVSpecDiagnostic[]): { id: string; src: string } | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    diagnostics.push({
      severity: "error",
      message: "template must be a map with id and src.",
      line: 1
    });
    return undefined;
  }

  const id = value["id"];
  const src = value["src"];
  if (typeof id !== "string" || typeof src !== "string" || !id.trim() || !src.trim()) {
    diagnostics.push({
      severity: "error",
      message: "template must be a map with id and src.",
      line: 1
    });
    return undefined;
  }

  return { id: id.trim(), src: src.trim() };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
