export interface PreviewSourceJumpMessage {
  readonly command?: string;
  readonly sourceAnchor?: unknown;
  readonly sourceKind?: unknown;
  readonly sourceId?: unknown;
  readonly startLine?: unknown;
  readonly endLine?: unknown;
}

export interface PreviewSourceJumpTarget {
  readonly sourceAnchor: string;
  readonly sourceKind?: string;
  readonly sourceId?: string;
  readonly startLine: number;
  readonly endLine: number;
}

export function previewSourceJumpTargetFromMessage(message: PreviewSourceJumpMessage): PreviewSourceJumpTarget | undefined {
  if (message.command !== "jumpToSource") {
    return undefined;
  }
  if (typeof message.sourceAnchor !== "string" || message.sourceAnchor.length === 0) {
    return undefined;
  }

  const startLine = sourceLineNumber(message.startLine);
  if (startLine === undefined) {
    return undefined;
  }

  const endLine = Math.max(startLine, sourceLineNumber(message.endLine) ?? startLine);
  return {
    sourceAnchor: message.sourceAnchor,
    sourceKind: optionalString(message.sourceKind),
    sourceId: optionalString(message.sourceId),
    startLine,
    endLine
  };
}

function sourceLineNumber(value: unknown): number | undefined {
  const line = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(line) && line > 0 ? line : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
