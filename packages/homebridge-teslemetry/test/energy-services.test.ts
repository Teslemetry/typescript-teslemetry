import { test } from "node:test";
import assert from "node:assert/strict";
import { Service, Characteristic } from "hap-nodejs";
import { OperationModeService } from "../src/energy-services/operation-mode.js";
import { GridChargingService } from "../src/energy-services/grid-charging.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeEnergySite } from "./fakeEnergySite.js";

test("OperationModeService never calls setOperationMode with time_based_control (regression: Fleet API rejects that value)", async () => {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("operation-mode-site");
	const { site, api } = createFakeEnergySite();

	new OperationModeService(platform, accessory, site);

	const characteristic = accessory.getService(Service.Fan)!.getCharacteristic(Characteristic.RotationSpeed);
	// 100% rotation speed maps to "time_based_control" in SPEED_TO_MODE
	await characteristic.handleSetRequest(100 as never);

	assert.deepEqual(api.calls, []);
});

test("OperationModeService calls setOperationMode for a settable mode", async () => {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("operation-mode-site-2");
	const { site, api } = createFakeEnergySite();

	new OperationModeService(platform, accessory, site);

	const characteristic = accessory.getService(Service.Fan)!.getCharacteristic(Characteristic.RotationSpeed);
	await characteristic.handleSetRequest(33 as never);

	assert.deepEqual(api.calls, [{ method: "setOperationMode", args: ["autonomous"] }]);
});

test("GridChargingService.currentExportSetting stays within the literal union accepted by gridImportExport", async () => {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("grid-charging-site");
	const { site, api } = createFakeEnergySite();

	new GridChargingService(platform, accessory, site);

	const characteristic = accessory.getService(Service.Switch)!.getCharacteristic(Characteristic.On);
	await characteristic.handleSetRequest(true as never);

	assert.equal(api.calls.length, 1);
	assert.equal(api.calls[0].method, "gridImportExport");
	assert.equal(api.calls[0].args[0], "battery_ok");
});
