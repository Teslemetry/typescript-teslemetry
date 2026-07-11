import { Service, Characteristic, HapStatusError, HAPStatus, uuid } from "hap-nodejs";

const silentLog = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  log: () => {},
  success: () => {},
  prefix: "test",
};

/** Minimal stand-in for TeslemetryPlatform: only what the *-services classes read. */
export function makeFakePlatform(config: Record<string, unknown> = {}) {
  return {
    Service,
    Characteristic,
    log: silentLog,
    config,
    api: {
      hap: { HapStatusError, HAPStatus },
    },
  } as never;
}

/**
 * The `homebridge` package only exports PlatformAccessory as a type - the real
 * class is constructed internally by homebridge core and handed to plugins.
 * This mirrors the getService/addService/context surface our services use,
 * backed by real hap-nodejs Service instances.
 */
class FakeAccessory {
  readonly UUID: string;
  readonly context: Record<string, unknown> = {};
  private readonly services: InstanceType<typeof Service>[] = [];

  constructor(
    public displayName: string,
    seed: string,
  ) {
    this.UUID = uuid.generate(seed);
  }

  getService<T extends InstanceType<typeof Service>>(
    identifier: string | (new (...args: never[]) => T),
  ): T | undefined {
    return this.services.find((s) =>
      typeof identifier === "string"
        ? s.displayName === identifier || s.UUID === identifier
        : s instanceof identifier,
    ) as T | undefined;
  }

  addService(service: InstanceType<typeof Service>) {
    this.services.push(service);
    return service;
  }
}

export function makeFakeAccessory(seed: string) {
  return new FakeAccessory(seed, seed) as unknown as import("homebridge").PlatformAccessory;
}

/** Captures onSignal subscriptions so a test can fire a signal value manually. */
export function makeFakeVehicleSse() {
  const listeners = new Map<string, (value: unknown) => void>();
  return {
    onSignal(signal: string, callback: (value: unknown) => void) {
      listeners.set(signal, callback);
      return () => listeners.delete(signal);
    },
    emit(signal: string, value: unknown) {
      listeners.get(signal)?.(value);
    },
  };
}

export function makeFakeSiteApi() {
  const calls: { method: string; args: unknown[] }[] = [];
  const listeners = new Map<string, (data: unknown) => void>();
  return {
    calls,
    on(event: string, listener: (data: unknown) => void) {
      listeners.set(event, listener);
    },
    off(event: string) {
      listeners.delete(event);
    },
    emit(event: string, data: unknown) {
      listeners.get(event)?.(data);
    },
    setBackupReserve: (...args: unknown[]) => {
      calls.push({ method: "setBackupReserve", args });
      return Promise.resolve();
    },
    setOperationMode: (...args: unknown[]) => {
      calls.push({ method: "setOperationMode", args });
      return Promise.resolve();
    },
    gridImportExport: (...args: unknown[]) => {
      calls.push({ method: "gridImportExport", args });
      return Promise.resolve();
    },
  };
}

export function makeFakeVehicleApi() {
  const calls: { method: string; args: unknown[] }[] = [];
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args });
      return Promise.resolve();
    };
  return {
    calls,
    setChargeLimit: record("setChargeLimit"),
    setSentryMode: record("setSentryMode"),
    setTemps: record("setTemps"),
    setPreconditioningMax: record("setPreconditioningMax"),
    startAutoConditioning: record("startAutoConditioning"),
    stopAutoConditioning: record("stopAutoConditioning"),
    startCharging: record("startCharging"),
    stopCharging: record("stopCharging"),
  };
}
