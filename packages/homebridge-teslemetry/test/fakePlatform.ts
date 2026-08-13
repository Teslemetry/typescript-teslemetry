// Test-only stand-ins for the Homebridge/HAP objects services depend on.
// Real hap-nodejs Service/Characteristic classes are used (not mocks) so
// characteristic get/set wiring behaves exactly as it does at runtime.
import { Accessory, Characteristic, HAPStatus, HapStatusError, Service, uuid } from "hap-nodejs";
import type { PlatformAccessory } from "homebridge";
import type { TeslemetryPlatform } from "../src/platform.js";

export type LogLevel = "info" | "warn" | "error" | "debug";
export interface LogEntry {
	level: LogLevel;
	args: unknown[];
}

/** A hap-nodejs Accessory has the same addService/getService surface as Homebridge's PlatformAccessory. */
export function createFakeAccessory(displayName = "Test Vehicle"): PlatformAccessory {
	const accessory = new Accessory(displayName, uuid.generate(displayName));
	(accessory as unknown as { context: Record<string, unknown> }).context = {};
	return accessory as unknown as PlatformAccessory;
}

export function createFakePlatform(
	config: Record<string, unknown> = {},
	options: { streamFault?: boolean } = {},
): {
	platform: TeslemetryPlatform;
	logs: LogEntry[];
} {
	const logs: LogEntry[] = [];
	const log = (level: LogLevel) => (...args: unknown[]) => {
		logs.push({ level, args });
	};

	const platform = {
		Service,
		Characteristic,
		config,
		streamFault: options.streamFault ?? false,
		log: {
			info: log("info"),
			warn: log("warn"),
			error: log("error"),
			debug: log("debug"),
		},
		api: {
			// HAPStatus is a const enum: only property access (not a whole-object
			// reference) survives isolatedModules, so only the member the base
			// service classes actually read is forwarded here.
			hap: { HapStatusError, HAPStatus: { SERVICE_COMMUNICATION_FAILURE: HAPStatus.SERVICE_COMMUNICATION_FAILURE } },
		},
	};

	return { platform: platform as unknown as TeslemetryPlatform, logs };
}
