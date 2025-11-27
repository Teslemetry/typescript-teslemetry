import { Teslemetry } from '@teslemetry/api';

export interface TeslemetryConfigNodeDef {
    id: string;
    type: string;
    name: string;
    token: string;
}

export interface TeslemetryConfigNode {
    id: string;
    type: string;
    name: string;
    token: string;
}

export default function (RED: any) {
    function TeslemetryConfigNode(this: TeslemetryConfigNode, config: TeslemetryConfigNodeDef) {
        RED.nodes.createNode(this, config);
        this.token = config.token;
    }
    RED.nodes.registerType("teslemetry-config", TeslemetryConfigNode, {
        credentials: {
            token: { type: "password" }
        }
    });

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
            // Handle both wrapped { response: [] } and direct array if API changes
            // Based on user input, it seems to return { response: ... }
            res.json(response.response || response);
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });

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
            // API response structure for products is { response: [...], count: ... }
            const products = response.response || [];
            const sites = products.filter((p: any) => p.resource_type === "battery" || p.resource_type === "solar" || "energy_site_id" in p);
            res.json(sites);
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });

    RED.httpAdmin.get('/teslemetry/fields', async (req: any, res: any) => {
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
            const data = await teslemetry.api.fields();
            // The data object directly contains the field definitions as keys.
            // We need to send only the keys (field names) to the client.
            res.json(Object.keys(data)); 
        } catch (err: any) {
            res.status(500).send(err.message);
        }
    });
}
