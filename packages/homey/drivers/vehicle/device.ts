import Homey from "homey";
import { TeslemetryVehicleApi, TeslemetryVehicleStream } from "@teslemetry/api";

export default class VehicleDevice extends Homey.Device {
  api?: TeslemetryVehicleApi;
  sse?: TeslemetryVehicleStream;

  async onInit() {
    const { api, sse } = this.getData() as VehicleDevice;
    this.api = api;
    this.sse = sse;
  }

  async onAdded() {
    this.log("Device added");
  }

  /*async updateState() {
    try {
      const data = await this.api.vehicleData([
        "charge_state",
        "vehicle_state",
        "climate_state",
      ]);
      const state = data.response;

      if (state?.charge_state) {
        await this.setCapabilityValue(
          "measure_battery",
          state.charge_state.battery_level,
        ).catch(this.error);
      }
      if (state?.vehicle_state) {
        await this.setCapabilityValue(
          "locked",
          state.vehicle_state.locked,
        ).catch(this.error);
      }
      if (state?.climate_state) {
        await this.setCapabilityValue(
          "measure_temperature",
          state.climate_state.inside_temp,
        ).catch(this.error);
      }
    } catch (e) {
      this.error(e);
    }
  }*/
}
