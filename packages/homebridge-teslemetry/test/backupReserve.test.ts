import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { BackupReserveService } from "../src/energy-services/backup-reserve.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeEnergySite } from "./fakeEnergySite.js";

function setup() {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Site");
	const { site, api } = createFakeEnergySite();
	new BackupReserveService(platform as never, accessory, site);
	const hapService = accessory.getService(Service.Lightbulb)!;
	return { hapService, site, api };
}

test("a siteInfo event with backup_reserve_percent updates Brightness, rounded", () => {
	const { hapService, api } = setup();
	api.emit("siteInfo", { response: { backup_reserve_percent: 62.4 } });
	assert.equal(hapService.getCharacteristic(Characteristic.Brightness).value, 62);
});

test("a siteInfo event missing backup_reserve_percent leaves Brightness unchanged", () => {
	const { hapService, api } = setup();
	api.emit("siteInfo", { response: { backup_reserve_percent: 40 } });
	api.emit("siteInfo", { response: {} });
	assert.equal(hapService.getCharacteristic(Characteristic.Brightness).value, 40);
});

test("setting Brightness rounds the value and calls setBackupReserve()", async () => {
	const { hapService, api } = setup();
	let received: unknown;
	(api as any).setBackupReserve = (reserve: number) => {
		received = reserve;
		return Promise.resolve({});
	};

	await hapService.getCharacteristic(Characteristic.Brightness).handleSetRequest(55.5 as never);

	assert.equal(received, 56);
});

test("turning the lightbulb off is rejected: the site is never asked to change its backup reserve", async () => {
	const { hapService, api } = setup();
	let apiCalled = false;
	(api as any).setBackupReserve = () => {
		apiCalled = true;
		return Promise.resolve({});
	};

	await hapService.getCharacteristic(Characteristic.On).handleSetRequest(false as never);

	assert.equal(apiCalled, false);
});
