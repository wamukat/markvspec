import type { SourceLocation } from "./types.js";

export interface AccumulatedSectionPropertyOwner {
  properties: Record<string, string | string[]>;
  propertyLocations: Record<string, SourceLocation[]>;
}

export function addAccumulatedSectionProperty(
  owner: AccumulatedSectionPropertyOwner,
  key: string,
  value: string,
  location: SourceLocation
): void {
  const current = owner.properties[key];
  if (current === undefined) {
    owner.properties[key] = value;
  } else if (Array.isArray(current)) {
    current.push(value);
  } else {
    owner.properties[key] = [current, value];
  }
  addPropertyLocation(owner.propertyLocations, key, location);
}

export function addPropertyLocation(locations: Record<string, SourceLocation[]>, key: string, location: SourceLocation): void {
  const existing = locations[key] ?? [];
  existing.push(location);
  locations[key] = existing;
}
