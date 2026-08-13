import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Characteristic, Service } from "hap-nodejs";
import { TeslemetryPlatform } from "../src/platform.js";
import { VehicleAccessory } from "../src/vehicle.js";
import { createFakeAccessory } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";

// discoverDevices() talks to the real Teslemetry SDK (network + SSE), so these
// tests only cover the network-free constructor/lifecycle wiring; the SDK
// consumption itself is covered at the service level (subscribeSignal /
// subscribeToEvent tests).

function createFakeApi() {
	const emitter = new EventEmitter();
	return Object.assign(emitter, {
		hap: { Service, Characteristic },
	}) as unknown as import("homebridge").API;
}

function createFakeLog() {
	const logs: Array<{ level: string; args: unknown[] }> = [];
	const log = (level: string) => (...args: unknown[]) => logs.push({ level, args });
	return {
		log: {
			info: log("info"),
			warn: log("warn"),
			error: log("error"),
			debug: log("debug"),
			success: log("success"),
			log: log("log"),
			prefix: "Teslemetry",
		} as unknown as import("homebridge").Logging,
		logs,
	};
}

test("logs an error and registers no lifecycle listeners when accessToken is missing", () => {
	const { log, logs } = createFakeLog();
	const api = createFakeApi();

	new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "" } as never, api);

	assert.ok(logs.some((l) => l.level === "error" && String(l.args[0]).includes("Access token")));
	assert.equal((api as unknown as EventEmitter).listenerCount("didFinishLaunching"), 0);
	assert.equal((api as unknown as EventEmitter).listenerCount("shutdown"), 0);
});

test("registers didFinishLaunching and shutdown listeners when accessToken is present", () => {
	const { log } = createFakeLog();
	const api = createFakeApi();

	new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);

	assert.equal((api as unknown as EventEmitter).listenerCount("didFinishLaunching"), 1);
	assert.equal((api as unknown as EventEmitter).listenerCount("shutdown"), 1);
});

test("shutdown before any devices were discovered does not throw", () => {
	const { log } = createFakeLog();
	const api = createFakeApi();

	new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);

	assert.doesNotThrow(() => (api as unknown as EventEmitter).emit("shutdown"));
});

test("configureAccessory caches the accessory and logs it", () => {
	const { log, logs } = createFakeLog();
	const api = createFakeApi();
	const platform = new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);
	const accessory = createFakeAccessory("Cached Vehicle");

	platform.configureAccessory(accessory);

	assert.ok(logs.some((l) => l.level === "info" && l.args[1] === "Cached Vehicle"));
});

// setupStreamingHandlers()/vehicleAccessories are private; discoverDevices()
// can't be driven here without real network I/O (see the file-level comment
// above), so these tests reach past the private boundary the same way the
// production code does: construct a real accessory, register it, then wire
// up a fake sse EventEmitter in place of the real Teslemetry client's.
function setupWithVehicle(platform: TeslemetryPlatform) {
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle, sse: vehicleSse } = createFakeVehicle();
	const vehicleAccessory = new VehicleAccessory(platform, accessory, vehicle);
	(platform as unknown as { vehicleAccessories: Map<string, VehicleAccessory> }).vehicleAccessories.set(
		vehicle.vin,
		vehicleAccessory,
	);

	const sse = new EventEmitter();
	(platform as unknown as { teslemetry: { sse: EventEmitter } }).teslemetry = { sse };
	(platform as unknown as { setupStreamingHandlers: () => void }).setupStreamingHandlers();

	return { accessory, sse, vehicleSse };
}

test("two consecutive auth failures fault every registered accessory and log a terminal message", () => {
	const { log, logs } = createFakeLog();
	const api = createFakeApi();
	const platform = new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);
	const { accessory, sse } = setupWithVehicle(platform);
	const doorService = accessory.getServiceById(Service.ContactSensor, "door-driver-front")!;

	sse.emit("stream_error", { error: new Error("unauthorized"), status: 401, retries: 1 });
	sse.emit("stream_error", { error: new Error("unauthorized"), status: 401, retries: 2 });
	sse.emit("auth_failure", new Error("Stream authentication failed twice in a row"));

	assert.equal(
		doorService.getCharacteristic(Characteristic.StatusFault).value,
		Characteristic.StatusFault.GENERAL_FAULT,
	);
	assert.ok(
		logs.some((l) => l.level === "error" && String(l.args[0]).includes("stopped permanently")),
	);
});

test("a bare connect after a terminal auth failure logs recovery but does not itself clear the fault", () => {
	// "connect" fires as soon as the SSE handshake completes, before any event
	// is consumed - clearing StatusFault here would show stale/default sensor
	// state as healthy with no proof fresh data has actually arrived.
	const { log, logs } = createFakeLog();
	const api = createFakeApi();
	const platform = new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);
	const { accessory, sse } = setupWithVehicle(platform);
	const doorService = accessory.getServiceById(Service.ContactSensor, "door-driver-front")!;

	sse.emit("stream_error", { error: new Error("unauthorized"), status: 401, retries: 1 });
	sse.emit("stream_error", { error: new Error("unauthorized"), status: 401, retries: 2 });
	sse.emit("auth_failure", new Error("Stream authentication failed twice in a row"));

	sse.emit("connect");

	assert.equal(
		doorService.getCharacteristic(Characteristic.StatusFault).value,
		Characteristic.StatusFault.GENERAL_FAULT,
	);
	assert.ok(logs.some((l) => l.level === "info" && String(l.args[0]).includes("reconnected")));
});

test("a fault clears only once its own service receives a fresh reading after reconnect", () => {
	const { log } = createFakeLog();
	const api = createFakeApi();
	const platform = new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);
	const { accessory, sse, vehicleSse } = setupWithVehicle(platform);
	const doorService = accessory.getServiceById(Service.ContactSensor, "door-driver-front")!;

	sse.emit("stream_error", { error: new Error("unauthorized"), status: 401, retries: 1 });
	sse.emit("stream_error", { error: new Error("unauthorized"), status: 401, retries: 2 });
	sse.emit("auth_failure", new Error("Stream authentication failed twice in a row"));
	sse.emit("connect");

	vehicleSse.emitSignal("DoorState", { DriverFront: false });

	assert.equal(
		doorService.getCharacteristic(Characteristic.StatusFault).value,
		Characteristic.StatusFault.NO_FAULT,
	);
});

test("disconnect alone does not claim reconnection will happen, since it may be terminal", () => {
	const { log, logs } = createFakeLog();
	const api = createFakeApi();
	const platform = new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);
	const { sse } = setupWithVehicle(platform);

	sse.emit("disconnect");

	const disconnectLog = logs.find((l) => l.level === "warn" && String(l.args[0]).includes("disconnected"));
	assert.ok(disconnectLog);
	assert.ok(!String(disconnectLog.args[0]).includes("will attempt to reconnect"));
});
