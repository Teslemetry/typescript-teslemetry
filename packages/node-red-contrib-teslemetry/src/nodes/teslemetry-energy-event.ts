import { Node, NodeAPI, NodeDef } from "node-red";
import { Teslemetry } from "@teslemetry/api";
import { attachStreamStatus, getInstance } from "../shared";

const ENERGY_EVENT_TYPES = [
  "live_status",
  "site_info",
  "tariff_content_v2",
  "energy_totals",
] as const;
type EnergyEventType = (typeof ENERGY_EVENT_TYPES)[number];

export interface TeslemetryEnergyEventNodeDef extends NodeDef {
  teslemetryConfig: string;
  siteId: string;
  event: string;
}

export interface TeslemetryEnergyEventNode extends Node {
  teslemetry?: Teslemetry;
  siteId: string;
  event: string;
}

export default function (RED: NodeAPI) {
  function TeslemetryEnergyEventNode(
    this: TeslemetryEnergyEventNode,
    config: TeslemetryEnergyEventNodeDef,
  ) {
    RED.nodes.createNode(this, config);
    const node = this;

    const instance = getInstance(config.teslemetryConfig, node);
    if (!instance) return;

    node.teslemetry = instance.teslemetry;
    node.siteId = config.siteId;
    node.event = config.event || "all";

    if (!node.siteId) {
      node.error("Site ID is required for Energy Event node");
      node.status({ fill: "red", shape: "ring", text: "Site ID missing" });
      return;
    }

    const sse = node.teslemetry.sse;
    const site = sse.getEnergySite(node.siteId);

    // TeslemetryEnergySiteStream has no built-in "all" meta-event (unlike
    // the vehicle-level stream), so "all" fans out to every known topic here.
    const eventTypes: EnergyEventType[] =
      node.event === "all" ? [...ENERGY_EVENT_TYPES] : [node.event as EnergyEventType];

    const listeners = eventTypes.map((eventType) => {
      const callback = (data: unknown) => {
        node.send({ payload: data, topic: eventType, siteId: node.siteId });
      };
      return { eventType, callback };
    });

    const detachStreamStatus = attachStreamStatus(sse, node);

    for (const { eventType, callback } of listeners) {
      site.on(eventType, callback);
    }
    sse.connect();

    node.on("close", function (done: any) {
      for (const { eventType, callback } of listeners) {
        site.off(eventType, callback);
      }
      detachStreamStatus();
      done();
    });
  }
  RED.nodes.registerType("teslemetry-energy-event", TeslemetryEnergyEventNode);
}
