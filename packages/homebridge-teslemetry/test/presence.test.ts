import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, Service } from "hap-nodejs";
import { PresenceService } from "../src/vehicle-services/presence.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

function setup(config: Record<string, unknown> = {}) {
	const { platform } = createFakePlatform(config);
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle, sse } = createFakeVehicle();
	const presence = new PresenceService(platform as never, accessory, vehicle);
	return { accessory, sse, presence };
}

test("creates no OccupancySensor services until a presence signal arrives", () => {
	const { accessory } = setup();
	assert.equal(accessory.services.filter((s) => s.UUID === Service.OccupancySensor.UUID).length, 0);
});

test("creates Home/Work OccupancySensor services once their signals report a value, but never Favorite by default", () => {
	const { accessory, sse } = setup();
	sse.emitSignal("LocatedAtHome", true);
	sse.emitSignal("LocatedAtWork", false);
	sse.emitSignal("LocatedAtFavorite", true);

	const occupancy = accessory.services.filter((s) => s.UUID === Service.OccupancySensor.UUID);
	assert.equal(occupancy.length, 2);
	assert.equal(accessory.getServiceById(Service.OccupancySensor, "presence-favorite"), undefined);
});

test("creates the Favorite OccupancySensor only when enableFavoritePresence is on", () => {
	const { accessory, sse } = setup({ enableFavoritePresence: true });
	sse.emitSignal("LocatedAtFavorite", true);
	assert.ok(accessory.getServiceById(Service.OccupancySensor, "presence-favorite"));
});

test("applies the first value immediately, without waiting for the debounce window", () => {
	const { accessory, sse } = setup();
	sse.emitSignal("LocatedAtHome", true);

	const home = accessory.getServiceById(Service.OccupancySensor, "presence-home")!;
	assert.equal(
		home.getCharacteristic(Characteristic.OccupancyDetected).value,
		Characteristic.OccupancyDetected.OCCUPANCY_DETECTED,
	);
});

test("debounces a transition after the sensor already exists", (t) => {
	t.mock.timers.enable({ apis: ["setTimeout"] });
	const { accessory, sse } = setup();
	sse.emitSignal("LocatedAtHome", true);
	sse.emitSignal("LocatedAtHome", false);

	const home = accessory.getServiceById(Service.OccupancySensor, "presence-home")!;
	assert.equal(
		home.getCharacteristic(Characteristic.OccupancyDetected).value,
		Characteristic.OccupancyDetected.OCCUPANCY_DETECTED,
	);

	t.mock.timers.tick(60_000);
	assert.equal(
		home.getCharacteristic(Characteristic.OccupancyDetected).value,
		Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED,
	);
});

test("a flap back to the original value within the debounce window is a no-op", (t) => {
	t.mock.timers.enable({ apis: ["setTimeout"] });
	const { accessory, sse } = setup();
	sse.emitSignal("LocatedAtHome", true);
	sse.emitSignal("LocatedAtHome", false);
	sse.emitSignal("LocatedAtHome", true);

	t.mock.timers.tick(60_000);
	const home = accessory.getServiceById(Service.OccupancySensor, "presence-home")!;
	assert.equal(
		home.getCharacteristic(Characteristic.OccupancyDetected).value,
		Characteristic.OccupancyDetected.OCCUPANCY_DETECTED,
	);
});

test("a non-boolean signal value is ignored without throwing", () => {
	const { sse } = setup();
	assert.doesNotThrow(() => sse.emitSignal("LocatedAtHome", null));
});

test("destroy() detaches signal subscriptions and clears pending debounce timers", (t) => {
	t.mock.timers.enable({ apis: ["setTimeout"] });
	const { sse, presence } = setup();
	sse.emitSignal("LocatedAtHome", true);
	sse.emitSignal("LocatedAtHome", false);

	presence.destroy();

	assert.doesNotThrow(() => t.mock.timers.tick(60_000));
});
