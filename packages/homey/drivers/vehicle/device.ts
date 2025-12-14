import { OAuth2Device } from "homey-oauth2app";
import type TeslemetryOAuth2Client from "../../lib/TeslemetryOAuth2Client.js";
import { Teslemetry, Products } from "@teslemetry/api";

export default class VehicleDevice extends OAuth2Device {
  private updateInterval?: NodeJS.Timeout;
  private vin?: string;
  private vehicleId?: number;
  private teslemetryInstance?: Teslemetry;
  private oAuth2ClientRef?: TeslemetryOAuth2Client;

  async onOAuth2Init() {
    this.homey.log("Vehicle device initialized with OAuth2");

    // Get vehicle data from device data
    const data = this.getData();
    this.vin = data.vin;
    this.vehicleId = data.vehicle_id;

    if (!this.vin || !this.vehicleId) {
      throw new Error("No VIN or vehicle ID found in device data");
    }

    // Store OAuth2 client reference for token refresh
    this.oAuth2ClientRef = this.oAuth2Client as TeslemetryOAuth2Client;

    // Initialize Teslemetry
    await this.initializeTeslemetry();

    // Set up periodic updates
    this.setupPeriodicUpdates();

    // Initial state update
    await this.updateVehicleState();
  }

  private async initializeTeslemetry() {
    if (!this.oAuth2ClientRef) return;

    try {
      const accessToken = await this.oAuth2ClientRef.getAccessToken();
      this.teslemetryInstance = new Teslemetry(accessToken);
    } catch (error) {
      this.homey.error("Failed to initialize Teslemetry:", error);
      throw error;
    }
  }

  /**
   * Get a fresh Teslemetry instance with current token
   */
  private async getTeslemetryInstance(): Promise<Teslemetry> {
    if (!this.oAuth2ClientRef) {
      throw new Error("OAuth2 client not available");
    }

    const accessToken = await this.oAuth2ClientRef.getAccessToken();
    return new Teslemetry(accessToken);
  }

  async onOAuth2Deleted() {
    this.homey.log("OAuth2 session deleted, cleaning up device");

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }

    this.teslemetryInstance = undefined;
    this.oAuth2ClientRef = undefined;
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

  private async updateVehicleState() {
    if (!this.vehicleId) return;

    try {
      // Get fresh Teslemetry instance with current token
      let teslemetry = this.teslemetryInstance;
      if (!teslemetry) {
        teslemetry = await this.getTeslemetryInstance();
        this.teslemetryInstance = teslemetry;
      }

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

      // Try to refresh token and retry once
      try {
        this.teslemetryInstance = await this.getTeslemetryInstance();
        await this.updateVehicleState();
      } catch (retryError) {
        this.homey.error("Failed to update after token refresh:", retryError);
      }
    }
  }

  private async wakeVehicle() {
    if (!this.vehicleId) return;

    try {
      let teslemetry = this.teslemetryInstance;
      if (!teslemetry) {
        teslemetry = await this.getTeslemetryInstance();
        this.teslemetryInstance = teslemetry;
      }

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

    let teslemetry = this.teslemetryInstance;
    if (!teslemetry) {
      teslemetry = await this.getTeslemetryInstance();
      this.teslemetryInstance = teslemetry;
    }

    const vehicleApi = teslemetry.vehicle(this.vehicleId.toString());
    await vehicleApi.command("door_lock");

    // Update state after command
    setTimeout(() => this.updateVehicleState(), 2000);
  }

  async unlockVehicle() {
    if (!this.vehicleId) throw new Error("Vehicle not available");

    let teslemetry = this.teslemetryInstance;
    if (!teslemetry) {
      teslemetry = await this.getTeslemetryInstance();
      this.teslemetryInstance = teslemetry;
    }

    const vehicleApi = teslemetry.vehicle(this.vehicleId.toString());
    await vehicleApi.command("door_unlock");

    // Update state after command
    setTimeout(() => this.updateVehicleState(), 2000);
  }

  async startCharging() {
    if (!this.vehicleId) throw new Error("Vehicle not available");

    let teslemetry = this.teslemetryInstance;
    if (!teslemetry) {
      teslemetry = await this.getTeslemetryInstance();
      this.teslemetryInstance = teslemetry;
    }

    const vehicleApi = teslemetry.vehicle(this.vehicleId.toString());
    await vehicleApi.command("charge_start");

    // Update state after command
    setTimeout(() => this.updateVehicleState(), 2000);
  }

  async stopCharging() {
    if (!this.vehicleId) throw new Error("Vehicle not available");

    let teslemetry = this.teslemetryInstance;
    if (!teslemetry) {
      teslemetry = await this.getTeslemetryInstance();
      this.teslemetryInstance = teslemetry;
    }

    const vehicleApi = teslemetry.vehicle(this.vehicleId.toString());
    await vehicleApi.command("charge_stop");

    // Update state after command
    setTimeout(() => this.updateVehicleState(), 2000);
  }

  async setClimateOn() {
    if (!this.vehicleId) throw new Error("Vehicle not available");

    let teslemetry = this.teslemetryInstance;
    if (!teslemetry) {
      teslemetry = await this.getTeslemetryInstance();
      this.teslemetryInstance = teslemetry;
    }

    const vehicleApi = teslemetry.vehicle(this.vehicleId.toString());
    await vehicleApi.command("auto_conditioning_start");

    // Update state after command
    setTimeout(() => this.updateVehicleState(), 2000);
  }

  async setClimateOff() {
    if (!this.vehicleId) throw new Error("Vehicle not available");

    let teslemetry = this.teslemetryInstance;
    if (!teslemetry) {
      teslemetry = await this.getTeslemetryInstance();
      this.teslemetryInstance = teslemetry;
    }

    const vehicleApi = teslemetry.vehicle(this.vehicleId.toString());
    await vehicleApi.command("auto_conditioning_stop");

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
