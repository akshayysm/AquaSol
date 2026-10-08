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