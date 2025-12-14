import Homey from "homey";
import type TeslemetryApp from "../../app.js";
import { Teslemetry } from "@teslemetry/api";

export default class VehicleDevice extends Homey.Device {
  private updateInterval?: NodeJS.Timeout;
  private vin?: string;
  private vehicleId?: number;

  async onInit() {
    this.homey.log("Vehicle device initialized");

    // Get vehicle data from device data
    const data = this.getData();
    this.vin = data.vin;
    this.vehicleId = data.vehicle_id;

    if (!this.vin || !this.vehicleId) {
      throw new Error("No VIN or vehicle ID found in device data");
    }

    // Set up periodic updates
    this.setupPeriodicUpdates();

    // Initial state update
    await this.updateVehicleState();
  }

  private setupPeriodicUpdates() {
    // Update every 5 minutes
    this.updateInterval = setInterval(
      async () => {
        try {
          await this.updateVehicleState();
        } catch (error) {
          this.homey.error("Failed to update vehicle state:", error);
        }
      },
      5 * 60 * 1000,
    );
  }

  private async getTeslemetry(): Promise<Teslemetry> {
     const app = this.homey.app as TeslemetryApp;
     const teslemetry = await app.getTeslemetry();
     if (!teslemetry) {
         throw new Error("Teslemetry not initialized");
     }
     return teslemetry;
  }

  private async updateVehicleState() {
    if (!this.vehicleId) return;

    try {
      const teslemetry = await this.getTeslemetry();
      const vehicleApi = teslemetry.vehicle(this.vehicleId.toString());
      const vehicleData = await vehicleApi.vehicleData();
      const state = vehicleData.response;

      if (!state) {
        this.homey.log("No vehicle state data received");
        return;
      }

      // Update battery level
      if (state.charge_state?.battery_level !== undefined) {
        await this.setCapabilityValue(
          "measure_battery",
          state.charge_state.battery_level,
        );
      }

      // Update locked status
      if (state.vehicle_state?.locked !== undefined) {
        await this.setCapabilityValue("locked", state.vehicle_state.locked);
      }

      // Update interior temperature
      if (state.climate_state?.inside_temp !== undefined) {
        await this.setCapabilityValue(
          "measure_temperature",
          state.climate_state.inside_temp,
        );
      }

      this.homey.log("Vehicle state updated successfully");
    } catch (error) {
      // If the vehicle is asleep, this is expected
      if (
        (error as Error).message?.includes("vehicle unavailable") ||
        (error as Error).message?.includes("asleep")
      ) {
        this.homey.log("Vehicle is asleep, skipping update");
        return;
      }

      this.homey.error("Failed to update vehicle state:", error);
    }
  }

  private async wakeVehicle() {
    if (!this.vehicleId) return;

    try {
      const teslemetry = await this.getTeslemetry();
      const vehicleApi = teslemetry.vehicle(this.vehicleId.toString());
      await vehicleApi.wakeUp();
      this.homey.log("Vehicle wake command sent");
    } catch (error) {
      this.homey.error("Failed to wake vehicle:", error);
      throw error;
    }
  }

  // Action handlers
  async lockVehicle() {
    if (!this.vehicleId) throw new Error("Vehicle not available");

    const teslemetry = await this.getTeslemetry();
    const vehicleApi = teslemetry.vehicle(this.vehicleId.toString());
    await (vehicleApi as any).command("door_lock");

    // Update state after command
    setTimeout(() => this.updateVehicleState(), 2000);
  }

  async unlockVehicle() {
    if (!this.vehicleId) throw new Error("Vehicle not available");

    const teslemetry = await this.getTeslemetry();
    const vehicleApi = teslemetry.vehicle(this.vehicleId.toString());
    await (vehicleApi as any).command("door_unlock");

    // Update state after command
    setTimeout(() => this.updateVehicleState(), 2000);
  }

  async startCharging() {
    if (!this.vehicleId) throw new Error("Vehicle not available");

    const teslemetry = await this.getTeslemetry();
    const vehicleApi = teslemetry.vehicle(this.vehicleId.toString());
    await (vehicleApi as any).command("charge_start");

    // Update state after command
    setTimeout(() => this.updateVehicleState(), 2000);
  }

  async stopCharging() {
    if (!this.vehicleId) throw new Error("Vehicle not available");

    const teslemetry = await this.getTeslemetry();
    const vehicleApi = teslemetry.vehicle(this.vehicleId.toString());
    await (vehicleApi as any).command("charge_stop");

    // Update state after command
    setTimeout(() => this.updateVehicleState(), 2000);
  }

  async setClimateOn() {
    if (!this.vehicleId) throw new Error("Vehicle not available");

    const teslemetry = await this.getTeslemetry();
    const vehicleApi = teslemetry.vehicle(this.vehicleId.toString());
    await (vehicleApi as any).command("auto_conditioning_start");

    // Update state after command
    setTimeout(() => this.updateVehicleState(), 2000);
  }

  async setClimateOff() {
    if (!this.vehicleId) throw new Error("Vehicle not available");

    const teslemetry = await this.getTeslemetry();
    const vehicleApi = teslemetry.vehicle(this.vehicleId.toString());
    await (vehicleApi as any).command("auto_conditioning_stop");

    // Update state after command
    setTimeout(() => this.updateVehicleState(), 2000);
  }

  async onDeleted() {
    this.homey.log("Vehicle device deleted");

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }
}
