import {
  preferredLayoutGroupForViewport,
  type MarkVSpecParseResult
} from "@markvspec/core";
import {
  escapeHtml,
  text
} from "./design-document-renderer.js";

export type EntityReferenceKind = "action" | "layout" | "element" | "form-group" | "message";

export interface EntityReference {
  readonly id: string;
  readonly category: EntityReferenceKind;
  readonly marker?: string;
  readonly label?: string;
  readonly href?: string;
  readonly displaySource?: string;
}

export function referenceForDetailId(result: MarkVSpecParseResult, id: string | undefined): string {
  if (!id) {
    return "";
  }

  if (id.startsWith("L-")) {
    return referenceChipForId(result, id) || renderDetailRefId(id);
  }

  if (id.startsWith("E-")) {
    return referenceChipForId(result, id) || renderDetailRefId(id);
  }

  if (id.startsWith("A-")) {
    return referenceChipForId(result, id) || renderDetailRefId(id);
  }

  if (id.startsWith("F-")) {
    const formGroup = result.formGroups.find((candidate) => candidate.id === id);
    return referenceChipForId(result, id) || (formGroup ? renderFormGroupReferenceId(id) : renderDetailRefId(id));
  }

  return referenceChipForId(result, id) || (isDocumentRefId(id) ? renderDocumentRefId(id) : isInternalId(id) ? renderDetailRefId(id) : text(id));
}

export function renderDetailRefId(id: string): string {
  return `<span class="mm-detail-ref-id">${escapeHtml(id)}</span>`;
}

export function renderFormGroupReferenceId(id: string): string {
  return `<a class="mm-detail-ref-link" href="#${formGroupsAnchor()}">${renderDetailRefId(id)}</a>`;
}

export function formGroupsAnchor(): string {
  return "form-groups";
}

export function renderDocumentRefId(id: string): string {
  return `<code class="mm-document-ref-id">${escapeHtml(id)}</code>`;
}

export function isDocumentRefId(value: string): boolean {
  return /^(?:SCR|TPL|PRT)-[\p{L}\p{N}-]+$/u.test(value);
}

export function findMarker(result: MarkVSpecParseResult, id: string): string | undefined {
  const layout = preferredLayoutById(result, id);
  if (layout) {
    return layout.properties["marker"];
  }

  const element = result.elements.find((candidate) => candidate.id === id);
  if (element) {
    const marker = element.properties["marker"];
    return typeof marker === "string" ? marker : undefined;
  }

  const action = result.actions.find((candidate) => candidate.id === id);
  if (action) {
    return action.properties["marker"];
  }

  const formGroup = result.formGroups.find((candidate) => candidate.id === id);
  if (formGroup) {
    return firstStringProperty(formGroup.properties["marker"]);
  }

  return undefined;
}

export function renderEntityRefChip(input: EntityReference): string {
  const marker = input.marker?.trim() || input.id;
  const markerAttributes = [
    `class="mm-id mm-marker mm-marker-${input.category}"`,
    `data-mm-marker-category="${escapeHtml(input.category)}"`,
    input.displaySource ? `data-mm-display-source="${escapeHtml(input.displaySource)}"` : ""
  ].filter(Boolean).join(" ");
  const markerHtml = `<code ${markerAttributes}>${escapeHtml(marker)}</code>`;
  const labelHtml = input.category === "element"
    ? ` ${renderDetailRefId(input.id)}`
    : input.label
      ? ` ${text(input.label)}`
      : "";
  const classes = `mm-ref-chip mm-ref-chip-${input.category}`;
  const title = input.label ? ` title="${escapeHtml(`${input.id} ${input.label}`)}"` : ` title="${escapeHtml(input.id)}"`;
  const refIdAttribute = ` data-mm-ref-id="${escapeHtml(input.id)}"`;
  const body = `${markerHtml}${labelHtml}`;
  return input.href
    ? `<a class="${classes}" href="${escapeHtml(input.href)}"${refIdAttribute}${title}>${body}</a>`
    : `<span class="${classes}"${refIdAttribute}${title}>${body}</span>`;
}

export function markerBadgeForId(result: MarkVSpecParseResult, id: string | undefined, linkAction = true): string {
  if (!id || !isInternalId(id)) {
    return "";
  }

  const category = markerCategoryForId(id);
  if (!category) {
    return "";
  }

  const marker = findMarker(result, id) || id;
  const badge = `<code class="mm-id mm-marker mm-marker-${category}" data-mm-marker-category="${category}">${escapeHtml(marker)}</code>`;
  if (category === "action" && linkAction) {
    return `<a class="mm-marker-link" href="#${actionDetailAnchor(id)}">${badge}</a>`;
  }
  return badge;
}

export function referenceChipForId(result: MarkVSpecParseResult, id: string, linkAction = true): string {
  if (id.startsWith("A-")) {
    const action = result.actions.find((candidate) => candidate.id === id);
    return renderEntityRefChip({
      id,
      category: "action",
      marker: findMarker(result, id) || id,
      label: action?.name || id,
      href: linkAction ? `#${actionDetailAnchor(id)}` : undefined
    });
  }

  if (id.startsWith("L-")) {
    const layout = preferredLayoutById(result, id);
    return renderEntityRefChip({
      id,
      category: "layout",
      marker: findMarker(result, id) || id,
      label: layout?.name || id
    });
  }

  if (id.startsWith("E-")) {
    return renderEntityRefChip({
      id,
      category: "element",
      marker: findMarker(result, id) || id,
      label: id
    });
  }

  if (id.startsWith("F-")) {
    const formGroup = result.formGroups.find((candidate) => candidate.id === id);
    return renderEntityRefChip({
      id,
      category: "form-group",
      marker: findMarker(result, id) || id,
      label: formGroup?.name || id,
      href: `#${formGroupsAnchor()}`
    });
  }

  if (id.startsWith("V-") || id.startsWith("R-")) {
    const validation = result.validations.find((candidate) => candidate.id === id);
    const rule = result.rules.find((candidate) => candidate.id === id);
    return renderEntityRefChip({
      id,
      category: "message",
      marker: firstStringProperty(validation?.properties["marker"]) || firstStringProperty(rule?.properties["marker"]) || id,
      label: validation?.name || rule?.name || id,
      displaySource: id
    });
  }

  return "";
}

export function actionDetailAnchor(actionId: string): string {
  return `action-detail-${encodeURIComponent(actionId)}`;
}

export function markerCategoryForId(id: string): "layout" | "element" | "action" | "form-group" | undefined {
  if (id.startsWith("L-")) {
    return "layout";
  }

  if (id.startsWith("E-")) {
    return "element";
  }

  if (id.startsWith("A-")) {
    return "action";
  }

  if (id.startsWith("F-")) {
    return "form-group";
  }

  return undefined;
}

export function isInternalId(value: string): boolean {
  return /^(?:ERR|L|E|F|A|R|V)-[\p{L}\p{N}-]+$/u.test(value);
}

function preferredLayoutById(
  result: MarkVSpecParseResult,
  layoutId: string,
  viewport?: string
): MarkVSpecParseResult["layoutGroups"][number] | undefined {
  return preferredLayoutGroupForViewport(result, layoutId, viewport);
}

function firstStringProperty(value: string | string[] | true | undefined): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  return Array.isArray(value) ? value.find((item) => item.length > 0) : undefined;
}
