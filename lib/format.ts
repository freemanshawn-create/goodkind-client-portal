import { format, formatDistanceToNow, isValid } from "date-fns";

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "—";
  return format(d, "MMM d, yyyy");
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "—";
  return format(d, "MMM d, yyyy 'at' h:mm a");
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Rebase a UTC-midnight instant onto local midnight of the SAME calendar day.
 *
 * SAP "scheduled date" values are calendar dates with no real time-of-day.
 * The mssql driver hands them back as UTC midnight (e.g. 2026-09-03T00:00:00Z),
 * so formatting in a behind-UTC timezone (Central) rolls them back a day.
 * Pulling the UTC Y/M/D and rebuilding a local Date keeps the intended day
 * regardless of the viewer's timezone.
 */
export function toCalendarDay(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Format a calendar date (stored as UTC midnight) without timezone shift.
 * Use this for SAP scheduled/expected dates instead of formatDate, which
 * renders in the viewer's local timezone and can land a day early.
 */
export function formatCalendarDate(
  date: Date | string,
  pattern = "MMM d, yyyy"
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "—";
  return format(toCalendarDay(d), pattern);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}
