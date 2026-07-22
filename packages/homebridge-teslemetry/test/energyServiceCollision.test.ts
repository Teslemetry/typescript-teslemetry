import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { EnergyAccessory } from "../src/energy.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeEnergySite } from "./fakeEnergySite.js";

// BaseEnergyService's getOrCreate lookup (energy-services/base.ts) now matches
// an existing service by HAP service type *and* subType. StormWatchService and
// GridChargingService both use Service.Switch with different subTypes, so each
// gets its own service instance and its own onSet registration.

function setup() {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Site");
	const { site, api } = createFakeEnergySite();
	new EnergyAccessory(platform as never, accessory, site);
	return { accessory, api };
}

test("StormWatch and GridCharging each get their own Service.Switch instance", () => {
	const { accessory } = setup();
	const switchServices = accessory.services.filter((s) => s.UUID === Service.Switch.UUID);
	assert.equal(switchServices.length, 2);
	const subtypes = switchServices.map((s) => s.subtype).sort();
	assert.deepEqual(subtypes, ["grid-charging", "storm-watch"]);
});

test("each Switch service's SET handler routes to its own energy command independently", async () => {
	const { accessory, api } = setup();
	const calls: string[] = [];
	(api as any).gridImportExport = () => {
		calls.push("gridImportExport");
		return Promise.resolve({});
	};
	(api as any).setStormMode = () => {
		calls.push("setStormMode");
		return Promise.resolve({});
	};

	const stormWatchService = accessory.getServiceById(Service.Switch, "storm-watch")!;
	await stormWatchService.getCharacteristic(Characteristic.On).handleSetRequest(true as never);
	assert.deepEqual(calls, ["setStormMode"]);

	const gridChargingService = accessory.getServiceById(Service.Switch, "grid-charging")!;
	await gridChargingService.getCharacteristic(Characteristic.On).handleSetRequest(true as never);
	assert.deepEqual(calls, ["setStormMode", "gridImportExport"]);
});
