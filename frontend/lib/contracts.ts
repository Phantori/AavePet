// Deployed contract addresses — fill in after running Deploy.s.sol
export const ADDRESSES = {
  aptToken:          process.env.NEXT_PUBLIC_APT_TOKEN_ADDRESS         as `0x${string}`,
  petNFT:            process.env.NEXT_PUBLIC_PET_NFT_ADDRESS           as `0x${string}`,
  marketplace:       process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS       as `0x${string}`,
  usdcVault:         process.env.NEXT_PUBLIC_USDC_VAULT_ADDRESS        as `0x${string}`,
  wethVault:         process.env.NEXT_PUBLIC_WETH_VAULT_ADDRESS        as `0x${string}`,
  rainbowBridge:     process.env.NEXT_PUBLIC_RAINBOW_BRIDGE_ADDRESS    as `0x${string}`,
  serviceMarketplace:process.env.NEXT_PUBLIC_SERVICE_MARKETPLACE_ADDRESS as `0x${string}`,
  petCreditLine:     process.env.NEXT_PUBLIC_PET_CREDIT_LINE_ADDRESS   as `0x${string}`,
  petHeraldry:       process.env.NEXT_PUBLIC_PET_HERALDRY_ADDRESS      as `0x${string}`,
  petGuardian:       process.env.NEXT_PUBLIC_PET_GUARDIAN_ADDRESS      as `0x${string}`,
  petRecords:        process.env.NEXT_PUBLIC_PET_RECORDS_ADDRESS       as `0x${string}`,
  packTreasury:      process.env.NEXT_PUBLIC_PACK_TREASURY_ADDRESS     as `0x${string}`,
  weatherGlyph:      process.env.NEXT_PUBLIC_WEATHER_GLYPH_ADDRESS     as `0x${string}`,
  guildCrest:        process.env.NEXT_PUBLIC_GUILD_CREST_ADDRESS        as `0x${string}`,
  stasisPod:         process.env.NEXT_PUBLIC_STASIS_POD_ADDRESS         as `0x${string}`,
  genesisCapsule:    process.env.NEXT_PUBLIC_GENESIS_CAPSULE_ADDRESS    as `0x${string}`,
  merchantGlyph:     process.env.NEXT_PUBLIC_MERCHANT_GLYPH_ADDRESS     as `0x${string}`,
} as const;

export const PET_HERALDRY_ABI = [
  {
    name: "evaluateMilestones",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "newCharges", type: "uint256" }],
  },
  {
    name: "getHeraldryURI",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "petName", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "getHeraldrySVG",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "petName", type: "string" },
    ],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "charges",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "foundPack",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "packId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "joinPack",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "packId", type: "bytes32" }],
    outputs: [],
  },
  {
    name: "packOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "member", type: "address" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    name: "packFounder",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "packId", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

export const RAINBOW_BRIDGE_ABI = [
  {
    name: "archive",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "epitaph", type: "string" },
      { name: "charity", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "addMemory",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "cid", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "isArchived",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "memorials",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "originalOwner", type: "address" },
      { name: "archivedAt", type: "uint256" },
      { name: "epitaph", type: "string" },
      { name: "charityWallet", type: "address" },
      { name: "yieldStreamActive", type: "bool" },
    ],
  },
  {
    name: "getMemoryCids",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string[]" }],
  },
] as const;

export const SERVICE_MARKETPLACE_ABI = [
  {
    name: "createVoucherType",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "metadataURI", type: "string" },
      { name: "priceUsdc", type: "uint256" },
      { name: "maxSupply", type: "uint256" },
      { name: "isAdoption", type: "bool" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    name: "buyVoucher",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "quantity", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "redeemVoucher",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    name: "createAgreement",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "provider", type: "address" },
      { name: "descriptions", type: "string[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    name: "releaseMilestone",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "agreementId", type: "uint256" },
      { name: "milestoneIndex", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "cancelAgreement",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "agreementId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const PET_CREDIT_LINE_ABI = [
  {
    name: "borrow",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "repay",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "borrows",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "borrower", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "maxBorrow",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Base mainnet token addresses (hardcoded — these don't change)
export const BASE_TOKENS = {
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
  WETH: "0x4200000000000000000000000000000000000006" as `0x${string}`,
} as const;

export const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

// Keep APT_TOKEN_ABI as an alias for backwards compat
export const APT_TOKEN_ABI = ERC20_ABI;

export const PET_NFT_ABI = [
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenURI_", type: "string" }],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "setApprovalForAll",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "tokenDNA",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "mintWithLineage",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenURI_", type: "string" },
      { name: "ancestorCapsuleId", type: "uint256" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    name: "ancestorTokenId",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const MARKETPLACE_ABI = [
  {
    name: "list",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "price", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "delist",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "buy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "listings",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "seller", type: "address" },
      { name: "price", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
] as const;

export const PET_VAULT_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "deposits",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "depositor", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "yieldForPet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "assetSymbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "setGuardian",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "guardianContract", type: "address" },
    ],
    outputs: [],
  },
] as const;

export const PET_GUARDIAN_ABI = [
  {
    name: "setupGuardians",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "guardians", type: "address[3]" },
      { name: "threshold", type: "uint8" },
      { name: "inactivityPeriod", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "pingAlive",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "approveEmergency",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "executeEmergency",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "usdcVault", type: "address" },
      { name: "wethVault", type: "address" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "configs",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "guardians", type: "address[3]" },
      { name: "threshold", type: "uint8" },
      { name: "inactivityPeriod", type: "uint256" },
      { name: "lastActivity", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
  {
    name: "isInactive",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "approvalCount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const PET_RECORDS_ABI = [
  {
    name: "addRecord",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "cid", type: "string" },
      { name: "recordType", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "grantAccess",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "vet", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "revokeAccess",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "vet", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "getRecords",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "cid", type: "string" },
          { name: "recordType", type: "string" },
          { name: "timestamp", type: "uint256" },
          { name: "addedBy", type: "address" },
        ],
      },
    ],
  },
  {
    name: "hasAccess",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "who", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "recordCount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const PACK_TREASURY_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "packId", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "packId", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "fileClaim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "packId", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "reason", type: "string" },
    ],
    outputs: [{ name: "claimId", type: "uint256" }],
  },
  {
    name: "voteClaim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "packId", type: "bytes32" },
      { name: "claimId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "executeClaim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "packId", type: "bytes32" },
      { name: "claimId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "treasuryDeposited",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "packId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "memberDeposit",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "packId", type: "bytes32" },
      { name: "member", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "treasuryYield",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "packId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const WEATHER_GLYPH_ABI = [
  {
    name: "configure",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "zone", type: "uint8" },
      { name: "hemisphere", type: "uint8" },
    ],
    outputs: [],
  },
  {
    name: "getConfig",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [
      { name: "zone", type: "uint8" },
      { name: "hemisphere", type: "uint8" },
      { name: "isSet", type: "bool" },
    ],
  },
  {
    name: "currentSeason",
    type: "function",
    stateMutability: "pure",
    inputs: [
      { name: "utcMonth", type: "uint8" },
      { name: "hemisphere", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

export const GUILD_CREST_ABI = [
  {
    name: "createGuild",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "packId", type: "bytes32" },
    ],
    outputs: [{ name: "guildId", type: "uint256" }],
  },
  {
    name: "pledgeYield",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "guildId", type: "uint256" },
      { name: "bps", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "sweepYield",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "depositor", type: "address" },
      { name: "usdcVault", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "withdrawGuildFunds",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "guildId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "guilds",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "guildId", type: "uint256" }],
    outputs: [
      { name: "name", type: "string" },
      { name: "packId", type: "bytes32" },
      { name: "founder", type: "address" },
      { name: "treasuryUsdc", type: "uint256" },
      { name: "memberCount", type: "uint256" },
      { name: "createdAt", type: "uint256" },
    ],
  },
  {
    name: "memberGuild",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "member", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "pledgeBps",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "member", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalSwept",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "guildId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "guildCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "guildId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export const STASIS_POD_ABI = [
  {
    name: "lockPet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "plannedDuration", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "unlockPet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "computePreservationFee",
    type: "function",
    stateMutability: "pure",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "grossYield", type: "uint256" },
    ],
    outputs: [{ name: "fee", type: "uint256" }],
  },
  {
    name: "getActivePods",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "active", type: "uint256[]" }],
  },
  {
    name: "isInStasis",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "stasisDuration",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "pods",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "lockedAt", type: "uint256" },
      { name: "plannedDuration", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
  {
    name: "PRESERVATION_FEE_BPS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "MIN_STASIS_DURATION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "MAX_STASIS_DURATION",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const GENESIS_CAPSULE_ABI = [
  {
    name: "mintCapsule",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "capsuleId", type: "uint256" },
      { name: "dna", type: "uint256" },
      { name: "lifetimeUsdcSaved", type: "uint256" },
      { name: "charges", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "burn",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "capsuleId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "ancestors",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "capsuleId", type: "uint256" }],
    outputs: [
      { name: "dna", type: "uint256" },
      { name: "lifetimeUsdcSaved", type: "uint256" },
      { name: "charges", type: "uint256" },
      { name: "archivedAt", type: "uint256" },
    ],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "uri",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "setPetNFT",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "petNFT_", type: "address" }],
    outputs: [],
  },
] as const;

export const MERCHANT_GLYPH_ABI = [
  {
    name: "deployKiosk",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "size", type: "uint8" },
      { name: "lat", type: "int32" },
      { name: "lon", type: "int32" },
    ],
    outputs: [],
  },
  {
    name: "retractKiosk",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "checkInGuest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "guestTokenId", type: "uint256" },
      { name: "hostTokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "checkOutGuest",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "guestTokenId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "syncWholesaleInventory",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "itemBatchId", type: "bytes32" },
      { name: "amount", type: "uint256" },
      { name: "vendor", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "setVendorApproval",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vendor", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "merchantGlyphs",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "size", type: "uint8" },
      { name: "state", type: "uint8" },
      { name: "lat", type: "int32" },
      { name: "lon", type: "int32" },
      { name: "lifetimeHospitality", type: "uint256" },
      { name: "lastDeployAt", type: "uint256" },
      { name: "activeGuests", type: "uint256" },
    ],
  },
  {
    name: "hospitalityBadge",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "inSanctuary",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "sanctuaryHost",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "guestTokenId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "activeKioskCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approvedVendors",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "vendor", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getWholesalePurchases",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "itemBatchId", type: "bytes32" },
          { name: "amount", type: "uint256" },
          { name: "timestamp", type: "uint256" },
          { name: "vendor", type: "address" },
        ],
      },
    ],
  },
  {
    name: "badgeTitle",
    type: "function",
    stateMutability: "pure",
    inputs: [{ name: "level", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;
