use anchor_lang::prelude::*;

use crate::{
    constants::{AGENT_SEED, CONFIG_SEED},
    error::ErrorCode,
    state::{Agent, AgentStatus, Config},
};

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(mut)]
    pub agent: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = agent,
        space = Agent::DISCRIMINATOR.len() + Agent::INIT_SPACE,
        seeds = [AGENT_SEED, agent.key().as_ref()],
        bump,
    )]
    pub agent_pda: Account<'info, Agent>,

    pub system_program: Program<'info, System>,
}

pub fn handle_register_agent(
    ctx: Context<RegisterAgent>,
    metadata_uri: String,
) -> Result<()> {
    require!(
        !metadata_uri.is_empty() && metadata_uri.len() <= 200,
        ErrorCode::InvalidMetadataUri
    );

    ctx.accounts.agent_pda.set_inner(Agent {
        agent: ctx.accounts.agent.key(),
        metadata_uri,
        status: AgentStatus::Pending,
        bump: ctx.bumps.agent_pda,
    });

    msg!("Agent registered: {}", ctx.accounts.agent.key());

    Ok(())
}