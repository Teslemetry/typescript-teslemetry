import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Accessory, Characteristic, HAPStatus, HapStatusError, Service, uuid } from "hap-nodejs";
import type { PlatformAccessory } from "homebridge";
import { TeslemetryPlatform } from "../src/platform.js";
import { VehicleAccessory } from "../src/vehicle.js";
import { createFakeAccessory } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";
import { createFakeEnergySite } from "./fakeEnergySite.js";

// discoverDevices() talks to the real Teslemetry SDK (network + SSE), so these
// tests only cover the network-free constructor/lifecycle wiring; the SDK
// consumption itself is covered at the service level (subscribeSignal /
// subscribeToEvent tests).

function createFakeApi() {
	const emitter = new EventEmitter();
	return Object.assign(emitter, {
		hap: {
			Service,
			Characteristic,
			HapStatusError,
			HAPStatus: { SERVICE_COMMUNICATION_FAILURE: HAPStatus.SERVICE_COMMUNICATION_FAILURE },
			uuid,
		},
		registered: [] as PlatformAccessory[],
		// hap-nodejs' Accessory asserts a non-empty name, as Homebridge's PlatformAccessory does.
		platformAccessory: function (displayName: string, id: string) {
			const accessory = new Accessory(displayName, id);
			(accessory as unknown as { context: Record<string, unknown> }).context = {};
			return accessory;
		},
		registerPlatformAccessories(_plugin: string, _platform: string, accessories: PlatformAccessory[]) {
			this.registered.push(...accessories);
		},
		updatePlatformAccessories() {},
		unregisterPlatformAccessories() {},
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
	// Homebridge hands the cached accessory back first; registration then
	// releases its hold before building the live services.
	platform.configureAccessory(accessory);
	(platform as unknown as { release: (uuid: string) => void }).release(accessory.UUID);
	const vehicleAccessory = new VehicleAccessory(platform, accessory, vehicle);
	(platform as unknown as { vehicleAccessories: Map<string, VehicleAccessory> }).vehicleAccessories.set(
		vehicle.vin,
		vehicleAccessory,
	);

	const sse = Object.assign(new EventEmitter(), { connects: 0, connect() { sse.connects++; } });
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
		logs.some((l) => l.level === "error" && String(l.args[0]).includes("access token was rejected")),
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

test("disconnect logs at debug only, since stream_error already names the reason", () => {
	const { log, logs } = createFakeLog();
	const api = createFakeApi();
	const platform = new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);
	const { sse } = setupWithVehicle(platform);

	sse.emit("disconnect");

	assert.ok(logs.some((l) => l.level === "debug" && String(l.args[0]).includes("disconnected")));
	assert.ok(!logs.some((l) => l.level === "warn" || l.level === "error"));
});

/** Read a characteristic the way a HomeKit controller does. */
async function read(characteristic: Characteristic): Promise<unknown> {
	try {
		return await characteristic.handleGetRequest();
	} catch (status) {
		return { status };
	}
}

function emitAuthFailure(sse: EventEmitter) {
	sse.emit("stream_error", { error: new Error("SSE failed: 401 Unauthorized"), status: 401, retries: 1 });
	sse.emit("stream_error", { error: new Error("SSE failed: 401 Unauthorized"), status: 401, retries: 2 });
	sse.emit("auth_failure", new Error("SSE failed: 401 Unauthorized"));
}

test("an auth failure shows No Response on every tile, and a connect restores the last-known values", async () => {
	const { log } = createFakeLog();
	const api = createFakeApi();
	const platform = new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);
	const { accessory, sse, vehicleSse } = setupWithVehicle(platform);
	vehicleSse.emitSignal("Locked", true);
	const lock = accessory.getService(Service.LockMechanism)!.getCharacteristic(Characteristic.LockCurrentState);
	const name = accessory.getService(Service.LockMechanism)!.getCharacteristic(Characteristic.Name);
	const model = accessory.getService(Service.AccessoryInformation)!.getCharacteristic(Characteristic.Model);

	emitAuthFailure(sse);

	assert.deepEqual(await read(lock), { status: HAPStatus.SERVICE_COMMUNICATION_FAILURE });
	assert.equal(typeof (await read(name)), "string");
	assert.equal(typeof (await read(model)), "string");

	sse.emit("connect");

	assert.equal(await read(lock), Characteristic.LockCurrentState.SECURED);
});

test("a write fails while the tiles show No Response", async () => {
	const { log } = createFakeLog();
	const api = createFakeApi();
	const platform = new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);
	const { accessory, sse } = setupWithVehicle(platform);
	const target = accessory.getService(Service.LockMechanism)!.getCharacteristic(Characteristic.LockTargetState);

	emitAuthFailure(sse);

	await assert.rejects(
		target.handleSetRequest(Characteristic.LockTargetState.SECURED),
		(status: unknown) => status === HAPStatus.SERVICE_COMMUNICATION_FAILURE,
	);
});

test("an auth failure connects again after five minutes", (t) => {
	t.mock.timers.enable({ apis: ["setTimeout"] });
	const { log } = createFakeLog();
	const api = createFakeApi();
	const platform = new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);
	const { sse } = setupWithVehicle(platform);

	emitAuthFailure(sse);
	t.mock.timers.tick(5 * 60_000 - 1);
	assert.equal(sse.connects, 0);
	t.mock.timers.tick(1);
	assert.equal(sse.connects, 1);
});

test("shutdown cancels a pending auth retry", (t) => {
	t.mock.timers.enable({ apis: ["setTimeout"] });
	const { log } = createFakeLog();
	const api = createFakeApi();
	const platform = new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);
	const { sse } = setupWithVehicle(platform);
	(sse as unknown as { close: () => void }).close = () => {};

	emitAuthFailure(sse);
	(api as unknown as EventEmitter).emit("shutdown");
	t.mock.timers.tick(10 * 60_000);
	assert.equal(sse.connects, 0);
});

test("402 shows No Response and is named in the log; an ordinary drop keeps the last-known values", async () => {
	const { log, logs } = createFakeLog();
	const api = createFakeApi();
	const platform = new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);
	const { accessory, sse, vehicleSse } = setupWithVehicle(platform);
	vehicleSse.emitSignal("Locked", true);
	const lock = accessory.getService(Service.LockMechanism)!.getCharacteristic(Characteristic.LockCurrentState);

	sse.emit("stream_error", { error: new TypeError("terminated"), status: undefined, retries: 1 });
	assert.equal(await read(lock), Characteristic.LockCurrentState.SECURED);
	sse.emit("stream_error", { error: new Error("SSE failed: 429 Too Many Requests"), status: 429, retries: 2 });
	assert.equal(await read(lock), Characteristic.LockCurrentState.SECURED);

	sse.emit("stream_error", { error: new Error("SSE failed: 402 Payment Required"), status: 402, retries: 3 });
	assert.deepEqual(await read(lock), { status: HAPStatus.SERVICE_COMMUNICATION_FAILURE });

	const warnings = logs.filter((l) => l.level === "warn").map((l) => String(l.args[0]));
	assert.deepEqual(warnings, [
		"Streaming API error (connection lost, attempt 1): terminated",
		"Streaming API error (too many connections, HTTP 429, attempt 2): SSE failed: 429 Too Many Requests",
		"Streaming API error (subscription required, HTTP 402, attempt 3): SSE failed: 402 Payment Required",
	]);

	sse.emit("connect");
	assert.equal(await read(lock), Characteristic.LockCurrentState.SECURED);
});

// fetchProductsWithRetry() and reconcileAccessories() are private, exercised
// past the private boundary the same way the stream-health tests above do.
type FetchProductsWithRetry = (
	teslemetry: { createProducts: () => Promise<unknown> },
	signal: AbortSignal,
) => Promise<unknown>;

test("fetchProductsWithRetry retries a transient createProducts() failure and returns once it succeeds", async () => {
	const { log } = createFakeLog();
	const api = createFakeApi();
	const platform = new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);

	let calls = 0;
	const fakeTeslemetry = {
		createProducts: async () => {
			calls++;
			if (calls === 1) throw new Error("network blip");
			return { vehicles: {}, energySites: {} };
		},
	};

	const products = await (
		platform as unknown as { fetchProductsWithRetry: FetchProductsWithRetry }
	).fetchProductsWithRetry(fakeTeslemetry, new AbortController().signal);

	assert.equal(calls, 2);
	assert.deepEqual(products, { vehicles: {}, energySites: {} });
});

test("fetchProductsWithRetry stops retrying immediately once its abort signal is aborted", async () => {
	const { log } = createFakeLog();
	const api = createFakeApi();
	const platform = new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);

	let calls = 0;
	const fakeTeslemetry = {
		createProducts: async () => {
			calls++;
			throw new Error("still down");
		},
	};

	const controller = new AbortController();
	controller.abort();

	await assert.rejects(
		(platform as unknown as { fetchProductsWithRetry: FetchProductsWithRetry }).fetchProductsWithRetry(
			fakeTeslemetry,
			controller.signal,
		),
		/still down/,
	);
	assert.equal(calls, 1);
});

test("reconcileAccessories evicts a stale cached vehicle accessory and destroys its listeners", () => {
	const { log } = createFakeLog();
	const unregistered: PlatformAccessory[] = [];
	const api = createFakeApi();
	(api as unknown as { unregisterPlatformAccessories: (plugin: string, platformName: string, accs: PlatformAccessory[]) => void })
		.unregisterPlatformAccessories = (_plugin, _platformName, accs) => unregistered.push(...accs);

	const platform = new TeslemetryPlatform(log, { platform: "Teslemetry", accessToken: "fake-token" } as never, api);

	const keptAccessory = createFakeAccessory("Kept Vehicle");
	(keptAccessory.context as { vehicle?: { vin: string } }).vehicle = { vin: "KEEP" };
	const staleAccessory = createFakeAccessory("Stale Vehicle");
	(staleAccessory.context as { vehicle?: { vin: string } }).vehicle = { vin: "STALE" };

	platform.configureAccessory(keptAccessory);
	platform.configureAccessory(staleAccessory);

	const { vehicle: staleVehicle, sse: staleSse } = createFakeVehicle({ vin: "STALE" });
	const staleVehicleAccessory = new VehicleAccessory(platform, staleAccessory, staleVehicle);
	(platform as unknown as { vehicleAccessories: Map<string, VehicleAccessory> }).vehicleAccessories.set(
		"STALE",
		staleVehicleAccessory,
	);

	staleSse.emitSignal("BatteryLevel", 40);
	const staleBattery = staleAccessory.getService(Service.Battery)!;
	assert.equal(staleBattery.getCharacteristic(Characteristic.BatteryLevel).value, 40);

	(platform as unknown as { reconcileAccessories: (keep: Set<string>) => void }).reconcileAccessories(
		new Set([keptAccessory.UUID]),
	);

	assert.deepEqual(unregistered, [staleAccessory]);
	assert.equal(
		(platform as unknown as { vehicleAccessories: Map<string, VehicleAccessory> }).vehicleAccessories.has("STALE"),
		false,
	);
	assert.equal(
		(platform as unknown as { accessories: PlatformAccessory[] }).accessories.includes(staleAccessory),
		false,
	);
	assert.equal(
		(platform as unknown as { accessories: PlatformAccessory[] }).accessories.includes(keptAccessory),
		true,
	);

	// The stale accessory's services were destroyed before eviction, so a
	// later SSE signal for it no longer updates its (now-unregistered) characteristic.
	staleSse.emitSignal("BatteryLevel", 90);
	assert.equal(staleBattery.getCharacteristic(Characteristic.BatteryLevel).value, 40);
});

type RegisterProducts = (products: unknown) => void;

function createPlatform(config: Record<string, unknown> = {}) {
	const { log, logs } = createFakeLog();
	const api = createFakeApi();
	const platform = new TeslemetryPlatform(
		log,
		{ platform: "Teslemetry", accessToken: "fake-token", ...config } as never,
		api,
	);
	const registered = (api as unknown as { registered: PlatformAccessory[] }).registered;
	return { platform, api, log, logs, registered };
}

/** A cached vehicle accessory as Homebridge restores it: services, no handlers. */
function createCachedVehicleAccessory(vin: string) {
	const accessory = new Accessory("Cached Vehicle", uuid.generate(vin));
	(accessory as unknown as { context: Record<string, unknown> }).context = { vehicle: { vin } };
	accessory.addService(new Service.LockMechanism("Lock"));
	return accessory as unknown as PlatformAccessory;
}

async function hapSet(accessory: PlatformAccessory, value: unknown) {
	const characteristic = accessory
		.getService(Service.LockMechanism)!
		.getCharacteristic(Characteristic.LockTargetState);
	return characteristic.handleSetRequest(value as never);
}

async function hapGet(accessory: PlatformAccessory) {
	const characteristic = accessory
		.getService(Service.LockMechanism)!
		.getCharacteristic(Characteristic.LockTargetState);
	return characteristic.handleGetRequest();
}

test("a cached accessory fails writes before discovery and keeps its last value for reads", async () => {
	const { platform } = createPlatform();
	const accessory = createCachedVehicleAccessory("CACHED");
	accessory.getService(Service.LockMechanism)!.updateCharacteristic(Characteristic.LockTargetState, 1);

	platform.configureAccessory(accessory);

	await assert.rejects(hapSet(accessory, 0), (status) =>
		status === HAPStatus.SERVICE_COMMUNICATION_FAILURE,
	);
	assert.equal(await hapGet(accessory), 1);
});

test("fetchProductsWithRetry keeps retrying past five failures and marks cached accessories No Response after the grace period", async (t) => {
	const { platform, logs } = createPlatform();
	const accessory = createCachedVehicleAccessory("CACHED");
	platform.configureAccessory(accessory);
	(platform as unknown as { retryDelayMs: () => number }).retryDelayMs = () => 0;

	let now = 0;
	t.mock.method(Date, "now", () => now);
	let calls = 0;
	const fakeTeslemetry = {
		createProducts: async () => {
			calls++;
			now += 60_000;
			if (calls < 8) {
				// The client throws the api's error body, not an Error.
				throw { response: null, error: "subscription_required", error_description: "Subscription lapsed" };
			}
			return { vehicles: {}, energySites: {} };
		},
	};

	let readDuringOutage: unknown;
	const original = fakeTeslemetry.createProducts;
	fakeTeslemetry.createProducts = async () => {
		if (calls === 7) {
			readDuringOutage = await hapGet(accessory).catch((status: unknown) => status);
		}
		return original();
	};

	await (platform as unknown as { fetchProductsWithRetry: FetchProductsWithRetry }).fetchProductsWithRetry(
		fakeTeslemetry,
		new AbortController().signal,
	);

	assert.equal(calls, 8);
	assert.equal(readDuringOutage, HAPStatus.SERVICE_COMMUNICATION_FAILURE);
	assert.ok(logs.some((l) => l.level === "warn" && String(l.args[0]).includes("Subscription lapsed")));
	assert.ok(!logs.some((l) => String(l.args[0]).includes("[object Object]")));
	assert.equal(logs.filter((l) => l.level === "error" && String(l.args[0]).includes("No Response")).length, 1);
	// Reachable again: reads return the last-known value until discovery builds the services.
	assert.equal(await hapGet(accessory), 0);
});

test("one product that fails to set up does not keep the others out", () => {
	const { platform, registered, logs } = createPlatform();
	const broken = createFakeVehicle({ vin: "BROKEN", sse: undefined as never });
	const good = createFakeVehicle({ vin: "GOOD", name: "Good Car" });
	const { site } = createFakeEnergySite({ id: 1234567890, name: "Home" });

	(platform as unknown as { registerProducts: RegisterProducts }).registerProducts({
		vehicles: { BROKEN: broken.vehicle, GOOD: good.vehicle },
		energySites: { "1234567890": site },
	});

	assert.deepEqual(registered.map((a) => a.displayName), ["Good Car", "Home"]);
	assert.ok(logs.some((l) => l.level === "error" && String(l.args[0]).includes("BROKEN")));
});

test("a vehicle or site with an empty name gets a fallback name", () => {
	const { platform, registered } = createPlatform();
	const unnamed = createFakeVehicle({ vin: "5YJ3E1EA7KF000001", name: "" });
	const { site } = createFakeEnergySite({ id: 1234567890, name: "" });

	(platform as unknown as { registerProducts: RegisterProducts }).registerProducts({
		vehicles: { "5YJ3E1EA7KF000001": unnamed.vehicle },
		energySites: { "1234567890": site },
	});

	assert.deepEqual(registered.map((a) => a.displayName), ["Model 3", "Energy Site"]);
});

test("the legacy ignore_vin and ignore_site keys are still read", () => {
	const { platform, registered, logs } = createPlatform({
		ignore_vin: ["IGNORED"],
		ignore_site: ["1234567890"],
	});
	const ignored = createFakeVehicle({ vin: "IGNORED", name: "Ignored Car" });
	const kept = createFakeVehicle({ vin: "KEPT", name: "Kept Car" });
	const { site } = createFakeEnergySite({ id: 1234567890, name: "Home" });

	(platform as unknown as { registerProducts: RegisterProducts }).registerProducts({
		vehicles: { IGNORED: ignored.vehicle, KEPT: kept.vehicle },
		energySites: { "1234567890": site },
	});

	assert.deepEqual(registered.map((a) => a.displayName), ["Kept Car"]);
	assert.ok(logs.some((l) => l.level === "warn" && String(l.args[0]).includes("ignoreVehicles")));
});

test("a vehicle that cannot stream logs one plain line; a cached one stays and answers No Response", async () => {
	const { platform, registered, logs } = createPlatform();
	const cachedAccessory = createCachedVehicleAccessory("NOSEAT");
	platform.configureAccessory(cachedAccessory);
	const noSeat = createFakeVehicle({
		vin: "NOSEAT",
		name: "No Seat",
		metadata: { access: false, issue: null, config: {} } as never,
	});
	const noKey = createFakeVehicle({
		vin: "NOKEY",
		name: "No Key",
		metadata: { access: true, polling: true, issue: "key", config: {} } as never,
	});
	const unknown = createFakeVehicle({
		vin: "UNKNOWN",
		name: "Unknown Flags",
		metadata: { access: null, issue: "no_data", config: {} } as never,
	});

	(platform as unknown as { registerProducts: RegisterProducts }).registerProducts({
		vehicles: { NOSEAT: noSeat.vehicle, NOKEY: noKey.vehicle, UNKNOWN: unknown.vehicle },
		energySites: {},
	});

	assert.deepEqual(registered.map((a) => a.displayName), ["Unknown Flags"]);
	const lines = logs.filter((l) => l.level === "warn" && String(l.args[0]).includes("cannot stream"));
	assert.equal(lines.length, 2);
	assert.ok(String(lines[0].args[0]).includes("not included in your Teslemetry subscription"));
	assert.ok(String(lines[1].args[0]).includes("virtual key"));
	// Kept, not evicted, and unreachable.
	assert.ok((platform as unknown as { accessories: PlatformAccessory[] }).accessories.includes(cachedAccessory));
	await assert.rejects(hapGet(cachedAccessory), (status) =>
		status === HAPStatus.SERVICE_COMMUNICATION_FAILURE,
	);
});

test("a cached accessory that discovery sets up gets live handlers in place of the hold", async () => {
	const { platform } = createPlatform();
	const { vehicle, calls } = createFakeVehicle({ vin: "LIVE", name: "Live Car" });
	const accessory = createCachedVehicleAccessory("LIVE");
	platform.configureAccessory(accessory);

	(platform as unknown as { registerProducts: RegisterProducts }).registerProducts({
		vehicles: { LIVE: vehicle },
		energySites: {},
	});

	const lock = accessory.getService(Service.LockMechanism)!;
	await lock.getCharacteristic(Characteristic.LockTargetState).handleSetRequest(1);
	assert.deepEqual(calls.map((c) => c.method), ["lockDoors"]);
});
