use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Agent {
    pub agent: Pubkey,
    pub kyc_verified: bool,
    pub active: bool,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ClaimStatus {
    Pending,
    Verified,
    Rejected,
}

#[account]
#[derive(InitSpace)]
pub struct Claim {
    pub collector: Pubkey,
    pub source: Pubkey,
    pub amount: u64,
    pub claim_id: u64,
    pub status: ClaimStatus,
    pub bump: u8,
}
