import assert from "node:assert/strict";
import test from "node:test";
import {
  propertyBoolean,
  propertyFirstString,
  propertyList,
  propertyLocation,
  propertyLocations,
  propertyMarker,
  propertyString,
  type MarkVSpecPropertyOwner
} from "../src/property-accessor.js";

const owner: MarkVSpecPropertyOwner = {
  properties: {
    text: "Hello",
    empty: "",
    flag: true,
    enabled: "yes",
    disabled: "off",
    unknownBoolean: "sometimes",
    list: "one, two, , three",
    array: ["alpha", "", "beta"],
    marker: "M1"
  },
  propertyLocations: {
    text: [{ line: 3 }],
    marker: [{ line: 5 }, { line: 6 }]
  }
};

test("propertyString returns only string values", () => {
  assert.equal(propertyString(owner, "text"), "Hello");
  assert.equal(propertyString(owner, "empty"), "");
  assert.equal(propertyString(owner, "flag"), undefined);
  assert.equal(propertyString(owner, "array"), undefined);
  assert.equal(propertyString(owner, "missing"), undefined);
});

test("propertyFirstString returns the first non-empty string", () => {
  assert.equal(propertyFirstString(owner, "text"), "Hello");
  assert.equal(propertyFirstString(owner, "empty"), undefined);
  assert.equal(propertyFirstString(owner, "array"), "alpha");
  assert.equal(propertyFirstString({ properties: { array: ["", "beta"] } }, "array"), "beta");
  assert.equal(propertyFirstString(owner, "flag"), undefined);
});

test("propertyBoolean handles boolean flags and common string values", () => {
  assert.equal(propertyBoolean(owner, "flag"), true);
  assert.equal(propertyBoolean(owner, "enabled"), true);
  assert.equal(propertyBoolean(owner, "disabled", true), false);
  assert.equal(propertyBoolean({ properties: { value: "true" } }, "value"), true);
  assert.equal(propertyBoolean({ properties: { value: "on" } }, "value"), true);
  assert.equal(propertyBoolean({ properties: { value: "1" } }, "value"), true);
  assert.equal(propertyBoolean({ properties: { value: "false" } }, "value", true), false);
  assert.equal(propertyBoolean({ properties: { value: "no" } }, "value", true), false);
  assert.equal(propertyBoolean({ properties: { value: "0" } }, "value", true), false);
  assert.equal(propertyBoolean(owner, "unknownBoolean"), false);
  assert.equal(propertyBoolean(owner, "unknownBoolean", true), true);
  assert.equal(propertyBoolean(owner, "missing", true), true);
});

test("propertyList handles arrays and comma-separated strings", () => {
  assert.deepEqual(propertyList(owner, "array"), ["alpha", "beta"]);
  assert.deepEqual(propertyList(owner, "list"), ["one", "two", "three"]);
  assert.deepEqual(propertyList(owner, "flag"), []);
  assert.deepEqual(propertyList(owner, "missing"), []);
});

test("propertyMarker and property location helpers use propertyLocations only", () => {
  assert.equal(propertyMarker(owner), "M1");
  assert.equal(propertyMarker({ properties: { marker: true } }, "fallback"), "fallback");
  assert.deepEqual(propertyLocation(owner, "text"), { line: 3 });
  assert.deepEqual(propertyLocation(owner, "missing"), undefined);
  assert.deepEqual(propertyLocations(owner, "marker"), [{ line: 5 }, { line: 6 }]);
});
