import type { SourceLocation } from "./types.js";

export type MarkVSpecPropertyValue = string | string[] | true | undefined;

export interface MarkVSpecPropertyOwner {
  readonly properties: Record<string, MarkVSpecPropertyValue>;
  readonly propertyLocations?: Record<string, SourceLocation[] | undefined>;
}

export function propertyString(owner: MarkVSpecPropertyOwner | undefined, key: string): string | undefined {
  const value = owner?.properties[key];
  return typeof value === "string" ? value : undefined;
}

export function propertyFirstString(owner: MarkVSpecPropertyOwner | undefined, key: string): string | undefined {
  const value = owner?.properties[key];
  if (typeof value === "string") {
    return value || undefined;
  }
  return Array.isArray(value) ? value.find((item) => item.length > 0) : undefined;
}

export function propertyBoolean(owner: MarkVSpecPropertyOwner | undefined, key: string, defaultValue = false): boolean {
  const value = owner?.properties[key];
  if (value === true) {
    return true;
  }
  if (typeof value !== "string") {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (["true", "yes", "on", "1"].includes(normalized)) {
    return true;
  }
  if (["false", "no", "off", "0"].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

export function propertyList(owner: MarkVSpecPropertyOwner | undefined, key: string): string[] {
  const value = owner?.properties[key];
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export function propertyMarker(owner: MarkVSpecPropertyOwner | undefined, fallback?: string): string | undefined {
  return propertyFirstString(owner, "marker") ?? fallback;
}

export function propertyLocation(owner: { readonly propertyLocations?: Record<string, SourceLocation[] | undefined> } | undefined, key: string): SourceLocation | undefined {
  return owner?.propertyLocations?.[key]?.[0];
}

export function propertyLocations(owner: { readonly propertyLocations?: Record<string, SourceLocation[] | undefined> } | undefined, key: string): SourceLocation[] {
  return owner?.propertyLocations?.[key] ?? [];
}
