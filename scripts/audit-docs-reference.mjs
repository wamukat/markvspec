import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const referenceRoots = ["docs/en/reference", "docs/ja/reference"];
const tempDir = join(root, ".work", "docs-reference-audit");

function toPosixPath(filePath) {
  return filePath.split(/[\\/]/u).join("/");
}

function collectMarkdownFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function requireFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing required file: ${toPosixPath(relative(root, path))}`);
  }
  return readFileSync(path, "utf8");
}

function extractSectionNames() {
  const source = requireFile(join(root, "packages/core/src/markdown-section-ast.ts"));
  const names = new Set();
  for (const match of source.matchAll(/case\s+"([^"]+)":/gu)) {
    names.add(match[1]);
  }
  names.add("Layout");
  names.add("Layout: mobile");
  names.add("Slot: name");
  names.add("Slot: content");
  names.add("Notes");
  names.add("Open Questions");
  return names;
}

function extractElementTypes() {
  const source = requireFile(join(root, "packages/core/src/element-domain.ts"));
  return new Set([...source.matchAll(/\[\s*"([A-Za-z][A-Za-z0-9]*)"\s*,\s*elementDefinition/gu)].map((match) => match[1]));
}

function extractElementProperties() {
  const source = requireFile(join(root, "packages/core/src/element-domain.ts"));
  const properties = new Set();
  for (const match of source.matchAll(/"([^"]+)"/gu)) {
    const value = match[1];
    if (/^[a-z][a-z ]*(?:when|src|text|rule|value|rows|length)?$/u.test(value)) {
      properties.add(value);
    }
  }
  properties.add("columns");
  properties.add("sample rows");
  properties.add("options");
  properties.add("open when");
  properties.add("placement");
  return properties;
}

const implementation = {
  sections: extractSectionNames(),
  elementTypes: extractElementTypes(),
  elementProperties: extractElementProperties(),
  actionKeys: new Set([
    "From",
    "Process Pn:",
    "request",
    "server",
    "sync",
    "receive",
    "case:",
    "from",
    "display",
    "state",
    "navigate",
    "target",
    "partial",
    "message",
    "element",
    "content",
    "mode",
    "params",
    "response",
    "business rule",
  ]),
  validationKeys: new Set([
    "target",
    "constraints",
    "rules",
    "inputs",
    "check",
    "message",
    "messages",
    "required",
    "email",
    "min",
    "max",
    "length",
    "format",
  ]),
  ruleKeys: new Set(["when", "effect", "message", "appliesTo", "priority", "business rule", "error code", "display", "target"]),
};

function lineNumberForOffset(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

function normalizeSectionName(name) {
  if (/^Layout:/u.test(name)) {
    return "Layout: mobile";
  }
  if (/^Slot:/u.test(name)) {
    return name.includes("content") ? "Slot: content" : "Slot: name";
  }
  return name;
}

function fencedBlocks(markdown) {
  const blocks = [];
  const pattern = /```([^\n]*)\n([\s\S]*?)```/gu;
  for (const match of markdown.matchAll(pattern)) {
    blocks.push({
      info: match[1].trim(),
      body: match[2],
      offset: match.index ?? 0,
    });
  }
  return blocks;
}

function normalizeInlineCodeKey(value) {
  const stripped = value.trim().replace(/:$/u, "").replace(/\s+\.\.\.$/u, "");
  if (/^Process\s+Pn\b/u.test(stripped) || /^Process\s+P[0-9A-Za-z_-]+\b/u.test(stripped)) {
    return "Process Pn:";
  }
  if (/^case\b/u.test(stripped)) {
    return "case:";
  }
  if (/^business rule\b/u.test(stripped)) {
    return "business rule";
  }
  if (/^error code\b/u.test(stripped)) {
    return "error code";
  }
  return stripped.split(/\s+/u)[0].replace(/:$/u, "");
}

function codeSpans(value) {
  return [...value.matchAll(/`([^`]+)`/gu)].map((match) => match[1].trim());
}

function isCompleteVspecExample(block) {
  return /^markdown\b/u.test(block.info)
    && /^---\n[\s\S]*?\nid:\s*(?:SCR|PRJ|TPL|PRT)-/mu.test(block.body)
    && /\ntype:\s*(?:screen|project|template|partial)\b/u.test(block.body)
    && /\n#\s+(?:SCR|PRJ|TPL|PRT)-/u.test(block.body);
}

function auditReferenceFile(filePath, errors, stats) {
  const markdown = readFileSync(filePath, "utf8");
  const rel = toPosixPath(relative(root, filePath));

  for (const match of markdown.matchAll(/`##\s+([^`]+?)`/gu)) {
    const section = normalizeSectionName(match[1].trim());
    if (!implementation.sections.has(section)) {
      errors.push(`${rel}:${lineNumberForOffset(markdown, match.index ?? 0)} unknown documented section ## ${match[1].trim()}`);
    }
    stats.sectionMentions += 1;
  }

  for (const match of markdown.matchAll(/###\s+(?:[0-9A-Za-z-]+:)?(E-[^\s`]+)\s+([A-Za-z][A-Za-z0-9]*)/gu)) {
    const id = match[1];
    const type = match[2];
    if (id === "E-*" || type === "Type") {
      continue;
    }
    if (!implementation.elementTypes.has(type)) {
      errors.push(`${rel}:${lineNumberForOffset(markdown, match.index ?? 0)} unknown documented element type ${type}`);
    }
    stats.elementTypeMentions += 1;
  }

  if (rel.endsWith("/elements.md")) {
    let inPropertyTable = false;
    for (const line of markdown.split("\n")) {
      if (/^\|\s*(?:Property|項目)\s*\|/u.test(line)) {
        inPropertyTable = true;
        continue;
      }
      if (inPropertyTable && !line.startsWith("|")) {
        inPropertyTable = false;
      }
      if (!inPropertyTable) {
        continue;
      }
      const match = /^\|\s*`([^`]+)`\s*\|/u.exec(line);
      if (!match) {
        continue;
      }
      for (const prop of match[1].split("/").map((value) => value.trim())) {
        const normalized = prop.replace(/^`|`$/gu, "");
        if (!implementation.elementProperties.has(normalized)) {
          errors.push(`${rel}: property table documents unsupported element property ${normalized}`);
        }
        stats.elementPropertyMentions += 1;
      }
    }
  }

  if (rel.endsWith("/actions.md")) {
    let inActionBlocksTable = false;
    for (const line of markdown.split("\n")) {
      if (/^\|\s*(?:Block|ブロック)\s*\|/u.test(line)) {
        inActionBlocksTable = true;
        continue;
      }
      if (inActionBlocksTable && !line.startsWith("|")) {
        inActionBlocksTable = false;
      }
      if (!inActionBlocksTable) {
        continue;
      }
      for (const value of codeSpans(line.split("|")[1] ?? "")) {
        for (const part of value.split("/").map((item) => item.trim())) {
          const key = normalizeInlineCodeKey(part);
          if (!implementation.actionKeys.has(key)) {
            errors.push(`${rel}: action block table documents unsupported action key ${part}`);
          }
          stats.actionMentions += 1;
        }
      }
    }

    for (const block of fencedBlocks(markdown).filter((item) => /^markdown\b/u.test(item.info))) {
      for (const match of block.body.matchAll(/^(\s*)-\s+([A-Za-z][A-Za-z0-9 -]*(?:\s+P[0-9A-Za-z_-]+)?|case):/gmu)) {
        const indent = match[1].length;
        const rawKey = match[2];
        if (indent >= 6 && !implementation.actionKeys.has(normalizeInlineCodeKey(rawKey))) {
          continue;
        }
        const key = normalizeInlineCodeKey(rawKey);
        if (!implementation.actionKeys.has(key)) {
          errors.push(`${rel}:${lineNumberForOffset(markdown, block.offset)} unsupported action snippet key ${rawKey}`);
        }
        stats.actionMentions += 1;
      }
    }
  }

  if (rel.endsWith("/validations.md")) {
    for (const match of markdown.matchAll(/`([^`]+)`/gu)) {
      const value = match[1].trim().replace(/:$/u, "");
      if (!implementation.validationKeys.has(value)) {
        continue;
      }
      stats.validationMentions += 1;
    }
  }

  if (rel.endsWith("/rules.md")) {
    let inRulePropertiesTable = false;
    for (const line of markdown.split("\n")) {
      if (/^\|\s*(?:Property|項目)\s*\|/u.test(line)) {
        inRulePropertiesTable = true;
        continue;
      }
      if (inRulePropertiesTable && !line.startsWith("|")) {
        inRulePropertiesTable = false;
      }
      if (!inRulePropertiesTable) {
        continue;
      }
      for (const value of codeSpans(line.split("|")[1] ?? "")) {
        const key = normalizeInlineCodeKey(value);
        if (!implementation.ruleKeys.has(key)) {
          errors.push(`${rel}: rule property table documents unsupported rule key ${value}`);
        }
        stats.ruleMentions += 1;
      }
    }

    for (const block of fencedBlocks(markdown).filter((item) => /^markdown\b/u.test(item.info))) {
      for (const match of block.body.matchAll(/^(\s*)-\s+([A-Za-z][A-Za-z0-9 -]*):/gmu)) {
        const indent = match[1].length;
        const rawKey = match[2];
        if (indent >= 6 && !implementation.ruleKeys.has(normalizeInlineCodeKey(rawKey))) {
          continue;
        }
        const key = normalizeInlineCodeKey(rawKey);
        if (implementation.actionKeys.has(key)) {
          stats.actionMentions += 1;
          continue;
        }
        if (!implementation.ruleKeys.has(key)) {
          errors.push(`${rel}:${lineNumberForOffset(markdown, block.offset)} unsupported rule snippet key ${rawKey}`);
        }
        stats.ruleMentions += 1;
      }
    }
  }

  for (const block of fencedBlocks(markdown)) {
    if (isCompleteVspecExample(block)) {
      const outputPath = join(tempDir, `${rel.replace(/[\\/]/gu, "__")}-${stats.completeExamples}.vspec.md`);
      writeFileSync(outputPath, block.body.trimEnd() + "\n");
      stats.completeExamplePaths.push(outputPath);
      stats.completeExamples += 1;
    } else if (/^markdown\b/u.test(block.info)) {
      stats.fragmentExamples += 1;
    }
  }
}

function validateCompleteExamples(paths) {
  if (paths.length === 0) {
    return;
  }
  execFileSync("node", ["packages/cli/dist/index.js", "validate", ...paths], {
    cwd: root,
    stdio: "pipe",
  });
}

function main() {
  const errors = [];
  const stats = {
    sectionMentions: 0,
    elementTypeMentions: 0,
    elementPropertyMentions: 0,
    actionMentions: 0,
    validationMentions: 0,
    ruleMentions: 0,
    completeExamples: 0,
    fragmentExamples: 0,
    completeExamplePaths: [],
  };

  rmSync(tempDir, { recursive: true, force: true });
  mkdirSync(tempDir, { recursive: true });

  const files = referenceRoots.flatMap((dir) => collectMarkdownFiles(join(root, dir)));
  for (const file of files) {
    auditReferenceFile(file, errors, stats);
  }

  try {
    validateCompleteExamples(stats.completeExamplePaths);
  } catch (error) {
    errors.push(`complete .vspec.md reference example validation failed:\n${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}`.trim());
  }

  if (errors.length > 0) {
    console.error("Reference documentation audit failed.");
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exit(1);
  }

  console.log(`Reference documentation audit passed for ${files.length} files.`);
  console.log(`Sections: ${stats.sectionMentions}, element types: ${stats.elementTypeMentions}, element properties: ${stats.elementPropertyMentions}.`);
  console.log(`Action mentions: ${stats.actionMentions}, validation mentions: ${stats.validationMentions}, rule mentions: ${stats.ruleMentions}.`);
  console.log(`Code blocks: ${stats.completeExamples} complete .vspec.md example(s), ${stats.fragmentExamples} fragment example(s).`);
}

main();
