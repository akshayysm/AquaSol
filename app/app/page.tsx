"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import CopyButton from "@/components/CopyButton";
import { PROGRAM_ID, RPC_URL } from "@/lib/anchor";
import { shortKey } from "@/lib/format";

const ROLES = [
  {
    href: "/admin",
    title: "Admin",
    description: "Approve or reject registered agents.",
  },
  {
    href: "/agent",
    title: "Agent",
    description: "Register as a verifier and review water claims.",
  },
  {
    href: "/collector",
    title: "Collector",
    description: "Log water claims and collect AQUA credits.",
  },
];

export default function Home() {
  const { connected, publicKey, connecting, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const isConnected = connected && publicKey !== null;
  const isConnecting = !isConnected && connecting;

  useEffect(() => {
    if (isConnected && pendingRoute) {
      router.push(pendingRoute);
    }
  }, [isConnected, pendingRoute, router]);

  function enter(href: string) {
    if (isConnected) {
      router.push(href);
    } else {
      setPendingRoute(href);
      setVisible(true);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-12">
      {isConnected && publicKey && (
        <div className="mb-8 flex items-center justify-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-lg border border-bg-4 bg-bg-1 py-1 pl-2.5 pr-1 font-mono text-xs text-gray-1"
            title={publicKey.toBase58()}
          >
            {shortKey(publicKey)}
            <CopyButton value={publicKey.toBase58()} />
          </span>
          <button
            onClick={async () => {
              setPendingRoute(null);
              await disconnect();
            }}
            className="rounded-lg border border-bg-5 bg-bg-0 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40"
          >
            Disconnect
          </button>
        </div>
      )}

      <div className="mb-10 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">AquaSol</h1>
        <p className="mt-2 text-sm text-gray-2">
          {isConnected
            ? "Wallet connected. Pick a role to continue."
            : isConnecting
              ? "Reconnecting your wallet…"
              : "Water as RWA. Pick your role and connect a wallet to continue."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {ROLES.map((role) => (
          <div
            key={role.href}
            className="flex flex-col justify-between rounded-xl border border-bg-4 bg-bg-1 p-5 transition-colors hover:border-bg-5 focus-within:border-aqua/50"
          >
            <div>
              <h2 className="text-lg font-semibold">{role.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-1">
                {role.description}
              </p>
            </div>
            <button
              onClick={() => enter(role.href)}
              disabled={isConnecting}
              className="mt-6 w-full rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-bg-0 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40"
            >
              {isConnected
                ? `Enter as ${role.title}`
                : isConnecting
                  ? "Connecting…"
                  : "Connect Wallet"}
            </button>
          </div>
        ))}
      </div>

      <footer className="mt-10 flex flex-col items-center gap-1 font-mono text-xs text-gray-1">
        <div className="flex items-center gap-1.5">
          <span>
            <span className="text-gray-0">Program </span>
            {PROGRAM_ID.toBase58()}
          </span>
          <CopyButton value={PROGRAM_ID.toBase58()} />
        </div>
        <div className="flex items-center gap-1.5">
          <span>
            <span className="text-gray-0">RPC </span>
            {RPC_URL}
          </span>
          <CopyButton value={RPC_URL} />
        </div>
      </footer>
    </main>
  );
}
