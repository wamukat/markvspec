import { isPresentationPanelId } from "./ids.js";
import type { MarkVSpecLayoutGroup, MarkVSpecParseResult } from "./types.js";

export interface MarkVSpecLayoutResolutionOptions {
  layoutIds?: ReadonlySet<string>;
  viewport?: string;
  focusLayoutIds?: ReadonlySet<string>;
  includeTemplateLayouts?: boolean;
  includePresentationPanels?: boolean;
  dedupeById?: boolean;
}

export function allResolvedLayoutGroups(result: Pick<MarkVSpecParseResult, "layoutGroups" | "slotContents">): MarkVSpecLayoutGroup[] {
  return [
    ...result.layoutGroups,
    ...result.slotContents.flatMap((slot) => slot.layoutGroups)
  ];
}

export function resolveLayoutGroupsForViewport(
  result: Pick<MarkVSpecParseResult, "layoutGroups" | "slotContents">,
  options: MarkVSpecLayoutResolutionOptions = {}
): MarkVSpecLayoutGroup[] {
  const seen = new Set<string>();
  const dedupeById = options.dedupeById ?? true;
  return allResolvedLayoutGroups(result)
    .slice()
    .sort((a, b) => layoutResolutionRank(a, options.viewport) - layoutResolutionRank(b, options.viewport))
    .filter((layout) => {
      if (!options.includePresentationPanels && isPresentationPanelId(layout.id)) {
        return false;
      }
      if (!options.includeTemplateLayouts && layout.documentRole === "template") {
        return false;
      }
      if (options.layoutIds && !options.layoutIds.has(layout.id)) {
        return false;
      }
      if (options.focusLayoutIds && !options.focusLayoutIds.has(layout.id)) {
        return false;
      }
      if (options.viewport && layout.viewport && layout.viewport !== options.viewport) {
        return false;
      }
      if (dedupeById) {
        if (seen.has(layout.id)) {
          return false;
        }
        seen.add(layout.id);
      }
      return true;
    });
}

export function preferredLayoutGroupForViewport(
  result: Pick<MarkVSpecParseResult, "layoutGroups" | "slotContents">,
  layoutId: string,
  viewport?: string,
  options: Omit<MarkVSpecLayoutResolutionOptions, "layoutIds" | "viewport" | "dedupeById"> = {}
): MarkVSpecLayoutGroup | undefined {
  return resolveLayoutGroupsForViewport(result, {
    ...options,
    layoutIds: new Set([layoutId]),
    viewport,
    dedupeById: true
  })[0];
}

function layoutResolutionRank(layout: MarkVSpecLayoutGroup, viewport: string | undefined): number {
  const documentRank = layout.documentRole === "template" ? 1 : 0;
  if (!viewport) {
    return (layout.viewport ? 1 : 0) * 10 + documentRank;
  }
  if (layout.viewport === viewport) {
    return documentRank;
  }
  return (layout.viewport ? 2 : 1) * 10 + documentRank;
}
