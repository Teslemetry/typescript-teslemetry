import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Teslemetry } from '@teslemetry/api';
import { VehicleHandler } from '../lib/VehicleHandler.js';
import { StateManager } from '../lib/StateManager.js';
import { createFakeAdapter } from './fakeAdapter.js';

const VIN = '5YJSA1E14FF000000';

test('registerVehicle does not throw when the SDK already discovered the vehicle (regression: adapter aborted at startup)', () => {
	const teslemetry = new Teslemetry('fake-token');
	// Simulates createProducts()'s get-or-create discovery, which runs before registerVehicle.
	teslemetry.api.getVehicle(VIN);

	const { adapter } = createFakeAdapter();
	const handler = new VehicleHandler(adapter, teslemetry, new StateManager(adapter));

	assert.doesNotThrow(() => handler.registerVehicle(VIN));
});

const COMMAND_CASES: Array<[command: string, method: string, args: any[]]> = [
	['wake', 'wakeUp', []],
	['lock', 'lockDoors', []],
	['unlock', 'unlockDoors', []],
	['start_climate', 'startAutoConditioning', []],
	['stop_climate', 'stopAutoConditioning', []],
	['start_charging', 'startCharging', []],
	['stop_charging', 'stopCharging', []],
	['flash_lights', 'flashLights', []],
	['honk_horn', 'honkHorn', []],
	['open_frunk', 'actuateTrunk', ['front']],
	['open_trunk', 'actuateTrunk', ['rear']],
];

for (const [command, method, expectedArgs] of COMMAND_CASES) {
	test(`executeCommand("${command}") calls the real SDK method ${method}() (regression: was calling a non-existent snake_case method)`, async () => {
		const teslemetry = new Teslemetry('fake-token');
		const vehicle = teslemetry.api.getVehicle(VIN);

		let calledWith: any[] | undefined;
		(vehicle as any)[method] = (...args: any[]) => {
			calledWith = args;
			return Promise.resolve({});
		};

		const { adapter } = createFakeAdapter();
		const handler = new VehicleHandler(adapter, teslemetry, new StateManager(adapter));
		handler.registerVehicle(VIN);

		await handler.executeCommand(VIN, command);

		assert.deepEqual(calledWith, expectedArgs);
	});
}

test('handleStateChange for charge_limit_soc calls setChargeLimit(percent) positionally', async () => {
	const teslemetry = new Teslemetry('fake-token');
	const vehicle = teslemetry.api.getVehicle(VIN);

	let calledWith: any[] | undefined;
	(vehicle as any).setChargeLimit = (...args: any[]) => {
		calledWith = args;
		return Promise.resolve({});
	};

	const { adapter } = createFakeAdapter();
	const handler = new VehicleHandler(adapter, teslemetry, new StateManager(adapter));
	handler.registerVehicle(VIN);

	await handler.handleStateChange(VIN, 'charge', 'charge_limit_soc', 90);

	assert.deepEqual(calledWith, [90]);
});

test('handleStateChange for sentry_mode calls setSentryMode(boolean)', async () => {
	const teslemetry = new Teslemetry('fake-token');
	const vehicle = teslemetry.api.getVehicle(VIN);

	let calledWith: any[] | undefined;
	(vehicle as any).setSentryMode = (...args: any[]) => {
		calledWith = args;
		return Promise.resolve({});
	};

	const { adapter } = createFakeAdapter();
	const handler = new VehicleHandler(adapter, teslemetry, new StateManager(adapter));
	handler.registerVehicle(VIN);

	await handler.handleStateChange(VIN, 'state', 'sentry_mode', true);

	assert.deepEqual(calledWith, [true]);
});

test('handleStateChange for driver_temp_setting calls setTemps(driver, passenger) positionally, preserving the other temp', async () => {
	const teslemetry = new Teslemetry('fake-token');
	const vehicle = teslemetry.api.getVehicle(VIN);

	let calledWith: any[] | undefined;
	(vehicle as any).setTemps = (...args: any[]) => {
		calledWith = args;
		return Promise.resolve({});
	};

	const { adapter } = createFakeAdapter();
	const stateManager = new StateManager(adapter);
	await stateManager.createVehicleStates({ vin: VIN, display_name: 'Test Car' });
	await adapter.setStateAsync(`vehicles.${VIN}.climate.passenger_temp_setting`, 19, true);

	const handler = new VehicleHandler(adapter, teslemetry, stateManager);
	handler.registerVehicle(VIN);

	await handler.handleStateChange(VIN, 'climate', 'driver_temp_setting', 22);

	assert.deepEqual(calledWith, [22, 19]);
});

test('handleStateChange for driver_temp_setting on a RHD vehicle sends setTemps(left, right) with the driver value in the right-side slot, preserving the other temp (regression: was always putting driver first)', async () => {
	const teslemetry = new Teslemetry('fake-token');
	const vehicle = teslemetry.api.getVehicle(VIN);

	let calledWith: any[] | undefined;
	(vehicle as any).setTemps = (...args: any[]) => {
		calledWith = args;
		return Promise.resolve({});
	};

	const { adapter } = createFakeAdapter();
	const stateManager = new StateManager(adapter);
	await stateManager.createVehicleStates({ vin: VIN, display_name: 'Test Car', rhd: true });
	await adapter.setStateAsync(`vehicles.${VIN}.climate.passenger_temp_setting`, 19, true);

	const handler = new VehicleHandler(adapter, teslemetry, stateManager);
	handler.registerVehicle(VIN);

	await handler.handleStateChange(VIN, 'climate', 'driver_temp_setting', 22);

	assert.deepEqual(calledWith, [19, 22]);
});

test('a rejected lock command restores state.locked to its prior value and propagates once, unlogged, to the caller', async () => {
	const teslemetry = new Teslemetry('fake-token');
	const vehicle = teslemetry.api.getVehicle(VIN);
	(vehicle as any).lockDoors = () => Promise.reject(new Error('vehicle unreachable'));

	const { adapter, states, logs } = createFakeAdapter();
	const stateManager = new StateManager(adapter);
	await stateManager.createVehicleStates({ vin: VIN, display_name: 'Test Car' });
	await adapter.setStateAsync(`vehicles.${VIN}.state.locked`, false, true);

	const handler = new VehicleHandler(adapter, teslemetry, stateManager);
	handler.registerVehicle(VIN);

	await assert.rejects(() => handler.handleStateChange(VIN, 'commands', 'lock', true), /vehicle unreachable/);

	assert.equal(states.get(`vehicles.${VIN}.state.locked`), false);
	assert.equal(logs.filter((l) => l.level === 'error').length, 0);
});

test('a successful lock command acks state.locked to true', async () => {
	const teslemetry = new Teslemetry('fake-token');
	const vehicle = teslemetry.api.getVehicle(VIN);
	(vehicle as any).lockDoors = () => Promise.resolve({});

	const { adapter, states } = createFakeAdapter();
	const stateManager = new StateManager(adapter);
	await stateManager.createVehicleStates({ vin: VIN, display_name: 'Test Car' });
	await adapter.setStateAsync(`vehicles.${VIN}.state.locked`, false, true);

	const handler = new VehicleHandler(adapter, teslemetry, stateManager);
	handler.registerVehicle(VIN);

	await handler.handleStateChange(VIN, 'commands', 'lock', true);

	assert.equal(states.get(`vehicles.${VIN}.state.locked`), true);
});

test('a rejected temperature write restores driver_temp_setting to its prior value and propagates once, unlogged, to the caller', async () => {
	const teslemetry = new Teslemetry('fake-token');
	const vehicle = teslemetry.api.getVehicle(VIN);
	(vehicle as any).setTemps = () => Promise.reject(new Error('command rejected'));

	const { adapter, states, logs } = createFakeAdapter();
	const stateManager = new StateManager(adapter);
	await stateManager.createVehicleStates({ vin: VIN, display_name: 'Test Car' });
	await adapter.setStateAsync(`vehicles.${VIN}.climate.driver_temp_setting`, 21, true);
	await adapter.setStateAsync(`vehicles.${VIN}.climate.passenger_temp_setting`, 19, true);

	const handler = new VehicleHandler(adapter, teslemetry, stateManager);
	handler.registerVehicle(VIN);

	await assert.rejects(() => handler.handleStateChange(VIN, 'climate', 'driver_temp_setting', 25), /command rejected/);

	assert.equal(states.get(`vehicles.${VIN}.climate.driver_temp_setting`), 21);
	assert.equal(logs.filter((l) => l.level === 'error').length, 0);
});

test('fetchVehicleData reads state from the response wrapper and skips vehicleData() while asleep', async () => {
	const teslemetry = new Teslemetry('fake-token');
	const vehicle = teslemetry.api.getVehicle(VIN);

	let vehicleDataCalled = false;
	(vehicle as any).state = () => Promise.resolve({ response: { state: 'asleep' } });
	(vehicle as any).vehicleData = () => {
		vehicleDataCalled = true;
		return Promise.resolve({ response: {} });
	};

	const { adapter, states } = createFakeAdapter();
	const handler = new VehicleHandler(adapter, teslemetry, new StateManager(adapter));
	handler.registerVehicle(VIN);

	await handler.fetchVehicleData(VIN, false);

	assert.equal(states.get(`vehicles.${VIN}._info.state`), 'asleep');
	assert.equal(vehicleDataCalled, false);
});
