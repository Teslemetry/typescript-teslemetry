import { Node, NodeAPI, NodeDef } from "node-red";
import { attachStreamStatus, getInstance } from "../shared";
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

    const instance = getInstance(config.teslemetryConfig, node);
    if (!instance) return;

    node.teslemetry = instance.teslemetry;
    node.vin = config.vin;
    node.field = config.field;

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

    const detachStreamStatus = attachStreamStatus(sse, node);

    const cleanup = sse
      .getVehicle(node.vin)
      .onSignal(node.field as any, (value: any) => {
        node.send({ payload: value, topic: "signal", field: node.field });
      });

    sse.connect();

    node.on("close", function (done: any) {
      if (cleanup) cleanup();
      detachStreamStatus();
      done();
    });
  }
  RED.nodes.registerType("teslemetry-signal", TeslemetrySignalNode);
}
