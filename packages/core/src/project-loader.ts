import { parseMarkVSpec } from "./index.js";
import { parseMarkVSpecProject } from "./project-parser.js";
import type {
  MarkVSpecAction,
  MarkVSpecActionOutcome,
  MarkVSpecDiagnostic,
  MarkVSpecLayoutGroup,
  MarkVSpecParseResult,
  MarkVSpecProcessStep,
  MarkVSpecProjectDocumentGraph,
  MarkVSpecProjectDocumentGraphEdge,
  MarkVSpecProjectDocumentGraphNode,
  MarkVSpecLoadedProjectScreen,
  MarkVSpecProjectLoadResult,
  MarkVSpecProjectScreen,
  MarkVSpecRouteParam,
  MarkVSpecTransition,
  SourceLocation
} from "./types.js";

export interface MarkVSpecProjectLoaderOptions {
  projectPath?: string;
  workspaceRoot?: string;
  realpath?(path: string): string | undefined;
  readFile(path: string): string | undefined;
}

const PARTIAL_REFERENCE_MAX_DEPTH = 10;

export function loadMarkVSpecProject(
  projectSource: string,
  options: MarkVSpecProjectLoaderOptions
): MarkVSpecProjectLoadResult {
  const project = parseMarkVSpecProject(projectSource);
  const diagnostics: MarkVSpecDiagnostic[] = [...project.diagnostics];
  const documentGraph = createProjectDocumentGraph(options.projectPath);
  const loadedTemplates = loadProjectEntries(project.templates, "template", options, diagnostics, documentGraph);
  const loadedScreens: MarkVSpecLoadedProjectScreen[] = [];
  const templateById = new Map(loadedTemplates.map((template) => [template.index.id, template]));

  for (const indexedScreen of project.screens) {
    const resolvedPath = indexedScreen.path ? resolveProjectPath(options.projectPath, indexedScreen.path) : undefined;
    const loaded: MarkVSpecLoadedProjectScreen = {
      index: indexedScreen,
      resolvedPath
    };
    loadedScreens.push(loaded);

    if (!resolvedPath) {
      continue;
    }
    addProjectDocumentNode(documentGraph, {
      path: resolvedPath,
      kind: "screen",
      documentId: indexedScreen.id
    });
    if (options.projectPath) {
      addProjectDocumentEdge(documentGraph, {
        fromPath: normalizePath(options.projectPath),
        toPath: resolvedPath,
        kind: "project-screen",
        documentId: indexedScreen.id
      });
    }

    if (!isProjectReferenceAllowed(resolvedPath, options.workspaceRoot, options.realpath)) {
      diagnostics.push({
        severity: "error",
        message: `Project screen ${indexedScreen.id ?? "entry"} is outside the workspace: ${indexedScreen.path}.`,
        line: firstScreenPropertyLine(indexedScreen, "path")
      });
      continue;
    }

    const screenSource = options.readFile(resolvedPath);
    if (screenSource === undefined) {
      diagnostics.push({
        severity: "error",
        message: `Project screen ${indexedScreen.id ?? "entry"} file not found: ${indexedScreen.path}.`,
        line: firstScreenPropertyLine(indexedScreen, "path")
      });
      continue;
    }

    const result = parseMarkVSpec(screenSource);
    loaded.sourceResult = result;
    loaded.result = result;
    diagnostics.push(...result.diagnostics);
    validateAndAddPartialReferences(documentGraph, result, resolvedPath, options, diagnostics);

    if (indexedScreen.id && result.screen.id && indexedScreen.id !== result.screen.id) {
      diagnostics.push({
        severity: "error",
        message: `Project screen ${indexedScreen.id} points to file with screen ID ${result.screen.id}.`,
        line: firstScreenPropertyLine(indexedScreen, "id")
      });
    }

    const templateId = result.screen.template ?? indexedScreen.template;
    const templateSrc = result.screen.templateSrc;
    if (templateId || templateSrc) {
      const templateResult = templateSrc
        ? loadTemplateResultFromPath(templateSrc, resolvedPath, options, diagnostics, templateId)
        : templateId
          ? loadTemplateResultFromId(templateId, templateById)
          : undefined;
      const templatePath = templateSrc
        ? resolveProjectPath(resolvedPath, templateSrc)
        : templateId
          ? templateById.get(templateId)?.resolvedPath
          : undefined;
      if (templatePath) {
        addProjectDocumentNode(documentGraph, {
          path: templatePath,
          kind: "template",
          documentId: templateId
        });
        addProjectDocumentEdge(documentGraph, {
          fromPath: resolvedPath,
          toPath: templatePath,
          kind: "screen-template",
          documentId: templateId
        });
      }
      if (templatePath && templateResult) {
        validateAndAddPartialReferences(documentGraph, templateResult, templatePath, options, diagnostics);
      }
      if (!templateResult) {
        if (templateId && !templateSrc) {
          diagnostics.push({
            severity: "error",
            message: `Project screen ${indexedScreen.id ?? result.screen.id ?? "entry"} references missing template ${templateId}.`,
            line: result.screen.frontMatter["template"] ? 1 : firstScreenPropertyLine(indexedScreen, "template")
          });
        }
      } else {
        const composed = composeMarkVSpecTemplate(templateResult, result);
        const inheritedDiagnostics = new Set([...templateResult.diagnostics, ...result.diagnostics]);
        loaded.result = composed;
        diagnostics.push(...composed.diagnostics.filter((diagnostic) => !inheritedDiagnostics.has(diagnostic)));
      }
    }
  }

  validateProjectNavigations(loadedScreens, diagnostics);

  return {
    project,
    templates: loadedTemplates,
    screens: loadedScreens,
    diagnostics,
    documentGraph
  };
}

export function affectedProjectScreenPathsForDocumentChange(
  graph: MarkVSpecProjectDocumentGraph,
  changedPath: string
): string[] {
  const normalizedChangedPath = normalizePath(changedPath);
  const nodeByPath = new Map(graph.nodes.map((node) => [node.path, node]));
  const screenPaths = new Set(graph.nodes.filter((node) => node.kind === "screen").map((node) => node.path));
  if (graph.projectPath && normalizedChangedPath === graph.projectPath) {
    return [...screenPaths].sort();
  }

  const affected = new Set<string>();
  const queue = [normalizedChangedPath];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const currentPath = queue.shift()!;
    if (visited.has(currentPath)) {
      continue;
    }
    visited.add(currentPath);

    if (screenPaths.has(currentPath)) {
      affected.add(currentPath);
    }
    if (graph.projectPath && currentPath === graph.projectPath) {
      for (const screenPath of screenPaths) {
        affected.add(screenPath);
      }
    }

    for (const edge of graph.edges) {
      if (edge.toPath === currentPath) {
        queue.push(edge.fromPath);
      }
    }
  }

  if (!nodeByPath.has(normalizedChangedPath) && screenPaths.has(normalizedChangedPath)) {
    affected.add(normalizedChangedPath);
  }
  return [...affected].sort();
}

function createProjectDocumentGraph(projectPath: string | undefined): MarkVSpecProjectDocumentGraph {
  const normalizedProjectPath = projectPath ? normalizePath(projectPath) : undefined;
  const graph: MarkVSpecProjectDocumentGraph = {
    projectPath: normalizedProjectPath,
    nodes: [],
    edges: []
  };
  if (normalizedProjectPath) {
    addProjectDocumentNode(graph, {
      path: normalizedProjectPath,
      kind: "project"
    });
  }
  return graph;
}

function addProjectDocumentNode(graph: MarkVSpecProjectDocumentGraph, node: MarkVSpecProjectDocumentGraphNode): void {
  const normalizedNode = { ...node, path: normalizePath(node.path) };
  const existing = graph.nodes.find((candidate) => candidate.path === normalizedNode.path);
  if (existing) {
    existing.kind = existing.kind === "project" ? existing.kind : normalizedNode.kind;
    existing.documentId = existing.documentId ?? normalizedNode.documentId;
    return;
  }
  graph.nodes.push(normalizedNode);
}

function addProjectDocumentEdge(graph: MarkVSpecProjectDocumentGraph, edge: MarkVSpecProjectDocumentGraphEdge): void {
  if (!edge.fromPath || !edge.toPath) {
    return;
  }
  const normalizedEdge = {
    ...edge,
    fromPath: normalizePath(edge.fromPath),
    toPath: normalizePath(edge.toPath)
  };
  if (normalizedEdge.fromPath === normalizedEdge.toPath) {
    return;
  }
  if (graph.edges.some((candidate) =>
    candidate.fromPath === normalizedEdge.fromPath &&
    candidate.toPath === normalizedEdge.toPath &&
    candidate.kind === normalizedEdge.kind
  )) {
    return;
  }
  graph.edges.push(normalizedEdge);
}

function addPartialReferenceEdges(
  graph: MarkVSpecProjectDocumentGraph,
  result: MarkVSpecParseResult,
  sourcePath: string
): void {
  for (const partialId of partialIdsReferencedBy(result)) {
    const referencePath = result.screen.references.partials[partialId];
    if (!referencePath) {
      continue;
    }
    const resolvedPath = resolveProjectPath(sourcePath, referencePath);
    addProjectDocumentNode(graph, {
      path: resolvedPath,
      kind: "partial",
      documentId: partialId
    });
    addProjectDocumentEdge(graph, {
      fromPath: sourcePath,
      toPath: resolvedPath,
      kind: "document-partial",
      documentId: partialId
    });
  }
}

function loadTemplateResultFromPath(
  templatePath: string,
  screenPath: string,
  options: MarkVSpecProjectLoaderOptions,
  diagnostics: MarkVSpecDiagnostic[],
  expectedTemplateId?: string
): MarkVSpecParseResult | undefined {
  const resolvedTemplatePath = resolveProjectPath(screenPath, templatePath);
  if (!isProjectReferenceAllowed(resolvedTemplatePath, options.workspaceRoot, options.realpath)) {
    diagnostics.push({
      severity: "error",
      message: `Template file is outside the workspace: ${templatePath}.`,
      line: 1
    });
    return undefined;
  }

  const templateSource = options.readFile(resolvedTemplatePath);
  if (templateSource === undefined) {
    diagnostics.push({
      severity: "error",
      message: `Template file not found: ${templatePath}.`,
      line: 1
    });
    return undefined;
  }

  const template = parseMarkVSpec(templateSource);
  diagnostics.push(...template.diagnostics);
  if (expectedTemplateId && template.screen.id !== expectedTemplateId) {
    diagnostics.push({
      severity: "error",
      message: `Template reference ${expectedTemplateId} points to file with template ID ${template.screen.id ?? "missing"}.`,
      line: 1
    });
    return undefined;
  }
  if (template.screen.type !== "template") {
    diagnostics.push({
      severity: "error",
      message: `Template path ${templatePath} points to a non-template document.`,
      line: 1
    });
    return undefined;
  }

  return template;
}

function loadTemplateResultFromId(
  templateId: string,
  templateById: Map<string | undefined, MarkVSpecLoadedProjectScreen>
): MarkVSpecParseResult | undefined {
  return templateById.get(templateId)?.result;
}

function validateDocumentReferences(
  result: MarkVSpecParseResult,
  sourcePath: string,
  options: MarkVSpecProjectLoaderOptions,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  validateReferencedPartials(result, sourcePath, options, diagnostics);
}

function validateAndAddPartialReferences(
  graph: MarkVSpecProjectDocumentGraph,
  result: MarkVSpecParseResult,
  sourcePath: string,
  options: MarkVSpecProjectLoaderOptions,
  diagnostics: MarkVSpecDiagnostic[],
  stack: string[] = [],
  depth = 0
): void {
  addPartialReferenceEdges(graph, result, sourcePath);
  validateDocumentReferences(result, sourcePath, options, diagnostics);

  for (const partialId of partialIdsReferencedBy(result)) {
    const referencePath = result.screen.references.partials[partialId];
    if (!referencePath) {
      continue;
    }
    const resolvedPath = resolveProjectPath(sourcePath, referencePath);
    if (!isProjectReferenceAllowed(resolvedPath, options.workspaceRoot, options.realpath)) {
      continue;
    }
    if (stack.includes(partialId)) {
      diagnostics.push({
        severity: "error",
        message: `Circular partial reference detected: ${[...stack, partialId].join(" -> ")}.`,
        line: 1
      });
      continue;
    }
    if (depth >= PARTIAL_REFERENCE_MAX_DEPTH) {
      diagnostics.push({
        severity: "error",
        message: `Partial nesting exceeds maximum depth ${PARTIAL_REFERENCE_MAX_DEPTH} at ${partialId}.`,
        line: 1
      });
      continue;
    }

    const source = options.readFile(resolvedPath);
    if (source === undefined) {
      continue;
    }
    const partial = parseMarkVSpec(source);
    if (partial.screen.id !== partialId || partial.screen.type !== "partial") {
      continue;
    }
    validateAndAddPartialReferences(graph, partial, resolvedPath, options, diagnostics, [...stack, partialId], depth + 1);
  }
}

function validateReferencedPartials(
  result: MarkVSpecParseResult,
  sourcePath: string,
  options: MarkVSpecProjectLoaderOptions,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const partialId of partialIdsReferencedBy(result)) {
    const referencePath = result.screen.references.partials[partialId];
    if (!referencePath) {
      continue;
    }

    const resolvedPath = resolveProjectPath(sourcePath, referencePath);
    if (!isProjectReferenceAllowed(resolvedPath, options.workspaceRoot, options.realpath)) {
      diagnostics.push({
        severity: "error",
        message: `Partial reference ${partialId} is outside the workspace: ${referencePath}.`,
        line: 1
      });
      continue;
    }

    const source = options.readFile(resolvedPath);
    if (source === undefined) {
      diagnostics.push({
        severity: "error",
        message: `Partial reference ${partialId} file not found: ${referencePath}.`,
        line: 1
      });
      continue;
    }

    const partial = parseMarkVSpec(source);
    diagnostics.push(...partial.diagnostics);
    if (partial.screen.id !== partialId) {
      diagnostics.push({
        severity: "error",
        message: `Partial reference ${partialId} points to file with partial ID ${partial.screen.id ?? "missing"}.`,
        line: 1
      });
      continue;
    }

    if (partial.screen.type !== "partial") {
      diagnostics.push({
        severity: "error",
        message: `Partial reference ${partialId} points to a non-partial document.`,
        line: 1
      });
    }
  }
}

function partialIdsReferencedBy(result: MarkVSpecParseResult): Set<string> {
  const ids = new Set<string>();
  for (const group of allLayoutGroups(result)) {
    collectPartialId(ids, group.partial?.id);
  }
  for (const action of result.actions) {
    for (const step of action.processSteps) {
      const partialId = processStepDetail(step, "partial");
      if (!isSelfPartialRequest(result, step, partialId)) {
        collectPartialId(ids, partialId);
      }
      collectPartialId(ids, step.content);
      for (const outcome of step.outcomes) {
        collectPartialId(ids, outcome.content);
      }
    }
    for (const outcome of action.outcomes) {
      collectPartialId(ids, outcome.content);
    }
  }
  return ids;
}

function allLayoutGroups(result: MarkVSpecParseResult): MarkVSpecLayoutGroup[] {
  return [
    ...result.layoutGroups,
    ...result.slotContents.flatMap((slot) => slot.layoutGroups)
  ];
}

function collectPartialId(ids: Set<string>, value: string | undefined): void {
  if (value && /^PRT-[\p{L}\p{N}-]+$/u.test(value)) {
    ids.add(value);
  }
}

function processStepDetail(step: MarkVSpecProcessStep, key: string): string | undefined {
  return step.details.find((detail) => detail.key === key)?.value;
}

function isSelfPartialRequest(result: MarkVSpecParseResult, step: MarkVSpecProcessStep, partialId: string | undefined): boolean {
  return result.screen.type === "partial" && result.screen.id === partialId && isPartialRequestStep(step.name);
}

function isPartialRequestStep(name: string): boolean {
  const normalized = name.trim().replace(/\s+/g, " ").toLowerCase();
  return normalized === "partial request" || normalized === "partialrequest";
}

function loadProjectEntries(
  entries: MarkVSpecProjectScreen[],
  kind: "screen" | "template",
  options: MarkVSpecProjectLoaderOptions,
  diagnostics: MarkVSpecDiagnostic[],
  documentGraph: MarkVSpecProjectDocumentGraph
): MarkVSpecLoadedProjectScreen[] {
  const loadedEntries: MarkVSpecLoadedProjectScreen[] = [];
  for (const entry of entries) {
    const resolvedPath = entry.path ? resolveProjectPath(options.projectPath, entry.path) : undefined;
    const loaded: MarkVSpecLoadedProjectScreen = {
      index: entry,
      resolvedPath
    };
    loadedEntries.push(loaded);

    if (!resolvedPath) {
      continue;
    }
    addProjectDocumentNode(documentGraph, {
      path: resolvedPath,
      kind,
      documentId: entry.id
    });
    if (options.projectPath) {
      addProjectDocumentEdge(documentGraph, {
        fromPath: normalizePath(options.projectPath),
        toPath: resolvedPath,
        kind: kind === "template" ? "project-template" : "project-screen",
        documentId: entry.id
      });
    }

    if (!isProjectReferenceAllowed(resolvedPath, options.workspaceRoot, options.realpath)) {
      diagnostics.push({
        severity: "error",
        message: `Project ${kind} ${entry.id ?? "entry"} is outside the workspace: ${entry.path}.`,
        line: firstScreenPropertyLine(entry, "path")
      });
      continue;
    }

    const source = options.readFile(resolvedPath);
    if (source === undefined) {
      diagnostics.push({
        severity: "error",
        message: `Project ${kind} ${entry.id ?? "entry"} file not found: ${entry.path}.`,
        line: firstScreenPropertyLine(entry, "path")
      });
      continue;
    }

    const result = parseMarkVSpec(source);
    loaded.result = result;
    diagnostics.push(...result.diagnostics);
    validateDocumentReferences(result, resolvedPath, options, diagnostics);
    addPartialReferenceEdges(documentGraph, result, resolvedPath);

    if (entry.id && result.screen.id && entry.id !== result.screen.id) {
      diagnostics.push({
        severity: "error",
        message: `Project ${kind} ${entry.id} points to file with ${result.screen.type ?? "screen"} ID ${result.screen.id}.`,
        line: firstScreenPropertyLine(entry, "id")
      });
    }

    if (kind === "template" && result.screen.type !== "template") {
      diagnostics.push({
        severity: "error",
        message: `Project template ${entry.id ?? "entry"} points to a non-template document.`,
        line: firstScreenPropertyLine(entry, "id")
      });
    }
  }

  return loadedEntries;
}

export function composeMarkVSpecTemplate(template: MarkVSpecParseResult, screen: MarkVSpecParseResult): MarkVSpecParseResult {
  const diagnostics = [...template.diagnostics, ...screen.diagnostics];
  addCrossDocumentDuplicateDiagnostics(template.elements, screen.elements, "element", diagnostics);
  addCrossDocumentDuplicateDiagnostics(template.formGroups, screen.formGroups, "form group", diagnostics);
  addCrossDocumentDuplicateDiagnostics(template.actions, screen.actions, "action", diagnostics);
  addCrossDocumentDuplicateDiagnostics(template.validations, screen.validations, "validation", diagnostics);
  addCrossDocumentDuplicateDiagnostics(template.rules, screen.rules, "rule", diagnostics);
  addCrossDocumentDuplicateDiagnostics(template.errorCodes, screen.errorCodes, "error code", diagnostics);
  const states = screen.states.length > 0 ? screen.states : template.states;

  return {
    screen: {
      ...screen.screen,
      frontMatter: {
        ...screen.screen.frontMatter,
        template: screen.screen.template ?? template.screen.id ?? ""
      }
    },
    states,
    layoutGroups: cloneLayoutGroups(template.layoutGroups, { documentRole: "template", stripMarkers: true }),
    slotDefinitions: cloneSlotDefinitions(template.slotDefinitions),
    slotContents: cloneSlotContents(screen.slotContents),
    elements: [...cloneTemplateElements(template.elements), ...screen.elements],
    formGroups: [...cloneTemplateFormGroups(template.formGroups), ...screen.formGroups],
    actions: [...cloneTemplateActions(template.actions), ...screen.actions],
    validations: [...template.validations, ...screen.validations],
    rules: [...template.rules, ...screen.rules],
    errorCodes: [...template.errorCodes, ...screen.errorCodes],
    historyFields: [...template.historyFields, ...screen.historyFields],
    historyEntries: [...template.historyEntries, ...screen.historyEntries],
    modelSampleGroups: [...template.modelSampleGroups, ...screen.modelSampleGroups],
    modelSamples: [...template.modelSamples, ...screen.modelSamples],
    sectionProse: composeSectionProse(template, screen),
    notes: [...template.notes, ...screen.notes],
    diagnostics
  };
}

function composeSectionProse(template: MarkVSpecParseResult, screen: MarkVSpecParseResult): MarkVSpecParseResult["sectionProse"] {
  const templateSectionProse = screen.states.length > 0
    ? template.sectionProse.filter((sectionProse) => !sectionProse.renderKeys.includes("states:list"))
    : template.sectionProse;
  return [...templateSectionProse, ...screen.sectionProse];
}

function addCrossDocumentDuplicateDiagnostics<T extends { id: string; location: { line: number } }>(
  templateItems: T[],
  screenItems: T[],
  kind: string,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const templateIds = new Set(templateItems.map((item) => item.id));
  for (const item of screenItems) {
    if (!templateIds.has(item.id)) {
      continue;
    }

    diagnostics.push({
      severity: "error",
      message: `Screen ${kind} ID ${item.id} duplicates a template ${kind} ID.`,
      line: item.location.line
    });
  }
}

function cloneLayoutGroups(
  groups: MarkVSpecLayoutGroup[],
  options: { documentRole?: "template"; stripMarkers?: boolean } = {}
): MarkVSpecLayoutGroup[] {
  return groups.map((group) => ({
    ...group,
    ...(options.documentRole ? { documentRole: options.documentRole } : {}),
    partial: group.partial
      ? {
          ...group.partial,
          states: { ...group.partial.states },
          propertyLocations: clonePropertyLocations(group.partial.propertyLocations)
        }
      : undefined,
    items: group.items.map((item) => ({ ...item })),
    properties: cloneProperties(group.properties, options.stripMarkers),
    propertyLocations: clonePropertyLocations(group.propertyLocations, options.stripMarkers),
    overview: group.overview?.slice(),
    notes: group.notes?.slice()
  }));
}

function cloneTemplateElements(elements: MarkVSpecParseResult["elements"]): MarkVSpecParseResult["elements"] {
  return elements.map((element) => ({
    ...element,
    documentRole: "template",
    properties: cloneProperties(element.properties, true),
    propertyLocations: clonePropertyLocations(element.propertyLocations, true),
    routeParams: element.routeParams.map((param) => ({ ...param })),
    selectOptions: element.selectOptions.map((option) => ({ ...option })),
    tableColumns: element.tableColumns.map((column) => ({ ...column })),
    tableRows: element.tableRows.map((row) => ({
      ...row,
      cells: row.cells.map((cell) => ({ ...cell }))
    })),
    visibleWhen: element.visibleWhen.slice(),
    hiddenWhen: element.hiddenWhen.slice(),
    disabledWhen: element.disabledWhen.slice(),
    validations: element.validations.slice(),
    inputRules: element.inputRules.map((rule) => ({ ...rule })),
    overview: element.overview?.slice(),
    notes: element.notes?.slice()
  }));
}

function cloneTemplateActions(actions: MarkVSpecParseResult["actions"]): MarkVSpecParseResult["actions"] {
  return actions.map((action) => ({
    ...action,
    documentRole: "template",
    properties: cloneProperties(action.properties, true),
    propertyLocations: clonePropertyLocations(action.propertyLocations, true),
    fromStates: action.fromStates.slice(),
    transitions: action.transitions.map((transition) => ({ ...transition })),
    sideEffects: action.sideEffects.slice(),
    outcomes: action.outcomes.map((outcome) => ({
      ...outcome,
      response: outcome.response ? { ...outcome.response } : undefined,
      sideEffects: outcome.sideEffects.slice(),
      errorCodes: outcome.errorCodes.slice(),
      routeParams: outcome.routeParams.map((param) => ({ ...param })),
      propertyLocations: clonePropertyLocations(outcome.propertyLocations)
    })),
    processSteps: action.processSteps.map((step) => ({
      ...step,
      when: step.when.slice(),
      skipWhen: step.skipWhen.slice(),
      details: step.details.map((detail) => ({ ...detail })),
      outcomes: step.outcomes.map((outcome) => ({
        ...outcome,
        response: outcome.response ? { ...outcome.response } : undefined,
        sideEffects: outcome.sideEffects.slice(),
        errorCodes: outcome.errorCodes.slice(),
        routeParams: outcome.routeParams.map((param) => ({ ...param })),
        propertyLocations: clonePropertyLocations(outcome.propertyLocations)
      })),
      sideEffects: step.sideEffects.slice(),
      propertyLocations: clonePropertyLocations(step.propertyLocations)
    })),
    routeParams: action.routeParams.map((param) => ({ ...param })),
    responses: action.responses.map((response) => ({ ...response })),
    overview: action.overview?.slice(),
    notes: action.notes?.slice()
  }));
}

function cloneTemplateFormGroups(formGroups: MarkVSpecParseResult["formGroups"]): MarkVSpecParseResult["formGroups"] {
  return formGroups.map((formGroup) => ({
    ...formGroup,
    documentRole: "template",
    fields: formGroup.fields.map((field) => ({ ...field })),
    submit: formGroup.submit ? { ...formGroup.submit } : undefined,
    properties: { ...formGroup.properties },
    propertyLocations: clonePropertyLocations(formGroup.propertyLocations),
    bullets: formGroup.bullets.map((bullet) => ({ ...bullet })),
    overview: formGroup.overview?.slice(),
    notes: formGroup.notes?.slice()
  }));
}

function cloneSlotDefinitions(definitions: MarkVSpecParseResult["slotDefinitions"]): MarkVSpecParseResult["slotDefinitions"] {
  return definitions.map((definition) => ({
    ...definition,
    overview: definition.overview?.slice(),
    notes: definition.notes?.slice(),
    properties: { ...definition.properties },
    propertyLocations: clonePropertyLocations(definition.propertyLocations)
  }));
}

function cloneSlotContents(contents: MarkVSpecParseResult["slotContents"]): MarkVSpecParseResult["slotContents"] {
  return contents.map((content) => ({
    ...content,
    layoutGroups: cloneLayoutGroups(content.layoutGroups)
  }));
}

function cloneProperties<T extends Record<string, unknown>>(properties: T, stripMarkers = false): T {
  return Object.fromEntries(Object.entries(properties).filter(([key]) => !stripMarkers || key !== "marker")) as T;
}

function clonePropertyLocations<T extends Record<string, unknown[]>>(locations: T, stripMarkers = false): T {
  return Object.fromEntries(
    Object.entries(locations)
      .filter(([key]) => !stripMarkers || key !== "marker")
      .map(([key, value]) => [key, value.slice()])
  ) as T;
}

export function resolveProjectPath(projectPath: string | undefined, indexedPath: string): string {
  if (isAbsolutePath(indexedPath)) {
    return normalizePath(indexedPath);
  }

  if (!projectPath) {
    return normalizePath(indexedPath);
  }

  const projectDirectory = projectPath.includes("/") || projectPath.includes("\\")
    ? projectPath.replace(/[\\/][^\\/]*$/u, "")
    : "";
  return normalizePath(projectDirectory ? `${projectDirectory}/${indexedPath}` : indexedPath);
}

function validateProjectNavigations(
  screens: MarkVSpecLoadedProjectScreen[],
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const projectScreenIds = new Set(
    screens
      .map((screen) => screen.index.id)
      .filter((id): id is string => Boolean(id))
  );
  const screenById = new Map(
    screens
      .map((screen) => [screen.index.id ?? screen.result?.screen.id, screen] as const)
      .filter((entry): entry is readonly [string, MarkVSpecLoadedProjectScreen] => Boolean(entry[0]))
  );

  for (const screen of screens) {
    const sourceScreenId = screen.result?.screen.id ?? screen.index.id ?? "unknown screen";
    for (const element of screen.result?.elements ?? []) {
      const href = element.properties["href"];
      if (typeof href !== "string" || !href.startsWith("SCR-")) {
        continue;
      }

      if (!projectScreenIds.has(href)) {
        continue;
      }

      validateRouteParams(
        sourceScreenId,
        `element ${element.id}`,
        href,
        element.routeParams,
        element.routeParams[0]?.location ?? element.location,
        screenById,
        diagnostics
      );
    }

    for (const action of screen.result?.actions ?? []) {
      for (const transition of action.transitions) {
        if (!transition.to.startsWith("SCR-")) {
          continue;
        }

        if (!projectScreenIds.has(transition.to)) {
          diagnostics.push({
            severity: "error",
            message: `Project transition from ${sourceScreenId} action ${action.id} targets missing screen ${transition.to}.`,
            line: transition.location.line
          });
          continue;
        }

        const outcomeParams = transition.result ? actionOutcomeRouteParamsForTransition(action, transition) : [];
        validateRouteParams(
          sourceScreenId,
          `action ${action.id}`,
          transition.to,
          [...action.routeParams, ...outcomeParams],
          transition.location,
          screenById,
          diagnostics
        );
      }
    }
  }
}

function actionOutcomeRouteParamsForTransition(action: MarkVSpecAction, transition: MarkVSpecTransition): MarkVSpecRouteParam[] {
  const outcomes = [
    ...action.outcomes,
    ...action.processSteps.flatMap((step) => step.outcomes)
  ];
  return outcomes.find((outcome) => isOutcomeForTransition(outcome, transition))?.routeParams ?? [];
}

function isOutcomeForTransition(outcome: MarkVSpecActionOutcome, transition: MarkVSpecTransition): boolean {
  if (outcome.result !== transition.result || outcome.to !== transition.to) {
    return false;
  }

  const stateLines = [
    ...(outcome.propertyLocations.state ?? []),
    ...(outcome.propertyLocations.navigate ?? [])
  ].map((location) => location.line);
  return stateLines.length === 0 || stateLines.includes(transition.location.line);
}

function validateRouteParams(
  sourceScreenId: string,
  sourceLabel: string,
  targetScreenId: string,
  params: MarkVSpecRouteParam[],
  location: SourceLocation,
  screenById: Map<string, MarkVSpecLoadedProjectScreen>,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const targetRoute = screenById.get(targetScreenId)?.result?.screen.route;
  if (!targetRoute) {
    return;
  }

  const placeholders = extractRoutePlaceholders(targetRoute);
  const paramNames = new Set(params.map((param) => param.name));
  for (const placeholder of placeholders) {
    if (paramNames.has(placeholder)) {
      continue;
    }

    diagnostics.push({
      severity: "error",
      message: `Project navigation from ${sourceScreenId} ${sourceLabel} to ${targetScreenId} is missing route parameter ${placeholder}.`,
      line: location.line
    });
  }

  for (const param of params) {
    if (placeholders.has(param.name)) {
      continue;
    }

    diagnostics.push({
      severity: "warning",
      message: `Project navigation from ${sourceScreenId} ${sourceLabel} to ${targetScreenId} defines route parameter ${param.name}, but target route ${targetRoute} has no matching placeholder.`,
      line: param.location.line
    });
  }
}

function extractRoutePlaceholders(route: string): Set<string> {
  const placeholders = new Set<string>();
  for (const match of route.matchAll(/:([A-Za-z][A-Za-z0-9_-]*)/gu)) {
    placeholders.add(match[1]);
  }
  return placeholders;
}

function firstScreenPropertyLine(screen: MarkVSpecProjectScreen, key: string): number {
  return screen.propertyLocations[key]?.[0]?.line ?? screen.location.line;
}

export function isProjectReferenceAllowed(
  path: string,
  workspaceRoot: string | undefined,
  realpath?: (path: string) => string | undefined
): boolean {
  if (!workspaceRoot) {
    return true;
  }
  const normalizedPath = normalizePath(realpath?.(path) ?? path);
  const normalizedRoot = normalizePath(realpath?.(workspaceRoot) ?? workspaceRoot);
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`);
}

function isAbsolutePath(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:[\\/]/u.test(path);
}

function normalizePath(path: string): string {
  const segments: string[] = [];
  const prefix = path.startsWith("/") ? "/" : "";
  const normalized = path.replace(/\\/gu, "/");

  for (const segment of normalized.split("/")) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === ".." && segments.length > 0 && segments[segments.length - 1] !== "..") {
      segments.pop();
      continue;
    }

    segments.push(segment);
  }

  return `${prefix}${segments.join("/")}`;
}
