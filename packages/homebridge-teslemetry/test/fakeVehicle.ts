// Test-only stand-in for @teslemetry/api's VehicleDetails. Implements only the
// subset of TeslemetryVehicleStream/TeslemetryVehicleApi surface that the
// homebridge services actually call, so tests never touch real network I/O.
import { EventEmitter } from "node:events";
import type { VehicleDetails } from "@teslemetry/api";

class FakeVehicleStream extends EventEmitter {
	private readonly signalListeners = new Map<string, Set<(value: unknown) => void>>();

	onSignal(field: string, callback: (value: unknown) => void): () => void {
		let listeners = this.signalListeners.get(field);
		if (!listeners) {
			listeners = new Set();
			this.signalListeners.set(field, listeners);
		}
		listeners.add(callback);
		return () => listeners!.delete(callback);
	}

	emitSignal(field: string, value: unknown): void {
		for (const callback of this.signalListeners.get(field) ?? []) {
			callback(value);
		}
	}
}

const NOOP_COMMANDS = [
	"wakeUp",
	"lockDoors",
	"unlockDoors",
	"startAutoConditioning",
	"stopAutoConditioning",
	"startCharging",
	"stopCharging",
	"flashLights",
	"honkHorn",
	"actuateTrunk",
	"setChargeLimit",
	"setSentryMode",
	"setTemps",
	"openChargePort",
	"closeChargePort",
	"setPreconditioningMax",
	"closure",
] as const;

export interface FakeVehicleApiCall {
	method: string;
	args: unknown[];
}

export interface FakeVehicle {
	vehicle: VehicleDetails;
	sse: FakeVehicleStream;
	calls: FakeVehicleApiCall[];
}

export function createFakeVehicle(overrides: Partial<VehicleDetails> = {}): FakeVehicle {
	const sse = new FakeVehicleStream();
	const calls: FakeVehicleApiCall[] = [];
	const api: Record<string, (...args: unknown[]) => Promise<unknown>> = {};
	for (const method of NOOP_COMMANDS) {
		api[method] = (...args: unknown[]) => {
			calls.push({ method, args });
			return Promise.resolve({});
		};
	}

	const vehicle = {
		vin: "5YJSA1E14FF000000",
		name: "Test Model 3",
		api,
		sse,
		metadata: {},
		...overrides,
	} as unknown as VehicleDetails;

	return { vehicle, sse, calls };
}
