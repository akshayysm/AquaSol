use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SubmitClaim<'info> {
    pub collector: Signer<'info>,
}

pub fn handle_submit_claim(
    _ctx: Context<SubmitClaim>,
    _claim_id: u64,
    _source: Pubkey,
    _amount: u64,
) -> Result<()> {
    Ok(())
}