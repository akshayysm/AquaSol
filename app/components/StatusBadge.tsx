"use client";

// Anchor decodes enums as { pending: {} } | { verified: {} } | { rejected: {} }
// and sometimes as plain strings. Normalize both shapes.
export function normalizeStatus(status: unknown): string {
  if (!status) return "unknown";
  if (typeof status === "string") return status.toLowerCase();
  if (typeof status === "object") {
    const key = Object.keys(status as Record<string, unknown>)[0];
    return (key ?? "unknown").toLowerCase();
  }
  return "unknown";
}

export default function StatusBadge({ status }: { status: unknown }) {
  const s = normalizeStatus(status);
  const dotColor =
    s === "verified"
      ? "bg-green"
      : s === "rejected"
        ? "bg-red"
        : "bg-yellow";

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-bg-4 bg-bg-2 px-2.5 py-1 text-xs font-medium text-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} aria-hidden />
      {s}
    </span>
  );
}
