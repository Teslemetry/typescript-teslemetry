/**
 * Input type for date parameters - can be a string (used as-is), Date object, or undefined
 */
export type DateInput = string | Date | undefined;

/**
 * Converts a Date object to ISO string format without milliseconds
 * @param date The Date object to convert
 * @returns ISO string with milliseconds removed (e.g., "2024-01-15T00:00:00Z")
 */
function formatDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Gets the start of today (midnight) in local timezone
 * @returns Date object set to today at 00:00:00.000
 */
function getStartOfToday(): Date {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
}

/**
 * Gets the end of today (23:59:59.999) in local timezone
 * @returns Date object set to today at 23:59:59.999
 */
function getEndOfToday(): Date {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
}

/**
 * Normalizes a date input to an ISO string format suitable for API calls.
 * - If input is a string, it is returned as-is
 * - If input is a Date, it is converted to ISO string without milliseconds
 * - If input is undefined, the default date is used and converted
 *
 * @param input The date input (string, Date, or undefined)
 * @param defaultDate The default Date to use if input is undefined
 * @returns Formatted date string
 */
export function normalizeDateInput(input: DateInput, defaultDate: Date): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof Date) {
    return formatDate(input);
  }
  return formatDate(defaultDate);
}

/**
 * Processes start_date and end_date inputs for API calls.
 * Handles string (taken as-is), Date (formatted), or undefined (defaults to today).
 *
 * @param start_date The start date input
 * @param end_date The end date input
 * @returns Object with formatted start_date and end_date strings
 */
export function processDateRange(
  start_date: DateInput,
  end_date: DateInput,
): { start_date: string; end_date: string } {
  return {
    start_date: normalizeDateInput(start_date, getStartOfToday()),
    end_date: normalizeDateInput(end_date, getEndOfToday()),
  };
}
