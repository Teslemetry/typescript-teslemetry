import { Teslemetry } from '@teslemetry/api';
import { TeslemetryConfigNode } from './teslemetry-config';

export default function (RED: any) {
    function TeslemetryVehicleNode(this: any, config: any) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.teslemetryConfig = config.teslemetryConfig;
        node.vin = config.vin;

        const teslemetryConfig = RED.nodes.getNode(node.teslemetryConfig) as TeslemetryConfigNode;

        if (teslemetryConfig) {
            const teslemetry = new Teslemetry(teslemetryConfig.token);

            node.on('input', async function (msg: any, send: any, done: any) {
                const vin = node.vin || msg.vin;
                
                if (!vin) {
                    node.error("No VIN provided. Set it in the node configuration or msg.vin", msg);
                    if (done) done();
                    return;
                }

                try {
                    node.status({ fill: "blue", shape: "dot", text: "Requesting..." });
                    const vehicle = teslemetry.getVehicle(vin);
                    
                    // Default behavior: Get Vehicle Data
                    // In a full implementation, we would parse config.command or msg.command
                    const data = await vehicle.api.vehicleData();
                    
                    msg.payload = data;
                    node.status({});
                    send(msg);
                    if (done) done();
                } catch (err: any) {
                    node.status({ fill: "red", shape: "ring", text: "Error" });
                    node.error(err.message || "Teslemetry API Error", msg);
                    if (done) done();
                }
            });
        } else {
            node.status({ fill: "red", shape: "ring", text: "Config missing" });
            node.error("No Teslemetry configuration found");
        }
    }
    RED.nodes.registerType("teslemetry-vehicle", TeslemetryVehicleNode);
}
