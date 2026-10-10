use anchor_lang::{
    prelude::*,
    InstructionData,
    ToAccountMetas,
};
use anchor_spl::token::spl_token;
use aqua_sol::{
    constants::{AGENT_SEED, CLAIM_SEED, CONFIG_SEED, WATER_MINT_SEED},
    state::{Agent, AgentStatus, Claim, ClaimStatus, Config},
};
use litesvm::LiteSVM;
use solana_keypair::Keypair;
use solana_message::{Message, VersionedMessage};
use solana_signer::Signer;
use solana_transaction::versioned::VersionedTransaction;

const PROGRAM_BYTES: &[u8] =
    include_bytes!("../../../target/deploy/aqua_sol.so");

fn setup_svm() -> LiteSVM {
    let mut svm = LiteSVM::new();

    svm.add_program(aqua_sol::ID, PROGRAM_BYTES)
        .expect("failed to load AquaSol program");

    svm
}

fn send_transaction(
    svm: &mut LiteSVM,
    payer: &Keypair,
    instruction: anchor_lang::solana_program::instruction::Instruction,
    additional_signers: &[&Keypair],
) {
    let mut signers: Vec<&Keypair> = vec![payer];
    signers.extend_from_slice(additional_signers);

    let message = Message::new_with_blockhash(
        &[instruction],
        Some(&payer.pubkey()),
        &svm.latest_blockhash(),
    );

    let transaction = VersionedTransaction::try_new(
        VersionedMessage::Legacy(message),
        &signers,
    )
    .expect("failed to create transaction");

    svm.send_transaction(transaction)
        .expect("transaction failed");
}

fn initialize_protocol(
    svm: &mut LiteSVM,
    admin: &Keypair,
) -> (Pubkey, Pubkey) {
    let (config, _) =
        Pubkey::find_program_address(&[CONFIG_SEED], &aqua_sol::ID);

    let (water_mint, _) =
        Pubkey::find_program_address(&[WATER_MINT_SEED], &aqua_sol::ID);

    let accounts = aqua_sol::accounts::InitializeProtocol {
        admin: admin.pubkey(),
        config,
        water_mint,
        token_program: spl_token::ID,
        system_program: anchor_lang::system_program::ID,
        rent: anchor_lang::prelude::rent::ID,
    };

    let instruction =
        anchor_lang::solana_program::instruction::Instruction {
            program_id: aqua_sol::ID,
            accounts: accounts.to_account_metas(None),
            data: aqua_sol::instruction::InitializeProtocol {}.data(),
        };

    send_transaction(svm, admin, instruction, &[]);

    (config, water_mint)
}

fn try_send_transaction(
    svm: &mut LiteSVM,
    payer: &Keypair,
    instruction: anchor_lang::solana_program::instruction::Instruction,
    additional_signers: &[&Keypair],
) -> std::result::Result<(), String> {
    let mut signers: Vec<&Keypair> = vec![payer];
    signers.extend_from_slice(additional_signers);

    let message = Message::new_with_blockhash(
        &[instruction],
        Some(&payer.pubkey()),
        &svm.latest_blockhash(),
    );

    let transaction = VersionedTransaction::try_new(
        VersionedMessage::Legacy(message),
        &signers,
    )
    .map_err(|e| format!("failed to create transaction: {:?}", e))?;

    svm.send_transaction(transaction)
        .map(|_| ())
        .map_err(|e| format!("transaction failed: {:?}", e))
}

fn fund(svm: &mut LiteSVM, wallet: &Pubkey) {
    svm.airdrop(wallet, 5_000_000_000)
        .expect("failed to airdrop");
}

fn build_instruction(
    accounts: impl ToAccountMetas,
    data: Vec<u8>,
) -> anchor_lang::solana_program::instruction::Instruction {
    anchor_lang::solana_program::instruction::Instruction {
        program_id: aqua_sol::ID,
        accounts: accounts.to_account_metas(None),
        data,
    }
}

fn register_agent(
    svm: &mut LiteSVM,
    agent: &Keypair,
    config: Pubkey,
    metadata_uri: &str,
) -> Pubkey {
    let (agent_pda, _) = Pubkey::find_program_address(
        &[AGENT_SEED, agent.pubkey().as_ref()],
        &aqua_sol::ID,
    );

    let accounts = aqua_sol::accounts::RegisterAgent {
        agent: agent.pubkey(),
        config,
        agent_pda,
        system_program: anchor_lang::system_program::ID,
    };

    let instruction = build_instruction(
        accounts,
        aqua_sol::instruction::RegisterAgent {
            metadata_uri: metadata_uri.to_string(),
        }
        .data(),
    );

    send_transaction(svm, agent, instruction, &[]);

    agent_pda
}

fn verify_agent(
    svm: &mut LiteSVM,
    admin: &Keypair,
    agent_wallet: Pubkey,
    agent_pda: Pubkey,
    config: Pubkey,
    approved: bool,
) {
    try_verify_agent(svm, admin, agent_wallet, agent_pda, config, approved)
        .expect("verify_agent failed");
}

fn try_verify_agent(
    svm: &mut LiteSVM,
    admin: &Keypair,
    agent_wallet: Pubkey,
    agent_pda: Pubkey,
    config: Pubkey,
    approved: bool,
) -> std::result::Result<(), String> {
    let accounts = aqua_sol::accounts::VerifyAgent {
        admin: admin.pubkey(),
        config,
        agent_pda,
    };

    let instruction = build_instruction(
        accounts,
        aqua_sol::instruction::VerifyAgent {
            agent: agent_wallet,
            approved,
        }
        .data(),
    );

    try_send_transaction(svm, admin, instruction, &[])
}

fn submit_claim(
    svm: &mut LiteSVM,
    collector: &Keypair,
    config: Pubkey,
    claim_id: u64,
    source: Pubkey,
    amount: u64,
) -> Pubkey {
    try_submit_claim(svm, collector, config, claim_id, source, amount)
        .expect("submit_claim failed")
}

fn try_submit_claim(
    svm: &mut LiteSVM,
    collector: &Keypair,
    config: Pubkey,
    claim_id: u64,
    source: Pubkey,
    amount: u64,
) -> std::result::Result<Pubkey, String> {
    let (claim_pda, _) = Pubkey::find_program_address(
        &[
            CLAIM_SEED,
            collector.pubkey().as_ref(),
            &claim_id.to_le_bytes(),
        ],
        &aqua_sol::ID,
    );

    let accounts = aqua_sol::accounts::SubmitClaim {
        collector: collector.pubkey(),
        config,
        claim_pda,
        system_program: anchor_lang::system_program::ID,
    };

    let instruction = build_instruction(
        accounts,
        aqua_sol::instruction::SubmitClaim {
            claim_id,
            source,
            amount,
        }
        .data(),
    );

    try_send_transaction(svm, collector, instruction, &[])?;

    Ok(claim_pda)
}

fn collector_ata_for(collector: &Pubkey, mint: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[
            collector.as_ref(),
            spl_token::ID.as_ref(),
            mint.as_ref(),
        ],
        &anchor_spl::associated_token::ID,
    )
    .0
}

fn token_balance(svm: &LiteSVM, ata: &Pubkey) -> u64 {
    let ata_account = svm
        .get_account(ata)
        .expect("token account was not created");

    // Classic SPL Token `Account` layout: mint (32) + owner (32)
    // + amount u64-le at offset 64. Our mint uses the classic
    // Token program (fixed 165-byte layout, no extensions).
    let amount_bytes: [u8; 8] = ata_account.data[64..72]
        .try_into()
        .expect("token account data too short");

    u64::from_le_bytes(amount_bytes)
}

#[allow(clippy::too_many_arguments)]
fn verify_claim(
    svm: &mut LiteSVM,
    agent: &Keypair,
    agent_pda: Pubkey,
    config: Pubkey,
    claim_pda: Pubkey,
    collector: Pubkey,
    water_mint: Pubkey,
    approved: bool,
) {
    try_verify_claim(
        svm,
        agent,
        agent_pda,
        config,
        claim_pda,
        collector,
        water_mint,
        approved,
    )
    .expect("verify_claim failed");
}

#[allow(clippy::too_many_arguments)]
fn try_verify_claim(
    svm: &mut LiteSVM,
    agent: &Keypair,
    agent_pda: Pubkey,
    config: Pubkey,
    claim_pda: Pubkey,
    collector: Pubkey,
    water_mint: Pubkey,
    approved: bool,
) -> std::result::Result<(), String> {
    let claim_accounts = aqua_sol::accounts::VerifyClaim {
        agent: agent.pubkey(),
        agent_pda,
        config,
        claim_pda,
        collector,
        water_mint,
        collector_ata: collector_ata_for(&collector, &water_mint),
        token_program: spl_token::ID,
        associated_token_program: anchor_spl::associated_token::ID,
        system_program: anchor_lang::system_program::ID,
    };

    let instruction = build_instruction(
        claim_accounts,
        aqua_sol::instruction::VerifyClaim { approved }.data(),
    );

    try_send_transaction(svm, agent, instruction, &[])
}

#[test]
fn test_initialize_protocol() {
    let mut svm = setup_svm();
    let admin = Keypair::new();

    svm.airdrop(&admin.pubkey(), 5_000_000_000)
        .expect("failed to airdrop admin");

    let (config, water_mint) = initialize_protocol(&mut svm, &admin);

    let config_account = svm
        .get_account(&config)
        .expect("config account was not created");

    let config_state =
        Config::try_deserialize(&mut config_account.data.as_slice())
            .expect("failed to deserialize Config");

    assert_eq!(config_state.admin, admin.pubkey());
    assert_eq!(config_state.water_mint, water_mint);

    let mint_account = svm
        .get_account(&water_mint)
        .expect("water mint was not created");

    assert_eq!(mint_account.owner, spl_token::ID);
}

#[test]
fn test_register_agent() {
    let mut svm = setup_svm();

    let admin = Keypair::new();
    let agent = Keypair::new();

    svm.airdrop(&admin.pubkey(), 5_000_000_000)
        .expect("failed to airdrop admin");

    svm.airdrop(&agent.pubkey(), 5_000_000_000)
        .expect("failed to airdrop agent");

    let (config, _) = initialize_protocol(&mut svm, &admin);

    let (agent_pda, _) = Pubkey::find_program_address(
        &[AGENT_SEED, agent.pubkey().as_ref()],
        &aqua_sol::ID,
    );

    let accounts = aqua_sol::accounts::RegisterAgent {
        agent: agent.pubkey(),
        config,
        agent_pda,
        system_program: anchor_lang::system_program::ID,
    };

    let instruction =
        anchor_lang::solana_program::instruction::Instruction {
            program_id: aqua_sol::ID,
            accounts: accounts.to_account_metas(None),
            data: aqua_sol::instruction::RegisterAgent {
                metadata_uri: "ipfs://agent-metadata".to_string(),
            }
            .data(),
        };

    send_transaction(&mut svm, &agent, instruction, &[]);

    let agent_account = svm
        .get_account(&agent_pda)
        .expect("agent PDA was not created");

    let agent_state =
        Agent::try_deserialize(&mut agent_account.data.as_slice())
            .expect("failed to deserialize Agent");

    assert_eq!(agent_state.agent, agent.pubkey());
    assert_eq!(agent_state.metadata_uri, "ipfs://agent-metadata");
    assert!(matches!(agent_state.status, AgentStatus::Pending));
}

#[test]
fn test_submit_claim() {
    let mut svm = setup_svm();

    let admin = Keypair::new();
    let collector = Keypair::new();

    svm.airdrop(&admin.pubkey(), 5_000_000_000)
        .expect("failed to airdrop admin");

    svm.airdrop(&collector.pubkey(), 5_000_000_000)
        .expect("failed to airdrop collector");

    let (config, _) = initialize_protocol(&mut svm, &admin);

    let claim_id = 1u64;
    let source = Pubkey::new_unique();
    let amount = 500u64;

    let (claim_pda, _) = Pubkey::find_program_address(
        &[
            CLAIM_SEED,
            collector.pubkey().as_ref(),
            &claim_id.to_le_bytes(),
        ],
        &aqua_sol::ID,
    );

    let accounts = aqua_sol::accounts::SubmitClaim {
        collector: collector.pubkey(),
        config,
        claim_pda,
        system_program: anchor_lang::system_program::ID,
    };

    let instruction =
        anchor_lang::solana_program::instruction::Instruction {
            program_id: aqua_sol::ID,
            accounts: accounts.to_account_metas(None),
            data: aqua_sol::instruction::SubmitClaim {
                claim_id,
                source,
                amount,
            }
            .data(),
        };

    send_transaction(&mut svm, &collector, instruction, &[]);

    let claim_account = svm
        .get_account(&claim_pda)
        .expect("claim PDA was not created");

    let claim_state =
        Claim::try_deserialize(&mut claim_account.data.as_slice())
            .expect("failed to deserialize Claim");

    assert_eq!(claim_state.collector, collector.pubkey());
    assert_eq!(claim_state.source, source);
    assert_eq!(claim_state.amount, amount);
    assert_eq!(claim_state.claim_id, claim_id);

    assert!(matches!(
        claim_state.status,
        ClaimStatus::Pending
    ));
}

#[test]
fn test_claim_starts_pending() {
    let mut svm = setup_svm();

    let admin = Keypair::new();
    let collector = Keypair::new();

    svm.airdrop(&admin.pubkey(), 5_000_000_000)
        .expect("failed to airdrop admin");

    svm.airdrop(&collector.pubkey(), 5_000_000_000)
        .expect("failed to airdrop collector");

    let (config, _) = initialize_protocol(&mut svm, &admin);

    let claim_id = 2u64;
    let source = Pubkey::new_unique();
    let amount = 1_000u64;

    let (claim_pda, _) = Pubkey::find_program_address(
        &[
            CLAIM_SEED,
            collector.pubkey().as_ref(),
            &claim_id.to_le_bytes(),
        ],
        &aqua_sol::ID,
    );

    let accounts = aqua_sol::accounts::SubmitClaim {
        collector: collector.pubkey(),
        config,
        claim_pda,
        system_program: anchor_lang::system_program::ID,
    };

    let instruction =
        anchor_lang::solana_program::instruction::Instruction {
            program_id: aqua_sol::ID,
            accounts: accounts.to_account_metas(None),
            data: aqua_sol::instruction::SubmitClaim {
                claim_id,
                source,
                amount,
            }
            .data(),
        };

    send_transaction(&mut svm, &collector, instruction, &[]);

    let claim_account = svm
        .get_account(&claim_pda)
        .expect("claim PDA was not created");

    let claim_state =
        Claim::try_deserialize(&mut claim_account.data.as_slice())
            .expect("failed to deserialize Claim");

    assert!(matches!(
        claim_state.status,
        ClaimStatus::Pending
    ));

    assert_eq!(claim_state.amount, 1_000);
}

fn setup_protocol() -> (LiteSVM, Keypair, Pubkey, Pubkey) {
    let mut svm = setup_svm();
    let admin = Keypair::new();
    fund(&mut svm, &admin.pubkey());

    let (config, water_mint) = initialize_protocol(&mut svm, &admin);

    (svm, admin, config, water_mint)
}

fn setup_verified_agent(
    svm: &mut LiteSVM,
    admin: &Keypair,
    config: Pubkey,
) -> (Keypair, Pubkey) {
    let agent = Keypair::new();
    fund(svm, &agent.pubkey());

    let agent_pda =
        register_agent(svm, &agent, config, "ipfs://agent-metadata");

    verify_agent(svm, admin, agent.pubkey(), agent_pda, config, true);

    (agent, agent_pda)
}

#[test]
fn test_verify_agent_approve() {
    let (mut svm, admin, config, _) = setup_protocol();
    let (agent, agent_pda) = setup_verified_agent(&mut svm, &admin, config);

    let agent_account = svm
        .get_account(&agent_pda)
        .expect("agent PDA was not created");

    let agent_state =
        Agent::try_deserialize(&mut agent_account.data.as_slice())
            .expect("failed to deserialize Agent");

    assert_eq!(agent_state.agent, agent.pubkey());
    assert!(matches!(
        agent_state.status,
        AgentStatus::Verified
    ));
}

#[test]
fn test_verify_agent_reject() {
    let (mut svm, admin, config, _) = setup_protocol();

    let agent = Keypair::new();
    fund(&mut svm, &agent.pubkey());

    let agent_pda =
        register_agent(&mut svm, &agent, config, "ipfs://agent-metadata");

    verify_agent(
        &mut svm,
        &admin,
        agent.pubkey(),
        agent_pda,
        config,
        false,
    );

    let agent_account = svm
        .get_account(&agent_pda)
        .expect("agent PDA was not created");

    let agent_state =
        Agent::try_deserialize(&mut agent_account.data.as_slice())
            .expect("failed to deserialize Agent");

    assert!(matches!(
        agent_state.status,
        AgentStatus::Rejected
    ));
}

#[test]
fn test_verify_agent_rejects_non_admin() {
    let (mut svm, admin, config, _) = setup_protocol();

    let agent = Keypair::new();
    fund(&mut svm, &agent.pubkey());

    let agent_pda =
        register_agent(&mut svm, &agent, config, "ipfs://agent-metadata");

    let impostor = Keypair::new();
    fund(&mut svm, &impostor.pubkey());

    let result = try_verify_agent(
        &mut svm,
        &impostor,
        agent.pubkey(),
        agent_pda,
        config,
        true,
    );

    assert!(result.is_err(), "non-admin must not verify agents");

    // Admin reference: the real admin path still works.
    verify_agent(&mut svm, &admin, agent.pubkey(), agent_pda, config, true);
}

#[test]
fn test_verify_agent_rejects_same_state() {
    let (mut svm, admin, config, _) = setup_protocol();
    let (agent, agent_pda) = setup_verified_agent(&mut svm, &admin, config);

    // Already Verified: approving again must fail.
    let result = try_verify_agent(
        &mut svm,
        &admin,
        agent.pubkey(),
        agent_pda,
        config,
        true,
    );

    assert!(result.is_err(), "re-verifying must fail");
}

#[test]
fn test_verify_agent_allows_rejected_to_verified() {
    let (mut svm, admin, config, _) = setup_protocol();

    let agent = Keypair::new();
    fund(&mut svm, &agent.pubkey());

    let agent_pda =
        register_agent(&mut svm, &agent, config, "ipfs://agent-metadata");

    verify_agent(
        &mut svm,
        &admin,
        agent.pubkey(),
        agent_pda,
        config,
        false,
    );
    verify_agent(&mut svm, &admin, agent.pubkey(), agent_pda, config, true);

    let agent_account = svm
        .get_account(&agent_pda)
        .expect("agent PDA was not created");

    let agent_state =
        Agent::try_deserialize(&mut agent_account.data.as_slice())
            .expect("failed to deserialize Agent");

    assert!(matches!(
        agent_state.status,
        AgentStatus::Verified
    ));
}

#[test]
fn test_register_agent_duplicate_fails() {
    let (mut svm, admin, config, _) = setup_protocol();
    let _ = admin;

    let agent = Keypair::new();
    fund(&mut svm, &agent.pubkey());

    register_agent(&mut svm, &agent, config, "ipfs://agent-metadata");

    // Second registration reuses the same PDA: `init` must fail.
    let (agent_pda, _) = Pubkey::find_program_address(
        &[AGENT_SEED, agent.pubkey().as_ref()],
        &aqua_sol::ID,
    );

    let accounts = aqua_sol::accounts::RegisterAgent {
        agent: agent.pubkey(),
        config,
        agent_pda,
        system_program: anchor_lang::system_program::ID,
    };

    let instruction = build_instruction(
        accounts,
        aqua_sol::instruction::RegisterAgent {
            metadata_uri: "ipfs://agent-metadata".to_string(),
        }
        .data(),
    );

    let result = try_send_transaction(&mut svm, &agent, instruction, &[]);

    assert!(result.is_err(), "duplicate registration must fail");
}

#[test]
fn test_submit_claim_zero_amount_fails() {
    let (mut svm, _admin, config, _) = setup_protocol();

    let collector = Keypair::new();
    fund(&mut svm, &collector.pubkey());

    let result = try_submit_claim(
        &mut svm,
        &collector,
        config,
        1,
        Pubkey::new_unique(),
        0,
    );

    assert!(result.is_err(), "zero-amount claim must fail");
}

#[test]
fn test_submit_claim_duplicate_claim_id_fails() {
    let (mut svm, _admin, config, _) = setup_protocol();

    let collector = Keypair::new();
    fund(&mut svm, &collector.pubkey());

    submit_claim(&mut svm, &collector, config, 7, Pubkey::new_unique(), 500);

    let result = try_submit_claim(
        &mut svm,
        &collector,
        config,
        7,
        Pubkey::new_unique(),
        500,
    );

    assert!(result.is_err(), "duplicate claim_id must fail");
}

#[test]
fn test_verify_claim_approve_mints() {
    let (mut svm, admin, config, water_mint) = setup_protocol();
    let (agent, agent_pda) = setup_verified_agent(&mut svm, &admin, config);

    let collector = Keypair::new();
    fund(&mut svm, &collector.pubkey());

    let amount = 750u64;
    let claim_pda = submit_claim(
        &mut svm,
        &collector,
        config,
        1,
        Pubkey::new_unique(),
        amount,
    );

    // The collector never created an ATA: the agent-funded
    // `init_if_needed` must create it during verification.
    let ata = collector_ata_for(&collector.pubkey(), &water_mint);
    assert!(
        svm.get_account(&ata).is_none(),
        "ATA must not exist before verification"
    );

    verify_claim(
        &mut svm,
        &agent,
        agent_pda,
        config,
        claim_pda,
        collector.pubkey(),
        water_mint,
        true,
    );

    // 750 liters at 3 decimals = 750 base units.
    assert_eq!(token_balance(&svm, &ata), amount);

    let claim_account = svm
        .get_account(&claim_pda)
        .expect("claim PDA was not created");

    let claim_state =
        Claim::try_deserialize(&mut claim_account.data.as_slice())
            .expect("failed to deserialize Claim");

    assert!(matches!(
        claim_state.status,
        ClaimStatus::Verified
    ));
}

#[test]
fn test_verify_claim_reject_mints_nothing() {
    let (mut svm, admin, config, water_mint) = setup_protocol();
    let (agent, agent_pda) = setup_verified_agent(&mut svm, &admin, config);

    let collector = Keypair::new();
    fund(&mut svm, &collector.pubkey());

    let claim_pda = submit_claim(
        &mut svm,
        &collector,
        config,
        1,
        Pubkey::new_unique(),
        500,
    );

    verify_claim(
        &mut svm,
        &agent,
        agent_pda,
        config,
        claim_pda,
        collector.pubkey(),
        water_mint,
        false,
    );

    let claim_account = svm
        .get_account(&claim_pda)
        .expect("claim PDA was not created");

    let claim_state =
        Claim::try_deserialize(&mut claim_account.data.as_slice())
            .expect("failed to deserialize Claim");

    assert!(matches!(
        claim_state.status,
        ClaimStatus::Rejected
    ));

    let ata = collector_ata_for(&collector.pubkey(), &water_mint);
    assert_eq!(token_balance(&svm, &ata), 0);
}

#[test]
fn test_verify_claim_rejects_self_verification() {
    let (mut svm, admin, config, water_mint) = setup_protocol();
    let (agent, agent_pda) = setup_verified_agent(&mut svm, &admin, config);

    // The agent submits a claim as a collector, then tries to
    // verify its own claim.
    let claim_pda = submit_claim(
        &mut svm,
        &agent,
        config,
        1,
        Pubkey::new_unique(),
        500,
    );

    let result = try_verify_claim(
        &mut svm,
        &agent,
        agent_pda,
        config,
        claim_pda,
        agent.pubkey(),
        water_mint,
        true,
    );

    assert!(result.is_err(), "self-verification must fail");
}

#[test]
fn test_verify_claim_rejects_double_verify() {
    let (mut svm, admin, config, water_mint) = setup_protocol();
    let (agent, agent_pda) = setup_verified_agent(&mut svm, &admin, config);

    let collector = Keypair::new();
    fund(&mut svm, &collector.pubkey());

    let claim_pda = submit_claim(
        &mut svm,
        &collector,
        config,
        1,
        Pubkey::new_unique(),
        500,
    );

    verify_claim(
        &mut svm,
        &agent,
        agent_pda,
        config,
        claim_pda,
        collector.pubkey(),
        water_mint,
        true,
    );

    let result = try_verify_claim(
        &mut svm,
        &agent,
        agent_pda,
        config,
        claim_pda,
        collector.pubkey(),
        water_mint,
        true,
    );

    assert!(result.is_err(), "double verification must fail");
}

#[test]
fn test_verify_claim_rejects_pending_agent() {
    let (mut svm, _admin, config, water_mint) = setup_protocol();

    // Agent registers but is never admin-approved: still Pending.
    let agent = Keypair::new();
    fund(&mut svm, &agent.pubkey());

    let agent_pda =
        register_agent(&mut svm, &agent, config, "ipfs://agent-metadata");

    let collector = Keypair::new();
    fund(&mut svm, &collector.pubkey());

    let claim_pda = submit_claim(
        &mut svm,
        &collector,
        config,
        1,
        Pubkey::new_unique(),
        500,
    );

    let result = try_verify_claim(
        &mut svm,
        &agent,
        agent_pda,
        config,
        claim_pda,
        collector.pubkey(),
        water_mint,
        true,
    );

    assert!(result.is_err(), "pending agent must not verify claims");
}