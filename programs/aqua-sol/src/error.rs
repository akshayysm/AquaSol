use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Signer does not match the registered agent wallet")]
    UnauthorizedAgent,

    #[msg("Agent cannot verify its own claim")]
    AgentIsCollector,

    #[msg("Claim amount must be greater than zero")]
    InvalidAmount,

    #[msg("Claim is not pending")]
    ClaimNotPending,

    #[msg("Agent is not verified")]
    AgentNotVerified,

    #[msg("Agent metadata URI is invalid")]
    InvalidMetadataUri,

    #[msg("Only the protocol admin can perform this action")]
    Unauthorized,

    #[msg("Agent is already in the requested state")]
    AgentAlreadyResolved,

    #[msg("Collector account does not match the claim")]
    InvalidCollector,

    #[msg("Verification failed")]
    VerificationFailed,
}