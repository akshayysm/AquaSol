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

#[account]
#[derive(InitSpace)]
pub struct Agent {
    /// Wallet registered as a verification agent.
    pub agent: Pubkey,

    /// Whether the agent has passed KYC.
    pub kyc_verified: bool,

    /// Whether the agent is currently active.
    pub active: bool,

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