import type * as ioBroker from '@iobroker/adapter-core';
import { Teslemetry } from '@teslemetry/api';
import { StateManager } from './StateManager.js';

export class VehicleHandler {
	private vehicles: Map<string, any> = new Map();

	constructor(
		private adapter: ioBroker.Adapter,
		private teslemetry: Teslemetry,
		private stateManager: StateManager
	) {}

	/**
	 * Register a vehicle for handling
	 */
	registerVehicle(vin: string): void {
		this.vehicles.set(vin, this.teslemetry.vehicle(vin));
		this.adapter.log.info(`Registered vehicle: ${vin}`);
	}

	/**
	 * Execute a vehicle command
	 */
	async executeCommand(vin: string, command: string, _params?: any): Promise<void> {
		const vehicle = this.vehicles.get(vin);
		if (!vehicle) {
			this.adapter.log.error(`Vehicle ${vin} not registered`);
			return;
		}

		this.adapter.log.debug(`Executing command ${command} for vehicle ${vin}`);

		try {
			switch (command) {
				case 'wake':
					await vehicle.wake();
					this.adapter.log.info(`Woke up vehicle ${vin}`);
					break;

				case 'lock':
					await vehicle.lock();
					this.adapter.log.info(`Locked vehicle ${vin}`);
					await this.adapter.setStateAsync(`vehicles.${vin}.state.locked`, true, true);
					break;

				case 'unlock':
					await vehicle.unlock();
					this.adapter.log.info(`Unlocked vehicle ${vin}`);
					await this.adapter.setStateAsync(`vehicles.${vin}.state.locked`, false, true);
					break;

				case 'start_climate':
					await vehicle.start_climate();
					this.adapter.log.info(`Started climate for vehicle ${vin}`);
					await this.adapter.setStateAsync(`vehicles.${vin}.climate.is_climate_on`, true, true);
					break;

				case 'stop_climate':
					await vehicle.stop_climate();
					this.adapter.log.info(`Stopped climate for vehicle ${vin}`);
					await this.adapter.setStateAsync(`vehicles.${vin}.climate.is_climate_on`, false, true);
					break;

				case 'start_charging':
					await vehicle.start_charging();
					this.adapter.log.info(`Started charging for vehicle ${vin}`);
					break;

				case 'stop_charging':
					await vehicle.stop_charging();
					this.adapter.log.info(`Stopped charging for vehicle ${vin}`);
					break;

				case 'flash_lights':
					await vehicle.flash_lights();
					this.adapter.log.info(`Flashed lights for vehicle ${vin}`);
					break;

				case 'honk_horn':
					await vehicle.honk_horn();
					this.adapter.log.info(`Honked horn for vehicle ${vin}`);
					break;

				case 'open_frunk':
					await vehicle.open_frunk();
					this.adapter.log.info(`Opened frunk for vehicle ${vin}`);
					break;

				case 'open_trunk':
					await vehicle.open_trunk();
					this.adapter.log.info(`Opened trunk for vehicle ${vin}`);
					break;

				default:
					this.adapter.log.warn(`Unknown command: ${command}`);
			}
		} catch (error: any) {
			this.adapter.log.error(`Error executing command ${command} for vehicle ${vin}: ${error.message}`);
			throw error;
		}
	}

	/**
	 * Handle state change for vehicle
	 */
	async handleStateChange(vin: string, category: string, stateName: string, value: any): Promise<void> {
		const vehicle = this.vehicles.get(vin);
		if (!vehicle) {
			this.adapter.log.error(`Vehicle ${vin} not registered`);
			return;
		}

		try {
			// Handle commands
			if (category === 'commands') {
				if (value === true || value === 'true') {
					await this.executeCommand(vin, stateName);
				}
				return;
			}

			// Handle writable states
			if (category === 'climate') {
				if (stateName === 'driver_temp_setting') {
					await vehicle.set_temps({ driver_temp: value });
					this.adapter.log.info(`Set driver temp to ${value}°C for vehicle ${vin}`);
				} else if (stateName === 'passenger_temp_setting') {
					await vehicle.set_temps({ passenger_temp: value });
					this.adapter.log.info(`Set passenger temp to ${value}°C for vehicle ${vin}`);
				}
			} else if (category === 'charge') {
				if (stateName === 'charge_limit_soc') {
					await vehicle.set_charge_limit({ percent: value });
					this.adapter.log.info(`Set charge limit to ${value}% for vehicle ${vin}`);
				}
			} else if (category === 'state') {
				if (stateName === 'sentry_mode') {
					if (value) {
						await vehicle.sentry_mode_on();
					} else {
						await vehicle.sentry_mode_off();
					}
					this.adapter.log.info(`Set sentry mode to ${value} for vehicle ${vin}`);
				}
			}
		} catch (error: any) {
			this.adapter.log.error(`Error handling state change for ${vin}.${category}.${stateName}: ${error.message}`);
		}
	}

	/**
	 * Fetch vehicle data and update states
	 */
	async fetchVehicleData(vin: string, allowWake = false): Promise<void> {
		const vehicle = this.vehicles.get(vin);
		if (!vehicle) {
			this.adapter.log.error(`Vehicle ${vin} not registered`);
			return;
		}

		try {
			// Get vehicle state first (doesn't wake vehicle)
			const state = await vehicle.state();
			await this.adapter.setStateAsync(`vehicles.${vin}._info.state`, state, true);

			// Only fetch data if vehicle is online or we're allowed to wake it
			if (state === 'asleep' && !allowWake) {
				this.adapter.log.debug(`Vehicle ${vin} is asleep, skipping data fetch`);
				return;
			}

			// Fetch vehicle data
			const data = await vehicle.data();
			await this.stateManager.updateVehicleData(vin, data);
			this.adapter.log.debug(`Updated data for vehicle ${vin}`);
		} catch (error: any) {
			this.adapter.log.error(`Error fetching data for vehicle ${vin}: ${error.message}`);
		}
	}

	/**
	 * Fetch data for all registered vehicles
	 */
	async fetchAllVehicleData(allowWake = false): Promise<void> {
		const promises = Array.from(this.vehicles.keys()).map((vin) =>
			this.fetchVehicleData(vin, allowWake)
		);
		await Promise.allSettled(promises);
	}

	/**
	 * Get list of registered vehicle VINs
	 */
	getRegisteredVehicles(): string[] {
		return Array.from(this.vehicles.keys());
	}
}
