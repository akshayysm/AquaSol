import { AnchorProvider, Program } from "@anchor-lang/core";
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import type { AquaSol } from "./idlType";
import idl from "./idl.json";

// Must match declare_id! in programs/aqua-sol/src/lib.rs
export const PROGRAM_ID = new PublicKey(
  "KFnBABoUBwpu8C9M1TJA3aXkT87BSBmYZ7nazuUy6my"
);

// Local Surfpool / solana-test-validator. Override with:
// NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8899";

// Structural match for provider wallets (e.g. wallet-adapter's useAnchorWallet).
export interface WalletLike {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(
    tx: T
  ): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]>;
}

export function getConnection(): Connection {
  return new Connection(RPC_URL, "confirmed");
}

export function getProgram(
  connection: Connection,
  wallet: WalletLike
): Program<AquaSol> {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return new Program<AquaSol>(idl as unknown as AquaSol, provider);
}
