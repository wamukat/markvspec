import type {
  MarkVSpecDiagnostic,
  MarkVSpecNoteSection,
  MarkVSpecProjectParseResult,
  MarkVSpecProjectScreen,
  MarkVSpecProjectSummary,
  SourceLocation
} from "./types.js";
import { firstHeading, parseMarkdownDocument, type MarkdownDocument } from "./markdown-document.js";
import { collectSectionAst, sectionBodyLines, type SourceRange } from "./markdown-section-ast.js";

interface ProjectFrontMatterResult {
  frontMatter: Record<string, string>;
  templates: MarkVSpecProjectScreen[];
  screens: MarkVSpecProjectScreen[];
}

export interface ProjectDocumentReferenceSemantic {
  kind: "template" | "screen";
  id?: string;
  path?: string;
  range: SourceRange;
  propertyRanges: Record<string, SourceRange[]>;
}

export interface ProjectDocumentSemanticResult {
  notes: MarkVSpecNoteSection[];
  renderKeys: string[];
  references: ProjectDocumentReferenceSemantic[];
}

export function parseMarkVSpecProject(source: string): MarkVSpecProjectParseResult {
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const frontMatterResult = parseProjectFrontMatter(document, diagnostics);
  const project = parseProjectSummary(document, frontMatterResult.frontMatter, diagnostics);
  const semantics = parseProjectDocumentSemantics(document, frontMatterResult.templates, frontMatterResult.screens);

  validateProjectIndex(project, frontMatterResult.templates, frontMatterResult.screens, diagnostics);

  return {
    project,
    templates: frontMatterResult.templates,
    screens: frontMatterResult.screens,
    notes: semantics.notes,
    diagnostics
  };
}

export function parseProjectDocumentSemantics(
  document: MarkdownDocument,
  templates: MarkVSpecProjectScreen[],
  screens: MarkVSpecProjectScreen[]
): ProjectDocumentSemanticResult {
  const references = [
    ...templates.map((screen) => projectReferenceSemantic("template", screen)),
    ...screens.map((screen) => projectReferenceSemantic("screen", screen))
  ];
  return {
    notes: parseProjectNotesFromSections(document),
    renderKeys: [
      "project:index",
      "project:templates",
      "project:screens",
      "project:notes",
      ...templates.map((template) => `project:template:${projectReferenceKey(template)}`),
      ...screens.map((screen) => `project:screen:${projectReferenceKey(screen)}`)
    ],
    references
  };
}

function projectReferenceKey(screen: MarkVSpecProjectScreen): string {
  return screen.id || String(screen.location.line);
}

function parseProjectFrontMatter(document: MarkdownDocument, diagnostics: MarkVSpecDiagnostic[]): ProjectFrontMatterResult {
  return {
    frontMatter: document.frontMatter,
    templates: parseProjectScreenList(document, "templates", diagnostics),
    screens: parseProjectScreenList(document, "screens", diagnostics)
  };
}

function parseProjectScreenList(
  document: MarkdownDocument,
  listName: "templates" | "screens",
  diagnostics: MarkVSpecDiagnostic[]
): MarkVSpecProjectScreen[] {
  const value = document.frontMatterData[listName];
  if (!Array.isArray(value)) {
    return [];
  }

  const locations = collectProjectEntryLocations(document.lines, document.bodyStartIndex, listName);
  return value.map((entry, index) => {
    const entryLocation = locations[index] ?? { line: 1, propertyLocations: {} };
    const screen = createProjectScreen(entryLocation.line);
    if (!isRecord(entry)) {
      diagnostics.push({
        severity: "warning",
        message: `Project ${listName === "templates" ? "template" : "screen"} entry must be a map.`,
        line: entryLocation.line
      });
      return screen;
    }

    for (const [key, rawValue] of Object.entries(entry)) {
      assignProjectScreenProperty(
        screen,
        key,
        scalarToString(rawValue),
        entryLocation.propertyLocations[key]?.[0] ?? { line: entryLocation.line },
        diagnostics
      );
    }
    return screen;
  });
}

function collectProjectEntryLocations(
  lines: string[],
  bodyStartIndex: number,
  listName: "templates" | "screens"
): Array<{ line: number; propertyLocations: Record<string, SourceLocation[]> }> {
  const entries: Array<{ line: number; propertyLocations: Record<string, SourceLocation[]> }> = [];
  let currentList: "templates" | "screens" | undefined;
  let currentEntry: { line: number; propertyLocations: Record<string, SourceLocation[]> } | undefined;

  for (let index = 1; index < bodyStartIndex - 1; index += 1) {
    const line = lines[index];
    const lineNumber = index + 1;

    const listStart = /^([A-Za-z][A-Za-z0-9_-]*):\s*$/.exec(line);
    if (listStart) {
      currentList = listStart[1] === "templates" || listStart[1] === "screens" ? listStart[1] : undefined;
      currentEntry = undefined;
      continue;
    }

    if (currentList !== listName) {
      continue;
    }

    const entryStart = /^\s*-\s+([A-Za-z][A-Za-z0-9_-]*):\s*/.exec(line);
    if (entryStart) {
      currentEntry = { line: lineNumber, propertyLocations: {} };
      addPropertyLocation(currentEntry.propertyLocations, entryStart[1], { line: lineNumber });
      entries.push(currentEntry);
      continue;
    }

    if (/^\s*-\s*$/.test(line)) {
      currentEntry = { line: lineNumber, propertyLocations: {} };
      entries.push(currentEntry);
      continue;
    }

    const property = /^\s+([A-Za-z][A-Za-z0-9_-]*):\s*/.exec(line);
    if (currentEntry && property) {
      addPropertyLocation(currentEntry.propertyLocations, property[1], { line: lineNumber });
    }
  }

  return entries;
}

function createProjectScreen(line: number): MarkVSpecProjectScreen {
  return {
    location: { line },
    propertyLocations: {}
  };
}

function assignProjectScreenProperty(
  screen: MarkVSpecProjectScreen,
  key: string,
  value: string,
  location: SourceLocation,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  if (key === "id") {
    screen.id = value;
  } else if (key === "path") {
    screen.path = value;
  } else if (key === "title") {
    screen.title = value;
  } else if (key === "owner") {
    screen.owner = value;
  } else if (key === "template") {
    screen.template = value;
  } else {
    diagnostics.push({
      severity: "warning",
      message: `Project screen entry uses unsupported field ${key}.`,
      line: location.line
    });
  }

  addPropertyLocation(screen.propertyLocations, key, location);
}

function parseProjectSummary(
  document: MarkdownDocument,
  frontMatter: Record<string, string>,
  diagnostics: MarkVSpecDiagnostic[]
): MarkVSpecProjectSummary {
  const project: MarkVSpecProjectSummary = {
    id: frontMatter["id"],
    title: frontMatter["title"],
    status: frontMatter["status"],
    frontMatter
  };
  const heading = firstHeading(document, 1);

  if (heading) {
    const match = /^(\S+)\s+(.+)$/.exec(heading.text);

    if (!match) {
      return project;
    }

    const [, headingId, headingTitle] = match;
    project.heading = document.lines[heading.line - 1];
    project.location = { line: heading.line };

    if (project.id && headingId !== project.id) {
      diagnostics.push({
        severity: "warning",
        message: `Heading project ID ${headingId} differs from Front Matter ID ${project.id}.`,
        line: heading.line
      });
    }

    if (project.title && headingTitle !== project.title) {
      diagnostics.push({
        severity: "warning",
        message: `Heading title ${headingTitle} differs from Front Matter title ${project.title}.`,
        line: heading.line
      });
    }
  }

  return project;
}

function parseProjectNotesFromSections(document: MarkdownDocument): MarkVSpecNoteSection[] {
  const sections = collectSectionAst(document);
  return sections.map((section) => ({
    title: section.title,
    line: section.heading.range.start.line,
    lines: sectionBodyLines(document, sections, section).map((line) => line.text)
  }));
}

function projectReferenceSemantic(kind: "template" | "screen", screen: MarkVSpecProjectScreen): ProjectDocumentReferenceSemantic {
  const range = lineRange(screen.location.line);
  return {
    kind,
    id: screen.id,
    path: screen.path,
    range,
    propertyRanges: Object.fromEntries(
      Object.entries(screen.propertyLocations).map(([key, locations]) => [
        key,
        locations.map((location) => lineRange(location.line))
      ])
    )
  };
}

function lineRange(line: number): SourceRange {
  return {
    start: { line, column: 1 },
    end: { line, column: 1 }
  };
}

function validateProjectIndex(
  project: MarkVSpecProjectSummary,
  templates: MarkVSpecProjectScreen[],
  screens: MarkVSpecProjectScreen[],
  diagnostics: MarkVSpecDiagnostic[]
): void {
  for (const key of ["id", "type", "title"]) {
    if (!project.frontMatter[key]) {
      diagnostics.push({
        severity: "error",
        message: `Missing required Front Matter field: ${key}.`,
        line: 1
      });
    }
  }

  if (project.frontMatter["type"] && project.frontMatter["type"] !== "project") {
    diagnostics.push({
      severity: "error",
      message: "Front Matter field type must be project.",
      line: 1
    });
  }

  if (screens.length === 0) {
    diagnostics.push({
      severity: "error",
      message: "Project Front Matter must include at least one screens entry.",
      line: 1
    });
  }

  validateProjectEntries(templates, "template", diagnostics);
  validateProjectEntries(screens, "screen", diagnostics);
}

function validateProjectEntries(
  entries: MarkVSpecProjectScreen[],
  kind: "screen" | "template",
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const seenScreenIds = new Set<string>();
  for (const screen of entries) {
    if (!screen.id) {
      diagnostics.push({
        severity: "error",
        message: `Project ${kind} entry is missing required field: id.`,
        line: screen.location.line
      });
    }

    if (!screen.path) {
      diagnostics.push({
        severity: "error",
        message: `Project ${kind} ${screen.id ?? "entry"} is missing required field: path.`,
        line: screen.location.line
      });
    }

    if (!screen.id) {
      continue;
    }

    if (seenScreenIds.has(screen.id)) {
      diagnostics.push({
        severity: "error",
        message: `Duplicate project ${kind} ID: ${screen.id}.`,
        line: screen.propertyLocations["id"]?.[0]?.line ?? screen.location.line
      });
    } else {
      seenScreenIds.add(screen.id);
    }
  }
}

function scalarToString(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function addPropertyLocation(
  locations: Record<string, SourceLocation[]>,
  key: string,
  location: SourceLocation
): void {
  const existing = locations[key] ?? [];
  existing.push(location);
  locations[key] = existing;
}
