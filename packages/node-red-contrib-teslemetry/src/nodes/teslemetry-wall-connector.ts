import { Node, NodeAPI, NodeDef } from "node-red";
import { Msg } from "../types";

interface WallConnector {
  din: string;
  [key: string]: unknown;
}

/**
 * Find the `wall_connectors` array in whatever shape the upstream node sent:
 * the array itself, a `live_status` object (Energy Command's getLiveStatus),
 * or the whole stream event that nests `live_status` (Energy Event).
 */
function extractWallConnectors(payload: unknown): WallConnector[] {
  if (Array.isArray(payload)) return payload;
  const liveStatus = (payload as { live_status?: unknown } | null)?.live_status ?? payload;
  const connectors = (liveStatus as { wall_connectors?: unknown } | null)?.wall_connectors;
  return Array.isArray(connectors) ? connectors : [];
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
      const connectors = extractWallConnectors(msg.payload);

      const dinFilter = node.din || (msg.din as string) || "";
      const matched = dinFilter
        ? connectors.filter((connector) => connector.din === dinFilter)
        : connectors;

      node.status({
        fill: "blue",
        shape: "dot",
        text: `${matched.length} connector${matched.length === 1 ? "" : "s"}`,
      });

      // Nested array: a flat one would spread the messages across outputs
      // (one per output), so only the first connector would leave output 1.
      send([
        matched.map((connector) => ({
          ...msg,
          payload: connector,
          topic: connector.din,
          din: connector.din,
        })),
      ]);
      done();
    });
  }
  RED.nodes.registerType("teslemetry-wall-connector", TeslemetryWallConnectorNode);
}
