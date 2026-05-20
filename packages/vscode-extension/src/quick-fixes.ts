import * as vscode from "vscode";

export function createMarkVSpecCodeActions(
  document: vscode.TextDocument,
  diagnostics: readonly vscode.Diagnostic[]
): vscode.CodeAction[] {
  if (isMarkVSpecProjectDocument(document)) {
    return [];
  }

  const actions: vscode.CodeAction[] = [];

  for (const diagnostic of diagnostics) {
    if (diagnostic.source !== "MarkVSpec") {
      continue;
    }

    const missingTrigger = /^Action (A-[\p{L}\p{N}-]+) has no trigger\./u.exec(diagnostic.message);
    if (missingTrigger) {
      const action = createMissingTriggerAction(document, diagnostic, missingTrigger[1]);
      if (action) {
        actions.push(action);
      }
      continue;
    }

    if (diagnostic.message === "Layout section must specify a viewport, for example ## Layout: mobile.") {
      const action = createLayoutViewportAction(document, diagnostic);
      if (action) {
        actions.push(action);
      }
      continue;
    }

    const directChild = /^Layout (L-[\p{L}\p{N}-]+) uses a direct child reference; place (L-[\p{L}\p{N}-]+|E-[\p{L}\p{N}-]+) under #### Items\.$/u.exec(diagnostic.message);
    if (directChild) {
      const action = createMoveDirectLayoutItemAction(document, diagnostic, directChild[1], directChild[2]);
      if (action) {
        actions.push(action);
      }
    }
  }

  return actions;
}

function isMarkVSpecProjectDocument(document: vscode.TextDocument): boolean {
  return document.uri.scheme === "file" && document.fileName.endsWith(".vspec.project.md");
}

function createMissingTriggerAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic, actionId: string): vscode.CodeAction | undefined {
  const line = diagnostic.range.start.line;
  const heading = new RegExp(String.raw`^###\s+(?:\S+?:)?${escapeRegExpForPattern(actionId)}\s+`, "u");
  if (!heading.test(document.lineAt(line).text)) {
    return undefined;
  }

  const action = new vscode.CodeAction(`Add page.load event for ${actionId}`, vscode.CodeActionKind.QuickFix);
  action.diagnostics = [diagnostic];
  const edit = new vscode.WorkspaceEdit();
  const insertLine = document.lineCount;
  const prefix = document.lineAt(document.lineCount - 1).text.trim().length > 0 ? "\n\n" : "\n";
  edit.insert(document.uri, new vscode.Position(insertLine, 0), `${prefix}## Events\n\n- page.load: ${actionId}\n`);
  action.edit = edit;
  return action;
}

function createLayoutViewportAction(document: vscode.TextDocument, diagnostic: vscode.Diagnostic): vscode.CodeAction | undefined {
  const line = diagnostic.range.start.line;
  if (document.lineAt(line).text.trim() !== "## Layout") {
    return undefined;
  }

  const viewport = inferLayoutViewportCandidate(document, line);
  if (!viewport) {
    return undefined;
  }

  const action = new vscode.CodeAction(`Change to ## Layout: ${viewport}`, vscode.CodeActionKind.QuickFix);
  action.diagnostics = [diagnostic];
  action.isPreferred = true;
  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, new vscode.Range(line, 0, line, document.lineAt(line).text.length), `## Layout: ${viewport}`);
  action.edit = edit;
  return action;
}

function createMoveDirectLayoutItemAction(
  document: vscode.TextDocument,
  diagnostic: vscode.Diagnostic,
  layoutId: string,
  itemId: string
): vscode.CodeAction | undefined {
  const sourceLine = diagnostic.range.start.line;
  if (document.lineAt(sourceLine).text.trim() !== `- ${itemId}`) {
    return undefined;
  }

  const bounds = findParentLayoutBounds(document, sourceLine, layoutId);
  if (!bounds) {
    return undefined;
  }

  const action = new vscode.CodeAction(`Move ${itemId} under #### Items`, vscode.CodeActionKind.QuickFix);
  action.diagnostics = [diagnostic];
  const edit = new vscode.WorkspaceEdit();
  edit.delete(document.uri, lineRange(document, sourceLine));

  const itemsLine = findItemsSubsectionLine(document, bounds.headingLine, bounds.endLine);
  if (itemsLine !== undefined) {
    edit.insert(document.uri, new vscode.Position(itemsLine + 1, 0), `- ${itemId}\n`);
  } else {
    edit.insert(document.uri, new vscode.Position(bounds.endLine, 0), `\n#### Items\n\n- ${itemId}\n`);
  }

  action.edit = edit;
  return action;
}

function inferLayoutViewportCandidate(document: vscode.TextDocument, bareLayoutLine: number): string | undefined {
  const viewports = new Set<string>();
  for (let line = 0; line < document.lineCount; line += 1) {
    if (line === bareLayoutLine) {
      continue;
    }
    const match = /^##\s+Layout:\s*(.+?)\s*$/.exec(document.lineAt(line).text);
    if (match) {
      viewports.add(match[1].trim());
    }
  }

  return viewports.size === 1 ? [...viewports][0] : undefined;
}

function escapeRegExpForPattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findParentLayoutBounds(
  document: vscode.TextDocument,
  sourceLine: number,
  layoutId: string
): { headingLine: number; endLine: number } | undefined {
  for (let line = sourceLine; line >= 0; line -= 1) {
    const text = document.lineAt(line).text;
    if (/^##\s+/u.test(text)) {
      return undefined;
    }

    const match = /^###\s+(?:(\S+?):)?(L-[\p{L}\p{N}-]+)\s+/u.exec(text);
    if (match) {
      if (match[2] !== layoutId) {
        return undefined;
      }

      return {
        headingLine: line,
        endLine: findBlockEndLine(document, line)
      };
    }
  }

  return undefined;
}

function findBlockEndLine(document: vscode.TextDocument, headingLine: number): number {
  for (let line = headingLine + 1; line < document.lineCount; line += 1) {
    if (/^#{2,3}\s+/u.test(document.lineAt(line).text)) {
      return line;
    }
  }

  return document.lineCount;
}

function findItemsSubsectionLine(document: vscode.TextDocument, startLine: number, endLine: number): number | undefined {
  for (let line = startLine + 1; line < endLine; line += 1) {
    if (document.lineAt(line).text.trim() === "#### Items") {
      return line;
    }
  }

  return undefined;
}

function lineRange(document: vscode.TextDocument, line: number): vscode.Range {
  if (line + 1 < document.lineCount) {
    return new vscode.Range(line, 0, line + 1, 0);
  }

  return new vscode.Range(line, 0, line, document.lineAt(line).text.length);
}
