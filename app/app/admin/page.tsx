"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import RoleShell from "@/components/RoleShell";
import StatusBadge, { normalizeStatus } from "@/components/StatusBadge";
import TxFeedback from "@/components/TxFeedback";
import CopyButton from "@/components/CopyButton";
import Panel, { PanelHeader } from "@/components/Panel";
import { getProgram } from "@/lib/anchor";
import { parseMetadata, shortKey } from "@/lib/format";
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

  const walletKey = wallet?.publicKey.toBase58() ?? "";
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage("");
    setTxSig("");
  }, [walletKey]);

  const load = useCallback(async () => {
    if (!program) return;
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
    setMessage(approved ? "Approving agent…" : "Rejecting agent…");
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
        <Panel className="text-sm text-gray-1">
          Connect the admin wallet to manage agents.
        </Panel>
      </RoleShell>
    );
  }

  if (!loaded) {
    return (
      <RoleShell title="Admin">
        <p className="text-sm text-gray-1">Loading…</p>
      </RoleShell>
    );
  }

  if (!initialized) {
    return (
      <RoleShell title="Admin">
        <div className="rounded-xl border border-yellow/40 bg-bg-yellow p-4 text-sm text-foreground">
          Protocol is not initialized on this network yet.
        </div>
      </RoleShell>
    );
  }

  const isAdmin = configAdmin === wallet.publicKey.toBase58();

  if (!isAdmin) {
    return (
      <RoleShell title="Admin">
        <div className="rounded-xl border border-red/40 bg-bg-red p-4 text-sm text-foreground">
          <p className="font-medium">Access denied</p>
          <p className="mt-1">
            The connected wallet is not the protocol admin.
          </p>
          <div className="mt-3 space-y-1 font-mono text-xs break-all">
            <div>admin {configAdmin}</div>
            <div>you {wallet.publicKey.toBase58()}</div>
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
        <TxFeedback
          message={message}
          txSig={txSig}
          onDismiss={() => {
            setMessage("");
            setTxSig("");
          }}
        />

        <Panel>
          <PanelHeader
            title="Agents pending approval"
            hint="Registered agents can only verify claims once approved."
            action={
              <button
                onClick={load}
                className="shrink-0 rounded-lg border border-bg-5 bg-bg-0 px-2.5 py-1.5 text-xs text-gray-1 transition-colors hover:bg-bg-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40"
              >
                Refresh
              </button>
            }
          />
          {pending.length === 0 ? (
            <p className="text-sm text-gray-1">
              No agents waiting for approval.
            </p>
          ) : (
            <ul className="space-y-2">
              {pending.map((row) => {
                const meta = parseMetadata(row.account.metadataUri);
                return (
                  <li
                    key={row.publicKey.toBase58()}
                    className="flex items-center justify-between gap-4 rounded-lg border border-bg-4 bg-bg-0 px-4 py-3 transition-colors hover:border-bg-5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="truncate text-sm font-medium text-foreground">
                          {meta.name ?? shortKey(row.account.agent)}
                        </span>
                        <CopyButton value={row.account.agent.toBase58()} />
                      </div>
                      <div
                        className="mt-1 truncate font-mono text-xs text-gray-1"
                        title={row.account.agent.toBase58()}
                      >
                        {meta.location ??
                          row.account.metadataUri ??
                          shortKey(row.account.agent)}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => decide(row.account.agent, true)}
                        disabled={busy}
                        className="rounded-lg bg-green px-3 py-1.5 text-xs font-medium text-bg-0 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => decide(row.account.agent, false)}
                        disabled={busy}
                        className="rounded-lg border border-red/50 bg-bg-0 px-3 py-1.5 text-xs font-medium text-red transition-colors hover:bg-bg-red disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aqua/40"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Resolved agents" />
          {resolved.length === 0 ? (
            <p className="text-sm text-gray-1">No resolved agents yet.</p>
          ) : (
            <ul className="space-y-2">
              {resolved.map((row) => {
                const meta = parseMetadata(row.account.metadataUri);
                return (
                  <li
                    key={row.publicKey.toBase58()}
                    className="flex items-center justify-between gap-4 rounded-lg border border-bg-4 bg-bg-0 px-4 py-3 transition-colors hover:border-bg-5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="truncate text-sm font-medium text-foreground">
                          {meta.name ?? shortKey(row.account.agent)}
                        </span>
                        <CopyButton value={row.account.agent.toBase58()} />
                      </div>
                      <div
                        className="mt-1 truncate font-mono text-xs text-gray-1"
                        title={row.account.agent.toBase58()}
                      >
                        {meta.location ?? shortKey(row.account.agent)}
                      </div>
                    </div>
                    <StatusBadge status={row.account.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </RoleShell>
  );
}
