import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Teslemetry } from '@teslemetry/api';
import { StreamHandler } from '../lib/StreamHandler.js';
import { StateManager } from '../lib/StateManager.js';
import { EnergyHandler } from '../lib/EnergyHandler.js';
import { createFakeAdapter } from './fakeAdapter.js';

const VIN = '5YJSA1E14FF000000';
const SITE_ID = 123;

test('data events update states via the SSE flat-signal parser', async () => {
	const teslemetry = new Teslemetry('fake-token');
	// Avoid a real network connection; sse.connect() only needs to resolve.
	(teslemetry.sse as any).connect = () => Promise.resolve();

	const { adapter, states } = createFakeAdapter();
	const stateManager = new StateManager(adapter);
	const streamHandler = new StreamHandler(adapter, teslemetry, stateManager, new EnergyHandler(adapter, teslemetry, stateManager));
	await streamHandler.connect();

	teslemetry.sse.emit('data', { vin: VIN, data: { BatteryLevel: 71 } } as any);
	// handleDataEvent is fire-and-forget; let its awaited chain settle.
	await new Promise((resolve) => setTimeout(resolve, 0));

	assert.equal(states.get(`vehicles.${VIN}.charge.battery_level`), 71);
});

test('alert events log each alert from the `alerts` array (regression: destructured `name`/`endedAt` off the event instead of off each alert)', async () => {
	const teslemetry = new Teslemetry('fake-token');
	(teslemetry.sse as any).connect = () => Promise.resolve();

	const { adapter, logs } = createFakeAdapter();
	const stateManager = new StateManager(adapter);
	const streamHandler = new StreamHandler(adapter, teslemetry, stateManager, new EnergyHandler(adapter, teslemetry, stateManager));
	await streamHandler.connect();

	teslemetry.sse.emit('alerts', {
		vin: VIN,
		alerts: [{ name: 'TPMS_low_pressure', startedAt: '2026-07-12T00:00:00Z' }],
	} as any);
	await new Promise((resolve) => setTimeout(resolve, 0));

	assert.ok(
		logs.some((l) => l.level === 'info' && l.message.includes('TPMS_low_pressure') && l.message.includes('started')),
		`expected an alert log line, got: ${JSON.stringify(logs)}`,
	);
});

test('live_status events update energy live-power states (regression: default streaming mode never wired up energy topics)', async () => {
	const teslemetry = new Teslemetry('fake-token');
	(teslemetry.sse as any).connect = () => Promise.resolve();

	const { adapter, states } = createFakeAdapter();
	const stateManager = new StateManager(adapter);
	const energyHandler = new EnergyHandler(adapter, teslemetry, stateManager);
	energyHandler.registerSite(SITE_ID);
	const streamHandler = new StreamHandler(adapter, teslemetry, stateManager, energyHandler);
	await streamHandler.connect();

	teslemetry.sse.emit('live_status', { site_id: String(SITE_ID), live_status: { solar_power: 900, grid_status: 'Active' } } as any);
	await new Promise((resolve) => setTimeout(resolve, 0));

	assert.equal(states.get(`energy.${SITE_ID}.live.solar_power`), 900);
	assert.equal(states.get(`energy.${SITE_ID}.live.grid_status`), 'Active');
});

test('site_info events update energy operation states', async () => {
	const teslemetry = new Teslemetry('fake-token');
	(teslemetry.sse as any).connect = () => Promise.resolve();

	const { adapter, states } = createFakeAdapter();
	const stateManager = new StateManager(adapter);
	const energyHandler = new EnergyHandler(adapter, teslemetry, stateManager);
	energyHandler.registerSite(SITE_ID);
	const streamHandler = new StreamHandler(adapter, teslemetry, stateManager, energyHandler);
	await streamHandler.connect();

	teslemetry.sse.emit('site_info', { site_id: String(SITE_ID), site_info: { default_real_mode: 'backup', backup_reserve_percent: 35 } } as any);
	await new Promise((resolve) => setTimeout(resolve, 0));

	assert.equal(states.get(`energy.${SITE_ID}.operation.mode`), 'backup');
	assert.equal(states.get(`energy.${SITE_ID}.operation.backup_reserve_percent`), 35);
});

test('energy live values change after the REST startup seed via live_status stream events, without polling (regression: default streaming mode left energy frozen after startup)', async () => {
	const teslemetry = new Teslemetry('fake-token');
	(teslemetry.sse as any).connect = () => Promise.resolve();

	const site = teslemetry.api.getEnergySite(SITE_ID);
	(site as any).getLiveStatus = () => Promise.resolve({ response: { solar_power: 500 } });
	(site as any).getSiteInfo = () => Promise.resolve({ response: {} });

	const { adapter, states } = createFakeAdapter();
	const stateManager = new StateManager(adapter);
	const energyHandler = new EnergyHandler(adapter, teslemetry, stateManager);
	energyHandler.registerSite(SITE_ID);

	// Deterministic REST seed at startup
	await energyHandler.fetchSiteData(SITE_ID);
	assert.equal(states.get(`energy.${SITE_ID}.live.solar_power`), 500);

	// The stream - not a poll interval - delivers the next value
	const streamHandler = new StreamHandler(adapter, teslemetry, stateManager, energyHandler);
	await streamHandler.connect();

	teslemetry.sse.emit('live_status', { site_id: String(SITE_ID), live_status: { solar_power: 1200 } } as any);
	await new Promise((resolve) => setTimeout(resolve, 0));

	assert.equal(states.get(`energy.${SITE_ID}.live.solar_power`), 1200);
});

test('live_status events for an unselected/unregistered energy site are ignored (regression: account-level stream delivers every accessible site, not just the ones this instance registered)', async () => {
	const teslemetry = new Teslemetry('fake-token');
	(teslemetry.sse as any).connect = () => Promise.resolve();

	const { adapter, states } = createFakeAdapter();
	const stateManager = new StateManager(adapter);
	// Registers a different site; SITE_ID below was never selected for this instance.
	const energyHandler = new EnergyHandler(adapter, teslemetry, stateManager);
	energyHandler.registerSite(SITE_ID + 1);
	const streamHandler = new StreamHandler(adapter, teslemetry, stateManager, energyHandler);
	await streamHandler.connect();

	teslemetry.sse.emit('live_status', { site_id: String(SITE_ID), live_status: { solar_power: 900 } } as any);
	await new Promise((resolve) => setTimeout(resolve, 0));

	assert.equal(states.get(`energy.${SITE_ID}.live.solar_power`), undefined);
});
