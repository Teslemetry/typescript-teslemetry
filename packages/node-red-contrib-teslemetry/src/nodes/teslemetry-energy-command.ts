import { Node, NodeAPI, NodeDef } from "node-red";
import { Teslemetry } from "@teslemetry/api";
import { instances } from "../shared";
import { validateParameters } from "../validation";
import { Msg } from "../types";

export interface TeslemetryEnergyCommandNodeDef extends NodeDef {
  teslemetryConfig: string;
  siteId: string;
  command: string;
}

export interface TeslemetryEnergyCommandNode extends Node {
  teslemetry?: Teslemetry;
  siteId: string;
  command: string;
}

export default function (RED: NodeAPI) {
  function TeslemetryEnergyCommandNode(
    this: TeslemetryEnergyCommandNode,
    config: TeslemetryEnergyCommandNodeDef,
  ) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.teslemetry = instances.get(config.teslemetryConfig)?.teslemetry;
    node.siteId = config.siteId;
    node.command = config.command;

    if (!node.teslemetry) {
      node.status({ fill: "red", shape: "ring", text: "Config missing" });
      node.error("No Teslemetry configuration found");
      return;
    } else node.status({});

    node.on("input", async function (msg: Msg, send, done) {
      const siteId: string = node.siteId || (msg.siteId as string) || "";
      const command: string = node.command || (msg.command as string) || "";
      const site = node.teslemetry!.api.getEnergySite(Number(siteId));

      try {
        if (!siteId) {
          throw new Error("No Energy Site ID provided");
        }
        if (!command) {
          throw new Error("No Energy Command provided");
        }

        node.status({ fill: "blue", shape: "dot", text: "running command" });

        let result: { response?: any };

        switch (command) {
          case "getLiveStatus":
            result = await site.getLiveStatus();
            break;
          case "getSiteInfo":
            result = await site.getSiteInfo();
            break;
          case "setBackupReserve":
            validateParameters(msg, {
              percentage: {
                required: true,
                type: "number",
                min: 0,
                max: 100,
              },
            });
            result = await site.setBackupReserve(msg.percentage);
            break;
          case "setOperationModeSelfConsumption":
            result = await site.setOperationMode("self_consumption");
            break;
          case "setOperationModeBackup":
            result = await site.setOperationMode("backup");
            break;
          case "setOperationModeAutonomous":
            result = await site.setOperationMode("autonomous");
            break;
          case "setStormModeOn":
            result = await site.setStormMode(true);
            break;
          case "setStormModeOff":
            result = await site.setStormMode(false);
            break;
          case "gridExportEverything":
            result = await site.gridImportExport("battery_ok");
            break;
          case "gridExportSolar":
            result = await site.gridImportExport("pv_only");
            break;
          case "gridExportNothing":
            result = await site.gridImportExport("never");
            break;
          case "setOffGridVehicleChargingReserve":
            validateParameters(msg, {
              percent: { required: true, type: "number", min: 0, max: 100 },
            });
            result = await site.setOffGridVehicleChargingReserve(msg.percent);
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
  RED.nodes.registerType(
    "teslemetry-energy-command",
    TeslemetryEnergyCommandNode,
  );
}
