import { Teslemetry } from '@teslemetry/api';
import { TeslemetryConfigNode } from './teslemetry-config';

export default function (RED: any) {
    function TeslemetryEnergyCommandNode(this: any, config: any) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.teslemetryConfig = config.teslemetryConfig;
        node.siteId = config.siteId;
        node.command = config.command;

        const teslemetryConfig = RED.nodes.getNode(node.teslemetryConfig) as TeslemetryConfigNode & { credentials: { token: string } };

        if (teslemetryConfig) {
            const token = teslemetryConfig.credentials?.token || teslemetryConfig.token;
            const teslemetry = new Teslemetry(token);

            node.on('input', async function (msg: any, send: any, done: any) {
                const siteId = node.siteId || msg.siteId;
                const command = node.command || msg.command || "getLiveStatus";

                if (!siteId) {
                    node.error("No Energy Site ID provided. Set it in the node configuration or msg.siteId", msg);
                    if (done) done();
                    return;
                }

                try {
                    node.status({ fill: "blue", shape: "dot", text: command });
                    const energy = teslemetry.energySite(siteId);
                    
                    let result;
                    const args = msg.payload || {};

                    switch (command) {
                        case 'getLiveStatus': 
                            result = await energy.getLiveStatus(); 
                            break;
                        case 'getSiteInfo': 
                            result = await energy.getSiteInfo(); 
                            break;
                        case 'setBackupReserve':
                            result = await energy.setBackupReserve(args.backup_reserve_percent || msg.backup_reserve_percent);
                            break;
                        case 'setOperationMode':
                             // "self_consumption" | "backup" | "autonomous"
                            result = await energy.setOperationMode(args.default_real_mode || msg.default_real_mode);
                            break;
                        case 'setStormMode':
                            result = await energy.setStormMode(args.enabled !== undefined ? args.enabled : (msg.enabled !== undefined ? msg.enabled : true));
                            break;
                        case 'gridImportExport':
                             // customer_preferred_export_rule: "battery_ok" | "pv_only" | "never"
                             // disallow_charge_from_grid_with_solar_installed: boolean
                            result = await energy.gridImportExport(
                                args.customer_preferred_export_rule || msg.customer_preferred_export_rule,
                                args.disallow_charge_from_grid_with_solar_installed || msg.disallow_charge_from_grid_with_solar_installed
                            );
                            break;
                        case 'setOffGridVehicleChargingReserve':
                            result = await energy.setOffGridVehicleChargingReserve(args.percent || msg.percent);
                            break;
                        default:
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
    RED.nodes.registerType("teslemetry-energy-command", TeslemetryEnergyCommandNode);

    RED.httpAdmin.get('/teslemetry/energy_sites', async (req: any, res: any) => {
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
            const response = await teslemetry.api.products();
            // Filter for energy sites
            const sites = (response.response || []).filter((p: any) => p.resource_type === "battery" || p.resource_type === "solar" || "energy_site_id" in p);
            res.json(sites);
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });
}
