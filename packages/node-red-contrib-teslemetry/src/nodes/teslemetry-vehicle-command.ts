import { Teslemetry } from "@teslemetry/api";
import { TeslemetryConfigNode } from "./teslemetry-config";

export default function (RED: any) {
  function CommandNode(this: any, config: any) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.teslemetryConfig = config.teslemetryConfig;
    node.vin = config.vin;
    node.command = config.command;

    const teslemetryConfig = RED.nodes.getNode(
      node.teslemetryConfig,
    ) as TeslemetryConfigNode;

    if (teslemetryConfig && teslemetryConfig.teslemetry) {
      const teslemetry = teslemetryConfig.teslemetry;

      node.on("input", async function (msg: any, send: any, done: any) {
        const vin = node.vin || msg.vin;
        const command = node.command || msg.command || "vehicleData";

        if (!vin) {
          node.error(
            "No VIN provided. Set it in the node configuration or msg.vin",
            msg,
          );
          if (done) done();
          return;
        }

        try {
          node.status({ fill: "blue", shape: "dot", text: command });
          // getVehicle returns { api, sse }, we need api
          const vehicle = teslemetry.getVehicle(vin).api;

          let result;
          const args = msg.payload || {};

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
              result = await vehicle.setTemps(
                args.driver_temp || msg.driver_temp,
                args.passenger_temp || msg.passenger_temp,
              );
              break;
            case "setSeatHeater":
              // seat: "front_left" | "front_right" | "rear_left" ...
              // level: 0-3
              result = await vehicle.setSeatHeater(
                args.seat || msg.seat,
                args.level || msg.level,
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
              result = await vehicle.setChargeLimit(
                args.percent || msg.percent,
              );
              break;
            case "setChargingAmps":
              result = await vehicle.setChargingAmps(
                args.charging_amps || msg.charging_amps,
              );
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
              result = await vehicle.triggerHomelink(
                args.lat || msg.lat,
                args.lon || msg.lon,
              );
              break;
            case "navigationRequest":
              result = await vehicle.navigationRequest(args);
              break;
            default:
              throw new Error(`Unknown command: ${command}`);
          }

          msg.payload = result;
          node.status({});
          send(msg);
          if (done) done();
        } catch (err: any) {
          node.status({ fill: "red", shape: "ring", text: "Error" });
          node.error(err.message || "Teslemetry API Error", msg);
          if (done) done();
        }
      });
    } else {
      node.status({ fill: "red", shape: "ring", text: "Config missing" });
      node.error("No Teslemetry configuration found");
    }
  }
  RED.nodes.registerType("teslemetry-vehicle-command", CommandNode);
}
