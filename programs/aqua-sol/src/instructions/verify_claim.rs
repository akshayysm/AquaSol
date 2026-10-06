use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct VerifyClaim<'info> {
    pub agent: Signer<'info>,
}

pub fn handle_verify_claim(
    _ctx: Context<VerifyClaim>,
    _approved: bool,
) -> Result<()> {
    Ok(())
}