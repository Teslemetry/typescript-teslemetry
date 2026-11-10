import { Node, NodeAPI, NodeDef } from "node-red";
import { getErrorMessage, instances } from "../shared";
import type { GatewayCredentials } from "../localPowerwall";

export interface TeslemetryLocalPowerwallNodeDef extends NodeDef {
  teslemetryConfig: string;
  siteId: string;
  host: string;
}

export interface TeslemetryLocalPowerwallNode extends Node {
  credentials: { password: string; privateKey: string };
}

/** What the editor holds in a password field whose saved value it was never sent. */
const SAVED_PLACEHOLDER = "__PWRD__";

/** A request the editor can fix, answered with 400 and never logged. */
class RequestError extends Error {}

export default function (RED: NodeAPI) {
  function TeslemetryLocalPowerwallNode(
    this: TeslemetryLocalPowerwallNode,
    config: TeslemetryLocalPowerwallNodeDef,
  ) {
    RED.nodes.createNode(this, config);
  }
  // Both are password-type credentials: Node-RED stores them outside the
  // flow, leaves them out of exports and never sends them back to the editor.
  RED.nodes.registerType(
    "teslemetry-local-powerwall",
    TeslemetryLocalPowerwallNode,
    {
      credentials: {
        password: { type: "password" },
        privateKey: { type: "password" },
      },
    },
  );

  /** A secret the editor just entered, else the one saved on the deployed node. */
  function secret(
    id: unknown,
    name: "password" | "privateKey",
    sent: unknown,
  ): string | undefined {
    if (typeof sent === "string" && sent && sent !== SAVED_PLACEHOLDER) {
      return sent;
    }
    // Only this node type: the id comes from the request, and any other
    // node's saved password must not be sent to a gateway address.
    const node =
      typeof id === "string"
        ? (RED.nodes.getNode(id) as TeslemetryLocalPowerwallNode | undefined)
        : undefined;
    const saved =
      node?.type === "teslemetry-local-powerwall" ? node.credentials : undefined;
    return saved?.[name] || undefined;
  }

  function gatewayCredentials(body: any): GatewayCredentials {
    const host = typeof body?.host === "string" ? body.host.trim() : "";
    const password = secret(body?.id, "password", body?.password);
    const privateKey = secret(body?.id, "privateKey", body?.privateKey);
    if (!privateKey) throw new RequestError("Press Pair first");
    if (!host || !password) {
      throw new RequestError("Enter the gateway address and password first");
    }
    return { host, password, privateKey };
  }

  function cloudSite(config: unknown, siteId: unknown) {
    const instance = instances.get(String(config));
    if (!instance) {
      throw new RequestError("Deploy the Teslemetry config first");
    }
    if (!siteId) throw new RequestError("Pick an energy site first");
    return instance.teslemetry.api.getEnergySite(Number(siteId));
  }

  const respond =
    (what: string, handler: (req: any) => Promise<unknown>) =>
    async (req: any, res: any) => {
      // A reply can carry a newly created private key.
      res.set("Cache-Control", "no-store");
      try {
        res.json(await handler(req));
      } catch (error: unknown) {
        const message = getErrorMessage(error);
        if (error instanceof RequestError) {
          res.status(400).json({ message });
          return;
        }
        RED.log.error(`Local Powerwall ${what} failed: ${message}`);
        res.status(500).json({ message });
      }
    };

  const canRead = RED.auth.needsPermission("teslemetry-local-powerwall.read");
  const canWrite = RED.auth.needsPermission("teslemetry-local-powerwall.write");

  RED.httpAdmin.post(
    "/teslemetry/local-powerwall/pair",
    canWrite,
    respond("pairing", async ({ body }) => {
      const cloud = cloudSite(body?.config, body?.siteId);
      const local = await import("../localPowerwall");
      const existing = secret(body?.id, "privateKey", body?.privateKey);
      const privateKey = existing ?? (await local.generateGatewayKey());
      const state = await local.pairGateway(cloud, privateKey);
      // A new key goes to the editor once, to be saved as this node's credential.
      return existing ? { state } : { state, privateKey };
    }),
  );

  RED.httpAdmin.get(
    "/teslemetry/local-powerwall/address",
    canRead,
    respond("address lookup", async ({ query }) => {
      const cloud = cloudSite(query?.config, query?.siteId);
      const local = await import("../localPowerwall");
      return { host: await local.findGatewayAddress(cloud) };
    }),
  );

  RED.httpAdmin.post(
    "/teslemetry/local-powerwall/verify",
    canWrite,
    respond("verify", async ({ body }) => {
      const credentials = gatewayCredentials(body);
      const local = await import("../localPowerwall");
      return local.verifyGateway(credentials);
    }),
  );

  RED.httpAdmin.post(
    "/teslemetry/local-powerwall/remove-key",
    canWrite,
    respond("key removal", async ({ body }) => {
      const credentials = gatewayCredentials(body);
      const local = await import("../localPowerwall");
      await local.removeGatewayKey(credentials);
      return { ok: true };
    }),
  );
}
