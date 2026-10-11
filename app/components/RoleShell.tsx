"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

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

  const short = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}..${publicKey
        .toBase58()
        .slice(-4)}`
    : "";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-2 hover:underline">
            AquaSol
          </Link>
          <span className="text-lg font-semibold">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {connected && publicKey ? (
            <>
              <span
                className="rounded bg-bg-3 px-2 py-1 font-mono text-xs"
                title={publicKey.toBase58()}
              >
                {short}
              </span>
              <button
                onClick={async () => {
                  await disconnect();
                  router.push("/");
                }}
                className="rounded-lg border border-bg-5 px-3 py-1.5 text-sm hover:bg-bg-2"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => setVisible(true)}
              className="rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-bg-0 hover:opacity-90"
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
