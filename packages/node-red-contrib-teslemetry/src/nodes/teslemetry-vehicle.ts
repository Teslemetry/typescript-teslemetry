import { Teslemetry } from '@teslemetry/api';
import { TeslemetryConfigNode } from './teslemetry-config';

export default function (RED: any) {
    function TeslemetryVehicleNode(this: any, config: any) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.teslemetryConfig = config.teslemetryConfig;
        node.vin = config.vin;
        node.command = config.command;

        const teslemetryConfig = RED.nodes.getNode(node.teslemetryConfig) as TeslemetryConfigNode & { credentials: { token: string } };

        if (teslemetryConfig) {
            const token = teslemetryConfig.credentials?.token || teslemetryConfig.token;
            const teslemetry = new Teslemetry(token);

            node.on('input', async function (msg: any, send: any, done: any) {
                const vin = node.vin || msg.vin;
                const command = node.command || msg.command || "vehicleData";
                
                if (!vin) {
                    node.error("No VIN provided. Set it in the node configuration or msg.vin", msg);
                    if (done) done();
                    return;
                }

                try {
                    node.status({ fill: "blue", shape: "dot", text: command });
                    // getVehicle returns { api, sse }, we need api
                    const vehicle = teslemetry.getVehicle(vin).api;
                    
                    let result;
                    const args = msg.payload || {};

                    switch (command) {
                        case 'vehicleData': 
                            result = await vehicle.vehicleData(); 
                            break;
                        case 'wakeUp': 
                            result = await vehicle.wakeUp(); 
                            break;
                        case 'flashLights': 
                            result = await vehicle.flashLights(); 
                            break;
                        case 'honkHorn': 
                            result = await vehicle.honkHorn(); 
                            break;
                        case 'lockDoors': 
                            result = await vehicle.lockDoors(); 
                            break;
                        case 'unlockDoors': 
                            result = await vehicle.unlockDoors(); 
                            break;
                        case 'actuateTrunk': 
                            result = await vehicle.actuateTrunk(args.which_trunk || msg.which_trunk || "rear"); 
                            break;
                        case 'startAutoConditioning': 
                            result = await vehicle.startAutoConditioning(); 
                            break;
                        case 'stopAutoConditioning': 
                            result = await vehicle.stopAutoConditioning(); 
                            break;
                        case 'setTemps': 
                            result = await vehicle.setTemps(
                                args.driver_temp || msg.driver_temp, 
                                args.passenger_temp || msg.passenger_temp
                            ); 
                            break;
                        case 'setSeatHeater':
                             // heater: "front_left" | "front_right" | "rear_left" ...
                             // level: 0-3
                             result = await vehicle.setSeatHeater(args.heater || msg.heater, args.level || msg.level);
                             break;
                        case 'setSteeringWheelHeater':
                             result = await vehicle.setSteeringWheelHeater(args.on !== undefined ? args.on : (msg.on !== undefined ? msg.on : true));
                             break;
                        case 'startCharging': 
                            result = await vehicle.startCharging(); 
                            break;
                        case 'stopCharging': 
                            result = await vehicle.stopCharging(); 
                            break;
                        case 'openChargePort': 
                            result = await vehicle.openChargePort(); 
                            break;
                        case 'closeChargePort': 
                            result = await vehicle.closeChargePort(); 
                            break;
                        case 'setChargeLimit': 
                            result = await vehicle.setChargeLimit(args.percent || msg.percent); 
                            break;
                        case 'setChargingAmps': 
                            result = await vehicle.setChargingAmps(args.charging_amps || msg.charging_amps); 
                            break;
                        case 'setSentryMode':
                            result = await vehicle.setSentryMode(args.on !== undefined ? args.on : (msg.on !== undefined ? msg.on : true));
                            break;
                        case 'remoteStart': 
                            result = await vehicle.remoteStart(); 
                            break;
                        case 'triggerHomelink':
                            result = await vehicle.triggerHomelink(args.lat || msg.lat, args.lon || msg.lon);
                            break;
                        case 'navigationRequest':
                            result = await vehicle.navigationRequest(args);
                            break;
                        default:
                            // Allow invoking methods by name if they exist (unsafe but powerful)
                            // or strict error. Strict is better for now.
                            throw new Error(`Unknown command: ${command}`);
                    }
                    
                    msg.payload = result;
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

    RED.httpAdmin.get('/teslemetry/vehicles', async (req: any, res: any) => {
        const configNodeId = req.query.config;
        
        if (!configNodeId) {
             res.status(400).send("Missing config node ID");
             return;
        }

        const configNode = RED.nodes.getNode(configNodeId) as TeslemetryConfigNode & { credentials: { token: string } };

        if (!configNode || !configNode.credentials || !configNode.credentials.token) {
            res.status(400).send("Missing or invalid configuration");
            return;
        }

        try {
            const teslemetry = new Teslemetry(configNode.credentials.token);
            const response = await teslemetry.api.vehicles();
            res.json(response.response);
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });
}
