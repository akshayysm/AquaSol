"use client";

import CopyButton from "@/components/CopyButton";
import { explorerTxUrl, shortSig } from "@/lib/format";

type Tone = "info" | "progress" | "success" | "error";

const toneClasses: Record<Tone, { container: string; dot: string }> = {
  success: { container: "border-green/50 bg-bg-green", dot: "bg-green" },
  error: { container: "border-red/50 bg-bg-red", dot: "bg-red" },
  progress: { container: "border-blue/50 bg-bg-blue", dot: "bg-blue" },
  info: { container: "border-bg-5 bg-bg-1", dot: "bg-gray-1" },
};

function toneFor(message: string, hasSig: boolean): Tone {
  if (hasSig) return "success";
  const lower = message.toLowerCase();
  if (/failed|error/.test(lower)) return "error";
  if (lower.startsWith("sending") || lower.includes("…")) return "progress";
  return "info";
}

export function TxSigLine({ sig }: { sig?: string }) {
  if (!sig) return null;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-xs text-gray-2">
      <span>tx:</span>
      <span title={sig}>{shortSig(sig)}</span>
      <CopyButton value={sig} />
      <a
        href={explorerTxUrl(sig)}
        target="_blank"
        rel="noreferrer"
        className="font-sans text-xs text-blue underline decoration-dotted underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40"
      >
        Explorer
      </a>
    </div>
  );
}

export default function TxFeedback({
  message,
  txSig,
  onDismiss,
}: {
  message: string;
  txSig: string;
  onDismiss?: () => void;
}) {
  if (!message && !txSig) return null;

  const tone = toneFor(message, Boolean(txSig));
  const styles = toneClasses[tone];
  const displayMessage = message || (txSig ? "Transaction confirmed." : "");

  return (
    <div
      className={`rounded-xl border ${styles.container} p-3`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5">
          <span
            className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${styles.dot}`}
            aria-hidden
          />
          <p className="text-sm text-foreground">{displayMessage}</p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            title="Dismiss notification"
            aria-label="Dismiss notification"
            className="shrink-0 rounded p-1 text-xs text-gray-2 transition-colors hover:bg-bg-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40"
          >
            ✕
          </button>
        )}
      </div>
      {txSig && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 pl-[18px]">
          <code className="font-mono text-xs text-gray-2" title={txSig}>
            tx: {shortSig(txSig)}
          </code>
          <CopyButton value={txSig} label="Copy" />
          <a
            href={explorerTxUrl(txSig)}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue underline decoration-dotted underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40"
          >
            View on Solana Explorer
          </a>
        </div>
      )}
    </div>
  );
}
