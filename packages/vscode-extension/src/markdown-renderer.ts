export function trimNoteLines(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;

  while (start < end && lines[start].trim() === "") {
    start += 1;
  }

  while (end > start && lines[end - 1].trim() === "") {
    end -= 1;
  }

  return lines.slice(start, end);
}

export function renderMarkdownSectionContent(lines: string[]): string {
  const blocks: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (line.trim() === "") {
      index += 1;
      continue;
    }

    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(line.trim());
    if (heading) {
      const level = Math.min(6, Math.max(3, heading[1].length + 2));
      blocks.push(`<h${level} class="note-heading">${renderInlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    const codeFence = /^```\s*(.*?)\s*$/u.exec(line.trim());
    if (codeFence) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/u.test(lines[index].trim())) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      const langClass = codeFence[1] ? ` class="language-${escapeHtml(codeFence[1])}"` : "";
      blocks.push(`<pre><code${langClass}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    if (isMarkdownThematicBreak(line)) {
      blocks.push(`<hr class="note-break">`);
      index += 1;
      continue;
    }

    if (isMarkdownTableRow(line)) {
      const tableLines: string[] = [];
      while (index < lines.length && isMarkdownTableRow(lines[index])) {
        tableLines.push(lines[index]);
        index += 1;
      }
      blocks.push(renderMarkdownTable(tableLines));
      continue;
    }

    if (/^\s*>/u.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^\s*>/u.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/u, ""));
        index += 1;
      }
      blocks.push(`<blockquote class="note-blockquote">${renderMarkdownSectionContent(quoteLines)}</blockquote>`);
      continue;
    }

    const marker = markdownListMarker(line);
    if (marker) {
      const list = renderMarkdownList(lines, index, marker.indent, marker.ordered);
      blocks.push(list.html);
      index = list.nextIndex;
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() !== "" &&
      !/^(#{1,6})\s+.+/u.test(lines[index].trim()) &&
      !isMarkdownThematicBreak(lines[index]) &&
      !isMarkdownTableRow(lines[index]) &&
      !/^\s*>/u.test(lines[index]) &&
      !markdownListMarker(lines[index])
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    blocks.push(`<p class="note-paragraph">${renderInlineMarkdown(paragraphLines.join(" "))}</p>`);
  }

  return blocks.join("");
}

export function renderEntityNotes(lines: string[] | undefined): string {
  const content = renderMarkdownSectionContent(trimNoteLines(lines ?? []));
  return content ? `<div class="entity-notes">${content}</div>` : "";
}

export function renderEntityOverview(lines: string[] | undefined): string {
  const content = renderMarkdownSectionContent(trimNoteLines(lines ?? []));
  return content ? `<div class="entity-overview">${content}</div>` : "";
}

export function joinProseLineGroups(groups: string[][]): string[] {
  const joined: string[] = [];
  for (const lines of groups) {
    const trimmed = trimNoteLines(lines);
    if (trimmed.length === 0) {
      continue;
    }
    if (joined.length > 0) {
      joined.push("");
    }
    joined.push(...trimmed);
  }
  return joined;
}

export function firstEntityProseParagraph(lines: string[] | undefined): string {
  const paragraph: string[] = [];
  for (const line of trimNoteLines(lines ?? [])) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (paragraph.length > 0) {
        break;
      }
      continue;
    }
    if (trimmed.startsWith("```") || isMarkdownTableRow(trimmed) || /^-\s+/u.test(trimmed)) {
      break;
    }
    paragraph.push(trimmed);
  }
  return paragraph.join(" ");
}

function isMarkdownTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|");
}

function isMarkdownThematicBreak(line: string): boolean {
  return /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/u.test(line);
}

interface MarkdownListMarker {
  indent: number;
  ordered: boolean;
  text: string;
}

function markdownListMarker(line: string): MarkdownListMarker | undefined {
  const match = /^(\s*)([-+*]|\d+[.)])\s+(.+)$/u.exec(line);
  if (!match) {
    return undefined;
  }
  return {
    indent: match[1].replace(/\t/gu, "    ").length,
    ordered: /\d/u.test(match[2][0]),
    text: match[3]
  };
}

function renderMarkdownList(lines: string[], startIndex: number, indent: number, ordered: boolean): { html: string; nextIndex: number } {
  const items: string[] = [];
  let index = startIndex;

  while (index < lines.length) {
    const marker = markdownListMarker(lines[index]);
    if (!marker || marker.indent < indent) {
      break;
    }
    if (marker.indent > indent) {
      break;
    }
    if (marker.ordered !== ordered) {
      break;
    }

    const itemParts: string[] = [renderInlineMarkdown(marker.text)];
    index += 1;

    while (index < lines.length) {
      const nextMarker = markdownListMarker(lines[index]);
      if (!nextMarker) {
        if (lines[index].trim() === "") {
          index += 1;
          continue;
        }
        if (isMarkdownTableRow(lines[index]) || /^\s*>/u.test(lines[index]) || isMarkdownThematicBreak(lines[index])) {
          break;
        }
        itemParts.push(renderInlineMarkdown(lines[index].trim()));
        index += 1;
        continue;
      }
      if (nextMarker.indent <= indent) {
        break;
      }
      const nested = renderMarkdownList(lines, index, nextMarker.indent, nextMarker.ordered);
      itemParts.push(nested.html);
      index = nested.nextIndex;
    }

    items.push(`<li>${itemParts.join(" ")}</li>`);
  }

  const tag = ordered ? "ol" : "ul";
  return { html: `<${tag} class="spec-list">${items.join("")}</${tag}>`, nextIndex: index };
}

function renderMarkdownTable(lines: string[]): string {
  const rows = lines
    .map((line) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim()))
    .filter((cells) => !cells.every((cell) => /^:?-{3,}:?$/u.test(cell)));
  const [headers = [], ...bodyRows] = rows;
  return renderTable(headers, bodyRows.map((row) => row.map(renderInlineMarkdown)));
}

export function renderInlineMarkdown(value: string): string {
  const codeSpans: string[] = [];
  const tokenized = value.replace(/`([^`]+)`/gu, (_match, code: string) => {
    const token = `\u0000CODE${codeSpans.length}\u0000`;
    codeSpans.push(`<span class="mm-inline-token">${escapeHtml(code)}</span>`);
    return token;
  });

  const htmlSpans: string[] = [];
  let rendered = escapeHtml(tokenized);
  rendered = rendered.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/gu, (_match, alt: string, url: string, title: string | undefined) => {
    const safe = safeMarkdownImageUrl(url);
    if (!safe) {
      return "";
    }
    const token = `\u0000HTML${htmlSpans.length}\u0000`;
    htmlSpans.push(`<img src="${safe}" alt="${escapeHtml(alt)}"${title ? ` title="${escapeHtml(title)}"` : ""}>`);
    return token;
  });
  rendered = rendered.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/gu, (_match, labelText: string, url: string, title: string | undefined) => {
    const safe = safeMarkdownUrl(url);
    if (!safe) {
      return escapeHtml(labelText);
    }
    const token = `\u0000HTML${htmlSpans.length}\u0000`;
    htmlSpans.push(`<a href="${safe}"${title ? ` title="${escapeHtml(title)}"` : ""}>${applyInlineEmphasis(labelText)}</a>`);
    return token;
  });
  rendered = applyInlineEmphasis(rendered);

  for (let index = 0; index < codeSpans.length; index += 1) {
    rendered = rendered.replace(new RegExp(`\\u0000CODE${index}\\u0000`, "gu"), codeSpans[index]);
  }
  for (let index = 0; index < htmlSpans.length; index += 1) {
    rendered = rendered.replace(new RegExp(`\\u0000HTML${index}\\u0000`, "gu"), htmlSpans[index]);
  }
  return rendered;
}

function applyInlineEmphasis(value: string): string {
  return value
    .replace(/\*\*([^*]+)\*\*/gu, "<strong>$1</strong>")
    .replace(/__([^_]+)__/gu, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/gu, "<em>$1</em>")
    .replace(/(?<!_)_([^_]+)_(?!_)/gu, "<em>$1</em>");
}

function safeMarkdownUrl(value: string): string | undefined {
  const normalized = value.trim().replace(/&amp;/gu, "&");
  const lower = decodedMarkdownUrl(normalized);
  if (/^(?:javascript|vbscript|data):/u.test(lower)) {
    return undefined;
  }
  return escapeHtml(normalized);
}

function safeMarkdownImageUrl(value: string): string | undefined {
  const normalized = value.trim().replace(/&amp;/gu, "&");
  const lower = decodedMarkdownUrl(normalized);
  if (/^[a-z][a-z0-9+.-]*:/u.test(lower) || lower.startsWith("//") || lower.startsWith("/")) {
    return undefined;
  }
  return escapeHtml(normalized);
}

function decodedMarkdownUrl(value: string): string {
  return value.replace(/&#(?:x([0-9a-f]+)|([0-9]+));/giu, (_match, hex: string | undefined, decimal: string | undefined) =>
    String.fromCodePoint(Number.parseInt(hex ?? decimal ?? "0", hex ? 16 : 10))
  ).toLowerCase();
}

function renderTable(headers: string[], rows: Array<Array<string | undefined>>, emptyLabel = "None."): string {
  if (rows.length === 0) {
    return `<p class="spec-empty">${escapeHtml(emptyLabel)}</p>`;
  }

  return `<div class="spec-table-wrap"><table class="spec-table"><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
