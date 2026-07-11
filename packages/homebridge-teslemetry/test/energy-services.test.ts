import { test } from "node:test";
import assert from "node:assert/strict";
import { Service, Characteristic } from "hap-nodejs";
import { OperationModeService } from "../src/energy-services/operation-mode.js";
import { GridChargingService } from "../src/energy-services/grid-charging.js";
import {
  makeFakePlatform,
  makeFakeAccessory,
  makeFakeSiteApi,
} from "./helpers.js";

function makeFakeSite(overrides: Record<string, unknown> = {}) {
  return {
    id: 123,
    name: "Home",
    api: makeFakeSiteApi(),
    metadata: {},
    ...overrides,
  } as never;
}

test("OperationModeService never calls setOperationMode with time_based_control (regression: Fleet API rejects that value)", async () => {
  const platform = makeFakePlatform();
  const accessory = makeFakeAccessory("operation-mode-site");
  const site = makeFakeSite();

  new OperationModeService(platform, accessory, site as never);

  const characteristic = accessory
    .getService(Service.Fan)!
    .getCharacteristic(Characteristic.RotationSpeed);
  // 100% rotation speed maps to "time_based_control" in SPEED_TO_MODE
  await characteristic.handleSetRequest(100);

  assert.deepEqual((site as never as { api: { calls: unknown[] } }).api.calls, []);
});

test("OperationModeService calls setOperationMode for a settable mode", async () => {
  const platform = makeFakePlatform();
  const accessory = makeFakeAccessory("operation-mode-site-2");
  const site = makeFakeSite();

  new OperationModeService(platform, accessory, site as never);

  const characteristic = accessory
    .getService(Service.Fan)!
    .getCharacteristic(Characteristic.RotationSpeed);
  await characteristic.handleSetRequest(33);

  assert.deepEqual((site as never as { api: { calls: unknown[] } }).api.calls, [
    { method: "setOperationMode", args: ["autonomous"] },
  ]);
});

test("GridChargingService.currentExportSetting stays within the literal union accepted by gridImportExport", async () => {
  const platform = makeFakePlatform();
  const accessory = makeFakeAccessory("grid-charging-site");
  const site = makeFakeSite();

  new GridChargingService(platform, accessory, site as never);

  const characteristic = accessory
    .getService(Service.Switch)!
    .getCharacteristic(Characteristic.On);
  await characteristic.handleSetRequest(true);

  const calls = (site as never as { api: { calls: { method: string; args: unknown[] }[] } })
    .api.calls;
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "gridImportExport");
  assert.equal(calls[0].args[0], "battery_ok");
});
