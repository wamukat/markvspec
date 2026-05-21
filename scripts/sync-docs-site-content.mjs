import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const docsRoot = join(root, "docs");
const docsSiteRoot = join(root, "docs-site", "src", "content", "docs");
const languages = ["en", "ja"];
const checkOnly = process.argv.includes("--check");

function toPosixPath(filePath) {
  return filePath.split(/[\\/]/u).join("/");
}

function quoteYaml(value) {
  return JSON.stringify(value);
}

function isMarkdownFile(filePath) {
  return filePath.endsWith(".md");
}

function collectMarkdownFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "maintainers") {
        continue;
      }
      files.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && isMarkdownFile(entry.name)) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function collectSiteMarkdownFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSiteMarkdownFiles(fullPath));
    } else if (entry.isFile() && isMarkdownFile(entry.name)) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function siteRelativePathForSource(lang, sourcePath) {
  const relativePath = toPosixPath(relative(join(docsRoot, lang), sourcePath));
  if (relativePath === "README.md") {
    return "index.md";
  }
  return relativePath;
}

function siteUrlForDocsPath(targetPath) {
  const relativeToDocs = toPosixPath(relative(docsRoot, targetPath));
  const [lang, ...parts] = relativeToDocs.split("/");
  if (!languages.includes(lang)) {
    return null;
  }

  if (parts.length === 0 || parts[0] === "README.md") {
    return `/markvspec/${lang}/`;
  }

  const pathParts = [...parts];
  const last = pathParts[pathParts.length - 1];
  if (last === "index.md") {
    pathParts.pop();
  } else if (last?.endsWith(".md")) {
    pathParts[pathParts.length - 1] = last.slice(0, -3);
  }

  return `/markvspec/${lang}/${pathParts.join("/")}/`.replace(/\/{2,}/gu, "/");
}

function siteUrlForExamplesPath(targetPath) {
  const relativeToExamples = toPosixPath(relative(join(root, "examples"), targetPath));
  if (relativeToExamples.startsWith("../")) {
    return null;
  }
  return `/markvspec/examples/${relativeToExamples}`.replace(/\/{2,}/gu, "/");
}

function splitHref(rawHref) {
  const hashIndex = rawHref.indexOf("#");
  if (hashIndex === -1) {
    return { path: rawHref, hash: "" };
  }
  return { path: rawHref.slice(0, hashIndex), hash: rawHref.slice(hashIndex) };
}

function isExternalHref(href) {
  return /^(?:[a-z][a-z0-9+.-]*:|#|\/)/iu.test(href);
}

function convertHref(sourcePath, rawHref) {
  const { path: hrefPath, hash } = splitHref(rawHref);
  if (isExternalHref(rawHref) || hrefPath === "") {
    return rawHref;
  }

  const targetPath = resolve(dirname(sourcePath), hrefPath);
  const docsHref = siteUrlForDocsPath(targetPath);
  if (docsHref) {
    return `${docsHref}${hash}`;
  }

  const examplesHref = siteUrlForExamplesPath(targetPath);
  if (examplesHref) {
    return `${examplesHref}${hash}`;
  }

  return rawHref;
}

function convertLinks(sourcePath, markdown) {
  return markdown.replace(/(?<!!)\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu, (match, label, href) => {
    return `[${label}](${convertHref(sourcePath, href)})`;
  });
}

function extractTitle(markdown, sourcePath) {
  const lines = markdown.split("\n");
  const headingIndex = lines.findIndex((line) => /^#\s+\S/u.test(line));
  if (headingIndex === -1) {
    throw new Error(`Missing H1 heading in ${toPosixPath(relative(root, sourcePath))}`);
  }
  const title = lines[headingIndex].replace(/^#\s+/u, "").trim();
  const body = [...lines.slice(0, headingIndex), ...lines.slice(headingIndex + 1)].join("\n").replace(/^\n+/u, "");
  return { title, body };
}

function indexFrontmatter(lang, title) {
  if (lang === "ja") {
    return [
      "---",
      `title: ${quoteYaml(title)}`,
      `description: ${quoteYaml("MarkVSpec 日本語ドキュメント")}`,
      "template: splash",
      "hero:",
      `  title: ${quoteYaml("MarkVSpec")}`,
      `  tagline: ${quoteYaml("Markdown で UI 仕様を書き、VS Code でプレビューし、HTML / PDF に出力します。")}`,
      "  actions:",
      `    - text: ${quoteYaml("はじめる")}`,
      "      link: /markvspec/ja/start/",
      "      icon: right-arrow",
      "      variant: primary",
      "---",
      "",
      "",
    ].join("\n");
  }

  return [
    "---",
    `title: ${quoteYaml(title)}`,
    `description: ${quoteYaml("MarkVSpec documentation in English.")}`,
    "template: splash",
    "hero:",
    `  title: ${quoteYaml("MarkVSpec")}`,
    `  tagline: ${quoteYaml("Write UI specifications in Markdown, preview them in VS Code, and export HTML or PDF.")}`,
    "  actions:",
    `    - text: ${quoteYaml("Start")}`,
    "      link: /markvspec/en/start/",
    "      icon: right-arrow",
    "      variant: primary",
    "---",
    "",
    "",
  ].join("\n");
}

function pageFrontmatter(title) {
  return ["---", `title: ${quoteYaml(title)}`, "---", "", ""].join("\n");
}

function renderSiteMarkdown(lang, sourcePath) {
  const source = readFileSync(sourcePath, "utf8");
  const { title, body } = extractTitle(source, sourcePath);
  const relativePath = siteRelativePathForSource(lang, sourcePath);
  const frontmatter = relativePath === "index.md" ? indexFrontmatter(lang, title) : pageFrontmatter(title);
  return `${frontmatter}${convertLinks(sourcePath, body).trimEnd()}\n`;
}

function buildGeneratedFiles() {
  const generated = new Map();
  for (const lang of languages) {
    const sourceRoot = join(docsRoot, lang);
    for (const sourcePath of collectMarkdownFiles(sourceRoot)) {
      const relativePath = siteRelativePathForSource(lang, sourcePath);
      generated.set(`${lang}/${relativePath}`, renderSiteMarkdown(lang, sourcePath));
    }
  }
  return generated;
}

function readCurrentSiteFiles() {
  const current = new Map();
  for (const lang of languages) {
    const langRoot = join(docsSiteRoot, lang);
    for (const filePath of collectSiteMarkdownFiles(langRoot)) {
      current.set(`${lang}/${toPosixPath(relative(langRoot, filePath))}`, readFileSync(filePath, "utf8"));
    }
  }
  return current;
}

function checkDrift(generated, current) {
  const issues = [];
  for (const key of [...generated.keys()].sort((a, b) => a.localeCompare(b))) {
    if (!current.has(key)) {
      issues.push(`missing: docs-site/src/content/docs/${key}`);
    } else if (current.get(key) !== generated.get(key)) {
      issues.push(`changed: docs-site/src/content/docs/${key}`);
    }
  }
  for (const key of [...current.keys()].sort((a, b) => a.localeCompare(b))) {
    if (!generated.has(key)) {
      issues.push(`stale: docs-site/src/content/docs/${key}`);
    }
  }
  return issues;
}

function writeGeneratedFiles(generated) {
  for (const lang of languages) {
    rmSync(join(docsSiteRoot, lang), { recursive: true, force: true });
  }

  for (const [relativePath, content] of generated) {
    const outputPath = join(docsSiteRoot, relativePath);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, content);
  }
}

const generated = buildGeneratedFiles();

if (checkOnly) {
  const issues = checkDrift(generated, readCurrentSiteFiles());
  if (issues.length > 0) {
    console.error("docs-site content is out of sync with docs/.");
    console.error(issues.map((issue) => `- ${issue}`).join("\n"));
    console.error("Run `npm run sync:docs-site` and commit the generated docs-site changes.");
    process.exit(1);
  }
  console.log(`docs-site content is in sync with docs/ (${generated.size} files).`);
} else {
  writeGeneratedFiles(generated);
  console.log(`Synced ${generated.size} files from docs/ to docs-site/src/content/docs/.`);
}
