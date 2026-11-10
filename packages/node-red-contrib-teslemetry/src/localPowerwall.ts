// Everything that touches `tesla-fleet-api`. Nodes load this file with a
// dynamic import, so the library is read from disk only once a flow uses a
// local gateway.
import { createPrivateKey, createPublicKey, generateKeyPair } from "node:crypto";
import { promisify } from "node:util";
import type { Teslemetry } from "@teslemetry/api";
import { parse_gateway_address } from "tesla-fleet-api";
import {
  AuthorizedClientKeyType,
  AuthorizedClientState,
  AuthorizedClientType,
} from "tesla-fleet-api/const";
import {
  PowerwallAuthenticationError,
  PowerwallClient,
  PowerwallEnergySite,
  PowerwallError,
  PowerwallKeyRejectedError,
  parse_authorized_clients,
  verify_local_gateway,
} from "tesla-fleet-api/powerwall";
import { EnergySiteRouter, is_failover_safe } from "tesla-fleet-api/router";

export type CloudSite = ReturnType<Teslemetry["api"]["getEnergySite"]>;

/** The cloud calls pairing needs, so a test can pass a stub. */
export type PairingCloud = Pick<
  CloudSite,
  "getCommandAuthorizedClients" | "addAuthorizedClient"
>;

export interface GatewayCredentials {
  host: string;
  password: string;
  /** Base64 PKCS#1 DER, as {@link generateGatewayKey} returns it. */
  privateKey: string;
}

/**
 * A new RSA-4096 key for a gateway to pair with, as base64 PKCS#1 DER. The
 * key is stored in this single-line form because it passes through a
 * password input in the editor, which drops the line breaks of a PEM.
 */
export async function generateGatewayKey(): Promise<string> {
  const { privateKey } = await promisify(generateKeyPair)("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: { type: "pkcs1", format: "der" },
    privateKeyEncoding: { type: "pkcs1", format: "der" },
  });
  return privateKey.toString("base64");
}

function loadKey(privateKey: string) {
  return createPrivateKey({
    key: Buffer.from(privateKey, "base64"),
    format: "der",
    type: "pkcs1",
  });
}

function publicKeyDer(privateKey: string): Buffer {
  return createPublicKey(loadKey(privateKey)).export({
    type: "pkcs1",
    format: "der",
  });
}

/**
 * Register the key with the gateway through the cloud unless the gateway
 * already knows it.
 * @returns "verified" once the owner has approved the key on the Powerwall,
 * "pending" while the gateway waits for that approval
 */
export async function pairGateway(
  cloud: PairingCloud,
  privateKey: string,
): Promise<"verified" | "pending"> {
  const publicKey = publicKeyDer(privateKey).toString("base64");
  const { clients } = parse_authorized_clients(
    await cloud.getCommandAuthorizedClients(),
  );
  const state = clients.find((client) => client.public_key === publicKey)?.state;

  if (state === AuthorizedClientState.VERIFIED) return "verified";
  // Registering a pending key again would restart its approval window.
  if (state !== AuthorizedClientState.PENDING_VERIFICATION) {
    await cloud.addAuthorizedClient({
      public_key: publicKey,
      description: "Node-RED",
      key_type: AuthorizedClientKeyType.RSA,
      authorized_client_type: AuthorizedClientType.CUSTOMER_MOBILE_APP,
    });
  }
  return "pending";
}

/** The gateway's LAN address as the cloud reports it, or null when it reports none. */
export async function findGatewayAddress(
  cloud: Pick<CloudSite, "getCommandNetworkingStatus">,
): Promise<string | null> {
  return parse_gateway_address(await cloud.getCommandNetworkingStatus());
}

export type VerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason: "wrong_password" | "key_not_approved" | "unreachable";
      message: string;
    };

/** Log in to the gateway (proves the password) and send one signed read (proves the key). */
export async function verifyGateway(
  credentials: GatewayCredentials,
): Promise<VerifyResult> {
  const client = createClient(credentials);
  try {
    await verify_local_gateway(client);
    return { ok: true };
  } catch (error) {
    if (!(error instanceof PowerwallError)) throw error;
    let reason: "wrong_password" | "key_not_approved" | "unreachable" =
      "unreachable";
    if (error instanceof PowerwallKeyRejectedError) reason = "key_not_approved";
    else if (error instanceof PowerwallAuthenticationError)
      reason = "wrong_password";
    return { ok: false, reason, message: error.message };
  } finally {
    client.close();
  }
}

/** Remove this node's own key from the gateway, signed with that key. */
export async function removeGatewayKey(
  credentials: GatewayCredentials,
): Promise<void> {
  const client = createClient(credentials);
  try {
    await client.remove_authorized_client(publicKeyDer(credentials.privateKey));
  } finally {
    client.close();
  }
}

function createClient({ host, password, privateKey }: GatewayCredentials) {
  return new PowerwallClient({
    host,
    gatewayPassword: password,
    rsaPrivateKeyPem: loadKey(privateKey).export({
      type: "pkcs1",
      format: "pem",
    }) as string,
  });
}

/** The commands a gateway takes locally, under the names both backends share. */
export interface SiteCommands {
  backup(percent: number): Promise<{ response?: unknown }>;
  operation(
    mode: "self_consumption" | "backup" | "autonomous",
  ): Promise<{ response?: unknown }>;
  grid_import_export(
    disallowGridCharging: boolean | null,
    exportRule: "battery_ok" | "pv_only" | "never",
  ): Promise<{ response?: unknown }>;
  dispatch_battery_power(
    powerWatts: number,
    durationSeconds: number,
  ): Promise<{ response?: unknown }>;
  resume_battery_operation(): Promise<{ response?: unknown }>;
}

export type LocalSite = PowerwallEnergySite;

/** A gateway connection that lives as long as its config node. */
export function createLocalSite(credentials: GatewayCredentials): LocalSite {
  return new PowerwallEnergySite(createClient(credentials));
}

export interface Sent {
  result: { response?: unknown };
  path: "local" | "cloud";
  /** Why the gateway gave no answer, when the cloud ran the command instead. */
  failover?: string;
}

/**
 * Send a command to the gateway, and to the cloud only when the gateway gave
 * no answer. A gateway that answers and refuses is final: the cloud reaches
 * the same gateway.
 * @param cloud The fallback, or null when the cloud cannot run this command
 */
export async function sendLocalFirst<M extends keyof SiteCommands>(
  local: LocalSite,
  cloud: SiteCommands | null,
  method: M,
  args: Parameters<SiteCommands[M]>,
): Promise<Sent> {
  const call = (backend: object) =>
    (backend as Record<string, (...a: unknown[]) => Promise<any>>)[method](
      ...args,
    );
  if (!cloud) return { result: await call(local), path: "local" };

  let path: Sent["path"] = "local";
  let failover: string | undefined;
  const router = new EnergySiteRouter([local, cloud], {
    on_result: (error, backend) => {
      if (error === null) {
        path = backend === local ? "local" : "cloud";
        return true;
      }
      const safe = is_failover_safe(error);
      if (safe && backend === local) {
        failover = error instanceof Error ? error.message : String(error);
      }
      return safe;
    },
  });
  return { result: await call(router), path, failover };
}
