import assert from "node:assert/strict";
import test from "node:test";
import {
  entityMarkerReadModel,
  entityMarkerReadModels,
  type MarkVSpecMarkerEntity
} from "../src/entity-marker-read-model.js";

const entity: MarkVSpecMarkerEntity = {
  id: "E-EmailInput",
  location: { line: 10 },
  properties: {
    marker: "email-input"
  },
  propertyLocations: {
    marker: [{ line: 12 }]
  }
};

test("entityMarkerReadModel uses the first marker value and marker location", () => {
  assert.deepEqual(entityMarkerReadModel(entity), {
    id: "E-EmailInput",
    marker: "email-input",
    location: { line: 12 }
  });
});

test("entityMarkerReadModel uses the first non-empty marker in arrays", () => {
  assert.deepEqual(entityMarkerReadModel({
    ...entity,
    properties: {
      marker: ["", "email-input-secondary"]
    }
  }), {
    id: "E-EmailInput",
    marker: "email-input-secondary",
    location: { line: 12 }
  });
});

test("entityMarkerReadModel falls back to entity location when marker is absent", () => {
  assert.deepEqual(entityMarkerReadModel({
    id: "A-Submit",
    location: { line: 20 },
    properties: {},
    propertyLocations: {}
  }), {
    id: "A-Submit",
    marker: undefined,
    location: { line: 20 }
  });
});

test("entityMarkerReadModels maps marker entities", () => {
  assert.deepEqual(entityMarkerReadModels([entity]), [{
    id: "E-EmailInput",
    marker: "email-input",
    location: { line: 12 }
  }]);
});
