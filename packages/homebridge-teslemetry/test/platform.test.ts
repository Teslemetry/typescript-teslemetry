import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Characteristic, Service } from "hap-nodejs";
import { TeslemetryPlatform } from "../src/platform.js";
import { createFakeAccessory } from "./fakePlatform.js";

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
