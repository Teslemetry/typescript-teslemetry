/**
 * Schedules a function to run at aligned clock intervals with an optional offset.
 *
 * @param callback - The function to execute at each interval
 * @param intervalMs - The interval in milliseconds (e.g., 300_000 for 5 minutes)
 * @param offsetMs - Optional offset in milliseconds after each interval boundary (e.g., 30_000 for 30 seconds)
 * @returns A function to cancel the scheduled execution
 *
 * @example
 * // Execute at 12:00:30, 12:05:30, 12:10:30, etc.
 * const cancel = scheduler(() => console.log('Running'), 300_000, 30_000);
 * // Later, to cancel:
 * cancel();
 */
export const scheduler = (
  callback: () => void,
  intervalMs: number,
  offsetMs: number = 0,
): (() => void) => {
  let timeoutHandle: NodeJS.Timeout | null = null;
  let intervalHandle: NodeJS.Timeout | null = null;

  const now = Date.now();
  const msIntoCurrentInterval = now % intervalMs;
  const msUntilNextInterval = intervalMs - msIntoCurrentInterval;
  const initialDelay = msUntilNextInterval + offsetMs;

  timeoutHandle = setTimeout(() => {
    callback();
    intervalHandle = setInterval(callback, intervalMs);
  }, initialDelay);

  return () => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }
  };
};
