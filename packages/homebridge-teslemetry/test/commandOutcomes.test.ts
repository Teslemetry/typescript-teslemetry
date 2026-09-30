import { test } from "node:test";
import assert from "node:assert/strict";
import { Characteristic, HAPStatus, Service } from "hap-nodejs";
import { LockService } from "../src/vehicle-services/lock.js";
import { ChargeSwitchService } from "../src/vehicle-services/charge-switch.js";
import { SentryService } from "../src/vehicle-services/sentry.js";
import { ChargeLimitService } from "../src/vehicle-services/charge-limit.js";
import { BackupReserveService } from "../src/energy-services/backup-reserve.js";
import { OperationModeService } from "../src/energy-services/operation-mode.js";
import { StormWatchService } from "../src/energy-services/storm-watch.js";
import { createFakeAccessory, createFakePlatform } from "./fakePlatform.js";
import { createFakeVehicle } from "./fakeVehicle.js";
import { createFakeEnergySite } from "./fakeEnergySite.js";

const { LockCurrentState, LockTargetState } = Characteristic;

const refused = (reason: string) => () => Promise.resolve({ response: { result: false, reason } });

/** Lets pending promise continuations and setImmediate callbacks run. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

function setupVehicle() {
	const { platform, logs } = createFakePlatform();
	const accessory = createFakeAccessory("Test Vehicle");
	const { vehicle } = createFakeVehicle();
	return { platform, logs, accessory, vehicle, api: vehicle.api as any };
}

function setupLock() {
	const context = setupVehicle();
	new LockService(context.platform as never, context.accessory, context.vehicle);
	const hapService = context.accessory.getService(Service.LockMechanism)!;
	return { ...context, hapService, target: hapService.getCharacteristic(LockTargetState) };
}

function setupSite() {
	const { platform, logs } = createFakePlatform();
	const accessory = createFakeAccessory("Test Site");
	const { site, api } = createFakeEnergySite();
	return { platform, logs, accessory, site, api: api as any };
}

const isCommunicationFailure = (err: unknown) => err === HAPStatus.SERVICE_COMMUNICATION_FAILURE;

// --- result: false (the api answers a refused command with HTTP 200) ---

test("a refused door_lock fails the HomeKit write, leaves the lock unsecured and logs the reason", async () => {
	const { hapService, target, api, logs } = setupLock();
	api.lockDoors = refused("could_not_wake_buses");

	await assert.rejects(() => target.handleSetRequest(LockTargetState.SECURED as never), isCommunicationFailure);

	assert.equal(hapService.getCharacteristic(LockCurrentState).value, LockCurrentState.UNSECURED);
	assert.equal(target.value, LockTargetState.UNSECURED);
	assert.ok(
		logs.some((l) => l.level === "error" && l.args.some((a) => String(a).includes("could_not_wake_buses"))),
		"the refusal reason is logged",
	);
});

test("a refused charge_start fails the HomeKit write and leaves the Charging switch off", async () => {
	const { platform, accessory, vehicle, api } = setupVehicle();
	new ChargeSwitchService(platform as never, accessory, vehicle);
	const on = accessory.getService(Service.Switch)!.getCharacteristic(Characteristic.On);
	api.startCharging = refused("disconnected");

	await assert.rejects(() => on.handleSetRequest(true as never), isCommunicationFailure);
	assert.equal(on.value, false);
});

test("a refused set_sentry_mode fails the HomeKit write and leaves the Sentry switch off", async () => {
	const { platform, accessory, vehicle, api } = setupVehicle();
	new SentryService(platform as never, accessory, vehicle);
	const on = accessory.getService(Service.Switch)!.getCharacteristic(Characteristic.On);
	api.setSentryMode = refused("vehicle_not_in_park");

	await assert.rejects(() => on.handleSetRequest(true as never), isCommunicationFailure);
	assert.equal(on.value, false);
});

test("a refused energy command fails the HomeKit write", async () => {
	const { platform, accessory, site, api } = setupSite();
	new StormWatchService(platform as never, accessory, site);
	const on = accessory.getService(Service.Switch)!.getCharacteristic(Characteristic.On);
	api.setStormMode = refused("not_supported");

	await assert.rejects(() => on.handleSetRequest(true as never), isCommunicationFailure);
	assert.equal(on.value, false);
});

for (const reason of ["already_set", "not_charging", "requested"]) {
	test(`result: false with the benign reason "${reason}" still succeeds`, async () => {
		const { hapService, target, api } = setupLock();
		api.lockDoors = refused(reason);

		await target.handleSetRequest(LockTargetState.SECURED as never);

		assert.equal(hapService.getCharacteristic(LockCurrentState).value, LockCurrentState.SECURED);
		assert.equal(target.value, LockTargetState.SECURED);
	});
}

// --- commands slower than HAP's 9 s write limit ---

/** Starts a lock write whose command stays pending, then advances to just before HAP's 9 s limit. */
async function startSlowLock(t: import("node:test").TestContext) {
	t.mock.timers.enable({ apis: ["setTimeout"] });
	const context = setupLock();
	let finish!: { resolve: (data: unknown) => void; reject: (error: unknown) => void };
	context.api.lockDoors = () => new Promise((resolve, reject) => (finish = { resolve, reject }));

	let answer: "pending" | "success" | "failure" = "pending";
	context.target.handleSetRequest(LockTargetState.SECURED as never).then(
		() => (answer = "success"),
		() => (answer = "failure"),
	);
	await settle();
	t.mock.timers.tick(8999);
	await settle();
	return { ...context, finish, answer: () => answer };
}

test("a command still running near HAP's 9 s limit is answered as a success, and applied when it then succeeds", async (t) => {
	const { hapService, target, finish, answer } = await startSlowLock(t);

	assert.equal(answer(), "success");
	assert.equal(target.value, LockTargetState.SECURED);
	assert.equal(hapService.getCharacteristic(LockCurrentState).value, LockCurrentState.UNSECURED);

	finish.resolve({ response: { result: true, reason: "" } });
	await settle();

	assert.equal(target.value, LockTargetState.SECURED);
	assert.equal(hapService.getCharacteristic(LockCurrentState).value, LockCurrentState.SECURED);
});

test("a command that fails after HomeKit was answered puts the characteristic back and logs it", async (t) => {
	const { hapService, target, finish, answer, logs } = await startSlowLock(t);
	assert.equal(answer(), "success");

	finish.reject(new Error("vehicle offline"));
	await settle();

	assert.equal(target.value, LockTargetState.UNSECURED);
	assert.equal(hapService.getCharacteristic(LockCurrentState).value, LockCurrentState.UNSECURED);
	assert.ok(logs.some((l) => l.level === "error" && l.args.some((a) => String(a).includes("vehicle offline"))));
});

test("a command refused after HomeKit was answered puts the characteristic back", async (t) => {
	const { hapService, target, finish, answer } = await startSlowLock(t);
	assert.equal(answer(), "success");

	finish.resolve({ response: { result: false, reason: "could_not_wake_buses" } });
	await settle();

	assert.equal(target.value, LockTargetState.UNSECURED);
	assert.equal(hapService.getCharacteristic(LockCurrentState).value, LockCurrentState.UNSECURED);
});

test("a late failure leaves a newer successful write of the same value in place", async (t) => {
	const { hapService, target, api, finish, answer } = await startSlowLock(t);
	assert.equal(answer(), "success");

	api.lockDoors = () => Promise.resolve({ response: { result: true, reason: "" } });
	await target.handleSetRequest(LockTargetState.SECURED as never);

	finish.reject(new Error("vehicle offline"));
	await settle();

	assert.equal(target.value, LockTargetState.SECURED);
	assert.equal(hapService.getCharacteristic(LockCurrentState).value, LockCurrentState.SECURED);
});

// --- "always on" controls ---

test("turning the Charge Limit bulb off leaves it on once the write has completed", async () => {
	const { platform, accessory, vehicle } = setupVehicle();
	new ChargeLimitService(platform as never, accessory, vehicle);
	const on = accessory.getService(Service.Lightbulb)!.getCharacteristic(Characteristic.On);

	await on.handleSetRequest(false as never);
	await settle();

	assert.equal(on.value, true);
});

test("turning the Backup Reserve bulb off leaves it on once the write has completed", async () => {
	const { platform, accessory, site } = setupSite();
	new BackupReserveService(platform as never, accessory, site);
	const on = accessory.getService(Service.Lightbulb)!.getCharacteristic(Characteristic.On);

	await on.handleSetRequest(false as never);
	await settle();

	assert.equal(on.value, true);
});

test("turning the Operation Mode fan off leaves it on once the write has completed", async () => {
	const { platform, accessory, site } = setupSite();
	new OperationModeService(platform as never, accessory, site);
	const on = accessory.getService(Service.Fan)!.getCharacteristic(Characteristic.On);

	await on.handleSetRequest(false as never);
	await settle();

	assert.equal(on.value, true);
});

// --- operation mode ---

for (const raw of [99, 100]) {
	test(`an Operation Mode speed of ${raw} maps to no settable mode, so the write fails instead of reporting success`, async () => {
		const { platform, accessory, site, api } = setupSite();
		new OperationModeService(platform as never, accessory, site);
		const speed = accessory.getService(Service.Fan)!.getCharacteristic(Characteristic.RotationSpeed);
		api.emit("siteInfo", { response: { default_real_mode: "autonomous" } });

		await assert.rejects(
			() => speed.handleSetRequest(raw as never),
			(err: unknown) => err === HAPStatus.INVALID_VALUE_IN_REQUEST,
		);

		assert.equal(api.calls.length, 0);
		assert.equal(speed.value, 33);
	});
}
