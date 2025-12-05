import { Node, NodeAPI, NodeDef } from "node-red";
import { SseEvent, Teslemetry } from "packages/api/dist/index.cjs";
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
      sse.connect();
      node.status({ fill: "yellow", shape: "ring", text: "connecting" });
    }
    const removeConnectionListener = node.teslemetry.sse.onConnection(
      (connected) => {
        if (connected) {
          node.status({ fill: "green", shape: "dot", text: "connected" });
        } else {
          node.status({ fill: "red", shape: "ring", text: "disconnected" });
        }
      },
    );

    let cleanup: () => void;

    const callback = (event: SseEvent) => {
      node.send({ payload: event, topic: node.event });
    };

    switch (node.event) {
      case "data":
        cleanup = sse.onData(callback, { vin: node.vin });
        break;
      case "state":
        cleanup = sse.onState(callback, { vin: node.vin });
        break;
      case "vehicle_data":
        cleanup = sse.onVehicleData(callback, { vin: node.vin });
        break;
      case "errors":
        cleanup = sse.onErrors(callback, { vin: node.vin });
        break;
      case "alerts":
        cleanup = sse.onAlerts(callback, { vin: node.vin });
        break;
      case "connectivity":
        cleanup = sse.onConnectivity(callback, { vin: node.vin });
        break;
      case "credits":
        cleanup = sse.onCredits(callback);
        break;
      case "config":
        cleanup = sse.onConfig(callback, { vin: node.vin });
        break;
      default:
        cleanup = sse.on(callback);
        break;
    }

    node.on("close", function (done: any) {
      if (cleanup) cleanup();
      if (removeConnectionListener) removeConnectionListener();
      done();
    });
  }
  RED.nodes.registerType("teslemetry-event", TeslemetryEventNode);
}
