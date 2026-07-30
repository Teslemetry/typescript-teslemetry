import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { TonneauService } from "../src/vehicle-services/tonneau.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

function setup() {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle, sse, calls } = createFakeVehicle();
	new TonneauService(platform as never, accessory, vehicle);
	const hapService = accessory.getService(Service.WindowCovering)!;
	return { hapService, sse, calls };
}

test("TonneauOpenPercent maps directly onto CurrentPosition and TargetPosition, no conversion", () => {
	const { hapService, sse } = setup();
	sse.emitSignal("TonneauOpenPercent", 40);

	assert.equal(hapService.getCharacteristic(Characteristic.CurrentPosition).value, 40);
	assert.equal(hapService.getCharacteristic(Characteristic.TargetPosition).value, 40);
});

test("setting TargetPosition to 0 sends a close command", async () => {
	const { hapService, calls } = setup();
	await hapService.getCharacteristic(Characteristic.TargetPosition).handleSetRequest(0 as never);
	assert.deepEqual(calls, [{ method: "closure", args: [{ tonneau: "close" }] }]);
});

test("setting TargetPosition above 0 sends an open command", async () => {
	const { hapService, calls } = setup();
	await hapService.getCharacteristic(Characteristic.TargetPosition).handleSetRequest(75 as never);
	assert.deepEqual(calls, [{ method: "closure", args: [{ tonneau: "open" }] }]);
});
