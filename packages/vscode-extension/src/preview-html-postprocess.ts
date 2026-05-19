import { escapeHtml } from "./design-document-renderer.js";

type MarkerCategory = "action" | "element" | "layout";
type SectionNumberRenderer = (sectionNumber: string) => string;

export function numberDocumentSectionsHtml(
  html: string,
  startNumber: number,
  renderSectionNumber: SectionNumberRenderer
): { html: string; nextNumber: number } {
  if (!html.trim()) {
    return { html: "", nextNumber: startNumber };
  }

  let nextNumber = startNumber;
  const numberedHtml = html.replace(/<section class="doc-section([^"]*)"([^>]*)>\s*<h2([^>]*)>/gu, (_match, classes: string, attributes: string, headingAttributes: string) => {
    const number = String(nextNumber);
    nextNumber += 1;
    return renderNumberedSectionStart(classes, attributes, headingAttributes, number, renderSectionNumber);
  });

  return { html: numberedHtml, nextNumber };
}

export function addDocumentSectionNumberHtml(
  html: string,
  sectionNumber: string,
  renderSectionNumber: SectionNumberRenderer
): string {
  if (!html.trim()) {
    return "";
  }

  return html
    .replace(/<section class="doc-section([^"]*)"/u, (_match, classes: string) => renderSectionWithNumberAttribute(classes, sectionNumber))
    .replace(/<h2([^>]*)>/u, (_match, attributes: string) => renderHeadingWithSectionNumber(attributes, sectionNumber, renderSectionNumber));
}

export function demoteHtmlHeadings(html: string, fromLevel: number, toLevel: number, className: string): string {
  return html
    .replace(new RegExp(`<h${fromLevel}\\b([^>]*)>`, "gu"), (_match, attrs: string) => {
      return `<h${toLevel}${headingAttributesWithClass(attrs, className)}>`;
    })
    .replace(new RegExp(`</h${fromLevel}>`, "gu"), `</h${toLevel}>`);
}

export function prependHtmlInsideFirstTag(html: string, content: string): string {
  return html.replace(">", `>${content}`);
}

export function markRepeatedHiddenEmptyHtml(html: string, emptyWhenRepeatedHidden: boolean): string {
  if (!emptyWhenRepeatedHidden || html.includes(`data-mm-repeated-empty="true"`)) {
    return html;
  }
  return html
    .replace(`<div class="spec-table-wrap"`, `<div class="spec-table-wrap" data-mm-repeated-empty="true"`)
    .replace(`<p class="spec-empty"`, `<p class="spec-empty" data-mm-repeated-empty="true"`);
}

export function markRepeatedMarkerCodeHtml(
  html: string,
  repeatedMarkers: Record<MarkerCategory, ReadonlySet<string>>
): string {
  return html.replace(/<code class="mm-id mm-marker mm-marker-(layout|element|action)" data-mm-marker-category="\1">([\s\S]*?)<\/code>/g, (match, category: MarkerCategory, value: string) => {
    const marker = unescapeHtml(value.replace(/<[^>]*>/g, ""));
    if (!repeatedMarkers[category].has(marker)) {
      return match;
    }

    return match
      .replace("mm-id mm-marker", "mm-id mm-marker mm-marker-repeated")
      .replace(`data-mm-marker-category="${category}"`, `data-mm-marker-category="${category}" data-mm-repeated-marker="true"`);
  });
}

export function appendHtmlBeforeClosingRootDiv(html: string, content: string): string {
  return html.replace(/<\/div>\s*$/u, `${content}</div>`);
}

export function namespacePreviewRenderKeys(html: string, prefix: string): string {
  return html
    .replace(/data-mm-render-key="([^"]+)"/gu, (_match, renderKey: string) => `data-mm-render-key="${escapeHtml(prefix)}${renderKey}"`)
    .replace(/<!--mm-render-key:([^>]+)-->/gu, (_match, renderKey: string) => `<!--mm-render-key:${prefix}${renderKey}-->`);
}

export function insertHtmlIntoElementRenderKey(html: string, renderKey: string, content: string): string {
  const escapedRenderKey = escapeRegExp(renderKey);
  const pattern = new RegExp(`(<div class="mm-element-wrap[^"]*"[^>]*data-mm-render-key="${escapedRenderKey}"[^>]*>[\\s\\S]*?)(</div>)`, "u");
  if (!pattern.test(html)) {
    return html;
  }
  return html.replace(pattern, `$1${content}$2`);
}

function renderNumberedSectionStart(
  classes: string,
  sectionAttributes: string,
  headingAttributes: string,
  sectionNumber: string,
  renderSectionNumber: SectionNumberRenderer
): string {
  return `${renderSectionWithNumberAttribute(classes, sectionNumber)}${sectionAttributes}>\n    ${renderHeadingWithSectionNumber(headingAttributes, sectionNumber, renderSectionNumber)}`;
}

function renderSectionWithNumberAttribute(classes: string, sectionNumber: string): string {
  return `<section class="doc-section${classes}" data-section-number="${escapeHtml(sectionNumber)}"`;
}

function renderHeadingWithSectionNumber(
  attributes: string,
  sectionNumber: string,
  renderSectionNumber: SectionNumberRenderer
): string {
  return `<h2${attributes}>${renderSectionNumber(sectionNumber)} `;
}

function headingAttributesWithClass(attrs: string, className: string): string {
  const classAttribute = /\sclass=(["'])(.*?)\1/u.exec(attrs);
  if (!classAttribute) {
    return ` class="${className}"${attrs}`;
  }
  const [, quote, classValue] = classAttribute;
  const classes = classValue.split(/\s+/u).filter(Boolean);
  if (!classes.includes(className)) {
    classes.push(className);
  }
  return attrs.replace(classAttribute[0], ` class=${quote}${classes.join(" ")}${quote}`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unescapeHtml(value: string): string {
  return value
    .replaceAll("&quot;", "\"")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}
