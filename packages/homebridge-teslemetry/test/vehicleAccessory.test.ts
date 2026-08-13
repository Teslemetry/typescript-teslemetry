import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { VehicleAccessory } from "../src/vehicle.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

function setup(overrides: Parameters<typeof createFakeVehicle>[0] = {}) {
	const { platform, logs } = createFakePlatform();
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle, sse } = createFakeVehicle(overrides);
	const vehicleAccessory = new VehicleAccessory(platform as never, accessory, vehicle);
	return { accessory, logs, sse, vehicleAccessory };
}

test("initializes the expected number of distinct HAP services on a non-Cybertruck vehicle", () => {
	const { accessory } = setup();
	// Information, Battery, Climate, ChargeLimit, Door(x6) = 10 services with a
	// unique HAP service type, plus 4 distinct Switch services (ChargeSwitch,
	// Defrost, Sentry, Wake), 2 distinct LockMechanism services (Lock,
	// ChargePort), RearDefrost's ContactSensor, and TPMS's 5 ContactSensors
	// (1 aggregate hard-warning + 4 per-wheel soft-warning) - each with its
	// own subType. PresenceService creates nothing until a LocatedAt* signal
	// actually arrives. No Tonneau: the default fake VIN decodes to Model 3.
	assert.equal(accessory.services.length, 22);
	assert.equal(accessory.getService(Service.WindowCovering), undefined);
});

test("adds a Tonneau WindowCovering service only for a Cybertruck VIN", () => {
	// VIN character index 3 is Teslemetry's model discriminator (Teslemetry.ts's
	// useTeslaModel) - "C" decodes to Cybertruck.
	const { accessory } = setup({ vin: "5YJCA1E14FF000000" });
	assert.equal(accessory.services.length, 23);
	assert.ok(accessory.getService(Service.WindowCovering));
});

test("does not add a Tonneau service for a Cybercab VIN", () => {
	// Cybercab ("A") gets the generic/default model treatment; only Cybertruck
	// has the tonneau hardware.
	const { accessory } = setup({ vin: "5YJAA1E14FF000000" });
	assert.equal(accessory.services.length, 22);
	assert.equal(accessory.getService(Service.WindowCovering), undefined);
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

test("setStreamFault(true) marks every StatusFault-capable service and leaves others untouched", () => {
	const { accessory, vehicleAccessory } = setup();
	const doorService = accessory.getServiceById(Service.ContactSensor, "door-driver-front")!;
	const tpmsHard = accessory.getServiceById(Service.ContactSensor, "tpms-hard")!;
	const tpmsSoft = accessory.getServiceById(Service.ContactSensor, "tpms-soft-front-left")!;
	const lockService = accessory.getService(Service.LockMechanism)!;

	vehicleAccessory.setStreamFault(true);

	for (const service of [doorService, tpmsHard, tpmsSoft]) {
		assert.equal(
			service.getCharacteristic(Characteristic.StatusFault).value,
			Characteristic.StatusFault.GENERAL_FAULT,
		);
	}
	// LockMechanism doesn't declare StatusFault as optional; must not be force-added.
	assert.equal(lockService.testCharacteristic(Characteristic.StatusFault), false);
});

test("setStreamFault(false) clears fault back to NO_FAULT", () => {
	const { accessory, vehicleAccessory } = setup();
	const doorService = accessory.getServiceById(Service.ContactSensor, "door-driver-front")!;

	vehicleAccessory.setStreamFault(true);
	vehicleAccessory.setStreamFault(false);

	assert.equal(
		doorService.getCharacteristic(Characteristic.StatusFault).value,
		Characteristic.StatusFault.NO_FAULT,
	);
});
