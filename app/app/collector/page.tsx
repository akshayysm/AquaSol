"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BN from "bn.js";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import RoleShell from "@/components/RoleShell";
import StatusBadge from "@/components/StatusBadge";
import { getProgram } from "@/lib/anchor";
import {
  findClaimPda,
  findCollectorAta,
  findConfigPda,
  findWaterMintPda,
  newClaimId,
} from "@/lib/pda";

type ClaimAccount = {
  collector: PublicKey;
  sourceName: string;
  amount: BN;
  claimId: BN;
  status: unknown;
};

type ClaimRow = { publicKey: PublicKey; account: ClaimAccount };

export default function CollectorPage() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const program = useMemo(
    () => (wallet ? getProgram(connection, wallet) : null),
    [connection, wallet]
  );

  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [solBalance, setSolBalance] = useState<string | null>(null);
  const [aquaBalance, setAquaBalance] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [claimId, setClaimId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [txSig, setTxSig] = useState("");

  const loadBalances = useCallback(async () => {
    if (!wallet) return;
    const lamports = await connection.getBalance(wallet.publicKey);
    setSolBalance((lamports / LAMPORTS_PER_SOL).toFixed(4));

    const [waterMint] = findWaterMintPda();
    const ata = findCollectorAta(wallet.publicKey, waterMint);
    try {
      const balance = await connection.getTokenAccountBalance(ata);
      setAquaBalance(balance.value.uiAmountString ?? "0");
    } catch {
      // ATA does not exist yet — no AQUA minted.
      setAquaBalance("0");
    }
  }, [connection, wallet]);

  const loadClaims = useCallback(async () => {
    if (!program || !wallet) return;
    try {
      const all = (await program.account.claim.all()) as unknown as ClaimRow[];
      setClaims(
        all
          .filter((c) => c.account.collector.equals(wallet.publicKey))
          .sort(
            (a, b) =>
              b.account.claimId.toNumber() - a.account.claimId.toNumber()
          )
      );
    } catch (e) {
      setMessage(`Failed to load claims: ${String(e)}`);
    }
  }, [program, wallet]);

  // claim_id is time-based; set it in an effect so prerender stays stable.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClaimId(newClaimId().toString());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBalances();
    loadClaims();
  }, [loadBalances, loadClaims]);

  async function submit() {
    if (!program || !wallet) return;
    const trimmedSource = source.trim();
    if (trimmedSource.length === 0) {
      setMessage("Enter a water source name.");
      return;
    }
    const liters = Number(amount);
    if (!Number.isInteger(liters) || liters <= 0) {
      setMessage("Amount must be a whole number of liters greater than 0.");
      return;
    }

    setBusy(true);
    setMessage("Sending submit_claim…");
    setTxSig("");
    try {
      const [config] = findConfigPda();
      const id = new BN(claimId);
      const [claimPda] = findClaimPda(wallet.publicKey, id);
      const sig = await program.methods
        .submitClaim(id, trimmedSource, new BN(liters))
        .accountsPartial({
          collector: wallet.publicKey,
          config,
          claimPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      setTxSig(sig);
      setMessage(`Claim #${id.toString()} submitted (Pending).`);
      setSource("");
      setAmount("");
      setClaimId(newClaimId().toString());
      await Promise.all([loadBalances(), loadClaims()]);
    } catch (e) {
      setMessage(`submit_claim failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!wallet) {
    return (
      <RoleShell title="Collector">
        <p className="rounded-xl border border-bg-4 bg-bg-0 p-4 text-sm text-gray-2">
          Connect a wallet to continue.
        </p>
      </RoleShell>
    );
  }

  return (
    <RoleShell title="Collector">
      <div className="flex flex-col gap-4">
        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-bg-4 bg-bg-0 p-4 shadow-sm">
            <div className="text-sm text-gray-2">SOL balance</div>
            <div className="mt-1 text-lg font-semibold">
              {solBalance ?? "…"}
            </div>
          </div>
          <div className="rounded-xl border border-bg-4 bg-bg-0 p-4 shadow-sm">
            <div className="text-sm text-gray-2">AQUA balance</div>
            <div className="mt-1 text-lg font-semibold">
              {aquaBalance ?? "…"}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-bg-4 bg-bg-0 p-4 shadow-sm">
          <h2 className="mb-3 font-medium">Create claim</h2>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-sm text-gray-2">
                source name
              </label>
              <input
                className="w-full rounded-lg border border-bg-5 bg-bg-0 px-3 py-2 text-sm text-foreground placeholder:text-gray-2"
                placeholder="e.g. Godavari River"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-2">
                amount (liters)
              </label>
              <input
                className="w-full rounded-lg border border-bg-5 bg-bg-0 px-3 py-2 text-sm text-foreground placeholder:text-gray-2"
                placeholder="e.g. 750"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-2">
                claim_id (auto)
              </label>
              <div className="flex gap-2">
                <input
                  className="w-full rounded-lg border border-bg-5 bg-bg-0 px-3 py-2 font-mono text-sm text-foreground"
                  value={claimId}
                  onChange={(e) => setClaimId(e.target.value)}
                />
                <button
                  onClick={() => setClaimId(newClaimId().toString())}
                  className="shrink-0 rounded-lg border border-bg-5 px-3 text-sm hover:bg-bg-2"
                >
                  regenerate
                </button>
              </div>
            </div>
            <button
              onClick={submit}
              disabled={busy}
              className="self-start rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-bg-0 hover:opacity-90 disabled:opacity-50"
            >
              submit_claim
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-bg-4 bg-bg-0 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">My claims</h2>
            <button
              onClick={loadClaims}
              className="text-sm text-gray-2 hover:underline"
            >
              refresh
            </button>
          </div>
          {claims.length === 0 && (
            <p className="text-sm text-gray-2">No claims submitted yet.</p>
          )}
          <ul className="space-y-2">
            {claims.map((row) => (
              <li
                key={row.publicKey.toBase58()}
                className="rounded-lg border border-bg-4 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs">
                      source: {row.account.sourceName}
                    </div>
                    <div className="mt-1 text-gray-2">
                      {row.account.amount.toString()} liters · claim_id{" "}
                      {row.account.claimId.toString()}
                    </div>
                  </div>
                  <StatusBadge status={row.account.status} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        {message && <p className="text-sm text-foreground">{message}</p>}
        {txSig && (
          <p className="break-all font-mono text-xs text-gray-2">
            tx: {txSig}
          </p>
        )}
      </div>
    </RoleShell>
  );
}
