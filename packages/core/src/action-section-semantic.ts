import type {
  MarkVSpecAction,
  MarkVSpecDiagnostic,
  MarkVSpecProcessStep,
  MarkVSpecSectionProse,
  SourceLocation
} from "./types.js";
import { applyActionBulletToContext, createActionParseContext, createProcessStep, type ActionBulletInput } from "./action-parser.js";
import { actionIdPattern } from "./ids.js";
import type { MarkdownDocument } from "./markdown-document.js";
import {
  collectSectionAst,
  type BlockAst,
  type SectionAst
} from "./markdown-section-ast.js";
import { buildMarkVSpecProcessStepReadModel } from "./action-process-read-model.js";
import type { SemanticDependency } from "./markdown-section-semantic.js";
import { createUnsupportedStructuredItemDiagnostic } from "./source-text-diagnostics.js";

interface ListItemView {
  text: string;
  depth: number;
  range?: { start: { line: number } };
}

interface ParsedBullet {
  text: string;
  indent: number;
  location: SourceLocation;
}

export interface ActionSectionSemanticResult {
  sectionId: string;
  actions: MarkVSpecAction[];
  sectionProse: MarkVSpecSectionProse[];
  diagnostics: MarkVSpecDiagnostic[];
  dependencies: SemanticDependency[];
  renderKeys: string[];
}

export interface ActionSemanticResult {
  actions: MarkVSpecAction[];
  sectionProse: MarkVSpecSectionProse[];
  diagnostics: MarkVSpecDiagnostic[];
  sectionResults: ActionSectionSemanticResult[];
}

export interface ActionSectionSemanticSupport {
  isSectionNotesHeading(block: BlockAst): boolean;
  isEntityNoteBlock(block: BlockAst): boolean;
  appendEntityProseLines(entity: { overview?: string[]; notes?: string[] }, block: BlockAst, hasStructuredContent: boolean): void;
  appendListProseBeforeLine(entity: { overview?: string[]; notes?: string[] }, block: BlockAst, line: number, hasStructuredContent: boolean): void;
  listItems(blocks: BlockAst[], depth?: number): ListItemView[];
  parsedBulletFromListItem(item: ListItemView): ParsedBullet;
  locationFromBlock(block: Pick<BlockAst, "range"> | ListItemView): SourceLocation;
  looksLikeStructuredProperty(text: string): boolean;
  proseForSection(section: SectionAst, overviewBlocks: BlockAst[], noteBlocks: BlockAst[], renderKeys: string[]): MarkVSpecSectionProse[];
  structuredSectionOwnershipDiagnostics(section: SectionAst, options?: { emitMalformedHeading?: boolean }): MarkVSpecDiagnostic[];
  dedupeDependencies(dependencies: SemanticDependency[]): SemanticDependency[];
}

export function parseActionSectionSemantics(
  document: MarkdownDocument,
  support: ActionSectionSemanticSupport
): ActionSemanticResult {
  const sections = collectSectionAst(document);
  const sectionResults = sections
    .filter((section) => section.kind === "Actions")
    .map((section) => parseActionsSection(section, support));

  return {
    actions: sectionResults.flatMap((result) => result.actions),
    sectionProse: sectionResults.flatMap((result) => result.sectionProse),
    diagnostics: sectionResults.flatMap((result) => result.diagnostics),
    sectionResults
  };
}

function parseActionsSection(section: SectionAst, support: ActionSectionSemanticSupport): ActionSectionSemanticResult {
  const actions: MarkVSpecAction[] = [];
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const dependencies: SemanticDependency[] = [{
    source: { type: "section", id: section.id },
    target: { type: "render", id: "actions:list" },
    direction: "source-invalidates-target",
    kind: "renders"
  }];
  const actionHeadingRegex = new RegExp(String.raw`^(?:(\S+?):)?(${actionIdPattern})\s+(.+?)\s*$`, "u");
  let currentAction: MarkVSpecAction | undefined;
  let currentActionContext = createActionParseContext();
  let currentActionHasStructuredContent = false;
  let currentProcessStep: MarkVSpecProcessStep | undefined;
  let currentProcessHasStructuredContent = false;
  let hasSeenFromSubsection = false;
  let hasSeenEntity = false;
  let inSectionNotes = false;
  const sectionOverviewBlocks: BlockAst[] = [];
  const sectionNoteBlocks: BlockAst[] = [];

  for (const block of section.blocks) {
    if (support.isSectionNotesHeading(block)) {
      currentAction = undefined;
      currentActionContext = createActionParseContext();
      currentActionHasStructuredContent = false;
      currentProcessStep = undefined;
      currentProcessHasStructuredContent = false;
      hasSeenFromSubsection = false;
      inSectionNotes = true;
      hasSeenEntity = true;
      continue;
    }
    if (inSectionNotes) {
      if (support.isEntityNoteBlock(block)) {
        sectionNoteBlocks.push(block);
      }
      continue;
    }
    if (currentAction && block.type === "heading" && block.depth === 4) {
      const processSection = parseActionProcessSectionHeading(block.text);
      if (normalizeActionSubsectionHeading(block.text) === "from") {
        if (hasSeenFromSubsection) {
          diagnostics.push({
            severity: "warning",
            message: `Action ${currentAction.id} has duplicate From subsection. Keep a single #### From subsection.`,
            line: support.locationFromBlock(block).line
          });
        }
        hasSeenFromSubsection = true;
        currentActionContext = { block: "from" };
        currentActionHasStructuredContent = true;
        currentProcessStep = undefined;
        currentProcessHasStructuredContent = false;
        continue;
      }
      if (normalizeActionSubsectionHeading(block.text) === "otherwise") {
        currentActionContext = { block: "otherwise", outcome: "otherwise" };
        currentActionHasStructuredContent = true;
        currentProcessStep = undefined;
        currentProcessHasStructuredContent = false;
        continue;
      }
      if (processSection) {
        currentProcessStep = createProcessStep(`${processSection.marker}: ${processSection.name}`, -1, support.locationFromBlock(block));
        currentAction.processSteps.push(currentProcessStep);
        currentActionContext = { block: "process", processStep: currentProcessStep };
        currentActionHasStructuredContent = true;
        currentProcessHasStructuredContent = false;
        continue;
      }
      if (looksLikeUnsupportedActionProcessSectionHeading(block.text)) {
        diagnostics.push({
          severity: "warning",
          message: `Unsupported Action process heading in Action ${currentAction.id}: ${block.text}. Use #### P1: Process <name>.`,
          line: support.locationFromBlock(block).line
        });
      }
      currentProcessStep = undefined;
      currentProcessHasStructuredContent = false;
      currentActionContext = createActionParseContext();
    }
    if (currentAction && block.type === "heading" && block.depth > 3) {
      if (currentProcessStep) {
        support.appendEntityProseLines(currentProcessStep, block, currentProcessHasStructuredContent);
        if (currentProcessHasStructuredContent) {
          currentActionContext = createActionParseContext();
        }
      } else {
        support.appendEntityProseLines(currentAction, block, currentActionHasStructuredContent);
        currentActionContext = createActionParseContext();
      }
      continue;
    }
    if (block.type === "heading" && block.depth === 3) {
      hasSeenEntity = true;
      const heading = actionHeadingRegex.exec(block.text);
      if (!heading) {
        diagnostics.push({
          severity: "warning",
          message: "Malformed Action heading. Expected ### [<marker>:]A-* <name>.",
          line: support.locationFromBlock(block).line
        });
        currentAction = undefined;
        currentActionContext = createActionParseContext();
        currentActionHasStructuredContent = false;
        continue;
      }

      const headingLocation = support.locationFromBlock(block);
      currentActionContext = createActionParseContext();
      currentActionHasStructuredContent = false;
      currentProcessStep = undefined;
      currentProcessHasStructuredContent = false;
      hasSeenFromSubsection = false;
      currentAction = {
        id: heading[2],
        name: heading[3],
        fromStates: [],
        transitions: [],
        sideEffects: [],
        outcomes: [],
        processSteps: [],
        routeParams: [],
        responses: [],
        properties: heading[1] ? { marker: heading[1] } : {},
        propertyLocations: heading[1] ? { marker: [headingLocation] } : {},
        notes: [],
        location: headingLocation
      };
      actions.push(currentAction);
      dependencies.push(...actionRenderDependencies(section, currentAction));
      continue;
    }

    if (currentAction && block.type === "list") {
      if (currentProcessStep && currentActionContext.block === "process") {
        currentProcessHasStructuredContent = true;
        for (const item of support.listItems([block])) {
          const bullet = support.parsedBulletFromListItem(item);
          currentActionContext = applyActionBulletToContext(currentAction, sectionNestedBullet(bullet), currentActionContext, diagnostics);
        }
        continue;
      }
      if (currentProcessStep) {
        support.appendEntityProseLines(currentProcessStep, block, currentProcessHasStructuredContent);
        continue;
      }
      if (currentActionContext.block === "from" || currentActionContext.block === "otherwise") {
        currentActionHasStructuredContent = true;
        for (const item of support.listItems([block])) {
          const bullet = support.parsedBulletFromListItem(item);
          currentActionContext = applyActionBulletToContext(currentAction, sectionNestedBullet(bullet), currentActionContext, diagnostics);
        }
        continue;
      }
      let emittedUnsupportedStructuredItem = false;
      for (const item of support.listItems([block])) {
        if (item.depth !== 0 || !isActionStructuredListItemText(item.text, support)) {
          continue;
        }
        const bullet = support.parsedBulletFromListItem(item);
        emittedUnsupportedStructuredItem = true;
        diagnostics.push(actionListSyntaxMigrationDiagnostic(currentAction.id, bullet));
      }
      if (emittedUnsupportedStructuredItem) {
        continue;
      }
      support.appendEntityProseLines(currentAction, block, currentActionHasStructuredContent);
      continue;
    }

    if (!currentAction || block.type !== "list") {
      if (currentProcessStep && support.isEntityNoteBlock(block)) {
        support.appendEntityProseLines(currentProcessStep, block, currentProcessHasStructuredContent);
        if (currentProcessHasStructuredContent) {
          currentActionContext = createActionParseContext();
        }
      } else if (currentAction && support.isEntityNoteBlock(block)) {
        support.appendEntityProseLines(currentAction, block, currentActionHasStructuredContent);
        currentActionContext = createActionParseContext();
      } else if (!currentAction && !hasSeenEntity && support.isEntityNoteBlock(block)) {
        sectionOverviewBlocks.push(block);
      }
      continue;
    }
  }

  for (const action of actions) {
    dependencies.push(...actionSemanticDependencies(action));
  }

  const renderKeys = ["actions:list", ...actions.map((action) => actionRenderKey(action.id))];

  return {
    sectionId: section.id,
    actions,
    sectionProse: support.proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, renderKeys),
    diagnostics: [...diagnostics, ...support.structuredSectionOwnershipDiagnostics(section, { emitMalformedHeading: false })],
    dependencies: support.dedupeDependencies(dependencies),
    renderKeys
  };
}

function parseActionProcessSectionHeading(text: string): { marker: string; name: string } | undefined {
  const match = /^(P(?:0|[1-9][0-9]*|[A-Za-z_][A-Za-z0-9_-]*)):\s+Process\s+(.+?)\s*$/u.exec(text.trim());
  if (!match) {
    return undefined;
  }
  return {
    marker: match[1],
    name: match[2].trim()
  };
}

function looksLikeUnsupportedActionProcessSectionHeading(text: string): boolean {
  return /^P\S*/u.test(text.trim()) && (/process/iu.test(text) || /^P\S*:\s+\S+/u.test(text.trim()));
}

function actionListSyntaxMigrationDiagnostic(actionId: string, bullet: ActionBulletInput): MarkVSpecDiagnostic {
  const process = /^Process\s+(\S+):\s*(.+)$/u.exec(bullet.text.trim());
  if (process) {
    return {
      severity: "warning",
      message: `Action ${actionId} uses legacy list-based Process syntax: ${bullet.text}. Use #### ${process[1]}: Process ${process[2]}.`,
      line: bullet.location.line
    };
  }

  if (normalizeActionSubsectionHeading(bullet.text) === "from") {
    return {
      severity: "warning",
      message: `Action ${actionId} uses legacy list-based From syntax. Use #### From followed by state list items.`,
      line: bullet.location.line
    };
  }

  return createUnsupportedStructuredItemDiagnostic({
    context: `Action ${actionId}`,
    text: bullet.text,
    location: bullet.location,
    allowed: "From, Process P1: <name>, or Otherwise"
  });
}

function normalizeActionSubsectionHeading(text: string): string {
  return text.trim().replace(/:$/, "").trim().toLowerCase();
}

function sectionNestedBullet(bullet: ActionBulletInput): ActionBulletInput {
  return {
    ...bullet,
    indent: bullet.indent + 1
  };
}

function actionRenderDependencies(section: SectionAst, action: MarkVSpecAction): SemanticDependency[] {
  return [{
    source: { type: "section", id: section.id },
    target: { type: "render", id: actionRenderKey(action.id) },
    direction: "source-invalidates-target",
    kind: "renders"
  }];
}

function actionRenderKey(actionId: string): string {
  return `action:${actionId}`;
}

function actionSemanticDependencies(action: MarkVSpecAction): SemanticDependency[] {
  const dependencies: SemanticDependency[] = [];
  if (action.trigger?.elementId) {
    dependencies.push(referenceDependency(action.id, action.trigger.elementId));
  }
  if (action.triggeredBy?.startsWith("A-")) {
    dependencies.push(referenceDependency(action.id, action.triggeredBy.split(".")[0] ?? action.triggeredBy));
  }
  for (const state of action.fromStates) {
    dependencies.push(referenceDependency(action.id, `state:${state}`));
  }
  for (const transition of action.transitions) {
    dependencies.push({
      source: { type: "entity", id: action.id },
      target: { type: "entity", id: `state:${transition.to}` },
      direction: "source-invalidates-target",
      kind: "derives"
    });
    dependencies.push(referenceDependency(action.id, `state:${transition.from}`));
  }
  for (const target of actionUpdateTargets(action)) {
    dependencies.push(referenceDependency(action.id, target));
  }
  for (const param of action.routeParams) {
    dependencies.push(referenceDependency(action.id, param.source));
  }
  for (const step of action.processSteps) {
    const processReadModel = buildMarkVSpecProcessStepReadModel(step);
    for (const detail of processReadModel.execution.params) {
      dependencies.push(referenceDependency(action.id, detail.value));
    }
    for (const outcome of step.outcomes) {
      for (const param of outcome.routeParams) {
        dependencies.push(referenceDependency(action.id, param.source));
      }
      if (outcome.target) {
        dependencies.push(referenceDependency(action.id, outcome.target));
      }
      if (outcome.content) {
        dependencies.push(referenceDependency(action.id, outcome.content));
      }
    }
  }
  for (const outcome of action.outcomes) {
    for (const param of outcome.routeParams) {
      dependencies.push(referenceDependency(action.id, param.source));
    }
  }
  return dependencies;
}

function actionUpdateTargets(action: MarkVSpecAction): string[] {
  return [
    action.target,
    ...action.processSteps.flatMap((step) => [step.target, step.content]),
    ...action.processSteps.flatMap((step) => step.outcomes.flatMap((outcome) => [outcome.target, outcome.content])),
    ...action.outcomes.flatMap((outcome) => [outcome.target, outcome.content])
  ].filter((value): value is string => Boolean(value));
}

function referenceDependency(sourceId: string, targetId: string): SemanticDependency {
  return {
    source: { type: "entity", id: sourceId },
    target: { type: "entity", id: targetId },
    direction: "source-invalidates-target",
    kind: "references"
  };
}

function firstActionStructuredListItemLine(block: BlockAst, support: ActionSectionSemanticSupport): number | undefined {
  const item = support.listItems([block]).find((candidate) =>
    candidate.depth === 0 && isActionStructuredListItemText(candidate.text, support)
  );
  return item?.range?.start.line;
}

function isActionMalformedStructuredListBlock(block: BlockAst, support: ActionSectionSemanticSupport): boolean {
  return support.listItems([block]).some((item) => item.depth === 0 && isActionStructuredListItemText(item.text, support));
}

function isActionStructuredListItemText(text: string, support: ActionSectionSemanticSupport): boolean {
  const trimmed = text.trim();
  return /^(?:From|Process(?:\s+[A-Za-z][A-Za-z0-9_-]*)?\s*:.*|Process(?:\s*:.*)?|Otherwise)\s*$/iu.test(trimmed)
    || support.looksLikeStructuredProperty(trimmed)
    || /^[A-Z][A-Za-z0-9_-]*$/u.test(trimmed);
}

function isActionProseListPrefix(block: BlockAst, line: number, support: ActionSectionSemanticSupport): boolean {
  return support.listItems([block])
    .filter((item) => item.depth === 0 && (item.range?.start.line ?? 1) < line)
    .every((item) => !support.looksLikeStructuredProperty(item.text));
}
