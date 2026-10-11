import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PROGRAM_ID } from "./anchor";

const CONFIG_SEED = Buffer.from("config");
const AGENT_SEED = Buffer.from("agent");
const CLAIM_SEED = Buffer.from("claim");
const WATER_MINT_SEED = Buffer.from("water_mint");

export function findConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], PROGRAM_ID);
}

export function findWaterMintPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([WATER_MINT_SEED], PROGRAM_ID);
}

export function findAgentPda(agentWallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [AGENT_SEED, agentWallet.toBuffer()],
    PROGRAM_ID
  );
}

// 8-byte little-endian, matching claim_id.to_le_bytes() on-chain.
export function claimIdToLeBytes(claimId: BN | bigint | number): Buffer {
  const bn = BN.isBN(claimId) ? claimId : new BN(claimId.toString());
  return bn.toArrayLike(Buffer, "le", 8);
}

export function findClaimPda(
  collector: PublicKey,
  claimId: BN | bigint | number
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [CLAIM_SEED, collector.toBuffer(), claimIdToLeBytes(claimId)],
    PROGRAM_ID
  );
}

export function findCollectorAta(
  collector: PublicKey,
  waterMint: PublicKey
): PublicKey {
  return getAssociatedTokenAddressSync(waterMint, collector);
}

// Auto claim id for new claims. Only call from effects/handlers,
// never during render (Next.js prerender would freeze the value).
export function newClaimId(): BN {
  return new BN(Date.now().toString());
}
