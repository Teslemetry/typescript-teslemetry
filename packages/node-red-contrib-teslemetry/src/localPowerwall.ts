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
  PowerwallError,
  PowerwallKeyRejectedError,
  parse_authorized_clients,
  verify_local_gateway,
} from "tesla-fleet-api/powerwall";

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
