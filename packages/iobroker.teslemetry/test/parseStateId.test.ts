import { test } from "node:test";
import assert from "node:assert/strict";
import { StateManager } from "../lib/StateManager.js";

// StateManager only reads `adapter.namespace` in parseStateId; nothing else is needed here.
const fakeAdapter = { namespace: "teslemetry.0" } as never;

test("parseStateId strips the adapter namespace prefix before parsing (regression: commands never fired)", () => {
  const stateManager = new StateManager(fakeAdapter);

  const parsed = stateManager.parseStateId(
    "teslemetry.0.vehicles.5YJSA1E14FF000000.commands.lock",
  );

  assert.deepEqual(parsed, {
    type: "vehicle",
    identifier: "5YJSA1E14FF000000",
    category: "commands",
    state: "lock",
  });
});

test("parseStateId also accepts an id with the prefix already stripped", () => {
  const stateManager = new StateManager(fakeAdapter);

  const parsed = stateManager.parseStateId("energy.123.operation.mode");

  assert.deepEqual(parsed, {
    type: "energy",
    identifier: "123",
    category: "operation",
    state: "mode",
  });
});

test("parseStateId returns null for an unrecognized top-level segment", () => {
  const stateManager = new StateManager(fakeAdapter);

  assert.equal(
    stateManager.parseStateId("teslemetry.0.info.connection"),
    null,
  );
});
