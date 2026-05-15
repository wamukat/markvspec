import type {
  MarkVSpecAction,
  MarkVSpecElement,
  MarkVSpecFormGroup,
  MarkVSpecLayoutGroup,
  MarkVSpecParseResult
} from "./types.js";
import { resolveLayoutGroupsForViewport } from "./layout-resolution.js";

export type MarkVSpecDocumentCompositionOriginKind = "screen" | "template" | "slot" | "partial";
export type MarkVSpecDocumentCompositionItemKind = "layout" | "element" | "action" | "form-group";

export interface MarkVSpecDocumentCompositionOrigin {
  kind: MarkVSpecDocumentCompositionOriginKind;
  partialId?: string;
  path?: string;
  slotName?: string;
  viewport?: string;
}

export interface MarkVSpecDocumentCompositionItem<T> {
  kind: MarkVSpecDocumentCompositionItemKind;
  id: string;
  item: T;
  origin: MarkVSpecDocumentCompositionOrigin;
}

export interface MarkVSpecDocumentComposition {
  sourceResult: MarkVSpecParseResult;
  layouts: Array<MarkVSpecDocumentCompositionItem<MarkVSpecLayoutGroup>>;
  elements: Array<MarkVSpecDocumentCompositionItem<MarkVSpecElement>>;
  actions: Array<MarkVSpecDocumentCompositionItem<MarkVSpecAction>>;
  formGroups: Array<MarkVSpecDocumentCompositionItem<MarkVSpecFormGroup>>;
}

export interface BuildMarkVSpecDocumentCompositionOptions {
  partialPreviews?: ReadonlyMap<string, MarkVSpecParseResult>;
  partialPaths?: ReadonlyMap<string, string>;
}

export interface MarkVSpecDocumentCompositionItemIds {
  layoutIds: Set<string>;
  elementIds: Set<string>;
  actionIds: Set<string>;
  formGroupIds: Set<string>;
}

export interface MarkVSpecDocumentCompositionLayoutOptions {
  layoutIds?: ReadonlySet<string>;
  viewport?: string;
  focusLayoutIds?: ReadonlySet<string>;
  includeTemplateLayouts?: boolean;
  includePartialLayouts?: boolean;
  includePresentationPanels?: boolean;
  dedupeById?: boolean;
}

export function buildMarkVSpecDocumentComposition(
  result: MarkVSpecParseResult,
  options: BuildMarkVSpecDocumentCompositionOptions = {}
): MarkVSpecDocumentComposition {
  const layouts: Array<MarkVSpecDocumentCompositionItem<MarkVSpecLayoutGroup>> = [
    ...result.layoutGroups.map((layout) => compositionItem("layout", layout.id, layout, documentItemOrigin(layout))),
    ...result.slotContents.flatMap((slot) =>
      slot.layoutGroups.map((layout) => compositionItem("layout", layout.id, layout, {
        kind: "slot",
        slotName: slot.name,
        viewport: slot.viewport
      }))
    )
  ];
  const elements = result.elements.map((element) => compositionItem("element", element.id, element, documentItemOrigin(element)));
  const actions = result.actions.map((action) => compositionItem("action", action.id, action, documentItemOrigin(action)));
  const formGroups = result.formGroups.map((formGroup) => compositionItem("form-group", formGroup.id, formGroup, documentItemOrigin(formGroup)));

  for (const [partialId, partial] of options.partialPreviews ?? new Map<string, MarkVSpecParseResult>()) {
    const origin: MarkVSpecDocumentCompositionOrigin = {
      kind: "partial",
      partialId,
      path: options.partialPaths?.get(partialId)
    };
    layouts.push(
      ...partial.layoutGroups.map((layout) => compositionItem("layout", layout.id, layout, origin)),
      ...partial.slotContents.flatMap((slot) =>
        slot.layoutGroups.map((layout) => compositionItem("layout", layout.id, layout, {
          ...origin,
          slotName: slot.name,
          viewport: slot.viewport
        }))
      )
    );
    elements.push(...partial.elements.map((element) => compositionItem("element", element.id, element, origin)));
    actions.push(...partial.actions.map((action) => compositionItem("action", action.id, action, origin)));
    formGroups.push(...partial.formGroups.map((formGroup) => compositionItem("form-group", formGroup.id, formGroup, origin)));
  }

  return {
    sourceResult: result,
    layouts,
    elements,
    actions,
    formGroups
  };
}

export function documentCompositionItemIds(
  composition: MarkVSpecDocumentComposition,
  options: { includeTemplateItems?: boolean; includePartialItems?: boolean } = {}
): MarkVSpecDocumentCompositionItemIds {
  const includeTemplateItems = options.includeTemplateItems ?? true;
  const includePartialItems = options.includePartialItems ?? true;
  const inScope = (item: MarkVSpecDocumentCompositionItem<unknown>) =>
    (includeTemplateItems || item.origin.kind !== "template") &&
    (includePartialItems || item.origin.kind !== "partial");

  return {
    layoutIds: new Set(composition.layouts.filter(inScope).map((entry) => entry.id)),
    elementIds: new Set(composition.elements.filter(inScope).map((entry) => entry.id)),
    actionIds: new Set(composition.actions.filter(inScope).map((entry) => entry.id)),
    formGroupIds: new Set(composition.formGroups.filter(inScope).map((entry) => entry.id))
  };
}

export function resolveDocumentCompositionLayoutsForViewport(
  composition: MarkVSpecDocumentComposition,
  options: MarkVSpecDocumentCompositionLayoutOptions = {}
): Array<MarkVSpecDocumentCompositionItem<MarkVSpecLayoutGroup>> {
  const partialLayoutIds = new Set(composition.layouts.filter((entry) => entry.origin.kind === "partial").map((entry) => entry.id));
  const sourceLayouts = resolveLayoutGroupsForViewport(composition.sourceResult, {
    layoutIds: options.layoutIds,
    viewport: options.viewport,
    focusLayoutIds: options.focusLayoutIds,
    includeTemplateLayouts: options.includeTemplateLayouts,
    includePresentationPanels: options.includePresentationPanels,
    dedupeById: options.dedupeById
  });
  const sourceLayoutEntries = sourceLayouts
    .map((layout) => composition.layouts.find((entry) => entry.item === layout || (entry.id === layout.id && entry.origin.kind !== "partial")))
    .filter((entry): entry is MarkVSpecDocumentCompositionItem<MarkVSpecLayoutGroup> => Boolean(entry));

  if (!options.includePartialLayouts) {
    return sourceLayoutEntries;
  }

  const partialEntries = resolvePartialCompositionLayouts(composition, options, partialLayoutIds);

  return [...sourceLayoutEntries, ...partialEntries];
}

function resolvePartialCompositionLayouts(
  composition: MarkVSpecDocumentComposition,
  options: MarkVSpecDocumentCompositionLayoutOptions,
  partialLayoutIds: ReadonlySet<string>
): Array<MarkVSpecDocumentCompositionItem<MarkVSpecLayoutGroup>> {
  const entriesByPartial = new Map<string, Array<MarkVSpecDocumentCompositionItem<MarkVSpecLayoutGroup>>>();
  for (const entry of composition.layouts) {
    if (entry.origin.kind !== "partial" || !entry.origin.partialId || !partialLayoutIds.has(entry.id)) {
      continue;
    }
    const entries = entriesByPartial.get(entry.origin.partialId) ?? [];
    entries.push(entry);
    entriesByPartial.set(entry.origin.partialId, entries);
  }

  const resolved: Array<MarkVSpecDocumentCompositionItem<MarkVSpecLayoutGroup>> = [];
  for (const entries of entriesByPartial.values()) {
    const pseudoResult = {
      layoutGroups: entries.filter((entry) => !entry.origin.slotName).map((entry) => entry.item),
      slotContents: [...new Set(entries.filter((entry) => entry.origin.slotName).map((entry) => `${entry.origin.slotName}\u0000${entry.origin.viewport ?? ""}`))]
        .map((key) => {
          const [name, viewport] = key.split("\u0000");
          return {
            name,
            viewport: viewport || undefined,
            location: { line: 0 },
            layoutGroups: entries
              .filter((entry) => entry.origin.slotName === name && (entry.origin.viewport ?? "") === viewport)
              .map((entry) => entry.item)
          };
        })
    };
    const layoutEntriesByItem = new Map(entries.map((entry) => [entry.item, entry]));
    const layouts = resolveLayoutGroupsForViewport(pseudoResult, {
      layoutIds: options.layoutIds,
      viewport: options.viewport,
      focusLayoutIds: options.focusLayoutIds,
      includeTemplateLayouts: options.includeTemplateLayouts,
      includePresentationPanels: options.includePresentationPanels,
      dedupeById: options.dedupeById
    });
    resolved.push(...layouts.map((layout) => layoutEntriesByItem.get(layout)).filter((entry): entry is MarkVSpecDocumentCompositionItem<MarkVSpecLayoutGroup> => Boolean(entry)));
  }
  return resolved;
}

function compositionItem<T>(
  kind: MarkVSpecDocumentCompositionItemKind,
  id: string,
  item: T,
  origin: MarkVSpecDocumentCompositionOrigin
): MarkVSpecDocumentCompositionItem<T> {
  return { kind, id, item, origin };
}

function documentItemOrigin(item: { documentRole?: string }): MarkVSpecDocumentCompositionOrigin {
  return item.documentRole === "template" ? { kind: "template" } : { kind: "screen" };
}
