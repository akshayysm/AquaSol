"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PROGRAM_ID, RPC_URL } from "@/lib/anchor";

const ROLES = [
  {
    href: "/agent",
    title: "Agent",
    description: "Register as a verifier and review water claims.",
  },
  {
    href: "/admin",
    title: "Admin",
    description: "Approve or reject registered agents.",
  },
  {
    href: "/collector",
    title: "Collector",
    description: "Submit water claims and track AQUA credits.",
  },
];

export default function Home() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  useEffect(() => {
    if (connected && pendingRoute) {
      router.push(pendingRoute);
    }
  }, [connected, pendingRoute, router]);

  function enter(href: string) {
    if (connected) {
      router.push(href);
    } else {
      setPendingRoute(href);
      setVisible(true);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">AquaSol</h1>
        <p className="mt-1 text-sm text-gray-2">
          Water as RWA. Pick your role and connect a wallet to continue.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {ROLES.map((role) => (
          <div
            key={role.href}
            className="flex flex-col justify-between rounded-xl border border-bg-4 bg-bg-0 p-5 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-semibold">{role.title}</h2>
              <p className="mt-1 text-sm text-gray-2">
                {role.description}
              </p>
            </div>
            <button
              onClick={() => enter(role.href)}
              className="mt-6 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-bg-0 hover:opacity-90"
            >
              {connected ? `Enter as ${role.title}` : "Connect Wallet"}
            </button>
          </div>
        ))}
      </div>

      <footer className="mt-8 rounded-lg border border-bg-4 bg-bg-0 p-3 text-center font-mono text-xs text-gray-2">
        <div>Program: {PROGRAM_ID.toBase58()}</div>
        <div>RPC: {RPC_URL}</div>
      </footer>
    </main>
  );
}
