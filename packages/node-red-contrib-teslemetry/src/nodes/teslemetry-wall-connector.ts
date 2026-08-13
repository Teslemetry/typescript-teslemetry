import { Node, NodeAPI, NodeDef } from "node-red";
import { Msg } from "../types";

interface WallConnector {
  din: string;
  [key: string]: unknown;
}

export interface TeslemetryWallConnectorNodeDef extends NodeDef {
  din: string;
}

export interface TeslemetryWallConnectorNode extends Node {
  din: string;
}

export default function (RED: NodeAPI) {
  function TeslemetryWallConnectorNode(
    this: TeslemetryWallConnectorNode,
    config: TeslemetryWallConnectorNodeDef,
  ) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.din = config.din || "";

    node.on("input", function (msg: Msg, send, done) {
      const payload = msg.payload as unknown;
      const connectors: WallConnector[] = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as { wall_connectors?: unknown })?.wall_connectors)
          ? ((payload as { wall_connectors: WallConnector[] }).wall_connectors)
          : [];

      const dinFilter = node.din || (msg.din as string) || "";
      const matched = dinFilter
        ? connectors.filter((connector) => connector.din === dinFilter)
        : connectors;

      node.status({
        fill: "blue",
        shape: "dot",
        text: `${matched.length} connector${matched.length === 1 ? "" : "s"}`,
      });

      send(
        matched.map((connector) => ({
          ...msg,
          payload: connector,
          topic: connector.din,
          din: connector.din,
        })),
      );
      done();
    });
  }
  RED.nodes.registerType("teslemetry-wall-connector", TeslemetryWallConnectorNode);
}
