import { Teslemetry } from '@teslemetry/api';
import { TeslemetryConfigNode } from './teslemetry-config';

export default function (RED: any) {
    function TeslemetryEventNode(this: any, config: any) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.teslemetryConfig = config.teslemetryConfig;
        node.vin = config.vin;
        node.event = config.event || "all";

        const teslemetryConfig = RED.nodes.getNode(node.teslemetryConfig) as TeslemetryConfigNode & { credentials: { token: string } };

        if (teslemetryConfig) {
            const token = teslemetryConfig.credentials?.token || teslemetryConfig.token;
            const teslemetry = new Teslemetry(token);

            teslemetry.sse.connect();

            node.status({ fill: "yellow", shape: "ring", text: "connecting" });

            teslemetry.sse.onConnection((connected) => {
                if (connected) {
                    node.status({ fill: "green", shape: "dot", text: "connected" });
                } else {
                    node.status({ fill: "red", shape: "ring", text: "disconnected" });
                }
            });

            let cleanup: () => void;

            const callback = (event: any) => {
                node.send({ payload: event, topic: node.event });
            };

            // If VIN is provided, scope to vehicle. Otherwise generic.
            const source = node.vin ? teslemetry.getVehicle(node.vin).sse : teslemetry.sse;

            switch (node.event) {
                case 'data': cleanup = source.onData(callback); break;
                case 'state': cleanup = source.onState(callback); break;
                case 'vehicle_data': cleanup = source.onVehicleData(callback); break;
                case 'errors': cleanup = source.onErrors(callback); break;
                case 'alerts': cleanup = source.onAlerts(callback); break;
                case 'connectivity': cleanup = source.onConnectivity(callback); break;
                case 'credits': cleanup = source.onCredits(callback); break;
                case 'config': cleanup = source.onConfig(callback); break;
                default: cleanup = source.on(callback); break;
            }

            node.on('close', function(done: any) {
                if (cleanup) cleanup();
                teslemetry.sse.disconnect();
                done();
            });

        } else {
            node.status({ fill: "red", shape: "ring", text: "Config missing" });
            node.error("No Teslemetry configuration found");
        }
    }
    RED.nodes.registerType("teslemetry-event", TeslemetryEventNode);
}
