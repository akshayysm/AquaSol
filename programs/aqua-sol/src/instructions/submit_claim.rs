use anchor_lang::prelude::*;

use crate::{
    constants::{CLAIM_SEED, CONFIG_SEED},
    error::ErrorCode,
    state::{Claim, ClaimStatus, Config},
};

#[derive(Accounts)]
#[instruction(claim_id: u64)]
pub struct SubmitClaim<'info> {
    // The collector is the wallet submitting the water claim.
    #[account(mut)]
    pub collector: Signer<'info>,

    // The protocol must already be initialized.
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    // Create one claim PDA for each collector + claim_id pair.
    //
    // Seeds:
    // ["claim", collector.key(), claim_id]
    //
    // Because this PDA must be unique, trying to submit the
    // same claim_id again for the same collector will fail.
    #[account(
        init,
        payer = collector,
        space = Claim::DISCRIMINATOR.len() + Claim::INIT_SPACE,
        seeds = [
            CLAIM_SEED,
            collector.key().as_ref(),
            claim_id.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub claim_pda: Account<'info, Claim>,

    // Required because the claim PDA is created on-chain.
    pub system_program: Program<'info, System>,
}

pub fn handle_submit_claim(
    ctx: Context<SubmitClaim>,
    claim_id: u64,
    source_name: String,
    amount: u64,
) -> Result<()> {
    // A claim must specify a non-zero water amount.
    require!(amount > 0, ErrorCode::InvalidAmount);

    // A newly submitted claim always starts as Pending.
    ctx.accounts.claim_pda.set_inner(Claim {
        collector: ctx.accounts.collector.key(),
        source_name,
        amount,
        claim_id,
        status: ClaimStatus::Pending,
        bump: ctx.bumps.claim_pda,
    });

    msg!(
        "Water claim submitted: collector={}, source_name={}, claim_id={}, amount={}",
        ctx.accounts.collector.key(),
        ctx.accounts.claim_pda.source_name,
        claim_id,
        amount
    );

    Ok(())
}