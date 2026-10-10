use anchor_lang::prelude::*;

use crate::{
    constants::{AGENT_SEED, CONFIG_SEED},
    error::ErrorCode,
    state::{Agent, AgentStatus, Config},
};

#[derive(Accounts)]
#[instruction(agent: Pubkey)]
pub struct VerifyAgent<'info> {
    /// Protocol administrator; must match `config.admin`.
    pub admin: Signer<'info>,

    /// Global AquaSol configuration holding the admin wallet.
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = admin @ ErrorCode::Unauthorized,
    )]
    pub config: Account<'info, Config>,

    /// Agent PDA being approved or rejected.
    ///
    /// Addressed by the target agent wallet passed as an
    /// instruction argument, so the admin can verify any
    /// registered agent.
    #[account(
        mut,
        seeds = [AGENT_SEED, agent.as_ref()],
        bump = agent_pda.bump,
    )]
    pub agent_pda: Account<'info, Agent>,
}

pub fn handle_verify_agent(
    ctx: Context<VerifyAgent>,
    agent: Pubkey,
    approved: bool,
) -> Result<()> {
    let new_status = if approved {
        AgentStatus::Verified
    } else {
        AgentStatus::Rejected
    };

    // Re-setting the identical state is a no-op; reject it so
    // callers get explicit feedback instead of a silent success.
    require!(
        ctx.accounts.agent_pda.status != new_status,
        ErrorCode::AgentAlreadyResolved
    );

    ctx.accounts.agent_pda.status = new_status;

    msg!(
        "Agent {}: {}",
        agent,
        if approved { "verified" } else { "rejected" }
    );

    Ok(())
}
