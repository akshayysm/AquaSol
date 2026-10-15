"use client";

import { useState } from "react";

export default function CopyButton({
  value,
  label,
  className = "",
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied" : `Copy ${value}`}
      aria-label={copied ? "Copied" : "Copy to clipboard"}
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-sans text-xs text-gray-2 transition-colors hover:bg-bg-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40 ${className}`}
    >
      {copied ? (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-3 w-3 text-green"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.5 8.5 6.5 11.5 12.5 4.5"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="h-3 w-3"
          aria-hidden
        >
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
          <path
            strokeLinecap="round"
            d="M10.5 5.5V3.5a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2"
          />
        </svg>
      )}
      {label && <span>{copied ? "Copied" : label}</span>}
    </button>
  );
}
