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
  kind: definition.kind,
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
inventory.diagnosticPushSites = await diagnosticPushSiteInventory();
inventory.rendererOutputFeatures = await rendererOutputFeatures();
inventory.diagnosticCoverageMatrix = await diagnosticCoverageMatrixInventory();
inventory.diagnosticPushSiteClassification = await diagnosticPushSiteClassificationInventory();
inventory.rendererOutputCoverageMatrix = await rendererOutputCoverageMatrixInventory();
inventory.generatedReferenceMarkers = await generatedReferenceMarkers();
inventory.referencePages = await referencePageInventory();
inventory.referenceCoverage = referenceCoverageInventory(inventory.referencePages);
inventory.grammarSectionCoverage = await grammarSectionCoverageInventory();
inventory.elementGeneratedCoverage = await elementGeneratedCoverageInventory();
inventory.vscodeCommands = await vscodeCommandInventory();
inventory.cliSurface = await cliSurfaceInventory();
inventory.externalInputs = await externalInputConfigurationInventory(inventory.cliSurface, inventory.vscodeCommands);
inventory.examples = await exampleInventory();
inventory.featureMapping = featureMappingInventory();

assertCategory("grammar sections", inventory.grammarSections);
assertCategory("structured item contexts", inventory.structuredItemContexts);
assertCategory("element types", inventory.elementTypes);
assertCategory("element properties", inventory.elementProperties);
assertCategory("diagnostic codes", inventory.diagnosticCodes);
assertCategory("diagnostic push sites", inventory.diagnosticPushSites);
assertCategory("renderer output features", inventory.rendererOutputFeatures);
assertCategory("diagnostic coverage matrix EN rows", inventory.diagnosticCoverageMatrix.en);
assertCategory("diagnostic coverage matrix JA rows", inventory.diagnosticCoverageMatrix.ja);
assertCategory("diagnostic push site classification EN rows", inventory.diagnosticPushSiteClassification.en);
assertCategory("diagnostic push site classification JA rows", inventory.diagnosticPushSiteClassification.ja);
assertCategory("renderer/export output coverage matrix EN rows", inventory.rendererOutputCoverageMatrix.en);
assertCategory("renderer/export output coverage matrix JA rows", inventory.rendererOutputCoverageMatrix.ja);
assertCategory("generated reference markers", inventory.generatedReferenceMarkers);
assertCategory("reference coverage features", inventory.referenceCoverage.features);
assertCategory("grammar section stable coverage entries", inventory.grammarSectionCoverage.entries);
assertCategory("element generated stable coverage entries", inventory.elementGeneratedCoverage.entries);
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
assertCategory("stable feature mapping families", inventory.featureMapping.stable);
assertCategory("report-only feature mapping families", inventory.featureMapping.reportOnly);
assertCategory("examples", inventory.examples.catalogEntries);

auditReferencePageSymmetry(inventory.referencePages);
auditRequiredGeneratedMarkers(inventory.generatedReferenceMarkers);
auditCoverageMarkerReadiness(inventory.referenceCoverage);
auditGrammarSectionCoverageReadiness(inventory.grammarSectionCoverage);
auditElementGeneratedCoverageReadiness(inventory.elementGeneratedCoverage);
await auditExternalInputConfigurationReadiness(inventory.externalInputs, inventory.referencePages);
auditDiagnosticCoverageMatrixReadiness(inventory.diagnosticCoverageMatrix);
auditDiagnosticPushSiteClassificationReadiness(inventory.diagnosticPushSiteClassification);
auditRendererOutputCoverageMatrixReadiness(inventory.rendererOutputCoverageMatrix);
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
    failures.push("Reference coverage markers are required for stable reference.page feature mapping.");
    return;
  }

  const markerKeys = new Set(referenceCoverage.markers.map((entry) => `${entry.locale}:${entry.id}`));
  for (const feature of referenceCoverage.features) {
    for (const locale of feature.requiredLocales) {
      if (!markerKeys.has(`${locale}:${feature.id}`)) {
        failures.push(`${feature.id}: missing ${locale.toUpperCase()} Reference coverage marker.`);
      }
    }
  }
}

function auditFeatureMappingReadiness() {
  warnings.push(`Feature-to-Reference mapping has ${inventory.featureMapping.reportOnly.length} report-only family/families that still need stable markers before missing prose becomes release-blocking.`);
  warnings.push(`Diagnostic prose depth and renderer/export output semantic coverage remain manual outside stable matrix clusters.`);
}

function featureMappingInventory() {
  return {
    stable: [
      {
        id: "feature-mapping.reference-pages",
        family: "Reference page family",
        count: inventory.referenceCoverage.features.length,
        failureMode: "Missing EN/JA page marker is a failure.",
        evidence: "markvspec-coverage:reference.page.*"
      },
      {
        id: "feature-mapping.generated-reference",
        family: "Generated Reference table family",
        count: Object.values(requiredGeneratedMarkers).flat().length,
        failureMode: "Missing required generated marker is a failure.",
        evidence: "markvspec-generated:*"
      },
      {
        id: "feature-mapping.grammar-sections",
        family: "Grammar section coverage family",
        count: inventory.grammarSectionCoverage.entries.length,
        failureMode: "Missing EN/JA section page marker, generated row, or grammar production is a failure.",
        evidence: "markvspec-coverage:reference.page.sections, markvspec-coverage:reference.page.grammar, markvspec-generated:reference-sections, and grammar productions"
      },
      {
        id: "feature-mapping.element-generated",
        family: "Element generated table coverage family",
        count: inventory.elementGeneratedCoverage.entries.length,
        failureMode: "Missing EN/JA element page marker, generated marker, or generated row is a failure.",
        evidence: "markvspec-coverage:reference.page.elements and markvspec-generated:reference-elements"
      },
      {
        id: "feature-mapping.external-input",
        family: "External input/configuration category family",
        count: inventory.externalInputs.categories.length,
        failureMode: "Missing category marker in any coverage target page is a failure.",
        evidence: "markvspec-coverage:external-input.*"
      },
      {
        id: "feature-mapping.diagnostic-push-sites",
        family: "Diagnostic push site classification family",
        count: inventory.diagnosticPushSites.length,
        failureMode: "A Stable covered push site must have a diagnostic matrix row, classification row source, and coverage target.",
        evidence: "Diagnostic Coverage Matrix and Diagnostic Push Site Classification Matrix"
      }
    ],
    reportOnly: [
      {
        id: "feature-mapping.structured-items",
        family: "Structured item prose coverage",
        count: structuredItemCount(),
        reason: "Recognized sections are matrix-checked; individual structured item prose depth is not markerized item by item."
      },
      {
        id: "feature-mapping.element-prose-depth",
        family: "Element prose-depth coverage",
        count: inventory.elementTypes.length + inventory.elementProperties.length,
        reason: "Generated element rows are checked; type/property explanation depth is not markerized item by item."
      },
      {
        id: "feature-mapping.diagnostic-prose-depth",
        family: "Diagnostic prose-depth coverage",
        count: inventory.diagnosticPushSites.length,
        reason: "Diagnostic codes and stable push-site source entries are checked; prose depth per trigger remains reviewer judgment."
      },
      {
        id: "feature-mapping.renderer-export",
        family: "Renderer/export output features",
        count: inventory.rendererOutputFeatures.length,
        reason: "Stable output clusters are matrix-checked; remaining output signals require artifact/manual review before marker-level failure is safe."
      },
      {
        id: "feature-mapping.examples",
        family: "Examples and example-supported patterns",
        count: inventory.examples?.catalogEntries?.length ?? 0,
        reason: "Examples are audited as runnable artifacts, but feature-to-prose mapping is not stable per example tag."
      }
    ]
  };
}

async function elementGeneratedCoverageInventory() {
  const generatedMarkersByPath = new Map(inventory.generatedReferenceMarkers.map((entry) => [entry.path, new Set(entry.markers)]));
  const pagesByPath = new Map(
    [...inventory.referencePages.en, ...inventory.referencePages.ja].map((page) => [page.path, page])
  );
  const targets = {
    en: {
      path: "docs/en/reference/elements.md",
      source: await requiredSource("docs/en/reference/elements.md")
    },
    ja: {
      path: "docs/ja/reference/elements.md",
      source: await requiredSource("docs/ja/reference/elements.md")
    }
  };
  for (const target of Object.values(targets)) {
    target.generatedRows = generatedTableFirstCellValues(generatedBlock(target.source, "reference-elements"));
    target.elementTypeCatalogEntries = elementTypeCatalogEntries(target.source);
  }

  const generatedEntries = [
    ...inventory.elementTypes.map((entry) => ({
      id: entry.id,
      label: entry.type,
      source: "element-type",
      rowKind: "type-catalog-entry"
    })),
    ...inventory.elementProperties.map((entry) => ({
      id: entry.id,
      label: entry.property,
      source: "element-property",
      rowKind: entry.scope === "common" ? "generated-row" : "report-only"
    })),
    ...[
      "element.tab-item.property",
      "element.accordion-item.property",
      "element.action-menu-item.property",
      "element.display-value-property",
      "element.display-value-metadata"
    ].map((context) => ({
      id: `element-context.${context}`,
      label: context,
      source: "element-context",
      rowKind: "generated-row"
    }))
  ].filter((entry) => entry.rowKind !== "report-only");

  const entries = generatedEntries.map((entry) => ({
    ...entry,
    locales: Object.fromEntries(Object.entries(targets).map(([locale, target]) => {
      const page = pagesByPath.get(target.path);
      return [locale, {
        path: target.path,
        hasPageMarker: page?.coverageMarkers.includes("reference.page.elements") ?? false,
        hasGeneratedMarker: generatedMarkersByPath.get(target.path)?.has("reference-elements") ?? false,
        hasRequiredEntry: entry.rowKind === "type-catalog-entry"
          ? target.elementTypeCatalogEntries.has(entry.label)
          : target.generatedRows.has(entry.label)
      }];
    }))
  }));

  return {
    entries,
    stableCount: entries.length,
    remainingProseDepth: inventory.elementTypes.length + inventory.elementProperties.length
  };
}

function auditElementGeneratedCoverageReadiness(coverage) {
  for (const entry of coverage.entries) {
    for (const [locale, target] of Object.entries(entry.locales)) {
      const label = `${entry.id} ${locale}`;
      if (!target.hasPageMarker) {
        failures.push(`${label}: missing reference.page.elements coverage marker in ${target.path}.`);
      }
      if (!target.hasGeneratedMarker) {
        failures.push(`${label}: missing generated reference-elements marker in ${target.path}.`);
      }
      if (!target.hasRequiredEntry) {
        failures.push(`${label}: missing ${entry.rowKind === "type-catalog-entry" ? "element type catalog entry" : "generated row"} for ${entry.label} in ${target.path}.`);
      }
    }
  }
}

async function grammarSectionCoverageInventory() {
  const generatedMarkersByPath = new Map(inventory.generatedReferenceMarkers.map((entry) => [entry.path, new Set(entry.markers)]));
  const pagesByPath = new Map(
    [...inventory.referencePages.en, ...inventory.referencePages.ja].map((page) => [page.path, page])
  );
  const targets = {
    en: {
      grammar: {
        path: "docs/en/reference/grammar.md",
        source: await requiredSource("docs/en/reference/grammar.md")
      },
      sections: {
        path: "docs/en/reference/sections.md",
        source: await requiredSource("docs/en/reference/sections.md")
      }
    },
    ja: {
      grammar: {
        path: "docs/ja/reference/grammar.md",
        source: await requiredSource("docs/ja/reference/grammar.md")
      },
      sections: {
        path: "docs/ja/reference/sections.md",
        source: await requiredSource("docs/ja/reference/sections.md")
      }
    }
  };

  const entries = inventory.grammarSections.map((section) => {
    const sectionHeading = `## ${section.title}`;
    const productionName = `${sectionProductionName(section.kind)}_section`;
    return {
      id: `grammar-section.${section.kind}`,
      kind: section.kind,
      title: section.title,
      sectionHeading,
      productionName,
      locales: Object.fromEntries(Object.entries(targets).map(([locale, target]) => {
        const sectionsPage = pagesByPath.get(target.sections.path);
        const grammarPage = pagesByPath.get(target.grammar.path);
        return [locale, {
          sectionsPath: target.sections.path,
          grammarPath: target.grammar.path,
          hasSectionsPageMarker: sectionsPage?.coverageMarkers.includes("reference.page.sections") ?? false,
          hasGrammarPageMarker: grammarPage?.coverageMarkers.includes("reference.page.grammar") ?? false,
          hasGeneratedSectionsMarker: generatedMarkersByPath.get(target.sections.path)?.has("reference-sections") ?? false,
          hasGeneratedSectionRow: target.sections.source.includes(`| \`${sectionHeading}\``),
          hasGrammarProduction: target.grammar.source.includes(`${productionName} = h2`)
        }];
      }))
    };
  });

  return {
    entries,
    stableCount: entries.length,
    remainingStructuredItems: structuredItemCount()
  };
}

function auditGrammarSectionCoverageReadiness(coverage) {
  for (const entry of coverage.entries) {
    for (const [locale, target] of Object.entries(entry.locales)) {
      const label = `${entry.id} ${locale}`;
      if (!target.hasSectionsPageMarker) {
        failures.push(`${label}: missing reference.page.sections coverage marker in ${target.sectionsPath}.`);
      }
      if (!target.hasGrammarPageMarker) {
        failures.push(`${label}: missing reference.page.grammar coverage marker in ${target.grammarPath}.`);
      }
      if (!target.hasGeneratedSectionsMarker) {
        failures.push(`${label}: missing generated reference-sections marker in ${target.sectionsPath}.`);
      }
      if (!target.hasGeneratedSectionRow) {
        failures.push(`${label}: missing generated row for ${entry.sectionHeading} in ${target.sectionsPath}.`);
      }
      if (!target.hasGrammarProduction) {
        failures.push(`${label}: missing grammar production ${entry.productionName} in ${target.grammarPath}.`);
      }
    }
  }
}

function auditDiagnosticCoverageMatrixReadiness(matrix) {
  const localeRows = [
    ["en", matrix.en],
    ["ja", matrix.ja]
  ];
  for (const [locale, rows] of localeRows) {
    const rowsByCode = new Map(rows.map((row) => [row.code, row]));
    for (const diagnostic of inventory.diagnosticCodes) {
      const row = rowsByCode.get(diagnostic.code);
      if (!row) {
        failures.push(`diagnostic coverage matrix ${locale}: missing row for ${diagnostic.code}.`);
        continue;
      }
      if (row.coverageTargets.length === 0) {
        failures.push(`diagnostic coverage matrix ${locale}: ${diagnostic.code} has no coverage target.`);
      }
      if (!/^covered$/iu.test(row.status)) {
        failures.push(`diagnostic coverage matrix ${locale}: ${diagnostic.code} status is ${row.status || "empty"}, expected Covered.`);
      }
    }
  }
}

function auditDiagnosticPushSiteClassificationReadiness(matrix) {
  const pushSitesByCode = diagnosticPushSitesByCode();
  for (const [locale, rows] of [["en", matrix.en], ["ja", matrix.ja]]) {
    const rowsByCode = new Map(rows.map((row) => [row.code, row]));
    const codeCoverageRows = new Map(inventory.diagnosticCoverageMatrix[locale].map((row) => [row.code, row]));
    for (const [code, pushSites] of pushSitesByCode) {
      const row = rowsByCode.get(code);
      if (!row) {
        warnings.push(`diagnostic push site classification ${locale}: ${code} has ${pushSites.length} unclassified push site(s).`);
        continue;
      }
      const classification = normalizeMatrixCell(row.classification);
      if (classification !== "stable covered") {
        warnings.push(`diagnostic push site classification ${locale}: ${code} is ${row.classification || "unclassified"}, not Stable covered.`);
        continue;
      }
      const codeCoverage = codeCoverageRows.get(code);
      if (!codeCoverage || codeCoverage.coverageTargets.length === 0) {
        failures.push(`diagnostic push site classification ${locale}: ${code} is Stable covered but lacks a diagnostic coverage matrix row with targets.`);
      }
      if (row.coverageTargets.length === 0) {
        failures.push(`diagnostic push site classification ${locale}: ${code} is Stable covered but has no user-facing coverage target.`);
      }
      const rowSources = new Set(row.sources);
      for (const pushSite of pushSites) {
        if (!rowSources.has(pushSite.source)) {
          failures.push(`diagnostic push site classification ${locale}: ${code} is Stable covered but ${pushSite.source} is missing from the classification entry.`);
        }
      }
      for (const source of rowSources) {
        if (!pushSites.some((pushSite) => pushSite.source === source)) {
          failures.push(`diagnostic push site classification ${locale}: ${code} lists stale source ${source}.`);
        }
      }
    }
  }
}

function auditRendererOutputCoverageMatrixReadiness(matrix) {
  const localeRows = [
    ["en", matrix.en],
    ["ja", matrix.ja]
  ];
  for (const cluster of stableRendererOutputClusters()) {
    for (const [locale, rows] of localeRows) {
      const row = rows.find((entry) => cluster.normalizedClusters.includes(entry.normalizedCluster));
      if (!row) {
        failures.push(`renderer/export output coverage matrix ${locale}: missing stable row ${cluster.label}.`);
        continue;
      }
      if (row.coverageTargets.length === 0) {
        failures.push(`renderer/export output coverage matrix ${locale}: ${cluster.label} has no coverage target.`);
      }
      if (!row.representativeExample || row.representativeExample === "-") {
        failures.push(`renderer/export output coverage matrix ${locale}: ${cluster.label} has no representative example.`);
      }
      if (!row.artifactToVerify || row.artifactToVerify === "-") {
        failures.push(`renderer/export output coverage matrix ${locale}: ${cluster.label} has no artifact to verify.`);
      }
    }
    for (const signal of cluster.signals) {
      const found = inventory.rendererOutputFeatures.some((feature) =>
        feature.source === signal.source && feature.value === signal.value
      );
      if (!found) {
        failures.push(`renderer/export output coverage inventory: ${cluster.label} is missing stable signal ${signal.source} ${signal.value}.`);
      }
    }
  }
}

function stableRendererOutputClusters() {
  return [
    {
      label: "Screen Basic Info",
      normalizedClusters: [normalizeMatrixCell("Screen Basic Info")],
      signals: [
        { source: "packages/document-renderer/src/index.ts", value: "message:version" },
        { source: "packages/document-renderer/src/index.ts", value: "message:date" },
        { source: "packages/document-renderer/src/index.ts", value: "message:author" }
      ]
    },
    {
      label: "Static document section order and table of contents",
      normalizedClusters: [
        normalizeMatrixCell("Static document section order and table of contents"),
        normalizeMatrixCell("static document section order と table of contents")
      ],
      signals: [
        { source: "packages/document-renderer/src/index.ts", value: "function:renderStaticDesignDocumentHtml" },
        { source: "packages/document-renderer/src/index.ts", value: "message:contents" }
      ]
    },
    {
      label: "States, state flow, and action transition tables",
      normalizedClusters: [
        normalizeMatrixCell("States, state flow, and action transition tables"),
        normalizeMatrixCell("States、state flow、action transition tables")
      ],
      signals: [
        { source: "packages/document-renderer/src/index.ts", value: "heading:states" },
        { source: "packages/document-renderer/src/index.ts", value: "heading:state-flow" },
        { source: "packages/document-renderer/src/index.ts", value: "message:actionTransitions" }
      ]
    },
    {
      label: "Export diagnostics section",
      normalizedClusters: [normalizeMatrixCell("Export diagnostics section")],
      signals: [
        { source: "packages/exporter/src/index.ts", value: "message:diagnostics" },
        { source: "packages/exporter/src/index.ts", value: "class:mm-export-diagnostics" }
      ]
    },
    {
      label: "History table",
      normalizedClusters: [normalizeMatrixCell("History table")],
      signals: [
        { source: "packages/document-renderer/src/index.ts", value: "heading:history" },
        { source: "packages/document-renderer/src/index.ts", value: "message:history" }
      ]
    },
    {
      label: "Marker/ID cells and entity reference chips",
      normalizedClusters: [
        normalizeMatrixCell("Marker/ID cells and entity reference chips"),
        normalizeMatrixCell("Marker/ID cells と entity reference chips")
      ],
      signals: [
        { source: "packages/document-renderer/src/index.ts", value: "message:marker" },
        { source: "packages/document-renderer/src/index.ts", value: "message:id" },
        { source: "packages/vscode-extension/src/preview-html-postprocess.ts", value: "class:mm-id mm-marker mm-marker-(layout|element|action)" }
      ]
    },
    {
      label: "Element display source metadata and Display Content Spec",
      normalizedClusters: [
        normalizeMatrixCell("Element display source metadata and Display Content Spec"),
        normalizeMatrixCell("Element display source metadata と Display Content Spec")
      ],
      signals: [
        { source: "packages/document-renderer/src/static-element-spec.ts", value: "function:renderDisplayContentSpecBox" },
        { source: "packages/document-renderer/src/static-element-spec.ts", value: "message:displayContentSpec" },
        { source: "packages/document-renderer/src/static-element-spec.ts", value: "message:displaySource" }
      ]
    },
    {
      label: "Form Groups and input specification tables",
      normalizedClusters: [
        normalizeMatrixCell("Form Groups and input specification tables"),
        normalizeMatrixCell("Form Groups と input specification tables")
      ],
      signals: [
        { source: "packages/document-renderer/src/index.ts", value: "heading:form-groups" },
        { source: "packages/document-renderer/src/static-element-spec.ts", value: "function:renderInputFormSpecBox" },
        { source: "packages/document-renderer/src/static-element-spec.ts", value: "message:inputFormSpec" }
      ]
    },
    {
      label: "Business Rules, Validations, and Error Codes sections",
      normalizedClusters: [
        normalizeMatrixCell("Business Rules, Validations, and Error Codes sections"),
        normalizeMatrixCell("Business Rules、Validations、Error Codes sections")
      ],
      signals: [
        { source: "packages/document-renderer/src/index.ts", value: "heading:business-rules" },
        { source: "packages/document-renderer/src/index.ts", value: "heading:validations" },
        { source: "packages/document-renderer/src/index.ts", value: "heading:error-codes" }
      ]
    },
    {
      label: "State Views and Preview Scenarios",
      normalizedClusters: [
        normalizeMatrixCell("State Views and Preview Scenarios"),
        normalizeMatrixCell("State Views と Preview Scenarios")
      ],
      signals: [
        { source: "packages/document-renderer/src/static-state-view-renderer.ts", value: "heading:state-views" },
        { source: "packages/document-renderer/src/static-state-view-renderer.ts", value: "class:doc-section state-views-section" }
      ]
    },
    {
      label: "Project preview overview, notes, templates, screens, and transitions",
      normalizedClusters: [
        normalizeMatrixCell("Project preview overview, notes, templates, screens, and transitions"),
        normalizeMatrixCell("Project preview overview、notes、templates、screens、transitions")
      ],
      signals: [
        { source: "packages/vscode-extension/src/project-preview-document.ts", value: "function:renderProjectDesignDocumentHtml" },
        { source: "packages/vscode-extension/src/project-preview-document.ts", value: "class:doc-section project-notes-section" }
      ]
    },
    {
      label: "Project `document-list` export",
      normalizedClusters: [normalizeMatrixCell("Project `document-list` export")],
      signals: [
        { source: "packages/exporter/src/index.ts", value: "function:exportMarkVSpecDocumentList" },
        { source: "packages/exporter/src/index.ts", value: "markdown-heading:Document List" }
      ]
    },
    {
      label: "Renderer messages and localized labels",
      normalizedClusters: [
        normalizeMatrixCell("Renderer messages and localized labels"),
        normalizeMatrixCell("Renderer messages と localized labels")
      ],
      signals: [
        { source: "packages/core/src/renderer-message-loader.ts", value: "function:resolveRendererMessages" },
        { source: "packages/exporter/src/index.ts", value: "message:renderFailed" },
        { source: "packages/exporter/src/index.ts", value: "message:showSource" }
      ]
    }
  ];
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

async function diagnosticCoverageMatrixInventory() {
  return {
    en: parseDiagnosticCoverageMatrix(await requiredSource("docs/en/maintainers/reference-coverage-audit.md"), "docs/en/maintainers/reference-coverage-audit.md"),
    ja: parseDiagnosticCoverageMatrix(await requiredSource("docs/ja/maintainers/reference-coverage-audit.md"), "docs/ja/maintainers/reference-coverage-audit.md")
  };
}

async function diagnosticPushSiteClassificationInventory() {
  return {
    en: parseDiagnosticPushSiteClassification(await requiredSource("docs/en/maintainers/reference-coverage-audit.md"), "docs/en/maintainers/reference-coverage-audit.md"),
    ja: parseDiagnosticPushSiteClassification(await requiredSource("docs/ja/maintainers/reference-coverage-audit.md"), "docs/ja/maintainers/reference-coverage-audit.md")
  };
}

async function rendererOutputCoverageMatrixInventory() {
  return {
    en: parseRendererOutputCoverageMatrix(await requiredSource("docs/en/maintainers/reference-coverage-audit.md"), "docs/en/maintainers/reference-coverage-audit.md"),
    ja: parseRendererOutputCoverageMatrix(await requiredSource("docs/ja/maintainers/reference-coverage-audit.md"), "docs/ja/maintainers/reference-coverage-audit.md")
  };
}

function parseDiagnosticCoverageMatrix(source, filePath) {
  const rows = markdownTableRowsAfterHeading(source, /diagnostic coverage matrix/iu, filePath);
  return rows.map((cells) => ({
    code: stripInlineMarkdown(cells[0]),
    severity: stripInlineMarkdown(cells[1]),
    triggerCategory: stripInlineMarkdown(cells[2]),
    coverageTargets: markdownLinks(cells[3]),
    status: stripInlineMarkdown(cells[4])
  })).filter((row) => row.code);
}

function parseDiagnosticPushSiteClassification(source, filePath) {
  const rows = markdownTableRowsAfterHeading(source, /diagnostic push site classification matrix/iu, filePath);
  return rows.map((cells) => ({
    code: stripInlineMarkdown(cells[0]),
    sources: backtickedTerms(cells[1]),
    classification: stripInlineMarkdown(cells[2]),
    coverageTargets: markdownLinks(cells[3]),
    notes: stripInlineMarkdown(cells[4])
  })).filter((row) => row.code);
}

function parseRendererOutputCoverageMatrix(source, filePath) {
  const rows = markdownTableRowsAfterHeading(source, /renderer\s*\/\s*export output coverage matrix/iu, filePath);
  return rows.map((cells) => ({
    cluster: stripInlineMarkdown(cells[0]),
    normalizedCluster: normalizeMatrixCell(cells[0]),
    sourceOfTruth: stripInlineMarkdown(cells[1]),
    coverageTargets: markdownLinks(cells[2]),
    representativeExample: stripInlineMarkdown(cells[3]),
    artifactToVerify: stripInlineMarkdown(cells[4])
  })).filter((row) => row.cluster);
}

function markdownTableRowsAfterHeading(source, headingPattern, filePath) {
  const lines = source.split(/\r?\n/u);
  const headingIndex = lines.findIndex((line) => /^#{2,6}\s+/u.test(line) && headingPattern.test(line));
  if (headingIndex < 0) {
    failures.push(`${filePath}: missing matrix heading ${headingPattern}.`);
    return [];
  }
  const tableStart = lines.findIndex((line, index) => index > headingIndex && line.trim().startsWith("|"));
  if (tableStart < 0) {
    failures.push(`${filePath}: missing markdown table after ${lines[headingIndex].trim()}.`);
    return [];
  }
  const tableLines = [];
  for (const line of lines.slice(tableStart)) {
    if (!line.trim().startsWith("|")) {
      break;
    }
    tableLines.push(line);
  }
  return tableLines
    .slice(2)
    .map(markdownTableCells)
    .filter((cells) => cells.length > 0);
}

function markdownTableCells(line) {
  return line
    .trim()
    .replace(/^\|/u, "")
    .replace(/\|$/u, "")
    .split("|")
    .map((cell) => cell.trim());
}

function markdownLinks(cell) {
  return [...cell.matchAll(/\[([^\]]+)\]\(([^)]+)\)/gu)].map((match) => ({
    label: stripInlineMarkdown(match[1]),
    target: match[2]
  }));
}

function backtickedTerms(cell) {
  return [...cell.matchAll(/`([^`]+)`/gu)].map((match) => match[1]);
}

function stripInlineMarkdown(value) {
  return value
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .replace(/<br\s*\/?>/giu, " ")
    .trim();
}

function normalizeMatrixCell(value) {
  return stripInlineMarkdown(value).toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim();
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
    markerId: `external-input.${id}`,
    label,
    count: items.length,
    coverageTargets
  };
}

function mergeCsvValue(left, right) {
  return unique(`${left}, ${right}`.split(/,\s*/u)).join(", ");
}

async function auditExternalInputConfigurationReadiness(externalInputs, referencePages) {
  const referencePagePaths = new Set([...referencePages.en, ...referencePages.ja].map((page) => page.path));
  for (const category of externalInputs.categories) {
    if (category.count === 0) {
      failures.push(`External input/configuration category is empty: ${category.label}`);
    }
    for (const target of category.coverageTargets) {
      if (target.includes("/reference/") && !referencePagePaths.has(target)) {
        failures.push(`${category.label}: coverage target is missing: ${target}`);
        continue;
      }
      const source = await requiredSource(target);
      const markers = new Set(coverageMarkers(source));
      if (!markers.has(category.markerId)) {
        failures.push(`${category.label}: missing coverage marker ${category.markerId} in ${target}`);
      }
    }
  }
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
    "packages/core/src/renderer-message-loader.ts",
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
    const exportedFunctions = [...source.matchAll(/export function\s+([A-Za-z0-9_]+)/gu)].map((match) => match[1]);
    const markdownHeadings = [...source.matchAll(/["']#\s+([^"']+)["']/gu)].map((match) => match[1]);
    for (const value of unique([
      ...headingIds.map((id) => `heading:${id}`),
      ...tableHeaders.map((key) => `message:${key}`),
      ...classes.map((className) => `class:${className}`),
      ...exportedFunctions.map((functionName) => `function:${functionName}`),
      ...markdownHeadings.map((heading) => `markdown-heading:${heading}`)
    ])) {
      features.push({
        id: `renderer-output.${filePath}.${slug(value)}`,
        source: filePath,
        value
      });
    }
  }
  return features;
}

async function diagnosticPushSiteInventory() {
  const supportedCodes = new Set(inventory.diagnosticCodes.map((entry) => entry.code));
  const files = (await collectFiles("packages/core/src")).filter((filePath) => [".ts", ".tsx"].includes(extname(filePath)));
  const entries = [];
  for (const filePath of files) {
    const source = await readFile(join(rootDir, filePath), "utf8");
    const detections = [
      ...[...source.matchAll(/createMarkVSpecDiagnostic\(\s*["'][^"']+["']\s*,\s*["']([^"']+)["']/gsu)].map((match) => ({
        code: match[1],
        kind: "createMarkVSpecDiagnostic"
      })),
      ...[...source.matchAll(/code:\s*["']([^"']+)["']/gu)].map((match) => ({
        code: match[1],
        kind: "diagnostic-object-code"
      }))
    ].filter((entry) => supportedCodes.has(entry.code));

    const byCode = new Map();
    for (const detection of detections) {
      const key = `${detection.code}:${detection.kind}`;
      const existing = byCode.get(key) ?? {
        id: `diagnostic-push.${detection.code}.${slug(filePath)}.${detection.kind}`,
        code: detection.code,
        source: filePath,
        kind: detection.kind,
        count: 0
      };
      existing.count += 1;
      byCode.set(key, existing);
    }
    entries.push(...byCode.values());
  }
  return entries.sort((left, right) =>
    left.code.localeCompare(right.code) || left.source.localeCompare(right.source) || left.kind.localeCompare(right.kind)
  );
}

function diagnosticPushSitesByCode() {
  const byCode = new Map();
  for (const pushSite of inventory.diagnosticPushSites) {
    const entries = byCode.get(pushSite.code) ?? [];
    entries.push(pushSite);
    byCode.set(pushSite.code, entries);
  }
  return new Map([...byCode.entries()].sort(([left], [right]) => left.localeCompare(right)));
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

function generatedBlock(source, marker) {
  const pattern = new RegExp(`<!-- markvspec-generated:${escapeRegExp(marker)}:start -->([\\s\\S]*?)<!-- markvspec-generated:${escapeRegExp(marker)}:end -->`, "u");
  return source.match(pattern)?.[1] ?? "";
}

function generatedTableFirstCellValues(source) {
  return new Set(source.split(/\r?\n/u).flatMap((line) => {
    const match = line.match(/^\|\s*`([^`]+)`\s*\|/u);
    return match ? [match[1]] : [];
  }));
}

function elementTypeCatalogEntries(source) {
  const section = markdownSectionBeforeHeading(source, "Common Types", "Common Properties");
  return new Set(section.split(/\r?\n/u).flatMap((line) => {
    const tableRow = line.match(/^\|\s*`([^`]+)`\s*\|/u);
    if (tableRow) {
      return [tableRow[1]];
    }
    if (!line.match(/^-\s+/u)) {
      return [];
    }
    return [...line.matchAll(/`([^`]+)`/gu)].map((match) => match[1]);
  }));
}

function markdownSectionBeforeHeading(source, startHeading, endHeading) {
  const lines = source.split(/\r?\n/u);
  const start = lines.findIndex((line) => line.trim() === `### ${startHeading}`);
  if (start < 0) {
    return "";
  }
  const end = lines.findIndex((line, index) => index > start && line.trim() === `### ${endHeading}`);
  return lines.slice(start, end < 0 ? undefined : end).join("\n");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
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

function sectionProductionName(value) {
  return value.replace(/[A-Z]/gu, (char, index) => `${index === 0 ? "" : "_"}${char.toLowerCase()}`);
}

function structuredItemCount() {
  return inventory.structuredItemContexts.reduce((count, context) => count + context.items.length, 0);
}

function printReport() {
  const summaryRows = [
    ["grammar sections", inventory.grammarSections.length],
    ["structured item contexts", inventory.structuredItemContexts.length],
    ["structured items", structuredItemCount()],
    ["element types", inventory.elementTypes.length],
    ["element properties", inventory.elementProperties.length],
    ["diagnostic codes", inventory.diagnosticCodes.length],
    ["diagnostic push sites", inventory.diagnosticPushSites.length],
    ["diagnostic push site classification rows", inventory.diagnosticPushSiteClassification.en.length],
    ["renderer output features", inventory.rendererOutputFeatures.length],
    ["diagnostic coverage matrix rows", inventory.diagnosticCoverageMatrix.en.length],
    ["stable renderer/export output matrix clusters", stableRendererOutputClusters().length],
    ["report-only renderer/export output clusters", rendererReportOnlyClusters().length],
    ["report-only renderer/export output features", rendererReportOnlyFeatureCount()],
    ["generated Reference marker files", inventory.generatedReferenceMarkers.length],
    ["Reference coverage features", inventory.referenceCoverage.features.length],
    ["Reference coverage markers", inventory.referenceCoverage.markers.length],
    ["stable grammar section coverage entries", inventory.grammarSectionCoverage.entries.length],
    ["remaining report-only structured items", inventory.grammarSectionCoverage.remainingStructuredItems],
    ["stable element generated coverage entries", inventory.elementGeneratedCoverage.entries.length],
    ["remaining report-only element prose-depth items", inventory.elementGeneratedCoverage.remainingProseDepth],
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
    ["stable feature mapping families", inventory.featureMapping.stable.length],
    ["report-only feature mapping families", inventory.featureMapping.reportOnly.length],
    ["examples catalog entries", inventory.examples.catalogEntries.length],
    ["example files", inventory.examples.files.length]
  ];

  console.log("Reference coverage audit summary:");
  for (const [label, count] of summaryRows) {
    console.log(`- ${label}: ${count}`);
  }

  printReferenceCoverageMarkerReport();
  printGrammarSectionCoverageReport();
  printElementGeneratedCoverageReport();
  printExternalInputConfigurationReport();
  printDiagnosticCoverageMatrixReport();
  printRendererOutputCoverageMatrixReport();
  printFeatureMappingReport();

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

function printDiagnosticCoverageMatrixReport() {
  if (!inventory.diagnosticCoverageMatrix) {
    return;
  }
  console.log("\nDiagnostic coverage matrix report:");
  for (const locale of ["en", "ja"]) {
    const rows = inventory.diagnosticCoverageMatrix[locale];
    const missing = inventory.diagnosticCodes
      .map((entry) => entry.code)
      .filter((code) => !rows.some((row) => row.code === code));
    console.log(`- ${locale}: ${rows.length} row(s), missing diagnostic codes: ${missing.length}`);
  }
  const pushSitesByCode = diagnosticPushSitesByCode();
  console.log("Diagnostic push site classification report:");
  for (const locale of ["en", "ja"]) {
    const rows = inventory.diagnosticPushSiteClassification[locale];
    const stableRows = rows.filter((row) => normalizeMatrixCell(row.classification) === "stable covered");
    const missing = [...pushSitesByCode.keys()].filter((code) => !rows.some((row) => row.code === code));
    console.log(`- ${locale}: ${stableRows.length} stable row(s), ${missing.length} unclassified code(s), ${inventory.diagnosticPushSites.length} detected push site source(s)`);
  }
}

function printRendererOutputCoverageMatrixReport() {
  if (!inventory.rendererOutputCoverageMatrix) {
    return;
  }
  console.log("\nRenderer/export output coverage matrix report:");
  for (const cluster of stableRendererOutputClusters()) {
    const enRow = inventory.rendererOutputCoverageMatrix.en.find((row) => cluster.normalizedClusters.includes(row.normalizedCluster));
    const jaRow = inventory.rendererOutputCoverageMatrix.ja.find((row) => cluster.normalizedClusters.includes(row.normalizedCluster));
    console.log(`- ${cluster.label}: en:${enRow ? "covered" : "missing"}, ja:${jaRow ? "covered" : "missing"}, signals:${cluster.signals.length}`);
  }
  console.log(`  Report-only renderer/export output features: ${rendererReportOnlyFeatureCount()}`);
  console.log("  Report-only renderer/export output clusters:");
  for (const cluster of rendererReportOnlyClusters()) {
    console.log(`  - ${cluster.label}: ${cluster.count} feature(s); reason: ${cluster.reason}`);
  }
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

function printGrammarSectionCoverageReport() {
  if (!inventory.grammarSectionCoverage) {
    return;
  }
  console.log("\nGrammar section coverage report:");
  console.log(`- Stable recognized sections: ${inventory.grammarSectionCoverage.stableCount}`);
  console.log(`- Remaining report-only structured items: ${inventory.grammarSectionCoverage.remainingStructuredItems}; reason: individual structured item prose depth is not markerized item by item.`);
}

function printElementGeneratedCoverageReport() {
  if (!inventory.elementGeneratedCoverage) {
    return;
  }
  console.log("\nElement generated coverage report:");
  console.log(`- Stable generated element entries: ${inventory.elementGeneratedCoverage.stableCount}`);
  console.log(`- Remaining report-only element prose-depth items: ${inventory.elementGeneratedCoverage.remainingProseDepth}; reason: type/property explanation depth is not markerized item by item.`);
}

function printExternalInputConfigurationReport() {
  if (!inventory.externalInputs || inventory.externalInputs.categories.length === 0) {
    return;
  }
  console.log("\nExternal input/configuration coverage report:");
  for (const category of inventory.externalInputs.categories) {
    console.log(`- ${category.label}: ${category.count} item(s); marker: ${category.markerId}; coverage: ${category.coverageTargets.join(", ")}`);
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

function printFeatureMappingReport() {
  if (!inventory.featureMapping) {
    return;
  }
  console.log("\nFeature-to-Reference mapping report:");
  console.log("Stable mappings:");
  for (const entry of inventory.featureMapping.stable) {
    console.log(`- ${entry.family}: ${entry.count} feature(s); evidence: ${entry.evidence}; failure: ${entry.failureMode}`);
  }
  console.log("Report-only mappings:");
  for (const entry of inventory.featureMapping.reportOnly) {
    console.log(`- ${entry.family}: ${entry.count} feature(s); reason: ${entry.reason}`);
  }
}

function rendererReportOnlyFeatureCount() {
  return rendererReportOnlyFeatures().length;
}

function rendererReportOnlyFeatures() {
  const stableSignals = new Set(stableRendererOutputClusters().flatMap((cluster) =>
    cluster.signals.map((signal) => `${signal.source}\0${signal.value}`)
  ));
  return inventory.rendererOutputFeatures.filter((feature) => !stableSignals.has(`${feature.source}\0${feature.value}`));
}

function rendererReportOnlyClusters() {
  const clusters = new Map();
  for (const feature of rendererReportOnlyFeatures()) {
    const classification = rendererReportOnlyClusterForFeature(feature);
    const existing = clusters.get(classification.id) ?? {
      id: classification.id,
      label: classification.label,
      reason: classification.reason,
      count: 0
    };
    existing.count += 1;
    clusters.set(classification.id, existing);
  }
  return [...clusters.values()].sort((left, right) => left.label.localeCompare(right.label));
}

function rendererReportOnlyClusterForFeature(feature) {
  if (feature.source === "packages/document-renderer/src/index.ts") {
    if (feature.value.startsWith("message:")) {
      return {
        id: "document-renderer-labels",
        label: "Document renderer labels and table columns",
        reason: "Labels are localized through renderer messages; row-level prose depth and artifact quality remain manual."
      };
    }
    if (feature.value.startsWith("class:") || feature.value.startsWith("function:")) {
      return {
        id: "document-renderer-support",
        label: "Document renderer layout, tables, print, and helper support",
        reason: "Shared rendering support affects many sections and requires artifact/manual review before marker-level failure is safe."
      };
    }
  }
  if (feature.source === "packages/document-renderer/src/static-element-spec.ts") {
    return {
      id: "element-spec-details",
      label: "Element detail spec labels, chips, and helper rows",
      reason: "Stable Display Content/Input Form clusters cover the main boxes; detailed columns and chips still need artifact/manual review."
    };
  }
  if (feature.source === "packages/document-renderer/src/static-state-view-renderer.ts") {
    return {
      id: "state-view-details",
      label: "State view layout, condition, sample, and wireframe details",
      reason: "Stable State Views cluster covers the section; detailed condition/sample/wireframe rendering remains manual."
    };
  }
  if (feature.source === "packages/exporter/src/index.ts") {
    return {
      id: "exporter-runtime-ui",
      label: "Exporter runtime UI, diagnostics severity, and file helpers",
      reason: "Stable export diagnostics/document-list clusters cover primary outputs; runtime UI and helper behavior remain manual."
    };
  }
  if (feature.source === "packages/vscode-extension/src/project-preview-document.ts") {
    return {
      id: "project-preview-details",
      label: "Project preview tables, diagnostics, and note details",
      reason: "Stable project preview cluster covers the main document; table/detail quality remains artifact/manual review."
    };
  }
  if (feature.source === "packages/vscode-extension/src/preview-design-document-renderer.ts" || feature.source === "packages/vscode-extension/src/preview-html-postprocess.ts") {
    return {
      id: "vscode-preview-postprocess",
      label: "VS Code preview render-key and HTML postprocess behavior",
      reason: "Preview-only plumbing is visible through VS Code artifacts and needs manual/regression review before stable marker checks."
    };
  }
  if (feature.source === "packages/core/src/renderer-message-loader.ts") {
    return {
      id: "renderer-message-loader-details",
      label: "Renderer message loader diagnostics and resolution details",
      reason: "Stable localized labels cluster covers primary message resolution; detailed loader diagnostics remain manual."
    };
  }
  return {
    id: "renderer-export-other",
    label: "Other renderer/export output signals",
    reason: "Unclassified output signal requires triage before stable coverage."
  };
}
