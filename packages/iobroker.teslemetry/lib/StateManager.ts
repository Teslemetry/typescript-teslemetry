export interface VehicleMetadata {
	vin: string;
	display_name: string;
	model?: string;
	state?: string;
	rhd?: boolean;
}

export interface EnergySiteMetadata {
	id: number;
	site_name: string;
	resource_type?: string;
}

export class StateManager {
	// Right-hand-drive vehicles have their driver seat on the physical right, so the
	// HvacLeft/HvacRightTemperatureRequest signals map to the opposite driver/passenger side.
	private rhdByVin = new Map<string, boolean>();

	constructor(private adapter: ioBroker.Adapter) {}

	/**
	 * Create state hierarchy for a vehicle
	 */
	async createVehicleStates(metadata: VehicleMetadata): Promise<void> {
		const { vin, display_name, model, rhd } = metadata;
		this.rhdByVin.set(vin, !!rhd);
		const base = `vehicles.${vin}`;

		// Create device
		await this.adapter.setObjectNotExistsAsync(base, {
			type: 'device',
			common: {
				name: display_name || vin,
			},
			native: { vin, model },
		});

		// Info channel
		await this.createChannel(`${base}._info`, 'Information');
		await this.createState(`${base}._info.name`, 'Name', 'string', 'text', true, false, display_name);
		await this.createState(`${base}._info.model`, 'Model', 'string', 'text', true, false, model);
		await this.createState(`${base}._info.state`, 'State', 'string', 'text', true, false, 'unknown');

		// Location channel
		await this.createChannel(`${base}.location`, 'Location');
		await this.createState(`${base}.location.latitude`, 'Latitude', 'number', 'value.gps.latitude', true, false);
		await this.createState(`${base}.location.longitude`, 'Longitude', 'number', 'value.gps.longitude', true, false);
		await this.createState(`${base}.location.heading`, 'Heading', 'number', 'value.direction', true, false, 0, '°');
		await this.createState(`${base}.location.speed`, 'Speed', 'number', 'value.speed', true, false, 0, 'km/h');

		// Climate channel
		await this.createChannel(`${base}.climate`, 'Climate');
		await this.createState(`${base}.climate.inside_temp`, 'Inside Temperature', 'number', 'value.temperature', true, false, 0, '°C');
		await this.createState(`${base}.climate.outside_temp`, 'Outside Temperature', 'number', 'value.temperature', true, false, 0, '°C');
		await this.createState(`${base}.climate.driver_temp_setting`, 'Driver Temperature Setting', 'number', 'level.temperature', true, true, 21, '°C');
		await this.createState(`${base}.climate.passenger_temp_setting`, 'Passenger Temperature Setting', 'number', 'level.temperature', true, true, 21, '°C');
		await this.createState(`${base}.climate.is_climate_on`, 'Climate On', 'boolean', 'indicator.climate', true, false, false);
		await this.createState(`${base}.climate.is_preconditioning`, 'Preconditioning', 'boolean', 'indicator', true, false, false);

		// Charge channel
		await this.createChannel(`${base}.charge`, 'Charging');
		await this.createState(`${base}.charge.battery_level`, 'Battery Level', 'number', 'value.battery', true, false, 0, '%');
		await this.createState(`${base}.charge.usable_battery_level`, 'Usable Battery Level', 'number', 'value.battery', true, false, 0, '%');
		await this.createState(`${base}.charge.charging_state`, 'Charging State', 'string', 'text', true, false, 'Disconnected');
		await this.createState(`${base}.charge.charge_limit_soc`, 'Charge Limit', 'number', 'level.battery', true, true, 80, '%');
		await this.createState(`${base}.charge.charge_rate`, 'Charge Rate', 'number', 'value.power', true, false, 0, 'km/h');
		await this.createState(`${base}.charge.charger_power`, 'Charger Power', 'number', 'value.power', true, false, 0, 'kW');
		await this.createState(`${base}.charge.time_to_full_charge`, 'Time to Full Charge', 'number', 'value.interval', true, false, 0, 'h');

		// Drive channel
		await this.createChannel(`${base}.drive`, 'Drive');
		await this.createState(`${base}.drive.odometer`, 'Odometer', 'number', 'value.distance', true, false, 0, 'km');
		await this.createState(`${base}.drive.shift_state`, 'Shift State', 'string', 'text', true, false, 'P');

		// State channel
		await this.createChannel(`${base}.state`, 'Vehicle State');
		await this.createState(`${base}.state.locked`, 'Locked', 'boolean', 'indicator.lock', true, false, true);
		await this.createState(`${base}.state.sentry_mode`, 'Sentry Mode', 'boolean', 'switch', true, true, false);
		await this.createState(`${base}.state.valet_mode`, 'Valet Mode', 'boolean', 'indicator', true, false, false);
		await this.createState(`${base}.state.is_user_present`, 'User Present', 'boolean', 'indicator.presence', true, false, false);

		// Commands channel
		await this.createChannel(`${base}.commands`, 'Commands');
		await this.createState(`${base}.commands.wake`, 'Wake Up', 'boolean', 'button', false, true, false);
		await this.createState(`${base}.commands.lock`, 'Lock', 'boolean', 'button', false, true, false);
		await this.createState(`${base}.commands.unlock`, 'Unlock', 'boolean', 'button', false, true, false);
		await this.createState(`${base}.commands.start_climate`, 'Start Climate', 'boolean', 'button', false, true, false);
		await this.createState(`${base}.commands.stop_climate`, 'Stop Climate', 'boolean', 'button', false, true, false);
		await this.createState(`${base}.commands.start_charging`, 'Start Charging', 'boolean', 'button', false, true, false);
		await this.createState(`${base}.commands.stop_charging`, 'Stop Charging', 'boolean', 'button', false, true, false);
		await this.createState(`${base}.commands.flash_lights`, 'Flash Lights', 'boolean', 'button', false, true, false);
		await this.createState(`${base}.commands.honk_horn`, 'Honk Horn', 'boolean', 'button', false, true, false);
		await this.createState(`${base}.commands.open_frunk`, 'Open Frunk', 'boolean', 'button', false, true, false);
		await this.createState(`${base}.commands.open_trunk`, 'Open Trunk', 'boolean', 'button', false, true, false);
	}

	/**
	 * Whether a registered vehicle is right-hand drive, per its metadata at registration.
	 */
	isRhd(vin: string): boolean {
		return this.rhdByVin.get(vin) ?? false;
	}

	/**
	 * Create state hierarchy for an energy site
	 */
	async createEnergySiteStates(metadata: EnergySiteMetadata): Promise<void> {
		const { id, site_name, resource_type } = metadata;
		const base = `energy.${id}`;

		// Create device
		await this.adapter.setObjectNotExistsAsync(base, {
			type: 'device',
			common: {
				name: site_name || `Site ${id}`,
			},
			native: { id, resource_type },
		});

		// Info channel
		await this.createChannel(`${base}._info`, 'Information');
		await this.createState(`${base}._info.name`, 'Name', 'string', 'text', true, false, site_name);
		await this.createState(`${base}._info.resource_type`, 'Resource Type', 'string', 'text', true, false, resource_type);

		// Live channel
		await this.createChannel(`${base}.live`, 'Live Power');
		await this.createState(`${base}.live.solar_power`, 'Solar Power', 'number', 'value.power', true, false, 0, 'W');
		await this.createState(`${base}.live.battery_power`, 'Battery Power', 'number', 'value.power', true, false, 0, 'W');
		await this.createState(`${base}.live.grid_power`, 'Grid Power', 'number', 'value.power', true, false, 0, 'W');
		await this.createState(`${base}.live.load_power`, 'Load Power', 'number', 'value.power', true, false, 0, 'W');
		await this.createState(`${base}.live.grid_status`, 'Grid Status', 'string', 'text', true, false, 'Unknown');
		await this.createState(`${base}.live.timestamp`, 'Timestamp', 'number', 'value.time', true, false);

		// Battery channel
		await this.createChannel(`${base}.battery`, 'Battery');
		await this.createState(`${base}.battery.percentage`, 'Battery Level', 'number', 'value.battery', true, false, 0, '%');

		// Operation channel
		await this.createChannel(`${base}.operation`, 'Operation');
		await this.createState(`${base}.operation.mode`, 'Operation Mode', 'string', 'text', true, true, 'self_consumption');
		await this.createState(`${base}.operation.backup_reserve_percent`, 'Backup Reserve', 'number', 'level.battery', true, true, 20, '%');
		await this.createState(`${base}.operation.off_grid_reserve_percent`, 'Off-Grid Reserve', 'number', 'level.battery', true, true, 0, '%');

		// Tariff channel (read-only - rate plan is managed through the utility/Tesla app, not this adapter)
		await this.createChannel(`${base}.tariff`, 'Tariff');
		await this.createState(`${base}.tariff.tariff_id`, 'Tariff Plan Name', 'string', 'text', true, false);
		await this.createState(`${base}.tariff.tariff_content`, 'Tariff Content (JSON)', 'string', 'json', true, false);
		await this.createState(`${base}.tariff.tariff_content_v2`, 'Tariff Content V2 (JSON)', 'string', 'json', true, false);

		// Commands channel
		await this.createChannel(`${base}.commands`, 'Commands');
		await this.createState(`${base}.commands.storm_mode`, 'Storm Mode', 'boolean', 'button', false, true, false);
	}

	/**
	 * Update vehicle data from a REST vehicleData() response ({ response: { charge_state, ... } })
	 */
	async updateVehicleData(vin: string, result: any): Promise<void> {
		const base = `vehicles.${vin}`;
		const data = result?.response;

		if (!data) return;

		try {
			// Update info
			if (data.state) {
				await this.setStateAsync(`${base}._info.state`, data.state);
			}

			// Update location
			if (data.drive_state) {
				const ds = data.drive_state;
				if (ds.latitude !== undefined) await this.setStateAsync(`${base}.location.latitude`, ds.latitude);
				if (ds.longitude !== undefined) await this.setStateAsync(`${base}.location.longitude`, ds.longitude);
				if (ds.heading !== undefined) await this.setStateAsync(`${base}.location.heading`, ds.heading);
				if (ds.speed !== undefined) await this.setStateAsync(`${base}.location.speed`, ds.speed || 0);
				if (ds.shift_state !== undefined) await this.setStateAsync(`${base}.drive.shift_state`, ds.shift_state || 'P');
			}

			// Update climate
			if (data.climate_state) {
				const cs = data.climate_state;
				if (cs.inside_temp !== undefined) await this.setStateAsync(`${base}.climate.inside_temp`, cs.inside_temp);
				if (cs.outside_temp !== undefined) await this.setStateAsync(`${base}.climate.outside_temp`, cs.outside_temp);
				if (cs.driver_temp_setting !== undefined) await this.setStateAsync(`${base}.climate.driver_temp_setting`, cs.driver_temp_setting);
				if (cs.passenger_temp_setting !== undefined) await this.setStateAsync(`${base}.climate.passenger_temp_setting`, cs.passenger_temp_setting);
				if (cs.is_climate_on !== undefined) await this.setStateAsync(`${base}.climate.is_climate_on`, cs.is_climate_on);
				if (cs.is_preconditioning !== undefined) await this.setStateAsync(`${base}.climate.is_preconditioning`, cs.is_preconditioning);
			}

			// Update charge
			if (data.charge_state) {
				const chs = data.charge_state;
				if (chs.battery_level !== undefined) await this.setStateAsync(`${base}.charge.battery_level`, chs.battery_level);
				if (chs.usable_battery_level !== undefined) await this.setStateAsync(`${base}.charge.usable_battery_level`, chs.usable_battery_level);
				if (chs.charging_state !== undefined) await this.setStateAsync(`${base}.charge.charging_state`, chs.charging_state);
				if (chs.charge_limit_soc !== undefined) await this.setStateAsync(`${base}.charge.charge_limit_soc`, chs.charge_limit_soc);
				if (chs.charge_rate !== undefined) await this.setStateAsync(`${base}.charge.charge_rate`, chs.charge_rate);
				if (chs.charger_power !== undefined) await this.setStateAsync(`${base}.charge.charger_power`, chs.charger_power);
				if (chs.time_to_full_charge !== undefined) await this.setStateAsync(`${base}.charge.time_to_full_charge`, chs.time_to_full_charge);
			}

			// Update vehicle state
			if (data.vehicle_state) {
				const vs = data.vehicle_state;
				if (vs.locked !== undefined) await this.setStateAsync(`${base}.state.locked`, vs.locked);
				if (vs.sentry_mode !== undefined) await this.setStateAsync(`${base}.state.sentry_mode`, vs.sentry_mode);
				if (vs.valet_mode !== undefined) await this.setStateAsync(`${base}.state.valet_mode`, vs.valet_mode);
				if (vs.is_user_present !== undefined) await this.setStateAsync(`${base}.state.is_user_present`, vs.is_user_present);
				if (vs.odometer !== undefined) await this.setStateAsync(`${base}.drive.odometer`, vs.odometer);
			}
		} catch (error) {
			this.adapter.log.error(`Error updating vehicle data for ${vin}: ${error}`);
		}
	}

	/**
	 * Update vehicle data from an SSE `data` event - a flat map of PascalCase signal
	 * names, unrelated to the REST vehicleData() response shape.
	 */
	async updateVehicleDataFromSignals(vin: string, signals: Record<string, any>): Promise<void> {
		const base = `vehicles.${vin}`;

		if (!signals) return;

		try {
			if (signals.Location?.latitude !== undefined) await this.setStateAsync(`${base}.location.latitude`, signals.Location.latitude);
			if (signals.Location?.longitude !== undefined) await this.setStateAsync(`${base}.location.longitude`, signals.Location.longitude);
			if (signals.GpsHeading !== undefined) await this.setStateAsync(`${base}.location.heading`, signals.GpsHeading);
			if (signals.VehicleSpeed !== undefined) await this.setStateAsync(`${base}.location.speed`, signals.VehicleSpeed || 0);
			if (signals.Gear !== undefined) await this.setStateAsync(`${base}.drive.shift_state`, signals.Gear);
			if (signals.Odometer !== undefined) await this.setStateAsync(`${base}.drive.odometer`, signals.Odometer);

			if (signals.InsideTemp !== undefined) await this.setStateAsync(`${base}.climate.inside_temp`, signals.InsideTemp);
			if (signals.OutsideTemp !== undefined) await this.setStateAsync(`${base}.climate.outside_temp`, signals.OutsideTemp);
			// The Left/Right signals are physical seat positions, not driver/passenger -
			// on RHD vehicles the driver sits on the right.
			const rhd = this.isRhd(vin);
			if (signals.HvacLeftTemperatureRequest !== undefined)
				await this.setStateAsync(`${base}.climate.${rhd ? 'passenger' : 'driver'}_temp_setting`, signals.HvacLeftTemperatureRequest);
			if (signals.HvacRightTemperatureRequest !== undefined)
				await this.setStateAsync(`${base}.climate.${rhd ? 'driver' : 'passenger'}_temp_setting`, signals.HvacRightTemperatureRequest);
			if (signals.HvacPower !== undefined)
				await this.setStateAsync(`${base}.climate.is_climate_on`, signals.HvacPower !== 'HvacPowerStateOff');

			if (signals.BatteryLevel !== undefined) await this.setStateAsync(`${base}.charge.battery_level`, signals.BatteryLevel);
			if (signals.DetailedChargeState !== undefined) await this.setStateAsync(`${base}.charge.charging_state`, signals.DetailedChargeState);
			if (signals.ChargeLimitSoc !== undefined) await this.setStateAsync(`${base}.charge.charge_limit_soc`, signals.ChargeLimitSoc);
			if (signals.ChargeRateMilePerHour !== undefined) await this.setStateAsync(`${base}.charge.charge_rate`, signals.ChargeRateMilePerHour);
			if (signals.TimeToFullCharge !== undefined) await this.setStateAsync(`${base}.charge.time_to_full_charge`, signals.TimeToFullCharge);

			if (signals.Locked !== undefined) await this.setStateAsync(`${base}.state.locked`, signals.Locked);
			if (signals.SentryMode !== undefined) await this.setStateAsync(`${base}.state.sentry_mode`, signals.SentryMode !== 'SentryModeStateOff');
			if (signals.ValetModeEnabled !== undefined) await this.setStateAsync(`${base}.state.valet_mode`, signals.ValetModeEnabled);
		} catch (error) {
			this.adapter.log.error(`Error updating vehicle data for ${vin}: ${error}`);
		}
	}

	/**
	 * Update energy site data from a flat object matching the REST getSiteInfo()/getLiveStatus()
	 * response shape - either their merged `{ ...siteInfo.response, ...liveStatus.response }`
	 * (the REST seed), or a single SSE `live_status`/`site_info` event's payload (both are
	 * flat, no wrapper, and use the same field names as their REST counterparts). Every field
	 * is optional, so a partial single-topic payload only touches the states it carries.
	 */
	async updateEnergySiteData(siteId: number, data: any): Promise<void> {
		const base = `energy.${siteId}`;

		if (!data) return;

		try {
			// Update live data
			if (data.solar_power !== undefined) await this.setStateAsync(`${base}.live.solar_power`, data.solar_power);
			if (data.battery_power !== undefined) await this.setStateAsync(`${base}.live.battery_power`, data.battery_power);
			if (data.grid_power !== undefined) await this.setStateAsync(`${base}.live.grid_power`, data.grid_power);
			if (data.load_power !== undefined) await this.setStateAsync(`${base}.live.load_power`, data.load_power);
			if (data.grid_status !== undefined) await this.setStateAsync(`${base}.live.grid_status`, data.grid_status);
			if (data.timestamp !== undefined) await this.setStateAsync(`${base}.live.timestamp`, new Date(data.timestamp).getTime());

			// Update battery
			if (data.percentage_charged !== undefined) {
				await this.setStateAsync(`${base}.battery.percentage`, data.percentage_charged);
			}

			// Update operation
			if (data.default_real_mode !== undefined) {
				await this.setStateAsync(`${base}.operation.mode`, data.default_real_mode);
			}
			if (data.backup_reserve_percent !== undefined) {
				await this.setStateAsync(`${base}.operation.backup_reserve_percent`, data.backup_reserve_percent);
			}
			if (data.off_grid_vehicle_charging_reserve_percent !== undefined) {
				await this.setStateAsync(`${base}.operation.off_grid_reserve_percent`, data.off_grid_vehicle_charging_reserve_percent);
			}

			// Update tariff (getSiteInfo() already carries these fields - see TeslemetryEnergyApi.getTariff())
			if (data.tariff_id !== undefined) {
				await this.setStateAsync(`${base}.tariff.tariff_id`, data.tariff_id);
			}
			if (data.tariff_content !== undefined) {
				await this.setStateAsync(`${base}.tariff.tariff_content`, JSON.stringify(data.tariff_content));
			}
			if (data.tariff_content_v2 !== undefined) {
				await this.setStateAsync(`${base}.tariff.tariff_content_v2`, JSON.stringify(data.tariff_content_v2));
			}
		} catch (error) {
			this.adapter.log.error(`Error updating energy site data for ${siteId}: ${error}`);
		}
	}

	/**
	 * Helper to create a channel
	 */
	private async createChannel(id: string, name: string): Promise<void> {
		await this.adapter.setObjectNotExistsAsync(id, {
			type: 'channel',
			common: {
				name,
			},
			native: {},
		});
	}

	/**
	 * Helper to create a state
	 */
	private async createState(
		id: string,
		name: string,
		type: ioBroker.CommonType,
		role: string,
		read: boolean,
		write: boolean,
		def?: any,
		unit?: string
	): Promise<void> {
		await this.adapter.setObjectNotExistsAsync(id, {
			type: 'state',
			common: {
				name,
				type,
				role,
				read,
				write,
				def,
				unit,
			},
			native: {},
		});
	}

	/**
	 * Helper to set state with ack flag
	 */
	private async setStateAsync(id: string, value: any): Promise<void> {
		await this.adapter.setStateAsync(id, value, true);
	}

	/**
	 * Parse state ID to extract vehicle/energy site info and command
	 */
	parseStateId(id: string): { type: 'vehicle' | 'energy'; identifier: string; category: string; state: string } | null {
		// Remove adapter prefix (e.g., "teslemetry.0.") so parts[0] is "vehicles" or "energy"
		const prefix = `${this.adapter.namespace}.`;
		const ownId = id.startsWith(prefix) ? id.slice(prefix.length) : id;
		const parts = ownId.split('.');
		if (parts.length < 4) return null;

		const type = parts[0]; // "vehicles" or "energy"
		const identifier = parts[1]; // VIN or site ID
		const category = parts[2]; // commands, climate, etc.
		const state = parts[3]; // specific state name

		if (type !== 'vehicles' && type !== 'energy') return null;

		return {
			type: type === 'vehicles' ? 'vehicle' : 'energy',
			identifier,
			category,
			state,
		};
	}
}
