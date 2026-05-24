import type { MarkVSpecParseResult, SourceLocation } from "@markvspec/core";
import { escapeHtml } from "./design-document-renderer.js";

export type SourceAnchorKind = "screen" | "section" | "layout" | "element" | "action" | "form-group";

interface SourceAnchor {
  readonly kind: SourceAnchorKind;
  readonly id: string;
  readonly location?: SourceLocation;
  readonly missingReason?: string;
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
