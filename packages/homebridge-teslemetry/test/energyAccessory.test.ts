import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { EnergyAccessory } from "../src/energy.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeEnergySite } from "./fakeEnergySite.js";

function setup() {
	const { platform, logs } = createFakePlatform();
	const accessory = createFakeAccessory("Test Site");
	const { site, api, sse } = createFakeEnergySite();
	const energyAccessory = new EnergyAccessory(platform as never, accessory, site);
	return { accessory, logs, api, sse, energyAccessory };
}

test("initializes the expected number of distinct HAP services", () => {
	const { accessory } = setup();
	// Information, Battery, BackupReserve, OperationMode = 4 services with a
	// unique HAP service type, plus 2 distinct Switch services (StormWatch and
	// GridCharging) and 2 distinct ContactSensor services (GridOutage and
	// StormWatchActive), each with its own subType. WallConnectorService
	// creates nothing until live_status reports a wall_connectors entry.
	assert.equal(accessory.services.length, 8);
});

test("startPolling requests siteInfo polling and an initial liveStatus REST read, but no recurring liveStatus poll", async () => {
	const { api } = setup();
	assert.deepEqual(api.requestedPolling, ["siteInfo"]);
});

test("live_status stream events update subscribed services without a recurring REST poll", () => {
	const { api, sse } = setup();
	let received: unknown;
	api.on("liveStatus", (data) => {
		received = data;
	});

	sse.emit("live_status", { live_status: { percentage_charged: 42 } });

	assert.deepEqual(received, { response: { percentage_charged: 42 } });
});

test("site_info stream events merge into the existing cache instead of replacing it", () => {
	const { api, sse } = setup();
	api.cache.siteInfo = { response: { version: "1.0", backup_reserve_percent: 20 } };

	let received: unknown;
	api.on("siteInfo", (data) => {
		received = data;
	});
	sse.emit("site_info", { site_info: { backup_reserve_percent: 30 } });

	assert.deepEqual(received, {
		response: { version: "1.0", backup_reserve_percent: 30 },
	});
});

test("destroy() stops polling and detaches all service and stream event listeners", () => {
	const { api, sse, energyAccessory } = setup();
	// Information, BackupReserve, StormWatch, OperationMode, and GridChargingService
	// each subscribe to siteInfo.
	assert.equal(api.listenerCount("siteInfo"), 5);
	assert.equal(sse.listenerCount("live_status"), 1);
	assert.equal(sse.listenerCount("site_info"), 1);

	energyAccessory.destroy();

	assert.deepEqual(api.stoppedPolling, ["siteInfo"]);
	assert.equal(api.listenerCount("siteInfo"), 0);
	assert.equal(api.listenerCount("liveStatus"), 0);
	assert.equal(sse.listenerCount("live_status"), 0);
	assert.equal(sse.listenerCount("site_info"), 0);
});

test("setStreamFault(true) marks GridOutage/StormWatchActive faulted and leaves non-sensor services untouched", () => {
	const { accessory, energyAccessory } = setup();
	const gridOutage = accessory.getServiceById(Service.ContactSensor, "grid-outage")!;
	const stormWatchActive = accessory.getServiceById(Service.ContactSensor, "storm-watch-active")!;
	const backupReserve = accessory.getService(Service.Battery)!;

	energyAccessory.setStreamFault(true);

	for (const service of [gridOutage, stormWatchActive]) {
		assert.equal(
			service.getCharacteristic(Characteristic.StatusFault).value,
			Characteristic.StatusFault.GENERAL_FAULT,
		);
	}
	// Battery doesn't declare StatusFault as optional; must not be force-added.
	assert.equal(backupReserve.testCharacteristic(Characteristic.StatusFault), false);
});

test("setStreamFault(false) clears fault back to NO_FAULT", () => {
	const { accessory, energyAccessory } = setup();
	const gridOutage = accessory.getServiceById(Service.ContactSensor, "grid-outage")!;

	energyAccessory.setStreamFault(true);
	energyAccessory.setStreamFault(false);

	assert.equal(
		gridOutage.getCharacteristic(Characteristic.StatusFault).value,
		Characteristic.StatusFault.NO_FAULT,
	);
});
