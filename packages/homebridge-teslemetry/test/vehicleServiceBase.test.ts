import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, HAPStatus, Service } from "hap-nodejs";
import { BaseService } from "../src/vehicle-services/base.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

class TestService extends BaseService {
	testSubscribeSignal(signal: string, characteristic: any, mapper?: (value: any) => any): void {
		this.subscribeSignal(signal as never, characteristic, mapper);
	}

	testRegisterSet(characteristic: any, handler: (value: any) => Promise<void>): void {
		this.registerCharacteristicSet(characteristic, handler);
	}

	testRegisterGet(characteristic: any, handler: () => Promise<any>): void {
		this.registerCharacteristicGet(characteristic, handler);
	}
}

function setup(config: Record<string, unknown> = {}) {
	const { platform, logs } = createFakePlatform(config);
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle, sse } = createFakeVehicle();
	const service = new TestService(platform, accessory, vehicle, platform.Service.Battery, "Battery");
	const hapService = accessory.getService(Service.Battery)!;
	return { platform, logs, accessory, vehicle, sse, service, hapService };
}

test("constructor sets the service display name, prefixed with the vehicle name by default", () => {
	const { hapService } = setup();
	assert.equal(hapService.getCharacteristic(Characteristic.Name).value, "Test Model 3 Battery");
});

test("constructor omits the vehicle-name prefix when prefixName is false", () => {
	const { hapService } = setup({ prefixName: false });
	assert.equal(hapService.getCharacteristic(Characteristic.Name).value, "Battery");
});

test("constructor reuses an existing service instead of creating a duplicate", () => {
	const { platform, accessory, vehicle } = setup();
	new TestService(platform, accessory, vehicle, platform.Service.Battery, "Battery");
	const batteryServices = accessory.services.filter((s) => s.UUID === Service.Battery.UUID);
	assert.equal(batteryServices.length, 1);
});

test("subscribeSignal updates the characteristic when a signal value arrives", () => {
	const { hapService, service, sse } = setup();
	service.testSubscribeSignal("BatteryLevel", Characteristic.BatteryLevel);

	sse.emitSignal("BatteryLevel", 55);

	assert.equal(hapService.getCharacteristic(Characteristic.BatteryLevel).value, 55);
});

test("subscribeSignal applies the mapper before updating the characteristic", () => {
	const { hapService, service, sse } = setup();
	service.testSubscribeSignal("BatteryLevel", Characteristic.BatteryLevel, (value: number) => value * 2);

	sse.emitSignal("BatteryLevel", 10);

	assert.equal(hapService.getCharacteristic(Characteristic.BatteryLevel).value, 20);
});

test("subscribeSignal leaves the characteristic unchanged when the signal reports null (no data)", () => {
	const { hapService, service, sse } = setup();
	service.testSubscribeSignal("BatteryLevel", Characteristic.BatteryLevel);

	sse.emitSignal("BatteryLevel", 55);
	sse.emitSignal("BatteryLevel", null);

	assert.equal(hapService.getCharacteristic(Characteristic.BatteryLevel).value, 55);
});

test("subscribeSignal catches a mapper error and logs it instead of throwing", () => {
	const { service, sse, logs } = setup();
	service.testSubscribeSignal("BatteryLevel", Characteristic.BatteryLevel, () => {
		throw new Error("mapper boom");
	});

	assert.doesNotThrow(() => sse.emitSignal("BatteryLevel", 10));
	assert.ok(logs.some((l) => l.level === "error" && String(l.args[0]).includes("BatteryLevel")));
});

test("registerCharacteristicSet invokes the handler with the incoming value", async () => {
	const { hapService, service } = setup();
	let received: unknown;
	service.testRegisterSet(Characteristic.StatusLowBattery, async (value) => {
		received = value;
	});

	await hapService.getCharacteristic(Characteristic.StatusLowBattery).handleSetRequest(1 as never);

	assert.equal(received, 1);
});

test("registerCharacteristicSet converts a handler error into SERVICE_COMMUNICATION_FAILURE and logs it", async () => {
	const { hapService, service, logs } = setup();
	service.testRegisterSet(Characteristic.StatusLowBattery, async () => {
		throw new Error("set boom");
	});

	await assert.rejects(
		() => hapService.getCharacteristic(Characteristic.StatusLowBattery).handleSetRequest(1 as never),
		(err: unknown) => err === HAPStatus.SERVICE_COMMUNICATION_FAILURE,
	);
	assert.ok(logs.some((l) => l.level === "error"));
});

test("registerCharacteristicGet returns the handler's resolved value", async () => {
	const { hapService, service } = setup();
	service.testRegisterGet(Characteristic.BatteryLevel, async () => 77);

	const value = await hapService.getCharacteristic(Characteristic.BatteryLevel).handleGetRequest();

	assert.equal(value, 77);
});

test("registerCharacteristicGet converts a handler error into SERVICE_COMMUNICATION_FAILURE and logs it", async () => {
	const { hapService, service, logs } = setup();
	service.testRegisterGet(Characteristic.BatteryLevel, async () => {
		throw new Error("get boom");
	});

	await assert.rejects(
		() => hapService.getCharacteristic(Characteristic.BatteryLevel).handleGetRequest(),
		(err: unknown) => err === HAPStatus.SERVICE_COMMUNICATION_FAILURE,
	);
	assert.ok(logs.some((l) => l.level === "error"));
});
