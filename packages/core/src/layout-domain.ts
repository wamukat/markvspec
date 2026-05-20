import type { MarkVSpecLayoutGroup } from "./types.js";

export type LayoutDisplaySettingKey = "align" | "justify" | "gap" | "overlay" | "marker" | "variant";
export type LayoutConditionKey =
  | "visible when"
  | "hidden when"
  | "disabled when"
  | "enabled when"
  | "selected when"
  | "active when";

export interface LayoutDisplaySettings {
  marker?: string;
  align?: string;
  justify?: string;
  gap?: string;
  overlay?: string;
  variant?: string;
}

export function layoutDomainFor(layout: MarkVSpecLayoutGroup): LayoutDomain {
  return new LayoutDomain(layout);
}

export function layoutDisplaySettings(layout: MarkVSpecLayoutGroup): LayoutDisplaySettings {
  return {
    marker: layoutPropertyValue(layout, "marker"),
    align: layoutPropertyValue(layout, "align"),
    justify: layoutPropertyValue(layout, "justify"),
    gap: layoutPropertyValue(layout, "gap"),
    overlay: layoutPropertyValue(layout, "overlay"),
    variant: layoutPropertyValue(layout, "variant")
  };
}

export function layoutPropertyValue(layout: MarkVSpecLayoutGroup, key: LayoutDisplaySettingKey): string | undefined {
  return nonEmpty(layout.properties[key]);
}

export function layoutConditionValues(layout: MarkVSpecLayoutGroup, key: LayoutConditionKey): string[] {
  return layoutMetadataPropertyValues(layout, key);
}

export function layoutHasVisibilityConditions(layout: MarkVSpecLayoutGroup): boolean {
  return layoutConditionValues(layout, "visible when").length > 0
    || layoutConditionValues(layout, "hidden when").length > 0;
}

export function layoutMetadataPropertyValues(layout: MarkVSpecLayoutGroup, key: string): string[] {
  const values = layout.items
    .filter((item) => item.type === "property" && item.scope === "metadata" && item.key === key)
    .map((item) => item.type === "property" ? item.value : "")
    .filter(Boolean);
  if (values.length > 0) {
    return values;
  }
  const value = layout.properties[key];
  return value ? [value] : [];
}

export class LayoutDomain {
  constructor(readonly layout: MarkVSpecLayoutGroup) {}

  displaySettings(): LayoutDisplaySettings {
    return layoutDisplaySettings(this.layout);
  }

  propertyValue(key: LayoutDisplaySettingKey): string | undefined {
    return layoutPropertyValue(this.layout, key);
  }

  conditionValues(key: LayoutConditionKey): string[] {
    return layoutConditionValues(this.layout, key);
  }

  hasVisibilityConditions(): boolean {
    return layoutHasVisibilityConditions(this.layout);
  }
}

function nonEmpty(value: string | undefined): string | undefined {
  return value ? value : undefined;
}
