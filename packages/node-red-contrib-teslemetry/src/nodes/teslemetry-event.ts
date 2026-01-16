import { Node, NodeAPI, NodeDef } from "node-red";
import { SseEvent, Teslemetry } from "@teslemetry/api";
import { instances } from "../shared";

export interface TeslemetryEventNodeDef extends NodeDef {
  teslemetryConfig: string;
  vin: string;
  event: string;
}

export interface TeslemetryEventNode extends Node {
  teslemetry?: Teslemetry;
  vin?: string | null;
  event: string;
}

export default function (RED: NodeAPI) {
  function TeslemetryEventNode(
    this: TeslemetryEventNode,
    config: TeslemetryEventNodeDef,
  ) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.teslemetry = instances.get(config.teslemetryConfig)?.teslemetry;
    node.vin = config.vin || null;
    node.event = config.event || "all";

    if (!node.teslemetry) {
      node.status({ fill: "red", shape: "ring", text: "Config missing" });
      node.error("No Teslemetry instance found");
      return;
    }

    const sse = node.teslemetry.sse;

    if (sse.connected) {
      node.status({ fill: "green", shape: "dot", text: "connected" });
    } else {
      node.status({ fill: "yellow", shape: "ring", text: "connecting" });
      sse.connect().catch((error) => {
        node.status({ fill: "red", shape: "ring", text: "connection failed" });
        const errorMsg = { payload: null, topic: node.event };
        node.error(error?.message || "Failed to connect to SSE", errorMsg);
      });
    }
    const onConnect = () => {
      node.status({ fill: "green", shape: "dot", text: "connected" });
    };
    const onDisconnect = () => {
      node.status({ fill: "red", shape: "ring", text: "disconnected" });
    };
    sse.on("connect", onConnect);
    sse.on("disconnect", onDisconnect);

    // Create callback that filters by VIN if specified
    const callback = (event: SseEvent) => {
      if (!node.vin || event.vin === node.vin) {
        node.send({ payload: event, topic: node.event });
      }
    };

    // Determine event type to listen for
    const eventType = node.event as
      | "all"
      | "data"
      | "state"
      | "vehicle_data"
      | "errors"
      | "alerts"
      | "connectivity"
      | "credits"
      | "config";

    sse.on(eventType, callback);

    node.on("close", function (done: any) {
      sse.off(eventType, callback);
      sse.off("connect", onConnect);
      sse.off("disconnect", onDisconnect);
      done();
    });
  }
  RED.nodes.registerType("teslemetry-event", TeslemetryEventNode);
}
