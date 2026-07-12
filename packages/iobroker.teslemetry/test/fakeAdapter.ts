// Minimal ioBroker.Adapter stand-in for tests: an in-memory state store plus
// no-op logging, enough to exercise handler/state-manager logic without a
// real js-controller.
export function createFakeAdapter(namespace = 'teslemetry.0') {
	const states = new Map<string, any>();
	const objects = new Set<string>();
	const logs: Array<{ level: 'info' | 'warn' | 'error' | 'debug'; message: string }> = [];

	const adapter = {
		namespace,
		log: {
			info: (message: string) => logs.push({ level: 'info', message }),
			warn: (message: string) => logs.push({ level: 'warn', message }),
			error: (message: string) => logs.push({ level: 'error', message }),
			debug: (message: string) => logs.push({ level: 'debug', message }),
		},
		async setStateAsync(id: string, val: any) {
			states.set(id, val);
		},
		async getStateAsync(id: string) {
			return states.has(id) ? { val: states.get(id) } : null;
		},
		async setObjectNotExistsAsync(id: string) {
			objects.add(id);
		},
	};

	return { adapter: adapter as never as ioBroker.Adapter, states, objects, logs };
}
