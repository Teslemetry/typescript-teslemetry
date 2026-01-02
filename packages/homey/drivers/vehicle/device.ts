import type TeslemetryApp from "../../app.js";
import { Teslemetry, VehicleDetails } from "@teslemetry/api";
import TeslemetryDevice from "../../lib/TeslemetryDevice.js";

const isBool = (x: any) => typeof x === "boolean";

const chargePortLatchMap = new Map<any, boolean>([
  ["ChargePortLatchEngaged", true],
  ["ChargePortLatchDisengaged", false],
]);

const defrostModeMap = new Map<any, boolean>([
  ["DefrostModeOn", true],
  ["DefrostModeStateMax", true],
  ["DefrostModeOff", false],
]);

const windowMap = new Map<any, boolean>([
  ["WindowStateOpened", true],
  ["WindowStatePartiallyOpen", true],
  ["WindowStateClosed", false],
]);

export default class VehicleDevice extends TeslemetryDevice {
  private vehicle!: VehicleDetails;

  async onInit() {
    await super.onInit();

    try {
      const vehicle = this.homey.app.products?.vehicles?.[this.getData().vin];
      if (!vehicle) throw new Error("No vehicle found");
      this.vehicle = vehicle;
    } catch (e) {
      this.log("Failed to initialize Vehicle device");
      this.error(e);
      return;
    }

    // --- Signals (Incoming Data) ---

    // Battery & Range
    this.vehicle.sse.onSignal("BatteryLevel", (value) =>
      this.update("measure_battery", value),
    );
    this.vehicle.sse.onSignal("EstBatteryRange", (value) =>
      this.update("measure_range", value),
    );

    // Charging
    this.vehicle.sse.onSignal("DetailedChargeState", (value) =>
      this.update(
        "charge_state",
        value === "DetailedChargeStateStarting" ||
          value === "DetailedChargeStateCharging",
      ),
    );
    this.vehicle.sse.onSignal("ChargerVoltage", (value) =>
      this.update("measure_voltage", value),
    );
    this.vehicle.sse.onSignal("ChargeCurrentRequest", (value) =>
      this.update("measure_current", value),
    );

    // AC Charging
    this.vehicle.sse.onSignal("ACChargingEnergyIn", (value) =>
      this.update("meter_power", value),
    );
    this.vehicle.sse.onSignal("ACChargingPower", (value) =>
      this.update("measure_power", value ? value * 1000 : value),
    );

    // DC Charging
    this.vehicle.sse.onSignal("DCChargingEnergyIn", (value) =>
      this.update("meter_power", value),
    );
    this.vehicle.sse.onSignal("DCChargingPower", (value) =>
      this.update("measure_power", value ? value * 1000 : value),
    );

    // Lock & Sentry & Security
    this.vehicle.sse.onSignal("Locked", (value) =>
      this.update("locked", value),
    );
    this.vehicle.sse.onSignal("SentryMode", (value) => {
      this.update("sentry_mode", value !== "SentryModeStateOff");
      this.update("alarm_motion", value === "SentryModeStatePanic");
    });

    this.vehicle.sse.onSignal("ChargePortLatch", (value) =>
      // 'Engaged' -> Locked?
      this.update("charge_port_latch", chargePortLatchMap.get(value)),
    );
    this.vehicle.sse.onSignal("ChargePortDoorOpen", (value) =>
      this.update("charge_port_door", value),
    );

    // Climate
    this.vehicle.sse.onSignal("HvacACEnabled", (value) =>
      this.update("thermostat_mode", value ? "auto" : "off"),
    );
    this.vehicle.sse.onSignal(
      this.vehicle.metadata.config!.rhd
        ? "HvacRightTemperatureRequest"
        : "HvacLeftTemperatureRequest",
      (value) => this.update("target_temperature", value),
    );
    this.vehicle.sse.onSignal("InsideTemp", (value) =>
      this.update("measure_temperature", value),
    );
    this.vehicle.sse.onSignal("OutsideTemp", (value) =>
      this.update("measure_temperature_outside", value),
    );
    this.vehicle.sse.onSignal("DefrostMode", (value) =>
      this.update("defrost_mode", defrostModeMap.get(value)),
    );
    this.vehicle.sse.onSignal("HvacSteeringWheelHeatLevel", (value) =>
      this.update("steering_wheel_heater", String(value)),
    );
    this.vehicle.sse.onSignal("SeatHeaterLeft", (value) =>
      this.update("seat_heater_front_left", String(value)),
    );
    this.vehicle.sse.onSignal("SeatHeaterRight", (value) =>
      this.update("seat_heater_front_right", String(value)),
    );

    // Doors & Windows (Assuming Signal names)
    this.vehicle.sse.onSignal("DoorState", (value) => {
      if (isBool(value?.DriverFront))
        this.update("alarm_contact_door_front_left", value.DriverFront);
      if (isBool(value?.PassengerFront))
        this.update("alarm_contact_door_front_right", value.PassengerFront);
      if (isBool(value?.DriverRear))
        this.update("alarm_contact_door_rear_left", value.DriverRear);
      if (isBool(value?.PassengerRear))
        this.update("alarm_contact_door_rear_right", value.PassengerRear);
      if (isBool(value?.TrunkFront)) this.update("frunk", value.TrunkFront);
      if (isBool(value?.TrunkRear)) this.update("trunk", value.TrunkRear);
    });

    const handleWindow = () => {
      const { FdWindow, FpWindow, RdWindow, RpWindow } =
        this.vehicle.sse.cache?.data ?? {};
      const anyOpen =
        windowMap.get(FdWindow) ||
        windowMap.get(FpWindow) ||
        windowMap.get(RdWindow) ||
        windowMap.get(RpWindow);
      this.update("windowcoverings_closed", !anyOpen);
    };

    this.vehicle.sse.onSignal("FdWindow", handleWindow);
    this.vehicle.sse.onSignal("FpWindow", handleWindow);
    this.vehicle.sse.onSignal("RdWindow", handleWindow);
    this.vehicle.sse.onSignal("RpWindow", handleWindow);

    // --- Capability Listeners (Actions) ---

    // Locked
    this.registerCapabilityListener("locked", async (value) => {
      value
        ? this.vehicle.api.lockDoors().catch(this.handleApiError)
        : this.vehicle.api.unlockDoors().catch(this.handleApiError);
    });

    // Climate
    this.registerCapabilityListener("thermostat_mode", async (value) => {
      value === "auto"
        ? this.vehicle.api.startAutoConditioning().catch(this.handleApiError)
        : this.vehicle.api.stopAutoConditioning().catch(this.handleApiError);
    });
    this.registerCapabilityListener("target_temperature", async (value) => {
      this.vehicle.api.setTemps(value, value).catch(this.handleApiError);
    });
    this.registerCapabilityListener("defrost_mode", async (value) => {
      this.vehicle.api
        .setPreconditioningMax(value, true)
        .catch(this.handleApiError);
    });
    this.registerCapabilityListener("steering_wheel_heater", async (value) => {
      switch (value) {
        case "0":
          this.vehicle.api
            .setSteeringWheelHeater(false)
            .catch(this.handleApiError);
          break;
        case "1":
          this.vehicle.api
            .setSteeringWheelHeatLevel(1)
            .catch(this.handleApiError);
          //await this.vehicle.api.setSteeringWheelHeater(true);?
          break;
        case "3":
          this.vehicle.api
            .setSteeringWheelHeatLevel(3)
            .catch(this.handleApiError);
          //await this.vehicle.api.setSteeringWheelHeater(true);?
          break;
      }
    });
    this.registerCapabilityListener("seat_heater_front_left", async (value) => {
      this.vehicle.api
        .setSeatHeater("front_left", Number(value))
        .catch(this.handleApiError);
    });
    this.registerCapabilityListener(
      "seat_heater_front_right",
      async (value) => {
        this.vehicle.api
          .setSeatHeater("front_right", Number(value))
          .catch(this.handleApiError);
      },
    );
    // Add rear heaters if API supports and IDs are known

    // Charge
    this.registerCapabilityListener("charge_state", async (value) => {
      value
        ? this.vehicle.api.startCharging().catch(this.handleApiError)
        : this.vehicle.api.stopCharging().catch(this.handleApiError);
    });
    this.registerCapabilityListener("charge_port_door", async (value) => {
      value
        ? this.vehicle.api.openChargePort().catch(this.handleApiError)
        : this.vehicle.api.closeChargePort().catch(this.handleApiError);
    });
    // Sentry & Valet
    this.registerCapabilityListener("sentry_mode", async (value) => {
      this.vehicle.api.setSentryMode(value).catch(this.handleApiError);
    });

    // Doors/Frunk/Trunk
    this.registerCapabilityListener("frunk", async (value) => {
      if (value)
        this.vehicle.api.actuateTrunk("front").catch(this.handleApiError);
      // Cannot be closed
    });
    this.registerCapabilityListener("trunk", async (value) => {
      this.vehicle.api.actuateTrunk("rear").catch(this.handleApiError);
    });
    this.registerCapabilityListener("windowcoverings_closed", async (value) => {
      const { latitude, longitude } = this.vehicle.sse.cache?.data
        ?.Location || { latitude: 0, longitude: 0 }; // Replace with actual location if available
      value
        ? this.vehicle.api
            .windowControl("close", latitude, longitude)
            .catch(this.handleApiError)
        : this.vehicle.api
            .windowControl("vent", latitude, longitude)
            .catch(this.handleApiError);
    });

    // Buttons
    this.registerCapabilityListener("button_flash_lights", async () => {
      this.vehicle.api.flashLights().catch(this.handleApiError);
    });
    this.registerCapabilityListener("button_honk_horn", async () => {
      this.vehicle.api.honkHorn().catch(this.handleApiError);
    });
    this.registerCapabilityListener("button_keyless_driving", async () => {
      this.vehicle.api.remoteStart().catch(this.handleApiError);
    });
    this.registerCapabilityListener("button_homelink", async () => {
      // Needs lat/lon usually
      const lat = 0;
      const lon = 0;
      this.vehicle.api.triggerHomelink(lat, lon).catch(this.handleApiError);
    });
    this.registerCapabilityListener("button_wake_up", async () => {
      this.vehicle.api.wakeUp().catch(this.handleApiError);
    });
  }

  async onUninit() {
    this.vehicle.sse.data.removeAllListeners();
  }
}
