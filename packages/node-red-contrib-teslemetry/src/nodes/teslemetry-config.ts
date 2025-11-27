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
}
