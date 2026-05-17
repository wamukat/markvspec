import type { MarkVSpecElement } from "./types.js";

export const markVSpecSourceTypes = [
  "fixed",
  "i18n",
  "data",
  "route",
  "element",
  "asset",
  "external",
  "computed"
] as const;

export type MarkVSpecSourceType = typeof markVSpecSourceTypes[number];

const sourceTypeSet = new Set<string>(markVSpecSourceTypes);

export function isMarkVSpecSourceType(value: string): value is MarkVSpecSourceType {
  return sourceTypeSet.has(value);
}

export function sourceTypeForElement(element: MarkVSpecElement): MarkVSpecSourceType {
  const source = element.properties["source"];
  return typeof source === "string" && isMarkVSpecSourceType(source) ? source : "fixed";
}
