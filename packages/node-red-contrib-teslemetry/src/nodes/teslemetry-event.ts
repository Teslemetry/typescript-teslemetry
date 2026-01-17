import { Node, NodeAPI, NodeDef } from "node-red";
import { SseEvent, Teslemetry } from "@teslemetry/api";
import { getInstance } from "../shared";

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

    const instance = getInstance(config.teslemetryConfig, node);
    if (!instance) return;

    node.teslemetry = instance.teslemetry;
    node.vin = config.vin || null;
    node.event = config.event || "all";

    const sse = node.teslemetry.sse;

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

    // Create callback that filters by VIN if specified
    const callback = (event: SseEvent) => {
      if (!node.vin || event.vin === node.vin) {
        node.send({ payload: event, topic: node.event });
      }
    };

    const onConnect = () => {
      node.status({ fill: "green", shape: "dot", text: "connected" });
    };
    const onDisconnect = () => {
      node.status({ fill: "red", shape: "ring", text: "disconnected" });
    };

    sse.on("connect", onConnect);
    sse.on("disconnect", onDisconnect);
    sse.on(eventType, callback);
    sse.connect();

    node.on("close", function (done: any) {
      sse.off(eventType, callback);
      sse.off("connect", onConnect);
      sse.off("disconnect", onDisconnect);
      done();
    });
  }
  RED.nodes.registerType("teslemetry-event", TeslemetryEventNode);
}
