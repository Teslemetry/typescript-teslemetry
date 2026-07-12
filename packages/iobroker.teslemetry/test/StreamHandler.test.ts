import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Teslemetry } from '@teslemetry/api';
import { StreamHandler } from '../lib/StreamHandler.js';
import { StateManager } from '../lib/StateManager.js';
import { createFakeAdapter } from './fakeAdapter.js';

const VIN = '5YJSA1E14FF000000';

test('data events update states via the SSE flat-signal parser', async () => {
	const teslemetry = new Teslemetry('fake-token');
	// Avoid a real network connection; sse.connect() only needs to resolve.
	(teslemetry.sse as any).connect = () => Promise.resolve();

	const { adapter, states } = createFakeAdapter();
	const streamHandler = new StreamHandler(adapter, teslemetry, new StateManager(adapter));
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
	const streamHandler = new StreamHandler(adapter, teslemetry, new StateManager(adapter));
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
