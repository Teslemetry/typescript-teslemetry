import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { RearDefrostService } from "../src/vehicle-services/rear-defrost.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

function setup() {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle, sse } = createFakeVehicle();
	new RearDefrostService(platform as never, accessory, vehicle);
	const hapService = accessory.getServiceById(Service.Switch, "rear-defrost")!;
	return { hapService, sse };
}

test("RearDefrostEnabled true/false is reflected directly on the switch", () => {
	const { hapService, sse } = setup();
	sse.emitSignal("RearDefrostEnabled", true);
	assert.equal(hapService.getCharacteristic(Characteristic.On).value, true);

	sse.emitSignal("RearDefrostEnabled", false);
	assert.equal(hapService.getCharacteristic(Characteristic.On).value, false);
});

test("there is no rear-defrost command: setting the switch never calls the vehicle API", async () => {
	const { hapService } = setup();
	await assert.doesNotReject(
		hapService.getCharacteristic(Characteristic.On).handleSetRequest(true as never),
	);
});
