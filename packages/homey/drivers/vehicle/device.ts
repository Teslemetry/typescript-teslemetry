import Homey from "homey";
import type TeslemetryApp from "../../app.js";
import { Signals, Teslemetry, VehicleDetails } from "@teslemetry/api";

interface Description {
  capability: string;
  signal: string;
  get?: () => Promise<any>;
  set?: (value: any) => Promise<void>;
}

export default class VehicleDevice extends Homey.Device {
  private vehicle!: VehicleDetails;
  private active: Array<() => void> = [];

  async onInit() {
    try {
      const app = this.homey.app as TeslemetryApp;
      const vehicle = app.products?.vehicles?.[this.getData().vin];
      if (!vehicle) throw new Error("No vehicle found");
      this.vehicle = vehicle;
    } catch (e) {
      this.log("Failed to initialize Vehicle device");
      this.error(e);
      return;
    }

    this.vehicle.sse.onSignal("BatteryLevel", async (value) =>
      this.setCapabilityValue("measure_battery", value),
    );

    // Locked
    this.registerCapabilityListener("locked", async (value) => {
      value ? this.vehicle.api.lockDoors() : this.vehicle.api.unlockDoors();
    });
    this.vehicle.sse.onSignal("Locked", async (value) => {
      this.setCapabilityValue("locked", value);
    });

    // Climate
    this.registerCapabilityListener("thermostat_mode", async (value) => {
      value
        ? this.vehicle.api.startAutoConditioning()
        : this.vehicle.api.stopAutoConditioning();
    });
    this.vehicle.sse.onSignal("HvacACEnabled", async (value) =>
      this.setCapabilityValue("thermostat_mode", value ? "auto" : "off"),
    );

    this.vehicle.sse.onSignal("InsideTemp", async (value) => {
      this.setCapabilityValue("measure_temperature", value);
    });
  }

  async onUninit() {
    this.vehicle.sse.data.
  }
}
