use anchor_lang::prelude::*;

/// PDA seed for the global AquaSol protocol configuration.
#[constant]
pub const CONFIG_SEED: &[u8] = b"config";

/// PDA seed for registered verification agents.
#[constant]
pub const AGENT_SEED: &[u8] = b"agent";

/// PDA seed for collector claims.
#[constant]
pub const CLAIM_SEED: &[u8] = b"claim";

/// PDA seed for the AQUA water-credit mint.
#[constant]
pub const WATER_MINT_SEED: &[u8] = b"water_mint";

/// AQUA uses three decimal places.
///
/// Therefore:
/// 1 AQUA = 1,000 base units.
///
/// Since our protocol defines:
/// 1 AQUA = 1,000 liters,
///
/// this gives us:
/// 1 liter = 1 AQUA base unit.
///
/// Examples:
/// 1,000 liters = 1.000 AQUA
/// 500 liters  = 0.500 AQUA
/// 250 liters  = 0.250 AQUA
/// 1 liter     = 0.001 AQUA
#[constant]
pub const AQUA_DECIMALS: u8 = 3;