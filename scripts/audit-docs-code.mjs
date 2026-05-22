import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { validateMarkVSpecFiles } from "../packages/exporter/dist/index.js";
import { renderDiagnosticMessageForLocale } from "../packages/core/dist/index.js";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const allowedSkipReasons = new Set([
  "non-markvspec",
  "noncanonical-example",
  "project-file-example",
  "requires-action-heading",
  "requires-action-definitions",
  "requires-actions-context",
  "requires-cross-section-context",
  "requires-element-definitions",
  "requires-elements-context",
  "requires-layout-context",
  "requires-partial-context",
  "requires-preview-context",
  "requires-preview-scenario-heading",
  "requires-preview-scenarios-context",
  "requires-rule-error-context",
  "requires-state-action-definitions",
  "requires-validation-context"
]);
const sectionHeadings = {
  "business-rules": "Business Rules",
  elements: "Elements",
  screen: undefined,
  states: "States",
  validations: "Field Validations"
};
const targetFiles = [
  "README.md",
  "README.ja.md",
  ...(await markdownFiles("docs/en")),
  ...(await markdownFiles("docs/ja"))
].sort();

const failures = [];
const stats = {
  validated: 0,
  fragmentValidated: 0,
  explicitSkip: 0,
  nonMarkVSpecSkip: 0
};
const report = [];
const tempDir = mkdtempSync(join(tmpdir(), "markvspec-docs-code-"));

try {
  const validations = [];

  for (const filePath of targetFiles) {
    const absolutePath = join(rootDir, filePath);
    const source = await readFile(absolutePath, "utf8");
    for (const block of fencedCodeBlocks(source, filePath)) {
      const classification = classifyBlock(block);
      if (classification.kind === "skip") {
        stats.explicitSkip += 1;
        report.push(`${filePath}:${block.startLine} explicit-skip ${classification.reason}`);
        continue;
      }
      if (classification.kind === "non-markvspec") {
        stats.nonMarkVSpecSkip += 1;
        report.push(`${filePath}:${block.startLine} non-MarkVSpec-skip ${classification.language || "-"}`);
        continue;
      }
      if (classification.kind === "invalid") {
        failures.push(`${filePath}:${block.startLine} ${classification.message}`);
        continue;
      }
      const tempPath = join(tempDir, safeTempName(filePath, block.startLine));
      writeFileSync(tempPath, classification.content, "utf8");
      validations.push({
        sourcePath: tempPath,
        displayPath: `${filePath}:${block.startLine}`,
        kind: classification.kind
      });
    }
  }

  for (const validation of validations) {
    const result = validateMarkVSpecFiles([validation.sourcePath], { failOnWarnings: true });
    if (validation.kind === "full") {
      stats.validated += 1;
      report.push(`${validation.displayPath} validated`);
    } else {
      stats.fragmentValidated += 1;
      report.push(`${validation.displayPath} fragment-validated`);
    }

    for (const file of result.files) {
      for (const diagnostic of file.diagnostics) {
        if (diagnostic.severity !== "error" && diagnostic.severity !== "warning") {
          continue;
        }
        const line = diagnostic.line ? `:${diagnostic.line}` : "";
        failures.push(`${validation.displayPath}${line} ${diagnostic.severity}: ${renderDiagnosticMessageForLocale(diagnostic, file.locale)}`);
      }
    }
  }

  for (const line of report) {
    console.log(line);
  }
  console.log(`Docs code audit: validated=${stats.validated}, fragment-validated=${stats.fragmentValidated}, explicit-skip=${stats.explicitSkip}, non-MarkVSpec-skip=${stats.nonMarkVSpecSkip}`);

  if (failures.length > 0) {
    console.error(`Docs code audit failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}

async function markdownFiles(rootRelativePath) {
  const rootPath = join(rootDir, rootRelativePath);
  const files = [];
  await collect(rootPath, files);
  return files
    .map((filePath) => relative(rootDir, filePath))
    .filter((filePath) => !filePath.includes("/maintainers/"));
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
  if (current) {
    failures.push(`${filePath}:${current.startLine} unclosed fenced code block`);
  }
  return blocks;
}

function classifyBlock(block) {
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
    const reason = attrs.reason;
    if (!reason) {
      return { kind: "invalid", message: "markvspec-skip requires reason=<specific-reason>" };
    }
    if (reason === "context") {
      return { kind: "invalid", message: "reason=context is too broad; use a specific skip reason" };
    }
    if (!allowedSkipReasons.has(reason)) {
      return { kind: "invalid", message: `unknown markvspec-skip reason: ${reason}` };
    }
    return { kind: "skip", reason };
  }

  if (has("markvspec-fragment")) {
    const section = attrs.section;
    if (!section) {
      return { kind: "invalid", message: "markvspec-fragment requires section=<context>" };
    }
    if (/^\s*---\s*$/mu.test(block.content)) {
      return { kind: "invalid", message: "markvspec-fragment must not contain front matter; use markvspec for full documents" };
    }
    if (!Object.hasOwn(sectionHeadings, section)) {
      return { kind: "invalid", message: `unsupported markvspec-fragment section: ${section}` };
    }
    return { kind: "fragment", content: wrapFragment(block.content, section) };
  }

  if (has("markvspec")) {
    return { kind: "full", content: block.content };
  }

  if (language === "markdown" && looksLikeMarkVSpec(block.content)) {
    return { kind: "invalid", message: "MarkVSpec-like markdown fence must use markvspec, markvspec-fragment section=..., or markvspec-skip reason=..." };
  }

  return { kind: "non-markvspec", language };
}

function wrapFragment(content, section) {
  const body = content.trim();
  const hasSectionHeading = /^##\s+/mu.test(body);
  const sectionHeading = sectionHeadings[section];
  const wrappedBody = section === "screen" || hasSectionHeading
    ? body
    : `## ${sectionHeading}\n\n${body}`;

  return `---\nid: SCR-DOCS-AUDIT\ntype: screen\ntitle: Docs Audit\nroute: /docs-audit\nlocale: en\n---\n# SCR-DOCS-AUDIT Docs Audit\n\n${wrappedBody}\n`;
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

function safeTempName(filePath, line) {
  return `${filePath.replace(/[^A-Za-z0-9_-]/gu, "_")}_${line}.vspec.md`;
}
