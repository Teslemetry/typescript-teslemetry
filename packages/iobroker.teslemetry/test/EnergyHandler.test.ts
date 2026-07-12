import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Teslemetry } from '@teslemetry/api';
import { EnergyHandler } from '../lib/EnergyHandler.js';
import { StateManager } from '../lib/StateManager.js';
import { createFakeAdapter } from './fakeAdapter.js';

const SITE_ID = 123;

test('registerSite does not throw when the SDK already discovered the site (regression: adapter aborted at startup)', () => {
	const teslemetry = new Teslemetry('fake-token');
	// Simulates createProducts()'s get-or-create discovery, which runs before registerSite.
	teslemetry.api.getEnergySite(SITE_ID);

	const { adapter } = createFakeAdapter();
	const handler = new EnergyHandler(adapter, teslemetry, new StateManager(adapter));

	assert.doesNotThrow(() => handler.registerSite(SITE_ID));
});

test('executeCommand("storm_mode") calls setStormMode(enabled) (regression: was calling a non-existent method)', async () => {
	const teslemetry = new Teslemetry('fake-token');
	const site = teslemetry.api.getEnergySite(SITE_ID);

	let calledWith: any[] | undefined;
	(site as any).setStormMode = (...args: any[]) => {
		calledWith = args;
		return Promise.resolve({});
	};

	const { adapter } = createFakeAdapter();
	const handler = new EnergyHandler(adapter, teslemetry, new StateManager(adapter));
	handler.registerSite(SITE_ID);

	await handler.executeCommand(SITE_ID, 'storm_mode', { enabled: true });

	assert.deepEqual(calledWith, [true]);
});

const OPERATION_CASES: Array<[stateName: string, method: string, value: any]> = [
	['mode', 'setOperationMode', 'self_consumption'],
	['backup_reserve_percent', 'setBackupReserve', 30],
	['off_grid_reserve_percent', 'setOffGridVehicleChargingReserve', 10],
];

for (const [stateName, method, value] of OPERATION_CASES) {
	test(`handleStateChange for operation.${stateName} calls ${method}(value) (regression: was calling a non-existent method with a wrong-shaped body)`, async () => {
		const teslemetry = new Teslemetry('fake-token');
		const site = teslemetry.api.getEnergySite(SITE_ID);

		let calledWith: any[] | undefined;
		(site as any)[method] = (...args: any[]) => {
			calledWith = args;
			return Promise.resolve({});
		};

		const { adapter } = createFakeAdapter();
		const handler = new EnergyHandler(adapter, teslemetry, new StateManager(adapter));
		handler.registerSite(SITE_ID);

		await handler.handleStateChange(SITE_ID, 'operation', stateName, value);

		assert.deepEqual(calledWith, [value]);
	});
}

test('fetchSiteData calls getLiveStatus()/getSiteInfo() and updates states from their response wrappers', async () => {
	const teslemetry = new Teslemetry('fake-token');
	const site = teslemetry.api.getEnergySite(SITE_ID);

	(site as any).getLiveStatus = () =>
		Promise.resolve({ response: { solar_power: 500, battery_power: -100, grid_power: 0, grid_status: 'Active', percentage_charged: 80 } });
	(site as any).getSiteInfo = () => Promise.resolve({ response: { default_real_mode: 'self_consumption', backup_reserve_percent: 20 } });

	const { adapter, states } = createFakeAdapter();
	const handler = new EnergyHandler(adapter, teslemetry, new StateManager(adapter));
	handler.registerSite(SITE_ID);

	await handler.fetchSiteData(SITE_ID);

	assert.equal(states.get(`energy.${SITE_ID}.live.solar_power`), 500);
	assert.equal(states.get(`energy.${SITE_ID}.live.grid_status`), 'Active');
	assert.equal(states.get(`energy.${SITE_ID}.battery.percentage`), 80);
	assert.equal(states.get(`energy.${SITE_ID}.operation.mode`), 'self_consumption');
	assert.equal(states.get(`energy.${SITE_ID}.operation.backup_reserve_percent`), 20);
});
