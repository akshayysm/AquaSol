import { Program, AnchorProvider, Wallet } from "@anchor-lang/core";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import fs from "fs";
import os from "os";
import path from "path";

const RPC = process.env.RPC_URL || "http://127.0.0.1:8899";
const PROGRAM_ID = new PublicKey("KFnBABoUBwpu8C9M1TJA3aXkT87BSBmYZ7nazuUy6my");

// Load IDL and CLI keypair
const idl = JSON.parse(fs.readFileSync("lib/idl.json", "utf8"));

// Anchor 1.x: program ID lives inside the IDL's `address` field.
// Patch it if missing, so the Program constructor can find it.
if (!idl.address) idl.address = PROGRAM_ID.toBase58();
if (!idl.metadata) {
  idl.metadata = { name: "aqua_sol", version: "0.1.0", spec: "0.1.0" };
}

const kp = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      fs.readFileSync(path.join(os.homedir(), ".config/solana/id.json"), "utf8")
    )
  )
);

const connection = new Connection(RPC, "confirmed");
const provider = new AnchorProvider(connection, new Wallet(kp), {
  commitment: "confirmed",
});

// Anchor 1.x: Program constructor takes (idl, provider) — no separate programId.
const program = new Program(idl, provider);

const [configPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  PROGRAM_ID
);
const [waterMintPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("water_mint")],
  PROGRAM_ID
);

// Idempotent guard — skip if already initialized
const existing = await connection.getAccountInfo(configPda);
if (existing) {
  console.log("Already initialized. Skipping.");
  process.exit(0);
}

console.log("Admin:      ", kp.publicKey.toBase58());
console.log("Config PDA: ", configPda.toBase58());
console.log("Mint PDA:   ", waterMintPda.toBase58());
console.log("\nSending initialize_protocol...");

const tx = await program.methods
  .initializeProtocol()
  .accountsPartial({
    admin: kp.publicKey,
    config: configPda,
    waterMint: waterMintPda,
    tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  })
  .signers([kp])
  .rpc();

console.log("\nDone. Tx:", tx);
