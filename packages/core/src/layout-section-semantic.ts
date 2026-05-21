import type {
  MarkVSpecDiagnostic,
  MarkVSpecLayoutGroup,
  MarkVSpecLayoutItem,
  MarkVSpecSectionProse,
  MarkVSpecSlotContent,
  MarkVSpecSlotDefinition,
  SourceLocation
} from "./types.js";
import { createMarkVSpecDiagnostic } from "./diagnostic-messages.js";
import { createUnsupportedStructuredItemDiagnostic } from "./source-text-diagnostics.js";
import { elementIdPattern, isLayoutItemId, layoutGroupIdPattern } from "./ids.js";
import type { MarkdownDocument } from "./markdown-document.js";
import {
  collectSectionAst,
  type BlockAst,
  type SectionAst
} from "./markdown-section-ast.js";
import type { SemanticDependency } from "./markdown-section-semantic.js";

const slotDefinitionPropertyKeys = new Set(["required", "default", "purpose", "description"]);

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

export interface LayoutSectionSemanticSupport {
  isSectionNotesHeading(block: BlockAst): boolean;
  isEntityNoteBlock(block: BlockAst): boolean;
  appendEntityProseLines(entity: { overview?: string[]; notes?: string[] }, block: BlockAst, hasStructuredContent: boolean): void;
  listItems(blocks: BlockAst[], depth?: number): ListItemView[];
  parsedBulletFromListItem(item: ListItemView): ParsedBullet;
  locationFromBlock(block: Pick<BlockAst, "range"> | ListItemView): SourceLocation;
  splitKeyValue(text: string): [string, string | undefined];
  addPropertyLocation(locations: Record<string, SourceLocation[]>, key: string, location: SourceLocation): void;
  proseForSection(section: SectionAst, overviewBlocks: BlockAst[], noteBlocks: BlockAst[], renderKeys: string[]): MarkVSpecSectionProse[];
  structuredSectionOwnershipDiagnostics(section: SectionAst, options?: { emitMalformedHeading?: boolean }): MarkVSpecDiagnostic[];
  dedupeDependencies(dependencies: SemanticDependency[]): SemanticDependency[];
}

export function parseLayoutSectionSemantics(
  document: MarkdownDocument,
  support: LayoutSectionSemanticSupport
): LayoutSemanticResult {
  const sections = collectSectionAst(document);
  const sectionResults = sections
    .filter((section) => section.kind === "Layout" || section.kind === "Slot" || section.kind === "Slots")
    .map((section) => parseLayoutSemanticSection(section, support));

  return {
    layoutGroups: sectionResults.flatMap((result) => result.layoutGroups),
    slotContents: sectionResults.flatMap((result) => result.slotContents),
    slotDefinitions: sectionResults.flatMap((result) => result.slotDefinitions),
    sectionProse: sectionResults.flatMap((result) => result.sectionProse),
    diagnostics: sectionResults.flatMap((result) => result.diagnostics),
    sectionResults
  };
}

function parseLayoutSemanticSection(
  section: SectionAst,
  support: LayoutSectionSemanticSupport
): LayoutSectionSemanticResult {
  switch (section.kind) {
    case "Layout":
      return parseLayoutOrSlotSection(section, support);
    case "Slot":
      return parseLayoutOrSlotSection(section, support);
    case "Slots":
      return parseSlotsSection(section, support);
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

function parseLayoutOrSlotSection(section: SectionAst, support: LayoutSectionSemanticSupport): LayoutSectionSemanticResult {
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
    diagnostics.push(createMarkVSpecDiagnostic(
      "warning",
      "layout.missingViewport",
      {},
      section.heading.range.start.line
    ));
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
    if (support.isSectionNotesHeading(block)) {
      currentLayout = undefined;
      layoutSubsection = undefined;
      currentLayoutNestedProperty = undefined;
      currentLayoutHasStructuredContent = false;
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
    if (block.type === "heading" && block.depth === 3) {
      hasSeenEntity = true;
      const heading = layoutHeadingRegex.exec(block.text);
      if (!heading) {
        diagnostics.push({
          severity: "warning",
          message: "Malformed Layout heading. Expected ### [<marker>:]L-* [name] or ### P-* [name].",
          line: support.locationFromBlock(block).line
        });
        currentLayout = undefined;
        layoutSubsection = undefined;
        currentLayoutNestedProperty = undefined;
        continue;
      }

      const headingLocation = support.locationFromBlock(block);
      if (section.kind === "Layout" && !viewport) {
        diagnostics.push(createMarkVSpecDiagnostic(
          "warning",
          "layout.groupIgnoredWithoutViewport",
          {},
          headingLocation.line
        ));
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
      if (!hasSeenEntity && support.isEntityNoteBlock(block)) {
        sectionOverviewBlocks.push(block);
      }
      continue;
    }

    if (support.isEntityNoteBlock(block)) {
      support.appendEntityProseLines(currentLayout, block, currentLayoutHasStructuredContent);
      continue;
    }

    if (block.type === "heading" && block.depth === 4) {
      currentLayoutHasStructuredContent = true;
      layoutSubsection = block.text;
      currentLayoutNestedProperty = undefined;
      if (layoutSubsection !== "Items") {
        diagnostics.push({
          severity: "warning",
          message: `Layout ${currentLayout.id} has unsupported subsection ${layoutSubsection}. Use #### Items for child references or layout metadata bullets for settings.`,
          line: support.locationFromBlock(block).line
        });
      }
      continue;
    }

    if (block.type !== "list") {
      continue;
    }

    currentLayoutHasStructuredContent = true;
    for (const item of support.listItems([block])) {
      const bullet = support.parsedBulletFromListItem(item);
      if (layoutSubsection !== undefined && layoutSubsection !== "Items") {
        continue;
      }
      if (bullet.indent > 0) {
        if (layoutSubsection !== "Items" && (currentLayoutNestedProperty === "partial" || currentLayoutNestedProperty === "partial states")) {
          const partialNestedProperty = currentLayoutNestedProperty === "partial states" && bullet.indent > 1
            ? "partial states"
            : "partial";
          currentLayoutNestedProperty = applyLayoutPartialBullet(currentLayout, bullet, partialNestedProperty, support);
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
        applyLayoutItemBullet(currentLayout, bullet, support);
        addLayoutItemDependency(currentLayout, currentLayout.items[currentLayout.items.length - 1], dependencies);
      } else {
        currentLayoutNestedProperty = applyLayoutMetadataBullet(currentLayout, bullet, support);
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
    sectionProse: support.proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, renderKeys),
    diagnostics: [...diagnostics, ...support.structuredSectionOwnershipDiagnostics(section, { emitMalformedHeading: false })],
    dependencies: support.dedupeDependencies(dependencies),
    renderKeys
  };
}

function parseSlotsSection(section: SectionAst, support: LayoutSectionSemanticSupport): LayoutSectionSemanticResult {
  const slotDefinitions: MarkVSpecSlotDefinition[] = [];
  const diagnostics: MarkVSpecDiagnostic[] = [];
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
    if (support.isSectionNotesHeading(block)) {
      currentSlotDefinition = undefined;
      currentSlotDefinitionHasStructuredContent = false;
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
        location: support.locationFromBlock(block)
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
      if (!hasSeenEntity && support.isEntityNoteBlock(block)) {
        sectionOverviewBlocks.push(block);
      }
      continue;
    }
    if (support.isEntityNoteBlock(block)) {
      support.appendEntityProseLines(currentSlotDefinition, block, currentSlotDefinitionHasStructuredContent);
      continue;
    }
    if (currentSlotDefinition) {
      if (block.type === "list") {
        currentSlotDefinitionHasStructuredContent = true;
      }
      for (const bullet of support.listItems([block]).filter((item) => item.depth === 0)) {
        applySlotDefinitionBullet(currentSlotDefinition, bullet.text, support.locationFromBlock(bullet), support, diagnostics);
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
    sectionProse: support.proseForSection(section, sectionOverviewBlocks, sectionNoteBlocks, renderKeys),
    diagnostics: [...diagnostics, ...support.structuredSectionOwnershipDiagnostics(section)],
    dependencies: support.dedupeDependencies(dependencies),
    renderKeys
  };
}

function applyLayoutMetadataBullet(
  layout: MarkVSpecLayoutGroup,
  bullet: ParsedBullet,
  support: LayoutSectionSemanticSupport
): string | undefined {
  const [key, value] = support.splitKeyValue(bullet.text);
  if (key.trim() === "partial" && value !== undefined && value.trim() === "") {
    layout.partial = {
      states: {},
      propertyLocations: {},
      location: bullet.location
    };
    support.addPropertyLocation(layout.propertyLocations, "partial", bullet.location);
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
    support.addPropertyLocation(layout.propertyLocations, normalizedKey, bullet.location);
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
  nestedProperty: "partial" | "partial states",
  support: LayoutSectionSemanticSupport
): "partial" | "partial states" {
  const partial = layout.partial ?? {
    states: {},
    propertyLocations: {},
    location: bullet.location
  };
  layout.partial = partial;

  const [key, value] = support.splitKeyValue(bullet.text);
  const normalizedKey = key.trim();
  const normalizedValue = value?.trim() ?? "";

  if (nestedProperty === "partial states") {
    partial.states[normalizedKey] = normalizedValue;
    support.addPropertyLocation(partial.propertyLocations, `states ${normalizedKey}`, bullet.location);
    support.addPropertyLocation(layout.propertyLocations, `partial states ${normalizedKey}`, bullet.location);
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
    support.addPropertyLocation(partial.propertyLocations, "id", bullet.location);
    support.addPropertyLocation(layout.propertyLocations, "partial id", bullet.location);
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
    support.addPropertyLocation(partial.propertyLocations, "states", bullet.location);
    support.addPropertyLocation(layout.propertyLocations, "partial states", bullet.location);
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

  support.addPropertyLocation(partial.propertyLocations, normalizedKey, bullet.location);
  support.addPropertyLocation(layout.propertyLocations, `partial ${normalizedKey}`, bullet.location);
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

function applyLayoutItemBullet(
  layout: MarkVSpecLayoutGroup,
  bullet: ParsedBullet,
  support: LayoutSectionSemanticSupport
): void {
  const [key, value] = support.splitKeyValue(bullet.text);
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

function applySlotDefinitionBullet(
  slot: MarkVSpecSlotDefinition,
  text: string,
  location: SourceLocation,
  support: LayoutSectionSemanticSupport,
  diagnostics: MarkVSpecDiagnostic[]
): void {
  const [key, value] = support.splitKeyValue(text);
  const normalizedKey = key.trim();
  if (!slotDefinitionPropertyKeys.has(normalizedKey)) {
    diagnostics.push(createUnsupportedStructuredItemDiagnostic({
      context: `Slot ${slot.name}`,
      text,
      location,
      allowed: [...slotDefinitionPropertyKeys].join(", ")
    }));
    return;
  }
  if (value === undefined) {
    slot.properties[text] = true;
    support.addPropertyLocation(slot.propertyLocations, text, location);
    return;
  }

  slot.properties[normalizedKey] = value.trim();
  support.addPropertyLocation(slot.propertyLocations, normalizedKey, location);
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
