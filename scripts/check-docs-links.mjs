import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { loadExampleCatalog, validateExampleCatalog } from "./example-catalog.mjs";

const root = process.cwd();
const docsRoot = join(root, "docs");
const docsSiteContentRoot = join(root, "docs-site", "src", "content", "docs");
const docsSitePublicRoot = join(root, "docs-site", "public");
const examplesRoot = join(root, "examples");
const base = "/markvspec";
const failures = [];

const docsMarkdownFiles = collectFiles(docsRoot, (filePath) => filePath.endsWith(".md"));
const docsSiteMarkdownFiles = collectFiles(docsSiteContentRoot, (filePath) => filePath.endsWith(".md"));
const exampleFiles = collectFiles(examplesRoot, (filePath) => filePath.endsWith(".vspec.md"));
const showcaseSlugs = new Set(exampleFiles.map((filePath) => basenameWithoutVspec(filePath)));

const catalog = loadExampleCatalog(root);
const { errors: catalogErrors, warnings: catalogWarnings } = validateExampleCatalog(catalog, { root, exampleFiles });
for (const error of catalogErrors) {
  failures.push(`examples/catalog.yml: ${error}`);
}
for (const warning of catalogWarnings) {
  console.warn(`examples/catalog.yml warning: ${warning}`);
}

for (const filePath of docsMarkdownFiles) {
  checkDocsSourceLinks(filePath);
}

for (const filePath of docsSiteMarkdownFiles) {
  checkDocsSiteAbsoluteLinks(filePath);
}

if (failures.length > 0) {
  console.error("Docs link check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Docs link check passed (${docsMarkdownFiles.length} docs files, ${catalog.examples.length} catalog entries).`);

function checkDocsSourceLinks(filePath) {
  const markdown = readFileSync(filePath, "utf8");
  for (const link of markdownLinks(markdown)) {
    if (isIgnoredHref(link.href)) {
      continue;
    }
    if (link.href.startsWith("/")) {
      failures.push(`${repoPath(filePath)} links to absolute path in docs source: ${link.href}`);
      continue;
    }
    const target = resolveMarkdownSourceTarget(filePath, link.href);
    if (!target.exists) {
      failures.push(`${repoPath(filePath)} links to missing target: ${link.href}`);
    }
  }
}

function checkDocsSiteAbsoluteLinks(filePath) {
  const markdown = readFileSync(filePath, "utf8");
  for (const link of markdownLinks(markdown)) {
    if (!link.href.startsWith(base)) {
      continue;
    }
    const target = resolveSiteTarget(link.href);
    if (!target.exists) {
      failures.push(`${repoPath(filePath)} links to missing site target: ${link.href}`);
    }
  }
}

function resolveMarkdownSourceTarget(sourcePath, rawHref) {
  const hrefPath = hrefWithoutHashOrQuery(rawHref);
  if (!hrefPath) {
    return { exists: true };
  }

  if (hrefPath.startsWith("../../../examples/showcase/")) {
    const slug = hrefPath.slice("../../../examples/showcase/".length).replace(/\.html$/u, "");
    return { exists: showcaseSlugs.has(slug) };
  }

  if (hrefPath === "../../../examples/" || hrefPath === "../../../examples") {
    return { exists: true };
  }

  const absolute = resolve(dirname(sourcePath), hrefPath);
  return { exists: markdownOrAssetExists(absolute) };
}

function resolveSiteTarget(rawHref) {
  const hrefPath = hrefWithoutHashOrQuery(rawHref);
  const sitePath = hrefPath.slice(base.length) || "/";

  if (sitePath === "/" || sitePath === "/examples/" || sitePath === "/examples") {
    return { exists: true };
  }

  if (sitePath.startsWith("/examples/showcase/")) {
    const slug = sitePath.slice("/examples/showcase/".length).replace(/\.html\/?$/u, "");
    return { exists: showcaseSlugs.has(slug) };
  }

  if (sitePath.startsWith("/examples/generated/")) {
    const slug = sitePath.slice("/examples/generated/".length).replace(/\.html$/u, "");
    return { exists: showcaseSlugs.has(slug) };
  }

  if (sitePath.startsWith("/examples/")) {
    const publicTarget = join(docsSitePublicRoot, sitePath);
    return { exists: existsSync(publicTarget) || existsSync(`${publicTarget}.html`) };
  }

  if (sitePath.startsWith("/assets/") || sitePath === "/favicon.svg") {
    return { exists: existsSync(join(docsSitePublicRoot, sitePath)) };
  }

  const docsTarget = routeToDocsSiteMarkdown(sitePath);
  return { exists: Boolean(docsTarget) };
}

function routeToDocsSiteMarkdown(sitePath) {
  const normalized = sitePath.replace(/^\/+|\/+$/gu, "");
  const parts = normalized.split("/");
  const lang = parts[0];
  if (lang !== "ja" && lang !== "en") {
    return undefined;
  }
  const routeParts = parts.slice(1);
  const candidates = routeParts.length === 0
    ? [join(docsSiteContentRoot, lang, "README.md"), join(docsSiteContentRoot, lang, "index.md")]
    : [
        join(docsSiteContentRoot, lang, ...routeParts) + ".md",
        join(docsSiteContentRoot, lang, ...routeParts, "index.md"),
        join(docsSiteContentRoot, lang, ...routeParts, "README.md"),
      ];
  return candidates.find((candidate) => existsSync(candidate));
}

function markdownOrAssetExists(absolutePath) {
  if (existsSync(absolutePath)) {
    return true;
  }
  if (!extname(absolutePath)) {
    return existsSync(`${absolutePath}.md`)
      || existsSync(join(absolutePath, "index.md"))
      || existsSync(join(absolutePath, "README.md"));
  }
  return false;
}

function markdownLinks(markdown) {
  const links = [];
  const pattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu;
  for (const match of markdown.matchAll(pattern)) {
    links.push({ href: match[1] });
  }
  return links;
}

function isIgnoredHref(href) {
  return /^(?:[a-z][a-z0-9+.-]*:|#|data:)/iu.test(href);
}

function hrefWithoutHashOrQuery(href) {
  const [withoutHash] = href.split("#", 1);
  const [withoutQuery] = withoutHash.split("?", 1);
  return withoutQuery;
}

function collectFiles(dir, predicate) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, predicate));
    } else if (entry.isFile() && predicate(fullPath)) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

function basenameWithoutVspec(filePath) {
  return filePath.split(/[\\/]/u).pop().replace(/\.vspec\.md$/u, "");
}

function repoPath(filePath) {
  return relative(root, filePath).split(/[\\/]/u).join("/");
}
