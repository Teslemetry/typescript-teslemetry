import type TeslemetryApp from "../../app.js";
import { SseData, Teslemetry, VehicleDetails } from "@teslemetry/api";
import TeslemetryDevice from "../../lib/TeslemetryDevice.js";

const isBool = (x: any) => typeof x === "boolean";

const chargePortLatchMap = new Map<SseData["data"]["ChargePortLatch"], boolean>(
  [
    ["ChargePortLatchEngaged", true],
    ["ChargePortLatchDisengaged", false],
  ],
);

const defrostModeMap = new Map<SseData["data"]["DefrostMode"], boolean>([
  ["DefrostModeStateNormal", true],
  ["DefrostModeStateMax", true],
  ["DefrostModeStateOff", false],
]);

const windowMap = new Map<SseData["data"]["FdWindow"], boolean>([
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

      this.setCapabilityOptions("onoff.frunk", {
        ...this.driver.manifest.capabilitiesOptions["onoff.frunk"],
        setable: !!this.vehicle.metadata.config?.can_actuate_trunks,
      }).catch(this.error);
      this.setCapabilityOptions("onoff.trunk", {
        ...this.driver.manifest.capabilitiesOptions["onoff.trunk"],
        setable: !!this.vehicle.metadata.config?.can_actuate_trunks,
      }).catch(this.error);
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
      this.update("measure_distance.range", value),
    );

    // Charging
    this.vehicle.sse.onSignal("DetailedChargeState", (value) =>
      this.update(
        "evcharger_charging",
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
      this.update("onoff.sentry", value !== "SentryModeStateOff");
      this.update("alarm_motion", value === "SentryModeStatePanic");
    });

    this.vehicle.sse.onSignal("ChargePortLatch", (value) =>
      // 'Engaged' -> Locked?
      this.update("locked.charge_latch", chargePortLatchMap.get(value)),
    );
    this.vehicle.sse.onSignal("ChargePortDoorOpen", (value) =>
      this.update("onoff.charge_port", value),
    );

    // Climate
    const handleThermostatMode = (
      key: "HvacACEnabled" | "DefrostMode" | "ClimateKeeperMode",
      value: SseData["data"][typeof key],
    ) => {
      // Figure out the latest states of the vehicle
      const signals = {
        HvacACEnabled:
          key === "HvacACEnabled"
            ? (value as SseData["data"]["HvacACEnabled"])
            : this.vehicle.sse.cache.data?.HvacACEnabled,
        DefrostMode: defrostModeMap.get(
          key === "DefrostMode"
            ? (value as SseData["data"]["DefrostMode"])
            : this.vehicle.sse.cache.data?.DefrostMode,
        ),
        ClimateKeeperMode:
          key === "ClimateKeeperMode"
            ? (value as SseData["data"]["ClimateKeeperMode"])
            : this.vehicle.sse.cache.data?.ClimateKeeperMode,
      };

      if (signals.DefrostMode) {
        return this.update("thermostat_mode", "defrost");
      }
      if (signals.ClimateKeeperMode === "ClimateKeeperModeStateOn") {
        return this.update("thermostat_mode", "keep_mode");
      }
      if (signals.ClimateKeeperMode === "ClimateKeeperModeStateDog") {
        return this.update("thermostat_mode", "dog_mode");
      }
      if (signals.ClimateKeeperMode === "ClimateKeeperModeStateParty") {
        return this.update("thermostat_mode", "camp_mode");
      }
      if (signals.HvacACEnabled) {
        return this.update("thermostat_mode", "auto");
      }
      return this.update("thermostat_mode", "off");
    };

    this.vehicle.sse.onSignal("HvacACEnabled", (value) =>
      handleThermostatMode("HvacACEnabled", value),
    );
    this.vehicle.sse.onSignal("DefrostMode", (value) =>
      handleThermostatMode("DefrostMode", value),
    );
    this.vehicle.sse.onSignal("ClimateKeeperMode", (value) =>
      handleThermostatMode("ClimateKeeperMode", value),
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
      this.update("measure_temperature.outside", value),
    );
    this.vehicle.sse.onSignal("HvacSteeringWheelHeatLevel", (value) =>
      this.update("steering_wheel_heater", String(value)),
    );
    this.vehicle.sse.onSignal("SeatHeaterLeft", (value) =>
      this.update("seat_heater.front_left", String(value)),
    );
    this.vehicle.sse.onSignal("SeatHeaterRight", (value) =>
      this.update("seat_heater.front_right", String(value)),
    );

    // Doors & Windows (Assuming Signal names)
    this.vehicle.sse.onSignal("DoorState", (value) => {
      if (isBool(value?.DriverFront))
        this.update("alarm_contact.fl", value.DriverFront);
      if (isBool(value?.PassengerFront))
        this.update("alarm_contact.fr", value.PassengerFront);
      if (isBool(value?.DriverRear))
        this.update("alarm_contact.rl", value.DriverRear);
      if (isBool(value?.PassengerRear))
        this.update("alarm_contact.rr", value.PassengerRear);
      if (isBool(value?.TrunkFront))
        this.update("onoff.frunk", value.TrunkFront);
      if (isBool(value?.TrunkRear)) this.update("onoff.trunk", value.TrunkRear);
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
      // Handle Climate
      const climateState = this.vehicle.sse.cache.data?.HvacACEnabled;
      if (value === "off") {
        this.vehicle.api
          .stopAutoConditioning()
          .then(this.handleApiResponse)
          .catch(this.handleApiError);
        return;
      } else if (value === "auto" && !climateState) {
        this.vehicle.api
          .startAutoConditioning()
          .then(this.handleApiResponse)
          .catch(this.handleApiError);
        return;
      } // else climates on, so we need to check which other state to turn off

      // Handle Defrost
      const defrostValue = defrostModeMap.get(
        this.vehicle.sse.cache.data?.DefrostMode,
      );
      if (value === "defrost") {
        if (!defrostValue) {
          this.vehicle.api
            .setPreconditioningMax(true, true)
            .then(this.handleApiResponse)
            .catch(this.handleApiError);
        }
        return;
      } else {
        if (defrostValue) {
          this.vehicle.api
            .setPreconditioningMax(false, false)
            .then(this.handleApiResponse)
            .catch(this.handleApiError);
        }
      }

      // Handle Keeper
      const climateKeep = this.vehicle.sse.cache.data?.ClimateKeeperMode;
      switch (value) {
        case "keep_mode":
          if (climateKeep !== "ClimateKeeperModeStateOn") {
            this.vehicle.api
              .setClimateKeeperMode(1)
              .then(this.handleApiResponse)
              .catch(this.handleApiError);
          }
          return;
        case "dog_mode":
          if (climateKeep !== "ClimateKeeperModeStateDog") {
            this.vehicle.api
              .setClimateKeeperMode(2)
              .then(this.handleApiResponse)
              .catch(this.handleApiError);
          }
          return;
        case "camp_mode":
          if (climateKeep !== "ClimateKeeperModeStateParty") {
            this.vehicle.api
              .setClimateKeeperMode(3)
              .then(this.handleApiResponse)
              .catch(this.handleApiError);
          }
          return;
        default:
          if (climateKeep !== "ClimateKeeperModeStateOff") {
            this.vehicle.api
              .setClimateKeeperMode(0)
              .then(this.handleApiResponse)
              .catch(this.handleApiError);
          }
      }
    });

    this.registerCapabilityListener("target_temperature", async (value) => {
      this.vehicle.api
        .setTemps(value, value)
        .then(this.handleApiResponse)
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
    this.registerCapabilityListener("seat_heater.front_left", async (value) => {
      this.vehicle.api
        .setSeatHeater("front_left", Number(value))
        .catch(this.handleApiError);
    });

    this.registerCapabilityListener(
      "seat_heater.front_right",
      async (value) => {
        this.vehicle.api
          .setSeatHeater("front_right", Number(value))
          .catch(this.handleApiError);
      },
    );
    // Add rear heaters if API supports and IDs are known

    // Charge
    this.registerCapabilityListener("evcharger_charging", async (value) => {
      value
        ? this.vehicle.api.startCharging().catch(this.handleApiError)
        : this.vehicle.api.stopCharging().catch(this.handleApiError);
    });

    this.registerCapabilityListener("onoff.charge_port", async (value) => {
      value
        ? this.vehicle.api.openChargePort().catch(this.handleApiError)
        : this.vehicle.api.closeChargePort().catch(this.handleApiError);
    });

    // Sentry & Valet
    this.registerCapabilityListener("onoff.sentry", async (value) => {
      this.vehicle.api.setSentryMode(value).catch(this.handleApiError);
    });

    // Doors/Frunk/Trunk
    this.registerCapabilityListener("onoff.frunk", async (value) => {
      if (value)
        this.vehicle.api.actuateTrunk("front").catch(this.handleApiError);
      // Cannot be closed
    });

    this.registerCapabilityListener("onoff.trunk", async (value) => {
      this.vehicle.api.actuateTrunk("rear").catch(this.handleApiError);
    });

    this.registerCapabilityListener("windowcoverings_closed", async (value) => {
      const { latitude, longitude } = this.vehicle.sse.cache?.data
        ?.Location || { latitude: 0, longitude: 0 };
      value
        ? this.vehicle.api
            .windowControl("close", latitude, longitude)
            .catch(this.handleApiError)
        : this.vehicle.api
            .windowControl("vent", latitude, longitude)
            .catch(this.handleApiError);
    });

    // Buttons
    this.registerCapabilityListener("button.flash", async () => {
      this.vehicle.api.flashLights().catch(this.handleApiError);
    });

    this.registerCapabilityListener("button.honk", async () => {
      this.vehicle.api.honkHorn().catch(this.handleApiError);
    });

    this.registerCapabilityListener("button.keyless", async () => {
      this.vehicle.api.remoteStart().catch(this.handleApiError);
    });

    this.registerCapabilityListener("button.homelink", async () => {
      const { latitude, longitude } = this.vehicle.sse.cache?.data
        ?.Location || { latitude: 0, longitude: 0 };
      this.vehicle.api
        .triggerHomelink(latitude, longitude)
        .catch(this.handleApiError);
    });

    this.registerCapabilityListener("button.wakeup", async () => {
      this.vehicle.api.wakeUp().catch(this.handleApiError);
    });
  }

  async onUninit() {
    this.vehicle.sse.data.removeAllListeners();
  }
}
