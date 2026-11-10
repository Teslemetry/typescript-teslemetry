// A stand-in Powerwall gateway on a real self-signed HTTPS server. It checks
// each RSA signature from the protocol's TLV rules itself, so a round trip
// proves the client's login and signing end to end.
import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import https from "node:https";
import type { AddressInfo } from "node:net";
import {
  MessageFaultE,
  RoutableMessage,
} from "@teslemetry/tesla-protocol/energy_device/signed_message";
import { MessageEnvelope } from "@teslemetry/tesla-protocol/energy_device/transport";

type Json = Record<string, any>;

export const GATEWAY_DIN = "1232100-00-E--TG123456789ABC";
export const GATEWAY_PASSWORD = "ABCDEFGHIJKLMNO";

/** A port nothing listens on, so a connect fails at once. */
export const DEAD_HOST = "127.0.0.1:1";

/** Throwaway certificate, valid until 2126. */
const TLS_KEY = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgnQ+5iMJYA2gM5ord
dAYbLD0PxhYnCEBW393j1Y7Fca6hRANCAAQw/C/vePQYZuVnf/EIMaeLJfM+78ji
Ux1NBGC908OuxXYTyd34nVCMlwtnJ6pMk+ocWhgdSwtDypE6X+kA6+/y
-----END PRIVATE KEY-----
`;
const TLS_CERT = `-----BEGIN CERTIFICATE-----
MIIBljCCATugAwIBAgIUUqOhj2A7g2610Dj7EBM3elhWvYMwCgYIKoZIzj0EAwIw
HzEdMBsGA1UEAwwUZmFrZS1nYXRld2F5LmludmFsaWQwIBcNMjYxMTAyMDMzNzM5
WhgPMjEyNjEwMDkwMzM3MzlaMB8xHTAbBgNVBAMMFGZha2UtZ2F0ZXdheS5pbnZh
bGlkMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEMPwv73j0GGblZ3/xCDGniyXz
Pu/I4lMdTQRgvdPDrsV2E8nd+J1QjJcLZyeqTJPqHFoYHUsLQ8qROl/pAOvv8qNT
MFEwHQYDVR0OBBYEFHJ4HK2AIfdzD1us9fB1Foz4i4/EMB8GA1UdIwQYMBaAFHJ4
HK2AIfdzD1us9fB1Foz4i4/EMA8GA1UdEwEB/wQFMAMBAf8wCgYIKoZIzj0EAwID
SQAwRgIhAPBoMho7U+5w24O+/4ND6XglhL3EDiJv6yQ3SqCcR2YwAiEA3TltjePa
uhS6nRHRskUkPN8NEbEBBV/YBH8FYjAPeO0=
-----END CERTIFICATE-----
`;

/** A small RSA key keeps the tests fast; a real gateway key is RSA-4096. */
export function createTestKey(): { privateKey: string; publicKeyDer: Buffer } {
  const pair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    // The single-line form the config node stores.
    privateKey: pair.privateKey
      .export({ type: "pkcs1", format: "der" })
      .toString("base64"),
    publicKeyDer: pair.publicKey.export({ type: "pkcs1", format: "der" }),
  };
}

export class FakeGateway {
  /** The key the gateway has approved, PKCS#1 DER. Omit to accept any key. */
  registeredKey?: Buffer;
  /** Every login body and every decoded signed request, in order. */
  readonly logins: Json[] = [];
  readonly requests: MessageEnvelope[] = [];
  /** Answer a signed request by its content, instead of acknowledging it. */
  respond?: (envelope: MessageEnvelope) => Json | undefined;
  config = Buffer.from(
    '{"default_real_mode":"self_consumption","site_info":{"backup_reserve_percent":24}}',
  );

  #server: https.Server;
  #tokens = new Set<string>();

  private constructor(registeredKey?: Buffer) {
    this.registeredKey = registeredKey;
    this.#server = https.createServer(
      { key: TLS_KEY, cert: TLS_CERT, ALPNProtocols: ["http/1.1"] },
      (request, response) => {
        this.#handle(request, response).catch((error: unknown) => {
          response.destroy(error as Error);
        });
      },
    );
  }

  static async start(registeredKey?: Buffer): Promise<FakeGateway> {
    const gateway = new FakeGateway(registeredKey);
    await new Promise<void>((resolve) =>
      gateway.#server.listen(0, "127.0.0.1", resolve),
    );
    return gateway;
  }

  get host(): string {
    return `127.0.0.1:${(this.#server.address() as AddressInfo).port}`;
  }

  get configJson(): Json {
    return JSON.parse(this.config.toString("utf8"));
  }

  async stop(): Promise<void> {
    this.#server.closeAllConnections();
    await new Promise((resolve) => this.#server.close(resolve));
  }

  async #handle(request: IncomingMessage, response: ServerResponse) {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks);

    if (request.method === "POST" && request.url === "/api/login/Basic") {
      const login = JSON.parse(body.toString("utf8"));
      this.logins.push(login);
      if (login.password !== GATEWAY_PASSWORD.slice(-5)) {
        this.#send(response, 401, Buffer.from('{"error":"bad credentials"}'));
        return;
      }
      const token = crypto.randomBytes(16).toString("hex");
      this.#tokens.add(token);
      this.#send(response, 200, Buffer.from(JSON.stringify({ token })));
    } else if (request.method === "POST" && request.url === "/tedapi/v1r") {
      this.#signed(body, response);
    } else if (request.method === "GET" && request.url === "/tedapi/din") {
      const token = request.headers.authorization?.replace(/^Bearer /, "");
      if (this.#tokens.has(token ?? "")) {
        this.#send(response, 200, Buffer.from(`${GATEWAY_DIN}\n`));
      } else {
        this.#send(response, 401, Buffer.alloc(0));
      }
    } else {
      this.#send(response, 404, Buffer.alloc(0));
    }
  }

  #send(response: ServerResponse, status: number, body: Buffer) {
    response.writeHead(status, { "Content-Length": body.length });
    response.end(body);
  }

  #hash(): Buffer {
    return crypto.createHash("sha256").update(this.config).digest();
  }

  /** The fault for a request this gateway would not act on, by the protocol's TLV rules. */
  #checkSignature(message: RoutableMessage, envelope: Buffer): MessageFaultE {
    const publicKeyDer = Buffer.from(
      message.signatureData?.signerIdentity?.publicKey ?? [],
    );
    const rsa = message.signatureData?.rsaData;
    if (this.registeredKey && !publicKeyDer.equals(this.registeredKey)) {
      return MessageFaultE.MESSAGEFAULT_ERROR_UNKNOWN_KEY_ID;
    }
    if (!rsa || publicKeyDer.length === 0) {
      return MessageFaultE.MESSAGEFAULT_ERROR_INVALID_SIGNATURE;
    }
    const din = Buffer.from(GATEWAY_DIN, "ascii");
    const expiry = Buffer.alloc(4);
    expiry.writeUInt32BE(rsa.expiresAt);
    const signed = Buffer.concat([
      Buffer.from([0x00, 0x01, 0x07, 0x01, 0x01, 0x07, 0x02, din.length]),
      din,
      Buffer.from([0x04, 0x04]),
      expiry,
      Buffer.from([0xff]),
      envelope,
    ]);
    const key = crypto.createPublicKey({
      key: publicKeyDer,
      format: "der",
      type: "pkcs1",
    });
    const valid = crypto.verify(
      "sha512",
      signed,
      { key, padding: crypto.constants.RSA_PKCS1_PADDING },
      rsa.signature,
    );
    if (!valid) return MessageFaultE.MESSAGEFAULT_ERROR_INVALID_SIGNATURE;
    return rsa.expiresAt <= Date.now() / 1000
      ? MessageFaultE.MESSAGEFAULT_ERROR_TIME_EXPIRED
      : MessageFaultE.MESSAGEFAULT_ERROR_NONE;
  }

  #signed(body: Buffer, response: ServerResponse) {
    const message = RoutableMessage.decode(body);
    const envelopeBytes = Buffer.from(message.protobufMessageAsBytes ?? []);
    const fault = this.#checkSignature(message, envelopeBytes);
    let reply: RoutableMessage;
    if (fault !== MessageFaultE.MESSAGEFAULT_ERROR_NONE) {
      reply = RoutableMessage.create({
        signedMessageStatus: { messageFault: fault },
      });
    } else {
      const envelope = MessageEnvelope.decode(envelopeBytes);
      this.requests.push(envelope);
      const answer = this.respond?.(envelope) ?? this.#act(envelope);
      reply = RoutableMessage.create({
        protobufMessageAsBytes: MessageEnvelope.encode(
          MessageEnvelope.create(answer as Partial<MessageEnvelope>),
        ).finish(),
      });
    }
    this.#send(response, 200, Buffer.from(RoutableMessage.encode(reply).finish()));
  }

  /** Do what the request asks, as far as a test needs: an empty acknowledgement by default. */
  #act(envelope: MessageEnvelope): Json {
    const header = {
      recipient: { authorizedClient: 1 },
      sender: { din: GATEWAY_DIN },
    };
    const read = envelope.filestore?.readFileRequest;
    if (read) {
      const file = { name: read.name, blob: this.config };
      return {
        ...header,
        filestore: { readFileResponse: { file, hash: this.#hash() } },
      };
    }
    const update = envelope.filestore?.updateFileRequest;
    if (update) {
      this.config = Buffer.from(update.file?.blob ?? []);
      return {
        ...header,
        filestore: { updateFileResponse: { hash: this.#hash() } },
      };
    }
    if (envelope.graphql?.queryRequest) {
      return {
        ...header,
        graphql: { queryResponse: { data: '{"control":{}}' } },
      };
    }
    for (const category of ["teg", "authorization"] as const) {
      const request = Object.entries(envelope[category] ?? {}).find(
        ([, value]) => value !== undefined,
      )?.[0];
      if (request) {
        return {
          ...header,
          [category]: { [request.replace(/Request$/, "Response")]: {} },
        };
      }
    }
    return header;
  }
}
