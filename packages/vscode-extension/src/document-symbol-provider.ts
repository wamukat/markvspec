import * as vscode from "vscode";
import {
  displaySummaryForElement,
  layoutDisplaySettings,
  parseMarkVSpec,
  parseMarkVSpecProject
} from "@markvspec/core";

export function createMarkVSpecDocumentSymbolsProvider(): vscode.DocumentSymbolProvider {
  return {
    provideDocumentSymbols(document: vscode.TextDocument) {
      return createMarkVSpecDocumentSymbols(document);
    }
  };
}

export function createMarkVSpecDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
  if (isMarkVSpecProjectDocument(document)) {
    return createMarkVSpecProjectDocumentSymbols(document);
  }

  const result = parseMarkVSpec(document.getText());
  const sections = collectSectionHeadings(document);
  const screenLine = result.screen.location?.line ?? findFirstHeadingLine(document, /^#\s+/u) ?? 1;
  const screenName = result.screen.id && result.screen.title
    ? `${result.screen.id} ${result.screen.title}`
    : result.screen.title ?? result.screen.id ?? "Untitled Screen";
  const screenSymbol = createDocumentSymbol(
    document,
    screenName,
    "Screen",
    vscode.SymbolKind.Module,
    screenLine,
    document.lineCount
  );

  for (const section of sections) {
    const sectionSymbol = createDocumentSymbol(
      document,
      section.title,
      "Section",
      vscode.SymbolKind.Namespace,
      section.line,
      section.endLine
    );
    sectionSymbol.children.push(...symbolsForSection(document, result, section));
    screenSymbol.children.push(sectionSymbol);
  }

  return [screenSymbol];
}

function createMarkVSpecProjectDocumentSymbols(document: vscode.TextDocument): vscode.DocumentSymbol[] {
  const result = parseMarkVSpecProject(document.getText());
  const projectLine = result.project.location?.line ?? findFirstHeadingLine(document, /^#\s+/u) ?? 1;
  const projectName = result.project.id && result.project.title
    ? `${result.project.id} ${result.project.title}`
    : result.project.title ?? result.project.id ?? "Untitled Project";
  const projectSymbol = createDocumentSymbol(
    document,
    projectName,
    "Project",
    vscode.SymbolKind.Module,
    projectLine,
    document.lineCount
  );

  for (const template of result.templates) {
    const label = [
      template.id,
      template.title,
      template.path ? `(${template.path})` : ""
    ].filter(Boolean).join(" ");
    projectSymbol.children.push(createDocumentSymbol(
      document,
      label || "Untitled Template",
      "Template",
      vscode.SymbolKind.Class,
      template.location.line,
      template.location.line
    ));
  }

  for (const screen of result.screens) {
    const label = [
      screen.id,
      screen.title,
      screen.path ? `(${screen.path})` : ""
    ].filter(Boolean).join(" ");
    projectSymbol.children.push(createDocumentSymbol(
      document,
      label || "Untitled Screen",
      "Screen",
      vscode.SymbolKind.Interface,
      screen.location.line,
      screen.location.line
    ));
  }

  return [projectSymbol];
}

interface SectionHeading {
  title: string;
  line: number;
  endLine: number;
}

function collectSectionHeadings(document: vscode.TextDocument): SectionHeading[] {
  const headings: SectionHeading[] = [];

  for (let index = 0; index < document.lineCount; index += 1) {
    const match = /^##\s+(.+?)\s*$/.exec(document.lineAt(index).text);
    if (!match) {
      continue;
    }

    if (match[1].startsWith("#")) {
      continue;
    }

    headings.push({
      title: match[1],
      line: index + 1,
      endLine: document.lineCount
    });
  }

  for (let index = 0; index < headings.length; index += 1) {
    headings[index].endLine = index + 1 < headings.length ? headings[index + 1].line - 1 : document.lineCount;
  }

  return headings;
}

function symbolsForSection(
  document: vscode.TextDocument,
  result: ReturnType<typeof parseMarkVSpec>,
  section: SectionHeading
): vscode.DocumentSymbol[] {
  if (section.title === "States") {
    return result.states
      .filter((state) => isLineInSection(state.location.line, section))
      .map((state) => createDocumentSymbol(document, state.name, state.initial ? "initial state" : "state", vscode.SymbolKind.EnumMember, state.location.line, state.location.line));
  }

  if (section.title.startsWith("Layout:")) {
    return result.layoutGroups
      .filter((group) => isLineInSection(group.location.line, section))
      .map((group) => createDocumentSymbol(document, layoutSymbolName(group), group.viewport, vscode.SymbolKind.Struct, group.location.line, nextSiblingLineEnd(document, group.location.line, section.endLine)));
  }

  if (section.title.startsWith("Slot:")) {
    return result.slotContents
      .filter((slot) => isLineInSection(slot.location.line, section))
      .flatMap((slot) => slot.layoutGroups.map((group) => createDocumentSymbol(document, layoutSymbolName(group), `Slot ${slot.name}`, vscode.SymbolKind.Struct, group.location.line, nextSiblingLineEnd(document, group.location.line, section.endLine))));
  }

  if (section.title === "Slots") {
    return result.slotDefinitions
      .filter((slot) => isLineInSection(slot.location.line, section))
      .map((slot) => createDocumentSymbol(document, slot.title ? `${slot.name} ${slot.title}` : slot.name, "Slot", vscode.SymbolKind.Interface, slot.location.line, nextSiblingLineEnd(document, slot.location.line, section.endLine)));
  }

  if (section.title === "Elements") {
    return result.elements
      .filter((element) => isLineInSection(element.location.line, section))
      .map((element) => createDocumentSymbol(document, `${formatMarkerPrefix(displaySummaryForElement(element).marker)}${element.id}`, element.type, vscode.SymbolKind.Field, element.location.line, nextSiblingLineEnd(document, element.location.line, section.endLine)));
  }

  if (section.title === "Actions") {
    return result.actions
      .filter((action) => isLineInSection(action.location.line, section))
      .map((action) => createDocumentSymbol(document, `${formatMarkerPrefix(action.properties["marker"])}${action.id} ${action.name}`, "Action", vscode.SymbolKind.Event, action.location.line, nextSiblingLineEnd(document, action.location.line, section.endLine)));
  }

  if (section.title === "Validations" || section.title === "Field Validations" || section.title === "Cross-field Validations") {
    return result.validations
      .filter((validation) => isLineInSection(validation.location.line, section))
      .map((validation) => createDocumentSymbol(document, `${validation.id}${validation.name ? ` ${validation.name}` : ""}`, "Validation", vscode.SymbolKind.Operator, validation.location.line, nextSiblingLineEnd(document, validation.location.line, section.endLine)));
  }

  if (section.title === "Business Rules") {
    return result.rules
      .filter((rule) => isLineInSection(rule.location.line, section))
      .map((rule) => createDocumentSymbol(document, `${formatMarkerPrefix(rule.properties["marker"])}${rule.id}${rule.name ? ` ${rule.name}` : ""}`, "Rule", vscode.SymbolKind.Key, rule.location.line, nextSiblingLineEnd(document, rule.location.line, section.endLine)));
  }

  if (section.title === "Error Codes") {
    return result.errorCodes
      .filter((errorCode) => isLineInSection(errorCode.location.line, section))
      .map((errorCode) => createDocumentSymbol(document, `${formatMarkerPrefix(errorCode.properties["marker"])}${errorCode.id}${errorCode.name ? ` ${errorCode.name}` : ""}`, "Error Code", vscode.SymbolKind.Constant, errorCode.location.line, nextSiblingLineEnd(document, errorCode.location.line, section.endLine)));
  }

  return [];
}

function createDocumentSymbol(
  document: vscode.TextDocument,
  name: string,
  detail: string,
  kind: vscode.SymbolKind,
  startLine: number,
  endLine: number
): vscode.DocumentSymbol {
  const startIndex = clampLine(document, startLine) - 1;
  const endIndex = clampLine(document, endLine) - 1;
  const startText = document.lineAt(startIndex).text;
  const endText = document.lineAt(endIndex).text;
  return new vscode.DocumentSymbol(
    name,
    detail,
    kind,
    new vscode.Range(startIndex, 0, endIndex, endText.length),
    new vscode.Range(startIndex, 0, startIndex, startText.length)
  );
}

function layoutSymbolName(group: ReturnType<typeof parseMarkVSpec>["layoutGroups"][number]): string {
  return `${formatMarkerPrefix(layoutDisplaySettings(group).marker)}${group.id}${group.name ? ` ${group.name}` : ""}`;
}

function isLineInSection(line: number, section: SectionHeading): boolean {
  return line > section.line && line <= section.endLine;
}

function nextSiblingLineEnd(document: vscode.TextDocument, startLine: number, sectionEndLine: number): number {
  for (let line = startLine + 1; line <= sectionEndLine; line += 1) {
    if (/^###\s+/u.test(document.lineAt(line - 1).text)) {
      return line - 1;
    }
  }

  return sectionEndLine;
}

function findFirstHeadingLine(document: vscode.TextDocument, pattern: RegExp): number | undefined {
  for (let index = 0; index < document.lineCount; index += 1) {
    if (pattern.test(document.lineAt(index).text)) {
      return index + 1;
    }
  }

  return undefined;
}

function clampLine(document: vscode.TextDocument, line: number): number {
  return Math.min(Math.max(line, 1), Math.max(document.lineCount, 1));
}

function formatMarkerPrefix(marker: string | string[] | true | undefined): string {
  return typeof marker === "string" && marker ? `${marker}:` : "";
}

function isMarkVSpecProjectDocument(document: vscode.TextDocument): boolean {
  return document.uri.scheme === "file" && document.fileName.endsWith(".vspec.project.md");
}
