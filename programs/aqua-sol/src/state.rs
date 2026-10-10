use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    /// Wallet that initialized the AquaSol protocol.
    pub admin: Pubkey,

    /// AQUA water-credit mint controlled by the Config PDA.
    pub water_mint: Pubkey,

    /// Bump used by the Config PDA.
    pub bump: u8,
}

#[derive(
    AnchorSerialize,
    AnchorDeserialize,
    Clone,
    Copy,
    PartialEq,
    Eq,
    InitSpace,
)]
pub enum AgentStatus {
    Pending,
    Verified,
    Rejected,
}

#[account]
#[derive(InitSpace)]
pub struct Agent {
    /// Wallet registered as a verification agent.
    pub agent: Pubkey,

    /// Off-chain metadata URI (name, location, KYC docs).
    #[max_len(200)]
    pub metadata_uri: String,

    /// On-chain verification state set by admin via `verify_agent`.
    pub status: AgentStatus,

    /// Bump used by the Agent PDA.
    pub bump: u8,
}

#[derive(
    AnchorSerialize,
    AnchorDeserialize,
    Clone,
    Copy,
    PartialEq,
    Eq,
    InitSpace,
)]
pub enum ClaimStatus {
    Pending,
    Verified,
    Rejected,
}

#[account]
#[derive(InitSpace)]
pub struct Claim {
    /// Wallet that submitted the water claim.
    pub collector: Pubkey,

    /// Water source associated with the claim.
    pub source: Pubkey,

    /// Verified/submitted water volume in liters.
    ///
    /// 1,000 liters = 1 AQUA.
    pub amount: u64,

    /// Collector-defined unique claim identifier.
    pub claim_id: u64,

    /// Current verification state.
    pub status: ClaimStatus,

    /// Bump used by the Claim PDA.
    pub bump: u8,
}