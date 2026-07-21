import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { ClimateService } from "../src/vehicle-services/climate.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

function setup(metadata: Record<string, unknown> = {}) {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle, sse } = createFakeVehicle({ metadata: metadata as never });
	new ClimateService(platform as never, accessory, vehicle);
	const hapService = accessory.getService(Service.Thermostat)!;
	return { hapService, vehicle, sse };
}

test("InsideTemp signal updates CurrentTemperature", () => {
	const { hapService, sse } = setup();
	sse.emitSignal("InsideTemp", 21.5);
	assert.equal(hapService.getCharacteristic(Characteristic.CurrentTemperature).value, 21.5);
});

test("with no rhd metadata (missing/null), target temperature listens on the left-hand-drive signal", () => {
	const { hapService, sse } = setup();
	sse.emitSignal("HvacLeftTemperatureRequest", 22);
	assert.equal(hapService.getCharacteristic(Characteristic.TargetTemperature).value, 22);
});

test("with metadata.config.rhd true, target temperature listens on the right-hand-drive signal instead", () => {
	const { hapService, sse } = setup({ config: { rhd: true } });
	sse.emitSignal("HvacRightTemperatureRequest", 19);
	assert.equal(hapService.getCharacteristic(Characteristic.TargetTemperature).value, 19);

	// The left-hand-drive signal must be ignored once rhd is selected.
	sse.emitSignal("HvacLeftTemperatureRequest", 99);
	assert.equal(hapService.getCharacteristic(Characteristic.TargetTemperature).value, 19);
});

test("HvacACEnabled true maps to HEAT and puts the target state in AUTO", () => {
	const { hapService, sse } = setup();
	sse.emitSignal("HvacACEnabled", true);
	assert.equal(
		hapService.getCharacteristic(Characteristic.CurrentHeatingCoolingState).value,
		Characteristic.CurrentHeatingCoolingState.HEAT,
	);
	assert.equal(
		hapService.getCharacteristic(Characteristic.TargetHeatingCoolingState).value,
		Characteristic.TargetHeatingCoolingState.AUTO,
	);
});

test("HvacACEnabled false maps to OFF for both current and target state", () => {
	const { hapService, sse } = setup();
	sse.emitSignal("HvacACEnabled", false);
	assert.equal(
		hapService.getCharacteristic(Characteristic.CurrentHeatingCoolingState).value,
		Characteristic.CurrentHeatingCoolingState.OFF,
	);
	assert.equal(
		hapService.getCharacteristic(Characteristic.TargetHeatingCoolingState).value,
		Characteristic.TargetHeatingCoolingState.OFF,
	);
});

test("setting TargetHeatingCoolingState to OFF stops climate", async () => {
	const { hapService, vehicle } = setup();
	let called = false;
	(vehicle.api as any).stopAutoConditioning = () => {
		called = true;
		return Promise.resolve({});
	};

	await hapService
		.getCharacteristic(Characteristic.TargetHeatingCoolingState)
		.handleSetRequest(Characteristic.TargetHeatingCoolingState.OFF as never);

	assert.ok(called);
	assert.equal(
		hapService.getCharacteristic(Characteristic.CurrentHeatingCoolingState).value,
		Characteristic.CurrentHeatingCoolingState.OFF,
	);
});

test("setting TargetHeatingCoolingState to AUTO starts climate", async () => {
	const { hapService, vehicle } = setup();
	let called = false;
	(vehicle.api as any).startAutoConditioning = () => {
		called = true;
		return Promise.resolve({});
	};

	await hapService
		.getCharacteristic(Characteristic.TargetHeatingCoolingState)
		.handleSetRequest(Characteristic.TargetHeatingCoolingState.AUTO as never);

	assert.ok(called);
	assert.equal(
		hapService.getCharacteristic(Characteristic.CurrentHeatingCoolingState).value,
		Characteristic.CurrentHeatingCoolingState.HEAT,
	);
});

test("setting TargetTemperature sets both driver and passenger temps to the same value", async () => {
	const { hapService, vehicle } = setup();
	let received: unknown[] = [];
	(vehicle.api as any).setTemps = (...args: unknown[]) => {
		received = args;
		return Promise.resolve({});
	};

	await hapService.getCharacteristic(Characteristic.TargetTemperature).handleSetRequest(19.5 as never);

	assert.deepEqual(received, [19.5, 19.5]);
});
