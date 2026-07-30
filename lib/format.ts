export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  if (total < 60) return `${total}s`;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function formatInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function formatDecimal(n: number, places = 1): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });
}

export function formatPercent(n: number, places = 1): string {
  return `${formatDecimal(n, places)}%`;
}

export function formatSigned(n: number, places = 1): string {
  const sign = n > 0 ? "+" : n < 0 ? "" : "";
  return `${sign}${formatDecimal(n, places)}`;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return `${dateFormatter.format(d)}, ${timeFormatter.format(d)}`;
}

export function formatDay(ts: number): string {
  return dateFormatter.format(new Date(ts));
}

/** Short relative label, falling back to a date beyond a week. */
export function formatRelative(ts: number, now = Date.now()): string {
  const diff = now - ts;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "just now";
  if (diff < hour) {
    const m = Math.floor(diff / minute);
    return `${m} min ago`;
  }
  if (diff < day) {
    const h = Math.floor(diff / hour);
    return h === 1 ? "1 hour ago" : `${h} hours ago`;
  }
  if (diff < 2 * day) return "yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return formatDay(ts);
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
