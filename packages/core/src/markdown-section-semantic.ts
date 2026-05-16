import type {
  MarkVSpecAction,
  MarkVSpecDiagnostic,
  MarkVSpecElement,
  MarkVSpecErrorCode,
  MarkVSpecFormGroup,
  MarkVSpecHistoryEntry,
  MarkVSpecHistoryFieldSchema,
  MarkVSpecHistoryFieldType,
  MarkVSpecLayoutGroup,
  MarkVSpecLayoutItem,
  MarkVSpecModelSampleRow,
  MarkVSpecModelSampleSet,
  MarkVSpecModelSampleGroup,
  MarkVSpecNoteSection,
  MarkVSpecPreviewScenario,
  MarkVSpecRule,
  MarkVSpecSectionProse,
  MarkVSpecSlotContent,
  MarkVSpecSlotDefinition,
  MarkVSpecState,
  MarkVSpecValidationRule,
  MarkVSpecViewContextDefinition,
  MarkVSpecViewContextSample,
  SourceLocation
} from "./types.js";
import { applyActionBulletToContext, createActionParseContext } from "./action-parser.js";
import { actionIdPattern, elementIdPattern, formGroupIdPattern, isLayoutItemId, layoutGroupIdPattern } from "./ids.js";
import type { MarkdownDocument } from "./markdown-document.js";
import {
  collectSectionAst,
  sectionBodyLines,
  type BlockAst,
  type SectionAst,
  type SectionKind
} from "./markdown-section-ast.js";
import { isCollectionModelSamplePath } from "./model-paths.js";

export interface SemanticDependency {
  source: { type: "entity" | "section" | "render"; id: string };
  target: { type: "entity" | "section" | "render"; id: string };
  direction: "source-invalidates-target";
  kind: "references" | "renders" | "validates" | "derives";
}

export interface SectionSemanticResult {
  sectionId: string;
  kind: SectionKind;
  states: MarkVSpecState[];
  modelSamples: MarkVSpecModelSampleSet[];
  modelSampleGroups: MarkVSpecModelSampleGroup[];
  viewContexts: MarkVSpecViewContextDefinition[];
  viewContextSamples: MarkVSpecViewContextSample[];
  previewScenarios: MarkVSpecPreviewScenario[];
  formGroups: MarkVSpecFormGroup[];
  validations: MarkVSpecValidationRule[];
  rules: MarkVSpecRule[];
  errorCodes: MarkVSpecErrorCode[];
  historyFields: MarkVSpecHistoryFieldSchema[];
  historyEntries: MarkVSpecHistoryEntry[];
  notes: MarkVSpecNoteSection[];
  sectionProse: MarkVSpecSectionProse[];
  diagnostics: MarkVSpecDiagnostic[];
  dependencies: SemanticDependency[];
  renderKeys: string[];
}

export interface SmallSectionSemanticResult {
  states: MarkVSpecState[];
  modelSamples: MarkVSpecModelSampleSet[];
  modelSampleGroups: MarkVSpecModelSampleGroup[];
  viewContexts: MarkVSpecViewContextDefinition[];
  viewContextSamples: MarkVSpecViewContextSample[];
  previewScenarios: MarkVSpecPreviewScenario[];
  formGroups: MarkVSpecFormGroup[];
  validations: MarkVSpecValidationRule[];
  rules: MarkVSpecRule[];
  errorCodes: MarkVSpecErrorCode[];
  historyFields: MarkVSpecHistoryFieldSchema[];
  historyEntries: MarkVSpecHistoryEntry[];
  notes: MarkVSpecNoteSection[];
  sectionProse: MarkVSpecSectionProse[];
  diagnostics: MarkVSpecDiagnostic[];
  sectionResults: SectionSemanticResult[];
}

export interface LayoutSectionSemanticResult {
  sectionId: string;
  kind: "Layout" | "Slot" | "Slots";
  layoutGroups: MarkVSpecLayoutGroup[];
  slotContents: MarkVSpecSlotContent[];
  slotDefinitions: MarkVSpecSlotDefinition[];
  sectionProse: MarkVSpecSectionProse[];
  diagnostics: MarkVSpecDiagnostic[];
  dependencies: SemanticDependency[];
  renderKeys: string[];
}

export interface LayoutSemanticResult {
  layoutGroups: MarkVSpecLayoutGroup[];
  slotContents: MarkVSpecSlotContent[];
  slotDefinitions: MarkVSpecSlotDefinition[];
  sectionProse: MarkVSpecSectionProse[];
  diagnostics: MarkVSpecDiagnostic[];
  sectionResults: LayoutSectionSemanticResult[];
}

export interface ElementSectionSemanticResult {
  sectionId: string;
  elements: MarkVSpecElement[];
  sectionProse: MarkVSpecSectionProse[];
  diagnostics: MarkVSpecDiagnostic[];
  dependencies: SemanticDependency[];
  renderKeys: string[];
}

export interface ElementSemanticResult {
  elements: MarkVSpecElement[];
  sectionProse: MarkVSpecSectionProse[];
  diagnostics: MarkVSpecDiagnostic[];
  sectionResults: ElementSectionSemanticResult[];
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

const optionElementTypes = new Set(["Select", "MultiSelect", "RadioGroup", "CheckboxGroup"]);

export function parseSmallSectionSemantics(document: MarkdownDocument): SmallSectionSemanticResult {
  const sections = collectSectionAst(document);
  const orderDiagnostics = semanticSectionOrderDiagnostics(sections);
  const sectionResults = sections
    .filter((section) => isSmallSemanticSection(section.kind))
    .map((section) => parseSmallSection(document, sections, section));

  return {
    states: sectionResults.flatMap((result) => result.states),
    modelSamples: sectionResults.flatMap((result) => result.modelSamples),
    modelSampleGroups: sectionResults.flatMap((result) => result.modelSampleGroups),
    viewContexts: sectionResults.flatMap((result) => result.viewContexts),
    viewContextSamples: sectionResults.flatMap((result) => result.viewContextSamples),
    previewScenarios: sectionResults.flatMap((result) => result.previewScenarios),
    formGroups: sectionResults.flatMap((result) => result.formGroups),
    validations: sectionResults.flatMap((result) => result.validations),
    rules: sectionResults.flatMap((result) => result.rules),
    errorCodes: sectionResults.flatMap((result) => result.errorCodes),
    historyFields: sectionResults.flatMap((result) => result.historyFields),
    historyEntries: sectionResults.flatMap((result) => result.historyEntries),
    sectionProse: sectionResults.flatMap((result) => result.sectionProse),
    notes: sectionResults.flatMap((result) => result.notes),
    diagnostics: [...orderDiagnostics, ...sectionResults.flatMap((result) => result.diagnostics)],
    sectionResults
  };
}

const recommendedSectionOrder = "States, Layout:<viewport>/Slot:<name>, Slots, Elements, Form Groups, Actions, Model Samples, View Context, View Context Samples, Preview Scenarios, Validations, Business Rules, Error Codes, History Fields, History";

function semanticSectionOrderDiagnostics(sections: SectionAst[]): MarkVSpecDiagnostic[] {
  const diagnostics: MarkVSpecDiagnostic[] = [];
  let highestSectionRank = 0;

  for (const section of sections) {
    const rank = sectionOrderRank(section.kind);
    if (rank === 0) {
      continue;
    }
    if (rank < highestSectionRank) {
      diagnostics.push({
        severity: "warning",
        message: `Section ## ${section.title} appears after a later section. Recommended order is ${recommendedSectionOrder}.`,
        line: section.heading.range.start.line
      });
      continue;
    }
    highestSectionRank = rank;
  }

  return diagnostics;
}

function sectionOrderRank(kind: SectionKind): number {
  switch (kind) {
    case "States":
      return 1;
    case "Layout":
    case "Slot":
      return 2;
    case "Slots":
      return 3;
    case "Elements":
      return 4;
    case "FormGroups":
      return 5;
    case "Actions":
      return 6;
    case "ModelSamples":
      return 7;
    case "ViewContext":
      return 8;
    case "ViewContextSamples":
      return 9;
    case "PreviewScenarios":
      return 10;
    case "Validations":
      return 11;
    case "BusinessRules":
      return 12;
    case "ErrorCodes":
      return 13;
    case "HistoryFields":
      return 14;
    case "History":
      return 15;
    case "Unknown":
      return 0;
  }
}

export function parseLayoutSectionSemantics(document: MarkdownDocument): LayoutSemanticResult {
  const sections = collectSectionAst(document);
  const sectionResults = sections
    .filter((section) => section.kind === "Layout" || section.kind === "Slot" || section.kind === "Slots")
    .map((section) => parseLayoutSemanticSection(document, sections, section));

  return {
    layoutGroups: sectionResults.flatMap((result) => result.layoutGroups),
    slotContents: sectionResults.flatMap((result) => result.slotContents),
    slotDefinitions: sectionResults.flatMap((result) => result.slotDefinitions),
    sectionProse: sectionResults.flatMap((result) => result.sectionProse),
    diagnostics: sectionResults.flatMap((result) => result.diagnostics),
    sectionResults
  };
}

export function parseElementSectionSemantics(document: MarkdownDocument): ElementSemanticResult {
  const sections = collectSectionAst(document);
  const sectionResults = sections
    .filter((section) => section.kind === "Elements")
    .map((section) => parseElementsSection(section));

  return {
    elements: sectionResults.flatMap((result) => result.elements),
    sectionProse: sectionResults.flatMap((result) => result.sectionProse),
    diagnostics: sectionResults.flatMap((result) => result.diagnostics),
    sectionResults
  };
}

export function parseActionSectionSemantics(document: MarkdownDocument): ActionSemanticResult {
  const sections = collectSectionAst(document);
  const sectionResults = sections
    .filter((section) => section.kind === "Actions")
    .map((section) => parseActionsSection(section));

  return {
    actions: sectionResults.flatMap((result) => result.actions),
    sectionProse: sectionResults.flatMap((result) => result.sectionProse),
    diagnostics: sectionResults.flatMap((result) => result.diagnostics),
    sectionResults
  };
}

function isSmallSemanticSection(kind: SectionKind): boolean {
  return kind === "States" ||
    kind === "FormGroups" ||
    kind === "ModelSamples" ||
    kind === "ViewContext" ||
    kind === "ViewContextSamples" ||
    kind === "PreviewScenarios" ||
    kind === "Validations" ||
    kind === "BusinessRules" ||
    kind === "ErrorCodes" ||
    kind === "HistoryFields" ||
    kind === "History" ||
    kind === "Unknown";
}

function parseSmallSection(document: MarkdownDocument, sections: SectionAst[], section: SectionAst): SectionSemanticResult {
  switch (section.kind) {
    case "States":
      return resultFor(section, parseStatesSection(section), ["states:list"]);
    case "FormGroups":
      return resultFor(section, parseFormGroupsSection(section), ["form-groups:list"]);
    case "ModelSamples":
      return resultFor(section, parseModelSamplesSection(section), ["model-samples"]);
    case "ViewContext":
      return resultFor(section, parseViewContextSection(section), ["view-context"]);
    case "ViewContextSamples":
      return resultFor(section, parseViewContextSamplesSection(section), ["view-context-samples"]);
    case "PreviewScenarios":
      return resultFor(section, parsePreviewScenariosSection(section), ["preview-scenarios"]);
    case "Validations":
      return resultFor(section, parseValidationsSection(section), ["validations:list"]);
    case "BusinessRules":
      return resultFor(section, parseRulesSection(section), ["rules:list"]);
    case "ErrorCodes":
      return resultFor(section, parseErrorCodesSection(section), ["error-codes:list"]);
    case "HistoryFields":
      return resultFor(section, parseHistoryFieldsSection(document, sections, section), ["history-fields:list"]);
    case "History":
      return resultFor(section, parseHistorySection(document, sections, section), ["history:list"]);
    case "Unknown":
      return resultFor(section, { notes: [parseNoteSection(document, sections, section)] }, [`notes:${section.id}`]);
    default:
      return resultFor(section, {}, []);
  }
}

function parseLayoutSemanticSection(document: MarkdownDocument, sections: SectionAst[], section: SectionAst): LayoutSectionSemanticResult {
  switch (section.kind) {
    case "Layout":
      return parseLayoutOrSlotSection(section);
    case "Slot":
      return parseLayoutOrSlotSection(section);
    case "Slots":
      return parseSlotsSection(section);
    default:
      return {
        sectionId: section.id,
        kind: "Layout",
        layoutGroups: [],
        slotContents: [],
        slotDefinitions: [],
        sectionProse: [],
        diagnostics: [],
        dependencies: [],
        renderKeys: []
      };
  }
}

function parseLayoutOrSlotSection(section: SectionAst): LayoutSectionSemanticResult {
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const dependencies: SemanticDependency[] = [];
  const layoutGroups: MarkVSpecLayoutGroup[] = [];
  const slotContents: MarkVSpecSlotContent[] = [];
  const isSlotSection = section.kind === "Slot";
  const viewport = section.viewport;
  const slotName = section.slotName;
  const slotContent: MarkVSpecSlotContent | undefined = isSlotSection && slotName
    ? {
        name: slotName,
        ...(viewport ? { viewport } : {}),
        layoutGroups: [],
        location: { line: section.heading.range.start.line }
      }
    : undefined;

  if (section.kind === "Layout" && !viewport) {
    diagnostics.push({
      severity: "warning",
      message: "Layout section must specify a viewport, for example ## Layout: mobile.",
      line: section.heading.range.start.line
    });
  }
  if (isSlotSection && !slotName) {
    diagnostics.push({
      severity: "warning",
      message: "Slot section must specify a slot name, for example ## Slot: content.",
      line: section.heading.range.start.line
    });
  }
  if (slotContent) {
    slotContents.push(slotContent);
  }

  let currentLayout: MarkVSpecLayoutGroup | undefined;
  let layoutSubsection: string | undefined;
  let currentLayoutNestedProperty: string | undefined;
  let currentLayoutHasStructuredContent = false;
  let hasSeenEntity = false;
  let inSectionNotes = false;
  const sectionOverviewBlocks: BlockAst[] = [];
  const sectionNoteBlocks: BlockAst[] = [];
  const layoutHeadingRegex = new RegExp(String.raw`^(?:(\S+?):)?(${layoutGroupIdPattern})(?:\s+(.+?))?\s*$`, "u");

  for (const block of section.blocks) {
    if (isSectionNotesHeading(block)) {
      currentLayout = undefined;
      layoutSubsection = undefined;
      currentLayoutNestedProperty = undefined;
      currentLayoutHasStructuredContent = false;
      inSectionNotes = true;
      hasSeenEntity = true;
      continue;
    }
    if (inSectionNotes) {
      if (isEntityNoteBlock(block)) {
        sectionNoteBlocks.push(block);
      }
      continue;
    }
    if (block.type === "heading" && block.depth === 3) {
      hasSeenEntity = true;
      const heading = layoutHeadingRegex.exec(block.text);
      if (!heading) {
        diagnostics.push({
          severity: "warning",
          message: "Malformed Layout heading. Expected ### [<marker>:]L-* [name] or ### P-* [name].",
          line: locationFromBlock(block).line
        });
        currentLayout = undefined;
        layoutSubsection = undefined;
        currentLayoutNestedProperty = undefined;
        continue;
      }

      const headingLocation = locationFromBlock(block);
      if (section.kind === "Layout" && !viewport) {
        diagnostics.push({
          severity: "warning",
          message: "Layout group is ignored because its Layout section has no viewport.",
          line: headingLocation.line
        });
        currentLayout = undefined;
        layoutSubsection = undefined;
        currentLayoutNestedProperty = undefined;
        continue;
      }

      if (isSlotSection && !slotContent) {
        diagnostics.push({
          severity: "warning",
          message: "Slot layout group is ignored because its Slot section has no name.",
          line: headingLocation.line
        });
        currentLayout = undefined;
        layoutSubsection = undefined;
        currentLayoutNestedProperty = undefined;
        continue;
      }

      layoutSubsection = undefined;
      currentLayoutNestedProperty = undefined;
      currentLayout = {
        id: heading[2],
        name: heading[3]?.trim() ?? "",
        viewport: viewport ?? "",
        notes: [],
        items: [],
        properties: heading[1] ? { marker: heading[1] } : {},
        propertyLocations: heading[1] ? { marker: [headingLocation] } : {},
        location: headingLocation
      };
      if (slotContent) {
        slotContent.layoutGroups.push(currentLayout);
      } else {
        layoutGroups.push(currentLayout);
      }
      dependencies.push(...layoutRenderDependencies(section, currentLayout, slotContent?.name));
      currentLayoutHasStructuredContent = false;
      continue;
    }

    if (!currentLayout) {
      if (!hasSeenEntity && isEntityNoteBlock(block)) {
        sectionOverviewBlocks.push(block);
      }
      continue;
    }

    if (isEntityNoteBlock(block)) {
      appendEntityProseLines(currentLayout, block, currentLayoutHasStructuredContent);
      continue;
    }

    if (block.type === "heading" && block.depth === 4) {
      currentLayoutHasStructuredContent = true;
      layoutSubsection = block.text;
      currentLayoutNestedProperty = undefined;
      if (layoutSubsection === "Repeat") {
        diagnostics.push({
          severity: "error",
          message: `Layout ${currentLayout.id} uses removed Repeat subsection. Use ## Model Samples instead.`,
          line: locationFromBlock(block).line
        });
      }
      continue;
    }

    if (block.type !== "list") {
      continue;
    }

    currentLayoutHasStructuredContent = true;
    for (const item of listItems([block])) {
      const bullet = parsedBulletFromListItem(item);
      if (layoutSubsection === "Repeat") {
        continue;
      }
      if (bullet.indent > 0) {
        if (layoutSubsection !== "Items" && (currentLayoutNestedProperty === "partial" || currentLayoutNestedProperty === "partial states")) {
          const partialNestedProperty = currentLayoutNestedProperty === "partial states" && bullet.indent > 1
            ? "partial states"
            : "partial";
          currentLayoutNestedProperty = applyLayoutPartialBullet(currentLayout, bullet, partialNestedProperty);
          addPartialDependencies(currentLayout, dependencies);
          continue;
        }
        diagnostics.push({
          severity: "warning",
          message: `Layout ${currentLayout.id} has indented ${layoutSubsection === "Items" ? "Items" : "metadata"} entry: ${bullet.text}. Use an unindented list item.`,
          line: bullet.location.line
        });
      }
      if (layoutSubsection === "Items") {
        applyLayoutItemBullet(currentLayout, bullet);
        addLayoutItemDependency(currentLayout, currentLayout.items[currentLayout.items.length - 1], dependencies);
      } else {
        currentLayoutNestedProperty = applyLayoutMetadataBullet(currentLayout, bullet);
        addPartialDependencies(currentLayout, dependencies);
      }
    }
  }

  const renderKeys = [
    ...layoutGroups.map((group) => `layout:${group.viewport}:${group.id}`),
    ...slotContents.flatMap((slot) => slot.layoutGroups.map((group) => slotContentRenderKey(slot.name, slot.viewport, group.id))),
    ...slotContents.map((slot) => `slot:${slot.name}`)
  ];

  return {
    sectionId: section.id,
    kind: isSlotSection ? "Slot" : "Layout",
    layoutGroups,
    slotContents,
    slotDefinitions: [],
    sectionProse: proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, renderKeys),
    diagnostics: [...diagnostics, ...structuredSectionOwnershipDiagnostics(section, { emitMalformedHeading: false })],
    dependencies: dedupeDependencies(dependencies),
    renderKeys
  };
}

function parseSlotsSection(section: SectionAst): LayoutSectionSemanticResult {
  const slotDefinitions: MarkVSpecSlotDefinition[] = [];
  const dependencies: SemanticDependency[] = [{
    source: { type: "section", id: section.id },
    target: { type: "render", id: "slots:list" },
    direction: "source-invalidates-target",
    kind: "renders"
  }];
  let currentSlotDefinition: MarkVSpecSlotDefinition | undefined;
  let currentSlotDefinitionHasStructuredContent = false;
  let hasSeenEntity = false;
  let inSectionNotes = false;
  const sectionOverviewBlocks: BlockAst[] = [];
  const sectionNoteBlocks: BlockAst[] = [];

  for (const block of section.blocks) {
    if (isSectionNotesHeading(block)) {
      currentSlotDefinition = undefined;
      currentSlotDefinitionHasStructuredContent = false;
      inSectionNotes = true;
      hasSeenEntity = true;
      continue;
    }
    if (inSectionNotes) {
      if (isEntityNoteBlock(block)) {
        sectionNoteBlocks.push(block);
      }
      continue;
    }
    if (block.type === "heading" && block.depth === 3) {
      hasSeenEntity = true;
      const heading = /^(\S+)(?:\s+(.+?))?\s*$/.exec(block.text);
      if (!heading) {
        currentSlotDefinition = undefined;
        currentSlotDefinitionHasStructuredContent = false;
        continue;
      }
      currentSlotDefinition = {
        name: heading[1],
        title: heading[2],
        properties: {},
        propertyLocations: {},
        location: locationFromBlock(block)
      };
      slotDefinitions.push(currentSlotDefinition);
      currentSlotDefinitionHasStructuredContent = false;
      dependencies.push({
        source: { type: "section", id: section.id },
        target: { type: "entity", id: `slot:${currentSlotDefinition.name}` },
        direction: "source-invalidates-target",
        kind: "derives"
      });
      dependencies.push({
        source: { type: "section", id: section.id },
        target: { type: "render", id: slotDefinitionRenderKey(currentSlotDefinition.name) },
        direction: "source-invalidates-target",
        kind: "renders"
      });
      continue;
    }
    if (!currentSlotDefinition) {
      if (!hasSeenEntity && isEntityNoteBlock(block)) {
        sectionOverviewBlocks.push(block);
      }
      continue;
    }
    if (isEntityNoteBlock(block)) {
      appendEntityProseLines(currentSlotDefinition, block, currentSlotDefinitionHasStructuredContent);
      continue;
    }
    if (currentSlotDefinition) {
      if (block.type === "list") {
        currentSlotDefinitionHasStructuredContent = true;
      }
      for (const bullet of listItems([block]).filter((item) => item.depth === 0)) {
        applySlotDefinitionBullet(currentSlotDefinition, bullet.text, locationFromBlock(bullet));
      }
    }
  }

  const renderKeys = ["slots:list", ...slotDefinitions.map((slot) => slotDefinitionRenderKey(slot.name))];

  return {
    sectionId: section.id,
    kind: "Slots",
    layoutGroups: [],
    slotContents: [],
    slotDefinitions,
    sectionProse: proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, renderKeys),
    diagnostics: structuredSectionOwnershipDiagnostics(section),
    dependencies: dedupeDependencies(dependencies),
    renderKeys
  };
}

function parseElementsSection(section: SectionAst): ElementSectionSemanticResult {
  const elements: MarkVSpecElement[] = [];
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const dependencies: SemanticDependency[] = [{
    source: { type: "section", id: section.id },
    target: { type: "render", id: "elements:list" },
    direction: "source-invalidates-target",
    kind: "renders"
  }];
  const elementHeadingRegex = new RegExp(String.raw`^(?:(\S+?):)?(${elementIdPattern})\s+(.+?)\s*$`, "u");
  let currentElement: MarkVSpecElement | undefined;
  let currentElementNestedProperty: string | undefined;
  let currentTableColumn: MarkVSpecElement["tableColumns"][number] | undefined;
  let currentTableRow: MarkVSpecElement["tableRows"][number] | undefined;
  let currentElementHasStructuredContent = false;
  let hasSeenEntity = false;
  let inSectionNotes = false;
  const sectionOverviewBlocks: BlockAst[] = [];
  const sectionNoteBlocks: BlockAst[] = [];

  for (const block of section.blocks) {
    if (isSectionNotesHeading(block)) {
      currentElement = undefined;
      currentElementNestedProperty = undefined;
      currentTableColumn = undefined;
      currentTableRow = undefined;
      currentElementHasStructuredContent = false;
      inSectionNotes = true;
      hasSeenEntity = true;
      continue;
    }
    if (inSectionNotes) {
      if (isEntityNoteBlock(block)) {
        sectionNoteBlocks.push(block);
      }
      continue;
    }
    if (block.type === "heading" && block.depth === 3) {
      hasSeenEntity = true;
      const heading = elementHeadingRegex.exec(block.text);
      if (!heading) {
        diagnostics.push({
          severity: "warning",
          message: "Malformed Element heading. Expected ### [<marker>:]E-* <type>.",
          line: locationFromBlock(block).line
        });
        currentElement = undefined;
        currentElementNestedProperty = undefined;
        currentTableColumn = undefined;
        currentTableRow = undefined;
        currentElementHasStructuredContent = false;
        continue;
      }

      const headingLocation = locationFromBlock(block);
      const parsedType = parseElementTypeHeading(heading[3]);
      currentElement = {
        id: heading[2],
        type: parsedType.type,
        properties: {
          ...(heading[1] ? { marker: heading[1] } : {}),
          ...(parsedType.required ? { required: true } : {})
        },
        propertyLocations: {
          ...(heading[1] ? { marker: [headingLocation] } : {}),
          ...(parsedType.required ? { required: [headingLocation] } : {})
        },
        routeParams: [],
        selectOptions: [],
        tableColumns: [],
        tableRows: [],
        visibleWhen: [],
        hiddenWhen: [],
        disabledWhen: [],
        validations: [],
        inputRules: [],
        notes: [],
        location: headingLocation
      };
      elements.push(currentElement);
      dependencies.push(...elementRenderDependencies(section, currentElement));
      currentElementNestedProperty = undefined;
      currentTableColumn = undefined;
      currentTableRow = undefined;
      currentElementHasStructuredContent = false;
      continue;
    }

    if (!currentElement) {
      if (!hasSeenEntity && isEntityNoteBlock(block)) {
        sectionOverviewBlocks.push(block);
      }
      continue;
    }

    if (isEntityNoteBlock(block)) {
      appendEntityProseLines(currentElement, block, currentElementHasStructuredContent);
      continue;
    }

    if (block.type !== "list") {
      continue;
    }

    currentElementHasStructuredContent = true;
    for (const item of listItems([block])) {
      const bullet = parsedBulletFromListItem(item);
      if (bullet.indent === 0) {
        currentTableColumn = undefined;
        currentTableRow = undefined;
      }
      currentElementNestedProperty = applyElementSemanticBullet(currentElement, bullet, currentElementNestedProperty, currentTableColumn, currentTableRow, diagnostics, dependencies);
      if (currentElementNestedProperty === "Columns" && bullet.indent > 0 && !isTableColumnMetadataBullet(bullet)) {
        currentTableColumn = currentElement.tableColumns[currentElement.tableColumns.length - 1];
      }
      if (currentElementNestedProperty === "Sample Rows" && bullet.indent > 0 && bullet.text === "Row") {
        currentTableRow = currentElement.tableRows[currentElement.tableRows.length - 1];
      }
    }
  }

  const renderKeys = ["elements:list", ...elements.map((element) => elementRenderKey(element.id))];

  return {
    sectionId: section.id,
    elements,
    sectionProse: proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, renderKeys),
    diagnostics: [...diagnostics, ...structuredSectionOwnershipDiagnostics(section, { emitMalformedHeading: false })],
    dependencies: dedupeDependencies(dependencies),
    renderKeys
  };
}

function applyElementSemanticBullet(
  element: MarkVSpecElement,
  bullet: ParsedBullet,
  nestedProperty: string | undefined,
  tableColumn: MarkVSpecElement["tableColumns"][number] | undefined,
  tableRow: MarkVSpecElement["tableRows"][number] | undefined,
  diagnostics: MarkVSpecDiagnostic[],
  dependencies: SemanticDependency[]
): string | undefined {
  if (bullet.indent > 0) {
    if (optionElementTypes.has(element.type) && nestedProperty === "options") {
      element.selectOptions.push(parseElementOption(bullet));
      return nestedProperty;
    }

    if (element.type === "Table" && nestedProperty === "Columns" && tableColumn && isTableColumnMetadataBullet(bullet)) {
      applyTableColumnMetadata(tableColumn, bullet);
      return nestedProperty;
    }

    if (element.type === "Table" && nestedProperty === "Columns") {
      element.tableColumns.push(parseTableColumn(bullet));
      return nestedProperty;
    }

    if (element.type === "Table" && nestedProperty === "Sample Rows") {
      if (bullet.text === "Row") {
        element.tableRows.push({
          cells: [],
          location: bullet.location,
          raw: bullet.text
        });
        return nestedProperty;
      }

      if (tableRow) {
        tableRow.cells.push(parseTableCell(bullet));
        return nestedProperty;
      }
    }

    if (nestedProperty === "params") {
      applyElementRouteParamBullet(element, bullet);
      addElementRouteParamDependency(element, bullet, dependencies);
      return nestedProperty;
    }

    if (nestedProperty === "input rule") {
      element.inputRules.push(parseElementInputRule(bullet));
      return nestedProperty;
    }

    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} has indented property entry: ${bullet.text}. Use an unindented list item.`,
      line: bullet.location.line
    });
    return nestedProperty;
  }

  const [propertyKey, propertyValue] = splitKeyValue(bullet.text);
  const nextNestedProperty = propertyKey.trim();
  const isEmptyNestedValue = propertyValue !== undefined && propertyValue.trim() === "";
  if (isEmptyNestedValue && nextNestedProperty === "params") {
    return nextNestedProperty;
  }
  if (nextNestedProperty === "input rule" && isEmptyNestedValue) {
    element.properties["input rule"] = true;
    addPropertyLocation(element.propertyLocations, "input rule", bullet.location);
    return nextNestedProperty;
  }
  if (element.type === "Table" && isEmptyNestedValue && isTableNestedProperty(nextNestedProperty)) {
    return nextNestedProperty;
  }
  if (optionElementTypes.has(element.type) && isEmptyNestedValue && nextNestedProperty === "options") {
    return nextNestedProperty;
  }

  applyElementBullet(element, bullet, diagnostics);
  addElementBulletDependencies(element, bullet, dependencies);
  return undefined;
}

function parseActionsSection(section: SectionAst): ActionSectionSemanticResult {
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
  let hasSeenEntity = false;
  let inSectionNotes = false;
  const sectionOverviewBlocks: BlockAst[] = [];
  const sectionNoteBlocks: BlockAst[] = [];

  for (const block of section.blocks) {
    if (isSectionNotesHeading(block)) {
      currentAction = undefined;
      currentActionContext = createActionParseContext();
      currentActionHasStructuredContent = false;
      inSectionNotes = true;
      hasSeenEntity = true;
      continue;
    }
    if (inSectionNotes) {
      if (isEntityNoteBlock(block)) {
        sectionNoteBlocks.push(block);
      }
      continue;
    }
    if (currentAction && block.type === "heading" && block.depth > 3) {
      appendEntityProseLines(currentAction, block, currentActionHasStructuredContent);
      continue;
    }
    if (block.type === "heading" && block.depth === 3) {
      hasSeenEntity = true;
      const heading = actionHeadingRegex.exec(block.text);
      if (!heading) {
        diagnostics.push({
          severity: "warning",
          message: "Malformed Action heading. Expected ### [<marker>:]A-* <name>.",
          line: locationFromBlock(block).line
        });
        currentAction = undefined;
        currentActionContext = createActionParseContext();
        currentActionHasStructuredContent = false;
        continue;
      }

      const headingLocation = locationFromBlock(block);
      currentActionContext = createActionParseContext();
      currentActionHasStructuredContent = false;
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
      const structuredStartLine = firstActionStructuredListItemLine(block);
      if (structuredStartLine === undefined) {
        if (!currentActionHasStructuredContent && isActionMalformedStructuredListBlock(block)) {
          for (const item of listItems([block])) {
            const bullet = parsedBulletFromListItem(item);
            currentActionContext = applyActionBulletToContext(currentAction, bullet, currentActionContext, diagnostics);
          }
          continue;
        }
        appendEntityProseLines(currentAction, block, currentActionHasStructuredContent);
        continue;
      }
      const splitProsePrefix = isActionProseListPrefix(block, structuredStartLine);
      if (splitProsePrefix) {
        appendListProseBeforeLine(currentAction, block, structuredStartLine, currentActionHasStructuredContent);
      }
      currentActionHasStructuredContent = true;
      const actionItems = splitProsePrefix
        ? listItems([block]).filter((candidate) => (candidate.range?.start.line ?? 1) >= structuredStartLine)
        : listItems([block]);
      for (const item of actionItems) {
        const bullet = parsedBulletFromListItem(item);
        currentActionContext = applyActionBulletToContext(currentAction, bullet, currentActionContext, diagnostics);
      }
      continue;
    }

    if (!currentAction || block.type !== "list") {
      if (currentAction && isEntityNoteBlock(block)) {
        appendEntityProseLines(currentAction, block, currentActionHasStructuredContent);
      } else if (!currentAction && !hasSeenEntity && isEntityNoteBlock(block)) {
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
    sectionProse: proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, renderKeys),
    diagnostics: [...diagnostics, ...structuredSectionOwnershipDiagnostics(section, { emitMalformedHeading: false })],
    dependencies: dedupeDependencies(dependencies),
    renderKeys
  };
}

function resultFor(
  section: SectionAst,
  values: Partial<Pick<SectionSemanticResult, "states" | "modelSamples" | "modelSampleGroups" | "viewContexts" | "viewContextSamples" | "previewScenarios" | "formGroups" | "validations" | "rules" | "errorCodes" | "historyFields" | "historyEntries" | "notes" | "sectionProse" | "diagnostics" | "dependencies">>,
  renderKeys: string[]
): SectionSemanticResult {
  const diagnostics = [
    ...(values.diagnostics ?? []),
    ...structuredSectionOwnershipDiagnostics(section)
  ];
  return {
    sectionId: section.id,
    kind: section.kind,
    states: values.states ?? [],
    modelSamples: values.modelSamples ?? [],
    modelSampleGroups: values.modelSampleGroups ?? [],
    viewContexts: values.viewContexts ?? [],
    viewContextSamples: values.viewContextSamples ?? [],
    previewScenarios: values.previewScenarios ?? [],
    formGroups: values.formGroups ?? [],
    validations: values.validations ?? [],
    rules: values.rules ?? [],
    errorCodes: values.errorCodes ?? [],
    historyFields: values.historyFields ?? [],
    historyEntries: values.historyEntries ?? [],
    notes: values.notes ?? [],
    sectionProse: values.sectionProse ?? [],
    diagnostics,
    dependencies: renderKeys.map((key): SemanticDependency => ({
      source: { type: "section", id: section.id },
      target: { type: "render", id: key },
      direction: "source-invalidates-target",
      kind: "renders"
    })).concat(values.dependencies ?? []),
    renderKeys
  };
}

function parseStatesSection(section: SectionAst): Pick<SectionSemanticResult, "states" | "sectionProse" | "diagnostics"> {
  const states: MarkVSpecState[] = [];
  const diagnostics: MarkVSpecDiagnostic[] = [];
  let currentState: MarkVSpecState | undefined;
  for (const item of listItems(section.blocks)) {
    const location = locationFromBlock(item);
    if (item.depth > 0) {
      if (currentState) {
        currentState.message = currentState.message ? `${currentState.message} ${item.text}` : item.text;
      } else {
        diagnostics.push({
          severity: "error",
          message: `State description has no parent state: ${item.text}.`,
          line: location.line
        });
      }
      continue;
    }

    currentState = parseStateText(item.text, location, diagnostics);
    states.push(currentState);
  }
  return {
    states,
    sectionProse: listSectionProse(section, ["states:list"]),
    diagnostics
  };
}

function parseStateText(text: string, location: SourceLocation, diagnostics: MarkVSpecDiagnostic[]): MarkVSpecState {
  const stateText = text.trim();
  const initial = stateText.endsWith("*");
  const name = initial ? stateText.slice(0, -1).trim() : stateText;
  if (!initial && stateText.includes("*")) {
    diagnostics.push({
      severity: "error",
      message: `State ${stateText} uses * outside the end of the state name.`,
      line: location.line
    });
  }
  return {
    name,
    initial,
    location,
    raw: text
  };
}

function parseModelSamplesSection(section: SectionAst): Pick<SectionSemanticResult, "modelSamples" | "modelSampleGroups" | "sectionProse" | "diagnostics" | "dependencies"> {
  const samples: MarkVSpecModelSampleSet[] = [];
  const groups: MarkVSpecModelSampleGroup[] = [];
  const diagnostics: MarkVSpecDiagnostic[] = [];
  const dependencies: SemanticDependency[] = [];
  let currentGroup: MarkVSpecModelSampleGroup | undefined;
  let currentSet: MarkVSpecModelSampleSet | undefined;
  let currentSetHasStructuredData = false;
  let hasSeenStateGroup = false;
  let inSectionNotes = false;
  let inStateNotes = false;
  const sectionOverviewBlocks: BlockAst[] = [];
  const sectionNoteBlocks: BlockAst[] = [];

  for (const block of section.blocks) {
    if (isSectionNotesHeading(block)) {
      currentGroup = undefined;
      currentSet = undefined;
      currentSetHasStructuredData = false;
      inSectionNotes = true;
      inStateNotes = false;
      hasSeenStateGroup = true;
      continue;
    }
    if (inSectionNotes) {
      if (isEntityNoteBlock(block)) {
        sectionNoteBlocks.push(block);
      }
      continue;
    }
    if (block.type === "heading" && block.depth === 3) {
      currentGroup = {
        state: block.text.trim(),
        location: locationFromBlock(block)
      };
      groups.push(currentGroup);
      currentSet = undefined;
      currentSetHasStructuredData = false;
      hasSeenStateGroup = true;
      inStateNotes = false;
      continue;
    }
    if (block.type === "heading" && block.depth === 4 && block.text.trim() === "State Notes" && currentGroup) {
      currentSet = undefined;
      currentSetHasStructuredData = false;
      inStateNotes = true;
      continue;
    }
    if (block.type === "heading" && block.depth === 4 && currentGroup) {
      currentSet = {
        state: currentGroup.state,
        path: block.text.trim(),
        columns: [],
        rows: [],
        location: locationFromBlock(block)
      };
      samples.push(currentSet);
      dependencies.push({
        source: { type: "entity", id: `model-sample:${currentGroup.state}:${currentSet.path}` },
        target: { type: "entity", id: `state:${currentGroup.state}` },
        direction: "source-invalidates-target",
        kind: "references"
      });
      currentSetHasStructuredData = false;
      inStateNotes = false;
      continue;
    }
    if (block.type === "heading" && block.depth === 4 && !currentGroup) {
      diagnostics.push({
        severity: "warning",
        message: `Model Samples path ${block.text.trim()} has no parent state heading.`,
        line: locationFromBlock(block).line
      });
      currentSet = undefined;
      continue;
    }
    if (!currentGroup) {
      if (!hasSeenStateGroup && isEntityNoteBlock(block)) {
        sectionOverviewBlocks.push(block);
      }
      continue;
    }
    if (inStateNotes) {
      if (isEntityNoteBlock(block)) {
        appendEntityNoteLines(currentGroup, block);
      }
      continue;
    }
    if (!currentSet) {
      if (isEntityNoteBlock(block)) {
        appendEntityOverviewLines(currentGroup, block);
      }
      continue;
    }
    if (isEntityNoteBlock(block) && block.type !== "table") {
      appendEntityProseLines(currentSet, block, currentSetHasStructuredData);
      continue;
    }
    if (block.type === "table" && currentSet) {
      currentSetHasStructuredData = true;
      applyModelSampleTable(currentSet, block);
    }
    if (block.type === "list" && currentSet) {
      currentSetHasStructuredData = true;
      applyModelSampleList(currentSet, block);
    }
  }

  return {
    modelSamples: samples,
    modelSampleGroups: groups,
    sectionProse: proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, ["model-samples"]),
    diagnostics,
    dependencies
  };
}

function applyModelSampleTable(sample: MarkVSpecModelSampleSet, block: Extract<BlockAst, { type: "table" }>): void {
  const [columns, ...rows] = block.rowSources.length > 0
    ? block.rowSources.map((row) => ({ cells: row.cells, raw: row.raw, line: row.range?.start.line }))
    : block.rows.map((cells) => ({ cells, raw: `| ${cells.join(" | ")} |`, line: block.range?.start.line }));

  if (!columns) {
    return;
  }
  sample.columns = columns.cells;
  for (const row of rows) {
    sample.rows.push(parseModelSampleRow(sample.columns, row.cells, row.raw, row.line ?? block.range?.start.line ?? sample.location.line));
  }
}

function applyModelSampleList(sample: MarkVSpecModelSampleSet, block: Extract<BlockAst, { type: "list" }>): void {
  const bullets = listItems([block]).map((item) => parsedBulletFromListItem(item));
  if (!isCollectionModelSamplePath(sample.path)) {
    const [firstBullet] = bullets;
    if (!firstBullet) {
      return;
    }

    const row: MarkVSpecModelSampleRow = {
      values: {},
      location: firstBullet.location,
      raw: bullets.map((bullet) => bullet.text).join("\n")
    };
    sample.rows.push(row);
    for (const bullet of bullets) {
      for (const line of modelSampleListLines(bullet)) {
        const [key, value] = splitKeyValue(line.text);
        applyModelSampleListValue(sample, row, key, value, line);
      }
    }
    return;
  }

  let currentRow: MarkVSpecModelSampleRow | undefined;
  for (const bullet of bullets) {
    if (bullet.indent === 0) {
      currentRow = {
        values: {},
        location: bullet.location,
        raw: bullet.text
      };
      sample.rows.push(currentRow);
      for (const line of modelSampleListLines(bullet)) {
        const [key, value] = splitKeyValue(line.text);
        applyModelSampleListValue(sample, currentRow, key, value, line);
      }
      continue;
    }

    if (currentRow) {
      for (const line of modelSampleListLines(bullet)) {
        const [key, value] = splitKeyValue(line.text);
        applyModelSampleListValue(sample, currentRow, key, value, line);
      }
    }
  }
}

function modelSampleListLines(bullet: ParsedBullet): ParsedBullet[] {
  return bullet.text
    .split(/\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => ({ text, indent: bullet.indent, location: bullet.location }));
}

function applyModelSampleListValue(
  sample: MarkVSpecModelSampleSet,
  row: MarkVSpecModelSampleRow,
  key: string,
  value: string | undefined,
  bullet: ParsedBullet
): void {
  const column = key.trim();
  if (!column) {
    return;
  }
  if (!sample.columns.includes(column)) {
    sample.columns.push(column);
  }
  row.values[column] = value?.trim() ?? "";
}

function parseModelSampleRow(columns: string[], cells: string[], raw: string, line: number): MarkVSpecModelSampleRow {
  return {
    values: Object.fromEntries(columns.map((column, index) => [column, cells[index] ?? ""])),
    location: { line },
    raw
  };
}

function parseViewContextSection(section: SectionAst): Pick<SectionSemanticResult, "viewContexts" | "sectionProse" | "diagnostics"> {
  const viewContexts: MarkVSpecViewContextDefinition[] = [];
  const diagnostics: MarkVSpecDiagnostic[] = [];
  let current: MarkVSpecViewContextDefinition | undefined;
  let nestedProperty: string | undefined;
  let currentHasStructuredContent = false;
  let hasSeenEntity = false;
  let inSectionNotes = false;
  const sectionOverviewBlocks: BlockAst[] = [];
  const sectionNoteBlocks: BlockAst[] = [];

  for (const block of section.blocks) {
    if (isSectionNotesHeading(block)) {
      current = undefined;
      nestedProperty = undefined;
      currentHasStructuredContent = false;
      inSectionNotes = true;
      hasSeenEntity = true;
      continue;
    }
    if (inSectionNotes) {
      if (isEntityNoteBlock(block)) {
        sectionNoteBlocks.push(block);
      }
      continue;
    }
    if (block.type === "heading" && block.depth === 3) {
      hasSeenEntity = true;
      current = {
        name: block.text.trim(),
        values: [],
        properties: {},
        propertyLocations: {},
        location: locationFromBlock(block)
      };
      viewContexts.push(current);
      nestedProperty = undefined;
      currentHasStructuredContent = false;
      continue;
    }
    if (!current) {
      if (!hasSeenEntity && isEntityNoteBlock(block)) {
        sectionOverviewBlocks.push(block);
      }
      continue;
    }
    if (isEntityNoteBlock(block)) {
      appendEntityProseLines(current, block, currentHasStructuredContent);
      continue;
    }
    if (block.type !== "list") {
      continue;
    }
    currentHasStructuredContent = true;
    for (const item of listItems([block])) {
      const bullet = parsedBulletFromListItem(item);
      if (bullet.indent === 0) {
        nestedProperty = applyViewContextBullet(current, bullet, diagnostics);
        continue;
      }
      if (nestedProperty === "values") {
        applyViewContextValueBullet(current, bullet);
        continue;
      }
      diagnostics.push({
        severity: "warning",
        message: `View Context ${current.name} has indented property entry: ${bullet.text}. Use it under values or make it an unindented property.`,
        line: bullet.location.line
      });
    }
  }

  for (const context of viewContexts) {
    finalizeViewContextDefinition(context, diagnostics);
  }

  return {
    viewContexts,
    sectionProse: proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, ["view-context"]),
    diagnostics
  };
}

function applyViewContextBullet(
  context: MarkVSpecViewContextDefinition,
  bullet: ParsedBullet,
  diagnostics: MarkVSpecDiagnostic[]
): string | undefined {
  const [keyPart, valuePart] = splitKeyValue(bullet.text);
  const key = keyPart.trim();
  const value = valuePart?.trim();
  if (key === "values" && value !== undefined && value.length === 0) {
    return "values";
  }
  if (key === "type" && value !== undefined) {
    if (value === "boolean" || value === "enum") {
      context.type = value;
    } else {
      diagnostics.push({
        severity: "error",
        message: `View Context ${context.name} type must be boolean or enum.`,
        line: bullet.location.line
      });
    }
    context.properties[key] = value;
    addPropertyLocation(context.propertyLocations, key, bullet.location);
    return undefined;
  }
  if (value !== undefined) {
    context.properties[key] = value;
    addPropertyLocation(context.propertyLocations, key, bullet.location);
    return undefined;
  }
  context.properties[key] = true;
  addPropertyLocation(context.propertyLocations, key, bullet.location);
  return undefined;
}

function applyViewContextValueBullet(context: MarkVSpecViewContextDefinition, bullet: ParsedBullet): void {
  const raw = bullet.text.trim();
  const isDefault = raw.endsWith("*");
  const value = isDefault ? raw.slice(0, -1).trim() : raw;
  context.values.push({
    value,
    isDefault,
    location: bullet.location,
    raw: bullet.text
  });
}

function finalizeViewContextDefinition(context: MarkVSpecViewContextDefinition, diagnostics: MarkVSpecDiagnostic[]): void {
  if (!context.type) {
    diagnostics.push({
      severity: "error",
      message: `View Context ${context.name} must define type: boolean or type: enum.`,
      line: context.location.line
    });
  }

  if (context.values.length === 0) {
    diagnostics.push({
      severity: "error",
      message: `View Context ${context.name} must define values.`,
      line: context.location.line
    });
    return;
  }

  const defaultValues = context.values.filter((value) => value.isDefault);
  if (defaultValues.length > 1) {
    diagnostics.push({
      severity: "error",
      message: `View Context ${context.name} has multiple default values marked with *.`,
      line: defaultValues[1]?.location.line ?? context.location.line
    });
  }
  context.defaultValue = defaultValues[0]?.value ?? context.values[0]?.value;

  if (context.type === "boolean") {
    for (const value of context.values) {
      if (value.value !== "true" && value.value !== "false") {
        diagnostics.push({
          severity: "error",
          message: `View Context ${context.name} boolean value must be true or false, not ${value.value}.`,
          line: value.location.line
        });
      }
    }
  }

  if (context.type === "enum") {
    const uniqueValues = new Set(context.values.map((value) => value.value));
    if (uniqueValues.size === 2 && uniqueValues.has("true") && uniqueValues.has("false")) {
      diagnostics.push({
        severity: "warning",
        message: `View Context ${context.name} enum only defines true and false. Use type: boolean for binary flags.`,
        line: context.location.line
      });
    }
  }
}

function parseViewContextSamplesSection(section: SectionAst): Pick<SectionSemanticResult, "viewContextSamples" | "sectionProse" | "diagnostics"> {
  const samples: MarkVSpecViewContextSample[] = [];
  const diagnostics: MarkVSpecDiagnostic[] = [];
  let current: MarkVSpecViewContextSample | undefined;
  let currentHasStructuredContent = false;
  let hasSeenEntity = false;
  let inSectionNotes = false;
  const sectionOverviewBlocks: BlockAst[] = [];
  const sectionNoteBlocks: BlockAst[] = [];

  for (const block of section.blocks) {
    if (isSectionNotesHeading(block)) {
      current = undefined;
      currentHasStructuredContent = false;
      inSectionNotes = true;
      hasSeenEntity = true;
      continue;
    }
    if (inSectionNotes) {
      if (isEntityNoteBlock(block)) {
        sectionNoteBlocks.push(block);
      }
      continue;
    }
    if (block.type === "heading" && block.depth === 3) {
      hasSeenEntity = true;
      current = {
        name: block.text.trim(),
        values: {},
        valueLocations: {},
        location: locationFromBlock(block)
      };
      samples.push(current);
      currentHasStructuredContent = false;
      continue;
    }
    if (!current) {
      if (!hasSeenEntity && isEntityNoteBlock(block)) {
        sectionOverviewBlocks.push(block);
      }
      continue;
    }
    if (isEntityNoteBlock(block)) {
      appendEntityProseLines(current, block, currentHasStructuredContent);
      continue;
    }
    if (block.type !== "list") {
      continue;
    }
    currentHasStructuredContent = true;
    for (const item of listItems([block]).filter((candidate) => candidate.depth === 0)) {
      const bullet = parsedBulletFromListItem(item);
      const [keyPart, valuePart] = splitKeyValue(bullet.text);
      if (valuePart === undefined) {
        diagnostics.push({
          severity: "warning",
          message: `View Context Sample ${current.name} has malformed value entry: ${bullet.text}. Use ${"${view.name}"}: value.`,
          line: bullet.location.line
        });
        continue;
      }
      const key = viewContextSampleKey(keyPart.trim());
      current.values[key] = valuePart.trim();
      addPropertyLocation(current.valueLocations, key, bullet.location);
    }
  }

  return {
    viewContextSamples: samples,
    sectionProse: proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, ["view-context-samples"]),
    diagnostics
  };
}

function viewContextSampleKey(key: string): string {
  const match = /^\$\{view\.([^}]+)\}$/u.exec(key);
  return match?.[1]?.trim() ?? key;
}

function parsePreviewScenariosSection(section: SectionAst): Pick<SectionSemanticResult, "previewScenarios" | "sectionProse" | "diagnostics"> {
  const scenarios: MarkVSpecPreviewScenario[] = [];
  const diagnostics: MarkVSpecDiagnostic[] = [];
  let current: MarkVSpecPreviewScenario | undefined;
  let currentHasStructuredContent = false;
  let hasSeenEntity = false;
  let inSectionNotes = false;
  const sectionOverviewBlocks: BlockAst[] = [];
  const sectionNoteBlocks: BlockAst[] = [];

  for (const block of section.blocks) {
    if (isSectionNotesHeading(block)) {
      current = undefined;
      currentHasStructuredContent = false;
      inSectionNotes = true;
      hasSeenEntity = true;
      continue;
    }
    if (inSectionNotes) {
      if (isEntityNoteBlock(block)) {
        sectionNoteBlocks.push(block);
      }
      continue;
    }
    if (block.type === "heading" && block.depth === 3) {
      hasSeenEntity = true;
      current = {
        name: block.text.trim(),
        properties: {},
        propertyLocations: {},
        location: locationFromBlock(block)
      };
      scenarios.push(current);
      currentHasStructuredContent = false;
      continue;
    }
    if (!current) {
      if (!hasSeenEntity && isEntityNoteBlock(block)) {
        sectionOverviewBlocks.push(block);
      }
      continue;
    }
    if (isEntityNoteBlock(block)) {
      appendEntityProseLines(current, block, currentHasStructuredContent);
      continue;
    }
    if (block.type !== "list") {
      continue;
    }
    currentHasStructuredContent = true;
    for (const item of listItems([block]).filter((candidate) => candidate.depth === 0)) {
      const bullet = parsedBulletFromListItem(item);
      const [keyPart, valuePart] = splitKeyValue(bullet.text);
      const key = keyPart.trim();
      const value = valuePart?.trim();
      if (value === undefined) {
        diagnostics.push({
          severity: "warning",
          message: `Preview Scenario ${current.name} has malformed entry: ${bullet.text}. Use state, model, or view.`,
          line: bullet.location.line
        });
        continue;
      }
      current.properties[key] = value;
      addPropertyLocation(current.propertyLocations, key, bullet.location);
      if (key === "state") {
        current.state = value;
      } else if (key === "model") {
        current.model = value;
      } else if (key === "view") {
        current.view = value;
      }
    }
  }

  return {
    previewScenarios: scenarios,
    sectionProse: proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, ["preview-scenarios"]),
    diagnostics
  };
}

function parseValidationsSection(section: SectionAst): Pick<SectionSemanticResult, "validations" | "sectionProse" | "dependencies"> {
  const validations: MarkVSpecValidationRule[] = [];
  const dependencies: SemanticDependency[] = [];
  let current: MarkVSpecValidationRule | undefined;
  let currentHasStructuredContent = false;
  let hasSeenEntity = false;
  let inSectionNotes = false;
  const sectionOverviewBlocks: BlockAst[] = [];
  const sectionNoteBlocks: BlockAst[] = [];
  for (const block of section.blocks) {
    if (isSectionNotesHeading(block)) {
      current = undefined;
      currentHasStructuredContent = false;
      inSectionNotes = true;
      hasSeenEntity = true;
      continue;
    }
    if (inSectionNotes) {
      if (isEntityNoteBlock(block)) {
        sectionNoteBlocks.push(block);
      }
      continue;
    }
    if (block.type === "heading" && block.depth === 3) {
      hasSeenEntity = true;
      const match = /^V-[\p{L}\p{N}-]+(?:\s+(.+?))?\s*$/u.exec(block.text);
      if (!match) {
        current = undefined;
        currentHasStructuredContent = false;
        continue;
      }
      const id = block.text.split(/\s+/u)[0] ?? block.text;
      current = {
        id,
        name: match?.[1],
        bullets: [],
        properties: {},
        propertyLocations: {},
        location: locationFromBlock(block)
      };
      validations.push(current);
      currentHasStructuredContent = false;
      continue;
    }
    if (!current) {
      if (!hasSeenEntity && isEntityNoteBlock(block)) {
        sectionOverviewBlocks.push(block);
      }
      continue;
    }
    if (isEntityNoteBlock(block)) {
      appendEntityProseLines(current, block, currentHasStructuredContent);
      continue;
    }
    if (current) {
      if (block.type === "list") {
        currentHasStructuredContent = true;
      }
      for (const bullet of listItems([block]).filter((item) => item.depth === 0)) {
        applyValidationBullet(current, bullet.text, locationFromBlock(bullet));
      }
      const targets = propertyValues(current.properties["target"]);
      for (const target of targets) {
        dependencies.push({
          source: { type: "entity", id: current.id },
          target: { type: "entity", id: target },
          direction: "source-invalidates-target",
          kind: "references"
        });
      }
    }
  }
  return {
    validations,
    sectionProse: proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, ["validations:list", ...validations.map((validation) => validationRenderKey(validation.id))]),
    dependencies
  };
}

function parseFormGroupsSection(section: SectionAst): Pick<SectionSemanticResult, "formGroups" | "sectionProse" | "dependencies"> {
  const formGroups: MarkVSpecFormGroup[] = [];
  const dependencies: SemanticDependency[] = [];
  let current: MarkVSpecFormGroup | undefined;
  let nestedProperty: string | undefined;
  let currentHasStructuredContent = false;
  let hasSeenEntity = false;
  let inSectionNotes = false;
  const sectionOverviewBlocks: BlockAst[] = [];
  const sectionNoteBlocks: BlockAst[] = [];

  for (const block of section.blocks) {
    if (isSectionNotesHeading(block)) {
      current = undefined;
      nestedProperty = undefined;
      currentHasStructuredContent = false;
      inSectionNotes = true;
      hasSeenEntity = true;
      continue;
    }
    if (inSectionNotes) {
      if (isEntityNoteBlock(block)) {
        sectionNoteBlocks.push(block);
      }
      continue;
    }
    if (block.type === "heading" && block.depth === 3) {
      hasSeenEntity = true;
      const match = new RegExp(String.raw`^(${formGroupIdPattern})(?:\s+(.+?))?\s*$`, "u").exec(block.text);
      if (!match) {
        current = undefined;
        nestedProperty = undefined;
        currentHasStructuredContent = false;
        continue;
      }
      current = {
        id: match[1],
        name: match[2],
        fields: [],
        properties: {},
        propertyLocations: {},
        bullets: [],
        location: locationFromBlock(block)
      };
      formGroups.push(current);
      nestedProperty = undefined;
      currentHasStructuredContent = false;
      continue;
    }

    if (!current) {
      if (!hasSeenEntity && isEntityNoteBlock(block)) {
        sectionOverviewBlocks.push(block);
      }
      continue;
    }
    if (isEntityNoteBlock(block)) {
      appendEntityProseLines(current, block, currentHasStructuredContent);
      continue;
    }

    for (const bullet of listItems([block])) {
      currentHasStructuredContent = true;
      const location = locationFromBlock(bullet);
      if (bullet.depth === 0) {
        nestedProperty = applyFormGroupBullet(current, bullet.text, location);
        continue;
      }
      if (nestedProperty === "fields") {
        for (const field of splitReferenceList(bullet.text)) {
          addFormGroupField(current, field, location);
        }
      }
    }
  }

  for (const formGroup of formGroups) {
    for (const field of formGroup.fields) {
      dependencies.push(referenceDependency(formGroup.id, field.elementId));
    }
    if (formGroup.submit) {
      dependencies.push(referenceDependency(formGroup.id, formGroup.submit.actionId));
    }
  }

  return {
    formGroups,
    sectionProse: proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, ["form-groups:list", ...formGroups.map((formGroup) => formGroupRenderKey(formGroup.id))]),
    dependencies
  };
}

function parseErrorCodesSection(section: SectionAst): Pick<SectionSemanticResult, "errorCodes" | "sectionProse" | "dependencies"> {
  const errorCodes: MarkVSpecErrorCode[] = [];
  const dependencies: SemanticDependency[] = [];
  let current: MarkVSpecErrorCode | undefined;
  let currentHasStructuredContent = false;
  let hasSeenEntity = false;
  let inSectionNotes = false;
  const sectionOverviewBlocks: BlockAst[] = [];
  const sectionNoteBlocks: BlockAst[] = [];
  for (const block of section.blocks) {
    if (isSectionNotesHeading(block)) {
      current = undefined;
      currentHasStructuredContent = false;
      inSectionNotes = true;
      hasSeenEntity = true;
      continue;
    }
    if (inSectionNotes) {
      if (isEntityNoteBlock(block)) {
        sectionNoteBlocks.push(block);
      }
      continue;
    }
    if (block.type === "heading" && block.depth === 3) {
      hasSeenEntity = true;
      const match = /^(ERR-[\p{L}\p{N}-]+)(?:\s+(.+?))?\s*$/u.exec(block.text);
      if (!match) {
        current = undefined;
        currentHasStructuredContent = false;
        continue;
      }
      current = {
        id: match[1],
        name: match[2],
        bullets: [],
        properties: {},
        propertyLocations: {},
        location: locationFromBlock(block)
      };
      errorCodes.push(current);
      currentHasStructuredContent = false;
      continue;
    }
    if (!current) {
      if (!hasSeenEntity && isEntityNoteBlock(block)) {
        sectionOverviewBlocks.push(block);
      }
      continue;
    }
    if (isEntityNoteBlock(block)) {
      appendEntityProseLines(current, block, currentHasStructuredContent);
      continue;
    }
    if (current) {
      if (block.type === "list") {
        currentHasStructuredContent = true;
      }
      for (const bullet of listItems([block]).filter((item) => item.depth === 0)) {
        applyErrorCodeBullet(current, bullet.text, locationFromBlock(bullet));
      }
      for (const target of propertyValues(current.properties["target"])) {
        dependencies.push({
          source: { type: "entity", id: current.id },
          target: { type: "entity", id: target },
          direction: "source-invalidates-target",
          kind: "references"
        });
      }
      for (const rule of propertyValues(current.properties["business rule"])) {
        dependencies.push({
          source: { type: "entity", id: current.id },
          target: { type: "entity", id: rule },
          direction: "source-invalidates-target",
          kind: "references"
        });
      }
    }
  }
  return {
    errorCodes,
    sectionProse: proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, ["error-codes:list", ...errorCodes.map((errorCode) => errorCodeRenderKey(errorCode.id))]),
    dependencies
  };
}

function parseHistoryFieldsSection(document: MarkdownDocument, sections: SectionAst[], section: SectionAst): Pick<SectionSemanticResult, "historyFields" | "sectionProse"> {
  const fields: MarkVSpecHistoryFieldSchema[] = [];
  const overviewLines: string[] = [];
  const noteLines: string[] = [];
  let current: MutableHistoryField | undefined;
  let firstStructuredLine: number | undefined;
  let inTrailingNotes = false;
  let inSectionNotes = false;

  for (const line of sectionBodyLines(document, sections, section)) {
    if (/^\s*###\s+Section Notes\s*$/.test(line.text)) {
      inSectionNotes = true;
      inTrailingNotes = false;
      current = undefined;
      continue;
    }
    if (inSectionNotes) {
      noteLines.push(line.text);
      continue;
    }
    if (inTrailingNotes) {
      noteLines.push(line.text);
      continue;
    }
    const headingMatch = /^\s*#+\s+/.exec(line.text);
    if (headingMatch) {
      continue;
    }

    const fieldMatch = /^\s*-\s+([^:\s][^:]*)\s*$/.exec(line.text);
    if (fieldMatch) {
      firstStructuredLine ??= line.line;
      current = {
        key: stripInlineCode(fieldMatch[1].trim()),
        label: stripInlineCode(fieldMatch[1].trim()),
        required: false,
        type: "string",
        location: { line: line.line },
        raw: line.text
      };
      fields.push(current);
      continue;
    }
    if (!current) {
      if (firstStructuredLine === undefined) {
        overviewLines.push(line.text);
      } else if (line.text.trim() !== "") {
        inTrailingNotes = true;
        noteLines.push(line.text);
      }
      continue;
    }
    const propertyMatch = /^\s*(?:-\s+)?([^:]+):\s*(.*?)\s*$/.exec(line.text);
    if (!propertyMatch) {
      if (line.text.trim() !== "") {
        current = undefined;
        inTrailingNotes = true;
        noteLines.push(line.text);
      }
      continue;
    }
    const key = propertyMatch[1].trim().toLowerCase();
    const value = stripInlineCode(propertyMatch[2].trim());
    if (key === "label") {
      current.label = value || current.key;
    } else if (key === "required") {
      current.required = value.toLowerCase() === "true";
    } else if (key === "type") {
      current.rawType = value;
      current.type = isHistoryFieldType(value) ? value : "string";
    }
  }

  return {
    historyFields: fields,
    sectionProse: rawLineSectionProse(
      section,
      overviewLines,
      noteLines,
      ["history-fields:list"]
    )
  };
}

interface MutableHistoryField extends MarkVSpecHistoryFieldSchema {
  rawType?: string;
}

function parseHistorySection(document: MarkdownDocument, sections: SectionAst[], section: SectionAst): Pick<SectionSemanticResult, "historyEntries" | "sectionProse"> {
  const lines = sectionBodyLines(document, sections, section);
  const entries: MarkVSpecHistoryEntry[] = [];
  const overviewLines: string[] = [];
  const noteLines: string[] = [];
  let current: MarkVSpecHistoryEntry | undefined;
  let metadataOpen = false;
  let bodyStarted = false;
  let inSectionNotes = false;

  for (const line of lines) {
    if (/^\s*###\s+Section Notes\s*$/.test(line.text)) {
      inSectionNotes = true;
      current = undefined;
      metadataOpen = false;
      bodyStarted = false;
      continue;
    }
    if (inSectionNotes) {
      noteLines.push(line.text);
      continue;
    }

    const headingMatch = /^\s*###\s+(.+?)\s*$/.exec(line.text);
    if (headingMatch) {
      current = {
        version: headingMatch[1].trim(),
        fields: {},
        fieldLocations: {},
        bodyLines: [],
        location: { line: line.line },
        raw: line.text
      };
      entries.push(current);
      metadataOpen = true;
      bodyStarted = false;
      continue;
    }
    if (!current) {
      overviewLines.push(line.text);
      continue;
    }

    const metadataMatch = /^\s*-\s+([^:]+):\s*(.*?)\s*$/.exec(line.text);
    if (metadataOpen && metadataMatch) {
      const key = stripInlineCode(metadataMatch[1].trim());
      current.fields[key] = metadataMatch[2].trim();
      current.fieldLocations[key] = [...(current.fieldLocations[key] ?? []), { line: line.line }];
      current.raw = `${current.raw}\n${line.text}`;
      continue;
    }

    if (metadataOpen && !bodyStarted && line.text.trim() === "") {
      continue;
    }

    metadataOpen = false;
    bodyStarted = true;
    current.bodyLines.push(line.text);
    current.raw = `${current.raw}\n${line.text}`;
  }

  return {
    historyEntries: entries.map((entry) => ({
      ...entry,
      bodyLines: trimBlankLines(entry.bodyLines)
    })),
    sectionProse: rawLineSectionProse(section, overviewLines, noteLines, ["history:list"])
  };
}

function trimBlankLines(lines: string[]): string[] {
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

function rawLineSectionProse(
  section: SectionAst,
  overviewLines: string[],
  noteLines: string[],
  renderKeys: string[]
): MarkVSpecSectionProse[] {
  const overview = trimAndCollapseBlankLines(overviewLines);
  const notes = trimAndCollapseBlankLines(noteLines);
  if (overview.length === 0 && notes.length === 0) {
    return [];
  }

  return [{
    sectionId: section.id,
    title: section.title,
    kind: section.kind,
    ...(section.viewport !== undefined ? { viewport: section.viewport } : {}),
    ...(section.slotName !== undefined ? { slotName: section.slotName } : {}),
    overview,
    notes,
    location: { line: section.heading.range.start.line },
    renderKeys
  }];
}

function trimAndCollapseBlankLines(lines: string[]): string[] {
  const trimmed = trimBlankLines(lines);
  const collapsed: string[] = [];
  for (const line of trimmed) {
    if (line.trim() === "" && collapsed[collapsed.length - 1]?.trim() === "") {
      continue;
    }
    collapsed.push(line);
  }
  return collapsed;
}

function structuredSectionOwnershipDiagnostics(section: SectionAst, options: { emitMalformedHeading?: boolean } = {}): MarkVSpecDiagnostic[] {
  if (section.kind === "Unknown") {
    return [];
  }

  const diagnostics: MarkVSpecDiagnostic[] = [];
  let malformedHeading: BlockAst | undefined;
  let warnedForMalformedHeadingProse = false;
  let hasValidEntityHeading = false;
  let inSectionNotes = false;

  for (const block of section.blocks) {
    if (isUnsupportedProseBlock(block)) {
      diagnostics.push({
        severity: "warning",
        message: `Section ${section.title} contains unsupported Markdown block ${block.sourceNodeType}. Use paragraph, list, table, or fenced code prose.`,
        line: locationFromBlock(block).line
      });
      continue;
    }

    if (isSectionNotesHeading(block)) {
      malformedHeading = undefined;
      warnedForMalformedHeadingProse = false;
      inSectionNotes = true;
      continue;
    }

    if (block.type === "heading") {
      inSectionNotes = false;
      if (block.depth > 3 && hasValidEntityHeading && isEntityHeadingSection(section.kind)) {
        continue;
      }
      if (isRecognizedStructuredHeading(section, block)) {
        malformedHeading = undefined;
        warnedForMalformedHeadingProse = false;
        if (isEntityHeadingDepth(section, block)) {
          hasValidEntityHeading = true;
        }
        continue;
      }
      if (isMalformedStructuredHeading(section, block)) {
        malformedHeading = block;
        warnedForMalformedHeadingProse = false;
        if (options.emitMalformedHeading !== false) {
          diagnostics.push({
            severity: "warning",
            message: `Section ${section.title} has malformed heading: ${block.text}. Prose below it cannot be attached to a valid entity.`,
            line: locationFromBlock(block).line
          });
        }
      }
      continue;
    }

    if (malformedHeading && !warnedForMalformedHeadingProse && isEntityNoteBlock(block)) {
      warnedForMalformedHeadingProse = true;
      diagnostics.push({
        severity: "warning",
        message: `Section ${section.title} has prose after malformed heading ${malformedHeading.text}. Move it under a valid entity heading or Section Notes.`,
        line: locationFromBlock(block).line
      });
      continue;
    }

    if (!inSectionNotes && !hasValidEntityHeading && isEntityHeadingSection(section.kind) && block.type === "list") {
      for (const item of listItems([block]).filter((candidate) => candidate.depth === 0 && looksLikeStructuredProperty(candidate.text))) {
        diagnostics.push({
          severity: "warning",
          message: `Section ${section.title} has structured-looking list item before a valid entity heading: ${item.text}.`,
          line: locationFromBlock(item).line
        });
      }
    }
  }

  return diagnostics;
}

function isUnsupportedProseBlock(block: BlockAst): boolean {
  return block.type === "unknown";
}

function isRecognizedStructuredHeading(section: SectionAst, block: BlockAst): boolean {
  if (block.type !== "heading") {
    return false;
  }
  if (section.kind === "ModelSamples") {
    return block.depth === 3 || block.depth === 4;
  }
  if (section.kind === "BusinessRules") {
    return block.depth === 3 && /^(?:(\S+?):)?R-[\p{L}\p{N}-]+(?:\s+.+?)?\s*$/u.test(block.text);
  }
  if (section.kind === "Elements") {
    return block.depth === 3 && new RegExp(String.raw`^(?:[^:\s]+:)?${elementIdPattern}\s+\S+`, "u").test(block.text);
  }
  if (section.kind === "Actions") {
    return block.depth === 3 && new RegExp(String.raw`^(?:[^:\s]+:)?${actionIdPattern}\s+.+`, "u").test(block.text);
  }
  if (section.kind === "FormGroups") {
    return block.depth === 3 && new RegExp(String.raw`^${formGroupIdPattern}(?:\s+.+?)?\s*$`, "u").test(block.text);
  }
  if (section.kind === "Validations") {
    return block.depth === 3 && /^V-[\p{L}\p{N}-]+(?:\s+.+?)?\s*$/u.test(block.text);
  }
  if (section.kind === "ErrorCodes") {
    return block.depth === 3 && /^ERR-[\p{L}\p{N}-]+(?:\s+.+?)?\s*$/u.test(block.text);
  }
  if (section.kind === "Layout" || section.kind === "Slot" || section.kind === "Slots") {
    return block.depth === 3 || block.depth === 4;
  }
  if (section.kind === "History") {
    return block.depth === 3;
  }
  return false;
}

function isEntityHeadingDepth(section: SectionAst, block: BlockAst): boolean {
  return block.type === "heading" && (
    (section.kind === "ModelSamples" && block.depth === 3)
    || (section.kind !== "ModelSamples" && block.depth === 3)
  );
}

function isMalformedStructuredHeading(section: SectionAst, block: BlockAst): boolean {
  return block.type === "heading" && (
    isEntityHeadingSection(section.kind)
    || section.kind === "ModelSamples"
    || section.kind === "Layout"
    || section.kind === "Slot"
    || section.kind === "Slots"
  );
}

function isEntityHeadingSection(kind: SectionKind): boolean {
  return kind === "Elements"
    || kind === "Actions"
    || kind === "FormGroups"
    || kind === "Validations"
    || kind === "BusinessRules"
    || kind === "ErrorCodes";
}

function looksLikeStructuredProperty(text: string): boolean {
  return /^[\p{L}\p{N} _-]+:\s*.+/u.test(text.trim());
}

function stripInlineCode(value: string): string {
  return value.replace(/^`([^`]+)`$/u, "$1").trim();
}

function isHistoryFieldType(value: string): value is MarkVSpecHistoryFieldType {
  return value === "string" || value === "date";
}

function applyLayoutMetadataBullet(layout: MarkVSpecLayoutGroup, bullet: ParsedBullet): string | undefined {
  const [key, value] = splitKeyValue(bullet.text);
  if (key.trim() === "partial" && value !== undefined && value.trim() === "") {
    layout.partial = {
      states: {},
      propertyLocations: {},
      location: bullet.location
    };
    addPropertyLocation(layout.propertyLocations, "partial", bullet.location);
    layout.items.push({
      type: "property",
      key: "partial",
      value: "",
      scope: "metadata",
      location: bullet.location,
      raw: bullet.text
    });
    return "partial";
  }

  if (value !== undefined) {
    const normalizedKey = key.trim();
    const normalizedValue = value.trim();
    layout.properties[normalizedKey] = normalizedValue;
    addPropertyLocation(layout.propertyLocations, normalizedKey, bullet.location);
    layout.items.push({
      type: "property",
      key: normalizedKey,
      value: normalizedValue,
      scope: "metadata",
      location: bullet.location,
      raw: bullet.text
    });
    return undefined;
  }

  if (!layout.kind) {
    layout.kind = bullet.text;
  }

  layout.items.push({
    type: "flag",
    value: bullet.text,
    scope: "metadata",
    location: bullet.location,
    raw: bullet.text
  });
  return undefined;
}

function applyLayoutPartialBullet(
  layout: MarkVSpecLayoutGroup,
  bullet: ParsedBullet,
  nestedProperty: "partial" | "partial states"
): "partial" | "partial states" {
  const partial = layout.partial ?? {
    states: {},
    propertyLocations: {},
    location: bullet.location
  };
  layout.partial = partial;

  const [key, value] = splitKeyValue(bullet.text);
  const normalizedKey = key.trim();
  const normalizedValue = value?.trim() ?? "";

  if (nestedProperty === "partial states") {
    partial.states[normalizedKey] = normalizedValue;
    addPropertyLocation(partial.propertyLocations, `states ${normalizedKey}`, bullet.location);
    addPropertyLocation(layout.propertyLocations, `partial states ${normalizedKey}`, bullet.location);
    layout.items.push({
      type: "property",
      key: `partial states ${normalizedKey}`,
      value: normalizedValue,
      scope: "metadata",
      location: bullet.location,
      raw: bullet.text
    });
    return "partial states";
  }

  if (normalizedKey === "id") {
    partial.id = normalizedValue;
    addPropertyLocation(partial.propertyLocations, "id", bullet.location);
    addPropertyLocation(layout.propertyLocations, "partial id", bullet.location);
    layout.items.push({
      type: "property",
      key: "partial id",
      value: normalizedValue,
      scope: "metadata",
      location: bullet.location,
      raw: bullet.text
    });
    return "partial";
  }

  if (normalizedKey === "states") {
    addPropertyLocation(partial.propertyLocations, "states", bullet.location);
    addPropertyLocation(layout.propertyLocations, "partial states", bullet.location);
    layout.items.push({
      type: "property",
      key: "partial states",
      value: normalizedValue,
      scope: "metadata",
      location: bullet.location,
      raw: bullet.text
    });
    return "partial states";
  }

  addPropertyLocation(partial.propertyLocations, normalizedKey, bullet.location);
  addPropertyLocation(layout.propertyLocations, `partial ${normalizedKey}`, bullet.location);
  layout.items.push({
    type: "property",
    key: `partial ${normalizedKey}`,
    value: normalizedValue,
    scope: "metadata",
    location: bullet.location,
    raw: bullet.text
  });
  return "partial";
}

function applyLayoutItemBullet(layout: MarkVSpecLayoutGroup, bullet: ParsedBullet): void {
  const [key, value] = splitKeyValue(bullet.text);
  if (key.trim() === "slot" && value !== undefined) {
    layout.items.push({
      type: "slot",
      name: value.trim(),
      location: bullet.location,
      raw: bullet.text
    });
    return;
  }

  const field = new RegExp(String.raw`^"(.+?)":\s*(${elementIdPattern})\s*$`, "u").exec(bullet.text);
  if (field) {
    layout.items.push({
      type: "field",
      label: field[1],
      elementId: field[2],
      location: bullet.location,
      raw: bullet.text
    });
    return;
  }

  if (isLayoutItemId(bullet.text)) {
    layout.items.push({
      type: "contains",
      targetId: bullet.text,
      location: bullet.location,
      raw: bullet.text
    });
    return;
  }

  if (value !== undefined) {
    layout.items.push({
      type: "property",
      key: key.trim(),
      value: value.trim(),
      scope: "items",
      location: bullet.location,
      raw: bullet.text
    });
    return;
  }

  layout.items.push({
    type: "flag",
    value: bullet.text,
    scope: "items",
    location: bullet.location,
    raw: bullet.text
  });
}

function applySlotDefinitionBullet(slot: MarkVSpecSlotDefinition, text: string, location: SourceLocation): void {
  const [key, value] = splitKeyValue(text);
  if (value === undefined) {
    slot.properties[text] = true;
    addPropertyLocation(slot.propertyLocations, text, location);
    return;
  }

  const normalizedKey = key.trim();
  slot.properties[normalizedKey] = value.trim();
  addPropertyLocation(slot.propertyLocations, normalizedKey, location);
}

function layoutRenderDependencies(section: SectionAst, layout: MarkVSpecLayoutGroup, slotName?: string): SemanticDependency[] {
  return [{
    source: { type: "section", id: section.id },
    target: { type: "render", id: slotName ? slotContentRenderKey(slotName, section.viewport, layout.id) : `layout:${layout.viewport}:${layout.id}` },
    direction: "source-invalidates-target",
    kind: "renders"
  }];
}

function slotContentRenderKey(slotName: string, viewport: string | undefined, layoutId: string): string {
  return `slot-content:${slotName}:${viewport ?? "default"}:${layoutId}`;
}

function slotDefinitionRenderKey(slotName: string): string {
  return `slot-definition:${slotName}`;
}

function addLayoutItemDependency(layout: MarkVSpecLayoutGroup, item: MarkVSpecLayoutItem | undefined, dependencies: SemanticDependency[]): void {
  if (!item) {
    return;
  }
  if (item.type === "contains") {
    dependencies.push({
      source: { type: "entity", id: layout.id },
      target: { type: "entity", id: item.targetId },
      direction: "source-invalidates-target",
      kind: "references"
    });
  } else if (item.type === "field") {
    dependencies.push({
      source: { type: "entity", id: layout.id },
      target: { type: "entity", id: item.elementId },
      direction: "source-invalidates-target",
      kind: "references"
    });
  } else if (item.type === "slot") {
    dependencies.push({
      source: { type: "entity", id: layout.id },
      target: { type: "entity", id: `slot:${item.name}` },
      direction: "source-invalidates-target",
      kind: "references"
    });
  }
}

function addPartialDependencies(layout: MarkVSpecLayoutGroup, dependencies: SemanticDependency[]): void {
  if (!layout.partial?.id) {
    return;
  }
  dependencies.push({
    source: { type: "entity", id: layout.id },
    target: { type: "entity", id: layout.partial.id },
    direction: "source-invalidates-target",
    kind: "references"
  });
}

function dedupeDependencies(dependencies: SemanticDependency[]): SemanticDependency[] {
  const seen = new Set<string>();
  const deduped: SemanticDependency[] = [];
  for (const dependency of dependencies) {
    const key = `${dependency.source.type}:${dependency.source.id}->${dependency.target.type}:${dependency.target.id}:${dependency.kind}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(dependency);
  }
  return deduped;
}

function applyElementBullet(element: MarkVSpecElement, bullet: ParsedBullet, diagnostics: MarkVSpecDiagnostic[]): void {
  const [key, value] = splitKeyValue(bullet.text);
  if (value === undefined) {
    element.properties[bullet.text] = true;
    addPropertyLocation(element.propertyLocations, bullet.text, bullet.location);
    return;
  }

  const normalizedKey = key.trim();
  let normalizedValue = value.trim();

  if (normalizedKey === "visible when") {
    element.visibleWhen.push(normalizedValue);
  } else if (normalizedKey === "hidden when") {
    element.hiddenWhen.push(normalizedValue);
  } else if (normalizedKey === "disabled when") {
    element.disabledWhen.push(normalizedValue);
  } else if (normalizedKey === "validation") {
    element.validations.push(normalizedValue);
  } else if (normalizedKey === "input rule") {
    element.inputRules.push({
      key: "input rule",
      value: normalizedValue,
      location: bullet.location,
      raw: bullet.text
    });
  } else if (normalizedKey === "initial value") {
    normalizedValue = parseYamlScalar(normalizedValue);
  }

  element.properties[normalizedKey] = normalizedValue;
  addPropertyLocation(element.propertyLocations, normalizedKey, bullet.location);
}

function applyElementRouteParamBullet(element: MarkVSpecElement, bullet: ParsedBullet): void {
  const [key, value] = splitKeyValue(bullet.text);
  if (value === undefined) {
    return;
  }

  const name = key.trim();
  const source = value.trim();
  element.routeParams.push({
    name,
    source,
    location: bullet.location
  });
  element.properties[`route param ${name}`] = source;
  addPropertyLocation(element.propertyLocations, `route param ${name}`, bullet.location);
}

function parseTableColumn(bullet: ParsedBullet): MarkVSpecElement["tableColumns"][number] {
  const [rawColumn, ...metadataLines] = bullet.text.split(/\n/u).map((line) => line.trim()).filter(Boolean);
  const [key, value] = splitKeyValue(rawColumn ?? bullet.text);
  const trimmedKey = key.trim();
  const trimmedValue = value?.trim();
  const column: MarkVSpecElement["tableColumns"][number] = trimmedValue && !isSourceExpression(trimmedValue)
    ? {
        key: trimmedKey,
        label: trimmedValue,
        source: trimmedKey,
        location: bullet.location,
        raw: bullet.text
      }
    : {
        label: trimmedKey,
        ...(trimmedValue ? { source: trimmedValue } : {}),
        location: bullet.location,
        raw: bullet.text
      };
  for (const line of metadataLines) {
    applyTableColumnMetadata(column, { text: line, indent: bullet.indent + 1, location: bullet.location });
  }
  return column;
}

function parseElementOption(bullet: ParsedBullet): MarkVSpecElement["selectOptions"][number] {
  const [key, value] = splitKeyValue(bullet.text);
  const source = value?.trim();
  return {
    label: key.trim(),
    ...(source ? { source } : {}),
    location: bullet.location,
    raw: bullet.text
  };
}

function parseElementInputRule(bullet: ParsedBullet): MarkVSpecElement["inputRules"][number] {
  const [key, value] = splitKeyValue(bullet.text);
  return {
    key: key.trim(),
    value: value?.trim() ?? "",
    location: bullet.location,
    raw: bullet.text
  };
}

function applyTableColumnMetadata(column: MarkVSpecElement["tableColumns"][number], bullet: ParsedBullet): void {
  const [key, value] = splitKeyValue(bullet.text);
  const normalizedKey = key.trim();
  const normalizedValue = value?.trim() ?? "";
  const metadata = column.metadata ?? [];
  metadata.push({
    key: normalizedKey,
    value: normalizedValue,
    location: bullet.location,
    raw: bullet.text
  });
  column.metadata = metadata;
  if (normalizedKey === "sortable") {
    column.sortable = normalizedValue === "true";
  }
  if (normalizedKey === "sort" && (normalizedValue === "asc" || normalizedValue === "desc")) {
    column.sort = normalizedValue;
    column.sortable = true;
  }
}

function isTableColumnMetadataBullet(bullet: ParsedBullet): boolean {
  const [key] = splitKeyValue(bullet.text);
  return key.trim() === "sortable" || key.trim() === "sort";
}

function isSourceExpression(value: string): boolean {
  return /^\$\{[^}]+\}$/u.test(value) || /^[a-z][\w-]*(?:\.[\w-]+)+$/iu.test(value);
}

function parseTableCell(bullet: ParsedBullet): MarkVSpecElement["tableRows"][number]["cells"][number] {
  const [key, value] = splitKeyValue(bullet.text);
  return {
    column: key.trim(),
    value: value?.trim() ?? "",
    location: bullet.location,
    raw: bullet.text
  };
}

function parseElementTypeHeading(rawType: string): { type: string; required: boolean } {
  const trimmed = rawType.trim();
  if (!trimmed.endsWith("*")) {
    return { type: trimmed, required: false };
  }

  return { type: trimmed.slice(0, -1).trim(), required: true };
}

function parseYamlScalar(value: string): string {
  const trimmed = value.trim();
  const doubleQuoted = /^"(.*)"$/.exec(trimmed);
  if (doubleQuoted) {
    return doubleQuoted[1].replace(/\\"/g, "\"");
  }

  const singleQuoted = /^'(.*)'$/.exec(trimmed);
  if (singleQuoted) {
    return singleQuoted[1].replace(/''/g, "'");
  }

  return trimmed;
}

function isTableNestedProperty(key: string): boolean {
  return key === "Columns" || key === "Sample Rows";
}

function elementRenderDependencies(section: SectionAst, element: MarkVSpecElement): SemanticDependency[] {
  return [{
    source: { type: "section", id: section.id },
    target: { type: "render", id: elementRenderKey(element.id) },
    direction: "source-invalidates-target",
    kind: "renders"
  }];
}

function elementRenderKey(elementId: string): string {
  return `element:${elementId}`;
}

function addElementBulletDependencies(element: MarkVSpecElement, bullet: ParsedBullet, dependencies: SemanticDependency[]): void {
  const [key, value] = splitKeyValue(bullet.text);
  if (value === undefined) {
    return;
  }

  const normalizedKey = key.trim();
  const normalizedValue = value.trim();
  if (normalizedKey === "validation") {
    dependencies.push({
      source: { type: "entity", id: element.id },
      target: { type: "entity", id: normalizedValue },
      direction: "source-invalidates-target",
      kind: "validates"
    });
  }
  if (normalizedKey === "visible when" || normalizedKey === "hidden when" || normalizedKey === "disabled when") {
    dependencies.push({
      source: { type: "entity", id: element.id },
      target: { type: "entity", id: normalizedValue },
      direction: "source-invalidates-target",
      kind: "references"
    });
  }
}

function addElementRouteParamDependency(element: MarkVSpecElement, bullet: ParsedBullet, dependencies: SemanticDependency[]): void {
  const [, value] = splitKeyValue(bullet.text);
  const source = value?.trim();
  if (!source) {
    return;
  }
  dependencies.push({
    source: { type: "entity", id: element.id },
    target: { type: "entity", id: source },
    direction: "source-invalidates-target",
    kind: "references"
  });
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

function formGroupRenderKey(formGroupId: string): string {
  return `form-group:${formGroupId}`;
}

function validationRenderKey(validationId: string): string {
  return `validation:${validationId}`;
}

function ruleRenderKey(ruleId: string): string {
  return `rule:${ruleId}`;
}

function errorCodeRenderKey(errorCodeId: string): string {
  return `error-code:${errorCodeId}`;
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
    if (step.name.toLowerCase().replace(/[\s_-]+/gu, "") === "httprequest") {
      for (const detail of step.details.filter((detail) => detail.key !== "request")) {
        dependencies.push(referenceDependency(action.id, detail.value));
      }
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

function applyValidationBullet(validation: MarkVSpecValidationRule, text: string, location: SourceLocation): void {
  validation.bullets.push({ text, location });
  const [key, value] = splitKeyValue(text);
  if (value === undefined) {
    return;
  }

  const normalizedKey = key.trim();
  const normalizedValue = value.trim();
  const current = validation.properties[normalizedKey];
  if (current === undefined) {
    validation.properties[normalizedKey] = normalizedValue;
  } else if (Array.isArray(current)) {
    current.push(normalizedValue);
  } else {
    validation.properties[normalizedKey] = [current, normalizedValue];
  }
  addPropertyLocation(validation.propertyLocations, normalizedKey, location);
}

function applyFormGroupBullet(formGroup: MarkVSpecFormGroup, text: string, location: SourceLocation): string | undefined {
  formGroup.bullets.push({ text, location });
  const [key, value] = splitKeyValue(text);
  if (value === undefined) {
    return undefined;
  }

  const normalizedKey = key.trim();
  const normalizedValue = value.trim();
  addFormGroupProperty(formGroup, normalizedKey, normalizedValue, location);

  if (normalizedKey === "fields") {
    for (const field of splitReferenceList(normalizedValue)) {
      addFormGroupField(formGroup, field, location);
    }
    return "fields";
  }
  if (normalizedKey === "submit" && normalizedValue) {
    formGroup.submit = {
      actionId: normalizedValue,
      location,
      raw: text
    };
    return undefined;
  }
  return normalizedKey;
}

function addFormGroupField(formGroup: MarkVSpecFormGroup, text: string, location: SourceLocation): void {
  const fieldId = text.trim();
  if (!fieldId) {
    return;
  }
  formGroup.fields.push({
    elementId: fieldId,
    location,
    raw: text
  });
}

function addFormGroupProperty(formGroup: MarkVSpecFormGroup, key: string, value: string, location: SourceLocation): void {
  const current = formGroup.properties[key];
  if (current === undefined) {
    formGroup.properties[key] = value;
  } else if (Array.isArray(current)) {
    current.push(value);
  } else {
    formGroup.properties[key] = [current, value];
  }
  addPropertyLocation(formGroup.propertyLocations, key, location);
}

function splitReferenceList(value: string): string[] {
  return value
    .split(/[,、]/u)
    .map((item) => item.trim())
    .filter(Boolean);
}

function applyErrorCodeBullet(errorCode: MarkVSpecErrorCode, text: string, location: SourceLocation): void {
  errorCode.bullets.push({ text, location });
  const [key, value] = splitKeyValue(text);
  if (value === undefined) {
    return;
  }

  const normalizedKey = key.trim();
  const normalizedValue = value.trim();
  const current = errorCode.properties[normalizedKey];
  if (current === undefined) {
    errorCode.properties[normalizedKey] = normalizedValue;
  } else if (Array.isArray(current)) {
    current.push(normalizedValue);
  } else {
    errorCode.properties[normalizedKey] = [current, normalizedValue];
  }
  addPropertyLocation(errorCode.propertyLocations, normalizedKey, location);
}

function propertyValues(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
}

function parseRulesSection(section: SectionAst): Pick<SectionSemanticResult, "rules" | "sectionProse"> {
  const rules: MarkVSpecRule[] = [];
  let current: MarkVSpecRule | undefined;
  let freeformRule: MarkVSpecRule | undefined;
  let currentHasStructuredContent = false;
  let hasSeenEntityOrList = false;
  let inSectionNotes = false;
  const sectionOverviewBlocks: BlockAst[] = [];
  const sectionNoteBlocks: BlockAst[] = [];
  for (const block of section.blocks) {
    if (isSectionNotesHeading(block)) {
      current = undefined;
      currentHasStructuredContent = false;
      inSectionNotes = true;
      hasSeenEntityOrList = true;
      continue;
    }
    if (inSectionNotes) {
      if (isEntityNoteBlock(block)) {
        sectionNoteBlocks.push(block);
      }
      continue;
    }
    if (block.type === "heading" && block.depth === 3) {
      hasSeenEntityOrList = true;
      const match = /^(?:(\S+?):)?(R-[\p{L}\p{N}-]+)(?:\s+(.+?))?\s*$/u.exec(block.text);
      if (!match) {
        current = undefined;
        currentHasStructuredContent = false;
        continue;
      }
      current = {
        id: match[2],
        name: match?.[3],
        bodyLines: [],
        bullets: [],
        location: locationFromBlock(block)
      };
      rules.push(current);
      currentHasStructuredContent = false;
      continue;
    }
    if (current && isEntityNoteBlock(block)) {
      appendEntityProseLines(current, block, currentHasStructuredContent);
      continue;
    }
    if (!current) {
      if (!hasSeenEntityOrList && isEntityNoteBlock(block)) {
        sectionOverviewBlocks.push(block);
        continue;
      }
      const freeformBullets = listItems([block]).filter((item) => item.depth === 0);
      if (freeformBullets.length === 0) {
        continue;
      }
      hasSeenEntityOrList = true;
      freeformRule ??= {
        id: "R-BusinessRules",
        name: section.title,
        bodyLines: [],
        bullets: [],
        location: locationFromBlock(freeformBullets[0])
      };
      if (!rules.includes(freeformRule)) {
        rules.push(freeformRule);
      }
      for (const bullet of freeformBullets) {
        freeformRule.bullets.push({
          text: bullet.text,
          location: locationFromBlock(bullet)
        });
      }
      appendRuleBodyLines(freeformRule, block);
      continue;
    }
    if (current) {
      if (block.type === "list") {
        currentHasStructuredContent = true;
        appendRuleBodyLines(current, block);
      }
      for (const bullet of listItems([block]).filter((item) => item.depth === 0)) {
        current.bullets.push({
          text: bullet.text,
          location: locationFromBlock(bullet)
        });
      }
    }
  }
  return {
    rules,
    sectionProse: proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, ["rules:list", ...rules.map((rule) => ruleRenderKey(rule.id))])
  };
}

function appendRuleBodyLines(rule: MarkVSpecRule, block: BlockAst): void {
  const lines = proseBlockToLines(block);
  if (lines.length === 0) {
    return;
  }

  rule.bodyLines ??= [];
  if (rule.bodyLines.length > 0 && rule.bodyLines[rule.bodyLines.length - 1] !== "") {
    rule.bodyLines.push("");
  }
  rule.bodyLines.push(...lines);
}

function parseNoteSection(document: MarkdownDocument, sections: SectionAst[], section: SectionAst): MarkVSpecNoteSection {
  return {
    title: section.title,
    line: section.heading.range.start.line,
    lines: sectionBodyLines(document, sections, section).map((line) => line.text)
  };
}

function listSectionProse(section: SectionAst, renderKeys: string[]): MarkVSpecSectionProse[] {
  const firstStructuredIndex = section.blocks.findIndex((block) => block.type === "list");
  if (firstStructuredIndex < 0) {
    return proseForSection(section, section.blocks, [], renderKeys);
  }

  let lastStructuredIndex = firstStructuredIndex;
  for (let index = firstStructuredIndex + 1; index < section.blocks.length; index += 1) {
    if (section.blocks[index]?.type === "list") {
      lastStructuredIndex = index;
    }
  }

  return proseForSection(
    section,
    section.blocks.slice(0, firstStructuredIndex),
    section.blocks.slice(lastStructuredIndex + 1),
    renderKeys
  );
}

function proseForSection(section: SectionAst, overviewBlocks: BlockAst[], noteBlocks: BlockAst[], renderKeys: string[]): MarkVSpecSectionProse[] {
  const overview = proseBlocksToLines(overviewBlocks);
  const notes = proseBlocksToLines(noteBlocks);
  if (overview.length === 0 && notes.length === 0) {
    return [];
  }

  return [{
    sectionId: section.id,
    title: section.title,
    kind: section.kind,
    ...(section.viewport !== undefined ? { viewport: section.viewport } : {}),
    ...(section.slotName !== undefined ? { slotName: section.slotName } : {}),
    overview,
    notes,
    location: { line: section.heading.range.start.line },
    renderKeys
  }];
}

function proseBlocksToLines(blocks: BlockAst[]): string[] {
  const lines: string[] = [];
  for (const block of blocks) {
    const blockLines = proseBlockToLines(block);
    if (blockLines.length === 0) {
      continue;
    }
    if (lines.length > 0 && lines[lines.length - 1] !== "") {
      lines.push("");
    }
    lines.push(...blockLines);
  }
  return trimBlankLines(lines);
}

function proseBlockToLines(block: BlockAst): string[] {
  if (block.sourceLines && block.sourceLines.length > 0) {
    return block.sourceLines;
  }
  if (block.type === "paragraph") {
    return block.text ? block.text.split(/\r?\n/u) : [];
  }
  if (block.type === "code") {
    return ["```" + (block.lang ?? ""), ...block.text.split(/\r?\n/u), "```"];
  }
  if (block.type === "table") {
    if (block.rowSources.length > 0) {
      return block.rowSources.map((row) => row.raw);
    }
    return block.rows.map((row) => `| ${row.join(" | ")} |`);
  }
  return [];
}

function isSectionNotesHeading(block: BlockAst): boolean {
  return block.type === "heading" && block.depth === 3 && block.text.trim() === "Section Notes";
}

function appendEntityProseLines(entity: { overview?: string[]; notes?: string[] }, block: BlockAst, hasStructuredContent: boolean): void {
  if (hasStructuredContent) {
    appendEntityNoteLines(entity, block);
  } else {
    appendEntityOverviewLines(entity, block);
  }
}

function isEntityNoteBlock(block: BlockAst): boolean {
  return block.type === "paragraph"
    || block.type === "table"
    || block.type === "code"
    || block.type === "blockquote"
    || block.type === "thematicBreak"
    || block.type === "html";
}

function firstActionStructuredListItemLine(block: BlockAst): number | undefined {
  const item = listItems([block]).find((candidate) =>
    candidate.depth === 0 && /^(?:Triggered|From|Process(?:\s*:.*)?|Effects|Otherwise|Cases|When|Effect|Case|Else)\s*$/iu.test(candidate.text)
  );
  return item?.range?.start.line;
}

function isActionMalformedStructuredListBlock(block: BlockAst): boolean {
  return listItems([block]).some((item) => item.depth === 0 && looksLikeStructuredProperty(item.text));
}

function isActionProseListPrefix(block: BlockAst, line: number): boolean {
  return listItems([block])
    .filter((item) => item.depth === 0 && (item.range?.start.line ?? 1) < line)
    .every((item) => !looksLikeStructuredProperty(item.text));
}

function appendListProseBeforeLine(entity: { overview?: string[]; notes?: string[] }, block: BlockAst, line: number, hasStructuredContent: boolean): void {
  if (!block.sourceLines || block.sourceLines.length === 0 || !block.range || line <= block.range.start.line) {
    return;
  }
  const proseLines = trimBlankLines(block.sourceLines.slice(0, line - block.range.start.line));
  if (proseLines.length === 0) {
    return;
  }
  appendEntityProseLineGroup(entity, proseLines, hasStructuredContent);
}

function appendEntityProseLineGroup(entity: { overview?: string[]; notes?: string[] }, proseLines: string[], hasStructuredContent: boolean): void {
  const lines = hasStructuredContent ? (entity.notes ??= []) : (entity.overview ??= []);
  if (lines.length > 0 && lines[lines.length - 1] !== "") {
    lines.push("");
  }
  lines.push(...proseLines);
}

function appendEntityNoteLines(entity: { notes?: string[] }, block: BlockAst): void {
  const lines = entity.notes ??= [];
  appendEntityBlockLines(lines, block);
}

function appendEntityOverviewLines(entity: { overview?: string[] }, block: BlockAst): void {
  const lines = entity.overview ??= [];
  appendEntityBlockLines(lines, block);
}

function appendEntityBlockLines(lines: string[], block: BlockAst): void {
  if (lines.length > 0 && lines[lines.length - 1] !== "") {
    lines.push("");
  }

  if (block.sourceLines && block.sourceLines.length > 0) {
    lines.push(...block.sourceLines);
    return;
  }

  if (block.type === "code") {
    lines.push("```" + (block.lang ?? ""));
    lines.push(...block.text.split(/\r?\n/u));
    lines.push("```");
    return;
  }

  if (block.text) {
    lines.push(...block.text.split(/\r?\n/u));
  }
}

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

function listItems(blocks: BlockAst[], depth = 0): ListItemView[] {
  const items: ListItemView[] = [];
  for (const block of blocks) {
    if (block.type === "list") {
      items.push(...listItems(block.children, depth));
      continue;
    }
    if (block.type === "listItem") {
      const effectiveDepth = depth === 0 && (block.range?.start.column ?? 1) > 1 ? block.range?.start.column ?? depth : depth;
      items.push({ text: block.text, depth: effectiveDepth, range: block.range });
      items.push(...listItems(block.children, depth + 1));
    }
  }
  return items;
}

function locationFromBlock(block: Pick<BlockAst, "range"> | ListItemView): SourceLocation {
  return { line: block.range?.start.line ?? 1 };
}

function splitKeyValue(text: string): [string, string | undefined] {
  const match = /^([^:]+):\s*(.*)$/.exec(text);
  if (!match) {
    return [text, undefined];
  }
  return [match[1], match[2]];
}

function parsedBulletFromListItem(item: ListItemView): ParsedBullet {
  return {
    text: item.text,
    indent: item.depth,
    location: locationFromBlock(item)
  };
}

function addPropertyLocation(locations: Record<string, SourceLocation[]>, key: string, location: SourceLocation): void {
  const existing = locations[key] ?? [];
  existing.push(location);
  locations[key] = existing;
}
