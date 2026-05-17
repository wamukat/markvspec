import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { parseDocument } from "yaml";

export type MarkVSpecLocale = "en" | "ja";

export type MessageKey =
  | "action"
  | "actionDetails"
  | "actionTransitions"
  | "actionable"
  | "autoUpdate"
  | "autoUpdatePreview"
  | "actions"
  | "all"
  | "any"
  | "always"
  | "author"
  | "availability"
  | "basicInfo"
  | "businessRule"
  | "businessRules"
  | "case"
  | "check"
  | "clientCrossFieldValidations"
  | "clientFieldValidations"
  | "columns"
  | "condition"
  | "conditionAnd"
  | "conditionDisabledShort"
  | "conditionEnabledShort"
  | "conditionHiddenShort"
  | "conditionNot"
  | "conditions"
  | "conditionOr"
  | "conditionVisibleShort"
  | "conditionWhenShort"
  | "content"
  | "contents"
  | "contentsEmpty"
  | "contentsError"
  | "contentsLoading"
  | "constraints"
  | "date"
  | "default"
  | "definitionContent"
  | "definitionDefinitions"
  | "diagnostics"
  | "description"
  | "disabledWhen"
  | "display"
  | "displayLayoutOnlyChanged"
  | "displayCondition"
  | "displayContentSpec"
  | "displayLocation"
  | "displayReceives"
  | "displaySource"
  | "displayUpdates"
  | "displayValue"
  | "displayedAt"
  | "displayedMessages"
  | "element"
  | "elementSummary"
  | "elements"
  | "embeddedPreview"
  | "enabledWhen"
  | "error"
  | "errorCode"
  | "errorCodes"
  | "feedback"
  | "field"
  | "fields"
  | "format"
  | "formGroups"
  | "formControls"
  | "fragmentContent"
  | "from"
  | "history"
  | "hideContents"
  | "id"
  | "initial"
  | "initialValueSource"
  | "input"
  | "inputFormSpec"
  | "inputRequired"
  | "inputSpec"
  | "inputs"
  | "items"
  | "kind"
  | "label"
  | "labelSrc"
  | "layout"
  | "layouts"
  | "level"
  | "legacyCondition"
  | "line"
  | "locale"
  | "loaded"
  | "marker"
  | "markerVisibility"
  | "mermaidHideSource"
  | "mermaidRenderFailed"
  | "mermaidRendering"
  | "mermaidShowSource"
  | "markers"
  | "message"
  | "missing"
  | "model"
  | "name"
  | "navigation"
  | "noVisibleElements"
  | "notPlacedInCurrentLayout"
  | "none"
  | "notes"
  | "freeFormSections"
  | "object"
  | "options"
  | "other"
  | "otherMetadata"
  | "outcome"
  | "overview"
  | "owner"
  | "partial"
  | "partialReferences"
  | "partialUpdates"
  | "path"
  | "preview"
  | "previewUpdate"
  | "process"
  | "processContent"
  | "processContinue"
  | "processDescription"
  | "processDisplay"
  | "processEffect"
  | "processElement"
  | "processMessage"
  | "processFragment"
  | "processGroup"
  | "processMode"
  | "processModalOverlay"
  | "processNavigateTo"
  | "processOverlay"
  | "processParallelGroup"
  | "processReceive"
  | "processRequest"
  | "processResponse"
  | "processServer"
  | "processSetState"
  | "processSkipWhen"
  | "processStop"
  | "processToastOverlay"
  | "processUpdate"
  | "processWhen"
  | "project"
  | "projectTransitionDiagram"
  | "projectTransitions"
  | "properties"
  | "purpose"
  | "parameters"
  | "params"
  | "required"
  | "requiredNo"
  | "requiredYes"
  | "request"
  | "references"
  | "readonly"
  | "refresh"
  | "refreshPreview"
  | "responses"
  | "result"
  | "repeated"
  | "rootLayouts"
  | "route"
  | "routeParameters"
  | "run"
  | "rows"
  | "rule"
  | "rules"
  | "ruleText"
  | "settings"
  | "screen"
  | "screens"
  | "screenTransitions"
  | "serverCrossFieldValidations"
  | "serverFieldValidations"
  | "severity"
  | "sample"
  | "scenarioSamples"
  | "scenarioSampleRowsUnit"
  | "scope"
  | "sideEffects"
  | "showRepeatedContent"
  | "showContents"
  | "slot"
  | "slots"
  | "src"
  | "state"
  | "stateChanges"
  | "stateFlow"
  | "stateTransitionAxisDescription"
  | "stateTransitionTableReference"
  | "stateTransitionNotes"
  | "stateViews"
  | "states"
  | "status"
  | "statusIdMismatch"
  | "statusWrongType"
  | "submit"
  | "systemEvents"
  | "target"
  | "targetType"
  | "template"
  | "templates"
  | "templateReference"
  | "textValue"
  | "title"
  | "to"
  | "toggleContents"
  | "toggleMarker"
  | "tone"
  | "trigger"
  | "triggeredBy"
  | "transitions"
  | "triggeredActions"
  | "type"
  | "update"
  | "url"
  | "validation"
  | "validationRules"
  | "value"
  | "valueModel"
  | "version"
  | "view"
  | "viewport"
  | "when"
  | "visibleWhen"
  | "wireframe";

const en: Record<MessageKey, string> = {
  action: "Action",
  actionDetails: "Action Details",
  actionTransitions: "State Transitions",
  actionable: "Actionable",
  author: "Author",
  autoUpdate: "Auto update",
  autoUpdatePreview: "Toggle auto preview update",
  actions: "Actions",
  all: "All",
  any: "Any",
  always: "always",
  availability: "Availability",
  basicInfo: "Basic Info",
  businessRule: "Business Rule",
  businessRules: "Business Rules",
  case: "Case",
  check: "Check",
  clientCrossFieldValidations: "Client Cross-field Validations",
  clientFieldValidations: "Client Field Validations",
  columns: "Columns",
  condition: "Condition",
  conditionAnd: "and",
  conditionDisabledShort: "disabled",
  conditionEnabledShort: "enabled",
  conditionHiddenShort: "hidden",
  conditionNot: "not",
  conditions: "Conditions",
  conditionOr: "or",
  conditionVisibleShort: "visible",
  conditionWhenShort: "when",
  content: "Content",
  contents: "Contents",
  contentsEmpty: "No sections.",
  contentsError: "Unable to build contents.",
  contentsLoading: "Building contents...",
  constraints: "Constraints",
  date: "Date",
  default: "Default",
  definitionContent: "Content",
  definitionDefinitions: "Definitions",
  diagnostics: "Diagnostics",
  description: "Description",
  disabledWhen: "Disabled When",
  display: "Display",
  displayLayoutOnlyChanged: "Only repeated specifications are hidden.",
  displayCondition: "Condition",
  displayContentSpec: "Display Content Spec",
  displayLocation: "Location",
  displayReceives: "receives",
  displaySource: "Source",
  displayUpdates: "Display updates",
  displayValue: "Content",
  displayedAt: "Displayed at",
  displayedMessages: "Displayed messages",
  element: "Element",
  elementSummary: "Element Summary",
  elements: "Elements",
  embeddedPreview: "Embedded preview",
  enabledWhen: "Enabled When",
  error: "Error",
  errorCode: "Error Code",
  errorCodes: "Error Codes",
  feedback: "Status Display",
  field: "Field",
  fields: "Fields",
  format: "Format",
  formGroups: "Form Groups",
  formControls: "Form Controls",
  fragmentContent: "Fragment / Content",
  from: "From",
  history: "History",
  hideContents: "Hide contents",
  id: "ID",
  initial: "initial",
  initialValueSource: "Value",
  input: "Input",
  inputFormSpec: "Input Form Spec",
  inputRequired: "Required",
  inputSpec: "Spec",
  inputs: "Inputs",
  items: "Items",
  kind: "Kind",
  label: "Label",
  labelSrc: "Label Source",
  layout: "Layout",
  layouts: "Layouts",
  level: "Level",
  legacyCondition: "legacy condition",
  line: "Line",
  locale: "Locale",
  loaded: "loaded",
  marker: "Marker",
  markerVisibility: "Marker visibility",
  mermaidHideSource: "Hide source",
  mermaidRenderFailed: "Unable to render Mermaid diagram.",
  mermaidRendering: "Rendering Mermaid diagram...",
  mermaidShowSource: "Show source",
  markers: "Markers",
  message: "Message",
  missing: "missing",
  model: "Model",
  name: "Name",
  navigation: "Navigation",
  noVisibleElements: "No visible elements",
  notPlacedInCurrentLayout: "not placed in current layout",
  none: "None.",
  notes: "Notes",
  freeFormSections: "Free-form Sections",
  object: "Object",
  options: "Options",
  other: "Other",
  otherMetadata: "Other Metadata",
  outcome: "Outcome",
  overview: "Overview",
  owner: "Owner",
  partial: "Partial",
  partialReferences: "Partial References",
  partialUpdates: "Partial Updates",
  path: "Path",
  preview: "Preview",
  previewUpdate: "Preview update",
  process: "Process",
  processContent: "content",
  processContinue: "continue process",
  processDescription: "description",
  processDisplay: "display",
  processEffect: "effect",
  processElement: "element",
  processMessage: "message",
  processFragment: "fragment",
  processGroup: "group",
  processMode: "mode",
  processModalOverlay: "modal overlay",
  processNavigateTo: "navigate to",
  processOverlay: "overlay",
  processParallelGroup: "Parallel group",
  processReceive: "receive",
  processRequest: "request",
  processResponse: "response",
  processServer: "server",
  processSetState: "set state",
  processSkipWhen: "skip when",
  processStop: "stop process",
  processToastOverlay: "toast overlay",
  processUpdate: "update",
  processWhen: "when",
  properties: "Properties",
  project: "Project",
  projectTransitionDiagram: "Project Transition Diagram",
  projectTransitions: "Project Transitions",
  purpose: "Purpose",
  parameters: "Parameters",
  params: "Params",
  required: "Required",
  requiredNo: "no",
  requiredYes: "yes",
  request: "Request",
  references: "References",
  readonly: "Read-only",
  refresh: "Refresh",
  refreshPreview: "Refresh preview",
  responses: "Responses",
  result: "Result",
  repeated: "Repeated",
  rootLayouts: "Root Layouts",
  route: "Route",
  routeParameters: "Route Parameters",
  run: "Run",
  rows: "Rows",
  rule: "Rule",
  rules: "Rules",
  ruleText: "Rule Text",
  settings: "Settings",
  screen: "Screen",
  screens: "Screens",
  screenTransitions: "Screen Transitions",
  serverCrossFieldValidations: "Server Cross-field Validations",
  serverFieldValidations: "Server Field Validations",
  severity: "Severity",
  sample: "Sample",
  scenarioSamples: "Scenario Samples",
  scenarioSampleRowsUnit: "rows",
  scope: "Scope",
  sideEffects: "Side effects",
  showRepeatedContent: "Show repeated content",
  showContents: "Show contents",
  slot: "Slot",
  slots: "Slots",
  src: "Source",
  state: "State",
  stateChanges: "State Changes",
  stateFlow: "State Flow",
  stateTransitionAxisDescription: "Rows are From states; columns are To states.",
  stateTransitionTableReference: "See State Transitions for details.",
  stateTransitionNotes: "State Notes",
  stateViews: "State Views",
  states: "States",
  status: "Status",
  statusIdMismatch: "id mismatch",
  statusWrongType: "wrong type",
  submit: "Submit",
  systemEvents: "System Events",
  target: "Target",
  targetType: "Target Type",
  template: "Template",
  templates: "Templates",
  templateReference: "Template",
  textValue: "Text / Value",
  title: "Title",
  to: "To",
  toggleContents: "Toggle contents",
  toggleMarker: "Toggle markers",
  tone: "Tone",
  trigger: "Trigger",
  triggeredBy: "Triggered by",
  transitions: "Transitions",
  triggeredActions: "Triggered Actions",
  type: "Type",
  update: "Update",
  url: "URL",
  validation: "Validation",
  validationRules: "Validations",
  value: "Value",
  valueModel: "Value / Source",
  version: "Version",
  view: "View",
  viewport: "Viewport",
  when: "When",
  visibleWhen: "Condition",
  wireframe: "Wireframe"
};

const ja: Record<MessageKey, string> = {
  action: "アクション",
  actionDetails: "アクション詳細",
  actionTransitions: "状態遷移表",
  actionable: "操作要素",
  author: "作成者",
  autoUpdate: "自動更新",
  autoUpdatePreview: "プレビューの自動更新を切り替え",
  actions: "アクション",
  all: "すべて",
  any: "いずれか",
  always: "常に",
  availability: "有効条件",
  basicInfo: "基本情報",
  businessRule: "業務ルール",
  businessRules: "業務ルール",
  case: "ケース",
  check: "チェック",
  clientCrossFieldValidations: "クライアント複合項目検証",
  clientFieldValidations: "クライアント単項目検証",
  columns: "列",
  condition: "条件",
  conditionAnd: "かつ",
  conditionDisabledShort: "無効",
  conditionEnabledShort: "有効",
  conditionHiddenShort: "非表示",
  conditionNot: "not",
  conditions: "条件",
  conditionOr: "または",
  conditionVisibleShort: "表示",
  conditionWhenShort: "条件",
  content: "コンテンツ",
  contents: "目次",
  contentsEmpty: "表示できる章がありません。",
  contentsError: "目次を生成できませんでした。",
  contentsLoading: "目次を生成しています...",
  constraints: "制約",
  date: "日付",
  default: "デフォルト",
  definitionContent: "差し込み内容",
  definitionDefinitions: "定義",
  diagnostics: "診断",
  description: "説明",
  disabledWhen: "無効条件",
  display: "表示",
  displayLayoutOnlyChanged: "既出の仕様のみ非表示",
  displayCondition: "表示条件",
  displayContentSpec: "表示内容仕様",
  displayLocation: "表示箇所",
  displayReceives: "受け取る",
  displaySource: "取得元",
  displayUpdates: "表示更新",
  displayValue: "表示内容",
  displayedAt: "表示先",
  displayedMessages: "表示メッセージ",
  element: "画面要素",
  elementSummary: "画面要素サマリー",
  elements: "画面要素",
  embeddedPreview: "埋め込みプレビュー",
  enabledWhen: "有効条件",
  error: "エラー",
  errorCode: "エラーコード",
  errorCodes: "エラーコード",
  feedback: "状態表示",
  field: "項目",
  fields: "項目",
  format: "表示形式",
  formGroups: "フォームグループ",
  formControls: "フォーム要素",
  fragmentContent: "差し替え内容",
  from: "遷移元",
  history: "変更履歴",
  hideContents: "目次を隠す",
  id: "ID",
  initial: "初期",
  initialValueSource: "値",
  input: "入力",
  inputFormSpec: "入力フォーム仕様",
  inputRequired: "必須",
  inputSpec: "仕様",
  inputs: "入力",
  items: "項目",
  kind: "種別",
  label: "表示名",
  labelSrc: "表示名参照元",
  layout: "レイアウト",
  layouts: "レイアウト",
  level: "レベル",
  legacyCondition: "非推奨 condition",
  line: "行",
  locale: "ロケール",
  loaded: "読み込み済み",
  marker: "番号",
  markerVisibility: "マーカー表示",
  mermaidHideSource: "ソースを隠す",
  mermaidRenderFailed: "Mermaid 図を描画できませんでした。",
  mermaidRendering: "Mermaid 図を描画しています...",
  mermaidShowSource: "ソースを表示",
  markers: "マーカー",
  message: "メッセージ",
  missing: "未検出",
  model: "モデル",
  name: "名前",
  navigation: "ナビゲーション",
  noVisibleElements: "表示される要素はありません",
  notPlacedInCurrentLayout: "現在のレイアウトに未配置",
  none: "なし。",
  notes: "備考",
  freeFormSections: "自由記述セクション",
  object: "対象",
  options: "選択肢",
  other: "その他",
  otherMetadata: "その他メタ情報",
  outcome: "結果",
  overview: "概要",
  owner: "担当",
  partial: "partial",
  partialReferences: "Partial参照",
  partialUpdates: "部分更新",
  path: "パス",
  preview: "プレビュー",
  previewUpdate: "プレビュー更新",
  process: "処理",
  processContent: "内容",
  processContinue: "処理を継続",
  processDescription: "説明",
  processDisplay: "表示",
  processEffect: "効果",
  processElement: "要素",
  processMessage: "メッセージ",
  processFragment: "フラグメント",
  processGroup: "グループ",
  processMode: "モード",
  processModalOverlay: "モーダルオーバーレイ",
  processNavigateTo: "画面遷移",
  processOverlay: "オーバーレイ",
  processParallelGroup: "並列グループ",
  processReceive: "受信",
  processRequest: "リクエスト",
  processResponse: "レスポンス",
  processServer: "サーバ",
  processSetState: "状態更新",
  processSkipWhen: "スキップ条件",
  processStop: "処理を停止",
  processToastOverlay: "トースト表示領域",
  processUpdate: "更新",
  processWhen: "実行条件",
  properties: "属性",
  project: "プロジェクト",
  projectTransitionDiagram: "プロジェクト遷移図",
  projectTransitions: "プロジェクト遷移",
  purpose: "目的",
  parameters: "パラメータ",
  params: "パラメータ",
  required: "必須",
  requiredNo: "いいえ",
  requiredYes: "はい",
  request: "リクエスト",
  references: "参照設計書",
  readonly: "読み取り専用",
  refresh: "更新",
  refreshPreview: "プレビューを更新",
  responses: "レスポンス",
  result: "結果",
  repeated: "既出",
  rootLayouts: "ルートレイアウト",
  route: "ルート",
  routeParameters: "ルートパラメータ",
  run: "実行",
  rows: "行数",
  rule: "ルール",
  rules: "ルール",
  ruleText: "ルール内容",
  settings: "設定",
  screen: "画面",
  screens: "画面",
  screenTransitions: "画面遷移",
  serverCrossFieldValidations: "サーバ複合項目検証",
  serverFieldValidations: "サーバ単項目検証",
  severity: "重要度",
  sample: "サンプル",
  scenarioSamples: "シナリオサンプル",
  scenarioSampleRowsUnit: "行",
  scope: "範囲",
  sideEffects: "副作用",
  showRepeatedContent: "既出を表示",
  showContents: "目次を表示",
  slot: "スロット",
  slots: "スロット",
  src: "参照元",
  state: "状態",
  stateChanges: "状態変更",
  stateFlow: "状態遷移図",
  stateTransitionAxisDescription: "行は From 状態、列は To 状態です。",
  stateTransitionTableReference: "詳細は状態遷移表を参照",
  stateTransitionNotes: "状態補足",
  stateViews: "状態ビュー",
  states: "状態",
  status: "ステータス",
  statusIdMismatch: "ID不一致",
  statusWrongType: "種別不一致",
  submit: "送信",
  systemEvents: "自動イベント",
  target: "対象",
  targetType: "対象種別",
  template: "テンプレート",
  templates: "テンプレート",
  templateReference: "テンプレート",
  textValue: "テキスト / 値",
  title: "タイトル",
  to: "遷移先",
  toggleContents: "目次を切り替え",
  toggleMarker: "マーカーを切り替え",
  tone: "意味",
  trigger: "トリガー",
  triggeredBy: "発生元",
  transitions: "遷移",
  triggeredActions: "関連アクション",
  type: "種別",
  update: "更新",
  url: "URL",
  validation: "検証",
  validationRules: "Validations",
  value: "値",
  valueModel: "値 / 参照元",
  version: "バージョン",
  view: "表示",
  viewport: "ビューポート",
  when: "条件",
  visibleWhen: "条件",
  wireframe: "ワイヤーフレーム"
};

export type RendererMessageKey = MessageKey;
export type RendererMessages = Record<RendererMessageKey, string>;

export interface RendererMessageDiagnostic {
  severity: "warning";
  message: string;
  sourcePath?: string;
  key?: string;
}

export interface ResolveRendererMessagesOptions {
  locale?: string;
  sourcePath?: string;
  explicitPath?: string;
  frontMatterPath?: string;
  searchBoundaryPath?: string;
  workspaceRoot?: string;
  readFile?: (path: string) => string | undefined;
  fileExists?: (path: string) => boolean;
}

export interface ResolvedRendererMessages {
  locale: MarkVSpecLocale;
  messages: RendererMessages;
  sourcePath?: string;
  diagnostics: RendererMessageDiagnostic[];
}

const dictionaries: Record<MarkVSpecLocale, RendererMessages> = { en, ja };
const supportedMessageKeys = new Set(Object.keys(en));
const ignoredDeprecatedMessageKeys = new Set([
  "pdfExportNotes",
  "printNoteBrowser",
  "printNoteMermaid",
  "printNoteTables"
]);

export function resolveLocale(locale: string | undefined): MarkVSpecLocale {
  return locale?.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export function messagesForLocale(locale: string | undefined): RendererMessages {
  return dictionaries[resolveLocale(locale)];
}

export function resolveRendererMessages(options: ResolveRendererMessagesOptions = {}): ResolvedRendererMessages {
  const locale = resolveLocale(options.locale);
  const diagnostics: RendererMessageDiagnostic[] = [];
  const readFile = options.readFile ?? readTextFile;
  const fileExists = options.fileExists ?? existsSync;
  const candidate = resolveMessageFileCandidate(options, locale, fileExists, diagnostics);
  const loaded = candidate ? loadRendererMessageFile(candidate, locale, readFile, diagnostics) : undefined;

  return {
    locale,
    messages: {
      ...messagesForLocale(locale),
      ...(loaded?.messages ?? {})
    },
    sourcePath: loaded?.sourcePath,
    diagnostics
  };
}

export function supportedRendererMessageKeys(): RendererMessageKey[] {
  return [...supportedMessageKeys].sort() as RendererMessageKey[];
}

function resolveMessageFileCandidate(
  options: ResolveRendererMessagesOptions,
  locale: MarkVSpecLocale,
  fileExists: (path: string) => boolean,
  diagnostics: RendererMessageDiagnostic[]
): string | undefined {
  if (options.explicitPath) {
    const candidate = resolvePath(process.cwd(), options.explicitPath);
    if (!isInsideWorkspace(candidate, options.workspaceRoot)) {
      diagnostics.push({
        severity: "warning",
        message: `Renderer message file is outside the workspace: ${candidate}.`,
        sourcePath: candidate
      });
      return undefined;
    }
    return candidate;
  }

  const sourceDir = options.sourcePath ? dirname(resolve(options.sourcePath)) : process.cwd();
  if (options.frontMatterPath) {
    const candidate = resolvePath(sourceDir, options.frontMatterPath);
    if (!isInsideWorkspace(candidate, options.workspaceRoot)) {
      diagnostics.push({
        severity: "warning",
        message: `Renderer message file is outside the workspace: ${candidate}.`,
        sourcePath: candidate
      });
      return undefined;
    }
    return candidate;
  }

  return findDefaultMessagesFile(sourceDir, locale, options, fileExists);
}

function findDefaultMessagesFile(
  sourceDir: string,
  locale: MarkVSpecLocale,
  options: ResolveRendererMessagesOptions,
  fileExists: (path: string) => boolean
): string | undefined {
  const boundary = resolveSearchBoundary(sourceDir, options);
  let current = sourceDir;
  while (true) {
    for (const fileName of defaultMessageFileNames(locale)) {
      const candidate = join(current, fileName);
      if (isInsideWorkspace(candidate, options.workspaceRoot) && fileExists(candidate)) {
        return candidate;
      }
    }

    if (current === boundary) {
      return undefined;
    }
    const parent = dirname(current);
    if (parent === current || !isPathWithin(current, boundary)) {
      return undefined;
    }
    current = parent;
  }
}

function resolveSearchBoundary(sourceDir: string, options: ResolveRendererMessagesOptions): string {
  if (options.workspaceRoot) {
    return resolve(options.workspaceRoot);
  }
  if (options.searchBoundaryPath) {
    return resolve(options.searchBoundaryPath);
  }
  const cwd = process.cwd();
  return isPathWithin(sourceDir, cwd) ? cwd : sourceDir;
}

function defaultMessageFileNames(locale: MarkVSpecLocale): string[] {
  return [
    `markvspec.messages.${locale}.yml`,
    `markvspec.messages.${locale}.yaml`,
    `markvspec.messages.${locale}.json`,
    "markvspec.messages.yml",
    "markvspec.messages.yaml",
    "markvspec.messages.json"
  ];
}

function loadRendererMessageFile(
  path: string,
  locale: MarkVSpecLocale,
  readFile: (path: string) => string | undefined,
  diagnostics: RendererMessageDiagnostic[]
): { messages: Partial<RendererMessages>; sourcePath?: string } {
  const raw = readFile(path);
  if (raw === undefined) {
    diagnostics.push({
      severity: "warning",
      message: `Renderer message file could not be read: ${path}.`,
      sourcePath: path
    });
    return { messages: {} };
  }

  const data = parseRendererMessageFile(raw, path, diagnostics);
  if (!isRecord(data)) {
    return { messages: {} };
  }

  const fileLocale = typeof data["locale"] === "string" ? resolveLocale(data["locale"]) : undefined;
  if (fileLocale && fileLocale !== locale) {
    diagnostics.push({
      severity: "warning",
      message: `Renderer message file locale ${fileLocale} does not match document locale ${locale}.`,
      sourcePath: path
    });
  }

  const messages = data["messages"];
  if (!isRecord(messages)) {
    diagnostics.push({
      severity: "warning",
      message: "Renderer message file must contain a messages object.",
      sourcePath: path
    });
    return { messages: {} };
  }

  const override: Partial<RendererMessages> = {};
  for (const [key, value] of Object.entries(messages)) {
    if (!supportedMessageKeys.has(key)) {
      if (ignoredDeprecatedMessageKeys.has(key)) {
        continue;
      }
      diagnostics.push({
        severity: "warning",
        message: `Unknown renderer message key: ${key}.`,
        sourcePath: path,
        key
      });
      continue;
    }
    if (typeof value !== "string") {
      diagnostics.push({
        severity: "warning",
        message: `Renderer message key ${key} must be a string.`,
        sourcePath: path,
        key
      });
      continue;
    }
    override[key as RendererMessageKey] = value;
  }

  return { messages: override, sourcePath: path };
}

function parseRendererMessageFile(raw: string, path: string, diagnostics: RendererMessageDiagnostic[]): unknown {
  if (path.endsWith(".json")) {
    try {
      return JSON.parse(raw) as unknown;
    } catch (error) {
      diagnostics.push({
        severity: "warning",
        message: `Invalid renderer message JSON: ${error instanceof Error ? error.message : String(error)}`,
        sourcePath: path
      });
      return undefined;
    }
  }

  const document = parseDocument(raw, { uniqueKeys: false });
  if (document.errors.length > 0) {
    diagnostics.push(...document.errors.map((error) => ({
      severity: "warning" as const,
      message: `Invalid renderer message YAML: ${error.message}`,
      sourcePath: path
    })));
    return undefined;
  }
  return document.toJS() as unknown;
}

function readTextFile(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolvePath(baseDir: string, path: string): string {
  return isAbsolute(path) ? path : resolve(baseDir, path);
}

function isInsideWorkspace(path: string, workspaceRoot: string | undefined): boolean {
  return workspaceRoot ? isPathWithin(path, workspaceRoot) : true;
}

function isPathWithin(path: string, root: string): boolean {
  const absolutePath = resolve(path);
  const absoluteRoot = resolve(root);
  const relativePath = relative(absoluteRoot, absolutePath);
  return relativePath === "" || Boolean(relativePath && !relativePath.startsWith("..") && !isAbsolute(relativePath));
}
