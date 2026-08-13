import { Teslemetry } from '@teslemetry/api';
import { StateManager } from './StateManager.js';
import { EnergyHandler } from './EnergyHandler.js';

export class StreamHandler {
	// The SDK's TeslemetryStream owns reconnection (unbounded exponential
	// backoff, then a permanent stop after two consecutive auth failures) -
	// this class only listens and reflects that state, it never schedules
	// its own reconnect. Listeners are registered once; sse.on() replays
	// cached values into the handler and re-listening would double-dispatch.
	private listenersRegistered = false;

	constructor(
		private adapter: ioBroker.Adapter,
		private teslemetry: Teslemetry,
		private stateManager: StateManager,
		private energyHandler: EnergyHandler
	) {}

	/**
	 * Register stream event handlers (once) and connect to the SSE stream.
	 * Safe to call again after a connect: the SDK's connect() is a no-op
	 * while already active.
	 */
	async connect(): Promise<void> {
		const sse = this.teslemetry.sse;

		if (!this.listenersRegistered) {
			this.listenersRegistered = true;
			this.registerListeners(sse);
		}

		this.adapter.log.info('Connecting to Teslemetry SSE stream...');
		await sse.connect();
	}

	private registerListeners(sse: Teslemetry['sse']): void {
		sse.on('connect', () => {
			this.adapter.log.info('SSE stream connected');
			this.adapter.setStateAsync('info.connection', true, true);
		});

		// The SDK retries transient disconnects on its own; this only reflects
		// current connectivity; it does not imply a terminal stop.
		sse.on('disconnect', () => {
			this.adapter.log.warn('SSE stream disconnected');
			this.adapter.setStateAsync('info.connection', false, true);
		});

		sse.on('stream_error', ({ error, status, retries }) => {
			const message = error instanceof Error ? error.message : String(error);
			this.adapter.log.warn(
				`SSE stream error (status ${status ?? 'unknown'}, attempt ${retries}): ${message}`
			);
		});

		sse.on('auth_failure', (error) => {
			this.adapter.log.error(
				`SSE stream authentication failed twice in a row and has stopped permanently: ${error.message}. ` +
					'Fix the access token and restart the adapter to resume streaming.'
			);
			this.adapter.setStateAsync('info.connection', false, true);
		});

		// Handle vehicle data updates
		sse.on('data', (event: any) => {
			this.handleDataEvent(event);
		});

		// Handle vehicle state changes (online/asleep/offline)
		sse.on('state', (event: any) => {
			this.handleStateEvent(event);
		});

		// Handle alerts
		sse.on('alerts', (event: any) => {
			this.handleAlertEvent(event);
		});

		// Handle energy site live power/battery/grid updates
		sse.on('live_status', (event: any) => {
			this.handleLiveStatusEvent(event);
		});

		// Handle energy site settings updates (operation mode, reserves, ...)
		sse.on('site_info', (event: any) => {
			this.handleSiteInfoEvent(event);
		});
	}

	/**
	 * Disconnect from SSE stream
	 */
	disconnect(): void {
		this.adapter.log.info('Disconnecting from SSE stream...');

		try {
			this.teslemetry.sse.disconnect();
			this.adapter.setStateAsync('info.connection', false, true);
		} catch (error: any) {
			this.adapter.log.error(`Error disconnecting SSE stream: ${error.message}`);
		}
	}

	/**
	 * Handle data events from stream
	 */
	private async handleDataEvent(event: any): Promise<void> {
		try {
			const { vin, data } = event;

			if (!vin || !data) {
				return;
			}

			this.adapter.log.debug(`Received data event for vehicle ${vin}`);
			await this.stateManager.updateVehicleDataFromSignals(vin, data);
		} catch (error: any) {
			this.adapter.log.error(`Error handling data event: ${error.message}`);
		}
	}

	/**
	 * Handle state change events from stream
	 */
	private async handleStateEvent(event: any): Promise<void> {
		try {
			const { vin, state } = event;

			if (!vin || !state) {
				return;
			}

			this.adapter.log.debug(`Vehicle ${vin} state changed to: ${state}`);
			await this.adapter.setStateAsync(`vehicles.${vin}._info.state`, state, true);
		} catch (error: any) {
			this.adapter.log.error(`Error handling state event: ${error.message}`);
		}
	}

	/**
	 * Handle alert events from stream
	 */
	private async handleAlertEvent(event: any): Promise<void> {
		try {
			const { vin, alerts } = event;

			if (!vin || !alerts) {
				return;
			}

			for (const alert of alerts) {
				const status = alert.endedAt ? 'ended' : 'started';
				this.adapter.log.info(`Alert ${alert.name} ${status} for vehicle ${vin}`);
			}

			// Could create alert states here if needed
			// For now, just log it
		} catch (error: any) {
			this.adapter.log.error(`Error handling alert event: ${error.message}`);
		}
	}

	/**
	 * Handle energy site `live_status` events (solar/battery/grid/load power, SOC)
	 */
	private async handleLiveStatusEvent(event: any): Promise<void> {
		try {
			const { site_id, live_status } = event;

			if (!site_id || !live_status) {
				return;
			}

			const siteId = Number(site_id);
			if (!this.energyHandler.getRegisteredSites().includes(siteId)) {
				return;
			}

			this.adapter.log.debug(`Received live_status event for energy site ${site_id}`);
			await this.stateManager.updateEnergySiteData(siteId, live_status);
		} catch (error: any) {
			this.adapter.log.error(`Error handling live_status event: ${error.message}`);
		}
	}

	/**
	 * Handle energy site `site_info` events (operation mode, reserves, tariff id, ...)
	 */
	private async handleSiteInfoEvent(event: any): Promise<void> {
		try {
			const { site_id, site_info } = event;

			if (!site_id || !site_info) {
				return;
			}

			const siteId = Number(site_id);
			if (!this.energyHandler.getRegisteredSites().includes(siteId)) {
				return;
			}

			this.adapter.log.debug(`Received site_info event for energy site ${site_id}`);
			await this.stateManager.updateEnergySiteData(siteId, site_info);
		} catch (error: any) {
			this.adapter.log.error(`Error handling site_info event: ${error.message}`);
		}
	}
}
