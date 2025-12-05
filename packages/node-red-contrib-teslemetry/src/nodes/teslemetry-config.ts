import { Node, NodeAPI, NodeDef } from "node-red";
import { Teslemetry } from "@teslemetry/api";
import { instances } from "../shared";

export interface TeslemetryConfigNodeDef extends NodeDef {
  token: string;
}

export interface TeslemetryConfigNode extends Node {
  credentials: { token: string };
}

export default function (RED: NodeAPI) {
  function TeslemetryConfigNode(
    this: TeslemetryConfigNode,
    config: TeslemetryConfigNodeDef,
  ) {
    RED.nodes.createNode(this, config);

    if (this.credentials && this.credentials.token) {
      const teslemetry = new Teslemetry(this.credentials.token, {
        logger: RED.log,
        stream: { cache: false },
      });
      instances.set(this.id, {
        teslemetry,
        products: teslemetry.createProducts(),
      });
      console.log("Created", this.id);
    }

    this.on("close", (done: () => void) => {
      instances.get(this.id)?.teslemetry.sse.disconnect();
      done();
    });
  }
  RED.nodes.registerType("teslemetry-config", TeslemetryConfigNode, {
    credentials: {
      token: { type: "password" },
    },
  });

  RED.httpAdmin.get("/teslemetry/vehicles", async (req: any, res: any) => {
    const config = req.query.config;

    if (!config) {
      res.status(400).send("Missing config ID");
      return;
    }

    // Try to get the active node first
    const instance = instances.get(req.query.config);

    if (!instance) {
      res.status(400).send("Missing config instance");
      return;
    }

    const { vehicles } = await instance.products;

    const options = Object.entries(vehicles).map(([id, { name }]) => [
      id,
      name,
    ]);

    res.json(options);
  });

  RED.httpAdmin.get("/teslemetry/energy_sites", async (req: any, res: any) => {
    const config = req.query.config;

    if (!config) {
      res.status(400).send("Missing config ID");
      return;
    }

    // Try to get the active node first
    const instance = instances.get(req.query.config);

    if (!instance) {
      res.status(400).send("Missing config instance");
      return;
    }

    const { energySites } = await instance.products;

    const options = Object.entries(energySites).map(([id, { name }]) => [
      id,
      name,
    ]);

    res.json(options);
  });

  RED.httpAdmin.get("/teslemetry/fields", async (req: any, res: any) => {
    const { config, model } = req.query;

    if (!config) {
      res.status(400).send("Missing config ID");
      return;
    }

    // Try to get the active node first
    const instance = instances.get(req.query.config);

    if (!instance) {
      res.status(400).send("Missing config instance");
      return;
    }

    const fields = await instance.teslemetry.api.fields();
    const options = Object.entries(fields)
      .filter(([_, { models }]) => {
        return model && models ? models.includes(model) : true;
      })
      .map(([signal]) => signal);
    res.json(options);
  });
}
