"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BN from "bn.js";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import RoleShell from "@/components/RoleShell";
import StatusBadge, { normalizeStatus } from "@/components/StatusBadge";
import { getProgram } from "@/lib/anchor";
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

function parseMetadata(uri?: string): { name?: string; location?: string } {
  if (!uri) return {};
  try {
    const parsed = JSON.parse(uri);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        name: typeof parsed.name === "string" ? parsed.name : undefined,
        location:
          typeof parsed.location === "string"
            ? parsed.location
            : undefined,
      };
    }
  } catch {
    return {};
  }
  return {};
}

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

  const load = useCallback(async () => {
    if (!program || !wallet) return;
    setMessage("");
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

      // Claims are only actionable for a verified agent.
      if (
        agentAccount &&
        normalizeStatus(agentAccount.status) === "verified"
      ) {
        const all = (await program.account.claim.all()) as unknown as ClaimRow[];
        setPending(
          all
            .filter(
              (c) => normalizeStatus(c.account.status) === "pending"
            )
            .sort(
              (a, b) =>
                a.account.claimId.toNumber() -
                b.account.claimId.toNumber()
            )
        );
        setCompleted(
          all
            .filter(
              (c) => normalizeStatus(c.account.status) !== "pending"
            )
            .sort(
              (a, b) =>
                b.account.claimId.toNumber() -
                a.account.claimId.toNumber()
            )
        );
      } else {
        setPending([]);
        setCompleted([]);
      }
    } catch (e) {
      setMessage(`Failed to load on-chain state: ${String(e)}`);
    } finally {
      setLoaded(true);
    }
  }, [program, wallet]);

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
    setMessage("Sending register_agent…");
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
      setMessage("Registered. Waiting for admin approval.");
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
    setMessage(
      approved ? "Sending verify_claim (approve)…" : "Sending verify_claim (reject)…"
    );
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
        <p className="rounded-xl border border-bg-4 bg-bg-0 p-4 text-sm text-gray-2">
          Connect a wallet to continue.
        </p>
      </RoleShell>
    );
  }

  const status = agent ? normalizeStatus(agent.status) : "unregistered";
  const meta = agent ? parseMetadata(agent.metadataUri) : {};

  return (
    <RoleShell title="Agent">
      <div className="flex flex-col gap-4">
        <section className="rounded-xl border border-bg-4 bg-bg-0 p-4 text-sm shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Status</span>
            <StatusBadge status={status} />
          </div>
          {agent && (
            <dl className="mt-3 space-y-1 text-gray-2">
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-gray-2">Agent PDA</dt>
                <dd className="break-all font-mono text-xs">
                  {findAgentPda(wallet.publicKey)[0].toBase58()}
                </dd>
              </div>
              {meta.name && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-gray-2">Name</dt>
                  <dd>{meta.name}</dd>
                </div>
              )}
              {meta.location && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-gray-2">Location</dt>
                  <dd>{meta.location}</dd>
                </div>
              )}
              {!meta.name && !meta.location && agent.metadataUri && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-gray-2">Metadata</dt>
                  <dd className="break-all">{agent.metadataUri}</dd>
                </div>
              )}
            </dl>
          )}
          {!loaded && (
            <p className="mt-2 text-gray-2">Loading…</p>
          )}
        </section>

        {!agent && loaded && (
          <section className="rounded-xl border border-bg-4 bg-bg-0 p-4 shadow-sm">
            <h2 className="mb-3 font-medium">Register as agent</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-sm text-gray-2">
                  Name
                </label>
                <input
                  className="w-full rounded-lg border border-bg-5 bg-bg-0 px-3 py-2 text-sm text-foreground placeholder:text-gray-2"
                  placeholder="e.g. Ravi Kumar"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-2">
                  Location
                </label>
                <input
                  className="w-full rounded-lg border border-bg-5 bg-bg-0 px-3 py-2 text-sm text-foreground placeholder:text-gray-2"
                  placeholder="e.g. Nashik, Maharashtra"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <button
                onClick={register}
                disabled={busy}
                className="self-start rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-bg-0 hover:opacity-90 disabled:opacity-50"
              >
                register_agent
              </button>
            </div>
          </section>
        )}

        {agent && status === "pending" && (
          <p className="rounded-xl border border-yellow bg-bg-yellow p-4 text-sm text-foreground">
            Registered. Waiting for the admin to approve this agent.
          </p>
        )}

        {agent && status === "rejected" && (
          <p className="rounded-xl border border-red bg-bg-red p-4 text-sm text-foreground">
            This agent was rejected by the admin.
          </p>
        )}

        {agent && status === "verified" && (
          <>
            <ClaimSection
              title="Pending claims"
              empty="No pending claims."
              rows={pending}
              busy={busy}
              selfWallet={wallet.publicKey}
              onVerify={(row) => decide(row, true)}
              onReject={(row) => decide(row, false)}
            />
            <ClaimSection
              title="Completed claims"
              empty="No completed claims yet."
              rows={completed}
              busy={busy}
              selfWallet={wallet.publicKey}
            />
          </>
        )}

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

function ClaimSection({
  title,
  empty,
  rows,
  busy,
  selfWallet,
  onVerify,
  onReject,
}: {
  title: string;
  empty: string;
  rows: ClaimRow[];
  busy: boolean;
  selfWallet: PublicKey;
  onVerify?: (row: ClaimRow) => void;
  onReject?: (row: ClaimRow) => void;
}) {
  return (
    <section className="rounded-xl border border-bg-4 bg-bg-0 p-4 shadow-sm">
      <h2 className="mb-3 font-medium">{title}</h2>
      {rows.length === 0 && (
        <p className="text-sm text-gray-2">{empty}</p>
      )}
      <ul className="space-y-2">
        {rows.map((row) => {
          const self = row.account.collector.equals(selfWallet);
          return (
            <li
              key={row.publicKey.toBase58()}
              className="rounded-lg border border-bg-4 p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs">
                    collector: {row.account.collector.toBase58()}
                  </div>
                  <div className="truncate font-mono text-xs">
                    source: {row.account.sourceName}
                  </div>
                  <div className="mt-1 text-gray-2">
                    {row.account.amount.toString()} liters · claim_id{" "}
                    {row.account.claimId.toString()}
                  </div>
                </div>
                <StatusBadge status={row.account.status} />
              </div>
              {onVerify && onReject && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => onVerify(row)}
                    disabled={busy || self}
                    className="rounded-lg bg-green px-3 py-1.5 text-xs font-medium text-bg-0 hover:opacity-90 disabled:opacity-50"
                  >
                    Verify (mint)
                  </button>
                  <button
                    onClick={() => onReject(row)}
                    disabled={busy || self}
                    className="rounded-lg bg-red px-3 py-1.5 text-xs font-medium text-bg-0 hover:opacity-90 disabled:opacity-50"
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
    </section>
  );
}
