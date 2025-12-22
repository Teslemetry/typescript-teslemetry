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
      this.setCapabilityValue("measure_battery", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("EstBatteryRange", (value) =>
      this.setCapabilityValue("measure_range", value).catch(this.error),
    );

    // Charging
    this.vehicle.sse.onSignal("ChargeState", (value) =>
      this.setCapabilityValue(
        "charge_state",
        value === "ChargeStateStarting" || value === "ChargeStateCharging",
      ).catch(this.error),
    );
    this.vehicle.sse.onSignal("ChargerVoltage", (value) =>
      this.setCapabilityValue("measure_voltage", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("ChargeCurrentRequest", (value) =>
      this.setCapabilityValue("measure_current", value).catch(this.error),
    );

    // AC Charging
    this.vehicle.sse.onSignal("ACChargingEnergyIn", (value) =>
      this.setCapabilityValue("meter_power", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("ACChargingPower", (value) =>
      this.setCapabilityValue(
        "measure_power",
        value ? value * 1000 : value,
      ).catch(this.error),
    );

    // DC Charging
    this.vehicle.sse.onSignal("DCChargingEnergyIn", (value) =>
      this.setCapabilityValue("meter_power", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("DCChargingPower", (value) =>
      this.setCapabilityValue(
        "measure_power",
        value ? value * 1000 : value,
      ).catch(this.error),
    );

    // Lock & Sentry & Security
    this.vehicle.sse.onSignal("Locked", (value) =>
      this.setCapabilityValue("locked", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("SentryMode", (value) => {
      this.setCapabilityValue(
        "sentry_mode",
        value !== "SentryModeStateOff",
      ).catch(this.error);
      this.setCapabilityValue("alarm_motion", value === "SentryModeStatePanic");
    });

    this.vehicle.sse.onSignal("ChargePortLatch", (value) =>
      // 'Engaged' -> Locked?
      this.setCapabilityValue(
        "charge_port_latch",
        chargePortLatchMap.get(value),
      ).catch(this.error),
    );
    this.vehicle.sse.onSignal("ChargePortDoorOpen", (value) =>
      this.setCapabilityValue("charge_port_door", value).catch(this.error),
    );

    // Climate
    this.vehicle.sse.onSignal("HvacACEnabled", (value) =>
      this.setCapabilityValue("thermostat_mode", value ? "auto" : "off").catch(
        this.error,
      ),
    );
    this.vehicle.sse.onSignal(
      this.vehicle.metadata.config!.rhd
        ? "HvacRightTemperatureRequest"
        : "HvacLeftTemperatureRequest",
      (value) =>
        this.setCapabilityValue("target_temperature", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("InsideTemp", (value) =>
      this.setCapabilityValue("measure_temperature", value).catch(this.error),
    );
    this.vehicle.sse.onSignal("OutsideTemp", (value) =>
      this.setCapabilityValue("measure_temperature_outside", value).catch(
        this.error,
      ),
    );
    this.vehicle.sse.onSignal("DefrostMode", (value) =>
      this.setCapabilityValue("defrost_mode", defrostModeMap.get(value)).catch(
        this.error,
      ),
    );
    this.vehicle.sse.onSignal("HvacSteeringWheelHeatLevel", (value) =>
      this.setCapabilityValue("steering_wheel_heater", String(value)).catch(
        this.error,
      ),
    );
    this.vehicle.sse.onSignal("SeatHeaterLeft", (value) =>
      this.setCapabilityValue("seat_heater_front_left", String(value)).catch(
        this.error,
      ),
    );
    this.vehicle.sse.onSignal("SeatHeaterRight", (value) =>
      this.setCapabilityValue("seat_heater_front_right", String(value)).catch(
        this.error,
      ),
    );

    // Doors & Windows (Assuming Signal names)
    this.vehicle.sse.onSignal("DoorState", (value) => {
      if (isBool(value?.DriverFront))
        this.setCapabilityValue(
          "alarm_contact_door_front_left",
          value.DriverFront,
        ).catch(this.error);
      if (isBool(value?.PassengerFront))
        this.setCapabilityValue(
          "alarm_contact_door_front_right",
          value.PassengerFront,
        ).catch(this.error);
      if (isBool(value?.DriverRear))
        this.setCapabilityValue(
          "alarm_contact_door_rear_left",
          value.DriverRear,
        ).catch(this.error);
      if (isBool(value?.PassengerRear))
        this.setCapabilityValue(
          "alarm_contact_door_rear_right",
          value.PassengerRear,
        ).catch(this.error);
      if (isBool(value?.TrunkFront))
        this.setCapabilityValue("frunk", value.TrunkFront).catch(this.error);
      if (isBool(value?.TrunkRear))
        this.setCapabilityValue("trunk", value.TrunkRear).catch(this.error);
    });

    const handleWindow = () => {
      //this.vehicle.sse.cache
    };

    this.vehicle.sse.onSignal("FdWindow", handleWindow);
    this.vehicle.sse.onSignal("FpWindow", handleWindow);
    this.vehicle.sse.onSignal("RdWindow", handleWindow);
    this.vehicle.sse.onSignal("RpWindow", handleWindow);

    // --- Capability Listeners (Actions) ---

    // Locked
    this.registerCapabilityListener("locked", async (value) => {
      value ? this.vehicle.api.lockDoors() : this.vehicle.api.unlockDoors();
    });

    // Climate
    this.registerCapabilityListener("thermostat_mode", async (value) => {
      value === "auto"
        ? this.vehicle.api.startAutoConditioning()
        : this.vehicle.api.stopAutoConditioning();
    });
    this.registerCapabilityListener("target_temperature", async (value) => {
      this.vehicle.api.setTemps(value, value);
    });
    this.registerCapabilityListener("defrost_mode", async (value) => {
      this.vehicle.api.setPreconditioningMax(value, true);
    });
    this.registerCapabilityListener("steering_wheel_heater", async (value) => {
      switch (value) {
        case "0":
          this.vehicle.api.setSteeringWheelHeater(false);
          break;
        case "1":
          this.vehicle.api.setSteeringWheelHeatLevel(1);
          //await this.vehicle.api.setSteeringWheelHeater(true);?
          break;
        case "3":
          this.vehicle.api.setSteeringWheelHeatLevel(3);
          //await this.vehicle.api.setSteeringWheelHeater(true);?
          break;
      }
    });
    this.registerCapabilityListener("seat_heater_front_left", async (value) => {
      this.vehicle.api.setSeatHeater("front_left", Number(value));
    });
    this.registerCapabilityListener(
      "seat_heater_front_right",
      async (value) => {
        this.vehicle.api.setSeatHeater("front_right", Number(value));
      },
    );
    // Add rear heaters if API supports and IDs are known

    // Charge
    this.registerCapabilityListener("charge_state", async (value) => {
      value
        ? this.vehicle.api.startCharging()
        : this.vehicle.api.stopCharging();
    });
    this.registerCapabilityListener("charge_port_door", async (value) => {
      value
        ? this.vehicle.api.openChargePort()
        : this.vehicle.api.closeChargePort();
    });
    // Sentry & Valet
    this.registerCapabilityListener("sentry_mode", async (value) => {
      this.vehicle.api.setSentryMode(value);
    });

    // Doors/Frunk/Trunk
    this.registerCapabilityListener("frunk", async (value) => {
      if (value) this.vehicle.api.actuateTrunk("front");
      // Cannot be closed
    });
    this.registerCapabilityListener("trunk", async (value) => {
      this.vehicle.api.actuateTrunk("rear");
    });
    this.registerCapabilityListener("windowcoverings_state", async (value) => {
      // value is 'up', 'down', 'idle'
      const lat = 0; // Replace with actual location if available
      const lon = 0;
      if (value === "up") this.vehicle.api.windowControl("close", lat, lon);
      if (value === "down") this.vehicle.api.windowControl("vent", lat, lon);
    });

    // Buttons
    this.registerCapabilityListener("button_flash_lights", async () => {
      this.vehicle.api.flashLights();
    });
    this.registerCapabilityListener("button_honk_horn", async () => {
      this.vehicle.api.honkHorn();
    });
    this.registerCapabilityListener("button_keyless_driving", async () => {
      this.vehicle.api.remoteStart();
    });
    this.registerCapabilityListener("button_homelink", async () => {
      // Needs lat/lon usually
      const lat = 0;
      const lon = 0;
      this.vehicle.api.triggerHomelink(lat, lon);
    });
    this.registerCapabilityListener("button_wake_up", async () => {
      this.vehicle.api.wakeUp();
    });
  }

  async onUninit() {
    this.vehicle.sse.data.removeAllListeners();
  }
}
