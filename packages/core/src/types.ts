import type { RendererMessages } from "./renderer-messages.js";

export type MarkVSpecDiagnosticSeverity = "error" | "warning";

export interface SourceLocation {
  line: number;
}

export interface MarkVSpecDiagnostic {
  severity: MarkVSpecDiagnosticSeverity;
  message: string;
  code?: string;
  params?: Record<string, string | number | boolean>;
  line?: number;
}

export interface MarkVSpecValidationGateOptions {
  failOnWarnings?: boolean;
}

export interface MarkVSpecValidationGateResult {
  diagnostics: MarkVSpecDiagnostic[];
  errorCount: number;
  warningCount: number;
  passed: boolean;
  exitCode: 0 | 1;
}

export interface MarkVSpecScreenSummary {
  id?: string;
  type?: "screen" | "template" | "partial";
  title?: string;
  description?: string;
  route?: string;
  owner?: string;
  viewport?: string;
  status?: string;
  template?: string;
  templateSrc?: string;
  locale?: string;
  defaultState?: string;
  frontMatter: Record<string, string>;
  references: MarkVSpecDocumentReferences;
  heading?: string;
  location?: SourceLocation;
}

export interface MarkVSpecDocumentReferences {
  templates: Record<string, string>;
  partials: Record<string, string>;
}

export interface MarkVSpecProjectSummary {
  id?: string;
  title?: string;
  status?: string;
  frontMatter: Record<string, string>;
  heading?: string;
  location?: SourceLocation;
}

export interface MarkVSpecProjectScreen {
  id?: string;
  path?: string;
  title?: string;
  owner?: string;
  template?: string;
  location: SourceLocation;
  propertyLocations: Record<string, SourceLocation[]>;
}

export interface MarkVSpecState {
  name: string;
  initial: boolean;
  message?: string;
  location: SourceLocation;
  raw: string;
}

export type MarkVSpecLayoutItem =
  | {
      type: "contains";
      targetId: string;
      location: SourceLocation;
      raw: string;
    }
  | {
      type: "field";
      label: string;
      elementId: string;
      location: SourceLocation;
      raw: string;
    }
  | {
      type: "slot";
      name: string;
      location: SourceLocation;
      raw: string;
    }
  | {
      type: "property";
      key: string;
      value: string;
      scope?: "metadata" | "items";
      location: SourceLocation;
      raw: string;
    }
  | {
      type: "flag";
      value: string;
      scope?: "metadata" | "items";
      location: SourceLocation;
      raw: string;
    };

export interface MarkVSpecLayoutGroup {
  id: string;
  name: string;
  viewport: string;
  documentRole?: "template";
  kind?: string;
  partial?: MarkVSpecPartialReference;
  overview?: string[];
  notes?: string[];
  items: MarkVSpecLayoutItem[];
  properties: Record<string, string>;
  propertyLocations: Record<string, SourceLocation[]>;
  location: SourceLocation;
}

export interface MarkVSpecPartialReference {
  id?: string;
  states: Record<string, string>;
  propertyLocations: Record<string, SourceLocation[]>;
  location: SourceLocation;
}

export interface MarkVSpecSlotDefinition {
  name: string;
  title?: string;
  overview?: string[];
  notes?: string[];
  properties: Record<string, string | true>;
  propertyLocations: Record<string, SourceLocation[]>;
  location: SourceLocation;
}

export interface MarkVSpecSlotContent {
  name: string;
  viewport?: string;
  layoutGroups: MarkVSpecLayoutGroup[];
  location: SourceLocation;
}

export interface MarkVSpecElement {
  id: string;
  type: string;
  documentRole?: "template";
  properties: Record<string, string | true>;
  propertyLocations: Record<string, SourceLocation[]>;
  routeParams: MarkVSpecRouteParam[];
  selectOptions: MarkVSpecSelectOption[];
  tableColumns: MarkVSpecTableColumn[];
  tableRows: MarkVSpecTableRow[];
  visibleWhen: string[];
  hiddenWhen: string[];
  disabledWhen: string[];
  validations: string[];
  inputRules: MarkVSpecInputRule[];
  overview?: string[];
  notes?: string[];
  location: SourceLocation;
}

export interface MarkVSpecFormGroup {
  id: string;
  name?: string;
  documentRole?: "template";
  overview?: string[];
  notes?: string[];
  fields: Array<{
    elementId: string;
    location: SourceLocation;
    raw: string;
  }>;
  submit?: {
    actionId: string;
    location: SourceLocation;
    raw: string;
  };
  properties: Record<string, string | string[]>;
  propertyLocations: Record<string, SourceLocation[]>;
  bullets: Array<{
    text: string;
    location: SourceLocation;
  }>;
  location: SourceLocation;
}

export interface MarkVSpecInputRule {
  key: string;
  value: string;
  location: SourceLocation;
  raw: string;
}

export interface MarkVSpecSelectOption {
  label: string;
  source?: string;
  location: SourceLocation;
  raw: string;
}

export interface MarkVSpecTableColumn {
  key?: string;
  label: string;
  source?: string;
  sortable?: boolean;
  sort?: "asc" | "desc";
  metadata?: MarkVSpecTableColumnMetadata[];
  location: SourceLocation;
  raw: string;
}

export interface MarkVSpecTableColumnMetadata {
  key: string;
  value: string;
  location: SourceLocation;
  raw: string;
}

export interface MarkVSpecTableRow {
  cells: MarkVSpecTableCell[];
  location: SourceLocation;
  raw: string;
}

export interface MarkVSpecTableCell {
  column: string;
  value: string;
  location: SourceLocation;
  raw: string;
}

export interface MarkVSpecModelSampleSet {
  state: string;
  path: string;
  overview?: string[];
  notes?: string[];
  columns: string[];
  rows: MarkVSpecModelSampleRow[];
  location: SourceLocation;
}

export interface MarkVSpecModelSampleGroup {
  state: string;
  overview?: string[];
  notes?: string[];
  location: SourceLocation;
}

export interface MarkVSpecModelSampleRow {
  values: Record<string, string>;
  location: SourceLocation;
  raw: string;
}

export type MarkVSpecViewContextType = "boolean" | "enum";

export interface MarkVSpecViewContextValue {
  value: string;
  isDefault: boolean;
  location: SourceLocation;
  raw: string;
}

export interface MarkVSpecViewContextDefinition {
  name: string;
  type?: MarkVSpecViewContextType;
  values: MarkVSpecViewContextValue[];
  defaultValue?: string;
  properties: Record<string, string | true>;
  propertyLocations: Record<string, SourceLocation[]>;
  overview?: string[];
  notes?: string[];
  location: SourceLocation;
}

export interface MarkVSpecViewContextSample {
  name: string;
  values: Record<string, string>;
  valueLocations: Record<string, SourceLocation[]>;
  overview?: string[];
  notes?: string[];
  location: SourceLocation;
}

export interface MarkVSpecPreviewScenario {
  name: string;
  state?: string;
  model?: string;
  view?: string;
  before?: string;
  cases: MarkVSpecPreviewScenarioCase[];
  properties: Record<string, string>;
  propertyLocations: Record<string, SourceLocation[]>;
  overview?: string[];
  notes?: string[];
  location: SourceLocation;
}

export interface MarkVSpecPreviewScenarioCase {
  actionId: string;
  processMarker: string;
  caseName: string;
  raw: string;
  location: SourceLocation;
}

export interface MarkVSpecTransition {
  from: string;
  to: string;
  result?: string;
  location: SourceLocation;
  raw: string;
}

export interface MarkVSpecActionOutcome {
  result: string;
  location?: SourceLocation;
  flow?: "stop" | "continue";
  flowDirectives: MarkVSpecFlowDirective[];
  from?: string;
  to?: string;
  description?: string;
  response?: MarkVSpecResponse;
  request?: {
    method: string;
    path: string;
  };
  target?: string;
  mode?: string;
  fragment?: string;
  content?: string;
  display?: MarkVSpecDisplayEffect;
  sideEffects: string[];
  errorCodes: string[];
  routeParams: MarkVSpecRouteParam[];
  propertyLocations: Record<string, SourceLocation[]>;
}

export interface MarkVSpecFlowDirective {
  value: "stop" | "continue";
  location: SourceLocation;
  underEffects: boolean;
}

export interface MarkVSpecRouteParam {
  name: string;
  source: string;
  location: SourceLocation;
}

export interface MarkVSpecResponse {
  result: string;
  definition: string;
  location: SourceLocation;
}

export interface MarkVSpecProcessStep {
  name: string;
  marker?: string;
  indent: number;
  parallelGroup?: string;
  resolveGroup?: string;
  when: string[];
  skipWhen: string[];
  inputs: MarkVSpecProcessStepDetail[];
  receives: MarkVSpecProcessStepDetail[];
  results: MarkVSpecProcessStepDetail[];
  details: MarkVSpecProcessStepDetail[];
  outcomes: MarkVSpecActionOutcome[];
  to?: string;
  target?: string;
  mode?: string;
  fragment?: string;
  content?: string;
  display?: MarkVSpecDisplayEffect;
  sideEffects: string[];
  propertyLocations: Record<string, SourceLocation[]>;
  location: SourceLocation;
}

export interface MarkVSpecDisplayEffect {
  target?: string;
  element?: string;
  message?: string;
  content?: string;
  contentSource: MarkVSpecProcessStepDetail[];
  location: SourceLocation;
  propertyLocations: Record<string, SourceLocation[]>;
}

export interface MarkVSpecProcessStepDetail {
  key: string;
  value: string;
  location: SourceLocation;
}

export interface MarkVSpecAction {
  id: string;
  name: string;
  documentRole?: "template";
  fromStates: string[];
  triggeredBy?: string;
  triggeredByLocation?: SourceLocation;
  trigger?: {
    elementId: string;
    event: string;
  };
  transitions: MarkVSpecTransition[];
  target?: string;
  mode?: string;
  fragment?: string;
  sideEffects: string[];
  outcomes: MarkVSpecActionOutcome[];
  processSteps: MarkVSpecProcessStep[];
  routeParams: MarkVSpecRouteParam[];
  responses: MarkVSpecResponse[];
  properties: Record<string, string>;
  propertyLocations: Record<string, SourceLocation[]>;
  overview?: string[];
  notes?: string[];
  location: SourceLocation;
}

export interface MarkVSpecRule {
  id: string;
  name?: string;
  overview?: string[];
  notes?: string[];
  bodyLines?: string[];
  bullets: Array<{
    text: string;
    location: SourceLocation;
  }>;
  location: SourceLocation;
}

export interface MarkVSpecValidationRule {
  id: string;
  name?: string;
  overview?: string[];
  notes?: string[];
  bullets: Array<{
    text: string;
    location: SourceLocation;
  }>;
  rules: MarkVSpecValidationRuleEntry[];
  properties: Record<string, string | string[]>;
  propertyLocations: Record<string, SourceLocation[]>;
  location: SourceLocation;
}

export interface MarkVSpecValidationRuleEntry {
  name: string;
  targets: string[];
  location: SourceLocation;
  raw: string;
}

export interface MarkVSpecErrorCode {
  id: string;
  name?: string;
  overview?: string[];
  notes?: string[];
  bullets: Array<{
    text: string;
    location: SourceLocation;
  }>;
  properties: Record<string, string | string[]>;
  propertyLocations: Record<string, SourceLocation[]>;
  location: SourceLocation;
}

export type MarkVSpecHistoryFieldType = "string" | "date";

export interface MarkVSpecHistoryFieldSchema {
  key: string;
  label: string;
  required: boolean;
  type: MarkVSpecHistoryFieldType;
  rawType?: string;
  location: SourceLocation;
  raw: string;
}

export interface MarkVSpecHistoryEntry {
  version: string;
  fields: Record<string, string>;
  fieldLocations: Record<string, SourceLocation[]>;
  bodyLines: string[];
  location: SourceLocation;
  raw: string;
}

export interface MarkVSpecNoteSection {
  title: string;
  line: number;
  lines: string[];
}

export interface MarkVSpecSectionProse {
  sectionId: string;
  title: string;
  kind: string;
  viewport?: string;
  slotName?: string;
  overview: string[];
  notes: string[];
  location: SourceLocation;
  renderKeys: string[];
}

export interface MarkVSpecParseResult {
  screen: MarkVSpecScreenSummary;
  states: MarkVSpecState[];
  layoutGroups: MarkVSpecLayoutGroup[];
  slotDefinitions: MarkVSpecSlotDefinition[];
  slotContents: MarkVSpecSlotContent[];
  elements: MarkVSpecElement[];
  formGroups: MarkVSpecFormGroup[];
  actions: MarkVSpecAction[];
  validations: MarkVSpecValidationRule[];
  rules: MarkVSpecRule[];
  errorCodes: MarkVSpecErrorCode[];
  historyFields: MarkVSpecHistoryFieldSchema[];
  historyEntries: MarkVSpecHistoryEntry[];
  modelSampleGroups: MarkVSpecModelSampleGroup[];
  modelSamples: MarkVSpecModelSampleSet[];
  viewContexts: MarkVSpecViewContextDefinition[];
  viewContextSamples: MarkVSpecViewContextSample[];
  previewScenarios: MarkVSpecPreviewScenario[];
  sectionProse: MarkVSpecSectionProse[];
  notes: MarkVSpecNoteSection[];
  diagnostics: MarkVSpecDiagnostic[];
}

export interface MarkVSpecProjectParseResult {
  project: MarkVSpecProjectSummary;
  templates: MarkVSpecProjectScreen[];
  screens: MarkVSpecProjectScreen[];
  notes: MarkVSpecNoteSection[];
  diagnostics: MarkVSpecDiagnostic[];
}

export interface MarkVSpecLoadedProjectScreen {
  index: MarkVSpecProjectScreen;
  resolvedPath?: string;
  result?: MarkVSpecParseResult;
  sourceResult?: MarkVSpecParseResult;
}

export interface MarkVSpecProjectLoadResult {
  project: MarkVSpecProjectParseResult;
  templates: MarkVSpecLoadedProjectScreen[];
  screens: MarkVSpecLoadedProjectScreen[];
  diagnostics: MarkVSpecDiagnostic[];
  documentGraph: MarkVSpecProjectDocumentGraph;
}

export type MarkVSpecProjectDocumentKind = "project" | "screen" | "template" | "partial";

export interface MarkVSpecProjectDocumentGraphNode {
  path: string;
  kind: MarkVSpecProjectDocumentKind;
  documentId?: string;
}

export type MarkVSpecProjectDocumentDependencyKind = "project-screen" | "project-template" | "screen-template" | "document-partial";

export interface MarkVSpecProjectDocumentGraphEdge {
  fromPath: string;
  toPath: string;
  kind: MarkVSpecProjectDocumentDependencyKind;
  documentId?: string;
}

export interface MarkVSpecProjectDocumentGraph {
  projectPath?: string;
  nodes: MarkVSpecProjectDocumentGraphNode[];
  edges: MarkVSpecProjectDocumentGraphEdge[];
}

export interface MarkVSpecProjectTransitionNode {
  id: string;
  title?: string;
  route?: string;
  path?: string;
}

export interface MarkVSpecProjectTransitionEdge {
  sourceScreenId: string;
  sourceScreenTitle?: string;
  actionId: string;
  actionMarker?: string;
  actionName: string;
  fromState?: string;
  result?: string;
  target: string;
  targetType: "screen" | "external" | "missing-screen";
  location: SourceLocation;
}

export interface MarkVSpecProjectTransitionGraph {
  nodes: MarkVSpecProjectTransitionNode[];
  edges: MarkVSpecProjectTransitionEdge[];
}

export interface MarkVSpecRenderOptions {
  state?: string;
  viewport?: string;
  modelValues?: Record<string, boolean | number | string>;
  viewValues?: Record<string, boolean | number | string>;
  messages?: Partial<Pick<RendererMessages, "noVisibleElements">>;
  showIds?: boolean;
  includeConditionalContent?: boolean;
  markerFilter?: (id: string, category: "layout" | "element" | "action") => boolean;
  markerLink?: (id: string, category: "layout" | "element" | "action") => string | undefined;
  markerVisibility?: {
    layout?: boolean;
    element?: boolean;
    action?: boolean;
  };
  includeStyles?: boolean;
}
