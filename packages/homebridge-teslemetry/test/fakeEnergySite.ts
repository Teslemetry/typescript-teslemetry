// Test-only stand-in for @teslemetry/api's EnergyDetails. Implements only the
// subset of TeslemetryEnergyApi surface that the homebridge services actually
// call, so tests never touch real network I/O.
import { EventEmitter } from "node:events";
import type { EnergyDetails } from "@teslemetry/api";

const NOOP_COMMANDS = [
	"setBackupReserve",
	"setOperationMode",
	"setStormMode",
	"gridImportExport",
] as const;

export interface FakeEnergyApiCall {
	method: string;
	args: unknown[];
}

export interface FakeEnergyApi extends EventEmitter {
	requestPolling(endpoint: "siteInfo" | "liveStatus"): () => void;
	requestedPolling: Array<"siteInfo" | "liveStatus">;
	stoppedPolling: Array<"siteInfo" | "liveStatus">;
	calls: FakeEnergyApiCall[];
}

export interface FakeEnergySite {
	site: EnergyDetails;
	api: FakeEnergyApi;
}

export function createFakeEnergySite(overrides: Partial<EnergyDetails> = {}): FakeEnergySite {
	const emitter = new EventEmitter();
	const requestedPolling: Array<"siteInfo" | "liveStatus"> = [];
	const stoppedPolling: Array<"siteInfo" | "liveStatus"> = [];
	const calls: FakeEnergyApiCall[] = [];

	const api = Object.assign(emitter, {
		requestedPolling,
		stoppedPolling,
		calls,
		requestPolling(endpoint: "siteInfo" | "liveStatus") {
			requestedPolling.push(endpoint);
			return () => stoppedPolling.push(endpoint);
		},
	}) as FakeEnergyApi;

	for (const method of NOOP_COMMANDS) {
		(api as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>)[method] = (
			...args: unknown[]
		) => {
			calls.push({ method, args });
			return Promise.resolve({});
		};
	}

	const site = {
		id: 12345,
		name: "Test Site",
		api,
		metadata: {},
		...overrides,
	} as unknown as EnergyDetails;

	return { site, api };
}
