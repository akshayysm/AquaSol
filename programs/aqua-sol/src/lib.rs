pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use state::*;

declare_id!("KFnBABoUBwpu8C9M1TJA3aXkT87BSBmYZ7nazuUy6my");

#[program]
pub mod aqua_sol {
    use super::*;

    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
    ) -> Result<()> {
        instructions::initialize_protocol::handle_initialize_protocol(ctx)
    }

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        metadata_uri: String,
    ) -> Result<()> {
        instructions::register_agent::handle_register_agent(
            ctx,
            metadata_uri,
        )
    }

    pub fn verify_agent(
        ctx: Context<VerifyAgent>,
        agent: Pubkey,
        approved: bool,
    ) -> Result<()> {
        instructions::verify_agent::handle_verify_agent(
            ctx,
            agent,
            approved,
        )
    }

    pub fn submit_claim(
        ctx: Context<SubmitClaim>,
        claim_id: u64,
        source: Pubkey,
        amount: u64,
    ) -> Result<()> {
        instructions::submit_claim::handle_submit_claim(
            ctx,
            claim_id,
            source,
            amount,
        )
    }

    pub fn verify_claim(
        ctx: Context<VerifyClaim>,
        approved: bool,
    ) -> Result<()> {
        instructions::verify_claim::handle_verify_claim(
            ctx,
            approved,
        )
    }
}