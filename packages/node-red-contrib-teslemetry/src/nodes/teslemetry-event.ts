import { TeslemetryConfigNode } from "./teslemetry-config";

export default function (RED: any) {
  function TeslemetryEventNode(this: any, config: any) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.teslemetryConfig = config.teslemetryConfig;
    node.vin = config.vin;
    node.event = config.event || "all";

    const teslemetryConfig = RED.nodes.getNode(
      node.teslemetryConfig,
    ) as TeslemetryConfigNode;

    if (teslemetryConfig && teslemetryConfig.teslemetry) {
      const teslemetry = teslemetryConfig.teslemetry;

      // Ensure connection is active
      teslemetry.sse.connect();

      node.status({ fill: "yellow", shape: "ring", text: "connecting" });

      const removeConnectionListener = teslemetry.sse.onConnection(
        (connected) => {
          if (connected) {
            node.status({ fill: "green", shape: "dot", text: "connected" });
          } else {
            node.status({ fill: "red", shape: "ring", text: "disconnected" });
          }
        },
      );

      // If already connected, update status
      if (teslemetry.sse.connected) {
        node.status({ fill: "green", shape: "dot", text: "connected" });
      }

      let cleanup: () => void;

      const callback = (event: any) => {
        node.send({ payload: event, topic: node.event });
      };

      // If VIN is provided, scope to vehicle. Otherwise generic.
      const source = node.vin
        ? teslemetry.sse.getVehicle(node.vin)
        : teslemetry.sse;

      switch (node.event) {
        case "data":
          cleanup = source.onData(callback);
          break;
        case "state":
          cleanup = source.onState(callback);
          break;
        case "vehicle_data":
          cleanup = source.onVehicleData(callback);
          break;
        case "errors":
          cleanup = source.onErrors(callback);
          break;
        case "alerts":
          cleanup = source.onAlerts(callback);
          break;
        case "connectivity":
          cleanup = source.onConnectivity(callback);
          break;
        case "credits":
          cleanup = source.onCredits(callback);
          break;
        case "config":
          cleanup = source.onConfig(callback);
          break;
        default:
          cleanup = source.on(callback);
          break;
      }

      node.on("close", function (done: any) {
        if (cleanup) cleanup();
        if (removeConnectionListener) removeConnectionListener();
        // Do NOT disconnect the main stream here, as other nodes might be using it.
        // The config node handles the main stream lifecycle.
        done();
      });
    } else {
      node.status({ fill: "red", shape: "ring", text: "Config missing" });
      node.error("No Teslemetry configuration found");
    }
  }
  RED.nodes.registerType("teslemetry-event", TeslemetryEventNode);
}
