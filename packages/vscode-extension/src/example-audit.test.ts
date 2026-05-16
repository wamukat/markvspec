import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import test from "node:test";
import { buildViewportStateScreenReadModels, stateScreenActionsForModel } from "@markvspec/core";
import { loadScreenDocumentResult, renderDesignDocumentHtml } from "./extension.js";

interface AuditFinding {
  code: string;
  file: string;
  state?: string;
  scenario?: string;
  id?: string;
  message: string;
}

interface ExampleAuditDocument {
  file: string;
  result: ReturnType<typeof loadScreenDocumentResult>["result"];
  html: string;
}

const workspaceRoot = findWorkspaceRoot(process.cwd());
const examplesRoot = resolve(workspaceRoot, "examples");
const knownIssueTickets: Record<string, string> = {
  "ja-ui-english-leftover": "MarkVSpec#1072",
  "not-placed-visible-layout": "MarkVSpec#1076"
};

test("audits example preview regressions across shipped examples", () => {
  const findings: AuditFinding[] = [];
  const documents = loadExampleDocuments(findExampleFiles(examplesRoot), findings);

  for (const document of documents) {
    auditDiagnostics(document, findings);
    auditVisibleNotPlacedLayouts(document, findings);
    auditElementTriggerActionVisibility(document, findings);
    auditDialogActionPlacement(document, findings);
    auditDisplayEffects(document, findings);
  }
  auditJapaneseGeneratedActionText(findings);

  const uniqueFindings = dedupeFindings(findings);
  const unexpected = uniqueFindings.filter((finding) => !knownIssueTickets[finding.code]);
  const known = uniqueFindings.filter((finding) => knownIssueTickets[finding.code]);
  const knownCodes = new Set(known.map((finding) => finding.code));

  assert.deepEqual(unexpected, [], formatFindings("Unexpected preview audit findings", unexpected));
  for (const code of Object.keys(knownIssueTickets)) {
    assert(knownCodes.has(code), `Expected known issue detector ${code} (${knownIssueTickets[code]}) to report at least one finding.`);
  }

  if (known.length > 0) {
    console.log(formatFindings("Known preview audit findings", known));
  }
});

function loadExampleDocuments(files: string[], findings: AuditFinding[]): ExampleAuditDocument[] {
  const documents: ExampleAuditDocument[] = [];
  for (const file of files) {
    try {
      const source = readFileSync(file, "utf8");
      const loaded = loadScreenDocumentResult(createTextDocument(source, file) as never);
      const html = renderDesignDocumentHtml(
        loaded.result,
        "",
        loaded.focus ? { focus: loaded.focus, messages: loaded.messages } : { messages: loaded.messages }
      );
      documents.push({ file: relative(workspaceRoot, file), result: loaded.result, html });
    } catch (error) {
      findings.push({
        code: "preview-render-error",
        file: relative(workspaceRoot, file),
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return documents;
}

function auditDiagnostics(document: ExampleAuditDocument, findings: AuditFinding[]): void {
  for (const diagnostic of document.result.diagnostics) {
    findings.push({
      code: "example-diagnostic",
      file: document.file,
      id: document.result.screen.id,
      message: `${diagnostic.severity} line ${diagnostic.line}: ${diagnostic.message}`
    });
  }
}

function auditVisibleNotPlacedLayouts(document: ExampleAuditDocument, findings: AuditFinding[]): void {
  for (const section of stateSections(document.html)) {
    const unplacedLayoutIds = [...section.html.matchAll(/mm-unplaced-badge[\s\S]*?<span class="mm-detail-ref-id">(L-[^<]+)<\/span>/gu)]
      .map((match) => match[1])
      .filter((id): id is string => Boolean(id));
    for (const layoutId of unplacedLayoutIds) {
      if (section.html.includes(`data-mm-id="${layoutId}"`)) {
        findings.push({
          code: "not-placed-visible-layout",
          file: document.file,
          state: section.state,
          id: layoutId,
          message: `Layout ${layoutId} is marked not placed while it is present in the same state wireframe.`
        });
      }
    }
  }
}

function auditDialogActionPlacement(document: ExampleAuditDocument, findings: AuditFinding[]): void {
  const elementTypeById = new Map(document.result.elements.map((element) => [element.id, element.type]));
  const actionsByElementId = new Map(document.result.elements.map((element) => [element.id, String(element.properties["action"] ?? "")]));
  const dialogActions = new Map<string, string[]>();
  for (const dialog of document.result.elements.filter((element) => element.type === "Dialog")) {
    const actionIds = String(dialog.properties["actions"] ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((buttonId) => actionsByElementId.get(buttonId))
      .filter((actionId): actionId is string => Boolean(actionId));
    if (actionIds.length > 0) {
      dialogActions.set(dialog.id, actionIds);
    }
  }

  const stateViewports = buildViewportStateScreenReadModels(document.result, document.result);
  for (const model of stateViewports.flatMap((stateViewport) => stateViewport.models)) {
    const modelActionIds = new Set(stateScreenActionsForModel(document.result, model).map((action) => action.id));
    const displayedDialogIds = new Set(model.displayEffects
      .map((display) => display.element)
      .filter((elementId): elementId is string => typeof elementId === "string" && elementTypeById.get(elementId) === "Dialog"));
    for (const [dialogId, actionIds] of dialogActions) {
      if (displayedDialogIds.has(dialogId)) {
        continue;
      }
      for (const actionId of actionIds) {
        if (modelActionIds.has(actionId)) {
          findings.push({
            code: "dialog-action-outside-display",
            file: document.file,
            state: model.stateName,
            scenario: model.scenario ? model.title : undefined,
            id: actionId,
            message: `Dialog action ${actionId} is listed in a state view that does not display dialog ${dialogId}.`
          });
        }
      }
    }
  }
}

function auditElementTriggerActionVisibility(document: ExampleAuditDocument, findings: AuditFinding[]): void {
  const dialogActionIds = dialogElementActionIds(document);
  const stateViewports = buildViewportStateScreenReadModels(document.result, document.result);
  for (const model of stateViewports.flatMap((stateViewport) => stateViewport.models)) {
    for (const action of stateScreenActionsForModel(document.result, model)) {
      const triggerElementId = action.trigger?.elementId;
      if (!triggerElementId || model.renderedIds.elementIds.has(triggerElementId)) {
        continue;
      }
      const dialogId = dialogActionIds.get(action.id);
      findings.push({
        code: dialogId ? "dialog-action-outside-display" : "hidden-trigger-action",
        file: document.file,
        state: model.stateName,
        scenario: model.scenario ? model.title : undefined,
        id: action.id,
        message: dialogId
          ? `Dialog action ${action.id} is listed while trigger element ${triggerElementId} is absent from dialog ${dialogId}.`
          : `Action ${action.id} is listed while trigger element ${triggerElementId} is absent from the state wireframe.`
      });
    }
  }
}

function auditDisplayEffects(document: ExampleAuditDocument, findings: AuditFinding[]): void {
  const elementTypeById = new Map(document.result.elements.map((element) => [element.id, element.type]));
  const sections = stateSections(document.html);
  const stateViewports = buildViewportStateScreenReadModels(document.result, document.result);
  for (const model of stateViewports.flatMap((stateViewport) => stateViewport.models).filter((candidate) => candidate.scenario)) {
    const section = sections.find((candidate) =>
      candidate.title === model.stateViewTitle &&
      candidate.state === model.stateName &&
      candidate.viewport === model.viewport
    );
    for (const display of model.displayEffects) {
      const elementId = display.element;
      if (!elementId) {
        continue;
      }
      const expectedNeedle = elementTypeById.get(elementId) === "Dialog"
        ? `data-mm-display-modal="${elementId}"`
        : `data-mm-id="${elementId}"`;
      if (!section || !section.html.includes(expectedNeedle)) {
        findings.push({
          code: "display-effect-missing-wireframe",
          file: document.file,
          state: model.stateName,
          scenario: model.title,
          id: elementId,
          message: `Preview Scenario ${model.title} displays ${elementId}, but the rendered preview HTML does not contain ${expectedNeedle}.`
        });
      }
    }
  }
}

function dialogElementActionIds(document: ExampleAuditDocument): Map<string, string> {
  const actionsByElementId = new Map(document.result.elements.map((element) => [element.id, String(element.properties["action"] ?? "")]));
  const dialogActionIds = new Map<string, string>();
  for (const dialog of document.result.elements.filter((element) => element.type === "Dialog")) {
    String(dialog.properties["actions"] ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((buttonId) => {
        const actionId = actionsByElementId.get(buttonId);
        if (actionId) {
          dialogActionIds.set(actionId, dialog.id);
        }
      });
  }
  return dialogActionIds;
}

function auditJapaneseGeneratedActionText(findings: AuditFinding[]): void {
  const fixtures = [
    "03-actions/parallel-initial-load.vspec.md",
    "04-real-world-screens/login-basic.vspec.md"
  ];
  for (const fixture of fixtures) {
    const file = resolve(examplesRoot, fixture);
    const source = readFileSync(file, "utf8").replace("locale: en", "locale: ja");
    const loaded = loadScreenDocumentResult(createTextDocument(source, file) as never);
    const html = renderDesignDocumentHtml(
      loaded.result,
      "",
      loaded.focus ? { focus: loaded.focus, messages: loaded.messages } : { messages: loaded.messages }
    );
    for (const term of ["effect set state", "stop process", "continue process", "navigate to", "Parallel group:"]) {
      if (html.includes(term)) {
        findings.push({
          code: "ja-ui-english-leftover",
          file: relative(workspaceRoot, file),
          id: term,
          message: `Japanese preview Action Details still contains generated English text: ${term}.`
        });
      }
    }
  }
}

function stateSections(html: string): Array<{ title: string; state: string; viewport?: string; html: string }> {
  const matches = [...html.matchAll(/<section class="doc-section state-screen-section"([^>]*)>/gu)];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const nextSection = matches[index + 1]?.index ?? html.length;
    const nextDocSection = html.indexOf(`<section class="doc-section">`, start + match[0].length);
    const next = nextDocSection === -1 ? nextSection : Math.min(nextSection, nextDocSection);
    const attrs = match[1] ?? "";
    return {
      title: attrValue(attrs, "data-state-view-title") ?? "unknown",
      state: attrValue(attrs, "data-state") ?? "unknown",
      viewport: attrValue(attrs, "data-viewport"),
      html: html.slice(start, next)
    };
  });
}

function attrValue(attrs: string, name: string): string | undefined {
  const pattern = new RegExp(`${name}="([^"]*)"`, "u");
  return pattern.exec(attrs)?.[1];
}

function createTextDocument(source: string, filePath: string) {
  const lines = source.split(/\r?\n/u);
  return {
    getText: () => source,
    lineAt: (line: number) => ({ text: lines[line] ?? "" }),
    lineCount: lines.length,
    uri: { scheme: "file", fsPath: filePath },
    languageId: "markvspec",
    fileName: filePath
  };
}

function findExampleFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        return findExampleFiles(path);
      }
      return entry.isFile() && entry.name.endsWith(".vspec.md") ? [path] : [];
    })
    .sort();
}

function findWorkspaceRoot(startDirectory: string): string {
  let directory = startDirectory;
  while (true) {
    if (existsSync(resolve(directory, "examples")) && existsSync(resolve(directory, "package.json"))) {
      return directory;
    }
    const parent = dirname(directory);
    if (parent === directory) {
      return startDirectory;
    }
    directory = parent;
  }
}

function formatFindings(title: string, findings: AuditFinding[]): string {
  return [
    title,
    ...findings.map((finding) => [
      `- ${finding.code}${knownIssueTickets[finding.code] ? ` (${knownIssueTickets[finding.code]})` : ""}`,
      `file=${finding.file}`,
      finding.state ? `state=${finding.state}` : "",
      finding.scenario ? `scenario=${finding.scenario}` : "",
      finding.id ? `id=${finding.id}` : "",
      finding.message
    ].filter(Boolean).join(" | "))
  ].join("\n");
}

function dedupeFindings(findings: AuditFinding[]): AuditFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = JSON.stringify([finding.code, finding.file, finding.state, finding.scenario, finding.id, finding.message]);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
