import type {
  MarkVSpecDiagnostic,
  MarkVSpecElement,
  MarkVSpecEventDispatch,
  MarkVSpecErrorCode,
  MarkVSpecFormGroup,
  MarkVSpecHistoryEntry,
  MarkVSpecHistoryFieldSchema,
  MarkVSpecHistoryFieldType,
  MarkVSpecModelSampleRow,
  MarkVSpecModelSampleSet,
  MarkVSpecModelSampleGroup,
  MarkVSpecNoteSection,
  MarkVSpecPreviewScenario,
  MarkVSpecRule,
  MarkVSpecSampleRow,
  MarkVSpecSectionProse,
  MarkVSpecState,
  MarkVSpecValidationRule,
  MarkVSpecViewContextDefinition,
  MarkVSpecViewContextSample,
  SourceLocation
} from "./types.js";
import {
  parseActionSectionSemantics as parseActionSectionSemanticsWithSupport,
  type ActionSectionSemanticResult,
  type ActionSemanticResult
} from "./action-section-semantic.js";
export type { ActionSectionSemanticResult, ActionSemanticResult } from "./action-section-semantic.js";
import {
  parseLayoutSectionSemantics as parseLayoutSectionSemanticsWithSupport,
  type LayoutSectionSemanticResult,
  type LayoutSemanticResult
} from "./layout-section-semantic.js";
export type { LayoutSectionSemanticResult, LayoutSemanticResult } from "./layout-section-semantic.js";
import {
  parsePreviewScenariosSection,
  type PreviewScenarioSectionSemanticSupport
} from "./preview-scenario-section-semantic.js";
import { actionIdPattern, elementIdPattern, formGroupIdPattern } from "./ids.js";
import type { MarkdownDocument } from "./markdown-document.js";
import {
  collectSectionAst,
  sectionBodyLines,
  type BlockAst,
  type SectionAst,
  type SectionKind
} from "./markdown-section-ast.js";
import { filterLinesWithoutStandaloneHtmlComments, isStandaloneHtmlCommentBlock } from "./markdown-html-comments.js";
import { createMarkVSpecDiagnostic } from "./diagnostic-messages.js";
import { isMarkVSpecSourceType } from "./source-types.js";
import { addAccumulatedSectionProperty, addPropertyLocation } from "./section-property-accumulator.js";

export interface SemanticDependency {
  source: { type: "entity" | "section" | "render"; id: string };
  target: { type: "entity" | "section" | "render"; id: string };
  direction: "source-invalidates-target";
  kind: "references" | "renders" | "validates" | "derives";
}

export interface SectionSemanticMetadata {
  sectionId: string;
  kind: SectionKind;
  sectionProse: MarkVSpecSectionProse[];
  diagnostics: MarkVSpecDiagnostic[];
  dependencies: SemanticDependency[];
  renderKeys: string[];
}

export type SectionSemanticPayload =
  | { type: "states"; states: MarkVSpecState[] }
  | { type: "modelSamples"; modelSamples: MarkVSpecModelSampleSet[]; modelSampleGroups: MarkVSpecModelSampleGroup[] }
  | { type: "viewContexts"; viewContexts: MarkVSpecViewContextDefinition[] }
  | { type: "viewContextSamples"; viewContextSamples: MarkVSpecViewContextSample[] }
  | { type: "previewScenarios"; previewScenarios: MarkVSpecPreviewScenario[] }
  | { type: "formGroups"; formGroups: MarkVSpecFormGroup[] }
  | { type: "events"; events: MarkVSpecEventDispatch[] }
  | { type: "validations"; validations: MarkVSpecValidationRule[] }
  | { type: "rules"; rules: MarkVSpecRule[] }
  | { type: "errorCodes"; errorCodes: MarkVSpecErrorCode[] }
  | { type: "historyFields"; historyFields: MarkVSpecHistoryFieldSchema[] }
  | { type: "historyEntries"; historyEntries: MarkVSpecHistoryEntry[] }
  | { type: "notes"; notes: MarkVSpecNoteSection[] }
  | { type: "empty" };

export interface SectionSemanticResult extends SectionSemanticMetadata {
  metadata: SectionSemanticMetadata;
  payload: SectionSemanticPayload;
  /** @deprecated Use payload when reading section-owned state data. Kept for public compatibility. */
  states: MarkVSpecState[];
  /** @deprecated Use payload when reading section-owned model sample data. Kept for public compatibility. */
  modelSamples: MarkVSpecModelSampleSet[];
  /** @deprecated Use payload when reading section-owned model sample group data. Kept for public compatibility. */
  modelSampleGroups: MarkVSpecModelSampleGroup[];
  /** @deprecated Use payload when reading section-owned view context data. Kept for public compatibility. */
  viewContexts: MarkVSpecViewContextDefinition[];
  /** @deprecated Use payload when reading section-owned view context sample data. Kept for public compatibility. */
  viewContextSamples: MarkVSpecViewContextSample[];
  /** @deprecated Use payload when reading section-owned preview scenario data. Kept for public compatibility. */
  previewScenarios: MarkVSpecPreviewScenario[];
  /** @deprecated Use payload when reading section-owned form group data. Kept for public compatibility. */
  formGroups: MarkVSpecFormGroup[];
  /** @deprecated Use payload when reading section-owned event data. Kept for public compatibility. */
  events: MarkVSpecEventDispatch[];
  /** @deprecated Use payload when reading section-owned validation data. Kept for public compatibility. */
  validations: MarkVSpecValidationRule[];
  /** @deprecated Use payload when reading section-owned business rule data. Kept for public compatibility. */
  rules: MarkVSpecRule[];
  /** @deprecated Use payload when reading section-owned error code data. Kept for public compatibility. */
  errorCodes: MarkVSpecErrorCode[];
  /** @deprecated Use payload when reading section-owned history field data. Kept for public compatibility. */
  historyFields: MarkVSpecHistoryFieldSchema[];
  /** @deprecated Use payload when reading section-owned history entry data. Kept for public compatibility. */
  historyEntries: MarkVSpecHistoryEntry[];
  /** @deprecated Use payload when reading section-owned note data. Kept for public compatibility. */
  notes: MarkVSpecNoteSection[];
}

export type SectionSemanticCompatibilityValues = Pick<
  SectionSemanticResult,
  "states" | "modelSamples" | "modelSampleGroups" | "viewContexts" | "viewContextSamples" | "previewScenarios" | "formGroups" | "events" | "validations" | "rules" | "errorCodes" | "historyFields" | "historyEntries" | "notes"
>;

export type SectionSemanticValueKey = keyof SectionSemanticCompatibilityValues;

const sectionPayloadValueKeys = {
  states: ["states"],
  modelSamples: ["modelSamples", "modelSampleGroups"],
  viewContexts: ["viewContexts"],
  viewContextSamples: ["viewContextSamples"],
  previewScenarios: ["previewScenarios"],
  formGroups: ["formGroups"],
  events: ["events"],
  validations: ["validations"],
  rules: ["rules"],
  errorCodes: ["errorCodes"],
  historyFields: ["historyFields"],
  historyEntries: ["historyEntries"],
  notes: ["notes"],
  empty: []
} as const satisfies Record<SectionSemanticPayload["type"], readonly SectionSemanticValueKey[]>;

export interface SmallSectionSemanticResult {
  states: MarkVSpecState[];
  modelSamples: MarkVSpecModelSampleSet[];
  modelSampleGroups: MarkVSpecModelSampleGroup[];
  viewContexts: MarkVSpecViewContextDefinition[];
  viewContextSamples: MarkVSpecViewContextSample[];
  previewScenarios: MarkVSpecPreviewScenario[];
  formGroups: MarkVSpecFormGroup[];
  events: MarkVSpecEventDispatch[];
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

const optionElementTypes = new Set(["Select", "MultiSelect", "RadioGroup", "CheckboxGroup"]);
const tabItemPropertyKeys = new Set(["panel", "action", "active when"]);
const accordionItemPropertyKeys = new Set(["panel", "action", "open when"]);
const panelItemPropertyKeys = new Set([...tabItemPropertyKeys, ...accordionItemPropertyKeys]);
const actionMenuItemPropertyKeys = new Set(["action", "tone", "disabled when"]);
const previewScenarioSectionSemanticSupport: PreviewScenarioSectionSemanticSupport = {
  appendEntityProseLines,
  isEntityNoteBlock,
  isSectionNotesHeading,
  listItems,
  parsedBulletFromListItem,
  proseForSection,
  splitKeyValue
};

export function parseSmallSectionSemantics(document: MarkdownDocument): SmallSectionSemanticResult {
  const sections = collectSectionAst(document);
  const orderDiagnostics = semanticSectionOrderDiagnostics(sections);
  const sectionResults = sections
    .filter((section) => isSmallSemanticSection(section.kind))
    .map((section) => parseSmallSection(document, sections, section));
  const payloads = sectionResults.map((result) => result.payload);

  return {
    states: payloadValues(payloads, "states"),
    modelSamples: payloadValues(payloads, "modelSamples"),
    modelSampleGroups: payloadValues(payloads, "modelSampleGroups"),
    viewContexts: payloadValues(payloads, "viewContexts"),
    viewContextSamples: payloadValues(payloads, "viewContextSamples"),
    previewScenarios: payloadValues(payloads, "previewScenarios"),
    formGroups: payloadValues(payloads, "formGroups"),
    events: payloadValues(payloads, "events"),
    validations: payloadValues(payloads, "validations"),
    rules: payloadValues(payloads, "rules"),
    errorCodes: payloadValues(payloads, "errorCodes"),
    historyFields: payloadValues(payloads, "historyFields"),
    historyEntries: payloadValues(payloads, "historyEntries"),
    sectionProse: sectionResults.flatMap((result) => result.metadata.sectionProse),
    notes: payloadValues(payloads, "notes"),
    diagnostics: [...orderDiagnostics, ...sectionResults.flatMap((result) => result.metadata.diagnostics)],
    sectionResults
  };
}

const recommendedSectionOrder = "States, Layout:<viewport>/Slot:<name>, Slots, Elements, Form Groups, Events, Actions, View Context, View Context Samples, Preview Scenarios, Field Validations, Cross-field Validations, Validations, Business Rules, Error Codes, History Fields, History";

function semanticSectionOrderDiagnostics(sections: SectionAst[]): MarkVSpecDiagnostic[] {
  const diagnostics: MarkVSpecDiagnostic[] = [];
  let highestSectionRank = 0;

  for (const section of sections) {
    const rank = sectionOrderRank(section.kind);
    if (rank === 0) {
      continue;
    }
    if (rank < highestSectionRank) {
      diagnostics.push(createMarkVSpecDiagnostic(
        "warning",
        "section.recommendedOrder",
        { section: section.title, order: recommendedSectionOrder },
        section.heading.range.start.line
      ));
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
    case "Events":
      return 6;
    case "Actions":
      return 7;
    case "ViewContext":
      return 8;
    case "ViewContextSamples":
      return 9;
    case "PreviewScenarios":
      return 10;
    case "FieldValidations":
      return 11;
    case "CrossFieldValidations":
      return 12;
    case "Validations":
      return 13;
    case "BusinessRules":
      return 14;
    case "ErrorCodes":
      return 15;
    case "HistoryFields":
      return 16;
    case "History":
      return 17;
    case "ModelSamples":
    case "Unknown":
      return 0;
  }
}

export function parseLayoutSectionSemantics(document: MarkdownDocument): LayoutSemanticResult {
  return parseLayoutSectionSemanticsWithSupport(document, {
    isSectionNotesHeading,
    isEntityNoteBlock,
    appendEntityProseLines,
    listItems,
    parsedBulletFromListItem,
    locationFromBlock,
    splitKeyValue,
    addPropertyLocation,
    proseForSection,
    structuredSectionOwnershipDiagnostics,
    dedupeDependencies
  });
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
  return parseActionSectionSemanticsWithSupport(document, {
    isSectionNotesHeading,
    isEntityNoteBlock,
    appendEntityProseLines,
    appendListProseBeforeLine,
    listItems,
    parsedBulletFromListItem,
    locationFromBlock,
    looksLikeStructuredProperty,
    proseForSection,
    structuredSectionOwnershipDiagnostics,
    dedupeDependencies
  });
}

function isSmallSemanticSection(kind: SectionKind): boolean {
  return kind === "States" ||
    kind === "FormGroups" ||
    kind === "Events" ||
    kind === "ModelSamples" ||
    kind === "ViewContext" ||
    kind === "ViewContextSamples" ||
    kind === "PreviewScenarios" ||
    kind === "Validations" ||
    kind === "FieldValidations" ||
    kind === "CrossFieldValidations" ||
    kind === "BusinessRules" ||
    kind === "ErrorCodes" ||
    kind === "HistoryFields" ||
    kind === "History" ||
    kind === "Unknown";
}

function parseSmallSection(document: MarkdownDocument, sections: SectionAst[], section: SectionAst): SectionSemanticResult {
  switch (section.kind) {
    case "States":
      return resultFor(section, "states", parseStatesSection(section), ["states:list"]);
    case "FormGroups":
      return resultFor(section, "formGroups", parseFormGroupsSection(section), ["form-groups:list"]);
    case "Events":
      return resultFor(section, "events", parseEventsSection(section), ["events:list"]);
    case "ModelSamples":
      return resultFor(section, "modelSamples", unsupportedModelSamplesSection(section), ["unsupported:model-samples"]);
    case "ViewContext":
      return resultFor(section, "viewContexts", parseViewContextSection(section), ["view-context"]);
    case "ViewContextSamples":
      return resultFor(section, "viewContextSamples", parseViewContextSamplesSection(section), ["view-context-samples"]);
    case "PreviewScenarios":
      return resultFor(
        section,
        "previewScenarios",
        parsePreviewScenariosSection(section, previewScenarioSectionSemanticSupport),
        ["preview-scenarios"]
      );
    case "Validations":
      return resultFor(section, "validations", parseValidationsSection(section), ["validations:list"]);
    case "FieldValidations":
      return resultFor(section, "validations", parseValidationsSection(section), ["validations:list"]);
    case "CrossFieldValidations":
      return resultFor(section, "validations", parseValidationsSection(section), ["validations:list"]);
    case "BusinessRules":
      return resultFor(section, "rules", parseRulesSection(section), ["rules:list"]);
    case "ErrorCodes":
      return resultFor(section, "errorCodes", parseErrorCodesSection(section), ["error-codes:list"]);
    case "HistoryFields":
      return resultFor(section, "historyFields", parseHistoryFieldsSection(document, sections, section), ["history-fields:list"]);
    case "History":
      return resultFor(section, "historyEntries", parseHistorySection(document, sections, section), ["history:list"]);
    case "Unknown":
      return resultFor(section, "notes", { notes: [parseNoteSection(document, sections, section)] }, [`notes:${section.id}`]);
    default:
      return resultFor(section, "empty", {}, []);
  }
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
  let currentSampleRow: MarkVSpecSampleRow | undefined;
  let currentSelectOption: MarkVSpecElement["selectOptions"][number] | undefined;
  let currentTabItem: MarkVSpecElement["tabs"][number] | undefined;
  let currentAccordionItem: MarkVSpecElement["accordionItems"][number] | undefined;
  let currentActionMenuItem: MarkVSpecElement["actionMenuItems"][number] | undefined;
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
        currentSampleRow = undefined;
        currentSelectOption = undefined;
        currentTabItem = undefined;
        currentAccordionItem = undefined;
        currentActionMenuItem = undefined;
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
        propertyMetadata: {},
        propertyLocations: {
          ...(heading[1] ? { marker: [headingLocation] } : {}),
          ...(parsedType.required ? { required: [headingLocation] } : {})
        },
        routeParams: [],
        selectOptions: [],
        tabs: [],
        accordionItems: [],
        actionMenuItems: [],
        tableColumns: [],
        tableRows: [],
        visibleWhen: [],
        hiddenWhen: [],
        disabledWhen: [],
        openWhen: [],
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
      currentSampleRow = undefined;
      currentTabItem = undefined;
      currentAccordionItem = undefined;
      currentActionMenuItem = undefined;
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
        currentSampleRow = undefined;
        currentTabItem = undefined;
        currentAccordionItem = undefined;
        currentActionMenuItem = undefined;
      }
      const bulletResult = applyElementSemanticBullet(currentElement, bullet, currentElementNestedProperty, currentTableColumn, currentTableRow, currentSampleRow, currentTabItem, currentAccordionItem, currentActionMenuItem, diagnostics, dependencies);
      currentElementNestedProperty = bulletResult.nestedProperty;
      if (currentElementNestedProperty === "Columns" && bullet.indent > 0 && !isTableColumnMetadataBullet(bullet)) {
        currentTableColumn = currentElement.tableColumns[currentElement.tableColumns.length - 1];
      }
      if (currentElementNestedProperty === "Sample Rows" && bullet.indent > 0 && bullet.text === "Row") {
        currentTableRow = currentElement.tableRows[currentElement.tableRows.length - 1];
      }
      if (bulletResult.sampleRow) {
        currentSampleRow = bulletResult.sampleRow;
      }
      if (bulletResult.selectOption) {
        currentSelectOption = bulletResult.selectOption;
      } else if (currentElementNestedProperty !== "options" || bullet.indent <= 1) {
        currentSelectOption = currentElementNestedProperty === "options" ? currentSelectOption : undefined;
      }
      if (currentElementNestedProperty === "options" && currentSelectOption && bullet.indent > 1) {
        applyDisplayValueMetadata(currentSelectOption, "option", bullet, diagnostics, currentElement.id);
      }
      if (bulletResult.tabItem) {
        currentTabItem = bulletResult.tabItem;
      } else if (currentElementNestedProperty !== "items" || bullet.indent <= 1) {
        currentTabItem = currentElementNestedProperty === "items" ? currentTabItem : undefined;
      }
      if (bulletResult.accordionItem) {
        currentAccordionItem = bulletResult.accordionItem;
      } else if (currentElementNestedProperty !== "items" || bullet.indent <= 1) {
        currentAccordionItem = currentElementNestedProperty === "items" ? currentAccordionItem : undefined;
      }
      if (bulletResult.actionMenuItem) {
        currentActionMenuItem = bulletResult.actionMenuItem;
      } else if (currentElementNestedProperty !== "items" || bullet.indent <= 1) {
        currentActionMenuItem = currentElementNestedProperty === "items" ? currentActionMenuItem : undefined;
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
  sampleRow: MarkVSpecSampleRow | undefined,
  tabItem: MarkVSpecElement["tabs"][number] | undefined,
  accordionItem: MarkVSpecElement["accordionItems"][number] | undefined,
  actionMenuItem: MarkVSpecElement["actionMenuItems"][number] | undefined,
  diagnostics: MarkVSpecDiagnostic[],
  dependencies: SemanticDependency[]
): { nestedProperty: string | undefined; sampleRow?: MarkVSpecSampleRow; selectOption?: MarkVSpecElement["selectOptions"][number]; tabItem?: MarkVSpecElement["tabs"][number]; accordionItem?: MarkVSpecElement["accordionItems"][number]; actionMenuItem?: MarkVSpecElement["actionMenuItems"][number] } {
  if (bullet.indent > 0) {
    if (element.type === "Tabs" && nestedProperty === "items") {
      if (bullet.indent === 1) {
        const item = parsePanelItem(bullet);
        element.tabs.push(item);
        return { nestedProperty, tabItem: item };
      }
      if (bullet.indent === 2 && tabItem) {
        applyPanelItemProperty(tabItem, bullet, diagnostics, element.id, "tab item");
        addPanelItemDependency(element, bullet, dependencies);
      }
      return { nestedProperty };
    }

    if (element.type === "Accordion" && nestedProperty === "items") {
      if (bullet.indent === 1) {
        const item = parsePanelItem(bullet);
        element.accordionItems.push(item);
        return { nestedProperty, accordionItem: item };
      }
      if (bullet.indent === 2 && accordionItem) {
        applyPanelItemProperty(accordionItem, bullet, diagnostics, element.id, "accordion item");
        addPanelItemDependency(element, bullet, dependencies);
      }
      return { nestedProperty };
    }

    if (element.type === "ActionMenu" && nestedProperty === "items") {
      if (bullet.indent === 1) {
        const item = parseActionMenuItem(bullet);
        element.actionMenuItems.push(item);
        return { nestedProperty, actionMenuItem: item };
      }
      if (bullet.indent === 2 && actionMenuItem) {
        applyActionMenuItemProperty(actionMenuItem, bullet, diagnostics, element.id);
        addActionMenuItemDependency(element, bullet, dependencies);
      }
      return { nestedProperty };
    }

    if (optionElementTypes.has(element.type) && nestedProperty === "options") {
      if (bullet.indent > 1) {
        return { nestedProperty };
      }
      const option = parseElementOption(bullet);
      element.selectOptions.push(option);
      return { nestedProperty, selectOption: option };
    }

    if (isDisplayValueProperty(nestedProperty) && isDisplayValueMetadataKey(bullet.text)) {
      applyDisplayValueMetadata(element, nestedProperty, bullet, diagnostics, element.id);
      return { nestedProperty };
    }

    if (isDisplayValueMetadataKey(bullet.text)) {
      diagnostics.push({
        severity: "warning",
        message: `Element ${element.id} metadata ${splitKeyValue(bullet.text)[0].trim()} must be nested under a display value property such as value, label, placeholder, text, message, hint, href, src, or alt.`,
        line: bullet.location.line
      });
      return { nestedProperty };
    }

    if (element.type === "Table" && nestedProperty === "Columns" && tableColumn && isTableColumnMetadataBullet(bullet)) {
      applyTableColumnMetadata(tableColumn, bullet);
      return { nestedProperty };
    }

    if (element.type === "Table" && nestedProperty === "Columns") {
      element.tableColumns.push(parseTableColumn(bullet));
      return { nestedProperty };
    }

    if (element.type === "Table" && nestedProperty === "Sample Rows") {
      if (bullet.text === "Row") {
        element.tableRows.push({
          cells: [],
          location: bullet.location,
          raw: bullet.text
        });
        return { nestedProperty };
      }

      if (tableRow) {
        tableRow.cells.push(parseTableCell(bullet));
        return { nestedProperty };
      }
    }

    if (nestedProperty === "sample rows") {
      const parsedRow = applySampleRowsBullet(element, bullet, sampleRow, diagnostics);
      return { nestedProperty, ...(parsedRow ? { sampleRow: parsedRow } : {}) };
    }

    if (nestedProperty === "params") {
      applyElementRouteParamBullet(element, bullet);
      addElementRouteParamDependency(element, bullet, dependencies);
      return { nestedProperty };
    }

    if (nestedProperty === "input rule") {
      element.inputRules.push(parseElementInputRule(bullet));
      return { nestedProperty };
    }

    diagnostics.push({
      severity: "warning",
      message: `Element ${element.id} has indented property entry: ${bullet.text}. Use an unindented list item.`,
      line: bullet.location.line
    });
    return { nestedProperty };
  }

  const [propertyKey, propertyValue] = splitKeyValue(bullet.text);
  const nextNestedProperty = propertyKey.trim();
  const isEmptyNestedValue = propertyValue !== undefined && propertyValue.trim() === "";
  if (isEmptyNestedValue && nextNestedProperty === "params") {
    return { nestedProperty: nextNestedProperty };
  }
  if (nextNestedProperty === "input rule" && isEmptyNestedValue) {
    element.properties["input rule"] = true;
    addPropertyLocation(element.propertyLocations, "input rule", bullet.location);
    return { nestedProperty: nextNestedProperty };
  }
  if (nextNestedProperty === "sample rows") {
    const value = propertyValue?.trim();
    element.properties["sample rows"] = value === "[]" ? "[]" : true;
    addPropertyLocation(element.propertyLocations, "sample rows", bullet.location);
    element.sampleRows = {
      rows: [],
      explicitEmpty: value === "[]",
      location: bullet.location
    };
    return isEmptyNestedValue ? { nestedProperty: nextNestedProperty } : { nestedProperty: undefined };
  }
  if (element.type === "Table" && isEmptyNestedValue && isTableNestedProperty(nextNestedProperty)) {
    return { nestedProperty: nextNestedProperty };
  }
  if (optionElementTypes.has(element.type) && isEmptyNestedValue && nextNestedProperty === "options") {
    return { nestedProperty: nextNestedProperty };
  }
  if (element.type === "Tabs" && isEmptyNestedValue && nextNestedProperty === "items") {
    element.properties["items"] = true;
    addPropertyLocation(element.propertyLocations, "items", bullet.location);
    return { nestedProperty: nextNestedProperty };
  }
  if (element.type === "Accordion" && isEmptyNestedValue && nextNestedProperty === "items") {
    element.properties["items"] = true;
    addPropertyLocation(element.propertyLocations, "items", bullet.location);
    return { nestedProperty: nextNestedProperty };
  }
  if (element.type === "ActionMenu" && isEmptyNestedValue && nextNestedProperty === "items") {
    element.properties["items"] = true;
    addPropertyLocation(element.propertyLocations, "items", bullet.location);
    return { nestedProperty: nextNestedProperty };
  }

  applyElementBullet(element, bullet, diagnostics);
  addElementBulletDependencies(element, bullet, dependencies);
  return isDisplayValueProperty(nextNestedProperty) ? { nestedProperty: nextNestedProperty } : { nestedProperty: undefined };
}

function resultFor(
  section: SectionAst,
  payloadType: SectionSemanticPayload["type"],
  values: Partial<SectionSemanticCompatibilityValues & Pick<SectionSemanticResult, "sectionProse" | "diagnostics" | "dependencies">>,
  renderKeys: string[]
): SectionSemanticResult {
  const diagnostics = [
    ...(values.diagnostics ?? []),
    ...structuredSectionOwnershipDiagnostics(section)
  ];
  const payload = sectionPayload(payloadType, values);
  const compatibility = compatibilityValuesForPayload(payload);
  const metadata: SectionSemanticMetadata = {
    sectionId: section.id,
    kind: section.kind,
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
  return {
    ...metadata,
    metadata,
    payload,
    states: compatibility.states,
    modelSamples: compatibility.modelSamples,
    modelSampleGroups: compatibility.modelSampleGroups,
    viewContexts: compatibility.viewContexts,
    viewContextSamples: compatibility.viewContextSamples,
    previewScenarios: compatibility.previewScenarios,
    formGroups: compatibility.formGroups,
    events: compatibility.events,
    validations: compatibility.validations,
    rules: compatibility.rules,
    errorCodes: compatibility.errorCodes,
    historyFields: compatibility.historyFields,
    historyEntries: compatibility.historyEntries,
    notes: compatibility.notes
  };
}

function sectionPayload(
  type: SectionSemanticPayload["type"],
  values: Partial<SectionSemanticCompatibilityValues>
): SectionSemanticPayload {
  const payload = { type } as { type: SectionSemanticPayload["type"] } & Partial<SectionSemanticCompatibilityValues>;
  const mutablePayload = payload as Record<SectionSemanticValueKey, unknown>;
  for (const key of sectionPayloadValueKeys[type]) {
    mutablePayload[key] = values[key] ?? [];
  }
  return payload as SectionSemanticPayload;
}

function compatibilityValuesForPayload(payload: SectionSemanticPayload): SectionSemanticCompatibilityValues {
  const values = emptySectionSemanticCompatibilityValues();
  const mutableValues = values as Record<SectionSemanticValueKey, unknown>;
  const payloadValues = payload as Partial<Record<SectionSemanticValueKey, unknown>>;
  for (const key of sectionPayloadValueKeys[payload.type]) {
    mutableValues[key] = payloadValues[key] ?? [];
  }
  return values;
}

function emptySectionSemanticCompatibilityValues(): SectionSemanticCompatibilityValues {
  return {
    states: [],
    modelSamples: [],
    modelSampleGroups: [],
    viewContexts: [],
    viewContextSamples: [],
    previewScenarios: [],
    formGroups: [],
    events: [],
    validations: [],
    rules: [],
    errorCodes: [],
    historyFields: [],
    historyEntries: [],
    notes: []
  };
}

export function sectionSemanticPayloadValues<TKey extends SectionSemanticValueKey>(
  payloads: SectionSemanticPayload[],
  key: TKey
): SectionSemanticCompatibilityValues[TKey] {
  return payloads.flatMap((payload) => payloadValue(payload, key) as unknown[]) as SectionSemanticCompatibilityValues[TKey];
}

function payloadValues<TKey extends SectionSemanticValueKey>(
  payloads: SectionSemanticPayload[],
  key: TKey
): SectionSemanticCompatibilityValues[TKey] {
  return sectionSemanticPayloadValues(payloads, key);
}

function payloadValue<TKey extends SectionSemanticValueKey>(
  payload: SectionSemanticPayload,
  key: TKey
): SectionSemanticCompatibilityValues[TKey] {
  if (!(sectionPayloadValueKeys[payload.type] as readonly SectionSemanticValueKey[]).includes(key)) {
    return [] as SectionSemanticCompatibilityValues[TKey];
  }
  return ((payload as Partial<Record<SectionSemanticValueKey, unknown>>)[key] ?? []) as SectionSemanticCompatibilityValues[TKey];
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

function parseEventsSection(section: SectionAst): Pick<SectionSemanticResult, "events" | "sectionProse" | "diagnostics"> {
  const events: MarkVSpecEventDispatch[] = [];
  const diagnostics: MarkVSpecDiagnostic[] = [];

  for (const item of listItems(section.blocks)) {
    const location = locationFromBlock(item);
    if (item.depth > 0) {
      diagnostics.push({
        severity: "warning",
        message: `Event entry has nested content that is ignored: ${item.text}.`,
        line: location.line
      });
      continue;
    }

    const [eventName, actionId] = splitKeyValue(item.text);
    if (actionId === undefined || actionId.trim().length === 0) {
      diagnostics.push({
        severity: "warning",
        message: `Malformed event entry: ${item.text}. Expected - page.load: A-ActionId or - partial.render: A-ActionId.`,
        line: location.line
      });
      continue;
    }

    events.push({
      event: eventName.trim(),
      actionId: actionId.trim(),
      location,
      raw: item.text
    });
  }

  return {
    events,
    sectionProse: listSectionProse(section, ["events:list"]),
    diagnostics
  };
}

function parseStateText(text: string, location: SourceLocation, diagnostics: MarkVSpecDiagnostic[]): MarkVSpecState {
  const stateText = text.trim();
  const suffixMatch = /([*+]+)$/u.exec(stateText);
  const suffix = suffixMatch?.[1] ?? "";
  const initial = suffix.includes("*");
  const preInitial = suffix.includes("+");
  const name = suffix ? stateText.slice(0, -suffix.length).trim() : stateText;
  if (suffix.includes("*") && suffix.includes("+")) {
    diagnostics.push({
      severity: "error",
      message: `State ${stateText} cannot be marked both pre-initial and initial.`,
      line: location.line
    });
  }
  if ((suffix.match(/\*/gu)?.length ?? 0) > 1 || (suffix.match(/\+/gu)?.length ?? 0) > 1) {
    diagnostics.push({
      severity: "error",
      message: `State ${stateText} has multiple state suffix markers.`,
      line: location.line
    });
  }
  if (!initial && stateText.includes("*")) {
    diagnostics.push({
      severity: "error",
      message: `State ${stateText} uses * outside the end of the state name.`,
      line: location.line
    });
  }
  if (!preInitial && stateText.includes("+")) {
    diagnostics.push({
      severity: "error",
      message: `State ${stateText} uses + outside the end of the state name.`,
      line: location.line
    });
  }
  return {
    name,
    initial,
    ...(preInitial ? { preInitial } : {}),
    location,
    raw: text
  };
}

function unsupportedModelSamplesSection(section: SectionAst): Pick<SectionSemanticResult, "modelSamples" | "modelSampleGroups" | "sectionProse" | "diagnostics" | "dependencies"> {
  return {
    modelSamples: [],
    modelSampleGroups: [],
    sectionProse: [],
    diagnostics: [{
      severity: "warning",
      message: "## Model Samples is no longer canonical. Use Element sample rows or Preview Scenario samples instead.",
      line: section.heading.range.start.line
    }],
    dependencies: []
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

function parseValidationsSection(section: SectionAst): Pick<SectionSemanticResult, "validations" | "sectionProse" | "dependencies"> {
  const validations: MarkVSpecValidationRule[] = [];
  const dependencies: SemanticDependency[] = [];
  const sectionScope = validationScopeForSection(section.kind);
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
      const match = /^(?:(?<marker>\S+?):)?(?<id>V-[\p{L}\p{N}-]+)(?:\s+(?<name>.+?))?\s*$/u.exec(block.text);
      if (!match) {
        current = undefined;
        currentHasStructuredContent = false;
        continue;
      }
      const id = match.groups?.id ?? block.text.split(/\s+/u)[0] ?? block.text;
      const marker = match.groups?.marker;
      current = {
        id,
        name: match.groups?.name,
        bullets: [],
        rules: [],
        properties: {
          ...(marker ? { marker } : {}),
          ...(sectionScope ? { scope: sectionScope } : {}),
          ...(sectionScope ? { run: "client" } : {})
        },
        propertyLocations: {
          ...(marker ? { marker: [locationFromBlock(block)] } : {}),
          ...(sectionScope ? { scope: [locationFromBlock(block)], run: [locationFromBlock(block)] } : {})
        },
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
      let activeStructuredKey: string | undefined;
      let activeRule: MarkVSpecValidationRule["rules"][number] | undefined;
      for (const item of listItems([block])) {
        const bullet = parsedBulletFromListItem(item);
        if (item.depth === 0) {
          activeRule = undefined;
          const [key] = splitKeyValue(bullet.text);
          activeStructuredKey = key.trim();
          applyValidationBullet(current, bullet.text, bullet.location);
          continue;
        }

        if (activeStructuredKey === "rules" || activeStructuredKey === "constraints") {
          if (item.depth === 1) {
            const [namePart, valuePart] = splitKeyValue(bullet.text);
            const name = namePart.trim();
            const targets = valuePart?.trim() ? [valuePart.trim()] : [];
            activeRule = {
              name,
              targets,
              location: bullet.location,
              raw: bullet.text
            };
            current.rules.push(activeRule);
          } else if (activeRule) {
            const [childKey, childValue] = splitKeyValue(bullet.text);
            if (childKey.trim() === "message" && childValue !== undefined) {
              addAccumulatedSectionProperty(current, "message", childValue.trim(), bullet.location);
            } else if (childKey.trim() === "messages" && childValue !== undefined) {
              addAccumulatedSectionProperty(current, "message", childValue.trim(), bullet.location);
            } else {
              activeRule.targets.push(bullet.text.trim());
            }
          }
        } else if (activeStructuredKey === "inputs") {
          if (item.depth === 1) {
            addAccumulatedSectionProperty(current, "input", bullet.text.trim(), bullet.location);
          }
        } else if (item.depth === 1 && activeStructuredKey === "messages") {
          addAccumulatedSectionProperty(current, "message", bullet.text.trim(), bullet.location);
        } else if (item.depth === 1 && activeStructuredKey === "message") {
          addAccumulatedSectionProperty(current, "message", bullet.text.trim(), bullet.location);
        } else if (item.depth === 1 && activeStructuredKey === "target") {
          addAccumulatedSectionProperty(current, "target", bullet.text.trim(), bullet.location);
        } else if (item.depth === 1 && activeStructuredKey === "check") {
          const [childKey, childValue] = splitKeyValue(bullet.text);
          if (childKey.trim() === "message" && childValue !== undefined) {
            addAccumulatedSectionProperty(current, "message", childValue.trim(), bullet.location);
          } else if (activeRule) {
            activeRule.targets.push(bullet.text.trim());
          }
        }
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

function validationScopeForSection(kind: SectionKind): "field" | "cross-field" | undefined {
  if (kind === "FieldValidations") {
    return "field";
  }
  if (kind === "CrossFieldValidations") {
    return "cross-field";
  }
  return undefined;
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
      const match = new RegExp(String.raw`^(?:(?<marker>\S+?):)?(?<id>${formGroupIdPattern})(?:\s+(?<name>.+?))?\s*$`, "u").exec(block.text);
      if (!match) {
        current = undefined;
        nestedProperty = undefined;
        currentHasStructuredContent = false;
        continue;
      }
      const marker = match.groups?.marker;
      current = {
        id: match.groups?.id ?? block.text.split(/\s+/u)[0] ?? block.text,
        name: match.groups?.name,
        fields: [],
        properties: marker ? { marker } : {},
        propertyLocations: marker ? { marker: [locationFromBlock(block)] } : {},
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
      const match = /^(?:(\S+?):)?(ERR-[\p{L}\p{N}-]+)(?:\s+(.+?))?\s*$/u.exec(block.text);
      if (!match) {
        current = undefined;
        currentHasStructuredContent = false;
        continue;
      }
      current = {
        id: match[2],
        name: match[3],
        bullets: [],
        properties: match[1] ? { marker: match[1] } : {},
        propertyLocations: match[1] ? { marker: [locationFromBlock(block)] } : {},
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

  for (const line of sectionBodyLinesWithoutStandaloneHtmlComments(document, sections, section)) {
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
  const lines = sectionBodyLinesWithoutStandaloneHtmlComments(document, sections, section);
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
    return block.depth === 3 && new RegExp(String.raw`^(?:\S+?:)?${formGroupIdPattern}(?:\s+.+?)?\s*$`, "u").test(block.text);
  }
  if (section.kind === "Validations" || section.kind === "FieldValidations" || section.kind === "CrossFieldValidations") {
    return block.depth === 3 && /^(?:\S+?:)?V-[\p{L}\p{N}-]+(?:\s+.+?)?\s*$/u.test(block.text);
  }
  if (section.kind === "ErrorCodes") {
    return block.depth === 3 && /^(?:\S+?:)?ERR-[\p{L}\p{N}-]+(?:\s+.+?)?\s*$/u.test(block.text);
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
    || kind === "FieldValidations"
    || kind === "CrossFieldValidations"
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
  } else if (normalizedKey === "open when") {
    element.openWhen.push(normalizedValue);
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

function parsePanelItem(bullet: ParsedBullet): MarkVSpecElement["tabs"][number] {
  return {
    label: bullet.text.trim(),
    activeWhen: [],
    openWhen: [],
    propertyLocations: { panel: [], action: [], "active when": [], "open when": [] },
    location: bullet.location,
    raw: bullet.text
  };
}

function parseActionMenuItem(bullet: ParsedBullet): MarkVSpecElement["actionMenuItems"][number] {
  return {
    label: bullet.text.trim(),
    disabledWhen: [],
    propertyLocations: { action: [], tone: [], "disabled when": [] },
    location: bullet.location,
    raw: bullet.text
  };
}

function applyPanelItemProperty(
  item: MarkVSpecElement["tabs"][number],
  bullet: ParsedBullet,
  diagnostics: MarkVSpecDiagnostic[],
  elementId: string,
  itemKind: string
): void {
  const [key, value] = splitKeyValue(bullet.text);
  const normalizedKey = key.trim();
  const allowedKeys = itemKind === "tab item" ? tabItemPropertyKeys : accordionItemPropertyKeys;
  if (!allowedKeys.has(normalizedKey)) {
    const allowedText = [...allowedKeys].join(", ");
    diagnostics.push({
      severity: "warning",
      message: `Element ${elementId} ${itemKind} ${item.label} has unsupported property ${normalizedKey}. Use ${allowedText}.`,
      line: bullet.location.line
    });
    return;
  }
  const normalizedValue = value?.trim() ?? "";
  if (!normalizedValue) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${elementId} ${itemKind} ${item.label} property ${normalizedKey} must have a value.`,
      line: bullet.location.line
    });
    return;
  }
  if (normalizedKey === "active when") {
    item.activeWhen.push(normalizedValue);
  } else if (normalizedKey === "open when") {
    item.openWhen.push(normalizedValue);
  } else {
    item[normalizedKey as "panel" | "action"] = normalizedValue;
  }
  item.propertyLocations[normalizedKey as "panel" | "action" | "active when" | "open when"].push(bullet.location);
}

function applyActionMenuItemProperty(
  item: MarkVSpecElement["actionMenuItems"][number],
  bullet: ParsedBullet,
  diagnostics: MarkVSpecDiagnostic[],
  elementId: string
): void {
  const [key, value] = splitKeyValue(bullet.text);
  const normalizedKey = key.trim();
  if (!actionMenuItemPropertyKeys.has(normalizedKey)) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${elementId} action menu item ${item.label} has unsupported property ${normalizedKey}. Use action, tone, or disabled when.`,
      line: bullet.location.line
    });
    return;
  }
  const normalizedValue = value?.trim() ?? "";
  if (!normalizedValue) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${elementId} action menu item ${item.label} property ${normalizedKey} must have a value.`,
      line: bullet.location.line
    });
    return;
  }
  if (normalizedKey === "disabled when") {
    item.disabledWhen.push(normalizedValue);
  } else {
    item[normalizedKey as "action" | "tone"] = normalizedValue;
  }
  item.propertyLocations[normalizedKey as "action" | "tone" | "disabled when"].push(bullet.location);
}

const displayValueProperties = new Set([
  "value",
  "label",
  "placeholder",
  "text",
  "message",
  "hint",
  "href",
  "src",
  "alt"
]);

function isDisplayValueProperty(property: string | undefined): property is string {
  return Boolean(property && displayValueProperties.has(property));
}

function isDisplayValueMetadataKey(text: string): boolean {
  const [key] = splitKeyValue(text);
  return ["kind", "source", "format"].includes(key.trim());
}

function applyDisplayValueMetadata(
  target: MarkVSpecElement | MarkVSpecElement["selectOptions"][number],
  property: string,
  bullet: ParsedBullet,
  diagnostics: MarkVSpecDiagnostic[],
  elementId: string
): void {
  const [key, value] = splitKeyValue(bullet.text);
  const normalizedKey = key.trim();
  if (!["kind", "source", "format"].includes(normalizedKey)) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${elementId} display value property ${property} has unsupported metadata ${normalizedKey}. Use kind, source, or format.`,
      line: bullet.location.line
    });
    return;
  }

  const normalizedValue = value?.trim() ?? "";
  if (normalizedKey === "kind" && !isMarkVSpecSourceType(normalizedValue)) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${elementId} display value property ${property} has unknown kind ${normalizedValue}. Use fixed, i18n, data, route, element, asset, external, or computed.`,
      line: bullet.location.line
    });
  }
  if (normalizedKey === "source" && normalizedValue.length === 0) {
    diagnostics.push({
      severity: "warning",
      message: `Element ${elementId} display value property ${property} has empty source metadata.`,
      line: bullet.location.line
    });
  }

  const metadata = "propertyMetadata" in target
    ? (target.propertyMetadata[property] ?? { locations: {} })
    : (target.metadata ?? { locations: {} });
  if (normalizedKey === "kind" || normalizedKey === "source" || normalizedKey === "format") {
    metadata[normalizedKey] = normalizedValue;
    metadata.locations[normalizedKey] = bullet.location;
  }
  if ("propertyMetadata" in target) {
    target.propertyMetadata[property] = metadata;
  } else {
    target.metadata = metadata;
  }
}

function applySampleRowsBullet(
  element: MarkVSpecElement,
  bullet: ParsedBullet,
  currentRow: MarkVSpecSampleRow | undefined,
  diagnostics: MarkVSpecDiagnostic[]
): MarkVSpecSampleRow | undefined {
  const [key, value] = splitKeyValue(bullet.text);
  const normalizedKey = key.trim();
  const normalizedValue = value?.trim();
  const sampleRows = element.sampleRows ?? {
    rows: [],
    explicitEmpty: false,
    location: bullet.location
  };
  element.sampleRows = sampleRows;

  if (bullet.indent === 1 && normalizedKey === "row" && (normalizedValue === undefined || normalizedValue === "")) {
    const row: MarkVSpecSampleRow = {
      fields: {},
      fieldLocations: {},
      location: bullet.location,
      raw: bullet.text
    };
    sampleRows.rows.push(row);
    sampleRows.explicitEmpty = false;
    return row;
  }

  if (bullet.indent > 1 && currentRow) {
    currentRow.fields[normalizedKey] = normalizedValue ?? "";
    addPropertyLocation(currentRow.fieldLocations, normalizedKey, bullet.location);
    currentRow.raw = `${currentRow.raw}\n${bullet.text}`;
    return currentRow;
  }

  diagnostics.push({
    severity: "warning",
    message: `Element ${element.id} sample rows entry must use row: with indented field entries.`,
    line: bullet.location.line
  });
  return currentRow;
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
  if ((element.type === "Popover" || element.type === "Tooltip") && normalizedKey === "anchor") {
    dependencies.push({
      source: { type: "entity", id: element.id },
      target: { type: "entity", id: normalizedValue },
      direction: "source-invalidates-target",
      kind: "references"
    });
  }
  if (normalizedKey === "visible when" || normalizedKey === "hidden when" || normalizedKey === "disabled when" || normalizedKey === "open when") {
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

function addPanelItemDependency(element: MarkVSpecElement, bullet: ParsedBullet, dependencies: SemanticDependency[]): void {
  const [key, value] = splitKeyValue(bullet.text);
  const target = value?.trim();
  if (!target || !panelItemPropertyKeys.has(key.trim())) {
    return;
  }
  dependencies.push({
    source: { type: "entity", id: element.id },
    target: { type: "entity", id: target },
    direction: "source-invalidates-target",
    kind: "references"
  });
}

function addActionMenuItemDependency(element: MarkVSpecElement, bullet: ParsedBullet, dependencies: SemanticDependency[]): void {
  const [key, value] = splitKeyValue(bullet.text);
  const target = value?.trim();
  if (!target || key.trim() !== "action") {
    return;
  }
  dependencies.push({
    source: { type: "entity", id: element.id },
    target: { type: "entity", id: target },
    direction: "source-invalidates-target",
    kind: "references"
  });
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
  addAccumulatedSectionProperty(validation, normalizedKey, normalizedValue, location);
}

function applyFormGroupBullet(formGroup: MarkVSpecFormGroup, text: string, location: SourceLocation): string | undefined {
  formGroup.bullets.push({ text, location });
  const [key, value] = splitKeyValue(text);
  if (value === undefined) {
    return undefined;
  }

  const normalizedKey = key.trim();
  const normalizedValue = value.trim();
  addAccumulatedSectionProperty(formGroup, normalizedKey, normalizedValue, location);

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
  addAccumulatedSectionProperty(errorCode, normalizedKey, normalizedValue, location);
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
        properties: match[1] ? { marker: match[1] } : {},
        propertyLocations: match[1] ? { marker: [locationFromBlock(block)] } : {},
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
        properties: {},
        propertyLocations: {},
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
        applyRuleListBlock(current, block);
      }
    }
  }
  return {
    rules,
    sectionProse: proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, ["rules:list", ...rules.map((rule) => ruleRenderKey(rule.id))])
  };
}

function applyRuleListBlock(rule: MarkVSpecRule, block: BlockAst): void {
  if (block.type !== "list") {
    return;
  }
  appendRuleBodyLines(rule, block);

  for (const item of block.children.filter((child): child is Extract<BlockAst, { type: "listItem" }> => child.type === "listItem")) {
    applyRuleBullet(rule, item.text, locationFromBlock(item));
    const [key, value] = splitKeyValue(item.text);
    if (value === undefined || key.trim() !== "messages" || value.trim() !== "") {
      continue;
    }
    for (const child of listItems(item.children)) {
      addAccumulatedSectionProperty(rule, "messages", child.text, locationFromBlock(child));
    }
  }
}

function applyRuleBullet(rule: MarkVSpecRule, text: string, location: SourceLocation): void {
  rule.bullets.push({ text, location });
  const [key, value] = splitKeyValue(text);
  if (value === undefined) {
    return;
  }
  const normalizedKey = key.trim();
  const normalizedValue = value.trim();
  if (normalizedKey === "messages" && normalizedValue === "") {
    return;
  }
  addAccumulatedSectionProperty(rule, normalizedKey, normalizedValue, location);
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
    lines: sectionBodyLinesWithoutStandaloneHtmlComments(document, sections, section).map((line) => line.text)
  };
}

function sectionBodyLinesWithoutStandaloneHtmlComments(
  document: MarkdownDocument,
  sections: SectionAst[],
  section: SectionAst
): Array<{ text: string; line: number }> {
  return filterLinesWithoutStandaloneHtmlComments(sectionBodyLines(document, sections, section), section.blocks);
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
  if (isStandaloneHtmlCommentBlock(block)) {
    return [];
  }
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
  if (isStandaloneHtmlCommentBlock(block)) {
    return false;
  }
  return block.type === "paragraph"
    || block.type === "table"
    || block.type === "code"
    || block.type === "blockquote"
    || block.type === "thematicBreak"
    || block.type === "html";
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
  if (isStandaloneHtmlCommentBlock(block)) {
    return;
  }
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
