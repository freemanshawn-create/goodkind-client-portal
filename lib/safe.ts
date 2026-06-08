/**
 * Run a data fetch with a soft fallback — if it throws (Azure SQL down,
 * Drive API rate-limited, cold-start timeout, etc.) we log the error and
 * return the fallback value so a single bad source renders an empty state
 * instead of crashing the page.
 */
export async function safe<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`${label} failed:`, err);
    return fallback;
  }
}
