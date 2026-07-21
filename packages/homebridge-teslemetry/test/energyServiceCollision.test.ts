import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { EnergyAccessory } from "../src/energy.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeEnergySite } from "./fakeEnergySite.js";

// BaseEnergyService's getOrCreate lookup (energy-services/base.ts) matches an
// existing service by HAP service type alone, not by subType. StormWatchService
// and GridChargingService both use Service.Switch with different subTypes, so
// they collapse onto one shared service instance and GridCharging's onSet
// registration (constructed later) silently replaces StormWatch's.

function setup() {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Site");
	const { site, api } = createFakeEnergySite();
	new EnergyAccessory(platform as never, accessory, site);
	return { accessory, api };
}

test("StormWatch and GridCharging share a single Service.Switch instance instead of getting one each", () => {
	const { accessory } = setup();
	const switchServices = accessory.services.filter((s) => s.UUID === Service.Switch.UUID);
	assert.equal(switchServices.length, 1);
});

test("only the last-constructed Switch service (GridCharging) responds to the shared switch's SET handler", async () => {
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

	const switchService = accessory.getService(Service.Switch)!;
	await switchService.getCharacteristic(Characteristic.On).handleSetRequest(true as never);

	assert.deepEqual(calls, ["gridImportExport"]);
});
