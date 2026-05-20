import assert from "node:assert/strict";

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function stateSection(html: string, state: string): string {
  const startMatch = new RegExp(`<section class="doc-section state-screen-section"(?=[^>]*\\bdata-state="${escapeRegExp(state)}")[^>]*>`).exec(html);
  const start = startMatch?.index ?? -1;
  assert.notEqual(start, -1, `missing state section ${state}`);
  const next = html.indexOf(`<section class="doc-section state-screen-section"`, start + (startMatch?.[0].length ?? 0));
  return next === -1 ? html.slice(start) : html.slice(start, next);
}

export function viewportStateSection(html: string, state: string, viewport: string): string {
  const startMatch = new RegExp(`<section class="doc-section state-screen-section"(?=[^>]*\\bdata-state="${escapeRegExp(state)}")(?=[^>]*\\bdata-viewport="${escapeRegExp(viewport)}")[^>]*>`).exec(html);
  const start = startMatch?.index ?? -1;
  assert.notEqual(start, -1, `missing state section ${viewport}:${state}`);
  const next = html.indexOf(`<section class="doc-section state-screen-section"`, start + (startMatch?.[0].length ?? 0));
  return next === -1 ? html.slice(start) : html.slice(start, next);
}

export function stateWireframeSection(section: string): string {
  const startMarker = `<section class="wireframe-section">`;
  const start = section.indexOf(startMarker);
  assert.notEqual(start, -1, "missing wireframe section");
  const nextH3 = section.indexOf("<h3>", start + startMarker.length);
  const nextH5 = section.indexOf('<h5 class="state-screen-subheading"', start + startMarker.length);
  const candidates = [nextH3, nextH5].filter((index) => index !== -1);
  const nextHeading = candidates.length > 0 ? Math.min(...candidates) : -1;
  return nextHeading === -1 ? section.slice(start) : section.slice(start, nextHeading);
}

export function stateSectionContaining(html: string, state: string, text: string): string {
  const sectionPattern = new RegExp(`<section class="doc-section state-screen-section"(?=[^>]*\\bdata-state="${escapeRegExp(state)}")[^>]*>[\\s\\S]*?(?=<section class="doc-section state-screen-section"|$)`, "gu");
  const sections = [...html.matchAll(sectionPattern)].map((match) => match[0]);
  const section = sections.find((candidate) => candidate.includes(text));
  assert(section, `missing state section ${state} containing ${text}`);
  return section;
}
