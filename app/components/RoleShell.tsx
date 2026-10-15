"use client";

import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import CopyButton from "@/components/CopyButton";
import { shortKey } from "@/lib/format";

export default function RoleShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="flex items-center gap-2">
          {connected && publicKey ? (
            <>
              <span
                className="inline-flex items-center gap-1 rounded-lg border border-bg-4 bg-bg-1 py-1 pl-2.5 pr-1 font-mono text-xs text-gray-1"
                title={publicKey.toBase58()}
              >
                {shortKey(publicKey)}
                <CopyButton value={publicKey.toBase58()} />
              </span>
              <button
                onClick={async () => {
                  await disconnect();
                  router.push("/");
                }}
                className="rounded-lg border border-bg-5 bg-bg-0 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => setVisible(true)}
              className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-bg-0 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>
      {children}
    </main>
  );
}
