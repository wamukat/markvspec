import { controlledPanelReferences } from "./element-domain.js";
import { layoutHasVisibilityConditions } from "./layout-domain.js";
import type { MarkVSpecElement, MarkVSpecLayoutGroup, MarkVSpecParseResult } from "./types.js";

export type SlotContent = MarkVSpecParseResult["slotContents"][number];
export type SlotContentsByName = Map<string, SlotContent[]>;

export interface LayoutRenderKeyContext {
  slotName?: string;
  slotRenderViewport?: string;
  slotViewport?: string;
}

export interface SlotContentLayoutPlan {
  layoutById: Map<string, MarkVSpecLayoutGroup>;
  containedLayoutIds: Set<string>;
  normallyContainedLayoutIds: Set<string>;
  controlledPanelLayoutIds: Set<string>;
  rootGroups: MarkVSpecLayoutGroup[];
}

export function mapSlotContentsByName(slotContents: SlotContent[]): SlotContentsByName {
  const byName: SlotContentsByName = new Map();
  for (const slot of slotContents) {
    const slots = byName.get(slot.name) ?? [];
    slots.push(slot);
    byName.set(slot.name, slots);
  }
  return byName;
}

export function resolveSlotContent(slotContentsByName: SlotContentsByName, name: string, viewport: string): SlotContent | undefined {
  const slots = slotContentsByName.get(name) ?? [];
  return slots.find((slot) => slot.viewport === viewport)
    ?? slots.find((slot) => !slot.viewport);
}

export function slotDefaultLayoutIds(result: MarkVSpecParseResult): Set<string> {
  return new Set(result.slotDefinitions
    .map((slot) => typeof slot.properties["default"] === "string" ? slot.properties["default"].trim() : "")
    .filter((defaultId) => defaultId.startsWith("L-")));
}

export function slotDefaultId(result: MarkVSpecParseResult, name: string): string {
  const slotDefinition = result.slotDefinitions.find((slot) => slot.name === name);
  return typeof slotDefinition?.properties["default"] === "string" ? slotDefinition.properties["default"].trim() : "";
}

export function controlledPanelLayoutIdsFor(elements: MarkVSpecElement[], layoutById: Map<string, MarkVSpecLayoutGroup>): Set<string> {
  const ids = new Set<string>();
  for (const element of elements) {
    for (const reference of controlledPanelReferences(element)) {
      if (reference.panelId && layoutById.has(reference.panelId)) {
        ids.add(reference.panelId);
      }
    }
  }
  return ids;
}

export function normallyContainedLayoutIdsFor(layoutGroups: MarkVSpecLayoutGroup[], layoutById: Map<string, MarkVSpecLayoutGroup>, result: MarkVSpecParseResult): Set<string> {
  const ids = containedLayoutIdsFor(layoutGroups, layoutById);
  for (const layoutId of slotDefaultLayoutIds(result)) {
    if (layoutById.has(layoutId)) {
      ids.add(layoutId);
    }
  }
  return ids;
}

export function containedLayoutIdsFor(layoutGroups: MarkVSpecLayoutGroup[], layoutById: Map<string, MarkVSpecLayoutGroup>): Set<string> {
  const ids = new Set<string>();
  for (const group of layoutGroups) {
    for (const item of group.items) {
      if (item.type === "contains" && layoutById.has(item.targetId)) {
        ids.add(item.targetId);
      }
    }
  }
  return ids;
}

export function rootLayoutGroups(
  layoutGroups: MarkVSpecLayoutGroup[],
  containedLayoutIds: ReadonlySet<string>
): MarkVSpecLayoutGroup[] {
  const uncontainedGroups = layoutGroups.filter((group) => !containedLayoutIds.has(group.id));
  const rootGroups = uncontainedGroups.filter((group, index) => index === 0 || isRootLayoutAlternative(group));
  return rootGroups.length > 0 ? rootGroups : layoutGroups.slice(0, 1);
}

export function slotContentLayoutPlan(slotContent: SlotContent, elements: MarkVSpecElement[]): SlotContentLayoutPlan {
  const layoutById = new Map(slotContent.layoutGroups.map((group) => [group.id, group]));
  const containedLayoutIds = containedLayoutIdsFor(slotContent.layoutGroups, layoutById);
  const normallyContainedLayoutIds = new Set(containedLayoutIds);
  const controlledPanelLayoutIds = controlledPanelLayoutIdsFor(elements, layoutById);
  for (const layoutId of controlledPanelLayoutIds) {
    if (!normallyContainedLayoutIds.has(layoutId)) {
      containedLayoutIds.add(layoutId);
    }
  }

  return {
    layoutById,
    containedLayoutIds,
    normallyContainedLayoutIds,
    controlledPanelLayoutIds,
    rootGroups: slotContent.layoutGroups.filter((group) => !containedLayoutIds.has(group.id))
  };
}

export function layoutRenderKey(group: MarkVSpecLayoutGroup, context: LayoutRenderKeyContext): string {
  return context.slotName
    ? `slot-content:${context.slotName}:${context.slotRenderViewport ?? context.slotViewport ?? "default"}:${group.id}`
    : `layout:${group.viewport}:${group.id}`;
}

function isRootLayoutAlternative(group: MarkVSpecLayoutGroup): boolean {
  return layoutHasVisibilityConditions(group);
}
