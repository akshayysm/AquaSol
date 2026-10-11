"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import RoleShell from "@/components/RoleShell";
import StatusBadge, { normalizeStatus } from "@/components/StatusBadge";
import { getProgram } from "@/lib/anchor";
import { findAgentPda, findConfigPda } from "@/lib/pda";

type AgentAccount = {
  agent: PublicKey;
  metadataUri?: string;
  status: unknown;
};

type AgentRow = { publicKey: PublicKey; account: AgentAccount };

export default function AdminPage() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const program = useMemo(
    () => (wallet ? getProgram(connection, wallet) : null),
    [connection, wallet]
  );

  const [configAdmin, setConfigAdmin] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(true);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [txSig, setTxSig] = useState("");

  const load = useCallback(async () => {
    if (!program) return;
    setMessage("");
    try {
      const [configPda] = findConfigPda();
      try {
        const cfg = (await program.account.config.fetch(
          configPda
        )) as unknown as { admin: PublicKey };
        setConfigAdmin(cfg.admin.toBase58());
        setInitialized(true);
      } catch {
        setConfigAdmin(null);
        setInitialized(false);
        setLoaded(true);
        return;
      }
      const all = (await program.account.agent.all()) as unknown as AgentRow[];
      setAgents(
        all.sort((a, b) =>
          a.account.agent
            .toBase58()
            .localeCompare(b.account.agent.toBase58())
        )
      );
    } catch (e) {
      setMessage(`Failed to load on-chain state: ${String(e)}`);
    } finally {
      setLoaded(true);
    }
  }, [program]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function decide(agentWallet: PublicKey, approved: boolean) {
    if (!program || !wallet) return;
    setBusy(true);
    setMessage(
      approved ? "Sending verify_agent (approve)…" : "Sending verify_agent (reject)…"
    );
    setTxSig("");
    try {
      const [config] = findConfigPda();
      const [agentPda] = findAgentPda(agentWallet);
      const sig = await program.methods
        .verifyAgent(agentWallet, approved)
        .accountsPartial({
          admin: wallet.publicKey,
          config,
          agentPda,
        })
        .rpc();
      setTxSig(sig);
      setMessage(approved ? "Agent approved." : "Agent rejected.");
      await load();
    } catch (e) {
      setMessage(`verify_agent failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  if (!wallet) {
    return (
      <RoleShell title="Admin">
        <p className="rounded-xl border border-bg-4 bg-bg-0 p-4 text-sm text-gray-2">
          Connect a wallet to continue.
        </p>
      </RoleShell>
    );
  }

  if (!loaded) {
    return (
      <RoleShell title="Admin">
        <p className="text-sm text-gray-2">Loading…</p>
      </RoleShell>
    );
  }

  if (!initialized) {
    return (
      <RoleShell title="Admin">
        <p className="rounded-xl border border-yellow bg-bg-yellow p-4 text-sm text-foreground">
          Protocol is not initialized on this network yet.
        </p>
      </RoleShell>
    );
  }

  const isAdmin = configAdmin === wallet.publicKey.toBase58();

  if (!isAdmin) {
    return (
      <RoleShell title="Admin">
        <div className="rounded-xl border border-red bg-bg-red p-4 text-sm text-foreground">
          <p className="font-medium">Access denied.</p>
          <p className="mt-1">
            The connected wallet is not the protocol admin.
          </p>
          <div className="mt-3 space-y-1 font-mono text-xs">
            <div className="break-all">admin: {configAdmin}</div>
            <div className="break-all">
              you: {wallet.publicKey.toBase58()}
            </div>
          </div>
        </div>
      </RoleShell>
    );
  }

  const pending = agents.filter(
    (a) => normalizeStatus(a.account.status) === "pending"
  );
  const resolved = agents.filter(
    (a) => normalizeStatus(a.account.status) !== "pending"
  );

  return (
    <RoleShell title="Admin">
      <div className="flex flex-col gap-4">
        <section className="rounded-xl border border-bg-4 bg-bg-0 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Agents pending approval</h2>
            <button
              onClick={load}
              className="text-sm text-gray-2 hover:underline"
            >
              refresh
            </button>
          </div>
          {pending.length === 0 && (
            <p className="text-sm text-gray-2">
              No agents waiting for approval.
            </p>
          )}
          <ul className="space-y-2">
            {pending.map((row) => (
              <li
                key={row.publicKey.toBase58()}
                className="flex items-center justify-between gap-2 rounded-lg border border-bg-4 p-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs">
                    {row.account.agent.toBase58()}
                  </div>
                  <div className="truncate text-gray-2">
                    {row.account.metadataUri}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => decide(row.account.agent, true)}
                    disabled={busy}
                    className="rounded-lg bg-green px-3 py-1.5 text-xs font-medium text-bg-0 hover:opacity-90 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => decide(row.account.agent, false)}
                    disabled={busy}
                    className="rounded-lg bg-red px-3 py-1.5 text-xs font-medium text-bg-0 hover:opacity-90 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-bg-4 bg-bg-0 p-4 shadow-sm">
          <h2 className="mb-3 font-medium">Resolved agents</h2>
          {resolved.length === 0 && (
            <p className="text-sm text-gray-2">No resolved agents yet.</p>
          )}
          <ul className="space-y-2">
            {resolved.map((row) => (
              <li
                key={row.publicKey.toBase58()}
                className="flex items-center justify-between gap-2 rounded-lg border border-bg-4 p-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs">
                    {row.account.agent.toBase58()}
                  </div>
                  <div className="truncate text-gray-2">
                    {row.account.metadataUri}
                  </div>
                </div>
                <StatusBadge status={row.account.status} />
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
