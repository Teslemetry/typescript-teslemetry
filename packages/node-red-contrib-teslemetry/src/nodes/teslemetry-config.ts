import { Node, NodeAPI, NodeDef } from "node-red";
import { Teslemetry } from "@teslemetry/api";
import { instances, getErrorMessage, Instance } from "../shared";

export interface TeslemetryConfigNodeDef extends NodeDef {
  token: string;
}

export interface TeslemetryConfigNode extends Node {
  credentials: { token: string };
}

/** How long to wait before retrying a failed initial products fetch, so a
 *  transient API/network blip clears on its own instead of leaving `error`
 *  set for the rest of the node's life. */
export const PRODUCTS_RETRY_DELAY_MS = 60_000;

type Logger = { error(msg: string): void };

/**
 * Fetch `instance.teslemetry`'s products, retrying with a fixed delay on
 * failure until it succeeds or `stop()` is called. Each attempt replaces
 * `instance.products`/`instance.error` in place so any caller re-reading
 * them (e.g. the admin routes below) sees the latest state.
 * @returns stop function to call from the node's "close" handler
 */
export function createProductsFetcher(
  log: Logger,
  instance: Instance,
  retryDelayMs: number = PRODUCTS_RETRY_DELAY_MS,
): () => void {
  let stopped = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  function attempt() {
    instance.products = instance.teslemetry
      .createProducts()
      .then((products) => {
        instance.error = undefined;
        return products;
      })
      .catch((error: unknown) => {
        const message = getErrorMessage(error);
        log.error(`Teslemetry error: ${message}`);
        instance.error = message;
        if (!stopped) {
          retryTimer = setTimeout(attempt, retryDelayMs);
        }
        return { vehicles: {}, energySites: {} };
      });
  }

  attempt();

  return function stop() {
    stopped = true;
    if (retryTimer) clearTimeout(retryTimer);
  };
}

export type CredentialTestResult =
  | { ok: true }
  | { ok: false; auth: boolean; message: string };

/**
 * Validate a Teslemetry client's credentials with a lightweight API call,
 * distinguishing an auth failure (401/403) from any other error so the
 * config editor can tell "bad token" apart from a transient/network issue.
 */
export async function testCredentials(
  teslemetry: Pick<Teslemetry, "client" | "api">,
): Promise<CredentialTestResult> {
  let status: number | undefined;
  teslemetry.client.interceptors.response.use((response) => {
    status = response.status;
    return response;
  });

  try {
    await teslemetry.api.test();
    return { ok: true };
  } catch (error: unknown) {
    const isAuth = status === 401 || status === 403;
    return {
      ok: false,
      auth: isAuth,
      message: isAuth
        ? "Invalid or expired access token"
        : getErrorMessage(error),
    };
  }
}

export default function (RED: NodeAPI) {
  function TeslemetryConfigNode(
    this: TeslemetryConfigNode,
    config: TeslemetryConfigNodeDef,
  ) {
    RED.nodes.createNode(this, config);
    const node = this;
    let stopFetching = () => {};

    if (this.credentials && this.credentials.token) {
      const teslemetry = new Teslemetry(this.credentials.token, {
        logger: RED.log,
        stream: { cache: false },
      });

      const instance: Instance = {
        teslemetry,
        products: Promise.resolve({ vehicles: {}, energySites: {} }),
        error: undefined,
      };
      instances.set(node.id, instance);
      stopFetching = createProductsFetcher(RED.log, instance);
    }

    this.on("close", (done: () => void) => {
      stopFetching();
      instances.get(node.id)?.teslemetry.sse.disconnect();
      instances.delete(node.id);
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

  RED.httpAdmin.post(
    "/teslemetry/test-credentials",
    async (req: any, res: any) => {
      const token = req.body?.token;
      if (!token) {
        res.status(400).json({ ok: false, message: "Missing token" });
        return;
      }

      const teslemetry = new Teslemetry(token, { logger: RED.log });
      res.json(await testCredentials(teslemetry));
    },
  );

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
