export type AiInputDocumentKind =
  | "requirements"
  | "existing-specification"
  | "meeting-notes"
  | "api-contract"
  | "data-model"
  | "business-rules"
  | "ui-flow"
  | "unknown";

export type AiInputReadinessLevel = "ready" | "needs-clarification" | "high-risk";

export type AiInputDiagnosticSeverity = "info" | "warning" | "error";

export interface AiInputDiagnosticAxis {
  id: string;
  label: string;
  score: number;
  status: AiInputReadinessLevel;
  description: string;
  evidence: string[];
  missing: string[];
}

export interface AiInputDiagnosticFinding {
  severity: AiInputDiagnosticSeverity;
  axisId: string;
  message: string;
  evidence?: string;
  recommendation: string;
}

export interface AiInputDiagnosticQuestion {
  axisId: string;
  question: string;
  rationale: string;
}

export interface AiInputDiagnosticReport {
  schemaVersion: "ai-input-diagnostics/v1";
  sourcePath?: string;
  documentKind: AiInputDocumentKind;
  readinessScore: number;
  readinessLevel: AiInputReadinessLevel;
  supportedDocumentKinds: Array<{ kind: AiInputDocumentKind; description: string }>;
  axes: AiInputDiagnosticAxis[];
  findings: AiInputDiagnosticFinding[];
  missingInformation: string[];
  questions: AiInputDiagnosticQuestion[];
}

interface AxisDefinition {
  id: string;
  label: string;
  description: string;
  requiredSignals: SignalDefinition[];
  question: string;
}

interface SignalDefinition {
  label: string;
  patterns: RegExp[];
}

interface DocumentProfile {
  headings: string[];
  lines: string[];
  normalized: string;
}

export const AI_INPUT_SUPPORTED_DOCUMENT_KINDS: AiInputDiagnosticReport["supportedDocumentKinds"] = [
  { kind: "requirements", description: "目的、スコープ、機能要件、非機能要件、制約を含む要件定義。" },
  { kind: "existing-specification", description: "既存画面、既存業務、既存システム仕様の説明。" },
  { kind: "meeting-notes", description: "議事録、ヒアリングメモ、決定事項と未決事項の記録。" },
  { kind: "api-contract", description: "API、外部連携、入出力、エラー、認証認可の契約。" },
  { kind: "data-model", description: "DB、エンティティ、項目定義、状態、整合性制約。" },
  { kind: "business-rules", description: "業務ルール、例外、境界条件、権限、状態遷移。" },
  { kind: "ui-flow", description: "利用者、画面、操作、業務フロー、エラー回復の説明。" },
  { kind: "unknown", description: "種別を推定できない入力文書。" }
];

const AXES: AxisDefinition[] = [
  {
    id: "goal-scope",
    label: "目的・スコープ",
    description: "AI が設計判断の境界を誤らないための目的、対象範囲、対象外範囲。",
    requiredSignals: [
      signal("目的", /目的|ゴール|背景|課題|ねらい|purpose|goal|objective|background/iu),
      signal("スコープ", /スコープ|対象範囲|対象\b|対象機能|範囲|scope|in\s+scope/iu),
      signal("非スコープ", /非スコープ|対象外|やらないこと|除外|out\s+of\s+scope|not\s+in\s+scope/iu)
    ],
    question: "この設計で達成すべき目的、対象範囲、明示的に対象外にする範囲は何ですか。"
  },
  {
    id: "users-flow",
    label: "利用者・シナリオ・業務フロー",
    description: "利用者、利用場面、業務手順、成功/失敗時の流れ。",
    requiredSignals: [
      signal("利用者", /ユーザー|利用者|顧客|管理者|担当者|ロール|ペルソナ|user|actor|role|persona/iu),
      signal("シナリオ", /シナリオ|ユースケース|利用場面|操作|ジャーニー|scenario|use\s*case|journey/iu),
      signal("業務フロー", /業務フロー|フロー|手順|ワークフロー|画面遷移|状態遷移|flow|workflow|steps?|transition/iu)
    ],
    question: "主な利用者、代表的な利用シナリオ、業務フローの開始条件と終了条件は何ですか。"
  },
  {
    id: "requirements",
    label: "機能・非機能要件",
    description: "設計後に検証できる粒度の機能要件、非機能要件、受け入れ条件。",
    requiredSignals: [
      signal("機能要件", /機能要件|要件|できること|必須機能|受け入れ条件|functional\s+requirements?|requirements?/iu),
      signal("非機能要件", /非機能|性能|可用性|セキュリティ|運用|監査|アクセシビリティ|non\s*functional|performance|availability|security|operation|accessibility/iu),
      signal("検証条件", /検証|テスト|受け入れ|完了条件|成功条件|判定|acceptance|criteria|test|verification|done/iu)
    ],
    question: "機能要件と非機能要件は何で、それぞれどの条件を満たせば完了と判断できますか。"
  },
  {
    id: "domain-ambiguity",
    label: "用語・状態・権限・例外",
    description: "曖昧な用語、未定義の状態、権限、例外、境界条件の有無。",
    requiredSignals: [
      signal("用語", /用語|定義|語彙|ドメイン|エンティティ|terms?|definition|glossary|domain|entity/iu),
      signal("状態", /状態|ステータス|state|status|遷移/iu),
      signal("権限と例外", /権限|認可|ロール|例外|エラー|境界条件|制限|permission|authorization|role|error|exception|boundary/iu)
    ],
    question: "設計判断に必要な用語、状態、権限、例外、境界条件の定義はどこにありますか。"
  },
  {
    id: "dependencies",
    label: "既存システム・API・DB・外部制約",
    description: "既存資産、API、DB、外部連携、運用/技術制約への参照。",
    requiredSignals: [
      signal("既存システム", /既存|現行|legacy|移行|互換|existing|current/iu),
      signal("API/DB", /API|エンドポイント|DB|データベース|テーブル|スキーマ|外部連携|database|table|schema|integration/iu),
      signal("制約", /制約|前提|依存|制限|SLA|レギュレーション|規約|constraints?|assumptions?|dependency|limitation/iu)
    ],
    question: "参照すべき既存システム、API、DB、外部連携、技術/運用制約は何ですか。"
  },
  {
    id: "decisions-open-issues",
    label: "決定事項・未決事項・矛盾",
    description: "決定済み事項、未決事項、古い情報、矛盾、重複の分離。",
    requiredSignals: [
      signal("決定事項", /決定事項|決定済み|決まっている|合意|採用|decisions?|decided|agreed|adopted/iu),
      signal("未決事項", /未決|確認事項|TODO|TBD|要確認|未定|open questions?|open issue/iu),
      signal("更新情報", /更新日|版|履歴|変更履歴|最終更新|obsolete|古い|change history|updated|revision|version/iu)
    ],
    question: "決定済みの事項と、設計前に確認が必要な未決事項を分けて列挙してください。"
  }
];

const AMBIGUOUS_PATTERNS = [
  /適宜/iu,
  /いい感じ/iu,
  /など/iu,
  /必要に応じて/iu,
  /基本的に/iu,
  /できるだけ/iu,
  /なるべく/iu,
  /TBD|TODO|未定|要確認/iu
];

const UNRESOLVED_EVIDENCE_PATTERN = /TBD|TODO|未定|要確認|未決/iu;

export function diagnoseAiDesignInputDocument(source: string, options: { sourcePath?: string } = {}): AiInputDiagnosticReport {
  const profile = createDocumentProfile(source);
  const axes = AXES.map((axis) => evaluateAxis(axis, profile));
  const findings = buildFindings(axes, profile);
  const readinessScore = Math.round(axes.reduce((sum, axis) => sum + axis.score, 0) / axes.length);
  const missingInformation = axes.flatMap((axis) => axis.missing.map((item) => `${axis.label}: ${item}`));
  const readinessLevel = readinessLevelForScore(readinessScore, findings);
  return {
    schemaVersion: "ai-input-diagnostics/v1",
    sourcePath: options.sourcePath,
    documentKind: inferDocumentKind(profile),
    readinessScore,
    readinessLevel,
    supportedDocumentKinds: AI_INPUT_SUPPORTED_DOCUMENT_KINDS,
    axes,
    findings,
    missingInformation,
    questions: axes
      .filter((axis) => axis.status !== "ready")
      .map((axis) => ({
        axisId: axis.id,
        question: AXES.find((definition) => definition.id === axis.id)?.question ?? `${axis.label} の不足情報を補足してください。`,
        rationale: axis.missing.length > 0 ? `不足: ${axis.missing.join(", ")}` : "AI が設計判断に使う根拠が不足しています。"
      }))
  };
}

function signal(label: string, ...patterns: RegExp[]): SignalDefinition {
  return { label, patterns };
}

function createDocumentProfile(source: string): DocumentProfile {
  const lines = source.split(/\r?\n/);
  return {
    headings: lines
      .map((line) => line.match(/^#{1,6}\s+(.+?)\s*#*$/u)?.[1]?.trim())
      .filter((line): line is string => Boolean(line)),
    lines,
    normalized: source
  };
}

function evaluateAxis(axis: AxisDefinition, profile: DocumentProfile): AiInputDiagnosticAxis {
  const evidence: string[] = [];
  const missing: string[] = [];
  for (const requiredSignal of axis.requiredSignals) {
    const match = findSignalEvidence(requiredSignal, profile);
    if (match) {
      evidence.push(`${requiredSignal.label}: ${match}`);
    } else {
      missing.push(requiredSignal.label);
    }
  }
  const score = Math.round((evidence.length / axis.requiredSignals.length) * 100);
  return {
    id: axis.id,
    label: axis.label,
    score,
    status: readinessLevelForAxisScore(score),
    description: axis.description,
    evidence,
    missing
  };
}

function findSignalEvidence(signalDefinition: SignalDefinition, profile: DocumentProfile): string | undefined {
  const heading = profile.headings.find((candidate) => !UNRESOLVED_EVIDENCE_PATTERN.test(candidate) && signalDefinition.patterns.some((pattern) => pattern.test(candidate)));
  if (heading) {
    return `heading "${heading}"`;
  }
  const line = profile.lines.find((candidate) => !UNRESOLVED_EVIDENCE_PATTERN.test(candidate) && signalDefinition.patterns.some((pattern) => pattern.test(candidate)));
  return line?.trim();
}

function buildFindings(axes: AiInputDiagnosticAxis[], profile: DocumentProfile): AiInputDiagnosticFinding[] {
  const findings: AiInputDiagnosticFinding[] = [];
  for (const axis of axes) {
    if (axis.status !== "ready") {
      findings.push({
        severity: axis.status === "high-risk" ? "error" : "warning",
        axisId: axis.id,
        message: `${axis.label} の情報が不足しています。`,
        evidence: axis.evidence.join("; ") || undefined,
        recommendation: `${axis.missing.join("、")} を追記してください。`
      });
    }
  }

  const ambiguousLines = profile.lines
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter((item) => item.line.length > 0 && AMBIGUOUS_PATTERNS.some((pattern) => pattern.test(item.line)))
    .slice(0, 5);
  for (const item of ambiguousLines) {
    findings.push({
      severity: "warning",
      axisId: "domain-ambiguity",
      message: "AI が解釈を誤りやすい曖昧表現があります。",
      evidence: `line ${item.lineNumber}: ${item.line}`,
      recommendation: "判断基準、対象、例外、具体例を補足してください。"
    });
  }

  const duplicateHeadings = duplicateValues(profile.headings.map((heading) => heading.toLocaleLowerCase()));
  for (const heading of duplicateHeadings.slice(0, 3)) {
    findings.push({
      severity: "info",
      axisId: "decisions-open-issues",
      message: `同名見出し "${heading}" が複数あります。`,
      recommendation: "重複が意図的でない場合は、章を統合するか見出しを具体化してください。"
    });
  }

  return findings;
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    }
    seen.add(value);
  }
  return Array.from(duplicates);
}

function inferDocumentKind(profile: DocumentProfile): AiInputDocumentKind {
  const candidates: Array<{ kind: AiInputDocumentKind; patterns: RegExp[] }> = [
    { kind: "requirements", patterns: [/要件|requirements|受け入れ条件|非機能/iu] },
    { kind: "api-contract", patterns: [/API|エンドポイント|request|response|OpenAPI/iu] },
    { kind: "data-model", patterns: [/DB|データベース|テーブル|エンティティ|スキーマ/iu] },
    { kind: "business-rules", patterns: [/業務ルール|ルール|例外|権限|境界条件/iu] },
    { kind: "ui-flow", patterns: [/画面|UI|フロー|ユーザー|シナリオ|遷移/iu] },
    { kind: "meeting-notes", patterns: [/議事録|メモ|決定事項|未決|TODO/iu] },
    { kind: "existing-specification", patterns: [/既存|現行|仕様|設計書/iu] }
  ];
  const text = [...profile.headings, profile.normalized].join("\n");
  return candidates.find((candidate) => candidate.patterns.some((pattern) => pattern.test(text)))?.kind ?? "unknown";
}

function readinessLevelForAxisScore(score: number): AiInputReadinessLevel {
  if (score >= 67) {
    return "ready";
  }
  if (score >= 34) {
    return "needs-clarification";
  }
  return "high-risk";
}

function readinessLevelForScore(score: number, findings: AiInputDiagnosticFinding[]): AiInputReadinessLevel {
  if (findings.some((finding) => finding.severity === "error") || score < 50) {
    return "high-risk";
  }
  if (score < 80 || findings.some((finding) => finding.severity === "warning")) {
    return "needs-clarification";
  }
  return "ready";
}
