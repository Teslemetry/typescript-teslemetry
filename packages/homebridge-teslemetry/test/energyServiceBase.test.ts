import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, HAPStatus, Service } from "hap-nodejs";
import { BaseEnergyService } from "../src/energy-services/base.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeEnergySite } from "./fakeEnergySite.js";

class TestEnergyService extends BaseEnergyService {
	testSubscribeToEvent(eventName: "siteInfo" | "liveStatus", handler: (data: any) => void): void {
		this.subscribeToEvent(eventName, handler);
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
	const accessory = createFakeAccessory("Test Site");
	const { site, api } = createFakeEnergySite();
	const service = new TestEnergyService(platform, accessory, site, platform.Service.Lightbulb, "Backup Reserve");
	const hapService = accessory.getService(Service.Lightbulb)!;
	return { platform, logs, accessory, site, api, service, hapService };
}

test("constructor sets the service display name, prefixed with the site name by default", () => {
	const { hapService } = setup();
	assert.equal(hapService.getCharacteristic(Characteristic.Name).value, "Test Site Backup Reserve");
});

test("subscribeToEvent invokes the handler when the api emits the polling event", () => {
	const { service, api } = setup();
	let received: unknown;
	service.testSubscribeToEvent("siteInfo", (data) => {
		received = data;
	});

	api.emit("siteInfo", { response: { backup_reserve_percent: 42 } });

	assert.deepEqual(received, { response: { backup_reserve_percent: 42 } });
});

test("subscribeToEvent catches a handler error and logs it instead of throwing", () => {
	const { service, api, logs } = setup();
	service.testSubscribeToEvent("siteInfo", () => {
		throw new Error("handler boom");
	});

	assert.doesNotThrow(() => api.emit("siteInfo", {}));
	assert.ok(logs.some((l) => l.level === "error" && String(l.args[0]).includes("siteInfo")));
});

test("destroy() stops the api listener so later events no longer reach the handler", () => {
	const { service, api } = setup();
	let calls = 0;
	service.testSubscribeToEvent("siteInfo", () => {
		calls++;
	});

	api.emit("siteInfo", {});
	service.destroy();
	api.emit("siteInfo", {});

	assert.equal(calls, 1);
});

test("registerCharacteristicSet invokes the handler with the incoming value", async () => {
	const { hapService, service } = setup();
	let received: unknown;
	service.testRegisterSet(Characteristic.Brightness, async (value) => {
		received = value;
	});

	await hapService.getCharacteristic(Characteristic.Brightness).handleSetRequest(80 as never);

	assert.equal(received, 80);
});

test("registerCharacteristicSet converts a handler error into SERVICE_COMMUNICATION_FAILURE and logs it", async () => {
	const { hapService, service, logs } = setup();
	service.testRegisterSet(Characteristic.Brightness, async () => {
		throw new Error("set boom");
	});

	await assert.rejects(
		() => hapService.getCharacteristic(Characteristic.Brightness).handleSetRequest(80 as never),
		(err: unknown) => err === HAPStatus.SERVICE_COMMUNICATION_FAILURE,
	);
	assert.ok(logs.some((l) => l.level === "error"));
});

test("registerCharacteristicGet returns the handler's resolved value", async () => {
	const { hapService, service } = setup();
	service.testRegisterGet(Characteristic.Brightness, async () => 33);

	const value = await hapService.getCharacteristic(Characteristic.Brightness).handleGetRequest();

	assert.equal(value, 33);
});

test("registerCharacteristicGet converts a handler error into SERVICE_COMMUNICATION_FAILURE and logs it", async () => {
	const { hapService, service, logs } = setup();
	service.testRegisterGet(Characteristic.Brightness, async () => {
		throw new Error("get boom");
	});

	await assert.rejects(
		() => hapService.getCharacteristic(Characteristic.Brightness).handleGetRequest(),
		(err: unknown) => err === HAPStatus.SERVICE_COMMUNICATION_FAILURE,
	);
	assert.ok(logs.some((l) => l.level === "error"));
});
