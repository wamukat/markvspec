import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  grammarSectionDefinitions,
  grammarStructuredItemDefinitionsByContext,
  normalizeGrammarKey
} from "../packages/core/dist/grammar-definition.js";
import { parseMarkVSpec, renderDiagnosticMessageForLocale } from "../packages/core/dist/index.js";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const referenceFiles = [
  ...(await markdownFiles("docs/en/reference")),
  ...(await markdownFiles("docs/ja/reference"))
].sort();
const generatedBlockContexts = {
  "reference-actions": ["action.top-level", "action.process-detail"],
  "reference-elements": [
    "element.common-property",
    "element.tab-item.property",
    "element.accordion-item.property",
    "element.action-menu-item.property",
    "element.display-value-property",
    "element.display-value-metadata"
  ],
  "reference-rules": ["business-rule.property", "error-code.property"],
  "reference-validations": ["validation.property"]
};
const knownSectionTitles = new Set(grammarSectionDefinitions.map((definition) => definition.title));
const proseSectionTitles = new Set(["Notes", "Open Questions"]);
const failures = [];
const report = [];
let codeBlocksAudited = 0;
let generatedRowsAudited = 0;

for (const filePath of referenceFiles) {
  const absolutePath = join(rootDir, filePath);
  const source = await readFile(absolutePath, "utf8");

  auditGeneratedBlocks(source, filePath);

  for (const block of fencedCodeBlocks(source, filePath)) {
    const classification = classifyMarkVSpecBlock(block);
    if (classification.kind === "invalid") {
      failures.push(`${filePath}:${block.startLine} ${classification.message}`);
      continue;
    }
    if (classification.kind === "skip") {
      report.push(`${filePath}:${block.startLine} skipped ${classification.reason}`);
      continue;
    }
    if (classification.kind === "non-markvspec") {
      continue;
    }

    codeBlocksAudited += 1;
    report.push(`${filePath}:${block.startLine} vocabulary-audited`);
    auditSectionHeadings(block);
    const result = parseMarkVSpec(classification.content);
    for (const diagnostic of result.diagnostics) {
      if (!isVocabularyDiagnostic(diagnostic)) {
        continue;
      }
      const line = diagnostic.line ? `:${diagnostic.line}` : "";
      failures.push(`${filePath}:${block.startLine}${line} ${diagnostic.severity}: ${renderDiagnosticMessageForLocale(diagnostic, result.screen.locale)}`);
    }
  }
}

for (const line of report) {
  console.log(line);
}
console.log(`Reference vocabulary audit: code-blocks=${codeBlocksAudited}, generated-rows=${generatedRowsAudited}`);

if (failures.length > 0) {
  console.error(`Reference vocabulary audit failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

function auditGeneratedBlocks(source, filePath) {
  const pattern = /<!-- markvspec-generated:([^:]+):start -->([\s\S]*?)<!-- markvspec-generated:\1:end -->/gu;
  for (const match of source.matchAll(pattern)) {
    const marker = match[1];
    const startLine = lineForOffset(source, match.index ?? 0);
    if (marker === "reference-sections") {
      auditGeneratedSectionBlock(match[2], filePath, startLine);
      continue;
    }
    const contexts = generatedBlockContexts[marker];
    if (!contexts) {
      failures.push(`${filePath}:${startLine} unknown generated reference marker ${marker}`);
      continue;
    }
    const allowedKeys = new Set(
      [
        ...contexts,
        ...contexts.flatMap((context) =>
          (grammarStructuredItemDefinitionsByContext[context] ?? []).map((definition) => normalizeGrammarKey(definition.key))
        )
      ].map((key) => normalizeGrammarKey(key))
    );
    const block = match[2];
    for (const row of markdownTableRows(block)) {
      const item = row[0]?.trim();
      if (!item?.startsWith("`") || !item.endsWith("`")) {
        continue;
      }
      const key = normalizeGrammarKey(item.slice(1, -1));
      generatedRowsAudited += 1;
      if (!allowedKeys.has(key)) {
        failures.push(`${filePath}:${startLine} generated block ${marker} contains unknown grammar item \`${item.slice(1, -1)}\``);
      }
    }
  }
}

function auditGeneratedSectionBlock(block, filePath, startLine) {
  for (const row of markdownTableRows(block)) {
    const item = row[0]?.trim();
    if (!item?.startsWith("`## ") || !item.endsWith("`")) {
      continue;
    }
    generatedRowsAudited += 1;
    const title = item.slice(4, -1).split(":")[0].trim();
    if (!knownSectionTitles.has(title)) {
      failures.push(`${filePath}:${startLine} generated block reference-sections contains unknown section \`${item.slice(1, -1)}\``);
    }
  }
}

async function markdownFiles(rootRelativePath) {
  const rootPath = join(rootDir, rootRelativePath);
  const files = [];
  await collect(rootPath, files);
  return files.map((filePath) => relative(rootDir, filePath));
}

async function collect(directory, files) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collect(entryPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(entryPath);
    }
  }
}

function fencedCodeBlocks(source, filePath) {
  const lines = source.split(/\r?\n/u);
  const blocks = [];
  let current;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const opening = line.match(/^(\s*)```([^`]*)$/u);
    if (opening && !current) {
      current = {
        filePath,
        info: opening[2].trim(),
        startLine: index + 1,
        lines: []
      };
      continue;
    }
    if (current && /^(\s*)```\s*$/u.test(line)) {
      blocks.push({ ...current, content: current.lines.join("\n") });
      current = undefined;
      continue;
    }
    if (current) {
      current.lines.push(line);
    }
  }
  return blocks;
}

function classifyMarkVSpecBlock(block) {
  const tokens = block.info.split(/\s+/u).filter(Boolean);
  const language = tokens[0] ?? "";
  const has = (token) => tokens.includes(token);
  const attrs = Object.fromEntries(
    tokens
      .slice(1)
      .filter((token) => token.includes("="))
      .map((token) => {
        const [key, ...rest] = token.split("=");
        return [key, rest.join("=")];
      })
  );

  if (has("markvspec-skip")) {
    return { kind: "skip", reason: attrs.reason ?? "unspecified" };
  }
  if (has("markvspec-fragment")) {
    if (attrs.section === "screen" && !/^##\s+/mu.test(block.content)) {
      return { kind: "invalid", message: "section=screen fragments must contain an explicit ## section; use a narrower section=... or markvspec-skip reason=..." };
    }
    return { kind: "fragment", content: wrapFragment(block.content, attrs.section) };
  }
  if (has("markvspec")) {
    return { kind: "full", content: block.content };
  }
  if (language === "markdown" && looksLikeMarkVSpec(block.content)) {
    return { kind: "invalid", message: "MarkVSpec-like markdown fence must be marked before vocabulary audit" };
  }
  return { kind: "non-markvspec" };
}

function wrapFragment(content, section) {
  const body = content.trim();
  const hasSectionHeading = /^##\s+/mu.test(body);
  const sectionHeading = section === "elements"
    ? "Elements"
    : section === "business-rules"
      ? "Business Rules"
      : undefined;
  const wrappedBody = sectionHeading && !hasSectionHeading
    ? `## ${sectionHeading}\n\n${body}`
    : body;
  return `---\nid: SCR-REFERENCE-VOCABULARY-AUDIT\ntype: screen\ntitle: Reference Vocabulary Audit\nroute: /reference-vocabulary-audit\nlocale: en\n---\n# SCR-REFERENCE-VOCABULARY-AUDIT Reference Vocabulary Audit\n\n${wrappedBody}\n`;
}

function auditSectionHeadings(block) {
  const lines = block.content.split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^##\s+(.+?)\s*$/u);
    if (!match) {
      continue;
    }
    const title = match[1].split(":")[0].trim();
    if (!knownSectionTitles.has(title) && !proseSectionTitles.has(title)) {
      failures.push(`${block.filePath}:${block.startLine + index} unknown reference section heading \`## ${match[1]}\``);
    }
  }
}

function isVocabularyDiagnostic(diagnostic) {
  const message = diagnostic.message;
  return message.startsWith("Extension item in ")
    || message.startsWith("Unknown structured item in ")
    || message.includes("non-canonical");
}

function markdownTableRows(source) {
  return source
    .split(/\r?\n/u)
    .filter((line) => line.startsWith("|") && line.endsWith("|"))
    .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()))
    .filter((cells) => !cells.every((cell) => /^:?-{3,}:?$/u.test(cell)));
}

function looksLikeMarkVSpec(content) {
  return [
    /^---$/mu,
    /^id:\s*(SCR|TPL|PRT)-/mu,
    /^##\s+(States|Layout|Slot|Slots|Elements|Form Groups|Events|Actions|View Context|View Context Samples|Preview Scenarios|Field Validations|Cross-field Validations|Validations|Business Rules|Error Codes|History Fields|History)\b/mu,
    /^###\s+(SCR|L|P|E|A|R|V|F|ERR|TPL|PRT)-/mu,
    /^-\s+(label|text|action|target|Process P\d+:|case:|request:|state:)\b/mu
  ].some((pattern) => pattern.test(content));
}

function lineForOffset(source, offset) {
  return source.slice(0, offset).split(/\r?\n/u).length;
}
