use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Agent is not KYC verified")]
    AgentNotKycVerified,

    #[msg("Agent is not active")]
    AgentInactive,

    #[msg("Agent cannot verify its own claim")]
    AgentIsCollector,

    #[msg("Claim amount must be greater than zero")]
    InvalidAmount,

    #[msg("Claim is not pending")]
    ClaimNotPending,

    #[msg("Verification failed")]
    VerificationFailed,
}