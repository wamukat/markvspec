import type { resolveMarkVSpecEntityReference } from "@markvspec/core/browser";

export type StaticEntityReference = NonNullable<ReturnType<typeof resolveMarkVSpecEntityReference>>;

export interface StaticEntityReferencePresenterSupport {
  escapeHtml(value: string): string;
}

export type StaticPreviewIconName =
  | "circle-x"
  | "cog"
  | "database"
  | "eye-off"
  | "languages"
  | "merge"
  | "panels-top-left"
  | "refresh-cw"
  | "route"
  | "satellite-dish"
  | "split"
  | "square-check-big"
  | "table"
  | "unplug"
  | "waypoints";

export function renderStaticPreviewIcon(name: StaticPreviewIconName): string {
  const paths: Record<StaticPreviewIconName, string> = {
    "circle-x": '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    cog: '<path d="M11 10.27 7 3.34"/><path d="m11 13.73-4 6.93"/><path d="M12 22v-2"/><path d="M12 2v2"/><path d="M14 12h8"/><path d="m17 20.66-1-1.73"/><path d="m17 3.34-1 1.73"/><path d="M2 12h2"/><path d="m20.66 17-1.73-1"/><path d="m20.66 7-1.73 1"/><path d="m3.34 17 1.73-1"/><path d="m3.34 7 1.73 1"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="8"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/>',
    "eye-off": '<path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61C3.88 8.46 2 12 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>',
    languages: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
    merge: '<path d="m8 6 4-4 4 4"/><path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22"/><path d="m20 22-5-5"/>',
    "panels-top-left": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
    "refresh-cw": '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    route: '<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M6 16V8a3 3 0 0 1 3-3h6"/><path d="M18 8v8a3 3 0 0 1-3 3H9"/>',
    "satellite-dish": '<path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/>',
    split: '<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/>',
    "square-check-big": '<path d="M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344"/><path d="m9 11 3 3L22 4"/>',
    table: '<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>',
    unplug: '<path d="m19 5 3-3"/><path d="m2 22 3-3"/><path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"/>',
    waypoints: '<path d="m10.586 5.414-5.172 5.172"/><path d="m18.586 13.414-5.172 5.172"/><path d="M6 12h12"/><circle cx="12" cy="20" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="20" cy="12" r="2"/><circle cx="4" cy="12" r="2"/>'
  };
  return `<svg class="mm-icon mm-icon-${name}" aria-hidden="true" viewBox="0 0 24 24">${paths[name]}</svg>`;
}

export function renderStaticEntityReference(
  reference: StaticEntityReference,
  support: StaticEntityReferencePresenterSupport
): string {
  const category = reference.kind === "business-rule" || reference.kind === "validation"
    ? "message"
    : reference.kind;
  const marker = reference.marker ?? reference.id;
  const label = reference.label && reference.label !== reference.id ? ` ${support.escapeHtml(reference.label)}` : "";
  const href = staticEntityReferenceHref(reference);
  return `<a class="mm-ref-chip mm-ref-chip-${support.escapeHtml(category)}" href="${support.escapeHtml(href)}" data-mm-ref-id="${support.escapeHtml(reference.id)}"><code class="mm-id mm-marker mm-marker-${support.escapeHtml(category)}" data-mm-marker-category="${support.escapeHtml(category)}">${support.escapeHtml(marker)}</code>${label}</a>`;
}

export function renderStaticElementDetailReference(
  reference: StaticEntityReference,
  support: StaticEntityReferencePresenterSupport
): string {
  const marker = reference.marker ?? reference.id;
  const href = staticEntityReferenceHref(reference);
  return `<a class="mm-ref-chip mm-ref-chip-element" href="${support.escapeHtml(href)}" data-mm-ref-id="${support.escapeHtml(reference.id)}"><code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">${support.escapeHtml(marker)}</code> <span class="mm-detail-ref-id">${support.escapeHtml(reference.id)}</span></a>`;
}

export function renderStaticElementSampleRowsReference(
  reference: { elementId: string; marker: string; anchorId?: string },
  support: StaticEntityReferencePresenterSupport
): string {
  const href = reference.anchorId ? ` href="#${support.escapeHtml(reference.anchorId)}"` : "";
  return `<a class="mm-ref-chip mm-ref-chip-element"${href} data-mm-ref-id="${support.escapeHtml(reference.elementId)}">${renderStaticPreviewIcon("table")}<code class="mm-id mm-marker mm-marker-element" data-mm-marker-category="element">${support.escapeHtml(reference.marker)}</code> <span class="mm-detail-ref-id">${support.escapeHtml(reference.elementId)}</span></a>`;
}

export function staticEntityReferenceHref(reference: StaticEntityReference): string {
  if (reference.kind === "screen") {
    return "#screen";
  }
  return "#state-views";
}
