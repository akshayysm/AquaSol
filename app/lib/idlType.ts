/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/aqua_sol.json`.
 */
export type AquaSol = {
  "address": "KFnBABoUBwpu8C9M1TJA3aXkT87BSBmYZ7nazuUy6my",
  "metadata": {
    "name": "aquaSol",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "AquaSol - Water as RWA"
  },
  "instructions": [
    {
      "name": "initializeProtocol",
      "discriminator": [
        188,
        233,
        252,
        106,
        134,
        146,
        202,
        91
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "The administrator pays for the protocol accounts."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "docs": [
            "Global AquaSol configuration PDA.",
            "",
            "The Config PDA will also become the mint authority",
            "for the AQUA water-credit token."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "waterMint",
          "docs": [
            "AQUA water-credit mint.",
            "",
            "The mint authority is the Config PDA, meaning only",
            "AquaSol's program-controlled configuration PDA can",
            "authorize token minting."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  97,
                  116,
                  101,
                  114,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL Token Program used to create and manage AQUA."
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System Program creates the accounts."
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "docs": [
            "Required for account creation and initialization."
          ],
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "registerAgent",
      "discriminator": [
        135,
        157,
        66,
        195,
        2,
        113,
        175,
        30
      ],
      "accounts": [
        {
          "name": "agent",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "agentPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "metadataUri",
          "type": "string"
        }
      ]
    },
    {
      "name": "submitClaim",
      "discriminator": [
        163,
        108,
        111,
        46,
        220,
        82,
        77,
        212
      ],
      "accounts": [
        {
          "name": "collector",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "claimPda",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  108,
                  97,
                  105,
                  109
                ]
              },
              {
                "kind": "account",
                "path": "collector"
              },
              {
                "kind": "arg",
                "path": "claimId"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "claimId",
          "type": "u64"
        },
        {
          "name": "sourceName",
          "type": "string"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "verifyAgent",
      "discriminator": [
        206,
        212,
        108,
        12,
        105,
        61,
        100,
        66
      ],
      "accounts": [
        {
          "name": "admin",
          "docs": [
            "Protocol administrator; must match `config.admin`."
          ],
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "docs": [
            "Global AquaSol configuration holding the admin wallet."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "agentPda",
          "docs": [
            "Agent PDA being approved or rejected.",
            "",
            "Addressed by the target agent wallet passed as an",
            "instruction argument, so the admin can verify any",
            "registered agent."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "agent"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "agent",
          "type": "pubkey"
        },
        {
          "name": "approved",
          "type": "bool"
        }
      ]
    },
    {
      "name": "verifyClaim",
      "discriminator": [
        35,
        121,
        58,
        82,
        51,
        132,
        99,
        113
      ],
      "accounts": [
        {
          "name": "agent",
          "docs": [
            "Wallet acting as the verification agent."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "agentPda",
          "docs": [
            "Registered AquaSol verification agent."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  103,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "agent"
              }
            ]
          }
        },
        {
          "name": "config",
          "docs": [
            "Global AquaSol configuration.",
            "",
            "The Config PDA is the mint authority for AQUA."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "claimPda",
          "docs": [
            "Claim being verified."
          ],
          "writable": true
        },
        {
          "name": "waterMint",
          "docs": [
            "AQUA water-credit mint."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  97,
                  116,
                  101,
                  114,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "collector",
          "docs": [
            "Collector wallet recorded on the claim.",
            "",
            "Readonly: only used as the ATA authority address and to",
            "prove the correct collector account was passed. Requires",
            "no signature, keeping verification asynchronous."
          ]
        },
        {
          "name": "collectorAta",
          "docs": [
            "Collector's AQUA token account.",
            "",
            "Created on demand and funded by the verifying agent, so",
            "the collector stays fully passive after submitting the",
            "claim. The address is canonically derived from",
            "(collector, water_mint), shared across all of the",
            "collector's claims."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "collector"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "waterMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL Token Program."
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Associated Token Program creates the collector ATA."
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System Program funds the ATA creation."
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "approved",
          "type": "bool"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "agent",
      "discriminator": [
        47,
        166,
        112,
        147,
        155,
        197,
        86,
        7
      ]
    },
    {
      "name": "claim",
      "discriminator": [
        155,
        70,
        22,
        176,
        123,
        215,
        246,
        102
      ]
    },
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorizedAgent",
      "msg": "Signer does not match the registered agent wallet"
    },
    {
      "code": 6001,
      "name": "agentIsCollector",
      "msg": "Agent cannot verify its own claim"
    },
    {
      "code": 6002,
      "name": "invalidAmount",
      "msg": "Claim amount must be greater than zero"
    },
    {
      "code": 6003,
      "name": "claimNotPending",
      "msg": "Claim is not pending"
    },
    {
      "code": 6004,
      "name": "agentNotVerified",
      "msg": "Agent is not verified"
    },
    {
      "code": 6005,
      "name": "invalidMetadataUri",
      "msg": "Agent metadata URI is invalid"
    },
    {
      "code": 6006,
      "name": "unauthorized",
      "msg": "Only the protocol admin can perform this action"
    },
    {
      "code": 6007,
      "name": "agentAlreadyResolved",
      "msg": "Agent is already in the requested state"
    },
    {
      "code": 6008,
      "name": "invalidCollector",
      "msg": "Collector account does not match the claim"
    },
    {
      "code": 6009,
      "name": "verificationFailed",
      "msg": "Verification failed"
    }
  ],
  "types": [
    {
      "name": "agent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "agent",
            "docs": [
              "Wallet registered as a verification agent."
            ],
            "type": "pubkey"
          },
          {
            "name": "metadataUri",
            "docs": [
              "Off-chain metadata URI (name, location, KYC docs)."
            ],
            "type": "string"
          },
          {
            "name": "status",
            "docs": [
              "On-chain verification state set by admin via `verify_agent`."
            ],
            "type": {
              "defined": {
                "name": "agentStatus"
              }
            }
          },
          {
            "name": "bump",
            "docs": [
              "Bump used by the Agent PDA."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "agentStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "verified"
          },
          {
            "name": "rejected"
          }
        ]
      }
    },
    {
      "name": "claim",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "collector",
            "docs": [
              "Wallet that submitted the water claim."
            ],
            "type": "pubkey"
          },
          {
            "name": "sourceName",
            "docs": [
              "Name of the water source associated with the claim."
            ],
            "type": "string"
          },
          {
            "name": "amount",
            "docs": [
              "Verified/submitted water volume in liters.",
              "",
              "1,000 liters = 1 AQUA."
            ],
            "type": "u64"
          },
          {
            "name": "claimId",
            "docs": [
              "Collector-defined unique claim identifier."
            ],
            "type": "u64"
          },
          {
            "name": "status",
            "docs": [
              "Current verification state."
            ],
            "type": {
              "defined": {
                "name": "claimStatus"
              }
            }
          },
          {
            "name": "bump",
            "docs": [
              "Bump used by the Claim PDA."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "claimStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "verified"
          },
          {
            "name": "rejected"
          }
        ]
      }
    },
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "Wallet that initialized the AquaSol protocol."
            ],
            "type": "pubkey"
          },
          {
            "name": "waterMint",
            "docs": [
              "AQUA water-credit mint controlled by the Config PDA."
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "docs": [
              "Bump used by the Config PDA."
            ],
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "agentSeed",
      "docs": [
        "PDA seed for registered verification agents."
      ],
      "type": "bytes",
      "value": "[97, 103, 101, 110, 116]"
    },
    {
      "name": "aquaDecimals",
      "docs": [
        "AQUA uses three decimal places.",
        "",
        "Therefore:",
        "1 AQUA = 1,000 base units.",
        "",
        "Since our protocol defines:",
        "1 AQUA = 1,000 liters,",
        "",
        "this gives us:",
        "1 liter = 1 AQUA base unit.",
        "",
        "Examples:",
        "1,000 liters = 1.000 AQUA",
        "500 liters  = 0.500 AQUA",
        "250 liters  = 0.250 AQUA",
        "1 liter     = 0.001 AQUA"
      ],
      "type": "u8",
      "value": "3"
    },
    {
      "name": "claimSeed",
      "docs": [
        "PDA seed for collector claims."
      ],
      "type": "bytes",
      "value": "[99, 108, 97, 105, 109]"
    },
    {
      "name": "configSeed",
      "docs": [
        "PDA seed for the global AquaSol protocol configuration."
      ],
      "type": "bytes",
      "value": "[99, 111, 110, 102, 105, 103]"
    },
    {
      "name": "waterMintSeed",
      "docs": [
        "PDA seed for the AQUA water-credit mint."
      ],
      "type": "bytes",
      "value": "[119, 97, 116, 101, 114, 95, 109, 105, 110, 116]"
    }
  ]
};
