// Date helpers — backend datetimes from the DB are often naive UTC (no offset),
// which the browser would otherwise misread as local time. We treat strings
// without a timezone marker as UTC, then render in the viewer's local zone.

function parse(value?: string | null): Date | null {
  if (!value) return null;
  const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value.trim());
  const d = new Date(hasTz ? value : `${value}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toLocalDateTime(value?: string | null): string {
  const d = parse(value);
  return d ? d.toLocaleString() : "";
}

export function toLocalDate(value?: string | null): string {
  const d = parse(value);
  return d ? d.toLocaleDateString() : "";
}
