import { Node, NodeAPI, NodeDef } from "node-red";
import { getInstance, hasInstanceError } from "../shared";
import { validateParameters, ValidationRules } from "../validation";
import { Teslemetry } from "@teslemetry/api";
import { Msg } from "../types";

export interface TeslemetryVehicleCommandNodeDef extends NodeDef {
  teslemetryConfig: string;
  vin: string;
  command: string;
}

export interface TeslemetryVehicleCommandNode extends Node {
  teslemetry?: Teslemetry;
  vin: string;
  command: string;
}

const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Converts a 24-hour "HH:mm" Flow-friendly time into Tesla's minutes-since-local-midnight encoding. */
function timeToMinutesOfDay(time: string): number {
  const match = TIME_OF_DAY_PATTERN.exec(time);
  if (!match) {
    throw new Error(`Time must be in HH:mm format (24-hour), got '${time}'`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

export default function (RED: NodeAPI) {
  function CommandNode(
    this: TeslemetryVehicleCommandNode,
    config: TeslemetryVehicleCommandNodeDef,
  ) {
    RED.nodes.createNode(this, config);
    const node = this;

    const instance = getInstance(config.teslemetryConfig, node);
    if (!instance) return;
    if (hasInstanceError(instance, node)) return;

    node.teslemetry = instance.teslemetry;
    node.vin = config.vin;
    node.command = config.command;
    node.status({});

    node.on("input", async function (msg: Msg, send, done) {
      const vin: string = node.vin || msg.vin || "";
      const command: string = node.command || msg.command || "";
      const vehicle = node.teslemetry!.api.getVehicle(vin);

      try {
        if (!vin) {
          throw new Error("No VIN provided");
        }
        if (!command) {
          throw new Error("No Command provided");
        }

        node.status({ fill: "blue", shape: "dot", text: "running command" });

        let result: { response?: any };

        switch (command) {
          case "vehicleData":
            result = await vehicle.vehicleData();
            break;
          case "wakeUp":
            result = await vehicle.wakeUp();
            break;
          case "flashLights":
            result = await vehicle.flashLights();
            break;
          case "honkHorn":
            result = await vehicle.honkHorn();
            break;
          case "lockDoors":
            result = await vehicle.lockDoors();
            break;
          case "unlockDoors":
            result = await vehicle.unlockDoors();
            break;
          case "actuateTrunkRear":
            result = await vehicle.actuateTrunk("rear");
            break;
          case "actuateTrunkFront":
            result = await vehicle.actuateTrunk("front");
            break;
          case "tonneauOpen":
            result = await vehicle.closure({ tonneau: "open" });
            break;
          case "tonneauClose":
            result = await vehicle.closure({ tonneau: "close" });
            break;
          case "sunRoofVent":
            result = await vehicle.sunRoofControl("vent");
            break;
          case "sunRoofClose":
            result = await vehicle.sunRoofControl("close");
            break;
          case "sunRoofStop":
            result = await vehicle.sunRoofControl("stop");
            break;
          case "startAutoConditioning":
            result = await vehicle.startAutoConditioning();
            break;
          case "stopAutoConditioning":
            result = await vehicle.stopAutoConditioning();
            break;
          case "setCabinOverheatProtectionOff":
            result = await vehicle.setCabinOverheatProtection({
              on: false,
              fan_only: false,
            });
            break;
          case "setCabinOverheatProtectionOn":
            result = await vehicle.setCabinOverheatProtection({
              on: true,
              fan_only: false,
            });
            break;
          case "setCabinOverheatProtectionFanOnly":
            result = await vehicle.setCabinOverheatProtection({
              on: true,
              fan_only: true,
            });
            break;
          case "setCopTemp":
            validateParameters(msg, {
              level: {
                required: true,
                type: "number",
                min: 0,
                max: 2,
                integer: true,
              },
            });
            result = await vehicle.setCopTemp(msg.level as 0 | 1 | 2);
            break;
          case "setTemps":
            validateParameters(msg, {
              driver_temp: {
                required: true,
                type: "number",
                min: -40,
                max: 70,
              },
              passenger_temp: {
                required: true,
                type: "number",
                min: -40,
                max: 70,
              },
            });
            result = await vehicle.setTemps(
              msg.driver_temp,
              msg.passenger_temp,
            );
            break;
          case "setSeatHeater":
            validateParameters(msg, {
              seat: {
                required: true,
                type: "string",
                allowedValues: [
                  "front_left",
                  "front_right",
                  "rear_left",
                  "rear_center",
                  "rear_right",
                  "third_row_left",
                  "third_row_right",
                ],
              },
              level: {
                required: true,
                type: "number",
                min: 0,
                max: 3,
                integer: true,
              },
            });
            result = await vehicle.setSeatHeater(msg.seat, msg.level);
            break;
          case "setSteeringWheelHeaterOn":
            result = await vehicle.setSteeringWheelHeater(true);
            break;
          case "setSteeringWheelHeaterOff":
            result = await vehicle.setSteeringWheelHeater(false);
            break;
          case "setAutoSteeringWheelHeatOn":
            result = await vehicle.setAutoSteeringWheelHeat(true);
            break;
          case "setAutoSteeringWheelHeatOff":
            result = await vehicle.setAutoSteeringWheelHeat(false);
            break;
          case "setAutoSeatClimate":
            validateParameters(msg, {
              seat: {
                required: true,
                type: "string",
                allowedValues: ["front_left", "front_right"],
              },
              on: { required: true, type: "boolean" },
            });
            result = await vehicle.setAutoSeatClimate(msg.seat, msg.on);
            break;
          case "setSeatCooler":
            validateParameters(msg, {
              seat: {
                required: true,
                type: "string",
                allowedValues: ["front_left", "front_right"],
              },
              level: {
                required: true,
                type: "number",
                min: 0,
                max: 3,
                integer: true,
              },
            });
            result = await vehicle.setSeatCooler(msg.seat, msg.level);
            break;
          case "setPreconditioningMaxOn":
            validateParameters(msg, {
              manualOverride: { type: "boolean" },
            });
            result = await vehicle.setPreconditioningMax(
              true,
              msg.manualOverride ?? false,
            );
            break;
          case "setPreconditioningMaxOff":
            validateParameters(msg, {
              manualOverride: { type: "boolean" },
            });
            result = await vehicle.setPreconditioningMax(
              false,
              msg.manualOverride ?? false,
            );
            break;
          case "setClimateKeeperMode":
            validateParameters(msg, {
              mode: {
                required: true,
                type: "number",
                min: 0,
                max: 3,
                integer: true,
              },
            });
            result = await vehicle.setClimateKeeperMode(
              msg.mode as 0 | 1 | 2 | 3,
            );
            break;
          case "setBioweaponDefenseModeOn":
            validateParameters(msg, {
              manualOverride: { type: "boolean" },
            });
            result = await vehicle.setBioweaponDefenseMode(
              true,
              msg.manualOverride ?? false,
            );
            break;
          case "setBioweaponDefenseModeOff":
            validateParameters(msg, {
              manualOverride: { type: "boolean" },
            });
            result = await vehicle.setBioweaponDefenseMode(
              false,
              msg.manualOverride ?? false,
            );
            break;
          case "startCharging":
            result = await vehicle.startCharging();
            break;
          case "stopCharging":
            result = await vehicle.stopCharging();
            break;
          case "openChargePort":
            result = await vehicle.openChargePort();
            break;
          case "closeChargePort":
            result = await vehicle.closeChargePort();
            break;
          case "setChargeLimit":
            const chargeLimitRules: ValidationRules = {
              percent: { required: true, type: "number", min: 0, max: 100 },
            };
            validateParameters(msg, chargeLimitRules);
            result = await vehicle.setChargeLimit(msg.percent);
            break;
          case "setChargingAmps":
            validateParameters(msg, {
              amps: {
                required: true,
                type: "number",
                min: 5,
                max: 48,
                integer: true,
              },
            });
            result = await vehicle.setChargingAmps(msg.amps);
            break;
          case "setScheduledCharging":
            validateParameters(msg, {
              enable: { required: true, type: "boolean" },
              time: { required: true, type: "string" },
            });
            result = await vehicle.setScheduledCharging(
              msg.enable,
              timeToMinutesOfDay(msg.time),
            );
            break;
          case "setScheduledDeparture":
            validateParameters(msg, {
              enable: { required: true, type: "boolean" },
              departureTime: { required: true, type: "string" },
              preconditioningEnabled: { type: "boolean" },
              preconditioningWeekdaysOnly: { type: "boolean" },
              offPeakChargingEnabled: { type: "boolean" },
              offPeakChargingWeekdaysOnly: { type: "boolean" },
              endOffPeakTime: { type: "string" },
            });
            result = await vehicle.setScheduledDeparture({
              enable: msg.enable,
              departure_time: timeToMinutesOfDay(msg.departureTime),
              preconditioning_enabled: msg.preconditioningEnabled,
              preconditioning_weekdays_only: msg.preconditioningWeekdaysOnly,
              off_peak_charging_enabled: msg.offPeakChargingEnabled,
              off_peak_charging_weekdays_only:
                msg.offPeakChargingWeekdaysOnly,
              end_off_peak_time:
                msg.endOffPeakTime !== undefined
                  ? timeToMinutesOfDay(msg.endOffPeakTime)
                  : undefined,
            });
            break;
          case "setSentryModeOn":
            result = await vehicle.setSentryMode(true);
            break;
          case "setSentryModeOff":
            result = await vehicle.setSentryMode(false);
            break;
          case "remoteStart":
            result = await vehicle.remoteStart();
            break;
          case "triggerHomelink":
            validateParameters(msg, {
              lat: { required: true, type: "number", min: -90, max: 90 },
              lon: { required: true, type: "number", min: -180, max: 180 },
            });
            result = await vehicle.triggerHomelink(msg.lat, msg.lon);
            break;
          case "scheduleSoftwareUpdate":
            validateParameters(msg, {
              offsetSec: { required: true, type: "number", min: 0 },
            });
            result = await vehicle.scheduleSoftwareUpdate(msg.offsetSec);
            break;
          case "cancelSoftwareUpdate":
            result = await vehicle.cancelSoftwareUpdate();
            break;
          case "navigationRequest":
            validateParameters(msg, {
              value: { required: true, type: "string" },
            });
            result = await vehicle.navigationRequest({
              locale: msg?.locale,
              value: msg?.value,
            });
            break;
          case "adjustVolume":
            validateParameters(msg, {
              volume: { required: true, type: "number", min: 0 },
            });
            result = await vehicle.adjustVolume(msg.volume);
            break;
          default:
            throw new Error(`Unknown command: ${command}`);
        }

        msg.payload = result.response;
        node.status({});
        send(msg);
        done();
      } catch (err: any) {
        node.status({ fill: "red", shape: "ring", text: err.message });
        node.error(err.message || "Teslemetry API Error", msg);
        done();
      }
    });
  }
  RED.nodes.registerType("teslemetry-vehicle-command", CommandNode);
}
