import { parseMarkVSpecProject } from "./project-parser.js";
import { loadMarkVSpecProject, resolveProjectPath } from "./project-loader.js";
import { parseMarkVSpec } from "./parser.js";
import { renderMarkVSpecHtml, renderMarkVSpecHtmlFragments } from "./renderer.js";
import { computeMarkVSpecRenderInvalidation } from "./render-invalidation.js";
import { AI_INPUT_SUPPORTED_DOCUMENT_KINDS, diagnoseAiDesignInputDocument } from "./ai-input-diagnostics.js";
import { resolveRendererMessages } from "./renderer-message-loader.js";
import { messagesForLocale, resolveLocale, supportedRendererMessageKeys } from "./renderer-messages.js";
import type {
  MarkVSpecParseResult,
  MarkVSpecRenderOptions
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
  MarkVSpecNoteSection,
  MarkVSpecParseResult,
  MarkVSpecProjectLoadResult,
  MarkVSpecProcessStep,
  MarkVSpecProcessStepEffectsReadModel,
  MarkVSpecProcessStepExecutionReadModel,
  MarkVSpecProcessStepKind,
  MarkVSpecProcessStepReadModel,
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
  MarkVSpecPreviewScenarioRouteSample,
  MarkVSpecPreviewScenarioSample,
  SourceLocation
} from "./types.js";
export {
  buildMarkVSpecProcessStepReadModel,
  classifyMarkVSpecProcessStep,
  isMarkVSpecProcessStepKind
} from "./action-process-read-model.js";
export {
  actionOutcomeForTransition,
  actionOutcomeSummaries,
  actionTransitionCaseReference,
  actionTriggerReadModel,
  buildMarkVSpecActionEnvelopeReadModel,
  isDocumentLifecycleAction,
  isSystemEventAction,
  processLifecycleTriggerSource
} from "./action-envelope-read-model.js";
export type {
  MarkVSpecActionEnvelopeReadModel,
  MarkVSpecActionOutcomeSummary,
  MarkVSpecActionTriggerKind,
  MarkVSpecActionTriggerReadModel
} from "./action-envelope-read-model.js";
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
export { parseMarkVSpec } from "./parser.js";
export { evaluateMarkVSpecDiagnostics } from "./validation-gate.js";
export { AI_INPUT_SUPPORTED_DOCUMENT_KINDS, diagnoseAiDesignInputDocument };
export { resolveRendererMessages } from "./renderer-message-loader.js";
export { messagesForLocale, resolveLocale, supportedRendererMessageKeys };
export { createMarkVSpecDiagnostic, renderDiagnosticMessageForLocale, supportedDiagnosticMessageCodes } from "./diagnostic-messages.js";
export { effectiveHistoryFields, latestHistoryBasicInfo, standardHistoryFields } from "./history.js";
export { isMarkVSpecSourceType, markVSpecSourceTypes, sourceTypeForElement } from "./source-types.js";
export {
  actionProcessDetailItemDefinitions,
  actionTopLevelItemDefinitions,
  commonElementPropertyKeys,
  grammarAllowedStructuredItemKeys,
  grammarDefinitionHardCodeInventory,
  grammarSectionDefinitions,
  grammarSectionForTitle,
  grammarSectionOrderRank,
  grammarSectionOrderText,
  grammarStructuredItem,
  grammarStructuredItemContexts,
  grammarStructuredItemForContext,
  layoutGroupMetadataPropertyKeys,
  isGrammarStructuredItemCanonical,
  normalizeGrammarKey,
  processDetailBlockKeys,
  processSyntaxOnlyBlockKeys,
  slotDefinitionPropertyKeys
} from "./grammar-definition.js";
export type {
  GrammarHardCodeInventoryEntry,
  GrammarItemClassification,
  GrammarSectionDefinition,
  GrammarSectionKind,
  GrammarStructuredItemContext,
  GrammarStructuredItemDefinition,
  GrammarStructuredItemQueryResult
} from "./grammar-definition.js";
export {
  anchoredOverlayReference,
  commonElementProperties,
  controlledPanelReferences,
  displaySummaryForElement,
  displaySummaryForElementProperties,
  displayLabelForElement,
  elementAcceptsOptions,
  elementAllowedProperties,
  elementDomainFor,
  elementKindForType,
  elementSizePreset,
  elementTypeRegistry,
  elementWidthPreset,
  formControlDisplayValue,
  formControlSpecForElement,
  isChoiceControlElement,
  isContentDisplayElement,
  isControlledPanelElement,
  isElementDisplaySampleValue,
  isFormControlElement,
  isKnownElementType,
  isOverlayElement
} from "./element-domain.js";
export type {
  AnchoredOverlayReference,
  ControlledPanelReference,
  ElementDisplaySummary,
  ElementFormControlSpec,
  ElementFormControlSpecProperty,
  ElementTypeDefinition,
  MarkVSpecElementKind
} from "./element-domain.js";
export {
  businessRuleDomainFor,
  businessRuleMarker,
  businessRuleMessages,
  businessRuleResult,
  businessRuleViolation,
  businessRuleViolationCaseName,
  validationDisplayMessageSource,
  validationDomainFor,
  validationErrorCodes,
  validationHasRuleProperty,
  validationMarker,
  validationMessages,
  validationRuleChildProperty,
  validationRulePropertyValues,
  validationRuleTargets,
  validationRun,
  validationScope,
  validationTargets
} from "./validation-domain.js";
export type {
  BusinessRuleDomain,
  BusinessRuleViolation,
  ValidationDisplayMessageSource,
  ValidationDomain,
  ValidationRuleProperty,
  ValidationRunKind,
  ValidationScopeKind
} from "./validation-domain.js";
export {
  propertyBoolean,
  propertyFirstString,
  propertyList,
  propertyLocation,
  propertyLocations,
  propertyMarker,
  propertyString
} from "./property-accessor.js";
export {
  layoutConditionValues,
  layoutDisplaySettings,
  layoutDomainFor,
  layoutHasVisibilityConditions,
  layoutMetadataPropertyValues,
  layoutPropertyValue,
  LayoutDomain
} from "./layout-domain.js";
export type {
  LayoutConditionKey,
  LayoutDisplaySettingKey,
  LayoutDisplaySettings
} from "./layout-domain.js";
export type {
  MarkVSpecPropertyOwner,
  MarkVSpecPropertyValue
} from "./property-accessor.js";
export {
  entityMarkerReadModel,
  entityMarkerReadModels
} from "./entity-marker-read-model.js";
export type {
  EntityMarkerReadModel,
  MarkVSpecMarkerEntity
} from "./entity-marker-read-model.js";
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
  stateScreenControlledPanelPlacementsForModel,
  stateScreenLayoutsForModel,
  stateScreenUnplacedLayoutIdsForModel,
  sampleRowsAnchorId,
  scenarioRouteValues,
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
  DisplayContentSpecRow,
  DisplayContentSpecSampleRowsRef
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
  ControlledPanelPlacement,
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
