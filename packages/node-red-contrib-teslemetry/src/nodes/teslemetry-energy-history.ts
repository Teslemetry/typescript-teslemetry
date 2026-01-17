import { Node, NodeAPI, NodeDef } from "node-red";
import { Teslemetry } from "@teslemetry/api";
import { getInstance, hasInstanceError } from "../shared";
import { validateParameters } from "../validation";
import { Msg } from "../types";

export interface TeslemetryEnergyHistoryNodeDef extends NodeDef {
  teslemetryConfig: string;
  siteId: string;
  historyType: string;
  period: string;
  startDate: string;
  endDate: string;
  timeZone: string;
}

export interface TeslemetryEnergyHistoryNode extends Node {
  teslemetry?: Teslemetry;
  siteId: string;
  historyType: string;
  period: string;
  startDate: string;
  endDate: string;
  timeZone: string;
}

export default function (RED: NodeAPI) {
  function TeslemetryEnergyHistoryNode(
    this: TeslemetryEnergyHistoryNode,
    config: TeslemetryEnergyHistoryNodeDef,
  ) {
    RED.nodes.createNode(this, config);
    const node = this;

    const instance = getInstance(config.teslemetryConfig, node);
    if (!instance) return;
    if (hasInstanceError(instance, node)) return;

    node.teslemetry = instance.teslemetry;
    node.siteId = config.siteId;
    node.historyType = config.historyType;
    node.period = config.period;
    node.startDate = config.startDate;
    node.endDate = config.endDate;
    node.timeZone = config.timeZone;
    node.status({});

    node.on("input", async function (msg: Msg, send, done) {
      const siteId: string = node.siteId || (msg.siteId as string) || "";
      const historyType: string =
        node.historyType || (msg.historyType as string) || "energy";
      const period: string =
        node.period || (msg.period as string) || "day";
      const startDate: string | undefined =
        node.startDate || (msg.startDate as string) || undefined;
      const endDate: string | undefined =
        node.endDate || (msg.endDate as string) || undefined;
      const timeZone: string | undefined =
        node.timeZone || (msg.timeZone as string) || undefined;

      const site = node.teslemetry!.api.getEnergySite(Number(siteId));

      try {
        if (!siteId) {
          throw new Error("No Energy Site ID provided");
        }

        validateParameters(
          { historyType, period },
          {
            historyType: {
              required: true,
              type: "string",
              allowedValues: ["energy", "backup", "telemetry"],
            },
            period: {
              required: historyType !== "telemetry",
              type: "string",
              allowedValues: ["day", "week", "month", "year"],
            },
          },
        );

        node.status({ fill: "blue", shape: "dot", text: "fetching history" });

        let result: { response?: any } | undefined;

        switch (historyType) {
          case "energy":
            result = await site.getCalendarHistory(
              "energy",
              period as "day" | "week" | "month" | "year",
              startDate,
              endDate,
              timeZone,
            );
            break;
          case "backup":
            result = await site.getCalendarHistory(
              "backup",
              period as "day" | "week" | "month" | "year",
              startDate,
              endDate,
              timeZone,
            );
            break;
          case "telemetry":
            result = await site.getTelemetryHistory(
              startDate,
              endDate,
              timeZone,
            );
            break;
          default:
            throw new Error(`Unknown history type: ${historyType}`);
        }

        msg.payload = result?.response;
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
    "teslemetry-energy-history",
    TeslemetryEnergyHistoryNode,
  );
}
