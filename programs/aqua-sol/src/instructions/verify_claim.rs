use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

use crate::{
    constants::{AGENT_SEED, CONFIG_SEED, WATER_MINT_SEED},
    error::ErrorCode,
    state::{Agent, AgentStatus, Claim, ClaimStatus, Config},
};

#[derive(Accounts)]
pub struct VerifyClaim<'info> {
    /// Wallet acting as the verification agent.
    #[account(mut)]
    pub agent: Signer<'info>,

    /// Registered AquaSol verification agent.
    #[account(
        seeds = [AGENT_SEED, agent.key().as_ref()],
        bump = agent_pda.bump,
        constraint = agent_pda.agent == agent.key()
            @ ErrorCode::UnauthorizedAgent,
        constraint = agent_pda.status == AgentStatus::Verified
            @ ErrorCode::AgentNotVerified,
    )]
    pub agent_pda: Account<'info, Agent>,

    /// Global AquaSol configuration.
    ///
    /// The Config PDA is the mint authority for AQUA.
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    /// Claim being verified.
    #[account(
        mut,
        constraint = claim_pda.status == ClaimStatus::Pending
            @ ErrorCode::ClaimNotPending,
        constraint = claim_pda.collector != agent.key()
            @ ErrorCode::AgentIsCollector,
        constraint = claim_pda.amount > 0
            @ ErrorCode::InvalidAmount,
    )]
    pub claim_pda: Account<'info, Claim>,

    /// AQUA water-credit mint.
    #[account(
        mut,
        address = config.water_mint,
        seeds = [WATER_MINT_SEED],
        bump,
    )]
    pub water_mint: Account<'info, Mint>,

    /// Collector's AQUA token account.
    #[account(
        mut,
        token::mint = water_mint,
        token::authority = claim_pda.collector,
    )]
    pub collector_ata: Account<'info, TokenAccount>,

    /// SPL Token Program.
    pub token_program: Program<'info, Token>,
}

pub fn handle_verify_claim(
    ctx: Context<VerifyClaim>,
    approved: bool,
) -> Result<()> {
    // Failed verification rejects the claim.
    // No tokens are minted.
    if !approved {
        ctx.accounts.claim_pda.status = ClaimStatus::Rejected;

        msg!(
            "Water claim rejected: claim_id={}",
            ctx.accounts.claim_pda.claim_id
        );

        return Ok(());
    }

    // Successful verification changes the claim state.
    ctx.accounts.claim_pda.status = ClaimStatus::Verified;

    // Claim amount is stored in liters.
    //
    // AQUA has 3 decimals:
    //
    // 1 liter    = 1 base unit = 0.001 AQUA
    // 500 liters = 500 base units = 0.500 AQUA
    // 1000 liters = 1000 base units = 1.000 AQUA
    //
    // Therefore the number of liters is directly equal
    // to the number of AQUA base units to mint.
    let mint_amount = ctx.accounts.claim_pda.amount;

    // Config PDA signs the Token Program CPI as the mint authority.
    let signer_seeds: &[&[u8]] = &[
        CONFIG_SEED,
        &[ctx.accounts.config.bump],
    ];

    // Keep the signer-seed array alive for the entire CPI context.
    let signer_seeds_binding = [signer_seeds];

    let cpi_accounts = MintTo {
        mint: ctx.accounts.water_mint.to_account_info(),
        to: ctx.accounts.collector_ata.to_account_info(),
        authority: ctx.accounts.config.to_account_info(),
    };

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        cpi_accounts,
        &signer_seeds_binding,
    );

    token::mint_to(cpi_context, mint_amount)?;

    msg!(
        "Water claim verified: claim_id={}, liters={}, aqua_base_units={}",
        ctx.accounts.claim_pda.claim_id,
        mint_amount,
        mint_amount
    );

    Ok(())
}