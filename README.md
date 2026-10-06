# AquaSol — 
## Current Development Status

This repository contains the current on-chain implementation of the AquaSol MVP.

The project is being built according to the AquaSol specification, which defines three MVP use cases:

1. `register_agent`
2. `submit_claim`
3. `verify_claim`

The current work establishes the project structure and the initial on-chain state architecture. The full claim submission and verification flow is still under development.

---

## What Has Been Done So Far

### 1. Anchor Project Setup

A fresh Anchor project was initialized as:

```text
AquaSol
```

The Solana program is located at:

```text
programs/aqua-sol/
```

The current program ID is:

```text
pdss4eJfXzqBVim1oDPtqfzhwMR79t1JrU2FHiny7Wh
```

The generated Anchor starter `Counter` example is being replaced with the AquaSol-specific protocol implementation.

---

## 2. AquaSol Program Structure

Current structure:

```text
AquaSol/
├── Anchor.toml
├── Cargo.toml
├── Cargo.lock
├── rust-toolchain.toml
│
├── programs/
│   └── aqua-sol/
│       ├── Cargo.toml
│       │
│       ├── src/
│       │   ├── lib.rs
│       │   ├── state.rs
│       │   ├── constants.rs
│       │   ├── error.rs
│       │   │
│       │   └── instructions/
│       │       ├── initialize_protocol.rs
│       │       ├── register_agent.rs
│       │       ├── submit_claim.rs
│       │       └── verify_claim.rs
│       │
│       └── tests/
│           └── test_initialize.rs
│
└── tests/
```

---

# 3. On-Chain State Implemented

The initial AquaSol state model has been created.

## Config

The `Config` account represents the AquaSol protocol configuration.

Current fields:

```text
admin
bump
```

The Config PDA is derived using:

```text
["config"]
```

---

## Agent

The `Agent` account represents a verifying agent.

Current fields:

```text
agent
kyc_verified
active
bump
```

The Agent PDA is derived using:

```text
["agent", agent.key()]
```

The AquaSol specification requires the Agent PDA to store the agent wallet, KYC status, and active status.

---

## Claim

The `Claim` account represents a collector's water-source claim.

Current fields:

```text
collector
source
amount
claim_id
status
bump
```

Claim status currently supports:

```text
Pending
Verified
Rejected
```

The Claim PDA is intended to be derived using:

```text
["claim", collector.key(), claim_id]
```

---

# 4. Constants / PDA Seeds

The following protocol PDA seeds have been established:

```text
CONFIG_SEED = "config"
AGENT_SEED  = "agent"
CLAIM_SEED  = "claim"
```

These are kept in:

```text
programs/aqua-sol/src/constants.rs
```

---

# 5. Error Definitions

The initial AquaSol error definitions have been created in:

```text
programs/aqua-sol/src/error.rs
```

Current errors include:

```text
AgentNotKycVerified
AgentInactive
AgentIsCollector
InvalidAmount
ClaimNotPending
VerificationFailed
```

These will be used as the instruction implementations are completed.

---

# 6. `initialize_protocol`

The protocol initialization instruction has been scaffolded.

Handler:

```text
initialize_protocol
```

Current purpose:

```text
Admin
  ↓
initialize_protocol
  ↓
Config PDA
```

The Config account stores the protocol administrator and PDA bump.

---

# 7. `register_agent`

The agent registration instruction has been scaffolded.

Handler:

```text
register_agent
```

Current flow:

```text
Agent wallet
     ↓
register_agent
     ↓
Agent PDA
```

The Agent PDA stores:

```text
agent
kyc_verified
active
bump
```

The current implementation requires the supplied KYC status to be verified before registration.

The AquaSol specification treats KYC as an off-chain process, so the current implementation models the KYC result as part of the registration input rather than introducing an undefined KYC oracle/provider account.

---

# 8. `submit_claim`

The instruction file has been created:

```text
programs/aqua-sol/src/instructions/submit_claim.rs
```

The handler and account structure are currently being developed.

Target flow:

```text
Collector
    ↓
submit_claim
    ↓
Claim PDA
    ↓
status = Pending
```

The claim must contain:

```text
collector
source
amount
claim_id
status
```

---

# 9. `verify_claim`

The instruction file has been created:

```text
programs/aqua-sol/src/instructions/verify_claim.rs
```

The complete verification and token-minting implementation is **not finished yet**.

Target flow:

```text
Agent
  ↓
verify_claim
  ↓
Validate agent
  ↓
Validate claim
  ↓
Verify claim
     │
 ┌───┴────┐
 │        │
PASS     FAIL
 │        │
 ▼        ▼
Verified Rejected
 │
 ▼
Mint water tokens
 │
 ▼
Collector ATA
```

The AquaSol specification requires water tokens to be minted to the collector after successful verification and requires minting to be rejected when verification fails.

---

# 10. Current MVP Architecture

```text
                         AquaSol Program
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        initialize_protocol register_agent submit_claim
                │              │              │
                ▼              ▼              ▼
           Config PDA      Agent PDA       Claim PDA
                                               │
                                               │
                                               ▼
                                         verify_claim
                                               │
                                         ┌─────┴─────┐
                                         │           │
                                       PASS        FAIL
                                         │           │
                                         ▼           ▼
                                     Verified     Rejected
                                         │
                                         ▼
                                    Water Mint
                                         │
                                         ▼
                                   Collector ATA
```

---

# 11. What Is Still To Do

The next development steps are:

```text
1. Complete submit_claim
2. Complete verify_claim
3. Add water token mint
4. Add SPL Token CPI for minting
5. Complete verification/rejection logic
6. Add account and authorization constraints
7. Add tests for all MVP instructions
8. Build and run the complete test suite
9. Review the final implementation against the AquaSol requirements
```

---

# 12. Important Scope

The current MVP is limited to:

```text
register_agent
submit_claim
verify_claim
```

The following features are **roadmap items** and are not part of the current MVP implementation:

```text
purchase_credits
confirm_delivery
```

These will involve the future buyer/escrow workflow.

---

# 13. Handoff for Team

### Already started

```text
[x] Fresh Anchor project
[x] AquaSol program structure
[x] Config state
[x] Agent state
[x] Claim state
[x] PDA seed constants
[x] Initial error definitions
[x] initialize_protocol scaffold
[x] register_agent scaffold
[x] submit_claim scaffold
[x] verify_claim scaffold
```

### Continue from here

```text
[ ] Complete submit_claim
[ ] Complete verify_claim
[ ] Add water token minting
[ ] Add verification/rejection logic
[ ] Add tests
[ ] Run full build
[ ] Run full test suite
```

The project is currently at the **state-model and instruction-scaffolding stage**. The next logical implementation step is to finish `submit_claim`, followed by `verify_claim` and the water-token minting CPI.