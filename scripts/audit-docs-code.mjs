#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const docsRoots = [
  "docs/en/reference",
  "docs/ja/reference",
  "docs/en/start",
  "docs/ja/start",
  "docs/en/guide",
  "docs/ja/guide",
  "docs/en/recipes",
  "docs/ja/recipes",
  "docs/en/examples",
  "docs/ja/examples",
  "docs/en/concepts",
  "docs/ja/concepts",
  "README.md",
  "README.ja.md",
];
const tempDir = join(root, ".work", "docs-code-audit");

function toPosixPath(filePath) {
  return filePath.split(/[\\/]/u).join("/");
}

function collectMarkdownFiles(dir) {
  const stat = statSync(dir);
  if (stat.isFile()) {
    return dir.endsWith(".md") ? [dir] : [];
  }
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

function lineNumberForOffset(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

function parseInfo(info) {
  const tokens = info.split(/\s+/u).filter(Boolean);
  const attributes = new Map();
  for (const token of tokens) {
    const match = /^([A-Za-z0-9_-]+)=([A-Za-z0-9_-]+)$/u.exec(token);
    if (match) {
      attributes.set(match[1], match[2]);
    }
  }
  return {
    tokens,
    attributes,
    isMarkVSpec: tokens.includes("markvspec") || tokens.includes("vspec"),
    isFragment: tokens.includes("markvspec-fragment"),
    isExplicitSkip: tokens.includes("markvspec-skip"),
  };
}

function sectionHeading(section) {
  switch (section) {
    case "actions":
      return "## Actions";
    case "business-rules":
      return "## Business Rules";
    case "elements":
      return "## Elements";
    case "events":
      return "## Events";
    case "field-validations":
      return "## Field Validations";
    case "form-groups":
      return "## Form Groups";
    case "layout":
      return "## Layout: mobile";
    case "preview-scenarios":
      return "## Preview Scenarios";
    case "states":
      return "## States";
    case "view-context":
      return "## View Context";
    default:
      throw new Error(`Unsupported markvspec-fragment section: ${section}`);
  }
}

function fragmentWrapper(body, section) {
  const trimmedBody = body.trimEnd();
  const fragment = section && !/^##\s/u.test(trimmedBody)
    ? `${sectionHeading(section)}\n\n${trimmedBody}`
    : trimmedBody;
  return `---
id: SCR-DOCS-CODE-AUDIT
type: screen
title: Docs Code Audit
route: /docs-code-audit
locale: en
---

# SCR-DOCS-CODE-AUDIT Docs Code Audit

${fragment}
`;
}

function writeAuditFile(rel, index, body) {
  const safeName = rel.replace(/[\\/]/gu, "__").replace(/[^A-Za-z0-9_.-]/gu, "_");
  const outputPath = join(tempDir, `${safeName}-${index}.vspec.md`);
  writeFileSync(outputPath, body.trimEnd() + "\n");
  return outputPath;
}

function rootForRel(rel) {
  return docsRoots.find((docsRoot) => rel === docsRoot || rel.startsWith(`${docsRoot}/`)) ?? "unknown";
}

function createRootStats() {
  return { total: 0, complete: 0, fragment: 0, explicitSkip: 0, otherSkip: 0 };
}

function main() {
  if (!existsSync(join(root, "packages/cli/dist/index.js"))) {
    throw new Error("Missing built CLI. Run `npm run build -w @markvspec/cli` before audit:docs-code.");
  }

  rmSync(tempDir, { recursive: true, force: true });
  mkdirSync(tempDir, { recursive: true });

  const files = docsRoots.flatMap((dir) => collectMarkdownFiles(join(root, dir)));
  const targets = [];
  const skipped = new Map();
  const explicitSkips = new Map();
  const explicitSkipDetails = [];
  const rootStats = new Map();
  const errors = [];

  for (const filePath of files) {
    const markdown = readFileSync(filePath, "utf8");
    const rel = toPosixPath(relative(root, filePath));
    const docsRoot = rootForRel(rel);
    const stats = rootStats.get(docsRoot) ?? createRootStats();
    rootStats.set(docsRoot, stats);
    for (const [index, block] of fencedBlocks(markdown).entries()) {
      stats.total += 1;
      const info = parseInfo(block.info);
      if (info.isFragment) {
        const section = info.attributes.get("section");
        if (!section && !/^##\s/u.test(block.body.trimStart())) {
          errors.push(
            `${rel}:${lineNumberForOffset(markdown, block.offset)} markvspec-fragment must include a top-level section or an explicit section=... wrapper`,
          );
          continue;
        }
        try {
          targets.push(writeAuditFile(rel, index, fragmentWrapper(block.body, section)));
          stats.fragment += 1;
        } catch (error) {
          errors.push(`${rel}:${lineNumberForOffset(markdown, block.offset)} ${error instanceof Error ? error.message : String(error)}`);
        }
        continue;
      }
      if (info.isMarkVSpec) {
        targets.push(writeAuditFile(rel, index, block.body));
        stats.complete += 1;
        continue;
      }
      if (info.isExplicitSkip) {
        const reason = info.attributes.get("reason") ?? "unspecified";
        if (reason === "context") {
          errors.push(
            `${rel}:${lineNumberForOffset(markdown, block.offset)} avoid generic markvspec-skip reason=context; use a specific reason such as requires-element-definitions or requires-preview-context`,
          );
        }
        explicitSkips.set(reason, (explicitSkips.get(reason) ?? 0) + 1);
        explicitSkipDetails.push(`${rel}:${lineNumberForOffset(markdown, block.offset)} ${reason}`);
        stats.explicitSkip += 1;
        continue;
      }

      const key = block.info || "plain";
      skipped.set(key, (skipped.get(key) ?? 0) + 1);
      stats.otherSkip += 1;
      if (block.info.includes("markvspec")) {
        errors.push(`${rel}:${lineNumberForOffset(markdown, block.offset)} unsupported MarkVSpec code fence info: ${block.info}`);
      }
    }
  }

  if (targets.length === 0) {
    errors.push("No MarkVSpec code blocks were marked for validation.");
  }

  if (errors.length === 0) {
    try {
      execFileSync("node", ["packages/cli/dist/index.js", "validate", "--fail-on-warnings", ...targets], {
        cwd: root,
        stdio: "pipe",
      });
    } catch (error) {
      errors.push(`Marked docs code validation failed:\n${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}`.trim());
    }
  }

  if (errors.length > 0) {
    console.error("Docs code audit failed.");
    console.error(errors.map((error) => `- ${error}`).join("\n"));
    process.exit(1);
  }

  console.log(`Docs code audit passed for ${targets.length} marked MarkVSpec code block(s) in ${files.length} file(s).`);
  for (const [docsRoot, stats] of [...rootStats.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(
      `${docsRoot}: total ${stats.total}, complete ${stats.complete}, fragment ${stats.fragment}, explicit skip ${stats.explicitSkip}, other skip ${stats.otherSkip}.`,
    );
  }
  const explicitSkipSummary = [...explicitSkips.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([reason, count]) => `${reason}: ${count}`)
    .join(", ");
  console.log(`Explicit MarkVSpec skips: ${explicitSkipSummary || "none"}.`);
  if (explicitSkipDetails.length > 0) {
    console.log("Explicit skip details:");
    for (const detail of explicitSkipDetails) {
      console.log(`- ${detail}`);
    }
  }
  const skippedSummary = [...skipped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([info, count]) => `${info}: ${count}`)
    .join(", ");
  console.log(`Skipped fences: ${skippedSummary || "none"}.`);
}

main();
