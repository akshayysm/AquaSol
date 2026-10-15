"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BN from "bn.js";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import RoleShell from "@/components/RoleShell";
import StatusBadge, { normalizeStatus } from "@/components/StatusBadge";
import TxFeedback, { TxSigLine } from "@/components/TxFeedback";
import CopyButton from "@/components/CopyButton";
import Panel, { PanelHeader } from "@/components/Panel";
import { getProgram } from "@/lib/anchor";
import { parseMetadata, recordTxSig, resolveTxSigs, shortKey } from "@/lib/format";
import {
  findAgentPda,
  findCollectorAta,
  findConfigPda,
  findWaterMintPda,
} from "@/lib/pda";

// Minimal shapes for accounts read from chain.
type AgentAccount = {
  agent: PublicKey;
  metadataUri?: string;
  status: unknown;
};

type ClaimAccount = {
  collector: PublicKey;
  sourceName: string;
  amount: BN;
  claimId: BN;
  status: unknown;
};

type ClaimRow = { publicKey: PublicKey; account: ClaimAccount };

export default function AgentPage() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const program = useMemo(
    () => (wallet ? getProgram(connection, wallet) : null),
    [connection, wallet]
  );

  const [agent, setAgent] = useState<AgentAccount | null>(null);
  const [pending, setPending] = useState<ClaimRow[]>([]);
  const [completed, setCompleted] = useState<ClaimRow[]>([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [txSig, setTxSig] = useState("");
  const [txSigs, setTxSigs] = useState<Record<string, string>>({});

  const walletKey = wallet?.publicKey.toBase58() ?? "";
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage("");
    setTxSig("");
  }, [walletKey]);

  const load = useCallback(async () => {
    if (!program || !wallet) return;
    try {
      const [agentPda] = findAgentPda(wallet.publicKey);

      let agentAccount: AgentAccount | null = null;
      try {
        const fetched = await program.account.agent.fetch(agentPda);
        agentAccount = fetched as unknown as AgentAccount;
      } catch {
        agentAccount = null;
      }
      setAgent(agentAccount);

      const sigItems: { pda: PublicKey; status: string }[] = [];
      if (agentAccount) {
        sigItems.push({
          pda: agentPda,
          status: normalizeStatus(agentAccount.status),
        });
      }

      // Claims are only actionable for a verified agent.
      if (
        agentAccount &&
        normalizeStatus(agentAccount.status) === "verified"
      ) {
        const all = (await program.account.claim.all()) as unknown as ClaimRow[];
        const pendingRows = all
          .filter((c) => normalizeStatus(c.account.status) === "pending")
          .sort(
            (a, b) =>
              a.account.claimId.toNumber() -
              b.account.claimId.toNumber()
          );
        const completedRows = all
          .filter((c) => normalizeStatus(c.account.status) !== "pending")
          .sort(
            (a, b) =>
              b.account.claimId.toNumber() -
              a.account.claimId.toNumber()
          );
        setPending(pendingRows);
        setCompleted(completedRows);
        for (const row of [...pendingRows, ...completedRows]) {
          sigItems.push({
            pda: row.publicKey,
            status: normalizeStatus(row.account.status),
          });
        }
      } else {
        setPending([]);
        setCompleted([]);
      }

      setTxSigs(await resolveTxSigs(connection, sigItems));
    } catch (e) {
      setMessage(`Failed to load on-chain state: ${String(e)}`);
    } finally {
      setLoaded(true);
    }
  }, [connection, program, wallet]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function register() {
    if (!program || !wallet) return;
    const trimmedName = name.trim();
    const trimmedLocation = location.trim();
    if (trimmedName.length === 0 || trimmedLocation.length === 0) {
      setMessage("Enter both name and location.");
      return;
    }
    const metadataUri = JSON.stringify({
      name: trimmedName,
      location: trimmedLocation,
    });
    if (metadataUri.length > 200) {
      setMessage("Name and location are too long.");
      return;
    }
    setBusy(true);
    setMessage("Registering agent…");
    setTxSig("");
    try {
      const [config] = findConfigPda();
      const [agentPda] = findAgentPda(wallet.publicKey);
      const sig = await program.methods
        .registerAgent(metadataUri)
        .accountsPartial({
          agent: wallet.publicKey,
          config,
          agentPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      setTxSig(sig);
      setMessage(
        "Registered. Waiting for the admin to approve this agent."
      );
      recordTxSig(agentPda.toBase58(), sig, "pending");
      setName("");
      setLocation("");
      await load();
    } catch (e) {
      setMessage(`register_agent failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function decide(row: ClaimRow, approved: boolean) {
    if (!program || !wallet) return;
    setBusy(true);
    setMessage(approved ? "Verifying claim…" : "Rejecting claim…");
    setTxSig("");
    try {
      const [config] = findConfigPda();
      const [agentPda] = findAgentPda(wallet.publicKey);
      const [waterMint] = findWaterMintPda();
      const collector = new PublicKey(row.account.collector);
      const collectorAta = findCollectorAta(collector, waterMint);
      const sig = await program.methods
        .verifyClaim(approved)
        .accountsPartial({
          agent: wallet.publicKey,
          agentPda,
          config,
          claimPda: row.publicKey,
          waterMint,
          collector,
          collectorAta,
        })
        .rpc();
      setTxSig(sig);
      setMessage(
        approved
          ? "Claim verified — AQUA minted to collector."
          : "Claim rejected."
      );
      recordTxSig(
        row.publicKey.toBase58(),
        sig,
        approved ? "verified" : "rejected"
      );
      await load();
    } catch (e) {
      setMessage(`verify_claim failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!wallet) {
    return (
      <RoleShell title="Agent">
        <Panel className="text-sm text-gray-1">
          Connect a wallet to register as a verification agent.
        </Panel>
      </RoleShell>
    );
  }

  const status = agent ? normalizeStatus(agent.status) : "unregistered";
  const meta = agent ? parseMetadata(agent.metadataUri) : {};
  const agentPda = findAgentPda(wallet.publicKey)[0];

  return (
    <RoleShell title="Agent">
      <div className="flex flex-col gap-4">
        <TxFeedback
          message={message}
          txSig={txSig}
          onDismiss={() => {
            setMessage("");
            setTxSig("");
          }}
        />

        <Panel>
          <div className="flex items-start justify-between gap-4">
            <span className="font-medium text-foreground">
              {meta.name ?? "Agent status"}
            </span>
            <StatusBadge status={status} />
          </div>
          {agent && (
            <>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-xs text-gray-1">Agent PDA</dt>
                  <dd
                    className="break-all font-mono text-xs text-gray-2"
                    title={agentPda.toBase58()}
                  >
                    <span className="inline-flex items-center gap-1">
                      {shortKey(agentPda)}
                      <CopyButton value={agentPda.toBase58()} />
                    </span>
                  </dd>
                </div>
                {meta.location && (
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-xs text-gray-1">Location</dt>
                    <dd className="text-foreground">{meta.location}</dd>
                  </div>
                )}
                {!meta.name && !meta.location && agent.metadataUri && (
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-xs text-gray-1">Metadata</dt>
                    <dd className="break-all">{agent.metadataUri}</dd>
                  </div>
                )}
              </dl>
              <TxSigLine sig={txSigs[agentPda.toBase58()]} />
            </>
          )}
          {!loaded && <p className="mt-2 text-sm text-gray-1">Loading…</p>}
        </Panel>

        {!agent && loaded && (
          <Panel>
            <PanelHeader title="Register as agent" />
            <div className="flex flex-col gap-4">
              <div>
                <label htmlFor="agent-name" className="mb-1 block text-xs text-gray-1">
                  Name
                </label>
                <input
                  id="agent-name"
                  className="input"
                  placeholder="e.g. Ravi Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="agent-location"
                  className="mb-1 block text-xs text-gray-1"
                >
                  Location
                </label>
                <input
                  id="agent-location"
                  className="input"
                  placeholder="e.g. Nashik, Maharashtra"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <button
                onClick={register}
                disabled={busy}
                className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-bg-0 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40 sm:w-auto sm:self-start"
              >
                {busy ? "Registering…" : "Register"}
              </button>
            </div>
          </Panel>
        )}

        {agent && status === "pending" && (
          <div className="rounded-xl border border-yellow/40 bg-bg-yellow px-4 py-3 text-sm text-foreground">
            Registered. Waiting for the admin to approve this agent.
          </div>
        )}

        {agent && status === "rejected" && (
          <div className="rounded-xl border border-red/40 bg-bg-red px-4 py-3 text-sm text-foreground">
            This agent was rejected by the admin.
          </div>
        )}

        {agent && status === "verified" && (
          <>
            <ClaimSection
              title="Pending claims"
              empty="No pending claims to verify right now."
              rows={pending}
              busy={busy}
              selfWallet={wallet.publicKey}
              txSigs={txSigs}
              onVerify={(row) => decide(row, true)}
              onReject={(row) => decide(row, false)}
            />
            <ClaimSection
              title="Completed claims"
              empty="No completed claims yet."
              rows={completed}
              busy={busy}
              selfWallet={wallet.publicKey}
              txSigs={txSigs}
            />
          </>
        )}
      </div>
    </RoleShell>
  );
}

function ClaimSection({
  title,
  empty,
  rows,
  busy,
  selfWallet,
  txSigs,
  onVerify,
  onReject,
}: {
  title: string;
  empty: string;
  rows: ClaimRow[];
  busy: boolean;
  selfWallet: PublicKey;
  txSigs: Record<string, string>;
  onVerify?: (row: ClaimRow) => void;
  onReject?: (row: ClaimRow) => void;
}) {
  const actionable = Boolean(onVerify && onReject);
  return (
    <Panel>
      <PanelHeader
        title={title}
        hint={
          actionable
            ? "Verify to mint AQUA to the collector, or reject to close the claim."
            : undefined
        }
      />
      {rows.length === 0 ? (
        <p className="text-sm text-gray-1">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const self = row.account.collector.equals(selfWallet);
            return (
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
                    <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-gray-2">
                      <span
                        className="truncate"
                        title={row.account.collector.toBase58()}
                      >
                        collector {shortKey(row.account.collector)}
                        {self ? " (you)" : ""}
                      </span>
                      <CopyButton value={row.account.collector.toBase58()} />
                    </div>
                    <TxSigLine sig={txSigs[row.publicKey.toBase58()]} />
                  </div>
                  <StatusBadge status={row.account.status} />
                </div>
                {onVerify && onReject && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => onVerify(row)}
                      disabled={busy || self}
                      className="rounded-lg bg-green px-3 py-1.5 text-xs font-medium text-bg-0 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40"
                    >
                      Verify & mint AQUA
                    </button>
                    <button
                      onClick={() => onReject(row)}
                      disabled={busy || self}
                      className="rounded-lg border border-red/50 bg-bg-0 px-3 py-1.5 text-xs font-medium text-red transition-colors hover:bg-bg-red disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40"
                    >
                      Reject
                    </button>
                    {self && (
                      <span className="text-xs text-gray-2">
                        own claim — cannot self-verify
                      </span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
