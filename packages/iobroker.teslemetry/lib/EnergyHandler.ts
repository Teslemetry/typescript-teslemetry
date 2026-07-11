import { Teslemetry } from '@teslemetry/api';
import { StateManager } from './StateManager.js';

export class EnergyHandler {
	private sites: Map<number, any> = new Map();

	constructor(
		private adapter: ioBroker.Adapter,
		private teslemetry: Teslemetry,
		private stateManager: StateManager
	) {}

	/**
	 * Register an energy site for handling
	 */
	registerSite(siteId: number): void {
		this.sites.set(siteId, this.teslemetry.energySite(siteId));
		this.adapter.log.info(`Registered energy site: ${siteId}`);
	}

	/**
	 * Execute an energy site command
	 */
	async executeCommand(siteId: number, command: string, params?: any): Promise<void> {
		const site = this.sites.get(siteId);
		if (!site) {
			this.adapter.log.error(`Energy site ${siteId} not registered`);
			return;
		}

		this.adapter.log.debug(`Executing command ${command} for energy site ${siteId}`);

		try {
			switch (command) {
				case 'storm_mode':
					if (params?.enabled !== undefined) {
						await site.storm_mode({ enabled: params.enabled });
						this.adapter.log.info(`Set storm mode to ${params.enabled} for site ${siteId}`);
					}
					break;

				default:
					this.adapter.log.warn(`Unknown command: ${command}`);
			}
		} catch (error: any) {
			this.adapter.log.error(`Error executing command ${command} for site ${siteId}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Handle state change for energy site
	 */
	async handleStateChange(siteId: number, category: string, stateName: string, value: any): Promise<void> {
		const site = this.sites.get(siteId);
		if (!site) {
			this.adapter.log.error(`Energy site ${siteId} not registered`);
			return;
		}

		try {
			// Handle commands
			if (category === 'commands') {
				if (stateName === 'storm_mode') {
					await this.executeCommand(siteId, 'storm_mode', { enabled: value });
				}
				return;
			}

			// Handle writable operation states
			if (category === 'operation') {
				if (stateName === 'mode') {
					await site.operation({ real_mode: value });
					this.adapter.log.info(`Set operation mode to ${value} for site ${siteId}`);
				} else if (stateName === 'backup_reserve_percent') {
					await site.backup({ backup_reserve_percent: value });
					this.adapter.log.info(`Set backup reserve to ${value}% for site ${siteId}`);
				} else if (stateName === 'off_grid_reserve_percent') {
					await site.off_grid_vehicle_charging_reserve({ off_grid_vehicle_charging_reserve_percent: value });
					this.adapter.log.info(`Set off-grid reserve to ${value}% for site ${siteId}`);
				}
			}
		} catch (error: any) {
			this.adapter.log.error(`Error handling state change for ${siteId}.${category}.${stateName}: ${error.message}`);
		}
	}

	/**
	 * Fetch energy site data and update states
	 */
	async fetchSiteData(siteId: number): Promise<void> {
		const site = this.sites.get(siteId);
		if (!site) {
			this.adapter.log.error(`Energy site ${siteId} not registered`);
			return;
		}

		try {
			// Fetch site status
			const status = await site.live_status();
			await this.stateManager.updateEnergySiteData(siteId, status);
			this.adapter.log.debug(`Updated data for energy site ${siteId}`);
		} catch (error: any) {
			this.adapter.log.error(`Error fetching data for site ${siteId}: ${error.message}`);
		}
	}

	/**
	 * Fetch data for all registered energy sites
	 */
	async fetchAllSiteData(): Promise<void> {
		const promises = Array.from(this.sites.keys()).map((siteId) =>
			this.fetchSiteData(siteId)
		);
		await Promise.allSettled(promises);
	}

	/**
	 * Get list of registered site IDs
	 */
	getRegisteredSites(): number[] {
		return Array.from(this.sites.keys());
	}
}
