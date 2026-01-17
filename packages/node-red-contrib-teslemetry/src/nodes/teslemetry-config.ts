import { Node, NodeAPI, NodeDef } from "node-red";
import { Teslemetry } from "@teslemetry/api";
import { instances, getErrorMessage } from "../shared";

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

      // Create instance first so it can be referenced in catch handler
      const instance = {
        teslemetry,
        products: Promise.resolve({ vehicles: {}, energySites: {} }),
        error: undefined as string | undefined,
      };
      instances.set(this.id, instance);

      // Fetch products and track errors
      instance.products = teslemetry
        .createProducts()
        .catch((error: unknown) => {
          const message = getErrorMessage(error);
          RED.log.error(`Teslemetry error: ${message}`);
          instance.error = message;
          return { vehicles: {}, energySites: {} };
        });
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
    try {
      const config = req.query.config;

      if (!config) {
        res.status(400).send("Missing config ID");
        return;
      }

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
    } catch (error: unknown) {
      RED.log.error(`Failed to fetch vehicles: ${getErrorMessage(error)}`);
      res.status(500).send("Failed to fetch vehicles");
    }
  });

  RED.httpAdmin.get("/teslemetry/energy_sites", async (req: any, res: any) => {
    try {
      const config = req.query.config;

      if (!config) {
        res.status(400).send("Missing config ID");
        return;
      }

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
    } catch (error: unknown) {
      RED.log.error(`Failed to fetch energy sites: ${getErrorMessage(error)}`);
      res.status(500).send("Failed to fetch energy sites");
    }
  });

  RED.httpAdmin.get("/teslemetry/fields", async (req: any, res: any) => {
    try {
      const { config, model } = req.query;

      if (!config) {
        res.status(400).send("Missing config ID");
        return;
      }

      const instance = instances.get(req.query.config);

      if (!instance) {
        res.status(400).send("Missing config instance");
        return;
      }

      const fields = await instance.teslemetry.api.getFields();
      const options = Object.entries(fields)
        .filter(([_, { models }]) => {
          return model && models ? models.includes(model) : true;
        })
        .map(([signal]) => signal);
      res.json(options);
    } catch (error: unknown) {
      RED.log.error(`Failed to fetch fields: ${getErrorMessage(error)}`);
      res.status(500).send("Failed to fetch fields");
    }
  });
}
