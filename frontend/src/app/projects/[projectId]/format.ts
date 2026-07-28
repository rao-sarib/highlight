/** Formatting helpers for the GA4 analytics widgets. */

export function formatGa4Date(value: string): string {
  if (/^\d{8}$/.test(value)) {
    const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return value;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}
