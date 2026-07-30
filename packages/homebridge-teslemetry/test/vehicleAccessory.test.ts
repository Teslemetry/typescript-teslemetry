import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { VehicleAccessory } from "../src/vehicle.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

function setup() {
	const { platform, logs } = createFakePlatform();
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle, sse } = createFakeVehicle();
	const vehicleAccessory = new VehicleAccessory(platform as never, accessory, vehicle);
	return { accessory, logs, sse, vehicleAccessory };
}

test("initializes the expected number of distinct HAP services", () => {
	const { accessory } = setup();
	// Information, Battery, Climate, ChargeLimit, Door(x6), Tonneau = 11
	// services with a unique HAP service type, plus 5 distinct Switch services
	// (ChargeSwitch, Defrost, RearDefrost, Sentry, Wake) and 2 distinct
	// LockMechanism services (Lock, ChargePort), each with its own subType.
	assert.equal(accessory.services.length, 18);
});

test("destroy() tears down signal subscriptions so later SSE data no longer updates characteristics", () => {
	const { accessory, vehicleAccessory, sse } = setup();
	sse.emitSignal("BatteryLevel", 40);
	const batteryService = accessory.getService(Service.Battery)!;
	assert.equal(batteryService.getCharacteristic(Characteristic.BatteryLevel).value, 40);

	vehicleAccessory.destroy();
	sse.emitSignal("BatteryLevel", 90);

	assert.equal(batteryService.getCharacteristic(Characteristic.BatteryLevel).value, 40);
});

test("logs when the vehicle's SSE state event reports asleep", () => {
	const { sse, logs } = setup();
	sse.emit("state", { state: "asleep" } as never);
	assert.ok(logs.some((l) => l.level === "debug" && String(l.args[0]).includes("asleep")));
});

test("logs when the vehicle's SSE state event reports online", () => {
	const { sse, logs } = setup();
	sse.emit("state", { state: "online" } as never);
	assert.ok(logs.some((l) => l.level === "debug" && String(l.args[0]).includes("online")));
});

test("an unrecognized SSE state value is ignored without throwing or logging", () => {
	const { sse, logs } = setup();
	const before = logs.length;
	assert.doesNotThrow(() => sse.emit("state", { state: "offline" } as never));
	assert.equal(logs.length, before);
});
