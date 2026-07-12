import { Teslemetry } from '@teslemetry/api';
import { StateManager } from './StateManager.js';

export class StreamHandler {
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectTimer?: NodeJS.Timeout;
	private isConnecting = false;

	constructor(
		private adapter: ioBroker.Adapter,
		private teslemetry: Teslemetry,
		private stateManager: StateManager
	) {}

	/**
	 * Connect to SSE stream and set up event handlers
	 */
	async connect(): Promise<void> {
		if (this.isConnecting) {
			this.adapter.log.debug('Stream connection already in progress');
			return;
		}

		this.isConnecting = true;
		this.adapter.log.info('Connecting to Teslemetry SSE stream...');

		try {
			const sse = this.teslemetry.sse;

			// Set up event handlers
			sse.on('connect', () => {
				this.adapter.log.info('SSE stream connected');
				this.reconnectAttempts = 0;
				this.isConnecting = false;
				this.adapter.setStateAsync('info.connection', true, true);
			});

			sse.on('disconnect', () => {
				this.adapter.log.warn('SSE stream disconnected');
				this.isConnecting = false;
				this.adapter.setStateAsync('info.connection', false, true);
				this.scheduleReconnect();
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

			// Connect to stream
			await sse.connect();
		} catch (error: any) {
			this.adapter.log.error(`Failed to connect to SSE stream: ${error.message}`);
			this.isConnecting = false;
			this.scheduleReconnect();
		}
	}

	/**
	 * Disconnect from SSE stream
	 */
	disconnect(): void {
		this.adapter.log.info('Disconnecting from SSE stream...');

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = undefined;
		}

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
	 * Schedule automatic reconnection with exponential backoff
	 */
	private scheduleReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			this.adapter.log.error(
				`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Stopping reconnection attempts.`
			);
			return;
		}

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
		}

		const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
		this.reconnectAttempts++;

		this.adapter.log.info(
			`Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay / 1000}s`
		);

		this.reconnectTimer = setTimeout(() => {
			this.connect();
		}, delay);
	}

	/**
	 * Reset reconnection attempts (call this after successful manual reconnection)
	 */
	resetReconnectAttempts(): void {
		this.reconnectAttempts = 0;
	}
}
