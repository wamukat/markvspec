import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  grammarSectionDefinitions,
  grammarSectionOrderText,
  grammarStructuredItemDefinitionsByContext
} from "../packages/core/dist/grammar-definition.js";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const check = process.argv.includes("--check");

const targets = [
  { locale: "en", path: "docs/en/reference/actions.md", markers: ["reference-actions"] },
  { locale: "ja", path: "docs/ja/reference/actions.md", markers: ["reference-actions"] },
  { locale: "en", path: "docs/en/reference/elements.md", markers: ["reference-elements"] },
  { locale: "ja", path: "docs/ja/reference/elements.md", markers: ["reference-elements"] },
  { locale: "en", path: "docs/en/reference/sections.md", markers: ["reference-sections"] },
  { locale: "ja", path: "docs/ja/reference/sections.md", markers: ["reference-sections"] },
  { locale: "en", path: "docs/en/reference/validations.md", markers: ["reference-validations"] },
  { locale: "ja", path: "docs/ja/reference/validations.md", markers: ["reference-validations"] },
  { locale: "en", path: "docs/en/reference/rules.md", markers: ["reference-rules"] },
  { locale: "ja", path: "docs/ja/reference/rules.md", markers: ["reference-rules"] },
  { locale: "en", path: "docs-site/src/content/docs/en/reference/actions.md", markers: ["reference-actions"] },
  { locale: "ja", path: "docs-site/src/content/docs/ja/reference/actions.md", markers: ["reference-actions"] },
  { locale: "en", path: "docs-site/src/content/docs/en/reference/elements.md", markers: ["reference-elements"] },
  { locale: "ja", path: "docs-site/src/content/docs/ja/reference/elements.md", markers: ["reference-elements"] },
  { locale: "en", path: "docs-site/src/content/docs/en/reference/sections.md", markers: ["reference-sections"] },
  { locale: "ja", path: "docs-site/src/content/docs/ja/reference/sections.md", markers: ["reference-sections"] },
  { locale: "en", path: "docs-site/src/content/docs/en/reference/validations.md", markers: ["reference-validations"] },
  { locale: "ja", path: "docs-site/src/content/docs/ja/reference/validations.md", markers: ["reference-validations"] },
  { locale: "en", path: "docs-site/src/content/docs/en/reference/rules.md", markers: ["reference-rules"] },
  { locale: "ja", path: "docs-site/src/content/docs/ja/reference/rules.md", markers: ["reference-rules"] }
];

const renderers = {
  "reference-actions": renderActions,
  "reference-elements": renderElements,
  "reference-sections": renderSections,
  "reference-validations": renderValidations,
  "reference-rules": renderRules
};

const mismatches = [];
for (const target of targets) {
  const absolutePath = join(rootDir, target.path);
  const current = readFileSync(absolutePath, "utf8");
  const next = target.markers.reduce((content, marker) => {
    return replaceGeneratedBlock(content, marker, renderers[marker](target.locale === "ja"));
  }, current);

  if (check) {
    if (current !== next) {
      mismatches.push(target.path);
    }
    continue;
  }

  writeFileSync(absolutePath, next);
}

if (mismatches.length > 0) {
  console.error(`Reference docs are not generated from the current grammar definition:\n${mismatches.map((path) => `- ${path}`).join("\n")}`);
  process.exit(1);
}

function replaceGeneratedBlock(content, marker, generated) {
  const start = `<!-- markvspec-generated:${marker}:start -->`;
  const end = `<!-- markvspec-generated:${marker}:end -->`;
  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`, "u");
  if (!pattern.test(content)) {
    throw new Error(`Missing generated block markers for ${marker}`);
  }
  return content.replace(pattern, `${start}\n${generated.trim()}\n${end}`);
}

function renderActions(ja) {
  return `${generatedNotice(ja)}

${ja ? "#### Action 直下の structured item" : "#### Action Top-Level Structured Items"}

${itemTable(grammarStructuredItemDefinitionsByContext["action.top-level"], ja)}

${ja ? "#### Process 配下の structured item" : "#### Process Structured Items"}

${itemTable(grammarStructuredItemDefinitionsByContext["action.process-detail"], ja)}`;
}

function renderElements(ja) {
  return `${generatedNotice(ja)}

${itemTable(grammarStructuredItemDefinitionsByContext["element.common-property"], ja)}

${ja ? "Element type 固有の item property は以下の context で定義します。" : "Element type-specific item properties are defined by these contexts."}

${contextSummaryTable(
    [
      "element.tab-item.property",
      "element.accordion-item.property",
      "element.action-menu-item.property",
      "element.display-value-property",
      "element.display-value-metadata"
    ],
    ja
  )}`;
}

function renderSections(ja) {
  const rows = grammarSectionDefinitions.map((section) => [
    `\`## ${section.title}\``,
    `\`${section.heading.pattern}\``,
    String(section.order)
  ]);
  return `${generatedNotice(ja)}

${table(ja ? ["Section", "Heading pattern", "Order"] : ["Section", "Heading Pattern", "Order"], rows)}

${ja ? "推奨 section order:" : "Recommended section order:"} \`${grammarSectionOrderText}\`

${ja
    ? "`## Notes` と `## Open Questions` は structured render model に入る recognized section ではなく、手書き prose として扱います。"
    : "`## Notes` and `## Open Questions` are not recognized sections in the structured render model; they remain hand-written prose."}`;
}

function renderValidations(ja) {
  return `${generatedNotice(ja)}

${itemTable(grammarStructuredItemDefinitionsByContext["validation.property"], ja)}`;
}

function renderRules(ja) {
  return `${generatedNotice(ja)}

${ja ? "#### Business Rule property" : "#### Business Rule Properties"}

${itemTable(grammarStructuredItemDefinitionsByContext["business-rule.property"], ja)}

${ja ? "#### Error Code property" : "#### Error Code Properties"}

${itemTable(grammarStructuredItemDefinitionsByContext["error-code.property"], ja)}`;
}

function contextSummaryTable(contexts, ja) {
  return table(
    ja ? ["Context", "Keys"] : ["Context", "Keys"],
    contexts.map((context) => [
      `\`${context}\``,
      grammarStructuredItemDefinitionsByContext[context].map((definition) => `\`${definition.key}\``).join(", ")
    ])
  );
}

function itemTable(definitions, ja) {
  return table(
    ja ? ["Item", "分類", "出力", "診断", "説明"] : ["Item", "Classification", "Output", "Diagnostic", "Description"],
    definitions.map((definition) => [
      `\`${definition.key}\``,
      `\`${definition.classification}\``,
      definition.represented ? (ja ? "出力対象" : "represented") : (ja ? "出力対象外" : "not represented"),
      definition.diagnosticSeverity ? `\`${definition.diagnosticSeverity}\`` : "-",
      ja ? definition.description.ja : definition.description.en
    ])
  );
}

function table(headers, rows) {
  return [
    `| ${headers.map(tableCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(tableCell).join(" | ")} |`)
  ].join("\n");
}

function tableCell(value) {
  return String(value).replace(/\|/gu, "\\|");
}

function generatedNotice(ja) {
  return ja
    ? "この block は `packages/core/src/grammar-definition.ts` から生成されます。手編集せず、grammar definition を更新して再生成してください。"
    : "This block is generated from `packages/core/src/grammar-definition.ts`. Do not hand-edit it; update the grammar definition and regenerate the docs.";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
