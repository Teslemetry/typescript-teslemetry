import { test } from "node:test";
import assert from "node:assert/strict";
import { useTeslaModel } from "../src/Teslemetry.js";

test("useTeslaModel decodes the 4th VIN character to a model name", () => {
  assert.equal(useTeslaModel("5YJ3E1EA1KF000000"), "Model 3");
  assert.equal(useTeslaModel("5YJSA1E11KF000000"), "Model S");
  assert.equal(useTeslaModel("5YJXA1E11KF000000"), "Model X");
  assert.equal(useTeslaModel("5YJYGDEE1LF000000"), "Model Y");
  assert.equal(useTeslaModel("7SACGDEE1PF000000"), "Cybertruck");
  assert.equal(useTeslaModel("7SATGDEE1PF000000"), "Semi");
  assert.equal(useTeslaModel("7SAAGDEE1PF000000"), "Cybercab");
  assert.equal(useTeslaModel("0000000000000000"), "Unknown");
});
