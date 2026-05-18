import type { MarkVSpecParseResult } from "./types.js";

export type MarkVSpecEntityReferenceKind =
  | "screen"
  | "layout"
  | "element"
  | "action"
  | "form-group"
  | "validation"
  | "business-rule"
  | "error-code";

export interface MarkVSpecEntityReference {
  readonly id: string;
  readonly kind: MarkVSpecEntityReferenceKind;
  readonly marker?: string;
  readonly label?: string;
}

const entityReferencePattern = /#\{((?:SCR|ERR|L|E|F|A|V|R)-[\p{L}\p{N}-]+)\}/gu;

export function findMarkdownEntityReferences(line: string): string[] {
  const references: string[] = [];
  for (const segment of nonCodeSpanSegments(line)) {
    for (const match of segment.matchAll(entityReferencePattern)) {
      references.push(match[1]);
    }
  }
  return references;
}

export function findMarkdownEntityReferencesInLines(lines: readonly string[]): string[] {
  const references: string[] = [];
  let inCodeFence = false;
  for (const line of lines) {
    if (/^\s*```/u.test(line)) {
      inCodeFence = !inCodeFence;
      continue;
    }
    if (inCodeFence) {
      continue;
    }
    references.push(...findMarkdownEntityReferences(line));
  }
  return references;
}

export function resolveMarkVSpecEntityReference(
  result: MarkVSpecParseResult,
  id: string
): MarkVSpecEntityReference | undefined {
  if (result.screen.id === id) {
    return {
      id,
      kind: "screen",
      marker: id,
      label: result.screen.title ?? result.screen.heading ?? id
    };
  }

  const layout = allLayoutGroups(result).find((candidate) => candidate.id === id);
  if (layout) {
    return {
      id,
      kind: "layout",
      marker: stringProperty(layout.properties["marker"]) ?? id,
      label: layout.name || id
    };
  }

  const element = result.elements.find((candidate) => candidate.id === id);
  if (element) {
    const label = stringProperty(element.properties["label"]) ?? stringProperty(element.properties["text"]);
    return {
      id,
      kind: "element",
      marker: stringProperty(element.properties["marker"]) ?? id,
      label: label ?? id
    };
  }

  const action = result.actions.find((candidate) => candidate.id === id);
  if (action) {
    return {
      id,
      kind: "action",
      marker: stringProperty(action.properties["marker"]) ?? id,
      label: action.name || id
    };
  }

  const formGroup = result.formGroups.find((candidate) => candidate.id === id);
  if (formGroup) {
    return {
      id,
      kind: "form-group",
      marker: firstStringProperty(formGroup.properties["marker"]) ?? id,
      label: formGroup.name || id
    };
  }

  const validation = result.validations.find((candidate) => candidate.id === id);
  if (validation) {
    return {
      id,
      kind: "validation",
      marker: firstStringProperty(validation.properties["marker"]) ?? id,
      label: validation.name || id
    };
  }

  const rule = result.rules.find((candidate) => candidate.id === id);
  if (rule) {
    return {
      id,
      kind: "business-rule",
      marker: firstStringProperty(rule.properties["marker"]) ?? id,
      label: rule.name || id
    };
  }

  const errorCode = result.errorCodes.find((candidate) => candidate.id === id);
  if (errorCode) {
    return {
      id,
      kind: "error-code",
      marker: firstStringProperty(errorCode.properties["marker"]) ?? id,
      label: errorCode.name || id
    };
  }

  return undefined;
}

function nonCodeSpanSegments(line: string): string[] {
  const segments: string[] = [];
  let outsideStart = 0;
  let index = 0;

  while (index < line.length) {
    if (line[index] !== "`") {
      index += 1;
      continue;
    }

    const openerStart = index;
    const delimiterLength = countBacktickRun(line, openerStart);
    const closerStart = findMatchingBacktickRun(line, openerStart + delimiterLength, delimiterLength);
    if (closerStart === -1) {
      index += delimiterLength;
      continue;
    }

    if (openerStart > outsideStart) {
      segments.push(line.slice(outsideStart, openerStart));
    }
    index = closerStart + delimiterLength;
    outsideStart = index;
  }

  if (outsideStart < line.length) {
    segments.push(line.slice(outsideStart));
  }
  return segments;
}

function countBacktickRun(value: string, start: number): number {
  let index = start;
  while (index < value.length && value[index] === "`") {
    index += 1;
  }
  return index - start;
}

function findMatchingBacktickRun(value: string, start: number, delimiterLength: number): number {
  let index = start;
  while (index < value.length) {
    if (value[index] !== "`") {
      index += 1;
      continue;
    }
    const runLength = countBacktickRun(value, index);
    if (runLength === delimiterLength) {
      return index;
    }
    index += runLength;
  }
  return -1;
}

function allLayoutGroups(result: MarkVSpecParseResult): MarkVSpecParseResult["layoutGroups"] {
  return [
    ...result.layoutGroups,
    ...result.slotContents.flatMap((slot) => slot.layoutGroups)
  ];
}

function stringProperty(value: string | true | undefined): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function firstStringProperty(value: string | string[] | true | undefined): string | undefined {
  if (typeof value === "string") {
    return value || undefined;
  }
  return Array.isArray(value) ? value.find((item) => item.length > 0) : undefined;
}
