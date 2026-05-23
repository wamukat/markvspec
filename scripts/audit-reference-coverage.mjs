import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  commonElementPropertyKeys,
  elementTypeRegistry,
  supportedDiagnosticMessageCodes
} from "../packages/core/dist/index.js";
import {
  grammarSectionDefinitions,
  grammarStructuredItemContexts,
  grammarStructuredItemDefinitionsByContext
} from "../packages/core/dist/grammar-definition.js";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const warnings = [];
const inventory = {};

const requiredGeneratedMarkers = {
  "docs/en/reference/actions.md": ["reference-actions"],
  "docs/ja/reference/actions.md": ["reference-actions"],
  "docs/en/reference/elements.md": ["reference-elements"],
  "docs/ja/reference/elements.md": ["reference-elements"],
  "docs/en/reference/rules.md": ["reference-rules"],
  "docs/ja/reference/rules.md": ["reference-rules"],
  "docs/en/reference/sections.md": ["reference-sections"],
  "docs/ja/reference/sections.md": ["reference-sections"],
  "docs/en/reference/validations.md": ["reference-validations"],
  "docs/ja/reference/validations.md": ["reference-validations"]
};

inventory.grammarSections = grammarSectionDefinitions.map((definition) => ({
  id: `section.${definition.kind}`,
  title: definition.title,
  order: definition.order
}));

inventory.structuredItemContexts = grammarStructuredItemContexts().map((context) => ({
  id: `structured-context.${context}`,
  context,
  items: (grammarStructuredItemDefinitionsByContext[context] ?? []).map((definition) => ({
    key: definition.key,
    classification: definition.classification,
    represented: definition.represented
  }))
}));

inventory.elementTypes = [...elementTypeRegistry.entries()].map(([type, definition]) => ({
  id: `element-type.${type}`,
  type,
  kind: definition.kind,
  properties: [...definition.properties].sort(),
  acceptsWidth: Boolean(definition.width),
  acceptsSize: Boolean(definition.size)
}));

inventory.elementProperties = [
  ...commonElementPropertyKeys.map((property) => ({ id: `element-property.common.${property}`, property, scope: "common" })),
  ...inventory.elementTypes.flatMap((entry) =>
    entry.properties.map((property) => ({ id: `element-property.${entry.type}.${property}`, property, scope: entry.type }))
  )
];

inventory.diagnosticCodes = supportedDiagnosticMessageCodes().map((code) => ({
  id: `diagnostic-code.${code}`,
  code,
  source: "packages/core/src/diagnostic-messages.ts"
}));
inventory.diagnosticPushSites = await sourceMatches("packages/core/src", /diagnostics\.push\(/gu, "diagnostic-push");
inventory.rendererOutputFeatures = await rendererOutputFeatures();
inventory.generatedReferenceMarkers = await generatedReferenceMarkers();
inventory.referencePages = await referencePageInventory();
inventory.referenceCoverage = referenceCoverageInventory(inventory.referencePages);
inventory.vscodeCommands = await vscodeCommandInventory();
inventory.cliSurface = await cliSurfaceInventory();
inventory.externalInputs = await externalInputConfigurationInventory(inventory.cliSurface, inventory.vscodeCommands);
inventory.examples = await exampleInventory();

assertCategory("grammar sections", inventory.grammarSections);
assertCategory("structured item contexts", inventory.structuredItemContexts);
assertCategory("element types", inventory.elementTypes);
assertCategory("element properties", inventory.elementProperties);
assertCategory("diagnostic codes", inventory.diagnosticCodes);
assertCategory("renderer output features", inventory.rendererOutputFeatures);
assertCategory("generated reference markers", inventory.generatedReferenceMarkers);
assertCategory("reference coverage features", inventory.referenceCoverage.features);
assertCategory("EN reference pages", inventory.referencePages.en);
assertCategory("JA reference pages", inventory.referencePages.ja);
assertCategory("VS Code commands", inventory.vscodeCommands);
assertCategory("CLI commands", inventory.cliSurface.commands);
assertCategory("external input/configuration categories", inventory.externalInputs.categories);
assertCategory("CLI options", inventory.externalInputs.cliOptions);
assertCategory("Front Matter fields", inventory.externalInputs.frontMatterFields);
assertCategory("project file fields", inventory.externalInputs.projectFileFields);
assertCategory("VS Code settings coverage", inventory.externalInputs.vscodeSettings);
assertCategory("renderer message resolution coverage targets", inventory.externalInputs.rendererMessageResolution);
assertCategory("examples", inventory.examples.catalogEntries);

auditReferencePageSymmetry(inventory.referencePages);
auditRequiredGeneratedMarkers(inventory.generatedReferenceMarkers);
auditCoverageMarkerReadiness(inventory.referenceCoverage);
auditExternalInputConfigurationReadiness(inventory.externalInputs, inventory.referencePages);
auditFeatureMappingReadiness();
printReport();

if (failures.length > 0) {
  console.error(`\nReference coverage audit failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

async function referencePageInventory() {
  const enFiles = await markdownFiles("docs/en/reference");
  const jaFiles = await markdownFiles("docs/ja/reference");
  return {
    en: await Promise.all(enFiles.map(referencePageEntry)),
    ja: await Promise.all(jaFiles.map(referencePageEntry))
  };
}

async function referencePageEntry(filePath) {
  const source = await readFile(join(rootDir, filePath), "utf8");
  return {
    path: filePath,
    basename: filePath.split("/").pop(),
    headings: headings(source),
    generatedMarkers: generatedMarkers(source),
    coverageMarkers: coverageMarkers(source)
  };
}

function referenceCoverageInventory(pages) {
  const pageFeatures = unique(
    pages.en
      .concat(pages.ja)
      .map((page) => page.basename)
      .filter((basename) => basename !== "index.md")
      .map((basename) => `reference.page.${basename.replace(/\.md$/u, "")}`)
  ).map((id) => ({
    id,
    requiredLocales: ["en", "ja"],
    source: "docs/*/reference page set"
  }));

  const markers = [];
  for (const locale of ["en", "ja"]) {
    for (const page of pages[locale]) {
      for (const marker of page.coverageMarkers) {
        markers.push({
          id: marker,
          locale,
          path: page.path
        });
      }
    }
  }

  return {
    features: pageFeatures,
    markers
  };
}

function auditReferencePageSymmetry(pages) {
  const en = new Set(pages.en.map((page) => page.basename));
  const ja = new Set(pages.ja.map((page) => page.basename));
  for (const basename of difference(en, ja)) {
    failures.push(`docs/ja/reference is missing page ${basename}`);
  }
  for (const basename of difference(ja, en)) {
    failures.push(`docs/en/reference is missing page ${basename}`);
  }

  for (const enPage of pages.en) {
    const jaPage = pages.ja.find((page) => page.basename === enPage.basename);
    if (!jaPage) {
      continue;
    }
    const enKeyHeadingCount = enPage.headings.filter((heading) => heading.level <= 3).length;
    const jaKeyHeadingCount = jaPage.headings.filter((heading) => heading.level <= 3).length;
    if (enKeyHeadingCount !== jaKeyHeadingCount) {
      warnings.push(`${enPage.basename}: EN/JA key heading count differs (${enKeyHeadingCount} vs ${jaKeyHeadingCount}); manual depth review required.`);
    }
  }

  for (const page of [...pages.en, ...pages.ja]) {
    if (page.headings.length === 0) {
      failures.push(`${page.path}: Reference page has no Markdown headings`);
      continue;
    }
    if (page.headings[0].level !== 1) {
      failures.push(`${page.path}: Reference page must start with a level-1 heading`);
    }
  }
}

function auditRequiredGeneratedMarkers(markers) {
  const markerByPath = new Map(markers.map((entry) => [entry.path, new Set(entry.markers)]));
  for (const [filePath, expectedMarkers] of Object.entries(requiredGeneratedMarkers)) {
    const actual = markerByPath.get(filePath);
    if (!actual) {
      failures.push(`${filePath}: missing required generated Reference marker scan result`);
      continue;
    }
    for (const marker of expectedMarkers) {
      if (!actual.has(marker)) {
        failures.push(`${filePath}: missing required generated Reference marker ${marker}`);
      }
    }
  }
}

function auditCoverageMarkerReadiness(referenceCoverage) {
  if (referenceCoverage.markers.length === 0) {
    warnings.push("Reference coverage markers are not present yet; feature-to-prose mapping remains manual until stable feature IDs are added.");
    return;
  }

  const markerKeys = new Set(referenceCoverage.markers.map((entry) => `${entry.locale}:${entry.id}`));
  for (const feature of referenceCoverage.features) {
    for (const locale of feature.requiredLocales) {
      if (!markerKeys.has(`${locale}:${feature.id}`)) {
        warnings.push(`${feature.id}: missing ${locale.toUpperCase()} Reference coverage marker.`);
      }
    }
  }
}

function auditFeatureMappingReadiness() {
  warnings.push("Feature-to-Reference mapping is report-only in this skeleton; missing Reference page/section will be triaged before becoming a release-blocking failure.");
  warnings.push("Diagnostic and renderer/export output coverage is inventoried where mechanically detectable; semantic coverage still requires manual review.");
}

async function generatedReferenceMarkers() {
  const files = [...(await markdownFiles("docs/en/reference")), ...(await markdownFiles("docs/ja/reference"))].sort();
  const entries = [];
  for (const filePath of files) {
    const source = await readFile(join(rootDir, filePath), "utf8");
    entries.push({ path: filePath, markers: generatedMarkers(source) });
  }
  return entries;
}

async function vscodeCommandInventory() {
  const packageJson = JSON.parse(await readFile(join(rootDir, "packages/vscode-extension/package.json"), "utf8"));
  return (packageJson.contributes?.commands ?? []).map((command) => ({
    id: `vscode-command.${command.command}`,
    command: command.command,
    title: command.title,
    category: command.category
  }));
}

async function cliSurfaceInventory() {
  const packageJson = JSON.parse(await readFile(join(rootDir, "packages/cli/package.json"), "utf8"));
  const source = await readFile(join(rootDir, "packages/cli/src/index.ts"), "utf8");
  const usage = source.match(/Usage:\n([\s\S]*?)`/u)?.[1] ?? "";
  const commands = [...usage.matchAll(/markvspec\s+([^\n]+)/gu)].map((match) => match[1].trim());
  const parseBranches = [...source.matchAll(/args\.command === "([^"]+)"(?: && args\.subcommand === "([^"]+)")?/gu)].map((match) =>
    [match[1], match[2]].filter(Boolean).join(" ")
  );
  return {
    bins: Object.keys(packageJson.bin ?? {}).map((name) => ({ id: `cli-bin.${name}`, name, path: packageJson.bin[name] })),
    commands: unique([...commands, ...parseBranches]).map((command) => ({ id: `cli-command.${command}`, command })),
    options: cliOptionInventory(source)
  };
}

async function externalInputConfigurationInventory(cliSurface, vscodeCommands) {
  const sources = {
    markdownDocument: await requiredSource("packages/core/src/markdown-document.ts"),
    parser: await requiredSource("packages/core/src/parser.ts"),
    projectParser: await requiredSource("packages/core/src/project-parser.ts"),
    projectLoader: await requiredSource("packages/core/src/project-loader.ts"),
    exporter: await requiredSource("packages/exporter/src/index.ts"),
    vscodeExtension: await requiredSource("packages/vscode-extension/src/extension.ts"),
    rendererMessageLoader: await requiredSource("packages/core/src/renderer-message-loader.ts"),
    vscodePackageJson: await requiredSource("packages/vscode-extension/package.json")
  };
  const vscodePackage = JSON.parse(sources.vscodePackageJson);
  const vscodeSettings = vscodeSettingsInventory(vscodePackage);
  const frontMatterFields = frontMatterFieldInventory(sources);
  const projectFileFields = projectFileFieldInventory(sources.projectParser).map((field) => ({
    id: `project-entry.${field}`,
    field,
    source: "packages/core/src/project-parser.ts",
    coverageTargets: ["docs/en/reference/file-format.md", "docs/ja/reference/file-format.md"]
  }));
  const rendererMessageResolution = rendererMessageResolutionInventory(sources, cliSurface);
  const categories = [
    externalInputCategory("cli-commands", "CLI commands", cliSurface.commands, ["docs/en/reference/cli.md", "docs/ja/reference/cli.md"]),
    externalInputCategory("cli-options", "CLI options", cliSurface.options, ["docs/en/reference/cli.md", "docs/ja/reference/cli.md", "docs/en/reference/configuration.md", "docs/ja/reference/configuration.md"]),
    externalInputCategory("front-matter-fields", "Front Matter fields", frontMatterFields, ["docs/en/reference/file-format.md", "docs/ja/reference/file-format.md", "docs/en/reference/configuration.md", "docs/ja/reference/configuration.md"]),
    externalInputCategory("project-file-fields", "Project file fields", projectFileFields, ["docs/en/reference/file-format.md", "docs/ja/reference/file-format.md"]),
    externalInputCategory("vscode-commands", "VS Code commands", vscodeCommands, ["docs/en/start/preview.md", "docs/ja/start/preview.md", "docs/en/reference/configuration.md", "docs/ja/reference/configuration.md"]),
    externalInputCategory("vscode-settings", "VS Code settings absence/presence", vscodeSettings, ["docs/en/reference/configuration.md", "docs/ja/reference/configuration.md"]),
    externalInputCategory("renderer-message-resolution", "Renderer message resolution", rendererMessageResolution, ["docs/en/reference/cli.md", "docs/ja/reference/cli.md", "docs/en/reference/file-format.md", "docs/ja/reference/file-format.md", "docs/en/reference/configuration.md", "docs/ja/reference/configuration.md"])
  ];
  return {
    categories,
    cliOptions: cliSurface.options,
    frontMatterFields,
    projectFileFields,
    vscodeSettings,
    rendererMessageResolution
  };
}

async function requiredSource(filePath) {
  try {
    return await readFile(join(rootDir, filePath), "utf8");
  } catch (error) {
    failures.push(`${filePath}: required external input/configuration source could not be read (${error instanceof Error ? error.message : String(error)})`);
    return "";
  }
}

function frontMatterFieldInventory(sources) {
  const fields = new Map();
  const add = (field, scope, required, source) => {
    const existing = fields.get(field);
    if (existing) {
      existing.scope = mergeCsvValue(existing.scope, scope);
      existing.source = mergeCsvValue(existing.source, source);
      existing.required = existing.required || required;
      return;
    }
    fields.set(field, { field, scope, required, source });
  };

  for (const match of sources.parser.matchAll(/frontMatter\["([^"]+)"\]/gu)) {
    add(match[1], "screen", ["id", "type", "title"].includes(match[1]), "packages/core/src/parser.ts");
  }
  for (const match of sources.parser.matchAll(/frontMatterData\["([^"]+)"\]/gu)) {
    add(match[1], "screen", false, "packages/core/src/parser.ts");
  }
  for (const match of sources.projectParser.matchAll(/frontMatter\["([^"]+)"\]/gu)) {
    add(match[1], "project", ["id", "type", "title"].includes(match[1]), "packages/core/src/project-parser.ts");
  }
  for (const match of sources.projectParser.matchAll(/frontMatterData\[listName\]/gu)) {
    add("screens", "project", true, "packages/core/src/project-parser.ts");
    add("templates", "project", false, "packages/core/src/project-parser.ts");
  }
  if (sources.markdownDocument.includes('source["partials"]')) {
    add("references.partials", "screen/template/partial", false, "packages/core/src/markdown-document.ts");
  }
  if (sources.projectLoader.includes("references.partials")) {
    add("references.partials", "screen/template/partial", false, "packages/core/src/project-loader.ts");
  }
  if (sources.exporter.includes('frontMatter["messages"]')) {
    add("messages", "screen/project", false, "packages/exporter/src/index.ts");
  }
  if (sources.vscodeExtension.includes('frontMatter["messages"]')) {
    add("messages", "screen/project", false, "packages/vscode-extension/src/extension.ts");
  }

  for (const required of ["id", "type", "title", "messages", "references.partials", "screens", "templates"]) {
    if (!fields.has(required)) {
      failures.push(`Front Matter field inventory is missing required field ${required}`);
    }
  }

  return [...fields.values()]
    .sort((left, right) => left.field.localeCompare(right.field))
    .map((entry) => ({ id: `front-matter.${slug(entry.field)}`, ...entry }));
}

function projectFileFieldInventory(projectParserSource) {
  const fields = [...projectParserSource.matchAll(/if \(key === "([^"]+)"\)|else if \(key === "([^"]+)"\)/gu)]
    .map((match) => match[1] ?? match[2])
    .filter(Boolean);
  const uniqueFields = unique(fields);
  for (const required of ["id", "path", "title", "template"]) {
    if (!uniqueFields.includes(required)) {
      failures.push(`Project file field inventory is missing required field ${required}`);
    }
  }
  return uniqueFields;
}

function rendererMessageResolutionInventory(sources, cliSurface) {
  const entries = [];
  if (cliSurface.options.some((entry) => entry.option === "--messages") && sources.rendererMessageLoader.includes("options.explicitPath")) {
    entries.push({
      id: "renderer-message.cli-explicit",
      mechanism: "CLI --messages",
      source: "packages/cli/src/index.ts and packages/core/src/renderer-message-loader.ts",
      coverageTargets: ["docs/en/reference/cli.md", "docs/ja/reference/cli.md", "docs/en/reference/configuration.md", "docs/ja/reference/configuration.md"]
    });
  }
  if (sources.exporter.includes("resolveFrontMatterMessagesPath") && sources.vscodeExtension.includes("frontMatterPath") && sources.rendererMessageLoader.includes("options.frontMatterPath")) {
    entries.push({
      id: "renderer-message.front-matter",
      mechanism: "Front Matter messages",
      source: "packages/exporter/src/index.ts, packages/vscode-extension/src/extension.ts, and packages/core/src/renderer-message-loader.ts",
      coverageTargets: ["docs/en/reference/file-format.md", "docs/ja/reference/file-format.md", "docs/en/reference/configuration.md", "docs/ja/reference/configuration.md"]
    });
  }
  if (sources.rendererMessageLoader.includes("defaultMessageFileNames") && sources.rendererMessageLoader.includes("markvspec.messages")) {
    entries.push({
      id: "renderer-message.default-files",
      mechanism: "nearby markvspec.messages.*",
      source: "packages/core/src/renderer-message-loader.ts",
      coverageTargets: ["docs/en/reference/cli.md", "docs/ja/reference/cli.md", "docs/en/reference/configuration.md", "docs/ja/reference/configuration.md"]
    });
  }

  for (const required of ["renderer-message.cli-explicit", "renderer-message.front-matter", "renderer-message.default-files"]) {
    if (!entries.some((entry) => entry.id === required)) {
      failures.push(`Renderer message resolution inventory is missing required mechanism ${required}`);
    }
  }
  return entries;
}

function cliOptionInventory(source) {
  const longOptions = [...source.matchAll(/--[a-z][a-z0-9-]*/gu)].map((match) => match[0]);
  const shortOptions = [...source.matchAll(/(?:^|[\s[])(-[a-z])(?=[\s\]])/gmu)].map((match) => match[1]);
  return unique([...longOptions, ...shortOptions]).map((option) => ({
    id: `cli-option.${option.replace(/^-+/u, "")}`,
    option,
    source: "packages/cli/src/index.ts"
  }));
}

function vscodeSettingsInventory(packageJson) {
  const properties = packageJson.contributes?.configuration?.properties ?? {};
  const entries = Object.entries(properties);
  if (entries.length === 0) {
    return [{
      id: "vscode-setting.none",
      setting: "(none)",
      status: "absent",
      source: "packages/vscode-extension/package.json"
    }];
  }
  return entries.map(([setting, definition]) => ({
    id: `vscode-setting.${setting}`,
    setting,
    type: definition.type,
    default: definition.default,
    status: "present",
    source: "packages/vscode-extension/package.json"
  }));
}

function externalInputCategory(id, label, items, coverageTargets) {
  return {
    id: `external-input.${id}`,
    label,
    count: items.length,
    coverageTargets
  };
}

function mergeCsvValue(left, right) {
  return unique(`${left}, ${right}`.split(/,\s*/u)).join(", ");
}

function auditExternalInputConfigurationReadiness(externalInputs, referencePages) {
  const referencePagePaths = new Set([...referencePages.en, ...referencePages.ja].map((page) => page.path));
  for (const category of externalInputs.categories) {
    if (category.count === 0) {
      failures.push(`External input/configuration category is empty: ${category.label}`);
    }
    for (const target of category.coverageTargets) {
      if (target.includes("/reference/") && !referencePagePaths.has(target)) {
        failures.push(`${category.label}: coverage target is missing: ${target}`);
      }
    }
  }

  warnings.push("External input/configuration coverage is inventoried and coverage targets are checked for presence; prose depth and exact item-to-paragraph mapping remain manual.");
}

async function exampleInventory() {
  const catalog = await readFile(join(rootDir, "examples/catalog.yml"), "utf8");
  const catalogEntries = [...catalog.matchAll(/^\s+- path:\s+(.+)$/gmu)].map((match) => match[1].trim());
  const files = (await collectFiles("examples")).filter((filePath) => filePath.endsWith(".vspec.md"));
  const missingFromDisk = catalogEntries.filter((filePath) => !files.includes(filePath));
  const missingFromCatalog = files.filter((filePath) => !catalogEntries.includes(filePath) && !filePath.endsWith(".partial.vspec.md"));
  for (const filePath of missingFromDisk) {
    failures.push(`examples/catalog.yml references missing example ${filePath}`);
  }
  for (const filePath of missingFromCatalog) {
    warnings.push(`${filePath}: example is not listed in examples/catalog.yml`);
  }
  return {
    catalogEntries: catalogEntries.map((filePath) => ({ id: `example.${filePath}`, path: filePath })),
    files: files.map((filePath) => ({ id: `example-file.${filePath}`, path: filePath }))
  };
}

async function rendererOutputFeatures() {
  const sources = [
    "packages/document-renderer/src/index.ts",
    "packages/document-renderer/src/static-element-spec.ts",
    "packages/document-renderer/src/static-state-view-renderer.ts",
    "packages/exporter/src/index.ts",
    "packages/vscode-extension/src/project-preview-document.ts",
    "packages/vscode-extension/src/preview-design-document-renderer.ts",
    "packages/vscode-extension/src/preview-html-postprocess.ts"
  ];
  const features = [];
  for (const filePath of sources) {
    const source = await readFile(join(rootDir, filePath), "utf8");
    const headingIds = [...source.matchAll(/<h[23][^>]*\bid=["']([^"']+)["']/gu)].map((match) => match[1]);
    const tableHeaders = [...source.matchAll(/messages\.([A-Za-z0-9_]+)/gu)].map((match) => match[1]);
    const classes = [...source.matchAll(/class=["']([^"']*(?:section|diagnostic|marker|spec|state-view)[^"']*)["']/gu)].map((match) => match[1]);
    for (const value of unique([...headingIds.map((id) => `heading:${id}`), ...tableHeaders.map((key) => `message:${key}`), ...classes.map((className) => `class:${className}`)])) {
      features.push({
        id: `renderer-output.${filePath}.${slug(value)}`,
        source: filePath,
        value
      });
    }
  }
  return features;
}

async function sourceMatches(rootRelativePath, pattern, prefix) {
  const files = (await collectFiles(rootRelativePath)).filter((filePath) => [".ts", ".tsx"].includes(extname(filePath)));
  const entries = [];
  for (const filePath of files) {
    const source = await readFile(join(rootDir, filePath), "utf8");
    const count = [...source.matchAll(pattern)].length;
    if (count > 0) {
      entries.push({ id: `${prefix}.${filePath}`, source: filePath, count });
    }
  }
  return entries;
}

async function markdownFiles(rootRelativePath) {
  return (await collectFiles(rootRelativePath)).filter((filePath) => filePath.endsWith(".md"));
}

async function collectFiles(rootRelativePath) {
  const rootPath = join(rootDir, rootRelativePath);
  const files = [];
  await collect(rootPath, files);
  return files.map((filePath) => relative(rootDir, filePath).replace(/\\/gu, "/")).sort();
}

async function collect(directory, files) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collect(entryPath, files);
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
}

function generatedMarkers(source) {
  return [...source.matchAll(/<!-- markvspec-generated:([^:]+):start -->/gu)].map((match) => match[1]);
}

function coverageMarkers(source) {
  return [...source.matchAll(/<!--\s*markvspec-coverage:([a-z0-9_.-]+)\s*-->/gu)].map((match) => match[1]);
}

function headings(source) {
  const entries = [];
  let activeFence;
  for (const line of source.split(/\r?\n/u)) {
    if (activeFence) {
      const fence = closingFenceMarker(line);
      if (fence && fence.marker === activeFence.marker && fence.length >= activeFence.length) {
        activeFence = undefined;
      }
      continue;
    }
    const fence = openingFenceMarker(line);
    if (fence) {
      activeFence = fence;
      continue;
    }
    const match = line.match(/^(#{1,6})\s+(.+)$/u);
    if (match) {
      entries.push({
        level: match[1].length,
        text: match[2].trim()
      });
    }
  }
  return entries;
}

function openingFenceMarker(line) {
  return fenceMarker(line, false);
}

function closingFenceMarker(line) {
  return fenceMarker(line, true);
}

function fenceMarker(line, closing) {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/u);
  if (!match) {
    return undefined;
  }
  if (closing && match[2].trim() !== "") {
    return undefined;
  }
  return {
    marker: match[1][0],
    length: match[1].length
  };
}

function assertCategory(label, entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    failures.push(`Inventory category is empty: ${label}`);
  }
}

function difference(left, right) {
  return [...left].filter((value) => !right.has(value)).sort();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 80) || "feature";
}

function printReport() {
  const summaryRows = [
    ["grammar sections", inventory.grammarSections.length],
    ["structured item contexts", inventory.structuredItemContexts.length],
    ["structured items", inventory.structuredItemContexts.reduce((count, context) => count + context.items.length, 0)],
    ["element types", inventory.elementTypes.length],
    ["element properties", inventory.elementProperties.length],
    ["diagnostic codes", inventory.diagnosticCodes.length],
    ["diagnostic push sites", inventory.diagnosticPushSites.length],
    ["renderer output features", inventory.rendererOutputFeatures.length],
    ["generated Reference marker files", inventory.generatedReferenceMarkers.length],
    ["Reference coverage features", inventory.referenceCoverage.features.length],
    ["Reference coverage markers", inventory.referenceCoverage.markers.length],
    ["EN Reference pages", inventory.referencePages.en.length],
    ["JA Reference pages", inventory.referencePages.ja.length],
    ["VS Code commands", inventory.vscodeCommands.length],
    ["CLI commands", inventory.cliSurface.commands.length],
    ["CLI options", inventory.externalInputs.cliOptions.length],
    ["Front Matter fields", inventory.externalInputs.frontMatterFields.length],
    ["project file fields", inventory.externalInputs.projectFileFields.length],
    ["VS Code settings entries", inventory.externalInputs.vscodeSettings.length],
    ["renderer message resolution entries", inventory.externalInputs.rendererMessageResolution.length],
    ["external input/configuration categories", inventory.externalInputs.categories.length],
    ["examples catalog entries", inventory.examples.catalogEntries.length],
    ["example files", inventory.examples.files.length]
  ];

  console.log("Reference coverage audit summary:");
  for (const [label, count] of summaryRows) {
    console.log(`- ${label}: ${count}`);
  }

  printReferenceCoverageMarkerReport();
  printExternalInputConfigurationReport();

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  } else {
    console.log("\nWarnings: none");
  }

  console.log(`\nFailures: ${failures.length}`);
}

function printReferenceCoverageMarkerReport() {
  if (!inventory.referenceCoverage || inventory.referenceCoverage.features.length === 0) {
    return;
  }
  const markersByLocaleAndId = new Map(
    inventory.referenceCoverage.markers.map((entry) => [`${entry.locale}:${entry.id}`, entry])
  );
  console.log("\nReference coverage marker report:");
  for (const feature of inventory.referenceCoverage.features) {
    const statuses = feature.requiredLocales.map((locale) => {
      const marker = markersByLocaleAndId.get(`${locale}:${feature.id}`);
      return marker ? `${locale}:${marker.path}` : `${locale}:missing`;
    });
    console.log(`- ${feature.id}: ${statuses.join(", ")}`);
  }
}

function printExternalInputConfigurationReport() {
  if (!inventory.externalInputs || inventory.externalInputs.categories.length === 0) {
    return;
  }
  console.log("\nExternal input/configuration coverage report:");
  for (const category of inventory.externalInputs.categories) {
    console.log(`- ${category.label}: ${category.count} item(s); coverage: ${category.coverageTargets.join(", ")}`);
  }

  const sampleOptions = inventory.externalInputs.cliOptions.map((entry) => entry.option).join(", ");
  const sampleFrontMatter = inventory.externalInputs.frontMatterFields.map((entry) => entry.field).join(", ");
  const sampleProjectFields = inventory.externalInputs.projectFileFields.map((entry) => entry.field).join(", ");
  const vscodeSettings = inventory.externalInputs.vscodeSettings.map((entry) => `${entry.setting} (${entry.status})`).join(", ");
  const messageResolution = inventory.externalInputs.rendererMessageResolution.map((entry) => entry.mechanism).join(", ");
  console.log(`  CLI options: ${sampleOptions}`);
  console.log(`  Front Matter fields: ${sampleFrontMatter}`);
  console.log(`  Project file fields: ${sampleProjectFields}`);
  console.log(`  VS Code settings: ${vscodeSettings}`);
  console.log(`  Renderer message resolution: ${messageResolution}`);
}
