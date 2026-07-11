import * as utils from '@iobroker/adapter-core';
import { Teslemetry } from '@teslemetry/api';
import { StateManager } from '../lib/StateManager.js';
import { VehicleHandler } from '../lib/VehicleHandler.js';
import { EnergyHandler } from '../lib/EnergyHandler.js';
import { StreamHandler } from '../lib/StreamHandler.js';

// Matches the "native" config schema in io-package.json / admin/jsonConfig.json.
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			accessToken: string;
			region: 'auto' | 'na' | 'eu';
			pollInterval: number;
			enableStreaming: boolean;
			selectedVehicles: string[];
			selectedEnergySites: number[];
		}
	}
}

class TeslemetryAdapter extends utils.Adapter {
	private teslemetry?: Teslemetry;
	private stateManager?: StateManager;
	private vehicleHandler?: VehicleHandler;
	private energyHandler?: EnergyHandler;
	private streamHandler?: StreamHandler;
	private pollInterval?: NodeJS.Timeout;

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: 'teslemetry',
		});

		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when adapter is ready
	 */
	private async onReady(): Promise<void> {
		this.log.info('Starting Teslemetry adapter...');

		// Validate configuration
		if (!this.config.accessToken) {
			this.log.error('No access token configured. Please configure the adapter in the admin interface.');
			return;
		}

		try {
			// Initialize Teslemetry client
			this.log.info('Initializing Teslemetry client...');
			this.teslemetry = new Teslemetry(this.config.accessToken, {
				region: this.config.region === 'auto' ? undefined : this.config.region,
			});

			// Initialize handlers
			this.stateManager = new StateManager(this);
			this.vehicleHandler = new VehicleHandler(this, this.teslemetry, this.stateManager);
			this.energyHandler = new EnergyHandler(this, this.teslemetry, this.stateManager);

			// Fetch products
			this.log.info('Fetching Tesla products...');
			const products = await this.teslemetry.createProducts();
			const { vehicles, energySites } = products;

			// Create state objects for vehicles
			const selectedVehicles = this.config.selectedVehicles || [];
			const vehicleEntries = Object.entries(vehicles);

			if (vehicleEntries.length === 0) {
				this.log.warn('No vehicles found in your Tesla account');
			} else {
				for (const [vin, vehicle] of vehicleEntries) {
					// If no selection made, include all vehicles
					if (selectedVehicles.length === 0 || selectedVehicles.includes(vin)) {
						this.log.info(`Setting up vehicle: ${vehicle.name} (${vin})`);
						await this.stateManager.createVehicleStates({
							vin,
							display_name: vehicle.name,
						});
						this.vehicleHandler.registerVehicle(vin);
					}
				}
			}

			// Create state objects for energy sites
			const selectedSites = this.config.selectedEnergySites || [];
			const siteEntries = Object.entries(energySites);

			if (siteEntries.length === 0) {
				this.log.info('No energy sites found in your Tesla account');
			} else {
				for (const [id, site] of siteEntries) {
					const siteId = Number(id);
					// If no selection made, include all sites
					if (selectedSites.length === 0 || selectedSites.includes(siteId)) {
						this.log.info(`Setting up energy site: ${site.name} (${siteId})`);
						await this.stateManager.createEnergySiteStates({
							id: siteId,
							site_name: site.name,
						});
						this.energyHandler.registerSite(siteId);
					}
				}
			}

			// Subscribe to all state changes
			this.subscribeStates('*');

			// Set up streaming or polling
			if (this.config.enableStreaming !== false) {
				this.log.info('Starting SSE streaming...');
				this.streamHandler = new StreamHandler(this, this.teslemetry, this.stateManager);
				await this.streamHandler.connect();
			} else {
				this.log.info('SSE streaming disabled, using polling');
				this.startPolling();
			}

			// Do initial data fetch
			this.log.info('Fetching initial vehicle data...');
			await this.vehicleHandler.fetchAllVehicleData(false);

			this.log.info('Fetching initial energy site data...');
			await this.energyHandler.fetchAllSiteData();

			this.log.info('Teslemetry adapter started successfully');
			await this.setStateAsync('info.connection', true, true);
		} catch (error: any) {
			this.log.error(`Failed to start adapter: ${error.message}`);
			await this.setStateAsync('info.connection', false, true);
		}
	}

	/**
	 * Is called when adapter shuts down
	 */
	private onUnload(callback: () => void): void {
		try {
			this.log.info('Cleaning up...');

			// Stop polling
			if (this.pollInterval) {
				clearInterval(this.pollInterval);
				this.pollInterval = undefined;
			}

			// Disconnect streaming
			if (this.streamHandler) {
				this.streamHandler.disconnect();
			}

			// Disconnect SSE
			if (this.teslemetry) {
				this.teslemetry.sse.disconnect();
			}

			callback();
		} catch {
			callback();
		}
	}

	/**
	 * Is called if a subscribed state changes
	 */
	private async onStateChange(id: string, state: ioBroker.State | null | undefined): Promise<void> {
		if (!state || state.ack) {
			// Ignore state changes that are acknowledged (from adapter) or null
			return;
		}

		this.log.debug(`State change: ${id} = ${state.val}`);

		// Parse the state ID to determine what to do
		const parsed = this.stateManager?.parseStateId(id);
		if (!parsed) {
			this.log.warn(`Could not parse state ID: ${id}`);
			return;
		}

		const { type, identifier, category, state: stateName } = parsed;

		try {
			if (type === 'vehicle') {
				await this.vehicleHandler?.handleStateChange(identifier, category, stateName, state.val);
			} else if (type === 'energy') {
				await this.energyHandler?.handleStateChange(Number(identifier), category, stateName, state.val);
			}
		} catch (error: any) {
			this.log.error(`Error handling state change: ${error.message}`);
		}
	}

	/**
	 * Handle messages from admin UI
	 */
	private async onMessage(obj: ioBroker.Message): Promise<void> {
		if (typeof obj === 'object' && obj.message) {
			if (obj.command === 'testConnection') {
				try {
					const token = obj.message.accessToken;
					if (!token) {
						this.sendTo(obj.from, obj.command, { error: 'No access token provided' }, obj.callback);
						return;
					}

					// Test connection by creating a Teslemetry client and fetching products
					const testClient = new Teslemetry(token);
					const products = await testClient.createProducts();

					const vehicleCount = Object.keys(products.vehicles).length;
					const siteCount = Object.keys(products.energySites).length;

					this.sendTo(
						obj.from,
						obj.command,
						{
							success: true,
							message: `Connected successfully! Found ${vehicleCount} vehicle(s) and ${siteCount} energy site(s).`,
							vehicles: Object.entries(products.vehicles).map(([vin, v]) => ({
								vin,
								name: v.name,
							})),
							energySites: Object.entries(products.energySites).map(([id, s]) => ({
								id: Number(id),
								name: s.name,
							})),
						},
						obj.callback
					);
				} catch (error: any) {
					this.sendTo(
						obj.from,
						obj.command,
						{
							error: `Connection failed: ${error.message}`,
						},
						obj.callback
					);
				}
			}
		}
	}

	/**
	 * Start polling for data updates
	 */
	private startPolling(): void {
		const interval = (this.config.pollInterval || 60) * 1000;
		this.log.info(`Starting polling with interval: ${interval / 1000}s`);

		this.pollInterval = setInterval(async () => {
			try {
				await this.vehicleHandler?.fetchAllVehicleData(false);
				await this.energyHandler?.fetchAllSiteData();
			} catch (error: any) {
				this.log.error(`Error during polling: ${error.message}`);
			}
		}, interval);
	}
}

if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new TeslemetryAdapter(options);
} else {
	// otherwise start the instance directly
	(() => new TeslemetryAdapter())();
}
