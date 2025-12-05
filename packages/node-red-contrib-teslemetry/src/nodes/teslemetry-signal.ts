import { Node, NodeAPI, NodeDef } from "node-red";
import { TeslemetryConfigNode } from "./teslemetry-config";
import { instances } from "../shared";
import { Teslemetry } from "@teslemetry/api";

export interface TeslemetrySignalNodeDef extends NodeDef {
  teslemetryConfig: string;
  vin: string;
  field: string;
}

export interface TeslemetrySignalNode extends Node {
  teslemetry?: Teslemetry;
  vin: string;
  field: string;
}

export default function (RED: NodeAPI) {
  function TeslemetrySignalNode(
    this: TeslemetrySignalNode,
    config: TeslemetrySignalNodeDef,
  ) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.teslemetry = instances.get(config.teslemetryConfig)?.teslemetry;
    node.vin = config.vin;
    node.field = config.field;

    if (!node.teslemetry) {
      node.status({ fill: "red", shape: "ring", text: "Config missing" });
      node.error("No Teslemetry instance found");
      return;
    }
    if (!node.vin) {
      node.error("VIN is required for Signal node");
      node.status({ fill: "red", shape: "ring", text: "VIN missing" });
      return;
    }
    if (!node.field) {
      node.error("Field is required for Signal node");
      node.status({ fill: "red", shape: "ring", text: "Field missing" });
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

    const cleanup = sse
      .getVehicle(node.vin)
      .onSignal(node.field as any, (value: any) => {
        node.send({ payload: value, topic: "signal", field: node.field });
      });

    node.on("close", function (done: any) {
      if (cleanup) cleanup();
      if (removeConnectionListener) removeConnectionListener();
      done();
    });
  }
  RED.nodes.registerType("teslemetry-signal", TeslemetrySignalNode);
}
