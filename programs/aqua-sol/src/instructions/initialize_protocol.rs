use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::{
    constants::{
        AQUA_DECIMALS,
        CONFIG_SEED,
        WATER_MINT_SEED,
    },
    state::Config,
};

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    /// The administrator pays for the protocol accounts.
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Global AquaSol configuration PDA.
    ///
    /// The Config PDA will also become the mint authority
    /// for the AQUA water-credit token.
    #[account(
        init,
        payer = admin,
        space = Config::DISCRIMINATOR.len() + Config::INIT_SPACE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,

    /// AQUA water-credit mint.
    ///
    /// The mint authority is the Config PDA, meaning only
    /// AquaSol's program-controlled configuration PDA can
    /// authorize token minting.
    #[account(
        init,
        payer = admin,
        seeds = [WATER_MINT_SEED],
        bump,
        mint::decimals = AQUA_DECIMALS,
        mint::authority = config,
    )]
    pub water_mint: Account<'info, Mint>,

    /// SPL Token Program used to create and manage AQUA.
    pub token_program: Program<'info, Token>,

    /// System Program creates the accounts.
    pub system_program: Program<'info, System>,

    /// Required for account creation and initialization.
    pub rent: Sysvar<'info, Rent>,
}

pub fn handle_initialize_protocol(
    ctx: Context<InitializeProtocol>,
) -> Result<()> {
    ctx.accounts.config.set_inner(Config {
        admin: ctx.accounts.admin.key(),
        water_mint: ctx.accounts.water_mint.key(),
        bump: ctx.bumps.config,
    });

    msg!(
        "AquaSol protocol initialized: admin={}, water_mint={}",
        ctx.accounts.admin.key(),
        ctx.accounts.water_mint.key()
    );

    Ok(())
}