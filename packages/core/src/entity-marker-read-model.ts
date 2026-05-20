import { propertyFirstString, propertyLocation, type MarkVSpecPropertyOwner } from "./property-accessor.js";
import type { SourceLocation } from "./types.js";

export interface MarkVSpecMarkerEntity extends MarkVSpecPropertyOwner {
  readonly id: string;
  readonly location: SourceLocation;
  readonly propertyLocations: Record<string, SourceLocation[]>;
}

export interface EntityMarkerReadModel {
  id: string;
  marker?: string;
  location: SourceLocation;
}

export function entityMarkerReadModel(entity: MarkVSpecMarkerEntity): EntityMarkerReadModel {
  return {
    id: entity.id,
    marker: propertyFirstString(entity, "marker"),
    location: propertyLocation(entity, "marker") ?? entity.location
  };
}

export function entityMarkerReadModels(entities: readonly MarkVSpecMarkerEntity[]): EntityMarkerReadModel[] {
  return entities.map(entityMarkerReadModel);
}
