/**
 * Command outcome handling shared by the vehicle and energy base services.
 */

import type { Characteristic, CharacteristicValue } from "homebridge";

/** `reason` values the API sends with `result: false` although the requested state already holds. */
const BENIGN_REASONS = new Set(["already_set", "not_charging", "requested"]);

/**
 * HAP fails a write whose handler has not answered within 9 s, which a command
 * that first has to wake the vehicle can exceed. Answer shortly before that.
 */
const SET_ANSWER_MS = 8000;

/** Number of SET writes each characteristic has received, to tell the newest apart. */
const writeCounts = new WeakMap<Characteristic, number>();

/**
 * Await a command and throw when the API refused it. A refused command is
 * answered with HTTP 200 and `{ response: { result: false, reason } }`, so it
 * never rejects on its own.
 */
export async function runCommand<T>(command: Promise<T>): Promise<T> {
  const data = await command;
  const response = (data as { response?: { result?: unknown; reason?: unknown } } | undefined)
    ?.response;
  if (response?.result === false && !BENIGN_REASONS.has(response.reason as string)) {
    throw new Error(`Command refused: ${response.reason || "no reason given"}`);
  }
  return data;
}

/**
 * Run a SET handler, answering HomeKit as a success if it is still running
 * near HAP's write limit. A failure after that point can no longer fail the
 * write, so it is handed to `onLateFailure` and the characteristic is put
 * back to the value it had before the write.
 */
export async function runSetHandler(
  characteristic: Characteristic,
  value: CharacteristicValue,
  handler: (value: CharacteristicValue) => Promise<void>,
  onLateFailure: (error: unknown) => void,
): Promise<void> {
  // HAP only stores a written value once the handler has returned.
  const previous = characteristic.value;
  const write = (writeCounts.get(characteristic) ?? 0) + 1;
  writeCounts.set(characteristic, write);
  const running = handler(value);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stillRunning = await Promise.race([
    running.then(() => false),
    new Promise<boolean>((resolve) => {
      timer = setTimeout(() => resolve(true), SET_ANSWER_MS);
    }),
  ]).finally(() => clearTimeout(timer));
  if (!stillRunning) return;

  running.catch((error) => {
    onLateFailure(error);
    // Leave a value that telemetry has since replaced, and one a newer write
    // owns: a repeat of the same value is otherwise indistinguishable.
    if (writeCounts.get(characteristic) !== write) return;
    if (characteristic.value === value) characteristic.updateValue(previous);
  });
}
