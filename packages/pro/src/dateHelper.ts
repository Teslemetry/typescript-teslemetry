/**
 * Input type for date parameters - can be a string (used as-is), Date object, or undefined
 */
export type DateInput = string | Date;

/**
 * Converts a Date object to RFC3339 format with local timezone offset
 * @param date The Date object to convert
 * @returns RFC3339 string with timezone offset (e.g., "2024-01-15T00:00:00+11:00")
 */
function formatDate(date: Date): string {
  const pad = (n: number, digits = 2) => String(n).padStart(digits, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  // Get timezone offset in minutes and convert to ±HH:MM format
  const tzOffset = -date.getTimezoneOffset();
  const tzSign = tzOffset >= 0 ? "+" : "-";
  const tzHours = pad(Math.floor(Math.abs(tzOffset) / 60));
  const tzMinutes = pad(Math.abs(tzOffset) % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${tzSign}${tzHours}:${tzMinutes}`;
}

/**
 * Gets the start of today (midnight) in local timezone
 * @returns Date object set to today at 00:00:00.000
 */
export function getStartOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

/**
 * Gets the end of today (23:59:59.999) in local timezone
 * @returns Date object set to today at 23:59:59.999
 */
export function getEndOfToday(): Date {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
    0,
  );
}

/**
 * Processes start_date and end_date inputs for API calls.
 * Handles string (taken as-is), Date (formatted), or undefined (defaults to today).
 *
 * @param start_date The start date input
 * @param end_date The end date input
 * @returns Object with formatted start_date and end_date strings
 */
export function processDateRange<
  S extends DateInput | undefined,
  E extends DateInput | undefined,
>(
  start_date?: S,
  end_date?: E,
): {
  start_date: S extends DateInput ? string : undefined;
  end_date: E extends DateInput ? string : undefined;
} {
  const output: { start_date?: string; end_date?: string } = {};
  if (start_date) {
    output.start_date =
      start_date instanceof Date ? formatDate(start_date) : start_date;
  }
  if (end_date) {
    output.end_date =
      end_date instanceof Date ? formatDate(end_date) : end_date;
  }
  return output as {
    start_date: S extends DateInput ? string : undefined;
    end_date: E extends DateInput ? string : undefined;
  };
}
