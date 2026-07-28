import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StateManager } from '../lib/StateManager.js';
import { createFakeAdapter } from './fakeAdapter.js';

test('updateVehicleData reads through the REST vehicleData() `{ response: {...} }` wrapper (regression: was reading the top-level object)', async () => {
	const { adapter, states } = createFakeAdapter();
	const stateManager = new StateManager(adapter);

	await stateManager.updateVehicleData('VIN1', {
		response: {
			charge_state: { battery_level: 55 },
			vehicle_state: { locked: true },
		},
	});

	assert.equal(states.get('vehicles.VIN1.charge.battery_level'), 55);
	assert.equal(states.get('vehicles.VIN1.state.locked'), true);
});

test('updateVehicleDataFromSignals reads the SSE flat PascalCase signal map (regression: SSE data was routed through the REST parser and never matched)', async () => {
	const { adapter, states } = createFakeAdapter();
	const stateManager = new StateManager(adapter);

	await stateManager.updateVehicleDataFromSignals('VIN1', {
		BatteryLevel: 62,
		Locked: false,
		InsideTemp: 21.5,
		SentryMode: 'SentryModeStateArmed',
	});

	assert.equal(states.get('vehicles.VIN1.charge.battery_level'), 62);
	assert.equal(states.get('vehicles.VIN1.state.locked'), false);
	assert.equal(states.get('vehicles.VIN1.climate.inside_temp'), 21.5);
	assert.equal(states.get('vehicles.VIN1.state.sentry_mode'), true);
});

test('updateEnergySiteData reads the flat getLiveStatus()/getSiteInfo() response shape (regression: was reading a non-existent `live_status` wrapper)', async () => {
	const { adapter, states } = createFakeAdapter();
	const stateManager = new StateManager(adapter);

	await stateManager.updateEnergySiteData(123, {
		solar_power: 250,
		battery_power: -50,
		grid_status: 'Active',
		percentage_charged: 77,
	});

	assert.equal(states.get('energy.123.live.solar_power'), 250);
	assert.equal(states.get('energy.123.live.grid_status'), 'Active');
	assert.equal(states.get('energy.123.battery.percentage'), 77);
});

test('updateEnergySiteData surfaces tariff_id/tariff_content/tariff_content_v2 from the getSiteInfo() response shape', async () => {
	const { adapter, states } = createFakeAdapter();
	const stateManager = new StateManager(adapter);

	await stateManager.updateEnergySiteData(123, {
		tariff_id: 'PGE-EV2-A',
		tariff_content: { code: 'PGE-EV2-A' },
		tariff_content_v2: { code: 'PGE-EV2-A', utility: 'PG&E', currency: 'USD' },
	});

	assert.equal(states.get('energy.123.tariff.tariff_id'), 'PGE-EV2-A');
	assert.equal(states.get('energy.123.tariff.tariff_content'), JSON.stringify({ code: 'PGE-EV2-A' }));
	assert.equal(
		states.get('energy.123.tariff.tariff_content_v2'),
		JSON.stringify({ code: 'PGE-EV2-A', utility: 'PG&E', currency: 'USD' })
	);
});
