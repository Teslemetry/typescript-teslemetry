// src/exceptions.ts

export class TeslemetryStreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeslemetryStreamError";
  }
}

export class TeslemetryStreamConnectionError extends TeslemetryStreamError {
  constructor(message: string) {
    super(message);
    this.name = "TeslemetryStreamConnectionError";
  }
}

export class TeslemetryStreamAuthError extends TeslemetryStreamConnectionError {
  public status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "TeslemetryStreamAuthError";
    this.status = status;
  }
}

export class TeslemetryVehicleStreamNotConfigured extends TeslemetryStreamError {
  constructor(message: string) {
    super(message);
    this.name = "TeslemetryVehicleStreamNotConfigured";
  }
}

export class TeslemetryStreamEnded extends TeslemetryStreamError {
  constructor(message: string) {
    super(message);
    this.name = "TeslemetryStreamEnded";
  }
}

export class ValueError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ValueError";
    }
  }

/**
 * An error the api returns only to a Teslemetry for Business API key.
 * `code` is the api's `error` field; `status` its HTTP status.
 */
export class TeslemetryBusinessError extends Error {
  public code: string;
  public status: number | undefined;
  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = "TeslemetryBusinessError";
    this.code = code;
    this.status = status;
  }
}

/** 403: the business is suspended or removed. */
export class BusinessNotActiveError extends TeslemetryBusinessError {
  constructor(message: string, status?: number) {
    super("business_not_active", message, status);
    this.name = "BusinessNotActiveError";
  }
}

/** 403: business keys may not call this endpoint (for example
 *  `/api/metadata`, `/api/1/products`, commands, or the account-wide `/sse`). */
export class BusinessRouteNotAllowedError extends TeslemetryBusinessError {
  constructor(message: string, status?: number) {
    super("business_route_not_allowed", message, status);
    this.name = "BusinessRouteNotAllowedError";
  }
}

/** 403: the key lacks the permission (`data:read` or `streaming:write`) the
 *  endpoint needs. */
export class BusinessPermissionMissingError extends TeslemetryBusinessError {
  constructor(message: string, status?: number) {
    super("business_permission_missing", message, status);
    this.name = "BusinessPermissionMissingError";
  }
}

/** 403: no customer has shared this product with the business. An unknown
 *  product answers the same way. */
export class BusinessProductNotConsentedError extends TeslemetryBusinessError {
  constructor(message: string, status?: number) {
    super("business_product_not_consented", message, status);
    this.name = "BusinessProductNotConsentedError";
  }
}

/** 403: the customer's Tesla connection is missing; they must sign in again. */
export class CustomerReconnectRequiredError extends TeslemetryBusinessError {
  constructor(message: string, status?: number) {
    super("customer_reconnect_required", message, status);
    this.name = "CustomerReconnectRequiredError";
  }
}

/** 403: the customer's Tesla grant lacks a scope the business needs; they
 *  must sign in again. */
export class CustomerScopeMissingError extends TeslemetryBusinessError {
  constructor(message: string, status?: number) {
    super("customer_scope_missing", message, status);
    this.name = "CustomerScopeMissingError";
  }
}

/** 503: the api cannot validate business keys right now. Retry after
 *  `retryAfter` seconds. */
export class BusinessAuthUnavailableError extends TeslemetryBusinessError {
  public retryAfter: number | undefined;
  constructor(message: string, status?: number, retryAfter?: number) {
    super("business_auth_unavailable", message, status);
    this.name = "BusinessAuthUnavailableError";
    this.retryAfter = retryAfter;
  }
}

const BUSINESS_ERRORS: Record<
  string,
  new (message: string, status?: number) => TeslemetryBusinessError
> = {
  business_not_active: BusinessNotActiveError,
  business_route_not_allowed: BusinessRouteNotAllowedError,
  business_permission_missing: BusinessPermissionMissingError,
  business_product_not_consented: BusinessProductNotConsentedError,
  customer_reconnect_required: CustomerReconnectRequiredError,
  customer_scope_missing: CustomerScopeMissingError,
};

/**
 * The typed error for an api error body carrying a business error code, or
 * `undefined` for any other body. `retryAfter` is the Retry-After header in
 * seconds, used only by `business_auth_unavailable`.
 */
export function toBusinessError(
  body: unknown,
  status?: number,
  retryAfter?: number,
): TeslemetryBusinessError | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const { error, error_description } = body as {
    error?: unknown;
    error_description?: unknown;
  };
  if (typeof error !== "string") return undefined;
  const message =
    typeof error_description === "string" ? error_description : error;
  if (error === "business_auth_unavailable") {
    return new BusinessAuthUnavailableError(message, status, retryAfter);
  }
  const ErrorClass = BUSINESS_ERRORS[error];
  return ErrorClass ? new ErrorClass(message, status) : undefined;
}

/** The Retry-After header in seconds, when it is a plain number. */
export function parseRetryAfter(headers: Headers | undefined): number | undefined {
  const value = headers?.get("retry-after");
  if (!value) return undefined;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}
