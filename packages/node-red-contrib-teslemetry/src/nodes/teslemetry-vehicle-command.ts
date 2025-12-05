import { Node, NodeAPI, NodeDef, NodeMessageInFlow } from "node-red";
import { TeslemetryConfigNode } from "./teslemetry-config";
import { instances } from "../shared";
import { validateParameters, ValidationRules } from "../validation";

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

export default function (RED: NodeAPI) {
  function CommandNode(
    this: TeslemetryVehicleCommandNode,
    config: TeslemetryVehicleCommandNodeDef,
  ) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.teslemetry = instances.get(config.teslemetryConfig)?.teslemetry;
    node.vin = config.vin;
    node.command = config.command;

    if (!node.teslemetry) {
      node.status({ fill: "red", shape: "ring", text: "Config missing" });
      node.error("No Teslemetry configuration found");
      return;
    } else node.status({});

    node.on("input", async function (msg: NodeMessageInFlow, send, done) {
      const vin: string = node.vin || (msg.vin as string) || "";
      const command: string = node.command || (msg.command as string) || "";
      const vehicle = node.teslemetry!.api.getVehicle(vin);

      try {
        if (!vin) {
          throw new Error("No VIN provided");
        }
        if (!command) {
          throw new Error("No Command provided");
        }

        node.status({ fill: "blue", shape: "dot", text: "running command" });

        let result: { response: any };

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
          case "startAutoConditioning":
            result = await vehicle.startAutoConditioning();
            break;
          case "stopAutoConditioning":
            result = await vehicle.stopAutoConditioning();
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
              (msg as any).driver_temp,
              (msg as any).passenger_temp,
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
            result = await vehicle.setSeatHeater(
              (msg as any).seat,
              (msg as any).level,
            );
            break;
          case "setSteeringWheelHeaterOn":
            result = await vehicle.setSteeringWheelHeater(true);
            break;
          case "setSteeringWheelHeaterOff":
            result = await vehicle.setSteeringWheelHeater(false);
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
            result = await vehicle.setChargeLimit((msg as any).percent);
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
            result = await vehicle.setChargingAmps((msg as any).amps);
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
            result = await vehicle.triggerHomelink(
              (msg as any).lat,
              (msg as any).lon,
            );
            break;
          case "navigationRequest":
            validateParameters(msg, {
              value: { required: true, type: "string" },
            });
            result = await vehicle.navigationRequest(msg);
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
