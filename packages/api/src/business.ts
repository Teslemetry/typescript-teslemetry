import type { Teslemetry } from "./Teslemetry.js";
import { useTeslaModel } from "./Teslemetry.js";
import type { TeslemetryVehicleApi } from "./TeslemetryVehicleApi.js";
import type { TeslemetryEnergyApi } from "./TeslemetryEnergyApi.js";
import type { TeslemetryVehicleStream } from "./TeslemetryVehicleStream.js";
import type { TeslemetryEnergySiteStream } from "./TeslemetryEnergySiteStream.js";

/**
 * True for a Teslemetry for Business API key (a WorkOS organization API key).
 * Mirrors the api's own check: `sk_` with no `.`, so a consumer token never
 * matches.
 */
export function isBusinessKey(token: string): boolean {
  return token.startsWith("sk_") && !token.includes(".");
}

// Hand-written: GET /api/business/products is hidden from the public OpenAPI
// spec, so the generated client has no function or types for it.

/** One product a customer has shared with the business. */
export interface BusinessProduct {
  product_type: "vehicle" | "energy";
  /** The VIN, or the energy site id as a digit string. */
  product_id: string;
  /** The region holding the customer's data. */
  region: "NA" | "EU";
  customer: {
    /** A pseudonym for the customer, stable for this business only. */
    id: string;
    /** The business's own customer reference, as supplied at enrolment. */
    ref: string | null;
  };
  /** ISO 8601 date-time. */
  granted_at: string;
}

export interface BusinessProductsResponse {
  response: BusinessProduct[];
}

export interface BusinessVehicleDetails {
  name: string;
  vin: string;
  api: TeslemetryVehicleApi;
  sse: TeslemetryVehicleStream;
  product: BusinessProduct;
}

export interface BusinessEnergyDetails {
  id: number;
  api: TeslemetryEnergyApi;
  sse: TeslemetryEnergySiteStream;
  product: BusinessProduct;
}

export interface BusinessProducts {
  vehicles: Record<string, BusinessVehicleDetails>;
  energySites: Record<string, BusinessEnergyDetails>;
}

const API_HOSTS = new Set([
  "api.teslemetry.com",
  "na.teslemetry.com",
  "eu.teslemetry.com",
]);

export class TeslemetryBusinessApi {
  private root: Teslemetry;
  /** Product id (VIN or energy site id) to the region host serving it,
   *  learned from `products()`. */
  public regions: Map<string, "na" | "eu"> = new Map();

  constructor(root: Teslemetry) {
    this.root = root;
  }

  /**
   * Every vehicle and energy site your customers have shared with your
   * business. Also records each product's region, so later requests and
   * streams for that product go straight to its region host.
   */
  public async products(): Promise<BusinessProductsResponse> {
    const { data } = await this.root.client.get<
      { 200: BusinessProductsResponse },
      unknown,
      true
    >({
      security: [{ scheme: "bearer", type: "http" }],
      url: "/api/business/products",
      throwOnError: true,
    });
    for (const product of data.response) {
      this.regions.set(
        product.product_id,
        product.region.toLowerCase() as "na" | "eu",
      );
    }
    return data;
  }

  /**
   * Creates API and stream instances for every consented product. The
   * business replacement for `Teslemetry.createProducts()`, which reads
   * `/api/metadata` and so is refused for a business key.
   */
  public async createProducts(): Promise<BusinessProducts> {
    const { response } = await this.products();
    const vehicles: BusinessProducts["vehicles"] = {};
    const energySites: BusinessProducts["energySites"] = {};
    for (const product of response) {
      if (product.product_type === "vehicle") {
        const vin = product.product_id;
        vehicles[vin] = {
          name: useTeslaModel(vin),
          vin,
          api: this.root.api.getVehicle(vin),
          sse: this.root.sse.getVehicle(vin),
          product,
        };
      } else {
        const id = Number(product.product_id);
        energySites[product.product_id] = {
          id,
          api: this.root.api.getEnergySite(id),
          sse: this.root.sse.getEnergySite(product.product_id),
          product,
        };
      }
    }
    return { vehicles, energySites };
  }

  /**
   * Request interceptor for business keys: sends a product's request to its
   * region host (when `products()` has learned it) instead of letting the
   * api proxy it, and drops the `token` query parameter, since the api
   * refuses a business key anywhere but the Authorization header and the
   * URL must never carry it.
   */
  public routeRequest(request: Request): Request {
    const url = new URL(request.url);
    if (!API_HOSTS.has(url.hostname)) return request;
    const hadToken = url.searchParams.has("token");
    url.searchParams.delete("token");
    let region: "na" | "eu" | undefined;
    for (const segment of url.pathname.split("/")) {
      region = segment ? this.regions.get(decodeURIComponent(segment)) : undefined;
      if (region) break;
    }
    const host = region ? `${region}.teslemetry.com` : url.hostname;
    if (!hadToken && host === url.hostname) return request;
    url.hostname = host;
    return new Request(url, request);
  }
}
