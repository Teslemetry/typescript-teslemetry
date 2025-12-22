import { TeslemetryEnergyApi } from "@teslemetry/api";

const batteryCapabilities = [
  "measure_battery",
  "measure_power_battery",
  "charge_from_grid",
  "allow_export",
  "operation_mode",
];
const stormModeCapabilities = ["storm_watch", "alarm_storm_watch_active"];
const backupCapabilities = ["backup_reserve"];
const solarCapabilities = [
  //"measure_solar_generated",
  "measure_power_solar",
  //"measure_generator_exported",
  "allow_export",
];
const gridCapabilities = [
  "alarm_off_grid",
  //"measure_grid_exported",
  "measure_power_grid",
  "alarm_island_status",
];
const loadMeterCapabilities = [
  "measure_power_load",
  //"measure_home_usage",
];

export const getCapabilities = (
  siteInfo: Awaited<ReturnType<TeslemetryEnergyApi["getSiteInfo"]>>["response"],
): { deviceClass: string; capabilities: string[] } => {
  let deviceClass = "other";
  const capabilities = new Set<string>();

  if (siteInfo.components.solar) {
    deviceClass = "solar";
    solarCapabilities.forEach((c) => capabilities.add(c));
  }
  if (siteInfo.components.battery) {
    deviceClass = "battery";
    batteryCapabilities.forEach((c) => capabilities.add(c));
  }
  if (siteInfo.components.storm_mode_capable) {
    stormModeCapabilities.forEach((c) => capabilities.add(c));
  }
  if (siteInfo.components.backup) {
    backupCapabilities.forEach((c) => capabilities.add(c));
  }
  if (siteInfo.components.grid) {
    gridCapabilities.forEach((c) => capabilities.add(c));
  }
  if (siteInfo.components.load_meter) {
    loadMeterCapabilities.forEach((c) => capabilities.add(c));
  }

  return { deviceClass, capabilities: Array.from(capabilities) };
};
