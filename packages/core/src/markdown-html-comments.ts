interface MarkdownHtmlCommentCandidate {
  type: string;
  text?: string;
  range?: {
    start: { line: number };
    end: { line: number };
  };
}

export function isStandaloneHtmlCommentBlock(block: MarkdownHtmlCommentCandidate): boolean {
  return block.type === "html" && /^<!--[\s\S]*-->$/u.test((block.text ?? "").trim());
}

export function standaloneHtmlCommentLineNumbers(blocks: MarkdownHtmlCommentCandidate[]): Set<number> {
  const commentLines = new Set<number>();
  for (const block of blocks) {
    if (!isStandaloneHtmlCommentBlock(block) || !block.range) {
      continue;
    }
    for (let line = block.range.start.line; line <= block.range.end.line; line += 1) {
      commentLines.add(line);
    }
  }
  return commentLines;
}

export function filterLinesWithoutStandaloneHtmlComments<T extends { text: string; line: number }>(
  lines: T[],
  blocks: MarkdownHtmlCommentCandidate[]
): T[] {
  const commentLines = standaloneHtmlCommentLineNumbers(blocks);
  const filtered: T[] = [];
  let skippedCommentSinceLastKeptLine = false;

  for (const line of lines) {
    if (commentLines.has(line.line)) {
      skippedCommentSinceLastKeptLine = true;
      continue;
    }
    if (skippedCommentSinceLastKeptLine && line.text.trim() === "" && filtered[filtered.length - 1]?.text.trim() === "") {
      continue;
    }
    filtered.push(line);
    skippedCommentSinceLastKeptLine = false;
  }

  return filtered;
}
