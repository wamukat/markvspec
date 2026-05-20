import test from "node:test";
import assert from "node:assert/strict";
import { addAccumulatedSectionProperty, addPropertyLocation } from "../src/section-property-accumulator.js";
import type { AccumulatedSectionPropertyOwner } from "../src/section-property-accumulator.js";
import type { SourceLocation } from "../src/types.js";

test("adds a first accumulated section property and records its location", () => {
  const owner: AccumulatedSectionPropertyOwner = { properties: {}, propertyLocations: {} };
  const location = sourceLocation(10);

  addAccumulatedSectionProperty(owner, "message", "Required", location);

  assert.equal(owner.properties["message"], "Required");
  assert.deepEqual(owner.propertyLocations["message"], [location]);
});

test("converts repeated accumulated section properties to arrays in source order", () => {
  const owner: AccumulatedSectionPropertyOwner = { properties: {}, propertyLocations: {} };
  const first = sourceLocation(10);
  const second = sourceLocation(11);
  const third = sourceLocation(12);

  addAccumulatedSectionProperty(owner, "messages", "First", first);
  addAccumulatedSectionProperty(owner, "messages", "Second", second);
  addAccumulatedSectionProperty(owner, "messages", "Third", third);

  assert.deepEqual(owner.properties["messages"], ["First", "Second", "Third"]);
  assert.deepEqual(owner.propertyLocations["messages"], [first, second, third]);
});

test("appends standalone property locations without changing existing entries", () => {
  const locations = { marker: [sourceLocation(3)] };
  const next = sourceLocation(4);

  addPropertyLocation(locations, "marker", next);

  assert.deepEqual(locations.marker, [sourceLocation(3), next]);
});

function sourceLocation(line: number): SourceLocation {
  return { line };
}
