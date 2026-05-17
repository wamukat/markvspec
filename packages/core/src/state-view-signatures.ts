import { preferredLayoutGroupForViewport } from "./layout-resolution.js";
import type { MarkVSpecLayoutGroup, MarkVSpecParseResult } from "./types.js";

export const STATE_VIEW_AFFECTING_LAYOUT_PROPERTY_KEYS = [
  "active when",
  "align",
  "disabled when",
  "enabled when",
  "gap",
  "hidden when",
  "justify",
  "overlay",
  "selected when",
  "variant",
  "visible when"
] as const;

const stateViewAffectingLayoutPropertyKeys = new Set<string>(STATE_VIEW_AFFECTING_LAYOUT_PROPERTY_KEYS);

export function stateViewLayoutSignature(
  result: Pick<MarkVSpecParseResult, "layoutGroups" | "slotContents">,
  id: string,
  viewport: string | undefined
): string | undefined {
  if (!viewport) {
    return undefined;
  }

  const layout = preferredLayoutGroupForViewport(result, id, viewport, {
    includePresentationPanels: true,
    includeTemplateLayouts: true
  });
  if (!layout) {
    return undefined;
  }

  return JSON.stringify({
    kind: layout.kind,
    notes: layout.notes ?? [],
    partial: stateViewLayoutPartialSignature(layout.partial),
    properties: stateViewLayoutPropertiesSignature(layout),
    items: layout.items.flatMap((item): object[] => {
      if (item.type === "contains") {
        return [{ type: item.type, targetId: item.targetId }];
      }
      if (item.type === "field") {
        return [{ type: item.type, label: item.label, elementId: item.elementId }];
      }
      if (item.type === "property") {
        return [];
      }
      if (item.type === "slot") {
        return [{ type: item.type, name: item.name }];
      }
      return [];
    })
  });
}

function stateViewLayoutPartialSignature(partial: MarkVSpecLayoutGroup["partial"]): object | undefined {
  if (!partial?.id && Object.keys(partial?.states ?? {}).length === 0) {
    return undefined;
  }

  return {
    id: partial?.id,
    states: Object.fromEntries(Object.entries(partial?.states ?? {}).sort(([left], [right]) => left.localeCompare(right)))
  };
}

function stateViewLayoutPropertiesSignature(layout: MarkVSpecLayoutGroup): Record<string, string | string[]> {
  const entries = Object.entries(layout.properties)
    .filter(([key]) => stateViewAffectingLayoutPropertyKeys.has(key))
    .map(([key, value]): [string, string | string[]] => [key, value]);

  for (const key of stateViewAffectingLayoutPropertyKeys) {
    const values = layout.items
      .filter((item) => item.type === "property" && item.scope === "metadata" && item.key === key)
      .map((item) => item.type === "property" ? item.value : "");
    if (values.length > 1) {
      entries.push([key, values]);
    }
  }

  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}
