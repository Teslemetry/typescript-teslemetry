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
	await assert.rejects(() => characteristic.handleSetRequest(100 as never));

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

// Regression (HB01): the switch used to send an export rule derived from a
// truthiness check on site info, silently flipping exporting sites to "never"
// and inventing "battery_ok" for a site that reports no rule.
for (const [shape, components] of [
	["battery_ok", { customer_preferred_export_rule: "battery_ok" }],
	["pv_only", { customer_preferred_export_rule: "pv_only" }],
	["never", { customer_preferred_export_rule: "never" }],
	["no rule", {}],
] as const) {
	test(`GridChargingService sends only the grid charging flag, never an export rule (site: ${shape})`, async () => {
		const { platform } = createFakePlatform();
		const accessory = createFakeAccessory(`grid-charging-site-${shape}`);
		const { site, api } = createFakeEnergySite();

		new GridChargingService(platform, accessory, site);
		api.emit("siteInfo", { response: { components } });

		const characteristic = accessory.getService(Service.Switch)!.getCharacteristic(Characteristic.On);
		await characteristic.handleSetRequest(false as never);
		await characteristic.handleSetRequest(true as never);

		assert.deepEqual(api.calls, [
			{ method: "gridImportExport", args: [undefined, true] },
			{ method: "gridImportExport", args: [undefined, false] },
		]);
	});
}
