import { Node } from "node-red";
import { Products, Teslemetry } from "@teslemetry/api";

export type Instance = {
  teslemetry: Teslemetry;
  products: Promise<Products>;
  error?: string; // Set when initial auth/products fetch fails
};

export const instances = new Map<string, Instance>();

/**
 * Extract a useful error message from any error type.
 * Handles Error objects, hey-api response objects, and plain objects.
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return "Unknown error";

  // Standard Error object
  if (error instanceof Error) {
    return error.message;
  }

  // hey-api throws response objects with this shape
  if (typeof error === "object") {
    const obj = error as Record<string, unknown>;

    if (typeof obj.error_description === "string") return obj.error_description;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.message === "string") return obj.message;

    // Check for response status
    if (obj.response && typeof obj.response === "object") {
      const resp = obj.response as Record<string, unknown>;
      if (typeof obj.error_description === "string")
        return obj.error_description;
      if (typeof obj.error === "string") return obj.error;
      if (resp.status)
        return `HTTP ${resp.status}: ${resp.statusText || "Error"}`;
    }

    // Last resort: try to stringify
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

/**
 * Get instance and validate it exists. Sets error status on node if not found.
 * @returns Instance or null if missing
 */
export function getInstance(configId: string, node: Node): Instance | null {
  const instance = instances.get(configId);
  if (!instance) {
    node.status({ fill: "red", shape: "ring", text: "Config missing" });
    node.error("No Teslemetry instance found");
    return null;
  }
  // If products fails, update the status
  instance.products.finally(() => {
    hasInstanceError(instance, node);
  });
  return instance;
}

/**
 * Check if instance has an error. Sets error status on node if so.
 * @returns true if there's an error (caller should return early)
 */
export function hasInstanceError(instance: Instance, node: Node): boolean {
  if (instance.error) {
    node.status({ fill: "red", shape: "ring", text: "Error" });
    node.error(`Teslemetry error: ${instance.error}`);
    return true;
  }
  return false;
}
