import { Teslemetry } from '@teslemetry/api';
import { TeslemetryConfigNode } from './teslemetry-config';

export default function (RED: any) {
    function TeslemetrySignalNode(this: any, config: any) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.teslemetryConfig = config.teslemetryConfig;
        node.vin = config.vin;
        node.field = config.field;

        const teslemetryConfig = RED.nodes.getNode(node.teslemetryConfig) as TeslemetryConfigNode;

        if (teslemetryConfig && teslemetryConfig.teslemetry) {
            const teslemetry = teslemetryConfig.teslemetry;

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

            // Ensure connection
            teslemetry.sse.connect();
            node.status({ fill: "yellow", shape: "ring", text: "connecting" });

            const removeConnectionListener = teslemetry.sse.onConnection((connected) => {
                 if (connected) {
                    node.status({ fill: "green", shape: "dot", text: "connected" });
                } else {
                    node.status({ fill: "red", shape: "ring", text: "disconnected" });
                }
            });
            
             if (teslemetry.sse.connected) {
                 node.status({ fill: "green", shape: "dot", text: "connected" });
            }

            const vehicle = teslemetry.getVehicle(node.vin);
            
            const cleanup = vehicle.sse.onSignal(node.field as any, (value: any) => {
                node.send({ payload: value, topic: node.field });
            });

            node.on('close', function(done: any) {
                if (cleanup) cleanup();
                if (removeConnectionListener) removeConnectionListener();
                done();
            });

        } else {
            node.status({ fill: "red", shape: "ring", text: "Config missing" });
            node.error("No Teslemetry configuration found");
        }
    }
    RED.nodes.registerType("teslemetry-signal", TeslemetrySignalNode);
}
