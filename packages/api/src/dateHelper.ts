/**
 * Input type for date parameters - can be a string (used as-is), Date object, or undefined
 */
export type DateInput = string | Date;

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
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
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
 * Processes start_date and end_date inputs for API calls.
 * Handles string (taken as-is), Date (formatted), or undefined (defaults to today).
 *
 * @param start_date The start date input
 * @param end_date The end date input
 * @returns Object with formatted start_date and end_date strings
 */
export function processDateRange(start_date?: DateInput, end_date?: DateInput) {
  const output: { start_date?: string; end_date?: string } = {};
  if (start_date) {
    output.start_date =
      start_date instanceof Date ? formatDate(start_date) : start_date;
  }
  if (end_date) {
    output.end_date =
      end_date instanceof Date ? formatDate(end_date) : end_date;
  }
  return output;
}
