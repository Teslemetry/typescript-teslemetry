import { Teslemetry, TeslemetryVehicleApi } from '@teslemetry/api';
import { StateManager } from './StateManager.js';

export class VehicleHandler {
	private vehicles: Map<string, TeslemetryVehicleApi> = new Map();

	constructor(
		private adapter: ioBroker.Adapter,
		private teslemetry: Teslemetry,
		private stateManager: StateManager
	) {}

	/**
	 * Register a vehicle for handling
	 */
	registerVehicle(vin: string): void {
		// api.getVehicle is get-or-create; createProducts() already created this
		// entry, so the constructor's `new TeslemetryVehicleApi` guard would throw.
		this.vehicles.set(vin, this.teslemetry.api.getVehicle(vin));
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
					await vehicle.wakeUp();
					this.adapter.log.info(`Woke up vehicle ${vin}`);
					break;

				case 'lock':
					await vehicle.lockDoors();
					this.adapter.log.info(`Locked vehicle ${vin}`);
					await this.adapter.setStateAsync(`vehicles.${vin}.state.locked`, true, true);
					break;

				case 'unlock':
					await vehicle.unlockDoors();
					this.adapter.log.info(`Unlocked vehicle ${vin}`);
					await this.adapter.setStateAsync(`vehicles.${vin}.state.locked`, false, true);
					break;

				case 'start_climate':
					await vehicle.startAutoConditioning();
					this.adapter.log.info(`Started climate for vehicle ${vin}`);
					await this.adapter.setStateAsync(`vehicles.${vin}.climate.is_climate_on`, true, true);
					break;

				case 'stop_climate':
					await vehicle.stopAutoConditioning();
					this.adapter.log.info(`Stopped climate for vehicle ${vin}`);
					await this.adapter.setStateAsync(`vehicles.${vin}.climate.is_climate_on`, false, true);
					break;

				case 'start_charging':
					await vehicle.startCharging();
					this.adapter.log.info(`Started charging for vehicle ${vin}`);
					break;

				case 'stop_charging':
					await vehicle.stopCharging();
					this.adapter.log.info(`Stopped charging for vehicle ${vin}`);
					break;

				case 'flash_lights':
					await vehicle.flashLights();
					this.adapter.log.info(`Flashed lights for vehicle ${vin}`);
					break;

				case 'honk_horn':
					await vehicle.honkHorn();
					this.adapter.log.info(`Honked horn for vehicle ${vin}`);
					break;

				case 'open_frunk':
					await vehicle.actuateTrunk('front');
					this.adapter.log.info(`Opened frunk for vehicle ${vin}`);
					break;

				case 'open_trunk':
					await vehicle.actuateTrunk('rear');
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
				if (stateName === 'driver_temp_setting' || stateName === 'passenger_temp_setting') {
					// setTemps takes both temps positionally, so read the other one's
					// current value to avoid clobbering it.
					const [driverState, passengerState] = await Promise.all([
						this.adapter.getStateAsync(`vehicles.${vin}.climate.driver_temp_setting`),
						this.adapter.getStateAsync(`vehicles.${vin}.climate.passenger_temp_setting`),
					]);
					const driverTemp = stateName === 'driver_temp_setting' ? value : (driverState?.val ?? 21);
					const passengerTemp = stateName === 'passenger_temp_setting' ? value : (passengerState?.val ?? 21);
					await vehicle.setTemps(driverTemp, passengerTemp);
					this.adapter.log.info(`Set temps to ${driverTemp}/${passengerTemp}°C for vehicle ${vin}`);
				}
			} else if (category === 'charge') {
				if (stateName === 'charge_limit_soc') {
					await vehicle.setChargeLimit(value);
					this.adapter.log.info(`Set charge limit to ${value}% for vehicle ${vin}`);
				}
			} else if (category === 'state') {
				if (stateName === 'sentry_mode') {
					await vehicle.setSentryMode(!!value);
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
			const stateResult = await vehicle.state();
			const state = stateResult?.response?.state ?? 'unknown';
			await this.adapter.setStateAsync(`vehicles.${vin}._info.state`, state, true);

			// Only fetch data if vehicle is online or we're allowed to wake it
			if (state === 'asleep' && !allowWake) {
				this.adapter.log.debug(`Vehicle ${vin} is asleep, skipping data fetch`);
				return;
			}

			// Fetch vehicle data
			const data = await vehicle.vehicleData();
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
