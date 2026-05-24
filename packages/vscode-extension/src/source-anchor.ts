import type { MarkVSpecParseResult, SourceLocation } from "@markvspec/core";
import { escapeHtml } from "./design-document-renderer.js";

export type SourceAnchorKind = "screen" | "section" | "layout" | "element" | "action" | "form-group";

interface SourceAnchor {
  readonly kind: SourceAnchorKind;
  readonly id: string;
  readonly location?: SourceLocation;
  readonly missingReason?: string;
}

export interface SourceAnchorTarget {
  readonly sourceAnchor: string;
  readonly kind: SourceAnchorKind;
  readonly id: string;
  readonly startLine: number;
  readonly endLine: number;
}

export function sourceAnchorAttributesForId(result: MarkVSpecParseResult, id: string | undefined): string {
  if (!id) {
    return "";
  }
  const anchor = sourceAnchorForId(result, id);
  return anchor ? sourceAnchorAttributes(anchor) : "";
}

export function sourceAnchorAttributesForScreen(result: MarkVSpecParseResult): string {
  const id = result.screen.id ?? "document";
  return sourceAnchorAttributes({
    kind: "screen",
    id,
    location: result.screen.location,
    missingReason: result.screen.location ? undefined : "screen-location-unavailable"
  });
}

export function sourceAnchorAttributesForSection(result: MarkVSpecParseResult, sectionId: string): string {
  const location = sectionLocation(result, sectionId);
  return sourceAnchorAttributes({
    kind: "section",
    id: sectionId,
    location,
    missingReason: location ? undefined : "section-location-unavailable"
  });
}

export function sourceAnchorTargetForLine(result: MarkVSpecParseResult, line: number): SourceAnchorTarget | undefined {
  if (!Number.isInteger(line) || line <= 0) {
    return undefined;
  }
  const targets = sourceAnchorTargets(result);
  return targets
    .filter((target) => target.startLine <= line && line <= target.endLine)
    .sort((left, right) => {
      const startDelta = right.startLine - left.startLine;
      return startDelta !== 0 ? startDelta : sourceAnchorPriority(right.kind) - sourceAnchorPriority(left.kind);
    })[0];
}

export function sourceAnchorTargets(result: MarkVSpecParseResult): SourceAnchorTarget[] {
  const anchors = [
    {
      kind: "screen" as const,
      id: result.screen.id ?? "document",
      location: result.screen.location
    },
    ...sectionAnchors(result),
    ...result.layoutGroups.map((item) => ({ kind: "layout" as const, id: item.id, location: item.location })),
    ...result.elements.map((item) => ({ kind: "element" as const, id: item.id, location: item.location })),
    ...result.actions.map((item) => ({ kind: "action" as const, id: item.id, location: item.location })),
    ...result.formGroups.map((item) => ({ kind: "form-group" as const, id: item.id, location: item.location }))
  ].filter((anchor): anchor is { kind: SourceAnchorKind; id: string; location: SourceLocation } => Boolean(anchor.location));

  return anchors
    .map((anchor) => ({
      sourceAnchor: `${anchor.kind}:${anchor.id}`,
      kind: anchor.kind,
      id: anchor.id,
      startLine: anchor.location.line,
      endLine: anchor.location.line
    }))
    .sort((left, right) => left.startLine - right.startLine || sourceAnchorPriority(left.kind) - sourceAnchorPriority(right.kind))
    .map((target, index, allTargets) => {
      const next = allTargets.slice(index + 1).find((candidate) => candidate.startLine > target.startLine);
      return {
        ...target,
        endLine: next ? next.startLine - 1 : Number.MAX_SAFE_INTEGER
      };
    });
}

function sourceAnchorForId(result: MarkVSpecParseResult, id: string): SourceAnchor | undefined {
  if (id.startsWith("L-")) {
    const layout = result.layoutGroups.find((candidate) => candidate.id === id);
    return layout ? { kind: "layout", id, location: layout.location } : undefined;
  }
  if (id.startsWith("E-")) {
    const element = result.elements.find((candidate) => candidate.id === id);
    return element ? { kind: "element", id, location: element.location } : undefined;
  }
  if (id.startsWith("A-")) {
    const action = result.actions.find((candidate) => candidate.id === id);
    return action ? { kind: "action", id, location: action.location } : undefined;
  }
  if (id.startsWith("F-")) {
    const formGroup = result.formGroups.find((candidate) => candidate.id === id);
    return formGroup ? { kind: "form-group", id, location: formGroup.location } : undefined;
  }
  if (id === result.screen.id) {
    return {
      kind: "screen",
      id,
      location: result.screen.location,
      missingReason: result.screen.location ? undefined : "screen-location-unavailable"
    };
  }
  return undefined;
}

function sectionAnchors(result: MarkVSpecParseResult): Array<{ kind: "section"; id: string; location: SourceLocation | undefined }> {
  return ["States", "Layout", "Elements", "Actions", "Rules", "Validations", "Notes"]
    .map((id) => ({ kind: "section" as const, id, location: sectionLocation(result, id) }));
}

function sourceAnchorPriority(kind: SourceAnchorKind): number {
  switch (kind) {
    case "layout":
    case "element":
    case "action":
    case "form-group":
      return 3;
    case "section":
      return 2;
    case "screen":
      return 1;
  }
}

function sourceAnchorAttributes(anchor: SourceAnchor): string {
  const attributes = [
    ["data-mm-source-anchor", `${anchor.kind}:${anchor.id}`],
    ["data-mm-source-kind", anchor.kind],
    ["data-mm-source-id", anchor.id]
  ];
  if (anchor.location) {
    attributes.push(["data-mm-source-start-line", String(anchor.location.line)]);
    attributes.push(["data-mm-source-end-line", String(anchor.location.line)]);
  } else {
    attributes.push(["data-mm-source-missing", anchor.missingReason ?? "source-location-unavailable"]);
  }
  return attributes.map(([name, value]) => ` ${name}="${escapeHtml(value)}"`).join("");
}

function sectionLocation(result: MarkVSpecParseResult, sectionId: string): SourceLocation | undefined {
  const proseLocation = result.sectionProse.find((candidate) => candidate.kind === sectionId)?.location;
  if (proseLocation) {
    return proseLocation;
  }

  switch (sectionId) {
    case "States":
      return firstLocation(result.states);
    case "Layout":
      return firstLocation(result.layoutGroups);
    case "Elements":
      return firstLocation(result.elements);
    case "Actions":
      return firstLocation(result.actions);
    case "Rules":
      return firstLocation(result.rules);
    case "Validations":
      return firstLocation(result.validations);
    case "Notes":
      return result.notes[0] ? { line: result.notes[0].line } : undefined;
    default:
      return undefined;
  }
}

function firstLocation<T extends { location: SourceLocation }>(items: readonly T[]): SourceLocation | undefined {
  return items
    .map((item) => item.location)
    .sort((left, right) => left.line - right.line)[0];
}
