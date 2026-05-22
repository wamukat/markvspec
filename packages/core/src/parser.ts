import { validateMarkVSpec } from "./validator.js";
import { firstHeading, parseMarkdownDocument, topLevelProseLines } from "./markdown-document.js";
import { parseActionSectionSemantics, parseElementSectionSemantics, parseLayoutSectionSemantics, parseSmallSectionSemantics } from "./markdown-section-semantic.js";
import { createMarkVSpecDiagnostic } from "./diagnostic-messages.js";
import type {
  MarkVSpecDiagnostic,
  MarkVSpecDocumentReferences,
  MarkVSpecElement,
  MarkVSpecParseResult,
  MarkVSpecScreenSummary
} from "./types.js";

export function parseMarkVSpec(source: string): MarkVSpecParseResult {
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const document = parseMarkdownDocument(source, diagnostics);
  const screen = parseScreen(document.lines, document.bodyStartIndex, document.frontMatter, document.frontMatterData, document.references, firstHeading(document, 1), diagnostics);
  const topLevelDescription = topLevelProseLines(document).join("\n").trim();
  if (topLevelDescription) {
    screen.description = topLevelDescription;
  }

  const result: MarkVSpecParseResult = {
    screen,
    states: [],
    layoutGroups: [],
    slotDefinitions: [],
    slotContents: [],
    elements: [],
    formGroups: [],
    events: [],
    actions: [],
    validations: [],
    rules: [],
    errorCodes: [],
    historyFields: [],
    historyEntries: [],
    viewContexts: [],
    viewContextSamples: [],
    previewScenarios: [],
    sectionProse: [],
    notes: [],
    diagnostics
  };

  applyLayoutSectionSemantics(result, parseLayoutSectionSemantics(document));
  applyElementSectionSemantics(result, parseElementSectionSemantics(document));
  applyActionSectionSemantics(result, parseActionSectionSemantics(document));
  applySmallSectionSemantics(result, parseSmallSectionSemantics(document));
  applyCanonicalActionTriggers(result);
  validateMarkVSpec(result);
  return result;
}

function applyActionSectionSemantics(
  result: MarkVSpecParseResult,
  semantics: ReturnType<typeof parseActionSectionSemantics>
): void {
  result.actions = semantics.actions;
  result.sectionProse.push(...semantics.sectionProse);
  mergeDiagnostics(result.diagnostics, semantics.diagnostics);
}

function applyElementSectionSemantics(
  result: MarkVSpecParseResult,
  semantics: ReturnType<typeof parseElementSectionSemantics>
): void {
  result.elements = semantics.elements;
  result.sectionProse.push(...semantics.sectionProse);
  mergeDiagnostics(result.diagnostics, semantics.diagnostics);
}

function applyLayoutSectionSemantics(
  result: MarkVSpecParseResult,
  semantics: ReturnType<typeof parseLayoutSectionSemantics>
): void {
  result.layoutGroups = semantics.layoutGroups;
  result.slotContents = semantics.slotContents;
  result.slotDefinitions = semantics.slotDefinitions;
  result.sectionProse.push(...semantics.sectionProse);
  mergeDiagnostics(result.diagnostics, semantics.diagnostics);
}

function applySmallSectionSemantics(
  result: MarkVSpecParseResult,
  semantics: ReturnType<typeof parseSmallSectionSemantics>
): void {
  result.states = semantics.states;
  result.viewContexts = semantics.viewContexts;
  result.viewContextSamples = semantics.viewContextSamples;
  result.previewScenarios = semantics.previewScenarios;
  result.formGroups = semantics.formGroups;
  result.events = semantics.events;
  result.validations = semantics.validations;
  result.rules = semantics.rules;
  result.errorCodes = semantics.errorCodes;
  result.historyFields = semantics.historyFields;
  result.historyEntries = semantics.historyEntries;
  result.sectionProse.push(...semantics.sectionProse);
  result.notes = semantics.notes;
  mergeDiagnostics(result.diagnostics, semantics.diagnostics);
}

function applyCanonicalActionTriggers(result: MarkVSpecParseResult): void {
  const actionsById = new Map(result.actions.map((action) => [action.id, action]));

  for (const element of result.elements) {
    const actionId = element.properties["action"];
    if (typeof actionId === "string") {
      const action = actionsById.get(actionId);
      if (action && !action.triggeredBy) {
        const actionEvent = elementActionEvent(element);
        action.triggeredBy = `${element.id}.${actionEvent}`;
        action.triggeredByLocation = element.propertyLocations["action"]?.[0] ?? element.location;
        action.trigger = {
          elementId: element.id,
          event: actionEvent
        };
      }
    }

    const actionEvent = elementActionEvent(element);
    for (const tabItem of element.tabs) {
      if (!tabItem.action) {
        continue;
      }
      const action = actionsById.get(tabItem.action);
      if (!action || action.triggeredBy) {
        continue;
      }
      action.triggeredBy = `${element.id}.${actionEvent}`;
      action.triggeredByLocation = tabItem.propertyLocations.action[0] ?? tabItem.location;
      action.trigger = {
        elementId: element.id,
        event: actionEvent
      };
    }
    for (const accordionItem of element.accordionItems) {
      if (!accordionItem.action) {
        continue;
      }
      const action = actionsById.get(accordionItem.action);
      if (!action || action.triggeredBy) {
        continue;
      }
      action.triggeredBy = `${element.id}.${actionEvent}`;
      action.triggeredByLocation = accordionItem.propertyLocations.action[0] ?? accordionItem.location;
      action.trigger = {
        elementId: element.id,
        event: actionEvent
      };
    }
    for (const actionMenuItem of element.actionMenuItems) {
      if (!actionMenuItem.action) {
        continue;
      }
      const action = actionsById.get(actionMenuItem.action);
      if (!action || action.triggeredBy) {
        continue;
      }
      action.triggeredBy = `${element.id}.${actionEvent}`;
      action.triggeredByLocation = actionMenuItem.propertyLocations.action[0] ?? actionMenuItem.location;
      action.trigger = {
        elementId: element.id,
        event: actionEvent
      };
    }
  }

  for (const event of result.events) {
    const action = actionsById.get(event.actionId);
    if (!action || action.triggeredBy || !["page.load", "partial.render"].includes(event.event)) {
      continue;
    }
    action.triggeredBy = event.event;
    action.triggeredByLocation = event.location;
  }

  for (const action of result.actions) {
    if (action.triggeredBy) {
      continue;
    }
    const receivedResponse = action.processSteps
      .flatMap((step) => step.receives)
      .find((receive) => /^A-[\p{L}\p{N}-]+\.P[A-Za-z0-9_-]+\.response$/u.test(receive.value));
    if (!receivedResponse) {
      continue;
    }
    action.triggeredBy = receivedResponse.value;
    action.triggeredByLocation = receivedResponse.location;
  }
}

function elementActionEvent(element: MarkVSpecElement): string {
  const explicitEvent = element.properties["action event"];
  if (typeof explicitEvent === "string" && explicitEvent.trim().length > 0) {
    return explicitEvent.trim();
  }
  if (element.type === "custom:Form") {
    return "submit";
  }
  return "click";
}

function mergeDiagnostics(target: MarkVSpecDiagnostic[], diagnostics: MarkVSpecDiagnostic[]): void {
  const seen = new Set(target.map((diagnostic) => diagnosticKey(diagnostic)));
  for (const diagnostic of diagnostics) {
    const key = diagnosticKey(diagnostic);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    target.push(diagnostic);
  }
}

function diagnosticKey(diagnostic: MarkVSpecDiagnostic): string {
  return `${diagnostic.severity}:${diagnostic.line ?? ""}:${diagnostic.message}`;
}

function parseScreen(
  lines: string[],
  bodyStartIndex: number,
  frontMatter: Record<string, string>,
  frontMatterData: Record<string, unknown>,
  references: MarkVSpecDocumentReferences,
  heading: { text: string; line: number } | undefined,
  diagnostics: MarkVSpecDiagnostic[]
): MarkVSpecScreenSummary {
  const template = parseTemplateFrontMatter(frontMatterData["template"], diagnostics);
  const screen: MarkVSpecScreenSummary = {
    id: frontMatter["id"],
    type: frontMatter["type"] === "template" || frontMatter["type"] === "partial" ? frontMatter["type"] : "screen",
    title: frontMatter["title"],
    description: frontMatter["description"],
    route: frontMatter["route"],
    template: template?.id,
    templateSrc: template?.src,
    locale: frontMatter["locale"],
    defaultState: frontMatter["default-state"] ?? frontMatter["default state"],
    frontMatter,
    references
  };

  if (heading) {
    const match = /^(\S+)\s+(.+)$/.exec(heading.text);

    if (match) {
      const [, headingId, headingTitle] = match;
      screen.heading = lines[heading.line - 1];
      screen.location = { line: heading.line };

      if (screen.id && headingId !== screen.id) {
        diagnostics.push({
          severity: "warning",
          message: `Heading document ID ${headingId} differs from Front Matter ID ${screen.id}.`,
          line: heading.line
        });
      }

      if (screen.title && headingTitle !== screen.title) {
        diagnostics.push({
          severity: "warning",
          message: `Heading title ${headingTitle} differs from Front Matter title ${screen.title}.`,
          line: heading.line
        });
      }
    }
  }

  void bodyStartIndex;
  for (const key of ["id", "type", "title"]) {
    if (!frontMatter[key]) {
      diagnostics.push(createMarkVSpecDiagnostic("error", "frontMatter.missingRequired", { field: key }, 1));
    }
  }

  if (
    frontMatter["type"] &&
    frontMatter["type"] !== "screen" &&
    frontMatter["type"] !== "template" &&
    frontMatter["type"] !== "partial"
  ) {
    diagnostics.push({
      severity: "error",
      message: "Front Matter field type must be screen, template, or partial.",
      line: 1
    });
  }

  return screen;
}

function parseTemplateFrontMatter(value: unknown, diagnostics: MarkVSpecDiagnostic[]): { id: string; src: string } | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    diagnostics.push({
      severity: "error",
      message: "template must be a map with id and src.",
      line: 1
    });
    return undefined;
  }

  const id = value["id"];
  const src = value["src"];
  if (typeof id !== "string" || typeof src !== "string" || !id.trim() || !src.trim()) {
    diagnostics.push({
      severity: "error",
      message: "template must be a map with id and src.",
      line: 1
    });
    return undefined;
  }

  return { id: id.trim(), src: src.trim() };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
