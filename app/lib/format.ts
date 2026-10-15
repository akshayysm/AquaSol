import type { Connection, PublicKey } from "@solana/web3.js";
import { RPC_URL } from "./anchor";

export function parseMetadata(uri?: string): {
  name?: string;
  location?: string;
} {
  if (!uri) return {};
  try {
    const parsed = JSON.parse(uri);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        name: typeof parsed.name === "string" ? parsed.name : undefined,
        location:
          typeof parsed.location === "string" ? parsed.location : undefined,
      };
    }
  } catch {
    return {};
  }
  return {};
}

export function shortKey(pk: string | { toBase58(): string }): string {
  const value = typeof pk === "string" ? pk : pk.toBase58();
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function shortSig(sig: string): string {
  if (sig.length <= 16) return sig;
  return `${sig.slice(0, 8)}…${sig.slice(-8)}`;
}

export function explorerTxUrl(sig: string): string {
  let url = `https://explorer.solana.com/tx/${sig}`;
  if (RPC_URL.includes("devnet")) {
    url += "?cluster=devnet";
  } else if (RPC_URL.includes("testnet")) {
    url += "?cluster=testnet";
  } else if (/localhost|127\.0\.0\.1/.test(RPC_URL)) {
    url += `?cluster=custom&customUrl=${encodeURIComponent(RPC_URL)}`;
  }
  return url;
}

const TX_STORAGE_KEY = "aquasol:tx-map";

function readStore(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TX_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

export function recordTxSig(pda: string, sig: string, status?: string) {
  const store = readStore();
  store[pda] = sig;
  if (status) {
    store[`${pda}:${status}`] = sig;
  }
  writeStore(store);
}

export async function resolveTxSigs(
  connection: Connection,
  items: { pda: PublicKey; status: string }[]
): Promise<Record<string, string>> {
  const store = readStore();
  const result: Record<string, string> = {};
  let mutated = false;

  for (const item of items) {
    const key = item.pda.toBase58();
    const statusKey = `${key}:${item.status}`;
    if (store[statusKey]) {
      result[key] = store[statusKey];
      continue;
    }
    try {
      const sigs = await connection.getSignaturesForAddress(item.pda, {
        limit: 1,
      });
      const latest = sigs[0]?.signature;
      if (latest) {
        store[key] = latest;
        store[statusKey] = latest;
        result[key] = latest;
        mutated = true;
      } else if (store[key]) {
        result[key] = store[key];
      }
    } catch {
      if (store[key]) {
        result[key] = store[key];
      }
    }
  }

  if (mutated) {
    writeStore(store);
  }
  return result;
}
