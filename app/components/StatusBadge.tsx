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
  const color =
    s === "verified"
      ? "border-green bg-bg-green text-foreground"
      : s === "rejected"
        ? "border-red bg-bg-red text-foreground"
        : "border-yellow bg-bg-yellow text-foreground";

  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {s}
    </span>
  );
}
