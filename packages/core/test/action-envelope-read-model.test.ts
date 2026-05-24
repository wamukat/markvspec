import assert from "node:assert/strict";
import test from "node:test";
import {
  actionOutcomeForTransition,
  actionTransitionCaseReference,
  buildMarkVSpecActionEnvelopeReadModel,
  parseMarkVSpec,
  processLifecycleTriggerSource
} from "../src/index.js";

test("builds action envelope trigger and outcome summaries separately from process execution", () => {
  const result = parseMarkVSpec(`---
id: SCR-ACTION-ENVELOPE
type: screen
title: Action Envelope
---

# SCR-ACTION-ENVELOPE Action Envelope

## States

- idle*
- loading
- ready
- failed

## Elements

### E-SubmitButton Button

- action: A-Submit
- label: Submit

## Actions

### A-Submit Submit

#### From
- idle
#### P1: Process Send request
- request:
  - method: POST
  - path: /submit
- case: success
  - state: ready
- case: failure
  - state: failed
`);

const action = result.actions[0];
assert.ok(action);

const envelope = buildMarkVSpecActionEnvelopeReadModel(action);
assert.deepEqual(envelope.trigger, {
  raw: "E-SubmitButton.click",
  kind: "element",
  elementId: "E-SubmitButton",
  elementEvent: "click"
});
assert.equal(envelope.callerElementId, "E-SubmitButton");
assert.deepEqual(envelope.fromStates, ["idle"]);
assert.deepEqual(envelope.outcomeSummaries.map((summary) => ({
  result: summary.result,
  sources: summary.sources,
  fromStates: summary.fromStates,
  toTargets: summary.toTargets,
  processMarkers: summary.processMarkers
})), [
  {
    result: "success",
    sources: ["transition", "process-outcome"],
    fromStates: ["idle"],
    toTargets: ["ready"],
    processMarkers: ["P1"]
  },
  {
    result: "failure",
    sources: ["transition", "process-outcome"],
    fromStates: ["idle"],
    toTargets: ["failed"],
    processMarkers: ["P1"]
  }
]);
});

test("parses process lifecycle triggers and resolves transition case references", () => {
const result = parseMarkVSpec(`---
id: SCR-ACTION-RESPONSE
type: screen
title: Action Response
---

# SCR-ACTION-RESPONSE Action Response

## States

- before-load+
- loading*
- ready

## Events

- page.load: A-Load

## Actions

### A-Load Load

#### From
- before-load
#### P1: Process Send request
- request:
  - method: GET
  - path: /profile
- case: success
  - response: 200 profile
  - state: loading

### A-Resolve Resolve response

#### From
- loading
#### P2: Process Resolve responses
- receive:
  - response: A-Load.P1.response
- case: success
  - state: ready
`);

const action = result.actions.find((candidate) => candidate.id === "A-Resolve");
assert.ok(action);

const envelope = buildMarkVSpecActionEnvelopeReadModel(action);
assert.deepEqual(envelope.trigger, {
  raw: "A-Load.P1.response",
  kind: "process-lifecycle",
  sourceActionId: "A-Load",
  processMarker: "P1",
  lifecycleEvent: "response"
});
assert.deepEqual(processLifecycleTriggerSource(action), {
  actionId: "A-Load",
  processMarker: "P1",
  event: "response"
});
assert.equal(actionTransitionCaseReference(action, "success"), "A-Resolve.P2.success");
assert.equal(actionOutcomeForTransition(action, action.transitions[0]!)?.result, "success");
});

test("keeps process lifecycle trigger marker grammar compatible with process output references", () => {
const result = parseMarkVSpec(`---
id: SCR-LONG-PROCESS-MARKER
type: screen
title: Long Process Marker
---

# SCR-LONG-PROCESS-MARKER Long Process Marker

## States

- before-load+
- loading*
- ready

## Events

- page.load: A-Load

## Actions

### A-Load Load

#### From
- before-load
- loading
#### PLongMarker13: Process Send request
- request:
  - method: GET
  - path: /profile
- case: success
  - response: 200 profile
  - state: loading

### A-Resolve Resolve response

#### From
- loading
#### P1: Process Resolve responses
- receive:
  - response: A-Load.PLongMarker13.response
- case: success
  - state: ready
`);

const action = result.actions.find((candidate) => candidate.id === "A-Resolve");
assert.ok(action);
assert.equal(buildMarkVSpecActionEnvelopeReadModel(action).trigger.kind, "process-lifecycle");
assert.deepEqual(processLifecycleTriggerSource(action), {
  actionId: "A-Load",
  processMarker: "PLongMarker13",
  event: "response"
});
assert.equal(
  result.diagnostics.some((diagnostic) => diagnostic.message.includes("invalid trigger A-Load.PLongMarker13.response")),
  false
);
});
