import { test } from "node:test";
import assert from "node:assert/strict";
import type { Logging } from "homebridge";
import { createSdkLogger, describeError } from "../src/log.js";

function createLog() {
	const lines: Array<{ level: string; line: string }> = [];
	const at = (level: string) => (line: string) => lines.push({ level, line });
	const log = { debug: at("debug"), info: at("info"), warn: at("warn"), error: at("error") };
	return { log: log as unknown as Logging, lines };
}

test("an SDK error argument is logged as one line without its stack", () => {
	const { log, lines } = createLog();
	const error = new TypeError("terminated", { cause: { message: "other side closed", code: "UND_ERR_SOCKET" } });

	createSdkLogger(log).warn("Lost:", error);

	assert.deepEqual(lines, [{ level: "warn", line: "Lost: terminated: other side closed" }]);
});

test("SDK stream lines the platform reports itself go to debug", () => {
	const { log, lines } = createLog();
	const logger = createSdkLogger(log);

	logger.error("SSE error:", new Error("SSE failed: 402 Payment Required"));
	logger.info("Connected to stream");
	logger.error("Stream authentication failed twice in a row; stopping.");
	logger.info("Reconnecting in 2 seconds...");

	assert.deepEqual(lines, [
		{ level: "debug", line: "SSE error: SSE failed: 402 Payment Required" },
		{ level: "debug", line: "Connected to stream" },
		{ level: "debug", line: "Stream authentication failed twice in a row; stopping." },
		{ level: "info", line: "Reconnecting in 2 seconds..." },
	]);
});

test("a URL's query string and any token never reach the log", () => {
	const { log, lines } = createLog();

	createSdkLogger(log).error("Failed", new Error("GET https://api.teslemetry.com/sse/?cache=true&token=SECRET failed"));

	assert.equal(lines[0].line, "Failed GET https://api.teslemetry.com/sse/ failed");
	assert.equal(describeError("token=SECRET"), "token=[redacted]");
});

test("a plain error object from the client is described, not [object Object]", () => {
	assert.equal(describeError({ response: null, error: "invalid_token", error_description: "" }), "invalid_token");
});
