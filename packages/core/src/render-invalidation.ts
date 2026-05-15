import { parseMarkdownDocument, topLevelProseLines } from "./markdown-document.js";
import { collectSectionAst, type BlockAst, type SectionAst, type SourceRange } from "./markdown-section-ast.js";
import { aliasForModelPath, isCollectionModelSamplePath, sourcePathKey } from "./model-paths.js";
import {
  parseActionSectionSemantics,
  parseElementSectionSemantics,
  parseLayoutSectionSemantics,
  parseSmallSectionSemantics,
  type SemanticDependency
} from "./markdown-section-semantic.js";
import type { MarkVSpecDiagnostic, MarkVSpecElement, MarkVSpecFormGroup, MarkVSpecLayoutGroup, MarkVSpecModelSampleSet } from "./types.js";

export interface MarkVSpecRenderInvalidation {
  changedSectionIds: string[];
  impactedRenderKeys: string[];
  wireframeRenderKeys: string[];
  previewDocumentRenderKeys: string[];
  diagnosticsRenderKeys: string[];
  diagnosticsMayChange: boolean;
  dependencies: SemanticDependency[];
  requiresFullRender: boolean;
  fullRenderReasons: string[];
}

interface SectionRenderSemantics {
  sectionId: string;
  renderKeys: string[];
  dependencies: SemanticDependency[];
}

interface SafePartialDecision {
  requiresFullRender: boolean;
  impactedRenderKeys: string[];
  wireframeRenderKeys: string[];
  previewDocumentRenderKeys: string[];
  diagnosticsMayChange: boolean;
  fullRenderReasons: string[];
}

export function computeMarkVSpecRenderInvalidation(previousSource: string, currentSource: string): MarkVSpecRenderInvalidation {
  const previous = renderSemanticsForSource(previousSource);
  const current = renderSemanticsForSource(currentSource);
  const changedSectionIds = changedSections(previous.fingerprints, current.fingerprints);
  const previousBySection = new Map(previous.sections.map((section) => [section.sectionId, section]));
  const currentBySection = new Map(current.sections.map((section) => [section.sectionId, section]));
  const dependencies = [...previous.dependencies, ...current.dependencies];
  const impactedRenderKeys = new Set<string>();

  for (const sectionId of changedSectionIds) {
    if (sectionId === "section:Screen") {
      impactedRenderKeys.add(previous.screenRenderKey);
      impactedRenderKeys.add(current.screenRenderKey);
    }
    for (const key of previousBySection.get(sectionId)?.renderKeys ?? []) {
      impactedRenderKeys.add(key);
    }
    for (const key of currentBySection.get(sectionId)?.renderKeys ?? []) {
      impactedRenderKeys.add(key);
    }
    for (const dependency of dependencies) {
      if (dependency.source.type === "section" && dependency.source.id === sectionId && dependency.target.type === "render") {
        impactedRenderKeys.add(dependency.target.id);
      }
    }
  }
  const safePartial = safePartialRenderInvalidation(previous, current, changedSectionIds, impactedRenderKeys);

  return {
    changedSectionIds,
    impactedRenderKeys: safePartial.requiresFullRender
      ? [...impactedRenderKeys].sort()
      : safePartial.impactedRenderKeys,
    wireframeRenderKeys: safePartial.requiresFullRender ? [] : safePartial.wireframeRenderKeys,
    previewDocumentRenderKeys: safePartial.requiresFullRender ? [] : safePartial.previewDocumentRenderKeys,
    diagnosticsRenderKeys: safePartial.diagnosticsMayChange ? ["diagnostics:list"] : [],
    diagnosticsMayChange: safePartial.diagnosticsMayChange,
    dependencies,
    requiresFullRender: safePartial.requiresFullRender,
    fullRenderReasons: safePartial.fullRenderReasons
  };
}

function safePartialRenderInvalidation(
  previous: ReturnType<typeof renderSemanticsForSource>,
  current: ReturnType<typeof renderSemanticsForSource>,
  changedSectionIds: string[],
  impactedRenderKeys: Set<string>
): SafePartialDecision {
  if (changedSectionIds.length === 0) {
    return {
      requiresFullRender: false,
      impactedRenderKeys: [],
      wireframeRenderKeys: [],
      previewDocumentRenderKeys: [],
      diagnosticsMayChange: false,
      fullRenderReasons: []
    };
  }

  if (changedSectionIds.length === 1 && changedSectionIds[0] === "section:Elements") {
    return safePartialElementInvalidation(previous, current, impactedRenderKeys);
  }

  if (changedSectionIds.length === 1 && changedSectionIds[0]?.startsWith("section:Layout")) {
    return safePartialLayoutInvalidation(previous, current, impactedRenderKeys);
  }

  return {
    requiresFullRender: true,
    impactedRenderKeys: [...impactedRenderKeys].sort(),
    wireframeRenderKeys: [],
    previewDocumentRenderKeys: [],
    diagnosticsMayChange: true,
    fullRenderReasons: ["Changed sections are not limited to Elements or a safe Layout."]
  };
}

function renderSemanticsForSource(source: string): {
  fingerprints: Map<string, string>;
  screenRenderKey: string;
  sections: SectionRenderSemantics[];
  dependencies: SemanticDependency[];
  elements: MarkVSpecElement[];
  formGroups: MarkVSpecFormGroup[];
  layoutGroups: MarkVSpecLayoutGroup[];
  modelSamples: MarkVSpecModelSampleSet[];
  states: string[];
} {
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const sections = collectSectionAst(document);
  const fingerprints = new Map([
    ["section:Screen", screenFingerprint(document)],
    ...sections.map((section): [string, string] => [section.id, sectionFingerprint(section)])
  ]);
  const layoutSemantics = parseLayoutSectionSemantics(document);
  const smallSemantics = parseSmallSectionSemantics(document);
  const sectionResults = [
    ...layoutSemantics.sectionResults,
    ...parseActionSectionSemantics(document).sectionResults,
    ...smallSemantics.sectionResults
  ];
  const elementSemantics = parseElementSectionSemantics(document);

  return {
    fingerprints,
    screenRenderKey: `screen:${screenIdForDocument(document)}`,
    sections: [...sectionResults, ...elementSemantics.sectionResults].map((result) => ({
      sectionId: result.sectionId,
      renderKeys: result.renderKeys,
      dependencies: result.dependencies
    })),
    dependencies: [...sectionResults, ...elementSemantics.sectionResults].flatMap((result) => result.dependencies),
    elements: elementSemantics.elements,
    formGroups: smallSemantics.formGroups,
    layoutGroups: layoutSemantics.layoutGroups,
    modelSamples: smallSemantics.modelSamples,
    states: smallSemantics.states.map((state) => state.name)
  };
}

function safePartialElementInvalidation(
  previous: ReturnType<typeof renderSemanticsForSource>,
  current: ReturnType<typeof renderSemanticsForSource>,
  impactedRenderKeys: Set<string>
): SafePartialDecision {
  const previousById = new Map(previous.elements.map((element) => [element.id, element]));
  const currentById = new Map(current.elements.map((element) => [element.id, element]));
  const previousIds = [...previousById.keys()].sort();
  const currentIds = [...currentById.keys()].sort();
  if (JSON.stringify(previousIds) !== JSON.stringify(currentIds)) {
    return {
      requiresFullRender: true,
      impactedRenderKeys: [...impactedRenderKeys].sort(),
      wireframeRenderKeys: [],
      previewDocumentRenderKeys: [],
      diagnosticsMayChange: true,
      fullRenderReasons: ["Element IDs changed."]
    };
  }

  const changedElementIds = previousIds.filter((id) => {
    const previousElement = previousById.get(id);
    const currentElement = currentById.get(id);
    return previousElement && currentElement && elementPartialFingerprint(previousElement) !== elementPartialFingerprint(currentElement);
  });
  if (changedElementIds.length !== 1) {
    return {
      requiresFullRender: true,
      impactedRenderKeys: [...impactedRenderKeys].sort(),
      wireframeRenderKeys: [],
      previewDocumentRenderKeys: [],
      diagnosticsMayChange: true,
      fullRenderReasons: ["Element changes do not target exactly one existing element."]
    };
  }

  const elementId = changedElementIds[0];
  const previousElement = previousById.get(elementId);
  const currentElement = currentById.get(elementId);
  if (!previousElement || !currentElement) {
    return {
      requiresFullRender: true,
      impactedRenderKeys: [...impactedRenderKeys].sort(),
      wireframeRenderKeys: [],
      previewDocumentRenderKeys: [],
      diagnosticsMayChange: true,
      fullRenderReasons: ["Element target is missing before or after the change."]
    };
  }

  const unsafeReasons = unsafeElementPartialReasons(previousElement, currentElement);
  if (unsafeReasons.length > 0) {
    return {
      requiresFullRender: true,
      impactedRenderKeys: [...impactedRenderKeys].sort(),
      wireframeRenderKeys: [],
      previewDocumentRenderKeys: [],
      diagnosticsMayChange: true,
      fullRenderReasons: unsafeReasons
    };
  }
  const sourceDiagnosticReasons = unsafeSourceDiagnosticReasons(previous, current, elementId);
  if (sourceDiagnosticReasons.length > 0) {
    return {
      requiresFullRender: true,
      impactedRenderKeys: [...impactedRenderKeys].sort(),
      wireframeRenderKeys: [],
      previewDocumentRenderKeys: [],
      diagnosticsMayChange: true,
      fullRenderReasons: sourceDiagnosticReasons
    };
  }
  const repeatContextReasons = unsafeModelRepeatContextReasons(previous, current, elementId);
  if (repeatContextReasons.length > 0) {
    return {
      requiresFullRender: true,
      impactedRenderKeys: [...impactedRenderKeys].sort(),
      wireframeRenderKeys: [],
      previewDocumentRenderKeys: [],
      diagnosticsMayChange: false,
      fullRenderReasons: repeatContextReasons
    };
  }
  const layoutContextReasons = unsafeLayoutContextReasons(current.layoutGroups, elementId);
  if (layoutContextReasons.length > 0) {
    return {
      requiresFullRender: true,
      impactedRenderKeys: [...impactedRenderKeys].sort(),
      wireframeRenderKeys: [],
      previewDocumentRenderKeys: [],
      diagnosticsMayChange: false,
      fullRenderReasons: layoutContextReasons
    };
  }

  const wireframeRenderKeys = [`element:${elementId}`];
  const previewDocumentRenderKeys = ["elements:list", ...formGroupRenderKeysForElement(current.formGroups, elementId)];
  return {
    requiresFullRender: false,
    impactedRenderKeys: [...wireframeRenderKeys, ...previewDocumentRenderKeys],
    wireframeRenderKeys,
    previewDocumentRenderKeys,
    diagnosticsMayChange: false,
    fullRenderReasons: []
  };
}

function safePartialLayoutInvalidation(
  previous: ReturnType<typeof renderSemanticsForSource>,
  current: ReturnType<typeof renderSemanticsForSource>,
  impactedRenderKeys: Set<string>
): SafePartialDecision {
  const previousByKey = new Map(previous.layoutGroups.map((layout) => [layoutIdentity(layout), layout]));
  const currentByKey = new Map(current.layoutGroups.map((layout) => [layoutIdentity(layout), layout]));
  const previousKeys = [...previousByKey.keys()].sort();
  const currentKeys = [...currentByKey.keys()].sort();
  if (JSON.stringify(previousKeys) !== JSON.stringify(currentKeys)) {
    return {
      requiresFullRender: true,
      impactedRenderKeys: [...impactedRenderKeys].sort(),
      wireframeRenderKeys: [],
      previewDocumentRenderKeys: [],
      diagnosticsMayChange: true,
      fullRenderReasons: ["Layout IDs or viewports changed."]
    };
  }

  const changedLayoutKeys = previousKeys.filter((key) => {
    const previousLayout = previousByKey.get(key);
    const currentLayout = currentByKey.get(key);
    return previousLayout && currentLayout && layoutPartialFingerprint(previousLayout) !== layoutPartialFingerprint(currentLayout);
  });
  if (changedLayoutKeys.length !== 1) {
    return {
      requiresFullRender: true,
      impactedRenderKeys: [...impactedRenderKeys].sort(),
      wireframeRenderKeys: [],
      previewDocumentRenderKeys: [],
      diagnosticsMayChange: true,
      fullRenderReasons: ["Layout changes do not target exactly one existing layout."]
    };
  }

  const layoutKey = changedLayoutKeys[0];
  const previousLayout = previousByKey.get(layoutKey);
  const currentLayout = currentByKey.get(layoutKey);
  if (!previousLayout || !currentLayout) {
    return {
      requiresFullRender: true,
      impactedRenderKeys: [...impactedRenderKeys].sort(),
      wireframeRenderKeys: [],
      previewDocumentRenderKeys: [],
      diagnosticsMayChange: true,
      fullRenderReasons: ["Layout target is missing before or after the change."]
    };
  }

  const unsafeReasons = unsafeLayoutPartialReasons(previous, current, previousLayout, currentLayout);
  if (unsafeReasons.length > 0) {
    return {
      requiresFullRender: true,
      impactedRenderKeys: [...impactedRenderKeys].sort(),
      wireframeRenderKeys: [],
      previewDocumentRenderKeys: [],
      diagnosticsMayChange: unsafeReasons.some((reason) => reason.includes("diagnostic")),
      fullRenderReasons: unsafeReasons
    };
  }

  const renderKey = layoutRenderKey(currentLayout);
  const previewDocumentRenderKeys = ["layouts:list"];
  return {
    requiresFullRender: false,
    impactedRenderKeys: [renderKey, ...previewDocumentRenderKeys],
    wireframeRenderKeys: [renderKey],
    previewDocumentRenderKeys,
    diagnosticsMayChange: false,
    fullRenderReasons: []
  };
}

function formGroupRenderKeysForElement(formGroups: MarkVSpecFormGroup[], elementId: string): string[] {
  return formGroups.some((formGroup) => formGroup.fields.some((field) => field.elementId === elementId))
    ? ["form-groups:list"]
    : [];
}

const safeElementDisplayPropertiesByType = new Map<string, Set<string>>([
  ["*", new Set([
    "alt",
    "content",
    "error text",
    "format",
    "help",
    "help src",
    "initial value",
    "label",
    "label src",
    "message",
    "message src",
    "name",
    "placeholder",
    "placeholder src",
    "sample",
    "src",
    "text",
    "title",
    "value"
  ])]
]);

const safeLayoutPartialProperties = new Set([
  "align",
  "gap",
  "justify",
  "marker",
  "overlay",
  "variant"
]);

function unsafeLayoutPartialReasons(
  previous: ReturnType<typeof renderSemanticsForSource>,
  current: ReturnType<typeof renderSemanticsForSource>,
  previousLayout: MarkVSpecLayoutGroup,
  currentLayout: MarkVSpecLayoutGroup
): string[] {
  const reasons: string[] = [];
  if (!isLeafLayoutForPartial(current.layoutGroups, currentLayout)) {
    reasons.push(`Layout ${currentLayout.id} is not a leaf layout for partial updates.`);
  }
  if (layoutHasRepeatContext(previous, previousLayout) || layoutHasRepeatContext(current, currentLayout)) {
    reasons.push(`Layout ${currentLayout.id} participates in model-sample repeat rendering.`);
  }
  if (layoutMembershipFingerprint(previousLayout) !== layoutMembershipFingerprint(currentLayout)) {
    reasons.push("Layout membership changed.");
  }
  if (JSON.stringify(previousLayout.partial) !== JSON.stringify(currentLayout.partial)) {
    reasons.push("Layout partial reference changed.");
  }
  if (
    previousLayout.properties["visible when"] !== currentLayout.properties["visible when"] ||
    previousLayout.properties["hidden when"] !== currentLayout.properties["hidden when"] ||
    previousLayout.properties["disabled when"] !== currentLayout.properties["disabled when"]
  ) {
    reasons.push("Layout conditional visibility or disabled state changed.");
  }

  const unsafePropertyKeys = changedKeys(previousLayout.properties, currentLayout.properties)
    .filter((key) => !safeLayoutPartialProperties.has(key))
    .filter((key) => key !== "visible when" && key !== "hidden when" && key !== "disabled when");
  if (unsafePropertyKeys.length > 0) {
    reasons.push(`Layout properties require full render: ${unsafePropertyKeys.join(", ")}.`);
  }

  return reasons;
}

function layoutIdentity(layout: MarkVSpecLayoutGroup): string {
  return `${layout.viewport}:${layout.id}`;
}

function layoutRenderKey(layout: MarkVSpecLayoutGroup): string {
  return `layout:${layout.viewport}:${layout.id}`;
}

function layoutPartialFingerprint(layout: MarkVSpecLayoutGroup): string {
  return JSON.stringify({
    id: layout.id,
    viewport: layout.viewport,
    name: layout.name,
    kind: layout.kind,
    partial: layout.partial,
    items: layout.items.map((item) => layoutItemFingerprint(item)),
    properties: layout.properties
  });
}

function layoutMembershipFingerprint(layout: MarkVSpecLayoutGroup): string {
  const membership: object[] = [];
  for (const item of layout.items) {
    if (item.type === "contains") {
      membership.push({ type: item.type, targetId: item.targetId });
    } else if (item.type === "field") {
      membership.push({ type: item.type, label: item.label, elementId: item.elementId });
    } else if (item.type === "slot") {
      membership.push({ type: item.type, name: item.name });
    }
  }
  return JSON.stringify(membership);
}

function layoutItemFingerprint(item: MarkVSpecLayoutGroup["items"][number]): object {
  if (item.type === "contains") {
    return { type: item.type, targetId: item.targetId };
  }
  if (item.type === "field") {
    return { type: item.type, label: item.label, elementId: item.elementId };
  }
  if (item.type === "slot") {
    return { type: item.type, name: item.name };
  }
  if (item.type === "property") {
    return { type: item.type, key: item.key, value: item.value, scope: item.scope };
  }
  return { type: item.type, value: item.value, scope: item.scope };
}

function isLeafLayoutForPartial(layoutGroups: MarkVSpecLayoutGroup[], layout: MarkVSpecLayoutGroup): boolean {
  const layoutIds = new Set(layoutGroups.map((group) => group.id));
  return !layout.partial
    && layout.items.every((item) => {
      if (item.type === "slot") {
        return false;
      }
      return item.type !== "contains" || !layoutIds.has(item.targetId);
    });
}

function layoutHasRepeatContext(
  source: ReturnType<typeof renderSemanticsForSource>,
  layout: MarkVSpecLayoutGroup
): boolean {
  const elementById = new Map(source.elements.map((element) => [element.id, element]));
  const repeatSources = repeatingSourceAliases(source.modelSamples);
  if (repeatSources.length === 0) {
    return false;
  }

  return layout.items.some((item) => {
    const elementId = item.type === "contains" ? item.targetId : item.type === "field" ? item.elementId : undefined;
    const element = elementId ? elementById.get(elementId) : undefined;
    const sourceProperty = stringProperty(element?.properties["src"]);
    return Boolean(sourceProperty && repeatSources.some((alias) => sourceProperty.startsWith(`${alias}.`)));
  });
}

function unsafeElementPartialReasons(previous: MarkVSpecElement, current: MarkVSpecElement): string[] {
  const reasons: string[] = [];
  if (previous.type !== current.type) {
    reasons.push("Element type changed.");
  }
  if (JSON.stringify(previous.routeParams) !== JSON.stringify(current.routeParams)) {
    reasons.push("Element route params changed.");
  }
  if (JSON.stringify(previous.selectOptions) !== JSON.stringify(current.selectOptions)) {
    reasons.push("Element select options changed.");
  }
  if (JSON.stringify(previous.tableColumns) !== JSON.stringify(current.tableColumns) || JSON.stringify(previous.tableRows) !== JSON.stringify(current.tableRows)) {
    reasons.push("Element table structure changed.");
  }
  if (
    JSON.stringify(previous.visibleWhen) !== JSON.stringify(current.visibleWhen) ||
    JSON.stringify(previous.hiddenWhen) !== JSON.stringify(current.hiddenWhen) ||
    JSON.stringify(previous.disabledWhen) !== JSON.stringify(current.disabledWhen)
  ) {
    reasons.push("Element conditional visibility or disabled state changed.");
  }
  if (JSON.stringify(previous.validations) !== JSON.stringify(current.validations)) {
    reasons.push("Element validation references changed.");
  }

  const changedPropertyKeys = changedKeys(previous.properties, current.properties)
    .filter((key) => !elementPropertyHasDedicatedFullRenderReason(key));
  const safeElementDisplayProperties = safeElementDisplayPropertiesByType.get(current.type) ?? safeElementDisplayPropertiesByType.get("*") ?? new Set<string>();
  const unsafePropertyKeys = changedPropertyKeys.filter((key) => !safeElementDisplayProperties.has(key));
  if (unsafePropertyKeys.length > 0) {
    reasons.push(`Element properties require full render: ${unsafePropertyKeys.join(", ")}.`);
  }
  return reasons;
}

function unsafeSourceDiagnosticReasons(
  previous: ReturnType<typeof renderSemanticsForSource>,
  current: ReturnType<typeof renderSemanticsForSource>,
  elementId: string
): string[] {
  const previousElement = previous.elements.find((element) => element.id === elementId);
  const currentElement = current.elements.find((element) => element.id === elementId);
  const previousSource = stringProperty(previousElement?.properties["src"]);
  const currentSource = stringProperty(currentElement?.properties["src"]);
  if (!previousSource || !currentSource || previousSource === currentSource) {
    return [];
  }

  const previousMatch = modelSampleSourceMatch(previous.modelSamples, previousSource);
  const currentMatch = modelSampleSourceMatch(current.modelSamples, currentSource);
  if (!previousMatch && !currentMatch) {
    return [];
  }
  if (previousMatch?.valid === true && currentMatch?.valid === true) {
    return [];
  }

  return ["Element source can change Model Samples diagnostics."];
}

function unsafeModelRepeatContextReasons(
  previous: ReturnType<typeof renderSemanticsForSource>,
  current: ReturnType<typeof renderSemanticsForSource>,
  elementId: string
): string[] {
  const previousElement = previous.elements.find((element) => element.id === elementId);
  const currentElement = current.elements.find((element) => element.id === elementId);
  const sourceChanged = previousElement && currentElement && previousElement.properties["src"] !== currentElement.properties["src"];
  if (!sourceChanged) {
    return [];
  }
  const repeatSources = [
    ...repeatingSourceAliases(previous.modelSamples),
    ...repeatingSourceAliases(current.modelSamples)
  ];
  const sources = [
    stringProperty(previousElement?.properties["src"]),
    stringProperty(currentElement?.properties["src"])
  ].filter(Boolean);
  if (!sources.some((source) => repeatSources.some((alias) => sourcePathKey(source).startsWith(`${alias}.`)))) {
    return [];
  }

  return ["Element source participates in model-sample repeat rendering."];
}

function modelSampleSourceMatch(samples: MarkVSpecModelSampleSet[], source: string): { valid: boolean } | undefined {
  const sourceKey = sourcePathKey(source);
  const alias = samples.map((sample) => aliasForModelPath(sample.path)).find((candidate) => sourceKey.startsWith(`${candidate}.`));
  if (!alias) {
    return undefined;
  }
  const matchingSamples = samples.filter((sample) => aliasForModelPath(sample.path) === alias);
  if (matchingSamples.length === 0) {
    return undefined;
  }
  const column = sourceKey.slice(alias.length + 1);
  return { valid: matchingSamples.some((sample) => sample.columns.includes(column)) };
}

function repeatingSourceAliases(samples: MarkVSpecModelSampleSet[]): string[] {
  return samples
    .filter((sample) => isCollectionModelSamplePath(sample.path) && sample.rows.length !== 1)
    .map((sample) => aliasForModelPath(sample.path));
}

function unsafeLayoutContextReasons(layoutGroups: MarkVSpecLayoutGroup[], elementId: string): string[] {
  const parentLayoutIds = layoutAncestorIdsForElement(layoutGroups, elementId);
  const contextualLayouts = layoutGroups.filter((group) =>
    parentLayoutIds.has(group.id) &&
    (Boolean(group.properties["visible when"]) || Boolean(group.properties["hidden when"]) || Boolean(group.properties["disabled when"]))
  );
  if (contextualLayouts.length === 0) {
    return [];
  }

  return [`Element is inside layout context requiring full render: ${contextualLayouts.map((group) => group.id).sort().join(", ")}.`];
}

function layoutAncestorIdsForElement(layoutGroups: MarkVSpecLayoutGroup[], elementId: string): Set<string> {
  const layoutById = new Map(layoutGroups.map((group) => [group.id, group]));
  const parentByLayoutId = new Map<string, Set<string>>();
  for (const group of layoutGroups) {
    for (const item of group.items) {
      if (item.type === "contains" && layoutById.has(item.targetId)) {
        const parents = parentByLayoutId.get(item.targetId) ?? new Set<string>();
        parents.add(group.id);
        parentByLayoutId.set(item.targetId, parents);
      }
    }
  }

  const directParents = layoutGroups
    .filter((group) => group.items.some((item) =>
      (item.type === "contains" && item.targetId === elementId) ||
      (item.type === "field" && item.elementId === elementId)
    ))
    .map((group) => group.id);
  const ancestors = new Set<string>();
  const visit = (layoutId: string) => {
    if (ancestors.has(layoutId)) {
      return;
    }
    ancestors.add(layoutId);
    for (const parentId of parentByLayoutId.get(layoutId) ?? []) {
      visit(parentId);
    }
  };
  for (const layoutId of directParents) {
    visit(layoutId);
  }
  return ancestors;
}

function elementPropertyHasDedicatedFullRenderReason(key: string): boolean {
  return key === "visible when" ||
    key === "hidden when" ||
    key === "disabled when" ||
    key === "validation" ||
    key.startsWith("route param ");
}

function changedKeys(previous: Record<string, unknown>, current: Record<string, unknown>): string[] {
  const keys = new Set([...Object.keys(previous), ...Object.keys(current)]);
  return [...keys].filter((key) => JSON.stringify(previous[key]) !== JSON.stringify(current[key])).sort();
}

function stringProperty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function elementPartialFingerprint(element: MarkVSpecElement): string {
  return JSON.stringify({
    type: element.type,
    properties: element.properties,
    routeParams: element.routeParams,
    selectOptions: element.selectOptions,
    tableColumns: element.tableColumns,
    tableRows: element.tableRows,
    visibleWhen: element.visibleWhen,
    hiddenWhen: element.hiddenWhen,
    disabledWhen: element.disabledWhen,
    validations: element.validations
  });
}

function changedSections(previous: Map<string, string>, current: Map<string, string>): string[] {
  const sectionIds = new Set([...previous.keys(), ...current.keys()]);
  return [...sectionIds].filter((sectionId) => previous.get(sectionId) !== current.get(sectionId)).sort();
}

function sectionFingerprint(section: SectionAst): string {
  return [
    section.kind,
    section.title,
    JSON.stringify(section.blocks.map((block) => blockFingerprint(block)))
  ].join("\n---\n");
}

function blockFingerprint(block: BlockAst): unknown {
  return {
    type: block.type,
    text: block.text,
    range: rangeFingerprint(block.range),
    children: block.children.map((child) => blockFingerprint(child)),
    ...("depth" in block ? { depth: block.depth } : {}),
    ...("ordered" in block ? { ordered: block.ordered } : {}),
    ...("rows" in block ? { rows: block.rows } : {}),
    ...("rowSources" in block
      ? {
        rowSources: block.rowSources.map((row) => ({
          cells: row.cells,
          raw: row.raw,
          range: rangeFingerprint(row.range)
        }))
      }
      : {}),
    ...("lang" in block ? { lang: block.lang } : {})
  };
}

function rangeFingerprint(range: SourceRange | undefined): unknown {
  if (!range) {
    return undefined;
  }
  return {
    start: {
      line: range.start.line,
      column: range.start.column
    },
    end: {
      line: range.end.line,
      column: range.end.column
    }
  };
}

function screenFingerprint(document: ReturnType<typeof parseMarkdownDocument>): string {
  const heading = document.headings.find((item) => item.depth === 1)?.text ?? "";
  return [
    JSON.stringify(document.frontMatter),
    heading,
    topLevelProseLines(document).join("\n").trim()
  ].join("\n---\n");
}

function screenIdForDocument(document: ReturnType<typeof parseMarkdownDocument>): string {
  const id = document.frontMatter["id"];
  return typeof id === "string" && id.trim() ? id.trim() : "unknown";
}
