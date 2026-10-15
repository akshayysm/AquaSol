"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BN from "bn.js";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import RoleShell from "@/components/RoleShell";
import StatusBadge, { normalizeStatus } from "@/components/StatusBadge";
import TxFeedback, { TxSigLine } from "@/components/TxFeedback";
import CopyButton from "@/components/CopyButton";
import Panel, { PanelHeader } from "@/components/Panel";
import { getProgram } from "@/lib/anchor";
import { recordTxSig, resolveTxSigs } from "@/lib/format";
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

function BalanceCard({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string | null;
  unit: string;
  accent?: boolean;
}) {
  return (
    <Panel className="p-4">
      <div className="text-xs text-gray-1">{label}</div>
      <div className={`numeric mt-1 text-2xl font-semibold ${accent ? "text-aqua" : ""}`}>
        {value ?? "–"}
        <span className="ml-1.5 text-sm font-normal text-gray-1">{unit}</span>
      </div>
    </Panel>
  );
}

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
  const [txSigs, setTxSigs] = useState<Record<string, string>>({});
  const pendingClaimIdRef = useRef<string | null>(null);

  const walletKey = wallet?.publicKey.toBase58() ?? "";
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage("");
    setTxSig("");
    pendingClaimIdRef.current = null;
  }, [walletKey]);

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
      const mine = all
        .filter((c) => c.account.collector.equals(wallet.publicKey))
        .sort(
          (a, b) =>
            b.account.claimId.toNumber() - a.account.claimId.toNumber()
        );
      setClaims(mine);

      const pendingId = pendingClaimIdRef.current;
      if (pendingId) {
        const tracked = mine.find(
          (c) => c.account.claimId.toString() === pendingId
        );
        if (tracked && normalizeStatus(tracked.account.status) !== "pending") {
          pendingClaimIdRef.current = null;
          setMessage("");
          setTxSig("");
        }
      }

      setTxSigs(
        await resolveTxSigs(
          connection,
          mine.map((c) => ({
            pda: c.publicKey,
            status: normalizeStatus(c.account.status),
          }))
        )
      );
    } catch (e) {
      setMessage(`Failed to load claims: ${String(e)}`);
    }
  }, [connection, program, wallet]);

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
    setMessage("Submitting claim…");
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
      setMessage(`Claim #${id.toString()} submitted and awaiting verification.`);
      pendingClaimIdRef.current = id.toString();
      recordTxSig(claimPda.toBase58(), sig, "pending");
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
        <Panel className="text-sm text-gray-1">
          Connect a wallet to log water claims and collect AQUA.
        </Panel>
      </RoleShell>
    );
  }

  return (
    <RoleShell title="Collector">
      <div className="flex flex-col gap-4">
        <TxFeedback
          message={message}
          txSig={txSig}
          onDismiss={() => {
            setMessage("");
            setTxSig("");
            pendingClaimIdRef.current = null;
          }}
        />

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BalanceCard label="SOL balance" value={solBalance} unit="SOL" />
          <BalanceCard label="AQUA balance" value={aquaBalance} unit="AQUA" accent />
        </section>

        <Panel>
          <PanelHeader
            title="Log a claim"
            hint="Water you collected from a natural source. An agent verifies it before AQUA is minted."
          />
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="source" className="mb-1 block text-xs text-gray-1">
                Source name
              </label>
              <input
                id="source"
                className="input"
                placeholder="e.g. Godavari River"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="amount" className="mb-1 block text-xs text-gray-1">
                Amount (liters)
              </label>
              <input
                id="amount"
                className="input numeric"
                placeholder="e.g. 750"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="claim-id"
                className="mb-1 block text-xs text-gray-1"
              >
                Claim ID (auto)
              </label>
              <div className="flex gap-2">
                <input
                  id="claim-id"
                  className="input font-mono text-xs"
                  value={claimId}
                  onChange={(e) => setClaimId(e.target.value)}
                />
                <button
                  onClick={() => setClaimId(newClaimId().toString())}
                  className="shrink-0 rounded-lg border border-bg-5 bg-bg-0 px-3 text-sm text-foreground transition-colors hover:bg-bg-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40"
                >
                  Regenerate ID
                </button>
              </div>
            </div>
            <button
              onClick={submit}
              disabled={busy}
              className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-bg-0 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40 sm:w-auto sm:self-start"
            >
              {busy ? "Submitting…" : "Submit claim"}
            </button>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="My claims"
            hint="Newest first. Verified claims mint AQUA; rejected ones are closed."
            action={
              <button
                onClick={loadClaims}
                className="shrink-0 rounded-lg border border-bg-5 bg-bg-0 px-2.5 py-1.5 text-xs text-gray-1 transition-colors hover:bg-bg-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40"
              >
                Refresh
              </button>
            }
          />
          {claims.length === 0 ? (
            <p className="text-sm text-gray-1">
              No claims yet. Log your first one above.
            </p>
          ) : (
            <ul className="space-y-2">
              {claims.map((row) => (
                <li
                  key={row.publicKey.toBase58()}
                  className="rounded-lg border border-bg-4 bg-bg-0 px-4 py-3 transition-colors hover:border-bg-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-foreground">
                        {row.account.sourceName}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-1">
                        <span className="numeric">
                          {row.account.amount.toString()} liters · claim #
                          {row.account.claimId.toString()}
                        </span>
                        <CopyButton value={row.account.claimId.toString()} />
                      </div>
                      <TxSigLine sig={txSigs[row.publicKey.toBase58()]} />
                    </div>
                    <StatusBadge status={row.account.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </RoleShell>
  );
}
