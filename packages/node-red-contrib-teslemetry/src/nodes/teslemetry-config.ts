import { Products, Teslemetry } from "@teslemetry/api";

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
  teslemetry: Teslemetry;
  products: Products;
  credentials: { token: string };
}

export default function (RED: any) {
  function TeslemetryConfigNode(
    this: TeslemetryConfigNode,
    config: TeslemetryConfigNodeDef,
  ) {
    RED.nodes.createNode(this, config);

    if (this.credentials && this.credentials.token) {
      this.teslemetry = new Teslemetry(this.credentials.token);
      this.teslemetry
        .createProducts()
        .then((products) => (this.products = products));
    }

    this.on("close", (done: () => void) => {
      if (this.teslemetry && this.teslemetry.sse) {
        this.teslemetry.sse.disconnect();
      }
      done();
    });
  }
  RED.nodes.registerType("teslemetry-config", TeslemetryConfigNode, {
    credentials: {
      token: { type: "password" },
    },
  });

  RED.httpAdmin.get("/teslemetry/vehicles", async (req: any, res: any) => {
    const configNodeId = req.query.config;

    if (!configNodeId) {
      res.status(400).send("Missing config node ID");
      return;
    }

    // Try to get the active node first
    const configNode = RED.nodes.getNode(configNodeId) as TeslemetryConfigNode;

    if (!configNode || !configNode.teslemetry) {
      res.status(400).send("Missing config instance");
      return;
    }

    const options = Object.entries(configNode.products.vehicles).map(
      ([id, { name }]) => [id, name],
    );

    res.json(options);
  });

  RED.httpAdmin.get("/teslemetry/energy_sites", async (req: any, res: any) => {
    const configNodeId = req.query.config;

    if (!configNodeId) {
      res.status(400).send("Missing config node ID");
      return;
    }

    // Try to get the active node first
    const configNode = RED.nodes.getNode(configNodeId) as TeslemetryConfigNode;

    if (!configNode || !configNode.teslemetry) {
      res.status(400).send("Missing config instance");
      return;
    }

    const options = Object.entries(configNode.products.energySites).map(
      ([id, { name }]) => [id, name],
    );

    res.json(options);
  });

  RED.httpAdmin.get("/teslemetry/fields", async (req: any, res: any) => {
    const { config, model } = req.query;

    if (!config) {
      res.status(400).send("Missing config node ID");
      return;
    }

    const configNode = RED.nodes.getNode(config) as TeslemetryConfigNode;

    if (!configNode || !configNode.teslemetry) {
      res.status(400).send("Missing config instance");
      return;
    }

    const fields = await configNode.teslemetry.api.fields();
    const options = Object.entries(fields)
      .filter(([_, { models }]) => {
        return model && models ? models.includes(model) : true;
      })
      .map(([signal]) => signal);
    res.json(options);
  });
}
