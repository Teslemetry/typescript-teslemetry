import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { WallConnectorService } from "../src/energy-services/wall-connector.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeEnergySite } from "./fakeEnergySite.js";

function setup() {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Site");
	const { site, api } = createFakeEnergySite();
	const service = new WallConnectorService(platform as never, accessory, site);
	return { accessory, api, service };
}

test("creates no contact sensors until a wall_connectors entry arrives", () => {
	const { accessory } = setup();
	assert.equal(accessory.services.filter((s) => s.UUID === Service.ContactSensor.UUID).length, 0);
});

test("creates fault and connected contact sensors per DIN", () => {
	const { accessory, api } = setup();
	api.emit("liveStatus", {
		response: {
			wall_connectors: [{ din: "abc-123", wall_connector_state: 1, wall_connector_fault_state: 0 }],
		},
	});

	assert.ok(accessory.getServiceById(Service.ContactSensor, "wall-connector-fault-abc-123"));
	assert.ok(accessory.getServiceById(Service.ContactSensor, "wall-connector-connected-abc-123"));
});

test("fault code zero clears the fault contact; a nonzero code sets it", () => {
	const { accessory, api } = setup();
	api.emit("liveStatus", {
		response: { wall_connectors: [{ din: "din-1", wall_connector_state: 1, wall_connector_fault_state: 0 }] },
	});
	const fault = accessory.getServiceById(Service.ContactSensor, "wall-connector-fault-din-1")!;
	assert.equal(
		fault.getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_DETECTED,
	);

	api.emit("liveStatus", {
		response: { wall_connectors: [{ din: "din-1", wall_connector_state: 1, wall_connector_fault_state: 5 }] },
	});
	assert.equal(
		fault.getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
	);
});

test("wall_connector_state 2 (not plugged in) opens the connected contact; any other state closes it", () => {
	const { accessory, api } = setup();
	api.emit("liveStatus", {
		response: { wall_connectors: [{ din: "din-2", wall_connector_state: 2 }] },
	});
	const connected = accessory.getServiceById(Service.ContactSensor, "wall-connector-connected-din-2")!;
	assert.equal(
		connected.getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_NOT_DETECTED,
	);

	api.emit("liveStatus", {
		response: { wall_connectors: [{ din: "din-2", wall_connector_state: 3 }] },
	});
	assert.equal(
		connected.getCharacteristic(Characteristic.ContactSensorState).value,
		Characteristic.ContactSensorState.CONTACT_DETECTED,
	);
});

test("tracks multiple wall connectors independently by DIN", () => {
	const { accessory, api } = setup();
	api.emit("liveStatus", {
		response: {
			wall_connectors: [
				{ din: "din-a", wall_connector_state: 1, wall_connector_fault_state: 0 },
				{ din: "din-b", wall_connector_state: 2, wall_connector_fault_state: 3 },
			],
		},
	});

	assert.equal(accessory.services.filter((s) => s.UUID === Service.ContactSensor.UUID).length, 4);
});

test("a liveStatus event without wall_connectors is ignored without throwing", () => {
	const { api } = setup();
	assert.doesNotThrow(() => api.emit("liveStatus", { response: {} }));
});

test("destroy() detaches the liveStatus listener", () => {
	const { api, service } = setup();
	assert.equal(api.listenerCount("liveStatus"), 1);
	service.destroy();
	assert.equal(api.listenerCount("liveStatus"), 0);
});

test("setStreamFault(true) faults every discovered connector's sensors; a fresh reading for its DIN clears it", () => {
	const { accessory, api, service } = setup();
	api.emit("liveStatus", {
		response: { wall_connectors: [{ din: "din-1", wall_connector_state: 1, wall_connector_fault_state: 0 }] },
	});
	const fault = accessory.getServiceById(Service.ContactSensor, "wall-connector-fault-din-1")!;
	const connected = accessory.getServiceById(Service.ContactSensor, "wall-connector-connected-din-1")!;

	service.setStreamFault(true);

	for (const sensor of [fault, connected]) {
		assert.equal(
			sensor.getCharacteristic(Characteristic.StatusFault).value,
			Characteristic.StatusFault.GENERAL_FAULT,
		);
	}

	api.emit("liveStatus", {
		response: { wall_connectors: [{ din: "din-1", wall_connector_state: 1, wall_connector_fault_state: 0 }] },
	});

	for (const sensor of [fault, connected]) {
		assert.equal(
			sensor.getCharacteristic(Characteristic.StatusFault).value,
			Characteristic.StatusFault.NO_FAULT,
		);
	}
});

test("setStreamFault(true) has nothing to fault before any DIN has been discovered", () => {
	const { accessory, service } = setup();
	assert.doesNotThrow(() => service.setStreamFault(true));
	assert.equal(accessory.services.filter((s) => s.UUID === Service.ContactSensor.UUID).length, 0);
});

test("hydrates a DIN's sensors that already exist on the accessory (restored from Homebridge's cache) before any live_status arrives this run", () => {
	const { platform } = createFakePlatform();
	const accessory = createFakeAccessory("Test Site");
	accessory.addService(Service.ContactSensor, "Wall Connector cached Fault", "wall-connector-fault-cached");
	accessory.addService(Service.ContactSensor, "Wall Connector cached Vehicle Connected", "wall-connector-connected-cached");
	const { site } = createFakeEnergySite();

	const service = new WallConnectorService(platform as never, accessory, site);
	assert.doesNotThrow(() => service.setStreamFault(true));

	const fault = accessory.getServiceById(Service.ContactSensor, "wall-connector-fault-cached")!;
	const connected = accessory.getServiceById(Service.ContactSensor, "wall-connector-connected-cached")!;
	for (const sensor of [fault, connected]) {
		assert.equal(
			sensor.getCharacteristic(Characteristic.StatusFault).value,
			Characteristic.StatusFault.GENERAL_FAULT,
		);
	}
});

test("applies a stream fault that was already raised before this accessory was constructed to sensors restored from cache", () => {
	const { platform } = createFakePlatform({}, { streamFault: true });
	const accessory = createFakeAccessory("Test Site");
	accessory.addService(Service.ContactSensor, "Wall Connector cached Fault", "wall-connector-fault-cached");
	accessory.addService(Service.ContactSensor, "Wall Connector cached Vehicle Connected", "wall-connector-connected-cached");
	const { site } = createFakeEnergySite();

	new WallConnectorService(platform as never, accessory, site);

	const fault = accessory.getServiceById(Service.ContactSensor, "wall-connector-fault-cached")!;
	const connected = accessory.getServiceById(Service.ContactSensor, "wall-connector-connected-cached")!;
	for (const sensor of [fault, connected]) {
		assert.equal(
			sensor.getCharacteristic(Characteristic.StatusFault).value,
			Characteristic.StatusFault.GENERAL_FAULT,
		);
	}
});
