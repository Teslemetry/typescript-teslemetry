import { test } from "node:test";
import assert from "node:assert/strict";
import { ENERGY_COMMANDS, VEHICLE_COMMANDS } from "../src/commands.js";

test("the catalog leaves out data-deleting, key-removing and raw routes", () => {
  for (const name of ["erase_user_data", "remove_key"]) {
    assert.equal(VEHICLE_COMMANDS[name], undefined, name);
  }
  for (const name of ["command", "add_authorized_client", "remove_authorized_client", "set_local_site_config"]) {
    assert.equal(ENERGY_COMMANDS[name], undefined, name);
  }
});

test("a GET sharing a path with a POST is named get_<route>", () => {
  assert.equal(VEHICLE_COMMANDS.charge_on_solar.method, "POST");
  assert.equal(VEHICLE_COMMANDS.get_charge_on_solar.method, "GET");
  assert.equal(VEHICLE_COMMANDS.get_charge_on_solar.path, VEHICLE_COMMANDS.charge_on_solar.path);
});

test("energy commands that need a paired gateway are flagged", () => {
  assert.equal(ENERGY_COMMANDS.dispatch_battery_power.paired, true);
  assert.equal(ENERGY_COMMANDS.operation.paired, undefined);
});
