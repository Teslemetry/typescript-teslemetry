import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { OperationModeService } from "../src/energy-services/operation-mode.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeEnergySite } from "./fakeEnergySite.js";

function setup() {
	const { platform, logs } = createFakePlatform();
	const accessory = createFakeAccessory("Test Site");
	const { site, api } = createFakeEnergySite();
	new OperationModeService(platform as never, accessory, site);
	const hapService = accessory.getService(Service.Fan)!;
	return { hapService, site, api, logs };
}

test("a siteInfo event maps default_real_mode to the matching rotation speed", () => {
	const { hapService, api } = setup();
	api.emit("siteInfo", { response: { default_real_mode: "autonomous" } });
	assert.equal(hapService.getCharacteristic(Characteristic.RotationSpeed).value, 33);
});

test("an unmapped default_real_mode falls back to speed 66", () => {
	const { hapService, api } = setup();
	api.emit("siteInfo", { response: { default_real_mode: "some_future_mode" } });
	assert.equal(hapService.getCharacteristic(Characteristic.RotationSpeed).value, 66);
});

for (const [raw, expectedMode] of [
	[5, "backup"],
	[20, "autonomous"],
	[50, "self_consumption"],
	[85, "time_based_control"],
] as const) {
	test(`setting RotationSpeed to ${raw} snaps to the nearest documented step (${expectedMode})`, async () => {
		const { hapService, api } = setup();
		let mode: string | undefined;
		(api as any).setOperationMode = (m: string) => {
			mode = m;
			return Promise.resolve({});
		};

		await hapService.getCharacteristic(Characteristic.RotationSpeed).handleSetRequest(raw as never);

		if (expectedMode === "time_based_control") {
			// Read-only telemetry state: the API must not be called.
			assert.equal(mode, undefined);
		} else {
			assert.equal(mode, expectedMode);
		}
	});
}

test("attempting to set time_based_control (speed 100) is rejected without calling the API, and logs a warning", async () => {
	const { hapService, api, logs } = setup();
	let apiCalled = false;
	(api as any).setOperationMode = () => {
		apiCalled = true;
		return Promise.resolve({});
	};

	await hapService.getCharacteristic(Characteristic.RotationSpeed).handleSetRequest(100 as never);

	assert.equal(apiCalled, false);
	assert.ok(logs.some((l) => l.level === "warn"));
});

test("turning the fan off is rejected: the site is never asked to change its operation mode", async () => {
	const { hapService, api } = setup();
	let apiCalled = false;
	(api as any).setOperationMode = () => {
		apiCalled = true;
		return Promise.resolve({});
	};

	await hapService.getCharacteristic(Characteristic.On).handleSetRequest(false as never);

	assert.equal(apiCalled, false);
});
